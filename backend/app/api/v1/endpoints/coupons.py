from fastapi import APIRouter, Depends, Request, status
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.connection import get_db
from app.core.security import get_current_user
from app.core.config import settings
from app.models.profile import Profile
from app.schemas.coupon import (
    CouponRedeemRequest,
    CouponRedeemResponse,
    CouponStatusItem,
    CouponStatusResponse,
)
from app.services import coupon_service

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)


@router.post("/redeem", response_model=CouponRedeemResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit(settings.RATE_LIMIT_GENERAL)
async def redeem_coupon(
    request: Request,
    data: CouponRedeemRequest,
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Resgata um cupom promocional (ex: EXPOCEEP) — 1 conta = 1 resgate."""
    redemption = await coupon_service.redeem(db, current_user, data.code)
    return CouponRedeemResponse(
        code=redemption.code,
        granted_analyses=redemption.granted_analyses,
        message=f"Cupom {redemption.code} aplicado! Você ganhou {redemption.granted_analyses} avaliação gratuita.",
    )


@router.get("/me", response_model=CouponStatusResponse)
@limiter.limit(settings.RATE_LIMIT_GENERAL)
async def my_coupons(
    request: Request,
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Lista cupons resgatados e o total de avaliações bônus."""
    redemptions = await coupon_service.my_redemptions(db, current_user.id)
    bonus = await coupon_service.bonus_for_user(db, current_user.id)
    return CouponStatusResponse(
        redemptions=[
            CouponStatusItem(
                code=r.code,
                granted_analyses=r.granted_analyses,
                redeemed_at=r.redeemed_at,
            )
            for r in redemptions
        ],
        bonus_analyses=bonus,
    )
