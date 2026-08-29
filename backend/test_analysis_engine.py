"""
Unit tests for the current analysis engine / scoring API.

These tests target the live state of ``app.services.analysis_service``
and ``app.schemas.analysis`` — the old landmark-based helper functions
(e.g. ``calcular_dip``, ``calcular_tercos``, ``zscore_to_score``) no
longer exist and have been replaced by an AI-driven pipeline.
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.main import app
from app.services.analysis_service import AnalysisService, PLAN_MONTHLY_LIMITS, SYSTEM_PROMPT
from app.schemas.analysis import (
    ATTRIBUTE_NAMES,
    attribute_score_to_label,
    compute_symmetry,
    compute_overall,
)
from app.models.profile import Profile, PlanType


# ---------------------------------------------------------------------------
# Helper: build a fake AI response dict that ``_map_to_response`` expects
# ---------------------------------------------------------------------------

def _fake_ai_result():
    return {
        "attractiveness": 8,
        "attributes": {name: 7 for name in ATTRIBUTE_NAMES},
        "thirds_data": [33.3, 33.3, 33.4],
        "highlights": ["High cheekbones", "Symmetrical eyes"],
        "visagismo_tips": {
            "formato_rosto": " oval",
            "cabelo": "Use volumes on sides",
            "barba": "N/A",
            "oculos": "N/A",
        },
    }


# ---------------------------------------------------------------------------
# Tests — Scoring helpers (app.schemas.analysis)
# ---------------------------------------------------------------------------

class TestAttributeScoreLabel:
    def test_label_ok(self):
        assert attribute_score_to_label(3) == "Ok"

    def test_label_bom(self):
        assert attribute_score_to_label(5) == "Bom"
        assert attribute_score_to_label(6) == "Bom"

    def test_label_otimo(self):
        assert attribute_score_to_label(7) == "Otimo"
        assert attribute_score_to_label(10) == "Otimo"


class TestComputeSymmetry:
    def test_symmetry_non_empty(self):
        attrs = {name: 7 for name in ATTRIBUTE_NAMES}
        score = compute_symmetry(attrs)
        assert score == 7.0

    def test_symmetry_empty(self):
        assert compute_symmetry({}) == 0.0


class TestComputeOverall:
    def test_overall_formula(self):
        # ((7.0 + 8) / 2) * 10 = 75.0
        result = compute_overall(7.0, 8)
        assert result == 75.0


# ---------------------------------------------------------------------------
# Tests — AnalysisService._map_to_response
# ---------------------------------------------------------------------------

class TestMapToResponse:
    def test_map_response_structure(self):
        service = AnalysisService(db=MagicMock())
        ai_result = _fake_ai_result()
        mapped = service._map_to_response(ai_result)

        assert mapped["overall_score"] == 75.0
        assert mapped["symmetry_score"] == 7.0
        assert mapped["attractiveness"] == 8
        assert len(mapped["thirds_data"]) == 3
        assert len(mapped["categories"]) == len(ATTRIBUTE_NAMES)
        assert len(mapped["radar_data"]) == len(ATTRIBUTE_NAMES)
        assert len(mapped["highlights"]) <= 4
        assert "visagismo_tips" in mapped

    def test_map_response_defaults_missing_fields(self):
        service = AnalysisService(db=MagicMock())
        # Minimal dict — missing many keys
        mapped = service._map_to_response({})
        assert 0 <= mapped["overall_score"] <= 100
        assert mapped["attractiveness"] == 5
        assert len(mapped["categories"]) == len(ATTRIBUTE_NAMES)
        assert "Analise facial completa" in mapped["highlights"]


# ---------------------------------------------------------------------------
# Tests — PLAN_MONTHLY_LIMITS constants
# ---------------------------------------------------------------------------

class TestPlanLimits:
    def test_limits_defined(self):
        assert PLAN_MONTHLY_LIMITS[PlanType.free] == 3
        assert PLAN_MONTHLY_LIMITS[PlanType.pro] == 5
        assert PLAN_MONTHLY_LIMITS[PlanType.enterprise] == -1


# ---------------------------------------------------------------------------
# Tests — System prompt presence
# ---------------------------------------------------------------------------

class TestSystemPrompt:
    def test_system_prompt_exists(self):
        assert isinstance(SYSTEM_PROMPT, str)
        assert len(SYSTEM_PROMPT) > 100

    def test_system_prompt_contains_error_format(self):
        assert "error" in SYSTEM_PROMPT
        assert "No human face detected" in SYSTEM_PROMPT


# ---------------------------------------------------------------------------
# Tests — Health check (integration via FastAPI TestClient)
# ---------------------------------------------------------------------------

class TestHealthCheck:
    def test_health_endpoint(self):
        with TestClient(app) as client:
            response = client.get("/api/v1/health")
            assert response.status_code == 200


# ---------------------------------------------------------------------------
# Tests — check_monthly_limit permission fix
# ---------------------------------------------------------------------------

class TestMonthlyLimitPermission:
    @pytest.mark.asyncio
    async def test_admin_role_bypasses_limit(self):
        """A user with role='admin' should bypass the monthly limit."""
        user = MagicMock(spec=Profile)
        user.id = "admin-user-id"
        user.email = "admin@example.com"
        user.plan = PlanType.free
        user.is_superuser = False
        user.role = "admin"

        service = AnalysisService(db=MagicMock())

        async def fake_count(user_id: str) -> int:
            return 999

        service.analysis_repo = MagicMock()
        service.analysis_repo.count_monthly_analyses = fake_count

        # Should not raise — admin bypasses the limit
        await service.check_monthly_limit(user)

    @pytest.mark.asyncio
    async def test_superuser_bypasses_limit(self):
        """A superuser should bypass the monthly limit."""
        user = MagicMock(spec=Profile)
        user.id = "superuser-id"
        user.email = "super@example.com"
        user.plan = PlanType.free
        user.is_superless = False
        user.is_superuser = True
        user.role = "client"

        service = AnalysisService(db=MagicMock())

        async def fake_count(user_id: str) -> int:
            return 999

        service.analysis_repo = MagicMock()
        service.analysis_repo.count_monthly_analyses = fake_count

        await service.check_monthly_limit(user)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
