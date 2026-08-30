"""
SignalX - Rule Engine

Configurable deterministic rules for fraud detection.
Rules are data-driven, not hard-coded into the UI.
Each rule returns structured output with severity and reason.
"""

from typing import List, Dict, Optional
from dataclasses import dataclass, field


@dataclass
class RuleResult:
    """Result of a single rule evaluation."""
    rule_id: str
    triggered: bool
    severity: str  # LOW, MEDIUM, HIGH, CRITICAL
    reason: str
    risk_contribution: float  # 0-1

    def to_dict(self) -> dict:
        return {
            "rule_id": self.rule_id,
            "triggered": self.triggered,
            "severity": self.severity,
            "reason": self.reason,
            "risk_contribution": self.risk_contribution,
        }


# Default rule configurations
DEFAULT_RULES = [
    {
        "id": "HIGH_VELOCITY",
        "name": "High Transaction Velocity",
        "description": "Multiple transactions in a short time window",
        "field": "txn_count_last_1hr",
        "operator": ">=",
        "threshold": 5,
        "severity": "HIGH",
        "risk_contribution": 0.8,
        "enabled": True,
    },
    {
        "id": "HIGH_AMOUNT_DEVIATION",
        "name": "High Amount Deviation",
        "description": "Transaction amount far exceeds customer average",
        "field": "amount_ratio_to_avg",
        "operator": ">=",
        "threshold": 10.0,
        "severity": "HIGH",
        "risk_contribution": 0.7,
        "enabled": True,
    },
    {
        "id": "SHARED_DEVICE",
        "name": "Device Shared by Many Customers",
        "description": "Device fingerprint associated with multiple accounts",
        "field": "device_customer_count",
        "operator": ">=",
        "threshold": 5,
        "severity": "HIGH",
        "risk_contribution": 0.8,
        "enabled": True,
    },
    {
        "id": "SUSPICIOUS_IP",
        "name": "Suspicious IP Activity",
        "description": "IP address with high fraud rate or many accounts",
        "field": "ip_fraud_rate",
        "operator": ">=",
        "threshold": 0.1,
        "severity": "HIGH",
        "risk_contribution": 0.7,
        "enabled": True,
    },
    {
        "id": "HIGH_CHARGEBACK_RATE",
        "name": "High Customer Chargeback Rate",
        "description": "Customer has elevated chargeback history",
        "field": "customer_chargeback_rate",
        "operator": ">=",
        "threshold": 0.05,
        "severity": "MEDIUM",
        "risk_contribution": 0.6,
        "enabled": True,
    },
    {
        "id": "HIGH_RETURN_RATE",
        "name": "High Customer Return Rate",
        "description": "Customer has unusually high return frequency",
        "field": "customer_return_rate",
        "operator": ">=",
        "threshold": 0.3,
        "severity": "MEDIUM",
        "risk_contribution": 0.5,
        "enabled": True,
    },
    {
        "id": "NEW_ACCOUNT_HIGH_VALUE",
        "name": "New Account + High-Value Transaction",
        "description": "Account less than 7 days old with high-value purchase",
        "fields": ["customer_age_days", "amount"],
        "operator": "compound",
        "threshold": {"customer_age_days_max": 7, "amount_min": 1000},
        "severity": "HIGH",
        "risk_contribution": 0.75,
        "enabled": True,
    },
    {
        "id": "GEO_MISMATCH",
        "name": "Geographic Inconsistency",
        "description": "Billing and shipping countries differ or mismatch customer home",
        "fields": ["billing_shipping_mismatch", "customer_country_mismatch"],
        "operator": "any_true",
        "threshold": 1,
        "severity": "MEDIUM",
        "risk_contribution": 0.5,
        "enabled": True,
    },
]


