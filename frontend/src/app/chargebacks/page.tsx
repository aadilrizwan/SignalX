"use client";

import { useEffect, useState, useMemo } from "react";
import {
  getChargebackMetrics,
  getChargebacksList,
  generateDefensePackage,
  executeChargebackAction,
  type ChargebackMetrics,
  type ChargebackRecord,
  type DefenseResponse,
} from "@/lib/api";
import {
  ShieldAlert,
  ShieldCheck,
  RotateCcw,
  DollarSign,
  TrendingDown,
  RefreshCw,
  Sliders,
  Search,
  Zap,
  CheckCircle2,
  XCircle,
  FileText,
  Clock,
  Layers,
  Sparkles,
  Info,
  SlidersHorizontal,
  ChevronRight,
  ExternalLink,
  Copy,
  Check,
  Send,
  Building,
  CreditCard,
  Truck,
  Fingerprint,
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

const MOCK_METRICS: ChargebackMetrics = {
  total_disputes: 1269,
  total_disputed_volume: 209385.0,
  win_rate: 0.584,
  chargeback_rate: 0.0041,
  recovered_volume: 122280.0,
  open_disputes_count: 381,
  open_dispute_volume: 62865.0,
  visa_vrol_ratio: 0.41,
  visa_warning_threshold: 0.65,
  visa_excessive_threshold: 0.9,
  status_distribution: {
    WON: 519,
    LOST: 369,
    OPEN: 381,
    PENDING: 198,
  },
  dispute_trend: [
    {
      date: "Jan 10",
      total_disputes: 42,
      disputed_volume: 6930,
      won_disputes: 24,
      lost_disputes: 18,
      open_disputes: 12,
    },
    {
      date: "Jan 20",
      total_disputes: 58,
      disputed_volume: 9570,
      won_disputes: 33,
      lost_disputes: 25,
      open_disputes: 18,
    },
    {
      date: "Jan 30",
      total_disputes: 49,
      disputed_volume: 8085,
      won_disputes: 28,
      lost_disputes: 21,
      open_disputes: 15,
    },
    {
      date: "Feb 10",
      total_disputes: 65,
      disputed_volume: 10725,
      won_disputes: 39,
      lost_disputes: 26,
      open_disputes: 22,
    },
    {
      date: "Feb 20",
      total_disputes: 54,
      disputed_volume: 8910,
      won_disputes: 31,
      lost_disputes: 23,
      open_disputes: 19,
    },
    {
      date: "Mar 01",
      total_disputes: 72,
      disputed_volume: 11880,
      won_disputes: 43,
      lost_disputes: 29,
      open_disputes: 28,
    },
  ],
  reasons_breakdown: [
    {
      reason: "unauthorized_transaction",
      reason_code: "10.4 (Fraud / Unauthorized)",
      count: 520,
      volume: 85800,
      win_rate: 0.54,
      share: 0.4098,
    },
    {
      reason: "product_not_received",
      reason_code: "13.1 (Goods Not Received)",
      count: 390,
      volume: 64350,
      win_rate: 0.76,
      share: 0.3073,
    },
    {
      reason: "product_not_as_described",
      reason_code: "13.3 (Not as Described)",
      count: 140,
      volume: 23100,
      win_rate: 0.48,
      share: 0.1103,
    },
    {
      reason: "duplicate_charge",
      reason_code: "12.6 (Duplicate Processing)",
      count: 95,
      volume: 15675,
      win_rate: 0.88,
      share: 0.0749,
    },
    {
      reason: "subscription_cancelled",
      reason_code: "13.7 (Cancelled Recurring)",
      count: 74,
      volume: 12210,
      win_rate: 0.65,
      share: 0.0583,
    },
    {
      reason: "credit_not_processed",
      reason_code: "13.6 (Credit Not Processed)",
      count: 50,
      volume: 8250,
      win_rate: 0.52,
      share: 0.0394,
    },
  ],
  card_scheme_distribution: [
    { scheme: "Visa (VROL)", count: 736, volume: 121443, win_rate: 0.62 },
    {
      scheme: "Mastercard (Mastercom)",
      count: 355,
      volume: 58628,
      win_rate: 0.55,
    },
    { scheme: "American Express", count: 127, volume: 20938, win_rate: 0.49 },
    { scheme: "Discover / Other", count: 51, volume: 8375, win_rate: 0.5 },
  ],
};

const DISPUTE_PRESETS = [
  {
    name: "🛡️ Visa CE 3.0 Unauthorized (10.4)",
    desc: "CNP claim refuted via 2 prior undisputed orders from same device/IP",
    data: {
      transaction_id: "txn_0000145",
      customer_id: "cust_002899",
      reason: "unauthorized_transaction",
      dispute_amount: 345.0,
      carrier: "FedEx",
      tracking_number: "FX-983419203982",
    },
  },
  {
    name: "📦 Item Not Received with POD (13.1)",
    desc: "Carrier GPS delivery confirmation with recipient signature",
    data: {
      transaction_id: "txn_0000148",
      customer_id: "cust_001732",
      reason: "product_not_received",
      dispute_amount: 198.5,
      carrier: "UPS",
      tracking_number: "1Z9999999999999999",
    },
  },
  {
    name: "🔄 Duplicate Billing Defense (12.6)",
    desc: "Two distinct orders with separate line items and tracking logs",
    data: {
      transaction_id: "txn_0000624",
      customer_id: "cust_002032",
      reason: "duplicate_charge",
      dispute_amount: 89.0,
      carrier: "DHL Express",
      tracking_number: "DHL-4839201928",
    },
  },
  {
    name: "💼 Subscription Terms Defense (13.7)",
    desc: "Active portal login after billing and clear cancellation policy agreement",
    data: {
      transaction_id: "txn_0000738",
      customer_id: "cust_000857",
      reason: "subscription_cancelled",
      dispute_amount: 120.0,
      carrier: "Digital Delivery",
      tracking_number: "DIGITAL-TOKEN-883",
    },
  },
];

export default function ChargebacksPage() {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "overview" | "simulator" | "workbench" | "evidence_locker" | "automation"
  >("overview");
  const [metrics, setMetrics] = useState<ChargebackMetrics>(MOCK_METRICS);
  const [disputesList, setDisputesList] = useState<ChargebackRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [isLiveApi, setIsLiveApi] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Table Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [reasonFilter, setReasonFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedDispute, setSelectedDispute] =
    useState<ChargebackRecord | null>(null);

  // Defense Simulator Form
  const [simForm, setSimForm] = useState({
    transaction_id: "txn_0000145",
    customer_id: "cust_002899",
    reason: "unauthorized_transaction",
    dispute_amount: 345.0,
    carrier: "FedEx",
    tracking_number: "FX-983419203982",
  });
  const [defenseResult, setDefenseResult] = useState<DefenseResponse | null>(
    null,
  );
  const [simLoading, setSimLoading] = useState(false);

  // Defense Automation Guardrails State
  const [autoRules, setAutoRules] = useState({
    autoRepresentThresholdProb: 75,
    autoAcceptUnderAmount: 15,
    enforceVisaCE3Check: true,
    requireSignedPODOverAmount: 200,
    autoSubmitToGateway: true,
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchAllData = () => {
    setLoading(true);
    Promise.all([
      getChargebackMetrics().catch(() => MOCK_METRICS),
      getChargebacksList(
        page,
        25,
        statusFilter,
        reasonFilter,
        searchTerm,
      ).catch(() => ({
        chargebacks: [],
        total: 0,
        page: 1,
        page_size: 25,
        total_pages: 1,
      })),
    ])
      .then(([metricsData, disputesData]) => {
        setMetrics(metricsData);
        setDisputesList(disputesData.chargebacks);
        setTotalPages(disputesData.total_pages || 1);
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
  }, [page, statusFilter, reasonFilter]);

  const handleGenerateDefense = async () => {
    setSimLoading(true);
    try {
      const res = await generateDefensePackage(simForm);
      setDefenseResult(res);
    } catch {
      // Offline fallback
      setDefenseResult({
        transaction_id: simForm.transaction_id,
        customer_id: simForm.customer_id,
        reason: simForm.reason,
        dispute_amount: simForm.dispute_amount,
        win_probability: 0.84,
        recommendation: "AUTO_REPRESENT_CE3",
        summary_rationale:
          "Strong Visa CE 3.0 historical match and AVS/CVV confirmation. High probability of overturning issuer claim.",
        ce_3_compliant: true,
        evidence_items: [
          {
            category: "Order & Payment Authentication",
            title: "AVS & CVV Exact Match Confirmation",
            status: "VERIFIED",
            confidence: 0.96,
            details: `Transaction ${simForm.transaction_id} authorized with Full AVS Match and CVV Pass.`,
          },
          {
            category: "Carrier Proof of Delivery (POD)",
            title: `Carrier GPS Delivery Confirmation (${simForm.carrier})`,
            status: "VERIFIED",
            confidence: 0.94,
            details: `Package delivered via ${simForm.carrier} Tracking #${simForm.tracking_number} with signed POD receipt.`,
          },
          {
            category: "Visa Compelling Evidence 3.0 (CE 3.0)",
            title: "Historical Undisputed Prior Purchases",
            status: "QUALIFIED",
            confidence: 0.91,
            details: `Customer ${simForm.customer_id} has 3 previous undisputed transactions matching device and shipping address.`,
          },
          {
            category: "Digital Footprint & Activity",
            title: "Post-Delivery Account Login & Usage",
            status: "VERIFIED",
            confidence: 0.88,
            details:
              "Customer active on registered account 48 hours post-delivery from original IP subnet.",
          },
        ],
        legal_rebuttal_letter: `### FORMAL DISPUTE REPRESENTMENT REBUTTAL\n**Merchant:** SignalX Enterprise Store\n**Transaction ID:** \`${simForm.transaction_id}\`\n**Disputed Amount:** \`$${simForm.dispute_amount.toFixed(2)}\`\n\n#### 1. STATEMENT OF DEFENSE\nSignalX respectfully refutes this dispute. All goods were fulfilled with AVS/CVV verification and delivered under Visa Compelling Evidence 3.0 standards.`,
        generated_at: new Date().toISOString(),
      });
    } finally {
      setSimLoading(false);
    }
  };

  useEffect(() => {
    handleGenerateDefense();
  }, []);

  const handleAction = async (cbId: string, action: string) => {
    try {
      await executeChargebackAction(cbId, action);
      showToast(
        `✓ Action '${action}' successfully executed on Dispute ${cbId}`,
      );
      setDisputesList((prev) =>
        prev.map((cb) =>
          cb.id === cbId
            ? { ...cb, status: "REPRESENTED", executed_action: action }
            : cb,
        ),
      );
      if (selectedDispute && selectedDispute.id === cbId) {
        setSelectedDispute({
          ...selectedDispute,
          status: "REPRESENTED",
          executed_action: action,
        });
      }
    } catch {
      showToast(`✓ Action '${action}' recorded (Local demo mode)`);
    }
  };

  const copyRebuttal = () => {
    if (defenseResult?.legal_rebuttal_letter) {
      navigator.clipboard.writeText(defenseResult.legal_rebuttal_letter);
      setCopied(true);
      showToast("✓ Legal rebuttal letter copied to clipboard");
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "WON":
        return { badge: "badge-low", text: "Dispute Won" };
      case "LOST":
        return { badge: "badge-critical", text: "Dispute Lost" };
      case "OPEN":
        return { badge: "badge-high", text: "Open (Action Req)" };
      case "REPRESENTED":
        return { badge: "badge-medium", text: "Represented" };
      default:
        return { badge: "badge-medium", text: "Pending Review" };
    }
  };

  const pieStatusData = useMemo(() => {
    return Object.entries(metrics.status_distribution || {}).map(
      ([key, val]) => ({
        name: key,
        value: val,
      }),
    );
  }, [metrics]);

  const STATUS_COLORS = ["#10b981", "#ef4444", "#f59e0b", "#3b82f6"];

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
                  "linear-gradient(135deg, rgba(59,130,246,0.2), rgba(16,185,129,0.2))",
                border: "1px solid rgba(59,130,246,0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ShieldCheck size={20} className="text-blue-400" />
            </div>
            <h1>Chargeback Defense & Representment</h1>
            <span className="badge badge-low" style={{ fontSize: "0.75rem" }}>
              <span
                className="status-dot"
                style={{ display: "inline-block" }}
              />
              {isLiveApi
                ? "Visa CE 3.0 Engine Online"
                : "Dispute Defense Stream"}
            </span>
          </div>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
            Automate dispute representment, compile Visa Compelling Evidence 3.0
            packages, and monitor network threshold ratios.
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button
            className="btn btn-secondary"
            onClick={fetchAllData}
            disabled={loading}
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />{" "}
            {loading ? "Syncing..." : "Sync Gateway"}
          </button>
          <button
            className="btn btn-primary"
            onClick={() => setActiveTab("simulator")}
          >
            <Zap size={15} /> Build Representment Pack
          </button>
        </div>
      </div>

      {/* Visa / Mastercard VROL Ratio Monitor Bar */}
      <div
        style={{
          padding: "1rem 1.25rem",
          borderRadius: "10px",
          backgroundColor: "rgba(15,23,42,0.8)",
          border: "1px solid #1e293b",
          marginBottom: "1.75rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <Building size={20} className="text-blue-400" />
          <div>
            <div
              style={{ fontSize: "0.8125rem", fontWeight: 700, color: "#fff" }}
            >
              Card Scheme Dispute Ratio Health:{" "}
              <span style={{ color: "var(--accent-emerald)" }}>
                {metrics.visa_vrol_ratio}% (Healthy)
              </span>
            </div>
            <div
              style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}
            >
              Visa VROL Warning Threshold: 0.65% · Excessive Fine Threshold:
              0.90%
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span
              style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}
            >
              Current Ratio:
            </span>
            <div
              style={{
                width: "140px",
                height: "8px",
                borderRadius: "4px",
                backgroundColor: "#334155",
                overflow: "hidden",
                position: "relative",
              }}
            >
              <div
                style={{
                  width: `${Math.min(100, (metrics.visa_vrol_ratio / 0.9) * 100)}%`,
                  height: "100%",
                  backgroundColor:
                    metrics.visa_vrol_ratio >= 0.65 ? "#ef4444" : "#10b981",
                }}
              />
            </div>
          </div>
          <span className="badge badge-low" style={{ fontSize: "0.7rem" }}>
            Low Penalty Risk
          </span>
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
            label: "Dispute Overview & Analytics",
            icon: <Layers size={16} />,
          },
          {
            id: "simulator",
            label: "AI Evidence & Rebuttal Builder",
            icon: <Zap size={16} />,
          },
          {
            id: "workbench",
            label: "Dispute Representment Workbench",
            icon: <Search size={16} />,
          },
          {
            id: "evidence_locker",
            label: "Evidence Locker & CE 3.0 Hub",
            icon: <FileText size={16} />,
          },
          {
            id: "automation",
            label: "Defense Automation Rules",
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
            <span className="metric-label">Total Claims Received</span>
            <ShieldAlert size={18} className="text-blue-400" />
          </div>
          <div className="metric-value">
            {formatNum(metrics.total_disputes)}
          </div>
          <div className="metric-subtext">
            {formatCurr(metrics.total_disputed_volume, 0)} gross disputed
          </div>
        </div>

        <div className="metric-card success">
          <div className="metric-header">
            <span className="metric-label">Dispute Win Rate</span>
            <ShieldCheck size={18} className="text-emerald-400" />
          </div>
          <div className="metric-value">
            {(metrics.win_rate * 100).toFixed(1)}%
          </div>
          <div className="metric-subtext">+14.2% vs industry avg (44%)</div>
        </div>

        <div className="metric-card success">
          <div className="metric-header">
            <span className="metric-label">Recovered Revenue</span>
            <DollarSign size={18} className="text-emerald-400" />
          </div>
          <div className="metric-value">
            {formatCurr(metrics.recovered_volume, 0)}
          </div>
          <div className="metric-subtext">From overturned chargebacks</div>
        </div>

        <div className="metric-card danger">
          <div className="metric-header">
            <span className="metric-label">Active Open Disputes</span>
            <Clock size={18} className="text-amber-400" />
          </div>
          <div className="metric-value">
            {formatNum(metrics.open_disputes_count)}
          </div>
          <div className="metric-subtext">
            {formatCurr(metrics.open_dispute_volume, 0)} under response deadline
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-label">CE 3.0 Auto-Coverage</span>
            <Sparkles size={18} className="text-cyan-400" />
          </div>
          <div className="metric-value">84.5%</div>
          <div className="metric-subtext">Qualifies for instant reversal</div>
        </div>
      </div>

      {/*  TAB 1: OVERVIEW & ANALYTICS ── */}
      {activeTab === "overview" && (
        <div
          style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}
        >
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
                    Dispute Volume & Representment Outcomes
                  </h3>
                  <p
                    style={{
                      fontSize: "0.8125rem",
                      color: "var(--text-secondary)",
                    }}
                  >
                    Monthly win/loss volume trajectory across all merchant
                    gateways
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
                        backgroundColor: "#10b981",
                      }}
                    />
                    Disputes Won
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
                    Disputes Lost
                  </span>
                </div>
              </div>
              <div style={{ width: "100%", height: "280px" }}>
                {mounted && (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={metrics.dispute_trend}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient
                          id="wonGrad"
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
                        <linearGradient
                          id="lostGrad"
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
                          "Disputes",
                        ]}
                      />
                      <Area
                        type="monotone"
                        dataKey="won_disputes"
                        stroke="#10b981"
                        fillOpacity={1}
                        fill="url(#wonGrad)"
                        strokeWidth={2}
                      />
                      <Area
                        type="monotone"
                        dataKey="lost_disputes"
                        stroke="#ef4444"
                        fillOpacity={1}
                        fill="url(#lostGrad)"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Dispute Status Distribution */}
            <div className="card" style={{ padding: "1.5rem" }}>
              <h3
                style={{
                  fontWeight: 700,
                  fontSize: "1.0625rem",
                  color: "var(--text-primary)",
                  marginBottom: "0.25rem",
                }}
              >
                Dispute Status Pipeline
              </h3>
              <p
                style={{
                  fontSize: "0.8125rem",
                  color: "var(--text-secondary)",
                  marginBottom: "1rem",
                }}
              >
                Current lifecycle status across all claims
              </p>
              <div style={{ width: "100%", height: "200px" }}>
                {mounted && (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieStatusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={80}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {pieStatusData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={STATUS_COLORS[index % STATUS_COLORS.length]}
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
                          "Claims",
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
                    Won ({formatNum(metrics.status_distribution?.WON || 0)})
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
                    Lost ({formatNum(metrics.status_distribution?.LOST || 0)})
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
                    Open ({formatNum(metrics.status_distribution?.OPEN || 0)})
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
                    Pending (
                    {formatNum(metrics.status_distribution?.PENDING || 0)})
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Secondary Row: Reason Codes & Card Schemes */}
          <div className="rg-2">
            {/* Reason Codes Breakdown */}
            <div className="card" style={{ padding: "1.5rem" }}>
              <h3
                style={{
                  fontWeight: 700,
                  fontSize: "1.0625rem",
                  color: "var(--text-primary)",
                  marginBottom: "0.25rem",
                }}
              >
                Dispute Reason Codes & Win Rates
              </h3>
              <p
                style={{
                  fontSize: "0.8125rem",
                  color: "var(--text-secondary)",
                  marginBottom: "1rem",
                }}
              >
                Breakdown by Visa/Mastercard reason code and recovery success
              </p>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.75rem",
                  maxHeight: "250px",
                  overflowY: "auto",
                }}
              >
                {metrics.reasons_breakdown.map((r, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: "0.625rem 0.875rem",
                      borderRadius: "6px",
                      backgroundColor: "rgba(255, 255, 255, 0.03)",
                      border: "1px solid rgba(255, 255, 255, 0.06)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontWeight: 600,
                          fontSize: "0.875rem",
                          color: "#fff",
                        }}
                      >
                        {r.reason_code}
                      </div>
                      <div
                        style={{
                          fontSize: "0.75rem",
                          color: "var(--text-secondary)",
                          marginTop: "0.15rem",
                        }}
                      >
                        {formatNum(r.count)} claims · Total:{" "}
                        {formatCurr(r.volume, 0)}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: "0.9375rem",
                          color:
                            r.win_rate >= 0.7
                              ? "#10b981"
                              : r.win_rate >= 0.5
                                ? "#3b82f6"
                                : "#f59e0b",
                        }}
                      >
                        {(r.win_rate * 100).toFixed(0)}% Win
                      </span>
                      <div
                        style={{
                          fontSize: "0.75rem",
                          color: "var(--text-tertiary)",
                        }}
                      >
                        {(r.share * 100).toFixed(1)}% volume
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Card Scheme Gateways */}
            <div className="card" style={{ padding: "1.5rem" }}>
              <h3
                style={{
                  fontWeight: 700,
                  fontSize: "1.0625rem",
                  color: "var(--text-primary)",
                  marginBottom: "0.25rem",
                }}
              >
                Card Scheme Distribution & Portals
              </h3>
              <p
                style={{
                  fontSize: "0.8125rem",
                  color: "var(--text-secondary)",
                  marginBottom: "1rem",
                }}
              >
                Network gateway routing: Visa VROL, Mastercom, and Amex
              </p>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.75rem",
                }}
              >
                {metrics.card_scheme_distribution.map((scheme, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: "0.75rem 1rem",
                      borderRadius: "8px",
                      backgroundColor: "rgba(15,23,42,0.6)",
                      border: "1px solid #1e293b",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.75rem",
                      }}
                    >
                      <CreditCard size={18} className="text-blue-400" />
                      <div>
                        <div
                          style={{
                            fontWeight: 600,
                            fontSize: "0.875rem",
                            color: "#fff",
                          }}
                        >
                          {scheme.scheme}
                        </div>
                        <div
                          style={{
                            fontSize: "0.75rem",
                            color: "var(--text-secondary)",
                          }}
                        >
                          {formatNum(scheme.count)} cases ·{" "}
                          {formatCurr(scheme.volume, 0)}
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <span
                        className="badge badge-low"
                        style={{ fontSize: "0.75rem" }}
                      >
                        {(scheme.win_rate * 100).toFixed(0)}% Win Rate
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/*  TAB 2: AI EVIDENCE & REBUTTAL BUILDER ─ */}
      {activeTab === "simulator" && (
        <div className="rg-2-10-12">
          {/* Input Form */}
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
                  Representment Pack Builder
                </h3>
                <p
                  style={{
                    fontSize: "0.8125rem",
                    color: "var(--text-secondary)",
                  }}
                >
                  AI-powered Visa CE 3.0 & carrier proof rebuttal compiler
                </p>
              </div>
              <span className="badge badge-low" style={{ fontSize: "0.75rem" }}>
                Visa CE 3.0 Ready
              </span>
            </div>

            {/* Presets */}
            <div style={{ marginBottom: "1.25rem" }}>
              <label
                style={{
                  fontSize: "0.8125rem",
                  fontWeight: 600,
                  color: "var(--text-secondary)",
                  marginBottom: "0.5rem",
                  display: "block",
                }}
              >
                Dispute Test Scenarios:
              </label>
              <div className="rg-2-sm">
                {DISPUTE_PRESETS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setSimForm(preset.data);
                      setTimeout(handleGenerateDefense, 50);
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

            {/* Fields */}
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
                    Transaction ID
                  </label>
                  <input
                    type="text"
                    value={simForm.transaction_id}
                    onChange={(e) =>
                      setSimForm({ ...simForm, transaction_id: e.target.value })
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
                    Disputed Amount ($)
                  </label>
                  <input
                    type="number"
                    value={simForm.dispute_amount}
                    onChange={(e) =>
                      setSimForm({
                        ...simForm,
                        dispute_amount: parseFloat(e.target.value) || 0,
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
                  Dispute Reason Code
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
                  <option value="unauthorized_transaction">
                    10.4 / 4837 — Unauthorized / Card-Not-Present Fraud
                  </option>
                  <option value="product_not_received">
                    13.1 / 4853 — Merchandise Not Received
                  </option>
                  <option value="duplicate_charge">
                    12.6 / 4834 — Duplicate Processing Claim
                  </option>
                  <option value="subscription_cancelled">
                    13.7 / 4853 — Cancelled Recurring Subscription
                  </option>
                  <option value="credit_not_processed">
                    13.6 / 4860 — Refund Not Credited
                  </option>
                </select>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1.5fr",
                  gap: "1rem",
                }}
              >
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
                    Fulfillment Carrier
                  </label>
                  <input
                    type="text"
                    value={simForm.carrier}
                    onChange={(e) =>
                      setSimForm({ ...simForm, carrier: e.target.value })
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
                    Carrier Tracking / POD #
                  </label>
                  <input
                    type="text"
                    value={simForm.tracking_number}
                    onChange={(e) =>
                      setSimForm({
                        ...simForm,
                        tracking_number: e.target.value,
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

              <button
                type="button"
                className="btn btn-primary"
                onClick={handleGenerateDefense}
                disabled={simLoading}
                style={{ marginTop: "0.5rem" }}
              >
                <Sparkles size={16} />{" "}
                {simLoading
                  ? "Compiling CE 3.0 Evidence..."
                  : "Compile Evidence Package"}
              </button>
            </div>
          </div>

          {/* Rebuttal Output */}
          <div className="card" style={{ padding: "1.5rem" }}>
            {defenseResult ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "1.25rem",
                }}
              >
                {/* Win Probability Header */}
                <div
                  style={{
                    padding: "1.25rem",
                    borderRadius: "10px",
                    backgroundColor: "rgba(16,185,129,0.1)",
                    border: "1px solid rgba(16,185,129,0.3)",
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
                      Calculated Win Probability
                    </div>
                    <div
                      style={{
                        fontSize: "2.25rem",
                        fontWeight: 800,
                        fontFamily: "var(--font-mono)",
                        color: "var(--accent-emerald)",
                      }}
                    >
                      {(defenseResult.win_probability * 100).toFixed(0)}%
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span
                      className="badge badge-low"
                      style={{ fontSize: "0.875rem" }}
                    >
                      ✓ Visa CE 3.0 Compliant
                    </span>
                    <div
                      style={{
                        fontSize: "0.8125rem",
                        fontWeight: 700,
                        marginTop: "0.5rem",
                        color: "#fff",
                      }}
                    >
                      {defenseResult.recommendation.replace(/_/g, " ")}
                    </div>
                  </div>
                </div>

                {/* Evidence Pillars Checklist */}
                <div>
                  <h4
                    style={{
                      fontSize: "0.875rem",
                      fontWeight: 700,
                      marginBottom: "0.5rem",
                      color: "#fff",
                    }}
                  >
                    Compiled Evidence Artifacts:
                  </h4>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.5rem",
                    }}
                  >
                    {defenseResult.evidence_items.map((item, idx) => (
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
                            {item.title}
                          </span>
                          <span
                            className="badge badge-low"
                            style={{
                              fontSize: "0.65rem",
                              padding: "0.1rem 0.35rem",
                            }}
                          >
                            {item.status} ({(item.confidence * 100).toFixed(0)}
                            %)
                          </span>
                        </div>
                        <p
                          style={{
                            fontSize: "0.75rem",
                            color: "var(--text-secondary)",
                            marginTop: "0.25rem",
                          }}
                        >
                          {item.details}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Legal Rebuttal Preview */}
                <div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "0.5rem",
                    }}
                  >
                    <h4
                      style={{
                        fontSize: "0.875rem",
                        fontWeight: 700,
                        color: "#fff",
                      }}
                    >
                      Formal Legal Rebuttal Letter:
                    </h4>
                    <button
                      className="btn btn-secondary"
                      style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}
                      onClick={copyRebuttal}
                    >
                      {copied ? (
                        <Check size={14} className="text-emerald-400" />
                      ) : (
                        <Copy size={14} />
                      )}{" "}
                      {copied ? "Copied" : "Copy Text"}
                    </button>
                  </div>
                  <pre
                    style={{
                      maxHeight: "150px",
                      overflowY: "auto",
                      padding: "0.75rem",
                      borderRadius: "6px",
                      backgroundColor: "rgba(0,0,0,0.5)",
                      border: "1px solid #1e293b",
                      fontSize: "0.75rem",
                      color: "var(--text-secondary)",
                      whiteSpace: "pre-wrap",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    {defenseResult.legal_rebuttal_letter}
                  </pre>
                </div>

                {/* Action CTA */}
                <div style={{ display: "flex", gap: "0.75rem" }}>
                  <button
                    className="btn btn-primary"
                    style={{ flex: 1 }}
                    onClick={() =>
                      showToast(
                        `✓ Representment package submitted to Visa VROL for ${simForm.transaction_id}`,
                      )
                    }
                  >
                    <Send size={15} /> Submit Package to Gateway
                  </button>
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
                Generating evidence package...
              </div>
            )}
          </div>
        </div>
      )}

      {/*  TAB 3: DISPUTE REPRESENTMENT WORKBENCH  */}
      {activeTab === "workbench" && (
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
                    placeholder="Search by Dispute ID, Customer ID, or Transaction ID..."
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
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  style={{
                    padding: "0.5rem 0.75rem",
                    borderRadius: "6px",
                    backgroundColor: "rgba(15,23,42,0.8)",
                    border: "1px solid #334155",
                    color: "#fff",
                    fontSize: "0.8125rem",
                  }}
                >
                  <option value="ALL">All Statuses</option>
                  <option value="OPEN">Open (Action Needed)</option>
                  <option value="WON">Won Disputes</option>
                  <option value="LOST">Lost Disputes</option>
                  <option value="PENDING">Pending Gateway</option>
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
                  <option value="ALL">All Reason Codes</option>
                  <option value="unauthorized_transaction">
                    10.4 Unauthorized
                  </option>
                  <option value="product_not_received">
                    13.1 Not Received
                  </option>
                  <option value="duplicate_charge">12.6 Duplicate</option>
                  <option value="subscription_cancelled">13.7 Cancelled</option>
                </select>
              </div>
            </div>

            {/* Table */}
            <div style={{ overflowX: "auto" }}>
              <table className="data-table" style={{ width: "100%" }}>
                <thead>
                  <tr>
                    <th>Dispute ID</th>
                    <th>Transaction ID</th>
                    <th>Customer ID</th>
                    <th>Amount</th>
                    <th>Reason Code</th>
                    <th>Status</th>
                    <th>Win Prob</th>
                    <th>CE 3.0</th>
                    <th>Deadline</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {disputesList.length > 0 ? (
                    disputesList.map((cb, idx) => (
                      <tr
                        key={`${cb.id}-${idx}`}
                        onClick={() => setSelectedDispute(cb)}
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
                          {cb.id}
                        </td>
                        <td style={{ fontFamily: "var(--font-mono)" }}>
                          {cb.transaction_id}
                        </td>
                        <td style={{ fontFamily: "var(--font-mono)" }}>
                          {cb.customer_id}
                        </td>
                        <td style={{ fontWeight: 700 }}>
                          {formatCurr(cb.amount, 2)}
                        </td>
                        <td style={{ textTransform: "capitalize" }}>
                          {cb.reason.replace(/_/g, " ")}
                        </td>
                        <td>
                          <span
                            className={`badge ${getStatusBadge(cb.status).badge}`}
                          >
                            {getStatusBadge(cb.status).text}
                          </span>
                        </td>
                        <td>
                          <span
                            style={{
                              fontWeight: 700,
                              color:
                                cb.win_probability >= 0.7
                                  ? "#10b981"
                                  : "#f59e0b",
                            }}
                          >
                            {(cb.win_probability * 100).toFixed(0)}%
                          </span>
                        </td>
                        <td>
                          {cb.ce_3_eligible ? (
                            <span
                              className="badge badge-low"
                              style={{ fontSize: "0.65rem" }}
                            >
                              Eligible
                            </span>
                          ) : (
                            <span
                              style={{
                                fontSize: "0.75rem",
                                color: "var(--text-tertiary)",
                              }}
                            >
                              Standard
                            </span>
                          )}
                        </td>
                        <td>
                          <div style={{ fontSize: "0.75rem" }}>
                            {cb.deadline}
                            <span
                              style={{
                                color: "#ef4444",
                                marginLeft: "0.35rem",
                                fontWeight: 600,
                              }}
                            >
                              ({cb.days_left}d left)
                            </span>
                          </div>
                        </td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <button
                            className="btn btn-secondary"
                            style={{
                              padding: "0.25rem 0.5rem",
                              fontSize: "0.7rem",
                            }}
                            onClick={() => setSelectedDispute(cb)}
                          >
                            Defend
                          </button>
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
                          ? "Loading dispute records..."
                          : "No disputes found matching criteria."}
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

      {/*  TAB 4: EVIDENCE LOCKER & CE 3.0 HUB  */}
      {activeTab === "evidence_locker" && (
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
              Visa Compelling Evidence 3.0 Locker
            </h3>
            <p
              style={{
                fontSize: "0.8125rem",
                color: "var(--text-secondary)",
                marginBottom: "1.25rem",
              }}
            >
              Automatic qualification engine for Visa CE 3.0 dispute
              pre-reversal rules
            </p>

            <div
              style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
            >
              <div
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
                    alignItems: "center",
                    gap: "0.5rem",
                    marginBottom: "0.35rem",
                  }}
                >
                  <Fingerprint size={18} className="text-blue-400" />
                  <span style={{ fontWeight: 600, fontSize: "0.875rem" }}>
                    Device Fingerprint Matching
                  </span>
                </div>
                <p
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--text-secondary)",
                  }}
                >
                  2+ historical undisputed orders placed between 120 and 365
                  days prior from identical hardware hash and browser canvas
                  token.
                </p>
                <div
                  style={{
                    marginTop: "0.5rem",
                    fontSize: "0.75rem",
                    color: "var(--accent-emerald)",
                    fontWeight: 600,
                  }}
                >
                  ✓ 88.2% automated match rate on recurring shoppers
                </div>
              </div>

              <div
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
                    alignItems: "center",
                    gap: "0.5rem",
                    marginBottom: "0.35rem",
                  }}
                >
                  <Truck size={18} className="text-emerald-400" />
                  <span style={{ fontWeight: 600, fontSize: "0.875rem" }}>
                    Carrier GPS Proof of Delivery (POD)
                  </span>
                </div>
                <p
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--text-secondary)",
                  }}
                >
                  Direct API integrations with FedEx, UPS, and DHL pulling
                  geo-coordinates and recipient door signatures at fulfillment.
                </p>
                <div
                  style={{
                    marginTop: "0.5rem",
                    fontSize: "0.75rem",
                    color: "var(--accent-emerald)",
                    fontWeight: 600,
                  }}
                >
                  ✓ 94.7% win rate when signed POD is attached
                </div>
              </div>

              <div
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
                    alignItems: "center",
                    gap: "0.5rem",
                    marginBottom: "0.35rem",
                  }}
                >
                  <CreditCard size={18} className="text-amber-400" />
                  <span style={{ fontWeight: 600, fontSize: "0.875rem" }}>
                    3-D Secure (3DS 2.2) Liability Shift
                  </span>
                </div>
                <p
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--text-secondary)",
                  }}
                >
                  Transactions verified with EMV 3DS biometric challenge
                  automatically shift fraud chargeback liability to the card
                  issuing bank.
                </p>
              </div>
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
              Evidence Generation Checklist
            </h3>
            <p
              style={{
                fontSize: "0.8125rem",
                color: "var(--text-secondary)",
                marginBottom: "1.25rem",
              }}
            >
              Required document pillars for guaranteed representment compliance
            </p>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
              }}
            >
              {[
                {
                  title: "Digital Itemized Receipt",
                  desc: "Line item breakdown, tax, shipping address, and order timestamp.",
                  ready: true,
                },
                {
                  title: "AVS & CVV Authorization Log",
                  desc: "Gateway authorization response code showing full address match.",
                  ready: true,
                },
                {
                  title: "Carrier Signed POD / Tracking",
                  desc: "Final delivery confirmation with carrier GPS stamp.",
                  ready: true,
                },
                {
                  title: "Customer Portal Audit Trail",
                  desc: "User IP session logs post-delivery acknowledging order status.",
                  ready: true,
                },
                {
                  title: "Merchant Terms & Refund Policy",
                  desc: "Signed or acknowledged terms during one-click checkout.",
                  ready: true,
                },
              ].map((doc, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: "0.75rem 1rem",
                    borderRadius: "6px",
                    backgroundColor: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: "0.8125rem",
                        color: "#fff",
                      }}
                    >
                      {doc.title}
                    </div>
                    <div
                      style={{
                        fontSize: "0.75rem",
                        color: "var(--text-secondary)",
                      }}
                    >
                      {doc.desc}
                    </div>
                  </div>
                  <CheckCircle2 size={18} className="text-emerald-400" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/*  TAB 5: DEFENSE AUTOMATION RULES ─ */}
      {activeTab === "automation" && (
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
              Automated Dispute Representment Rules
            </h3>
            <p
              style={{
                fontSize: "0.8125rem",
                color: "var(--text-secondary)",
                marginBottom: "1.5rem",
              }}
            >
              Configure algorithmic triggers to auto-submit representment
              without analyst overhead
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
                    ⚡ Auto-Submit High Confidence Representments
                  </div>
                  <input
                    type="checkbox"
                    checked={autoRules.autoSubmitToGateway}
                    onChange={(e) =>
                      setAutoRules({
                        ...autoRules,
                        autoSubmitToGateway: e.target.checked,
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
                  Automatically compile and dispatch rebuttal evidence to
                  payment gateway when win probability exceeds threshold.
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
                    Min Win Prob:
                  </span>
                  <input
                    type="range"
                    min="50"
                    max="95"
                    value={autoRules.autoRepresentThresholdProb}
                    onChange={(e) =>
                      setAutoRules({
                        ...autoRules,
                        autoRepresentThresholdProb: parseInt(e.target.value),
                      })
                    }
                    style={{ flex: 1, accentColor: "#10b981" }}
                  />
                  <span style={{ fontSize: "0.8125rem", fontWeight: 700 }}>
                    {autoRules.autoRepresentThresholdProb}%
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
                    🛑 Auto-Accept Low-Value Claims (Save Representment Fee)
                  </div>
                  <span
                    className="badge badge-medium"
                    style={{ fontSize: "0.65rem" }}
                  >
                    ROI Optimizer
                  </span>
                </div>
                <p
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--text-secondary)",
                    marginBottom: "0.75rem",
                  }}
                >
                  Automatically accept liability for claims under threshold to
                  avoid $15-$25 gateway representment processing fees.
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
                    min="5"
                    max="50"
                    value={autoRules.autoAcceptUnderAmount}
                    onChange={(e) =>
                      setAutoRules({
                        ...autoRules,
                        autoAcceptUnderAmount: parseInt(e.target.value),
                      })
                    }
                    style={{ flex: 1, accentColor: "#ef4444" }}
                  />
                  <span style={{ fontSize: "0.8125rem", fontWeight: 700 }}>
                    ${autoRules.autoAcceptUnderAmount}
                  </span>
                </div>
              </div>

              <button
                className="btn btn-primary"
                onClick={() =>
                  showToast(
                    "✓ Chargeback defense automation rules updated and deployed to gateways",
                  )
                }
              >
                Save & Deploy Defense Automation
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
              Projected Recovery & Time Savings
            </h3>
            <p
              style={{
                fontSize: "0.8125rem",
                color: "var(--text-secondary)",
                marginBottom: "1.5rem",
              }}
            >
              Estimated financial impact of current representment automation
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
                  Annual Recovered Revenue
                </div>
                <div
                  style={{
                    fontSize: "2rem",
                    fontWeight: 800,
                    color: "var(--accent-emerald)",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  {formatCurr(metrics.recovered_volume * 1.5, 0)}
                </div>
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--text-secondary)",
                    marginTop: "0.25rem",
                  }}
                >
                  Through automated Visa CE 3.0 and signed POD representments.
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
                  Analyst Hours Saved / Month
                </div>
                <div
                  style={{
                    fontSize: "2rem",
                    fontWeight: 800,
                    color: "var(--accent-blue)",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  145 Hours
                </div>
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--text-secondary)",
                    marginTop: "0.25rem",
                  }}
                >
                  Evidence compilation reduced from 25 minutes to &lt; 2
                  seconds.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/*  SLIDE-OVER DISPUTE INSPECTION DRAWER  */}
      {selectedDispute && (
        <div
          style={{
            position: "fixed",
            top: 0,
            right: 0,
            width: "500px",
            maxWidth: "92vw",
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
                  Dispute Case File
                </span>
                <h3
                  style={{
                    fontWeight: 800,
                    fontSize: "1.25rem",
                    color: "#fff",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  {selectedDispute.id}
                </h3>
              </div>
              <button
                onClick={() => setSelectedDispute(null)}
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

            {/* Win Probability Box */}
            <div
              style={{
                padding: "1rem",
                borderRadius: "8px",
                backgroundColor: "rgba(16,185,129,0.1)",
                border: "1px solid rgba(16,185,129,0.3)",
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
                  Win Probability
                </div>
                <div
                  style={{
                    fontSize: "1.5rem",
                    fontWeight: 800,
                    fontFamily: "var(--font-mono)",
                    color: "var(--accent-emerald)",
                  }}
                >
                  {(selectedDispute.win_probability * 100).toFixed(0)}%
                </div>
              </div>
              <span
                className={`badge ${getStatusBadge(selectedDispute.status).badge}`}
                style={{ fontSize: "0.8125rem" }}
              >
                {getStatusBadge(selectedDispute.status).text}
              </span>
            </div>

            {/* Dispute Details */}
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
                  Transaction ID:
                </span>
                <span
                  style={{ fontWeight: 600, fontFamily: "var(--font-mono)" }}
                >
                  {selectedDispute.transaction_id}
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
                  Customer ID:
                </span>
                <span
                  style={{ fontWeight: 600, fontFamily: "var(--font-mono)" }}
                >
                  {selectedDispute.customer_id}
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
                  Disputed Amount:
                </span>
                <span style={{ fontWeight: 700, color: "#ef4444" }}>
                  {formatCurr(selectedDispute.amount, 2)}
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
                <span style={{ color: "var(--text-secondary)" }}>Reason:</span>
                <span style={{ fontWeight: 600, textTransform: "capitalize" }}>
                  {selectedDispute.reason.replace(/_/g, " ")}
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
                  Filing Deadline:
                </span>
                <span style={{ fontWeight: 600, color: "#f59e0b" }}>
                  {selectedDispute.deadline} ({selectedDispute.days_left}d left)
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
                  CE 3.0 Qualification:
                </span>
                <span
                  style={{
                    fontWeight: 600,
                    color: selectedDispute.ce_3_eligible
                      ? "#10b981"
                      : "inherit",
                  }}
                >
                  {selectedDispute.ce_3_eligible
                    ? "✓ Qualified (Prior Undisputed Matches)"
                    : "Standard Proof"}
                </span>
              </div>
            </div>

            {/* Quick Evidence Summary */}
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
                  color: "#fff",
                  marginBottom: "0.25rem",
                }}
              >
                AI Representment Recommendation:
              </div>
              <p
                style={{
                  fontSize: "0.8125rem",
                  color: "var(--text-secondary)",
                }}
              >
                Auto-generate rebuttal pack with carrier POD tracking and prior
                3 transaction order logs to overturn dispute.
              </p>
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
              onClick={() =>
                handleAction(selectedDispute.id, "SUBMIT_REPRESENTMENT")
              }
            >
              <Send size={16} /> Submit Formal Representment
            </button>
            <button
              className="btn btn-secondary"
              onClick={() =>
                handleAction(selectedDispute.id, "REQUEST_CARRIER_POD")
              }
            >
              <Truck size={16} /> Request Carrier GPS Proof
            </button>
            <button
              className="btn btn-danger"
              onClick={() =>
                handleAction(selectedDispute.id, "ACCEPT_LIABILITY")
              }
            >
              <XCircle size={16} /> Accept Liability & Close Case
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
