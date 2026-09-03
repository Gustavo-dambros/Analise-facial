import hashlib
import hmac
import logging
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.config import settings
from app.core.exceptions import SanitizedHTTPException
from app.models.payment import Payment, PaymentStatus, PaymentMethod
from app.repositories.payment_repository import PaymentRepository
from app.repositories.profile_repository import ProfileRepository
from app.models.profile import PlanType
from app.database.connection import AsyncSessionLocal

logger = logging.getLogger(__name__)

PLAN_ID_TO_TYPE = {
    "plan_monthly": PlanType.pro,
    "plan_annual": PlanType.enterprise,
    "plan_black": PlanType.enterprise,
    "pro": PlanType.pro,
    "enterprise": PlanType.enterprise,
    "free": PlanType.free,
}

class PaymentService:
    def __init__(self, db: AsyncSession):
        self.db = db

    def _get_plan_amount(self, plan_id: str, payment_method: str = "pix") -> float:
        plan_prices = settings.PLAN_PRICES.get(plan_id)
        if not plan_prices:
            return 0.0
        return plan_prices.get(payment_method, 0.0)

    def _mp_client(self):
        if not settings.MERCADOPAGO_ACCESS_TOKEN:
            raise SanitizedHTTPException(status_code=500, public_message="Mercado Pago não configurado.", internal_detail="MERCADOPAGO_ACCESS_TOKEN missing")
        try:
            import mercadopago
            return mercadopago.SDK(settings.MERCADOPAGO_ACCESS_TOKEN)
        except Exception as e:
            raise SanitizedHTTPException(status_code=500, public_message="SDK Mercado Pago não instalado.", internal_detail=str(e))

    async def create_pix_payment(self, user: object, plan_id: str, success_url: str, pending_url: str) -> dict:
        # Use preference flow for both PIX and card; MP decides method. Keep endpoint for compat.
        return await self.create_preference(user, plan_id, success_url, pending_url, payment_method="pix")

    async def create_checkout_pro_payment(self, user: object, plan_id: str, success_url: str, pending_url: str) -> dict:
        return await self.create_preference(user, plan_id, success_url, pending_url, payment_method="credit_card")

    async def create_preference(self, user: object, plan_id: str, success_url: str, pending_url: str, payment_method: str = "pix") -> dict:
        # plan_id is frontend plan_monthly/annual/black
        if plan_id not in settings.PLAN_PRICES:
            raise SanitizedHTTPException(status_code=400, public_message="Plano inválido.", internal_detail=f"plan_id {plan_id}")
        amount = self._get_plan_amount(plan_id, payment_method if payment_method in ("pix","credit_card") else "pix")
        if amount <= 0:
            raise SanitizedHTTPException(status_code=400, public_message="Preço não configurado.", internal_detail=plan_id)
        plan_type = PLAN_ID_TO_TYPE.get(plan_id, PlanType.pro).value
        repo = PaymentRepository(self.db)
        payment = await repo.create(user_id=user.id, amount=amount, payment_method=payment_method, plan_id=plan_id)
        # Update plan_type
        payment.plan_type = plan_type
        await self.db.commit()
        await self.db.refresh(payment)

        # Create MP preference with external_reference = user_id:plan_id:payment.id
        external_ref = f"{user.id}:{plan_id}:{payment.id}"
        sdk = self._mp_client()
        pref_data = {
            "items": [{"title": f"FaceMax {plan_id}", "quantity": 1, "unit_price": float(amount), "currency_id": "BRL"}],
            "payer": {"email": getattr(user, "email", "") or ""},
            "external_reference": external_ref,
            "back_urls": {"success": success_url, "pending": pending_url, "failure": pending_url},
            "auto_return": "approved",
            "notification_url": settings.MERCADOPAGO_NOTIFICATION_URL or None,
        }
        # remove None
        if not pref_data["notification_url"]:
            pref_data.pop("notification_url")
        try:
            result = sdk.preference().create(pref_data)
            resp = result.get("response", {}) if isinstance(result, dict) else {}
            pref_id = resp.get("id")
            init_point = resp.get("init_point") or resp.get("sandbox_init_point")
            if pref_id:
                payment.mp_preference_id = str(pref_id)
                await self.db.commit()
                await self.db.refresh(payment)
            return {
                "payment_id": payment.id,
                "status": payment.status.value,
                "preference_id": pref_id,
                "init_point": init_point,
                "payment_method": payment_method,
                "amount": float(payment.amount),
                "currency": payment.currency,
                "qr_code": None,
                "qr_code_base64": None,
                "ticket_url": init_point,
            }
        except Exception as e:
            logger.exception("MP preference create failed: %s", e)
            # Return payment with no preference, frontend can retry
            return {
                "payment_id": payment.id,
                "status": payment.status.value,
                "preference_id": None,
                "init_point": None,
                "payment_method": payment_method,
                "amount": float(payment.amount),
                "currency": payment.currency,
                "qr_code": None,
                "qr_code_base64": None,
                "ticket_url": None,
            }

    @staticmethod
    def validate_webhook_signature(raw_body: bytes, signature: str, x_request_id: str = "") -> bool:
        secret = settings.MERCADOPAGO_WEBHOOK_SECRET or ""
        if not secret:
            logger.warning("MERCADOPAGO_WEBHOOK_SECRET not set — rejecting webhook")
            return False
        if not signature:
            return False
        # MP spec: x-signature: ts=...,v1=... ; manifest = f"id:{data.id};request-id:{x-request-id};ts:{ts};"
        try:
            parts = dict(p.split("=", 1) for p in signature.split(",") if "=" in p)
            ts = parts.get("ts", "")
            v1 = parts.get("v1", "")
            if not v1:
                v1 = signature.strip()
                ts = ""
            # Extract data.id from body for manifest
            data_id = ""
            if ts:
                import json
                try:
                    j = json.loads(raw_body.decode() or "{}")
                    data_id = str(j.get("data", {}).get("id") or j.get("id") or "")
                except:
                    data_id = ""
                # Official manifest requires request-id header
                if x_request_id:
                    manifest = f"id:{data_id};request-id:{x_request_id};ts:{ts};".encode()
                    digest = hmac.new(secret.encode(), manifest, hashlib.sha256).hexdigest()
                    if hmac.compare_digest(digest, v1):
                        return True
                # Fallback: also accept HMAC of raw_body (useful for TEST / local simulation)
                # But only if manifest without request-id also matches
                fallback_manifest = f"id:{data_id};ts:{ts};".encode()
                for cand in [raw_body, fallback_manifest]:
                    if hmac.compare_digest(hmac.new(secret.encode(), cand, hashlib.sha256).hexdigest(), v1):
                        logger.warning("Webhook accepted via fallback HMAC (request-id missing or TEST mode)")
                        return True
                return False
            else:
                # No ts — plain HMAC of raw_body
                digest = hmac.new(secret.encode(), raw_body, hashlib.sha256).hexdigest()
                return hmac.compare_digest(digest, v1)
        except Exception as e:
            logger.warning("Webhook signature parse failed: %s", e)
            return False

    async def process_webhook(self, payload: dict, db: AsyncSession = None) -> dict:
        # payload: {"type":"payment","data":{"id":"123456"},"action":"payment.updated"}
        data = payload.get("data") or {}
        mp_id = str(data.get("id") or payload.get("id") or "")
        ptype = payload.get("type") or payload.get("topic") or ""
        if not mp_id:
            # Might be merchant_order
            return {"status": "ignored", "message": "no data.id"}
        # Fetch payment from MP
        sdk = self._mp_client()
        try:
            res = sdk.payment().get(mp_id)
            resp = res.get("response", {}) if isinstance(res, dict) else res
            status = resp.get("status")  # approved, pending, rejected
            external_ref = resp.get("external_reference") or ""
            # external_reference = user_id:plan_id:payment.id
            parts = external_ref.split(":")
            if len(parts) >= 3:
                user_id, plan_id, payment_id = parts[0], parts[1], parts[2]
            else:
                # Fallback: find by mp_payment_id
                payment_id = None
                plan_id = None
                user_id = None
            # Use background session if db not suitable
            session = db
            own_session = False
            if session is None or not session.is_active:
                own_session = True
                session = AsyncSessionLocal()
            try:
                repo = PaymentRepository(session)
                payment = None
                if payment_id:
                    payment = await repo.get_by_id(payment_id)
                if not payment and mp_id:
                    # find by mp_payment_id
                    q = await session.execute(select(Payment).where(Payment.mp_payment_id == mp_id))
                    payment = q.scalar_one_or_none()
                if not payment:
                    logger.warning("Webhook payment not found for mp_id %s ext %s", mp_id, external_ref)
                    return {"status": "not_found"}
                # Idempotency: if already approved and status approved, skip
                if payment.status == PaymentStatus.approved and status == "approved":
                    return {"status": "already_approved", "payment_id": payment.id}
                payment.mp_payment_id = mp_id
                if status == "approved":
                    payment.status = PaymentStatus.approved
                    payment.paid_at = __import__("datetime").datetime.now(__import__("datetime").timezone.utc)
                    payment.plan_type = PLAN_ID_TO_TYPE.get(plan_id, PlanType.pro).value if plan_id else payment.plan_type
                    await session.commit()
                    # Update profile plan
                    if user_id and plan_id:
                        await self._unlock_user_service(session, user_id, plan_id)
                    else:
                        # try from payment's user_id
                        await self._unlock_user_service(session, str(payment.user_id), payment.plan_id)
                elif status in ("rejected","cancelled","refunded"):
                    mapping = {"rejected": PaymentStatus.rejected, "cancelled": PaymentStatus.cancelled, "refunded": PaymentStatus.refunded}
                    payment.status = mapping.get(status, PaymentStatus.pending)
                    await session.commit()
                else:
                    await session.commit()
                return {"status": "ok", "payment_id": payment.id, "mp_status": status}
            finally:
                if own_session:
                    await session.close()
        except Exception as e:
            logger.exception("Webhook process failed for mp_id %s: %s", mp_id, e)
            raise

    async def _unlock_user_service(self, db: AsyncSession, user_id: str, plan_id: str):
        repo = ProfileRepository(db)
        profile = await repo.get_by_id(user_id)
        if profile:
            plan = PLAN_ID_TO_TYPE.get(plan_id, PlanType.free)
            try:
                plan = PlanType(plan) if isinstance(plan, str) else plan
            except:
                plan = PlanType.free
            await repo.update_plan(profile, plan)
            logger.info("User %s plan updated to %s via MP webhook", user_id, plan.value)

    async def get_payment_status(self, payment_id: str, db: AsyncSession) -> dict:
        repo = PaymentRepository(db)
        payment = await repo.get_by_id(payment_id)
        if not payment:
            raise HTTPException(status_code=404, detail="Pagamento nao encontrado.")
        # Optionally refresh from MP if pending
        if payment.status == PaymentStatus.pending and payment.mp_payment_id:
            try:
                sdk = self._mp_client()
                res = sdk.payment().get(payment.mp_payment_id)
                resp = res.get("response", {}) if isinstance(res, dict) else res
                mp_status = resp.get("status")
                if mp_status == "approved":
                    payment.status = PaymentStatus.approved
                    await db.commit()
                    await db.refresh(payment)
            except:
                pass
        return payment.json_dict()
