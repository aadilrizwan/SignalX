"""
SignalX — Prediction Entry Point

Loads saved models and runs inference on new transactions.

Usage:
    python -m ml.predict --transaction '{"amount": 5000, "customer_id": "cust_000001", ...}'
"""

import argparse
import json
import os
import sys
import joblib
import numpy as np
from pathlib import Path

project_root = str(Path(__file__).parent.parent)
if project_root not in sys.path:
    sys.path.insert(0, project_root)

from ml.config import MODEL_DIR
from ml.features.feature_builder import get_feature_columns


class FraudPredictor:
    """Load trained models and predict fraud probability."""

    def __init__(self, model_dir: str = MODEL_DIR):
        self.model_dir = model_dir
        self._lgbm = None
        self._iso = None
        self._feature_cols = None

    def load(self):
        """Load all models into memory."""
        self._lgbm = joblib.load(os.path.join(self.model_dir, "lightgbm_fraud.pkl"))
        self._iso = joblib.load(os.path.join(self.model_dir, "isolation_forest.pkl"))
        self._feature_cols = get_feature_columns()

        # Load feature columns from saved config
        fc_path = os.path.join(self.model_dir, "feature_columns.json")
        if os.path.exists(fc_path):
            with open(fc_path) as f:
                self._feature_cols = json.load(f)

    @property
    def is_loaded(self) -> bool:
        return self._lgbm is not None

    def predict_fraud(self, features: dict) -> dict:
        """
        Predict fraud probability from feature dict.

        Args:
            features: Dict of feature_name → value.

        Returns:
            Dict with ml_score, anomaly_score, and confidence.
        """
        if not self.is_loaded:
            self.load()

        # Build feature vector
        X = np.array([features.get(col, 0) for col in self._feature_cols]).reshape(1, -1)

        # ML score (LightGBM)
        ml_score = float(self._lgbm.predict(X)[0])

        # Anomaly score (Isolation Forest)
        iso_raw = self._iso.decision_function(X)[0]
        # Normalize: more negative = more anomalous → higher score
        anomaly_score = float(max(0, min(1, 0.5 - iso_raw)))

        # Confidence: based on how extreme the prediction is
        confidence = float(abs(ml_score - 0.5) * 2)  # 0 at 0.5, 1 at 0 or 1

        return {
            "ml_score": round(ml_score, 4),
            "anomaly_score": round(anomaly_score, 4),
            "confidence": round(confidence, 4),
        }


def main():
    parser = argparse.ArgumentParser(description="SignalX Prediction")
    parser.add_argument("--transaction", type=str, help="Transaction JSON string")
    parser.add_argument("--model-dir", type=str, default=MODEL_DIR)
    args = parser.parse_args()

    predictor = FraudPredictor(model_dir=args.model_dir)
    predictor.load()

    if args.transaction:
        txn = json.loads(args.transaction)
        # Note: In a real scenario, features would be computed from the transaction
        # Here we expect pre-computed features
        result = predictor.predict_fraud(txn)
        print(json.dumps(result, indent=2))
    else:
        print("No transaction provided. Use --transaction '{...}'")


if __name__ == "__main__":
    main()
