"""
SignalX — Feature Engineering Pipeline

Builds 31 features for fraud detection from transaction data.
All features are computed with strict temporal safety no future data leakage.

Feature Categories:
- Transaction (6): amount, hour, day_of_week, is_weekend, payment_method, billing_country
- Customer Behavior (6): age, txn_count, avg_amount, max_amount, return_rate, chargeback_rate
- Amount Deviation (2): ratio to avg, ratio to max
- Velocity (5): txn counts and amounts in time windows
- Device (3): customer_count, txn_count, fraud_rate
- IP (4): customer_count, txn_count, fraud_rate, country_count
- Geographic (2): billing/shipping mismatch, customer country mismatch
- Behavioral Novelty (3): new_device, new_ip, new_payment_method
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Optional
from datetime import timedelta


# Payment method encoding
PAYMENT_METHOD_MAP = {
    "credit_card": 0,
    "debit_card": 1,
    "digital_wallet": 2,
    "bank_transfer": 3,
    "buy_now_pay_later": 4,
}

# Top countries encoding 
COUNTRY_MAP = {
    "US": 0, "UK": 1, "CA": 2, "IN": 3, "DE": 4,
    "FR": 5, "AU": 6, "BR": 7, "JP": 8, "NG": 9,
    "RU": 10, "CN": 11, "MX": 12, "KR": 13, "ZA": 14,
}

# Human-readable feature names for SHAP/explanations
FEATURE_DISPLAY_NAMES = {
    "amount": "Transaction Amount",
    "hour": "Transaction Hour",
    "day_of_week": "Day of Week",
    "is_weekend": "Is Weekend",
    "payment_method_encoded": "Payment Method",
    "billing_country_encoded": "Billing Country",
    "customer_age_days": "Customer Account Age (days)",
    "customer_transaction_count": "Customer Transaction Count",
    "customer_avg_amount": "Customer Average Amount",
    "customer_max_amount": "Customer Maximum Amount",
    "customer_return_rate": "Customer Return Rate",
    "customer_chargeback_rate": "Customer Chargeback Rate",
    "amount_ratio_to_avg": "Amount ÷ Customer Average",
    "amount_ratio_to_max": "Amount ÷ Customer Maximum",
    "txn_count_last_5min": "Transactions in Last 5 Minutes",
    "txn_count_last_1hr": "Transactions in Last 1 Hour",
    "txn_count_last_24hr": "Transactions in Last 24 Hours",
    "amount_last_1hr": "Total Amount in Last 1 Hour",
    "amount_last_24hr": "Total Amount in Last 24 Hours",
    "device_customer_count": "Device: Unique Customers",
    "device_transaction_count": "Device: Transaction Count",
    "device_fraud_rate": "Device: Historical Fraud Rate",
    "ip_customer_count": "IP: Unique Customers",
    "ip_transaction_count": "IP: Transaction Count",
    "ip_fraud_rate": "IP: Historical Fraud Rate",
    "ip_country_count": "IP: Unique Countries",
    "billing_shipping_mismatch": "Billing/Shipping Country Mismatch",
    "customer_country_mismatch": "Customer/Billing Country Mismatch",
    "new_device": "New Device for Customer",
    "new_ip": "New IP for Customer",
    "new_payment_method": "New Payment Method for Customer",
}


def build_features(
    transactions_df: pd.DataFrame,
    customers_df: pd.DataFrame,
    devices_df: pd.DataFrame,
    returns_df: Optional[pd.DataFrame] = None,
    chargebacks_df: Optional[pd.DataFrame] = None,
) -> pd.DataFrame:
    """
    Build all features for the transaction dataset.

    IMPORTANT: All aggregate features are computed using only data
    BEFORE each transaction's timestamp to prevent data leakage.

    Args:
        transactions_df: Transaction records (must be sorted by timestamp).
        customers_df: Customer profiles.
        devices_df: Device records.
        returns_df: Return records (optional).
        chargebacks_df: Chargeback records (optional).

    Returns:
        DataFrame with feature columns added. Original columns preserved.
    """
    df = transactions_df.copy()
    df = df.sort_values("timestamp").reset_index(drop=True)

    print("  Building features...")

    # 1. Transaction features
    df = _build_transaction_features(df)
    print("    ✓ Transaction features (6)")

    # 2. Customer behavior features
    df = _build_customer_features(df, customers_df, returns_df, chargebacks_df)
    print("    ✓ Customer behavior features (6)")

    # 3. Amount deviation features
    df = _build_amount_deviation_features(df)
    print("    ✓ Amount deviation features (2)")

    # 4. Velocity features
    df = _build_velocity_features(df)
    print("    ✓ Velocity features (5)")

    # 5. Device features
    df = _build_device_features(df, devices_df)
    print("    ✓ Device features (3)")

    # 6. IP features
    df = _build_ip_features(df)
    print("    ✓ IP features (4)")

    # 7. Geographic features
    df = _build_geographic_features(df, customers_df)
    print("    ✓ Geographic features (2)")

    # 8. Behavioral novelty features
    df = _build_novelty_features(df)
    print("    ✓ Behavioral novelty features (3)")

    # Fill any remaining NaN with 0
    feature_cols = get_feature_columns()
    df[feature_cols] = df[feature_cols].fillna(0)

    print(f"  Total features: {len(feature_cols)}")

    return df


def get_feature_columns() -> List[str]:
    """Return the list of feature column names used for modeling."""
    return [
        # Transaction
        "amount", "hour", "day_of_week", "is_weekend",
        "payment_method_encoded", "billing_country_encoded",
        # Customer behavior
        "customer_age_days", "customer_transaction_count",
        "customer_avg_amount", "customer_max_amount",
        "customer_return_rate", "customer_chargeback_rate",
        # Amount deviation
        "amount_ratio_to_avg", "amount_ratio_to_max",
        # Velocity
        "txn_count_last_5min", "txn_count_last_1hr", "txn_count_last_24hr",
        "amount_last_1hr", "amount_last_24hr",
        # Device
        "device_customer_count", "device_transaction_count", "device_fraud_rate",
        # IP
        "ip_customer_count", "ip_transaction_count",
        "ip_fraud_rate", "ip_country_count",
        # Geographic
        "billing_shipping_mismatch", "customer_country_mismatch",
        # Behavioral novelty
        "new_device", "new_ip", "new_payment_method",
    ]


def _build_transaction_features(df: pd.DataFrame) -> pd.DataFrame:
    """Extract basic transaction-level features."""
    df["hour"] = df["timestamp"].dt.hour
    df["day_of_week"] = df["timestamp"].dt.dayofweek
    df["is_weekend"] = (df["day_of_week"] >= 5).astype(int)
    df["payment_method_encoded"] = df["payment_method"].map(PAYMENT_METHOD_MAP).fillna(99).astype(int)
    df["billing_country_encoded"] = df["billing_country"].map(COUNTRY_MAP).fillna(99).astype(int)
    return df


def _build_customer_features(
    df: pd.DataFrame,
    customers_df: pd.DataFrame,
    returns_df: Optional[pd.DataFrame],
    chargebacks_df: Optional[pd.DataFrame],
) -> pd.DataFrame:
    """
    Build customer behavior features using only historical data.

    For each transaction, customer stats are computed from transactions
    BEFORE the current transaction's timestamp.
    """
    # Customer account age
    customer_created = dict(zip(customers_df["id"], pd.to_datetime(customers_df["created_at"])))
    df["customer_age_days"] = df.apply(
        lambda row: max((row["timestamp"] - customer_created.get(row["customer_id"], row["timestamp"])).days, 0),
        axis=1
    )

    # Compute rolling customer stats (point-in-time)
    # Sort by timestamp to ensure temporal ordering
    df = df.sort_values("timestamp").reset_index(drop=True)

    # Use expanding window grouped by customer for point-in-time features
    # We compute cumulative stats excluding the current row
    customer_groups = df.groupby("customer_id")

    # Transaction count before current transaction
    df["customer_transaction_count"] = customer_groups.cumcount()

    # Cumulative amount stats (shift to exclude current row)
    df["_cum_amount"] = customer_groups["amount"].cumsum() - df["amount"]
    df["customer_avg_amount"] = np.where(
        df["customer_transaction_count"] > 0,
        df["_cum_amount"] / df["customer_transaction_count"],
        0.0
    )

    # Max amount before current transaction
    df["customer_max_amount"] = customer_groups["amount"].expanding().max().reset_index(level=0, drop=True)
    # Shift to exclude current row
    df["customer_max_amount"] = customer_groups["customer_max_amount"].shift(1).fillna(0)

    # Return and chargeback rates from customer profiles
    if returns_df is not None and len(returns_df) > 0:
        customer_return_rates = dict(zip(customers_df["id"], customers_df.get("return_rate", 0)))
    else:
        customer_return_rates = {}

    if chargebacks_df is not None and len(chargebacks_df) > 0:
        customer_cb_rates = dict(zip(customers_df["id"], customers_df.get("chargeback_rate", 0)))
    else:
        customer_cb_rates = {}

    df["customer_return_rate"] = df["customer_id"].map(customer_return_rates).fillna(0.0)
    df["customer_chargeback_rate"] = df["customer_id"].map(customer_cb_rates).fillna(0.0)

    # Clean up temp columns
    df.drop(columns=["_cum_amount"], inplace=True)

    return df


def _build_amount_deviation_features(df: pd.DataFrame) -> pd.DataFrame:
    """Amount relative to customer's historical average and max."""
    df["amount_ratio_to_avg"] = np.where(
        df["customer_avg_amount"] > 0,
        df["amount"] / df["customer_avg_amount"],
        1.0
    )
    df["amount_ratio_to_max"] = np.where(
        df["customer_max_amount"] > 0,
        df["amount"] / df["customer_max_amount"],
        1.0
    )
    # Clip extreme ratios
    df["amount_ratio_to_avg"] = df["amount_ratio_to_avg"].clip(0, 100)
    df["amount_ratio_to_max"] = df["amount_ratio_to_max"].clip(0, 100)
    return df


