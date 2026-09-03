import logging
import time
import sqlalchemy
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from app.core.config import settings
from app.core.exceptions import SanitizedHTTPException
from app.api.v1 import api_router
from app.database.connection import engine, Base

logger = logging.getLogger(__name__)

# Rate limiter — keyed by client IP
limiter = Limiter(key_func=get_remote_address)


def _rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded):
    retry_after = getattr(exc, "retry_after", None) or 60
    reset_at = int(time.time()) + retry_after
    detail = (
        f"Limite de requisicoes atingido. "
        f"Tente novamente em {retry_after} segundos."
    )
    return JSONResponse(
        status_code=429,
        content={"detail": detail, "retry_after": retry_after, "reset_at": reset_at},
        headers={
            "Retry-After": str(retry_after),
            "X-RateLimit-Reset": str(reset_at),
        },
    )


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup — create tables and verify DB connection
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Verify tables were actually created (catch silent failures on read-only FS)
    try:
        async with engine.connect() as conn:
            from sqlalchemy import inspect

            has_profiles = await conn.run_sync(
                lambda sync_conn: inspect(sync_conn).has_table("profiles")
            )
            if not has_profiles:
                raise RuntimeError("profiles table was not created — DATABASE_URL may be read-only or misconfigured")
        logger.info("Database tables verified at startup")
    except RuntimeError:
        raise
    except Exception as db_check_exc:
        logger.error("Database health check failed at startup: %s", db_check_exc)
        raise RuntimeError(
            "Database is not accessible or tables could not be created. "
            "Check DATABASE_URL and database connectivity."
        ) from db_check_exc

    yield
    # Shutdown
    await engine.dispose()


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.PROJECT_NAME,
        openapi_url=f"{settings.API_V1_STR}/openapi.json" if settings.DEBUG else None,
        lifespan=lifespan,
    )

    # Rate limiting
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

    # SEO + rate-limit + noindex headers
    @app.middleware("http")
    async def seo_and_rate_headers(request: Request, call_next):
        path = request.url.path

        # Ignora APIs, docs e esquemas para evitar 301/307 em chamadas assíncronas
        if path.startswith(("/api", "/docs", "/openapi.json", "/redoc")):
            response = await call_next(request)
            # Rate-limit hint
            if "/analyze" in path:
                limit_label = settings.RATE_LIMIT_ANALYSIS
            elif "/auth" in path:
                limit_label = settings.RATE_LIMIT_AUTH
            else:
                limit_label = settings.RATE_LIMIT_GENERAL
            response.headers["X-RateLimit-Limit"] = limit_label
            if any(path.startswith(p) for p in ["/api/v1/profile", "/api/v1/analyze", "/api/v1/payments", "/api/v1/admin"]):
                response.headers["X-Robots-Tag"] = "noindex, nofollow"
            return response

        # Mantém a lógica de SEO apenas para o frontend público
        if path != "/" and path.endswith("/"):
            qs = f"?{request.url.query}" if request.url.query else ""
            return JSONResponse(status_code=301, content={"detail": f"Redirect to {path.rstrip('/')}{qs}"}, headers={"Location": path.rstrip("/") + qs})

        # Canonical host: fold www.facemax.pro -> facemax.pro (301) if Host header matches
        host = request.headers.get("host", "")
        if host == "www.facemax.pro":
            qs = f"?{request.url.query}" if request.url.query else ""
            return JSONResponse(status_code=301, content={"detail": "Canonical redirect"}, headers={"Location": f"https://facemax.pro{path}{qs}"})
        response = await call_next(request)
        # Rate-limit hint
        if "/analyze" in path:
            limit_label = settings.RATE_LIMIT_ANALYSIS
        elif "/auth" in path:
            limit_label = settings.RATE_LIMIT_AUTH
        else:
            limit_label = settings.RATE_LIMIT_GENERAL
        response.headers["X-RateLimit-Limit"] = limit_label
        # X-Robots-Tag noindex for private areas
        if any(path.startswith(p) for p in ["/api/v1/profile", "/api/v1/analyze", "/api/v1/payments", "/api/v1/admin", "/dashboard"]):
            response.headers["X-Robots-Tag"] = "noindex, nofollow"
        # Soft 404 guard is handled by FastAPI 404; ensure no redirect to home on unknown routes
        return response

    # CORS — restricted methods and headers in production
    if settings.BACKEND_CORS_ORIGINS:
        allow_methods = ["*"] if settings.DEBUG else ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
        allow_headers = ["*"] if settings.DEBUG else ["Authorization", "Content-Type"]
        app.add_middleware(
            CORSMiddleware,
            allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS],
            allow_credentials=True,
            allow_methods=allow_methods,
            allow_headers=allow_headers,
        )

    # Global exception handler — never expose internals
    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        logger.exception("Unhandled exception on %s %s", request.method, request.url.path)
        return JSONResponse(
            status_code=500,
            content={"detail": "Erro interno do servidor. Tente novamente."},
        )

    @app.exception_handler(SanitizedHTTPException)
    async def sanitized_exception_handler(request: Request, exc: SanitizedHTTPException):
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail},
        )

    # Catch-all for SQLAlchemy OperationalError — surface a clean message
    @app.exception_handler(sqlalchemy.exc.OperationalError)
    async def db_operational_error_handler(request: Request, exc: Exception):
        logger.exception("Database operational error on %s %s", request.method, request.url.path)
        return JSONResponse(
            status_code=502,
            content={
                "detail": "Nao foi possivel conectar ao banco de dados. "
                          "Tente novamente em instantes ou entre em contato com o suporte."
            },
        )

    # Catch-all for SQLAlchemy StatementError (bad SQL, missing table, etc.)
    @app.exception_handler(sqlalchemy.exc.StatementError)
    async def db_statement_error_handler(request: Request, exc: Exception):
        logger.exception("Database statement error on %s %s", request.method, request.url.path)
        return JSONResponse(
            status_code=500,
            content={
                "detail": "Erro interno ao processar a solicitacao. "
                          "Entre em contato com o suporte."
            },
        )

    # Include routers
    app.include_router(api_router, prefix=settings.API_V1_STR)

    return app


app = create_app()
