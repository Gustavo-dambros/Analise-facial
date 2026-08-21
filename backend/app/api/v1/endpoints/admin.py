from fastapi import APIRouter, Depends, Request, status, Query
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, cast, Date
from sqlalchemy.orm import selectinload
from app.database.connection import get_db
from app.schemas.admin import (
    AdminKPIsResponse,
    RevenueChartResponse,
    UserGrowthChartResponse,
    ShippingStatusChartResponse,
    AdminOrdersResponse,
    AdminUsersResponse,
    OrderItemResponse,
    RecentUserResponse,
    AdminFinancialLogsResponse,
    AdminDashboardParams,
    PeriodType,
    ChartDataPoint,
    FinancialLogResponse,
)
from app.models.user import User
from app.models.analysis import FacialAnalysis, Order, FinancialLog, Shipping, OrderStatus, ShippingStatus
from app.core.security import get_current_user, require_role
from app.core.config import settings
from datetime import datetime, timedelta, date, timezone
from decimal import Decimal
from typing import Optional
from sqlalchemy import inspect as sqla_inspect

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)


def get_period_dates(period: PeriodType, start_date: Optional[datetime], end_date: Optional[datetime]):
    now = datetime.now(timezone.utc)
    if period == PeriodType.today:
        start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        end = now.replace(hour=23, minute=59, second=59, microsecond=999999)
    elif period == PeriodType.last_7_days:
        start = (now - timedelta(days=7)).replace(hour=0, minute=0, second=0, microsecond=0)
        end = now
    elif period == PeriodType.this_month:
        start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        end = now
    elif period == PeriodType.last_month:
        first_this_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        end = first_this_month - timedelta(seconds=1)
        start = end.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    else:  # custom
        start = start_date or (now - timedelta(days=30))
        end = end_date or now
    return start, end


def _format_date_column(db: AsyncSession, column, group_format: str):
    """Generate a date-grouping expression compatible with SQLite and PostgreSQL.

    SQLite uses strftime; PostgreSQL uses to_char with different format specifiers.
    """
    dialect_name = "sqlite"
    if db.bind is not None:
        try:
            dialect_name = sqla_inspect(db.bind).dialect.name
        except Exception:
            dialect_name = "sqlite"
    if dialect_name == "postgresql":
        pg_fmt = group_format.replace("%Y", "YYYY").replace("%m", "MM").replace("%d", "DD")
        return func.to_char(column, pg_fmt)
    # SQLite / default
    return func.strftime(group_format, column)


@router.get("/kpis", response_model=AdminKPIsResponse)
@limiter.limit(settings.RATE_LIMIT_GENERAL)
async def get_admin_kpis(
    request: Request,
    period: PeriodType = Query(PeriodType.this_month),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    current_user: User = Depends(require_role(["admin"])),
    db: AsyncSession = Depends(get_db),
):
    start, end = get_period_dates(period, start_date, end_date)

    # Total users
    total_users_result = await db.execute(select(func.count(User.id)))
    total_users = total_users_result.scalar() or 0

    # Active users
    active_users_result = await db.execute(select(func.count(User.id)).where(User.is_active == True))
    active_users = active_users_result.scalar() or 0

    # Revenue queries
    revenue_query = select(func.coalesce(func.sum(Order.amount), 0)).where(
        and_(
            Order.status == OrderStatus.paid,
            Order.paid_at >= start,
            Order.paid_at <= end,
        )
    )
    total_revenue_result = await db.execute(revenue_query)
    total_revenue = total_revenue_result.scalar() or Decimal("0")

    # Today revenue
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = datetime.now(timezone.utc).replace(hour=23, minute=59, second=59, microsecond=999999)
    today_revenue_query = select(func.coalesce(func.sum(Order.amount), 0)).where(
        and_(
            Order.status == OrderStatus.paid,
            Order.paid_at >= today_start,
            Order.paid_at <= today_end,
        )
    )
    today_revenue_result = await db.execute(today_revenue_query)
    revenue_today = today_revenue_result.scalar() or Decimal("0")

    # Last 7 days revenue
    last_7_start = (datetime.now(timezone.utc) - timedelta(days=7)).replace(hour=0, minute=0, second=0, microsecond=0)
    last_7_revenue_query = select(func.coalesce(func.sum(Order.amount), 0)).where(
        and_(
            Order.status == OrderStatus.paid,
            Order.paid_at >= last_7_start,
            Order.paid_at <= datetime.now(timezone.utc),
        )
    )
    last_7_revenue_result = await db.execute(last_7_revenue_query)
    revenue_last_7_days = last_7_revenue_result.scalar() or Decimal("0")

    # This month revenue
    this_month_start = datetime.now(timezone.utc).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    this_month_revenue_query = select(func.coalesce(func.sum(Order.amount), 0)).where(
        and_(
            Order.status == OrderStatus.paid,
            Order.paid_at >= this_month_start,
            Order.paid_at <= datetime.now(timezone.utc),
        )
    )
    this_month_revenue_result = await db.execute(this_month_revenue_query)
    revenue_this_month = this_month_revenue_result.scalar() or Decimal("0")

    # Orders counts
    total_orders_result = await db.execute(select(func.count(Order.id)))
    total_orders = total_orders_result.scalar() or 0

    pending_orders_result = await db.execute(
        select(func.count(Order.id)).where(Order.status == OrderStatus.pending)
    )
    pending_orders = pending_orders_result.scalar() or 0

    # Shipping counts
    shipped_orders_result = await db.execute(
        select(func.count(Shipping.id)).where(Shipping.status == ShippingStatus.in_transit)
    )
    shipped_orders = shipped_orders_result.scalar() or 0

    delivered_orders_result = await db.execute(
        select(func.count(Shipping.id)).where(Shipping.status == ShippingStatus.delivered)
    )
    delivered_orders = delivered_orders_result.scalar() or 0

    return AdminKPIsResponse(
        total_users=total_users,
        active_users=active_users,
        total_revenue=total_revenue,
        revenue_today=revenue_today,
        revenue_last_7_days=revenue_last_7_days,
        revenue_this_month=revenue_this_month,
        pending_orders=pending_orders,
        shipped_orders=shipped_orders,
        delivered_orders=delivered_orders,
        total_orders=total_orders,
    )


