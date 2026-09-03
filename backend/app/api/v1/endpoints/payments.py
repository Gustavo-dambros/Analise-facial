import asyncio
import logging
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.connection import get_db
from app.core.security import get_current_user
from app.schemas.payment import (
    PaymentCreateRequest,
    PaymentCreateResponse,
    PaymentStatusResponse,
    PaymentWebhookResponse,
)
from app.services.payment_service import PaymentService, PaymentStatus, PaymentMethod

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/create", response_model=PaymentCreateResponse, status_code=status.HTTP_201_CREATED)
async def create_payment(
    request: Request,
    payment_data: PaymentCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Create a payment preference (PIX or Checkout Pro)."""
    service = PaymentService(db)

    if payment_data.payment_method == "pix":
        result = await service.create_pix_payment(
            user=current_user,
            plan_id=payment_data.plan_id,
            success_url=payment_data.success_url,
            pending_url=payment_data.pending_url,
        )
    elif payment_data.payment_method == "credit_card":
        result = await service.create_checkout_pro_payment(
            user=current_user,
            plan_id=payment_data.plan_id,
            success_url=payment_data.success_url,
            pending_url=payment_data.pending_url,
        )
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Metodo de pagamento invalido: {payment_data.payment_method}",
        )

    return PaymentCreateResponse(**result)


@router.post("/create-preference", response_model=PaymentCreateResponse, status_code=status.HTTP_201_CREATED)
async def create_preference(
    request: Request,
    payment_data: PaymentCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Create Mercado Pago preference — alias for /create (spec: POST /create-preference)."""
    service = PaymentService(db)
    result = await service.create_preference(
        user=current_user,
        plan_id=payment_data.plan_id,
        success_url=payment_data.success_url,
        pending_url=payment_data.pending_url,
        payment_method=payment_data.payment_method,
    )
    return PaymentCreateResponse(**result)


@router.post("/webhook", status_code=status.HTTP_204_NO_CONTENT)
async def payment_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Receive and process Mercado Pago webhook notifications (IPN).

    Validates x-signature (ts,v1) + x-request-id manifest HMAC-SHA256, parses payload, returns 204 immediately.
    Processing runs in background via asyncio.create_task.
    """
    raw_body = await request.body()

    # Mercado Pago official headers: x-signature, x-request-id
    signature = (
        request.headers.get("x-signature", "")
        or request.headers.get("X-Signature", "")
        or request.headers.get("X-Hub-Signature-256", "")
    )
    x_request_id = request.headers.get("x-request-id", "") or request.headers.get("X-Request-Id", "")
    if not PaymentService.validate_webhook_signature(raw_body, signature, x_request_id):
        logger.warning("Invalid or missing webhook signature received. sig=%s req_id=%s", signature, x_request_id)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Assinatura do webhook invalida.",
        )

    # Parse the JSON body
    try:
        payload = await request.json()
    except Exception as exc:
        logger.error("Failed to parse webhook JSON: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payload do webhook invalido.",
        )

    # Fire-and-forget: process in background, return 204 immediately
    service = PaymentService(db)
    asyncio.create_task(_process_webhook_async(service, payload, db))

    # HTTP 204 No Content — fastest possible acknowledgment
    return JSONResponse(status_code=status.HTTP_204_NO_CONTENT, content=None)


async def _process_webhook_async(service: PaymentService, payload: dict, db: AsyncSession):
    """Background task wrapper that never raises to the event loop."""
    try:
        result = await service.process_webhook(payload, db)
        logger.info("Webhook processed asynchronously: %s", result)
    except Exception as exc:
        # Log but never let the background task crash — the webhook
        # has already been acknowledged with 204.
        logger.exception("Background webhook processing failed (will not retry): %s", exc)


@router.get("/{payment_id}/status", response_model=PaymentStatusResponse)
async def get_payment_status(
    payment_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Get the current status of a payment by its internal ID."""
    service = PaymentService(db)
    result = await service.get_payment_status(payment_id, db)
    return PaymentStatusResponse(**result)
