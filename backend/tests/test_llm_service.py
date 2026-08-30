"""
Unit Tests for LLM Dispute Rebuttal Synthesis Service
"""

import pytest
from backend.app.services.llm_service import LLMService, get_llm_service


def test_llm_service_initialization():
    service = get_llm_service()
    assert service is not None
    assert hasattr(service, "synthesize_rebuttal")


def test_llm_service_fallback_synthesis():
    service = LLMService()
    case_data = {
        "transaction_id": "txn_0000145",
        "customer_id": "cust_002899",
        "amount": 345.0,
        "dispute_reason": "unauthorized_transaction",
        "carrier": "FedEx",
        "tracking_number": "FX-983419203982",
    }
    sources = [
        {
            "source_layer": "LAYER_1_ORDER_AUTH",
            "source_name": "PostgreSQL Core Order Store",
            "citation_id": "SRC-ORD-000145",
            "title": "Itemized Order & Checkout Metadata",
            "verified_facts": ["AVS Match Y", "CVV Match M"],
        },
        {
            "source_layer": "LAYER_3_CARRIER_POD",
            "source_name": "FedEx Enterprise Logistics API",
            "citation_id": "SRC-LOG-203982",
            "title": "Carrier GPS Delivery Confirmation (FedEx)",
            "verified_facts": ["Status: DELIVERED", "GPS Lat/Lng match within 6m"],
        }
    ]

    result = service.synthesize_rebuttal(case_data, sources, target_scheme="VISA_VROL")
    assert "legal_narrative" in result
    assert "FORMAL DISPUTE" in result["legal_narrative"]
    assert "txn_0000145" in result["legal_narrative"]
    assert "model_used" in result
    assert "provider" in result
