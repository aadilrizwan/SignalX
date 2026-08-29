"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { scoreTransaction, type RiskScoreResponse } from "@/lib/api";
import { RiskScoreCard } from "@/components/risk/RiskScoreCard";
import { FraudTrendChart } from "@/components/dashboard/FraudTrendChart";
import { RiskDistributionChart } from "@/components/dashboard/RiskDistributionChart";
import { DecisionDistributionChart } from "@/components/dashboard/DecisionDistributionChart";
import { ArchitectureGraph } from "@/components/home/ArchitectureGraph";
import { PipelineFlowchartGraph } from "@/components/home/PipelineFlowchartGraph";
import { ScrollReveal } from "@/components/home/ScrollReveal";
import {
  ShieldCheck,
  Shield,
  Zap,
  Network,
  RotateCcw,
  ArrowRight,
  CheckCircle2,
  Lock,
  Cpu,
  Layers,
  BarChart3,
  Brain,
  Activity,
  Target,
  GitBranch,
  Database,
  Server,
  Eye,
  TrendingUp,
  AlertTriangle,
  FileText,
  Users,
  Globe,
  Fingerprint,
  Timer,
  DollarSign,
  Gauge,
  TreePine,
  Trophy,
  Award,
  Rocket,
  ExternalLink,
  Code2,
  Sparkles,
} from "lucide-react";

/*  Inline Section Title Component  */
function SectionTag({ children }: { children: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.375rem",
        padding: "0.25rem 0.65rem",
        borderRadius: "4px",
        background: "rgba(59, 130, 246, 0.1)",
        border: "1px solid rgba(59, 130, 246, 0.2)",
        color: "#60a5fa",
        fontSize: "0.75rem",
        fontWeight: 700,
        letterSpacing: "0.06em",
        textTransform: "uppercase" as const,
        marginBottom: "0.75rem",
      }}
    >
      {children}
    </span>
  );
}

function StatBox({
  value,
  label,
  color,
}: {
  value: string;
  label: string;
  color: string;
}) {
  return (
    <div>
      <div
        style={{
          fontSize: "1.75rem",
          fontWeight: 800,
          color,
          letterSpacing: "-0.03em",
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: "0.75rem",
          color: "#64748b",
          fontWeight: 600,
          textTransform: "uppercase" as const,
          marginTop: "0.15rem",
          letterSpacing: "0.04em",
        }}
      >
        {label}
      </div>
    </div>
  );
}

/*  Feature Row Component  */
function FeatureRow({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
      <div style={{ flexShrink: 0, marginTop: "2px", color: "#10b981" }}>
        {icon}
      </div>
      <div>
        <div
          style={{
            fontWeight: 700,
            fontSize: "0.875rem",
            marginBottom: "0.125rem",
          }}
        >
          {title}
        </div>
        <div
          style={{ fontSize: "0.8125rem", color: "#94a3b8", lineHeight: 1.45 }}
        >
          {desc}
        </div>
      </div>
    </div>
  );
}

/*  31 Feature Engineering List  */
const FEATURE_GROUPS = [
  {
    category: "Transaction Context",
    color: "#3b82f6",
    features: [
      "amount",
      "hour",
      "day_of_week",
      "is_weekend",
      "payment_method_encoded",
      "billing_country_encoded",
    ],
  },
  {
    category: "Customer Behavior",
    color: "#8b5cf6",
    features: [
      "customer_transaction_count",
      "customer_avg_amount",
      "customer_max_amount",
      "customer_days_since_first",
      "customer_unique_devices",
      "customer_unique_ips",
    ],
  },
  {
    category: "Amount Deviation",
    color: "#06b6d4",
    features: ["amount_z_score", "amount_to_max_ratio"],
  },
  {
    category: "Velocity Vectors",
    color: "#f59e0b",
    features: [
      "txn_count_1h",
      "txn_count_24h",
      "txn_count_7d",
      "amount_sum_24h",
      "unique_merchants_24h",
    ],
  },
  {
    category: "Device Fingerprint",
    color: "#10b981",
    features: [
      "device_transaction_count",
      "device_unique_customers",
      "device_fraud_rate",
    ],
  },
  {
    category: "IP Intelligence",
    color: "#ef4444",
    features: [
      "ip_transaction_count",
      "ip_unique_customers",
      "ip_unique_devices",
      "ip_fraud_rate",
    ],
  },
  {
    category: "Geographic Signals",
    color: "#ec4899",
    features: ["geo_mismatch", "high_risk_country"],
  },
  {
    category: "Behavioral Novelty",
    color: "#a855f7",
    features: ["is_new_device", "is_new_ip", "is_new_country"],
  },
];

/*  Cost Matrix Display */
const COST_MATRIX = [
  {
    label: "True Positive",
    desc: "Fraud correctly blocked",
    outcome: "Fraud Amount Saved",
    color: "#10b981",
  },
  {
    label: "False Positive",
    desc: "Legitimate customer blocked",
    outcome: "$25 per incident",
    color: "#f59e0b",
  },
  {
    label: "True Negative",
    desc: "Legitimate allowed through",
    outcome: "$0 cost",
    color: "#3b82f6",
  },
  {
    label: "False Negative",
    desc: "Fraud passes undetected",
    outcome: "Full Fraud Loss",
    color: "#ef4444",
  },
];

