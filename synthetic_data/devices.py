"""
SignalX — Synthetic Device Generator

Generates device fingerprints with realistic distributions:
- Most devices belong to a single customer
- Some devices are shared (family, public computers)
- Device age correlates with customer tenure
"""

import numpy as np
import pandas as pd
from datetime import datetime, timedelta


def generate_devices(
    n_devices: int = 5000,
    start_date: datetime = datetime(2024, 1, 1),
    end_date: datetime = datetime(2024, 12, 31),
    seed: int = 42,
) -> pd.DataFrame:
    """
    Generate synthetic device fingerprints.

    Args:
        n_devices: Number of unique devices.
        start_date: Earliest device first-seen date.
        end_date: Latest device first-seen date.
        seed: Random seed for reproducibility.

    Returns:
        DataFrame with device records.
    """
    rng = np.random.default_rng(seed)

    total_days = (end_date - start_date).days
    day_offsets = rng.uniform(0, total_days, size=n_devices)
    first_seen_dates = [start_date + timedelta(days=int(d)) for d in day_offsets]

    device_ids = [f"dev_{i:06d}" for i in range(n_devices)]

    df = pd.DataFrame({
        "id": device_ids,
        "first_seen": first_seen_dates,
        # These aggregate stats are computed after transactions are generated
        "customer_count": 0,
        "transaction_count": 0,
        "fraud_count": 0,
    })

    return df
