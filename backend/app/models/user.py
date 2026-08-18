from sqlalchemy import Column, String, Boolean, DateTime, Integer, Text, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database.connection import Base
import uuid
import enum


class PlanType(str, enum.Enum):
    free = "free"
    pro = "pro"
    enterprise = "enterprise"


class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=False)
    is_verified = Column(Boolean, default=False)
    is_superuser = Column(Boolean, default=False)
    role = Column(String(20), default="client", nullable=False)
    plan = Column(SQLEnum(PlanType), default=PlanType.free, nullable=False, server_default="free")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Profile fields
    profile_picture = Column(Text, nullable=True)
    gender = Column(String(20), nullable=True)
    age = Column(Integer, nullable=True)
    style_objective = Column(String(100), nullable=True)

    # Verification fields
    verification_token = Column(String(128), nullable=True)
    verification_token_expires = Column(DateTime(timezone=True), nullable=True)

    # Password reset fields
    reset_token = Column(String(128), nullable=True)
    reset_token_expires = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    analyses = relationship("FacialAnalysis", back_populates="user")