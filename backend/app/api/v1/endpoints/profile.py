from fastapi import APIRouter, Depends, Request
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.connection import get_db
from app.core.security import get_current_user
from app.core.config import settings
from app.models.profile import Profile
from app.schemas.profile import UserProfileUpdate, UserProfileResponse

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)

# Only these fields can be updated — prevents mass assignment
ALLOWED_UPDATE_FIELDS = {"full_name", "profile_picture", "gender", "age", "style_objective"}


@router.get("/", response_model=UserProfileResponse)
@limiter.limit(settings.RATE_LIMIT_GENERAL)
async def get_profile(request: Request, current_user: Profile = Depends(get_current_user)):
    """Get current user's profile. Only returns own profile (IDOR safe)."""
    return current_user


@router.put("/", response_model=UserProfileResponse)
@limiter.limit(settings.RATE_LIMIT_GENERAL)
async def update_profile(
    request: Request,
    data: UserProfileUpdate,
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update current user's profile. Only own profile can be updated (IDOR safe)."""
    update_data = data.model_dump(exclude_unset=True)
    # Double-check: only allow whitelisted fields
    for field_name, value in update_data.items():
        if field_name in ALLOWED_UPDATE_FIELDS:
            setattr(current_user, field_name, value)
    await db.commit()
    await db.refresh(current_user)
    return current_user
