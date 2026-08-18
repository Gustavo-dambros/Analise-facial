import logging
import asyncio
import smtplib
import socket
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formataddr
from app.core.config import settings

logger = logging.getLogger(__name__)


def _parse_from_email(raw_from: str) -> tuple[str, str]:
    """Parse 'Name <email@host>' into (name, email)."""
    if "<" in raw_from and ">" in raw_from:
        name_part = raw_from.split("<")[0].strip().strip('"')
        email_part = raw_from.split("<")[1].split(">")[0].strip()
        return name_part, email_part
    return "", raw_from.strip()


def _build_message(to_email: str, subject: str, html: str) -> MIMEMultipart:
    sender_name, sender_email = _parse_from_email(settings.MAIL_FROM_EMAIL)

    msg = MIMEMultipart("alternative")
    msg["From"] = formataddr((sender_name, sender_email))
    msg["To"] = to_email
    msg["Subject"] = subject
    msg.attach(MIMEText(html, "html", "utf-8"))
    return msg


def _send_sync(to_email: str, subject: str, html: str) -> None:
    if not settings.MAIL_USERNAME or not settings.MAIL_PASSWORD:
        logger.warning("SMTP credentials not configured — email skipped for %s", to_email)
        return

    msg = _build_message(to_email, subject, html)

    try:
        with smtplib.SMTP(settings.MAIL_SERVER, settings.MAIL_PORT, timeout=30) as server:
            server.ehlo()
            if settings.MAIL_USE_TLS:
                server.starttls()
                server.ehlo()
            server.login(settings.MAIL_USERNAME, settings.MAIL_PASSWORD)
            server.sendmail(msg["From"], to_email, msg.as_string())
        logger.info("Email sent via SMTP to %s — subject=%r", to_email, subject)
    except smtplib.SMTPAuthenticationError as exc:
        logger.error("SMTP authentication failed (email=%s): %s", to_email, exc.smtp_error.decode() if isinstance(exc.smtp_error, bytes) else exc.smtp_error)
        raise
    except smtplib.SMTPRecipientsRefused as exc:
        logger.error("SMTP recipient refused (email=%s): %s", to_email, exc)
        raise
    except smtplib.SMTPServerDisconnected as exc:
        logger.error("SMTP server disconnected (email=%s): %s", to_email, exc)
        raise
    except smtplib.SMTPException as exc:
        logger.error("SMTP error sending to %s: %s", to_email, exc)
        raise
    except (socket.error, ConnectionError) as exc:
        logger.error("Network error sending SMTP email to %s: %s", to_email, exc)
        raise
    except Exception as exc:
        logger.exception("Unexpected error sending email to %s: %s", to_email, exc)
        raise


async def _send_email_async(to_email: str, subject: str, html: str) -> dict:
    if not settings.MAIL_USERNAME or not settings.MAIL_PASSWORD:
        logger.warning("SMTP credentials not configured — email skipped for %s", to_email)
        return {"status": "skipped", "reason": "SMTP credentials not set"}

    try:
        await asyncio.to_thread(_send_sync, to_email, subject, html)
        return {"status": "sent"}
    except smtplib.SMTPException as exc:
        logger.error("SMTP error sending email to %s: %s", to_email, exc)
        raise
    except (socket.error, ConnectionError) as exc:
        logger.error("Network error sending SMTP email to %s: %s", to_email, exc)
        raise
    except Exception as exc:
        logger.exception("Unexpected error sending email to %s: %s", to_email, exc)
        raise


