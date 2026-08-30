"""Dashboard API routes."""

from fastapi import APIRouter
from backend.app.services.transaction_service import TransactionService

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])

_txn_service: TransactionService = None


def get_txn_service() -> TransactionService:
    global _txn_service
    if _txn_service is None:
        _txn_service = TransactionService()
        _txn_service.load()
    return _txn_service


@router.get("/metrics")
async def get_dashboard_metrics():
    """
    Get dashboard overview metrics.

    Returns aggregate fraud statistics, trend data,
    and breakdowns by country and payment method.
    """
    service = get_txn_service()
    return service.get_dashboard_metrics()
