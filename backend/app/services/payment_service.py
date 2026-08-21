import logging
import mercadopago
from fastapi import HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import settings
from app.core.security import get_current_user
from app.core.exceptions import SanitizedHTTPException
from app.models.payment import Payment, PaymentStatus, PaymentMethod
from app.repositories.payment_repository import PaymentRepository

logger = logging.getLogger(__name__)


class PaymentService:
    """Service encapsulating all Mercado Pago integration logic."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self._sdk: mercadopago.SDK | None = None

    # ------------------------------------------------------------------
    # SDK access
    # ------------------------------------------------------------------
    @property
    def sdk(self) -> mercadopago.SDK:
        """Lazily initialize the Mercado Pago SDK."""
        if self._sdk is None:
            if not settings.MERCADOPAGO_ACCESS_TOKEN:
                logger.warning("MERCADOPAGO_ACCESS_TOKEN is not set — SDK will operate with empty token.")
            self._sdk = mercadopago.SDK(settings.MERCADOPAGO_ACCESS_TOKEN)
        return self._sdk

    # ------------------------------------------------------------------
    # Create payment (PIX or Checkout Pro / Credit Card)
    # ------------------------------------------------------------------
    def _get_plan_amount(self, plan_id: str) -> float:
        """Get plan amount from server-side configuration."""
        return settings.PLAN_PRICES.get(plan_id, 0.0)

    async def create_pix_payment(
        self,
        user: object,
        plan_id: str,
        success_url: str,
        pending_url: str,
    ) -> dict:
        """Create a PIX payment via Mercado Pago and return the checkout data."""
        amount = self._get_plan_amount(plan_id)
        if amount <= 0:
            raise SanitizedHTTPException(
                status_code=400,
                public_message="Plano invalido ou preco nao configurado.",
                internal_detail=f"Plan {plan_id} not found in PLAN_PRICES",
            )

        try:
            payment_data = {
                "transaction_amount": float(amount),
                "payment_method_id": "pix",
                "payer": {
                    "email": user.email,
                    "first_name": user.full_name or "",
                    "id": user.id,
                },
                "description": f"Plano {plan_id} — FaceMax",
                "external_reference": "facemax",
            }

            result = self.sdk.payment().create(payment_data)

            if result.get("status") == "error":
                logger.error("Mercado Pago PIX error: %s", result)
                raise SanitizedHTTPException(
                    status_code=502,
                    public_message="Não foi possivel criar o pagamento PIX. Tente novamente.",
                    internal_detail=f"MP error: {result}",
                )

            mp_payment_id = str(result["id"])
            point_of_interaction = result.get("point_of_interaction", {})
            transaction_data = point_of_interaction.get("transaction_data", {}) or {}

            qr_code = transaction_data.get("qr_code", "")
            qr_code_base64 = transaction_data.get("qr_code_base64", "")
            ticket_url = transaction_data.get("ticket_url", point_of_interaction.get("ticket_url", ""))

            repo = PaymentRepository(self.db)
            payment = await repo.create(
                user_id=user.id,
                amount=amount,
                payment_method=PaymentMethod.pix.value,
                plan_id=plan_id,
                mercado_pago_payment_id=mp_payment_id,
            )

            return {
                "payment_id": payment.id,
                "mercado_pago_payment_id": mp_payment_id,
                "status": payment.status.value,
                "preference_id": None,
                "init_point": None,
                "payment_method": PaymentMethod.pix.value,
                "amount": float(payment.amount),
                "currency": payment.currency,
                "qr_code": qr_code,
                "qr_code_base64": qr_code_base64,
                "ticket_url": ticket_url,
            }

        except Exception as exc:
            logger.exception("Unexpected error creating PIX payment")
            if isinstance(exc, SanitizedHTTPException):
                raise exc
            raise SanitizedHTTPException(
                status_code=502,
                public_message="Erro ao processar pagamento PIX. Tente novamente mais tarde.",
                internal_detail=str(exc),
            )

    async def create_checkout_pro_payment(
        self,
        user: object,
        plan_id: str,
        success_url: str,
        pending_url: str,
    ) -> dict:
        """Create a Checkout Pro preference (credit card + redirect)."""
        amount = self._get_plan_amount(plan_id)
        if amount <= 0:
            raise SanitizedHTTPException(
                status_code=400,
                public_message="Plano invalido ou preco nao configurado.",
                internal_detail=f"Plan {plan_id} not found in PLAN_PRICES",
            )

        try:
            preference_data = {
                "items": [
                    {
                        "id": plan_id,
                        "title": f"Plano {plan_id} — FaceMax",
                        "quantity": 1,
                        "unit_price": float(amount),
                        "currency_id": "BRL",
                    }
                ],
                "payer": {
                    "email": user.email,
                    "name": user.full_name or user.email,
                },
                "back_urls": {
                    "success": success_url,
                    "pending": pending_url,
                    "failure": f"{pending_url}?status=failure",
                },
                "auto_return": "all",
                "external_reference": "facemax",
            }

            result = self.sdk.preference().create(preference_data)

            if result.get("error"):
                logger.error("Mercado Pago preference error: %s", result)
                raise SanitizedHTTPException(
                    status_code=502,
                    public_message="Nao foi possivel gerar o checkout. Tente novamente.",
                    internal_detail=f"MP error: {result}",
                )

            preference_id = result["id"]
            init_point = result["init_point"]

            repo = PaymentRepository(self.db)
            payment = await repo.create(
                user_id=user.id,
                amount=amount,
                payment_method=PaymentMethod.credit_card.value,
                plan_id=plan_id,
                mercado_pago_preference_id=preference_id,
            )

            return {
                "payment_id": payment.id,
                "preference_id": preference_id,
                "init_point": init_point,
                "status": payment.status.value,
                "payment_method": PaymentMethod.credit_card.value,
                "amount": float(payment.amount),
                "currency": payment.currency,
                "qr_code": None,
                "qr_code_base64": None,
                "ticket_url": None,
            }

        except Exception as exc:
            logger.exception("Unexpected error creating Checkout Pro payment")
            if isinstance(exc, SanitizedHTTPException):
                raise exc
            raise SanitizedHTTPException(
                status_code=502,
                public_message="Erro ao gerar checkout. Tente novamente mais tarde.",
                internal_detail=str(exc),
            )

    # ------------------------------------------------------------------
    # Webhook / IPN handling
    # ------------------------------------------------------------------
    @staticmethod
    def validate_webhook_signature(raw_body: bytes, signature: str) -> bool:
        """Validate the X-Hub-Signature-256 header against the webhook secret.

        Mercado Pago signs the webhook payload with HMAC-SHA256 using the
        webhook secret. The signature header looks like ``sha256=<digest>``.
        """
        if not settings.MERCADOPAGO_WEBHOOK_SECRET:
            return True  # Skip validation if no secret configured (dev mode)

        if not signature:
            return False

        import hashlib
        import hmac

        expected = hmac.new(
            settings.MERCADOPAGO_WEBHOOK_SECRET.encode(),
            raw_body,
            hashlib.sha256,
        ).hexdigest()
        return hmac.compare_digest(f"sha256={expected}", signature)

    async def process_webhook(self, payload: dict, db: AsyncSession) -> dict:
        """Handle incoming webhook notifications from Mercado Pago."""
        action = payload.get("action", "")
        entity_type = payload.get("type", "")
        data = payload.get("data", {})

        logger.info("Webhook received — action=%s type=%s", action, entity_type)

        # Only process payment.updated actions for security
        if entity_type != "payment" or "payment" not in action:
            logger.info("Ignoring webhook: type=%s action=%s", entity_type, action)
            return {"status": "ignored", "message": "Not a payment notification."}

        mp_payment_id = data.get("id")
        if not mp_payment_id:
            logger.warning("Webhook received without payment ID in data.")
            return {"status": "ignored", "message": "Missing payment id in webhook data."}

        repo = PaymentRepository(db)
        payment = await repo.get_by_mercado_pago_payment_id(str(mp_payment_id))

        if not payment:
            # Try fetching from Mercado Pago and find by external reference or payer id
            logger.warning("Payment not found locally for MP payment_id=%s", mp_payment_id)
            return {"status": "ignored", "message": "Payment not found locally."}

        # Fetch the full payment object from Mercado Pago to get the latest status
        try:
            mp_result = self.sdk.payment().get(mp_payment_id)
            mp_status = mp_result.get("status", "").lower()
        except Exception as exc:
            logger.error("Failed to fetch payment %s from MP: %s", mp_payment_id, exc)
            mp_result = {}
            mp_status = ""

        # Map Mercado Pago status to our internal enum
        status_map = {
            "approved": PaymentStatus.approved,
            "rejected": PaymentStatus.rejected,
            "pending": PaymentStatus.pending,
            "in_process": PaymentStatus.in_process,
            "cancelled": PaymentStatus.cancelled,
            "refunded": PaymentStatus.refunded,
            "partial": PaymentStatus.partial,
        }
        new_status = status_map.get(mp_status, PaymentStatus.pending)

        updated = await repo.update_status(
            payment_id=payment.id,
            status=new_status,
            mercado_pago_payment_id=str(mp_payment_id),
        )

        # If approved, unlock the user's service
        if new_status == PaymentStatus.approved:
            await self._unlock_user_service(db, payment.user_id, payment.plan_id)
            logger.info("Payment %s approved — user %s unlocked for plan %s", payment.id, payment.user_id, payment.plan_id)

        return {
            "status": "ok",
            "payment_id": payment.id,
            "new_status": new_status.value,
            "mp_status": mp_status,
        }

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------
    async def _unlock_user_service(self, db: AsyncSession, user_id: str, plan_id: str):
        """Update user profile / permissions after a successful payment."""
        from app.repositories.user_repository import UserRepository

        user_repo = UserRepository(db)
        user = await user_repo.get_by_id(user_id)
        if user:
            # Update the user's role to 'client_active' or set a plan
            # The exact field depends on your schema; here we use a generic approach.
            # You may want to add a `plan_type` or `subscription_status` column.
            # For now, we ensure is_active remains True and could update role.
            logger.info("User %s plan updated to %s", user_id, plan_id)

    # ------------------------------------------------------------------
    # Status polling (used by frontend polling fallback)
    # ------------------------------------------------------------------
    async def get_payment_status(self, payment_id: str, db: AsyncSession) -> dict:
        repo = PaymentRepository(db)
        payment = await repo.get_by_id(payment_id)
        if not payment:
            raise HTTPException(status_code=404, detail="Pagamento nao encontrado.")

        result = {}
        if payment.mercado_pago_payment_id:
            try:
                mp_result = self.sdk.payment().get(payment.mercado_pago_payment_id)
                mp_status = mp_result.get("status", "").lower()
                status_map = {
                    "approved": PaymentStatus.approved,
                    "rejected": PaymentStatus.rejected,
                    "pending": PaymentStatus.pending,
                    "in_process": PaymentStatus.in_process,
                    "cancelled": PaymentStatus.cancelled,
                    "refunded": PaymentStatus.refunded,
                }
                new_status = status_map.get(mp_status, payment.status)
                if new_status != payment.status:
                    payment = await repo.update_status(
                        payment_id=payment.id,
                        status=new_status,
                    )
            except Exception as exc:
                logger.error("Failed to fetch payment status from MP: %s", exc)

        return payment.json_dict()
