"""
SignalX - Evidence API Tests
"""

import pytest
from fastapi.testclient import TestClient
from backend.app.main import app


@pytest.fixture
def client():
    return TestClient(app)


def test_get_evidence_metrics(client):
    """GET /api/evidence/metrics returns retrieval stats and source health."""
    response = client.get("/api/evidence/metrics")
    assert response.status_code == 200
    data = response.json()
    assert "total_dossiers_generated" in data
    assert "sources_health" in data
    assert "source_citation_accuracy" in data
    assert len(data["sources_health"]) == 6


def test_list_evidence_packages(client):
    """GET /api/evidence/packages returns paginated packages."""
    response = client.get("/api/evidence/packages?page=1&page_size=10")
    assert response.status_code == 200
    data = response.json()
    assert "packages" in data
    assert "total" in data
    assert len(data["packages"]) > 0


def test_generate_evidence_dossier(client):
    """POST /api/evidence/generate compiles 6-layer source-backed dossier."""
    payload = {
        "transaction_id": "txn_0000145",
        "customer_id": "cust_002899",
        "dispute_reason": "unauthorized_transaction",
        "amount": 345.0,
        "target_scheme": "VISA_VROL",
        "carrier": "FedEx",
        "tracking_number": "FX-983419203982",
    }
    response = client.post("/api/evidence/generate", json=payload)
    assert response.status_code == 200
    result = response.json()
    assert "id" in result
    assert "sources" in result
    assert len(result["sources"]) == 6
    assert result["confidence_score"] > 0.90
    assert "legal_narrative" in result


def test_export_evidence_package(client):
    """POST /api/evidence/packages/{id}/export returns status."""
    payload = {
        "format": "MARKDOWN",
        "auto_dispatch": True,
    }
    response = client.post("/api/evidence/packages/DOSSIER-884192/export", json=payload)
    assert response.status_code == 200
    result = response.json()
    assert result["status"] == "DISPATCHED"
