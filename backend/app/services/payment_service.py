import logging
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import settings
from app.core.security import get_current_user
from app.core.exceptions import SanitizedHTTPException
from app.models.payment import Payment, PaymentStatus, PaymentMethod
from app.repositories.payment_repository import PaymentRepository
from app.repositories.profile_repository import ProfileRepository
from app.models.profile import PlanType

logger = logging.getLogger(__name__)


class PaymentService:
    """Service handling payment operations without Mercado Pago dependency."""

    def __init__(self, db: AsyncSession):
        self.db = db

    # ------------------------------------------------------------------
    # Plan amount lookup (configured via settings.PLAN_PRICES)
    # ------------------------------------------------------------------
    def _get_plan_amount(self, plan_id: str, payment_method: str = "pix") -> float:
        """Get plan amount from server-side configuration."""
        plan_prices = settings.PLAN_PRICES.get(plan_id)
        if not plan_prices:
            return 0.0
        return plan_prices.get(payment_method, 0.0)

    # ------------------------------------------------------------------
    # Create payment — stubs (no external SDK call)
    # ------------------------------------------------------------------
    async def create_pix_payment(
        self,
        user: object,
        plan_id: str,
        success_url: str,
        pending_url: str,
    ) -> dict:
        """Create a PIX payment — stub implementation.

        Without Mercado Pago this returns a minimal payment record.
        Integrate a real gateway or keep as manual invoicing.
        """
        amount = self._get_plan_amount(plan_id, "pix")
        if amount <= 0:
            raise SanitizedHTTPException(
                status_code=400,
                public_message="Plano invalido ou preco nao configurado.",
                internal_detail=f"Plan {plan_id} not found in PLAN_PRICES",
            )

        repo = PaymentRepository(self.db)
        payment = await repo.create(
            user_id=user.id,
            amount=amount,
            payment_method=PaymentMethod.pix.value,
            plan_id=plan_id,
        )

        return {
            "payment_id": payment.id,
            "status": payment.status.value,
            "preference_id": None,
            "init_point": None,
            "payment_method": PaymentMethod.pix.value,
            "amount": float(payment.amount),
            "currency": payment.currency,
            "qr_code": None,
            "qr_code_base64": None,
            "ticket_url": None,
        }

    async def create_checkout_pro_payment(
        self,
        user: object,
        plan_id: str,
        success_url: str,
        pending_url: str,
    ) -> dict:
        """Create a Checkout Pro preference — stub implementation.

        Without Mercado Pago this returns a minimal payment record.
        Integrate a real gateway or keep as manual invoicing.
        """
        amount = self._get_plan_amount(plan_id, "credit_card")
        if amount <= 0:
            raise SanitizedHTTPException(
                status_code=400,
                public_message="Plano invalido ou preco nao configurado.",
                internal_detail=f"Plan {plan_id} not found in PLAN_PRICES",
            )

        repo = PaymentRepository(self.db)
        payment = await repo.create(
            user_id=user.id,
            amount=amount,
            payment_method=PaymentMethod.credit_card.value,
            plan_id=plan_id,
        )

        return {
            "payment_id": payment.id,
            "preference_id": "",
            "init_point": None,
            "status": payment.status.value,
            "payment_method": PaymentMethod.credit_card.value,
            "amount": float(payment.amount),
            "currency": payment.currency,
            "qr_code": None,
            "qr_code_base64": None,
            "ticket_url": None,
        }

    # ------------------------------------------------------------------
    # Webhook handling — stub (no signature validation needed)
    # ------------------------------------------------------------------
    @staticmethod
    def validate_webhook_signature(raw_body: bytes, signature: str) -> bool:
        """Webhook validation stub — always accepts in sandbox mode.

        Without Mercado Pago there is no external signature to validate.
        Implement your own gateway webhook handler if needed.
        """
        return True

    async def process_webhook(self, payload: dict, db: AsyncSession) -> dict:
        """Handle webhook notifications — stub implementation.

        Without Mercado Pago this returns a generic ok response.
        Implement your own gateway webhook handler if needed.
        """
        logger.info("Webhook received (no MP gateway configured)")
        return {"status": "ok", "message": "Webhook processed (no MP gateway)"}

    # ------------------------------------------------------------------
    # Internal helper: unlock user service after successful payment
    # ------------------------------------------------------------------
    async def _unlock_user_service(self, db: AsyncSession, user_id: str, plan_id: str):
        """Update the user's plan in the profile after a successful payment."""
        repo = ProfileRepository(db)
        profile = await repo.get_by_id(user_id)
        if profile:
            try:
                plan = PlanType(plan_id)
            except ValueError:
                plan = PlanType.free
            await repo.update_plan(profile, plan)
            logger.info("User %s plan updated to %s", user_id, plan.value)

    # ------------------------------------------------------------------
    # Status polling — stub (returns stored status only)
    # ------------------------------------------------------------------
    async def get_payment_status(self, payment_id: str, db: AsyncSession) -> dict:
        """Return the stored payment status without querying external gateway."""
        repo = PaymentRepository(db)
        payment = await repo.get_by_id(payment_id)
        if not payment:
            raise HTTPException(status_code=404, detail="Pagamento nao encontrado.")

        return payment.json_dict()