"""
SignalX - Decision Engine

Makes ALLOW/REVIEW/BLOCK decisions based on risk score and expected loss.
Thresholds are configurable via settings.
"""

from typing import Dict
from backend.app.config import get_settings


class DecisionEngine:
    """
    Decision engine that maps risk scores to actionable decisions.
    Considers both risk score thresholds and expected financial loss.
    """

    def __init__(self):
        settings = get_settings()
        self.review_threshold = settings.risk_threshold_review
        self.block_threshold = settings.risk_threshold_block
        self.fn_cost_multiplier = settings.fn_cost_multiplier

    def decide(self, risk_score: float, transaction_amount: float) -> Dict:
        """
        Make a risk decision.

        Args:
            risk_score: Final fused risk score (0-1).
            transaction_amount: Transaction value for expected loss calculation.

        Returns:
            Dict with decision, risk_level, expected_loss, and rationale.
        """
        # Expected loss = P(fraud) × loss_if_fraud
        expected_loss = risk_score * transaction_amount * self.fn_cost_multiplier

        # Decision based on thresholds
        if risk_score >= self.block_threshold:
            decision = "BLOCK"
            risk_level = "CRITICAL" if risk_score >= 0.85 else "HIGH"
        elif risk_score >= self.review_threshold:
            decision = "REVIEW"
            risk_level = "MEDIUM" if risk_score < 0.5 else "HIGH"
        else:
            decision = "ALLOW"
            risk_level = "LOW"

        # Override: very high expected loss → always review or block
        if expected_loss > 5000 and decision == "ALLOW":
            decision = "REVIEW"
            risk_level = "MEDIUM"

        return {
            "decision": decision,
            "risk_level": risk_level,
            "expected_loss": round(expected_loss, 2),
            "risk_score": round(risk_score, 4),
            "thresholds": {
                "review": self.review_threshold,
                "block": self.block_threshold,
            },
        }
