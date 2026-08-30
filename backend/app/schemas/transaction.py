"""Pydantic schemas for transaction API."""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class TransactionResponse(BaseModel):
    """Transaction detail response."""
    id: str
    customer_id: str
    merchant_id: str
    timestamp: datetime
    amount: float
    currency: str
    payment_method: str
    device_id: Optional[str]
    ip_address: Optional[str]
    billing_country: Optional[str]
    shipping_country: Optional[str]
    product_id: Optional[str]
    is_fraud: bool

    model_config = {"from_attributes": True}


class TransactionListResponse(BaseModel):
    """Paginated transaction list."""
    transactions: List[TransactionResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
