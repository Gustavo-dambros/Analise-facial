from datetime import datetime
from typing import Optional, Literal
from decimal import Decimal
from pydantic import BaseModel, Field, ConfigDict
from app.models.payment import PaymentStatus, PaymentMethod


class PaymentCreateRequest(BaseModel):
    """Payload for POST /payments/create-cakto (único método: Cakto/PIX)."""
    plan_id: str = Field(..., description="Identificador do plano selecionado (e.g. 'plan_monthly', 'plan_annual').")
    payment_method: Literal["cakto"] = Field(default="cakto", description="Metodo de pagamento (somente Cakto).")
    success_url: str = Field(..., min_length=1, max_length=2048, description="URL para redirecionamento apos pagamento aprovado.")
    pending_url: str = Field(..., min_length=1, max_length=2048, description="URL para redirecionamento enquanto pagamento esta pendente.")
    idempotency_key: Optional[str] = Field(
        default=None,
        min_length=8,
        max_length=64,
        description="Chave de idempotência gerada no frontend por tentativa de checkout. "
        "Repassada como X-Idempotency-Key à Cakto para que retries de rede não gerem cobranças duplicadas. "
        "Se omitida, o backend gera uma chave aleatória.",
    )


class PaymentCreateResponse(BaseModel):
    """Response returned by POST /payments/create-cakto."""
    payment_id: str = Field(..., validation_alias="id", description="ID interno do registro de pagamento no Supabase/FastAPI DB.")
    payment_method: PaymentMethod
    status: PaymentStatus
    amount: Decimal
    currency: str
    qr_code: Optional[str] = Field(default=None, description="QR Code textual (copia-e-cola) para PIX.")
    qr_code_base64: Optional[str] = Field(default=None, description="Imagem base64 do QR Code para PIX.")
    ticket_url: Optional[str] = Field(default=None, description="URL do boleto ou tela de pagamento PIX.")
    preference_id: Optional[str] = Field(default=None, description="ID da preferencia MP/Cakto")
    init_point: Optional[str] = Field(default=None, description="Link de checkout MP/Cakto")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True, extra="ignore")


class PaymentStatusResponse(BaseModel):
    """Response for status-check endpoints."""
    payment_id: str = Field(..., validation_alias="id")
    status: PaymentStatus
    amount: Decimal
    currency: str
    payment_method: PaymentMethod
    plan_id: str
    mp_payment_id: Optional[str] = None
    mp_preference_id: Optional[str] = None
    cakto_payment_id: Optional[str] = None
    cakto_preference_id: Optional[str] = None
    plan_type: Optional[str] = None
    created_at: Optional[datetime]
    paid_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True, populate_by_name=True, extra="ignore")


class WebhookNotification(BaseModel):
    """Payload received from payment gateway webhook."""
    action: str = Field(..., description="Tipo de acao (e.g. 'payment.created', 'payment.updated').")
    data: dict = Field(..., description="Objeto data contendo o resource ID.")
    id: Optional[str] = Field(default=None, description="ID unico da notificacao.")
    type: str = Field(..., description="Tipo de recurso (e.g. 'payment', 'merchant_order').")
    user_id: Optional[str] = Field(default=None)
    model_config = {"extra": "ignore"}


class PaymentWebhookResponse(BaseModel):
    """Response sent back to payment gateway after processing the webhook."""
    status: str = Field(default="ok")
    payment_id: Optional[str] = Field(default=None, description="ID interno do pagamento atualizado, se aplicavel.")
    message: Optional[str] = Field(default=None)