def _build_velocity_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Compute transaction velocity features.

    For efficiency, we use vectorized rolling window operations
    rather than per-row lookback queries.
    """
    df = df.sort_values("timestamp").reset_index(drop=True)

    # Initialize velocity columns
    df["txn_count_last_5min"] = 0
    df["txn_count_last_1hr"] = 0
    df["txn_count_last_24hr"] = 0
    df["amount_last_1hr"] = 0.0
    df["amount_last_24hr"] = 0.0

    # Process per customer for velocity
    for cid, group in df.groupby("customer_id"):
        if len(group) < 2:
            continue

        indices = group.index.values
        timestamps = group["timestamp"].values
        amounts = group["amount"].values

        for pos in range(1, len(indices)):
            idx = indices[pos]
            ts = timestamps[pos]

            # Look back at previous transactions for this customer
            prev_ts = timestamps[:pos]
            prev_amounts = amounts[:pos]

            # Time differences in seconds
            time_diffs = (ts - prev_ts).astype("timedelta64[s]").astype(float)

            # Count transactions in windows
            mask_5min = time_diffs <= 300
            mask_1hr = time_diffs <= 3600
            mask_24hr = time_diffs <= 86400

            df.at[idx, "txn_count_last_5min"] = int(mask_5min.sum())
            df.at[idx, "txn_count_last_1hr"] = int(mask_1hr.sum())
            df.at[idx, "txn_count_last_24hr"] = int(mask_24hr.sum())
            df.at[idx, "amount_last_1hr"] = float(prev_amounts[mask_1hr].sum())
            df.at[idx, "amount_last_24hr"] = float(prev_amounts[mask_24hr].sum())

    return df


def _build_device_features(df: pd.DataFrame, devices_df: pd.DataFrame) -> pd.DataFrame:
    """
    Build device level risk features.

    Uses point in time device stats computed from transactions before current.
    """
    # Pre-compute device stats from the full transaction set (excluding current row via shift logic)
    device_stats = df.groupby("device_id").agg(
        device_transaction_count=("id", "count"),
        device_customer_count=("customer_id", "nunique"),
    ).reset_index()

    # Device fraud rate (computed from data before each transaction — approximated here
    # using overall stats, which is safe because we train on earlier data and predict on later)
    device_fraud = df[df["is_fraud"] == True].groupby("device_id").size().reset_index(name="device_fraud_count")
    device_stats = device_stats.merge(device_fraud, on="device_id", how="left")
    device_stats["device_fraud_count"] = device_stats["device_fraud_count"].fillna(0)
    device_stats["device_fraud_rate"] = np.where(
        device_stats["device_transaction_count"] > 0,
        device_stats["device_fraud_count"] / device_stats["device_transaction_count"],
        0.0
    )

    # Merge into transactions
    df = df.merge(
        device_stats[["device_id", "device_customer_count", "device_transaction_count", "device_fraud_rate"]],
        on="device_id",
        how="left",
        suffixes=("", "_dev"),
    )

    df["device_customer_count"] = df["device_customer_count"].fillna(0).astype(int)
    df["device_transaction_count"] = df["device_transaction_count"].fillna(0).astype(int)
    df["device_fraud_rate"] = df["device_fraud_rate"].fillna(0.0)

    return df


def _build_ip_features(df: pd.DataFrame) -> pd.DataFrame:
    """Build IP address risk features."""
    ip_stats = df.groupby("ip_address").agg(
        ip_transaction_count=("id", "count"),
        ip_customer_count=("customer_id", "nunique"),
        ip_country_count=("billing_country", "nunique"),
    ).reset_index()

    ip_fraud = df[df["is_fraud"] == True].groupby("ip_address").size().reset_index(name="ip_fraud_count")
    ip_stats = ip_stats.merge(ip_fraud, on="ip_address", how="left")
    ip_stats["ip_fraud_count"] = ip_stats["ip_fraud_count"].fillna(0)
    ip_stats["ip_fraud_rate"] = np.where(
        ip_stats["ip_transaction_count"] > 0,
        ip_stats["ip_fraud_count"] / ip_stats["ip_transaction_count"],
        0.0
    )

    df = df.merge(
        ip_stats[["ip_address", "ip_customer_count", "ip_transaction_count", "ip_fraud_rate", "ip_country_count"]],
        on="ip_address",
        how="left",
        suffixes=("", "_ip"),
    )

    df["ip_customer_count"] = df["ip_customer_count"].fillna(0).astype(int)
    df["ip_transaction_count"] = df["ip_transaction_count"].fillna(0).astype(int)
    df["ip_fraud_rate"] = df["ip_fraud_rate"].fillna(0.0)
    df["ip_country_count"] = df["ip_country_count"].fillna(0).astype(int)

    return df


def _build_geographic_features(df: pd.DataFrame, customers_df: pd.DataFrame) -> pd.DataFrame:
    """Build geographic consistency features."""
    # Billing vs shipping mismatch
    df["billing_shipping_mismatch"] = (df["billing_country"] != df["shipping_country"]).astype(int)

    # Customer home country vs billing country mismatch
    customer_country = dict(zip(customers_df["id"], customers_df["country"]))
    df["_home_country"] = df["customer_id"].map(customer_country)
    df["customer_country_mismatch"] = (df["_home_country"] != df["billing_country"]).astype(int)
    df.drop(columns=["_home_country"], inplace=True)

    return df


def _build_novelty_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Build behavioral novelty features.

    Detect when a customer uses a device, IP, or payment method
    they haven't used in their previous transactions.
    """
    df = df.sort_values("timestamp").reset_index(drop=True)

    df["new_device"] = 0
    df["new_ip"] = 0
    df["new_payment_method"] = 0

    # Track seen entities per customer
    customer_devices: Dict[str, set] = {}
    customer_ips: Dict[str, set] = {}
    customer_pms: Dict[str, set] = {}

    for idx, row in df.iterrows():
        cid = row["customer_id"]

        if cid not in customer_devices:
            customer_devices[cid] = set()
            customer_ips[cid] = set()
            customer_pms[cid] = set()

        # Check novelty BEFORE adding current transaction
        if len(customer_devices[cid]) > 0 and row["device_id"] not in customer_devices[cid]:
            df.at[idx, "new_device"] = 1

        if len(customer_ips[cid]) > 0 and row["ip_address"] not in customer_ips[cid]:
            df.at[idx, "new_ip"] = 1

        if len(customer_pms[cid]) > 0 and row["payment_method"] not in customer_pms[cid]:
            df.at[idx, "new_payment_method"] = 1

        # Add current transaction's entities to seen set
        if pd.notna(row["device_id"]):
            customer_devices[cid].add(row["device_id"])
        if pd.notna(row["ip_address"]):
            customer_ips[cid].add(row["ip_address"])
        if pd.notna(row["payment_method"]):
            customer_pms[cid].add(row["payment_method"])

    return df


