from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime
from decimal import Decimal
from enum import Enum


class OrderStatus(str, Enum):
    pending = "pending"
    paid = "paid"
    cancelled = "cancelled"
    refunded = "refunded"


class ShippingStatus(str, Enum):
    pending = "pending"
    in_transit = "in_transit"
    delivered = "delivered"
    failed = "failed"


class PeriodType(str, Enum):
    today = "today"
    last_7_days = "last_7_days"
    this_month = "this_month"
    last_month = "last_month"
    custom = "custom"


# --- KPIs / Cards ---
class AdminKPIsResponse(BaseModel):
    total_users: int
    active_users: int
    total_revenue: Decimal
    revenue_today: Decimal
    revenue_last_7_days: Decimal
    revenue_this_month: Decimal
    pending_orders: int
    shipped_orders: int
    delivered_orders: int
    total_orders: int


# --- Charts ---
class ChartDataPoint(BaseModel):
    date: str
    value: float
    label: Optional[str] = None


class RevenueChartResponse(BaseModel):
    data: List[ChartDataPoint]
    period: PeriodType


class UserGrowthChartResponse(BaseModel):
    data: List[ChartDataPoint]
    period: PeriodType


class ShippingStatusChartResponse(BaseModel):
    pending: int
    in_transit: int
    delivered: int
    failed: int


# --- Orders & Users Table ---
class OrderItemResponse(BaseModel):
    id: str
    user_id: str
    user_email: str
    user_name: Optional[str]
    amount: Decimal
    currency: str
    status: OrderStatus
    payment_method: Optional[str]
    description: Optional[str]
    created_at: datetime
    paid_at: Optional[datetime]
    shipping_status: Optional[ShippingStatus] = None
    tracking_code: Optional[str] = None


class AdminOrdersResponse(BaseModel):
    orders: List[OrderItemResponse]
    total: int
    page: int
    page_size: int


class RecentUserResponse(BaseModel):
    id: str
    email: str
    full_name: Optional[str]
    role: str
    is_active: bool
    created_at: datetime
    total_orders: int
    total_spent: Decimal


class AdminUsersResponse(BaseModel):
    users: List[RecentUserResponse]
    total: int
    page: int
    page_size: int


# --- Request params ---
class AdminDashboardParams(BaseModel):
    period: PeriodType = PeriodType.this_month
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    page: int = 1
    page_size: int = 20
    status_filter: Optional[str] = None


# --- Financial Logs ---
class FinancialLogResponse(BaseModel):
    id: str
    order_id: str
    amount: Decimal
    type: str
    description: Optional[str]
    created_at: datetime


class AdminFinancialLogsResponse(BaseModel):
    logs: List[FinancialLogResponse]
    total: int
    page: int
    page_size: int