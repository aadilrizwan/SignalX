"""
SignalX - API Tests

Tests for all API endpoints using FastAPI TestClient.
"""

import pytest
from fastapi.testclient import TestClient
import sys
import os
from pathlib import Path

# Add project root
project_root = str(Path(__file__).parent.parent.parent)
if project_root not in sys.path:    
    sys.path.insert(0, project_root)

from backend.app.main import app

client = TestClient(app)


class TestHealthCheck:
    def test_health(self):
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["service"] == "SignalX"

    def test_root(self):
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert "endpoints" in data


class TestRiskScoring:
    def test_score_valid_transaction(self):
        """POST /api/risk/score with valid data returns risk assessment."""
        payload = {
            "customer_id": "cust_000001",
            "amount": 150.00,
            "payment_method": "credit_card",
            "device_id": "dev_000001",
            "ip_address": "192.168.1.1",
            "billing_country": "US",
            "shipping_country": "US",
        }
        response = client.post("/api/risk/score", json=payload)
        assert response.status_code == 200

        data = response.json()
        assert "risk_score" in data
        assert "risk_level" in data
        assert "decision" in data
        assert "expected_loss" in data
        assert "ml_score" in data
        assert 0 <= data["risk_score"] <= 1
        assert data["decision"] in ["ALLOW", "REVIEW", "BLOCK"]
        assert data["risk_level"] in ["LOW", "MEDIUM", "HIGH", "CRITICAL"]

    def test_score_invalid_amount(self):
        """POST /api/risk/score with invalid amount returns 422."""
        payload = {
            "customer_id": "cust_000001",
            "amount": -100,
            "payment_method": "credit_card",
        }
        response = client.post("/api/risk/score", json=payload)
        assert response.status_code == 422

    def test_score_missing_required_field(self):
        """POST /api/risk/score missing customer_id returns 422."""
        payload = {
            "amount": 150.00,
            "payment_method": "credit_card",
        }
        response = client.post("/api/risk/score", json=payload)
        assert response.status_code == 422

    def test_score_response_has_explanations(self):
        """Response includes risk/protective factor explanations."""
        payload = {
            "customer_id": "cust_000001",
            "amount": 5000.00,
            "payment_method": "credit_card",
            "billing_country": "US",
            "shipping_country": "US",
        }
        response = client.post("/api/risk/score", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "risk_factors" in data
        assert "protective_factors" in data
        assert "triggered_rules" in data


class TestTransactions:
    def test_list_transactions(self):
        """GET /api/transactions returns paginated list."""
        response = client.get("/api/transactions?page=1&page_size=10")
        assert response.status_code == 200
        data = response.json()
        assert "transactions" in data
        assert "total" in data
        assert "page" in data

    def test_get_transaction_not_found(self):
        """GET /api/transactions/{id} for nonexistent returns 404."""
        response = client.get("/api/transactions/txn_nonexistent")
        assert response.status_code == 404


class TestDashboard:
    def test_dashboard_metrics(self):
        """GET /api/dashboard/metrics returns overview stats."""
        response = client.get("/api/dashboard/metrics")
        assert response.status_code == 200
        data = response.json()
        assert "total_transactions" in data
        assert "fraud_detected" in data


class TestModel:
    def test_model_drift(self):
        """GET /api/model/drift returns status."""
        response = client.get("/api/model/drift")
        assert response.status_code == 200
        data = response.json()
        assert "status" in data


class TestSettings:
    def test_get_risk_settings(self):
        """GET /api/risk/settings returns current configuration."""
        response = client.get("/api/risk/settings")
        assert response.status_code == 200
        data = response.json()
        assert "risk_threshold_block" in data
        assert "weight_ml" in data
        assert "fp_cost" in data

    def test_update_risk_settings(self):
        """POST /api/risk/settings updates runtime parameters."""
        payload = {
            "risk_threshold_block": 0.75,
            "weight_ml": 0.45,
            "fp_cost": 30.0,
        }
        response = client.post("/api/risk/settings", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "SUCCESS"
        assert data["settings"]["risk_threshold_block"] == 0.75
        assert data["settings"]["weight_ml"] == 0.45

    def test_reset_risk_settings(self):
        """POST /api/risk/settings/reset resets to factory defaults."""
        response = client.post("/api/risk/settings/reset")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "RESET_SUCCESS"
        assert data["settings"]["risk_threshold_block"] == 0.70