class RuleEngine:
    """
    Configurable rules engine for fraud detection.

    Rules can be loaded from configuration, database, or defaults.
    """

    def __init__(self, rules: Optional[List[dict]] = None):
        """
        Initialize with rule configurations.

        Args:
            rules: List of rule config dicts. Uses defaults if None.
        """
        self.rules = rules or DEFAULT_RULES

    def evaluate(self, features: dict) -> Dict:
        """
        Evaluate all rules against a transaction's features.

        Args:
            features: Dict of feature_name → value.

        Returns:
            Dict with triggered_rules, rule_score, and all_results.
        """
        results: List[RuleResult] = []
        triggered_count = 0
        max_contribution = 0.0

        for rule in self.rules:
            if not rule.get("enabled", True):
                continue

            result = self._evaluate_rule(rule, features)
            results.append(result)

            if result.triggered:
                triggered_count += 1
                max_contribution = max(max_contribution, result.risk_contribution)

        # Combine rule results into a single score
        # Use weighted max + average for triggered rules
        if triggered_count == 0:
            rule_score = 0.0
        elif triggered_count == 1:
            rule_score = max_contribution
        else:
            triggered_contributions = [r.risk_contribution for r in results if r.triggered]
            # Weighted combination: max contributes 60%, average contributes 40%
            avg_contribution = sum(triggered_contributions) / len(triggered_contributions)
            rule_score = 0.6 * max_contribution + 0.4 * avg_contribution

        rule_score = min(1.0, rule_score)

        return {
            "rule_score": round(rule_score, 4),
            "triggered_count": triggered_count,
            "total_rules": len(results),
            "results": [r.to_dict() for r in results],
            "triggered_rules": [r.to_dict() for r in results if r.triggered],
        }

    def _evaluate_rule(self, rule: dict, features: dict) -> RuleResult:
        """Evaluate a single rule."""
        rule_id = rule["id"]
        operator = rule.get("operator", ">=")
        severity = rule.get("severity", "MEDIUM")
        risk_contribution = rule.get("risk_contribution", 0.5)
        triggered = False

        if operator == "compound":
            # Compound rule: multiple conditions must be true
            thresholds = rule.get("threshold", {})
            conditions_met = True

            if "customer_age_days_max" in thresholds:
                if features.get("customer_age_days", 999) > thresholds["customer_age_days_max"]:
                    conditions_met = False

            if "amount_min" in thresholds:
                if features.get("amount", 0) < thresholds["amount_min"]:
                    conditions_met = False

            triggered = conditions_met

        elif operator == "any_true":
            # Any of the listed fields is true (non-zero)
            fields = rule.get("fields", [])
            triggered = any(features.get(f, 0) >= rule.get("threshold", 1) for f in fields)

        else:
            # Simple comparison
            field = rule.get("field", "")
            value = features.get(field, 0)
            threshold = rule.get("threshold", 0)

            if operator == ">=":
                triggered = value >= threshold
            elif operator == ">":
                triggered = value > threshold
            elif operator == "<=":
                triggered = value <= threshold
            elif operator == "<":
                triggered = value < threshold
            elif operator == "==":
                triggered = value == threshold

        reason = ""
        if triggered:
            reason = rule.get("description", f"Rule {rule_id} triggered")

        return RuleResult(
            rule_id=rule_id,
            triggered=triggered,
            severity=severity if triggered else "NONE",
            reason=reason,
            risk_contribution=risk_contribution if triggered else 0.0,
        )

    def get_rules(self) -> List[dict]:
        """Return all rule configurations."""
        return self.rules

    def update_rule(self, rule_id: str, updates: dict) -> bool:
        """Update a rule's configuration."""
        for i, rule in enumerate(self.rules):
            if rule["id"] == rule_id:
                self.rules[i].update(updates)
                return True
        return False

    def add_rule(self, rule: dict) -> bool:
        """Add a new rule."""
        if any(r["id"] == rule["id"] for r in self.rules):
            return False  # Duplicate ID
        self.rules.append(rule)
        return True
