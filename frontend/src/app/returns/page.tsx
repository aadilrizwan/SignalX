"use client";

import { useEffect, useState, useMemo } from "react";
import {
  getReturnMetrics,
  getReturnAbusers,
  getReturnsList,
  scoreReturn,
  executeReturnAction,
  type ReturnAbuseMetrics,
  type ReturnAbuserProfile,
  type ReturnRecord,
  type ReturnScoreResponse,
} from "@/lib/api";
import {
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  DollarSign,
  RefreshCw,
  Sliders,
  Search,
  Zap,
  CheckCircle2,
  XCircle,
  UserX,
  Layers,
  Sparkles,
  Info,
  SlidersHorizontal,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
} from "recharts";

//  Number & Currency Formatters

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

//  Default Fallback Data

const MOCK_METRICS: ReturnAbuseMetrics = {
  total_returns: 4465,
  total_refund_amount: 489320.5,
  avg_days_to_return: 12.4,
  return_abuse_rate: 0.048,
  wardrobing_rate: 0.284,
  wardrobing_volume: 139240.0,
  suspected_abusers_count: 214,
  prevented_abuse_loss: 98450.0,
  policy_decisions: {
    APPROVE_INSTANT: 3036,
    STORE_CREDIT_ONLY: 714,
    MANDATORY_INSPECTION: 491,
    DENY_RETURN: 224,
  },
  return_trend: [
    {
      date: "Jan 05",
      total_returns: 180,
      refund_amount: 19800,
      abuse_returns: 48,
      normal_returns: 132,
    },
    {
      date: "Jan 12",
      total_returns: 210,
      refund_amount: 22400,
      abuse_returns: 58,
      normal_returns: 152,
    },
    {
      date: "Jan 19",
      total_returns: 290,
      refund_amount: 31200,
      abuse_returns: 85,
      normal_returns: 205,
    },
    {
      date: "Jan 26",
      total_returns: 240,
      refund_amount: 26100,
      abuse_returns: 62,
      normal_returns: 178,
    },
    {
      date: "Feb 02",
      total_returns: 310,
      refund_amount: 34500,
      abuse_returns: 94,
      normal_returns: 216,
    },
    {
      date: "Feb 09",
      total_returns: 280,
      refund_amount: 30800,
      abuse_returns: 76,
      normal_returns: 204,
    },
    {
      date: "Feb 16",
      total_returns: 340,
      refund_amount: 38200,
      abuse_returns: 102,
      normal_returns: 238,
    },
  ],
  reasons_breakdown: [
    {
      reason: "changed_mind",
      count: 1120,
      refund_total: 125400,
      avg_days: 2.8,
      share: 0.2508,
      is_suspicious: true,
    },
    {
      reason: "not_as_described",
      count: 980,
      refund_total: 104200,
      avg_days: 3.2,
      share: 0.2195,
      is_suspicious: true,
    },
    {
      reason: "defective_product",
      count: 740,
      refund_total: 78500,
      avg_days: 14.5,
      share: 0.1657,
      is_suspicious: false,
    },
    {
      reason: "too_small",
      count: 590,
      refund_total: 62100,
      avg_days: 11.2,
      share: 0.1321,
      is_suspicious: false,
    },
    {
      reason: "better_price_found",
      count: 480,
      refund_total: 54900,
      avg_days: 2.4,
      share: 0.1075,
      is_suspicious: true,
    },
    {
      reason: "arrived_late",
      count: 320,
      refund_total: 36200,
      avg_days: 16.8,
      share: 0.0717,
      is_suspicious: false,
    },
    {
      reason: "no_longer_needed",
      count: 235,
      refund_total: 28020,
      avg_days: 3.1,
      share: 0.0526,
      is_suspicious: true,
    },
  ],
  days_distribution: [
    {
      bracket: "1-2 days",
      count: 740,
      refund_amount: 98400,
      is_fast_abuse: true,
    },
    {
      bracket: "3-4 days",
      count: 530,
      refund_amount: 62100,
      is_fast_abuse: true,
    },
    {
      bracket: "5-7 days",
      count: 680,
      refund_amount: 71200,
      is_fast_abuse: false,
    },
    {
      bracket: "8-14 days",
      count: 1140,
      refund_amount: 118400,
      is_fast_abuse: false,
    },
    {
      bracket: "15-21 days",
      count: 790,
      refund_amount: 82100,
      is_fast_abuse: false,
    },
    {
      bracket: "22-30 days",
      count: 420,
      refund_amount: 43200,
      is_fast_abuse: false,
    },
    {
      bracket: "30+ days",
      count: 165,
      refund_amount: 13920,
      is_fast_abuse: false,
    },
  ],
};

const MOCK_ABUSERS: ReturnAbuserProfile[] = [
  {
    customer_id: "cust_001634",
    country: "US",
    total_orders: 12,
    total_returns: 9,
    return_rate: 0.75,
    total_refunded: 1480.5,
    lifetime_value: 1620.0,
    avg_days_to_return: 2.1,
    fast_returns_count: 7,
    top_reason: "changed_mind",
    abuse_score: 0.885,
    risk_tier: "CRITICAL",
    recommended_policy: "DENY_RETURN",
    abuse_tags: [
      "Wardrober (Fast Turnaround)",
      "Serial Returner (>50% Rate)",
      "High Refund Drain",
    ],
  },
  {
    customer_id: "cust_002032",
    country: "GB",
    total_orders: 14,
    total_returns: 8,
    return_rate: 0.5714,
    total_refunded: 920.0,
    lifetime_value: 1250.0,
    avg_days_to_return: 2.8,
    fast_returns_count: 5,
    top_reason: "not_as_described",
    abuse_score: 0.792,
    risk_tier: "CRITICAL",
    recommended_policy: "DENY_RETURN",
    abuse_tags: ["Wardrober (Fast Turnaround)", "Serial Returner (>50% Rate)"],
  },
  {
    customer_id: "cust_006297",
    country: "US",
    total_orders: 6,
    total_returns: 4,
    return_rate: 0.6667,
    total_refunded: 1840.0,
    lifetime_value: 2100.0,
    avg_days_to_return: 3.0,
    fast_returns_count: 3,
    top_reason: "changed_mind",
    abuse_score: 0.745,
    risk_tier: "HIGH",
    recommended_policy: "REQUIRE_STORE_CREDIT",
    abuse_tags: ["Price Arbitrage", "Serial Returner (>50% Rate)"],
  },
  {
    customer_id: "cust_004824",
    country: "CA",
    total_orders: 9,
    total_returns: 5,
    return_rate: 0.5556,
    total_refunded: 640.2,
    lifetime_value: 950.0,
    avg_days_to_return: 4.2,
    fast_returns_count: 2,
    top_reason: "better_price_found",
    abuse_score: 0.638,
    risk_tier: "HIGH",
    recommended_policy: "REQUIRE_STORE_CREDIT",
    abuse_tags: ["Price Arbitrage", "Serial Returner (>50% Rate)"],
  },
  {
    customer_id: "cust_003724",
    country: "DE",
    total_orders: 8,
    total_returns: 3,
    return_rate: 0.375,
    total_refunded: 410.0,
    lifetime_value: 890.0,
    avg_days_to_return: 5.5,
    fast_returns_count: 1,
    top_reason: "too_small",
    abuse_score: 0.445,
    risk_tier: "MEDIUM",
    recommended_policy: "MANDATORY_INSPECTION",
    abuse_tags: ["Elevated Return Velocity"],
  },
];

const SIMULATOR_PRESETS = [
  {
    name: "👗 Serial Wardrober",
    desc: "Fast 1-day return, high value apparel, 75% past return rate",
    data: {
      customer_id: "cust_wardrober_99",
      refund_amount: 450.0,
      days_after_purchase: 1,
      reason: "changed_mind",
      customer_return_rate: 0.75,
      customer_total_orders: 8,
      category: "luxury_apparel",
    },
  },
  {
    name: "🛍️ Legitimate Loyal Buyer",
    desc: "Normal 16-day window, product defect, 5% return rate",
    data: {
      customer_id: "cust_loyal_102",
      refund_amount: 85.0,
      days_after_purchase: 16,
      reason: "defective_product",
      customer_return_rate: 0.05,
      customer_total_orders: 22,
      category: "electronics",
    },
  },
  {
    name: "📉 Price Arbitrage Abuser",
    desc: "Returned 2 days after purchase citing 'better_price_found'",
    data: {
      customer_id: "cust_arbitrage_44",
      refund_amount: 320.0,
      days_after_purchase: 2,
      reason: "better_price_found",
      customer_return_rate: 0.6,
      customer_total_orders: 5,
      category: "smartphones",
    },
  },
  {
    name: "📦 Size Bracketing Shopper",
    desc: "Bought 3 sizes of same item, returning 2 in 6 days",
    data: {
      customer_id: "cust_bracket_81",
      refund_amount: 140.0,
      days_after_purchase: 6,
      reason: "too_small",
      customer_return_rate: 0.4,
      customer_total_orders: 10,
      category: "footwear",
    },
  },
];

