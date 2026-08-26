"""
SignalX — Synthetic Chargeback Generator

Generates chargeback records that correlate with:
- Fraudulent transactions (high probability)
- High-value legitimate transactions (low probability)
"""

import numpy as np
import pandas as pd
from datetime import timedelta

CHARGEBACK_REASONS = [
    "unauthorized_transaction",
    "product_not_received",
    "product_not_as_described",
    "duplicate_charge",
    "subscription_cancelled",
    "credit_not_processed",
    "merchandise_defective",
]

CHARGEBACK_STATUSES = ["OPEN", "WON", "LOST", "PENDING"]


def generate_chargebacks(
    transactions_df: pd.DataFrame,
    fraud_chargeback_rate: float = 0.40,
    legit_chargeback_rate: float = 0.005,
    seed: int = 42,
) -> pd.DataFrame:
    """
    Generate synthetic chargeback records.

    Chargebacks are much more likely for fraudulent transactions.

    Args:
        transactions_df: Transaction records with is_fraud labels.
        fraud_chargeback_rate: Probability of chargeback for fraud transactions.
        legit_chargeback_rate: Probability of chargeback for legitimate transactions.
        seed: Random seed.

    Returns:
        DataFrame with chargeback records.
    """
    rng = np.random.default_rng(seed)
    records = []
    cb_counter = 0

    for _, txn in transactions_df.iterrows():
        is_fraud = txn.get("is_fraud", False)

        if is_fraud:
            should_chargeback = rng.random() < fraud_chargeback_rate
        else:
            should_chargeback = rng.random() < legit_chargeback_rate

        if should_chargeback:
            txn_ts = txn["timestamp"]
            if isinstance(txn_ts, str):
                txn_ts = pd.to_datetime(txn_ts)

            # Chargebacks typically come 15-90 days after transaction
            days_after = int(rng.integers(15, 91))

            if is_fraud:
                reason = rng.choice(["unauthorized_transaction", "product_not_received"])
                status = rng.choice(["OPEN", "LOST", "PENDING"], p=[0.3, 0.5, 0.2])
            else:
                reason = rng.choice(CHARGEBACK_REASONS)
                status = rng.choice(CHARGEBACK_STATUSES, p=[0.2, 0.4, 0.2, 0.2])

            records.append({
                "id": f"cb_{cb_counter:06d}",
                "transaction_id": txn["id"],
                "customer_id": txn["customer_id"],
                "timestamp": txn_ts + timedelta(days=days_after),
                "reason": reason,
                "status": status,
            })
            cb_counter += 1

    return pd.DataFrame(records)
