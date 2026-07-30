import logging
from fastapi import APIRouter, Depends, Request, status
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database.connection import get_db
from app.models.analysis import WeeklyRoutine
from app.models.user import User
from app.schemas.analysis import WeeklyRoutineCreate, WeeklyRoutineResponse
from app.core.security import get_current_user, require_role
from app.core.config import settings
from app.core.exceptions import SanitizedHTTPException

logger = logging.getLogger(__name__)
router = APIRouter()
limiter = Limiter(key_func=get_remote_address)


@router.post("/", response_model=WeeklyRoutineResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit(settings.RATE_LIMIT_GENERAL)
async def create_or_update_routine(
    request: Request,
    data: WeeklyRoutineCreate,
    current_user: User = Depends(require_role(["professional", "admin"])),
    db: AsyncSession = Depends(get_db),
):
    exercises = {}
    for day, ex in data.days.items():
        exercises[day] = {
            "general": ex.general if hasattr(ex, "general") else ex.get("general", []),
            "facial": ex.facial if hasattr(ex, "facial") else ex.get("facial", []),
        }

    result = await db.execute(
        select(WeeklyRoutine).where(WeeklyRoutine.user_id == data.user_id)
    )
    existing = result.scalar_one_or_none()

    if existing:
        existing.exercises = exercises
        await db.commit()
        await db.refresh(existing)
        routine = existing
    else:
        routine = WeeklyRoutine(user_id=data.user_id, exercises=exercises)
        db.add(routine)
        await db.commit()
        await db.refresh(routine)

    return WeeklyRoutineResponse(
        id=routine.id,
        user_id=routine.user_id,
        exercises=routine.exercises,
        created_at=routine.created_at,
        updated_at=routine.updated_at,
    )


@router.get("/{user_id}", response_model=WeeklyRoutineResponse | dict)
@limiter.limit(settings.RATE_LIMIT_GENERAL)
async def get_routine(
    request: Request,
    user_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role not in ("professional", "admin") and current_user.id != user_id:
        raise SanitizedHTTPException(
            status.HTTP_403_FORBIDDEN,
            "Acesso nao autorizado a rotina de outro usuario.",
            f"User {current_user.id} tried to access routine of {user_id}",
        )

    result = await db.execute(
        select(WeeklyRoutine).where(WeeklyRoutine.user_id == user_id)
    )
    routine = result.scalar_one_or_none()

    if not routine:
        return {"exercises": {}}

    return WeeklyRoutineResponse(
        id=routine.id,
        user_id=routine.user_id,
        exercises=routine.exercises,
        created_at=routine.created_at,
        updated_at=routine.updated_at,
    )


@router.get("/", response_model=list[WeeklyRoutineResponse])
@limiter.limit(settings.RATE_LIMIT_GENERAL)
async def list_all_routines(
    request: Request,
    current_user: User = Depends(require_role(["professional", "admin"])),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(WeeklyRoutine))
    routines = result.scalars().all()
    return [
        WeeklyRoutineResponse(
            id=r.id,
            user_id=r.user_id,
            exercises=r.exercises,
            created_at=r.created_at,
            updated_at=r.updated_at,
        )
        for r in routines
    ]