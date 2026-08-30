"""
SignalX - Feature Engine (API-side)

Wraps the ML feature builder for real-time API inference.
Loads transaction history and computes features for a single transaction.
"""

import pandas as pd
import os
from typing import Dict, Optional
from ml.features.feature_builder import build_single_transaction_features


class FeatureEngine:
    """Computes features for real-time transaction scoring."""

    def __init__(self, data_dir: str = "data"):
        self.data_dir = data_dir
        self._transactions_df = None
        self._customers_df = None
        self._devices_df = None
        self._loaded = False

    def load(self):
        """Load historical data for feature computation."""
        txn_path = os.path.join(self.data_dir, "transactions.csv")
        cust_path = os.path.join(self.data_dir, "customers.csv")
        dev_path = os.path.join(self.data_dir, "devices.csv")

        if os.path.exists(txn_path):
            self._transactions_df = pd.read_csv(txn_path)
            self._transactions_df["timestamp"] = pd.to_datetime(self._transactions_df["timestamp"], utc=True).dt.tz_localize(None)
        else:
            self._transactions_df = pd.DataFrame()

        if os.path.exists(cust_path):
            self._customers_df = pd.read_csv(cust_path)
            self._customers_df["created_at"] = pd.to_datetime(self._customers_df["created_at"])
        else:
            self._customers_df = pd.DataFrame()

        if os.path.exists(dev_path):
            self._devices_df = pd.read_csv(dev_path)
        else:
            self._devices_df = pd.DataFrame()

        self._loaded = True

    @property
    def is_loaded(self) -> bool:
        return self._loaded

    def compute_features(self, transaction: dict) -> Dict:
        """
        Compute all features for a single transaction.

        Args:
            transaction: Dict with transaction fields.

        Returns:
            Dict of feature_name → value.
        """
        if not self._loaded:
            self.load()

        return build_single_transaction_features(
            transaction=transaction,
            historical_transactions=self._transactions_df,
            customers_df=self._customers_df,
            devices_df=self._devices_df,
        )
