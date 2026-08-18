import os
import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def client():
    """FastAPI TestClient with lifespan (startup/shutdown) enabled.

    Using the context-manager form ensures that the lifespan event
    in ``app.main`` — which calls ``Base.metadata.create_all`` — runs
    before the tests and disposes the engine afterwards.
    """
    from app.main import app

    with TestClient(app) as c:
        yield c

    # Clean up test database
    db_path = os.path.join(os.path.dirname(__file__), "facial_analysis.db")
    if os.path.exists(db_path):
        os.remove(db_path)
