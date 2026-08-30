"""
SignalX - Review Queue API Endpoints

Provides endpoints for analyst queue queries, single/batch dispositions,
SLA timers, SHAP factor breakdown, and audit trails.
"""

from fastapi import APIRouter, Query, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

from backend.app.services.reviews_service import get_reviews_service, ReviewsService

router = APIRouter(prefix="/api/reviews", tags=["Analyst Review Queue"])


class DispositionRequest(BaseModel):
    action: str = Field(..., description="Action: APPROVE, BLOCK_FRAUD, STEP_UP_CHALLENGE, ESCALATE")
    analyst: Optional[str] = Field("Lead Analyst", description="Name/ID of the reviewing analyst")
    note: Optional[str] = Field(None, description="Analyst review notes and rationale")
    tags: Optional[List[str]] = Field(default_factory=list, description="Categorization tags")


class BatchDispositionRequest(BaseModel):
    case_ids: List[str] = Field(..., description="List of case IDs to disposition")
    action: str = Field(..., description="Action to apply to all selected cases")
    analyst: Optional[str] = Field("Lead Analyst", description="Reviewing analyst")
    note: Optional[str] = Field("Batch disposition executed", description="Batch note")


@router.get("/metrics")
async def get_review_metrics():
    """Get review queue KPIs, SLA health, analyst productivity, and decision distributions."""
    service = get_reviews_service()
    return service.get_metrics()


@router.get("/queue")
async def get_review_queue(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Page size"),
    priority: Optional[str] = Query(None, description="Filter by priority: URGENT_SLA, HIGH_AMOUNT, STANDARD"),
    risk_tier: Optional[str] = Query(None, description="Filter by risk tier: HIGH, MEDIUM, LOW"),
    search: Optional[str] = Query(None, description="Search term for case, txn, or customer"),
):
    """List paginated review queue cases with SLA timers and trigger reasons."""
    service = get_reviews_service()
    return service.get_queue(
        page=page,
        page_size=page_size,
        priority=priority,
        risk_tier=risk_tier,
        search=search,
    )


@router.get("/history")
async def get_review_history(limit: int = Query(50, ge=1, le=200)):
    """Get audit trail of resolved analyst reviews."""
    service = get_reviews_service()
    return service.get_history(limit=limit)


@router.get("/{case_id}")
async def get_case_detail(case_id: str):
    """Get full case details including SHAP factors and customer history."""
    service = get_reviews_service()
    case = service.get_case(case_id)
    if not case:
        raise HTTPException(status_code=404, detail=f"Case {case_id} not found")
    return case


@router.post("/{case_id}/disposition")
async def disposition_case(case_id: str, request: DispositionRequest):
    """Execute human analyst disposition on a single case."""
    service = get_reviews_service()
    return service.execute_disposition(
        case_id=case_id,
        action=request.action,
        analyst=request.analyst,
        note=request.note,
        tags=request.tags,
    )


@router.post("/batch-disposition")
async def batch_disposition(request: BatchDispositionRequest):
    """Batch disposition multiple review cases simultaneously."""
    service = get_reviews_service()
    results = []
    for cid in request.case_ids:
        res = service.execute_disposition(
            case_id=cid,
            action=request.action,
            analyst=request.analyst,
            note=request.note,
        )
        results.append(res)
    return {
        "action": request.action,
        "processed_count": len(results),
        "results": results,
    }
