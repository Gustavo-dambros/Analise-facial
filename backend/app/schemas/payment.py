from datetime import datetime
from typing import Optional, Literal
from decimal import Decimal
from pydantic import BaseModel, Field, PositiveInt, condecimal
from app.models.payment import PaymentStatus, PaymentMethod


class PaymentCreateRequest(BaseModel):
    """Payload for POST /payments/create."""
    plan_id: str = Field(..., description="Identificador do plano selecionado (e.g. 'plan_monthly', 'plan_annual').")
    amount: condecimal(gt=Decimal("0.01"), max_digits=10, decimal_places=2) = Field(..., description="Valor em BRL (centavos opcional).")
    payment_method: Literal["pix", "credit_card"] = Field(default="pix", description="Método de pagamento desejado.")
    success_url: str = Field(..., min_length=1, max_length=2048, description="URL para redirecionamento após pagamento aprovado.")
    pending_url: str = Field(..., min_length=1, max_length=2048, description="URL para redirecionamento enquanto pagamento está pendente.")
    auto_approve: bool = Field(default=False, description="Se True e método for PIX, simula aprovação imediata (modo dev/testing).")


class PaymentCreateResponse(BaseModel):
    """Response returned by POST /payments/create."""
    payment_id: str = Field(..., description="ID interno do registro de pagamento no Supabase/FastAPI DB.")
    preference_id: Optional[str] = Field(default=None, description="ID da preferência de checkout no Mercado Pago.")
    init_point: Optional[str] = Field(default=None, description="URL de redirecionamento para Checkout Pro.")
    payment_method: PaymentMethod
    status: PaymentStatus
    amount: Decimal
    currency: str
    qr_code: Optional[str] = Field(default=None, description="QR Code textual (copia-e-cola) para PIX.")
    qr_code_base64: Optional[str] = Field(default=None, description="Imagem base64 do QR Code para PIX.")
    ticket_url: Optional[str] = Field(default=None, description="URL do boleto ou tela de pagamento PIX.")


class PaymentStatusResponse(BaseModel):
    """Response for status-check endpoints."""
    payment_id: str
    status: PaymentStatus
    mercado_pago_payment_id: Optional[str]
    amount: Decimal
    currency: str
    payment_method: PaymentMethod
    plan_id: str
    created_at: Optional[datetime]
    paid_at: Optional[datetime]
    init_point: Optional[str] = None
    qr_code: Optional[str] = None
    qr_code_base64: Optional[str] = None
    ticket_url: Optional[str] = None


class WebhookNotification(BaseModel):
    """Payload received from Mercado Pago IPN/webhook."""
    action: str = Field(..., description="Tipo de ação (e.g. 'payment.created', 'payment.updated').")
    api_version: Optional[str] = Field(default=None, alias="api_version")
    data: dict = Field(..., description="Objeto data contendo o resource ID.")
    date_created: Optional[str] = Field(default=None)
    id: Optional[str] = Field(default=None, description="ID único da notificação.")
    live_mode: Optional[bool] = Field(default=None)
    type: str = Field(..., description="Tipo de recurso (e.g. 'payment', 'merchant_order', 'subscription').")
    user_id: Optional[str] = Field(default=None)

    model_config = {"extra": "ignore"}


class PaymentWebhookResponse(BaseModel):
    """Response sent back to Mercado Pago after processing the webhook."""
    status: str = Field(default="ok")
    payment_id: Optional[str] = Field(default=None, description="ID interno do pagamento atualizado, se aplicável.")
    message: Optional[str] = Field(default=None)
