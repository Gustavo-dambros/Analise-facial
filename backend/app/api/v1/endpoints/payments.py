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
from app.services.payment_service import PaymentService

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/create", response_model=PaymentCreateResponse, status_code=status.HTTP_201_CREATED)
async def create_payment(
    request: Request,
    payment_data: PaymentCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Endpoint legado (Mercado Pago descontinuado) — use /create-cakto. Mantido apenas para direcionar ao Cakto."""
    service = PaymentService(db)

    if payment_data.payment_method != "cakto":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mercado Pago descontinuado. Pagamento somente via Cakto (PIX). Use /payments/create-cakto.",
        )
    result = await service.create_cakto_payment(
        user=current_user,
        plan_id=payment_data.plan_id,
        success_url=payment_data.success_url,
        pending_url=payment_data.pending_url,
        idempotency_key=payment_data.idempotency_key,
    )

    return PaymentCreateResponse(**result)


@router.post("/create-preference", response_model=PaymentCreateResponse, status_code=status.HTTP_201_CREATED)
async def create_preference(
    request: Request,
    payment_data: PaymentCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Mercado Pago descontinuado — use /create-cakto."""
    raise HTTPException(
        status_code=status.HTTP_410_GONE,
        detail="Mercado Pago descontinuado. Pagamento somente via Cakto (PIX). Use /payments/create-cakto.",
    )


@router.post("/create-cakto", response_model=PaymentCreateResponse, status_code=status.HTTP_201_CREATED)
async def create_cakto_payment(
    request: Request,
    payment_data: PaymentCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Create a Cakto payment."""
    service = PaymentService(db)
    if payment_data.payment_method != "cakto":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Metodo de pagamento invalido: {payment_data.payment_method}",
        )
    result = await service.create_cakto_payment(
        user=current_user,
        plan_id=payment_data.plan_id,
        success_url=payment_data.success_url,
        pending_url=payment_data.pending_url,
        idempotency_key=payment_data.idempotency_key,
    )
    return PaymentCreateResponse(**result)


@router.post("/webhook", status_code=status.HTTP_204_NO_CONTENT)
async def payment_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Mercado Pago descontinuado — webhook desativado. Pagamentos somente via Cakto (/webhook/cakto)."""
    raise HTTPException(
        status_code=status.HTTP_410_GONE,
        detail="Mercado Pago descontinuado. Pagamento somente via Cakto (PIX).",
    )


@router.post("/webhook/cakto", status_code=status.HTTP_204_NO_CONTENT)
async def cakto_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Receive and process Cakto webhook notifications.

    Eventos conhecidos da Cakto (enum real `event_id`):
    - purchase_approved → aprova o pagamento e libera o plano (único que desbloqueia).
    - purchase_refused → marca o pagamento como rejeitado (frontend para de aguardar).
    - refund / chargeback → marca como reembolsado e rebaixa o perfil para free.
    - pix_gerado / boleto_gerado / picpay_gerado / openfinance_nubank_gerado →
      apenas informativos (pagamento segue pendente).
    - checkout_abandonment, subscription_* → ignorados (sem efeito em PIX avulso).

    Assinatura HMAC: header X-Cakto-Signature (v1=<hex> de
    HMAC-SHA256(secret, "<timestamp>.<raw_body>")) + X-Cakto-Timestamp
    (rejeitado se |now - ts| > 300s, anti-replay).
    """
    raw_body = await request.body()
    signature = (
        request.headers.get("x-cakto-signature", "")
        or request.headers.get("X-Cakto-Signature", "")
        or request.headers.get("x-webhook-signature", "")
        or request.headers.get("X-Cakto-Signature", "")
    )
    timestamp = (
        request.headers.get("x-cakto-timestamp", "")
        or request.headers.get("X-Cakto-Timestamp", "")
    )
    if not PaymentService.validate_cakto_webhook_signature(raw_body, signature, timestamp):
        logger.warning("Invalid or missing Cakto webhook signature: sig=%s ts=%s", signature, timestamp)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Assinatura do webhook Cakto invalida.",
        )
    try:
        payload = await request.json()
    except Exception as exc:
        logger.error("Failed to parse Cakto webhook JSON: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payload do webhook invalido.",
        )
    asyncio.create_task(_process_cakto_webhook_async(PaymentService(db), payload, None))
    return JSONResponse(status_code=status.HTTP_204_NO_CONTENT, content=None)


async def _process_cakto_webhook_async(service: PaymentService, payload: dict, db: AsyncSession):
    """Background task wrapper for Cakto webhooks."""
    try:
        result = await service.process_cakto_webhook(payload, db)
        logger.info("Cakto webhook processed asynchronously: %s", result)
    except Exception as exc:
        logger.exception("Background Cakto webhook processing failed (will not retry): %s", exc)


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
