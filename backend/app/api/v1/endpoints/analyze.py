from fastapi import APIRouter, Depends, HTTPException, Request, status
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.connection import get_db
from app.schemas.analysis import AnalysisCreate, AnalysisResponse, AnalysisPendingResponse, AnalysisSubmissionResponse
from app.services.analysis_service import AnalysisService
from app.repositories.analysis_repository import AnalysisRepository
from app.core.security import get_current_user, require_role
from app.core.config import settings
from app.models.profile import Profile

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)


@router.post("/", response_model=AnalysisSubmissionResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit(settings.RATE_LIMIT_ANALYSIS)
async def analyze_face(
    request: Request,
    data: AnalysisCreate,
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Analyze facial features from photo. Requires authentication."""
    analysis_service = AnalysisService(db)
    return await analysis_service.analyze(data, current_user.id, current_user=current_user)


@router.get("/history", response_model=list[AnalysisSubmissionResponse])
@limiter.limit(settings.RATE_LIMIT_GENERAL)
async def get_analysis_history(
    request: Request,
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get user's own analysis history."""
    analysis_service = AnalysisService(db)
    return await analysis_service.get_user_analyses(current_user.id)


@router.get("/pending", response_model=list[AnalysisPendingResponse])
@limiter.limit(settings.RATE_LIMIT_GENERAL)
async def get_pending_analyses(
    request: Request,
    current_user: Profile = Depends(require_role(["professional", "admin"])),
    db: AsyncSession = Depends(get_db),
):
    """Get all analyses pending manual review. Professional/Admin only."""
    repo = AnalysisRepository(db)
    return await repo.get_pending()


@router.delete("/{analysis_id}", status_code=status.HTTP_200_OK)
@limiter.limit(settings.RATE_LIMIT_GENERAL)
async def delete_analysis(
    analysis_id: str,
    request: Request,
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Apagar avaliação. Permitido ao dono ou a professional/admin."""
    repo = AnalysisRepository(db)
    analysis = await repo.get_by_id(analysis_id)
    if not analysis:
        raise HTTPException(status_code=404, detail="Avaliação não encontrada")

    is_owner = str(analysis.user_id) == str(current_user.id)
    is_staff = current_user.role in ("professional", "admin")
    if not (is_owner or is_staff):
        raise HTTPException(status_code=403, detail="Sem permissão para apagar esta avaliação")

    await repo.delete(analysis)
    return {"ok": True, "id": analysis_id}
