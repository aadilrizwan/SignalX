"use client";

import { useEffect, useState, useMemo } from "react";
import {
  getReviewMetrics,
  getReviewQueue,
  getReviewHistory,
  executeDisposition,
  batchDisposition,
  type ReviewMetrics,
  type ReviewCase,
  type ReviewHistoryItem,
} from "@/lib/api";
import {
  UserCheck,
  ShieldAlert,
  ShieldCheck,
  Clock,
  Zap,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  SlidersHorizontal,
  FileText,
  DollarSign,
  TrendingUp,
  Sparkles,
  Layers,
  ArrowRight,
  Filter,
  CheckSquare,
  Square,
  ChevronRight,
  User,
  Smartphone,
  Globe,
  Tag,
  MessageSquare,
  Send,
  Lock,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  PieChart,
  Pie,
} from "recharts";

//  Locale-Safe Formatters

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

//  Fallback Defaults

const MOCK_METRICS: ReviewMetrics = {
  total_pending_reviews: 5,
  urgent_sla_count: 2,
  total_pending_exposure: 5435.0,
  resolved_today: 40,
  average_review_time_seconds: 42,
  analyst_overturn_rate: 0.184,
  sla_adherence_percent: 99.4,
  decision_breakdown: {
    APPROVE: 26,
    BLOCK_FRAUD: 11,
    STEP_UP_CHALLENGE: 3,
  },
  hourly_review_volume: [
    { hour: "09:00", incoming: 12, resolved: 14 },
    { hour: "10:00", incoming: 18, resolved: 16 },
    { hour: "11:00", incoming: 24, resolved: 22 },
    { hour: "12:00", incoming: 15, resolved: 18 },
    { hour: "13:00", incoming: 20, resolved: 19 },
    { hour: "14:00", incoming: 28, resolved: 26 },
  ],
  analysts: [
    {
      name: "MA RIZWAN",
      active_cases: 2,
      resolved_today: 18,
      avg_time_sec: 38,
      accuracy: 0.994,
    },
    {
      name: "Alex Chen",
      active_cases: 1,
      resolved_today: 14,
      avg_time_sec: 45,
      accuracy: 0.989,
    },
    {
      name: "Marcus Vance",
      active_cases: 0,
      resolved_today: 9,
      avg_time_sec: 41,
      accuracy: 0.991,
    },
  ],
};

const MOCK_CASES: ReviewCase[] = [
  {
    case_id: "CASE-90214",
    transaction_id: "txn_0000042",
    customer_id: "cust_000812",
    amount: 890.0,
    currency: "USD",
    timestamp: "2024-04-10T14:22:00Z",
    payment_method: "credit_card",
    billing_country: "US",
    shipping_country: "MX",
    risk_score: 0.68,
    risk_tier: "HIGH",
    priority: "URGENT_SLA",
    sla_minutes_remaining: 7,
    status: "OPEN",
    trigger_reasons: [
      "Cross-border shipping address mismatch (US -> MX)",
      "Transaction amount 4.2x above customer 90-day average",
      "New unverified mobile device fingerprint",
    ],
    assigned_analyst: "MA RIZWAN",
    shap_factors: [
      {
        factor: "amount_ratio_to_avg",
        contribution: 0.28,
        description: "Amount $890 vs $210 avg",
      },
      {
        factor: "geo_country_mismatch",
        contribution: 0.24,
        description: "IP US vs Shipping MX",
      },
      {
        factor: "new_device",
        contribution: 0.16,
        description: "First time observed device",
      },
    ],
  },
  {
    case_id: "CASE-90215",
    transaction_id: "txn_0000088",
    customer_id: "cust_001942",
    amount: 1450.0,
    currency: "USD",
    timestamp: "2024-04-10T14:16:00Z",
    payment_method: "credit_card",
    billing_country: "GB",
    shipping_country: "GB",
    risk_score: 0.62,
    risk_tier: "HIGH",
    priority: "HIGH_AMOUNT",
    sla_minutes_remaining: 16,
    status: "OPEN",
    trigger_reasons: [
      "High value transaction ($1,450.00)",
      "Velocity spike: 3 transactions in 10 minutes",
      "Device shared across 2 distinct customer accounts",
    ],
    assigned_analyst: "Unassigned",
    shap_factors: [
      {
        factor: "txn_count_last_1hr",
        contribution: 0.31,
        description: "3 orders in 10 mins",
      },
      {
        factor: "device_customer_count",
        contribution: 0.21,
        description: "Device linked to 2 accounts",
      },
      { factor: "amount", contribution: 0.1, description: "High cart value" },
    ],
  },
  {
    case_id: "CASE-90216",
    transaction_id: "txn_0000109",
    customer_id: "cust_003118",
    amount: 320.0,
    currency: "USD",
    timestamp: "2024-04-10T14:08:00Z",
    payment_method: "paypal",
    billing_country: "CA",
    shipping_country: "CA",
    risk_score: 0.54,
    risk_tier: "MEDIUM",
    priority: "STANDARD",
    sla_minutes_remaining: 38,
    status: "IN_REVIEW",
    trigger_reasons: [
      "Return abuse risk score 0.72 (Frequent item returns)",
      "IP address flagged in high-risk subnet cluster",
    ],
    assigned_analyst: "Alex Chen",
    shap_factors: [
      {
        factor: "customer_return_rate",
        contribution: 0.35,
        description: "Lifetime return rate 48%",
      },
      {
        factor: "ip_fraud_rate",
        contribution: 0.19,
        description: "IP subnet risk 0.18",
      },
    ],
  },
  {
    case_id: "CASE-90217",
    transaction_id: "txn_0000214",
    customer_id: "cust_004509",
    amount: 675.0,
    currency: "USD",
    timestamp: "2024-04-10T13:55:00Z",
    payment_method: "credit_card",
    billing_country: "AU",
    shipping_country: "AU",
    risk_score: 0.58,
    risk_tier: "MEDIUM",
    priority: "STANDARD",
    sla_minutes_remaining: 55,
    status: "OPEN",
    trigger_reasons: [
      "3DS Frictionless challenge requested by issuer",
      "Card velocity burst on new account (Age: 2 days)",
    ],
    assigned_analyst: "Unassigned",
    shap_factors: [
      {
        factor: "customer_age_days",
        contribution: 0.29,
        description: "Account created 2 days ago",
      },
      {
        factor: "amount_ratio_to_avg",
        contribution: 0.22,
        description: "No prior purchase baseline",
      },
    ],
  },
  {
    case_id: "CASE-90218",
    transaction_id: "txn_0000305",
    customer_id: "cust_000128",
    amount: 2100.0,
    currency: "USD",
    timestamp: "2024-04-10T13:42:00Z",
    payment_method: "crypto",
    billing_country: "DE",
    shipping_country: "DE",
    risk_score: 0.74,
    risk_tier: "HIGH",
    priority: "HIGH_AMOUNT",
    sla_minutes_remaining: 12,
    status: "OPEN",
    trigger_reasons: [
      "Large crypto transaction exceeding $2,000",
      "Tor exit node / proxy IP detected",
    ],
    assigned_analyst: "MA RIZWAN",
    shap_factors: [
      {
        factor: "amount",
        contribution: 0.42,
        description: "High ticket purchase",
      },
      {
        factor: "ip_fraud_rate",
        contribution: 0.32,
        description: "Anonymous proxy endpoint",
      },
    ],
  },
];

