import logging
import resend
from app.core.config import settings

logger = logging.getLogger(__name__)


def _get_client() -> resend.Emails:
    if not settings.RESEND_API_KEY:
        raise RuntimeError("RESEND_API_KEY is not configured")
    resend.api_key = settings.RESEND_API_KEY
    return resend.Emails


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
            <td align="center" style="padding-bottom:32px">
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


async def send_verification_email(to_email: str, confirmation_link: str) -> dict:
    if not settings.RESEND_API_KEY:
        logger.warning("RESEND_API_KEY not configured — email not sent to %s", to_email)
        return {"status": "skipped", "reason": "RESEND_API_KEY not set"}

    try:
        client = _get_client()
        params: resend.Emails.SendParams = {
            "from": settings.RESEND_FROM_EMAIL,
            "to": [to_email],
            "subject": "Confirme seu e-mail — FaceMax",
            "html": _build_verification_html(confirmation_link, to_email),
        }
        response = client.send(params)
        logger.info("Verification email sent to %s (id=%s)", to_email, response.get("id"))
        return {"status": "sent", "id": response.get("id")}
    except Exception as exc:
        logger.error("Failed to send verification email to %s: %s", to_email, exc)
        raise