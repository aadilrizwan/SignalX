"""ML configuration — hyperparameters, paths, and feature lists."""

import os

# Paths
DATA_DIR = os.environ.get("DATA_DIR", "data")
MODEL_DIR = os.environ.get("MODEL_DIR", os.path.join("ml", "models"))

# Temporal split boundaries (month numbers within the data year)
TRAIN_MONTHS = list(range(1, 9))      # Jan-Aug (67%)
VALIDATION_MONTHS = list(range(9, 11)) # Sep-Oct (17%)
TEST_MONTHS = list(range(11, 13))      # Nov-Dec (17%)

# LightGBM hyperparameters
LGBM_PARAMS = {
    "objective": "binary",
    "metric": "average_precision",
    "boosting_type": "gbdt",
    "num_leaves": 63,
    "learning_rate": 0.05,
    "feature_fraction": 0.8,
    "bagging_fraction": 0.8,
    "bagging_freq": 5,
    "min_child_samples": 20,
    "verbose": -1,
    "n_jobs": -1,
    "random_state": 42,
}

# Logistic Regression hyperparameters
LR_PARAMS = {
    "max_iter": 1000,
    "class_weight": "balanced",
    "solver": "lbfgs",
    "random_state": 42,
}

# Cost matrix
COST_MATRIX = {
    "fp_cost": float(os.environ.get("FP_COST", 25.0)),
    "fn_cost_multiplier": float(os.environ.get("FN_COST_MULTIPLIER", 1.0)),
    "review_cost": float(os.environ.get("REVIEW_COST", 5.0)),
}

# Feature categories for documentation
FEATURE_CATEGORIES = {
    "transaction": [
        "amount", "hour", "day_of_week", "is_weekend",
        "payment_method_encoded", "billing_country_encoded",
    ],
    "customer_behavior": [
        "customer_age_days", "customer_transaction_count",
        "customer_avg_amount", "customer_max_amount",
        "customer_return_rate", "customer_chargeback_rate",
    ],
    "amount_deviation": [
        "amount_ratio_to_avg", "amount_ratio_to_max",
    ],
    "velocity": [
        "txn_count_last_5min", "txn_count_last_1hr", "txn_count_last_24hr",
        "amount_last_1hr", "amount_last_24hr",
    ],
    "device": [
        "device_customer_count", "device_transaction_count", "device_fraud_rate",
    ],
    "ip": [
        "ip_customer_count", "ip_transaction_count",
        "ip_fraud_rate", "ip_country_count",
    ],
    "geographic": [
        "billing_shipping_mismatch", "customer_country_mismatch",
    ],
    "behavioral_novelty": [
        "new_device", "new_ip", "new_payment_method",
    ],
}
