from pydantic_settings import BaseSettings, SettingsConfigDict
import secrets
import warnings


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
        extra="ignore",
    )

    # App
    PROJECT_NAME: str = "Analise Facial API"
    API_V1_STR: str = "/api/v1"
    DEBUG: bool = False

    # CORS
    BACKEND_CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
    ]

    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./facial_analysis.db"
    DB_POOL_SIZE: int = 10
    DB_MAX_OVERFLOW: int = 20
    DB_POOL_TIMEOUT: int = 30
    DB_POOL_RECYCLE: int = 1800

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # Security
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # Supabase Auth (JWT) — for validating tokens issued by Supabase Auth
    SUPABASE_URL: str = ""
    SUPABASE_JWT_SECRET: str = ""
    SUPABASE_JWT_ALGORITHM: str = "HS256"

    # Rate Limiting
    RATE_LIMIT_AUTH: str = "5/minute"
    RATE_LIMIT_ANALYSIS: str = "10/hour"
    RATE_LIMIT_GENERAL: str = "60/minute"

    # MediaPipe (face detection only)
    MIN_DETECTION_CONFIDENCE: float = 0.5
    MIN_TRACKING_CONFIDENCE: float = 0.5

    # OpenRouter API
    OPENROUTER_API_KEY: str = ""
    OPENROUTER_MODEL: str = "google/gemma-4-26b-a4b-it:free"
    OPENROUTER_BASE_URL: str = "https://openrouter.ai/api/v1"
    OPENROUTER_TIMEOUT: int = 30
    OPENROUTER_REFERER: str = "https://facemax.app"

    # Request limits
    MAX_IMAGE_BASE64_SIZE_MB: int = 10

    # Plan Pricing (BRL) - Server-side pricing to prevent client-side manipulation
    PLAN_PRICES: dict[str, float] = {
        "plan_monthly": 29.90,
        "plan_annual": 299.90,
        "plan_pro_monthly": 49.90,
        "plan_pro_annual": 499.90,
    }

    # Mercado Pago
    MERCADOPAGO_ACCESS_TOKEN: str = ""
    MERCADOPAGO_WEBHOOK_SECRET: str = ""

    # Application URL (used in email links)
    BASE_URL: str = "http://localhost:8000"

    # Frontend URL (used in password reset links)
    FRONTEND_URL: str = "http://localhost:5173"

    # SMTP Email (Gmail)
    MAIL_SERVER: str = "smtp.gmail.com"
    MAIL_PORT: int = 587
    MAIL_USE_TLS: bool = True
    MAIL_USERNAME: str = ""
    MAIL_PASSWORD: str = ""
    MAIL_FROM_EMAIL: str = "FaceMax <noreply@facemax.app>"


settings = Settings()

# CRITICAL: Refuse to start with insecure secret key in production
_insecure_keys = {"your-secret-key-change-in-production", "dev-secret-key-change-in-production"}
if settings.SECRET_KEY in _insecure_keys and not settings.DEBUG:
    raise RuntimeError(
        "SECRET_KEY is set to an insecure default value. "
        "Set a strong SECRET_KEY in your .env file before running in production. "
        "Generate one with: python -c \"import secrets; print(secrets.token_urlsafe(64))\""
    )
