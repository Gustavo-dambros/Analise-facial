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
        # Produção (frontend no Render / domínio próprio)
        "https://facemax-frontend-h1me.onrender.com",
        "https://facemax.pro",
        "https://www.facemax.pro",
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

    # Supabase Auth (signup) — anon key for client ops, service role for admin ops
    SUPABASE_ANON_KEY: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""

    # Redirect after e-mail confirmation (Supabase email_redirect_to)
    SUPABASE_EMAIL_REDIRECT_TO: str = "https://facemax.pro/email-confirmado"

    # Redirect after password reset request (Supabase redirectTo)
    SUPABASE_PASSWORD_REDIRECT_TO: str = "https://facemax.pro/reset-password"

    # Rate Limiting
    RATE_LIMIT_AUTH: str = "5/minute"
    RATE_LIMIT_ANALYSIS: str = "10/hour"
    RATE_LIMIT_GENERAL: str = "60/minute"

    # MediaPipe (face detection only)
    MIN_DETECTION_CONFIDENCE: float = 0.5
    MIN_TRACKING_CONFIDENCE: float = 0.5

    # OpenRouter API (desativado — projeto sem IA, avaliação 100% humana)
    # Mantido por compatibilidade, mas não usado quando ENABLE_AI_ANALYSIS=False
    ENABLE_AI_ANALYSIS: bool = False
    OPENROUTER_API_KEY: str = ""
    OPENROUTER_MODEL: str = "google/gemma-4-26b-a4b-it:free"
    OPENROUTER_BASE_URL: str = "https://openrouter.ai/api/v1"
    OPENROUTER_TIMEOUT: int = 30
    OPENROUTER_REFERER: str = "https://facemax.app"

    # Request limits
    MAX_IMAGE_BASE64_SIZE_MB: int = 10

    # Plan Pricing (BRL) - Server-side pricing to prevent client-side manipulation
    # Pagamento atual: somente Cakto/PIX — cobra-se o valor "pix".
    # A chave "credit_card" é mantida apenas como referência do preço cheio
    # exibido no frontend (Âncora de preço); nenhum gateway de cartão existe.
    # Avulso (12.99/14.99), Mensal (20.00/24.90), Anual (179.00/184.00), Black (49.90/54.90)
    PLAN_PRICES: dict[str, dict[str, float]] = {
        "plan_avulsa": {"pix": 12.99, "credit_card": 14.99},
        "plan_monthly": {"pix": 20.00, "credit_card": 24.90},
        "plan_annual": {"pix": 179.00, "credit_card": 184.00},
        "plan_black": {"pix": 49.90, "credit_card": 54.90},
    }

    # Analysis limits per plan (monthly quota)
    # Avulso: 1 total (not monthly), Monthly: 2, Annual: 4, Black: 6
    PLAN_ANALYSIS_LIMITS: dict[str, int] = {
        "plan_avulsa": 1,
        "plan_monthly": 2,
        "plan_annual": 4,
        "plan_black": 6,
    }

    # Queue SLA in hours per plan
    PLAN_QUEUE_SLA_HOURS: dict[str, int] = {
        "plan_avulsa": 24,
        "plan_monthly": 24,
        "plan_annual": 16,
        "plan_black": 8,
    }

    # Application URL (used in email links)
    BASE_URL: str = "http://localhost:8000"

    # Frontend URL (used in password reset links)
    FRONTEND_URL: str = "http://localhost:5173"

    # Mercado Pago (TEST sandbox) — never commit real secrets
    MERCADOPAGO_PUBLIC_KEY: str = ""
    MERCADOPAGO_ACCESS_TOKEN: str = ""
    MERCADOPAGO_WEBHOOK_SECRET: str = ""
    MERCADOPAGO_ENV: str = "test"
    MERCADOPAGO_NOTIFICATION_URL: str = ""  # ex: https://facemax.pro/api/v1/payments/webhook
    # Cakto (OAuth2 Public API) — never commit real secrets
    CAKTO_CLIENT_ID: str = ""
    CAKTO_CLIENT_SECRET: str = ""
    CAKTO_WEBHOOK_SECRET: str = ""
    CAKTO_BASE_URL: str = "https://api.cakto.com.br/public_api"
    # Mapeamento plan_id -> offerId (short_id da oferta Cakto) — novos produtos criados 2026-09-15
    PLAN_OFFER_MAP: dict[str, str] = {
        "plan_avulsa": "bxvpzb5",
        "plan_monthly": "g8jhmzt",
        "plan_annual": "yh5verb",
        "plan_black": "35vobpd",
    }

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
