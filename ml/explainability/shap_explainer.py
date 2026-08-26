"""
SignalX — SHAP Explainability

Uses TreeSHAP for LightGBM to explain individual predictions.
Maps technical feature names to human-readable reason codes.
"""

import numpy as np
import joblib
import shap
from typing import List, Dict, Optional
from ml.features.feature_builder import FEATURE_DISPLAY_NAMES, get_feature_columns


class SHAPExplainer:
    """SHAP-based model explainer for fraud predictions."""

    def __init__(self, model_path: str):
        """
        Initialize the explainer.

        Args:
            model_path: Path to saved LightGBM model.
        """
        self.model = joblib.load(model_path)
        self.explainer = shap.TreeExplainer(self.model)
        self.feature_cols = get_feature_columns()

    def explain(
        self,
        features: dict,
        top_n: int = 5,
    ) -> Dict:
        """
        Explain a single prediction.

        Args:
            features: Dict of feature_name → value.
            top_n: Number of top risk factors to return.

        Returns:
            Dict with risk_factors, protective_factors, and raw SHAP values.
        """
        # Build feature vector in correct order
        feature_vector = np.array([features.get(col, 0) for col in self.feature_cols]).reshape(1, -1)

        # Get SHAP values
        shap_values = self.explainer.shap_values(feature_vector)

        # For binary classification, shap_values may be a list [class_0, class_1]
        if isinstance(shap_values, list):
            sv = shap_values[1][0]  # Class 1 (fraud) SHAP values
        else:
            sv = shap_values[0]

        # Build explanation
        feature_shap = list(zip(self.feature_cols, sv, [features.get(col, 0) for col in self.feature_cols]))

        # Sort by absolute SHAP value
        feature_shap.sort(key=lambda x: abs(x[1]), reverse=True)

        # Positive SHAP = increases fraud risk
        risk_factors = []
        protective_factors = []

        for feat_name, shap_val, feat_val in feature_shap:
            display_name = FEATURE_DISPLAY_NAMES.get(feat_name, feat_name)
            entry = {
                "feature": feat_name,
                "display_name": display_name,
                "shap_value": round(float(shap_val), 4),
                "feature_value": feat_val,
                "reason": _generate_reason(feat_name, feat_val, shap_val),
            }

            if shap_val > 0:
                risk_factors.append(entry)
            else:
                protective_factors.append(entry)

        return {
            "risk_factors": risk_factors[:top_n],
            "protective_factors": protective_factors[:top_n],
            "base_value": float(self.explainer.expected_value[1] if isinstance(self.explainer.expected_value, list) else self.explainer.expected_value),
            "all_shap_values": {col: round(float(sv[i]), 4) for i, col in enumerate(self.feature_cols)},
        }


def _generate_reason(feature_name: str, value, shap_value: float) -> str:
    """Generate a human-readable reason from a feature contribution."""
    if abs(shap_value) < 0.01:
        return ""

    direction = "increases" if shap_value > 0 else "decreases"

    reasons = {
        "amount": f"Transaction amount (${value:,.2f}) {direction} risk",
        "amount_ratio_to_avg": f"Amount is {value:.1f}× customer average" if value > 1 else f"Amount is below customer average",
        "amount_ratio_to_max": f"Amount is {value:.1f}× customer maximum" if value > 1 else f"Amount is below customer maximum",
        "device_customer_count": f"Device used by {int(value)} customers" if value > 1 else f"Device used by single customer",
        "device_fraud_rate": f"Device has {value:.0%} historical fraud rate" if value > 0 else f"Device has no fraud history",
        "ip_customer_count": f"IP address shared by {int(value)} customers" if value > 1 else f"IP used by single customer",
        "ip_fraud_rate": f"IP has {value:.0%} historical fraud rate" if value > 0 else f"IP has no fraud history",
        "new_device": "New device for this customer" if value == 1 else "Known device",
        "new_ip": "New IP address for this customer" if value == 1 else "Known IP address",
        "new_payment_method": "New payment method for this customer" if value == 1 else "Known payment method",
        "billing_shipping_mismatch": "Billing and shipping countries differ" if value == 1 else "Billing and shipping countries match",
        "customer_country_mismatch": "Transaction country differs from customer's home country" if value == 1 else "Transaction from home country",
        "customer_age_days": f"Account is {int(value)} days old" if value < 30 else f"Established account ({int(value)} days)",
        "customer_transaction_count": f"Customer has {int(value)} previous transactions",
        "txn_count_last_5min": f"{int(value)} transactions in last 5 minutes" if value > 0 else "No recent rapid transactions",
        "txn_count_last_1hr": f"{int(value)} transactions in last hour",
        "txn_count_last_24hr": f"{int(value)} transactions in last 24 hours",
        "customer_return_rate": f"Customer return rate: {value:.0%}",
        "customer_chargeback_rate": f"Customer chargeback rate: {value:.0%}",
        "is_weekend": "Weekend transaction" if value == 1 else "Weekday transaction",
    }

    return reasons.get(feature_name, f"{FEATURE_DISPLAY_NAMES.get(feature_name, feature_name)}: {value}")
