"""Risk scoring & settings API routes."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from backend.app.database import get_db
from backend.app.schemas.risk import TransactionScoreRequest, RiskScoreResponse
from backend.app.services.risk_service import RiskService
from backend.app.config import get_settings

router = APIRouter(prefix="/api/risk", tags=["Risk Scoring & Settings"])

# Singleton risk service
_risk_service: RiskService = None


class RiskSettingsUpdateRequest(BaseModel):
    risk_threshold_block: Optional[float] = Field(None, ge=0.0, le=1.0)
    risk_threshold_review: Optional[float] = Field(None, ge=0.0, le=1.0)
    fp_cost: Optional[float] = Field(None, ge=0.0)
    fn_cost_multiplier: Optional[float] = Field(None, ge=0.0)
    review_cost: Optional[float] = Field(None, ge=0.0)
    weight_ml: Optional[float] = Field(None, ge=0.0, le=1.0)
    weight_rules: Optional[float] = Field(None, ge=0.0, le=1.0)
    weight_anomaly: Optional[float] = Field(None, ge=0.0, le=1.0)
    weight_behavior: Optional[float] = Field(None, ge=0.0, le=1.0)
    weight_graph: Optional[float] = Field(None, ge=0.0, le=1.0)
    rule_velocity_5m_limit: Optional[int] = Field(None, ge=1)
    rule_velocity_1h_limit: Optional[int] = Field(None, ge=1)
    rule_amount_dev_multiplier: Optional[float] = Field(None, ge=1.0)
    rule_shared_device_limit: Optional[int] = Field(None, ge=1)
    webhook_slack_url: Optional[str] = None
    webhook_pagerduty_key: Optional[str] = None
    strictness_preset: Optional[str] = None


def get_risk_service() -> RiskService:
    global _risk_service
    if _risk_service is None:
        _risk_service = RiskService()
        _risk_service.initialize()
    return _risk_service


# Runtime settings cache
_runtime_settings: Dict[str, Any] = {
    "risk_threshold_block": 0.70,
    "risk_threshold_review": 0.30,
    "fp_cost": 25.0,
    "fn_cost_multiplier": 1.0,
    "review_cost": 5.0,
    "weight_ml": 0.40,
    "weight_rules": 0.20,
    "weight_anomaly": 0.15,
    "weight_behavior": 0.15,
    "weight_graph": 0.10,
    "rule_velocity_5m_limit": 3,
    "rule_velocity_1h_limit": 5,
    "rule_amount_dev_multiplier": 3.0,
    "rule_shared_device_limit": 2,
    "webhook_slack_url": "https://hooks.slack.com/services/T00/B00/XXXX",
    "webhook_pagerduty_key": "pd_live_sec_8891240",
    "strictness_preset": "BALANCED",
}


@router.get("/settings")
async def get_risk_settings():
    """Get active risk engine thresholds, fusion weights, cost parameters, and rule limits."""
    settings = get_settings()
    res = dict(_runtime_settings)
    return res


@router.post("/settings")
async def update_risk_settings(payload: RiskSettingsUpdateRequest):
    """Update active risk engine settings and synchronize with live scoring pipeline."""
    service = get_risk_service()
    update_data = {k: v for k, v in payload.model_dump().items() if v is not None}
    _runtime_settings.update(update_data)

    # Sync with live service if initialized
    if service.is_initialized:
        # Update fusion weights
        service.fusion_engine.weights = {
            "ml": _runtime_settings["weight_ml"],
            "rules": _runtime_settings["weight_rules"],
            "anomaly": _runtime_settings["weight_anomaly"],
            "behavior": _runtime_settings["weight_behavior"],
            "graph": _runtime_settings["weight_graph"],
        }
        # Update decision thresholds and cost matrix
        service.decision_engine.thresholds = {
            "block": _runtime_settings["risk_threshold_block"],
            "review": _runtime_settings["risk_threshold_review"],
        }
        service.decision_engine.cost_matrix = {
            "fp_cost": _runtime_settings["fp_cost"],
            "fn_cost_multiplier": _runtime_settings["fn_cost_multiplier"],
            "review_cost": _runtime_settings["review_cost"],
        }

    return {
        "status": "SUCCESS",
        "message": "Risk Engine parameters successfully updated and synchronized across all active workers.",
        "settings": _runtime_settings,
    }


@router.post("/settings/reset")
async def reset_risk_settings():
    """Reset risk engine settings to baseline factory defaults."""
    default_settings = {
        "risk_threshold_block": 0.70,
        "risk_threshold_review": 0.30,
        "fp_cost": 25.0,
        "fn_cost_multiplier": 1.0,
        "review_cost": 5.0,
        "weight_ml": 0.40,
        "weight_rules": 0.20,
        "weight_anomaly": 0.15,
        "weight_behavior": 0.15,
        "weight_graph": 0.10,
        "rule_velocity_5m_limit": 3,
        "rule_velocity_1h_limit": 5,
        "rule_amount_dev_multiplier": 3.0,
        "rule_shared_device_limit": 2,
        "webhook_slack_url": "https://hooks.slack.com/services/T00/B00/XXXX",
        "webhook_pagerduty_key": "pd_live_sec_8891240",
        "strictness_preset": "BALANCED",
    }
    _runtime_settings.clear()
    _runtime_settings.update(default_settings)

    service = get_risk_service()
    if service.is_initialized:
        service.fusion_engine.weights = {
            "ml": 0.40, "rules": 0.20, "anomaly": 0.15, "behavior": 0.15, "graph": 0.10
        }
        service.decision_engine.thresholds = {"block": 0.70, "review": 0.30}
        service.decision_engine.cost_matrix = {"fp_cost": 25.0, "fn_cost_multiplier": 1.0, "review_cost": 5.0}

    return {
        "status": "RESET_SUCCESS",
        "message": "Risk Engine parameters reset to factory defaults.",
        "settings": _runtime_settings,
    }


@router.post("/score", response_model=RiskScoreResponse)
async def score_transaction(
    request: TransactionScoreRequest,
    db: Session = Depends(get_db),
):
    """
    Score a transaction's fraud risk.

    Returns a complete risk assessment including:
    - Final risk score (0-1)
    - Risk level (LOW/MEDIUM/HIGH/CRITICAL)
    - Decision (ALLOW/REVIEW/BLOCK)
    - Component scores (ML, rules, anomaly, behavior, graph)
    - Top risk and protective factors (SHAP explanations)
    - Triggered rules
    - Expected financial loss
    """
    service = get_risk_service()
    try:
        result = service.score_transaction(request, db=db)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Risk scoring failed: {str(e)}")


@router.get("/{transaction_id}", response_model=dict)
async def get_risk_score(transaction_id: str):
    """Get stored risk score for a transaction."""
    raise HTTPException(status_code=404, detail="Transaction risk score not found. Use POST /api/risk/score to score a transaction.")