export default function ReturnsPage() {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "overview" | "simulator" | "abusers" | "investigations" | "guardrails"
  >("overview");
  const [metrics, setMetrics] = useState<ReturnAbuseMetrics>(MOCK_METRICS);
  const [abusers, setAbusers] = useState<ReturnAbuserProfile[]>(MOCK_ABUSERS);
  const [returnsList, setReturnsList] = useState<ReturnRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [isLiveApi, setIsLiveApi] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Table Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [riskFilter, setRiskFilter] = useState("ALL");
  const [reasonFilter, setReasonFilter] = useState("ALL");
  const [fastOnly, setFastOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedReturn, setSelectedReturn] = useState<ReturnRecord | null>(
    null,
  );

  // Simulator Form State
  const [simForm, setSimForm] = useState({
    customer_id: "cust_001634",
    refund_amount: 350.0,
    days_after_purchase: 1,
    reason: "changed_mind",
    customer_return_rate: 0.7,
    customer_total_orders: 8,
    category: "designer_apparel",
  });
  const [simResult, setSimResult] = useState<ReturnScoreResponse | null>(null);
  const [simLoading, setSimLoading] = useState(false);

  // Guardrail Policy Rules State
  const [policyRules, setPolicyRules] = useState({
    wardrobingThresholdDays: 3,
    highReturnRateThreshold: 45,
    autoStoreCreditForAbusers: true,
    requireInspectionOverAmount: 250,
    restockingFeePercent: 15,
    autoDenyCriticalWardrobers: true,
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchAllData = () => {
    setLoading(true);
    Promise.all([
      getReturnMetrics().catch(() => MOCK_METRICS),
      getReturnAbusers(20).catch(() => MOCK_ABUSERS),
      getReturnsList(
        page,
        25,
        riskFilter,
        reasonFilter,
        searchTerm,
        fastOnly,
      ).catch(() => ({
        returns: [],
        total: 0,
        page: 1,
        page_size: 25,
        total_pages: 1,
      })),
    ])
      .then(([metricsData, abusersData, returnsData]) => {
        setMetrics(metricsData);
        setAbusers(abusersData);
        setReturnsList(returnsData.returns);
        setTotalPages(returnsData.total_pages || 1);
        setIsLiveApi(true);
      })
      .catch(() => {
        setIsLiveApi(false);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    setMounted(true);
    fetchAllData();
  }, [page, riskFilter, reasonFilter, fastOnly]);

  const handleSimulate = async () => {
    setSimLoading(true);
    try {
      const res = await scoreReturn(simForm);
      setSimResult(res);
    } catch {
      // Fallback calculation for UI
      const isFast = simForm.days_after_purchase <= 2;
      const isSerial = simForm.customer_return_rate >= 0.5;
      const score = Math.min(
        0.98,
        (isFast ? 0.35 : 0.05) + (isSerial ? 0.4 : 0.1) + 0.15,
      );
      const tier =
        score >= 0.75
          ? "CRITICAL"
          : score >= 0.5
            ? "HIGH"
            : score >= 0.3
              ? "MEDIUM"
              : "LOW";
      setSimResult({
        customer_id: simForm.customer_id,
        refund_amount: simForm.refund_amount,
        days_after_purchase: simForm.days_after_purchase,
        reason: simForm.reason,
        abuse_risk_score: score,
        risk_tier: tier,
        decision:
          tier === "CRITICAL"
            ? "DENY_RETURN"
            : tier === "HIGH"
              ? "STORE_CREDIT_ONLY"
              : "APPROVE_INSTANT",
        policy_rationale:
          "Fast turnaround and high return frequency detected in simulation.",
        risk_factors: [
          {
            factor: "Turnaround Window",
            weight: isFast ? 0.35 : 0.05,
            description: `${simForm.days_after_purchase} days turnaround`,
          },
          {
            factor: "Customer Return Velocity",
            weight: isSerial ? 0.4 : 0.1,
            description: `${(simForm.customer_return_rate * 100).toFixed(0)}% return rate`,
          },
          {
            factor: "Reason Affinity",
            weight: 0.15,
            description: `Stated reason: ${simForm.reason}`,
          },
        ],
        evaluated_at: new Date().toISOString(),
        protection_savings_estimated:
          tier === "CRITICAL" || tier === "HIGH" ? simForm.refund_amount : 0,
      });
    } finally {
      setSimLoading(false);
    }
  };

  useEffect(() => {
    handleSimulate();
  }, []);

  const handleAction = async (returnId: string, action: string) => {
    try {
      await executeReturnAction(returnId, action);
      showToast(
        `✓ Action '${action}' successfully applied to Return ${returnId}`,
      );
      setReturnsList((prev) =>
        prev.map((r) =>
          r.id === returnId
            ? { ...r, status: "ACTIONED", executed_action: action }
            : r,
        ),
      );
      if (selectedReturn && selectedReturn.id === returnId) {
        setSelectedReturn({
          ...selectedReturn,
          status: "ACTIONED",
          executed_action: action,
        });
      }
    } catch {
      showToast(`✓ Action '${action}' recorded (Local demo mode)`);
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case "CRITICAL":
        return {
          badge: "badge-critical",
          text: "text-red-400",
          bg: "rgba(220,38,38,0.15)",
          border: "rgba(220,38,38,0.3)",
        };
      case "HIGH":
        return {
          badge: "badge-high",
          text: "text-orange-400",
          bg: "rgba(239,68,68,0.1)",
          border: "rgba(239,68,68,0.3)",
        };
      case "MEDIUM":
        return {
          badge: "badge-medium",
          text: "text-amber-400",
          bg: "rgba(245,158,11,0.1)",
          border: "rgba(245,158,11,0.3)",
        };
      default:
        return {
          badge: "badge-low",
          text: "text-emerald-400",
          bg: "rgba(16,185,129,0.1)",
          border: "rgba(16,185,129,0.3)",
        };
    }
  };

  const pieDecisionsData = useMemo(() => {
    return Object.entries(metrics.policy_decisions || {}).map(([key, val]) => ({
      name: key.replace(/_/g, " "),
      value: val,
    }));
  }, [metrics]);

  const PIE_COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444"];

  return (
    <div
      style={{ maxWidth: "1340px", margin: "0 auto", paddingBottom: "3rem" }}
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: "fixed",
            bottom: "2rem",
            right: "2rem",
            zIndex: 9999,
            backgroundColor: "#1e293b",
            color: "#f8fafc",
            border: "1px solid var(--accent-blue)",
            borderRadius: "8px",
            padding: "0.875rem 1.25rem",
            boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            animation: "fadeIn 0.2s ease-out",
          }}
        >
          <Sparkles size={16} className="text-blue-400" />
          <span style={{ fontSize: "0.875rem", fontWeight: 600 }}>
            {toastMessage}
          </span>
        </div>
      )}

      {/* Header */}
      <div className="page-header" style={{ marginBottom: "1.5rem" }}>
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              marginBottom: "0.35rem",
            }}
          >
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background:
                  "linear-gradient(135deg, rgba(239,68,68,0.2), rgba(245,158,11,0.2))",
                border: "1px solid rgba(239,68,68,0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <RotateCcw size={20} className="text-red-400" />
            </div>
            <h1>Return Abuse & Wardrobing Defense</h1>
            <span className="badge badge-low" style={{ fontSize: "0.75rem" }}>
              <span
                className="status-dot"
                style={{ display: "inline-block" }}
              />
              {isLiveApi
                ? "Return Guard Engine Active"
                : "Synthetic Risk Stream"}
            </span>
          </div>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
            Detect serial returners, rapid wardrobing cycles, price arbitrage
            abuse, and automate friction-based return policies.
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button
            className="btn btn-secondary"
            onClick={fetchAllData}
            disabled={loading}
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />{" "}
            {loading ? "Syncing..." : "Sync Engine"}
          </button>
          <button
            className="btn btn-primary"
            onClick={() => setActiveTab("simulator")}
          >
            <Zap size={15} /> Simulate Return Risk
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          marginBottom: "1.75rem",
          borderBottom: "1px solid var(--border-subtle)",
          paddingBottom: "0.5rem",
          overflowX: "auto",
        }}
      >
        {[
          {
            id: "overview",
            label: "Overview & Analytics",
            icon: <Layers size={16} />,
          },
          {
            id: "simulator",
            label: "Live Return Risk Simulator",
            icon: <Zap size={16} />,
          },
          {
            id: "abusers",
            label: "Suspected Abusers Leaderboard",
            icon: <UserX size={16} />,
          },
          {
            id: "investigations",
            label: "Return Investigations Log",
            icon: <Search size={16} />,
          },
          {
            id: "guardrails",
            label: "Policy Guardrails & Auto-Rules",
            icon: <SlidersHorizontal size={16} />,
          },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.625rem 1rem",
              borderRadius: "8px",
              fontSize: "0.875rem",
              fontWeight: activeTab === tab.id ? 600 : 500,
              color: activeTab === tab.id ? "#ffffff" : "var(--text-secondary)",
              backgroundColor:
                activeTab === tab.id
                  ? "rgba(59, 130, 246, 0.15)"
                  : "transparent",
              border:
                activeTab === tab.id
                  ? "1px solid rgba(59, 130, 246, 0.3)"
                  : "1px solid transparent",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* KPI Cards Grid */}
      <div className="metrics-grid" style={{ marginBottom: "1.75rem" }}>
        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-label">Total Returns Processed</span>
            <RotateCcw size={18} className="text-blue-400" />
          </div>
          <div className="metric-value">{formatNum(metrics.total_returns)}</div>
          <div className="metric-subtext">8.9% of merchant volume</div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-label">Total Refund Exposure</span>
            <DollarSign size={18} className="text-amber-400" />
          </div>
          <div className="metric-value">
            {formatCurr(metrics.total_refund_amount, 0)}
          </div>
          <div className="metric-subtext">
            Avg {formatNum(metrics.avg_days_to_return, 1)} days turnaround
          </div>
        </div>

        <div className="metric-card danger">
          <div className="metric-header">
            <span className="metric-label">Wardrobing & Fast Returns</span>
            <Zap size={18} className="text-red-400" />
          </div>
          <div className="metric-value">
            {(metrics.wardrobing_rate * 100).toFixed(1)}%
          </div>
          <div className="metric-subtext">
            {formatCurr(metrics.wardrobing_volume, 0)} in ≤3 day returns
          </div>
        </div>

        <div className="metric-card danger">
          <div className="metric-header">
            <span className="metric-label">Serial Abuser Accounts</span>
            <UserX size={18} className="text-red-400" />
          </div>
          <div className="metric-value">
            {formatNum(metrics.suspected_abusers_count)}
          </div>
          <div className="metric-subtext">
            {(metrics.return_abuse_rate * 100).toFixed(2)}% customer population
          </div>
        </div>

        <div className="metric-card success">
          <div className="metric-header">
            <span className="metric-label">Abuse Loss Prevented</span>
            <ShieldCheck size={18} className="text-emerald-400" />
          </div>
          <div className="metric-value">
            {formatCurr(metrics.prevented_abuse_loss, 0)}
          </div>
          <div className="metric-subtext">
            Via store credit & restocking fee
          </div>
        </div>
      </div>

      {/*  TAB 1: OVERVIEW & ANALYTICS ── */}
      {activeTab === "overview" && (
        <div
          style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}
        >
          {/* Main Visuals Grid */}
          <div className="rg-2-wide">
            {/* Trend Chart */}
            <div className="card" style={{ padding: "1.5rem" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "1.25rem",
                }}
              >
                <div>
                  <h3
                    style={{
                      fontWeight: 700,
                      fontSize: "1.0625rem",
                      color: "var(--text-primary)",
                    }}
                  >
                    Return Volume & Wardrobing Velocity
                  </h3>
                  <p
                    style={{
                      fontSize: "0.8125rem",
                      color: "var(--text-secondary)",
                    }}
                  >
                    Legitimate standard returns vs flagged fast-return
                    wardrobing abuse
                  </p>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "1rem",
                    fontSize: "0.75rem",
                  }}
                >
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.35rem",
                    }}
                  >
                    <span
                      style={{
                        width: "10px",
                        height: "10px",
                        borderRadius: "50%",
                        backgroundColor: "#3b82f6",
                      }}
                    />
                    Normal Returns
                  </span>
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.35rem",
                    }}
                  >
                    <span
                      style={{
                        width: "10px",
                        height: "10px",
                        borderRadius: "50%",
                        backgroundColor: "#ef4444",
                      }}
                    />
                    Wardrobing Abuse (≤3d)
                  </span>
                </div>
              </div>
              <div style={{ width: "100%", height: "280px" }}>
                {mounted && (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={metrics.return_trend}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient
                          id="normGrad"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="#3b82f6"
                            stopOpacity={0.4}
                          />
                          <stop
                            offset="95%"
                            stopColor="#3b82f6"
                            stopOpacity={0.0}
                          />
                        </linearGradient>
                        <linearGradient
                          id="abuseGrad"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="#ef4444"
                            stopOpacity={0.4}
                          />
                          <stop
                            offset="95%"
                            stopColor="#ef4444"
                            stopOpacity={0.0}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="rgba(255,255,255,0.06)"
                      />
                      <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
                      <YAxis stroke="#64748b" fontSize={12} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#0f172a",
                          border: "1px solid #334155",
                          borderRadius: "8px",
                        }}
                        formatter={(val: any) => [
                          formatNum(Number(val)),
                          "Returns",
                        ]}
                      />
                      <Area
                        type="monotone"
                        dataKey="normal_returns"
                        stroke="#3b82f6"
                        fillOpacity={1}
                        fill="url(#normGrad)"
                        strokeWidth={2}
                      />
                      <Area
                        type="monotone"
                        dataKey="abuse_returns"
                        stroke="#ef4444"
                        fillOpacity={1}
                        fill="url(#abuseGrad)"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Policy Enforcement Donut */}
            <div className="card" style={{ padding: "1.5rem" }}>
              <h3
                style={{
                  fontWeight: 700,
                  fontSize: "1.0625rem",
                  color: "var(--text-primary)",
                  marginBottom: "0.25rem",
                }}
              >
                Automated Policy Actions
              </h3>
              <p
                style={{
                  fontSize: "0.8125rem",
                  color: "var(--text-secondary)",
                  marginBottom: "1rem",
                }}
              >
                Friction routing distribution for return requests
              </p>
              <div style={{ width: "100%", height: "200px" }}>
                {mounted && (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieDecisionsData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={80}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {pieDecisionsData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={PIE_COLORS[index % PIE_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#0f172a",
                          border: "1px solid #334155",
                          borderRadius: "8px",
                        }}
                        formatter={(val: any) => [
                          formatNum(Number(val)),
                          "Cases",
                        ]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
              <div
                className="rg-2-sm"
                style={{ marginTop: "0.5rem", fontSize: "0.75rem" }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.35rem",
                  }}
                >
                  <span
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      backgroundColor: "#10b981",
                    }}
                  />
                  <span>
                    Instant Approve (
                    {formatNum(metrics.policy_decisions?.APPROVE_INSTANT || 0)})
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.35rem",
                  }}
                >
                  <span
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      backgroundColor: "#3b82f6",
                    }}
                  />
                  <span>
                    Store Credit (
                    {formatNum(
                      metrics.policy_decisions?.STORE_CREDIT_ONLY || 0,
                    )}
                    )
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.35rem",
                  }}
                >
                  <span
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      backgroundColor: "#f59e0b",
                    }}
                  />
                  <span>
                    Inspection (
                    {formatNum(
                      metrics.policy_decisions?.MANDATORY_INSPECTION || 0,
                    )}
                    )
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.35rem",
                  }}
                >
                  <span
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      backgroundColor: "#ef4444",
                    }}
                  />
                  <span>
                    Deny Return (
                    {formatNum(metrics.policy_decisions?.DENY_RETURN || 0)})
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Secondary Charts: Turnaround Window & Stated Reasons */}
          <div className="rg-2">
            {/* Days to Return Histogram */}
            <div className="card" style={{ padding: "1.5rem" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "1rem",
                }}
              >
                <div>
                  <h3
                    style={{
                      fontWeight: 700,
                      fontSize: "1.0625rem",
                      color: "var(--text-primary)",
                    }}
                  >
                    Days to Return Turnaround Distribution
                  </h3>
                  <p
                    style={{
                      fontSize: "0.8125rem",
                      color: "var(--text-secondary)",
                    }}
                  >
                    Wardrobing spikes concentrated in 1-4 day windows
                  </p>
                </div>
                <span
                  className="badge badge-critical"
                  style={{ fontSize: "0.75rem" }}
                >
                  ≤3 Days = High Wardrobe Risk
                </span>
              </div>
              <div style={{ width: "100%", height: "240px" }}>
                {mounted && (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={metrics.days_distribution}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="rgba(255,255,255,0.06)"
                      />
                      <XAxis dataKey="bracket" stroke="#64748b" fontSize={11} />
                      <YAxis stroke="#64748b" fontSize={11} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#0f172a",
                          border: "1px solid #334155",
                          borderRadius: "8px",
                        }}
                        formatter={(val: any, name: any, item: any) => [
                          `${formatNum(val)} returns (${formatCurr(item.payload.refund_amount, 0)})`,
                          "Volume",
                        ]}
                      />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                        {metrics.days_distribution.map((entry, idx) => (
                          <Cell
                            key={`bar-${idx}`}
                            fill={entry.is_fast_abuse ? "#ef4444" : "#3b82f6"}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Stated Reasons Breakdown */}
            <div className="card" style={{ padding: "1.5rem" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "1rem",
                }}
              >
                <div>
                  <h3
                    style={{
                      fontWeight: 700,
                      fontSize: "1.0625rem",
                      color: "var(--text-primary)",
                    }}
                  >
                    Return Reasons & Abuse Correlation
                  </h3>
                  <p
                    style={{
                      fontSize: "0.8125rem",
                      color: "var(--text-secondary)",
                    }}
                  >
                    Discretionary reasons vs genuine defects & sizing
                  </p>
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.75rem",
                  maxHeight: "240px",
                  overflowY: "auto",
                }}
              >
                {metrics.reasons_breakdown.map((r, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: "0.625rem 0.875rem",
                      borderRadius: "6px",
                      backgroundColor: r.is_suspicious
                        ? "rgba(239, 68, 68, 0.08)"
                        : "rgba(255, 255, 255, 0.03)",
                      border: r.is_suspicious
                        ? "1px solid rgba(239, 68, 68, 0.2)"
                        : "1px solid rgba(255, 255, 255, 0.06)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                        }}
                      >
                        <span
                          style={{
                            fontWeight: 600,
                            fontSize: "0.875rem",
                            textTransform: "capitalize",
                            color: "var(--text-primary)",
                          }}
                        >
                          {r.reason.replace(/_/g, " ")}
                        </span>
                        {r.is_suspicious && (
                          <span
                            className="badge badge-high"
                            style={{
                              fontSize: "0.65rem",
                              padding: "0.1rem 0.4rem",
                            }}
                          >
                            Abuse Correlated
                          </span>
                        )}
                      </div>
                      <div
                        style={{
                          fontSize: "0.75rem",
                          color: "var(--text-secondary)",
                          marginTop: "0.15rem",
                        }}
                      >
                        Avg Turnaround:{" "}
                        <strong>{formatNum(r.avg_days, 1)} days</strong> ·
                        Total: {formatCurr(r.refund_total, 0)}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <span style={{ fontWeight: 700, fontSize: "0.9375rem" }}>
                        {formatNum(r.count)}
                      </span>
                      <div
                        style={{
                          fontSize: "0.75rem",
                          color: "var(--text-tertiary)",
                        }}
                      >
                        {(r.share * 100).toFixed(1)}% share
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Action Strip */}
          <div
            style={{
              padding: "1.25rem 1.5rem",
              borderRadius: "12px",
              background:
                "linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(239, 68, 68, 0.1))",
              border: "1px solid rgba(59, 130, 246, 0.25)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "1rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <div
                style={{
                  width: "42px",
                  height: "42px",
                  borderRadius: "10px",
                  backgroundColor: "rgba(59,130,246,0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Sparkles size={20} className="text-blue-400" />
              </div>
              <div>
                <h4
                  style={{
                    fontWeight: 700,
                    fontSize: "0.9375rem",
                    color: "#ffffff",
                  }}
                >
                  Automated Return Policy Rules Active
                </h4>
                <p
                  style={{
                    fontSize: "0.8125rem",
                    color: "var(--text-secondary)",
                  }}
                >
                  Currently routing high-risk wardrobers to mandatory inspection
                  & store credit defaults.
                </p>
              </div>
            </div>
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button
                className="btn btn-secondary"
                onClick={() => setActiveTab("guardrails")}
              >
                <Sliders size={15} /> Configure Guardrails
              </button>
              <button
                className="btn btn-primary"
                onClick={() => setActiveTab("investigations")}
              >
                <Search size={15} /> Inspect Suspicious Returns
              </button>
            </div>
          </div>
        </div>
      )}

      {/*  TAB 2: LIVE RETURN RISK SIMULATOR ── */}
      {activeTab === "simulator" && (
        <div className="rg-2">
          {/* Simulation Inputs */}
          <div className="card" style={{ padding: "1.5rem" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1.25rem",
              }}
            >
              <div>
                <h3
                  style={{
                    fontWeight: 700,
                    fontSize: "1.125rem",
                    color: "var(--text-primary)",
                  }}
                >
                  Return Abuse Simulator
                </h3>
                <p
                  style={{
                    fontSize: "0.8125rem",
                    color: "var(--text-secondary)",
                  }}
                >
                  Evaluate return abuse risk and automated policy decisions in
                  real-time
                </p>
              </div>
              <span className="badge badge-low" style={{ fontSize: "0.75rem" }}>
                Real-time ML Scorer
              </span>
            </div>

            {/* Presets */}
            <div style={{ marginBottom: "1.5rem" }}>
              <label
                style={{
                  fontSize: "0.8125rem",
                  fontWeight: 600,
                  color: "var(--text-secondary)",
                  marginBottom: "0.5rem",
                  display: "block",
                }}
              >
                Quick Test Personas:
              </label>
              <div className="rg-2-sm">
                {SIMULATOR_PRESETS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setSimForm(preset.data);
                      setTimeout(handleSimulate, 50);
                    }}
                    style={{
                      textAlign: "left",
                      padding: "0.625rem 0.75rem",
                      borderRadius: "6px",
                      backgroundColor: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      cursor: "pointer",
                      transition: "all 0.15s",
                    }}
                    className="hover:border-blue-500 hover:bg-slate-800"
                  >
                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: "0.8125rem",
                        color: "var(--text-primary)",
                      }}
                    >
                      {preset.name}
                    </div>
                    <div
                      style={{
                        fontSize: "0.7rem",
                        color: "var(--text-tertiary)",
                        marginTop: "0.15rem",
                      }}
                    >
                      {preset.desc}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Form Fields */}
            <div
              style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
            >
              <div className="rg-2" style={{ gap: "1rem" }}>
                <div>
                  <label
                    style={{
                      fontSize: "0.8125rem",
                      fontWeight: 600,
                      color: "var(--text-secondary)",
                      marginBottom: "0.35rem",
                      display: "block",
                    }}
                  >
                    Customer ID
                  </label>
                  <input
                    type="text"
                    value={simForm.customer_id}
                    onChange={(e) =>
                      setSimForm({ ...simForm, customer_id: e.target.value })
                    }
                    style={{
                      width: "100%",
                      padding: "0.625rem",
                      borderRadius: "6px",
                      backgroundColor: "rgba(15,23,42,0.8)",
                      border: "1px solid #334155",
                      color: "#fff",
                      fontSize: "0.875rem",
                    }}
                  />
                </div>
                <div>
                  <label
                    style={{
                      fontSize: "0.8125rem",
                      fontWeight: 600,
                      color: "var(--text-secondary)",
                      marginBottom: "0.35rem",
                      display: "block",
                    }}
                  >
                    Refund Amount ($)
                  </label>
                  <input
                    type="number"
                    value={simForm.refund_amount}
                    onChange={(e) =>
                      setSimForm({
                        ...simForm,
                        refund_amount: parseFloat(e.target.value) || 0,
                      })
                    }
                    style={{
                      width: "100%",
                      padding: "0.625rem",
                      borderRadius: "6px",
                      backgroundColor: "rgba(15,23,42,0.8)",
                      border: "1px solid #334155",
                      color: "#fff",
                      fontSize: "0.875rem",
                    }}
                  />
                </div>
              </div>

              <div className="rg-2" style={{ gap: "1rem" }}>
                <div>
                  <label
                    style={{
                      fontSize: "0.8125rem",
                      fontWeight: 600,
                      color: "var(--text-secondary)",
                      marginBottom: "0.35rem",
                      display: "block",
                    }}
                  >
                    Days Since Delivery ({simForm.days_after_purchase}{" "}
                    {simForm.days_after_purchase === 1 ? "day" : "days"})
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="30"
                    value={simForm.days_after_purchase}
                    onChange={(e) =>
                      setSimForm({
                        ...simForm,
                        days_after_purchase: parseInt(e.target.value),
                      })
                    }
                    style={{
                      width: "100%",
                      accentColor:
                        simForm.days_after_purchase <= 3
                          ? "#ef4444"
                          : "#3b82f6",
                    }}
                  />
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "0.7rem",
                      color: "var(--text-tertiary)",
                    }}
                  >
                    <span className="text-red-400">1 day (Wardrobing)</span>
                    <span>15 days</span>
                    <span>30 days</span>
                  </div>
                </div>

                <div>
                  <label
                    style={{
                      fontSize: "0.8125rem",
                      fontWeight: 600,
                      color: "var(--text-secondary)",
                      marginBottom: "0.35rem",
                      display: "block",
                    }}
                  >
                    Customer Return Rate (
                    {(simForm.customer_return_rate * 100).toFixed(0)}%)
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={Math.round(simForm.customer_return_rate * 100)}
                    onChange={(e) =>
                      setSimForm({
                        ...simForm,
                        customer_return_rate: parseInt(e.target.value) / 100,
                      })
                    }
                    style={{
                      width: "100%",
                      accentColor:
                        simForm.customer_return_rate >= 0.5
                          ? "#ef4444"
                          : "#10b981",
                    }}
                  />
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "0.7rem",
                      color: "var(--text-tertiary)",
                    }}
                  >
                    <span className="text-emerald-400">0% (Clean)</span>
                    <span>50%</span>
                    <span className="text-red-400">100% (Abuser)</span>
                  </div>
                </div>
              </div>

              <div className="rg-2" style={{ gap: "1rem" }}>
                <div>
                  <label
                    style={{
                      fontSize: "0.8125rem",
                      fontWeight: 600,
                      color: "var(--text-secondary)",
                      marginBottom: "0.35rem",
                      display: "block",
                    }}
                  >
                    Stated Return Reason
                  </label>
                  <select
                    value={simForm.reason}
                    onChange={(e) =>
                      setSimForm({ ...simForm, reason: e.target.value })
                    }
                    style={{
                      width: "100%",
                      padding: "0.625rem",
                      borderRadius: "6px",
                      backgroundColor: "rgba(15,23,42,0.8)",
                      border: "1px solid #334155",
                      color: "#fff",
                      fontSize: "0.875rem",
                    }}
                  >
                    <option value="changed_mind">
                      Changed Mind (High Risk)
                    </option>
                    <option value="better_price_found">
                      Better Price Found (Arbitrage)
                    </option>
                    <option value="no_longer_needed">
                      No Longer Needed (Convenience)
                    </option>
                    <option value="too_small">
                      Too Small (Size Bracketing)
                    </option>
                    <option value="too_large">
                      Too Large (Size Bracketing)
                    </option>
                    <option value="defective_product">
                      Defective Product (Legitimate)
                    </option>
                    <option value="wrong_item">Wrong Item Delivered</option>
                  </select>
                </div>

                <div>
                  <label
                    style={{
                      fontSize: "0.8125rem",
                      fontWeight: 600,
                      color: "var(--text-secondary)",
                      marginBottom: "0.35rem",
                      display: "block",
                    }}
                  >
                    Product Category
                  </label>
                  <select
                    value={simForm.category}
                    onChange={(e) =>
                      setSimForm({ ...simForm, category: e.target.value })
                    }
                    style={{
                      width: "100%",
                      padding: "0.625rem",
                      borderRadius: "6px",
                      backgroundColor: "rgba(15,23,42,0.8)",
                      border: "1px solid #334155",
                      color: "#fff",
                      fontSize: "0.875rem",
                    }}
                  >
                    <option value="luxury_apparel">
                      Luxury / Evening Apparel
                    </option>
                    <option value="footwear">Footwear & Sneakers</option>
                    <option value="electronics">Consumer Electronics</option>
                    <option value="smartphones">Smartphones & Tablets</option>
                    <option value="home_goods">Home Goods & Furniture</option>
                  </select>
                </div>
              </div>

              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSimulate}
                disabled={simLoading}
                style={{ marginTop: "0.5rem" }}
              >
                <Zap size={16} />{" "}
                {simLoading ? "Evaluating Risk..." : "Score Return Request"}
              </button>
            </div>
          </div>

          {/* Simulation Output Card */}
          <div className="card" style={{ padding: "1.5rem" }}>
            <h3
              style={{
                fontWeight: 700,
                fontSize: "1.125rem",
                color: "var(--text-primary)",
                marginBottom: "0.25rem",
              }}
            >
              Risk Assessment & Policy Decision
            </h3>
            <p
              style={{
                fontSize: "0.8125rem",
                color: "var(--text-secondary)",
                marginBottom: "1.25rem",
              }}
            >
              Real-time multi-factor abuse evaluation output
            </p>

            {simResult ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "1.25rem",
                }}
              >
                {/* Score & Tier Banner */}
                <div
                  style={{
                    padding: "1.25rem",
                    borderRadius: "10px",
                    backgroundColor: getTierColor(simResult.risk_tier).bg,
                    border: `1px solid ${getTierColor(simResult.risk_tier).border}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: "0.8125rem",
                        color: "var(--text-secondary)",
                      }}
                    >
                      Return Abuse Risk Score
                    </div>
                    <div
                      style={{
                        fontSize: "2.25rem",
                        fontWeight: 800,
                        fontFamily: "var(--font-mono)",
                        color: "#fff",
                      }}
                    >
                      {(simResult.abuse_risk_score * 100).toFixed(1)}
                      <span
                        style={{
                          fontSize: "1rem",
                          color: "var(--text-tertiary)",
                        }}
                      >
                        {" "}
                        / 100
                      </span>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span
                      className={`badge ${getTierColor(simResult.risk_tier).badge}`}
                      style={{
                        fontSize: "0.875rem",
                        padding: "0.35rem 0.75rem",
                      }}
                    >
                      {simResult.risk_tier} RISK
                    </span>
                    <div
                      style={{
                        fontSize: "0.8125rem",
                        fontWeight: 700,
                        marginTop: "0.5rem",
                        color: "#fff",
                      }}
                    >
                      DECISION: {simResult.decision.replace(/_/g, " ")}
                    </div>
                  </div>
                </div>

                {/* Policy Recommendation */}
                <div
                  style={{
                    padding: "1rem",
                    borderRadius: "8px",
                    backgroundColor: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      marginBottom: "0.35rem",
                    }}
                  >
                    <ShieldAlert size={16} className="text-amber-400" />
                    <span
                      style={{
                        fontWeight: 700,
                        fontSize: "0.875rem",
                        color: "var(--text-primary)",
                      }}
                    >
                      Recommended Policy Action:
                    </span>
                  </div>
                  <p
                    style={{
                      fontSize: "0.8125rem",
                      color: "var(--text-secondary)",
                      lineHeight: 1.4,
                    }}
                  >
                    {simResult.policy_rationale}
                  </p>
                  {simResult.protection_savings_estimated > 0 && (
                    <div
                      style={{
                        marginTop: "0.75rem",
                        fontSize: "0.8125rem",
                        color: "var(--accent-emerald)",
                        fontWeight: 600,
                      }}
                    >
                      ✓ Estimated merchant savings:{" "}
                      {formatCurr(simResult.protection_savings_estimated, 2)}
                    </div>
                  )}
                </div>

                {/* Risk Factors Breakdown */}
                <div>
                  <h4
                    style={{
                      fontSize: "0.875rem",
                      fontWeight: 700,
                      marginBottom: "0.75rem",
                      color: "var(--text-primary)",
                    }}
                  >
                    Explainable Risk Factor Contributions:
                  </h4>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.5rem",
                    }}
                  >
                    {simResult.risk_factors.map((factor, idx) => (
                      <div
                        key={idx}
                        style={{
                          padding: "0.625rem 0.75rem",
                          borderRadius: "6px",
                          backgroundColor: "rgba(15,23,42,0.6)",
                          border: "1px solid #1e293b",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <div>
                          <div
                            style={{
                              fontSize: "0.8125rem",
                              fontWeight: 600,
                              color: "var(--text-primary)",
                            }}
                          >
                            {factor.factor}
                          </div>
                          <div
                            style={{
                              fontSize: "0.75rem",
                              color: "var(--text-tertiary)",
                            }}
                          >
                            {factor.description}
                          </div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <span
                            style={{
                              fontFamily: "var(--font-mono)",
                              fontWeight: 700,
                              fontSize: "0.875rem",
                              color:
                                factor.weight >= 0.25
                                  ? "#ef4444"
                                  : factor.weight >= 0.1
                                    ? "#f59e0b"
                                    : "#10b981",
                            }}
                          >
                            +{(factor.weight * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div
                style={{
                  textAlign: "center",
                  padding: "3rem 1rem",
                  color: "var(--text-tertiary)",
                }}
              >
                Run simulation to view assessment.
              </div>
            )}
          </div>
        </div>
      )}

      {/*  TAB 3: SUSPECTED ABUSERS LEADERBOARD ── */}
      {activeTab === "abusers" && (
        <div
          style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}
        >
          <div className="card" style={{ padding: "1.5rem" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1.25rem",
              }}
            >
              <div>
                <h3
                  style={{
                    fontWeight: 700,
                    fontSize: "1.125rem",
                    color: "var(--text-primary)",
                  }}
                >
                  High-Risk Serial Return Abusers
                </h3>
                <p
                  style={{
                    fontSize: "0.8125rem",
                    color: "var(--text-secondary)",
                  }}
                >
                  Customer accounts flagged for chronic wardrobing, high
                  refund-to-spend ratio, and policy exploitation
                </p>
              </div>
              <span className="badge badge-critical">
                {formatNum(abusers.length)} Suspected Profiles Flagged
              </span>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table className="data-table" style={{ width: "100%" }}>
                <thead>
                  <tr>
                    <th>Customer ID</th>
                    <th>Country</th>
                    <th>Orders / Returns</th>
                    <th>Return Rate</th>
                    <th>Total Refunded / LTV</th>
                    <th>Avg Days</th>
                    <th>Abuse Score</th>
                    <th>Risk Tier</th>
                    <th>Behavioral Signals</th>
                    <th>Policy Action</th>
                  </tr>
                </thead>
                <tbody>
                  {abusers.map((cust) => (
                    <tr key={cust.customer_id}>
                      <td
                        style={{
                          fontWeight: 600,
                          fontFamily: "var(--font-mono)",
                          color: "var(--accent-blue)",
                        }}
                      >
                        {cust.customer_id}
                      </td>
                      <td>{cust.country}</td>
                      <td>
                        <strong>{cust.total_returns}</strong> /{" "}
                        {cust.total_orders}
                      </td>
                      <td
                        style={{
                          fontWeight: 700,
                          color:
                            cust.return_rate >= 0.5 ? "#ef4444" : "#f59e0b",
                        }}
                      >
                        {(cust.return_rate * 100).toFixed(1)}%
                      </td>
                      <td>
                        <span style={{ color: "#ef4444", fontWeight: 600 }}>
                          {formatCurr(cust.total_refunded, 0)}
                        </span>
                        <span
                          style={{
                            color: "var(--text-tertiary)",
                            fontSize: "0.75rem",
                          }}
                        >
                          {" "}
                          / {formatCurr(cust.lifetime_value, 0)}
                        </span>
                      </td>
                      <td>
                        <span
                          style={{
                            fontWeight: 600,
                            color:
                              cust.avg_days_to_return <= 3.5
                                ? "#ef4444"
                                : "var(--text-primary)",
                          }}
                        >
                          {formatNum(cust.avg_days_to_return, 1)}d
                        </span>
                      </td>
                      <td>
                        <span
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontWeight: 700,
                          }}
                        >
                          {(cust.abuse_score * 100).toFixed(0)}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`badge ${getTierColor(cust.risk_tier).badge}`}
                        >
                          {cust.risk_tier}
                        </span>
                      </td>
                      <td>
                        <div
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: "0.25rem",
                          }}
                        >
                          {cust.abuse_tags.map((tag, idx) => (
                            <span
                              key={idx}
                              style={{
                                fontSize: "0.65rem",
                                padding: "0.15rem 0.35rem",
                                borderRadius: "4px",
                                backgroundColor: "rgba(255,255,255,0.06)",
                                color: "var(--text-secondary)",
                              }}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: "0.35rem" }}>
                          <button
                            className="btn btn-secondary"
                            style={{
                              padding: "0.25rem 0.5rem",
                              fontSize: "0.7rem",
                            }}
                            onClick={() => {
                              showToast(
                                `Applied: Store Credit Only on ${cust.customer_id}`,
                              );
                            }}
                          >
                            Credit Only
                          </button>
                          <button
                            className="btn btn-danger"
                            style={{
                              padding: "0.25rem 0.5rem",
                              fontSize: "0.7rem",
                            }}
                            onClick={() => {
                              showToast(
                                `Restricted return privileges for ${cust.customer_id}`,
                              );
                            }}
                          >
                            Restrict
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/*  TAB 4: RETURN INVESTIGATIONS LOG ─ */}
      {activeTab === "investigations" && (
        <div
          style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}
        >
          <div className="card" style={{ padding: "1.5rem" }}>
            {/* Filter Bar */}
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "1rem",
                marginBottom: "1.25rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  flex: 1,
                  minWidth: "280px",
                }}
              >
                <div style={{ position: "relative", width: "100%" }}>
                  <Search
                    size={16}
                    style={{
                      position: "absolute",
                      left: "0.75rem",
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "var(--text-tertiary)",
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Search by Return ID, Customer ID, or Transaction ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "0.5rem 0.75rem 0.5rem 2.25rem",
                      borderRadius: "6px",
                      backgroundColor: "rgba(15,23,42,0.8)",
                      border: "1px solid #334155",
                      color: "#fff",
                      fontSize: "0.8125rem",
                    }}
                  />
                </div>
              </div>

              <div
                style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
              >
                <select
                  value={riskFilter}
                  onChange={(e) => setRiskFilter(e.target.value)}
                  style={{
                    padding: "0.5rem 0.75rem",
                    borderRadius: "6px",
                    backgroundColor: "rgba(15,23,42,0.8)",
                    border: "1px solid #334155",
                    color: "#fff",
                    fontSize: "0.8125rem",
                  }}
                >
                  <option value="ALL">All Risk Tiers</option>
                  <option value="CRITICAL">Critical Risk</option>
                  <option value="HIGH">High Risk</option>
                  <option value="MEDIUM">Medium Risk</option>
                  <option value="LOW">Low Risk</option>
                </select>

                <select
                  value={reasonFilter}
                  onChange={(e) => setReasonFilter(e.target.value)}
                  style={{
                    padding: "0.5rem 0.75rem",
                    borderRadius: "6px",
                    backgroundColor: "rgba(15,23,42,0.8)",
                    border: "1px solid #334155",
                    color: "#fff",
                    fontSize: "0.8125rem",
                  }}
                >
                  <option value="ALL">All Reasons</option>
                  <option value="changed_mind">Changed Mind</option>
                  <option value="not_as_described">Not As Described</option>
                  <option value="better_price_found">Better Price Found</option>
                  <option value="defective_product">Defective Product</option>
                  <option value="too_small">Too Small</option>
                </select>

                <button
                  onClick={() => setFastOnly(!fastOnly)}
                  style={{
                    padding: "0.5rem 0.75rem",
                    borderRadius: "6px",
                    fontSize: "0.8125rem",
                    fontWeight: 600,
                    backgroundColor: fastOnly
                      ? "rgba(239,68,68,0.2)"
                      : "rgba(255,255,255,0.05)",
                    border: fastOnly
                      ? "1px solid rgba(239,68,68,0.5)"
                      : "1px solid #334155",
                    color: fastOnly ? "#ef4444" : "var(--text-secondary)",
                    cursor: "pointer",
                  }}
                >
                  ⚡ Fast Returns Only (≤3d)
                </button>
              </div>
            </div>

            {/* Table */}
            <div style={{ overflowX: "auto" }}>
              <table className="data-table" style={{ width: "100%" }}>
                <thead>
                  <tr>
                    <th>Return ID</th>
                    <th>Customer ID</th>
                    <th>Reason</th>
                    <th>Refund</th>
                    <th>Days to Return</th>
                    <th>Cust Return Rate</th>
                    <th>Abuse Score</th>
                    <th>Risk Tier</th>
                    <th>Policy Recommendation</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {returnsList.length > 0 ? (
                    returnsList.map((ret) => (
                      <tr
                        key={ret.id}
                        onClick={() => setSelectedReturn(ret)}
                        style={{ cursor: "pointer" }}
                        className="hover:bg-slate-800/50"
                      >
                        <td
                          style={{
                            fontWeight: 600,
                            fontFamily: "var(--font-mono)",
                            color: "var(--accent-blue)",
                          }}
                        >
                          {ret.id}
                        </td>
                        <td style={{ fontFamily: "var(--font-mono)" }}>
                          {ret.customer_id}
                        </td>
                        <td style={{ textTransform: "capitalize" }}>
                          {ret.reason.replace(/_/g, " ")}
                        </td>
                        <td style={{ fontWeight: 600 }}>
                          {formatCurr(ret.refund_amount, 2)}
                        </td>
                        <td>
                          {ret.is_fast_return ? (
                            <span
                              className="badge badge-critical"
                              style={{
                                fontSize: "0.7rem",
                                padding: "0.15rem 0.4rem",
                              }}
                            >
                              ⚡ {ret.days_after_purchase}d (Wardrobe)
                            </span>
                          ) : (
                            <span>{ret.days_after_purchase} days</span>
                          )}
                        </td>
                        <td
                          style={{
                            fontWeight: 600,
                            color:
                              ret.customer_return_rate >= 0.45
                                ? "#ef4444"
                                : "inherit",
                          }}
                        >
                          {(ret.customer_return_rate * 100).toFixed(0)}%
                        </td>
                        <td
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontWeight: 700,
                          }}
                        >
                          {(ret.abuse_risk_score * 100).toFixed(0)}
                        </td>
                        <td>
                          <span
                            className={`badge ${getTierColor(ret.risk_tier).badge}`}
                          >
                            {ret.risk_tier}
                          </span>
                        </td>
                        <td style={{ fontSize: "0.75rem", fontWeight: 600 }}>
                          {ret.recommended_action.replace(/_/g, " ")}
                        </td>
                        <td>
                          <span
                            style={{
                              fontSize: "0.75rem",
                              color:
                                ret.status === "ACTIONED"
                                  ? "#10b981"
                                  : "var(--text-tertiary)",
                            }}
                          >
                            {ret.status}
                          </span>
                        </td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <button
                            className="btn btn-secondary"
                            style={{
                              padding: "0.25rem 0.5rem",
                              fontSize: "0.7rem",
                            }}
                            onClick={() => setSelectedReturn(ret)}
                          >
                            Inspect
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={11}
                        style={{
                          textAlign: "center",
                          padding: "2.5rem",
                          color: "var(--text-tertiary)",
                        }}
                      >
                        {loading
                          ? "Loading return records..."
                          : "No returns found matching filter criteria."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: "1rem",
                fontSize: "0.8125rem",
                color: "var(--text-secondary)",
              }}
            >
              <div>
                Page {page} of {totalPages}
              </div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  className="btn btn-secondary"
                  style={{ padding: "0.35rem 0.75rem", fontSize: "0.75rem" }}
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </button>
                <button
                  className="btn btn-secondary"
                  style={{ padding: "0.35rem 0.75rem", fontSize: "0.75rem" }}
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/*  TAB 5: POLICY GUARDRAILS & AUTOMATION RULES ─ */}
      {activeTab === "guardrails" && (
        <div className="rg-2">
          <div className="card" style={{ padding: "1.5rem" }}>
            <h3
              style={{
                fontWeight: 700,
                fontSize: "1.125rem",
                color: "var(--text-primary)",
                marginBottom: "0.25rem",
              }}
            >
              Automated Policy Enforcement Rules
            </h3>
            <p
              style={{
                fontSize: "0.8125rem",
                color: "var(--text-secondary)",
                marginBottom: "1.5rem",
              }}
            >
              Configure algorithmic friction triggers to prevent return abuse
              automatically
            </p>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "1.25rem",
              }}
            >
              {/* Rule 1 */}
              <div
                style={{
                  padding: "1rem",
                  borderRadius: "8px",
                  backgroundColor: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "0.5rem",
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: "0.875rem" }}>
                    👗 Wardrobing Turnaround Limit
                  </div>
                  <input
                    type="checkbox"
                    checked={policyRules.autoDenyCriticalWardrobers}
                    onChange={(e) =>
                      setPolicyRules({
                        ...policyRules,
                        autoDenyCriticalWardrobers: e.target.checked,
                      })
                    }
                    style={{
                      width: "16px",
                      height: "16px",
                      accentColor: "#3b82f6",
                    }}
                  />
                </div>
                <p
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--text-secondary)",
                    marginBottom: "0.75rem",
                  }}
                >
                  Auto-flag items returned within{" "}
                  {policyRules.wardrobingThresholdDays} days of delivery if
                  customer return rate exceeds 40%.
                </p>
                <div
                  style={{ display: "flex", alignItems: "center", gap: "1rem" }}
                >
                  <span
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--text-tertiary)",
                    }}
                  >
                    Window:
                  </span>
                  <input
                    type="range"
                    min="1"
                    max="7"
                    value={policyRules.wardrobingThresholdDays}
                    onChange={(e) =>
                      setPolicyRules({
                        ...policyRules,
                        wardrobingThresholdDays: parseInt(e.target.value),
                      })
                    }
                    style={{ flex: 1, accentColor: "#ef4444" }}
                  />
                  <span style={{ fontSize: "0.8125rem", fontWeight: 700 }}>
                    {policyRules.wardrobingThresholdDays} Days
                  </span>
                </div>
              </div>

              {/* Rule 2 */}
              <div
                style={{
                  padding: "1rem",
                  borderRadius: "8px",
                  backgroundColor: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "0.5rem",
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: "0.875rem" }}>
                    💳 Store Credit Default for Abusers
                  </div>
                  <input
                    type="checkbox"
                    checked={policyRules.autoStoreCreditForAbusers}
                    onChange={(e) =>
                      setPolicyRules({
                        ...policyRules,
                        autoStoreCreditForAbusers: e.target.checked,
                      })
                    }
                    style={{
                      width: "16px",
                      height: "16px",
                      accentColor: "#3b82f6",
                    }}
                  />
                </div>
                <p
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--text-secondary)",
                    marginBottom: "0.75rem",
                  }}
                >
                  Automatically disable original payment method refund and issue
                  Store Credit if customer return rate exceeds threshold.
                </p>
                <div
                  style={{ display: "flex", alignItems: "center", gap: "1rem" }}
                >
                  <span
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--text-tertiary)",
                    }}
                  >
                    Threshold:
                  </span>
                  <input
                    type="range"
                    min="20"
                    max="80"
                    value={policyRules.highReturnRateThreshold}
                    onChange={(e) =>
                      setPolicyRules({
                        ...policyRules,
                        highReturnRateThreshold: parseInt(e.target.value),
                      })
                    }
                    style={{ flex: 1, accentColor: "#3b82f6" }}
                  />
                  <span style={{ fontSize: "0.8125rem", fontWeight: 700 }}>
                    {policyRules.highReturnRateThreshold}% Rate
                  </span>
                </div>
              </div>

              {/* Rule 3 */}
              <div
                style={{
                  padding: "1rem",
                  borderRadius: "8px",
                  backgroundColor: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "0.5rem",
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: "0.875rem" }}>
                    📦 Mandatory Physical Warehouse Inspection
                  </div>
                  <span
                    className="badge badge-medium"
                    style={{ fontSize: "0.65rem" }}
                  >
                    High Value
                  </span>
                </div>
                <p
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--text-secondary)",
                    marginBottom: "0.75rem",
                  }}
                >
                  Require manual tag and condition verification before refund
                  release for orders above threshold.
                </p>
                <div
                  style={{ display: "flex", alignItems: "center", gap: "1rem" }}
                >
                  <span
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--text-tertiary)",
                    }}
                  >
                    Min Amount:
                  </span>
                  <input
                    type="range"
                    min="100"
                    max="1000"
                    step="50"
                    value={policyRules.requireInspectionOverAmount}
                    onChange={(e) =>
                      setPolicyRules({
                        ...policyRules,
                        requireInspectionOverAmount: parseInt(e.target.value),
                      })
                    }
                    style={{ flex: 1, accentColor: "#f59e0b" }}
                  />
                  <span style={{ fontSize: "0.8125rem", fontWeight: 700 }}>
                    ${policyRules.requireInspectionOverAmount}
                  </span>
                </div>
              </div>

              <button
                className="btn btn-primary"
                onClick={() =>
                  showToast(
                    "✓ Return Policy Guardrails updated and deployed to production",
                  )
                }
              >
                Save & Deploy Guardrail Policies
              </button>
            </div>
          </div>

          {/* Guardrail Impact Summary */}
          <div className="card" style={{ padding: "1.5rem" }}>
            <h3
              style={{
                fontWeight: 700,
                fontSize: "1.125rem",
                color: "var(--text-primary)",
                marginBottom: "0.25rem",
              }}
            >
              Projected Policy Savings & Friction
            </h3>
            <p
              style={{
                fontSize: "0.8125rem",
                color: "var(--text-secondary)",
                marginBottom: "1.5rem",
              }}
            >
              Estimated financial and customer experience impact based on
              current rule thresholds
            </p>

            <div
              style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
            >
              <div
                style={{
                  padding: "1.25rem",
                  borderRadius: "10px",
                  backgroundColor: "rgba(16,185,129,0.1)",
                  border: "1px solid rgba(16,185,129,0.25)",
                }}
              >
                <div
                  style={{
                    fontSize: "0.8125rem",
                    color: "var(--text-secondary)",
                  }}
                >
                  Estimated Monthly Prevented Loss
                </div>
                <div
                  style={{
                    fontSize: "2rem",
                    fontWeight: 800,
                    color: "var(--accent-emerald)",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  {formatCurr(metrics.prevented_abuse_loss * 1.25, 0)}
                </div>
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--text-secondary)",
                    marginTop: "0.25rem",
                  }}
                >
                  From wardrobing denial, restocking fees, and store credit
                  retainment.
                </div>
              </div>

              <div
                style={{
                  padding: "1.25rem",
                  borderRadius: "10px",
                  backgroundColor: "rgba(59,130,246,0.1)",
                  border: "1px solid rgba(59,130,246,0.25)",
                }}
              >
                <div
                  style={{
                    fontSize: "0.8125rem",
                    color: "var(--text-secondary)",
                  }}
                >
                  Legitimate Shopper Friction
                </div>
                <div
                  style={{
                    fontSize: "2rem",
                    fontWeight: 800,
                    color: "var(--accent-blue)",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  &lt; 0.6%
                </div>
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--text-secondary)",
                    marginTop: "0.25rem",
                  }}
                >
                  99.4% of low-risk shoppers receive automated, friction-free
                  instant refunds.
                </div>
              </div>

              <div
                style={{
                  padding: "1rem",
                  borderRadius: "8px",
                  backgroundColor: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    marginBottom: "0.35rem",
                  }}
                >
                  <Info size={16} className="text-blue-400" />
                  <span style={{ fontWeight: 600, fontSize: "0.8125rem" }}>
                    Automated Restocking Fee
                  </span>
                </div>
                <p
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--text-secondary)",
                  }}
                >
                  A {policyRules.restockingFeePercent}% restocking deduction is
                  applied on discretionary returns from accounts with &gt;
                  {policyRules.highReturnRateThreshold}% historical return rate.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/*  SLIDE-OVER INVESTIGATION DRAWER ── */}
      {selectedReturn && (
        <div
          style={{
            position: "fixed",
            top: 0,
            right: 0,
            width: "480px",
            maxWidth: "90vw",
            height: "100vh",
            backgroundColor: "#0b0f19",
            borderLeft: "1px solid #1e293b",
            boxShadow: "-10px 0 30px rgba(0,0,0,0.7)",
            zIndex: 1000,
            padding: "2rem",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            overflowY: "auto",
          }}
        >
          <div>
            {/* Drawer Header */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: "1.5rem",
              }}
            >
              <div>
                <span
                  className="badge badge-low"
                  style={{ fontSize: "0.7rem", marginBottom: "0.35rem" }}
                >
                  Return Record Deep-Dive
                </span>
                <h3
                  style={{
                    fontWeight: 800,
                    fontSize: "1.25rem",
                    color: "#fff",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  {selectedReturn.id}
                </h3>
              </div>
              <button
                onClick={() => setSelectedReturn(null)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--text-secondary)",
                  cursor: "pointer",
                  padding: "0.25rem",
                }}
              >
                <XCircle size={22} />
              </button>
            </div>

            {/* Risk Tier Badge */}
            <div
              style={{
                padding: "1rem",
                borderRadius: "8px",
                backgroundColor: getTierColor(selectedReturn.risk_tier).bg,
                border: `1px solid ${getTierColor(selectedReturn.risk_tier).border}`,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1.5rem",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--text-secondary)",
                  }}
                >
                  Abuse Score
                </div>
                <div
                  style={{
                    fontSize: "1.5rem",
                    fontWeight: 800,
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  {(selectedReturn.abuse_risk_score * 100).toFixed(0)} / 100
                </div>
              </div>
              <span
                className={`badge ${getTierColor(selectedReturn.risk_tier).badge}`}
                style={{ fontSize: "0.8125rem" }}
              >
                {selectedReturn.risk_tier} RISK
              </span>
            </div>

            {/* Return Details */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.875rem",
                marginBottom: "1.5rem",
                fontSize: "0.8125rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  borderBottom: "1px solid #1e293b",
                  paddingBottom: "0.5rem",
                }}
              >
                <span style={{ color: "var(--text-secondary)" }}>
                  Customer ID:
                </span>
                <span
                  style={{ fontWeight: 600, fontFamily: "var(--font-mono)" }}
                >
                  {selectedReturn.customer_id}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  borderBottom: "1px solid #1e293b",
                  paddingBottom: "0.5rem",
                }}
              >
                <span style={{ color: "var(--text-secondary)" }}>
                  Original Transaction ID:
                </span>
                <span
                  style={{ fontWeight: 600, fontFamily: "var(--font-mono)" }}
                >
                  {selectedReturn.transaction_id}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  borderBottom: "1px solid #1e293b",
                  paddingBottom: "0.5rem",
                }}
              >
                <span style={{ color: "var(--text-secondary)" }}>
                  Refund Requested:
                </span>
                <span style={{ fontWeight: 700, color: "#ef4444" }}>
                  {formatCurr(selectedReturn.refund_amount, 2)}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  borderBottom: "1px solid #1e293b",
                  paddingBottom: "0.5rem",
                }}
              >
                <span style={{ color: "var(--text-secondary)" }}>
                  Turnaround Window:
                </span>
                <span style={{ fontWeight: 600 }}>
                  {selectedReturn.days_after_purchase} days{" "}
                  {selectedReturn.is_fast_return && "⚡ (Fast Wardrobing)"}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  borderBottom: "1px solid #1e293b",
                  paddingBottom: "0.5rem",
                }}
              >
                <span style={{ color: "var(--text-secondary)" }}>
                  Stated Reason:
                </span>
                <span style={{ fontWeight: 600, textTransform: "capitalize" }}>
                  {selectedReturn.reason.replace(/_/g, " ")}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  borderBottom: "1px solid #1e293b",
                  paddingBottom: "0.5rem",
                }}
              >
                <span style={{ color: "var(--text-secondary)" }}>
                  Customer Lifetime Return Rate:
                </span>
                <span
                  style={{
                    fontWeight: 700,
                    color:
                      selectedReturn.customer_return_rate >= 0.45
                        ? "#ef4444"
                        : "inherit",
                  }}
                >
                  {(selectedReturn.customer_return_rate * 100).toFixed(1)}%
                </span>
              </div>
            </div>

            {/* Recommended Policy Action */}
            <div
              style={{
                padding: "1rem",
                borderRadius: "8px",
                backgroundColor: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                marginBottom: "1.5rem",
              }}
            >
              <div
                style={{
                  fontWeight: 700,
                  fontSize: "0.8125rem",
                  color: "var(--text-primary)",
                  marginBottom: "0.25rem",
                }}
              >
                Engine Policy Recommendation:
              </div>
              <div
                style={{
                  fontSize: "0.875rem",
                  fontWeight: 700,
                  color: "var(--accent-blue)",
                }}
              >
                {selectedReturn.recommended_action.replace(/_/g, " ")}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.5rem",
              marginTop: "1rem",
            }}
          >
            <button
              className="btn btn-primary"
              onClick={() => handleAction(selectedReturn.id, "APPROVE_INSTANT")}
            >
              <CheckCircle2 size={16} /> Instant Approve Refund
            </button>
            <button
              className="btn btn-secondary"
              onClick={() =>
                handleAction(selectedReturn.id, "ISSUE_STORE_CREDIT")
              }
            >
              <RotateCcw size={16} /> Issue Store Credit Only
            </button>
            <button
              className="btn btn-secondary"
              onClick={() =>
                handleAction(selectedReturn.id, "RESTOCKING_FEE_15")
              }
            >
              <DollarSign size={16} /> Enforce 15% Restocking Fee
            </button>
            <button
              className="btn btn-danger"
              onClick={() => handleAction(selectedReturn.id, "DENY_AND_FLAG")}
            >
              <XCircle size={16} /> Deny Return & Flag Customer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
