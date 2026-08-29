from sqlalchemy import Column, String, Boolean, DateTime, Integer, Text, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database.connection import Base
import enum


class PlanType(str, enum.Enum):
    free = "free"
    pro = "pro"
    enterprise = "enterprise"


class Profile(Base):
    """Perfil do usuário no app.

    A autenticacao (senha, confirmacao, reset) e 100% Supabase Auth. O ``id``
    desta tabela e o UUID de ``auth.users`` do Supabase, preenchido por um
    trigger de signup (ver script de migracao). Aqui guardamos apenas os dados
    de perfil/negocio (nome, role, plano, etc.).
    """

    __tablename__ = "profiles"

    id = Column(String(36), primary_key=True)  # = auth.users.id
    email = Column(String(255), unique=True, nullable=False, index=True)
    full_name = Column(String(255), nullable=True)
    role = Column(String(20), default="client", nullable=False)
    plan = Column(SQLEnum(PlanType), default=PlanType.free, nullable=False, server_default="free")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Profile fields
    profile_picture = Column(Text, nullable=True)
    gender = Column(String(20), nullable=True)
    age = Column(Integer, nullable=True)
    style_objective = Column(String(100), nullable=True)

    # Relationships
    analyses = relationship("FacialAnalysis", back_populates="user")
