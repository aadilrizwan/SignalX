"use client";

import { useState } from "react";
import {
  Zap,
  Cpu,
  Layers,
  Network,
  Shield,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Activity,
  ArrowDown,
  Sparkles,
} from "lucide-react";

interface NodeDetail {
  id: string;
  title: string;
  file: string;
  category: string;
  description: string;
  inputs: string;
  outputs: string;
  latency: string;
  color: string;
}

const NODES_DATA: Record<string, NodeDetail> = {
  gateway: {
    id: "gateway",
    title: "Ingestion Gateway",
    file: "routes_risk.py",
    category: "INGESTION",
    description:
      "Accepts real-time transaction, return, or dispute payload with instant schema validation and idempotency checking.",
    inputs:
      "JSON payload (amount, customer_id, device_id, ip, billing_country)",
    outputs: "Validated Transaction Object",
    latency: "0.8ms",
    color: "#10b981",
  },
  feature_engine: {
    id: "feature_engine",
    title: "Temporal Feature Builder",
    file: "feature_builder.py",
    category: "FEATURE PIPELINE",
    description:
      "Computes 31 temporal anti-leakage feature vectors strictly prior to the current transaction timestamp.",
    inputs: "Validated Transaction + Historical State Tables",
    outputs: "31-Dimensional Normalized Feature Tensor",
    latency: "2.1ms",
    color: "#3b82f6",
  },
  state_cache: {
    id: "state_cache",
    title: "Entity State Cache",
    file: "customer.py | device.py",
    category: "STATE STORE",
    description:
      "Sub-millisecond lookup of customer lifetime spend, velocity windows (5m, 1h, 24h), and device link histories.",
    inputs: "Customer ID, Device ID, IP Address",
    outputs: "Historical Velocity & Risk Rates",
    latency: "0.5ms",
    color: "#06b6d4",
  },
  payment_fraud: {
    id: "payment_fraud",
    title: "Pillar 1: Payment Fraud ML",
    file: "ml_scorer.py (LightGBM)",
    category: "PILLAR 1",
    description:
      "Supervised gradient-boosted decision tree computing fraud probability with TreeSHAP attributions.",
    inputs: "31 Feature Vectors",
    outputs: "ML Probability Score [0.0 – 1.0] (Weight: 40%)",
    latency: "3.2ms",
    color: "#3b82f6",
  },
  return_abuse: {
    id: "return_abuse",
    title: "Pillar 2: Return Abuse Engine",
    file: "returns.py",
    category: "PILLAR 2",
    description:
      "Evaluates wardrobing probability, return velocity spikes, empty-box fraud, and customer return rate ratios.",
    inputs: "Return history, Time-to-return, Item value ratio",
    outputs: "Return Abuse Risk Vector",
    latency: "1.4ms",
    color: "#06b6d4",
  },
  chargeback_defense: {
    id: "chargeback_defense",
    title: "Pillar 3: Chargeback Defense",
    file: "chargeback.py",
    category: "PILLAR 3",
    description:
      "Forecasts dispute win rates, detects friendly fraud patterns, and prepares evidence packages.",
    inputs: "Dispute reason code, 3DS status, Delivery proof",
    outputs: "Dispute Risk & Win Probability",
    latency: "1.6ms",
    color: "#f59e0b",
  },
  fraud_ring: {
    id: "fraud_ring",
    title: "Pillar 4: Fraud Ring Graph",
    file: "fraud_graph.py",
    category: "PILLAR 4",
    description:
      "Uncovers syndicated multi-account clusters sharing the same physical device, subnet IP, or shipping address.",
    inputs: "Entity linkages across Device/IP/Address/Card",
    outputs: "Graph Risk Score (Weight: 10%)",
    latency: "2.4ms",
    color: "#10b981",
  },
  safety_rules: {
    id: "safety_rules",
    title: "Safety Rules & Anomaly Hub",
    file: "rule_engine.py | anomaly.py",
    category: "SAFETY LAYER",
    description:
      "8 deterministic merchant safety guardrails + Isolation Forest unsupervised zero-day anomaly detector.",
    inputs: "Transaction parameters & Unsupervised Embedding",
    outputs: "Rule Score (20%) + Anomaly Score (15%)",
    latency: "1.1ms",
    color: "#d946ef",
  },
  fusion_core: {
    id: "fusion_core",
    title: "Risk Fusion Core",
    file: "fusion_engine.py",
    category: "SYNTHESIS",
    description:
      "Combines 5 detection layers via calibrated weighted scoring into a single unified risk score.",
    inputs: "5 Signal Probabilities (ML, Rules, Anomaly, Behavior, Graph)",
    outputs: "Fused Risk Score [0.00 – 1.00]",
    latency: "0.4ms",
    color: "#c084fc",
  },
  cost_optimizer: {
    id: "cost_optimizer",
    title: "Cost Matrix Optimizer",
    file: "decision_engine.py",
    category: "DECISION MATRIX",
    description:
      "Balances financial fraud loss against the $25 customer friction cost of a False Positive.",
    inputs: "Fused Risk Score + Transaction Amount + Cost Matrix",
    outputs: "Optimized Routing: ALLOW, REVIEW, or BLOCK",
    latency: "0.3ms",
    color: "#38bdf8",
  },
  allow_out: {
    id: "allow_out",
    title: "ALLOW (0.00 – 0.30)",
    file: "Settlement Stream",
    category: "DECISION OUTCOME",
    description:
      "Instant approval and settlement. Low fraud probability with clean device and historical loyalty signals.",
    inputs: "Risk Score < 0.30",
    outputs: "HTTP 200: Transaction Authorized",
    latency: "< 0.1ms",
    color: "#10b981",
  },
  review_out: {
    id: "review_out",
    title: "REVIEW (0.30 – 0.70)",
    file: "Analyst Queue + SHAP",
    category: "DECISION OUTCOME",
    description:
      "Dispatched to analyst queue. TreeSHAP factor attributions explain exact risk and protective contributions.",
    inputs: "0.30 <= Risk Score <= 0.70",
    outputs: "Case assigned with human-readable reason codes",
    latency: "< 0.1ms",
    color: "#f59e0b",
  },
  block_out: {
    id: "block_out",
    title: "BLOCK (0.70 – 1.00)",
    file: "Interception + Evidence",
    category: "DECISION OUTCOME",
    description:
      "Automated payment interception. Triggers security alerts and persists audit logs for dispute evidence.",
    inputs: "Risk Score > 0.70 or Critical Rule Trigger",
    outputs: "HTTP 200: Payment Blocked (Fraud Intercepted)",
    latency: "< 0.1ms",
    color: "#ef4444",
  },
};

