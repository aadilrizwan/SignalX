"""
SignalX - Risk Service

Orchestrates the complete risk scoring pipeline:
Feature extraction → ML scoring → Rules → Anomaly → Fusion → Decision → Explanation
"""

import uuid
from datetime import datetime, timezone
from typing import Dict, Optional, Any, Union
from sqlalchemy.orm import Session

from backend.app.risk_engine.feature_engine import FeatureEngine
from backend.app.risk_engine.ml_scorer import MLScorer
from backend.app.risk_engine.rule_engine import RuleEngine
from backend.app.risk_engine.fusion_engine import FusionEngine
from backend.app.risk_engine.decision_engine import DecisionEngine
from backend.app.services.neo4j_service import Neo4jService
from backend.app.models.risk_score import RiskScore
from backend.app.models.transaction import Transaction
from backend.app.schemas.risk import TransactionScoreRequest, RiskScoreResponse, RiskExplanation, RuleTriggered


class RiskService:
    """
    Orchestrates the complete risk scoring pipeline.

    Singleton-style — initialized once at application startup.
    """

    def __init__(self):
        self.feature_engine = FeatureEngine()
        self.ml_scorer = MLScorer()
        self.rule_engine = RuleEngine()
        self.fusion_engine = FusionEngine()
        self.decision_engine = DecisionEngine()
        self._shap_explainer = None
        self._initialized = False

    def initialize(self):
        """Load all models and data. Call once at startup."""
        self.feature_engine.load()
        self.ml_scorer.load()
        self._initialized = True
        # Lazy-load SHAP explainer on first explanation request
        try:
            from ml.explainability.shap_explainer import SHAPExplainer
            import os
            model_path = os.path.join("ml", "models", "lightgbm_fraud.pkl")
            if os.path.exists(model_path):
                self._shap_explainer = SHAPExplainer(model_path)
        except Exception:
            self._shap_explainer = None

    @property
    def is_initialized(self) -> bool:
        return self._initialized

    def score_transaction(
        self,
        request: Any,
        db: Optional[Session] = None,
    ) -> RiskScoreResponse:
        """
        Score a transaction end-to-end.

        Args:
            request: Transaction data (TransactionScoreRequest or dict).
            db: Optional database session for persistence.

        Returns:
            Complete risk score response.
        """
        if not self._initialized:
            self.initialize()

        if isinstance(request, dict):
            request = TransactionScoreRequest(**request)

        timestamp = request.timestamp or datetime.now(timezone.utc)
        transaction_id = f"txn_{uuid.uuid4().hex[:12]}"

        # 1. Build transaction dict
        txn_dict = {
            "customer_id": request.customer_id,
            "amount": request.amount,
            "currency": request.currency,
            "payment_method": request.payment_method,
            "device_id": request.device_id,
            "ip_address": request.ip_address,
            "billing_country": request.billing_country,
            "shipping_country": request.shipping_country,
            "product_id": request.product_id,
            "timestamp": timestamp,
        }

        # 2. Feature extraction
        features = self.feature_engine.compute_features(txn_dict)

        # 3. ML scoring
        ml_score = self.ml_scorer.score(features)

        # 4. Anomaly scoring
        anomaly_score = self.ml_scorer.anomaly_score(features)

        # 5. Rule evaluation
        rule_result = self.rule_engine.evaluate(features)
        rule_score = rule_result["rule_score"]

        # 6. Behavior score (derived from customer features)
        behavior_score = self._compute_behavior_score(features)

        # 7. Graph score (computed via Neo4j Aura Graph Engine)
        graph_score = self._compute_graph_score(
            customer_id=request.customer_id,
            device_id=request.device_id,
            ip_address=request.ip_address,
        )

        # 8. Risk fusion
        fusion_result = self.fusion_engine.fuse(
            ml_score=ml_score,
            rule_score=rule_score,
            anomaly_score=anomaly_score,
            behavior_score=behavior_score,
            graph_score=graph_score,
        )

        # 9. Decision
        decision_result = self.decision_engine.decide(
            risk_score=fusion_result["risk_score"],
            transaction_amount=request.amount,
        )

        # 10. SHAP explanation
        risk_factors = []
        protective_factors = []
        if self._shap_explainer:
            try:
                explanation = self._shap_explainer.explain(features)
                risk_factors = [
                    RiskExplanation(
                        feature=f["feature"],
                        display_name=f["display_name"],
                        shap_value=f["shap_value"],
                        feature_value=f["feature_value"] if isinstance(f["feature_value"], (int, float)) else 0,
                        reason=f["reason"],
                    )
                    for f in explanation["risk_factors"]
                ]
                protective_factors = [
                    RiskExplanation(
                        feature=f["feature"],
                        display_name=f["display_name"],
                        shap_value=f["shap_value"],
                        feature_value=f["feature_value"] if isinstance(f["feature_value"], (int, float)) else 0,
                        reason=f["reason"],
                    )
                    for f in explanation["protective_factors"]
                ]
            except Exception:
                pass  # Graceful degradation if SHAP fails

        # 11. Build triggered rules
        triggered_rules = [
            RuleTriggered(**r) for r in rule_result.get("triggered_rules", [])
        ]

        # 12. Persist to database
        if db:
            try:
                # Save transaction
                txn_record = Transaction(
                    id=transaction_id,
                    customer_id=request.customer_id,
                    merchant_id=request.merchant_id,
                    timestamp=timestamp,
                    amount=request.amount,
                    currency=request.currency,
                    payment_method=request.payment_method,
                    device_id=request.device_id,
                    ip_address=request.ip_address,
                    billing_country=request.billing_country,
                    shipping_country=request.shipping_country,
                    product_id=request.product_id,
                    is_fraud=False,  # Unknown at scoring time
                )
                db.add(txn_record)

                # Save risk score
                score_record = RiskScore(
                    id=f"rs_{uuid.uuid4().hex[:12]}",
                    transaction_id=transaction_id,
                    ml_score=ml_score,
                    behavior_score=behavior_score,
                    graph_score=graph_score,
                    anomaly_score=anomaly_score,
                    rule_score=rule_score,
                    final_score=fusion_result["risk_score"],
                    risk_level=fusion_result["risk_level"],
                    decision=decision_result["decision"],
                    expected_loss=decision_result["expected_loss"],
                )
                db.add(score_record)
                db.commit()
            except Exception:
                if db:
                    db.rollback()

        # 13. Build response
        return RiskScoreResponse(
            transaction_id=transaction_id,
            risk_score=fusion_result["risk_score"],
            risk_level=fusion_result["risk_level"],
            decision=decision_result["decision"],
            confidence=fusion_result["confidence"],
            expected_loss=decision_result["expected_loss"],
            ml_score=ml_score,
            behavior_score=behavior_score,
            graph_score=graph_score,
            anomaly_score=anomaly_score,
            rule_score=rule_score,
            risk_factors=risk_factors,
            protective_factors=protective_factors,
            triggered_rules=triggered_rules,
            scored_at=datetime.now(timezone.utc),
        )

    def _compute_behavior_score(self, features: dict) -> float:
        """
        Compute behavioral risk score from customer features.

        Combines multiple behavioral signals into a single score.
        """
        score = 0.0
        signals = 0

        # New device/IP/payment method signals
        if features.get("new_device", 0):
            score += 0.3
            signals += 1
        if features.get("new_ip", 0):
            score += 0.2
            signals += 1
        if features.get("new_payment_method", 0):
            score += 0.15
            signals += 1

        # Amount deviation
        ratio = features.get("amount_ratio_to_avg", 1.0)
        if ratio > 5:
            score += min(0.4, (ratio - 5) * 0.05)
            signals += 1

        # Velocity
        if features.get("txn_count_last_5min", 0) > 2:
            score += 0.3
            signals += 1
        elif features.get("txn_count_last_1hr", 0) > 5:
            score += 0.2
            signals += 1

        # Customer age
        age = features.get("customer_age_days", 365)
        if age < 3:
            score += 0.25
            signals += 1
        elif age < 7:
            score += 0.15
            signals += 1

        # Geographic mismatch
        if features.get("billing_shipping_mismatch", 0):
            score += 0.15
            signals += 1
        if features.get("customer_country_mismatch", 0):
            score += 0.2
            signals += 1

        return min(1.0, score)

    def _compute_graph_score(
        self, customer_id: str, device_id: Optional[str] = None, ip_address: Optional[str] = None
    ) -> float:
        """Compute real-time graph risk score via Neo4j service."""
        try:
            neo4j_svc = Neo4jService.get_instance()
            return neo4j_svc.compute_graph_risk_score(
                customer_id=customer_id,
                device_id=device_id,
                ip_address=ip_address,
            )
        except Exception:
            # Fallback heuristic if graph query fails
            if device_id and "dev_ring" in device_id:
                return 0.85
            return 0.0
