"""
SignalX — Threshold Optimizer

Sweeps risk thresholds and computes business metrics at each point.
Identifies the cost-optimal operating point considering:
- False positive cost (blocking legitimate customers)
- False negative cost (fraud loss = transaction amount)
- Review cost (manual analyst time)

Usage:
    python -m ml.training.threshold_optimizer
"""

import json
import os
import sys
import joblib
import numpy as np
from pathlib import Path
from sklearn.metrics import precision_score, recall_score, f1_score

project_root = str(Path(__file__).parent.parent.parent)
if project_root not in sys.path:
    sys.path.insert(0, project_root)

from ml.config import MODEL_DIR, COST_MATRIX


def optimize_thresholds(
    model_dir: str = MODEL_DIR,
    review_threshold_low: float = 0.3,
    review_threshold_high: float = 0.7,
) -> dict:
    """
    Optimize decision thresholds for the 3-action system (ALLOW/REVIEW/BLOCK).

    Args:
        model_dir: Directory with saved models and test data.
        review_threshold_low: Below this → ALLOW, above → REVIEW.
        review_threshold_high: Above this → BLOCK.

    Returns:
        Threshold analysis results.
    """
    print("=" * 60)
    print("  SignalX — Threshold Optimization")
    print("=" * 60)

    # Load model and test data
    lgbm_model = joblib.load(os.path.join(model_dir, "lightgbm_fraud.pkl"))
    test_data = joblib.load(os.path.join(model_dir, "test_data.pkl"))
    X_test = test_data["X_test"]
    y_test = test_data["y_test"]

    # Get test transaction amounts
    test_txns = test_data.get("test_transactions", [])
    amounts = np.array([t.get("amount", 100.0) for t in test_txns])
    if len(amounts) != len(y_test):
        amounts = np.full(len(y_test), 100.0)

    # Get predictions
    y_probs = lgbm_model.predict(X_test)

    fp_cost = COST_MATRIX["fp_cost"]
    fn_multiplier = COST_MATRIX["fn_cost_multiplier"]
    review_cost = COST_MATRIX["review_cost"]

    # Sweep thresholds
    threshold_data = []
    for thresh in np.arange(0.05, 0.96, 0.01):
        thresh = round(float(thresh), 2)
        y_pred = (y_probs >= thresh).astype(int)

        tp = int(np.sum((y_test == 1) & (y_pred == 1)))
        fp = int(np.sum((y_test == 0) & (y_pred == 1)))
        fn = int(np.sum((y_test == 1) & (y_pred == 0)))
        tn = int(np.sum((y_test == 0) & (y_pred == 0)))

        prec = tp / (tp + fp) if (tp + fp) > 0 else 0
        rec = tp / (tp + fn) if (tp + fn) > 0 else 0
        f1 = 2 * prec * rec / (prec + rec) if (prec + rec) > 0 else 0
        fpr = fp / (fp + tn) if (fp + tn) > 0 else 0

        # Financial metrics
        fp_total_cost = fp * fp_cost
        fn_total_cost = float(amounts[(y_test == 1) & (y_pred == 0)].sum() * fn_multiplier)
        fraud_prevented = float(amounts[(y_test == 1) & (y_pred == 1)].sum())
        total_expected_loss = fp_total_cost + fn_total_cost

        # Estimate review volume (transactions between review_low and block threshold)
        review_mask = (y_probs >= review_threshold_low) & (y_probs < thresh)
        review_volume = int(review_mask.sum())
        review_total_cost = review_volume * review_cost

        threshold_data.append({
            "threshold": thresh,
            "precision": round(prec, 4),
            "recall": round(rec, 4),
            "f1": round(f1, 4),
            "fpr": round(fpr, 4),
            "tp": tp, "fp": fp, "fn": fn, "tn": tn,
            "fraud_prevented_amount": round(fraud_prevented, 2),
            "false_positive_cost": round(fp_total_cost, 2),
            "fraud_loss": round(fn_total_cost, 2),
            "expected_loss": round(total_expected_loss, 2),
            "review_volume": review_volume,
            "review_cost": round(review_total_cost, 2),
            "total_cost_with_review": round(total_expected_loss + review_total_cost, 2),
        })

    # Find optimal thresholds
    best_cost = min(threshold_data, key=lambda x: x["expected_loss"])
    best_f1 = max(threshold_data, key=lambda x: x["f1"])

    result = {
        "threshold_data": threshold_data,
        "optimal_cost_threshold": best_cost["threshold"],
        "optimal_f1_threshold": best_f1["threshold"],
        "review_threshold": review_threshold_low,
        "block_threshold": review_threshold_high,
        "cost_matrix": COST_MATRIX,
    }

    # Save
    output_path = os.path.join(model_dir, "threshold_data.json")
    with open(output_path, "w") as f:
        json.dump(result, f, indent=2)

    print(f"\n  Cost-optimal threshold: {best_cost['threshold']}")
    print(f"  F1-optimal threshold:  {best_f1['threshold']}")
    print(f"  Saved to: {output_path}")
    print("=" * 60 + "\n")

    return result


def main():
    optimize_thresholds()


if __name__ == "__main__":
    main()
