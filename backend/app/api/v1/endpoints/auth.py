from fastapi import APIRouter, Depends, Request, status
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.connection import get_db
from app.schemas.auth import UserCreate, Token, SendVerificationEmailRequest, SendVerificationEmailResponse
from app.services.auth_service import AuthService
from app.services.email_service import send_verification_email as send_mail
from app.core.config import settings

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
@limiter.limit(settings.RATE_LIMIT_AUTH)
async def register(request: Request, user_data: UserCreate, db: AsyncSession = Depends(get_db)):
    """Register a new user. Rate limited to prevent spam."""
    auth_service = AuthService(db)
    return await auth_service.register(user_data)


@router.post("/login", response_model=Token)
@limiter.limit(settings.RATE_LIMIT_AUTH)
async def login(request: Request, user_data: UserCreate, db: AsyncSession = Depends(get_db)):
    """Login with email and password. Rate limited to prevent brute force."""
    auth_service = AuthService(db)
    return await auth_service.login(user_data.email, user_data.password)
