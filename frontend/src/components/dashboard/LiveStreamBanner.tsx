"use client";

import { useState, useEffect } from "react";
import {
  Zap,
  Activity,
  Radio,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Play,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import {
  subscribeToLiveTransactions,
  LiveTransactionEvent,
  isSupabaseConfigured,
} from "@/lib/supabase";
import { simulateLiveTraffic, TrafficSimResult } from "@/lib/api";

export function LiveStreamBanner() {
  const [liveEvents, setLiveEvents] = useState<LiveTransactionEvent[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simResult, setSimResult] = useState<TrafficSimResult | null>(null);
  const [simCount, setSimCount] = useState(15);
  const [fraudRate, setFraudRate] = useState(25);

  useEffect(() => {
    // Subscribe to live transactions stream
    const unsubscribe = subscribeToLiveTransactions((event) => {
      setLiveEvents((prev) => [event, ...prev.slice(0, 19)]);
    });

    return () => unsubscribe();
  }, []);

  const handleInjectTraffic = async () => {
    setIsSimulating(true);
    try {
      const result = await simulateLiveTraffic({
        batch_size: simCount,
        fraud_ratio: fraudRate / 100.0,
        include_wardrobers: true,
      });
      setSimResult(result);
    } catch (err) {
      console.error("Traffic injection error:", err);
    } finally {
      setIsSimulating(false);
    }
  };

  const getBadgeStyle = (decision: string) => {
    switch (decision) {
      case "BLOCK":
        return "badge-critical";
      case "REVIEW":
        return "badge-medium";
      default:
        return "badge-low";
    }
  };

  return (
    <div
      className="card"
      style={{
        padding: "1.25rem 1.5rem",
        marginBottom: "1.75rem",
        background: "rgba(14, 18, 30, 0.85)",
        border: "1px solid rgba(59, 130, 246, 0.2)",
      }}
    >
      <div className="flex-between" style={{ marginBottom: "1rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "var(--radius-md)",
              background: "rgba(59, 130, 246, 0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#60a5fa",
            }}
          >
            <Radio size={16} className="animate-pulse" />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span
                style={{
                  fontFamily: "var(--font-heading)",
                  fontWeight: 600,
                  fontSize: "0.9375rem",
                  color: "var(--text-primary)",
                }}
              >
                Real-Time Event Stream & Webhook Ingest
              </span>
              <span
                className={isSupabaseConfigured ? "badge badge-low" : "badge badge-medium"}
                style={{ fontSize: "0.625rem" }}
              >
                {isSupabaseConfigured ? "Supabase Realtime Live" : "Stream Simulator Active"}
              </span>
            </div>
            <p
              style={{
                fontSize: "0.75rem",
                color: "var(--text-tertiary)",
                marginTop: "0.15rem",
              }}
            >
              Sub-millisecond sliding velocity tracking, Stripe/Shopify webhooks, and live transaction decisions.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex-start" style={{ gap: "0.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
            <span style={{ fontSize: "0.6875rem", color: "var(--text-disabled)", textTransform: "uppercase", fontFamily: "var(--font-heading)" }}>
              Txns:
            </span>
            <select
              value={simCount}
              onChange={(e) => setSimCount(Number(e.target.value))}
              className="form-select"
              style={{ padding: "0.3rem 0.5rem", fontSize: "0.75rem" }}
            >
              <option value={5}>5 txns</option>
              <option value={15}>15 txns</option>
              <option value={30}>30 txns</option>
              <option value={50}>50 txns</option>
            </select>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
            <span style={{ fontSize: "0.6875rem", color: "var(--text-disabled)", textTransform: "uppercase", fontFamily: "var(--font-heading)" }}>
              Fraud:
            </span>
            <select
              value={fraudRate}
              onChange={(e) => setFraudRate(Number(e.target.value))}
              className="form-select"
              style={{ padding: "0.3rem 0.5rem", fontSize: "0.75rem" }}
            >
              <option value={10}>10%</option>
              <option value={25}>25%</option>
              <option value={50}>50%</option>
              <option value={80}>80% Attack</option>
            </select>
          </div>

          <button
            onClick={handleInjectTraffic}
            disabled={isSimulating}
            className="btn btn-primary btn-sm"
            style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}
          >
            <Zap size={14} className={isSimulating ? "animate-spin" : ""} />
            <span>{isSimulating ? "Injecting..." : "⚡ Inject Traffic Stream"}</span>
          </button>
        </div>
      </div>

      {/* Simulator Execution Summary Banner (if triggered) */}
      {simResult && (
        <div
          style={{
            padding: "0.65rem 1rem",
            marginBottom: "0.875rem",
            borderRadius: "var(--radius-md)",
            background: "rgba(59, 130, 246, 0.08)",
            border: "1px solid rgba(59, 130, 246, 0.2)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "0.5rem",
            fontSize: "0.75rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#60a5fa" }}>
            <Sparkles size={14} />
            <span>
              Simulated <strong>{simResult.total_processed} transactions</strong> in{" "}
              <strong>{simResult.execution_time_ms}ms</strong>
            </span>
          </div>
          <div style={{ display: "flex", gap: "1rem" }}>
            <span style={{ color: "#34d399" }}>Allowed: {simResult.allowed_count}</span>
            <span style={{ color: "#fbbf24" }}>Review: {simResult.reviewed_count}</span>
            <span style={{ color: "#f87171" }}>Blocked: {simResult.blocked_count}</span>
            <span style={{ color: "#34d399", fontWeight: 600 }}>
              Prevented: ${new Intl.NumberFormat("en-US").format(simResult.prevented_loss_usd)}
            </span>
          </div>
        </div>
      )}

      {/* Live Transaction Ticker Horizontal Carousel */}
      <div
        style={{
          display: "flex",
          gap: "0.6rem",
          overflowX: "auto",
          paddingBottom: "0.25rem",
          scrollbarWidth: "none",
        }}
      >
        {liveEvents.length === 0 ? (
          <div
            style={{
              padding: "0.6rem 1rem",
              color: "var(--text-disabled)",
              fontSize: "0.75rem",
              fontFamily: "var(--font-mono)",
            }}
          >
            Listening for live streaming transactions...
          </div>
        ) : (
          liveEvents.map((evt, idx) => (
            <div
              key={`${evt.id}-${idx}`}
              style={{
                background: "rgba(255, 255, 255, 0.03)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-md)",
                padding: "0.45rem 0.75rem",
                display: "flex",
                alignItems: "center",
                gap: "0.6rem",
                flexShrink: 0,
                fontSize: "0.75rem",
                animation: "fadeIn 0.3s ease-out",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontWeight: 500,
                    color: "var(--text-primary)",
                  }}
                >
                  ${evt.amount.toFixed(2)}
                </span>
                <span
                  style={{
                    fontSize: "0.625rem",
                    color: "var(--text-disabled)",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  {evt.customer_id}
                </span>
              </div>

              <span className={`badge ${getBadgeStyle(evt.decision)}`} style={{ fontSize: "0.625rem" }}>
                {evt.decision}
              </span>

              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.6875rem",
                  color: evt.risk_score >= 0.7 ? "#f87171" : evt.risk_score >= 0.3 ? "#fbbf24" : "#34d399",
                }}
              >
                {(evt.risk_score * 100).toFixed(0)}%
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
