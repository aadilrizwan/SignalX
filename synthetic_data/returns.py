"""
SignalX — Synthetic Returns Generator

Generates return records with two populations:
1. Normal returns: Low frequency, reasonable reasons, 7-30 day return window
2. Return abuse: High frequency, fast returns, suspicious patterns (Pattern 6)
"""

import numpy as np
import pandas as pd
from datetime import timedelta


RETURN_REASONS = [
    "defective_product",
    "wrong_item",
    "not_as_described",
    "changed_mind",
    "too_small",
    "too_large",
    "arrived_late",
    "duplicate_order",
    "better_price_found",
    "no_longer_needed",
]

ABUSE_REASONS = [
    "changed_mind",
    "not_as_described",
    "better_price_found",
    "no_longer_needed",
]


def generate_returns(
    transactions_df: pd.DataFrame,
    customers_df: pd.DataFrame,
    normal_return_rate: float = 0.08,
    abuse_customer_fraction: float = 0.02,
    abuse_return_rate: float = 0.70,
    seed: int = 42,
) -> pd.DataFrame:
    """
    Generate synthetic return records.

    Args:
        transactions_df: Transaction records.
        customers_df: Customer profiles.
        normal_return_rate: Fraction of transactions that get returned normally.
        abuse_customer_fraction: Fraction of customers who are return abusers.
        abuse_return_rate: Return rate for abusive customers.
        seed: Random seed.

    Returns:
        DataFrame with return records.
    """
    rng = np.random.default_rng(seed)

    # Identify return abuse customers
    n_abuse = max(int(len(customers_df) * abuse_customer_fraction), 5)
    abuse_customer_ids = set(
        rng.choice(customers_df["id"].values, size=n_abuse, replace=False)
    )

    records = []
    return_counter = 0

    for _, txn in transactions_df.iterrows():
        cid = txn["customer_id"]
        is_abuser = cid in abuse_customer_ids

        if is_abuser:
            should_return = rng.random() < abuse_return_rate
        else:
            should_return = rng.random() < normal_return_rate

        if should_return:
            if is_abuser:
                # Fast returns, often full refund
                days_after = int(rng.integers(1, 5))
                reason = rng.choice(ABUSE_REASONS)
                refund_fraction = rng.uniform(0.90, 1.00)
            else:
                # Normal returns
                days_after = int(rng.integers(3, 30))
                reason = rng.choice(RETURN_REASONS)
                refund_fraction = rng.uniform(0.70, 1.00)

            txn_ts = txn["timestamp"]
            if isinstance(txn_ts, str):
                txn_ts = pd.to_datetime(txn_ts)

            records.append({
                "id": f"ret_{return_counter:06d}",
                "transaction_id": txn["id"],
                "customer_id": cid,
                "timestamp": txn_ts + timedelta(days=days_after),
                "reason": reason,
                "refund_amount": round(txn["amount"] * refund_fraction, 2),
                "days_after_purchase": days_after,
            })
            return_counter += 1

    return pd.DataFrame(records)
