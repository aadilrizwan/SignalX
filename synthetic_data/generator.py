"""
SignalX — Synthetic Data Generator (Main Orchestrator)

Generates the complete synthetic merchant dataset:
1. Customers → Devices → Transactions (legitimate)
2. Inject fraud patterns
3. Generate returns and chargebacks
4. Update aggregate statistics
5. Save to CSV

Usage:
    python -m synthetic_data.generator
    python -m synthetic_data.generator --customers 100000 --transactions 500000
"""

import argparse
import os
import sys
import time
import numpy as np
import pandas as pd
from pathlib import Path

# Add project root to path
project_root = str(Path(__file__).parent.parent)
if project_root not in sys.path:
    sys.path.insert(0, project_root)

from synthetic_data.customers import generate_customers
from synthetic_data.devices import generate_devices
from synthetic_data.transactions import generate_transactions
from synthetic_data.fraud_patterns import inject_fraud_patterns
from synthetic_data.returns import generate_returns
from synthetic_data.chargebacks import generate_chargebacks


def update_aggregate_stats(
    customers_df: pd.DataFrame,
    transactions_df: pd.DataFrame,
    devices_df: pd.DataFrame,
    returns_df: pd.DataFrame,
    chargebacks_df: pd.DataFrame,
) -> tuple:
    """Update aggregate statistics on customers and devices from transaction data."""

    # --- Customer aggregates ---
    txn_stats = transactions_df.groupby("customer_id").agg(
        transaction_count=("id", "count"),
        lifetime_value=("amount", "sum"),
        average_transaction=("amount", "mean"),
    ).reset_index()

    customers_df = customers_df.copy()
    customers_df = customers_df.drop(columns=["transaction_count", "lifetime_value", "average_transaction"], errors="ignore")
    customers_df = customers_df.merge(txn_stats, left_on="id", right_on="customer_id", how="left")
    customers_df = customers_df.drop(columns=["customer_id"], errors="ignore")
    customers_df["transaction_count"] = customers_df["transaction_count"].fillna(0).astype(int)
    customers_df["lifetime_value"] = customers_df["lifetime_value"].fillna(0).round(2)
    customers_df["average_transaction"] = customers_df["average_transaction"].fillna(0).round(2)

    # Return stats
    if len(returns_df) > 0:
        ret_stats = returns_df.groupby("customer_id").agg(
            return_count=("id", "count"),
        ).reset_index()
        customers_df = customers_df.drop(columns=["return_count", "return_rate"], errors="ignore")
        customers_df = customers_df.merge(ret_stats, left_on="id", right_on="customer_id", how="left")
        customers_df = customers_df.drop(columns=["customer_id"], errors="ignore")
        customers_df["return_count"] = customers_df["return_count"].fillna(0).astype(int)
        customers_df["return_rate"] = np.where(
            customers_df["transaction_count"] > 0,
            customers_df["return_count"] / customers_df["transaction_count"],
            0.0
        )
        customers_df["return_rate"] = customers_df["return_rate"].round(4)
    else:
        customers_df["return_count"] = 0
        customers_df["return_rate"] = 0.0

    # Chargeback stats
    if len(chargebacks_df) > 0:
        cb_stats = chargebacks_df.groupby("customer_id").agg(
            chargeback_count=("id", "count"),
        ).reset_index()
        customers_df = customers_df.drop(columns=["chargeback_count", "chargeback_rate"], errors="ignore")
        customers_df = customers_df.merge(cb_stats, left_on="id", right_on="customer_id", how="left")
        customers_df = customers_df.drop(columns=["customer_id"], errors="ignore")
        customers_df["chargeback_count"] = customers_df["chargeback_count"].fillna(0).astype(int)
        customers_df["chargeback_rate"] = np.where(
            customers_df["transaction_count"] > 0,
            customers_df["chargeback_count"] / customers_df["transaction_count"],
            0.0
        )
        customers_df["chargeback_rate"] = customers_df["chargeback_rate"].round(4)
    else:
        customers_df["chargeback_count"] = 0
        customers_df["chargeback_rate"] = 0.0

    # --- Device aggregates ---
    dev_stats = transactions_df.groupby("device_id").agg(
        transaction_count=("id", "count"),
        customer_count=("customer_id", "nunique"),
        fraud_count=("is_fraud", "sum"),
    ).reset_index()

    devices_df = devices_df.copy()
    devices_df = devices_df.drop(columns=["transaction_count", "customer_count", "fraud_count"], errors="ignore")
    devices_df = devices_df.merge(dev_stats, left_on="id", right_on="device_id", how="left")
    devices_df = devices_df.drop(columns=["device_id"], errors="ignore")
    devices_df["transaction_count"] = devices_df["transaction_count"].fillna(0).astype(int)
    devices_df["customer_count"] = devices_df["customer_count"].fillna(0).astype(int)
    devices_df["fraud_count"] = devices_df["fraud_count"].fillna(0).astype(int)

    # Add fraud-injected devices that weren't in the original device table
    fraud_device_ids = set(transactions_df["device_id"].unique()) - set(devices_df["id"].unique())
    if fraud_device_ids:
        new_devices = []
        for dev_id in fraud_device_ids:
            dev_txns = transactions_df[transactions_df["device_id"] == dev_id]
            new_devices.append({
                "id": dev_id,
                "first_seen": dev_txns["timestamp"].min(),
                "transaction_count": len(dev_txns),
                "customer_count": dev_txns["customer_id"].nunique(),
                "fraud_count": int(dev_txns["is_fraud"].sum()),
            })
        devices_df = pd.concat([devices_df, pd.DataFrame(new_devices)], ignore_index=True)

    return customers_df, devices_df