export function PipelineFlowchartGraph() {
  const [selectedNode, setSelectedNode] = useState<string>("fusion_core");

  const activeNode = NODES_DATA[selectedNode] || NODES_DATA.fusion_core;

  return (
    <div
      className="card"
      style={{
        padding: "2.25rem 1.75rem",
        width: "100%",
        background: "#070a12",
        border: "1px solid #1a2336",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Subtle Graph Grid Background Accent */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(255, 255, 255, 0.04) 1px, transparent 0)",
          backgroundSize: "24px 24px",
          pointerEvents: "none",
        }}
      />

      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "2rem",
          position: "relative",
          zIndex: 2,
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.375rem",
              padding: "0.2rem 0.6rem",
              borderRadius: "4px",
              background: "rgba(168, 85, 247, 0.12)",
              border: "1px solid rgba(168, 85, 247, 0.25)",
              color: "#c084fc",
              fontSize: "0.75rem",
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              marginBottom: "0.5rem",
            }}
          >
            Real-Time Engine Topology
          </span>
          <h3
            style={{
              fontSize: "1.625rem",
              fontWeight: 800,
              letterSpacing: "-0.03em",
            }}
          >
            Execution & Decision Graph
          </h3>
          <p
            style={{
              color: "#94a3b8",
              fontSize: "0.875rem",
              marginTop: "0.25rem",
            }}
          >
            Hierarchical DAG representation of data flow through feature
            extraction, 4 specialized defense pillars, risk fusion, and decision
            routing.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span
            className="badge badge-low"
            style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}
          >
            <span
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                background: "#10b981",
              }}
            />
            P99 Latency &lt; 10ms
          </span>
          <span
            style={{
              fontSize: "0.75rem",
              color: "#64748b",
              fontFamily: "JetBrains Mono, monospace",
            }}
          >
            Click node to inspect
          </span>
        </div>
      </div>

      {/* 
          FLOWCHART CANVAS (MINIMALIST GRAPH DAG)
          */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "1.5rem",
          margin: "1rem 0 2rem 0",
          width: "100%",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            width: "100%",
            maxWidth: "380px",
          }}
        >
          <button
            onClick={() => setSelectedNode("gateway")}
            style={{
              width: "100%",
              padding: "0.875rem 1.25rem",
              borderRadius: "8px",
              background:
                selectedNode === "gateway"
                  ? "rgba(16, 185, 129, 0.15)"
                  : "#0c111e",
              border: `1.5px solid ${selectedNode === "gateway" ? "#10b981" : "#10b98160"}`,
              color: "#f8fafc",
              cursor: "pointer",
              textAlign: "center",
              boxShadow:
                selectedNode === "gateway"
                  ? "0 0 20px rgba(16, 185, 129, 0.25)"
                  : "none",
              transition: "all 0.15s ease",
            }}
          >
            <div style={{ fontWeight: 800, fontSize: "0.9375rem" }}>
              Ingestion Gateway
            </div>
            <div
              style={{
                fontSize: "0.75rem",
                color: "#34d399",
                fontFamily: "JetBrains Mono, monospace",
                marginTop: "0.15rem",
              }}
            >
              routes_risk.py
            </div>
          </button>

          {/* Connecting Arrow */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              margin: "0.4rem 0",
            }}
          >
            <span
              style={{
                fontSize: "0.6875rem",
                color: "#a855f7",
                fontFamily: "JetBrains Mono, monospace",
                fontWeight: 600,
              }}
            >
              1. Ingest Raw Event
            </span>
            <div
              style={{
                width: "2px",
                height: "18px",
                background: "linear-gradient(to bottom, #10b981, #3b82f6)",
              }}
            />
            <div
              style={{
                width: 0,
                height: 0,
                borderLeft: "4px solid transparent",
                borderRight: "4px solid transparent",
                borderTop: "5px solid #3b82f6",
              }}
            />
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            width: "100%",
            maxWidth: "420px",
          }}
        >
          <button
            onClick={() => setSelectedNode("feature_engine")}
            style={{
              width: "100%",
              padding: "0.875rem 1.25rem",
              borderRadius: "8px",
              background:
                selectedNode === "feature_engine"
                  ? "rgba(59, 130, 246, 0.18)"
                  : "#0c111e",
              border: `1.5px solid ${selectedNode === "feature_engine" ? "#3b82f6" : "#3b82f660"}`,
              color: "#f8fafc",
              cursor: "pointer",
              textAlign: "center",
              boxShadow:
                selectedNode === "feature_engine"
                  ? "0 0 20px rgba(59, 130, 246, 0.25)"
                  : "none",
              transition: "all 0.15s ease",
            }}
          >
            <div style={{ fontWeight: 800, fontSize: "0.9375rem" }}>
              Temporal Feature Builder
            </div>
            <div
              style={{
                fontSize: "0.75rem",
                color: "#60a5fa",
                fontFamily: "JetBrains Mono, monospace",
                marginTop: "0.15rem",
              }}
            >
              feature_builder.py (31 Anti-Leakage Vectors)
            </div>
          </button>

          {/* Connecting Branch Arrow to 4 Pillars */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              margin: "0.4rem 0",
            }}
          >
            <span
              style={{
                fontSize: "0.6875rem",
                color: "#c084fc",
                fontFamily: "JetBrains Mono, monospace",
                fontWeight: 600,
              }}
            >
              2. Parallel Feature Broadcast (31 Vectors)
            </span>
            <div
              style={{
                width: "2px",
                height: "18px",
                background: "linear-gradient(to bottom, #3b82f6, #a855f7)",
              }}
            />
            <div
              style={{
                width: 0,
                height: 0,
                borderLeft: "4px solid transparent",
                borderRight: "4px solid transparent",
                borderTop: "5px solid #a855f7",
              }}
            />
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "0.875rem",
            width: "100%",
          }}
        >
          {/* Pillar 1: Payment Fraud */}
          <button
            onClick={() => setSelectedNode("payment_fraud")}
            style={{
              padding: "0.875rem 1rem",
              borderRadius: "8px",
              background:
                selectedNode === "payment_fraud"
                  ? "rgba(59, 130, 246, 0.18)"
                  : "#0c111e",
              border: `1.5px solid ${selectedNode === "payment_fraud" ? "#3b82f6" : "#3b82f650"}`,
              color: "#f8fafc",
              cursor: "pointer",
              textAlign: "left",
              boxShadow:
                selectedNode === "payment_fraud"
                  ? "0 0 16px rgba(59, 130, 246, 0.25)"
                  : "none",
              transition: "all 0.15s ease",
            }}
          >
            <span
              style={{
                fontSize: "0.625rem",
                color: "#60a5fa",
                fontWeight: 700,
                textTransform: "uppercase",
              }}
            >
              Pillar 01
            </span>
            <div
              style={{
                fontWeight: 800,
                fontSize: "0.875rem",
                marginTop: "0.1rem",
              }}
            >
              Payment Fraud
            </div>
            <div
              style={{
                fontSize: "0.6875rem",
                color: "#94a3b8",
                fontFamily: "JetBrains Mono, monospace",
              }}
            >
              LightGBM (40%)
            </div>
          </button>

          {/* Pillar 2: Return Abuse */}
          <button
            onClick={() => setSelectedNode("return_abuse")}
            style={{
              padding: "0.875rem 1rem",
              borderRadius: "8px",
              background:
                selectedNode === "return_abuse"
                  ? "rgba(6, 182, 212, 0.18)"
                  : "#0c111e",
              border: `1.5px solid ${selectedNode === "return_abuse" ? "#06b6d4" : "#06b6d450"}`,
              color: "#f8fafc",
              cursor: "pointer",
              textAlign: "left",
              boxShadow:
                selectedNode === "return_abuse"
                  ? "0 0 16px rgba(6, 182, 212, 0.25)"
                  : "none",
              transition: "all 0.15s ease",
            }}
          >
            <span
              style={{
                fontSize: "0.625rem",
                color: "#22d3ee",
                fontWeight: 700,
                textTransform: "uppercase",
              }}
            >
              Pillar 02
            </span>
            <div
              style={{
                fontWeight: 800,
                fontSize: "0.875rem",
                marginTop: "0.1rem",
              }}
            >
              Return Abuse
            </div>
            <div
              style={{
                fontSize: "0.6875rem",
                color: "#94a3b8",
                fontFamily: "JetBrains Mono, monospace",
              }}
            >
              Wardrobing / Serial
            </div>
          </button>

          {/* Pillar 3: Chargeback Defense */}
          <button
            onClick={() => setSelectedNode("chargeback_defense")}
            style={{
              padding: "0.875rem 1rem",
              borderRadius: "8px",
              background:
                selectedNode === "chargeback_defense"
                  ? "rgba(245, 158, 11, 0.18)"
                  : "#0c111e",
              border: `1.5px solid ${selectedNode === "chargeback_defense" ? "#f59e0b" : "#f59e0b50"}`,
              color: "#f8fafc",
              cursor: "pointer",
              textAlign: "left",
              boxShadow:
                selectedNode === "chargeback_defense"
                  ? "0 0 16px rgba(245, 158, 11, 0.25)"
                  : "none",
              transition: "all 0.15s ease",
            }}
          >
            <span
              style={{
                fontSize: "0.625rem",
                color: "#fbbf24",
                fontWeight: 700,
                textTransform: "uppercase",
              }}
            >
              Pillar 03
            </span>
            <div
              style={{
                fontWeight: 800,
                fontSize: "0.875rem",
                marginTop: "0.1rem",
              }}
            >
              Chargeback Defense
            </div>
            <div
              style={{
                fontSize: "0.6875rem",
                color: "#94a3b8",
                fontFamily: "JetBrains Mono, monospace",
              }}
            >
              Dispute Win-Rate RAG
            </div>
          </button>

          {/* Pillar 4: Fraud Ring Graph */}
          <button
            onClick={() => setSelectedNode("fraud_ring")}
            style={{
              padding: "0.875rem 1rem",
              borderRadius: "8px",
              background:
                selectedNode === "fraud_ring"
                  ? "rgba(16, 185, 129, 0.18)"
                  : "#0c111e",
              border: `1.5px solid ${selectedNode === "fraud_ring" ? "#10b981" : "#10b98150"}`,
              color: "#f8fafc",
              cursor: "pointer",
              textAlign: "left",
              boxShadow:
                selectedNode === "fraud_ring"
                  ? "0 0 16px rgba(16, 185, 129, 0.25)"
                  : "none",
              transition: "all 0.15s ease",
            }}
          >
            <span
              style={{
                fontSize: "0.625rem",
                color: "#34d399",
                fontWeight: 700,
                textTransform: "uppercase",
              }}
            >
              Pillar 04
            </span>
            <div
              style={{
                fontWeight: 800,
                fontSize: "0.875rem",
                marginTop: "0.1rem",
              }}
            >
              Syndicate Graph
            </div>
            <div
              style={{
                fontSize: "0.6875rem",
                color: "#94a3b8",
                fontFamily: "JetBrains Mono, monospace",
              }}
            >
              Shared Device/IP (10%)
            </div>
          </button>

          {/* Safety Rules & Anomaly */}
          <button
            onClick={() => setSelectedNode("safety_rules")}
            style={{
              padding: "0.875rem 1rem",
              borderRadius: "8px",
              background:
                selectedNode === "safety_rules"
                  ? "rgba(217, 70, 239, 0.18)"
                  : "#0c111e",
              border: `1.5px solid ${selectedNode === "safety_rules" ? "#d946ef" : "#d946ef50"}`,
              color: "#f8fafc",
              cursor: "pointer",
              textAlign: "left",
              boxShadow:
                selectedNode === "safety_rules"
                  ? "0 0 16px rgba(217, 70, 239, 0.25)"
                  : "none",
              transition: "all 0.15s ease",
            }}
          >
            <span
              style={{
                fontSize: "0.625rem",
                color: "#e879f9",
                fontWeight: 700,
                textTransform: "uppercase",
              }}
            >
              Safety Hub
            </span>
            <div
              style={{
                fontWeight: 800,
                fontSize: "0.875rem",
                marginTop: "0.1rem",
              }}
            >
              Rules & Anomaly
            </div>
            <div
              style={{
                fontSize: "0.6875rem",
                color: "#94a3b8",
                fontFamily: "JetBrains Mono, monospace",
              }}
            >
              8 Rules (20%) + IF (15%)
            </div>
          </button>
        </div>

        {/* Connecting Synthesis Arrow to Fusion Core */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            margin: "0.25rem 0",
          }}
        >
          <span
            style={{
              fontSize: "0.6875rem",
              color: "#d946ef",
              fontFamily: "JetBrains Mono, monospace",
              fontWeight: 600,
            }}
          >
            3. Multi-Signal Convergence & Calibration
          </span>
          <div
            style={{
              width: "2px",
              height: "18px",
              background: "linear-gradient(to bottom, #d946ef, #c084fc)",
            }}
          />
          <div
            style={{
              width: 0,
              height: 0,
              borderLeft: "4px solid transparent",
              borderRight: "4px solid transparent",
              borderTop: "5px solid #c084fc",
            }}
          />
        </div>

        {/* LEVEL 4: RISK FUSION CORE & COST OPTIMIZER */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "1rem",
            width: "100%",
            maxWidth: "600px",
          }}
        >
          {/* Fusion Core */}
          <button
            onClick={() => setSelectedNode("fusion_core")}
            style={{
              padding: "0.875rem 1.25rem",
              borderRadius: "8px",
              background:
                selectedNode === "fusion_core"
                  ? "rgba(192, 132, 252, 0.2)"
                  : "#0c111e",
              border: `1.5px solid ${selectedNode === "fusion_core" ? "#c084fc" : "#c084fc60"}`,
              color: "#f8fafc",
              cursor: "pointer",
              textAlign: "center",
              boxShadow:
                selectedNode === "fusion_core"
                  ? "0 0 20px rgba(192, 132, 252, 0.25)"
                  : "none",
              transition: "all 0.15s ease",
            }}
          >
            <div style={{ fontWeight: 800, fontSize: "0.9375rem" }}>
              Risk Fusion Core
            </div>
            <div
              style={{
                fontSize: "0.75rem",
                color: "#c084fc",
                fontFamily: "JetBrains Mono, monospace",
                marginTop: "0.15rem",
              }}
            >
              fusion_engine.py [0.00 – 1.00]
            </div>
          </button>

          {/* Cost Optimizer */}
          <button
            onClick={() => setSelectedNode("cost_optimizer")}
            style={{
              padding: "0.875rem 1.25rem",
              borderRadius: "8px",
              background:
                selectedNode === "cost_optimizer"
                  ? "rgba(56, 189, 248, 0.2)"
                  : "#0c111e",
              border: `1.5px solid ${selectedNode === "cost_optimizer" ? "#38bdf8" : "#38bdf860"}`,
              color: "#f8fafc",
              cursor: "pointer",
              textAlign: "center",
              boxShadow:
                selectedNode === "cost_optimizer"
                  ? "0 0 20px rgba(56, 189, 248, 0.25)"
                  : "none",
              transition: "all 0.15s ease",
            }}
          >
            <div style={{ fontWeight: 800, fontSize: "0.9375rem" }}>
              Cost Matrix Optimizer
            </div>
            <div
              style={{
                fontSize: "0.75rem",
                color: "#38bdf8",
                fontFamily: "JetBrains Mono, monospace",
                marginTop: "0.15rem",
              }}
            >
              decision_engine.py ($25 FP)
            </div>
          </button>
        </div>

        {/* Connecting Decision Arrow to Outputs */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            margin: "0.25rem 0",
          }}
        >
          <span
            style={{
              fontSize: "0.6875rem",
              color: "#38bdf8",
              fontFamily: "JetBrains Mono, monospace",
              fontWeight: 600,
            }}
          >
            4. Cost-Sensitive Routing + TreeSHAP Reasoning
          </span>
          <div
            style={{
              width: "2px",
              height: "18px",
              background: "linear-gradient(to bottom, #38bdf8, #10b981)",
            }}
          />
          <div
            style={{
              width: 0,
              height: 0,
              borderLeft: "4px solid transparent",
              borderRight: "4px solid transparent",
              borderTop: "5px solid #10b981",
            }}
          />
        </div>

        {/* LEVEL 5: DECISION OUTCOMES  */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "1rem",
            width: "100%",
          }}
        >
          {/* ALLOW */}
          <button
            onClick={() => setSelectedNode("allow_out")}
            style={{
              padding: "0.875rem 1rem",
              borderRadius: "8px",
              background:
                selectedNode === "allow_out"
                  ? "rgba(16, 185, 129, 0.2)"
                  : "#090d16",
              border: `1.5px solid ${selectedNode === "allow_out" ? "#10b981" : "#10b98150"}`,
              color: "#f8fafc",
              cursor: "pointer",
              textAlign: "left",
              boxShadow:
                selectedNode === "allow_out"
                  ? "0 0 16px rgba(16, 185, 129, 0.25)"
                  : "none",
              transition: "all 0.15s ease",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span
                style={{
                  fontWeight: 800,
                  fontSize: "0.9375rem",
                  color: "#34d399",
                }}
              >
                ALLOW
              </span>
              <span
                style={{
                  fontSize: "0.6875rem",
                  fontFamily: "JetBrains Mono, monospace",
                  color: "#64748b",
                }}
              >
                0.00–0.30
              </span>
            </div>
            <div
              style={{
                fontSize: "0.75rem",
                color: "#94a3b8",
                marginTop: "0.2rem",
              }}
            >
              Instant Settlement & Authorization
            </div>
          </button>

          {/* REVIEW */}
          <button
            onClick={() => setSelectedNode("review_out")}
            style={{
              padding: "0.875rem 1rem",
              borderRadius: "8px",
              background:
                selectedNode === "review_out"
                  ? "rgba(245, 158, 11, 0.2)"
                  : "#090d16",
              border: `1.5px solid ${selectedNode === "review_out" ? "#f59e0b" : "#f59e0b50"}`,
              color: "#f8fafc",
              cursor: "pointer",
              textAlign: "left",
              boxShadow:
                selectedNode === "review_out"
                  ? "0 0 16px rgba(245, 158, 11, 0.25)"
                  : "none",
              transition: "all 0.15s ease",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span
                style={{
                  fontWeight: 800,
                  fontSize: "0.9375rem",
                  color: "#fbbf24",
                }}
              >
                REVIEW
              </span>
              <span
                style={{
                  fontSize: "0.6875rem",
                  fontFamily: "JetBrains Mono, monospace",
                  color: "#64748b",
                }}
              >
                0.30–0.70
              </span>
            </div>
            <div
              style={{
                fontSize: "0.75rem",
                color: "#94a3b8",
                marginTop: "0.2rem",
              }}
            >
              Analyst Queue + SHAP Explanations
            </div>
          </button>

          {/* BLOCK */}
          <button
            onClick={() => setSelectedNode("block_out")}
            style={{
              padding: "0.875rem 1rem",
              borderRadius: "8px",
              background:
                selectedNode === "block_out"
                  ? "rgba(239, 68, 68, 0.2)"
                  : "#090d16",
              border: `1.5px solid ${selectedNode === "block_out" ? "#ef4444" : "#ef444450"}`,
              color: "#f8fafc",
              cursor: "pointer",
              textAlign: "left",
              boxShadow:
                selectedNode === "block_out"
                  ? "0 0 16px rgba(239, 68, 68, 0.25)"
                  : "none",
              transition: "all 0.15s ease",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span
                style={{
                  fontWeight: 800,
                  fontSize: "0.9375rem",
                  color: "#f87171",
                }}
              >
                BLOCK
              </span>
              <span
                style={{
                  fontSize: "0.6875rem",
                  fontFamily: "JetBrains Mono, monospace",
                  color: "#64748b",
                }}
              >
                0.70–1.00
              </span>
            </div>
            <div
              style={{
                fontSize: "0.75rem",
                color: "#94a3b8",
                marginTop: "0.2rem",
              }}
            >
              Interception + Dispute Evidence RAG
            </div>
          </button>
        </div>
      </div>

      {/* 
          INTERACTIVE INSPECTOR CARD (SELECTED NODE TELEMETRY)
          */}
      <div
        style={{
          background: "#0c101d",
          border: `1px solid ${activeNode.color}40`,
          borderRadius: "8px",
          padding: "1.25rem 1.5rem",
          position: "relative",
          zIndex: 2,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "0.75rem",
            flexWrap: "wrap",
            gap: "0.5rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: activeNode.color,
              }}
            />
            <span
              style={{ fontWeight: 800, fontSize: "1rem", color: "#f8fafc" }}
            >
              {activeNode.title}
            </span>
            <span
              style={{
                fontSize: "0.6875rem",
                fontFamily: "JetBrains Mono, monospace",
                color: activeNode.color,
                background: `${activeNode.color}15`,
                padding: "0.15rem 0.45rem",
                borderRadius: "4px",
              }}
            >
              {activeNode.file}
            </span>
          </div>

          <div
            style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}
          >
            <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
              Execution Latency:
            </span>
            <span
              style={{
                fontSize: "0.8125rem",
                fontWeight: 800,
                color: "#10b981",
                fontFamily: "JetBrains Mono, monospace",
              }}
            >
              {activeNode.latency}
            </span>
          </div>
        </div>

        <p
          style={{
            fontSize: "0.84rem",
            color: "#94a3b8",
            lineHeight: 1.5,
            marginBottom: "0.875rem",
          }}
        >
          {activeNode.description}
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "0.75rem",
            fontSize: "0.75rem",
            borderTop: "1px solid #1a2438",
            paddingTop: "0.75rem",
          }}
        >
          <div>
            <span
              style={{
                color: "#64748b",
                textTransform: "uppercase",
                fontWeight: 700,
                letterSpacing: "0.04em",
              }}
            >
              Input Vector:{" "}
            </span>
            <span style={{ color: "#e2e8f0" }}>{activeNode.inputs}</span>
          </div>
          <div>
            <span
              style={{
                color: "#64748b",
                textTransform: "uppercase",
                fontWeight: 700,
                letterSpacing: "0.04em",
              }}
            >
              Output Stream:{" "}
            </span>
            <span style={{ color: "#e2e8f0" }}>{activeNode.outputs}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
