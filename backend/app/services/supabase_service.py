"""Integration with Supabase Auth for user registration and confirmation.

Uses the official ``supabase`` package. The Supabase client is synchronous,
so calls are wrapped in ``asyncio.to_thread`` to avoid blocking the event loop.
"""

import asyncio
import logging
from typing import Optional, Tuple

import httpx

from app.core.config import settings
from supabase_auth.errors import (
    AuthApiError,
    AuthInvalidCredentialsError,
    AuthWeakPasswordError,
)

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


def _extract_error_info(exc: Exception) -> Tuple[str, int]:
    """Extract a user-friendly message and HTTP status from a Supabase/Gotrax exception.

    Returns a tuple of (message, status_code).
    """

    # Preserve our own SupabaseAuthError (e.g. config errors with 500)
    if isinstance(exc, SupabaseAuthError):
        # Don't leak internal configuration details to the end user
        if exc.status_code >= 500:
            logger.error("Supabase config/sever error: %s", exc.message)
            return "Erro interno do servidor de autenticacao. Tente novamente mais tarde.", exc.status_code
        return exc.message, exc.status_code

    raw_msg = str(getattr(exc, "message", "") or exc)
    lowered = raw_msg.lower()

    # Weak password — include the specific reasons from Supabase
    if isinstance(exc, AuthWeakPasswordError):
        reasons = getattr(exc, "reasons", [])
        if reasons:
            detail = "; ".join(reasons)
            return (
                f"Senha fraca. {detail}. Use pelo menos 8 caracteres, "
                "com letras maiusculas, minusculas e numeros.",
                400,
            )
        return (
            "Senha fraca. Use pelo menos 8 caracteres com letras maiusculas, "
            "minusculas e numeros.",
            400,
        )

    # Invalid credentials (wrong shape, missing fields, etc.)
    if isinstance(exc, AuthInvalidCredentialsError):
        if "email" in lowered:
            return "E-mail invalido.", 400
        return "Credenciais invalidas. Verifique os dados e tente novamente.", 400

    # Generic API error from Supabase — use the HTTP status it reports
    if isinstance(exc, AuthApiError):
        status = getattr(exc, "status", None) or 400
        if status >= 500:
            return "Erro interno do servidor de autenticacao. Tente novamente mais tarde.", 502
        if status == 429:
            return "Muitas tentativas. Aguarde alguns minutos e tente novamente.", 429
        if "already" in lowered and "regist" in lowered:
            return "Email ja cadastrado.", 409
        if "invalid" in lowered and ("email" in lowered or "password" in lowered):
            return "E-mail ou senha invalidos conforme as regras do Supabase.", 400
        return raw_msg or "Erro ao comunicar com o servico de autenticacao.", status

    # Network / communication errors (timeout, connection refused, DNS, etc.)
    if isinstance(exc, (httpx.NetworkError, httpx.TimeoutException)):
        return (
            "Nao foi possivel conectar ao servico de autenticacao. "
            "Verifique sua conexao e tente novamente.",
            502,
        )

    # HTTP status errors from Supabase API
    if isinstance(exc, httpx.HTTPStatusError):
        status = exc.response.status_code if exc.response is not None else 500
        if status >= 500:
            return "Erro interno do servidor de autenticacao. Tente novamente mais tarde.", 502
        return raw_msg or "Erro ao comunicar com o servico de autenticacao.", status

    # Fallback — don't leak internal details
    logger.warning("Unhandled Supabase error type: %s — %s", type(exc).__name__, exc)
    return "Erro ao comunicar com o servico de autenticacao. Tente novamente mais tarde.", 500


async def sign_up(email: str, password: str, full_name: Optional[str] = None) -> dict:
    """Create the user in Supabase Auth, triggering the confirmation email.

    Returns the Supabase response dict on success.
    Raises SupabaseAuthError on failure.
    """
    def _call():
        options: dict = {
            "email_redirect_to": settings.SUPABASE_EMAIL_REDIRECT_TO,
        }
        if full_name:
            options["data"] = {"full_name": full_name}
        logger.info("[SUPABASE DEBUG] sign_up options RAW: %r", options)
        logger.info("[SUPABASE DEBUG] SUPABASE_EMAIL_REDIRECT_TO RAW: %r", settings.SUPABASE_EMAIL_REDIRECT_TO)
        return _get_client().auth.sign_up(
            {
                "email": email,
                "password": password,
                "options": options,
            }
        )

    try:
        response = await asyncio.to_thread(_call)
        logger.info("Supabase sign_up OK — email=%s", email)
        return getattr(response, "model_dump", lambda: response)()
    except Exception as exc:  # noqa: BLE001 — gotrue raises generic ApiException
        logger.error("Supabase sign_up failed — email=%s: %s", email, exc)
        logger.error(
            "[SUPABASE AUTH API ERROR] Message: %s | Full Details: %r",
            getattr(exc, "message", str(exc)),
            exc,
        )
        message, status_code = _extract_error_info(exc)
        raise SupabaseAuthError(message, status_code=status_code) from exc


