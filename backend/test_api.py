import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

from fastapi.testclient import TestClient


def test_health_endpoint(client):
    """Test that the health endpoint responds correctly."""
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_register_endpoint(client):
    """Test user registration."""
    import time
    email = f"test_{int(time.time())}@test.com"
    response = client.post("/api/v1/auth/register", json={
        "email": email,
        "password": "TestPass123",
        "full_name": "Test User",
    })
    assert response.status_code == 201
    data = response.json()
    assert "message" in data
    assert data["requires_verification"] is True


def test_calculate_metrics_no_auth(client):
    """Test that calculate-metrics requires authentication."""
    response = client.post(
        "/api/v1/analysis/calculate-metrics",
        json={
            "trichion": {"x": 100, "y": 50},
            "glabella": {"x": 100, "y": 100},
            "subnasale_front": {"x": 100, "y": 150},
            "menton_front": {"x": 100, "y": 200},
            "subnasale_profile": {"x": 100, "y": 150},
            "pranasale": {"x": 120, "y": 160},
            "labiale_superius": {"x": 110, "y": 170},
            "labiale_inferius": {"x": 110, "y": 180},
            "menton_profile": {"x": 100, "y": 200},
        },
    )
    assert response.status_code == 401
