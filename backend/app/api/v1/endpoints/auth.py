from fastapi import APIRouter, Depends, Request, status
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.connection import get_db
from app.schemas.auth import (
    UserCreate,
    Token,
    RegisterResponse,
    VerifyEmailResponse,
    ResendConfirmationRequest,
    ResendConfirmationResponse,
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    ResetPasswordRequest,
    ResetPasswordResponse,
)
from app.services.auth_service import AuthService
from app.core.config import settings

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)


@router.post("/register", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit(settings.RATE_LIMIT_AUTH)
async def register(
    request: Request, user_data: UserCreate, db: AsyncSession = Depends(get_db)
):
    """Register a new user. Sends verification email via SMTP. Rate limited."""
    auth_service = AuthService(db)
    return await auth_service.register(user_data)


@router.post("/login", response_model=Token)
@limiter.limit(settings.RATE_LIMIT_AUTH)
async def login(request: Request, user_data: UserCreate, db: AsyncSession = Depends(get_db)):
    """Login with email and password. Requires verified email. Rate limited."""
    auth_service = AuthService(db)
    return await auth_service.login(user_data.email, user_data.password)


@router.get("/verificar-email/{token}", response_model=VerifyEmailResponse)
async def verify_email(token: str, db: AsyncSession = Depends(get_db)):
    """Confirm email address using the verification token from the URL path."""
    auth_service = AuthService(db)
    message = await auth_service.verify_email(token)
    return VerifyEmailResponse(message=message)


@router.post(
    "/reenviar-confirmacao",
    response_model=ResendConfirmationResponse,
    status_code=status.HTTP_200_OK,
)
@limiter.limit(settings.RATE_LIMIT_AUTH)
async def resend_confirmation(
    request: Request, body: ResendConfirmationRequest, db: AsyncSession = Depends(get_db)
):
    """Resend verification email. Generic response to prevent email enumeration."""
    auth_service = AuthService(db)
    message = await auth_service.resend_verification(body.email)
    return ResendConfirmationResponse(message=message)


@router.post("/forgot-password", response_model=ForgotPasswordResponse, status_code=status.HTTP_200_OK)
@limiter.limit(settings.RATE_LIMIT_AUTH)
async def forgot_password(
    request: Request, body: ForgotPasswordRequest, db: AsyncSession = Depends(get_db)
):
    """Request a password reset link. Generic response to prevent email enumeration."""
    auth_service = AuthService(db)
    message = await auth_service.forgot_password(body.email)
    return ForgotPasswordResponse(message=message)


@router.post("/reset-password", response_model=ResetPasswordResponse, status_code=status.HTTP_200_OK)
@limiter.limit(settings.RATE_LIMIT_AUTH)
async def reset_password(
    request: Request, body: ResetPasswordRequest, db: AsyncSession = Depends(get_db)
):
    """Reset password using a valid reset token received by email."""
    auth_service = AuthService(db)
    message = await auth_service.reset_password(body.token, body.new_password)
    return ResetPasswordResponse(message=message)