@router.get("/charts/revenue", response_model=RevenueChartResponse)
@limiter.limit(settings.RATE_LIMIT_GENERAL)
async def get_revenue_chart(
    request: Request,
    period: PeriodType = Query(PeriodType.this_month),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    current_user: User = Depends(require_role(["admin"])),
    db: AsyncSession = Depends(get_db),
):
    start, end = get_period_dates(period, start_date, end_date)

    # Group by day
    days_diff = (end - start).days
    if days_diff <= 7:
        group_format = "%Y-%m-%d"
    elif days_diff <= 31:
        group_format = "%Y-%m-%d"
    else:
        group_format = "%Y-%m"

    query = (
        select(
            _format_date_column(db, Order.paid_at, group_format).label("period"),
            func.coalesce(func.sum(Order.amount), 0).label("total"),
        )
        .where(
            and_(
                Order.status == OrderStatus.paid,
                Order.paid_at >= start,
                Order.paid_at <= end,
            )
        )
        .group_by(_format_date_column(db, Order.paid_at, group_format))
        .order_by(_format_date_column(db, Order.paid_at, group_format))
    )

    result = await db.execute(query)
    rows = result.all()

    data = [
        ChartDataPoint(date=row.period, value=float(row.total or 0))
        for row in rows
    ]

    return RevenueChartResponse(data=data, period=period)


@router.get("/charts/users", response_model=UserGrowthChartResponse)
@limiter.limit(settings.RATE_LIMIT_GENERAL)
async def get_user_growth_chart(
    request: Request,
    period: PeriodType = Query(PeriodType.this_month),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    current_user: User = Depends(require_role(["admin"])),
    db: AsyncSession = Depends(get_db),
):
    start, end = get_period_dates(period, start_date, end_date)

    days_diff = (end - start).days
    if days_diff <= 7:
        group_format = "%Y-%m-%d"
    elif days_diff <= 31:
        group_format = "%Y-%m-%d"
    else:
        group_format = "%Y-%m"

    query = (
        select(
            _format_date_column(db, User.created_at, group_format).label("period"),
            func.count(User.id).label("count"),
        )
        .where(
            and_(
                User.created_at >= start,
                User.created_at <= end,
            )
        )
        .group_by(_format_date_column(db, User.created_at, group_format))
        .order_by(_format_date_column(db, User.created_at, group_format))
    )

    result = await db.execute(query)
    rows = result.all()

    data = [
        ChartDataPoint(date=row.period, value=float(row.count or 0))
        for row in rows
    ]

    return UserGrowthChartResponse(data=data, period=period)


