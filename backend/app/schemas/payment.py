from datetime import datetime
from typing import Optional, Literal
from decimal import Decimal
from pydantic import BaseModel, Field, PositiveInt, condecimal
from app.models.payment import PaymentStatus, PaymentMethod


class PaymentCreateRequest(BaseModel):
    """Payload for POST /payments/create."""
    plan_id: str = Field(..., description="Identificador do plano selecionado (e.g. 'plan_monthly', 'plan_annual').")
    payment_method: Literal["pix", "credit_card"] = Field(default="pix", description="Método de pagamento desejado.")
    success_url: str = Field(..., min_length=1, max_length=2048, description="URL para redirecionamento após pagamento aprovado.")
    pending_url: str = Field(..., min_length=1, max_length=2048, description="URL para redirecionamento enquanto pagamento está pendente.")
    auto_approve: bool = Field(default=False, description="Se True e método for PIX, simula aprovação imediata (modo dev/testing).")


class PaymentCreateResponse(BaseModel):
    """Response returned by POST /payments/create."""
    payment_id: str = Field(..., description="ID interno do registro de pagamento no Supabase/FastAPI DB.")
    payment_method: PaymentMethod
    status: PaymentStatus
    amount: Decimal
    currency: str
    qr_code: Optional[str] = Field(default=None, description="QR Code textual (copia-e-cola) para PIX.")
    qr_code_base64: Optional[str] = Field(default=None, description="Imagem base64 do QR Code para PIX.")
    ticket_url: Optional[str] = Field(default=None, description="URL do boleto ou tela de pagamento PIX.")
    preference_id: Optional[str] = Field(default=None, description="ID da preferência MP")
    init_point: Optional[str] = Field(default=None, description="Link de checkout MP (sandbox_init_point em TEST)")

    model_config = {"extra": "ignore"}


class PaymentStatusResponse(BaseModel):
    """Response for status-check endpoints."""
    payment_id: str
    status: PaymentStatus
    amount: Decimal
    currency: str
    payment_method: PaymentMethod
    plan_id: str
    mp_payment_id: Optional[str] = None
    mp_preference_id: Optional[str] = None
    plan_type: Optional[str] = None
    created_at: Optional[datetime]
    paid_at: Optional[datetime]

    model_config = {"extra": "ignore"}


class WebhookNotification(BaseModel):
    """Payload received from payment gateway webhook."""

    action: str = Field(..., description="Tipo de ação (e.g. 'payment.created', 'payment.updated').")
    data: dict = Field(..., description="Objeto data contendo o resource ID.")
    id: Optional[str] = Field(default=None, description="ID único da notificação.")
    type: str = Field(..., description="Tipo de recurso (e.g. 'payment', 'merchant_order').")
    user_id: Optional[str] = Field(default=None)

    model_config = {"extra": "ignore"}


class PaymentWebhookResponse(BaseModel):
    """Response sent back to payment gateway after processing the webhook."""
    status: str = Field(default="ok")
    payment_id: Optional[str] = Field(default=None, description="ID interno do pagamento atualizado, se aplicável.")
    message: Optional[str] = Field(default=None)