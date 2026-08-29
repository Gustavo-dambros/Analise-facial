import hashlib
import time
from typing import Optional

import httpx
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


# Cache leve da validação de token via Supabase (reduz chamadas de rede por req).
# Chave: hash do token. Valor: (expiracao_epoch, user_info).
_token_cache: dict[str, tuple[float, dict]] = {}


async def _get_supabase_user(token: str) -> Optional[dict]:
    """Valida o JWT do Supabase via introspecção no endpoint /auth/v1/user.

    Este projeto Supabase emite tokens ``ES256`` (assimétricos) e não publica o
    JWKS publicamente, então a forma robusta de validar é perguntar ao próprio
    Auth se o token é válido. Retorna o payload do usuário ou ``None`` se o token
    for inválido ou o Auth estiver indisponível.
    """
    if not (settings.SUPABASE_URL and settings.SUPABASE_ANON_KEY):
        return None

    cache_key = hashlib.sha256(token.encode()).hexdigest()
    now = time.time()
    cached = _token_cache.get(cache_key)
    if cached and cached[0] > now:
        return cached[1]

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                f"{settings.SUPABASE_URL}/auth/v1/user",
                headers={
                    "apikey": settings.SUPABASE_ANON_KEY,
                    "Authorization": f"Bearer {token}",
                },
            )
        if resp.status_code != 200:
            return None
        data = resp.json()
    except httpx.HTTPError:
        return None

    # Não cacheia por mais de 5 min para limitar a janela de token revogado.
    _token_cache[cache_key] = (now + 300, data)
    if len(_token_cache) > 2000:
        _token_cache.clear()
    return data


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> Profile:
    """Validate the Supabase-issued JWT and load the matching Profile.

    The token is issued by Supabase Auth. We validate it by introspecting it with
    Supabase's ``/auth/v1/user`` endpoint (works for both ``HS256`` and ``ES256``
    tokens) and resolve the user via its ``id``/``sub`` (the Supabase user UUID,
    equal to ``profiles.id``) or, as a fallback, the ``email`` claim.
    """
    token = credentials.credentials
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenciais invalidas.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    user_info = await _get_supabase_user(token)
    if user_info:
        user_id: Optional[str] = user_info.get("id")
        email: Optional[str] = user_info.get("email")
    else:
        # Fallback: decodifica localmente (HS256) para dev/ambientes sem Supabase.
        secret, algorithms = _jwt_secret_and_algorithms()
        try:
            payload = jwt.decode(
                token, secret, algorithms=algorithms, options={"verify_aud": False}
            )
        except JWTError:
            raise credentials_exception
        user_id = payload.get("sub")
        email = payload.get("email")

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
