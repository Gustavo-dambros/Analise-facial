from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Integer
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database.connection import Base
import enum


class RecommendationStatus(str, enum.Enum):
    pending = "pending"
    reviewed = "reviewed"
    implemented = "implemented"
    rejected = "rejected"


class Recommendation(Base):
    """Sugestões/feedback dos usuários para melhorias."""

    __tablename__ = "recommendations"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    user_id = Column(UUID(as_uuid=True), ForeignKey("profiles.id"), nullable=False, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    category = Column(String(50), nullable=True)  # feature, bug, ux, pricing, other
    status = Column(String(20), default=RecommendationStatus.pending.value, nullable=False)
    admin_notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationship
    user = relationship("Profile", backref="recommendations")


class PlanAssignment(Base):
    """Atribuição de plano por profissional/admin via email."""

    __tablename__ = "plan_assignments"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    assigned_by = Column(UUID(as_uuid=True), ForeignKey("profiles.id"), nullable=False, index=True)
    target_email = Column(String(255), nullable=False, index=True)
    target_user_id = Column(UUID(as_uuid=True), ForeignKey("profiles.id"), nullable=True, index=True)
    plan_type = Column(String(20), nullable=False)  # free, pro, enterprise
    status = Column(String(20), default="pending", nullable=False)  # pending, applied, failed
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    applied_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    assigner = relationship("Profile", foreign_keys=[assigned_by], backref="plan_assignments_made")
    target_user = relationship("Profile", foreign_keys=[target_user_id], backref="plan_assignments_received")