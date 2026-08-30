"""
SignalX - Review Queue API Tests
"""

import pytest
from fastapi.testclient import TestClient
from backend.app.main import app


@pytest.fixture
def client():
    return TestClient(app)


def test_get_review_metrics(client):
    """GET /api/reviews/metrics returns review KPIs and analyst productivity."""
    response = client.get("/api/reviews/metrics")
    assert response.status_code == 200
    data = response.json()
    assert "total_pending_reviews" in data
    assert "urgent_sla_count" in data
    assert "resolved_today" in data
    assert "average_review_time_seconds" in data
    assert "decision_breakdown" in data
    assert "analysts" in data


def test_get_review_queue(client):
    """GET /api/reviews/queue returns paginated queue items with SLA timers."""
    response = client.get("/api/reviews/queue?page=1&page_size=10")
    assert response.status_code == 200
    data = response.json()
    assert "cases" in data
    assert "total" in data
    assert len(data["cases"]) > 0


def test_get_case_detail(client):
    """GET /api/reviews/{id} returns case details and SHAP factors."""
    response = client.get("/api/reviews/CASE-90214")
    assert response.status_code == 200
    case = response.json()
    assert case["case_id"] == "CASE-90214"
    assert "shap_factors" in case


def test_disposition_case(client):
    """POST /api/reviews/{id}/disposition records analyst action."""
    payload = {
        "action": "APPROVE",
        "analyst": "MA RIZWAN",
        "note": "Verified customer identity via biometric challenge.",
        "tags": ["travel_exception", "vip_customer"],
    }
    response = client.post("/api/reviews/CASE-90214/disposition", json=payload)
    assert response.status_code == 200
    result = response.json()
    assert result["status"] == "RESOLVED"
    assert result["action"] == "APPROVE"


def test_batch_disposition(client):
    """POST /api/reviews/batch-disposition processes multiple cases."""
    payload = {
        "case_ids": ["CASE-90215", "CASE-90216"],
        "action": "BLOCK_FRAUD",
        "analyst": "Alex Chen",
        "note": "Batch block confirmed syndicate accounts.",
    }
    response = client.post("/api/reviews/batch-disposition", json=payload)
    assert response.status_code == 200
    result = response.json()
    assert result["processed_count"] == 2
