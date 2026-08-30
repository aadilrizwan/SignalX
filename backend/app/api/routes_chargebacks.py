"""
SignalX - Chargebacks API Endpoints

Provides dispute analytics, Visa CE 3.0 evidence compilation, and representment generation.
"""

from fastapi import APIRouter, Query, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

from backend.app.services.chargebacks_service import get_chargebacks_service, ChargebacksService

router = APIRouter(prefix="/api/chargebacks", tags=["Chargebacks & Dispute Defense"])


class DefenseRequest(BaseModel):
    transaction_id: str = Field(..., description="Transaction identifier under dispute")
    customer_id: str = Field(..., description="Customer ID")
    reason: str = Field("unauthorized_transaction", description="Dispute reason code")
    dispute_amount: float = Field(..., gt=0, description="Amount disputed by cardholder")
    carrier: Optional[str] = Field("FedEx", description="Fulfillment carrier name")
    tracking_number: Optional[str] = Field("FX-983482109823", description="Carrier tracking number")


class ChargebackActionRequest(BaseModel):
    action: str = Field(..., description="Action to perform: SUBMIT_REPRESENTMENT, ACCEPT_LIABILITY, ISSUE_REFUND")
    note: Optional[str] = Field(None, description="Optional note from dispute officer")


@router.get("/metrics")
async def get_chargeback_metrics():
    """Get aggregate chargeback KPIs, win rates, Visa VROL thresholds, and trend charts."""
    service = get_chargebacks_service()
    return service.get_metrics()


@router.get("")
async def list_chargebacks(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=200, description="Items per page"),
    status: Optional[str] = Query(None, description="Filter by status: OPEN, WON, LOST, PENDING"),
    reason: Optional[str] = Query(None, description="Filter by dispute reason"),
    search: Optional[str] = Query(None, description="Search by ID, customer, or transaction"),
):
    """List paginated chargeback disputes with estimated win probabilities and CE 3.0 compliance status."""
    service = get_chargebacks_service()
    return service.get_chargebacks(
        page=page,
        page_size=page_size,
        status=status,
        reason=reason,
        search=search,
    )


@router.post("/defend")
async def generate_defense_package(request: DefenseRequest):
    """Compile AI-powered Visa Compelling Evidence 3.0 Representment Package for a disputed charge."""
    service = get_chargebacks_service()
    return service.generate_defense_package(request.model_dump())


@router.post("/{chargeback_id}/action")
async def execute_chargeback_action(chargeback_id: str, request: ChargebackActionRequest):
    """Submit representment package or accept liability for a chargeback."""
    service = get_chargebacks_service()
    return service.execute_action(chargeback_id=chargeback_id, action=request.action, note=request.note)
