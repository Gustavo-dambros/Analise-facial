import hashlib
import hmac
import logging
import time
import uuid

import httpx
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
from app.core.config import settings

logger = logging.getLogger(__name__)

PLAN_ID_TO_TYPE = {
    "plan_avulsa": PlanType.pro,
    "plan_monthly": PlanType.pro,
    "plan_annual": PlanType.enterprise,
    "plan_black": PlanType.enterprise,
    "pro": PlanType.pro,
    "enterprise": PlanType.enterprise,
    "free": PlanType.free,
}

# NOTA: os display names abaixo eram usados nas descrições de item do
# Mercado Pago (descontinuado) e foram removidos. A Cakto identifica o
# produto exclusivamente pelo offerId (PLAN_OFFER_MAP).

# ── Cakto token cache (module-level) ──────────────────────────────────
_cakto_access_token: str | None = None
_cakto_expires_at: float = 0.0


async def _get_user_email_from_supabase(user_id: str) -> str | None:
    """Busca email do usuário no Supabase via service role (admin API)."""
    if not (settings.SUPABASE_URL and settings.SUPABASE_SERVICE_ROLE_KEY):
        return None
    try:
        import httpx
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                f"{settings.SUPABASE_URL}/auth/v1/admin/users/{user_id}",
                headers={
                    "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
                    "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}",
                },
            )
        if resp.status_code == 200:
            data = resp.json()
            return data.get("email")
    except Exception as exc:
        logger.warning("Falha ao buscar email no Supabase para user_id=%s: %s", user_id, exc)
    return None


def _coerce_uuid(value):
    """Converte str UUID em objeto uuid.UUID.

    As colunas user_id/profile.id são UUID(as_uuid=True): no SQLite o bind
    exige objeto UUID (str quebra com AttributeError), no Postgres ambos
    funcionam. O webhook Cakto entrega user_id como string no metadata,
    então convertemos aqui para o fluxo funcionar em qualquer banco.
    """
    if isinstance(value, str):
        try:
            return uuid.UUID(value)
        except (ValueError, AttributeError):
            return value
    return value


