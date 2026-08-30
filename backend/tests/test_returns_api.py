"""
SignalX - Returns API Tests
"""

import pytest
from fastapi.testclient import TestClient
from backend.app.main import app


@pytest.fixture
def client():
    return TestClient(app)


def test_get_return_metrics(client):
    """GET /api/returns/metrics returns aggregate stats and chart data."""
    response = client.get("/api/returns/metrics")
    assert response.status_code == 200
    data = response.json()
    assert "total_returns" in data
    assert "total_refund_amount" in data
    assert "wardrobing_rate" in data
    assert "return_trend" in data
    assert "reasons_breakdown" in data
    assert "days_distribution" in data


def test_get_high_risk_abusers(client):
    """GET /api/returns/abusers returns customer abuse profiles."""
    response = client.get("/api/returns/abusers?limit=10")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    if len(data) > 0:
        abuser = data[0]
        assert "customer_id" in abuser
        assert "abuse_score" in abuser
        assert "risk_tier" in abuser
        assert "recommended_policy" in abuser


def test_list_returns(client):
    """GET /api/returns returns paginated return list with risk tiers."""
    response = client.get("/api/returns?page=1&page_size=10")
    assert response.status_code == 200
    data = response.json()
    assert "returns" in data
    assert "total" in data
    assert "page" in data


def test_score_return_request(client):
    """POST /api/returns/score evaluates return risk in real-time."""
    payload = {
        "customer_id": "cust_test_001",
        "refund_amount": 350.0,
        "days_after_purchase": 1,
        "reason": "changed_mind",
        "customer_return_rate": 0.65,
        "customer_total_orders": 8,
        "category": "designer_apparel",
    }
    response = client.post("/api/returns/score", json=payload)
    assert response.status_code == 200
    result = response.json()
    assert result["risk_tier"] in ["CRITICAL", "HIGH"]
    assert result["decision"] in ["DENY_RETURN", "STORE_CREDIT_ONLY"]
    assert len(result["risk_factors"]) > 0


def test_execute_return_action(client):
    """POST /api/returns/{id}/action records merchant action."""
    payload = {
        "action": "STORE_CREDIT_ONLY",
        "note": "Flagged due to fast wardrobing cycle.",
    }
    response = client.post("/api/returns/ret_000001/action", json=payload)
    assert response.status_code == 200
    result = response.json()
    assert result["status"] == "SUCCESS"
    assert result["return_id"] == "ret_000001"
