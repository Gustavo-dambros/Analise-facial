"""
E2E edge cases for Cakto webhook — idempotência, HMAC, replay, cota 1/2/4/6.
Requer Supabase (DATABASE_URL) e backend rodando. Usa DB real com limpeza.
Execute: DEBUG=true pytest test_cakto_e2e_edge_cases.py -v
"""
import hmac
import hashlib
import json
import time
import uuid
import asyncio
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "app"))

import pytest
pytestmark = pytest.mark.asyncio(loop_scope="session")
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.core.config import settings
from app.services.analysis_service import PLAN_MONTHLY_LIMITS
from app.database.connection import AsyncSessionLocal
from app.models.profile import Profile
from app.models.payment import Payment, PaymentStatus, PaymentMethod
from sqlalchemy import text

# ——— Config de teste ———
TEST_SECRET = "test_secret_e2e_pytest_12345"
ORIG_SECRET = settings.CAKTO_WEBHOOK_SECRET

PLANS_TO_TEST = [
    ("plan_avulsa", 1),
    ("plan_monthly", 2),
    ("plan_annual", 4),
    ("plan_black", 6),
]

def make_cakto_headers(payload_bytes: bytes, secret: str, timestamp: int = None) -> dict:
    if timestamp is None:
        timestamp = int(time.time())
    msg = f"{timestamp}.".encode("utf-8") + payload_bytes
    sig = hmac.new(secret.encode("utf-8"), msg, hashlib.sha256).hexdigest()
    return {
        "Content-Type": "application/json",
        "X-Cakto-Timestamp": str(timestamp),
        "X-Cakto-Signature": f"v1={sig}",
    }

@pytest.fixture(autouse=True)
def _set_test_secret():
    settings.CAKTO_WEBHOOK_SECRET = TEST_SECRET
    yield
    settings.CAKTO_WEBHOOK_SECRET = ORIG_SECRET

async def _create_user_and_pending(plan_id: str):
    uid = str(uuid.uuid4())
    async with AsyncSessionLocal() as db:
        p = Profile(id=uid, email=f"pytest_{uid[:8]}@test.com", full_name="Pytest", plan="free", role="client")
        db.add(p)
        await db.commit()
        await db.refresh(p)
        pay = Payment(
            id=str(uuid.uuid4()), user_id=uid, amount=20.0, currency="BRL",
            status=PaymentStatus.pending, payment_method=PaymentMethod.cakto,
            plan_id=plan_id, plan_type="pro"
        )
        db.add(pay)
        await db.commit()
        await db.refresh(pay)
        return uid, pay.id

async def _get_profile_plan(uid: str) -> str:
    async with AsyncSessionLocal() as db:
        r = await db.execute(text("SELECT plan FROM profiles WHERE id=:uid"), {"uid": uid})
        return r.scalar()

async def _get_payment_status(uid: str):
    async with AsyncSessionLocal() as db:
        r = await db.execute(text("SELECT status, paid_at FROM payments WHERE user_id=:uid ORDER BY created_at DESC LIMIT 1"), {"uid": uid})
        row = r.fetchone()
        return (row[0], row[1]) if row else (None, None)

async def _cleanup(uid: str):
    async with AsyncSessionLocal() as db:
        await db.execute(text("DELETE FROM payments WHERE user_id=:uid"), {"uid": uid})
        await db.execute(text("DELETE FROM profiles WHERE id=:uid"), {"uid": uid})
        await db.commit()

