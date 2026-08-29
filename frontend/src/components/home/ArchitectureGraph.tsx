"use client";

import { useState } from "react";
import {
  Database,
  Timer,
  Cpu,
  Layers,
  Gauge,
  Target,
  Eye,
  ShieldCheck,
  Zap,
  Network,
  GitBranch,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Server,
  Activity,
  FileText,
} from "lucide-react";

interface Stage {
  id: string;
  number: string;
  name: string;
  tag: string;
  latency: string;
  description: string;
  nodes: {
    name: string;
    type: string;
    detail: string;
    color: string;
    icon: React.ElementType;
  }[];
  safeguard: string;
}

const STAGES: Stage[] = [
  {
    id: "ingest",
    number: "01",
    name: "Ingestion & Feature Engine",
    tag: "Point-in-Time Pipeline",
    latency: "< 2.5ms",
    description:
      "Ingests raw payment, return, or chargeback events and extracts 31 temporal anti-leakage feature vectors strictly prior to the transaction timestamp.",
    nodes: [
      {
        name: "Payment Payload",
        type: "Input",
        detail: "Customer, Amount, Device, IP, Geo",
        color: "#3b82f6",
        icon: Zap,
      },
      {
        name: "Temporal Feature Builder",
        type: "Processing",
        detail: "31 Vectors without lookahead bias",
        color: "#8b5cf6",
        icon: Timer,
      },
      {
        name: "Historical State Cache",
        type: "Data Store",
        detail: "Rolling customer spend & velocity history",
        color: "#06b6d4",
        icon: Database,
      },
    ],
    safeguard:
      "Strict time-travel prevention: Never utilizes future labels or chargeback outcomes.",
  },
  {
    id: "parallel_eval",
    number: "02",
    name: "Parallel Multi-Signal Scoring",
    tag: "5 Independent Engines",
    latency: "< 4.8ms",
    description:
      "Executes 5 specialized algorithmic detection layers concurrently to eliminate single-point blind spots across known patterns and zero-day anomalies.",
    nodes: [
      {
        name: "LightGBM Supervised (40%)",
        type: "ML Classifier",
        detail: "Tree boosting on temporal vectors",
        color: "#3b82f6",
        icon: Cpu,
      },
      {
        name: "Deterministic Rules (20%)",
        type: "Rule Engine",
        detail: "8 strict merchant safety rules",
        color: "#f59e0b",
        icon: ShieldCheck,
      },
      {
        name: "Isolation Forest (15%)",
        type: "Unsupervised",
        detail: "Novel zero-day outlier detection",
        color: "#a855f7",
        icon: Activity,
      },
      {
        name: "Behavior Scorer (15%)",
        type: "Customer Profiler",
        detail: "Velocity, spend jumps, account age",
        color: "#06b6d4",
        icon: Layers,
      },
      {
        name: "Graph Intelligence (10%)",
        type: "Syndicate Network",
        detail: "Shared device/IP cluster linkage",
        color: "#10b981",
        icon: Network,
      },
    ],
    safeguard:
      "Zero single-model dependence: Anomaly and rule layers protect against adversarial model drift.",
  },
  {
    id: "fusion_opt",
    number: "03",
    name: "Risk Fusion & Cost Optimizer",
    tag: "Decision Mathematics",
    latency: "< 1.2ms",
    description:
      "Synthesizes multi-signal probabilities into a unified calibrated risk score [0.00 – 1.00] and runs cost-matrix optimization against merchant loss.",
    nodes: [
      {
        name: "Weighted Score Synthesizer",
        type: "Fusion Core",
        detail: "Calibrated composite risk calculation",
        color: "#f59e0b",
        icon: Gauge,
      },
      {
        name: "Cost-Sensitive Optimizer",
        type: "Decision Matrix",
        detail: "Minimizes expected business loss vs $25 FP",
        color: "#10b981",
        icon: Target,
      },
    ],
    safeguard:
      "Dynamic cost sensitivity: Automatically adjusts review threshold according to transaction ticket size.",
  },
  {
    id: "routing_explain",
    number: "04",
    name: "Decision Routing & TreeSHAP",
    tag: "Explainability & Action",
    latency: "< 1.5ms",
    description:
      "Routes transactions into ALLOW, REVIEW, or BLOCK while generating local TreeSHAP attribution reason codes for instant human auditability.",
    nodes: [
      {
        name: "ALLOW (0.00 – 0.30)",
        type: "Settlement",
        detail: "Instant seamless authorization",
        color: "#10b981",
        icon: CheckCircle2,
      },
      {
        name: "REVIEW (0.30 – 0.70)",
        type: "Queue",
        detail: "Dispatched to analyst queue with SHAP factors",
        color: "#f59e0b",
        icon: Eye,
      },
      {
        name: "BLOCK (0.70 – 1.00)",
        type: "Interception",
        detail: "Automated block & RAG dispute evidence",
        color: "#ef4444",
        icon: FileText,
      },
    ],
    safeguard:
      "100% Explainable: Every single decision persists its exact top risk and protective factor contributions.",
  },
];

