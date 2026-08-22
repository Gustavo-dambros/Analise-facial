"""Integration with Supabase Auth for user registration and confirmation.

Uses the official ``supabase`` package. The Supabase client is synchronous,
so calls are wrapped in ``asyncio.to_thread`` to avoid blocking the event loop.
"""

import asyncio
import logging
from typing import Optional

from app.core.config import settings

logger = logging.getLogger(__name__)

_client = None


class SupabaseAuthError(Exception):
    """Raised when a Supabase Auth operation fails."""

    def __init__(self, message: str, status_code: int = 400):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


def _get_client():
    """Lazily create the Supabase client (service role preferred, anon fallback)."""
    global _client
    if _client is not None:
        return _client

    if not settings.SUPABASE_URL or not (
        settings.SUPABASE_SERVICE_ROLE_KEY or settings.SUPABASE_ANON_KEY
    ):
        raise SupabaseAuthError(
            "Supabase Auth nao configurado (SUPABASE_URL e SUPABASE_ANON_KEY/SERVICE_ROLE_KEY).",
            status_code=500,
        )

    from supabase import create_client

    key = settings.SUPABASE_SERVICE_ROLE_KEY or settings.SUPABASE_ANON_KEY
    _client = create_client(settings.SUPABASE_URL, key)
    return _client


def reset_client() -> None:
    """Drop the cached client (used by tests)."""
    global _client
    _client = None


def _extract_error_message(exc: Exception) -> str:
    """Extract a friendly message from a supabase/gotrue exception."""
    message = str(getattr(exc, "message", "") or exc)
    if "already" in message.lower() and "regist" in message.lower():
        return "Email ja cadastrado."
    if "invalid" in message.lower() and ("email" in message.lower() or "password" in message.lower()):
        return "E-mail ou senha invalidos conforme as regras do Supabase."
    if "rate" in message.lower():
        return "Muitas tentativas. Aguarde alguns minutos e tente novamente."
    return message or "Erro ao comunicar com o servico de autenticacao."


async def sign_up(email: str, password: str) -> dict:
    """Create the user in Supabase Auth, triggering the confirmation email.

    Returns the Supabase response dict on success.
    Raises SupabaseAuthError on failure.
    """
    def _call():
        return _get_client().auth.sign_up(
            {
                "email": email,
                "password": password,
                "options": {
                    "email_redirect_to": settings.SUPABASE_EMAIL_REDIRECT_TO,
                },
            }
        )

    try:
        response = await asyncio.to_thread(_call)
        logger.info("Supabase sign_up OK — email=%s", email)
        return getattr(response, "model_dump", lambda: response)()
    except Exception as exc:  # noqa: BLE001 — gotrue raises generic ApiException
        logger.error("Supabase sign_up failed — email=%s: %s", email, exc)
        raise SupabaseAuthError(_extract_error_message(exc)) from exc


async def resend_confirmation(email: str) -> None:
    """Resend the Supabase signup confirmation email."""
    def _call():
        return _get_client().auth.resend(
            {
                "type": "signup",
                "email": email,
                "options": {
                    "email_redirect_to": settings.SUPABASE_EMAIL_REDIRECT_TO,
                },
            }
        )

    try:
        await asyncio.to_thread(_call)
        logger.info("Supabase resend confirmation OK — email=%s", email)
    except Exception as exc:  # noqa: BLE001
        logger.error("Supabase resend failed — email=%s: %s", email, exc)
        raise SupabaseAuthError(_extract_error_message(exc)) from exc


async def get_user_by_email(email: str) -> Optional[dict]:
    """Fetch a Supabase Auth user by e-mail (requires service role key).

    Returns the raw user dict or None when not found / admin API unavailable.
    """
    if not settings.SUPABASE_SERVICE_ROLE_KEY:
        logger.warning("SUPABASE_SERVICE_ROLE_KEY not set — cannot query users by email")
        return None

    def _call():
        return _get_client().auth.admin.get_user_by_email(email)

    try:
        user = await asyncio.to_thread(_call)
        return getattr(user, "model_dump", lambda: user)()
    except Exception as exc:  # noqa: BLE001
        logger.warning("Supabase get_user_by_email failed — email=%s: %s", email, exc)
        return None


async def update_password_by_email(email: str, new_password: str) -> None:
    """Best-effort sync of a password change to Supabase Auth (admin API)."""
    if not settings.SUPABASE_SERVICE_ROLE_KEY:
        return

    def _call():
        client = _get_client()
        user = client.auth.admin.get_user_by_email(email)
        user_id = getattr(user, "id", None) or (user.get("id") if isinstance(user, dict) else None)
        if not user_id:
            raise SupabaseAuthError("Usuario nao encontrado no Supabase.")
        return client.auth.admin.update_user_by_id(
            user_id, {"password": new_password}
        )

    try:
        await asyncio.to_thread(_call)
        logger.info("Supabase password synced — email=%s", email)
    except Exception as exc:  # noqa: BLE001
        logger.error("Supabase password sync failed — email=%s: %s", email, exc)


async def is_email_confirmed(email: str) -> bool:
    """Check whether the e-mail was confirmed in Supabase Auth."""
    user = await get_user_by_email(email)
    if not user:
        return False
    return bool(user.get("email_confirmed_at") or user.get("confirmed_at"))
