"""
SignalX - Webhook Ingest & Live Traffic Simulator API

Provides enterprise webhooks for:
1. Stripe E-Commerce (`charge.dispute.created`, `payment_intent.succeeded`)
2. Shopify Orders & Returns (`orders/create`, `refunds/create`)
3. Live Traffic Simulator for Buildathon demonstrations
"""

import time
import random
import logging
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Request, Header, HTTPException, Depends
from pydantic import BaseModel

from backend.app.api.routes_risk import get_risk_service
from backend.app.services.returns_service import get_returns_service
from backend.app.services.chargebacks_service import get_chargebacks_service
from backend.app.services.supabase_service import get_supabase_service
from backend.app.risk_engine.velocity_tracker import get_velocity_tracker

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/webhooks", tags=["Webhooks & Simulator"])


class TrafficSimRequest(BaseModel):
    batch_size: int = 10
    fraud_ratio: float = 0.20
    include_wardrobers: bool = True
    target_country: Optional[str] = None


class TrafficSimResponse(BaseModel):
    total_processed: int
    allowed_count: int
    reviewed_count: int
    blocked_count: int
    prevented_loss_usd: float
    transactions: List[Dict[str, Any]]
    execution_time_ms: float


@router.post("/stripe", summary="Stripe Webhook Listener")
async def stripe_webhook_listener(
    request: Request,
    stripe_signature: Optional[str] = Header(None)
):
    """
    Ingests live Stripe webhook events and triggers real-time risk decisioning.
    """
    payload = await request.json()
    event_type = payload.get("type", "unknown")
    event_data = payload.get("data", {}).get("object", {})

    risk_service = get_risk_service()
    supabase_service = get_supabase_service()
    velocity_tracker = get_velocity_tracker()

    response_summary = {"status": "success", "event_type": event_type}

    if event_type == "payment_intent.created" or event_type == "charge.created":
        amount = event_data.get("amount", 10000) / 100.0
        cust_id = event_data.get("customer", f"cust_{random.randint(1000, 9999)}")
        payment_method = event_data.get("payment_method_types", ["card"])[0]
        ip_address = event_data.get("metadata", {}).get("ip_address", "192.168.1.1")
        device_id = event_data.get("metadata", {}).get("device_id", f"dev_{random.randint(100, 999)}")

        # Record in velocity engine
        velocity_tracker.record_event(
            ip=ip_address,
            device_id=device_id,
            customer_id=cust_id,
            amount=amount
        )

        # Score in Risk Engine
        assessment = risk_service.score_transaction({
            "customer_id": cust_id,
            "amount": amount,
            "payment_method": payment_method,
            "ip_address": ip_address,
            "device_id": device_id,
            "billing_country": event_data.get("currency", "usd").upper()[:2],
        })

        # Broadcast event
        supabase_service.broadcast_transaction_event({
            "id": event_data.get("id", f"ch_{int(time.time())}"),
            "customer_id": cust_id,
            "amount": amount,
            "payment_method": payment_method,
            "risk_score": getattr(assessment, "risk_score", 0.1),
            "risk_level": getattr(assessment, "risk_level", "LOW"),
            "decision": getattr(assessment, "decision", "ALLOW"),
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        })

        response_summary["decision"] = getattr(assessment, "decision", "ALLOW")
        response_summary["risk_score"] = getattr(assessment, "risk_score", 0.1)

    elif event_type == "charge.dispute.created":
        chargebacks_service = get_chargebacks_service()
        dispute_id = event_data.get("id", f"dp_{int(time.time())}")
        amount = event_data.get("amount", 25000) / 100.0
        reason = event_data.get("reason", "fraudulent")

        supabase_service.sync_dispute_case({
            "dispute_id": dispute_id,
            "amount": amount,
            "reason": reason,
            "status": "NEEDS_RESPONSE",
        })
        response_summary["dispute_id"] = dispute_id

    return response_summary


@router.post("/shopify", summary="Shopify Webhook Listener")
async def shopify_webhook_listener(
    request: Request,
    x_shopify_topic: Optional[str] = Header(None)
):
    """
    Ingests live Shopify orders, returns, and dispute webhooks.
    """
    payload = await request.json()
    topic = x_shopify_topic or "orders/create"
    response_summary = {"status": "success", "topic": topic}

    if "refund" in topic or "return" in topic:
        returns_service = get_returns_service()
        amount = float(payload.get("total_refund_amount", payload.get("amount", 120.0)))
        cust_id = str(payload.get("customer", {}).get("id", f"cust_{random.randint(1000, 9999)}"))

        score_res = returns_service.score_return_request({
            "customer_id": cust_id,
            "refund_amount": amount,
            "days_after_purchase": payload.get("days_since_order", 2),
            "reason": payload.get("reason", "changed_mind"),
            "category": payload.get("category", "apparel"),
        })
        response_summary["return_decision"] = score_res.get("decision")
        response_summary["abuse_risk_score"] = score_res.get("abuse_risk_score")

    return response_summary


@router.post("/razorpay", summary="Razorpay Webhook Listener")

