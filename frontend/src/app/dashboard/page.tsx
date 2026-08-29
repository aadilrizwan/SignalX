"use client";

import { useEffect, useState } from "react";
import { getDashboardMetrics, type DashboardMetrics } from "@/lib/api";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { FraudTrendChart } from "@/components/dashboard/FraudTrendChart";
import { RiskDistributionChart } from "@/components/dashboard/RiskDistributionChart";
import { DecisionDistributionChart } from "@/components/dashboard/DecisionDistributionChart";
import { FraudByCountryChart } from "@/components/dashboard/FraudByCountryChart";
import { DemoPanel } from "@/components/dashboard/DemoPanel";
import { LiveStreamBanner } from "@/components/dashboard/LiveStreamBanner";
import {
  ShieldAlert,
  ShieldCheck,
  DollarSign,
  AlertTriangle,
  TrendingDown,
  RotateCcw,
  CreditCard,
  Target,
  RefreshCw,
  Activity,
} from "lucide-react";

// Default pre-populated metrics so dashboard is ALWAYS active and visible
const MOCK_FALLBACK_METRICS: DashboardMetrics = {
  total_transactions: 53746,
  fraud_detected: 2453,
  fraud_prevented_amount: 1248920.0,
  current_fraud_rate: 0.0456,
  false_positive_rate: 0.0082,
  chargeback_rate: 0.0041,
  return_abuse_rate: 0.0215,
  expected_loss: 148500.0,
  decisions: { ALLOW: 49500, REVIEW: 2980, BLOCK: 1266 },
  risk_levels: { LOW: 48210, MEDIUM: 3120, HIGH: 1840, CRITICAL: 576 },
  fraud_trend: [
    { date: "Aug 01", total_count: 1420, fraud_count: 52 },
    { date: "Aug 05", total_count: 1680, fraud_count: 61 },
    { date: "Aug 10", total_count: 1540, fraud_count: 48 },
    { date: "Aug 15", total_count: 1890, fraud_count: 89 },
    { date: "Aug 20", total_count: 2100, fraud_count: 94 },
    { date: "Aug 25", total_count: 1950, fraud_count: 72 },
    { date: "Aug 30", total_count: 2240, fraud_count: 85 },
  ],
  fraud_by_country: [
    { billing_country: "NG", count: 1850, fraud: 490, rate: 0.264 },
    { billing_country: "US", count: 32400, fraud: 380, rate: 0.011 },
    { billing_country: "GB", count: 4200, fraud: 120, rate: 0.028 },
    { billing_country: "BR", count: 2100, fraud: 95, rate: 0.045 },
    { billing_country: "RU", count: 890, fraud: 82, rate: 0.092 },
    { billing_country: "CA", count: 3100, fraud: 45, rate: 0.014 },
    { billing_country: "DE", count: 2800, fraud: 32, rate: 0.011 },
  ],
  fraud_by_payment_method: [
    { payment_method: "credit_card", count: 42000, fraud: 1980, rate: 0.047 },
    { payment_method: "debit_card", count: 8500, fraud: 320, rate: 0.037 },
    { payment_method: "paypal", count: 3246, fraud: 153, rate: 0.047 },
  ],
};

// Fixed en-US Number Formatters to prevent Hydration Mismatch
function formatNum(val: number | undefined | null, decimals = 0): string {
  if (val === null || val === undefined || isNaN(val)) return "0";
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(val);
}

function formatCurr(val: number | undefined | null, decimals = 0): string {
  if (val === null || val === undefined || isNaN(val)) return "$0";
  return "$" + formatNum(val, decimals);
}

