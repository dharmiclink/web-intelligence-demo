import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture()
def client():
    with TestClient(app) as test_client:
        yield test_client


def test_health(client: TestClient):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_overview_has_kpis(client: TestClient):
    response = client.get("/stats/overview")
    assert response.status_code == 200
    payload = response.json()
    assert len(payload["kpis"]) == 5
    assert payload["recent_cases"]


def test_case_detail(client: TestClient):
    cases = client.get("/cases").json()
    response = client.get(f"/cases/{cases[0]['id']}")
    assert response.status_code == 200
    payload = response.json()
    assert "classification" in payload
    assert "malaysia_targeting" in payload
