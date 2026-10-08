"""Cupons promocionais que liberam avaliacoes extras.

Cada resgate registra (usuario, codigo) uma unica vez e soma
``granted_analyses`` a cota mensal verificada em
``AnalysisService.check_monthly_limit``.
"""

import uuid
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.database.connection import Base


class CouponRedemption(Base):
    __tablename__ = "coupon_redemptions"
    __table_args__ = (UniqueConstraint("user_id", "code", name="uq_coupon_redemptions_user_code"),)

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(UUID(as_uuid=True), ForeignKey("profiles.id"), nullable=False, index=True)
    code = Column(String(32), nullable=False, index=True)
    granted_analyses = Column(Integer, nullable=False, default=1)
    redeemed_at = Column(DateTime(timezone=True), server_default=func.now())
