"""
SignalX — Model Evaluation

Evaluates trained models on the held-out temporal test set.
Reports: Precision, Recall, F1, PR-AUC, ROC-AUC, FPR, FNR, Confusion Matrix.
Compares Logistic Regression (baseline) vs LightGBM (advanced).

Usage:
    python -m ml.evaluation.evaluate_model
"""

import argparse
import json
import os
import sys
import joblib
import numpy as np
import pandas as pd
from pathlib import Path
from sklearn.metrics import (
    precision_score, recall_score, f1_score,
    average_precision_score, roc_auc_score,
    confusion_matrix, precision_recall_curve,
    roc_curve, classification_report,
)

project_root = str(Path(__file__).parent.parent.parent)
if project_root not in sys.path:
    sys.path.insert(0, project_root)

from ml.config import MODEL_DIR, COST_MATRIX


def evaluate_models(model_dir: str = MODEL_DIR) -> dict:
    """
    Evaluate all trained models on the held-out test set.

    Returns:
        Dictionary with all metrics for all models.
    """
    print("=" * 60)
    print("  SignalX — Model Evaluation")
    print("=" * 60)

    # Load test data
    test_data_path = os.path.join(model_dir, "test_data.pkl")
    test_data = joblib.load(test_data_path)
    X_test = test_data["X_test"]
    y_test = test_data["y_test"]
    feature_cols = test_data["feature_cols"]

    print(f"\n  Test set: {len(y_test):,} samples, {y_test.sum():,} fraud ({y_test.mean():.2%})")

    results = {}

    # Evaluate Logistic Regression
    print("\n" + "─" * 40)
    print("  Logistic Regression (Baseline)")
    print("─" * 40)

    lr_model = joblib.load(os.path.join(model_dir, "logistic_regression.pkl"))
    scaler = joblib.load(os.path.join(model_dir, "scaler.pkl"))
    X_test_scaled = scaler.transform(X_test)

    lr_probs = lr_model.predict_proba(X_test_scaled)[:, 1]
    lr_metrics = _compute_metrics(y_test, lr_probs, "Logistic Regression")
    results["logistic_regression"] = lr_metrics

    # Evaluate LightGBM
    print("\n" + "─" * 40)
    print("  LightGBM (Advanced)")
    print("─" * 40)

    lgbm_model = joblib.load(os.path.join(model_dir, "lightgbm_fraud.pkl"))
    lgbm_probs = lgbm_model.predict(X_test)

    lgbm_metrics = _compute_metrics(y_test, lgbm_probs, "LightGBM")
    results["lightgbm"] = lgbm_metrics

    # Evaluate Isolation Forest
    print("\n" + "─" * 40)
    print("  Isolation Forest (Anomaly Detection)")
    print("─" * 40)

    iso_model = joblib.load(os.path.join(model_dir, "isolation_forest.pkl"))
    iso_raw = iso_model.decision_function(X_test)

    # Normalize: lower decision function = more anomalous
    # Convert to 0-1 anomaly score (1 = most anomalous)

    iso_scores = 1 - (iso_raw - iso_raw.min()) / (iso_raw.max() - iso_raw.min() + 1e-8)
    iso_metrics = _compute_metrics(y_test, iso_scores, "Isolation Forest")
    results["isolation_forest"] = iso_metrics

    # Cost-sensitive analysis (LightGBM)
    print("\n" + "─" * 40)
    print("  Cost-Sensitive Analysis (LightGBM)")
    print("─" * 40)

    # Use test transaction amounts for cost calculation
    test_amounts = np.array([t.get("amount", 100) for t in test_data.get("test_transactions", [{"amount": 100}] * len(y_test))])
    if len(test_amounts) != len(y_test):
        test_amounts = np.full(len(y_test), 100.0)  # Fallback

    cost_analysis = _cost_sensitive_analysis(y_test, lgbm_probs, test_amounts)
    results["cost_analysis"] = cost_analysis

    # Model comparison summary
    print("\n" + "=" * 60)
    print("  MODEL COMPARISON SUMMARY")
    print("=" * 60)

    comparison = {
        "Metric": ["PR-AUC", "ROC-AUC", "Precision", "Recall", "F1", "FPR"],
    }
    for model_name in ["logistic_regression", "lightgbm", "isolation_forest"]:
        m = results[model_name]
        comparison[model_name] = [
            f"{m['pr_auc']:.4f}",
            f"{m['roc_auc']:.4f}",
            f"{m['precision']:.4f}",
            f"{m['recall']:.4f}",
            f"{m['f1']:.4f}",
            f"{m['fpr']:.4f}",
        ]

    comp_df = pd.DataFrame(comparison)
    print(comp_df.to_string(index=False))

    # Save results
    metrics_path = os.path.join(model_dir, "model_metrics.json")

    # Convert numpy types to Python native for JSON serialization
    serializable_results = _make_serializable(results)
    with open(metrics_path, "w") as f:
        json.dump(serializable_results, f, indent=2)

    print(f"\n  Metrics saved to: {metrics_path}")
    print("=" * 60 + "\n")

    return results


