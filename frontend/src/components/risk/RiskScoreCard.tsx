"use client";

import type { RiskScoreResponse } from "@/lib/api";

interface RiskScoreCardProps {
  result: RiskScoreResponse;
}

export function RiskScoreCard({ result }: RiskScoreCardProps) {
  const riskColor =
    result.risk_level === "CRITICAL"
      ? "#ef4444"
      : result.risk_level === "HIGH"
      ? "#f87171"
      : result.risk_level === "MEDIUM"
      ? "#f59e0b"
      : "#10b981";

  const decisionBadgeClass =
    result.decision === "BLOCK"
      ? "decision-block"
      : result.decision === "REVIEW"
      ? "decision-review"
      : "decision-allow";

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: "1.5rem",
        alignItems: "start",
      }}
    >
      {/* Risk Gauge */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
        <RiskGauge score={result.risk_score} color={riskColor} />
        <span
          className={`badge badge-${result.risk_level.toLowerCase()}`}
          style={{ marginTop: "0.75rem", fontSize: "0.75rem", fontFamily: "var(--font-heading)" }}
        >
          {result.risk_level} RISK
        </span>
        <div style={{ marginTop: "0.4rem" }}>
          <span
            className={`badge ${decisionBadgeClass}`}
            style={{ fontSize: "0.875rem", padding: "0.375rem 1rem", fontWeight: 800, letterSpacing: "0.05em" }}
          >
            {result.decision}
          </span>
        </div>
      </div>

      {/* Component Scores */}
      <div>
        <h4 style={{ fontSize: "0.75rem", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.75rem", fontWeight: 700, fontFamily: "var(--font-heading)" }}>
          Signal Breakdown
        </h4>
        <ScoreBar label="ML Model (LightGBM)" value={result.ml_score} />
        <ScoreBar label="Deterministic Rules" value={result.rule_score} />
        <ScoreBar label="Isolation Forest Anomaly" value={result.anomaly_score} />
        <ScoreBar label="Behavioral Velocity" value={result.behavior_score} />
        <ScoreBar label="Graph Syndicate Intelligence" value={result.graph_score} />
        <div style={{ marginTop: "0.75rem", fontSize: "0.75rem", color: "#94a3b8", borderTop: "1px solid #1e293e", paddingTop: "0.5rem" }}>
          Expected Loss: <strong style={{ color: "#f87171" }}>${Math.round(result.expected_loss).toLocaleString("en-US")}</strong>
          &nbsp;· Confidence: <strong style={{ color: "#f8fafc" }}>{(result.confidence * 100).toFixed(0)}%</strong>
        </div>
      </div>

      {/* Risk Factors */}
      <div>
        {result.risk_factors.length > 0 && (
          <div style={{ marginBottom: "1rem" }}>
            <h4 style={{ fontSize: "0.75rem", color: "#f87171", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.4rem", fontWeight: 700, fontFamily: "var(--font-heading)" }}>
              ⚠️ Top Risk Factors
            </h4>
            {result.risk_factors.map((f, i) => (
              <div key={i} style={{ fontSize: "0.8125rem", color: "#fca5a5", marginBottom: "0.25rem", lineHeight: 1.4 }}>
                • {f.reason || f.display_name}
              </div>
            ))}
          </div>
        )}

        {result.protective_factors.length > 0 && (
          <div>
            <h4 style={{ fontSize: "0.75rem", color: "#34d399", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.4rem", fontWeight: 700, fontFamily: "var(--font-heading)" }}>
              ✅ Protective Factors
            </h4>
            {result.protective_factors.map((f, i) => (
              <div key={i} style={{ fontSize: "0.8125rem", color: "#6ee7b7", marginBottom: "0.25rem", lineHeight: 1.4 }}>
                • {f.reason || f.display_name}
              </div>
            ))}
          </div>
        )}

        {result.triggered_rules.length > 0 && (
          <div style={{ marginTop: "0.75rem" }}>
            <h4 style={{ fontSize: "0.75rem", color: "#fbbf24", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.4rem", fontWeight: 700, fontFamily: "var(--font-heading)" }}>
              🚨 Triggered Rules
            </h4>
            {result.triggered_rules.map((r, i) => (
              <div key={i} style={{ fontSize: "0.8125rem", marginBottom: "0.25rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <span className={`badge badge-${r.severity.toLowerCase()}`} style={{ fontSize: "0.6875rem", flexShrink: 0 }}>
                  {r.severity}
                </span>
                <span style={{ color: "#f8fafc" }}>{r.reason}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function RiskGauge({ score, color }: { score: number; color: string }) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - score * circumference;

  return (
    <div className="risk-gauge" style={{ display: "inline-flex", justifyContent: "center", alignItems: "center" }}>
      <svg width="120" height="120" viewBox="0 0 120 120">
        {/* Full circular background track in clear gray */}
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="#1e293b"
          strokeWidth="8"
        />
        {/* Active progress score ring */}
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 60 60)"
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
        {/* Score number */}
        <text
          x="60"
          y="56"
          textAnchor="middle"
          fill="#f8fafc"
          fontSize="22"
          fontWeight="800"
          fontFamily="var(--font-heading)"
        >
          {(score * 100).toFixed(0)}
        </text>
        {/* Score label */}
        <text
          x="60"
          y="74"
          textAnchor="middle"
          fill="#94a3b8"
          fontSize="9"
          fontWeight="700"
          letterSpacing="0.06em"
          fontFamily="var(--font-heading)"
        >
          RISK SCORE
        </text>
      </svg>
    </div>
  );
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  const barColor =
    value >= 0.7 ? "#ef4444" : value >= 0.3 ? "#f59e0b" : "#3b82f6";

  return (
    <div style={{ marginBottom: "0.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.2rem" }}>
        <span style={{ fontSize: "0.75rem", color: "#94a3b8", fontWeight: 600 }}>{label}</span>
        <span style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", fontWeight: 700, color: "#f8fafc" }}>
          {(value * 100).toFixed(0)}%
        </span>
      </div>
      <div style={{ height: "6px", background: "#1e293b", borderRadius: "3px", overflow: "hidden" }}>
        <div
          style={{
            height: "100%",
            width: `${Math.min(100, Math.max(0, value * 100))}%`,
            background: barColor,
            borderRadius: "3px",
            transition: "width 0.4s ease",
          }}
        />
      </div>
    </div>
  );
}
