from sqlalchemy.dialects.postgresql import UUID as UUID
from sqlalchemy import Column, String, Float, ForeignKey, JSON, DateTime, Integer, Boolean, Enum as SQLEnum, Numeric, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database.connection import Base
import uuid
import enum


class OrderStatus(str, enum.Enum):
    pending = "pending"
    paid = "paid"
    cancelled = "cancelled"
    refunded = "refunded"


class ShippingStatus(str, enum.Enum):
    pending = "pending"
    in_transit = "in_transit"
    delivered = "delivered"
    failed = "failed"


class FacialAnalysis(Base):
    __tablename__ = "facial_analyses"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(UUID(as_uuid=True), ForeignKey("profiles.id"), nullable=False)
    overall_score = Column(Float, nullable=True)
    confidence = Column(Float, nullable=True)
    harmony_score = Column(Float, nullable=True)
    symmetry_score = Column(Float, nullable=True)
    thirds_data = Column(JSON, nullable=True)
    radar_data = Column(JSON, nullable=True)
    highlights = Column(JSON, nullable=True)
    photo_front_url = Column(String(500), nullable=True)
    photo_right_url = Column(String(500), nullable=True)
    photo_left_url = Column(String(500), nullable=True)
    # Raw uploaded photos (base64) so the admin can review submissions without IA.
    photo_front_data = Column(Text, nullable=True)
    photo_right_data = Column(Text, nullable=True)
    photo_left_data = Column(Text, nullable=True)
    status = Column(String(20), nullable=False, default="pending")
    attractiveness = Column(Integer, nullable=True)
    attributes_data = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user = relationship("Profile", back_populates="analyses")
    categories = relationship("AnalysisCategory", back_populates="analysis")


class Analysis(Base):
    """Canonical analysis table consumed by the frontend/admin (Supabase `analyses`)."""

    __tablename__ = "analyses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("profiles.id"), nullable=False, index=True)
    title = Column(Text, nullable=False, server_default="Analise sem titulo")
    description = Column(Text, nullable=False, server_default="")
    status = Column(String(20), nullable=False, default="pending", server_default="pending")
    photo_front_url = Column(Text, nullable=True)
    photo_right_url = Column(Text, nullable=True)
    photo_left_url = Column(Text, nullable=True)
    photo_body_url = Column(Text, nullable=True)
    result = Column(JSON, nullable=True)
    verdict_text = Column(Text, nullable=True)
    body_result = Column(JSON, nullable=True)
    exercise_recommendations = Column(JSON, nullable=True)
    reviewed_by = Column(UUID(as_uuid=True), nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("Profile")


class AnalysisCategory(Base):
    __tablename__ = "analysis_categories"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    analysis_id = Column(String(36), ForeignKey("facial_analyses.id"), nullable=False)
    name = Column(String(100), nullable=False)
    score = Column(Float, nullable=False)
    badge = Column(String(50), nullable=False)

    # Relationships
    analysis = relationship("FacialAnalysis", back_populates="categories")


class Order(Base):
    __tablename__ = "orders"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(UUID(as_uuid=True), ForeignKey("profiles.id"), nullable=False, index=True)
    analysis_id = Column(UUID(as_uuid=True), ForeignKey("facial_analyses.id"), nullable=True)
    amount = Column(Numeric(10, 2), nullable=False)
    currency = Column(String(3), default="BRL")
    status = Column(SQLEnum(OrderStatus), default=OrderStatus.pending, nullable=False, index=True)
    payment_method = Column(String(50), nullable=True)
    payment_id = Column(String(100), nullable=True)
    description = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    paid_at = Column(DateTime(timezone=True), nullable=True)

    user = relationship("Profile")
    analysis = relationship("FacialAnalysis")


class FinancialLog(Base):
    __tablename__ = "financial_logs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    order_id = Column(String(36), ForeignKey("orders.id"), nullable=False, index=True)
    amount = Column(Numeric(10, 2), nullable=False)
    type = Column(String(20), nullable=False)
    description = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    order = relationship("Order")


class Shipping(Base):
    __tablename__ = "shippings"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    order_id = Column(String(36), ForeignKey("orders.id"), nullable=False, unique=True, index=True)
    status = Column(SQLEnum(ShippingStatus), default=ShippingStatus.pending, nullable=False, index=True)
    tracking_code = Column(String(100), nullable=True)
    carrier = Column(String(50), nullable=True)
    estimated_delivery = Column(DateTime(timezone=True), nullable=True)
    delivered_at = Column(DateTime(timezone=True), nullable=True)
    address = Column(JSON, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    order = relationship("Order")


class WeeklyRoutine(Base):
    __tablename__ = "weekly_routines"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(UUID(as_uuid=True), ForeignKey("profiles.id"), nullable=False, unique=True)
    exercises = Column(JSON, nullable=False, default=dict)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("Profile")