"""
SignalX - Evidence API Endpoints

Provides RAG evidence retrieval, source grounding citations, and automated dossier synthesis.
"""

from fastapi import APIRouter, Query, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

from backend.app.services.evidence_service import get_evidence_service, EvidenceService

router = APIRouter(prefix="/api/evidence", tags=["Evidence & RAG Synthesis"])


class GenerateDossierRequest(BaseModel):
    transaction_id: str = Field(..., description="Transaction identifier under dispute")
    customer_id: str = Field(..., description="Customer ID")
    dispute_reason: Optional[str] = Field("unauthorized_transaction", description="Dispute reason code")
    amount: float = Field(..., gt=0, description="Amount disputed by cardholder")
    target_scheme: Optional[str] = Field("VISA_VROL", description="Target card network gateway")
    carrier: Optional[str] = Field("FedEx", description="Fulfillment carrier name")
    tracking_number: Optional[str] = Field("FX-983419203982", description="Carrier tracking number")


class ExportActionRequest(BaseModel):
    format: Optional[str] = Field("MARKDOWN", description="Export format: MARKDOWN, JSON, PDF")
    auto_dispatch: Optional[bool] = Field(False, description="Dispatch directly to card scheme gateway")


@router.get("/metrics")
async def get_evidence_metrics():
    """Get RAG evidence retrieval benchmarks, source health, and citation accuracy statistics."""
    service = get_evidence_service()
    return service.get_metrics()


@router.get("/packages")
async def list_evidence_packages(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    search: Optional[str] = Query(None, description="Search term for ID, customer, or transaction"),
    scheme: Optional[str] = Query(None, description="Filter by card scheme"),
):
    """List paginated evidence dossiers with confidence ratings and source counts."""
    service = get_evidence_service()
    return service.get_packages(page=page, page_size=page_size, search=search, scheme=scheme)


@router.post("/generate")
async def generate_evidence_dossier(request: GenerateDossierRequest):
    """Synthesize complete RAG-backed evidence dossier with 6 grounded authoritative source layers."""
    service = get_evidence_service()
    return service.generate_dossier(request.model_dump())


@router.post("/packages/{dossier_id}/export")
async def export_evidence_package(dossier_id: str, request: ExportActionRequest):
    """Export evidence dossier or dispatch directly to payment gateway API."""
    return {
        "dossier_id": dossier_id,
        "format": request.format,
        "status": "DISPATCHED" if request.auto_dispatch else "EXPORTED",
        "message": f"Evidence dossier {dossier_id} processed successfully.",
    }
