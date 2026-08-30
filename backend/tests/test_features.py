"""
SignalX - Feature Engineering Tests

Tests for feature generation, leakage prevention, and output validation.
"""

import pytest
import numpy as np
import pandas as pd
import sys
from pathlib import Path
from datetime import datetime, timedelta

project_root = str(Path(__file__).parent.parent.parent)
if project_root not in sys.path:
    sys.path.insert(0, project_root)

from ml.features.feature_builder import (
    build_features,
    get_feature_columns,
    build_single_transaction_features,
)


def _make_test_data():
    """Create minimal test data for feature testing."""
    customers = pd.DataFrame({
        "id": ["c1", "c2"],
        "created_at": [datetime(2024, 1, 1), datetime(2024, 6, 1)],
        "country": ["US", "UK"],
        "lifetime_value": [1000, 500],
        "return_rate": [0.05, 0.30],
        "chargeback_rate": [0.01, 0.10],
    })

    devices = pd.DataFrame({
        "id": ["d1", "d2"],
        "first_seen": [datetime(2024, 1, 1), datetime(2024, 6, 1)],
        "customer_count": [1, 3],
        "transaction_count": [10, 20],
        "fraud_count": [0, 2],
    })

    transactions = pd.DataFrame({
        "id": [f"t{i}" for i in range(10)],
        "customer_id": ["c1"] * 5 + ["c2"] * 5,
        "merchant_id": ["m1"] * 10,
        "timestamp": [datetime(2024, 1, 1) + timedelta(hours=i * 24) for i in range(10)],
        "amount": [50, 60, 70, 80, 90, 100, 200, 300, 400, 500],
        "currency": ["USD"] * 10,
        "payment_method": ["credit_card"] * 8 + ["debit_card"] * 2,
        "device_id": ["d1"] * 5 + ["d2"] * 5,
        "ip_address": ["192.168.1.1"] * 5 + ["10.0.0.1"] * 5,
        "billing_country": ["US"] * 5 + ["UK"] * 3 + ["NG"] * 2,
        "shipping_country": ["US"] * 5 + ["UK"] * 3 + ["US"] * 2,
        "product_id": ["electronics"] * 10,
        "is_fraud": [False] * 8 + [True] * 2,
        "fraud_pattern": ["legitimate"] * 8 + ["stolen_payment"] * 2,
    })

    return customers, devices, transactions


class TestFeatureBuilder:
    def test_feature_count(self):
        """Should produce exactly 31 features."""
        feature_cols = get_feature_columns()
        assert len(feature_cols) == 31

    def test_build_features_no_nan(self):
        """Built features should have no NaN values."""
        customers, devices, transactions = _make_test_data()
        result = build_features(transactions, customers, devices)
        feature_cols = get_feature_columns()
        for col in feature_cols:
            assert col in result.columns, f"Missing feature column: {col}"
            assert result[col].isna().sum() == 0, f"NaN found in feature: {col}"

    def test_feature_ranges(self):
        """Features should be in expected ranges."""
        customers, devices, transactions = _make_test_data()
        result = build_features(transactions, customers, devices)

        assert (result["hour"] >= 0).all() and (result["hour"] <= 23).all()
        assert (result["day_of_week"] >= 0).all() and (result["day_of_week"] <= 6).all()
        assert result["is_weekend"].isin([0, 1]).all()
        assert result["billing_shipping_mismatch"].isin([0, 1]).all()
        assert result["customer_country_mismatch"].isin([0, 1]).all()
        assert result["new_device"].isin([0, 1]).all()
        assert result["new_ip"].isin([0, 1]).all()
        assert result["new_payment_method"].isin([0, 1]).all()

    def test_customer_transaction_count_is_point_in_time(self):
        """
        Customer transaction count should NOT include the current transaction.
        This is the core leakage prevention test.
        """
        customers, devices, transactions = _make_test_data()
        result = build_features(transactions, customers, devices)

        # First transaction for customer c1 should have count = 0
        c1_first = result[result["customer_id"] == "c1"].iloc[0]
        assert c1_first["customer_transaction_count"] == 0

        # Second transaction should have count = 1
        c1_second = result[result["customer_id"] == "c1"].iloc[1]
        assert c1_second["customer_transaction_count"] == 1


class TestSingleTransactionFeatures:
    def test_single_transaction(self):
        """build_single_transaction_features should return all feature columns."""
        customers, devices, transactions = _make_test_data()

        txn = {
            "customer_id": "c1",
            "amount": 500,
            "payment_method": "credit_card",
            "device_id": "d1",
            "ip_address": "192.168.1.1",
            "billing_country": "US",
            "shipping_country": "US",
            "timestamp": datetime(2024, 1, 15),
        }

        features = build_single_transaction_features(txn, transactions, customers, devices)
        feature_cols = get_feature_columns()

        for col in feature_cols:
            assert col in features, f"Missing feature: {col}"
