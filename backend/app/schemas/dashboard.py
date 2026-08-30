"""Pydantic schemas for dashboard API."""

from pydantic import BaseModel
from typing import Dict, List, Optional


class DashboardMetrics(BaseModel):
    """Dashboard overview metrics."""
    total_transactions: int
    fraud_detected: int
    fraud_prevented_amount: float
    current_fraud_rate: float
    false_positive_rate: float
    chargeback_rate: float
    return_abuse_rate: float
    expected_loss: float

    # Decision distribution
    decisions: Dict[str, int]  # ALLOW, REVIEW, BLOCK counts

    # Risk level distribution
    risk_levels: Dict[str, int]  # LOW, MEDIUM, HIGH, CRITICAL counts

    # Time series data (last 30 days)
    fraud_trend: List[Dict]  # [{date, fraud_count, total_count}]

    # Breakdowns
    fraud_by_country: List[Dict]  # [{country, count, rate}]
    fraud_by_payment_method: List[Dict]  # [{method, count, rate}]