def _compute_metrics(y_true: np.ndarray, y_probs: np.ndarray, model_name: str, threshold: float = 0.5) -> dict:
    """Compute all evaluation metrics for a model."""
    y_pred = (y_probs >= threshold).astype(int)

    precision = precision_score(y_true, y_pred, zero_division=0)
    recall = recall_score(y_true, y_pred, zero_division=0)
    f1 = f1_score(y_true, y_pred, zero_division=0)
    pr_auc = average_precision_score(y_true, y_probs)
    roc_auc = roc_auc_score(y_true, y_probs)

    cm = confusion_matrix(y_true, y_pred)
    tn, fp, fn, tp = cm.ravel()

    fpr = fp / (fp + tn) if (fp + tn) > 0 else 0
    fnr = fn / (fn + tp) if (fn + tp) > 0 else 0

    print(f"\n  Threshold: {threshold}")
    print(f"  Precision:  {precision:.4f}")
    print(f"  Recall:     {recall:.4f}")
    print(f"  F1:         {f1:.4f}")
    print(f"  PR-AUC:     {pr_auc:.4f}")
    print(f"  ROC-AUC:    {roc_auc:.4f}")
    print(f"  FPR:        {fpr:.4f}")
    print(f"  FNR:        {fnr:.4f}")
    print(f"\n  Confusion Matrix:")
    print(f"    {'':>10s} Pred Legit  Pred Fraud")
    print(f"    {'True Legit':>10s}  {tn:>8,}    {fp:>8,}")
    print(f"    {'True Fraud':>10s}  {fn:>8,}    {tp:>8,}")

    # PR curve data for threshold simulator
    precisions, recalls, thresholds_pr = precision_recall_curve(y_true, y_probs)
    fpr_curve, tpr_curve, thresholds_roc = roc_curve(y_true, y_probs)

    return {
        "model_name": model_name,
        "threshold": threshold,
        "precision": float(precision),
        "recall": float(recall),
        "f1": float(f1),
        "pr_auc": float(pr_auc),
        "roc_auc": float(roc_auc),
        "fpr": float(fpr),
        "fnr": float(fnr),
        "confusion_matrix": {
            "tn": int(tn), "fp": int(fp),
            "fn": int(fn), "tp": int(tp),
        },
        "pr_curve": {
            "precisions": precisions.tolist(),
            "recalls": recalls.tolist(),
            "thresholds": thresholds_pr.tolist(),
        },
        "roc_curve": {
            "fpr": fpr_curve.tolist(),
            "tpr": tpr_curve.tolist(),
            "thresholds": thresholds_roc.tolist(),
        },
    }


def _cost_sensitive_analysis(
    y_true: np.ndarray,
    y_probs: np.ndarray,
    amounts: np.ndarray,
) -> dict:
    """
    Analyze cost at various thresholds to find optimal operating point.
    """
    fp_cost = COST_MATRIX["fp_cost"]
    fn_multiplier = COST_MATRIX["fn_cost_multiplier"]
    review_cost = COST_MATRIX["review_cost"]

    thresholds = np.arange(0.05, 0.96, 0.05)
    analysis = []

    for thresh in thresholds:
        y_pred = (y_probs >= thresh).astype(int)
        cm = confusion_matrix(y_true, y_pred)
        tn, fp, fn, tp = cm.ravel()

        # Cost calculation
        false_positive_cost = fp * fp_cost
        false_negative_cost = float(amounts[np.logical_and(y_true == 1, y_pred == 0)].sum() * fn_multiplier)
        total_cost = false_positive_cost + false_negative_cost

        fraud_prevented = float(amounts[np.logical_and(y_true == 1, y_pred == 1)].sum())

        prec = tp / (tp + fp) if (tp + fp) > 0 else 0
        rec = tp / (tp + fn) if (tp + fn) > 0 else 0

        analysis.append({
            "threshold": round(float(thresh), 2),
            "precision": round(float(prec), 4),
            "recall": round(float(rec), 4),
            "fpr": round(float(fp / (fp + tn)) if (fp + tn) > 0 else 0, 4),
            "tp": int(tp), "fp": int(fp), "fn": int(fn), "tn": int(tn),
            "false_positive_cost": round(false_positive_cost, 2),
            "false_negative_cost": round(false_negative_cost, 2),
            "total_cost": round(total_cost, 2),
            "fraud_prevented_amount": round(fraud_prevented, 2),
        })

    # Find cost-optimal threshold
    best = min(analysis, key=lambda x: x["total_cost"])
    optimal_threshold = best["threshold"]

    print(f"\n  Cost Analysis (FP cost=${fp_cost}, FN cost=amount×{fn_multiplier}):")
    print(f"  {'Threshold':>10s} {'Precision':>10s} {'Recall':>10s} {'FPR':>8s} {'Total Cost':>12s} {'Fraud Prevented':>16s}")
    for a in analysis:
        marker = " ★" if a["threshold"] == optimal_threshold else ""
        print(f"  {a['threshold']:>10.2f} {a['precision']:>10.4f} {a['recall']:>10.4f} {a['fpr']:>8.4f} ${a['total_cost']:>11,.2f} ${a['fraud_prevented_amount']:>15,.2f}{marker}")

    print(f"\n  ★ Cost-optimal threshold: {optimal_threshold}")
    print(f"    Total cost at optimal: ${best['total_cost']:,.2f}")
    print(f"    Fraud prevented: ${best['fraud_prevented_amount']:,.2f}")

    return {
        "threshold_analysis": analysis,
        "optimal_threshold": optimal_threshold,
        "optimal_cost": best["total_cost"],
        "optimal_fraud_prevented": best["fraud_prevented_amount"],
    }


def _make_serializable(obj):
    """Convert numpy types to Python native for JSON serialization."""
    if isinstance(obj, dict):
        return {k: _make_serializable(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [_make_serializable(item) for item in obj]
    elif isinstance(obj, (np.integer,)):
        return int(obj)
    elif isinstance(obj, (np.floating,)):
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    return obj


# Evaluation package init
def main():
    parser = argparse.ArgumentParser(description="SignalX Model Evaluation")
    parser.add_argument("--model-dir", type=str, default=MODEL_DIR, help="Model directory")
    args = parser.parse_args()
    evaluate_models(model_dir=args.model_dir)


if __name__ == "__main__":
    main()
