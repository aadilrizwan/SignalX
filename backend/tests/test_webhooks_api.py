"""
SignalX - Webhooks and Traffic Simulator API Tests
"""

import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)


def test_stripe_webhook_payment_intent():
    payload = {
        "type": "payment_intent.created",
        "data": {
            "object": {
                "id": "pi_test_12345",
                "amount": 45000,
                "currency": "usd",
                "customer": "cust_stripe_001",
                "payment_method_types": ["card"],
                "metadata": {
                    "ip_address": "10.99.36.126",
                    "device_id": "dev_ring_0026",
                }
            }
        }
    }
    response = client.post("/api/webhooks/stripe", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "decision" in data
    assert "risk_score" in data


def test_shopify_webhook_returns():
    payload = {
        "id": "ord_shopify_999",
        "amount": 250.0,
        "total_refund_amount": 250.0,
        "days_since_order": 1,
        "reason": "changed_mind",
        "category": "apparel",
        "customer": {"id": "cust_shopify_888"}
    }
    response = client.post(
        "/api/webhooks/shopify",
        json=payload,
        headers={"x-shopify-topic": "refunds/create"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "return_decision" in data


def test_simulate_live_traffic():
    payload = {
        "batch_size": 5,
        "fraud_ratio": 0.40,
        "include_wardrobers": True
    }
    response = client.post("/api/webhooks/simulate-traffic", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["total_processed"] == 5
    assert len(data["transactions"]) == 5
    assert "prevented_loss_usd" in data
    assert "execution_time_ms" in data
