"""
SignalX - Supabase Service Tests
"""

import pytest
from backend.app.services.supabase_service import SupabaseService, get_supabase_service


def test_supabase_service_fallback():
    service = SupabaseService(url=None, key=None, use_env=False)
    assert not service.is_connected

    # Test uploading evidence dossier fallback
    success, url, err = service.upload_dossier(
        dossier_id="DOSSIER-TEST-001",
        content=b"Sample PDF Content",
        file_extension="pdf"
    )
    assert success is True
    assert url is not None
    assert "DOSSIER-TEST-001.pdf" in url

    # Test broadcasting event fallback
    broadcast_ok = service.broadcast_transaction_event({
        "id": "txn_001",
        "amount": 150.0,
        "decision": "ALLOW"
    })
    assert broadcast_ok is True

    # Test sync dispute fallback
    sync_ok = service.sync_dispute_case({
        "dispute_id": "dp_001",
        "status": "NEEDS_RESPONSE"
    })
    assert sync_ok is True
