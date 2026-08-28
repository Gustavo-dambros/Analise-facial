import asyncio
import logging
from datetime import datetime, timedelta, timezone
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.user_repository import UserRepository
from app.schemas.auth import UserCreate, Token, RegisterResponse
from app.core.security import create_access_token, decode_token
from app.core.config import settings
from app.models.user import User
from app.services import supabase_service
from app.services.supabase_service import SupabaseAuthError

logger = logging.getLogger(__name__)

RESET_TOKEN_MINUTES = 30
RESET_TOKEN_TYPE = "password_reset"


def _as_aware_utc(dt: datetime | None) -> datetime | None:
    """Normalize DB datetimes (naive on SQLite) to timezone-aware UTC."""
    if dt is None or dt.tzinfo is not None:
        return dt
    return dt.replace(tzinfo=timezone.utc)


class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.user_repo = UserRepository(db)

    async def register(self, user_data: UserCreate) -> RegisterResponse:
        # A fonte de verdade para duplicidade de e-mail é o Supabase Auth.
        # O espelho local so é criado/atualizado APOS o Supabase aceitar.

        # Cria o usuario no Supabase Auth (dispara o e-mail de confirmacao)
        try:
            await supabase_service.sign_up(
                user_data.email, user_data.password, full_name=user_data.full_name
            )
        except SupabaseAuthError as exc:
            # ex.: "User already registered" -> e-mail ja existe no Supabase
            raise HTTPException(
                status_code=exc.status_code,
                detail=exc.message,
            )

        # Mantem o registro local (login/perfil usam o banco proprio),
        # de forma idempotente para nao quebrar se o espelho ja existir.
        existing = await self.user_repo.get_by_email(user_data.email)
        user = existing if existing else await self.user_repo.create(user_data)

        logger.info(
            "User registered via Supabase — id=%s email=%s — confirmation email sent by Supabase",
            user.id,
            user.email,
        )
        return RegisterResponse(
            message="Conta criada. Enviamos um e-mail de confirmação.",
            requires_verification=True,
            redirect_url=f"{settings.FRONTEND_URL}/waiting",
        )

    async def login(self, email: str, password: str) -> Token:
        user = await self.user_repo.get_by_email(email)
        if not user or not self.user_repo.verify_password(password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Email ou senha incorretos.",
            )

        if not user.is_verified:
            # O link de confirmacao vem do Supabase — sincroniza o status local
            if await supabase_service.is_email_confirmed(email):
                await self.user_repo.verify_user(user)
                logger.info("User verified via Supabase at login — email=%s", email)
            else:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Por favor, confirme seu e-mail antes de fazer login.",
                )

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Conta desativada. Entre em contato com o suporte.",
            )

        access_token = create_access_token(data={"sub": user.id})
        return Token(access_token=access_token)

    async def verify_email(self, token: str) -> str:
        user = await self.user_repo.get_by_verification_token(token)

        if not user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Token de verificação invalido.",
            )

        if user.verification_token_expires and _as_aware_utc(user.verification_token_expires) < datetime.now(timezone.utc):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Token de verificação expirado. Solicite um novo envio.",
            )

        if user.is_verified:
            return "E-mail ja verificado anteriormente."

        await self.user_repo.verify_user(user)
        logger.info("User verified — id=%s email=%s", user.id, user.email)
        return "E-mail verificado com sucesso. Sua conta foi ativada."

    async def resend_verification(self, email: str) -> str:
        user = await self.user_repo.get_by_email(email)
        if not user or user.is_verified:
            logger.info("Resend verification for non-existent/verified email: %s", email)
            return "Se o cadastro existir e nao estiver verificado, um novo link sera enviado."

        try:
            await supabase_service.resend_confirmation(email)
        except SupabaseAuthError as exc:
            logger.warning("Supabase resend failed for %s: %s", email, exc.message)

        logger.info("Verification email re-sent — id=%s email=%s", user.id, user.email)
        return "Se o cadastro existir e nao estiver verificado, um novo link sera enviado."

    async def esqueci_senha(self, email: str) -> tuple[str, str]:
        """Solicita reset de senha via Supabase Auth.

        O Supabase envia o e-mail com link para /reset-password contendo o token no hash.
        Resposta genérica para evitar enumeração de e-mails.
        """
        user = await self.user_repo.get_by_email(email)
        if not user:
            logger.info("Forgot password for non-existent email: %s", email)
            redirect_url = f"{settings.FRONTEND_URL}/password-changed"
            return "Se o e-mail estiver cadastrado, um link de recuperacao foi enviado.", redirect_url

        # Sincroniza o status de verificacao com o Supabase (fonte de verdade),
        # exatamente como feito no login. Assim, contas confirmadas no Supabase
        # mas com is_verified desatualizado no banco local conseguem receber o
        # e-mail de reset (caso contrario o envio era silenciosamente ignorado).
        if not user.is_verified and await supabase_service.is_email_confirmed(email):
            await self.user_repo.verify_user(user)
            user.is_verified = True
            logger.info("User verified via Supabase at password reset — email=%s", email)

        if not user.is_verified:
            logger.info("Forgot password for unverified email: %s", email)
            redirect_url = f"{settings.FRONTEND_URL}/password-changed"
            return "Se o e-mail estiver cadastrado, um link de recuperacao foi enviado.", redirect_url

        try:
            await supabase_service.reset_password_for_email(email)
        except SupabaseAuthError as exc:
            logger.warning("Supabase password reset failed for %s: %s", email, exc.message)

        logger.info("Password reset requested via Supabase — id=%s email=%s", user.id, user.email)
        redirect_url = f"{settings.FRONTEND_URL}/password-changed"
        return "Se o e-mail estiver cadastrado, um link de recuperacao foi enviado.", redirect_url

    async def redefinir_senha(self, token: str, nova_senha: str) -> str:
        """Valida o JWT de recuperação e atualiza a senha do usuário."""
        payload = decode_token(token)
        if not payload or payload.get("type") != RESET_TOKEN_TYPE or not payload.get("sub"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Link inválido ou expirado. Solicite um novo link de recuperação.",
            )

        user = await self.user_repo.get_by_id(payload["sub"])
        if not user or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Link inválido ou expirado. Solicite um novo link de recuperação.",
            )

        await self.user_repo.update_password(user, nova_senha)
        await supabase_service.update_password_by_email(user.email, nova_senha)
        logger.info("Password reset — user %s email=%s", user.id, user.email)
        redirect_url = f"{settings.FRONTEND_URL}/password-changed"
        return "Senha redefinida com sucesso.", redirect_url

    async def alterar_senha(self, user: User, nova_senha: str) -> str:
        """Altera a senha do usuário autenticado (sem e-mail/logado)."""
        await self.user_repo.update_password(user, nova_senha)
        await supabase_service.update_password_by_email(user.email, nova_senha)
        logger.info("Password changed — user %s email=%s", user.id, user.email)
        redirect_url = f"{settings.FRONTEND_URL}/password-changed"
        return "Senha alterada com sucesso.", redirect_url


async def _send_reset_email_safe(send_func, to_email: str, token: str):
    try:
        await send_func(to_email, token)
    except Exception as exc:
        logger.exception("Background password reset email failed for %s: %s", to_email, exc)
