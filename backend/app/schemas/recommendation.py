from typing import Optional, List
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from datetime import datetime
from uuid import UUID
from app.models.recommendation import RecommendationStatus


class RecommendationBase(BaseModel):
    title: str = Field(..., min_length=3, max_length=200, description="Título da sugestão")
    description: str = Field(..., min_length=10, max_length=5000, description="Descrição detalhada")
    category: Optional[str] = Field(None, max_length=50, description="Categoria: feature, bug, ux, pricing, other")


class RecommendationCreate(RecommendationBase):
    pass


class RecommendationUpdate(BaseModel):
    status: Optional[RecommendationStatus] = None
    admin_notes: Optional[str] = Field(None, max_length=2000)


class RecommendationResponse(RecommendationBase):
    id: UUID
    user_id: UUID
    status: RecommendationStatus
    admin_notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class RecommendationListResponse(BaseModel):
    items: List[RecommendationResponse]
    total: int
    limit: int
    offset: int


class PlanAssignmentBase(BaseModel):
    target_email: EmailStr = Field(..., description="Email do usuário alvo")
    plan_type: str = Field(..., pattern="^(free|pro|enterprise)$", description="Tipo de plano")
    notes: Optional[str] = Field(None, max_length=1000, description="Observações internas")


class PlanAssignmentCreate(PlanAssignmentBase):
    pass


class PlanAssignmentResponse(PlanAssignmentBase):
    id: UUID
    assigned_by: UUID
    target_user_id: Optional[UUID] = None
    status: str
    created_at: datetime
    applied_at: Optional[datetime] = None
    assigner_name: Optional[str] = None
    target_user_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class PlanAssignmentListResponse(BaseModel):
    items: List[PlanAssignmentResponse]
    total: int
    limit: int
    offset: int


class PlanAssignmentApplyRequest(BaseModel):
    email: EmailStr