async def resend_confirmation(email: str) -> None:
    """Resend the Supabase signup confirmation email."""
    def _call():
        logger.info("[SUPABASE DEBUG] resend options RAW: %r", {"type": "signup", "email": email, "options": {"email_redirect_to": settings.SUPABASE_EMAIL_REDIRECT_TO}})
        logger.info("[SUPABASE DEBUG] SUPABASE_EMAIL_REDIRECT_TO RAW: %r", settings.SUPABASE_EMAIL_REDIRECT_TO)
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
        logger.error(
            "[SUPABASE AUTH API ERROR] Message: %s | Full Details: %r",
            getattr(exc, "message", str(exc)),
            exc,
        )
        message, status_code = _extract_error_info(exc)
        raise SupabaseAuthError(message, status_code=status_code) from exc


async def reset_password_for_email(email: str) -> None:
    """Send password reset email via Supabase Auth.

    The email contains a link to the reset password page with a token in the hash fragment.
    """
    def _call():
        logger.info("[SUPABASE DEBUG] reset options RAW: %r", {"redirect_to": settings.SUPABASE_PASSWORD_REDIRECT_TO})
        logger.info("[SUPABASE DEBUG] SUPABASE_PASSWORD_REDIRECT_TO RAW: %r", settings.SUPABASE_PASSWORD_REDIRECT_TO)
        return _get_client().auth.reset_password_for_email(
            email,
            {
                "redirect_to": settings.SUPABASE_PASSWORD_REDIRECT_TO,
            }
        )

    try:
        await asyncio.to_thread(_call)
        logger.info("Supabase password reset email sent — email=%s", email)
    except Exception as exc:  # noqa: BLE001
        logger.error("Supabase password reset email failed — email=%s: %s", email, exc)
        logger.error(
            "[SUPABASE AUTH API ERROR] Message: %s | Full Details: %r",
            getattr(exc, "message", str(exc)),
            exc,
        )
        message, status_code = _extract_error_info(exc)
        raise SupabaseAuthError(message, status_code=status_code) from exc


async def get_user_by_email(email: str) -> Optional[dict]:
    """Fetch a Supabase Auth user by e-mail (requires service role key).

    Returns the raw user dict or None when not found / admin API unavailable.

    Note: some gotrue versions lack ``auth.admin.get_user_by_email``; we fall
    back to paging through ``list_users`` to locate the matching e-mail.
    """
    if not settings.SUPABASE_SERVICE_ROLE_KEY:
        logger.warning("SUPABASE_SERVICE_ROLE_KEY not set — cannot query users by email")
        return None

    def _call():
        client = _get_client()
        admin = client.auth.admin

        # Preferred: direct lookup (newer gotrue versions)
        if hasattr(admin, "get_user_by_email"):
            try:
                user = admin.get_user_by_email(email)
                if user is not None:
                    return getattr(user, "model_dump", lambda: user)()
            except Exception:  # noqa: BLE001 — fall through to list_users
                pass

        # Fallback: page through list_users until we find the e-mail
        page = 1
        per_page = 200
        while True:
            listing = admin.list_users(page=page, per_page=per_page)
            users = getattr(listing, "users", None) or []
            for u in users:
                u_email = getattr(u, "email", None)
                if u_email is None and isinstance(u, dict):
                    u_email = u.get("email")
                if u_email and u_email.lower() == email.lower():
                    return getattr(u, "model_dump", lambda: u)()
            if len(users) < per_page:
                break
            page += 1
        return None

    try:
        return await asyncio.to_thread(_call)
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
            raise SupabaseAuthError("Usuario nao encontrado no Supabase.", status_code=404)
        return client.auth.admin.update_user_by_id(
            user_id, {"password": new_password}
        )

    try:
        await asyncio.to_thread(_call)
        logger.info("Supabase password synced — email=%s", email)
    except Exception as exc:  # noqa: BLE001
        message, status_code = _extract_error_info(exc)
        logger.error("Supabase password sync failed — email=%s: %s", email, message)
        return None


async def is_email_confirmed(email: str) -> bool:
    """Check whether the e-mail was confirmed in Supabase Auth."""
    user = await get_user_by_email(email)
    if not user:
        return False
    return bool(user.get("email_confirmed_at") or user.get("confirmed_at"))