async def razorpay_webhook_listener(
    request: Request,
    x_razorpay_signature: Optional[str] = Header(None)
):
    """
    Ingests live Razorpay webhook events (payment.authorized, payment.failed, order.paid, dispute.created).
    Performs sub-10ms risk scoring and broadcasts live risk assessments to Supabase.
    """
    payload = await request.json()
    event_type = payload.get("event", "payment.authorized")
    event_data = payload.get("payload", {}).get("payment", {}).get("entity", {})

    risk_service = get_risk_service()
    supabase_service = get_supabase_service()
    velocity_tracker = get_velocity_tracker()

    response_summary = {"status": "success", "event": event_type}

    if "payment" in event_type or "order" in event_type:
        amount = float(event_data.get("amount", 249900)) / 100.0  # Razorpay amounts in paise
        cust_id = str(event_data.get("customer_id") or event_data.get("contact") or f"cust_{random.randint(1000, 9999)}")
        payment_method = str(event_data.get("method", "card"))
        ip_address = str(event_data.get("notes", {}).get("ip_address", "103.21.244.0"))
        device_id = str(event_data.get("notes", {}).get("device_id", f"dev_{random.randint(100, 999)}"))

        # Record in velocity engine
        velocity_tracker.record_event(
            ip=ip_address,
            device_id=device_id,
            customer_id=cust_id,
            amount=amount
        )

        # Score in Risk Engine
        assessment = risk_service.score_transaction({
            "customer_id": cust_id,
            "amount": amount,
            "payment_method": "credit_card" if "card" in payment_method else payment_method,
            "ip_address": ip_address,
            "device_id": device_id,
            "billing_country": "IN",
            "shipping_country": "IN",
        })

        decision = getattr(assessment, "decision", "ALLOW")
        risk_score = getattr(assessment, "risk_score", 0.08)

        # Broadcast event to Supabase
        supabase_service.broadcast_transaction_event({
            "id": event_data.get("id", f"pay_{int(time.time())}"),
            "customer_id": cust_id,
            "amount": amount,
            "payment_method": payment_method,
            "risk_score": risk_score,
            "risk_level": getattr(assessment, "risk_level", "LOW"),
            "decision": decision,
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        })

        response_summary["decision"] = decision
        response_summary["risk_score"] = risk_score
        response_summary["recommendation"] = "PROCEED" if decision == "ALLOW" else ("MANUAL_REVIEW" if decision == "REVIEW" else "REJECT")

    elif "dispute" in event_type:
        dispute_entity = payload.get("payload", {}).get("dispute", {}).get("entity", {})
        dispute_id = dispute_entity.get("id", f"disp_{int(time.time())}")
        amount = float(dispute_entity.get("amount", 50000)) / 100.0
        reason = dispute_entity.get("reason_code", "fraudulent")

        supabase_service.sync_dispute_case({
            "dispute_id": dispute_id,
            "amount": amount,
            "reason": reason,
            "status": "NEEDS_RESPONSE",
        })
        response_summary["dispute_id"] = dispute_id

    return response_summary


@router.post("/simulate-traffic", response_model=TrafficSimResponse, summary="Live E-Commerce Traffic Simulator")

async def simulate_live_traffic(req: TrafficSimRequest):
    """
    Simulates a high-throughput stream of live e-commerce transactions for live demonstration.
    Injects realistic benign shoppers, fast wardrobers, card testers, and syndicate clusters.
    """
    start_time = time.time()
    risk_service = get_risk_service()
    velocity_tracker = get_velocity_tracker()
    supabase_service = get_supabase_service()

    processed_txns = []
    allowed_cnt = 0
    reviewed_cnt = 0
    blocked_cnt = 0
    prevented_loss = 0.0

    countries = ["US", "GB", "CA", "DE", "FR", "AU", "NG", "BR"]
    payment_methods = ["credit_card", "debit_card", "paypal", "apple_pay"]

    for i in range(req.batch_size):
        is_fraud = random.random() < req.fraud_ratio
        amount = round(random.uniform(25.0, 1850.0), 2) if is_fraud else round(random.uniform(15.0, 320.0), 2)
        cust_id = f"cust_{random.randint(1000, 9999)}"
        ip = "10.99.36.126" if is_fraud and random.random() < 0.6 else f"192.168.{random.randint(1,250)}.{random.randint(1,250)}"
        device_id = "dev_ring_0026" if is_fraud and random.random() < 0.6 else f"dev_{random.randint(1000, 9999)}"
        country = req.target_country or ("NG" if is_fraud and random.random() < 0.4 else random.choice(countries))
        pm = random.choice(payment_methods)

        # Track velocity
        velocity_tracker.record_event(ip=ip, device_id=device_id, customer_id=cust_id, amount=amount)

        # Score
        assessment = risk_service.score_transaction({
            "customer_id": cust_id,
            "amount": amount,
            "payment_method": pm,
            "ip_address": ip,
            "device_id": device_id,
            "billing_country": country,
            "shipping_country": "US" if country != "US" and is_fraud else country,
        })

        decision = getattr(assessment, "decision", "ALLOW")
        risk_score = getattr(assessment, "risk_score", 0.05)
        risk_level = getattr(assessment, "risk_level", "LOW")

        if decision == "ALLOW":
            allowed_cnt += 1
        elif decision == "REVIEW":
            reviewed_cnt += 1
        else:
            blocked_cnt += 1
            prevented_loss += amount

        txn_record = {
            "id": f"SIM-{int(time.time()*1000)%10000000}-{i}",
            "customer_id": cust_id,
            "amount": amount,
            "payment_method": pm,
            "billing_country": country,
            "risk_score": risk_score,
            "risk_level": risk_level,
            "decision": decision,
            "is_syndicate": device_id == "dev_ring_0026" or ip == "10.99.36.126",
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        }
        processed_txns.append(txn_record)

        # Broadcast event
        supabase_service.broadcast_transaction_event(txn_record)

    duration_ms = round((time.time() - start_time) * 1000, 2)

    return TrafficSimResponse(
        total_processed=len(processed_txns),
        allowed_count=allowed_cnt,
        reviewed_count=reviewed_cnt,
        blocked_count=blocked_cnt,
        prevented_loss_usd=round(prevented_loss, 2),
        transactions=processed_txns,
        execution_time_ms=duration_ms,
    )
