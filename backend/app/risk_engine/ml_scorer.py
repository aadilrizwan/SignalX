"""
SignalX - ML Scorer

Wraps the trained LightGBM model for real-time inference.
Loads model once at startup, scores transactions in <10ms.
"""

import os
import joblib
import json
import numpy as np
from typing import Optional

from ml.features.feature_builder import get_feature_columns


class MLScorer:
    """ML-based fraud scoring using trained LightGBM model."""

    def __init__(self, model_path: Optional[str] = None, anomaly_model_path: Optional[str] = None):
        self.model_path = model_path or os.path.join("ml", "models", "lightgbm_fraud.pkl")
        self.anomaly_path = anomaly_model_path or os.path.join("ml", "models", "isolation_forest.pkl")
        self._model = None
        self._anomaly_model = None
        self._feature_cols = get_feature_columns()
        self._loaded = False

    def load(self):
        """Load models into memory."""
        if os.path.exists(self.model_path):
            self._model = joblib.load(self.model_path)
        if os.path.exists(self.anomaly_path):
            self._anomaly_model = joblib.load(self.anomaly_path)
        self._loaded = True

    @property
    def is_loaded(self) -> bool:
        return self._loaded

    def score(self, features: dict) -> float:
        """
        Score a transaction's fraud probability.

        Args:
            features: Dict of feature_name → value.

        Returns:
            ML fraud probability score (0-1).
        """
        if self._model is None:
            return 0.5  # Fallback when model not available

        X = np.array([features.get(col, 0) for col in self._feature_cols]).reshape(1, -1)
        score = float(self._model.predict(X)[0])
        return max(0.0, min(1.0, score))

    def anomaly_score(self, features: dict) -> float:
        """
        Score transaction anomalousness using Isolation Forest.

        Args:
            features: Dict of feature_name → value.

        Returns:
            Anomaly score (0-1, higher = more anomalous).
        """
        if self._anomaly_model is None:
            return 0.0  # Fallback

        X = np.array([features.get(col, 0) for col in self._feature_cols]).reshape(1, -1)
        raw = self._anomaly_model.decision_function(X)[0]
        # Normalize: decision_function returns negative for anomalies
        score = float(max(0, min(1, 0.5 - raw)))
        return score