def generate_all(
    n_customers: int = 10000,
    n_transactions: int = 50000,
    n_devices: int = 5000,
    n_ips: int = 8000,
    fraud_rate: float = 0.04,
    output_dir: str = "data",
    seed: int = 42,
) -> dict:
    """
    Generate the complete synthetic dataset.

    Returns:
        Dictionary with DataFrames and statistics.
    """
    print("=" * 60)
    print("  SignalX — Synthetic Data Generator")
    print("=" * 60)
    start_time = time.time()

    os.makedirs(output_dir, exist_ok=True)

    # Step 1: Generate customers
    print(f"\n[1/7] Generating {n_customers:,} customers...")
    customers_df = generate_customers(n_customers=n_customers, seed=seed)
    print(f"  ✓ {len(customers_df):,} customers generated")

    # Step 2: Generate devices
    print(f"\n[2/7] Generating {n_devices:,} devices...")
    devices_df = generate_devices(n_devices=n_devices, seed=seed)
    print(f"  ✓ {len(devices_df):,} devices generated")

    # Step 3: Generate legitimate transactions
    print(f"\n[3/7] Generating {n_transactions:,} legitimate transactions...")
    transactions_df = generate_transactions(
        customers_df=customers_df,
        devices_df=devices_df,
        n_transactions=n_transactions,
        n_ips=n_ips,
        seed=seed,
    )
    print(f"  ✓ {len(transactions_df):,} legitimate transactions generated")

    # Step 4: Inject fraud patterns
    print(f"\n[4/7] Injecting fraud patterns (target rate: {fraud_rate:.1%})...")
    transactions_df, fraud_stats = inject_fraud_patterns(
        transactions_df=transactions_df,
        customers_df=customers_df,
        devices_df=devices_df,
        target_fraud_rate=fraud_rate,
        seed=seed,
    )
    print(f"  ✓ {fraud_stats['total_fraud']:,} fraud transactions injected")
    print(f"  ✓ Actual fraud rate: {fraud_stats['actual_fraud_rate']:.2%}")
    print(f"  ✓ Fraud patterns:")
    for pattern in ["stolen_payment", "payment_testing", "account_abuse", "fraud_ring", "high_value_anomaly"]:
        if pattern in fraud_stats:
            print(f"    - {pattern}: {fraud_stats[pattern]:,} transactions")

    # Step 5: Generate returns
    print(f"\n[5/7] Generating returns...")
    returns_df = generate_returns(
        transactions_df=transactions_df,
        customers_df=customers_df,
        seed=seed,
    )
    print(f"  ✓ {len(returns_df):,} returns generated")

    # Step 6: Generate chargebacks
    print(f"\n[6/7] Generating chargebacks...")
    chargebacks_df = generate_chargebacks(
        transactions_df=transactions_df,
        seed=seed,
    )
    print(f"  ✓ {len(chargebacks_df):,} chargebacks generated")

    # Step 7: Update aggregate statistics
    print(f"\n[7/7] Updating aggregate statistics...")
    customers_df, devices_df = update_aggregate_stats(
        customers_df=customers_df,
        transactions_df=transactions_df,
        devices_df=devices_df,
        returns_df=returns_df,
        chargebacks_df=chargebacks_df,
    )
    print(f"  ✓ Aggregate stats updated")

    # Save to CSV
    print(f"\nSaving to {output_dir}/...")
    customers_df.to_csv(os.path.join(output_dir, "customers.csv"), index=False)
    transactions_df.to_csv(os.path.join(output_dir, "transactions.csv"), index=False)
    devices_df.to_csv(os.path.join(output_dir, "devices.csv"), index=False)
    returns_df.to_csv(os.path.join(output_dir, "returns.csv"), index=False)
    chargebacks_df.to_csv(os.path.join(output_dir, "chargebacks.csv"), index=False)

    elapsed = time.time() - start_time

    # Print summary
    print(f"\n{'=' * 60}")
    print(f"  Generation Complete in {elapsed:.1f}s")
    print(f"{'=' * 60}")
    print(f"  Customers:     {len(customers_df):>10,}")
    print(f"  Transactions:  {len(transactions_df):>10,}")
    print(f"  Devices:       {len(devices_df):>10,}")
    print(f"  Returns:       {len(returns_df):>10,}")
    print(f"  Chargebacks:   {len(chargebacks_df):>10,}")
    print(f"  Fraud Rate:    {fraud_stats['actual_fraud_rate']:>10.2%}")
    print(f"  Output:        {os.path.abspath(output_dir)}")
    print(f"{'=' * 60}\n")

    return {
        "customers": customers_df,
        "transactions": transactions_df,
        "devices": devices_df,
        "returns": returns_df,
        "chargebacks": chargebacks_df,
        "fraud_stats": fraud_stats,
    }


def main():
    parser = argparse.ArgumentParser(description="SignalX Synthetic Data Generator")
    parser.add_argument("--customers", type=int, default=10000, help="Number of customers (default: 10000)")
    parser.add_argument("--transactions", type=int, default=50000, help="Number of transactions (default: 50000)")
    parser.add_argument("--devices", type=int, default=5000, help="Number of devices (default: 5000)")
    parser.add_argument("--ips", type=int, default=8000, help="Number of IP addresses (default: 8000)")
    parser.add_argument("--fraud-rate", type=float, default=0.04, help="Target fraud rate (default: 0.04)")
    parser.add_argument("--output", type=str, default="data", help="Output directory (default: data)")
    parser.add_argument("--seed", type=int, default=42, help="Random seed (default: 42)")

    args = parser.parse_args()

    generate_all(
        n_customers=args.customers,
        n_transactions=args.transactions,
        n_devices=args.devices,
        n_ips=args.ips,
        fraud_rate=args.fraud_rate,
        output_dir=args.output,
        seed=args.seed,
    )


if __name__ == "__main__":
    main()
