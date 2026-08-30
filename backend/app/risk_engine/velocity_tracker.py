"""
SignalX - Real-Time Sliding Window Velocity Engine

Calculates sub-millisecond transaction velocity metrics across IP, Device,
Card, and Customer dimensions using Redis Sorted Sets (ZADD, ZREMRANGEBYSCORE, ZCARD, ZRANGEBYSCORE).

If Redis is not configured or unreachable, automatically falls back to a thread-safe
in-memory sliding window cache.
"""

import time
import logging
from typing import Dict, Any, Tuple, Optional
from collections import defaultdict, deque
import threading

logger = logging.getLogger(__name__)

# Sliding windows in seconds
WINDOW_1M = 60
WINDOW_5M = 300
WINDOW_1H = 3600
WINDOW_24H = 86400


class InMemoryVelocityStore:
    """Thread-safe fallback in-memory sliding window tracker."""

    def __init__(self):
        self._lock = threading.Lock()
        # key -> deque of (timestamp, amount)
        self._store: Dict[str, deque] = defaultdict(deque)

    def record(self, key: str, amount: float, timestamp: Optional[float] = None):
        ts = timestamp or time.time()
        with self._lock:
            self._store[key].append((ts, amount))
            # Prune entries older than 24 hours to prevent memory leak
            cutoff = ts - WINDOW_24H
            dq = self._store[key]
            while dq and dq[0][0] < cutoff:
                dq.popleft()

    def get_velocity(self, key: str, window_seconds: int, now: Optional[float] = None) -> Tuple[int, float]:
        ts = now or time.time()
        cutoff = ts - window_seconds
        with self._lock:
            dq = self._store.get(key)
            if not dq:
                return 0, 0.0
            count = 0
            total_amount = 0.0
            for item_ts, item_amt in reversed(dq):
                if item_ts >= cutoff:
                    count += 1
                    total_amount += item_amt
                else:
                    break
            return count, total_amount

    def check_rate_limit(self, key: str, limit: int, window_seconds: int) -> Tuple[bool, int, int]:
        now = time.time()
        count, _ = self.get_velocity(f"ratelimit:{key}", window_seconds, now)
        if count >= limit:
            return False, count, window_seconds
        self.record(f"ratelimit:{key}", 1.0, now)
        return True, count + 1, 0