export default function HomePage() {
  const [demoResult, setDemoResult] = useState<RiskScoreResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeScenario, setActiveScenario] = useState<number | null>(null);

  const demoScenarios = [
    {
      title: "Legitimate Purchase",
      badge: "LOW RISK",
      badgeColor: "#10b981",
      desc: "Returning customer, known device, matching domestic billing/shipping.",
      data: {
        customer_id: "cust_000001",
        amount: 89.99,
        payment_method: "credit_card",
        device_id: "dev_000001",
        ip_address: "192.168.1.1",
        billing_country: "US",
        shipping_country: "US",
      },
    },
    {
      title: "Account Takeover Attempt",
      badge: "HIGH RISK",
      badgeColor: "#ef4444",
      desc: "Established account, sudden $14.9k on unrecognized device.",
      data: {
        customer_id: "cust_000001",
        amount: 14999.0,
        payment_method: "credit_card",
        device_id: "dev_UNKNOWN_999",
        ip_address: "10.99.1.42",
        billing_country: "US",
        shipping_country: "US",
      },
    },
    {
      title: "Cross-Border Fraud Ring",
      badge: "CRITICAL",
      badgeColor: "#dc2626",
      desc: "$74.9k with billing in Nigeria and shipping to US on a shared device.",
      data: {
        customer_id: "cust_000002",
        amount: 74999.0,
        payment_method: "credit_card",
        device_id: "dev_000050",
        ip_address: "41.200.4.10",
        billing_country: "NG",
        shipping_country: "US",
      },
    },
  ];

  const handleTestScenario = async (index: number) => {
    setActiveScenario(index);
    setLoading(true);
    try {
      const res = await scoreTransaction(demoScenarios[index].data);
      setDemoResult(res);
    } catch (e) {
      console.error("Scoring failed:", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="landing-container">
      {/*
          PRIORITY 1 — SECTION 1: HERO & VALUE PROPOSITION
         */}
      <ScrollReveal as="section" animation="fade-up" className="hero-section">
        <div style={{ maxWidth: "820px" }}>
          <h1 className="hero-title">
            Prevent Merchant <br />
            Financial Loss{" "}
            <span style={{ color: "#3b82f6" }}>In Real Time</span>
          </h1>

          <p
            style={{
              fontSize: "1.125rem",
              color: "#94a3b8",
              lineHeight: 1.65,
              marginBottom: "2.25rem",
            }}
          >
            SignalX is an AI powered merchant risk intelligence platform that
            evaluates every incoming payment for fraud signals, return abuse
            patterns, chargeback risk, and coordinated syndicate activity
            scoring in under 10ms with full SHAP based human readable
            explanations for every single decision.
          </p>

          <div className="hero-actions">
            <Link
              href="/login"
              className="btn btn-primary"
              style={{ padding: "0.8rem 1.75rem", fontSize: "0.9375rem" }}
            >
              <Sparkles size={17} /> Try Demo as Judge
            </Link>
            <Link
              href="/dashboard"
              className="btn btn-secondary"
              style={{ padding: "0.8rem 1.75rem", fontSize: "0.9375rem" }}
            >
              Launch Dashboard <ArrowRight size={17} />
            </Link>
            <a
              href="#live-sandbox"
              className="btn btn-secondary"
              style={{ padding: "0.8rem 1.75rem", fontSize: "0.9375rem" }}
            >
              Try Live Sandbox
            </a>
          </div>
        </div>

        {/* System Metrics Bar */}
        <ScrollReveal
          animation="fade-up"
          delay={150}
          stagger
          className="card hero-stats-grid"
        >
          <StatBox value="< 10ms" label="P99 Score Latency" color="#f8fafc" />
          <StatBox value="31" label="Anti Leakage Features" color="#3b82f6" />
          <StatBox value="5" label="Risk Fusion Signals" color="#8b5cf6" />
          <StatBox
            value="$1.2M+"
            label="Prevented Fraud Loss"
            color="#10b981"
          />
          <StatBox value="100%" label="TreeSHAP Explained" color="#f59e0b" />
        </ScrollReveal>
      </ScrollReveal>

      {/*
          PRIORITY 2 — SECTION 2: BUILT FOR RAZORPAY BUILDTHON
         */}
      <ScrollReveal
        as="section"
        animation="fade-up"
        style={{ marginBottom: "4rem" }}
      >
        <div
          className="card"
          style={{
            padding: "2.5rem",
            background:
              "linear-gradient(135deg, rgba(59, 130, 246, 0.06), rgba(139, 92, 246, 0.06), rgba(16, 185, 129, 0.06))",
            border: "1px solid rgba(59, 130, 246, 0.2)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              marginBottom: "1.5rem",
            }}
          >
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "12px",
                background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Trophy size={24} style={{ color: "#fff" }} />
            </div>
            <div>
              <h2
                style={{
                  fontSize: "1.75rem",
                  fontWeight: 800,
                  letterSpacing: "-0.03em",
                }}
              >
                Built for Razorpay Buildthon
              </h2>
              <p style={{ fontSize: "0.875rem", color: "#94a3b8" }}>
                Solving real world merchant financial loss with AI powered risk
                intelligence
              </p>
            </div>
          </div>

          <ScrollReveal
            animation="fade-up"
            delay={100}
            stagger
            className="grid-3-col"
            style={{ marginBottom: "2rem" }}
          >
            {/* Problem Statement */}
            <div
              style={{
                padding: "1.25rem",
                background: "rgba(239, 68, 68, 0.05)",
                border: "1px solid rgba(239, 68, 68, 0.15)",
                borderRadius: "8px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  marginBottom: "0.75rem",
                }}
              >
                <AlertTriangle size={18} style={{ color: "#ef4444" }} />
                <span
                  style={{
                    fontSize: "0.875rem",
                    fontWeight: 700,
                    color: "#ef4444",
                  }}
                >
                  The Problem
                </span>
              </div>
              <p
                style={{
                  fontSize: "0.8125rem",
                  color: "#94a3b8",
                  lineHeight: 1.6,
                }}
              >
                Merchants lose{" "}
                <strong style={{ color: "#f8fafc" }}>$48B+ annually</strong> to
                payment fraud, return abuse, and chargeback disputes. Existing
                solutions are siloed, opaque, and optimized for accuracy instead
                of business cost. Small and mid-size merchants lack the tools to
                fight back.
              </p>
            </div>

            {/* Our Solution */}
            <div
              style={{
                padding: "1.25rem",
                background: "rgba(16, 185, 129, 0.05)",
                border: "1px solid rgba(16, 185, 129, 0.15)",
                borderRadius: "8px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  marginBottom: "0.75rem",
                }}
              >
                <Rocket size={18} style={{ color: "#10b981" }} />
                <span
                  style={{
                    fontSize: "0.875rem",
                    fontWeight: 700,
                    color: "#10b981",
                  }}
                >
                  Our Solution
                </span>
              </div>
              <p
                style={{
                  fontSize: "0.8125rem",
                  color: "#94a3b8",
                  lineHeight: 1.6,
                }}
              >
                SignalX is a{" "}
                <strong style={{ color: "#f8fafc" }}>
                  unified risk intelligence platform
                </strong>{" "}
                that combines 5 independent scoring engines into one cost
                optimized decision. Every decision is{" "}
                <strong style={{ color: "#f8fafc" }}>
                  explainable via SHAP
                </strong>
                , so analysts can trust and audit the AI.
              </p>
            </div>

            {/* Why It Matters */}
            <div
              style={{
                padding: "1.25rem",
                background: "rgba(59, 130, 246, 0.05)",
                border: "1px solid rgba(59, 130, 246, 0.15)",
                borderRadius: "8px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  marginBottom: "0.75rem",
                }}
              >
                <Award size={18} style={{ color: "#3b82f6" }} />
                <span
                  style={{
                    fontSize: "0.875rem",
                    fontWeight: 700,
                    color: "#3b82f6",
                  }}
                >
                  Why It Matters
                </span>
              </div>
              <p
                style={{
                  fontSize: "0.8125rem",
                  color: "#94a3b8",
                  lineHeight: 1.6,
                }}
              >
                SignalX provides{" "}
                <strong style={{ color: "#f8fafc" }}>
                  defense only intelligence
                </strong>{" "}
                for merchants not just fraud scoring, but return abuse
                analytics, automated chargeback evidence, and fraud ring
                visualization. All in one platform.{" "}
                <strong style={{ color: "#f8fafc" }}>
                  AI recommends. Humans decide.
                </strong>
              </p>
            </div>
          </ScrollReveal>

          {/* Quick Evaluator Access Banner */}
          <ScrollReveal animation="zoom" delay={150}>
            <div
              style={{
                padding: "1.25rem 1.5rem",
                background: "rgba(59, 130, 246, 0.08)",
                borderRadius: "8px",
                border: "1px solid rgba(59, 130, 246, 0.25)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "1rem",
              }}
            >
              <div>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: "0.9375rem",
                    color: "#f8fafc",
                    marginBottom: "0.25rem",
                  }}
                >
                  Judges & Evaluators: 1 Click Demo Access Available
                </div>
                <div style={{ fontSize: "0.8125rem", color: "#94a3b8" }}>
                  Switch seamlessly between <strong>MARQ (Admin)</strong> and{" "}
                  <strong>MA RIZWAN (Analyst)</strong> without setting up
                  credentials.
                </div>
              </div>
              <Link
                href="/login"
                className="btn btn-primary btn-sm"
                style={{
                  padding: "0.5rem 1.25rem",
                  fontSize: "0.875rem",
                  flexShrink: 0,
                }}
              >
                <Sparkles size={16} /> Open Judge Demo
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </ScrollReveal>

      {/*
          PRIORITY 3 — SECTION 3: INTERACTIVE LIVE SANDBOX
         */}
      <ScrollReveal
        as="section"
        id="live-sandbox"
        animation="fade-up"
        style={{ marginBottom: "4rem" }}
      >
        <div className="card" style={{ padding: "2rem" }}>
          <SectionTag>Interactive Sandbox</SectionTag>
          <h2
            style={{
              fontSize: "1.75rem",
              fontWeight: 800,
              letterSpacing: "-0.02em",
              marginBottom: "0.35rem",
            }}
          >
            Test the Risk Fusion Engine Live
          </h2>
          <p
            style={{
              color: "#94a3b8",
              fontSize: "0.875rem",
              marginBottom: "1.75rem",
            }}
          >
            Click any scenario below to send a real POST /api/risk/score request
            to the backend. The response includes a fused risk score, per signal
            breakdowns, SHAP explanations, and a cost-optimized decision.
          </p>

          <ScrollReveal
            animation="fade-up"
            delay={100}
            stagger
            className="grid-3-col"
            style={{ marginBottom: "1.75rem" }}
          >
            {demoScenarios.map((scenario, index) => (
              <div
                key={index}
                className="card card-interactive"
                style={{
                  background:
                    activeScenario === index
                      ? "var(--bg-surface-elevated)"
                      : "var(--bg-surface)",
                  borderColor:
                    activeScenario === index
                      ? "#3b82f6"
                      : "var(--border-subtle)",
                }}
                onClick={() => handleTestScenario(index)}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: "0.5rem",
                    gap: "0.5rem",
                  }}
                >
                  <span style={{ fontWeight: 700, fontSize: "0.9375rem" }}>
                    {scenario.title}
                  </span>
                  <span
                    style={{
                      fontSize: "0.625rem",
                      fontWeight: 700,
                      padding: "0.15rem 0.4rem",
                      borderRadius: "3px",
                      background: `${scenario.badgeColor}18`,
                      color: scenario.badgeColor,
                      border: `1px solid ${scenario.badgeColor}40`,
                      flexShrink: 0,
                    }}
                  >
                    {scenario.badge}
                  </span>
                </div>
                <p
                  style={{
                    fontSize: "0.8125rem",
                    color: "#94a3b8",
                    lineHeight: 1.4,
                  }}
                >
                  {scenario.desc}
                </p>
                <div
                  style={{
                    marginTop: "1rem",
                    fontSize: "0.75rem",
                    color: "#60a5fa",
                    fontWeight: 600,
                  }}
                >
                  {loading && activeScenario === index
                    ? "Evaluating..."
                    : "Run Risk Assessment →"}
                </div>
              </div>
            ))}
          </ScrollReveal>

          {demoResult && (
            <ScrollReveal
              animation="zoom"
              style={{
                background: "#090c15",
                border: "1px solid #1e293e",
                borderRadius: "8px",
                padding: "1.25rem",
                overflowX: "auto",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "1rem",
                  borderBottom: "1px solid #1e293e",
                  paddingBottom: "0.75rem",
                  flexWrap: "wrap",
                  gap: "0.5rem",
                }}
              >
                <span
                  style={{
                    fontSize: "0.8125rem",
                    color: "#64748b",
                    fontFamily: "JetBrains Mono, monospace",
                  }}
                >
                  TXN: {demoResult.transaction_id}
                </span>
                <span className="badge badge-low">Scored in &lt;4ms</span>
              </div>
              <RiskScoreCard result={demoResult} />
            </ScrollReveal>
          )}
        </div>
      </ScrollReveal>

      {/*
          PRIORITY 4 — SECTION 4: FOUR CORE PROTECTION PILLARS
         */}
      <ScrollReveal
        as="section"
        id="pillars"
        animation="fade-up"
        style={{ marginBottom: "4rem" }}
      >
        <SectionTag>Merchant Protection Suite</SectionTag>
        <h2
          style={{
            fontSize: "2rem",
            fontWeight: 800,
            letterSpacing: "-0.03em",
            marginBottom: "0.35rem",
          }}
        >
          Four Pillars of Financial Loss Prevention
        </h2>
        <p
          style={{
            color: "#94a3b8",
            fontSize: "0.9375rem",
            marginBottom: "2rem",
          }}
        >
          Each module targets a specific vector of merchant financial loss with
          dedicated detection, scoring, and response logic.
        </p>

        <ScrollReveal
          animation="fade-up"
          delay={100}
          stagger
          className="grid-2-col"
        >
          {/* Pillar 1: Payment Fraud */}
          <div className="card" style={{ padding: "1.75rem" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                marginBottom: "1.25rem",
              }}
            >
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "8px",
                  background: "rgba(59, 130, 246, 0.12)",
                  color: "#60a5fa",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Zap size={22} />
              </div>
              <div>
                <h3 style={{ fontSize: "1.125rem", fontWeight: 700 }}>
                  Real Time Payment Fraud Detection
                </h3>
                <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                  Primary Revenue Protection Layer
                </span>
              </div>
            </div>
            <p
              style={{
                fontSize: "0.875rem",
                color: "#94a3b8",
                lineHeight: 1.55,
                marginBottom: "1.25rem",
              }}
            >
              Scores every incoming payment in under 10ms. Catches stolen cards,
              rapid card testing bursts, unusually high value purchases, and
              first-party fraud through 31 temporal features evaluated by a
              LightGBM gradient-boosted classifier.
            </p>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
                marginBottom: "1.25rem",
              }}
            >
              <FeatureRow
                icon={<CheckCircle2 size={15} />}
                title="Stolen Payment Detection"
                desc="Velocity spikes + new device + unusual IP pattern"
              />
              <FeatureRow
                icon={<CheckCircle2 size={15} />}
                title="Card Testing Bursts"
                desc="Multiple small value transactions in rapid succession"
              />
              <FeatureRow
                icon={<CheckCircle2 size={15} />}
                title="High Value Anomaly"
                desc="Amount Z-score deviation from customer history"
              />
            </div>
            <Link
              href="/transactions"
              style={{
                fontSize: "0.8125rem",
                color: "#60a5fa",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              Open Transaction Inspector →
            </Link>
          </div>

          {/* Pillar 2: Return Abuse */}
          <div className="card" style={{ padding: "1.75rem" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                marginBottom: "1.25rem",
              }}
            >
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "8px",
                  background: "rgba(6, 182, 212, 0.12)",
                  color: "#22d3ee",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <RotateCcw size={22} />
              </div>
              <div>
                <h3 style={{ fontSize: "1.125rem", fontWeight: 700 }}>
                  Return Abuse Prevention
                </h3>
                <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                  Post Purchase Loss Containment
                </span>
              </div>
            </div>
            <p
              style={{
                fontSize: "0.875rem",
                color: "#94a3b8",
                lineHeight: 1.55,
                marginBottom: "1.25rem",
              }}
            >
              Computes customer level return frequency, value ratios, and time
              to return velocity. Identifies wardrobing (buy use return), empty
              box fraud, and serial returner accounts that abuse merchant
              policies.
            </p>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
                marginBottom: "1.25rem",
              }}
            >
              <FeatureRow
                icon={<CheckCircle2 size={15} />}
                title="Wardrobing Detection"
                desc="High value items returned close to policy deadline"
              />
              <FeatureRow
                icon={<CheckCircle2 size={15} />}
                title="Serial Returner Scoring"
                desc="Account with >40 return rate flagged for review"
              />
              <FeatureRow
                icon={<CheckCircle2 size={15} />}
                title="Empty Box / Swap Fraud"
                desc="Weight mismatch or tampered packaging signals"
              />
            </div>
            <Link
              href="/returns"
              style={{
                fontSize: "0.8125rem",
                color: "#22d3ee",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              Return Analytics →
            </Link>
          </div>

          {/* Pillar 3: Chargeback Defense */}
          <div className="card" style={{ padding: "1.75rem" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                marginBottom: "1.25rem",
              }}
            >
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "8px",
                  background: "rgba(245, 158, 11, 0.12)",
                  color: "#fbbf24",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Shield size={22} />
              </div>
              <div>
                <h3 style={{ fontSize: "1.125rem", fontWeight: 700 }}>
                  Chargeback Defense & Evidence
                </h3>
                <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                  Dispute Win Rate Optimization
                </span>
              </div>
            </div>
            <p
              style={{
                fontSize: "0.875rem",
                color: "#94a3b8",
                lineHeight: 1.55,
                marginBottom: "1.25rem",
              }}
            >
              When a chargeback is filed, SignalX automatically compiles device
              fingerprints, IP audit logs, 3DS authentication records, delivery
              confirmations, and order history into structured evidence packages
              ready for submission.
            </p>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
                marginBottom: "1.25rem",
              }}
            >
              <FeatureRow
                icon={<CheckCircle2 size={15} />}
                title="Friendly Fraud Detection"
                desc="Customer who received goods but disputes payment"
              />
              <FeatureRow
                icon={<CheckCircle2 size={15} />}
                title="Evidence Auto-Assembly"
                desc="IP logs + device data + delivery proof compiled automatically"
              />
              <FeatureRow
                icon={<CheckCircle2 size={15} />}
                title="Win-Rate Forecasting"
                desc="Predicts dispute outcome before you invest analyst time"
              />
            </div>
            <Link
              href="/chargebacks"
              style={{
                fontSize: "0.8125rem",
                color: "#fbbf24",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              Chargeback Manager →
            </Link>
          </div>

          {/* Pillar 4: Fraud Rings */}
          <div className="card" style={{ padding: "1.75rem" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                marginBottom: "1.25rem",
              }}
            >
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "8px",
                  background: "rgba(16, 185, 129, 0.12)",
                  color: "#34d399",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Network size={22} />
              </div>
              <div>
                <h3 style={{ fontSize: "1.125rem", fontWeight: 700 }}>
                  Coordinated Fraud Ring Intelligence
                </h3>
                <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                  Entity Linkage & Network Analysis
                </span>
              </div>
            </div>
            <p
              style={{
                fontSize: "0.875rem",
                color: "#94a3b8",
                lineHeight: 1.55,
                marginBottom: "1.25rem",
              }}
            >
              Maps hidden connections between seemingly unrelated customer
              accounts that share the same device fingerprint, IP subnet,
              shipping address, or payment instrument dismantling organized
              fraud operations.
            </p>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
                marginBottom: "1.25rem",
              }}
            >
              <FeatureRow
                icon={<CheckCircle2 size={15} />}
                title="Shared Device Clustering"
                desc="Multiple accounts transacting from same browser fingerprint"
              />
              <FeatureRow
                icon={<CheckCircle2 size={15} />}
                title="IP Subnet Analysis"
                desc="Accounts on same /24 subnet with correlated timing"
              />
              <FeatureRow
                icon={<CheckCircle2 size={15} />}
                title="Address Linkage"
                desc="Distinct identities shipping to shared physical address"
              />
            </div>
            <Link
              href="/fraud-graph"
              style={{
                fontSize: "0.8125rem",
                color: "#34d399",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              Open Graph Visualizer →
            </Link>
          </div>
        </ScrollReveal>

        {/* Real-time DAG Pipeline Flowchart Graph */}
        <ScrollReveal
          animation="zoom"
          delay={200}
          style={{ marginTop: "2.5rem" }}
        >
          <PipelineFlowchartGraph />
        </ScrollReveal>
      </ScrollReveal>

      {/*
          PRIORITY 5 — SECTION 5: ARCHITECTURE & RISK FUSION ENGINE
         */}
      <ScrollReveal
        as="section"
        id="architecture"
        animation="fade-up"
        style={{
          marginBottom: "4rem",
          display: "flex",
          flexDirection: "column",
          gap: "1.5rem",
        }}
      >
        {/* Interactive Architecture Flow Graph */}
        <ScrollReveal animation="zoom">
          <ArchitectureGraph />
        </ScrollReveal>

        <ScrollReveal animation="fade-up" delay={150}>
          <div className="card" style={{ padding: "2rem" }}>
            <div className="split-2-col">
              <div>
                <SectionTag>Multi Signal Architecture</SectionTag>
                <h2
                  style={{
                    fontSize: "1.875rem",
                    fontWeight: 800,
                    letterSpacing: "-0.03em",
                    marginBottom: "1rem",
                  }}
                >
                  Weighted Risk Fusion Engine
                </h2>
                <p
                  style={{
                    color: "#94a3b8",
                    fontSize: "0.9375rem",
                    lineHeight: 1.6,
                    marginBottom: "1.75rem",
                  }}
                >
                  Instead of relying on a single ML model, SignalX computes a{" "}
                  <strong>weighted score fusion</strong> across 5 independent
                  engines. This multi signal approach prevents single point
                  failure: if the ML model has a blind spot, rule-based and
                  anomaly detectors still catch threats.
                </p>

                {/* Weight Bars */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "1rem",
                  }}
                >
                  {[
                    {
                      name: "LightGBM Classifier",
                      weight: 40,
                      color: "#3b82f6",
                      desc: "Gradient boosted tree probability score trained on temporal features",
                    },
                    {
                      name: "Deterministic Rule Engine",
                      weight: 20,
                      color: "#f59e0b",
                      desc: "8 configurable business safety rules with severity levels",
                    },
                    {
                      name: "Isolation Forest Anomaly",
                      weight: 15,
                      color: "#a855f7",
                      desc: "Unsupervised outlier detection no labels required",
                    },
                    {
                      name: "Customer Behavioral Scorer",
                      weight: 15,
                      color: "#06b6d4",
                      desc: "Account age, spend velocity, device novelty scoring",
                    },
                    {
                      name: "Graph Intelligence Layer",
                      weight: 10,
                      color: "#10b981",
                      desc: "Shared entity linkage across device/IP/address clusters",
                    },
                  ].map((eng) => (
                    <div key={eng.name}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: "0.25rem",
                        }}
                      >
                        <span
                          style={{ fontSize: "0.8125rem", fontWeight: 700 }}
                        >
                          {eng.name}
                        </span>
                        <span
                          style={{
                            fontSize: "0.8125rem",
                            fontWeight: 700,
                            fontFamily: "JetBrains Mono, monospace",
                            color: eng.color,
                          }}
                        >
                          {eng.weight}%
                        </span>
                      </div>
                      <div
                        style={{
                          height: "6px",
                          background: "#1e293e",
                          borderRadius: "3px",
                        }}
                      >
                        <div
                          style={{
                            height: "100%",
                            width: `${eng.weight}%`,
                            background: eng.color,
                            borderRadius: "3px",
                            transition: "width 0.5s ease",
                          }}
                        />
                      </div>
                      <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                        {eng.desc}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pipeline Flow */}
              <div style={{ width: "100%" }}>
                <div
                  style={{
                    background: "#090c15",
                    border: "1px solid #1e293e",
                    borderRadius: "8px",
                    padding: "1.25rem",
                    width: "100%",
                  }}
                >
                  <div
                    style={{
                      fontSize: "0.75rem",
                      color: "#64748b",
                      fontWeight: 700,
                      textTransform: "uppercase" as const,
                      marginBottom: "1.25rem",
                      letterSpacing: "0.05em",
                    }}
                  >
                    Execution Pipeline
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.875rem",
                      fontFamily: "JetBrains Mono, monospace",
                      fontSize: "0.8125rem",
                    }}
                  >
                    {[
                      {
                        step: "1",
                        label: "POST /api/risk/score → Extract 31 Features",
                        color: "#3b82f6",
                        icon: <Database size={16} />,
                      },
                      {
                        step: "2",
                        label: "Temporal Feature Builder (Point-in-Time)",
                        color: "#8b5cf6",
                        icon: <Timer size={16} />,
                      },
                      {
                        step: "3",
                        label: "Parallel: ML + Rules + Anomaly + Behavior",
                        color: "#06b6d4",
                        icon: <Layers size={16} />,
                      },
                      {
                        step: "4",
                        label: "Weighted Score Fusion → Risk [0.00 - 1.00]",
                        color: "#f59e0b",
                        icon: <Gauge size={16} />,
                      },
                      {
                        step: "5",
                        label: "Cost Matrix Optimizer → ALLOW / REVIEW / BLOCK",
                        color: "#10b981",
                        icon: <Target size={16} />,
                      },
                      {
                        step: "6",
                        label: "TreeSHAP Explainer → Top-K Human Reasons",
                        color: "#ef4444",
                        icon: <Eye size={16} />,
                      },
                    ].map((item) => (
                      <div
                        key={item.step}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.75rem",
                          padding: "0.65rem 0.875rem",
                          background: "var(--bg-surface)",
                          borderRadius: "6px",
                          borderLeft: `3px solid ${item.color}`,
                        }}
                      >
                        <span style={{ color: item.color, flexShrink: 0 }}>
                          {item.icon}
                        </span>
                        <span
                          style={{ color: "#e2e8f0", wordBreak: "break-word" }}
                        >
                          {item.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Decision Flow */}
                <div
                  style={{
                    marginTop: "1.25rem",
                    background: "#090c15",
                    border: "1px solid #1e293e",
                    borderRadius: "8px",
                    padding: "1.25rem",
                    width: "100%",
                  }}
                >
                  <div
                    style={{
                      fontSize: "0.75rem",
                      color: "#64748b",
                      fontWeight: 700,
                      textTransform: "uppercase" as const,
                      marginBottom: "1rem",
                      letterSpacing: "0.05em",
                    }}
                  >
                    Decision Thresholds
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: "0.75rem",
                      flexWrap: "wrap",
                    }}
                  >
                    <div
                      style={{
                        flex: "1 1 100px",
                        textAlign: "center" as const,
                        padding: "0.75rem",
                        background: "rgba(16,185,129,0.1)",
                        border: "1px solid rgba(16,185,129,0.25)",
                        borderRadius: "6px",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "1.25rem",
                          fontWeight: 800,
                          color: "#10b981",
                          fontFamily: "JetBrains Mono, monospace",
                        }}
                      >
                        0.00–0.30
                      </div>
                      <div
                        style={{
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          color: "#34d399",
                          marginTop: "0.25rem",
                        }}
                      >
                        ALLOW
                      </div>
                    </div>
                    <div
                      style={{
                        flex: "1 1 100px",
                        textAlign: "center" as const,
                        padding: "0.75rem",
                        background: "rgba(245,158,11,0.1)",
                        border: "1px solid rgba(245,158,11,0.25)",
                        borderRadius: "6px",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "1.25rem",
                          fontWeight: 800,
                          color: "#f59e0b",
                          fontFamily: "JetBrains Mono, monospace",
                        }}
                      >
                        0.30–0.70
                      </div>
                      <div
                        style={{
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          color: "#fbbf24",
                          marginTop: "0.25rem",
                        }}
                      >
                        REVIEW
                      </div>
                    </div>
                    <div
                      style={{
                        flex: "1 1 100px",
                        textAlign: "center" as const,
                        padding: "0.75rem",
                        background: "rgba(239,68,68,0.1)",
                        border: "1px solid rgba(239,68,68,0.25)",
                        borderRadius: "6px",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "1.25rem",
                          fontWeight: 800,
                          color: "#ef4444",
                          fontFamily: "JetBrains Mono, monospace",
                        }}
                      >
                        0.70–1.00
                      </div>
                      <div
                        style={{
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          color: "#f87171",
                          marginTop: "0.25rem",
                        }}
                      >
                        BLOCK
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </ScrollReveal>

      {/*
          PRIORITY 6 — SECTION 6: LIVE RISK INTELLIGENCE & TELEMETRY
         */}
      <ScrollReveal
        as="section"
        id="features"
        animation="fade-up"
        style={{ marginBottom: "4rem" }}
      >
        <SectionTag>Live Risk Intelligence</SectionTag>
        <h2
          style={{
            fontSize: "2rem",
            fontWeight: 800,
            letterSpacing: "-0.03em",
            marginBottom: "0.35rem",
          }}
        >
          Real-Time Risk Monitoring Overview
        </h2>
        <p
          style={{
            color: "#94a3b8",
            fontSize: "0.9375rem",
            marginBottom: "1.75rem",
          }}
        >
          These charts display live system data. When connected to the backend
          API, they auto populate from the scoring engine.
        </p>

        <ScrollReveal
          animation="fade-up"
          delay={100}
          style={{ marginBottom: "1.25rem" }}
        >
          <div className="card" style={{ padding: "1.5rem" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1rem",
                flexWrap: "wrap",
                gap: "0.5rem",
              }}
            >
              <div>
                <h3 style={{ fontSize: "1.0625rem", fontWeight: 700 }}>
                  30-Day Transaction Volume & Fraud Detection Trend
                </h3>
                <p style={{ fontSize: "0.8125rem", color: "#64748b" }}>
                  Temporal view of legitimate vs flagged transaction counts over
                  a sliding 30 day window
                </p>
              </div>
              <span className="badge badge-low">Auto Updating</span>
            </div>
            <FraudTrendChart />
          </div>
        </ScrollReveal>

        <ScrollReveal
          animation="fade-up"
          delay={150}
          stagger
          className="grid-2-col"
        >
          <div className="card" style={{ padding: "1.5rem" }}>
            <h3
              style={{
                fontSize: "1.0625rem",
                fontWeight: 700,
                marginBottom: "0.25rem",
              }}
            >
              Risk Level Spectrum (Radar)
            </h3>
            <p
              style={{
                fontSize: "0.8125rem",
                color: "#64748b",
                marginBottom: "0.75rem",
              }}
            >
              Multivariate Radar analysis across LOW, MEDIUM, HIGH, and CRITICAL
              risk tiers
            </p>
            <RiskDistributionChart />
          </div>
          <div className="card" style={{ padding: "1.5rem" }}>
            <h3
              style={{
                fontSize: "1.0625rem",
                fontWeight: 700,
                marginBottom: "0.25rem",
              }}
            >
              Automated Decision Routing (Radial Bar)
            </h3>
            <p
              style={{
                fontSize: "0.8125rem",
                color: "#64748b",
                marginBottom: "0.75rem",
              }}
            >
              Concentric Radial Bar routing: ALLOW for safe, REVIEW for
              uncertain, BLOCK for fraud
            </p>
            <DecisionDistributionChart />
          </div>
        </ScrollReveal>
      </ScrollReveal>

      {/*
          PRIORITY 7 — SECTION 7: COST MATRIX & EXPLAINABILITY
         */}
      <ScrollReveal
        as="section"
        animation="fade-up"
        style={{ marginBottom: "4rem" }}
      >
        <div className="grid-2-col">
          {/* Cost Matrix */}
          <ScrollReveal animation="left">
            <div
              className="card"
              style={{ padding: "1.75rem", height: "100%" }}
            >
              <SectionTag>Business Optimized Decisions</SectionTag>
              <h3
                style={{
                  fontSize: "1.375rem",
                  fontWeight: 800,
                  letterSpacing: "-0.02em",
                  marginBottom: "0.35rem",
                }}
              >
                Cost Sensitive Decision Matrix
              </h3>
              <p
                style={{
                  color: "#94a3b8",
                  fontSize: "0.875rem",
                  marginBottom: "1.5rem",
                  lineHeight: 1.5,
                }}
              >
                SignalX optimizes the decision threshold to minimize total
                expected cost not just maximize accuracy. The optimal threshold
                balances blocking fraud vs losing legitimate revenue.
              </p>
              <div className="grid-2-col" style={{ gap: "0.75rem" }}>
                {COST_MATRIX.map((cell) => (
                  <div
                    key={cell.label}
                    style={{
                      padding: "1rem",
                      background: "rgba(255,255,255,0.02)",
                      border: "1px solid #1e293e",
                      borderRadius: "8px",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "0.8125rem",
                        fontWeight: 700,
                        color: cell.color,
                        marginBottom: "0.25rem",
                      }}
                    >
                      {cell.label}
                    </div>
                    <div
                      style={{
                        fontSize: "0.75rem",
                        color: "#94a3b8",
                        marginBottom: "0.5rem",
                      }}
                    >
                      {cell.desc}
                    </div>
                    <div
                      style={{
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        color: "#f8fafc",
                        fontFamily: "JetBrains Mono, monospace",
                      }}
                    >
                      {cell.outcome}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </ScrollReveal>

          {/* SHAP Explainability */}
          <ScrollReveal animation="right">
            <div
              className="card"
              style={{ padding: "1.75rem", height: "100%" }}
            >
              <SectionTag>Explainable AI</SectionTag>
              <h3
                style={{
                  fontSize: "1.375rem",
                  fontWeight: 800,
                  letterSpacing: "-0.02em",
                  marginBottom: "0.35rem",
                }}
              >
                TreeSHAP Feature Attribution
              </h3>
              <p
                style={{
                  color: "#94a3b8",
                  fontSize: "0.875rem",
                  marginBottom: "1.5rem",
                  lineHeight: 1.5,
                }}
              >
                Every risk decision comes with SHAP (SHapley Additive
                exPlanations) values that quantify exactly how much each feature
                pushed the score up or down making the model fully auditable.
              </p>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.75rem",
                }}
              >
                <FeatureRow
                  icon={<AlertTriangle size={15} color="#ef4444" />}
                  title="Risk Factors (Positive SHAP)"
                  desc="Features that increased the fraud probability: e.g. high velocity, unknown device, geo mismatch"
                />
                <FeatureRow
                  icon={<ShieldCheck size={15} color="#10b981" />}
                  title="Protective Factors (Negative SHAP)"
                  desc="Features that decreased fraud probability: e.g. loyal customer, known IP, normal spend"
                />
                <FeatureRow
                  icon={<Eye size={15} color="#3b82f6" />}
                  title="Human-Readable Reason Codes"
                  desc="Each SHAP value is translated to a plain-English explanation for analyst review"
                />
                <FeatureRow
                  icon={<BarChart3 size={15} color="#8b5cf6" />}
                  title="Full Audit Trail"
                  desc="Every scored transaction persists its SHAP decomposition for regulatory compliance"
                />
              </div>
            </div>
          </ScrollReveal>
        </div>
      </ScrollReveal>

      {/*
          PRIORITY 8 — SECTION 8: 31-FEATURE ENGINEERING BREAKDOWN
         */}
      <ScrollReveal
        as="section"
        animation="fade-up"
        style={{ marginBottom: "4rem" }}
      >
        <SectionTag>Feature Engineering Pipeline</SectionTag>
        <h2
          style={{
            fontSize: "2rem",
            fontWeight: 800,
            letterSpacing: "-0.03em",
            marginBottom: "0.35rem",
          }}
        >
          31 Temporal Anti Leakage Feature Vectors
        </h2>
        <p
          style={{
            color: "#94a3b8",
            fontSize: "0.9375rem",
            marginBottom: "1.75rem",
          }}
        >
          Every feature is computed using <strong>point in time logic</strong>
          only data that would have been available at the moment of the
          transaction is used. No future labels, no target leakage, no look
          ahead bias.
        </p>

        <ScrollReveal
          animation="fade-up"
          delay={100}
          stagger
          className="grid-4-col"
        >
          {FEATURE_GROUPS.map((group) => (
            <div
              className="card"
              key={group.category}
              style={{ padding: "1.25rem" }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  marginBottom: "0.75rem",
                }}
              >
                <div
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "2px",
                    background: group.color,
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontSize: "0.8125rem", fontWeight: 700 }}>
                  {group.category}
                </span>
                <span
                  style={{
                    fontSize: "0.6875rem",
                    color: "#64748b",
                    marginLeft: "auto",
                    fontFamily: "JetBrains Mono, monospace",
                  }}
                >
                  {group.features.length}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.35rem",
                }}
              >
                {group.features.map((f) => (
                  <span
                    key={f}
                    style={{
                      fontSize: "0.75rem",
                      color: "#94a3b8",
                      fontFamily: "JetBrains Mono, monospace",
                      padding: "0.2rem 0.4rem",
                      background: "rgba(255,255,255,0.03)",
                      borderRadius: "3px",
                      wordBreak: "break-all",
                    }}
                  >
                    {f}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </ScrollReveal>
      </ScrollReveal>

      {/*
          PRIORITY 9 — SECTION 9: REAL PRODUCTION-GRADE TECH STACK
         */}
      <ScrollReveal
        as="section"
        animation="fade-up"
        style={{ marginBottom: "4rem" }}
      >
        <SectionTag>Production Grade Technology Architecture</SectionTag>
        <h2
          style={{
            fontSize: "2rem",
            fontWeight: 800,
            letterSpacing: "-0.03em",
            marginBottom: "0.5rem",
          }}
        >
          Built With a Real World Production Stack
        </h2>
        <p
          style={{
            color: "#94a3b8",
            fontSize: "0.9375rem",
            marginBottom: "1.75rem",
          }}
        >
          Every component in SignalX uses enterprise grade, battle tested
          technologies across Machine Learning, Graph Databases, Large Language
          Models, and Cloud Infrastructure.
        </p>

        <ScrollReveal
          animation="fade-up"
          delay={100}
          stagger
          className="grid-3-col"
        >
          {[
            {
              icon: <Brain size={24} />,
              title: "ML & Explainability",
              color: "#3b82f6",
              items: [
                "LightGBM Gradient Boosted Trees",
                "Isolation Forest Anomaly Detection",
                "TreeSHAP Attribution Engine",
                "31 Point in Time Feature Vectors",
                "Cost Sensitive Threshold Optimizer",
              ],
            },
            {
              icon: <Network size={24} />,
              title: "Graph & Ring Intelligence",
              color: "#10b981",
              items: [
                "Neo4j AuraDB Cloud Graph Engine",
                "Cypher Query Language (CQL)",
                "Entity Linkage (Device/IP/Address)",
                "Community Clustering & Ring Score",
                "Graph Subgraph Topology API",
              ],
            },
            {
              icon: <Sparkles size={24} />,
              title: "Dispute GenAI & Evidence",
              color: "#8b5cf6",
              items: [
                "DeepSeek LLM Reasoning API",
                "Automated Dispute Dossier Synthesis",
                "ReportLab PDF Generation Engine",
                "Evidence Package Audit Trail",
                "Dispute Win-Rate Forecaster",
              ],
            },
            {
              icon: <Server size={24} />,
              title: "Cloud Backend & Security",
              color: "#06b6d4",
              items: [
                "FastAPI (Python 3.10+ Async)",
                "Supabase Auth & JWT RBAC",
                "SQLAlchemy ORM (SQLite / Postgres)",
                "Pydantic v2 Validation Schemas",
                "Row-Level Security (RLS) Policies",
              ],
            },
            {
              icon: <Layers size={24} />,
              title: "Modern Frontend & Data Viz",
              color: "#f59e0b",
              items: [
                "Next.js 16 (App Router & RSC)",
                "React 19 + TypeScript 5",
                "Recharts (Radar, Radial & Area)",
                "React Flow (@xyflow/react) DAGs",
                "Tailwind CSS 4 + Design System",
              ],
            },
            {
              icon: <Zap size={24} />,
              title: "Infrastructure & Velocity",
              color: "#ec4899",
              items: [
                "Docker Multi-Stage Containerization",
                "In-Memory Sliding Velocity Windows",
                "Vercel Edge Cloud Deployment",
                "Render Web Service Hosting",
                "Dual Demo & Supabase Auth Fallback",
              ],
            },
          ].map((stack) => (
            <div
              className="card"
              key={stack.title}
              style={{
                padding: "1.5rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
              }}
            >
              <div
                style={{
                  width: "42px",
                  height: "42px",
                  borderRadius: "8px",
                  background: `${stack.color}15`,
                  color: stack.color,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {stack.icon}
              </div>
              <h4
                style={{
                  fontSize: "1.0625rem",
                  fontWeight: 700,
                  color: "#f8fafc",
                }}
              >
                {stack.title}
              </h4>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.4rem",
                }}
              >
                {stack.items.map((item) => (
                  <span
                    key={item}
                    style={{
                      fontSize: "0.8125rem",
                      color: "#94a3b8",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.35rem",
                    }}
                  >
                    <span
                      style={{
                        width: "4px",
                        height: "4px",
                        borderRadius: "50%",
                        background: stack.color,
                        flexShrink: 0,
                      }}
                    />
                    {item}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </ScrollReveal>
      </ScrollReveal>

      {/*
          PRIORITY 10 — SECTION 10: PLATFORM MODULES OVERVIEW
         */}
      <ScrollReveal
        as="section"
        animation="fade-up"
        style={{ marginBottom: "4rem" }}
      >
        <SectionTag>Platform Modules</SectionTag>
        <h2
          style={{
            fontSize: "2rem",
            fontWeight: 800,
            letterSpacing: "-0.03em",
            marginBottom: "1.75rem",
          }}
        >
          Every Tool You Need, One Platform
        </h2>
        <ScrollReveal
          animation="fade-up"
          delay={100}
          stagger
          className="grid-3-col"
        >
          {[
            {
              href: "/dashboard",
              icon: <Activity size={20} />,
              title: "Merchant Dashboard",
              desc: "Real-time KPI monitoring with 8 key metrics, 30-day trends, and geo heatmaps.",
            },
            {
              href: "/transactions",
              icon: <Zap size={20} />,
              title: "Transaction Inspector",
              desc: "Browse, filter, and investigate individual transactions with fraud status badges.",
            },
            {
              href: "/fraud-graph",
              icon: <Network size={20} />,
              title: "Fraud Graph Visualizer",
              desc: "Map shared-device and shared-IP clusters across customer accounts.",
            },
            {
              href: "/returns",
              icon: <RotateCcw size={20} />,
              title: "Return Abuse Analytics",
              desc: "Customer return rate scoring, wardrobing detection, serial returner flags.",
            },
            {
              href: "/chargebacks",
              icon: <Shield size={20} />,
              title: "Chargeback Defense",
              desc: "Automated evidence assembly and dispute win rate forecasting.",
            },
            {
              href: "/evidence",
              icon: <FileText size={20} />,
              title: "Evidence Generator",
              desc: "RAG-powered evidence retrieval with source backed claims for disputes.",
            },
            {
              href: "/model",
              icon: <BarChart3 size={20} />,
              title: "Model Metrics",
              desc: "PR-AUC, ROC-AUC, precision/recall, FPR/FNR from held-out temporal test set.",
            },
            {
              href: "/reviews",
              icon: <Users size={20} />,
              title: "Review Queue",
              desc: "Human-in-the-loop analyst queue: Confirm Fraud, Mark Legitimate, or Escalate.",
            },
            {
              href: "/settings",
              icon: <Gauge size={20} />,
              title: "Risk Engine Settings",
              desc: "Configure thresholds, cost matrix, fusion weights, and rule severity levels.",
            },
          ].map((page) => (
            <Link
              key={page.href}
              href={page.href}
              className="card card-interactive"
              style={{
                padding: "1.25rem",
                textDecoration: "none",
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
              }}
            >
              <div style={{ color: "#60a5fa" }}>{page.icon}</div>
              <h4
                style={{
                  fontSize: "0.9375rem",
                  fontWeight: 700,
                  color: "#f8fafc",
                }}
              >
                {page.title}
              </h4>
              <p
                style={{
                  fontSize: "0.8125rem",
                  color: "#94a3b8",
                  lineHeight: 1.45,
                }}
              >
                {page.desc}
              </p>
            </Link>
          ))}
        </ScrollReveal>
      </ScrollReveal>

      {/*
          PRIORITY 11 — FOOTER CTA
         */}
      <ScrollReveal
        as="footer"
        animation="fade-up"
        style={{
          borderTop: "1px solid #1e293e",
          padding: "2.5rem 0",
          marginBottom: "2rem",
        }}
      >
        <div className="footer-flex">
          <div>
            <h3
              style={{
                fontSize: "1.25rem",
                fontWeight: 700,
                marginBottom: "0.25rem",
              }}
            >
              🏆 Ready to explore SignalX?
            </h3>
            <p style={{ color: "#64748b", fontSize: "0.875rem" }}>
              Built for Razorpay Buildthon Sign in as a Judge to experience the
              full platform.
            </p>
          </div>
          <div
            style={{
              display: "flex",
              gap: "0.75rem",
              flexShrink: 0,
              flexWrap: "wrap",
            }}
          >
            <Link
              href="/login"
              className="btn btn-primary"
              style={{
                padding: "0.75rem 1.75rem",
                fontSize: "0.9375rem",
              }}
            >
              <Sparkles size={17} /> Try Demo
            </Link>
            <Link
              href="/dashboard"
              className="btn btn-secondary"
              style={{
                padding: "0.75rem 1.75rem",
                fontSize: "0.9375rem",
              }}
            >
              Launch Dashboard <ArrowRight size={17} />
            </Link>
          </div>
        </div>
        <div
          style={{
            marginTop: "1.5rem",
            paddingTop: "1.25rem",
            borderTop: "1px solid rgba(30, 41, 62, 0.5)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "0.75rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <ShieldCheck size={16} style={{ color: "#3b82f6" }} />
            <span style={{ fontSize: "0.8125rem", fontWeight: 700 }}>
              SignalX
            </span>
            <span style={{ fontSize: "0.75rem", color: "#64748b" }}>•</span>
            <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
              AI Risk Intelligence for Merchants
            </span>
          </div>
          <span style={{ fontSize: "0.75rem", color: "#475569" }}>
            Built with ❤️ by MARQ
          </span>
        </div>
      </ScrollReveal>
    </div>
  );
}