export function ArchitectureGraph() {
  const [activeStage, setActiveStage] = useState<string>("parallel_eval");

  const currentStage = STAGES.find((s) => s.id === activeStage) || STAGES[1];

  return (
    <div className="card" style={{ padding: "2rem", width: "100%" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "1.75rem",
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
              padding: "0.2rem 0.55rem",
              borderRadius: "4px",
              background: "rgba(59, 130, 246, 0.1)",
              border: "1px solid rgba(59, 130, 246, 0.2)",
              color: "#60a5fa",
              fontSize: "0.75rem",
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              marginBottom: "0.5rem",
            }}
          >
            End-to-End Execution Flow
          </span>
          <h3
            style={{
              fontSize: "1.5rem",
              fontWeight: 800,
              letterSpacing: "-0.03em",
            }}
          >
            SignalX Real-Time Architecture Graph
          </h3>
          <p
            style={{
              color: "#94a3b8",
              fontSize: "0.875rem",
              marginTop: "0.25rem",
            }}
          >
            Interactive topological view of the data ingestion, multi-model
            evaluation, and decision synthesis pipeline.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
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
            Total Pipeline Latency &lt; 10ms
          </span>
        </div>
      </div>

      {/* Stage Navigation Stepper */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "0.75rem",
          marginBottom: "1.75rem",
        }}
      >
        {STAGES.map((stage) => {
          const isActive = stage.id === activeStage;
          return (
            <button
              key={stage.id}
              onClick={() => setActiveStage(stage.id)}
              style={{
                background: isActive ? "var(--bg-surface-elevated)" : "#090c15",
                border: `1px solid ${isActive ? "#3b82f6" : "var(--border-subtle)"}`,
                borderRadius: "8px",
                padding: "1rem",
                textAlign: "left",
                cursor: "pointer",
                transition: "all 0.15s ease",
                display: "flex",
                flexDirection: "column",
                gap: "0.25rem",
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
                    fontSize: "0.6875rem",
                    fontFamily: "JetBrains Mono, monospace",
                    color: isActive ? "#60a5fa" : "#64748b",
                    fontWeight: 700,
                  }}
                >
                  STAGE {stage.number}
                </span>
                <span
                  style={{
                    fontSize: "0.6875rem",
                    color: "#10b981",
                    fontFamily: "JetBrains Mono, monospace",
                  }}
                >
                  {stage.latency}
                </span>
              </div>
              <span
                style={{
                  fontSize: "0.875rem",
                  fontWeight: 700,
                  color: isActive ? "#f8fafc" : "#94a3b8",
                }}
              >
                {stage.name}
              </span>
              <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                {stage.tag}
              </span>
            </button>
          );
        })}
      </div>

      {/* Minimalist SVG Graph Canvas */}
      <div
        style={{
          background: "#080b13",
          border: "1px solid #1e293e",
          borderRadius: "10px",
          padding: "1.75rem",
          marginBottom: "1.75rem",
          position: "relative",
          overflowX: "auto",
        }}
      >
        {/* Stage Overview Banner */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1.5rem",
            borderBottom: "1px solid #1a2336",
            paddingBottom: "1rem",
            flexWrap: "wrap",
            gap: "0.75rem",
          }}
        >
          <div>
            <div
              style={{
                fontSize: "1.0625rem",
                fontWeight: 800,
                color: "#f8fafc",
              }}
            >
              Stage {currentStage.number}: {currentStage.name}
            </div>
            <div
              style={{
                fontSize: "0.8125rem",
                color: "#94a3b8",
                marginTop: "0.15rem",
              }}
            >
              {currentStage.description}
            </div>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <span
              style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}
            >
              P99 LATENCY:
            </span>
            <span
              style={{
                fontSize: "0.8125rem",
                fontWeight: 800,
                color: "#10b981",
                fontFamily: "JetBrains Mono, monospace",
                background: "rgba(16,185,129,0.1)",
                padding: "0.2rem 0.5rem",
                borderRadius: "4px",
                border: "1px solid rgba(16,185,129,0.25)",
              }}
            >
              {currentStage.latency}
            </span>
          </div>
        </div>

        {/* Node Grid Visualization */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "1rem",
            alignItems: "stretch",
          }}
        >
          {currentStage.nodes.map((node, i) => {
            const Icon = node.icon;
            return (
              <div
                key={node.name}
                style={{
                  background: "#0e1322",
                  border: `1px solid ${node.color}35`,
                  borderRadius: "8px",
                  padding: "1.25rem",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  boxShadow: `0 4px 12px ${node.color}08`,
                  position: "relative",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "0.75rem",
                    marginBottom: "0.75rem",
                  }}
                >
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "6px",
                      background: `${node.color}15`,
                      color: node.color,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Icon size={18} />
                  </div>
                  <div>
                    <span
                      style={{
                        fontSize: "0.6875rem",
                        color: "#64748b",
                        textTransform: "uppercase",
                        fontWeight: 700,
                        letterSpacing: "0.04em",
                      }}
                    >
                      {node.type}
                    </span>
                    <div
                      style={{
                        fontSize: "0.9375rem",
                        fontWeight: 700,
                        color: "#f8fafc",
                        lineHeight: 1.25,
                        marginTop: "0.1rem",
                      }}
                    >
                      {node.name}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    fontSize: "0.8125rem",
                    color: "#94a3b8",
                    lineHeight: 1.4,
                    marginTop: "0.25rem",
                  }}
                >
                  {node.detail}
                </div>

                {/* Minimalist Node Pin indicator */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    marginTop: "1rem",
                    paddingTop: "0.75rem",
                    borderTop: "1px solid #192236",
                  }}
                >
                  <span
                    style={{
                      width: "6px",
                      height: "6px",
                      borderRadius: "50%",
                      background: node.color,
                    }}
                  />
                  <span
                    style={{
                      fontSize: "0.6875rem",
                      fontFamily: "JetBrains Mono, monospace",
                      color: "#64748b",
                    }}
                  >
                    EXEC_NODE_0{i + 1}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Minimal Safeguard Footer inside canvas */}
        <div
          style={{
            marginTop: "1.25rem",
            padding: "0.75rem 1rem",
            background: "rgba(59, 130, 246, 0.04)",
            border: "1px solid rgba(59, 130, 246, 0.15)",
            borderRadius: "6px",
            display: "flex",
            alignItems: "center",
            gap: "0.6rem",
          }}
        >
          <ShieldCheck size={16} color="#60a5fa" style={{ flexShrink: 0 }} />
          <span style={{ fontSize: "0.8125rem", color: "#94a3b8" }}>
            <strong style={{ color: "#e2e8f0" }}>Defense Guarantee:</strong>{" "}
            {currentStage.safeguard}
          </span>
        </div>
      </div>

      {/* Global Data Flow Diagram Preview */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "0.75rem",
          padding: "0.75rem 1rem",
          background: "#090c15",
          borderRadius: "6px",
          border: "1px solid #1e293e",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            fontSize: "0.75rem",
            color: "#64748b",
            fontFamily: "JetBrains Mono, monospace",
          }}
        >
          <span style={{ color: "#3b82f6", fontWeight: 700 }}>RAW TXN</span>
          <span>→</span>
          <span style={{ color: "#8b5cf6", fontWeight: 700 }}>31 VECTORS</span>
          <span>→</span>
          <span style={{ color: "#06b6d4", fontWeight: 700 }}>
            5 PARALLEL ENGINES
          </span>
          <span>→</span>
          <span style={{ color: "#f59e0b", fontWeight: 700 }}>RISK FUSION</span>
          <span>→</span>
          <span style={{ color: "#10b981", fontWeight: 700 }}>
            DECISION & SHAP
          </span>
        </div>
        <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
          Synchronous · Deterministic · Auditable
        </span>
      </div>
    </div>
  );
}
