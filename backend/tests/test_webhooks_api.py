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


def test_razorpay_webhook_payment():
    payload = {
        "event": "payment.authorized",
        "payload": {
            "payment": {
                "entity": {
                    "id": "pay_test_987654",
                    "amount": 299900,
                    "currency": "INR",
                    "customer_id": "cust_rzp_001",
                    "method": "card",
                    "notes": {
                        "ip_address": "103.21.244.10",
                        "device_id": "dev_rzp_99",
                    }
                }
            }
        }
    }
    response = client.post("/api/webhooks/razorpay", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "decision" in data
    assert "risk_score" in data
    assert "recommendation" in data


def test_razorpay_webhook_dispute():
    payload = {
        "event": "dispute.created",
        "payload": {
            "dispute": {
                "entity": {
                    "id": "disp_rzp_12345",
                    "amount": 50000,
                    "reason_code": "fraudulent",
                }
            }
        }
    }
    response = client.post("/api/webhooks/razorpay", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["dispute_id"] == "disp_rzp_12345"

