"""
SignalX - Chargebacks API Tests
"""

import pytest
from fastapi.testclient import TestClient
from backend.app.main import app


@pytest.fixture
def client():
    return TestClient(app)


def test_get_chargeback_metrics(client):
    """GET /api/chargebacks/metrics returns KPIs and chart data."""
    response = client.get("/api/chargebacks/metrics")
    assert response.status_code == 200
    data = response.json()
    assert "total_disputes" in data
    assert "total_disputed_volume" in data
    assert "win_rate" in data
    assert "chargeback_rate" in data
    assert "dispute_trend" in data
    assert "reasons_breakdown" in data
    assert "card_scheme_distribution" in data


def test_list_chargebacks(client):
    """GET /api/chargebacks returns paginated dispute list."""
    response = client.get("/api/chargebacks?page=1&page_size=10")
    assert response.status_code == 200
    data = response.json()
    assert "chargebacks" in data
    assert "total" in data
    assert "page" in data


def test_generate_defense_package(client):
    """POST /api/chargebacks/defend compiles CE 3.0 rebuttal pack."""
    payload = {
        "transaction_id": "txn_0000145",
        "customer_id": "cust_002899",
        "reason": "unauthorized_transaction",
        "dispute_amount": 290.0,
        "carrier": "FedEx",
        "tracking_number": "FX-982341239841",
    }
    response = client.post("/api/chargebacks/defend", json=payload)
    assert response.status_code == 200
    result = response.json()
    assert "win_probability" in result
    assert result["win_probability"] > 0.5
    assert len(result["evidence_items"]) > 0
    assert "legal_rebuttal_letter" in result


def test_execute_chargeback_action(client):
    """POST /api/chargebacks/{id}/action records representment action."""
    payload = {
        "action": "SUBMIT_REPRESENTMENT",
        "note": "Enclosed signed carrier POD and 3 prior purchase matches.",
    }
    response = client.post("/api/chargebacks/cb_000000/action", json=payload)
    assert response.status_code == 200
    result = response.json()
    assert result["status"] == "SUCCESS"
    assert result["chargeback_id"] == "cb_000000"
