"""
SignalX — Synthetic Customer Generator

Generates realistic merchant customer profiles with varied:
- Account tenure (1 day to 5 years)
- Country distribution (weighted toward US/UK/CA/IN)
- Spend patterns (power-law distribution for lifetime value)
"""

import numpy as np
import pandas as pd
from datetime import datetime, timedelta
import uuid


# Weighted country distribution
COUNTRIES = ["US", "UK", "CA", "IN", "DE", "FR", "AU", "BR", "JP", "NG", "RU", "CN", "MX", "KR", "ZA"]
COUNTRY_WEIGHTS = [0.35, 0.12, 0.10, 0.08, 0.06, 0.05, 0.04, 0.04, 0.03, 0.03, 0.02, 0.02, 0.02, 0.02, 0.02]


def generate_customers(
    n_customers: int = 10000,
    start_date: datetime = datetime(2024, 1, 1),
    end_date: datetime = datetime(2024, 12, 31),
    seed: int = 42,
) -> pd.DataFrame:
    """
    Generate synthetic customer profiles.

    Args:
        n_customers: Number of customers to generate.
        start_date: Earliest possible account creation date.
        end_date: Latest possible account creation date.
        seed: Random seed for reproducibility.

    Returns:
        DataFrame with customer profiles.
    """
    rng = np.random.default_rng(seed)

    # Generate account creation dates (more recent accounts are more common)
    total_days = (end_date - start_date).days
    # Use beta distribution to skew toward earlier dates (more established customers)
    day_offsets = rng.beta(2, 5, size=n_customers) * total_days
    created_dates = [start_date + timedelta(days=int(d)) for d in day_offsets]

    # Generate countries
    countries = rng.choice(COUNTRIES, size=n_customers, p=COUNTRY_WEIGHTS)

    # Generate lifetime values using a power-law distribution
    # Most customers are low-value; few are high-value
    lifetime_values = rng.pareto(1.5, size=n_customers) * 100
    lifetime_values = np.clip(lifetime_values, 10, 500000)

    # Generate customer IDs
    customer_ids = [f"cust_{i:06d}" for i in range(n_customers)]

    df = pd.DataFrame({
        "id": customer_ids,
        "created_at": created_dates,
        "country": countries,
        "lifetime_value": np.round(lifetime_values, 2),
        # These will be computed from actual transaction data later
        "transaction_count": 0,
        "average_transaction": 0.0,
        "return_count": 0,
        "return_rate": 0.0,
        "chargeback_count": 0,
        "chargeback_rate": 0.0,
    })

    return df
