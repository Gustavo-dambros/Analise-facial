from typing import Optional
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import settings
from app.database.connection import get_db
from app.repositories.profile_repository import ProfileRepository
from app.models.profile import Profile


security = HTTPBearer()


def _jwt_secret_and_algorithms():
    """Use the Supabase JWT secret when configured; fall back to SECRET_KEY (dev)."""
    if settings.SUPABASE_JWT_SECRET:
        return settings.SUPABASE_JWT_SECRET, [settings.SUPABASE_JWT_ALGORITHM]
    return settings.SECRET_KEY, [settings.ALGORITHM]


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> Profile:
    """Validate the Supabase-issued JWT and load the matching Profile.

    The token is issued by Supabase Auth; we verify it with ``SUPABASE_JWT_SECRET``
    and resolve the user via its ``sub`` (the Supabase user UUID, equal to
    ``profiles.id``) or, as a fallback, the ``email`` claim.
    """
    token = credentials.credentials
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenciais invalidas.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    secret, algorithms = _jwt_secret_and_algorithms()
    try:
        payload = jwt.decode(token, secret, algorithms=algorithms)
    except JWTError:
        raise credentials_exception

    user_id: Optional[str] = payload.get("sub")
    email: Optional[str] = payload.get("email")
    if not user_id and not email:
        raise credentials_exception

    repo = ProfileRepository(db)
    user: Optional[Profile] = None
    if user_id:
        user = await repo.get_by_id(user_id)
    if user is None and email:
        user = await repo.get_by_email(email)

    if user is None:
        # Perfil ainda nao existe (ex.: usuario ja existia no Supabase antes do
        # trigger de criacao). Criamos sob demanda para nao quebrar o app.
        user = Profile(id=user_id, email=email)
        await repo.create(user)
    return user


def require_role(allowed_roles: list[str]):
    """Dependency factory that checks the current user has one of the allowed roles."""

    async def _check_role(
        current_user: Profile = Depends(get_current_user),
    ) -> Profile:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Acesso restrito. Voce nao tem permissao para acessar este recurso.",
            )
        return current_user

    return _check_role