@router.get("/charts/shipping", response_model=ShippingStatusChartResponse)
@limiter.limit(settings.RATE_LIMIT_GENERAL)
async def get_shipping_chart(
    request: Request,
    current_user: User = Depends(require_role(["admin"])),
    db: AsyncSession = Depends(get_db),
):
    pending_result = await db.execute(
        select(func.count(Shipping.id)).where(Shipping.status == ShippingStatus.pending)
    )
    in_transit_result = await db.execute(
        select(func.count(Shipping.id)).where(Shipping.status == ShippingStatus.in_transit)
    )
    delivered_result = await db.execute(
        select(func.count(Shipping.id)).where(Shipping.status == ShippingStatus.delivered)
    )
    failed_result = await db.execute(
        select(func.count(Shipping.id)).where(Shipping.status == ShippingStatus.failed)
    )

    return ShippingStatusChartResponse(
        pending=pending_result.scalar() or 0,
        in_transit=in_transit_result.scalar() or 0,
        delivered=delivered_result.scalar() or 0,
        failed=failed_result.scalar() or 0,
    )


@router.get("/orders", response_model=AdminOrdersResponse)
@limiter.limit(settings.RATE_LIMIT_GENERAL)
async def get_admin_orders(
    request: Request,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status_filter: Optional[str] = Query(None),
    current_user: User = Depends(require_role(["admin"])),
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(Order)
        .options(selectinload(Order.user), selectinload(Order.shipping))
        .order_by(Order.created_at.desc())
    )

    if status_filter:
        try:
            status_enum = OrderStatus(status_filter)
            query = query.where(Order.status == status_enum)
        except ValueError:
            pass

    # Count total
    count_query = select(func.count(Order.id))
    if status_filter:
        try:
            count_query = count_query.where(Order.status == OrderStatus(status_filter))
        except ValueError:
            pass
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Paginate
    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    orders = result.scalars().all()

    orders_data = []
    for order in orders:
        shipping_status = order.shipping.status if order.shipping else None
        tracking = order.shipping.tracking_code if order.shipping else None
        orders_data.append(
            OrderItemResponse(
                id=order.id,
                user_id=order.user_id,
                user_email=order.user.email if order.user else "N/A",
                user_name=order.user.full_name if order.user else None,
                amount=order.amount,
                currency=order.currency,
                status=order.status,
                payment_method=order.payment_method,
                description=order.description,
                created_at=order.created_at,
                paid_at=order.paid_at,
                shipping_status=shipping_status,
                tracking_code=tracking,
            )
        )

    return AdminOrdersResponse(
        orders=orders_data,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/users", response_model=AdminUsersResponse)
@limiter.limit(settings.RATE_LIMIT_GENERAL)
async def get_admin_users(
    request: Request,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(require_role(["admin"])),
    db: AsyncSession = Depends(get_db),
):
    # Count total
    total_result = await db.execute(select(func.count(User.id)))
    total = total_result.scalar() or 0

    # Paginate
    query = (
        select(User)
        .order_by(User.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    result = await db.execute(query)
    users = result.scalars().all()

    users_data = []
    for user in users:
        # Get order count and total spent
        orders_result = await db.execute(
            select(func.count(Order.id), func.coalesce(func.sum(Order.amount), 0)).where(
                and_(Order.user_id == user.id, Order.status == OrderStatus.paid)
            )
        )
        order_count, total_spent = orders_result.first() or (0, 0)

        users_data.append(
            RecentUserResponse(
                id=user.id,
                email=user.email,
                full_name=user.full_name,
                role=user.role,
                is_active=user.is_active,
                created_at=user.created_at,
                total_orders=order_count,
                total_spent=total_spent or Decimal("0"),
            )
        )

    return AdminUsersResponse(
        users=users_data,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/financial-logs", response_model=AdminFinancialLogsResponse)
@limiter.limit(settings.RATE_LIMIT_GENERAL)
async def get_financial_logs(
    request: Request,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    current_user: User = Depends(require_role(["admin"])),
    db: AsyncSession = Depends(get_db),
):
    # Count total
    total_result = await db.execute(select(func.count(FinancialLog.id)))
    total = total_result.scalar() or 0

    # Paginate
    query = (
        select(FinancialLog)
        .order_by(FinancialLog.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    result = await db.execute(query)
    logs = result.scalars().all()

    logs_data = [
        FinancialLogResponse(
            id=log.id,
            order_id=log.order_id,
            amount=log.amount,
            type=log.type,
            description=log.description,
            created_at=log.created_at,
        )
        for log in logs
    ]

    return AdminFinancialLogsResponse(
        logs=logs_data,
        total=total,
        page=page,
        page_size=page_size,
    )