"""
Unit tests for monthly analysis usage limits (PlanType-based quotas).

These tests verify that the backend correctly blocks users who exceed
their monthly analysis quota — never trusting the frontend.
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

from datetime import datetime, timezone, timedelta
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import HTTPException

from app.models.user import User, PlanType
from app.services.analysis_service import (
    AnalysisService,
    PLAN_MONTHLY_LIMITS,
)


def _make_user(plan: PlanType = PlanType.free, is_superuser: bool = False) -> User:
    """Create a lightweight mock User that satisfies the service checks."""
    user = MagicMock(spec=User)
    user.id = "test-user-id"
    user.email = "test@example.com"
    user.plan = plan
    user.is_superuser = is_superuser
    user.role = "client"
    return user


def _make_repo_mock(counts_by_month: dict | None = None):
    """Build a mock AnalysisRepository whose count_monthly_analyses returns a configurable value."""
    repo = MagicMock()
    counts_by_month = counts_by_month or {}

    async def fake_count(user_id: str) -> int:
        return counts_by_month.get(user_id, 0)

    repo.count_monthly_analyses = fake_count
    repo.create = AsyncMock(return_value=MagicMock(
        id="analysis-id",
        overall_score=75.0,
        confidence=0.9,
        harmony_score=75.0,
        symmetry_score=7.0,
        thirds_data=[],
        radar_data=[],
        highlights=["Good job"],
        categories=[],
        attractiveness=7,
        attributes_data={},
        photo_front_url=None,
        photo_right_url=None,
        photo_left_url=None,
        created_at=datetime.now(timezone.utc),
    ))
    return repo


@pytest.mark.asyncio
async def test_free_plan_allows_below_limit():
    """A free-plan user with 2 analyses should be allowed."""
    user = _make_user(plan=PlanType.free)
    service = AnalysisService(db=MagicMock())
    service.analysis_repo = _make_repo_mock(counts_by_month={"test-user-id": 2})

    # Should not raise
    await service.check_monthly_limit(user)


@pytest.mark.asyncio
async def test_free_plan_blocks_at_limit():
    """A free-plan user with 3 analyses (the limit) must get HTTP 403."""
    user = _make_user(plan=PlanType.free)
    service = AnalysisService(db=MagicMock())
    service.analysis_repo = _make_repo_mock(counts_by_month={"test-user-id": 3})

    with pytest.raises(HTTPException) as exc_info:
        await service.check_monthly_limit(user)

    assert exc_info.value.status_code == 403
    assert "Limite mensal" in exc_info.value.detail
    assert "Gratuito" in exc_info.value.detail


@pytest.mark.asyncio
async def test_pro_plan_blocks_at_limit():
    """A pro-plan user with 5 analyses (the limit) must get HTTP 403."""
    user = _make_user(plan=PlanType.pro)
    service = AnalysisService(db=MagicMock())
    service.analysis_repo = _make_repo_mock(counts_by_month={"test-user-id": 5})

    with pytest.raises(HTTPException) as exc_info:
        await service.check_monthly_limit(user)

    assert exc_info.value.status_code == 403
    assert "Profissional" in exc_info.value.detail


@pytest.mark.asyncio
async def test_pro_plan_allows_below_limit():
    """A pro-plan user with 4 analyses should be allowed (limit is 5)."""
    user = _make_user(plan=PlanType.pro)
    service = AnalysisService(db=MagicMock())
    service.analysis_repo = _make_repo_mock(counts_by_month={"test-user-id": 4})

    await service.check_monthly_limit(user)  # no exception


@pytest.mark.asyncio
async def test_enterprise_plan_unlimited():
    """Enterprise plan should never be blocked."""
    user = _make_user(plan=PlanType.enterprise)
    service = AnalysisService(db=MagicMock())

    # Even with a very high count, no exception
    service.analysis_repo = _make_repo_mock(counts_by_month={"test-user-id": 999})

    await service.check_monthly_limit(user)  # no exception


@pytest.mark.asyncio
async def test_superuser_bypasses_limit():
    """Superusers should bypass the limit entirely."""
    user = _make_user(plan=PlanType.free, is_superuser=True)
    service = AnalysisService(db=MagicMock())
    service.analysis_repo = _make_repo_mock(counts_by_month={"test-user-id": 999})

    await service.check_monthly_limit(user)  # no exception


@pytest.mark.asyncio
async def test_unknown_plan_defaults_to_free():
    """An unknown plan value should default to free limits (3)."""
    user = MagicMock(spec=User)
    user.id = "test-user-id"
    user.plan = "unknown_plan"  # not in PLAN_MONTHLY_LIMITS
    user.is_superuser = False

    service = AnalysisService(db=MagicMock())
    service.analysis_repo = _make_repo_mock(counts_by_month={"test-user-id": 3})

    with pytest.raises(HTTPException) as exc_info:
        await service.check_monthly_limit(user)

    assert exc_info.value.status_code == 403


def test_plan_limits_constants():
    """Verify the plan limit constants are defined correctly."""
    assert PLAN_MONTHLY_LIMITS[PlanType.free] == 3
    assert PLAN_MONTHLY_LIMITS[PlanType.pro] == 5
    assert PLAN_MONTHLY_LIMITS[PlanType.enterprise] == -1  # unlimited