@pytest.mark.parametrize("plan_id,expected_limit", PLANS_TO_TEST)
@pytest.mark.asyncio
async def test_webhook_unlock_and_quota_for_all_plans(plan_id, expected_limit):
    """Desbloqueio + cota 1/2/4/6 para os 4 tiers."""
    uid, pid = await _create_user_and_pending(plan_id)
    try:
        payload = {
            "event": "purchase_approved",
            "data": {"id": f"pay_test_{plan_id}_{uuid.uuid4().hex[:6]}", "status": "paid",
                     "metadata": {"user_id": uid, "plan_id": plan_id}}
        }
        body = json.dumps(payload, separators=(",", ":")).encode()
        headers = make_cakto_headers(body, TEST_SECRET)

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post("/api/v1/payments/webhook/cakto", content=body, headers=headers)
            assert response.status_code in (200, 204), f"status {response.status_code} body {response.text}"

        # Poll até 5s (background task é async)
        plan_after = None
        for _ in range(10):
            await asyncio.sleep(0.6)
            plan_after = await _get_profile_plan(uid)
            if plan_after == plan_id:
                break
        status_after, paid_at = await _get_payment_status(uid)

        assert plan_after == plan_id, f"profile plan {plan_after} != {plan_id} (expected {plan_id})"
        assert status_after == "approved", f"payment status {status_after} != approved"
        assert paid_at is not None
        assert PLAN_MONTHLY_LIMITS.get(plan_after) == expected_limit
    finally:
        await asyncio.sleep(0.3)
        await _cleanup(uid)

@pytest.mark.asyncio
async def test_webhook_invalid_hmac_signature():
    """Rejeita HMAC forjado com 401/403."""
    uid, _ = await _create_user_and_pending("plan_monthly")
    try:
        payload = {"event": "purchase_approved", "data": {"id": "pay_fake", "status": "paid", "metadata": {"user_id": uid, "plan_id": "plan_monthly"}}}
        body = json.dumps(payload, separators=(",", ":")).encode()
        headers = make_cakto_headers(body, "SECRET_CHAVE_INVALIDA")
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post("/api/v1/payments/webhook/cakto", content=body, headers=headers)
        assert response.status_code in (401, 403), f"deveria rejeitar, got {response.status_code}"
    finally:
        await _cleanup(uid)

@pytest.mark.asyncio
async def test_webhook_idempotency_duplicate_events():
    """Mesmo payload 2x → 204 nas duas, sem erro 500 e sem duplicar."""
    uid, _ = await _create_user_and_pending("plan_monthly")
    try:
        payload = {
            "event": "purchase_approved",
            "data": {"id": "pay_test_dup_999", "status": "paid",
                     "metadata": {"user_id": uid, "plan_id": "plan_monthly"}}
        }
        body = json.dumps(payload, separators=(",", ":")).encode()
        headers = make_cakto_headers(body, TEST_SECRET)

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            res1 = await client.post("/api/v1/payments/webhook/cakto", content=body, headers=headers)
            assert res1.status_code in (200, 204)
            await asyncio.sleep(1.2)
            res2 = await client.post("/api/v1/payments/webhook/cakto", content=body, headers=headers)
            if res2.status_code == 403:
                headers2 = make_cakto_headers(body, TEST_SECRET)
                res2 = await client.post("/api/v1/payments/webhook/cakto", content=body, headers=headers2)
            assert res2.status_code in (200, 204)

        await asyncio.sleep(0.5)
        async with AsyncSessionLocal() as db:
            r = await db.execute(text("SELECT count(*) FROM payments WHERE user_id=:uid AND status='approved'"), {"uid": uid})
            assert r.scalar() == 1
    finally:
        await _cleanup(uid)

@pytest.mark.asyncio
async def test_webhook_replay_protection_stale_timestamp():
    """Timestamp >300s deve ser rejeitado (403)."""
    uid, _ = await _create_user_and_pending("plan_monthly")
    try:
        payload = {"event": "purchase_approved", "data": {"id": "pay_replay", "status": "paid", "metadata": {"user_id": uid, "plan_id": "plan_monthly"}}}
        body = json.dumps(payload, separators=(",", ":")).encode()
        stale_ts = int(time.time()) - 600
        headers = make_cakto_headers(body, TEST_SECRET, timestamp=stale_ts)
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post("/api/v1/payments/webhook/cakto", content=body, headers=headers)
        assert response.status_code in (401, 403)
    finally:
        await _cleanup(uid)
