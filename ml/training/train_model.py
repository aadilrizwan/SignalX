"""
SignalX — Model Training

Trains two models:
1. Logistic Regression (baseline) — L2 regularized, class_weight='balanced'
2. LightGBM (advanced) — with scale_pos_weight for imbalance handling

Also trains an Isolation Forest for anomaly detection.

Usage:
    python -m ml.training.train_model
    python -m ml.training.train_model --data-dir data --model-dir ml/models
"""

import argparse
import json
import os
import sys
import time
import joblib
import numpy as np
import pandas as pd
from pathlib import Path
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
import lightgbm as lgb

# Add project root to path
project_root = str(Path(__file__).parent.parent.parent)
if project_root not in sys.path:
    sys.path.insert(0, project_root)

from ml.config import LGBM_PARAMS, LR_PARAMS, DATA_DIR, MODEL_DIR
from ml.preprocessing.pipeline import load_data, temporal_split
from ml.features.feature_builder import build_features, get_feature_columns


def train_models(data_dir: str = DATA_DIR, model_dir: str = MODEL_DIR) -> dict:
    """
    Train all models: LightGBM, Logistic Regression, Isolation Forest.

    Returns:
        Dictionary with training metadata and paths.
    """
    print("=" * 60)
    print("  SignalX — Model Training")
    print("=" * 60)
    start_time = time.time()

    os.makedirs(model_dir, exist_ok=True)

    # Load data
    print("\n[1/6] Loading data...")
    data = load_data(data_dir)
    transactions_df = data["transactions"]
    customers_df = data["customers"]
    devices_df = data["devices"]
    returns_df = data.get("returns", pd.DataFrame())
    chargebacks_df = data.get("chargebacks", pd.DataFrame())

    # Temporal split
    print("\n[2/6] Temporal split...")
    train_df, val_df, test_df = temporal_split(transactions_df)

    # Feature engineering
    print("\n[3/6] Building features...")
    print("  Training set features:")
    train_featured = build_features(train_df, customers_df, devices_df, returns_df, chargebacks_df)
    print("  Validation set features:")
    val_featured = build_features(val_df, customers_df, devices_df, returns_df, chargebacks_df)
    print("  Test set features:")
    test_featured = build_features(test_df, customers_df, devices_df, returns_df, chargebacks_df)

    feature_cols = get_feature_columns()

    X_train = train_featured[feature_cols].values
    y_train = train_featured["is_fraud"].astype(int).values
    X_val = val_featured[feature_cols].values
    y_val = val_featured["is_fraud"].astype(int).values
    X_test = test_featured[feature_cols].values
    y_test = test_featured["is_fraud"].astype(int).values

    print(f"\n  Training:   {X_train.shape[0]:>8,} samples, {y_train.sum():>6,} fraud ({y_train.mean():.2%})")
    print(f"  Validation: {X_val.shape[0]:>8,} samples, {y_val.sum():>6,} fraud ({y_val.mean():.2%})")
    print(f"  Test:       {X_test.shape[0]:>8,} samples, {y_test.sum():>6,} fraud ({y_test.mean():.2%})")

    # Save feature columns
    feature_cols_path = os.path.join(model_dir, "feature_columns.json")
    with open(feature_cols_path, "w") as f:
        json.dump(feature_cols, f, indent=2)

    # Train Logistic Regression (baseline)
    print("\n[4/6] Training Logistic Regression (baseline)...")
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_val_scaled = scaler.transform(X_val)

    lr_model = LogisticRegression(**LR_PARAMS)
    lr_model.fit(X_train_scaled, y_train)

    lr_path = os.path.join(model_dir, "logistic_regression.pkl")
    scaler_path = os.path.join(model_dir, "scaler.pkl")
    joblib.dump(lr_model, lr_path)
    joblib.dump(scaler, scaler_path)
    print(f"  ✓ Logistic Regression saved to {lr_path}")

    # Train LightGBM (advanced)
    print("\n[5/6] Training LightGBM...")

    # Calculate scale_pos_weight for class imbalance
    n_pos = y_train.sum()
    n_neg = len(y_train) - n_pos
    scale_pos_weight = n_neg / max(n_pos, 1)

    lgbm_params = LGBM_PARAMS.copy()
    lgbm_params["scale_pos_weight"] = scale_pos_weight

    train_data = lgb.Dataset(X_train, label=y_train, feature_name=feature_cols)
    val_data = lgb.Dataset(X_val, label=y_val, feature_name=feature_cols, reference=train_data)

    lgbm_model = lgb.train(
        lgbm_params,
        train_data,
        num_boost_round=500,
        valid_sets=[train_data, val_data],
        valid_names=["train", "validation"],
        callbacks=[
            lgb.early_stopping(stopping_rounds=30),
            lgb.log_evaluation(period=50),
        ],
    )

    lgbm_path = os.path.join(model_dir, "lightgbm_fraud.pkl")
    joblib.dump(lgbm_model, lgbm_path)
    print(f"  ✓ LightGBM saved to {lgbm_path}")
    print(f"  ✓ Best iteration: {lgbm_model.best_iteration}")

    # Feature importance
    importance = lgbm_model.feature_importance(importance_type="gain")
    importance_df = pd.DataFrame({
        "feature": feature_cols,
        "importance": importance,
    }).sort_values("importance", ascending=False)
    print(f"\n  Top 10 Features (by gain):")
    for _, row in importance_df.head(10).iterrows():
        print(f"    {row['feature']:>35s}: {row['importance']:.1f}")

    importance_path = os.path.join(model_dir, "feature_importance.json")
    importance_df.to_json(importance_path, orient="records", indent=2)

    # Train Isolation Forest (anomaly detection)
    print("\n[6/6] Training Isolation Forest (anomaly detection)...")

    iso_model = IsolationForest(
        n_estimators=200,
        max_samples="auto",
        contamination=0.04,
        random_state=42,
        n_jobs=-1,
    )
    iso_model.fit(X_train)

    iso_path = os.path.join(model_dir, "isolation_forest.pkl")
    joblib.dump(iso_model, iso_path)
    print(f"  ✓ Isolation Forest saved to {iso_path}")

    # Save test data for evaluation
    test_data_path = os.path.join(model_dir, "test_data.pkl")
    joblib.dump({
        "X_test": X_test,
        "y_test": y_test,
        "X_val": X_val,
        "y_val": y_val,
        "feature_cols": feature_cols,
        "test_transactions": test_featured[["id", "amount", "is_fraud", "fraud_pattern"]].to_dict("records"),
    }, test_data_path)

    elapsed = time.time() - start_time

    metadata = {
        "training_time_seconds": round(elapsed, 1),
        "train_size": int(X_train.shape[0]),
        "val_size": int(X_val.shape[0]),
        "test_size": int(X_test.shape[0]),
        "n_features": len(feature_cols),
        "fraud_rate_train": float(y_train.mean()),
        "fraud_rate_val": float(y_val.mean()),
        "fraud_rate_test": float(y_test.mean()),
        "scale_pos_weight": float(scale_pos_weight),
        "lgbm_best_iteration": int(lgbm_model.best_iteration),
        "model_paths": {
            "lightgbm": lgbm_path,
            "logistic_regression": lr_path,
            "scaler": scaler_path,
            "isolation_forest": iso_path,
            "feature_columns": feature_cols_path,
        }
    }

    meta_path = os.path.join(model_dir, "training_metadata.json")
    with open(meta_path, "w") as f:
        json.dump(metadata, f, indent=2)

    print(f"\n{'=' * 60}")
    print(f"  Training Complete in {elapsed:.1f}s")
    print(f"{'=' * 60}")
    print(f"  Models saved to: {os.path.abspath(model_dir)}")
    print(f"{'=' * 60}\n")

    return metadata


def main():
    parser = argparse.ArgumentParser(description="SignalX Model Training")
    parser.add_argument("--data-dir", type=str, default=DATA_DIR, help="Data directory")
    parser.add_argument("--model-dir", type=str, default=MODEL_DIR, help="Model output directory")

    args = parser.parse_args()
    train_models(data_dir=args.data_dir, model_dir=args.model_dir)


if __name__ == "__main__":
    main()
