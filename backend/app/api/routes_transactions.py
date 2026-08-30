"""Transaction API routes."""

from fastapi import APIRouter, HTTPException, Query
from backend.app.services.transaction_service import TransactionService

router = APIRouter(prefix="/api/transactions", tags=["Transactions"])

_txn_service: TransactionService = None


def get_txn_service() -> TransactionService:
    global _txn_service
    if _txn_service is None:
        _txn_service = TransactionService()
        _txn_service.load()
    return _txn_service


@router.get("")
async def list_transactions(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
    fraud_only: bool = Query(default=False),
):
    """List transactions with pagination."""
    service = get_txn_service()
    return service.get_transactions(page=page, page_size=page_size, fraud_only=fraud_only)


@router.get("/{transaction_id}")
async def get_transaction(transaction_id: str):
    """Get transaction detail by ID."""
    service = get_txn_service()
    txn = service.get_transaction(transaction_id)
    if txn is None:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return txn
