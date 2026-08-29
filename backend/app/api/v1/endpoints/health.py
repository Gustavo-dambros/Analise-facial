import logging
from fastapi import APIRouter
from app.database.connection import engine
from app.core.config import settings

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/health")
async def health_check():
    return {
        "status": "ok",
        "supabase_jwt_configured": bool(settings.SUPABASE_JWT_SECRET),
        "supabase_url_configured": bool(settings.SUPABASE_URL),
    }


@router.get("/health/db")
async def health_check_db():
    """Verify database connectivity and table existence."""
    try:
        from sqlalchemy import inspect, text

        async with engine.connect() as conn:
            result = await conn.execute(text("SELECT 1"))
            result.fetchall()

            inspector = await conn.run_sync(lambda sync_conn: inspect(sync_conn))
            tables = await conn.run_sync(lambda sync_conn: inspector.get_table_names())
            has_profiles = "profiles" in tables

        return {
            "status": "ok" if has_profiles else "degraded",
            "database": True,
            "tables": tables,
            "profiles_table_exists": has_profiles,
        }
    except Exception as exc:
        logger.error("Database health check failed: %s", exc)
        return {
            "status": "error",
            "database": False,
            "detail": str(exc),
        }


@router.get("/")
async def health_root():
    return {"status": "ok"}