class VelocityTracker:
    """
    Sub-millisecond sliding window velocity engine for real-time fraud defense.
    """

    def __init__(self, redis_url: Optional[str] = None):
        self.redis_client = None
        self.in_memory = InMemoryVelocityStore()
        self.use_redis = False

        if redis_url:
            try:
                import redis
                self.redis_client = redis.from_url(
                    redis_url,
                    socket_connect_timeout=2.0,
                    socket_timeout=2.0,
                    decode_responses=True
                )
                self.redis_client.ping()
                self.use_redis = True
                logger.info("VelocityTracker successfully connected to Redis at %s", redis_url)
            except Exception as e:
                logger.warning("Failed to connect to Redis (%s). Using in-memory fallback: %s", redis_url, e)
                self.use_redis = False

    def record_event(
        self,
        ip: Optional[str] = None,
        device_id: Optional[str] = None,
        customer_id: Optional[str] = None,
        card_hash: Optional[str] = None,
        amount: float = 0.0,
        timestamp: Optional[float] = None
    ):
        """Record a transaction event across all dimension keys."""
        ts = timestamp or time.time()
        keys = []
        if ip:
            keys.append(f"velocity:ip:{ip}")
        if device_id:
            keys.append(f"velocity:dev:{device_id}")
        if customer_id:
            keys.append(f"velocity:cust:{customer_id}")
        if card_hash:
            keys.append(f"velocity:card:{card_hash}")

        if self.use_redis and self.redis_client:
            try:
                pipe = self.redis_client.pipeline()
                for k in keys:
                    # member is formatted as "{timestamp}:{amount}:{random_salt}"
                    member = f"{ts}:{amount}:{time.time_ns()}"
                    pipe.zadd(k, {member: ts})
                    pipe.zremrangebyscore(k, "-inf", ts - WINDOW_24H)
                    pipe.expire(k, WINDOW_24H + 300)
                pipe.execute()
                return
            except Exception as e:
                logger.warning("Redis record_event error, falling back to memory: %s", e)

        # Fallback in memory
        for k in keys:
            self.in_memory.record(k, amount, ts)

    def get_velocity(self, entity_type: str, entity_id: str, window_seconds: int) -> Tuple[int, float]:
        """Get the count and sum amount for an entity in the given sliding window."""
        key = f"velocity:{entity_type}:{entity_id}"
        now = time.time()
        cutoff = now - window_seconds

        if self.use_redis and self.redis_client:
            try:
                # Count elements in window
                count = self.redis_client.zcount(key, cutoff, "+inf")
                # Sum amounts
                members = self.redis_client.zrangebyscore(key, cutoff, "+inf")
                total_amt = 0.0
                for m in members:
                    parts = m.split(":")
                    if len(parts) >= 2:
                        try:
                            total_amt += float(parts[1])
                        except ValueError:
                            pass
                return count, total_amt
            except Exception as e:
                logger.warning("Redis get_velocity error, falling back to memory: %s", e)

        return self.in_memory.get_velocity(key, window_seconds, now)

    def get_all_velocities(
        self,
        ip: Optional[str] = None,
        device_id: Optional[str] = None,
        customer_id: Optional[str] = None,
        card_hash: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Calculates all standard velocity features (1m, 5m, 1h, 24h) for a transaction request.
        Returns a dictionary ready for the feature engine.
        """
        ip_1m_cnt, ip_1m_amt = self.get_velocity("ip", ip, WINDOW_1M) if ip else (0, 0.0)
        ip_5m_cnt, ip_5m_amt = self.get_velocity("ip", ip, WINDOW_5M) if ip else (0, 0.0)
        ip_1h_cnt, ip_1h_amt = self.get_velocity("ip", ip, WINDOW_1H) if ip else (0, 0.0)

        dev_1m_cnt, dev_1m_amt = self.get_velocity("dev", device_id, WINDOW_1M) if device_id else (0, 0.0)
        dev_5m_cnt, dev_5m_amt = self.get_velocity("dev", device_id, WINDOW_5M) if device_id else (0, 0.0)
        dev_1h_cnt, dev_1h_amt = self.get_velocity("dev", device_id, WINDOW_1H) if device_id else (0, 0.0)

        cust_5m_cnt, cust_5m_amt = self.get_velocity("cust", customer_id, WINDOW_5M) if customer_id else (0, 0.0)
        cust_1h_cnt, cust_1h_amt = self.get_velocity("cust", customer_id, WINDOW_1H) if customer_id else (0, 0.0)
        cust_24h_cnt, cust_24h_amt = self.get_velocity("cust", customer_id, WINDOW_24H) if customer_id else (0, 0.0)

        card_1m_cnt, card_1m_amt = self.get_velocity("card", card_hash, WINDOW_1M) if card_hash else (0, 0.0)

        # Flag velocity bursts (e.g. Card testing attacks: >5 txns/min or >15 txns/5min)
        is_velocity_burst = (
            ip_1m_cnt >= 5 or
            dev_1m_cnt >= 5 or
            card_1m_cnt >= 4 or
            ip_5m_cnt >= 15 or
            dev_5m_cnt >= 15
        )

        return {
            "ip_txns_1m": ip_1m_cnt,
            "ip_txns_5m": ip_5m_cnt,
            "ip_txns_1h": ip_1h_cnt,
            "ip_amount_1h": ip_1h_amt,
            "dev_txns_1m": dev_1m_cnt,
            "dev_txns_5m": dev_5m_cnt,
            "dev_txns_1h": dev_1h_cnt,
            "dev_amount_1h": dev_1h_amt,
            "cust_txns_5m": cust_5m_cnt,
            "cust_amount_5m": cust_5m_amt,
            "cust_txns_1h": cust_1h_cnt,
            "cust_amount_1h": cust_1h_amt,
            "cust_txns_24h": cust_24h_cnt,
            "cust_amount_24h": cust_24h_amt,
            "card_txns_1m": card_1m_cnt,
            "is_velocity_burst": is_velocity_burst,
        }

    def check_rate_limit(self, identifier: str, limit: int = 100, window_seconds: int = 60) -> Tuple[bool, int, int]:
        """
        Token bucket / sliding window rate limiter for API endpoints.
        Returns: (is_allowed, current_count, retry_after_seconds)
        """
        key = f"ratelimit:{identifier}"
        now = time.time()
        cutoff = now - window_seconds

        if self.use_redis and self.redis_client:
            try:
                pipe = self.redis_client.pipeline()
                pipe.zremrangebyscore(key, "-inf", cutoff)
                pipe.zcard(key)
                pipe.zadd(key, {f"{now}:{time.time_ns()}": now})
                pipe.expire(key, window_seconds + 10)
                results = pipe.execute()
                current_count = results[1]
                if current_count >= limit:
                    return False, current_count, window_seconds
                return True, current_count + 1, 0
            except Exception as e:
                logger.warning("Redis rate limit error, using memory: %s", e)

        return self.in_memory.check_rate_limit(identifier, limit, window_seconds)


# Global singleton instance
_tracker: Optional[VelocityTracker] = None


def get_velocity_tracker() -> VelocityTracker:
    global _tracker
    if _tracker is None:
        from backend.app.config import get_settings
        settings = get_settings()
        _tracker = VelocityTracker(redis_url=settings.redis_url)
    return _tracker
