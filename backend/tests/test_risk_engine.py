"""
SignalX - Risk Engine Tests

Tests for ML scorer, rule engine, fusion engine, and decision engine.
"""

import pytest
import sys
from pathlib import Path

project_root = str(Path(__file__).parent.parent.parent)
if project_root not in sys.path:
    sys.path.insert(0, project_root)


class TestRuleEngine:
    def setup_method(self):
        from backend.app.risk_engine.rule_engine import RuleEngine
        self.engine = RuleEngine()

    def test_high_velocity_triggers(self):
        """High transaction velocity should trigger rule."""
        features = {"txn_count_last_1hr": 10, "amount": 100}
        result = self.engine.evaluate(features)
        triggered_ids = [r["rule_id"] for r in result["triggered_rules"]]
        assert "HIGH_VELOCITY" in triggered_ids

    def test_high_velocity_no_trigger(self):
        """Low velocity should not trigger."""
        features = {"txn_count_last_1hr": 2, "amount": 100}
        result = self.engine.evaluate(features)
        triggered_ids = [r["rule_id"] for r in result["triggered_rules"]]
        assert "HIGH_VELOCITY" not in triggered_ids

    def test_high_amount_deviation(self):
        """Amount 15× customer average should trigger."""
        features = {"amount_ratio_to_avg": 15.0, "amount": 5000}
        result = self.engine.evaluate(features)
        triggered_ids = [r["rule_id"] for r in result["triggered_rules"]]
        assert "HIGH_AMOUNT_DEVIATION" in triggered_ids

    def test_shared_device(self):
        """Device shared by 5+ customers should trigger."""
        features = {"device_customer_count": 7, "amount": 100}
        result = self.engine.evaluate(features)
        triggered_ids = [r["rule_id"] for r in result["triggered_rules"]]
        assert "SHARED_DEVICE" in triggered_ids

    def test_new_account_high_value(self):
        """New account (<7 days) with $2000 purchase should trigger."""
        features = {"customer_age_days": 2, "amount": 2000}
        result = self.engine.evaluate(features)
        triggered_ids = [r["rule_id"] for r in result["triggered_rules"]]
        assert "NEW_ACCOUNT_HIGH_VALUE" in triggered_ids

    def test_geo_mismatch(self):
        """Billing/shipping mismatch should trigger."""
        features = {"billing_shipping_mismatch": 1, "customer_country_mismatch": 0, "amount": 100}
        result = self.engine.evaluate(features)
        triggered_ids = [r["rule_id"] for r in result["triggered_rules"]]
        assert "GEO_MISMATCH" in triggered_ids

    def test_rule_score_range(self):
        """Rule score should always be in [0, 1]."""
        features = {
            "txn_count_last_1hr": 10,
            "amount_ratio_to_avg": 20,
            "device_customer_count": 10,
            "ip_fraud_rate": 0.5,
            "customer_chargeback_rate": 0.1,
            "customer_return_rate": 0.5,
            "customer_age_days": 1,
            "amount": 5000,
            "billing_shipping_mismatch": 1,
            "customer_country_mismatch": 1,
        }
        result = self.engine.evaluate(features)
        assert 0 <= result["rule_score"] <= 1

    def test_no_triggers_zero_score(self):
        """No triggered rules should give 0 score."""
        features = {
            "txn_count_last_1hr": 1,
            "amount_ratio_to_avg": 1.0,
            "device_customer_count": 1,
            "ip_fraud_rate": 0.0,
            "customer_chargeback_rate": 0.0,
            "customer_return_rate": 0.0,
            "customer_age_days": 365,
            "amount": 50,
            "billing_shipping_mismatch": 0,
            "customer_country_mismatch": 0,
        }
        result = self.engine.evaluate(features)
        assert result["rule_score"] == 0.0
        assert result["triggered_count"] == 0


class TestFusionEngine:
    def test_weighted_combination(self):
        """Fusion should produce weighted average."""
        from backend.app.risk_engine.fusion_engine import FusionEngine
        engine = FusionEngine()
        result = engine.fuse(
            ml_score=0.8,
            rule_score=0.6,
            anomaly_score=0.4,
            behavior_score=0.2,
            graph_score=0.0,
        )
        assert 0 <= result["risk_score"] <= 1
        assert result["risk_level"] in ["LOW", "MEDIUM", "HIGH", "CRITICAL"]

    def test_all_zero_scores(self):
        """All zero inputs should give zero risk."""
        from backend.app.risk_engine.fusion_engine import FusionEngine
        engine = FusionEngine()
        result = engine.fuse(0, 0, 0, 0, 0)
        assert result["risk_score"] == 0.0
        assert result["risk_level"] == "LOW"

    def test_all_max_scores(self):
        """All 1.0 inputs should give maximum risk."""
        from backend.app.risk_engine.fusion_engine import FusionEngine
        engine = FusionEngine()
        result = engine.fuse(1.0, 1.0, 1.0, 1.0, 1.0)
        assert result["risk_score"] == 1.0
        assert result["risk_level"] == "CRITICAL"


class TestDecisionEngine:
    def test_allow_decision(self):
        """Low risk score should ALLOW."""
        from backend.app.risk_engine.decision_engine import DecisionEngine
        engine = DecisionEngine()
        result = engine.decide(risk_score=0.1, transaction_amount=100)
        assert result["decision"] == "ALLOW"

    def test_review_decision(self):
        """Medium risk score should REVIEW."""
        from backend.app.risk_engine.decision_engine import DecisionEngine
        engine = DecisionEngine()
        result = engine.decide(risk_score=0.5, transaction_amount=100)
        assert result["decision"] == "REVIEW"

    def test_block_decision(self):
        """High risk score should BLOCK."""
        from backend.app.risk_engine.decision_engine import DecisionEngine
        engine = DecisionEngine()
        result = engine.decide(risk_score=0.9, transaction_amount=100)
        assert result["decision"] == "BLOCK"

    def test_expected_loss_calculation(self):
        """Expected loss should be risk_score × amount."""
        from backend.app.risk_engine.decision_engine import DecisionEngine
        engine = DecisionEngine()
        result = engine.decide(risk_score=0.5, transaction_amount=1000)
        assert result["expected_loss"] == 500.0

    def test_high_expected_loss_override(self):
        """Very high expected loss on ALLOW should override to REVIEW."""
        from backend.app.risk_engine.decision_engine import DecisionEngine
        engine = DecisionEngine()
        result = engine.decide(risk_score=0.25, transaction_amount=50000)
        # Expected loss = 0.25 * 50000 = 12500 > 5000 threshold
        assert result["decision"] == "REVIEW"
