from datetime import datetime, timezone
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.payment import Payment, PaymentStatus


class PaymentRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(
        self,
        user_id: str,
        amount: float,
        payment_method: str,
        plan_id: str,
        mercado_pago_preference_id: str | None = None,
        mercado_pago_payment_id: str | None = None,
    ) -> Payment:
        payment = Payment(
            user_id=user_id,
            amount=amount,
            payment_method=payment_method,
            plan_id=plan_id,
            mercado_pago_preference_id=mercado_pago_preference_id,
            mercado_pago_payment_id=mercado_pago_payment_id,
            status=PaymentStatus.pending,
        )
        self.db.add(payment)
        await self.db.commit()
        await self.db.refresh(payment)
        return payment

    async def get_by_id(self, payment_id: str) -> Payment | None:
        result = await self.db.execute(select(Payment).where(Payment.id == payment_id))
        return result.scalar_one_or_none()

    async def get_by_mercado_pago_payment_id(self, mp_payment_id: str) -> Payment | None:
        result = await self.db.execute(
            select(Payment).where(Payment.mercado_pago_payment_id == mp_payment_id)
        )
        return result.scalar_one_or_none()

    async def update_status(
        self,
        payment_id: str,
        status: PaymentStatus,
        mercado_pago_payment_id: str | None = None,
    ) -> Payment | None:
        stmt = (
            update(Payment)
            .where(Payment.id == payment_id)
            .values(
                status=status,
                updated_at=datetime.now(timezone.utc),
                paid_at=datetime.now(timezone.utc) if status == PaymentStatus.approved else None,
            )
        )
        if mercado_pago_payment_id is not None:
            stmt = stmt.values(mercado_pago_payment_id=mercado_pago_payment_id)
        await self.db.execute(stmt)
        await self.db.commit()
        return await self.get_by_id(payment_id)
