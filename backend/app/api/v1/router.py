"""
V1 API router — aggregates all endpoint routers for the v1 namespace.
"""

from fastapi import APIRouter
from app.api.v1.endpoints import auth, admin, analyze, health, analysis, test, profile, weekly_routine, payments, seo

api_router = APIRouter()

api_router.include_router(seo.router, tags=["seo"])
api_router.include_router(health.router, tags=["health"])
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
api_router.include_router(profile.router, prefix="/profile", tags=["profile"])
api_router.include_router(analyze.router, prefix="/analyze", tags=["analyze"])
api_router.include_router(analysis.router, prefix="/analysis", tags=["Analysis"])
api_router.include_router(weekly_routine.router, prefix="/weekly-routine", tags=["WeeklyRoutine"])
api_router.include_router(payments.router, prefix="/payments", tags=["payments"])
api_router.include_router(test.router, prefix="/test", tags=["test"])
