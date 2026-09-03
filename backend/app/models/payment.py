import enum
import uuid
from sqlalchemy.dialects.postgresql import UUID
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
    user_id = Column(UUID(as_uuid=True), ForeignKey("profiles.id"), nullable=False, index=True)
    amount = Column(Numeric(10, 2), nullable=False)
    currency = Column(String(3), default="BRL", nullable=False)
    status = Column(SQLEnum(PaymentStatus), default=PaymentStatus.pending, nullable=False, index=True)
    payment_method = Column(SQLEnum(PaymentMethod), nullable=False)
    plan_id = Column(String(50), nullable=False)
    # Mercado Pago linkage
    mp_payment_id = Column(String(100), nullable=True, index=True)
    mp_preference_id = Column(String(100), nullable=True, index=True)
    plan_type = Column(String(20), nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    paid_at = Column(DateTime(timezone=True), nullable=True)

    def json_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "amount": float(self.amount) if self.amount else 0,
            "currency": self.currency,
            "status": self.status.value if self.status else None,
            "payment_method": self.payment_method.value if self.payment_method else None,
            "plan_id": self.plan_id,
            "mp_payment_id": self.mp_payment_id,
            "mp_preference_id": self.mp_preference_id,
            "plan_type": self.plan_type,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "paid_at": self.paid_at.isoformat() if self.paid_at else None,
        }