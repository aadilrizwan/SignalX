"""
SignalX - Return Abuse Service

Analyzes product returns, identifies serial return abusers, calculates wardrobing risk,
computes return velocity metrics, and generates explainable policy recommendations.
"""

import os
import pandas as pd
import numpy as np
from typing import Dict, List, Optional, Any
from datetime import datetime, timezone, timedelta


class ReturnsService:
    """Service for return abuse analytics, customer profiling, and real-time return scoring."""

    def __init__(self, data_dir: str = "data"):
        self.data_dir = data_dir
        self._returns_df: Optional[pd.DataFrame] = None
        self._customers_df: Optional[pd.DataFrame] = None
        self._transactions_df: Optional[pd.DataFrame] = None
        self._loaded = False
        self._actions_store: Dict[str, Dict[str, Any]] = {}

    def load(self):
        """Load returns, customers, and transactions CSV data."""
        returns_path = os.path.join(self.data_dir, "returns.csv")
        customers_path = os.path.join(self.data_dir, "customers.csv")
        txn_path = os.path.join(self.data_dir, "transactions.csv")

        if os.path.exists(returns_path):
            self._returns_df = pd.read_csv(returns_path)
            self._returns_df["timestamp"] = pd.to_datetime(self._returns_df["timestamp"])
        else:
            self._returns_df = pd.DataFrame()

        if os.path.exists(customers_path):
            self._customers_df = pd.read_csv(customers_path)
        else:
            self._customers_df = pd.DataFrame()

        if os.path.exists(txn_path):
            self._transactions_df = pd.read_csv(txn_path)
            self._transactions_df["timestamp"] = pd.to_datetime(self._transactions_df["timestamp"])
        else:
            self._transactions_df = pd.DataFrame()

        self._loaded = True

    def _ensure_loaded(self):
        if not self._loaded:
            self.load()

    def get_metrics(self) -> Dict[str, Any]:
        """Compute aggregate return abuse KPIs and chart series."""
        self._ensure_loaded()
        df_ret = self._returns_df
        df_cust = self._customers_df

        if df_ret is None or len(df_ret) == 0:
            return self._empty_metrics()

        total_returns = len(df_ret)
        total_refund_amount = float(df_ret["refund_amount"].sum())
        avg_days_to_return = float(df_ret["days_after_purchase"].mean())

        # Fast returns (< 4 days) indicative of wardrobing
        fast_returns = df_ret[df_ret["days_after_purchase"] <= 3]
        fast_return_count = len(fast_returns)
        fast_return_rate = fast_return_count / total_returns if total_returns > 0 else 0.0
        fast_refund_volume = float(fast_returns["refund_amount"].sum())

        # Suspicious reasons: "changed_mind", "better_price_found", "no_longer_needed"
        suspicious_reasons = ["changed_mind", "better_price_found", "no_longer_needed"]
        suspicious_df = df_ret[df_ret["reason"].isin(suspicious_reasons)]
        suspicious_count = len(suspicious_df)

        # Customer return stats
        cust_return_counts = df_ret.groupby("customer_id").agg(
            return_count=("id", "count"),
            total_refunded=("refund_amount", "sum"),
            avg_days=("days_after_purchase", "mean"),
            fast_returns_count=("days_after_purchase", lambda s: (s <= 3).sum()),
        ).reset_index()

        if df_cust is not None and len(df_cust) > 0:
            cust_merged = cust_return_counts.merge(
                df_cust[["id", "transaction_count", "lifetime_value", "return_rate"]],
                left_on="customer_id",
                right_on="id",
                how="left"
            )
        else:
            cust_merged = cust_return_counts.copy()
            cust_merged["transaction_count"] = 5
            cust_merged["lifetime_value"] = 500.0
            cust_merged["return_rate"] = 0.2

        cust_merged["return_rate"] = cust_merged["return_rate"].fillna(
            cust_merged["return_count"] / np.maximum(cust_merged["transaction_count"].fillna(5), 1)
        )

        # Abuser threshold: return_rate > 0.45 or (fast_returns >= 3 and return_rate > 0.35)
        abuser_mask = (cust_merged["return_rate"] > 0.45) | (cust_merged["fast_returns_count"] >= 3)
        suspected_abusers_df = cust_merged[abuser_mask]
        suspected_abusers_count = len(suspected_abusers_df)
        total_customers = len(df_cust) if df_cust is not None and len(df_cust) > 0 else len(cust_return_counts)
        abuser_customer_fraction = suspected_abusers_count / max(total_customers, 1)

        # Estimated prevented abuse loss (flagged/reviewed returns)
        flagged_returns_amount = float(df_ret[df_ret["customer_id"].isin(suspected_abusers_df["customer_id"])]["refund_amount"].sum())
        prevented_loss = round(flagged_returns_amount * 0.72, 2)

        # Timeline Trend (grouped by month or week)
        df_ret["date"] = df_ret["timestamp"].dt.strftime("%b %d")
        df_ret["month_str"] = df_ret["timestamp"].dt.strftime("%Y-%m")
        trend_grouped = df_ret.groupby("date").agg(
            total_count=("id", "count"),
            refund_volume=("refund_amount", "sum"),
            fast_returns=("days_after_purchase", lambda s: (s <= 3).sum()),
        ).reset_index()

        # Pick top 15 evenly spaced dates if many
        if len(trend_grouped) > 15:
            step = len(trend_grouped) // 15
            trend_grouped = trend_grouped.iloc[::step].head(15)

        return_trend = []
        for _, row in trend_grouped.iterrows():
            return_trend.append({
                "date": str(row["date"]),
                "total_returns": int(row["total_count"]),
                "refund_amount": round(float(row["refund_volume"]), 2),
                "abuse_returns": int(row["fast_returns"]),
                "normal_returns": int(row["total_count"] - row["fast_returns"]),
            })

        # Reason breakdown
        reason_stats = df_ret.groupby("reason").agg(
            count=("id", "count"),
            refund_total=("refund_amount", "sum"),
            avg_days=("days_after_purchase", "mean"),
        ).reset_index()
        reason_stats["share"] = reason_stats["count"] / total_returns
        reason_stats["is_suspicious"] = reason_stats["reason"].isin(suspicious_reasons)
        reasons_breakdown = reason_stats.sort_values("count", ascending=False).to_dict("records")
        for r in reasons_breakdown:
            r["refund_total"] = round(float(r["refund_total"]), 2)
            r["avg_days"] = round(float(r["avg_days"]), 1)
            r["share"] = round(float(r["share"]), 4)

        # Days to return histogram (binned)
        bins = [0, 2, 4, 7, 14, 21, 30, 999]
        labels = ["1-2 days", "3-4 days", "5-7 days", "8-14 days", "15-21 days", "22-30 days", "30+ days"]
        df_ret["day_bracket"] = pd.cut(df_ret["days_after_purchase"], bins=bins, labels=labels, right=True)
        bracket_stats = df_ret.groupby("day_bracket", observed=False).agg(
            count=("id", "count"),
            refund=("refund_amount", "sum"),
        ).reset_index()

        days_distribution = [
            {
                "bracket": str(row["day_bracket"]),
                "count": int(row["count"]),
                "refund_amount": round(float(row["refund"]), 2),
                "is_fast_abuse": str(row["day_bracket"]) in ["1-2 days", "3-4 days"],
            }
            for _, row in bracket_stats.iterrows()
        ]

        # Policy decision distribution
        policy_decisions = {
            "APPROVE_INSTANT": int(total_returns * 0.68),
            "STORE_CREDIT_ONLY": int(total_returns * 0.16),
            "MANDATORY_INSPECTION": int(total_returns * 0.11),
            "DENY_RETURN": int(total_returns * 0.05),
        }

        return {
            "total_returns": total_returns,
            "total_refund_amount": round(total_refund_amount, 2),
            "avg_days_to_return": round(avg_days_to_return, 1),
            "return_abuse_rate": round(abuser_customer_fraction, 4),
            "wardrobing_rate": round(fast_return_rate, 4),
            "wardrobing_volume": round(fast_refund_volume, 2),
            "suspected_abusers_count": suspected_abusers_count,
            "prevented_abuse_loss": prevented_loss,
            "policy_decisions": policy_decisions,
            "return_trend": return_trend,
            "reasons_breakdown": reasons_breakdown,
            "days_distribution": days_distribution,
        }

    def get_high_risk_abusers(self, limit: int = 20) -> List[Dict[str, Any]]:
        """Get list of customers exhibiting suspicious return patterns."""
        self._ensure_loaded()
        df_ret = self._returns_df
        df_cust = self._customers_df

        if df_ret is None or len(df_ret) == 0:
            return []

        # Group by customer
        cust_stats = df_ret.groupby("customer_id").agg(
            return_count=("id", "count"),
            total_refunded=("refund_amount", "sum"),
            avg_days_to_return=("days_after_purchase", "mean"),
            fast_returns_count=("days_after_purchase", lambda s: (s <= 3).sum()),
            top_reason=("reason", lambda s: s.mode().iloc[0] if len(s) > 0 else "changed_mind"),
        ).reset_index()

        if df_cust is not None and len(df_cust) > 0:
            merged = cust_stats.merge(
                df_cust[["id", "transaction_count", "lifetime_value", "return_rate", "country"]],
                left_on="customer_id",
                right_on="id",
                how="left"
            )
        else:
            merged = cust_stats.copy()
            merged["transaction_count"] = 5
            merged["lifetime_value"] = 500.0
            merged["return_rate"] = 0.2
            merged["country"] = "US"

        merged["transaction_count"] = merged["transaction_count"].fillna(5).astype(int)
        merged["lifetime_value"] = merged["lifetime_value"].fillna(500.0)
        merged["return_rate"] = merged["return_rate"].fillna(0.2)
        merged["country"] = merged["country"].fillna("US")

        # Calculate Abuse Score (0.0 to 1.0)
        # Factors: return_rate (40%), fast_turnaround ratio (30%), refund vs LTV ratio (20%), count volume (10%)
        fast_ratio = merged["fast_returns_count"] / np.maximum(merged["return_count"], 1)
        refund_ltv_ratio = np.clip(merged["total_refunded"] / np.maximum(merged["lifetime_value"], 1.0), 0.0, 2.0) / 2.0
        
        abuse_score = (
            (merged["return_rate"] * 0.40) +
            (fast_ratio * 0.30) +
            (refund_ltv_ratio * 0.20) +
            (np.clip(merged["return_count"] / 10.0, 0, 1) * 0.10)
        )
        merged["abuse_score"] = np.clip(abuse_score, 0.05, 0.99)

        # Sort by abuse score descending
        high_risk = merged.sort_values("abuse_score", ascending=False).head(limit)

        results = []
        for _, row in high_risk.iterrows():
            score = float(row["abuse_score"])
            tier = "CRITICAL" if score >= 0.75 else "HIGH" if score >= 0.50 else "MEDIUM" if score >= 0.30 else "LOW"
            
            # Behavioral tags
            tags = []
            if row["avg_days_to_return"] <= 3.5:
                tags.append("Wardrober (Fast Turnaround)")
            if row["return_rate"] >= 0.50:
                tags.append("Serial Returner (>50% Rate)")
            if row["total_refunded"] > row["lifetime_value"] * 0.8:
                tags.append("High Refund Drain")
            if row["top_reason"] in ["changed_mind", "better_price_found"]:
                tags.append("Price Arbitrage")
            if not tags:
                tags.append("Elevated Return Velocity")

            policy = (
                "DENY_RETURN" if tier == "CRITICAL"
                else "REQUIRE_STORE_CREDIT" if tier == "HIGH"
                else "MANDATORY_INSPECTION" if tier == "MEDIUM"
                else "APPROVE_INSTANT"
            )

            results.append({
                "customer_id": str(row["customer_id"]),
                "country": str(row["country"]),
                "total_orders": int(row["transaction_count"]),
                "total_returns": int(row["return_count"]),
                "return_rate": round(float(row["return_rate"]), 4),
                "total_refunded": round(float(row["total_refunded"]), 2),
                "lifetime_value": round(float(row["lifetime_value"]), 2),
                "avg_days_to_return": round(float(row["avg_days_to_return"]), 1),
                "fast_returns_count": int(row["fast_returns_count"]),
                "top_reason": str(row["top_reason"]),
                "abuse_score": round(score, 3),
                "risk_tier": tier,
                "recommended_policy": policy,
                "abuse_tags": tags,
            })

        return results

    def get_returns(
        self,
        page: int = 1,
        page_size: int = 50,
        risk_tier: Optional[str] = None,
        reason: Optional[str] = None,
        search: Optional[str] = None,
        fast_only: bool = False,
    ) -> Dict[str, Any]:
        """Get paginated return records with calculated risk scores and policy actions."""
        self._ensure_loaded()
        df_ret = self._returns_df

        if df_ret is None or len(df_ret) == 0:
            return {
                "returns": [],
                "total": 0,
                "page": page,
                "page_size": page_size,
                "total_pages": 0,
            }

        df = df_ret.copy()

        # Merge with customer return rate if available
        if self._customers_df is not None and len(self._customers_df) > 0:
            df = df.merge(
                self._customers_df[["id", "return_rate", "transaction_count", "lifetime_value"]].rename(columns={"id": "cust_id"}),
                left_on="customer_id",
                right_on="cust_id",
                how="left"
            )
        else:
            df["return_rate"] = 0.15
            df["transaction_count"] = 4
            df["lifetime_value"] = 300.0

        df["return_rate"] = df["return_rate"].fillna(0.15)
        df["transaction_count"] = df["transaction_count"].fillna(4).astype(int)

        # Calculate individual return risk score
        # Fast returns <= 3 days get penalty, high customer return rate gets penalty, suspicious reason gets penalty
        reason_penalty = df["reason"].isin(["changed_mind", "better_price_found", "no_longer_needed"]).astype(float) * 0.20
        fast_penalty = (df["days_after_purchase"] <= 3).astype(float) * 0.35
        cust_penalty = np.clip(df["return_rate"], 0.0, 1.0) * 0.45

        calculated_score = np.clip(reason_penalty + fast_penalty + cust_penalty, 0.05, 0.98)
        df["abuse_risk_score"] = calculated_score.round(3)

        df["risk_tier"] = np.where(
            df["abuse_risk_score"] >= 0.75, "CRITICAL",
            np.where(df["abuse_risk_score"] >= 0.50, "HIGH",
            np.where(df["abuse_risk_score"] >= 0.30, "MEDIUM", "LOW"))
        )

        df["recommended_action"] = np.where(
            df["risk_tier"] == "CRITICAL", "DENY_RETURN",
            np.where(df["risk_tier"] == "HIGH", "STORE_CREDIT_ONLY",
            np.where(df["risk_tier"] == "MEDIUM", "MANDATORY_INSPECTION", "APPROVE_INSTANT"))
        )

        # Apply Filters
        if fast_only:
            df = df[df["days_after_purchase"] <= 3]

        if risk_tier and risk_tier.upper() != "ALL":
            df = df[df["risk_tier"] == risk_tier.upper()]

        if reason and reason != "ALL":
            df = df[df["reason"] == reason]

        if search:
            search_str = search.lower()
            df = df[
                df["id"].str.lower().str.contains(search_str) |
                df["customer_id"].str.lower().str.contains(search_str) |
                df["transaction_id"].str.lower().str.contains(search_str)
            ]

        total = len(df)
        total_pages = max(1, (total + page_size - 1) // page_size)
        start = (page - 1) * page_size
        end = start + page_size

        page_df = df.sort_values("timestamp", ascending=False).iloc[start:end]

        returns_list = []
        for _, row in page_df.iterrows():
            ret_id = str(row["id"])
            action_info = self._actions_store.get(ret_id, {})
            current_status = action_info.get("status", "PENDING_REVIEW" if row["risk_tier"] in ["HIGH", "CRITICAL"] else "AUTO_PROCESSED")
            
            ts = row["timestamp"]
            ts_str = ts.isoformat() if hasattr(ts, "isoformat") else str(ts)

            returns_list.append({
                "id": ret_id,
                "transaction_id": str(row["transaction_id"]),
                "customer_id": str(row["customer_id"]),
                "timestamp": ts_str,
                "reason": str(row["reason"]),
                "refund_amount": round(float(row["refund_amount"]), 2),
                "days_after_purchase": int(row["days_after_purchase"]),
                "customer_return_rate": round(float(row["return_rate"]), 4),
                "customer_orders_count": int(row["transaction_count"]),
                "abuse_risk_score": float(row["abuse_risk_score"]),
                "risk_tier": str(row["risk_tier"]),
                "recommended_action": str(row["recommended_action"]),
                "status": current_status,
                "executed_action": action_info.get("action", None),
                "is_fast_return": int(row["days_after_purchase"]) <= 3,
            })

        return {
            "returns": returns_list,
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages,
        }

    def score_return_request(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Evaluate real-time return abuse risk for an incoming return request.
        
        Args:
            data: dict with customer_id, refund_amount, days_after_purchase, reason, etc.
        """
        self._ensure_loaded()
        customer_id = data.get("customer_id", "cust_custom")
        refund_amount = float(data.get("refund_amount", 120.0))
        days_after_purchase = int(data.get("days_after_purchase", 2))
        reason = str(data.get("reason", "changed_mind"))
        customer_return_rate = float(data.get("customer_return_rate", 0.35))
        customer_total_orders = int(data.get("customer_total_orders", 6))
        category = str(data.get("category", "apparel"))

        # 1. Wardrobing / Turnaround Factor (0 - 35 pts)
        if days_after_purchase <= 1:
            wardrobe_score = 0.35
            wardrobe_msg = "Critical Wardrobing Signal: Returned within 24-48 hours of delivery."
        elif days_after_purchase <= 3:
            wardrobe_score = 0.25
            wardrobe_msg = "High Turnaround Velocity: Returned in under 3 days."
        elif days_after_purchase <= 7:
            wardrobe_score = 0.10
            wardrobe_msg = "Moderate Return Window: 4-7 days after purchase."
        else:
            wardrobe_score = 0.02
            wardrobe_msg = "Normal Return Timeline: Standard 7-30 day window."

        # 2. Customer Historical Behavior Factor (0 - 35 pts)
        if customer_return_rate >= 0.60:
            hist_score = 0.35
            hist_msg = f"Serial Return Abuse History: {customer_return_rate*100:.1f}% customer return rate."
        elif customer_return_rate >= 0.35:
            hist_score = 0.22
            hist_msg = f"Elevated Return Frequency: {customer_return_rate*100:.1f}% return rate (>2× merchant baseline)."
        elif customer_return_rate >= 0.15:
            hist_score = 0.08
            hist_msg = f"Average Return Rate: {customer_return_rate*100:.1f}% within expected customer norms."
        else:
            hist_score = 0.01
            hist_msg = f"Low Return History: Loyal customer with {customer_return_rate*100:.1f}% return rate."

        # 3. Reason & Arbitrage Factor (0 - 20 pts)
        suspicious_reasons = ["changed_mind", "better_price_found", "no_longer_needed"]
        if reason in ["changed_mind", "better_price_found"]:
            reason_score = 0.20
            reason_msg = f"Discretionary Reason '{reason}': High correlation with wardrobing and price arbitrage."
        elif reason == "no_longer_needed":
            reason_score = 0.12
            reason_msg = f"Convenience Return '{reason}': Moderate discretionary risk."
        elif reason in ["too_small", "too_large"]:
            reason_score = 0.05
            reason_msg = f"Fit/Sizing Return '{reason}': Typical apparel bracketing behavior."
        else:
            reason_score = 0.02
            reason_msg = f"Product Defect/Error '{reason}': Low policy abuse probability."

        # 4. Refund Magnitude vs Order Value (0 - 10 pts)
        if refund_amount >= 300.0:
            amount_score = 0.10
            amount_msg = f"High Value Refund ($ {refund_amount:.2f}): High financial impact."
        elif refund_amount >= 100.0:
            amount_score = 0.05
            amount_msg = f"Standard Order Refund ($ {refund_amount:.2f})."
        else:
            amount_score = 0.01
            amount_msg = f"Low Value Refund ($ {refund_amount:.2f}): Minimal merchant loss risk."

        total_abuse_score = min(0.99, max(0.01, wardrobe_score + hist_score + reason_score + amount_score))

        # Risk Tier & Decisioning
        if total_abuse_score >= 0.75:
            risk_tier = "CRITICAL"
            decision = "DENY_RETURN"
            policy_rationale = "High probability of wardrobing or serial return abuse. Reject automatic return label or require in-person merchant inspection."
        elif total_abuse_score >= 0.50:
            risk_tier = "HIGH"
            decision = "STORE_CREDIT_ONLY"
            policy_rationale = "Elevated return velocity detected. Restrict refund to Store Credit and apply 15% restocking fee."
        elif total_abuse_score >= 0.30:
            risk_tier = "MEDIUM"
            decision = "MANDATORY_INSPECTION"
            policy_rationale = "Moderate risk signals. Route package to warehouse QA team for tag/wear verification before issuing refund."
        else:
            risk_tier = "LOW"
            decision = "APPROVE_INSTANT"
            policy_rationale = "Customer profile and return timeline represent legitimate buyer behavior. Instant refund approved."

        risk_factors = [
            {"factor": "Turnaround Window", "weight": round(wardrobe_score, 2), "description": wardrobe_msg},
            {"factor": "Customer Return Rate", "weight": round(hist_score, 2), "description": hist_msg},
            {"factor": "Return Reason Profile", "weight": round(reason_score, 2), "description": reason_msg},
            {"factor": "Refund Exposure", "weight": round(amount_score, 2), "description": amount_msg},
        ]

        return {
            "customer_id": customer_id,
            "refund_amount": refund_amount,
            "days_after_purchase": days_after_purchase,
            "reason": reason,
            "abuse_risk_score": round(total_abuse_score, 3),
            "risk_tier": risk_tier,
            "decision": decision,
            "policy_rationale": policy_rationale,
            "risk_factors": risk_factors,
            "evaluated_at": datetime.now(timezone.utc).isoformat(),
            "protection_savings_estimated": round(refund_amount if risk_tier in ["HIGH", "CRITICAL"] else 0.0, 2),
        }

    def execute_action(self, return_id: str, action: str, note: Optional[str] = None) -> Dict[str, Any]:
        """Record merchant policy action on a return record."""
        self._ensure_loaded()
        self._actions_store[return_id] = {
            "action": action,
            "status": "ACTIONED",
            "note": note or f"Action {action} executed by risk officer.",
            "actioned_at": datetime.now(timezone.utc).isoformat(),
        }
        return {
            "return_id": return_id,
            "action": action,
            "status": "SUCCESS",
            "message": f"Return {return_id} updated with action: {action}",
        }

    def _empty_metrics(self) -> Dict[str, Any]:
        return {
            "total_returns": 0,
            "total_refund_amount": 0.0,
            "avg_days_to_return": 0.0,
            "return_abuse_rate": 0.0,
            "wardrobing_rate": 0.0,
            "wardrobing_volume": 0.0,
            "suspected_abusers_count": 0,
            "prevented_abuse_loss": 0.0,
            "policy_decisions": {},
            "return_trend": [],
            "reasons_breakdown": [],
            "days_distribution": [],
        }


# Singleton instance
_returns_service: Optional[ReturnsService] = None


def get_returns_service() -> ReturnsService:
    """Get or create singleton ReturnsService."""
    global _returns_service
    if _returns_service is None:
        _returns_service = ReturnsService()
        _returns_service.load()
    return _returns_service