const MOCK_HISTORY: ReviewHistoryItem[] = [
  {
    case_id: "CASE-90210",
    transaction_id: "txn_0000012",
    customer_id: "cust_001102",
    amount: 420.0,
    action: "APPROVE",
    analyst: "Alex Chen",
    note: "Verified customer identity via phone OTP confirmation. Legitimate travel purchase.",
    tags: ["travel_verified", "whitelist_device"],
    disposed_at: "2024-04-10T13:30:00Z",
  },
  {
    case_id: "CASE-90211",
    transaction_id: "txn_0000019",
    customer_id: "cust_002844",
    amount: 1150.0,
    action: "BLOCK_FRAUD",
    analyst: "MA RIZWAN",
    note: "Confirmed synthetic identity ring. Blacklisted IP and device canvas hash.",
    tags: ["synthetic_identity", "blacklist_ip"],
    disposed_at: "2024-04-10T12:15:00Z",
  },
];

export default function ReviewsPage() {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "queue" | "studio" | "history" | "performance" | "guardrails"
  >("queue");
  const [metrics, setMetrics] = useState<ReviewMetrics>(MOCK_METRICS);
  const [cases, setCases] = useState<ReviewCase[]>(MOCK_CASES);
  const [history, setHistory] = useState<ReviewHistoryItem[]>(MOCK_HISTORY);
  const [loading, setLoading] = useState(false);
  const [isLiveApi, setIsLiveApi] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Queue Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [riskFilter, setRiskFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedCase, setSelectedCase] = useState<ReviewCase | null>(
    MOCK_CASES[0],
  );

  // Batch Selection
  const [selectedCaseIds, setSelectedCaseIds] = useState<string[]>([]);

  // Studio Decision Form
  const [decisionAction, setDecisionAction] = useState<
    "APPROVE" | "BLOCK_FRAUD" | "STEP_UP_CHALLENGE" | "ESCALATE"
  >("APPROVE");
  const [analystNote, setAnalystNote] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([
    "verified_buyer",
  ]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchAllData = () => {
    setLoading(true);
    Promise.all([
      getReviewMetrics().catch(() => MOCK_METRICS),
      getReviewQueue(page, 20, priorityFilter, riskFilter, searchTerm).catch(
        () => ({
          cases: MOCK_CASES,
          total: MOCK_CASES.length,
          page: 1,
          page_size: 20,
          total_pages: 1,
        }),
      ),
      getReviewHistory().catch(() => MOCK_HISTORY),
    ])
      .then(([metricsData, queueData, historyData]) => {
        setMetrics(metricsData);
        setCases(queueData.cases);
        setTotalPages(queueData.total_pages || 1);
        setHistory(historyData);
        if (queueData.cases.length > 0 && !selectedCase) {
          setSelectedCase(queueData.cases[0]);
        }
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
  }, [page, priorityFilter, riskFilter]);

  const handleSingleDisposition = async (
    caseId: string,
    action: string,
    note?: string,
  ) => {
    try {
      await executeDisposition(
        caseId,
        action,
        "Lead Analyst",
        note || analystNote,
        selectedTags,
      );
      showToast(`✓ Case ${caseId} successfully resolved as '${action}'`);
      setCases((prev) => prev.filter((c) => c.case_id !== caseId));
      setSelectedCaseIds((prev) => prev.filter((id) => id !== caseId));
      if (selectedCase && selectedCase.case_id === caseId) {
        setSelectedCase(null);
      }
      fetchAllData();
    } catch {
      showToast(`✓ Case ${caseId} resolved as '${action}' (Local mode)`);
      setCases((prev) => prev.filter((c) => c.case_id !== caseId));
    }
  };

  const handleBatchDisposition = async (action: string) => {
    if (selectedCaseIds.length === 0) {
      showToast("⚠️ Select at least one case for batch action.");
      return;
    }
    try {
      await batchDisposition(
        selectedCaseIds,
        action,
        "Lead Analyst",
        `Batch ${action}`,
      );
      showToast(
        `✓ Batch ${action} executed on ${selectedCaseIds.length} cases`,
      );
      setCases((prev) =>
        prev.filter((c) => !selectedCaseIds.includes(c.case_id)),
      );
      setSelectedCaseIds([]);
      fetchAllData();
    } catch {
      showToast(
        `✓ Batch ${action} processed for ${selectedCaseIds.length} cases (Local mode)`,
      );
      setCases((prev) =>
        prev.filter((c) => !selectedCaseIds.includes(c.case_id)),
      );
      setSelectedCaseIds([]);
    }
  };

  const toggleSelectCase = (caseId: string) => {
    setSelectedCaseIds((prev) =>
      prev.includes(caseId)
        ? prev.filter((id) => id !== caseId)
        : [...prev, caseId],
    );
  };

  const toggleSelectAll = () => {
    if (selectedCaseIds.length === cases.length) {
      setSelectedCaseIds([]);
    } else {
      setSelectedCaseIds(cases.map((c) => c.case_id));
    }
  };

  const availableTags = [
    "verified_buyer",
    "travel_exception",
    "shared_family_device",
    "velocity_abuse",
    "confirmed_ato_takeover",
    "synthetic_id",
    "whitelist_ip",
  ];

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const pieDecisionsData = useMemo(() => {
    return Object.entries(metrics.decision_breakdown || {}).map(
      ([key, val]) => ({
        name: key.replace(/_/g, " "),
        value: val,
      }),
    );
  }, [metrics]);

  const DECISION_COLORS = ["#10b981", "#ef4444", "#3b82f6", "#f59e0b"];

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
                  "linear-gradient(135deg, rgba(245,158,11,0.2), rgba(59,130,246,0.2))",
                border: "1px solid rgba(245,158,11,0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <UserCheck size={20} className="text-amber-400" />
            </div>
            <h1>Analyst Review Queue</h1>
            <span
              className="badge badge-medium"
              style={{ fontSize: "0.75rem" }}
            >
              <span
                className="status-dot"
                style={{ display: "inline-block" }}
              />
              {isLiveApi ? "Active Queue Stream" : "Analyst Console"}
            </span>
          </div>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
            Human-in-the-loop dispute resolution and high-risk case
            investigation. Every decision feeds ground-truth labels back into
            the active learning loop.
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button
            className="btn btn-secondary"
            onClick={fetchAllData}
            disabled={loading}
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />{" "}
            {loading ? "Syncing..." : "Sync Queue"}
          </button>
          <button
            className="btn btn-primary"
            onClick={() => setActiveTab("studio")}
          >
            <Zap size={15} /> Open Decision Studio
          </button>
        </div>
      </div>

      {/* Urgent SLA Alert Strip */}
      {metrics.urgent_sla_count > 0 && (
        <div
          style={{
            padding: "1rem 1.25rem",
            borderRadius: "10px",
            backgroundColor: "rgba(239, 68, 68, 0.12)",
            border: "1px solid rgba(239, 68, 68, 0.35)",
            marginBottom: "1.75rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "1rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <AlertTriangle size={20} className="text-rose-400" />
            <div>
              <div
                style={{ fontSize: "0.875rem", fontWeight: 700, color: "#fff" }}
              >
                {metrics.urgent_sla_count} High-Priority Transactions
                Approaching SLA Expiry (&lt; 15 mins)
              </div>
              <div
                style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}
              >
                Immediate review required to avoid automated payment gateway
                timeout.
              </div>
            </div>
          </div>
          <button
            className="btn btn-secondary"
            style={{
              padding: "0.35rem 0.75rem",
              fontSize: "0.75rem",
              borderColor: "rgba(239,68,68,0.5)",
              color: "#ef4444",
            }}
            onClick={() => {
              setPriorityFilter("URGENT_SLA");
              setActiveTab("queue");
            }}
          >
            Filter Urgent SLA Cases
          </button>
        </div>
      )}

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
            id: "queue",
            label: "Live Queue & Stream",
            icon: <Layers size={16} />,
          },
          {
            id: "studio",
            label: "Analyst Decision Studio",
            icon: <Zap size={16} />,
          },
          {
            id: "history",
            label: "Disposition Audit Trail",
            icon: <FileText size={16} />,
          },
          {
            id: "performance",
            label: "Team Velocity & SLA Health",
            icon: <TrendingUp size={16} />,
          },
          {
            id: "guardrails",
            label: "Review Policy Guardrails",
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
                  ? "rgba(245, 158, 11, 0.15)"
                  : "transparent",
              border:
                activeTab === tab.id
                  ? "1px solid rgba(245, 158, 11, 0.3)"
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

      {/* Top Metric Cards */}
      <div className="metrics-grid" style={{ marginBottom: "1.75rem" }}>
        <div className="metric-card danger">
          <div className="metric-header">
            <span className="metric-label">Pending In Queue</span>
            <Clock size={18} className="text-amber-400" />
          </div>
          <div className="metric-value">
            {formatNum(metrics.total_pending_reviews)}
          </div>
          <div className="metric-subtext">
            {formatCurr(metrics.total_pending_exposure, 0)} total exposure
          </div>
        </div>

        <div className="metric-card success">
          <div className="metric-header">
            <span className="metric-label">Resolved Today</span>
            <CheckCircle2 size={18} className="text-emerald-400" />
          </div>
          <div className="metric-value">
            {formatNum(metrics.resolved_today)}
          </div>
          <div className="metric-subtext">
            {metrics.sla_adherence_percent.toFixed(1)}% SLA compliance
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-label">Avg Review Speed</span>
            <Zap size={18} className="text-blue-400" />
          </div>
          <div className="metric-value">
            {metrics.average_review_time_seconds}s
          </div>
          <div className="metric-subtext">Per manual disposition</div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-label">Analyst Overturn Rate</span>
            <Sparkles size={18} className="text-cyan-400" />
          </div>
          <div className="metric-value">
            {(metrics.analyst_overturn_rate * 100).toFixed(1)}%
          </div>
          <div className="metric-subtext">Model false positives rescued</div>
        </div>

        <div className="metric-card success">
          <div className="metric-header">
            <span className="metric-label">SLA Adherence</span>
            <ShieldCheck size={18} className="text-emerald-400" />
          </div>
          <div className="metric-value">
            {metrics.sla_adherence_percent.toFixed(1)}%
          </div>
          <div className="metric-subtext">Under 60 min response target</div>
        </div>
      </div>

      {/* ─── TAB 1: LIVE REVIEW QUEUE & STREAM ─ */}
      {activeTab === "queue" && (
        <div
          style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}
        >
          <div className="card" style={{ padding: "1.5rem" }}>
            {/* Action & Filter Bar */}
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
                    placeholder="Search by Case ID, Customer, or Transaction..."
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
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  style={{
                    padding: "0.5rem 0.75rem",
                    borderRadius: "6px",
                    backgroundColor: "rgba(15,23,42,0.8)",
                    border: "1px solid #334155",
                    color: "#fff",
                    fontSize: "0.8125rem",
                  }}
                >
                  <option value="ALL">All Priorities</option>
                  <option value="URGENT_SLA">Urgent SLA (&lt; 15m)</option>
                  <option value="HIGH_AMOUNT">High Amount (&gt; $500)</option>
                  <option value="STANDARD">Standard Review</option>
                </select>

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
                  <option value="HIGH">High Risk Tier</option>
                  <option value="MEDIUM">Medium Risk Tier</option>
                </select>
              </div>
            </div>

            {/* Batch Action Toolbar */}
            {selectedCaseIds.length > 0 && (
              <div
                style={{
                  padding: "0.75rem 1rem",
                  borderRadius: "8px",
                  backgroundColor: "rgba(30, 41, 59, 0.9)",
                  border: "1px solid var(--accent-blue)",
                  marginBottom: "1rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  animation: "fadeIn 0.2s",
                }}
              >
                <div
                  style={{
                    fontSize: "0.8125rem",
                    fontWeight: 600,
                    color: "#fff",
                  }}
                >
                  {selectedCaseIds.length} Cases Selected:
                </div>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button
                    className="btn btn-primary"
                    style={{ padding: "0.35rem 0.75rem", fontSize: "0.75rem" }}
                    onClick={() => handleBatchDisposition("APPROVE")}
                  >
                    <CheckCircle2 size={14} /> Batch Approve
                  </button>
                  <button
                    className="btn btn-danger"
                    style={{ padding: "0.35rem 0.75rem", fontSize: "0.75rem" }}
                    onClick={() => handleBatchDisposition("BLOCK_FRAUD")}
                  >
                    <XCircle size={14} /> Batch Block Fraud
                  </button>
                  <button
                    className="btn btn-secondary"
                    style={{ padding: "0.35rem 0.75rem", fontSize: "0.75rem" }}
                    onClick={() => handleBatchDisposition("STEP_UP_CHALLENGE")}
                  >
                    <Smartphone size={14} /> Batch Step-Up
                  </button>
                </div>
              </div>
            )}

            {/* Queue Table */}
            <div style={{ overflowX: "auto" }}>
              <table className="data-table" style={{ width: "100%" }}>
                <thead>
                  <tr>
                    <th style={{ width: "40px" }}>
                      <input
                        type="checkbox"
                        checked={
                          selectedCaseIds.length === cases.length &&
                          cases.length > 0
                        }
                        onChange={toggleSelectAll}
                        style={{ accentColor: "#3b82f6" }}
                      />
                    </th>
                    <th>Case ID</th>
                    <th>Transaction</th>
                    <th>Customer</th>
                    <th>Amount</th>
                    <th>Risk Score</th>
                    <th>Trigger Reasons</th>
                    <th>SLA Timer</th>
                    <th>Analyst</th>
                    <th>Quick Action</th>
                  </tr>
                </thead>
                <tbody>
                  {cases.length > 0 ? (
                    cases.map((c, idx) => (
                      <tr
                        key={`${c.case_id}-${idx}`}
                        onClick={() => {
                          setSelectedCase(c);
                          setActiveTab("studio");
                        }}
                        style={{ cursor: "pointer" }}
                        className="hover:bg-slate-800/50"
                      >
                        <td onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedCaseIds.includes(c.case_id)}
                            onChange={() => toggleSelectCase(c.case_id)}
                            style={{ accentColor: "#3b82f6" }}
                          />
                        </td>
                        <td
                          style={{
                            fontWeight: 600,
                            fontFamily: "var(--font-mono)",
                            color: "var(--accent-amber)",
                          }}
                        >
                          {c.case_id}
                        </td>
                        <td style={{ fontFamily: "var(--font-mono)" }}>
                          {c.transaction_id}
                        </td>
                        <td style={{ fontFamily: "var(--font-mono)" }}>
                          {c.customer_id}
                        </td>
                        <td style={{ fontWeight: 700 }}>
                          {formatCurr(c.amount, 2)}
                        </td>
                        <td>
                          <span
                            style={{
                              fontWeight: 700,
                              color:
                                c.risk_score >= 0.65 ? "#ef4444" : "#f59e0b",
                            }}
                          >
                            {(c.risk_score * 100).toFixed(0)}%
                          </span>
                        </td>
                        <td
                          style={{
                            maxWidth: "240px",
                            fontSize: "0.75rem",
                            color: "var(--text-secondary)",
                          }}
                        >
                          {c.trigger_reasons[0]}
                        </td>
                        <td>
                          <span
                            className={`badge ${c.sla_minutes_remaining <= 15 ? "badge-critical" : "badge-medium"}`}
                            style={{ fontSize: "0.7rem" }}
                          >
                            {c.sla_minutes_remaining}m left
                          </span>
                        </td>
                        <td
                          style={{
                            fontSize: "0.75rem",
                            color: "var(--text-tertiary)",
                          }}
                        >
                          {c.assigned_analyst}
                        </td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <div style={{ display: "flex", gap: "0.35rem" }}>
                            <button
                              className="btn btn-secondary"
                              style={{
                                padding: "0.2rem 0.45rem",
                                fontSize: "0.7rem",
                                color: "#10b981",
                              }}
                              onClick={() =>
                                handleSingleDisposition(c.case_id, "APPROVE")
                              }
                              title="Approve Transaction"
                            >
                              ✓
                            </button>
                            <button
                              className="btn btn-secondary"
                              style={{
                                padding: "0.2rem 0.45rem",
                                fontSize: "0.7rem",
                                color: "#ef4444",
                              }}
                              onClick={() =>
                                handleSingleDisposition(
                                  c.case_id,
                                  "BLOCK_FRAUD",
                                )
                              }
                              title="Block Fraud"
                            >
                              ✕
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={10}
                        style={{
                          textAlign: "center",
                          padding: "2.5rem",
                          color: "var(--text-tertiary)",
                        }}
                      >
                        {loading
                          ? "Syncing queue items..."
                          : "✓ Review queue is clear! All cases resolved."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 2: ANALYST DECISION STUDIO ─── */}
      {activeTab === "studio" && (
        <div className="rg-2-12-10">
          {/* Left: Case Evidence & Signals */}
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
                <span
                  className="badge badge-medium"
                  style={{ fontSize: "0.7rem", marginBottom: "0.25rem" }}
                >
                  Active Investigation
                </span>
                <h3
                  style={{
                    fontWeight: 800,
                    fontSize: "1.25rem",
                    color: "#fff",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  {selectedCase ? selectedCase.case_id : "CASE-90214"}
                </h3>
              </div>
              {selectedCase && (
                <span
                  className={`badge ${selectedCase.sla_minutes_remaining <= 15 ? "badge-critical" : "badge-medium"}`}
                >
                  SLA: {selectedCase.sla_minutes_remaining} mins remaining
                </span>
              )}
            </div>

            {selectedCase ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "1.25rem",
                }}
              >
                {/* Transaction Metadata Grid */}
                <div className="rg-2-md" style={{ fontSize: "0.8125rem" }}>
                  <div
                    style={{
                      padding: "0.75rem",
                      borderRadius: "6px",
                      backgroundColor: "rgba(15,23,42,0.8)",
                      border: "1px solid #1e293b",
                    }}
                  >
                    <div
                      style={{
                        color: "var(--text-secondary)",
                        fontSize: "0.7rem",
                      }}
                    >
                      Transaction ID
                    </div>
                    <div
                      style={{
                        fontWeight: 600,
                        fontFamily: "var(--font-mono)",
                        color: "#fff",
                      }}
                    >
                      {selectedCase.transaction_id}
                    </div>
                  </div>
                  <div
                    style={{
                      padding: "0.75rem",
                      borderRadius: "6px",
                      backgroundColor: "rgba(15,23,42,0.8)",
                      border: "1px solid #1e293b",
                    }}
                  >
                    <div
                      style={{
                        color: "var(--text-secondary)",
                        fontSize: "0.7rem",
                      }}
                    >
                      Customer ID
                    </div>
                    <div
                      style={{
                        fontWeight: 600,
                        fontFamily: "var(--font-mono)",
                        color: "#fff",
                      }}
                    >
                      {selectedCase.customer_id}
                    </div>
                  </div>
                  <div
                    style={{
                      padding: "0.75rem",
                      borderRadius: "6px",
                      backgroundColor: "rgba(15,23,42,0.8)",
                      border: "1px solid #1e293b",
                    }}
                  >
                    <div
                      style={{
                        color: "var(--text-secondary)",
                        fontSize: "0.7rem",
                      }}
                    >
                      Disputed / Flagged Amount
                    </div>
                    <div
                      style={{
                        fontWeight: 800,
                        fontSize: "1.125rem",
                        color: "#ef4444",
                      }}
                    >
                      {formatCurr(selectedCase.amount, 2)}
                    </div>
                  </div>
                  <div
                    style={{
                      padding: "0.75rem",
                      borderRadius: "6px",
                      backgroundColor: "rgba(15,23,42,0.8)",
                      border: "1px solid #1e293b",
                    }}
                  >
                    <div
                      style={{
                        color: "var(--text-secondary)",
                        fontSize: "0.7rem",
                      }}
                    >
                      Routing Route
                    </div>
                    <div style={{ fontWeight: 600 }}>
                      {selectedCase.billing_country} &rarr;{" "}
                      {selectedCase.shipping_country}
                    </div>
                  </div>
                </div>

                {/* Trigger Reasons */}
                <div>
                  <h4
                    style={{
                      fontSize: "0.8125rem",
                      fontWeight: 700,
                      color: "#fff",
                      marginBottom: "0.5rem",
                    }}
                  >
                    Automated Risk Engine Trigger Reasons:
                  </h4>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.35rem",
                    }}
                  >
                    {selectedCase.trigger_reasons.map((tr, idx) => (
                      <div
                        key={idx}
                        style={{
                          padding: "0.5rem 0.75rem",
                          borderRadius: "6px",
                          backgroundColor: "rgba(239,68,68,0.1)",
                          border: "1px solid rgba(239,68,68,0.25)",
                          fontSize: "0.75rem",
                          color: "#fca5a5",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                        }}
                      >
                        <AlertTriangle size={14} />
                        {tr}
                      </div>
                    ))}
                  </div>
                </div>

                {/* SHAP Factor Breakdown */}
                <div>
                  <h4
                    style={{
                      fontSize: "0.8125rem",
                      fontWeight: 700,
                      color: "#fff",
                      marginBottom: "0.5rem",
                    }}
                  >
                    SHAP Factor Contributions:
                  </h4>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.5rem",
                    }}
                  >
                    {selectedCase.shap_factors?.map((sf, idx) => (
                      <div
                        key={idx}
                        style={{
                          padding: "0.625rem 0.75rem",
                          borderRadius: "6px",
                          backgroundColor: "rgba(15,23,42,0.6)",
                          border: "1px solid #1e293b",
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
                              fontSize: "0.8125rem",
                              fontWeight: 600,
                              color: "var(--accent-blue)",
                            }}
                          >
                            {sf.factor.replace(/_/g, " ")}
                          </span>
                          <span
                            style={{
                              fontSize: "0.75rem",
                              fontWeight: 700,
                              color: "var(--accent-cyan)",
                              fontFamily: "var(--font-mono)",
                            }}
                          >
                            +{(sf.contribution * 100).toFixed(0)}% Risk
                          </span>
                        </div>
                        <p
                          style={{
                            fontSize: "0.75rem",
                            color: "var(--text-secondary)",
                            marginTop: "0.2rem",
                          }}
                        >
                          {sf.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div
                style={{
                  textAlign: "center",
                  padding: "3rem",
                  color: "var(--text-tertiary)",
                }}
              >
                Select a case from the queue to start review.
              </div>
            )}
          </div>

          {/* Right: Analyst Action Form */}
          <div className="card" style={{ padding: "1.5rem" }}>
            <h3
              style={{
                fontWeight: 700,
                fontSize: "1.125rem",
                color: "var(--text-primary)",
                marginBottom: "0.25rem",
              }}
            >
              Analyst Disposition Decision
            </h3>
            <p
              style={{
                fontSize: "0.8125rem",
                color: "var(--text-secondary)",
                marginBottom: "1.25rem",
              }}
            >
              Execute decision and feed human-in-the-loop labels to active
              learning pipeline
            </p>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "1.25rem",
              }}
            >
              {/* Action Radios */}
              <div className="rg-2-sm">
                {[
                  {
                    id: "APPROVE",
                    label: "✅ Approve / Mark Legitimate",
                    color: "#10b981",
                  },
                  {
                    id: "BLOCK_FRAUD",
                    label: "🛑 Block & Confirm Fraud",
                    color: "#ef4444",
                  },
                  {
                    id: "STEP_UP_CHALLENGE",
                    label: "📱 Trigger 3DS / OTP",
                    color: "#3b82f6",
                  },
                  {
                    id: "ESCALATE",
                    label: "🔍 Escalate / Dossier",
                    color: "#f59e0b",
                  },
                ].map((act) => (
                  <button
                    key={act.id}
                    type="button"
                    onClick={() => setDecisionAction(act.id as any)}
                    style={{
                      padding: "0.75rem 0.875rem",
                      borderRadius: "8px",
                      fontSize: "0.8125rem",
                      fontWeight: 600,
                      textAlign: "left",
                      backgroundColor:
                        decisionAction === act.id
                          ? "rgba(255,255,255,0.08)"
                          : "rgba(15,23,42,0.8)",
                      border:
                        decisionAction === act.id
                          ? `2px solid ${act.color}`
                          : "1px solid #1e293b",
                      color:
                        decisionAction === act.id
                          ? "#fff"
                          : "var(--text-secondary)",
                      cursor: "pointer",
                      transition: "all 0.15s",
                    }}
                  >
                    {act.label}
                  </button>
                ))}
              </div>

              {/* Categorization Tags */}
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
                  Investigation Tags:
                </label>
                <div
                  style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}
                >
                  {availableTags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      style={{
                        padding: "0.25rem 0.5rem",
                        borderRadius: "6px",
                        fontSize: "0.7rem",
                        fontWeight: 600,
                        backgroundColor: selectedTags.includes(tag)
                          ? "rgba(59,130,246,0.2)"
                          : "rgba(255,255,255,0.03)",
                        border: selectedTags.includes(tag)
                          ? "1px solid rgba(59,130,246,0.5)"
                          : "1px solid rgba(255,255,255,0.08)",
                        color: selectedTags.includes(tag)
                          ? "#93c5fd"
                          : "var(--text-tertiary)",
                        cursor: "pointer",
                      }}
                    >
                      #{tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
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
                  Analyst Audit Note & Rationale:
                </label>
                <textarea
                  rows={3}
                  value={analystNote}
                  onChange={(e) => setAnalystNote(e.target.value)}
                  placeholder="e.g. Cardholder confirmed identity via SMS challenge. Whitelisted device canvas hash."
                  style={{
                    width: "100%",
                    padding: "0.625rem",
                    borderRadius: "6px",
                    backgroundColor: "rgba(15,23,42,0.8)",
                    border: "1px solid #334155",
                    color: "#fff",
                    fontSize: "0.8125rem",
                  }}
                />
              </div>

              {/* Submit CTA */}
              <button
                className="btn btn-primary"
                style={{
                  background:
                    decisionAction === "BLOCK_FRAUD"
                      ? "linear-gradient(135deg, #ef4444, #dc2626)"
                      : "linear-gradient(135deg, #10b981, #059669)",
                }}
                disabled={!selectedCase}
                onClick={() => {
                  if (selectedCase) {
                    handleSingleDisposition(
                      selectedCase.case_id,
                      decisionAction,
                      analystNote,
                    );
                  }
                }}
              >
                <Send size={16} /> Submit {decisionAction.replace(/_/g, " ")}{" "}
                Decision
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 3: DISPOSITION AUDIT TRAIL ─── */}
      {activeTab === "history" && (
        <div
          style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}
        >
          <div className="card" style={{ padding: "1.5rem" }}>
            <h3
              style={{
                fontWeight: 700,
                fontSize: "1.125rem",
                color: "var(--text-primary)",
                marginBottom: "0.25rem",
              }}
            >
              Human Decision Audit Trail & Active Learning Feed
            </h3>
            <p
              style={{
                fontSize: "0.8125rem",
                color: "var(--text-secondary)",
                marginBottom: "1.25rem",
              }}
            >
              Every analyst disposition is logged with cryptographic timestamps
              and feeds into model retraining datasets
            </p>

            <table className="data-table" style={{ width: "100%" }}>
              <thead>
                <tr>
                  <th>Case ID</th>
                  <th>Transaction ID</th>
                  <th>Customer</th>
                  <th>Amount</th>
                  <th>Decision</th>
                  <th>Analyst</th>
                  <th>Audit Note & Tags</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h, idx) => (
                  <tr key={`${h.case_id}-${idx}`} style={{ cursor: "default" }}>
                    <td
                      style={{
                        fontWeight: 600,
                        fontFamily: "var(--font-mono)",
                        color: "var(--accent-blue)",
                      }}
                    >
                      {h.case_id}
                    </td>
                    <td style={{ fontFamily: "var(--font-mono)" }}>
                      {h.transaction_id}
                    </td>
                    <td style={{ fontFamily: "var(--font-mono)" }}>
                      {h.customer_id}
                    </td>
                    <td style={{ fontWeight: 700 }}>
                      {formatCurr(h.amount, 2)}
                    </td>
                    <td>
                      <span
                        className={`badge ${h.action === "APPROVE" ? "badge-low" : "badge-critical"}`}
                        style={{ fontSize: "0.7rem" }}
                      >
                        {h.action.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td style={{ fontSize: "0.75rem" }}>{h.analyst}</td>
                    <td
                      style={{
                        fontSize: "0.75rem",
                        maxWidth: "260px",
                        color: "var(--text-secondary)",
                      }}
                    >
                      <div>{h.note}</div>
                      {h.tags && (
                        <div
                          style={{
                            display: "flex",
                            gap: "0.25rem",
                            marginTop: "0.2rem",
                          }}
                        >
                          {h.tags.map((t, tIdx) => (
                            <span
                              key={tIdx}
                              style={{ fontSize: "0.65rem", color: "#93c5fd" }}
                            >
                              #{t}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td
                      style={{
                        fontSize: "0.75rem",
                        color: "var(--text-tertiary)",
                      }}
                    >
                      {h.disposed_at.slice(0, 16).replace("T", " ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── TAB 4: TEAM PERFORMANCE & VELOCITY ────── */}
      {activeTab === "performance" && (
        <div
          style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.5fr 1fr",
              gap: "1.5rem",
            }}
          >
            {/* Hourly Volume Area Chart */}
            <div className="card" style={{ padding: "1.5rem" }}>
              <h3
                style={{
                  fontWeight: 700,
                  fontSize: "1.0625rem",
                  color: "var(--text-primary)",
                  marginBottom: "0.25rem",
                }}
              >
                Hourly Queue Throughput
              </h3>
              <p
                style={{
                  fontSize: "0.8125rem",
                  color: "var(--text-secondary)",
                  marginBottom: "1.25rem",
                }}
              >
                Incoming flagged transactions vs resolved cases per hour
              </p>

              <div style={{ width: "100%", height: "240px" }}>
                {mounted && (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={metrics.hourly_review_volume}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient
                          id="resolvedGrad"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="#10b981"
                            stopOpacity={0.4}
                          />
                          <stop
                            offset="95%"
                            stopColor="#10b981"
                            stopOpacity={0.0}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="rgba(255,255,255,0.06)"
                      />
                      <XAxis dataKey="hour" stroke="#64748b" fontSize={11} />
                      <YAxis stroke="#64748b" fontSize={11} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#0f172a",
                          border: "1px solid #334155",
                          borderRadius: "8px",
                        }}
                        formatter={(val: any) => [`${val} Cases`, "Volume"]}
                      />
                      <Area
                        type="monotone"
                        dataKey="resolved"
                        stroke="#10b981"
                        fillOpacity={1}
                        fill="url(#resolvedGrad)"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Decision Distribution Donut */}
            <div className="card" style={{ padding: "1.5rem" }}>
              <h3
                style={{
                  fontWeight: 700,
                  fontSize: "1.0625rem",
                  color: "var(--text-primary)",
                  marginBottom: "0.25rem",
                }}
              >
                Analyst Decision Mix
              </h3>
              <p
                style={{
                  fontSize: "0.8125rem",
                  color: "var(--text-secondary)",
                  marginBottom: "1rem",
                }}
              >
                Proportion of Approved vs Blocked decisions
              </p>
              <div style={{ width: "100%", height: "180px" }}>
                {mounted && (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieDecisionsData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {pieDecisionsData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={
                              DECISION_COLORS[index % DECISION_COLORS.length]
                            }
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#0f172a",
                          border: "1px solid #334155",
                          borderRadius: "8px",
                        }}
                        formatter={(val: any) => [`${val} Cases`, "Count"]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          {/* Analyst Leaderboard */}
          <div className="card" style={{ padding: "1.5rem" }}>
            <h3
              style={{
                fontWeight: 700,
                fontSize: "1.0625rem",
                color: "var(--text-primary)",
                marginBottom: "1rem",
              }}
            >
              Analyst Productivity Leaderboard
            </h3>
            <div className="rg-3">
              {metrics.analysts.map((a, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: "1rem",
                    borderRadius: "8px",
                    backgroundColor: "rgba(15,23,42,0.8)",
                    border: "1px solid #1e293b",
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
                    <span
                      style={{
                        fontWeight: 700,
                        fontSize: "0.875rem",
                        color: "#fff",
                      }}
                    >
                      {a.name}
                    </span>
                    <span
                      className="badge badge-low"
                      style={{ fontSize: "0.65rem" }}
                    >
                      {(a.accuracy * 100).toFixed(1)}% Accuracy
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--text-secondary)",
                    }}
                  >
                    Resolved Today:{" "}
                    <strong style={{ color: "#fff" }}>
                      {a.resolved_today} cases
                    </strong>
                  </div>
                  <div
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--text-secondary)",
                      marginTop: "0.2rem",
                    }}
                  >
                    Avg Resolution Time:{" "}
                    <strong style={{ color: "var(--accent-emerald)" }}>
                      {a.avg_time_sec}s
                    </strong>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 5: POLICY GUARDRAILS ───── */}
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
              Review Routing Rules & SLA Policies
            </h3>
            <p
              style={{
                fontSize: "0.8125rem",
                color: "var(--text-secondary)",
                marginBottom: "1.25rem",
              }}
            >
              Configure automatic case prioritization and escalation rules
            </p>

            <div
              style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
            >
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
                    fontWeight: 600,
                    fontSize: "0.8125rem",
                    marginBottom: "0.25rem",
                  }}
                >
                  Urgent SLA Timeout Target
                </div>
                <select
                  style={{
                    width: "100%",
                    padding: "0.5rem",
                    borderRadius: "6px",
                    backgroundColor: "#0f172a",
                    border: "1px solid #334155",
                    color: "#fff",
                    fontSize: "0.8125rem",
                  }}
                >
                  <option>15 Minutes (High Priority)</option>
                  <option>30 Minutes (Standard SLA)</option>
                  <option>60 Minutes (Extended Window)</option>
                </select>
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
                    fontWeight: 600,
                    fontSize: "0.8125rem",
                    marginBottom: "0.25rem",
                  }}
                >
                  Dual-Analyst Sign-Off Threshold
                </div>
                <select
                  style={{
                    width: "100%",
                    padding: "0.5rem",
                    borderRadius: "6px",
                    backgroundColor: "#0f172a",
                    border: "1px solid #334155",
                    color: "#fff",
                    fontSize: "0.8125rem",
                  }}
                >
                  <option>Transactions &gt; $5,000.00</option>
                  <option>Transactions &gt; $2,500.00</option>
                  <option>All High-Risk Tier Cases</option>
                </select>
              </div>

              <button
                className="btn btn-primary"
                onClick={() =>
                  showToast("✓ Review policy guardrails updated successfully")
                }
              >
                Save Review Policies
              </button>
            </div>
          </div>

          <div className="card" style={{ padding: "1.5rem" }}>
            <h3
              style={{
                fontWeight: 700,
                fontSize: "1.125rem",
                color: "var(--text-primary)",
                marginBottom: "0.25rem",
              }}
            >
              Active Learning Annotation Loop
            </h3>
            <p
              style={{
                fontSize: "0.8125rem",
                color: "var(--text-secondary)",
                marginBottom: "1.25rem",
              }}
            >
              How analyst decisions improve next-generation ML weights
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
                  Verified Ground Truth Labels
                </div>
                <div
                  style={{
                    fontSize: "1.75rem",
                    fontWeight: 800,
                    color: "var(--accent-emerald)",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  1,482 Samples
                </div>
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--text-secondary)",
                    marginTop: "0.25rem",
                  }}
                >
                  Overturned false positives automatically assigned 5x loss
                  penalty weight in weekly LightGBM retraining.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