def _build_verification_html(confirmation_link: str, user_email: str) -> str:
    return f"""\
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Confirme seu e-mail — FaceMax</title>
</head>
<body style="margin:0;padding:0;background-color:#0a0a0a;font-family:Arial,sans-serif">
  <table width="100%%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0a;padding:40px 0">
    <tr>
      <td align="center">
        <table width="480" cellpadding="0" cellspacing="0" style="background-color:#141414;border-radius:16px;border:1px solid #262626;padding:40px 32px">
          <tr>
            <td align="center" style="padding-bottom:24px">
              <h1 style="color:#fff;font-size:24px;font-family:Georgia,serif;margin:0">FaceMax</h1>
              <p style="color:#888;font-size:12px;margin:4px 0 0">Análise Facial Profissional</p>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom:24px">
              <h2 style="color:#fff;font-size:16px;margin:0 0 8px">Verifique seu endereço de e-mail</h2>
              <p style="color:#aaa;font-size:13px;line-height:1.6;margin:0">
                Obrigado por se cadastrar no FaceMax. Para ativar sua conta, confirme seu e-mail clicando
                no botão abaixo.
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-bottom:32px">
              <a href="{confirmation_link}"
                 style="display:inline-block;background-color:#d4a853;color:#0a0a0a;text-decoration:none;
                        font-size:14px;font-weight:600;padding:12px 36px;border-radius:8px">
                Confirmar E-mail
              </a>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-bottom:8px">
              <p style="color:#666;font-size:11px;margin:0">
                Ou copie e cole este link no navegador:
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-bottom:24px">
              <a href="{confirmation_link}" style="color:#d5a853;font-size:11px;word-break:break-all">
                {confirmation_link}
              </a>
            </td>
          </tr>
          <tr>
            <td align="center">
              <p style="color:#555;font-size:10px;margin:0">
                FaceMax — Análise Facial Profissional<br />
                Este e-mail foi enviado para {user_email} durante o processo de cadastro.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""


def _build_password_reset_html(reset_link: str, user_email: str) -> str:
    return f"""\
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Recuperação de Senha — FaceMax</title>
</head>
<body style="margin:0;padding:0;background-color:#0a0a0a;font-family:Arial,sans-serif">
  <table width="100%%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0a;padding:40px 0">
    <tr>
      <td align="center">
        <table width="480" cellpadding="0" cellspacing="0" style="background-color:#141414;border-radius:16px;border:1px solid #262626;padding:40px 32px">
          <tr>
            <td align="center" style="padding-bottom:24px">
              <h1 style="color:#fff;font-size:24px;font-family:Georgia,serif;margin:0">FaceMax</h1>
              <p style="color:#888;font-size:12px;margin:4px 0 0">Análise Facial Profissional</p>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom:24px">
              <h2 style="color:#fff;font-size:16px;margin:0 0 8px">Recuperação de Senha</h2>
              <p style="color:#aaa;font-size:13px;line-height:1.6;margin:0">
                Recebemos uma solicitação para redefinir a senha da sua conta no FaceMax.
                Clique no botão abaixo para criar uma nova senha. Este link é válido por 1 hora.
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-bottom:32px">
              <a href="{reset_link}"
                 style="display:inline-block;background-color:#d4a853;color:#0a0a0a;text-decoration:none;
                        font-size:14px;font-weight:600;padding:12px 36px;border-radius:8px">
                Redefinir Senha
              </a>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-bottom:8px">
              <p style="color:#666;font-size:11px;margin:0">
                Ou copie e cole este link no navegador:
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-bottom:24px">
              <a href="{reset_link}" style="color:#d5a853;font-size:11px;word-break:break-all">
                {reset_link}
              </a>
            </td>
          </tr>
          <tr>
            <td align="center">
              <p style="color:#555;font-size:10px;margin:0">
                FaceMax — Análise Facial Profissional<br />
                Este e-mail foi enviado para {user_email}. Se você não solicitou a redefinição, ignore esta mensagem.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""


async def send_verification_email(email_to: str, token: str) -> dict:
    confirmation_link = f"{settings.BASE_URL}/api/v1/auth/verificar-email/{token}"
    return await _send_email_async(
        to_email=email_to,
        subject="Confirme seu e-mail",
        html=_build_verification_html(confirmation_link, email_to),
    )


async def send_password_reset_email(email_to: str, token: str) -> dict:
    reset_link = f"{settings.BASE_URL}/api/v1/auth/resetar-senha?token={token}"
    return await _send_email_async(
        to_email=email_to,
        subject="Redefinir sua senha",
        html=_build_password_reset_html(reset_link, email_to),
    )
