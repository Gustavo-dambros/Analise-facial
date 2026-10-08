from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class CouponRedeemRequest(BaseModel):
    code: str = Field(..., min_length=1, max_length=32, description="Codigo do cupom (ex: EXPOCEEP).")


class CouponRedeemResponse(BaseModel):
    ok: bool = True
    code: str
    granted_analyses: int
    message: str


class CouponStatusItem(BaseModel):
    code: str
    granted_analyses: int
    redeemed_at: Optional[datetime] = None


class CouponStatusResponse(BaseModel):
    redemptions: list[CouponStatusItem]
    bonus_analyses: int
