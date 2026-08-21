from datetime import datetime, timedelta, timezone
from typing import Optional
import secrets
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import settings
from app.database.connection import get_db
from app.repositories.user_repository import UserRepository
from app.models.user import User


security = HTTPBearer()


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_token(token: str) -> Optional[dict]:
    """Decode a JWT issued by this service (FastAPI SECRET_KEY)."""
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError:
        return None


def decode_supabase_token(token: str) -> Optional[dict]:
    """Decode a JWT issued by Supabase Auth.

    Uses ``SUPABASE_JWT_SECRET`` if configured. Falls back to the
    FastAPI ``SECRET_KEY`` when the Supabase secret is not set (useful
    for local development where both use the same key).
    """
    secret = settings.SUPABASE_JWT_SECRET or settings.SECRET_KEY
    algorithms = [settings.SUPABASE_JWT_ALGORITHM] if settings.SUPABASE_JWT_SECRET else [settings.ALGORITHM]
    try:
        return jwt.decode(token, secret, algorithms=algorithms)
    except JWTError:
        return None


def generate_secure_token(length: int = 64) -> str:
    return secrets.token_urlsafe(length)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    token = credentials.credentials
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenciais invalidas.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    user_id: Optional[str] = None

    # 1) Try FastAPI's own JWT first
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id = payload.get("sub")
    except JWTError:
        user_id = None

    # 2) Fall back to Supabase JWT if configured
    if user_id is None and settings.SUPABASE_JWT_SECRET:
        try:
            payload = jwt.decode(
                token,
                settings.SUPABASE_JWT_SECRET,
                algorithms=[settings.SUPABASE_JWT_ALGORITHM],
            )
            # Supabase uses "sub" for the user UUID
            user_id = payload.get("sub")
            if user_id is None:
                raise credentials_exception
        except JWTError:
            raise credentials_exception

    # 3) If still no user_id, the token is invalid
    if user_id is None:
        raise credentials_exception

    user_repo = UserRepository(db)
    user = await user_repo.get_by_id(user_id)
    if user is None or not user.is_active:
        raise credentials_exception
    return user


def require_role(allowed_roles: list[str]):
    """Dependency factory that checks the current user has one of the allowed roles."""

    async def _check_role(
        current_user: User = Depends(get_current_user),
    ) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Acesso restrito. Voce nao tem permissao para acessar este recurso.",
            )
        return current_user

    return _check_role
