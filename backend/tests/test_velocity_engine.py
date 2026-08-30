"""
SignalX - Velocity Engine Tests
Tests sub-millisecond sliding-window velocity tracker across IP, Device, Card, and Customer.
"""

import time
import pytest
from backend.app.risk_engine.velocity_tracker import VelocityTracker, WINDOW_1M, WINDOW_5M


def test_velocity_tracker_in_memory():
    tracker = VelocityTracker(redis_url=None)
    assert not tracker.use_redis

    now = time.time()

    # Record 5 transactions from same IP within 10 seconds
    for i in range(5):
        tracker.record_event(
            ip="192.168.1.100",
            device_id="dev_test_01",
            customer_id="cust_001",
            amount=100.0,
            timestamp=now - (i * 2)
        )

    # Check 1m velocity
    cnt, amt = tracker.get_velocity("ip", "192.168.1.100", WINDOW_1M)
    assert cnt == 5
    assert amt == 500.0

    # Check device velocity
    dev_cnt, dev_amt = tracker.get_velocity("dev", "dev_test_01", WINDOW_1M)
    assert dev_cnt == 5
    assert dev_amt == 500.0

    # Get all velocities dictionary
    all_vel = tracker.get_all_velocities(
        ip="192.168.1.100",
        device_id="dev_test_01",
        customer_id="cust_001",
    )
    assert all_vel["ip_txns_1m"] == 5
    assert all_vel["dev_txns_1m"] == 5
    assert all_vel["is_velocity_burst"] is True


def test_rate_limiter():
    tracker = VelocityTracker(redis_url=None)
    identifier = "client_ip_123"

    # Allow up to 3 requests
    allowed1, cnt1, _ = tracker.check_rate_limit(identifier, limit=3, window_seconds=60)
    assert allowed1 is True
    assert cnt1 == 1

    allowed2, cnt2, _ = tracker.check_rate_limit(identifier, limit=3, window_seconds=60)
    assert allowed2 is True
    assert cnt2 == 2

    allowed3, cnt3, _ = tracker.check_rate_limit(identifier, limit=3, window_seconds=60)
    assert allowed3 is True
    assert cnt3 == 3

    # 4th request must be blocked by rate limiter
    allowed4, cnt4, retry_after = tracker.check_rate_limit(identifier, limit=3, window_seconds=60)
    assert allowed4 is False
    assert retry_after > 0
