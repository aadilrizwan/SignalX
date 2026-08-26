"""
SignalX — Fraud Pattern Injector

Injects 6 realistic fraud patterns into legitimate transaction data.
Each pattern has distinct behavioral signatures that the ML model should learn.

Patterns:
1. Stolen Payment — New device + unusual amount + unusual location
2. Payment Testing — Multiple low-value transactions in short window
3. Account Abuse — Multiple accounts on same device/IP
4. Fraud Ring — 5+ customers sharing device/IP/address
5. High-Value Anomaly — Sudden spend 50-75× normal
6. Return Abuse — High return frequency (handled in returns generator)
"""

import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import Tuple


def inject_fraud_patterns(
    transactions_df: pd.DataFrame,
    customers_df: pd.DataFrame,
    devices_df: pd.DataFrame,
    target_fraud_rate: float = 0.04,
    seed: int = 42,
) -> Tuple[pd.DataFrame, pd.DataFrame, dict]:
    """
    Inject fraud patterns into the transaction dataset.

    Args:
        transactions_df: Legitimate transactions.
        customers_df: Customer profiles.
        devices_df: Device records.
        target_fraud_rate: Target overall fraud rate (3-5%).
        seed: Random seed.

    Returns:
        Tuple of (modified_transactions, fraud_metadata_dict, pattern_stats).
    """
    rng = np.random.default_rng(seed)
    n_total = len(transactions_df)
    n_fraud_target = int(n_total * target_fraud_rate)

    # Allocate fraud budget across patterns
    pattern_allocation = {
        "stolen_payment": 0.30,
        "payment_testing": 0.20,
        "account_abuse": 0.15,
        "fraud_ring": 0.15,
        "high_value_anomaly": 0.20,
    }

    all_fraud_txns = []
    pattern_stats = {}
    fraud_customer_set = set()
    device_ids = devices_df["id"].values
    txn_id_counter = n_total  # Start IDs after existing transactions


    # Pattern 1: Stolen Payment Behavior
    # New device + unusual amount + unusual location

    n_stolen = int(n_fraud_target * pattern_allocation["stolen_payment"])
    stolen_customers = rng.choice(
        customers_df["id"].values,
        size=min(n_stolen, len(customers_df)),
        replace=False
    )

    for cid in stolen_customers:
        cust = customers_df[customers_df["id"] == cid].iloc[0]
        # Use a device NOT in customer's history
        new_device = f"dev_fraud_{rng.integers(100000, 999999)}"
        # Unusual amount: 5-20× customer average or random high
        amount = rng.uniform(500, 15000)
        # Different country
        fraud_country = rng.choice(["NG", "RU", "CN", "BR", "RO"])
        # Random timestamp in the data period
        ts = _random_timestamp(rng, transactions_df)

        all_fraud_txns.append({
            "id": f"txn_{txn_id_counter:07d}",
            "customer_id": cid,
            "merchant_id": "merchant_001",
            "timestamp": ts,
            "amount": round(amount, 2),
            "currency": "USD",
            "payment_method": rng.choice(["credit_card", "debit_card"]),
            "device_id": new_device,
            "ip_address": f"10.{rng.integers(1,255)}.{rng.integers(1,255)}.{rng.integers(1,255)}",
            "billing_country": fraud_country,
            "shipping_country": rng.choice(["US", "UK", fraud_country]),
            "product_id": rng.choice(["electronics", "jewelry", "automotive"]),
            "is_fraud": True,
            "fraud_pattern": "stolen_payment",
        })
        txn_id_counter += 1
        fraud_customer_set.add(cid)

    pattern_stats["stolen_payment"] = len(stolen_customers)


    # Pattern 2: Payment Testing
    # Multiple low-value transactions in short window (card testing)

    n_testing_groups = int(n_fraud_target * pattern_allocation["payment_testing"]) // 5
    n_testing_groups = max(n_testing_groups, 1)

    testing_count = 0
    for _ in range(n_testing_groups):
        cid = rng.choice(customers_df["id"].values)
        base_ts = _random_timestamp(rng, transactions_df)
        test_device = f"dev_fraud_{rng.integers(100000, 999999)}"
        test_ip = f"10.{rng.integers(1,255)}.{rng.integers(1,255)}.{rng.integers(1,255)}"

        # 4-8 small transactions within 10 minutes
        n_tests = rng.integers(4, 9)
        for j in range(n_tests):
            ts = base_ts + timedelta(seconds=int(rng.integers(10, 600)))
            amount = round(rng.uniform(0.50, 5.00), 2)  # Micro-transactions

            all_fraud_txns.append({
                "id": f"txn_{txn_id_counter:07d}",
                "customer_id": cid,
                "merchant_id": "merchant_001",
                "timestamp": ts,
                "amount": amount,
                "currency": "USD",
                "payment_method": "credit_card",
                "device_id": test_device,
                "ip_address": test_ip,
                "billing_country": rng.choice(["US", "UK", "RU", "NG"]),
                "shipping_country": "US",
                "product_id": "electronics",
                "is_fraud": True,
                "fraud_pattern": "payment_testing",
            })
            txn_id_counter += 1
            testing_count += 1
        fraud_customer_set.add(cid)

    pattern_stats["payment_testing"] = testing_count


    # Pattern 3: Account Abuse
    # Multiple accounts using the same device/IP

    n_abuse_groups = int(n_fraud_target * pattern_allocation["account_abuse"]) // 3
    n_abuse_groups = max(n_abuse_groups, 1)

    abuse_count = 0
    for _ in range(n_abuse_groups):
        shared_device = f"dev_fraud_{rng.integers(100000, 999999)}"
        shared_ip = f"10.{rng.integers(1,255)}.{rng.integers(1,255)}.{rng.integers(1,255)}"
        # 3-5 different customers using the same device
        n_abusers = rng.integers(3, 6)
        abuser_ids = rng.choice(customers_df["id"].values, size=n_abusers, replace=False)

        for cid in abuser_ids:
            ts = _random_timestamp(rng, transactions_df)
            amount = round(rng.uniform(200, 3000), 2)

            all_fraud_txns.append({
                "id": f"txn_{txn_id_counter:07d}",
                "customer_id": cid,
                "merchant_id": "merchant_001",
                "timestamp": ts,
                "amount": amount,
                "currency": "USD",
                "payment_method": rng.choice(["credit_card", "debit_card"]),
                "device_id": shared_device,
                "ip_address": shared_ip,
                "billing_country": rng.choice(["US", "UK"]),
                "shipping_country": rng.choice(["US", "UK"]),
                "product_id": rng.choice(["electronics", "jewelry"]),
                "is_fraud": True,
                "fraud_pattern": "account_abuse",
            })
            txn_id_counter += 1
            abuse_count += 1
            fraud_customer_set.add(cid)

    pattern_stats["account_abuse"] = abuse_count


    # Pattern 4: Fraud Ring
    # 5+ customers sharing device/IP/address with coordinated purchases

    n_rings = max(int(n_fraud_target * pattern_allocation["fraud_ring"]) // 8, 1)

    ring_count = 0
    ring_metadata = []
    for ring_idx in range(n_rings):
        ring_device = f"dev_ring_{ring_idx:04d}"
        ring_ip = f"10.99.{ring_idx}.{rng.integers(1, 255)}"
        ring_address = f"ring_address_{ring_idx}"

        # 5-10 members per ring
        n_members = rng.integers(5, 11)
        ring_members = rng.choice(customers_df["id"].values, size=n_members, replace=False)
        base_ts = _random_timestamp(rng, transactions_df)

        for member_cid in ring_members:
            # Coordinated purchases within 48 hours
            n_ring_txn = rng.integers(1, 4)
            for _ in range(n_ring_txn):
                ts = base_ts + timedelta(hours=int(rng.integers(0, 48)))
                amount = round(rng.uniform(500, 5000), 2)

                all_fraud_txns.append({
                    "id": f"txn_{txn_id_counter:07d}",
                    "customer_id": member_cid,
                    "merchant_id": "merchant_001",
                    "timestamp": ts,
                    "amount": amount,
                    "currency": "USD",
                    "payment_method": "credit_card",
                    "device_id": ring_device,
                    "ip_address": ring_ip,
                    "billing_country": "US",
                    "shipping_country": "US",
                    "product_id": rng.choice(["electronics", "jewelry", "automotive"]),
                    "is_fraud": True,
                    "fraud_pattern": "fraud_ring",
                })
                txn_id_counter += 1
                ring_count += 1
            fraud_customer_set.add(member_cid)

        ring_metadata.append({
            "ring_id": ring_idx,
            "device": ring_device,
            "ip": ring_ip,
            "members": ring_members.tolist(),
            "n_transactions": ring_count,
        })

    pattern_stats["fraud_ring"] = ring_count


    # Pattern 5: High-Value Anomaly
    # Customer historically spends $50 but suddenly spends $3,000+

    n_anomaly = int(n_fraud_target * pattern_allocation["high_value_anomaly"])
    # Pick customers with low average transaction
    low_spenders = customers_df.nsmallest(max(n_anomaly * 3, 100), "lifetime_value")
    anomaly_customers = rng.choice(low_spenders["id"].values, size=min(n_anomaly, len(low_spenders)), replace=False)

    for cid in anomaly_customers:
        ts = _random_timestamp(rng, transactions_df)
        # 50-75× normal spend
        amount = round(rng.uniform(3000, 25000), 2)

        all_fraud_txns.append({
            "id": f"txn_{txn_id_counter:07d}",
            "customer_id": cid,
            "merchant_id": "merchant_001",
            "timestamp": ts,
            "amount": amount,
            "currency": "USD",
            "payment_method": rng.choice(["credit_card", "bank_transfer"]),
            "device_id": rng.choice(devices_df["id"].values),
            "ip_address": f"10.{rng.integers(1,255)}.{rng.integers(1,255)}.{rng.integers(1,255)}",
            "billing_country": "US",
            "shipping_country": rng.choice(["US", "UK", "DE"]),
            "product_id": rng.choice(["electronics", "jewelry"]),
            "is_fraud": True,
            "fraud_pattern": "high_value_anomaly",
        })
        txn_id_counter += 1
        fraud_customer_set.add(cid)

    pattern_stats["high_value_anomaly"] = len(anomaly_customers)


    # Combine fraud with legitimate transactions

    fraud_df = pd.DataFrame(all_fraud_txns)
    if "fraud_pattern" not in transactions_df.columns:
        transactions_df = transactions_df.copy()
        transactions_df["fraud_pattern"] = "legitimate"

    combined = pd.concat([transactions_df, fraud_df], ignore_index=True)
    combined = combined.sort_values("timestamp").reset_index(drop=True)
    # Re-assign sequential IDs
    combined["id"] = [f"txn_{i:07d}" for i in range(len(combined))]

    total_fraud = combined["is_fraud"].sum()
    actual_fraud_rate = total_fraud / len(combined)

    pattern_stats["total_fraud"] = int(total_fraud)
    pattern_stats["total_transactions"] = len(combined)
    pattern_stats["actual_fraud_rate"] = round(actual_fraud_rate, 4)
    pattern_stats["fraud_customers"] = len(fraud_customer_set)

    return combined, pattern_stats


def _random_timestamp(rng, transactions_df: pd.DataFrame) -> datetime:
    """Generate a random timestamp within the transaction data range."""
    min_ts = transactions_df["timestamp"].min()
    max_ts = transactions_df["timestamp"].max()
    if isinstance(min_ts, str):
        min_ts = pd.to_datetime(min_ts)
        max_ts = pd.to_datetime(max_ts)
    total_seconds = int((max_ts - min_ts).total_seconds())
    offset = rng.integers(0, max(total_seconds, 1))
    return min_ts + timedelta(seconds=int(offset))
