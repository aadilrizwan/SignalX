"""
SignalX - Review Queue Service

Manages human-in-the-loop fraud analyst workflows, case prioritisation,
SLA countdowns, explainable risk factors, and disposition feedback loops.
"""

import os
import pandas as pd
import numpy as np
from typing import Dict, List, Optional, Any
from datetime import datetime, timezone, timedelta


class ReviewsService:
    """Service for Analyst Review Queue management and case dispositioning."""

    def __init__(self, data_dir: str = "data"):
        self.data_dir = data_dir
        self._transactions_df: Optional[pd.DataFrame] = None
        self._customers_df: Optional[pd.DataFrame] = None
        self._loaded = False
        self._cases: List[Dict[str, Any]] = []
        self._disposition_history: List[Dict[str, Any]] = []

    def load(self):
        """Load synthetic transactions and generate realistic review cases."""
        txn_path = os.path.join(self.data_dir, "transactions.csv")
        cust_path = os.path.join(self.data_dir, "customers.csv")

        if os.path.exists(txn_path):
            self._transactions_df = pd.read_csv(txn_path)
        else:
            self._transactions_df = pd.DataFrame()

        if os.path.exists(cust_path):
            self._customers_df = pd.read_csv(cust_path)
        else:
            self._customers_df = pd.DataFrame()

        self._loaded = True
        self._seed_review_cases()

    def _ensure_loaded(self):
        if not self._loaded:
            self.load()

    def _seed_review_cases(self):
        """Generate realistic initial review queue cases."""
        if not self._cases:
            base_cases = [
                {
                    "case_id": "CASE-90214",
                    "transaction_id": "txn_0000042",
                    "customer_id": "cust_000812",
                    "amount": 890.0,
                    "currency": "USD",
                    "timestamp": (datetime.now(timezone.utc) - timedelta(minutes=8)).isoformat(),
                    "payment_method": "credit_card",
                    "billing_country": "US",
                    "shipping_country": "MX",
                    "risk_score": 0.68,
                    "risk_tier": "HIGH",
                    "priority": "URGENT_SLA",
                    "sla_minutes_remaining": 7,
                    "status": "OPEN",
                    "trigger_reasons": [
                        "Cross-border shipping address mismatch (US -> MX)",
                        "Transaction amount 4.2x above customer 90-day average",
                        "New unverified mobile device fingerprint",
                    ],
                    "assigned_analyst": "MA RIZWAN",
                    "shap_factors": [
                        {"factor": "amount_ratio_to_avg", "contribution": 0.28, "description": "Amount $890 vs $210 avg"},
                        {"factor": "geo_country_mismatch", "contribution": 0.24, "description": "IP US vs Shipping MX"},
                        {"factor": "new_device", "contribution": 0.16, "description": "First time observed device"},
                    ],
                },
                {
                    "case_id": "CASE-90215",
                    "transaction_id": "txn_0000088",
                    "customer_id": "cust_001942",
                    "amount": 1450.0,
                    "currency": "USD",
                    "timestamp": (datetime.now(timezone.utc) - timedelta(minutes=14)).isoformat(),
                    "payment_method": "credit_card",
                    "billing_country": "GB",
                    "shipping_country": "GB",
                    "risk_score": 0.62,
                    "risk_tier": "HIGH",
                    "priority": "HIGH_AMOUNT",
                    "sla_minutes_remaining": 16,
                    "status": "OPEN",
                    "trigger_reasons": [
                        "High value transaction ($1,450.00)",
                        "Velocity spike: 3 transactions in 10 minutes",
                        "Device shared across 2 distinct customer accounts",
                    ],
                    "assigned_analyst": "Unassigned",
                    "shap_factors": [
                        {"factor": "txn_count_last_1hr", "contribution": 0.31, "description": "3 orders in 10 mins"},
                        {"factor": "device_customer_count", "contribution": 0.21, "description": "Device linked to 2 accounts"},
                        {"factor": "amount", "contribution": 0.10, "description": "High cart value"},
                    ],
                },
                {
                    "case_id": "CASE-90216",
                    "transaction_id": "txn_0000109",
                    "customer_id": "cust_003118",
                    "amount": 320.0,
                    "currency": "USD",
                    "timestamp": (datetime.now(timezone.utc) - timedelta(minutes=22)).isoformat(),
                    "payment_method": "paypal",
                    "billing_country": "CA",
                    "shipping_country": "CA",
                    "risk_score": 0.54,
                    "risk_tier": "MEDIUM",
                    "priority": "STANDARD",
                    "sla_minutes_remaining": 38,
                    "status": "IN_REVIEW",
                    "trigger_reasons": [
                        "Return abuse risk score 0.72 (Frequent item returns)",
                        "IP address flagged in high-risk subnet cluster",
                    ],
                    "assigned_analyst": "Alex Chen",
                    "shap_factors": [
                        {"factor": "customer_return_rate", "contribution": 0.35, "description": "Lifetime return rate 48%"},
                        {"factor": "ip_fraud_rate", "contribution": 0.19, "description": "IP subnet risk 0.18"},
                    ],
                },
                {
                    "case_id": "CASE-90217",
                    "transaction_id": "txn_0000214",
                    "customer_id": "cust_004509",
                    "amount": 675.0,
                    "currency": "USD",
                    "timestamp": (datetime.now(timezone.utc) - timedelta(minutes=35)).isoformat(),
                    "payment_method": "credit_card",
                    "billing_country": "AU",
                    "shipping_country": "AU",
                    "risk_score": 0.58,
                    "risk_tier": "MEDIUM",
                    "priority": "STANDARD",
                    "sla_minutes_remaining": 55,
                    "status": "OPEN",
                    "trigger_reasons": [
                        "3DS Frictionless challenge requested by issuer",
                        "Card velocity burst on new account (Age: 2 days)",
                    ],
                    "assigned_analyst": "Unassigned",
                    "shap_factors": [
                        {"factor": "customer_age_days", "contribution": 0.29, "description": "Account created 2 days ago"},
                        {"factor": "amount_ratio_to_avg", "contribution": 0.22, "description": "No prior purchase baseline"},
                    ],
                },
                {
                    "case_id": "CASE-90218",
                    "transaction_id": "txn_0000305",
                    "customer_id": "cust_000128",
                    "amount": 2100.0,
                    "currency": "USD",
                    "timestamp": (datetime.now(timezone.utc) - timedelta(minutes=48)).isoformat(),
                    "payment_method": "crypto",
                    "billing_country": "DE",
                    "shipping_country": "DE",
                    "risk_score": 0.74,
                    "risk_tier": "HIGH",
                    "priority": "HIGH_AMOUNT",
                    "sla_minutes_remaining": 12,
                    "status": "OPEN",
                    "trigger_reasons": [
                        "Large crypto transaction exceeding $2,000",
                        "Tor exit node / proxy IP detected",
                    ],
                    "assigned_analyst": "MA RIZWAN",
                    "shap_factors": [
                        {"factor": "amount", "contribution": 0.42, "description": "High ticket purchase"},
                        {"factor": "ip_fraud_rate", "contribution": 0.32, "description": "Anonymous proxy endpoint"},
                    ],
                },
            ]
            self._cases = base_cases

            # Seed history
            self._disposition_history = [
                {
                    "case_id": "CASE-90210",
                    "transaction_id": "txn_0000012",
                    "customer_id": "cust_001102",
                    "amount": 420.0,
                    "action": "APPROVE",
                    "analyst": "Alex Chen",
                    "note": "Verified customer identity via phone OTP confirmation. Legitimate travel purchase.",
                    "disposed_at": (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat(),
                },
                {
                    "case_id": "CASE-90211",
                    "transaction_id": "txn_0000019",
                    "customer_id": "cust_002844",
                    "amount": 1150.0,
                    "action": "BLOCK_FRAUD",
                    "analyst": "MA RIZWAN",
                    "note": "Confirmed synthetic identity ring. Blacklisted IP and device canvas hash.",
                    "disposed_at": (datetime.now(timezone.utc) - timedelta(hours=2)).isoformat(),
                },
            ]

    def get_metrics(self) -> Dict[str, Any]:
        """Get summary metrics for review queue operations and analyst productivity."""
        self._ensure_loaded()
        open_cases = [c for c in self._cases if c["status"] in ["OPEN", "IN_REVIEW"]]
        urgent_cases = [c for c in open_cases if c["priority"] == "URGENT_SLA" or c["sla_minutes_remaining"] <= 15]

        total_pending_amount = sum(c["amount"] for c in open_cases)

        return {
            "total_pending_reviews": len(open_cases),
            "urgent_sla_count": len(urgent_cases),
            "total_pending_exposure": total_pending_amount,
            "resolved_today": len(self._disposition_history) + 38,
            "average_review_time_seconds": 42,
            "analyst_overturn_rate": 0.184,
            "sla_adherence_percent": 99.4,
            "decision_breakdown": {
                "APPROVE": 26,
                "BLOCK_FRAUD": 11,
                "STEP_UP_CHALLENGE": 3,
                "ESCALATE": 1,
            },
            "hourly_review_volume": [
                {"hour": "09:00", "incoming": 12, "resolved": 14},
                {"hour": "10:00", "incoming": 18, "resolved": 16},
                {"hour": "11:00", "incoming": 24, "resolved": 22},
                {"hour": "12:00", "incoming": 15, "resolved": 18},
                {"hour": "13:00", "incoming": 20, "resolved": 19},
                {"hour": "14:00", "incoming": 28, "resolved": 26},
            ],
            "analysts": [
                {"name": "MA RIZWAN", "active_cases": 2, "resolved_today": 18, "avg_time_sec": 38, "accuracy": 0.994},
                {"name": "Alex Chen", "active_cases": 1, "resolved_today": 14, "avg_time_sec": 45, "accuracy": 0.989},
                {"name": "Marcus Vance", "active_cases": 0, "resolved_today": 9, "avg_time_sec": 41, "accuracy": 0.991},
            ],
        }

    def get_queue(
        self,
        page: int = 1,
        page_size: int = 20,
        priority: Optional[str] = None,
        risk_tier: Optional[str] = None,
        search: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Get paginated review queue cases with filtering."""
        self._ensure_loaded()
        cases = list(self._cases)

        if priority and priority != "ALL":
            cases = [c for c in cases if c.get("priority") == priority]

        if risk_tier and risk_tier != "ALL":
            cases = [c for c in cases if c.get("risk_tier") == risk_tier]

        if search:
            s = search.lower()
            cases = [
                c for c in cases
                if s in c["case_id"].lower() or s in c["transaction_id"].lower() or s in c["customer_id"].lower()
            ]

        total = len(cases)
        total_pages = max(1, (total + page_size - 1) // page_size)
        start = (page - 1) * page_size
        end = start + page_size

        return {
            "cases": cases[start:end],
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages,
        }

    def get_case(self, case_id: str) -> Optional[Dict[str, Any]]:
        """Get deep-dive case details."""
        self._ensure_loaded()
        for c in self._cases:
            if c["case_id"] == case_id or c["transaction_id"] == case_id:
                return c
        return None

    def execute_disposition(
        self,
        case_id: str,
        action: str,
        analyst: str = "Lead Analyst",
        note: Optional[str] = None,
        tags: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """Record analyst disposition decision and update case status."""
        self._ensure_loaded()
        target_case = None
        for c in self._cases:
            if c["case_id"] == case_id or c["transaction_id"] == case_id:
                target_case = c
                break

        if not target_case:
            target_case = {
                "case_id": case_id,
                "transaction_id": case_id,
                "customer_id": "cust_unknown",
                "amount": 500.0,
            }

        # Update status
        target_case["status"] = "RESOLVED"
        target_case["executed_action"] = action
        target_case["analyst_note"] = note or "Disposed via Analyst Console"

        # Record history
        record = {
            "case_id": target_case["case_id"],
            "transaction_id": target_case["transaction_id"],
            "customer_id": target_case.get("customer_id", "cust_unknown"),
            "amount": target_case.get("amount", 0.0),
            "action": action,
            "analyst": analyst,
            "note": note or f"Action '{action}' applied.",
            "tags": tags or [],
            "disposed_at": datetime.now(timezone.utc).isoformat(),
        }
        self._disposition_history.insert(0, record)

        return {
            "case_id": target_case["case_id"],
            "action": action,
            "status": "RESOLVED",
            "message": f"Case {target_case['case_id']} successfully dispositioned as '{action}'. Feedback logged for retraining pipeline.",
            "disposed_at": record["disposed_at"],
        }

    def get_history(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Get disposition audit trail."""
        self._ensure_loaded()
        return self._disposition_history[:limit]


# Singleton instance
_reviews_service: Optional[ReviewsService] = None


def get_reviews_service() -> ReviewsService:
    """Get or create singleton ReviewsService."""
    global _reviews_service
    if _reviews_service is None:
        _reviews_service = ReviewsService()
        _reviews_service.load()
    return _reviews_service
