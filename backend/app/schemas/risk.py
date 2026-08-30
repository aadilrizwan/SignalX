"""Pydantic schemas for risk scoring API."""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from datetime import datetime


class TransactionScoreRequest(BaseModel):
    """Request to score a transaction's fraud risk."""
    customer_id: str = Field(..., description="Customer identifier")
    amount: float = Field(..., gt=0, description="Transaction amount")
    currency: str = Field(default="USD", max_length=3)
    payment_method: str = Field(..., description="Payment method type")
    device_id: Optional[str] = Field(default=None, description="Device fingerprint")
    ip_address: Optional[str] = Field(default=None, description="Client IP address")
    billing_country: Optional[str] = Field(default="US", max_length=10)
    shipping_country: Optional[str] = Field(default="US", max_length=10)
    product_id: Optional[str] = Field(default=None)
    merchant_id: str = Field(default="merchant_001")
    timestamp: Optional[datetime] = Field(default=None, description="Transaction time (defaults to now)")

    model_config = {"json_schema_extra": {
        "examples": [{
            "customer_id": "cust_000001",
            "amount": 74999.00,
            "payment_method": "credit_card",
            "device_id": "dev_999999",
            "ip_address": "10.99.1.42",
            "billing_country": "NG",
            "shipping_country": "US",
        }]
    }}


class RuleTriggered(BaseModel):
    """A triggered risk rule."""
    rule_id: str
    triggered: bool
    severity: str
    reason: str
    risk_contribution: float


class RiskExplanation(BaseModel):
    """Explanation factor for a risk decision."""
    feature: str
    display_name: str
    shap_value: float
    feature_value: float = 0
    reason: str


class RiskScoreResponse(BaseModel):
    """Full risk assessment response."""
    transaction_id: str
    risk_score: float = Field(..., ge=0, le=1, description="Final fused risk score")
    risk_level: str = Field(..., description="LOW, MEDIUM, HIGH, CRITICAL")
    decision: str = Field(..., description="ALLOW, REVIEW, BLOCK")
    confidence: float = Field(..., ge=0, le=1)
    expected_loss: float = Field(..., ge=0)

    # Component scores
    ml_score: float
    behavior_score: float
    graph_score: float
    anomaly_score: float
    rule_score: float

    # Explanations
    risk_factors: List[RiskExplanation] = []
    protective_factors: List[RiskExplanation] = []
    triggered_rules: List[RuleTriggered] = []

    # Metadata
    scored_at: datetime
    model_version: str = "lightgbm_v1"


class RiskScoreSummary(BaseModel):
    """Abbreviated risk score for list views."""
    transaction_id: str
    risk_score: float
    risk_level: str
    decision: str
    expected_loss: float
    scored_at: datetime
