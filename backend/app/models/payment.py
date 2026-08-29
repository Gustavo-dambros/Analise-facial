import enum
import uuid
from sqlalchemy import Column, String, Numeric, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.sql import func
from app.database.connection import Base


class PaymentStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"
    cancelled = "cancelled"
    refunded = "refunded"
    in_process = "in_process"
    partial = "partial"


class PaymentMethod(str, enum.Enum):
    pix = "pix"
    credit_card = "credit_card"


class Payment(Base):
    __tablename__ = "payments"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("profiles.id"), nullable=False, index=True)
    mercado_pago_payment_id = Column(String(100), nullable=True, index=True)
    mercado_pago_preference_id = Column(String(200), nullable=True)
    amount = Column(Numeric(10, 2), nullable=False)
    currency = Column(String(3), default="BRL", nullable=False)
    status = Column(SQLEnum(PaymentStatus), default=PaymentStatus.pending, nullable=False, index=True)
    payment_method = Column(SQLEnum(PaymentMethod), nullable=False)
    plan_id = Column(String(50), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    paid_at = Column(DateTime(timezone=True), nullable=True)

    def json_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "mercado_pago_payment_id": self.mercado_pago_payment_id,
            "amount": float(self.amount) if self.amount else 0,
            "currency": self.currency,
            "status": self.status.value if self.status else None,
            "payment_method": self.payment_method.value if self.payment_method else None,
            "plan_id": self.plan_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "paid_at": self.paid_at.isoformat() if self.paid_at else None,
        }
