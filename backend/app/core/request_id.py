import uuid
import contextvars
import logging
from fastapi import Request

request_id_ctx = contextvars.ContextVar("request_id", default="")

class RequestIdFilter(logging.Filter):
    def filter(self, record):
        record.request_id = request_id_ctx.get("") or "-"
        # Sanitize sensitive headers / payloads
        msg = record.getMessage()
        # Redact Authorization, tokens, card data if accidentally logged
        for secret in ["Authorization", "authorization", "Bearer", "card", "cvv", "cpf"]:
            if secret.lower() in msg.lower():
                # truncate
                record.msg = "[REDACTED]"
                record.args = ()
                break
        return True

async def request_id_middleware(request: Request, call_next):
    rid = request.headers.get("X-Request-ID") or str(uuid.uuid4())
    request_id_ctx.set(rid)
    response = await call_next(request)
    response.headers["X-Request-ID"] = rid
    return response
