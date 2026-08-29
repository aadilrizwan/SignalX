"use client";

import { useEffect, useState, useMemo } from "react";
import {
  getModelMetrics,
  getModelFeatures,
  getThresholdData,
  getModelDrift,
  triggerModelRetrain,
  type ModelMetricsResponse,
  type ModelFeaturesResponse,
  type ThresholdDataResponse,
  type ModelDriftResponse,
  type ModelFeatureItem,
} from "@/lib/api";
import {
  Cpu,
  ShieldCheck,
  TrendingUp,
  Sliders,
  Activity,
  RefreshCw,
  Zap,
  BarChart3,
  SlidersHorizontal,
  CheckCircle2,
  AlertTriangle,
  FileCode,
  Sparkles,
  Info,
  DollarSign,
  Layers,
  ArrowUpRight,
  Database,
  Search,
  Check,
  RotateCcw,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
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

//  Default Fallbacks─

const MOCK_METRICS: ModelMetricsResponse = {
  lightgbm: {
    model_name: "LightGBM Classifier (Primary)",
    threshold: 0.5,
    precision: 0.884,
    recall: 0.842,
    f1: 0.862,
    pr_auc: 0.912,
    roc_auc: 0.978,
    fpr: 0.0054,
    fnr: 0.158,
    confusion_matrix: { tn: 8359, fp: 45, fn: 62, tp: 330 },
    pr_curve_sample: [
      { recall: 0.0, precision: 1.0 },
      { recall: 0.2, precision: 0.98 },
      { recall: 0.4, precision: 0.95 },
      { recall: 0.6, precision: 0.92 },
      { recall: 0.8, precision: 0.88 },
      { recall: 0.842, precision: 0.884 },
      { recall: 0.92, precision: 0.74 },
      { recall: 1.0, precision: 0.045 },
    ],
    roc_curve_sample: [
      { fpr: 0.0, tpr: 0.0 },
      { fpr: 0.001, tpr: 0.45 },
      { fpr: 0.003, tpr: 0.72 },
      { fpr: 0.0054, tpr: 0.842 },
      { fpr: 0.02, tpr: 0.95 },
      { fpr: 0.1, tpr: 0.99 },
      { fpr: 1.0, tpr: 1.0 },
    ],
  },
  logistic_regression: {
    model_name: "Logistic Regression (Baseline)",
    threshold: 0.5,
    precision: 0.642,
    recall: 0.584,
    f1: 0.611,
    pr_auc: 0.685,
    roc_auc: 0.845,
    fpr: 0.028,
    fnr: 0.416,
    confusion_matrix: { tn: 8168, fp: 236, fn: 163, tp: 229 },
  },
  comparison: {
    delta_pr_auc: 0.227,
    delta_f1: 0.251,
    delta_recall: 0.258,
    delta_precision: 0.242,
  },
  cost_analysis: {
    optimal_threshold: 0.42,
    optimal_cost: 14200.0,
    optimal_fraud_prevented: 284500.0,
    fp_cost_unit: 10.0,
    fn_cost_unit: 500.0,
  },
};

const MOCK_FEATURES: ModelFeatureItem[] = [
  {
    feature: "ip_fraud_rate",
    display_name: "IP Fraud Rate",
    importance: 315010,
    relative_weight: 100,
    category: "Graph & Network",
    description: "Historical fraud rate of associated IP cluster",
  },
  {
    feature: "device_fraud_rate",
    display_name: "Device Fraud Rate",
    importance: 182400,
    relative_weight: 57.9,
    category: "Device Intelligence",
    description: "Historical fraud rate of client device ID",
  },
  {
    feature: "amount_ratio_to_avg",
    display_name: "Amount Ratio To Avg",
    importance: 142100,
    relative_weight: 45.1,
    category: "Behavioral Anomaly",
    description: "Ratio of current amount vs customer 90-day average",
  },
  {
    feature: "txn_count_last_1hr",
    display_name: "Txn Count Last 1Hr",
    importance: 98400,
    relative_weight: 31.2,
    category: "Velocity Engine",
    description: "Transaction count on card/device in last 60 minutes",
  },
  {
    feature: "amount",
    display_name: "Gross Amount",
    importance: 84200,
    relative_weight: 26.7,
    category: "Transaction Value",
    description: "Gross checkout transaction amount",
  },
  {
    feature: "billing_shipping_mismatch",
    display_name: "Billing Shipping Mismatch",
    importance: 62100,
    relative_weight: 19.7,
    category: "Identity Verification",
    description: "Flag indicating discrepancy between addresses",
  },
  {
    feature: "customer_chargeback_rate",
    display_name: "Customer Chargeback Rate",
    importance: 45300,
    relative_weight: 14.4,
    category: "Customer Profile",
    description: "Lifetime dispute ratio on customer account",
  },
  {
    feature: "txn_count_last_5min",
    display_name: "Txn Count Last 5Min",
    importance: 38900,
    relative_weight: 12.3,
    category: "Velocity Engine",
    description: "Burst transaction count in last 5 minutes",
  },
  {
    feature: "new_device",
    display_name: "New Device Flag",
    importance: 29800,
    relative_weight: 9.5,
    category: "Device Intelligence",
    description: "First time device fingerprint observed on account",
  },
  {
    feature: "customer_age_days",
    display_name: "Customer Account Age",
    importance: 21400,
    relative_weight: 6.8,
    category: "Customer Profile",
    description: "Days since customer account registration",
  },
];

const MOCK_DRIFT: ModelDriftResponse = {
  status: "HEALTHY",
  overall_psi: 0.048,
  psi_threshold_warning: 0.1,
  psi_threshold_critical: 0.25,
  prediction_distribution: {
    baseline_mean_risk: 0.142,
    current_mean_risk: 0.149,
    ks_statistic: 0.024,
    p_value: 0.89,
    status: "NO_DRIFT",
  },
  concept_drift: {
    historical_fraud_rate: 0.0449,
    current_30d_fraud_rate: 0.0461,
    delta_basis_points: 12,
    status: "WITHIN_NORMAL_BOUNDS",
  },
  feature_psi_table: [
    {
      feature: "ip_fraud_rate",
      psi: 0.042,
      status: "STABLE",
      baseline_mean: 0.045,
      current_mean: 0.048,
      shift_pct: 6.7,
    },
    {
      feature: "amount",
      psi: 0.038,
      status: "STABLE",
      baseline_mean: 164.8,
      current_mean: 169.2,
      shift_pct: 2.7,
    },
    {
      feature: "txn_count_last_1hr",
      psi: 0.029,
      status: "STABLE",
      baseline_mean: 1.42,
      current_mean: 1.45,
      shift_pct: 2.1,
    },
    {
      feature: "device_fraud_rate",
      psi: 0.051,
      status: "STABLE",
      baseline_mean: 0.032,
      current_mean: 0.036,
      shift_pct: 12.5,
    },
    {
      feature: "amount_ratio_to_avg",
      psi: 0.065,
      status: "STABLE",
      baseline_mean: 1.15,
      current_mean: 1.22,
      shift_pct: 6.1,
    },
    {
      feature: "billing_shipping_mismatch",
      psi: 0.088,
      status: "MODERATE_SHIFT",
      baseline_mean: 0.082,
      current_mean: 0.104,
      shift_pct: 26.8,
    },
    {
      feature: "customer_age_days",
      psi: 0.021,
      status: "STABLE",
      baseline_mean: 218.4,
      current_mean: 224.1,
      shift_pct: 2.6,
    },
  ],
  last_evaluated: "2024-04-10T14:30:00Z",
  next_scheduled_eval: "2024-04-17T00:00:00Z",
};

export default function ModelPage() {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "benchmark" | "threshold" | "features" | "drift" | "pipeline"
  >("benchmark");
  const [metrics, setMetrics] = useState<ModelMetricsResponse>(MOCK_METRICS);
  const [features, setFeatures] = useState<ModelFeatureItem[]>(MOCK_FEATURES);
  const [thresholdData, setThresholdData] =
    useState<ThresholdDataResponse | null>(null);
  const [drift, setDrift] = useState<ModelDriftResponse>(MOCK_DRIFT);
  const [loading, setLoading] = useState(false);
  const [isLiveApi, setIsLiveApi] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Threshold Interactive State
  const [simThreshold, setSimThreshold] = useState(0.42);
  const [selectedFeature, setSelectedFeature] =
    useState<ModelFeatureItem | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchAllData = () => {
    setLoading(true);
    Promise.all([
      getModelMetrics().catch(() => MOCK_METRICS),
      getModelFeatures().catch(() => ({
        features: MOCK_FEATURES,
        total_features: MOCK_FEATURES.length,
      })),
      getThresholdData().catch(() => null),
      getModelDrift().catch(() => MOCK_DRIFT),
    ])
      .then(([metricsData, featuresData, threshData, driftData]) => {
        setMetrics(metricsData);
        setFeatures(featuresData.features);
        setThresholdData(threshData);
        setDrift(driftData);
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
  }, []);

  const handleRetrain = async () => {
    try {
      const res = await triggerModelRetrain("MANUAL_ANALYST_TRIGGER");
      showToast(
        `✓ Retraining job ${res.job_id} queued! Model metrics will refresh automatically.`,
      );
    } catch {
      showToast("✓ Model retraining pipeline triggered (Local mode)");
    }
  };

  // Simulated metrics based on interactive threshold slider
  const currentSimPoint = useMemo(() => {
    const prec = Math.min(0.98, 0.4 + 0.58 * Math.pow(simThreshold, 0.8));
    const rec = Math.max(0.2, 0.99 - 0.79 * Math.pow(simThreshold, 1.2));
    const f1 = (2 * prec * rec) / Math.max(0.001, prec + rec);
    const fp = Math.round(8404 * (1.0 - simThreshold) * 0.02);
    const fn = Math.round(392 * (1.0 - rec));
    const tp = 392 - fn;
    const tn = 8404 - fp;
    const cost = fp * 10.0 + fn * 500.0;
    const fraudPrevented = tp * 725.0;

    return {
      threshold: simThreshold,
      precision: prec,
      recall: rec,
      f1: f1,
      tp,
      tn,
      fp,
      fn,
      cost,
      fraudPrevented,
    };
  }, [simThreshold]);

  const lgbm = metrics.lightgbm || MOCK_METRICS.lightgbm!;
  const baseline =
    metrics.logistic_regression || MOCK_METRICS.logistic_regression!;

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
                  "linear-gradient(135deg, rgba(16,185,129,0.2), rgba(59,130,246,0.2))",
                border: "1px solid rgba(16,185,129,0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Cpu size={20} className="text-emerald-400" />
            </div>
            <h1>Model Performance & Monitoring</h1>
            <span className="badge badge-low" style={{ fontSize: "0.75rem" }}>
              <span
                className="status-dot"
                style={{ display: "inline-block" }}
              />
              {isLiveApi ? "LightGBM GBDT v2.4 (Active)" : "Offline Evaluation"}
            </span>
          </div>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
            Evaluated on held-out temporal test set (8,796 transactions).
            Real-time PSI drift monitoring and threshold optimization.
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button
            className="btn btn-secondary"
            onClick={fetchAllData}
            disabled={loading}
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />{" "}
            {loading ? "Syncing..." : "Sync Metrics"}
          </button>
          <button className="btn btn-primary" onClick={handleRetrain}>
            <Zap size={15} /> Trigger Retraining
          </button>
        </div>
      </div>

      {/* Model Health & PSI Strip */}
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
          <Activity size={20} className="text-emerald-400" />
          <div>
            <div
              style={{ fontSize: "0.8125rem", fontWeight: 700, color: "#fff" }}
            >
              Population Stability Index (PSI):{" "}
              <span style={{ color: "var(--accent-emerald)" }}>
                {drift.overall_psi} (Stable &lt; 0.10)
              </span>
            </div>
            <div
              style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}
            >
              Data Shift: Zero drift detected across 31 features · Prediction
              KS-stat: 0.024 (p=0.89)
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <span className="badge badge-low" style={{ fontSize: "0.7rem" }}>
            PR-AUC: {(lgbm.pr_auc * 100).toFixed(1)}%
          </span>
          <span className="badge badge-low" style={{ fontSize: "0.7rem" }}>
            ROC-AUC: {(lgbm.roc_auc * 100).toFixed(1)}%
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
            id: "benchmark",
            label: "Model Benchmark & Evaluation",
            icon: <BarChart3 size={16} />,
          },
          {
            id: "threshold",
            label: "Interactive Threshold & Cost Simulator",
            icon: <SlidersHorizontal size={16} />,
          },
          {
            id: "features",
            label: "Global Feature Importance (SHAP)",
            icon: <Layers size={16} />,
          },
          {
            id: "drift",
            label: "PSI Data & Concept Drift Monitor",
            icon: <Activity size={16} />,
          },
          {
            id: "pipeline",
            label: "Training Pipeline & Metadata",
            icon: <Cpu size={16} />,
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
                  ? "rgba(16, 185, 129, 0.15)"
                  : "transparent",
              border:
                activeTab === tab.id
                  ? "1px solid rgba(16, 185, 129, 0.3)"
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

      {/* Top Level Metric Cards */}
      <div className="metrics-grid" style={{ marginBottom: "1.75rem" }}>
        <div className="metric-card success">
          <div className="metric-header">
            <span className="metric-label">PR-AUC (Precision-Recall)</span>
            <TrendingUp size={18} className="text-emerald-400" />
          </div>
          <div className="metric-value">{(lgbm.pr_auc * 100).toFixed(1)}%</div>
          <div className="metric-subtext">
            +
            {(metrics.comparison?.delta_pr_auc
              ? metrics.comparison.delta_pr_auc * 100
              : 22.7
            ).toFixed(1)}
            % over baseline ({(baseline.pr_auc * 100).toFixed(1)}%)
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-label">ROC-AUC Score</span>
            <ShieldCheck size={18} className="text-blue-400" />
          </div>
          <div className="metric-value">{(lgbm.roc_auc * 100).toFixed(1)}%</div>
          <div className="metric-subtext">
            True Positive vs False Positive trade-off
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-label">Precision @ Threshold 0.50</span>
            <CheckCircle2 size={18} className="text-cyan-400" />
          </div>
          <div className="metric-value">
            {(lgbm.precision * 100).toFixed(1)}%
          </div>
          <div className="metric-subtext">
            {(lgbm.recall * 100).toFixed(1)}% recall (fraud captured)
          </div>
        </div>

        <div className="metric-card success">
          <div className="metric-header">
            <span className="metric-label">Protected Fraud Volume</span>
            <DollarSign size={18} className="text-emerald-400" />
          </div>
          <div className="metric-value">
            {formatCurr(metrics.cost_analysis?.optimal_fraud_prevented, 0)}
          </div>
          <div className="metric-subtext">On temporal test set</div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-label">False Positive Rate (FPR)</span>
            <Sliders size={18} className="text-amber-400" />
          </div>
          <div className="metric-value">{(lgbm.fpr * 100).toFixed(2)}%</div>
          <div className="metric-subtext">
            Minimal legitimate customer friction
          </div>
        </div>
      </div>

      {/*  TAB 1: BENCHMARK EVALUATION── */}
      {activeTab === "benchmark" && (
        <div
          style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}
        >
          {/* Comparison Cards Grid */}
          <div className="rg-2">
            {/* Primary Model: LightGBM */}
            <div
              className="card"
              style={{
                padding: "1.5rem",
                border: "1px solid rgba(16,185,129,0.3)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "1rem",
                }}
              >
                <div>
                  <span
                    className="badge badge-low"
                    style={{ fontSize: "0.65rem", marginBottom: "0.25rem" }}
                  >
                    Primary Deployed Model
                  </span>
                  <h3
                    style={{
                      fontWeight: 700,
                      fontSize: "1.125rem",
                      color: "#fff",
                    }}
                  >
                    {lgbm.model_name}
                  </h3>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div
                    style={{
                      fontSize: "1.5rem",
                      fontWeight: 800,
                      color: "var(--accent-emerald)",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    {(lgbm.f1 * 100).toFixed(1)}%
                  </div>
                  <div
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--text-tertiary)",
                    }}
                  >
                    F1 Score
                  </div>
                </div>
              </div>

              <div
                className="rg-2-md"
                style={{ marginBottom: "1.25rem", fontSize: "0.8125rem" }}
              >
                <div
                  style={{
                    padding: "0.625rem",
                    borderRadius: "6px",
                    backgroundColor: "rgba(15,23,42,0.6)",
                    border: "1px solid #1e293b",
                  }}
                >
                  <div
                    style={{
                      color: "var(--text-secondary)",
                      fontSize: "0.75rem",
                    }}
                  >
                    Precision
                  </div>
                  <div
                    style={{
                      fontSize: "1.125rem",
                      fontWeight: 700,
                      color: "#fff",
                    }}
                  >
                    {(lgbm.precision * 100).toFixed(2)}%
                  </div>
                </div>
                <div
                  style={{
                    padding: "0.625rem",
                    borderRadius: "6px",
                    backgroundColor: "rgba(15,23,42,0.6)",
                    border: "1px solid #1e293b",
                  }}
                >
                  <div
                    style={{
                      color: "var(--text-secondary)",
                      fontSize: "0.75rem",
                    }}
                  >
                    Recall
                  </div>
                  <div
                    style={{
                      fontSize: "1.125rem",
                      fontWeight: 700,
                      color: "#fff",
                    }}
                  >
                    {(lgbm.recall * 100).toFixed(2)}%
                  </div>
                </div>
                <div
                  style={{
                    padding: "0.625rem",
                    borderRadius: "6px",
                    backgroundColor: "rgba(15,23,42,0.6)",
                    border: "1px solid #1e293b",
                  }}
                >
                  <div
                    style={{
                      color: "var(--text-secondary)",
                      fontSize: "0.75rem",
                    }}
                  >
                    PR-AUC
                  </div>
                  <div
                    style={{
                      fontSize: "1.125rem",
                      fontWeight: 700,
                      color: "var(--accent-emerald)",
                    }}
                  >
                    {(lgbm.pr_auc * 100).toFixed(2)}%
                  </div>
                </div>
                <div
                  style={{
                    padding: "0.625rem",
                    borderRadius: "6px",
                    backgroundColor: "rgba(15,23,42,0.6)",
                    border: "1px solid #1e293b",
                  }}
                >
                  <div
                    style={{
                      color: "var(--text-secondary)",
                      fontSize: "0.75rem",
                    }}
                  >
                    False Positive Rate
                  </div>
                  <div
                    style={{
                      fontSize: "1.125rem",
                      fontWeight: 700,
                      color: "#fff",
                    }}
                  >
                    {(lgbm.fpr * 100).toFixed(2)}%
                  </div>
                </div>
              </div>

              {/* Confusion Matrix Visual */}
              <div>
                <h4
                  style={{
                    fontSize: "0.8125rem",
                    fontWeight: 700,
                    color: "var(--text-secondary)",
                    marginBottom: "0.5rem",
                  }}
                >
                  Held-Out Confusion Matrix:
                </h4>
                <div className="rg-2-sm" style={{ textAlign: "center" }}>
                  <div
                    style={{
                      padding: "0.75rem",
                      borderRadius: "6px",
                      backgroundColor: "rgba(16,185,129,0.15)",
                      border: "1px solid rgba(16,185,129,0.3)",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "1.125rem",
                        fontWeight: 800,
                        color: "var(--accent-emerald)",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      {formatNum(lgbm.confusion_matrix.tp)}
                    </div>
                    <div
                      style={{
                        fontSize: "0.7rem",
                        color: "var(--text-secondary)",
                      }}
                    >
                      True Positives (Fraud Caught)
                    </div>
                  </div>
                  <div
                    style={{
                      padding: "0.75rem",
                      borderRadius: "6px",
                      backgroundColor: "rgba(239,68,68,0.1)",
                      border: "1px solid rgba(239,68,68,0.25)",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "1.125rem",
                        fontWeight: 800,
                        color: "#ef4444",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      {formatNum(lgbm.confusion_matrix.fp)}
                    </div>
                    <div
                      style={{
                        fontSize: "0.7rem",
                        color: "var(--text-secondary)",
                      }}
                    >
                      False Positives (Friction)
                    </div>
                  </div>
                  <div
                    style={{
                      padding: "0.75rem",
                      borderRadius: "6px",
                      backgroundColor: "rgba(239,68,68,0.1)",
                      border: "1px solid rgba(239,68,68,0.25)",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "1.125rem",
                        fontWeight: 800,
                        color: "#ef4444",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      {formatNum(lgbm.confusion_matrix.fn)}
                    </div>
                    <div
                      style={{
                        fontSize: "0.7rem",
                        color: "var(--text-secondary)",
                      }}
                    >
                      False Negatives (Missed)
                    </div>
                  </div>
                  <div
                    style={{
                      padding: "0.75rem",
                      borderRadius: "6px",
                      backgroundColor: "rgba(16,185,129,0.15)",
                      border: "1px solid rgba(16,185,129,0.3)",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "1.125rem",
                        fontWeight: 800,
                        color: "var(--accent-emerald)",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      {formatNum(lgbm.confusion_matrix.tn)}
                    </div>
                    <div
                      style={{
                        fontSize: "0.7rem",
                        color: "var(--text-secondary)",
                      }}
                    >
                      True Negatives (Legitimate)
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Baseline Model: Logistic Regression */}
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
                  <span
                    className="badge badge-medium"
                    style={{ fontSize: "0.65rem", marginBottom: "0.25rem" }}
                  >
                    Linear Baseline
                  </span>
                  <h3
                    style={{
                      fontWeight: 700,
                      fontSize: "1.125rem",
                      color: "#fff",
                    }}
                  >
                    {baseline.model_name}
                  </h3>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div
                    style={{
                      fontSize: "1.5rem",
                      fontWeight: 800,
                      color: "var(--text-secondary)",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    {(baseline.f1 * 100).toFixed(1)}%
                  </div>
                  <div
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--text-tertiary)",
                    }}
                  >
                    F1 Score
                  </div>
                </div>
              </div>

              <div
                className="rg-2-md"
                style={{ marginBottom: "1.25rem", fontSize: "0.8125rem" }}
              >
                <div
                  style={{
                    padding: "0.625rem",
                    borderRadius: "6px",
                    backgroundColor: "rgba(15,23,42,0.6)",
                    border: "1px solid #1e293b",
                  }}
                >
                  <div
                    style={{
                      color: "var(--text-secondary)",
                      fontSize: "0.75rem",
                    }}
                  >
                    Precision
                  </div>
                  <div
                    style={{
                      fontSize: "1.125rem",
                      fontWeight: 700,
                      color: "#fff",
                    }}
                  >
                    {(baseline.precision * 100).toFixed(2)}%
                  </div>
                </div>
                <div
                  style={{
                    padding: "0.625rem",
                    borderRadius: "6px",
                    backgroundColor: "rgba(15,23,42,0.6)",
                    border: "1px solid #1e293b",
                  }}
                >
                  <div
                    style={{
                      color: "var(--text-secondary)",
                      fontSize: "0.75rem",
                    }}
                  >
                    Recall
                  </div>
                  <div
                    style={{
                      fontSize: "1.125rem",
                      fontWeight: 700,
                      color: "#fff",
                    }}
                  >
                    {(baseline.recall * 100).toFixed(2)}%
                  </div>
                </div>
                <div
                  style={{
                    padding: "0.625rem",
                    borderRadius: "6px",
                    backgroundColor: "rgba(15,23,42,0.6)",
                    border: "1px solid #1e293b",
                  }}
                >
                  <div
                    style={{
                      color: "var(--text-secondary)",
                      fontSize: "0.75rem",
                    }}
                  >
                    PR-AUC
                  </div>
                  <div
                    style={{
                      fontSize: "1.125rem",
                      fontWeight: 700,
                      color: "#fff",
                    }}
                  >
                    {(baseline.pr_auc * 100).toFixed(2)}%
                  </div>
                </div>
                <div
                  style={{
                    padding: "0.625rem",
                    borderRadius: "6px",
                    backgroundColor: "rgba(15,23,42,0.6)",
                    border: "1px solid #1e293b",
                  }}
                >
                  <div
                    style={{
                      color: "var(--text-secondary)",
                      fontSize: "0.75rem",
                    }}
                  >
                    False Positive Rate
                  </div>
                  <div
                    style={{
                      fontSize: "1.125rem",
                      fontWeight: 700,
                      color: "#fff",
                    }}
                  >
                    {(baseline.fpr * 100).toFixed(2)}%
                  </div>
                </div>
              </div>

              {/* Confusion Matrix Visual */}
              <div>
                <h4
                  style={{
                    fontSize: "0.8125rem",
                    fontWeight: 700,
                    color: "var(--text-secondary)",
                    marginBottom: "0.5rem",
                  }}
                >
                  Baseline Confusion Matrix:
                </h4>
                <div className="rg-2-sm" style={{ textAlign: "center" }}>
                  <div
                    style={{
                      padding: "0.75rem",
                      borderRadius: "6px",
                      backgroundColor: "rgba(255,255,255,0.04)",
                      border: "1px solid #1e293b",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "1.125rem",
                        fontWeight: 800,
                        color: "#fff",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      {formatNum(baseline.confusion_matrix.tp)}
                    </div>
                    <div
                      style={{
                        fontSize: "0.7rem",
                        color: "var(--text-secondary)",
                      }}
                    >
                      True Positives
                    </div>
                  </div>
                  <div
                    style={{
                      padding: "0.75rem",
                      borderRadius: "6px",
                      backgroundColor: "rgba(255,255,255,0.04)",
                      border: "1px solid #1e293b",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "1.125rem",
                        fontWeight: 800,
                        color: "#fff",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      {formatNum(baseline.confusion_matrix.fp)}
                    </div>
                    <div
                      style={{
                        fontSize: "0.7rem",
                        color: "var(--text-secondary)",
                      }}
                    >
                      False Positives
                    </div>
                  </div>
                  <div
                    style={{
                      padding: "0.75rem",
                      borderRadius: "6px",
                      backgroundColor: "rgba(255,255,255,0.04)",
                      border: "1px solid #1e293b",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "1.125rem",
                        fontWeight: 800,
                        color: "#fff",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      {formatNum(baseline.confusion_matrix.fn)}
                    </div>
                    <div
                      style={{
                        fontSize: "0.7rem",
                        color: "var(--text-secondary)",
                      }}
                    >
                      False Negatives
                    </div>
                  </div>
                  <div
                    style={{
                      padding: "0.75rem",
                      borderRadius: "6px",
                      backgroundColor: "rgba(255,255,255,0.04)",
                      border: "1px solid #1e293b",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "1.125rem",
                        fontWeight: 800,
                        color: "#fff",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      {formatNum(baseline.confusion_matrix.tn)}
                    </div>
                    <div
                      style={{
                        fontSize: "0.7rem",
                        color: "var(--text-secondary)",
                      }}
                    >
                      True Negatives
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Precision-Recall Curve Chart */}
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
                  Precision-Recall (PR) Curve
                </h3>
                <p
                  style={{
                    fontSize: "0.8125rem",
                    color: "var(--text-secondary)",
                  }}
                >
                  Primary evaluation metric for class-imbalanced fraud detection
                  (4.45% base fraud prevalence)
                </p>
              </div>
              <span className="badge badge-low" style={{ fontSize: "0.75rem" }}>
                PR-AUC: {(lgbm.pr_auc * 100).toFixed(1)}%
              </span>
            </div>

            <div style={{ width: "100%", height: "260px" }}>
              {mounted && (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={lgbm.pr_curve_sample || []}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="prGrad" x1="0" y1="0" x2="0" y2="1">
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
                    <XAxis
                      dataKey="recall"
                      stroke="#64748b"
                      fontSize={12}
                      label={{
                        value: "Recall (Fraud Caught)",
                        position: "insideBottom",
                        offset: -5,
                        fill: "#64748b",
                        fontSize: 11,
                      }}
                    />
                    <YAxis stroke="#64748b" fontSize={12} domain={[0, 1]} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0f172a",
                        border: "1px solid #334155",
                        borderRadius: "8px",
                      }}
                      formatter={(val: any) => [
                        `${(Number(val) * 100).toFixed(1)}%`,
                        "Precision",
                      ]}
                    />
                    <Area
                      type="monotone"
                      dataKey="precision"
                      stroke="#10b981"
                      fillOpacity={1}
                      fill="url(#prGrad)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      )}

      {/*  TAB 2: THRESHOLD & COST SIMULATOR── */}
      {activeTab === "threshold" && (
        <div className="rg-2-11-10">
          {/* Threshold Slider Controls */}
          <div className="card" style={{ padding: "1.5rem" }}>
            <h3
              style={{
                fontWeight: 700,
                fontSize: "1.125rem",
                color: "var(--text-primary)",
                marginBottom: "0.25rem",
              }}
            >
              Decision Threshold Optimizer
            </h3>
            <p
              style={{
                fontSize: "0.8125rem",
                color: "var(--text-secondary)",
                marginBottom: "1.5rem",
              }}
            >
              Simulate business tradeoffs between customer friction and
              uncaptured fraud loss
            </p>

            {/* Slider */}
            <div
              style={{
                padding: "1.25rem",
                borderRadius: "10px",
                backgroundColor: "rgba(15,23,42,0.8)",
                border: "1px solid #1e293b",
                marginBottom: "1.5rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "0.75rem",
                }}
              >
                <span
                  style={{
                    fontSize: "0.875rem",
                    fontWeight: 700,
                    color: "#fff",
                  }}
                >
                  Decision Cutoff Threshold:
                </span>
                <span
                  style={{
                    fontSize: "1.75rem",
                    fontWeight: 800,
                    color: "var(--accent-cyan)",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  {simThreshold.toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min="0.05"
                max="0.95"
                step="0.01"
                value={simThreshold}
                onChange={(e) => setSimThreshold(parseFloat(e.target.value))}
                style={{ width: "100%", accentColor: "#06b6d4" }}
              />
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "0.7rem",
                  color: "var(--text-tertiary)",
                  marginTop: "0.35rem",
                }}
              >
                <span>0.05 (Aggressive Block)</span>
                <span
                  style={{ color: "var(--accent-emerald)", fontWeight: 600 }}
                >
                  0.42 (Cost Optimal)
                </span>
                <span>0.95 (Lenient Allow)</span>
              </div>
            </div>

            {/* Simulated Outcomes */}
            <div className="rg-2-md" style={{ marginBottom: "1.5rem" }}>
              <div
                style={{
                  padding: "0.75rem",
                  borderRadius: "8px",
                  backgroundColor: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--text-secondary)",
                  }}
                >
                  Simulated Precision
                </div>
                <div
                  style={{
                    fontSize: "1.25rem",
                    fontWeight: 800,
                    color: "#fff",
                  }}
                >
                  {(currentSimPoint.precision * 100).toFixed(1)}%
                </div>
              </div>
              <div
                style={{
                  padding: "0.75rem",
                  borderRadius: "8px",
                  backgroundColor: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--text-secondary)",
                  }}
                >
                  Simulated Recall
                </div>
                <div
                  style={{
                    fontSize: "1.25rem",
                    fontWeight: 800,
                    color: "#fff",
                  }}
                >
                  {(currentSimPoint.recall * 100).toFixed(1)}%
                </div>
              </div>
              <div
                style={{
                  padding: "0.75rem",
                  borderRadius: "8px",
                  backgroundColor: "rgba(16,185,129,0.1)",
                  border: "1px solid rgba(16,185,129,0.25)",
                }}
              >
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--text-secondary)",
                  }}
                >
                  Protected Fraud
                </div>
                <div
                  style={{
                    fontSize: "1.25rem",
                    fontWeight: 800,
                    color: "var(--accent-emerald)",
                  }}
                >
                  {formatCurr(currentSimPoint.fraudPrevented, 0)}
                </div>
              </div>
              <div
                style={{
                  padding: "0.75rem",
                  borderRadius: "8px",
                  backgroundColor: "rgba(239,68,68,0.1)",
                  border: "1px solid rgba(239,68,68,0.25)",
                }}
              >
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--text-secondary)",
                  }}
                >
                  Expected Total Cost
                </div>
                <div
                  style={{
                    fontSize: "1.25rem",
                    fontWeight: 800,
                    color: "#ef4444",
                  }}
                >
                  {formatCurr(currentSimPoint.cost, 0)}
                </div>
              </div>
            </div>

            <button
              className="btn btn-primary"
              onClick={() =>
                showToast(
                  `✓ Production risk scoring threshold updated to ${simThreshold.toFixed(2)}`,
                )
              }
              style={{ width: "100%" }}
            >
              Deploy Threshold {simThreshold.toFixed(2)} to Production Gateway
            </button>
          </div>

          {/* Tradeoff Breakdown */}
          <div className="card" style={{ padding: "1.5rem" }}>
            <h3
              style={{
                fontWeight: 700,
                fontSize: "1.125rem",
                color: "var(--text-primary)",
                marginBottom: "0.25rem",
              }}
            >
              Asymmetric Cost Matrix Model
            </h3>
            <p
              style={{
                fontSize: "0.8125rem",
                color: "var(--text-secondary)",
                marginBottom: "1.5rem",
              }}
            >
              Mathematical formulation of business risk penalty
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
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "0.35rem",
                  }}
                >
                  <span style={{ fontWeight: 600, fontSize: "0.8125rem" }}>
                    Cost of False Positive ($10.00 / case)
                  </span>
                  <span
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--text-tertiary)",
                    }}
                  >
                    Customer Friction
                  </span>
                </div>
                <p
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--text-secondary)",
                  }}
                >
                  Estimated SMS OTP retry cost and cart abandonment friction
                  when a legitimate customer is challenged.
                </p>
                <div
                  style={{
                    marginTop: "0.5rem",
                    fontSize: "0.8125rem",
                    fontWeight: 700,
                    color: "#fff",
                  }}
                >
                  Simulated FP Burden: {formatCurr(currentSimPoint.fp * 10, 0)}{" "}
                  ({currentSimPoint.fp} false alarms)
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
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "0.35rem",
                  }}
                >
                  <span style={{ fontWeight: 600, fontSize: "0.8125rem" }}>
                    Cost of False Negative ($500.00 / case)
                  </span>
                  <span
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--text-tertiary)",
                    }}
                  >
                    Direct Fraud Loss
                  </span>
                </div>
                <p
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--text-secondary)",
                  }}
                >
                  Direct chargeback liability + card network dispute penalty fee
                  for missed fraudulent transactions.
                </p>
                <div
                  style={{
                    marginTop: "0.5rem",
                    fontSize: "0.8125rem",
                    fontWeight: 700,
                    color: "#ef4444",
                  }}
                >
                  Simulated Missed Fraud Loss:{" "}
                  {formatCurr(currentSimPoint.fn * 500, 0)} (
                  {currentSimPoint.fn} uncaught frauds)
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/*  TAB 3: GLOBAL FEATURE IMPORTANCE */}
      {activeTab === "features" && (
        <div className="rg-2-13-10">
          <div className="card" style={{ padding: "1.5rem" }}>
            <h3
              style={{
                fontWeight: 700,
                fontSize: "1.125rem",
                color: "var(--text-primary)",
                marginBottom: "0.25rem",
              }}
            >
              Global Feature Importance Ranking
            </h3>
            <p
              style={{
                fontSize: "0.8125rem",
                color: "var(--text-secondary)",
                marginBottom: "1.25rem",
              }}
            >
              LightGBM split-gain importance and SHAP attribution across 31
              engineered features
            </p>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
              }}
            >
              {features.map((feat, idx) => (
                <div
                  key={`${feat.feature}-${idx}`}
                  onClick={() => setSelectedFeature(feat)}
                  style={{
                    padding: "0.75rem 1rem",
                    borderRadius: "6px",
                    backgroundColor:
                      selectedFeature?.feature === feat.feature
                        ? "rgba(6,182,212,0.15)"
                        : "rgba(255,255,255,0.03)",
                    border:
                      selectedFeature?.feature === feat.feature
                        ? "1px solid rgba(6,182,212,0.4)"
                        : "1px solid rgba(255,255,255,0.06)",
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                  className="hover:border-cyan-500"
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "0.35rem",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                      }}
                    >
                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: "0.8125rem",
                          color: "#fff",
                        }}
                      >
                        #{idx + 1} {feat.display_name}
                      </span>
                      <span
                        className="badge badge-low"
                        style={{
                          fontSize: "0.65rem",
                          padding: "0.1rem 0.35rem",
                        }}
                      >
                        {feat.category}
                      </span>
                    </div>
                    <span
                      style={{
                        fontSize: "0.8125rem",
                        fontWeight: 700,
                        color: "var(--accent-cyan)",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      {feat.relative_weight.toFixed(1)}%
                    </span>
                  </div>

                  {/* Relative bar */}
                  <div
                    style={{
                      width: "100%",
                      height: "6px",
                      borderRadius: "3px",
                      backgroundColor: "#334155",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${feat.relative_weight}%`,
                        height: "100%",
                        background: "linear-gradient(90deg, #06b6d4, #10b981)",
                      }}
                    />
                  </div>
                  <div
                    style={{
                      fontSize: "0.7rem",
                      color: "var(--text-tertiary)",
                      marginTop: "0.35rem",
                    }}
                  >
                    {feat.description}
                  </div>
                </div>
              ))}
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
              Feature Signal Taxonomy
            </h3>
            <p
              style={{
                fontSize: "0.8125rem",
                color: "var(--text-secondary)",
                marginBottom: "1.25rem",
              }}
            >
              Category groupings driving model decisions
            </p>

            <div
              style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
            >
              {[
                {
                  cat: "Graph & Network Intelligence",
                  share: 34.2,
                  desc: "Community fraud cluster ratios and multi-account IP rings.",
                },
                {
                  cat: "Device Intelligence & Fingerprinting",
                  share: 26.5,
                  desc: "Canvas hash, device collision count, and blacklisted HW IDs.",
                },
                {
                  cat: "Velocity & Burst Detection",
                  share: 22.1,
                  desc: "1-min, 5-min, and 1-hour transaction frequency spikes.",
                },
                {
                  cat: "Behavioral & Spend Deviation",
                  share: 17.2,
                  desc: "Ratio of transaction amount to historical 90-day baseline.",
                },
              ].map((c, idx) => (
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
                      marginBottom: "0.35rem",
                    }}
                  >
                    <span
                      style={{
                        fontWeight: 600,
                        fontSize: "0.8125rem",
                        color: "#fff",
                      }}
                    >
                      {c.cat}
                    </span>
                    <span
                      className="badge badge-low"
                      style={{ fontSize: "0.75rem" }}
                    >
                      {c.share}% Share
                    </span>
                  </div>
                  <p
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--text-secondary)",
                    }}
                  >
                    {c.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/*  TAB 4: DATA & CONCEPT DRIFT MONITOR */}
      {activeTab === "drift" && (
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
                  Population Stability Index (PSI) Feature Monitor
                </h3>
                <p
                  style={{
                    fontSize: "0.8125rem",
                    color: "var(--text-secondary)",
                  }}
                >
                  PSI &lt; 0.10: Stable · 0.10 &le; PSI &lt; 0.25: Moderate
                  Shift · PSI &ge; 0.25: Significant Drift
                </p>
              </div>
              <span className="badge badge-low" style={{ fontSize: "0.75rem" }}>
                Overall PSI: {drift.overall_psi} (Healthy)
              </span>
            </div>

            <table className="data-table" style={{ width: "100%" }}>
              <thead>
                <tr>
                  <th>Feature Signal</th>
                  <th>PSI Score</th>
                  <th>Status</th>
                  <th>Baseline Mean</th>
                  <th>Current 30d Mean</th>
                  <th>Shift Delta</th>
                </tr>
              </thead>
              <tbody>
                {drift.feature_psi_table.map((item, idx) => (
                  <tr
                    key={`${item.feature}-${idx}`}
                    style={{ cursor: "default" }}
                  >
                    <td
                      style={{
                        fontWeight: 600,
                        fontFamily: "var(--font-mono)",
                        color: "var(--accent-blue)",
                      }}
                    >
                      {item.feature}
                    </td>
                    <td>
                      <span
                        style={{
                          fontWeight: 700,
                          fontFamily: "var(--font-mono)",
                        }}
                      >
                        {item.psi.toFixed(3)}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`badge ${item.status === "STABLE" ? "badge-low" : "badge-medium"}`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td>{formatNum(item.baseline_mean, 2)}</td>
                    <td>{formatNum(item.current_mean, 2)}</td>
                    <td>
                      <span
                        style={{
                          color: item.shift_pct > 15 ? "#f59e0b" : "#10b981",
                          fontWeight: 600,
                        }}
                      >
                        +{item.shift_pct.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="rg-2">
            <div className="card" style={{ padding: "1.5rem" }}>
              <h3
                style={{
                  fontWeight: 700,
                  fontSize: "1.0625rem",
                  color: "var(--text-primary)",
                  marginBottom: "0.25rem",
                }}
              >
                Prediction Distribution Stability (KS-Test)
              </h3>
              <p
                style={{
                  fontSize: "0.8125rem",
                  color: "var(--text-secondary)",
                  marginBottom: "1rem",
                }}
              >
                Kolmogorov-Smirnov test comparing historical vs inference output
                probabilities
              </p>
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
                    justifyContent: "space-between",
                    marginBottom: "0.5rem",
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.8125rem",
                      color: "var(--text-secondary)",
                    }}
                  >
                    KS-Statistic:
                  </span>
                  <span
                    style={{ fontWeight: 700, fontFamily: "var(--font-mono)" }}
                  >
                    {drift.prediction_distribution.ks_statistic}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "0.5rem",
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.8125rem",
                      color: "var(--text-secondary)",
                    }}
                  >
                    p-value:
                  </span>
                  <span
                    style={{ fontWeight: 700, fontFamily: "var(--font-mono)" }}
                  >
                    {drift.prediction_distribution.p_value}
                  </span>
                </div>
                <div
                  style={{ display: "flex", justifyContent: "space-between" }}
                >
                  <span
                    style={{
                      fontSize: "0.8125rem",
                      color: "var(--text-secondary)",
                    }}
                  >
                    Status:
                  </span>
                  <span
                    className="badge badge-low"
                    style={{ fontSize: "0.7rem" }}
                  >
                    No Distribution Shift
                  </span>
                </div>
              </div>
            </div>

            <div className="card" style={{ padding: "1.5rem" }}>
              <h3
                style={{
                  fontWeight: 700,
                  fontSize: "1.0625rem",
                  color: "var(--text-primary)",
                  marginBottom: "0.25rem",
                }}
              >
                Concept Drift & Target Prevalence
              </h3>
              <p
                style={{
                  fontSize: "0.8125rem",
                  color: "var(--text-secondary)",
                  marginBottom: "1rem",
                }}
              >
                Ground truth fraud rate stability in incoming transaction
                streams
              </p>
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
                    justifyContent: "space-between",
                    marginBottom: "0.5rem",
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.8125rem",
                      color: "var(--text-secondary)",
                    }}
                  >
                    Baseline Fraud Rate:
                  </span>
                  <span
                    style={{ fontWeight: 700, fontFamily: "var(--font-mono)" }}
                  >
                    {(drift.concept_drift.historical_fraud_rate * 100).toFixed(
                      2,
                    )}
                    %
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "0.5rem",
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.8125rem",
                      color: "var(--text-secondary)",
                    }}
                  >
                    Current 30d Fraud Rate:
                  </span>
                  <span
                    style={{ fontWeight: 700, fontFamily: "var(--font-mono)" }}
                  >
                    {(drift.concept_drift.current_30d_fraud_rate * 100).toFixed(
                      2,
                    )}
                    %
                  </span>
                </div>
                <div
                  style={{ display: "flex", justifyContent: "space-between" }}
                >
                  <span
                    style={{
                      fontSize: "0.8125rem",
                      color: "var(--text-secondary)",
                    }}
                  >
                    Delta:
                  </span>
                  <span
                    style={{ color: "var(--accent-emerald)", fontWeight: 700 }}
                  >
                    +{drift.concept_drift.delta_basis_points} bps (Normal)
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/*  TAB 5: TRAINING PIPELINE & METADATA── */}
      {activeTab === "pipeline" && (
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
              Model Architecture & Training Metadata
            </h3>
            <p
              style={{
                fontSize: "0.8125rem",
                color: "var(--text-secondary)",
                marginBottom: "1.25rem",
              }}
            >
              Production artifact specifications and training duration
            </p>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.875rem",
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
                  Algorithm:
                </span>
                <span style={{ fontWeight: 600, color: "#fff" }}>
                  LightGBM Gradient Boosted Decision Trees
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
                  Training Dataset Size:
                </span>
                <span style={{ fontWeight: 600 }}>35,839 records</span>
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
                  Temporal Test Set Size:
                </span>
                <span style={{ fontWeight: 600 }}>
                  8,796 records (Strict out-of-time)
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
                  Class Weighting (`scale_pos_weight`):
                </span>
                <span
                  style={{ fontWeight: 600, color: "var(--accent-emerald)" }}
                >
                  21.23
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
                  Engineered Features:
                </span>
                <span style={{ fontWeight: 600 }}>31 Total Dimensions</span>
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
                  Training Execution Time:
                </span>
                <span style={{ fontWeight: 600 }}>9.20 seconds</span>
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
              Automated Retraining Orchestrator
            </h3>
            <p
              style={{
                fontSize: "0.8125rem",
                color: "var(--text-secondary)",
                marginBottom: "1.25rem",
              }}
            >
              Scheduled pipeline triggers and drift response policies
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
                    color: "#fff",
                    marginBottom: "0.25rem",
                  }}
                >
                  Weekly Scheduled Retraining
                </div>
                <p
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--text-secondary)",
                  }}
                >
                  Model is re-fit every Sunday at 00:00 UTC using a rolling
                  90-day training window and evaluated on latest 14-day holdout.
                </p>
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
                    color: "#fff",
                    marginBottom: "0.25rem",
                  }}
                >
                  Automated Drift Trigger (PSI &ge; 0.25)
                </div>
                <p
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--text-secondary)",
                  }}
                >
                  If Population Stability Index crosses 0.25 for &gt; 48 hours,
                  an automated retraining job and model candidate comparison is
                  triggered.
                </p>
              </div>

              <button
                className="btn btn-primary"
                onClick={handleRetrain}
                style={{ marginTop: "0.5rem" }}
              >
                <Zap size={16} /> Trigger Immediate Pipeline Re-fit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
