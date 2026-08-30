"""
SignalX - Returns API Endpoints

Provides return abuse analytics, customer profiling, and real-time return risk scoring.
"""

from fastapi import APIRouter, Query, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

from backend.app.services.returns_service import get_returns_service, ReturnsService

router = APIRouter(prefix="/api/returns", tags=["Returns & Return Abuse"])


class ReturnScoreRequest(BaseModel):
    customer_id: str = Field(..., description="Customer identifier")
    refund_amount: float = Field(..., gt=0, description="Amount requested for refund")
    days_after_purchase: int = Field(..., ge=0, description="Days elapsed since purchase")
    reason: str = Field(..., description="Customer stated reason for return")
    customer_return_rate: Optional[float] = Field(0.20, ge=0, le=1.0, description="Customer historical return rate")
    customer_total_orders: Optional[int] = Field(5, ge=0, description="Total customer lifetime orders")
    category: Optional[str] = Field("apparel", description="Merchandise category")


class ReturnActionRequest(BaseModel):
    action: str = Field(..., description="Policy action to apply (e.g. APPROVE, STORE_CREDIT, RESTOCK_FEE, DENY)")
    note: Optional[str] = Field(None, description="Optional risk officer comment")


@router.get("/metrics")
async def get_return_metrics():
    """Get aggregate return abuse metrics, wardrobing rates, reasons breakdown, and trends."""
    service = get_returns_service()
    return service.get_metrics()


@router.get("/abusers")
async def get_high_risk_abusers(
    limit: int = Query(20, ge=1, le=100, description="Max number of abuser profiles to return")
):
    """Retrieve top high-risk customer profiles exhibiting serial return abuse or wardrobing."""
    service = get_returns_service()
    return service.get_high_risk_abusers(limit=limit)


@router.get("")
async def list_returns(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=200, description="Items per page"),
    risk_tier: Optional[str] = Query(None, description="Filter by risk tier: LOW, MEDIUM, HIGH, CRITICAL"),
    reason: Optional[str] = Query(None, description="Filter by return reason"),
    search: Optional[str] = Query(None, description="Search term for customer_id, return_id, or transaction_id"),
    fast_only: bool = Query(False, description="Filter only fast turnaround returns (<= 3 days)"),
):
    """List paginated return records with calculated abuse risk scores and recommended actions."""
    service = get_returns_service()
    return service.get_returns(
        page=page,
        page_size=page_size,
        risk_tier=risk_tier,
        reason=reason,
        search=search,
        fast_only=fast_only,
    )


@router.post("/score")
async def score_return_request(request: ReturnScoreRequest):
    """Simulate or evaluate real-time return abuse risk with policy recommendations and reason factors."""
    service = get_returns_service()
    return service.score_return_request(request.model_dump())


@router.post("/{return_id}/action")
async def execute_return_action(return_id: str, request: ReturnActionRequest):
    """Record a merchant risk decision or policy action on a return record."""
    service = get_returns_service()
    return service.execute_action(return_id=return_id, action=request.action, note=request.note)
