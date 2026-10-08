"""Catalogo e regras dos cupons promocionais.

Cupom ativo:
- EXPOCEEP: libera 1 avaliacao extra, resgatavel somente ate
  segunda-feira 12/10/2026 23:59:59 (America/Sao_Paulo).
"""

import logging
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfoNotFoundError

from fastapi import HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.coupon import CouponRedemption

logger = logging.getLogger(__name__)

# America/Sao_Paulo e UTC-3 o ano todo (sem horario de verao desde 2019).
# Offset fixo em vez de ZoneInfo: a imagem Docker python:slim nao traz
# o banco tzdata e ZoneInfo("America/Sao_Paulo") levantaria erro em prod.
_TZ = timezone(timedelta(hours=-3), name="America/Sao_Paulo")

# Catalogo: codigo (UPPER) -> {granted, expires_at (aware), description}
COUPONS: dict[str, dict] = {
    "EXPOCEEP": {
        "granted": 1,
        "expires_at": datetime(2026, 10, 12, 23, 59, 59, tzinfo=_TZ),
        "description": "Cupom EXPOCEEP — 1 avaliação gratuita",
    },
}


def normalize_code(raw: str) -> str:
    return (raw or "").strip().upper()


def coupon_is_expired(code: str, now: datetime | None = None) -> bool:
    entry = COUPONS.get(code)
    if not entry:
        return True
    now = now or datetime.now(tz=_TZ)
    if now.tzinfo is None:
        now = now.replace(tzinfo=_TZ)
    return now > entry["expires_at"]


async def bonus_for_user(db: AsyncSession, user_id) -> int:
    """Soma de avaliacoes extras liberadas por cupons do usuario.

    Defensivo: qualquer falha (ex.: tabela ainda nao criada, mocks de
    teste) retorna 0 em vez de quebrar o fluxo de envio.
    """
    try:
        result = await db.execute(
            select(func.coalesce(func.sum(CouponRedemption.granted_analyses), 0)).where(
                CouponRedemption.user_id == user_id
            )
        )
        return int(result.scalar() or 0)
    except Exception:
        logger.exception("Falha ao somar bonus de cupons p/ user %s", user_id)
        return 0


async def my_redemptions(db: AsyncSession, user_id) -> list[CouponRedemption]:
    result = await db.execute(
        select(CouponRedemption)
        .where(CouponRedemption.user_id == user_id)
        .order_by(CouponRedemption.redeemed_at.desc())
    )
    return list(result.scalars().all())


async def redeem(db: AsyncSession, user, code: str) -> CouponRedemption:
    normalized = normalize_code(code)
    entry = COUPONS.get(normalized)
    if not entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cupom inválido. Confira o código e tente novamente.",
        )
    if coupon_is_expired(normalized):
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail=f"Cupom {normalized} expirado — era válido somente até 12/10/2026.",
        )

    existing = await db.execute(
        select(CouponRedemption).where(
            CouponRedemption.user_id == user.id,
            CouponRedemption.code == normalized,
        )
    )
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cupom {normalized} já resgatado nesta conta.",
        )

    redemption = CouponRedemption(
        user_id=user.id,
        code=normalized,
        granted_analyses=entry["granted"],
    )
    db.add(redemption)
    try:
        await db.commit()
    except Exception:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cupom {normalized} já resgatado nesta conta.",
        )
    await db.refresh(redemption)
    logger.info("User %s resgatou cupom %s (+%d)", user.id, normalized, entry["granted"])
    return redemption
