import logging
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, Request, status, HTTPException
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy import delete, update
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.connection import get_db
from app.core.security import get_current_user
from app.core.config import settings
from app.models.profile import Profile
from app.models.analysis import Analysis
from app.schemas.profile import UserProfileUpdate, UserProfileResponse, PasswordChangeRequest

logger = logging.getLogger(__name__)

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)

# Intervalo minimo (em dias) entre alteracoes de senha.
PASSWORD_CHANGE_COOLDOWN_DAYS = 30
# Intervalo minimo (em dias) entre alteracoes de perfil.
PROFILE_EDIT_COOLDOWN_DAYS = 30

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
    """Update current user's profile. Only own profile can be updated (IDOR safe).

    Restricao de negocio: o perfil so pode ser alterado 1 vez a cada 3 meses.
    """
    now = datetime.now(timezone.utc)
    last = current_user.last_profile_change_at
    if last is not None:
        # Garante tz-aware (o Postgres retorna timestamptz com tzinfo)
        if last.tzinfo is None:
            last = last.replace(tzinfo=timezone.utc)
        if (now - last) < timedelta(days=PROFILE_EDIT_COOLDOWN_DAYS):
            next_allowed = last + timedelta(days=PROFILE_EDIT_COOLDOWN_DAYS)
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    f"Você só pode alterar seu perfil a cada {PROFILE_EDIT_COOLDOWN_DAYS} dias. "
                    f"Próxima alteração disponível em {next_allowed.strftime('%d/%m/%Y')}."
                ),
            )

    update_data = data.model_dump(exclude_unset=True)
    # Double-check: only allow whitelisted fields
    for field_name, value in update_data.items():
        if field_name in ALLOWED_UPDATE_FIELDS:
            setattr(current_user, field_name, value)

    current_user.last_profile_change_at = now
    await db.commit()
    await db.refresh(current_user)
    return current_user


@router.get("/export", response_model=dict)
@limiter.limit(settings.RATE_LIMIT_GENERAL)
async def export_data(
    request: Request,
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """LGPD Art.18 — exportação completa dos dados do titular."""
    from sqlalchemy import select
    from app.models.payment import Payment

    # Perfil
    profile_data = {
        "id": str(current_user.id),
        "email": current_user.email,
        "full_name": current_user.full_name,
        "role": current_user.role,
        "plan": current_user.plan,
        "created_at": current_user.created_at.isoformat() if current_user.created_at else None,
    }
    # Análises (metadados, sem base64)
    result = await db.execute(select(Analysis).where(Analysis.user_id == current_user.id))
    analyses = [
        {"id": str(a.id), "status": a.status, "created_at": a.created_at.isoformat() if a.created_at else None, "photo_front_url": a.photo_front_url}
        for a in result.scalars().all()
    ]
    # Pagamentos
    pay_res = await db.execute(select(Payment).where(Payment.user_id == current_user.id))
    payments = [p.json_dict() for p in pay_res.scalars().all()]
    return {"profile": profile_data, "analyses": analyses, "payments": payments, "exported_at": datetime.now(timezone.utc).isoformat()}


@router.delete("/", status_code=status.HTTP_200_OK)
@limiter.limit(settings.RATE_LIMIT_GENERAL)
async def delete_account(
    request: Request,
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """LGPD Art.18 — exclusão definitiva com expurgo de Storage."""
    user_id = current_user.id

    # 0. Expurgo Storage (avatars + analysis-photos) — melhor esforço
    try:
        from supabase import create_client as _sc
        _client = _sc(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
        # Lista e remove por prefixo user_id
        for bucket in ("avatars", "analysis-photos"):
            try:
                listed = _client.storage.from_(bucket).list(str(user_id))
                if listed:
                    paths = [f"{user_id}/{o['name']}" for o in listed if o.get("name")]
                    if paths:
                        _client.storage.from_(bucket).remove(paths)
            except Exception as be:
                logger.warning("Storage expurgo %s falhou p/ %s: %s", bucket, user_id, be)
    except Exception as e:
        logger.warning("Expurgo Storage falhou (pre-delete) %s: %s", user_id, e)

    # 1. Pagamentos, biometric_data, reports (FKs)
    try:
        from app.models.payment import Payment
        await db.execute(delete(Payment).where(Payment.user_id == user_id))
    except Exception:
        pass

    # 2. Análises (bloqueiam exclusão do perfil)
    await db.execute(delete(Analysis).where(Analysis.user_id == user_id))
    # 3. Perfil.
    await db.delete(current_user)
    await db.commit()

    # 4. Usuario no Supabase Auth
    try:
        from supabase import create_client

        client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
        client.auth.admin.delete_user(str(user_id))
    except Exception as exc:  # pragma: no cover
        logger.warning("Falha ao remover usuario %s do Supabase Auth: %s", user_id, exc)

    return {"detail": "Conta excluida com sucesso. Fotos e dados permanentemente removidos."}


@router.put("/change-password")
@limiter.limit(settings.RATE_LIMIT_GENERAL)
async def change_password(
    request: Request,
    data: PasswordChangeRequest,
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Change user's password with 1-month cooldown limit.

    Restricao de negocio: a senha so pode ser alterada 1 vez a cada 30 dias.
    """
    now = datetime.now(timezone.utc)
    last = current_user.last_password_change_at
    if last is not None:
        if last.tzinfo is None:
            last = last.replace(tzinfo=timezone.utc)
        if (now - last) < timedelta(days=PASSWORD_CHANGE_COOLDOWN_DAYS):
            next_allowed = last + timedelta(days=PASSWORD_CHANGE_COOLDOWN_DAYS)
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    f"Você só pode alterar sua senha a cada {PASSWORD_CHANGE_COOLDOWN_DAYS} dias. "
                    f"Próxima alteração disponível em {next_allowed.strftime('%d/%m/%Y')}."
                ),
            )

    # Update password via Supabase Auth (admin client)
    try:
        from supabase import create_client

        supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
        # Atualiza a senha do usuário via admin API
        await supabase.auth.admin.update_user(str(current_user.id), password=data.new_password)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    # Update last password change timestamp
    current_user.last_password_change_at = now
    await db.commit()
    await db.refresh(current_user)

    return {"detail": "Senha alterada com sucesso."}
