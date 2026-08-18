import asyncio
import logging
from datetime import datetime, timedelta
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.user_repository import UserRepository
from app.schemas.auth import UserCreate, Token, RegisterResponse
from app.core.security import create_access_token, generate_secure_token

logger = logging.getLogger(__name__)

VERIFICATION_TOKEN_HOURS = 24
RESET_TOKEN_MINUTES = 60


class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.user_repo = UserRepository(db)

    async def register(self, user_data: UserCreate) -> RegisterResponse:
        existing_user = await self.user_repo.get_by_email(user_data.email)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email ja cadastrado.",
            )

        user = await self.user_repo.create(user_data)

        token = generate_secure_token()
        expires = datetime.utcnow() + timedelta(hours=VERIFICATION_TOKEN_HOURS)
        await self.user_repo.set_verification_token(user.id, token, expires)

        from app.services.email_service import send_verification_email

        asyncio.create_task(
            _send_verification_email_safe(send_verification_email, user.email, token)
        )

        logger.info("User registered — id=%s email=%s — verification email queued", user.id, user.email)
        return RegisterResponse(
            message="Conta criada. Verifique seu e-mail para ativa-la.",
            requires_verification=True,
        )

    async def login(self, email: str, password: str) -> Token:
        user = await self.user_repo.get_by_email(email)
        if not user or not self.user_repo.verify_password(password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Email ou senha incorretos.",
            )

        if not user.is_verified:
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

        if user.verification_token_expires and user.verification_token_expires < datetime.utcnow():
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
        from app.services.email_service import send_verification_email

        user = await self.user_repo.get_by_email(email)
        if not user or user.is_verified:
            logger.info("Resend verification for non-existent/verified email: %s", email)
            return "Se o cadastro existir e nao estiver verificado, um novo link sera enviado."

        token = generate_secure_token()
        expires = datetime.utcnow() + timedelta(hours=VERIFICATION_TOKEN_HOURS)
        await self.user_repo.set_verification_token(user.id, token, expires)

        asyncio.create_task(
            _send_verification_email_safe(send_verification_email, user.email, token)
        )

        logger.info("Verification email re-sent — id=%s email=%s", user.id, user.email)
        return "Se o cadastro existir e nao estiver verificado, um novo link sera enviado."

    async def forgot_password(self, email: str) -> str:
        from app.services.email_service import send_password_reset_email

        user = await self.user_repo.get_by_email(email)
        if not user or not user.is_verified:
            logger.info("Forgot password for non-existent/unverified email: %s", email)
            return "Se o e-mail estiver cadastrado, um link de recuperacao foi enviado."

        token = generate_secure_token()
        expires = datetime.utcnow() + timedelta(minutes=RESET_TOKEN_MINUTES)
        await self.user_repo.set_reset_token(user, token, expires)

        asyncio.create_task(
            _send_reset_email_safe(send_password_reset_email, user.email, token)
        )

        logger.info("Password reset requested — id=%s email=%s", user.id, user.email)
        return "Se o e-mail estiver cadastrado, um link de recuperacao foi enviado."

    async def reset_password(self, token: str, new_password: str) -> str:
        user = await self.user_repo.get_by_reset_token(token)

        if not user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Token de redefinição invalido.",
            )

        if user.reset_token_expires and user.reset_token_expires < datetime.utcnow():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Token de redefinição expirado. Solicite um novo link.",
            )

        await self.user_repo.update_password_and_clear_reset(user, new_password)
        logger.info("Password reset — user %s email=%s", user.id, user.email)
        return "Senha redefinida com sucesso."


async def _send_verification_email_safe(send_func, to_email: str, token: str):
    try:
        await send_func(to_email, token)
    except Exception as exc:
        logger.exception("Background verification email failed for %s: %s", to_email, exc)


async def _send_reset_email_safe(send_func, to_email: str, token: str):
    try:
        await send_func(to_email, token)
    except Exception as exc:
        logger.exception("Background password reset email failed for %s: %s", to_email, exc)
