from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from sqlalchemy.orm import selectinload
from app.database.connection import get_db
from app.core.security import get_current_user
from app.models.profile import Profile
from app.models.recommendation import Recommendation, RecommendationStatus, PlanAssignment
from app.repositories.recommendation_repository import RecommendationRepository, PlanAssignmentRepository
from app.schemas.recommendation import (
    RecommendationCreate,
    RecommendationUpdate,
    RecommendationResponse,
    RecommendationListResponse,
    PlanAssignmentCreate,
    PlanAssignmentResponse,
    PlanAssignmentListResponse,
    PlanAssignmentApplyRequest,
)

router = APIRouter()


# ===== RECOMMENDATIONS (User-facing) =====

@router.post("", response_model=RecommendationResponse, status_code=status.HTTP_201_CREATED)
async def create_recommendation(
    payload: RecommendationCreate,
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Enviar sugestão/feedback/report de bug."""
    repo = RecommendationRepository(db)

    # Rate limit: max 5 por 24h
    recent_count = await repo.count_recent_by_user(current_user.id, hours=24)
    if recent_count >= 5:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Limite de 5 sugestões por 24 horas excedido. Tente novamente mais tarde.",
        )

    # Validação adicional de conteúdo
    title = payload.title.strip()
    description = payload.description.strip()
    if len(title) < 3:
        raise HTTPException(status_code=400, detail="Título deve ter pelo menos 3 caracteres")
    if len(description) < 10:
        raise HTTPException(status_code=400, detail="Descrição deve ter pelo menos 10 caracteres")

    rec = await repo.create(
        user_id=current_user.id,
        title=title,
        description=description,
        category=payload.category,
    )
    return rec


@router.get("", response_model=RecommendationListResponse)
async def list_my_recommendations(
    limit: int = Query(20, ge=1, le=50),
    offset: int = Query(0, ge=0),
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Listar minhas sugestões enviadas."""
    repo = RecommendationRepository(db)
    items = await repo.get_user_recommendations(current_user.id, limit=limit, offset=offset)
    total = await repo.count_user_recommendations(current_user.id)
    return RecommendationListResponse(items=items, total=total, limit=limit, offset=offset)


# ===== RECOMMENDATIONS (Admin/Professional) =====

@router.get("/admin/all", response_model=RecommendationListResponse)
async def list_all_recommendations(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    status_filter: Optional[RecommendationStatus] = Query(None),
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Listar todas as sugestões (admin/professional only)."""
    if current_user.role not in ("admin", "professional"):
        raise HTTPException(status_code=403, detail="Acesso restrito a admin/professional")

    query = select(Recommendation).options(selectinload(Recommendation.user))
    if status_filter:
        query = query.where(Recommendation.status == status_filter)
    query = query.order_by(desc(Recommendation.created_at)).limit(limit).offset(offset)

    result = await db.execute(query)
    items = result.scalars().all()

    # Count total
    count_query = select(func.count(Recommendation.id))
    if status_filter:
        count_query = count_query.where(Recommendation.status == status_filter)
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    return RecommendationListResponse(items=items, total=total, limit=limit, offset=offset)


@router.patch("/admin/{rec_id}", response_model=RecommendationResponse)
async def update_recommendation_admin(
    rec_id: UUID,
    payload: RecommendationUpdate,
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Atualizar status/notas da sugestão (admin/professional)."""
    if current_user.role not in ("admin", "professional"):
        raise HTTPException(status_code=403, detail="Acesso restrito a admin/professional")

    rec = await db.get(Recommendation, rec_id)
    if not rec:
        raise HTTPException(status_code=404, detail="Sugestão não encontrada")

    if payload.status is not None:
        rec.status = payload.status
    if payload.admin_notes is not None:
        rec.admin_notes = payload.admin_notes.strip()[:2000] if payload.admin_notes else None

    await db.commit()
    await db.refresh(rec)
    return rec


# ===== PLAN ASSIGNMENT (Professional/Admin) =====

@router.post("/plan-assignment", response_model=PlanAssignmentResponse, status_code=status.HTTP_201_CREATED)
async def create_plan_assignment(
    payload: PlanAssignmentCreate,
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Atribuir plano a usuário via email (professional/admin only)."""
    if current_user.role not in ("admin", "professional"):
        raise HTTPException(status_code=403, detail="Acesso restrito a admin/professional")

    repo = PlanAssignmentRepository(db)

    # Verifica se já existe pendente para este email
    pending = await repo.get_pending_by_email(payload.target_email)
    if pending:
        raise HTTPException(
            status_code=400,
            detail="Já existe atribuição pendente para este email. Aguarde a aplicação ou cancele a anterior.",
        )

    assignment = await repo.create(
        assigned_by=current_user.id,
        target_email=payload.target_email,
        plan_type=payload.plan_type,
        notes=payload.notes,
    )
    return assignment


@router.get("/plan-assignment", response_model=PlanAssignmentListResponse)
async def list_plan_assignments(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Listar atribuições feitas pelo profissional/admin."""
    if current_user.role not in ("admin", "professional"):
        raise HTTPException(status_code=403, detail="Acesso restrito a admin/professional")

    repo = PlanAssignmentRepository(db)
    items = await repo.get_by_assigner(current_user.id, limit=limit, offset=offset)

    # Count total
    from sqlalchemy import func
    count_result = await db.execute(
        select(func.count(PlanAssignment.id)).where(PlanAssignment.assigned_by == current_user.id)
    )
    total = count_result.scalar() or 0

    return PlanAssignmentListResponse(items=items, total=total, limit=limit, offset=offset)


@router.post("/plan-assignment/apply", response_model=PlanAssignmentResponse)
async def apply_pending_plan_assignment(
    payload: PlanAssignmentApplyRequest,
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Aplicar plano atribuído ao usuário logado (quando ele faz login)."""
    repo = PlanAssignmentRepository(db)
    pending = await repo.get_pending_by_email(payload.email)

    if not pending:
        raise HTTPException(status_code=404, detail="Nenhuma atribuição pendente para este email")

    # Aplica a primeira pendente (mais antiga)
    assignment = pending[0]
    success = await repo.mark_applied(assignment.id, current_user.id)

    if not success:
        raise HTTPException(status_code=400, detail="Não foi possível aplicar a atribuição")

    # Atualiza o plano do usuário
    current_user.plan = assignment.plan_type
    await db.commit()

    # Retorna assignment atualizado
    updated = await repo.get_by_id(assignment.id)
    return updated