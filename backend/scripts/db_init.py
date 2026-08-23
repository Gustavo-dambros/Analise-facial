"""Database initialization script — run before Uvicorn starts.

1. Tries ``alembic upgrade head`` (creates all tables on fresh databases).
2. If that fails (tables already exist from a previous ``create_all``),
   runs ``alembic stamp head`` to register the current revision.
3. Runs a schema-sync pass that detects and adds any missing columns
   to the *users* table (and other known tables) so an old schema
   doesn't break the app.
"""

import asyncio
import logging
import os
import sys

# Ensure the backend directory is on sys.path so 'app' package is importable
_BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _BACKEND_DIR not in sys.path:
    sys.path.insert(0, _BACKEND_DIR)

import asyncio
import logging
import sys
import subprocess

logger = logging.getLogger("db_init")
logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")

# ---------------------------------------------------------------------------
# Step 1 — Alembic migrations
# ---------------------------------------------------------------------------
def _run_alembic() -> bool:
    """Run alembic upgrade head. Return True on success."""
    try:
        subprocess.run(
            [sys.executable, "-m", "alembic", "upgrade", "head"],
            check=True,
            capture_output=True,
            text=True,
        )
        logger.info("Alembic migrations applied successfully")
        return True
    except subprocess.CalledProcessError as exc:
        stderr = exc.stderr.strip() if exc.stderr else ""
        stdout = exc.stdout.strip() if exc.stdout else ""
        logger.warning("alembic upgrade head failed: %s", stderr or stdout)
        return False


def _stamp_alembic() -> None:
    """Mark DB as up-to-date (tables already exist via create_all)."""
    try:
        subprocess.run(
            [sys.executable, "-m", "alembic", "stamp", "head"],
            check=True,
            capture_output=True,
            text=True,
        )
        logger.info("Alembic stamped as head (existing tables detected)")
    except subprocess.CalledProcessError as exc:
        logger.warning("alembic stamp head also failed — continuing with create_all fallback")


# ---------------------------------------------------------------------------
# Step 2 — Schema sync (add missing columns to existing tables)
# ---------------------------------------------------------------------------
async def _sync_schema() -> None:
    """Detect and add any columns defined in the models but missing in the DB."""
    from app.database.connection import engine
    from app.models import User, FacialAnalysis, Payment, WeeklyRoutine, Order
    from sqlalchemy import inspect, text
    from sqlalchemy.sql import func

    models_by_table = {
        "users": User,
        "facial_analyses": FacialAnalysis,
        "payments": Payment,
        "weekly_routines": WeeklyRoutine,
        "orders": Order,
    }

    async with engine.begin() as conn:
        # Ensure all tables exist (fallback for fresh DBs without alembic)
        await conn.run_sync(__import__("app.database.connection", fromlist=["Base"]).Base.metadata.create_all)

        db_inspector = await conn.run_sync(lambda c: inspect(c))
        table_names = await conn.run_sync(lambda c: db_inspector.get_table_names())

        for table_name, model_cls in models_by_table.items():
            if table_name not in table_names:
                logger.info("Table %s does not exist — create_all handled it", table_name)
                continue

            db_cols = {
                c["name"] for c in await conn.run_sync(lambda c: db_inspector.get_columns(table_name))
            }
            model_cols = {c.name for c in model_cls.__table__.columns}
            missing = model_cols - db_cols

            if not missing:
                continue

            logger.warning(
                "Table %s is missing %d columns: %s",
                table_name, len(missing), sorted(missing)
            )

            for col_name in sorted(missing):
                col = model_cls.__table__.columns[col_name]
                col_type = str(col.type)
                nullable = "NULL" if col.nullable else "NOT NULL"

                # Render server_default safely — handle func.now() and string defaults
                default_clause = ""
                if col.server_default is not None and col.server_default.arg is not None:
                    arg = col.server_default.arg
                    if isinstance(arg, str):
                        default_clause = f"DEFAULT '{arg}'"
                    else:
                        # Try to compile the SQL expression (e.g. func.now())
                        try:
                            compiled = arg.compile(engine.sync_engine)
                            default_clause = f"DEFAULT {str(compiled)}"
                        except Exception:
                            # Fall back to making the column nullable
                            nullable = "NULL"

                # PostgreSQL: use ADD COLUMN IF NOT EXISTS (PG >= 9.6)
                # SQLite: plain ADD COLUMN
                dialect = engine.dialect.name
                if dialect == "sqlite":
                    sql = f"ALTER TABLE {table_name} ADD COLUMN {col_name} {col_type} {default_clause} {nullable}"
                else:
                    sql = f"ALTER TABLE {table_name} ADD COLUMN IF NOT EXISTS {col_name} {col_type} {default_clause} {nullable}"

                logger.info("  -> Adding column: %s.%s (%s)", table_name, col_name, col_type)
                try:
                    await conn.execute(text(sql))
                except Exception as inner:
                    logger.error("  -> FAILED to add %s.%s: %s", table_name, col_name, inner)

    logger.info("Schema sync complete")


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------
def main() -> None:
    logger.info("=== Database initialization ===")

    # Try Alembic first
    if not _run_alembic():
        _stamp_alembic()

    # Always run schema-sync as a safety net
    try:
        asyncio.run(_sync_schema())
    except Exception as exc:
        logger.error("Schema sync failed (non-fatal): %s", exc)
        logger.error("Falling back to create_all in FastAPI lifespan")

    logger.info("=== Database initialization complete ===")


if __name__ == "__main__":
    main()
