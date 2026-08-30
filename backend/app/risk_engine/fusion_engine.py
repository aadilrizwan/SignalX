"""
SignalX - Risk Fusion Engine

Combines scores from all risk engines into a single risk assessment.
Weights are configurable via settings.
"""

from typing import Dict
from backend.app.config import get_settings


class FusionEngine:
    """
    Combines ML, rule, anomaly, behavior, and graph scores
    into a single risk score with configurable weights.
    """

    def __init__(self):
        settings = get_settings()
        self.weights = {
            "ml": settings.weight_ml,
            "rules": settings.weight_rules,
            "anomaly": settings.weight_anomaly,
            "behavior": settings.weight_behavior,
            "graph": settings.weight_graph,
        }

    def fuse(
        self,
        ml_score: float = 0.0,
        rule_score: float = 0.0,
        anomaly_score: float = 0.0,
        behavior_score: float = 0.0,
        graph_score: float = 0.0,
    ) -> Dict:
        """
        Combine all risk signals into a final risk assessment.

        Args:
            ml_score: ML model fraud probability (0-1).
            rule_score: Deterministic rule score (0-1).
            anomaly_score: Isolation Forest anomaly score (0-1).
            behavior_score: Behavioral risk score (0-1).
            graph_score: Graph-based risk score (0-1).

        Returns:
            Dict with final_score, risk_level, component scores, and weights.
        """
        # Weighted combination
        final_score = (
            self.weights["ml"] * ml_score +
            self.weights["rules"] * rule_score +
            self.weights["anomaly"] * anomaly_score +
            self.weights["behavior"] * behavior_score +
            self.weights["graph"] * graph_score
        )

        # Normalize by total weight (in case weights don't sum to 1)
        total_weight = sum(self.weights.values())
        if total_weight > 0:
            final_score = final_score / total_weight

        final_score = max(0.0, min(1.0, final_score))

        # Risk level
        risk_level = self._get_risk_level(final_score)

        # Confidence: higher when engines agree, lower when they diverge
        scores = [ml_score, rule_score, anomaly_score, behavior_score, graph_score]
        non_zero_scores = [s for s in scores if s > 0]
        if len(non_zero_scores) > 1:
            import numpy as np
            std = float(np.std(non_zero_scores))
            confidence = max(0.0, 1.0 - std * 2)
        else:
            confidence = 0.5  # Low confidence with single signal

        return {
            "risk_score": round(final_score, 4),
            "risk_level": risk_level,
            "confidence": round(confidence, 4),
            "component_scores": {
                "ml_score": round(ml_score, 4),
                "rule_score": round(rule_score, 4),
                "anomaly_score": round(anomaly_score, 4),
                "behavior_score": round(behavior_score, 4),
                "graph_score": round(graph_score, 4),
            },
            "weights": self.weights,
        }

    def _get_risk_level(self, score: float) -> str:
        """Map score to risk level."""
        if score >= 0.8:
            return "CRITICAL"
        elif score >= 0.6:
            return "HIGH"
        elif score >= 0.3:
            return "MEDIUM"
        else:
            return "LOW"