class PaymentService:
    def __init__(self, db: AsyncSession):
        self.db = db

    def _get_plan_amount(self, plan_id: str, payment_method: str = "pix") -> float:
        plan_prices = settings.PLAN_PRICES.get(plan_id)
        if not plan_prices:
            return 0.0
        # Método único é Cakto/PIX — usa preço "pix" como base (fallback para "cakto" se existir).
        if payment_method == "cakto":
            return plan_prices.get("cakto", plan_prices.get("pix", 0.0))
        return plan_prices.get(payment_method, 0.0)

    # ── Mercado Pago (DESCONTINUADO — somente Cakto) ────────────────

    def _mp_client(self):
        raise SanitizedHTTPException(status_code=410, public_message="Mercado Pago descontinuado. Pagamento somente via Cakto (PIX).", internal_detail="MP disabled")

    async def create_pix_payment(self, user: object, plan_id: str, success_url: str, pending_url: str) -> dict:
        raise SanitizedHTTPException(status_code=410, public_message="Mercado Pago descontinuado. Pagamento somente via Cakto (PIX).", internal_detail="create_pix_payment disabled")

    async def create_checkout_pro_payment(self, user: object, plan_id: str, success_url: str, pending_url: str) -> dict:
        raise SanitizedHTTPException(status_code=410, public_message="Mercado Pago descontinuado. Pagamento somente via Cakto (PIX).", internal_detail="create_checkout_pro_payment disabled")

    async def create_preference(self, user: object, plan_id: str, success_url: str, pending_url: str, payment_method: str = "pix") -> dict:
        raise SanitizedHTTPException(status_code=410, public_message="Mercado Pago descontinuado. Pagamento somente via Cakto (PIX). Use /payments/create-cakto.", internal_detail=f"create_preference disabled: {payment_method}")

    @staticmethod
    def validate_webhook_signature(raw_body: bytes, signature: str, x_request_id: str = "") -> bool:
        secret = settings.MERCADOPAGO_WEBHOOK_SECRET or ""
        if not secret:
            logger.warning("MERCADOPAGO_WEBHOOK_SECRET not set — rejecting webhook")
            return False
        if not signature:
            return False
        try:
            parts = dict(p.split("=", 1) for p in signature.split(",") if "=" in p)
            ts = parts.get("ts", "")
            v1 = parts.get("v1", "")
            if not v1:
                v1 = signature.strip()
                ts = ""
            data_id = ""
            if ts:
                import json
                try:
                    j = json.loads(raw_body.decode() or "{}")
                    data_id = str(j.get("data", {}).get("id") or j.get("id") or "")
                except Exception:
                    data_id = ""
                if x_request_id:
                    manifest = f"id:{data_id};request-id:{x_request_id};ts:{ts};".encode()
                    digest = hmac.new(secret.encode(), manifest, hashlib.sha256).hexdigest()
                    if hmac.compare_digest(digest, v1):
                        return True
                fallback_manifest = f"id:{data_id};ts:{ts};".encode()
                for cand in [raw_body, fallback_manifest]:
                    if hmac.compare_digest(hmac.new(secret.encode(), cand, hashlib.sha256).hexdigest(), v1):
                        logger.warning("Webhook accepted via fallback HMAC (request-id missing or TEST mode)")
                        return True
                return False
            else:
                digest = hmac.new(secret.encode(), raw_body, hashlib.sha256).hexdigest()
                return hmac.compare_digest(digest, v1)
        except Exception as e:
            logger.warning("Webhook signature parse failed: %s", e)
            return False

    async def process_webhook(self, payload: dict, db: AsyncSession = None) -> dict:
        # Mercado Pago descontinuado — somente Cakto (process_cakto_webhook).
        logger.warning("process_webhook (MP) chamado mas descontinuado — ignorado")
        return {"status": "ignored", "message": "Mercado Pago descontinuado. Use Cakto."}

    async def _unlock_user_service(self, db: AsyncSession, user_id: str, plan_id: str):
        """
        Atualiza profiles.plan de forma atômica dentro da transação do webhook.
        Usa SELECT ... FOR UPDATE para evitar corrida com uploads concorrentes.
        NÃO faz commit — o chamador (process_*_webhook) comita payment+profile juntos.
        """
        from sqlalchemy import select as _select
        from app.models.profile import Profile as _Profile

        user_uuid = _coerce_uuid(user_id)
        # Lock da linha do perfil para evitar corrida com check_monthly_limit
        try:
            result = await db.execute(_select(_Profile).where(_Profile.id == user_uuid).with_for_update())
            profile = result.scalar_one_or_none()
        except Exception:
            # Fallback sem lock (ex.: SQLite sem suporte FOR UPDATE)
            repo = ProfileRepository(db)
            profile = await repo.get_by_id(user_uuid)

        if not profile:
            logger.warning("_unlock_user_service: profile %s not found", user_id)
            return

        plan = PLAN_ID_TO_TYPE.get(plan_id, PlanType.free)
        try:
            plan = PlanType(plan) if isinstance(plan, str) else plan
        except Exception:
            plan = PlanType.free

        # Persiste plan_id fino (plan_monthly) para cota correta; profiles.plan é varchar(20)
        if plan_id in settings.PLAN_PRICES:
            profile.plan = plan_id
            db.add(profile)
            logger.info("User %s plan updated to %s (type %s) via webhook (pending commit)", user_id, plan_id, plan.value)
        else:
            profile.plan = plan.value if hasattr(plan, "value") else str(plan)
            db.add(profile)
            logger.info("User %s plan updated to %s via webhook (pending commit)", user_id, profile.plan)

    async def get_payment_status(self, payment_id: str, db: AsyncSession) -> dict:
        repo = PaymentRepository(db)
        payment = await repo.get_by_id(payment_id)
        if not payment:
            raise HTTPException(status_code=404, detail="Pagamento nao encontrado.")
        # Status é atualizado via webhook Cakto; sem polling externo (MP descontinuado).
        return payment.json_dict()

    # ── Cakto (OAuth2 Public API) ─────────────────────────────────────

    async def _get_cakto_access_token(self) -> str:
        """Obtém access_token OAuth2 via POST {CAKTO_BASE_URL}/token/ com cache."""
        global _cakto_access_token, _cakto_expires_at
        now = time.time()
        if _cakto_access_token and now < _cakto_expires_at - 60:
            return _cakto_access_token
        if not settings.CAKTO_CLIENT_ID or not settings.CAKTO_CLIENT_SECRET:
            raise SanitizedHTTPException(
                status_code=500,
                public_message="Cakto não configurado.",
                internal_detail="CAKTO_CLIENT_ID/CAKTO_CLIENT_SECRET missing",
            )
        url = f"{settings.CAKTO_BASE_URL.rstrip('/')}/token/"
        # Cakto exige application/x-www-form-urlencoded (JSON retorna 401/invalid_client)
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                url,
                data={"client_id": settings.CAKTO_CLIENT_ID, "client_secret": settings.CAKTO_CLIENT_SECRET},
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )
            # Fallback: tenta JSON se form falhar com 400
            if resp.status_code == 400:
                resp = await client.post(
                    url,
                    json={"client_id": settings.CAKTO_CLIENT_ID, "client_secret": settings.CAKTO_CLIENT_SECRET},
                    headers={"Content-Type": "application/json"},
                )
            resp.raise_for_status()
            data = resp.json()
            token = data.get("access_token")
            expires_in = int(data.get("expires_in", 36000))
            if not token:
                raise SanitizedHTTPException(status_code=502, public_message="Falha ao obter token Cakto.", internal_detail=str(data))
            _cakto_access_token = token
            _cakto_expires_at = now + expires_in
            logger.info("Cakto access_token obtido, expira em %s s", expires_in)
            return token

    async def create_cakto_payment(
        self,
        user: object,
        plan_id: str,
        success_url: str,
        pending_url: str,
        idempotency_key: str | None = None,
    ) -> dict:
        if plan_id not in settings.PLAN_PRICES:
            raise SanitizedHTTPException(status_code=400, public_message="Plano inválido.", internal_detail=f"plan_id {plan_id}")
        # Resolve offerId via PLAN_OFFER_MAP; suporta tanto plan_id completo quanto chave curta
        offer_id = settings.PLAN_OFFER_MAP.get(plan_id)
        # Fallback: map short keys (avulsa/monthly/annual/black) if full plan_id not found
        if not offer_id:
            short_map = {"plan_avulsa": "avulsa", "plan_monthly": "monthly", "plan_annual": "annual", "plan_black": "black"}
            short_key = short_map.get(plan_id)
            if short_key:
                offer_id = settings.PLAN_OFFER_MAP.get(short_key)
        if not offer_id or offer_id.startswith("OFFER_ID_"):
            raise SanitizedHTTPException(
                status_code=500,
                public_message="Oferta Cakto não configurada para este plano.",
                internal_detail=f"PLAN_OFFER_MAP[{plan_id}] = {offer_id}",
            )
        amount = self._get_plan_amount(plan_id, "pix")
        if amount <= 0:
            raise SanitizedHTTPException(status_code=400, public_message="Preço não configurado.", internal_detail=plan_id)
        plan_type = PLAN_ID_TO_TYPE.get(plan_id, PlanType.pro).value
        user_uuid = _coerce_uuid(user.id)
        # Cancela órfãos: tentativas anteriores do mesmo usuário+plano que nunca
        # chegaram à Cakto (sem cakto_payment_id) — ex.: POST com falha de rede
        # onde o frontend gerou uma nova idempotency_key. Evita acúmulo de
        # pendências que confundem o suporte e a tela de status.
        from sqlalchemy import update as _update

        await self.db.execute(
            _update(Payment)
            .where(Payment.user_id == user_uuid)
            .where(Payment.plan_id == plan_id)
            .where(Payment.status == PaymentStatus.pending)
            .where(Payment.cakto_payment_id.is_(None))
            .values(status=PaymentStatus.cancelled)
        )
        repo = PaymentRepository(self.db)
        payment = await repo.create(user_id=user_uuid, amount=amount, payment_method="cakto", plan_id=plan_id)
        payment.plan_type = plan_type
        # Persist offer_id if column exists
        if hasattr(payment, "offer_id"):
            try:
                payment.offer_id = offer_id
            except Exception:
                pass
        await self.db.commit()
        await self.db.refresh(payment)

        try:
            token = await self._get_cakto_access_token()
            # Email: tenta do perfil, se vazio busca no Supabase (service role)
            user_email = getattr(user, "email", "") or ""
            if not user_email:
                user_email = await _get_user_email_from_supabase(str(user.id)) or ""
            payload = {
                "paymentMethod": "pix",
                "customer": {
                    "name": getattr(user, "full_name", "") or getattr(user, "name", "") or "Cliente FaceMax",
                    "email": user_email,
                    "phone": getattr(user, "phone", None) or getattr(user, "phone_number", None) or "00000000000",
                },
                "items": [{"offerId": offer_id}],
                "metadata": {
                    "user_id": str(user.id),
                    "plan_id": plan_id,
                },
            }
            # Add fingerprint if available, else generate a stable one per user
            fp = getattr(user, "fingerprint", None)
            if fp:
                payload["customer"]["fingerprint"] = fp
            else:
                # Cakto requires fingerprint; use deterministic uuid5 based on user.id
                payload["customer"]["fingerprint"] = str(uuid.uuid5(uuid.NAMESPACE_DNS, str(user.id)))

            url = f"{settings.CAKTO_BASE_URL.rstrip('/')}/payments/"
            # Idempotência fim a fim: o frontend gera uma chave por tentativa de
            # checkout e a repassamos à Cakto, de modo que retries de rede não
            # criem cobranças duplicadas. Sem chave do cliente, geramos uma.
            idem_key = (idempotency_key or "").strip() or str(uuid.uuid4())
            headers = {
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
                "X-Idempotency-Key": idem_key,
            }
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.post(url, headers=headers, json=payload)
                resp.raise_for_status()
                data = resp.json()

            cakto_id = data.get("id") or data.get("payment_id") or data.get("externalId")
            qr_code = None
            expiration = None
            if isinstance(data.get("pix"), dict):
                qr_code = data["pix"].get("qrCode") or data["pix"].get("qr_code")
                expiration = data["pix"].get("expirationDate")
            # Fallbacks for different response shapes
            qr_code = qr_code or data.get("pix_qr_code") or data.get("qr_code")
            checkout_url = data.get("checkoutUrl") or data.get("checkout_url") or data.get("init_point") or data.get("url")
            if cakto_id:
                payment.cakto_payment_id = str(cakto_id)
                if hasattr(payment, "offer_id"):
                    try:
                        payment.offer_id = offer_id
                    except Exception:
                        pass
                await self.db.commit()
                await self.db.refresh(payment)
            return {
                "payment_id": payment.id,
                "status": payment.status.value,
                "preference_id": None,
                "init_point": checkout_url,
                "payment_method": "cakto",
                "amount": float(payment.amount),
                "currency": payment.currency,
                "qr_code": qr_code,
                "qr_code_base64": None,
                "ticket_url": checkout_url,
            }
        except httpx.HTTPStatusError as e:
            body = e.response.text[:500]
            logger.exception("Cakto API error: %s %s", e.response.status_code, body)
            # Fallback DEV: quando Cakto não tem produto disponível, gera QR mock para não travar checkout em DEBUG
            if settings.DEBUG and ("não está disponível" in body or "not available" in body.lower()):
                logger.warning("DEBUG: gerando QR mock para %s (Cakto produto indisponível)", plan_id)
                mock_qr = f"00020126580014BR.GOV.BCB.PIX0136{str(payment.id)[:32]}520400005303986540{float(amount):.2f}5802BR5925FACEMAX{plan_id[:8]}6009SAO PAULO62070503***6304"
                mock_url = f"http://localhost:5173/checkout-simulation?mock={payment.id}"
                # Persiste mock id para rastreio
                try:
                    payment.cakto_payment_id = f"mock_{payment.id}"
                    await self.db.commit()
                    await self.db.refresh(payment)
                except Exception:
                    pass
                return {
                    "payment_id": payment.id,
                    "status": payment.status.value,
                    "preference_id": None,
                    "init_point": mock_url,
                    "payment_method": "cakto",
                    "amount": float(payment.amount),
                    "currency": payment.currency,
                    "qr_code": mock_qr,
                    "qr_code_base64": None,
                    "ticket_url": mock_url,
                }
            if "não está disponível" in body or "not available" in body.lower():
                raise SanitizedHTTPException(
                    status_code=502,
                    public_message="Produto Cakto não disponível para venda. Ative a oferta no painel da Cakto.",
                    internal_detail=f"Cakto {e.response.status_code}: {body}",
                )
            # Outros erros 4xx/5xx: repassa como 502
            detail = body
            try:
                j = e.response.json()
                detail = j.get("detail") or j.get("message") or body
            except Exception:
                pass
            raise SanitizedHTTPException(
                status_code=502,
                public_message=f"Falha na Cakto ({e.response.status_code}): {detail[:120]}",
                internal_detail=body,
            )
        except Exception as e:
            # Falha inesperada (rede, timeout, JSON inválido...): NÃO retorna
            # registro "vazio" — o frontend mostraria "Carregando código PIX..."
            # para sempre e o polling atingiria o timeout de 5 min. Levanta 502
            # para que a UI exiba o erro imediatamente e o usuário gere um
            # novo PIX (a mesma idempotency_key pode ser reutilizada, e os
            # órfãos sem cakto_payment_id são cancelados na próxima criação).
            logger.exception("Cakto payment create failed: %s", e)
            raise SanitizedHTTPException(
                status_code=502,
                public_message="Falha ao gerar o PIX na Cakto. Tente novamente.",
                internal_detail=f"{type(e).__name__}: {str(e)[:200]}",
            )

    @staticmethod
    def validate_cakto_webhook_signature(raw_body: bytes, signature: str, timestamp: str = "") -> bool:
        """
        Valida assinatura HMAC da Cakto: digest = HMAC-SHA256(secret, f"{timestamp}.{raw_body}").
        Header: X-Cakto-Signature: v1=<hex>  e X-Cakto-Timestamp: unix seconds
        Protege contra replay: rejeita se |now - timestamp| > 300s.
        """
        secret = settings.CAKTO_WEBHOOK_SECRET or ""
        if not secret:
            logger.warning("CAKTO_WEBHOOK_SECRET not set — rejecting webhook")
            return False
        if not signature:
            return False
        # ── Replay protection: timestamp must be recent (±300s) ──
        if timestamp:
            try:
                ts_int = int(str(timestamp).strip())
                now = int(time.time())
                if abs(now - ts_int) > 300:
                    logger.warning("Cakto webhook rejected — stale timestamp ts=%s now=%s delta=%s", ts_int, now, abs(now - ts_int))
                    return False
            except (ValueError, TypeError):
                logger.warning("Cakto webhook rejected — invalid timestamp %r", timestamp)
                return False
        try:
            # Remove prefix v1= if present (may contain multiple versions separated by comma)
            sig_value = signature.strip()
            # Handle "v1=abc, v2=def" — extract v1
            if "," in sig_value:
                parts = [p.strip() for p in sig_value.split(",")]
                v1_part = next((p for p in parts if p.startswith("v1=")), None)
                if v1_part:
                    sig_value = v1_part[3:]
                else:
                    sig_value = sig_value.split("=")[-1]
            elif sig_value.startswith("v1="):
                sig_value = sig_value[3:]
            # If timestamp provided, compute f"{timestamp}.{raw_body}"
            if timestamp:
                message = f"{timestamp}.".encode("utf-8") + raw_body
            else:
                # Fallback: try raw_body only (legacy)
                message = raw_body
            expected = hmac.new(secret.encode("utf-8"), message, hashlib.sha256).hexdigest()
            return hmac.compare_digest(expected, sig_value)
        except Exception as e:
            logger.warning("Cakto webhook signature check failed: %s", e)
            return False

    @staticmethod
    def _extract_offer_candidates(data: dict) -> list:
        """Extrai possíveis identificadores de oferta do payload Cakto.

        O formato exato varia (offer aninhado, items, chaves soltas); coletamos
        defensivamente sem presumir schema. Usado apenas para LOG de
        divergência — nunca bloqueia a aprovação (o formato não é contratado).
        """
        candidates = []
        for key in ("offerId", "offer_id"):
            value = data.get(key)
            if isinstance(value, str) and value:
                candidates.append(value)
        offer = data.get("offer")
        if isinstance(offer, dict):
            for key in ("id", "offerId", "offer_id", "short_id", "shortId", "slug"):
                value = offer.get(key)
                if isinstance(value, str) and value:
                    candidates.append(value)
        items = data.get("items")
        if isinstance(items, list) and items and isinstance(items[0], dict):
            for key in ("offerId", "offer_id", "id"):
                value = items[0].get(key)
                if isinstance(value, str) and value:
                    candidates.append(value)
        return candidates

    async def process_cakto_webhook(self, payload: dict, db: AsyncSession = None) -> dict:
        """Processa webhooks da Cakto e libera/bloqueia benefícios conforme o evento.

        Envelope: { "event": "<id>", "data": { "id": "...", "status": "...",
        "metadata": { "user_id": "...", "plan_id": "..." }, "offer": {...} } }
        (`data` também pode vir como lista — usa-se o primeiro elemento.)

        Catálogo de eventos (enum real `event_id` da Cakto) e tratamento:
        - purchase_approved + status paid → aprova e libera o plano (ÚNICO que desbloqueia).
        - purchase_refused (ou status refused/denied/failed/cancelled) → rejeita;
          o polling do frontend para de aguardar em vez de expirar em 5 min.
        - refund / chargeback → marca reembolsado e rebaixa o perfil para free
          (evita manter benefícios após estorno).
        - pix_gerado, boleto_gerado, picpay_gerado, openfinance_nubank_gerado,
          checkout_abandonment, subscription_* → informativos, ignorados.
        """
        event = payload.get("event") or ""
        data = payload.get("data") or {}
        # Handle V2 where data is list
        if isinstance(data, list):
            if not data:
                return {"status": "ignored", "message": "empty data list"}
            # Use first element for main order; extensível para iterar todos se necessário
            data = data[0] if isinstance(data[0], dict) else {}
        cakto_id = str(data.get("id") or payload.get("id") or "")
        status_raw = str(data.get("status") or "").lower()
        metadata = data.get("metadata") or {}
        # metadata may be nested inside offer or top-level; ensure dict
        if not isinstance(metadata, dict):
            metadata = {}
        user_id = str(metadata.get("user_id") or "")
        plan_id = str(metadata.get("plan_id") or "")
        # Fallback: se metadata não vier, tentar external_reference legado
        if not user_id:
            ext = payload.get("external_reference") or data.get("external_reference") or ""
            if ext and ":" in ext:
                parts = ext.split(":")
                if len(parts) >= 2:
                    user_id = parts[0]
                    plan_id = parts[1] if not plan_id else plan_id

        # Valida evento/status de sucesso
        is_approved_event = event == "purchase_approved"
        is_paid_status = status_raw == "paid"
        # Recusa: evento explícito OU status de falha (fail closed — status vence
        # contradição, ex.: purchase_approved + status refused nunca aprova).
        is_refused = event == "purchase_refused" or status_raw in (
            "refused", "denied", "failed", "cancelled", "canceled", "rejected",
        )
        # Estorno: precisa rebaixar o plano mesmo de pagamento já aprovado.
        is_reversal = event in ("refund", "chargeback") or status_raw in (
            "refunded", "chargedback", "chargeback",
        )
        # Eventos puramente informativos: sem efeito em PIX avulso.
        is_informative = event in (
            "pix_gerado", "boleto_gerado", "picpay_gerado",
            "openfinance_nubank_gerado", "checkout_abandonment",
            "subscription_created", "subscription_renewed", "subscription_paused",
            "subscription_resumed", "subscription_late", "subscription_late_recovered",
            "subscription_renewal_refused", "subscription_canceled",
        )
        if not (is_approved_event or is_refused or is_reversal):
            if is_informative:
                logger.info("Cakto webhook informativo ignorado: %s status=%s", event, status_raw)
                return {"status": "ignored", "event": event, "cakto_status": status_raw}
            if event:
                logger.info("Cakto webhook com evento desconhecido: %s status=%s", event, status_raw)
            if not cakto_id and not user_id:
                return {"status": "ignored", "message": "no cakto id or metadata"}

        session = db
        own_session = False
        if session is None or not session.is_active:
            own_session = True
            session = AsyncSessionLocal()
        try:
            repo = PaymentRepository(session)
            payment = None

            # Primeiro tenta por metadata (user_id + plan_id + busca pagamento pendente)
            user_uuid = _coerce_uuid(user_id) if user_id else None
            if user_uuid is not None and plan_id:
                # Busca pagamento pendente mais recente do usuário para o plano
                q = await session.execute(
                    select(Payment)
                    .where(Payment.user_id == user_uuid)
                    .where(Payment.plan_id == plan_id)
                    .where(Payment.status == PaymentStatus.pending)
                    .order_by(Payment.created_at.desc())
                )
                payment = q.scalars().first()
                # Fallback: qualquer pagamento pendente do usuário
                if not payment:
                    q2 = await session.execute(
                        select(Payment)
                        .where(Payment.user_id == user_uuid)
                        .where(Payment.status == PaymentStatus.pending)
                        .order_by(Payment.created_at.desc())
                    )
                    payment = q2.scalars().first()

            # Fallback por cakto_payment_id
            if not payment and cakto_id:
                q = await session.execute(select(Payment).where(Payment.cakto_payment_id == cakto_id))
                payment = q.scalar_one_or_none()

            # Último fallback: tenta por id direto (se metadata não veio)
            if not payment and cakto_id:
                # cakto_id pode ser o payment.id legado
                payment = await repo.get_by_id(cakto_id)

            if not payment:
                logger.warning("Cakto webhook: payment not found for cakto_id %s user %s plan %s", cakto_id, user_id, plan_id)
                return {"status": "not_found"}

            if payment.cakto_payment_id is None and cakto_id:
                payment.cakto_payment_id = cakto_id

            # Estorno: rebaixa o plano mesmo que o pagamento já estivesse
            # aprovado — sem isso o usuário manteria os benefícios após o
            # chargeback/reembolso.
            if is_reversal:
                payment.status = PaymentStatus.refunded
                await self._unlock_user_service(session, user_id or str(payment.user_id), "free")
                await session.commit()
                logger.warning(
                    "Cakto webhook: pagamento %s estornado (%s) — perfil rebaixado para free",
                    payment.id, event or status_raw,
                )
                return {"status": "ok", "payment_id": payment.id, "cakto_status": status_raw, "event": event}

            if payment.status == PaymentStatus.approved:
                return {"status": "already_approved", "payment_id": payment.id}

            # Recusa: fecha o pagamento para que o polling do frontend mostre
            # a mensagem de erro em vez de expirar após 5 minutos.
            if is_refused:
                payment.status = PaymentStatus.rejected
                await session.commit()
                logger.info("Cakto webhook: pagamento %s recusado (%s)", payment.id, event or status_raw)
                return {"status": "ok", "payment_id": payment.id, "cakto_status": status_raw, "event": event}

            # Apenas processa se for purchase_approved + paid
            if is_approved_event and is_paid_status:
                # Usa plan_id do metadata, senão do pagamento existente.
                # Se divergirem, confia no pagamento (foi a oferta enviada à
                # Cakto no checkout) e registra o alerta.
                effective_plan = plan_id or payment.plan_id
                if plan_id and payment.plan_id and plan_id != payment.plan_id:
                    logger.warning(
                        "Cakto webhook: plan_id do metadata (%s) diverge do pagamento (%s); usando o do pagamento",
                        plan_id, payment.plan_id,
                    )
                    effective_plan = payment.plan_id
                if effective_plan and effective_plan not in settings.PLAN_PRICES:
                    logger.warning("Cakto webhook: plan_id %s not in PLAN_PRICES, using payment.plan_id %s", plan_id, payment.plan_id)
                    effective_plan = payment.plan_id
                # Confere se a oferta paga bate com o plano a liberar. Apenas
                # log — o formato do campo offer na Cakto não é contratado,
                # então nunca bloqueia uma aprovação legítima por isso.
                if effective_plan:
                    expected_offer = settings.PLAN_OFFER_MAP.get(effective_plan)
                    offer_candidates = self._extract_offer_candidates(data)
                    if expected_offer and offer_candidates and expected_offer not in offer_candidates:
                        logger.warning(
                            "Cakto webhook: ofertas %s não conferem com plano %s (esperado %s)",
                            offer_candidates, effective_plan, expected_offer,
                        )
                    effective_plan = payment.plan_id
                payment.status = PaymentStatus.approved
                payment.paid_at = __import__("datetime").datetime.now(__import__("datetime").timezone.utc)
                if effective_plan:
                    payment.plan_type = PLAN_ID_TO_TYPE.get(effective_plan, PlanType.pro).value
                    if hasattr(payment, "offer_id") and settings.PLAN_OFFER_MAP.get(effective_plan):
                        try:
                            payment.offer_id = settings.PLAN_OFFER_MAP[effective_plan]
                        except Exception:
                            pass
                # Commit atômico: payment + profile juntos
                await self._unlock_user_service(session, user_id or str(payment.user_id), effective_plan or payment.plan_id)
                await session.commit()
                return {"status": "ok", "payment_id": payment.id, "cakto_status": status_raw, "event": event}

            # Para eventos não-aprovados mas com pagamento encontrado, apenas atualiza cakto_id
            await session.commit()
            return {"status": "ok", "payment_id": payment.id, "cakto_status": status_raw, "event": event}
        finally:
            if own_session:
                await session.close()
