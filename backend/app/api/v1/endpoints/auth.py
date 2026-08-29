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
    EsqueciSenhaRequest,
    EsqueciSenhaResponse,
    RedefinirSenhaRequest,
    RedefinirSenhaResponse,
    AlterarSenhaRequest,
    AlterarSenhaResponse,
)
from app.services.auth_service import AuthService
from app.core.config import settings
from app.core.security import get_current_user
from jose import jwt, JWTError
from typing import Optional

from app.repositories.user_repository import UserRepository
from app.services import supabase_service
from app.models.user import User

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)


@router.post("/register", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit(settings.RATE_LIMIT_AUTH)
async def register(
    request: Request, user_data: UserCreate, db: AsyncSession = Depends(get_db)
):
    """Register a new user. Triggers Supabase confirmation email. Rate limited."""
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
    """Resend Supabase confirmation email. Generic response to prevent email enumeration."""
    auth_service = AuthService(db)
    message = await auth_service.resend_verification(body.email)
    return ResendConfirmationResponse(message=message)


@router.post(
    "/esqueci-senha",
    response_model=EsqueciSenhaResponse,
    status_code=status.HTTP_200_OK,
)
@limiter.limit(settings.RATE_LIMIT_AUTH)
async def esqueci_senha(
    request: Request, body: EsqueciSenhaRequest, db: AsyncSession = Depends(get_db)
):
    """Request a password reset link. Generic response to prevent email enumeration."""
    auth_service = AuthService(db)
    message, redirect_url = await auth_service.esqueci_senha(body.email)
    return EsqueciSenhaResponse(message=message, redirect_url=redirect_url)


@router.post(
    "/redefinir-senha",
    response_model=RedefinirSenhaResponse,
    status_code=status.HTTP_200_OK,
)
@limiter.limit(settings.RATE_LIMIT_AUTH)
async def redefinir_senha(
    request: Request, body: RedefinirSenhaRequest, db: AsyncSession = Depends(get_db)
):
    """Reset password using the JWT reset token received by email."""
    auth_service = AuthService(db)
    message, redirect_url = await auth_service.redefinir_senha(body.token, body.nova_senha)
    return RedefinirSenhaResponse(message=message, redirect_url=redirect_url)


async def _resolve_user_for_password_change(
    request: Request, db: AsyncSession
) -> Optional[User]:
    """Resolve the user from either a local JWT or a Supabase-issued JWT.

    Order:
      1. Local FastAPI JWT (``sub`` = local user id) — fluxo logado.
      2. Supabase JWT validated server-side via ``get_user_by_token`` (email) —
         fluxo de recovery de senha (redefinicao via e-mail).
    """
    auth_header = request.headers.get("Authorization", "")
    token = auth_header[7:] if auth_header.lower().startswith("bearer ") else None
    if not token:
        return None

    # 1) Local JWT (fluxo logado)
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        uid = payload.get("sub")
        if uid:
            user = await UserRepository(db).get_by_id(uid)
            if user:
                return user
    except JWTError:
        pass

    # 2) Supabase JWT (recovery) — validado pelo proprio Supabase
    try:
        supa = await supabase_service.get_user_by_token(token)
        if supa and supa.get("email"):
            return await UserRepository(db).get_by_email(supa["email"])
    except Exception:
        pass

    return None


@router.post(
    "/alterar-senha",
    response_model=AlterarSenhaResponse,
    status_code=status.HTTP_200_OK,
)
async def alterar_senha(
    body: AlterarSenhaRequest, request: Request, db: AsyncSession = Depends(get_db)
):
    """Change the password.

    Aceita tanto o JWT local (fluxo logado) quanto o JWT do Supabase vindo do
    fluxo de recovery (redefinicao de senha via e-mail).
    """
    user = await _resolve_user_for_password_change(request, db)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciais invalidas.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    auth_service = AuthService(db)
    message, redirect_url = await auth_service.alterar_senha(user, body.nova_senha)
    return AlterarSenhaResponse(message=message, redirect_url=redirect_url)
