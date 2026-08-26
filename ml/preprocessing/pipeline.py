"""
SignalX — Data Preprocessing Pipeline

Loads raw CSV data and prepares it for feature engineering.
Handles temporal splitting with strict train/validation/test boundaries.
"""

import pandas as pd
import numpy as np
import os
from typing import Tuple, Dict
from ml.config import DATA_DIR, TRAIN_MONTHS, VALIDATION_MONTHS, TEST_MONTHS


def load_data(data_dir: str = DATA_DIR) -> Dict[str, pd.DataFrame]:
    """
    Load all CSV datasets.

    Returns:
        Dictionary of DataFrames keyed by name.
    """
    data = {}
    for name in ["customers", "transactions", "devices", "returns", "chargebacks"]:
        path = os.path.join(data_dir, f"{name}.csv")
        if os.path.exists(path):
            df = pd.read_csv(path)
            # Parse datetime columns
            for col in df.columns:
                if col in ("timestamp", "created_at", "first_seen"):
                    df[col] = pd.to_datetime(df[col])
            data[name] = df
            print(f"  Loaded {name}: {len(df):,} rows")
        else:
            print(f"  Warning: {path} not found, skipping")

    return data


def temporal_split(
    transactions_df: pd.DataFrame,
) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    """
    Split transactions temporally into train/validation/test sets.

    Uses month boundaries to prevent any future data leakage.

    Args:
        transactions_df: Full transaction DataFrame with 'timestamp' column.

    Returns:
        Tuple of (train_df, val_df, test_df).
    """
    df = transactions_df.copy()
    df["month"] = df["timestamp"].dt.month

    train_df = df[df["month"].isin(TRAIN_MONTHS)].copy()
    val_df = df[df["month"].isin(VALIDATION_MONTHS)].copy()
    test_df = df[df["month"].isin(TEST_MONTHS)].copy()

    # Drop the helper column
    train_df.drop(columns=["month"], inplace=True)
    val_df.drop(columns=["month"], inplace=True)
    test_df.drop(columns=["month"], inplace=True)

    print(f"\n  Temporal Split:")
    print(f"    Train (months {TRAIN_MONTHS}):      {len(train_df):>8,} txns, fraud rate: {train_df['is_fraud'].mean():.2%}")
    print(f"    Validation (months {VALIDATION_MONTHS}): {len(val_df):>8,} txns, fraud rate: {val_df['is_fraud'].mean():.2%}")
    print(f"    Test (months {TEST_MONTHS}):     {len(test_df):>8,} txns, fraud rate: {test_df['is_fraud'].mean():.2%}")

    return train_df, val_df, test_df
