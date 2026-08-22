import logging
from fastapi import APIRouter
from app.database.connection import engine

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/health")
async def health_check():
    return {"status": "ok"}


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
            has_users = "users" in tables

        return {
            "status": "ok" if has_users else "degraded",
            "database": True,
            "tables": tables,
            "users_table_exists": has_users,
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