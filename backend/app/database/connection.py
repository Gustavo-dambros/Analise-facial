from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

# Normalize DATABASE_URL: ensure asyncpg driver for PostgreSQL so the URL from
# Render's DATABASE_URL env var (postgresql://...) works with create_async_engine.
_db_url = settings.DATABASE_URL
if _db_url.startswith("postgresql://") and "+asyncpg" not in _db_url:
    _db_url = _db_url.replace("postgresql://", "postgresql+asyncpg://", 1)
    logger.info("Normalized DATABASE_URL to use asyncpg driver")

_is_sqlite = "sqlite" in _db_url

if not _is_sqlite and not settings.DEBUG:
    logger.info("Using production database: %s", _db_url.split("@")[-1] if "@" in _db_url else "configured")

engine = create_async_engine(
    _db_url,
    echo=settings.DEBUG,
    pool_pre_ping=True,
    **(
        {
            "pool_size": settings.DB_POOL_SIZE,
            "max_overflow": settings.DB_MAX_OVERFLOW,
            "pool_timeout": settings.DB_POOL_TIMEOUT,
            "pool_recycle": settings.DB_POOL_RECYCLE,
        }
        if not _is_sqlite
        else {}
    ),
    **(
        {"connect_args": {"check_same_thread": False}}
        if _is_sqlite
        else {}
    ),
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
