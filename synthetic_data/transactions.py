"""
SignalX — Synthetic Transaction Generator

Generates realistic legitimate transaction data with:
- Time-of-day and day-of-week patterns
- Amount distributions that vary by payment method
- Consistent customer-device and customer-IP assignments
- Temporal span of 12 months for proper train/val/test splitting
"""

import numpy as np
import pandas as pd
from datetime import datetime, timedelta


PAYMENT_METHODS = ["credit_card", "debit_card", "digital_wallet", "bank_transfer", "buy_now_pay_later"]
PAYMENT_WEIGHTS = [0.40, 0.25, 0.20, 0.10, 0.05]

# Amount distribution parameters by payment method (mean, std)
AMOUNT_PARAMS = {
    "credit_card": (150.0, 200.0),
    "debit_card": (80.0, 100.0),
    "digital_wallet": (50.0, 60.0),
    "bank_transfer": (500.0, 800.0),
    "buy_now_pay_later": (200.0, 150.0),
}

PRODUCT_CATEGORIES = [
    "electronics", "clothing", "home_garden", "sports", "books",
    "toys", "beauty", "food", "automotive", "jewelry",
]


def generate_transactions(
    customers_df: pd.DataFrame,
    devices_df: pd.DataFrame,
    n_transactions: int = 50000,
    n_ips: int = 8000,
    start_date: datetime = datetime(2024, 1, 1),
    end_date: datetime = datetime(2024, 12, 31),
    seed: int = 42,
) -> pd.DataFrame:
    """
    Generate synthetic legitimate transactions.

    Each customer is assigned 1-3 primary devices and 1-2 primary IPs.
    Transactions follow realistic temporal patterns.

    Args:
        customers_df: Customer profiles DataFrame.
        devices_df: Device fingerprints DataFrame.
        n_transactions: Total number of transactions to generate.
        n_ips: Number of unique IP addresses.
        start_date: Start of transaction period.
        end_date: End of transaction period.
        seed: Random seed.

    Returns:
        DataFrame with transaction records (all legitimate, fraud injected separately).
    """
    rng = np.random.default_rng(seed)
    customer_ids = customers_df["id"].values
    device_ids = devices_df["id"].values
    n_customers = len(customer_ids)

    # Generate IP addresses
    ip_addresses = [f"192.168.{rng.integers(1, 255)}.{rng.integers(1, 255)}" for _ in range(n_ips)]

    # Assign primary devices to customers (1-3 devices per customer)
    customer_devices = {}
    customer_ips = {}
    customer_countries = dict(zip(customers_df["id"], customers_df["country"]))

    for cid in customer_ids:
        n_dev = rng.integers(1, 4)  # 1-3 devices
        customer_devices[cid] = rng.choice(device_ids, size=min(n_dev, len(device_ids)), replace=False).tolist()
        n_ip = rng.integers(1, 3)   # 1-2 IPs
        customer_ips[cid] = rng.choice(ip_addresses, size=min(n_ip, len(ip_addresses)), replace=False).tolist()

    # Distribute transactions across customers (power-law: some customers transact more)
    customer_activity = rng.pareto(1.0, size=n_customers)
    customer_activity = customer_activity / customer_activity.sum()
    txn_per_customer = np.round(customer_activity * n_transactions).astype(int)
    txn_per_customer = np.maximum(txn_per_customer, 1)  # Every customer has at least 1 txn

    # Adjust to hit target count
    diff = n_transactions - txn_per_customer.sum()
    if diff > 0:
        indices = rng.choice(n_customers, size=diff, replace=True)
        for idx in indices:
            txn_per_customer[idx] += 1
    elif diff < 0:
        indices = rng.choice(np.where(txn_per_customer > 1)[0], size=abs(diff), replace=True)
        for idx in indices:
            txn_per_customer[idx] -= 1

    total_days = (end_date - start_date).days
    records = []

    txn_counter = 0
    for i, cid in enumerate(customer_ids):
        n_txn = txn_per_customer[i]
        country = customer_countries[cid]
        devices = customer_devices[cid]
        ips = customer_ips[cid]

        # Customer's typical spend (derived from lifetime value)
        ltv = customers_df.iloc[i]["lifetime_value"]
        avg_spend = max(ltv / max(n_txn, 1), 10.0)
        avg_spend = min(avg_spend, 5000.0)

        for _ in range(n_txn):
            # Generate timestamp with realistic patterns
            day_offset = rng.uniform(0, total_days)
            # Time of day: peak at 10-14h and 18-21h
            hour = _sample_hour(rng)
            minute = rng.integers(0, 60)
            second = rng.integers(0, 60)
            ts = start_date + timedelta(days=int(day_offset), hours=hour, minutes=int(minute), seconds=int(second))

            # Payment method
            pm = rng.choice(PAYMENT_METHODS, p=PAYMENT_WEIGHTS)
            mean_amt, std_amt = AMOUNT_PARAMS[pm]

            # Amount: blend customer average with payment method distribution
            amount = rng.lognormal(np.log(max(avg_spend * 0.5 + mean_amt * 0.5, 1)), 0.6)
            amount = max(round(amount, 2), 0.50)  # Minimum $0.50
            amount = min(amount, 25000.0)  # Cap at $25K for legitimate

            # Device and IP (use customer's primary, occasionally a new one)
            device = rng.choice(devices)
            ip = rng.choice(ips)

            # Product
            product = rng.choice(PRODUCT_CATEGORIES)

            # Shipping country: usually same as billing
            billing_country = country
            shipping_country = country if rng.random() > 0.05 else rng.choice(["US", "UK", "CA", "DE", "FR"])

            records.append({
                "id": f"txn_{txn_counter:07d}",
                "customer_id": cid,
                "merchant_id": "merchant_001",
                "timestamp": ts,
                "amount": amount,
                "currency": "USD",
                "payment_method": pm,
                "device_id": device,
                "ip_address": ip,
                "billing_country": billing_country,
                "shipping_country": shipping_country,
                "product_id": product,
                "is_fraud": False,
            })
            txn_counter += 1

    df = pd.DataFrame(records)
    # Sort by timestamp for temporal ordering
    df = df.sort_values("timestamp").reset_index(drop=True)
    # Re-assign sequential IDs after sorting
    df["id"] = [f"txn_{i:07d}" for i in range(len(df))]

    return df


def _sample_hour(rng) -> int:
    """Sample hour with bimodal peak at 10-14 and 18-21."""
    if rng.random() < 0.6:
        # Business hours peak
        return int(np.clip(rng.normal(12, 3), 0, 23))
    else:
        # Evening peak
        return int(np.clip(rng.normal(20, 2), 0, 23))