import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { User, Sliders, ArrowRight } from "lucide-react";

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);
  const [metrics, setMetrics] = useState<DashboardMetrics>(
    MOCK_FALLBACK_METRICS,
  );
  const [isLiveApi, setIsLiveApi] = useState(false);
  const [loading, setLoading] = useState(false);
  const { user, role } = useAuth();

  const fetchMetrics = () => {
    setLoading(true);
    getDashboardMetrics()
      .then((data) => {
        setMetrics(data);
        setIsLiveApi(true);
      })
      .catch(() => {
        // Fallback to mock data so graphs are ALWAYS rendered
        setMetrics(MOCK_FALLBACK_METRICS);
        setIsLiveApi(false);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    setMounted(true);
    fetchMetrics();
  }, []);

  return (
    <div style={{ maxWidth: "1280px" }}>
      {/* Header */}
      <div className="page-header">
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              marginBottom: "0.25rem",
            }}
          >
            <h1>Merchant Risk Dashboard</h1>
            <span className="badge badge-low" style={{ fontSize: "0.75rem" }}>
              <span
                className="status-dot"
                style={{ display: "inline-block" }}
              />
              {isLiveApi ? "Live Backend Connected" : "Demo Data Stream Active"}
            </span>
          </div>
          <p>
            Real-time transaction scoring, behavioral vectors, and financial
            loss prevention
          </p>
        </div>
        <button
          className="btn btn-secondary"
          onClick={fetchMetrics}
          disabled={loading}
        >
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} />{" "}
          {loading ? "Syncing..." : "Sync Engine"}
        </button>
      </div>

      {/* Role-Specific Workspace Banner */}
      {role === "ADMIN" ? (
        <div
          style={{
            padding: "0.875rem 1.25rem",
            marginBottom: "1.25rem",
            borderRadius: "10px",
            background:
              "linear-gradient(135deg, rgba(168, 85, 247, 0.1), rgba(59, 130, 246, 0.05))",
            border: "1px solid rgba(168, 85, 247, 0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "0.75rem",
          }}
        >
          <div
            style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}
          >
            <div
              style={{
                width: "34px",
                height: "34px",
                borderRadius: "8px",
                background: "rgba(168, 85, 247, 0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#c084fc",
              }}
            >
              <User size={18} />
            </div>
            <div>
              <div
                style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}
              >
                <span
                  style={{
                    fontWeight: 700,
                    fontSize: "0.875rem",
                    color: "#fff",
                  }}
                >
                  Merchant Admin Workspace · {user?.name || "MARQ"}
                </span>
                <span
                  className="badge badge-medium"
                  style={{ fontSize: "0.625rem" }}
                >
                  ADMIN
                </span>
              </div>
              <p
                style={{
                  fontSize: "0.75rem",
                  color: "var(--text-secondary)",
                  margin: 0,
                }}
              >
                Executive control active: Full permissions to calibrate ML
                fusion weights, set cost matrix, and manage API credentials.
              </p>
            </div>
          </div>

          <div style={{ display: "flex", gap: "0.5rem" }}>
            <Link
              href="/settings"
              className="btn btn-secondary"
              style={{
                padding: "0.35rem 0.75rem",
                fontSize: "0.75rem",
                borderColor: "rgba(168,85,247,0.4)",
              }}
            >
              <Sliders size={13} /> Tune Risk Rules
            </Link>
          </div>
        </div>
      ) : (
        <div
          style={{
            padding: "0.875rem 1.25rem",
            marginBottom: "1.25rem",
            borderRadius: "10px",
            background:
              "linear-gradient(135deg, rgba(6, 182, 212, 0.1), rgba(16, 185, 129, 0.05))",
            border: "1px solid rgba(6, 182, 212, 0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "0.75rem",
          }}
        >
          <div
            style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}
          >
            <div
              style={{
                width: "34px",
                height: "34px",
                borderRadius: "8px",
                background: "rgba(6, 182, 212, 0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#22d3ee",
              }}
            >
              <ShieldCheck size={18} />
            </div>
            <div>
              <div
                style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}
              >
                <span
                  style={{
                    fontWeight: 700,
                    fontSize: "0.875rem",
                    color: "#fff",
                  }}
                >
                  Fraud Investigator Workspace · {user?.name || "MA RIZWAN"}
                </span>
                <span
                  className="badge badge-low"
                  style={{ fontSize: "0.625rem" }}
                >
                  ANALYST
                </span>
              </div>
              <p
                style={{
                  fontSize: "0.75rem",
                  color: "var(--text-secondary)",
                  margin: 0,
                }}
              >
                Operational investigation mode: Prioritize high-risk review
                queue cases, trace graph rings, and compile dispute dossiers.
              </p>
            </div>
          </div>

          <div style={{ display: "flex", gap: "0.5rem" }}>
            <Link
              href="/reviews"
              className="btn btn-secondary"
              style={{
                padding: "0.35rem 0.75rem",
                fontSize: "0.75rem",
                borderColor: "rgba(6,182,212,0.4)",
              }}
            >
              <Activity size={13} /> Open Review Queue
            </Link>
            <Link
              href="/evidence"
              className="btn btn-secondary"
              style={{
                padding: "0.35rem 0.75rem",
                fontSize: "0.75rem",
                borderColor: "rgba(16,185,129,0.4)",
              }}
            >
              <Target size={13} /> Dispute Rebuttals
            </Link>
          </div>
        </div>
      )}

      {/* Live Event Stream & Webhook Ingest */}
      <LiveStreamBanner />

      {/* Interactive Scoring Demo */}
      <DemoPanel />

      {/* Key Metrics Grid */}
      <div className="metrics-grid">
        <MetricCard
          label="Total Scored"
          value={formatNum(metrics.total_transactions)}
          icon={<CreditCard size={18} />}
        />
        <MetricCard
          label="Fraud Detected"
          value={formatNum(metrics.fraud_detected)}
          icon={<ShieldAlert size={18} />}
          variant="danger"
        />
        <MetricCard
          label="Fraud Prevented"
          value={formatCurr(metrics.fraud_prevented_amount)}
          icon={<ShieldCheck size={18} />}
          variant="success"
        />
        <MetricCard
          label="Fraud Rate"
          value={`${(metrics.current_fraud_rate * 100).toFixed(2)}%`}
          icon={<Target size={18} />}
        />
        <MetricCard
          label="False Positive Rate"
          value={`${(metrics.false_positive_rate * 100).toFixed(2)}%`}
          icon={<AlertTriangle size={18} />}
        />
        <MetricCard
          label="Chargeback Rate"
          value={`${(metrics.chargeback_rate * 100).toFixed(2)}%`}
          icon={<TrendingDown size={18} />}
        />
        <MetricCard
          label="Return Abuse Rate"
          value={`${(metrics.return_abuse_rate * 100).toFixed(2)}%`}
          icon={<RotateCcw size={18} />}
        />
        <MetricCard
          label="Expected Loss"
          value={formatCurr(metrics.expected_loss)}
          icon={<DollarSign size={18} />}
          variant="danger"
        />
      </div>

      {/* Charts Grid */}
      <div className="charts-grid">
        <div className="card full-width">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1.25rem",
            }}
          >
            <div>
              <h3 style={{ fontWeight: 700, fontSize: "1.125rem" }}>
                30-Day Fraud & Volume Trend
              </h3>
              <p
                style={{
                  fontSize: "0.8125rem",
                  color: "var(--text-secondary)",
                }}
              >
                Temporal evaluation of legitimate vs fraudulent transactions
              </p>
            </div>
            <span className="badge badge-low">Live Stream</span>
          </div>
          <FraudTrendChart data={metrics.fraud_trend} />
        </div>

        <div className="card">
          <h3
            style={{
              fontWeight: 700,
              fontSize: "1.0625rem",
              marginBottom: "0.25rem",
            }}
          >
            Risk Level Spectrum (Radar)
          </h3>
          <p
            style={{
              fontSize: "0.8125rem",
              color: "var(--text-secondary)",
              marginBottom: "1rem",
            }}
          >
            Multivariate Radar analysis across LOW, MEDIUM, HIGH, and CRITICAL
            tiers
          </p>
          <RiskDistributionChart data={metrics.risk_levels} />
        </div>

        <div className="card">
          <h3
            style={{
              fontWeight: 700,
              fontSize: "1.0625rem",
              marginBottom: "0.25rem",
            }}
          >
            Automated Decision Routing (Radial Bar)
          </h3>
          <p
            style={{
              fontSize: "0.8125rem",
              color: "var(--text-secondary)",
              marginBottom: "1rem",
            }}
          >
            Concentric Radial Bar routing: ALLOW, REVIEW, or BLOCK
          </p>
          <DecisionDistributionChart data={metrics.decisions} />
        </div>

        <div className="card full-width">
          <div style={{ marginBottom: "1.25rem" }}>
            <h3 style={{ fontWeight: 700, fontSize: "1.125rem" }}>
              High-Risk Geo Density
            </h3>
            <p
              style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}
            >
              Transaction count and fraud density by billing country
            </p>
          </div>
          <FraudByCountryChart data={metrics.fraud_by_country} />
        </div>
      </div>
    </div>
  );
}