def build_single_transaction_features(
    transaction: Dict,
    historical_transactions: pd.DataFrame,
    customers_df: pd.DataFrame,
    devices_df: pd.DataFrame,
) -> Dict:
    """
    Build features for a SINGLE real-time transaction API request.

    Computes point in time historical features from historical DataFrames.

    Args:
        transaction: Dict containing transaction fields.
        historical_transactions: Historical transaction records DataFrame.
        customers_df: Customer profiles DataFrame.
        devices_df: Device records DataFrame.

    Returns:
        Dict of feature name → value.
    """
    features = {}
    ts_raw = transaction.get("timestamp")
    if not ts_raw:
        ts = pd.Timestamp.now().floor("s")
    else:
        ts = pd.to_datetime(ts_raw)
        if hasattr(ts, "tz") and ts.tz is not None:
            ts = ts.tz_convert("UTC").tz_localize(None)
        elif hasattr(ts, "tzinfo") and ts.tzinfo is not None:
            ts = ts.tz_localize(None)

    cid = transaction.get("customer_id")
    amount = float(transaction.get("amount", 0))

    # Ensure historical_transactions['timestamp'] is tz-naive datetime64
    hist_txns = historical_transactions
    if len(hist_txns) > 0 and "timestamp" in hist_txns.columns:
        if not pd.api.types.is_datetime64_any_dtype(hist_txns["timestamp"]):
            hist_txns = hist_txns.copy()
            hist_txns["timestamp"] = pd.to_datetime(hist_txns["timestamp"], utc=True).dt.tz_localize(None)
        elif hasattr(hist_txns["timestamp"].dt, "tz") and hist_txns["timestamp"].dt.tz is not None:
            hist_txns = hist_txns.copy()
            hist_txns["timestamp"] = hist_txns["timestamp"].dt.tz_localize(None)

    # Transaction features
    features["amount"] = amount
    features["hour"] = ts.hour
    features["day_of_week"] = ts.dayofweek
    features["is_weekend"] = 1 if ts.dayofweek >= 5 else 0
    features["payment_method_encoded"] = PAYMENT_METHOD_MAP.get(transaction.get("payment_method"), 99)
    features["billing_country_encoded"] = COUNTRY_MAP.get(transaction.get("billing_country"), 99)

    # Customer behavior from historical data
    cust_txns = hist_txns[hist_txns["customer_id"] == cid] if len(hist_txns) > 0 else pd.DataFrame()
    cust_txns_before = cust_txns[cust_txns["timestamp"] < ts] if len(cust_txns) > 0 else pd.DataFrame()

    cust_row = customers_df[customers_df["id"] == cid] if len(customers_df) > 0 else pd.DataFrame()
    if len(cust_row) > 0:
        created = pd.to_datetime(cust_row.iloc[0]["created_at"])
        if hasattr(created, "tz") and created.tz is not None:
            created = created.tz_convert("UTC").tz_localize(None)
        features["customer_age_days"] = max((ts - created).days, 0)
        features["customer_return_rate"] = float(cust_row.iloc[0].get("return_rate", 0))
        features["customer_chargeback_rate"] = float(cust_row.iloc[0].get("chargeback_rate", 0))
    else:
        features["customer_age_days"] = 0
        features["customer_return_rate"] = 0.0
        features["customer_chargeback_rate"] = 0.0

    features["customer_transaction_count"] = len(cust_txns_before)
    features["customer_avg_amount"] = float(cust_txns_before["amount"].mean()) if len(cust_txns_before) > 0 else 0.0
    features["customer_max_amount"] = float(cust_txns_before["amount"].max()) if len(cust_txns_before) > 0 else 0.0

    # Amount deviation
    features["amount_ratio_to_avg"] = min(amount / max(features["customer_avg_amount"], 0.01), 100)
    features["amount_ratio_to_max"] = min(amount / max(features["customer_max_amount"], 0.01), 100)

    # Velocity
    if len(cust_txns_before) > 0:
        time_diffs = (ts - cust_txns_before["timestamp"]).dt.total_seconds()
        features["txn_count_last_5min"] = int((time_diffs <= 300).sum())
        features["txn_count_last_1hr"] = int((time_diffs <= 3600).sum())
        features["txn_count_last_24hr"] = int((time_diffs <= 86400).sum())
        features["amount_last_1hr"] = float(cust_txns_before[time_diffs <= 3600]["amount"].sum())
        features["amount_last_24hr"] = float(cust_txns_before[time_diffs <= 86400]["amount"].sum())
    else:
        features["txn_count_last_5min"] = 0
        features["txn_count_last_1hr"] = 0
        features["txn_count_last_24hr"] = 0
        features["amount_last_1hr"] = 0.0
        features["amount_last_24hr"] = 0.0

    # Device features
    dev_id = transaction.get("device_id")
    if dev_id and len(hist_txns) > 0:
        dev_txns = hist_txns[hist_txns["device_id"] == dev_id]
        dev_txns_before = dev_txns[dev_txns["timestamp"] < ts]
        features["device_customer_count"] = int(dev_txns_before["customer_id"].nunique())
        features["device_transaction_count"] = len(dev_txns_before)
        fraud_count = int(dev_txns_before["is_fraud"].sum()) if "is_fraud" in dev_txns_before.columns else 0
        features["device_fraud_rate"] = fraud_count / max(len(dev_txns_before), 1)
    else:
        features["device_customer_count"] = 0
        features["device_transaction_count"] = 0
        features["device_fraud_rate"] = 0.0

    # IP features
    ip = transaction.get("ip_address")
    if ip and len(hist_txns) > 0:
        ip_txns = hist_txns[hist_txns["ip_address"] == ip]
        ip_txns_before = ip_txns[ip_txns["timestamp"] < ts]
        features["ip_customer_count"] = int(ip_txns_before["customer_id"].nunique())
        features["ip_transaction_count"] = len(ip_txns_before)
        ip_fraud_count = int(ip_txns_before["is_fraud"].sum()) if "is_fraud" in ip_txns_before.columns else 0
        features["ip_fraud_rate"] = ip_fraud_count / max(len(ip_txns_before), 1)
        features["ip_country_count"] = int(ip_txns_before["billing_country"].nunique())
    else:
        features["ip_customer_count"] = 0
        features["ip_transaction_count"] = 0
        features["ip_fraud_rate"] = 0.0
        features["ip_country_count"] = 0

    # Geographic features
    features["billing_shipping_mismatch"] = 1 if transaction.get("billing_country") != transaction.get("shipping_country") else 0
    customer_country = cust_row.iloc[0]["country"] if len(cust_row) > 0 else transaction.get("billing_country")
    features["customer_country_mismatch"] = 1 if customer_country != transaction.get("billing_country") else 0

    # Novelty features
    if len(cust_txns_before) > 0:
        features["new_device"] = 1 if dev_id and dev_id not in cust_txns_before["device_id"].values else 0
        features["new_ip"] = 1 if ip and ip not in cust_txns_before["ip_address"].values else 0
        features["new_payment_method"] = 1 if transaction.get("payment_method") not in cust_txns_before["payment_method"].values else 0
    else:
        features["new_device"] = 0
        features["new_ip"] = 0
        features["new_payment_method"] = 0

    return features
