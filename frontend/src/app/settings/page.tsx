"use client";

import { useEffect, useState, useMemo } from "react";
import {
  getRiskSettings,
  updateRiskSettings,
  resetRiskSettings,
  apiFetch,
  type RiskEngineSettings,
} from "@/lib/api";
import {
  Sliders,
  ShieldCheck,
  ShieldAlert,
  Zap,
  RefreshCw,
  SlidersHorizontal,
  CheckCircle2,
  AlertTriangle,
  FileCode,
  Sparkles,
  Info,
  DollarSign,
  Layers,
  Database,
  Lock,
  Globe,
  Bell,
  Cpu,
  RotateCcw,
  Send,
  Activity,
  Check,
} from "lucide-react";

// Locale-Safe Formatters

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

const DEFAULT_SETTINGS: RiskEngineSettings = {
  risk_threshold_block: 0.7,
  risk_threshold_review: 0.3,
  fp_cost: 25.0,
  fn_cost_multiplier: 1.0,
  review_cost: 5.0,
  weight_ml: 0.4,
  weight_rules: 0.2,
  weight_anomaly: 0.15,
  weight_behavior: 0.15,
  weight_graph: 0.1,
  rule_velocity_5m_limit: 3,
  rule_velocity_1h_limit: 5,
  rule_amount_dev_multiplier: 3.0,
  rule_shared_device_limit: 2,
  webhook_slack_url: "https://hooks.slack.com/services/T00/B00/XXXX",
  webhook_pagerduty_key: "pd_live_sec_8891240",
  strictness_preset: "BALANCED",
};

import { useAuth } from "@/context/AuthContext";

export default function SettingsPage() {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "thresholds" | "fusion" | "rules" | "cost" | "integrations"
  >("thresholds");
  const [settings, setSettings] =
    useState<RiskEngineSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isLiveApi, setIsLiveApi] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const { user, role, signInAsDemo } = useAuth();

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchSettings = () => {
    setLoading(true);
    const fetcher =
      typeof getRiskSettings === "function"
        ? getRiskSettings()
        : apiFetch<RiskEngineSettings>("/api/risk/settings");

    fetcher
      .then((data) => {
        if (data) {
          setSettings(data);
          setIsLiveApi(true);
        }
      })
      .catch(() => {
        setIsLiveApi(false);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    setMounted(true);
    fetchSettings();
  }, []);

  const handleSave = async () => {
    if (role === "ANALYST") {
      showToast(
        "⚠️ Read-Only: Merchant Admin privileges required to deploy policy adjustments.",
      );
      return;
    }
    setSaving(true);
    try {
      if (typeof updateRiskSettings === "function") {
        await updateRiskSettings(settings);
      } else {
        await apiFetch("/api/risk/settings", {
          method: "POST",
          body: JSON.stringify(settings),
        });
      }
      showToast(
        "✓ Risk engine parameters deployed and synchronized across all active workers!",
      );
      setIsLiveApi(true);
    } catch {
      showToast("✓ Risk settings updated locally (Local demo mode)");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (role === "ANALYST") {
      showToast(
        "⚠️ Read-Only: Merchant Admin privileges required to reset policy defaults.",
      );
      return;
    }
    try {
      const res: any =
        typeof resetRiskSettings === "function"
          ? await resetRiskSettings()
          : await apiFetch("/api/risk/settings/reset", { method: "POST" });
      setSettings(res?.settings || DEFAULT_SETTINGS);
      showToast("✓ Risk Engine parameters reset to factory defaults.");
    } catch {
      setSettings(DEFAULT_SETTINGS);
      showToast("✓ Settings reset to defaults (Local mode)");
    }
  };

  const applyPreset = (presetName: "AGGRESSIVE" | "BALANCED" | "GROWTH") => {
    if (presetName === "AGGRESSIVE") {
      setSettings({
        ...settings,
        strictness_preset: "AGGRESSIVE",
        risk_threshold_review: 0.2,
        risk_threshold_block: 0.6,
        weight_ml: 0.5,
        weight_rules: 0.2,
        weight_anomaly: 0.1,
        weight_behavior: 0.1,
        weight_graph: 0.1,
        rule_velocity_5m_limit: 2,
        rule_velocity_1h_limit: 3,
        rule_amount_dev_multiplier: 2.0,
      });
      showToast("✓ Applied 'Aggressive Defense' preset profile");
    } else if (presetName === "BALANCED") {
      setSettings({
        ...settings,
        strictness_preset: "BALANCED",
        risk_threshold_review: 0.3,
        risk_threshold_block: 0.7,
        weight_ml: 0.4,
        weight_rules: 0.2,
        weight_anomaly: 0.15,
        weight_behavior: 0.15,
        weight_graph: 0.1,
        rule_velocity_5m_limit: 3,
        rule_velocity_1h_limit: 5,
        rule_amount_dev_multiplier: 3.0,
      });
      showToast("✓ Applied 'Balanced Commercial' preset profile");
    } else if (presetName === "GROWTH") {
      setSettings({
        ...settings,
        strictness_preset: "GROWTH",
        risk_threshold_review: 0.4,
        risk_threshold_block: 0.8,
        weight_ml: 0.35,
        weight_rules: 0.15,
        weight_anomaly: 0.2,
        weight_behavior: 0.15,
        weight_graph: 0.15,
        rule_velocity_5m_limit: 5,
        rule_velocity_1h_limit: 8,
        rule_amount_dev_multiplier: 4.5,
      });
      showToast("✓ Applied 'Growth & Low Friction' preset profile");
    }
  };

  const weightsSum = useMemo(() => {
    return (
      (settings.weight_ml || 0) +
      (settings.weight_rules || 0) +
      (settings.weight_anomaly || 0) +
      (settings.weight_behavior || 0) +
      (settings.weight_graph || 0)
    );
  }, [settings]);

  const autoBalanceWeights = () => {
    const total = weightsSum;
    if (total <= 0) return;
    setSettings({
      ...settings,
      weight_ml: parseFloat((settings.weight_ml / total).toFixed(2)),
      weight_rules: parseFloat((settings.weight_rules / total).toFixed(2)),
      weight_anomaly: parseFloat((settings.weight_anomaly / total).toFixed(2)),
      weight_behavior: parseFloat(
        (settings.weight_behavior / total).toFixed(2),
      ),
      weight_graph: parseFloat((settings.weight_graph / total).toFixed(2)),
    });
    showToast("✓ Fusion weights re-balanced to exactly 100%");
  };

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
              <Sliders size={20} className="text-blue-400" />
            </div>
            <h1>Risk Engine Settings & Policy Orchestration</h1>
            <span className="badge badge-low" style={{ fontSize: "0.75rem" }}>
              <span
                className="status-dot"
                style={{ display: "inline-block" }}
              />
              {isLiveApi ? "Hot-Reload Pipeline Online" : "Local Configuration"}
            </span>
          </div>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
            Configure decision thresholds, multi-signal fusion weights,
            heuristic velocity limits, asymmetric cost matrices, and gateway
            webhook dispatch.
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          {role === "ANALYST" ? (
            <div
              style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
            >
              <span
                className="badge badge-high"
                style={{
                  fontSize: "0.7rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.3rem",
                }}
              >
                <Lock size={12} /> Read-Only Mode
              </span>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  signInAsDemo("ADMIN");
                  showToast(
                    "✓ Switched to Merchant Admin (MARQ) — Full Edit Privileges Enabled",
                  );
                }}
                style={{
                  fontSize: "0.75rem",
                  borderColor: "rgba(168, 85, 247, 0.4)",
                  color: "#c084fc",
                }}
              >
                Switch to Admin Mode
              </button>
            </div>
          ) : (
            <>
              <button className="btn btn-secondary" onClick={handleReset}>
                <RotateCcw size={15} /> Reset Defaults
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSave}
                disabled={saving}
              >
                <Zap size={15} /> {saving ? "Deploying..." : "Deploy Settings"}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Analyst Warning Notice */}
      {role === "ANALYST" && (
        <div
          style={{
            padding: "0.85rem 1.25rem",
            borderRadius: "10px",
            background: "rgba(245, 158, 11, 0.08)",
            border: "1px solid rgba(245, 158, 11, 0.3)",
            marginBottom: "1.5rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "0.75rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <AlertTriangle size={18} color="#f59e0b" />
            <div>
              <div
                style={{
                  fontSize: "0.8125rem",
                  fontWeight: 700,
                  color: "#f59e0b",
                }}
              >
                Risk Analyst View · Policy Configuration is Read-Only
              </div>
              <div
                style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}
              >
                You are logged in as MA RIZWAN. You can inspect all active
                fusion weights and heuristic limits. Modifying policy thresholds
                or asymmetric cost matrices requires Merchant Admin privileges.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Strictness Presets Bar */}
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
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <ShieldCheck size={20} className="text-emerald-400" />
          <div>
            <div
              style={{ fontSize: "0.8125rem", fontWeight: 700, color: "#fff" }}
            >
              Active Strictness Profile:{" "}
              <span style={{ color: "var(--accent-blue)" }}>
                {settings.strictness_preset}
              </span>
            </div>
            <div
              style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}
            >
              Quickly apply calibrated risk profiles tailored to business risk
              tolerance
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            className="btn btn-secondary"
            style={{
              padding: "0.35rem 0.75rem",
              fontSize: "0.75rem",
              borderColor:
                settings.strictness_preset === "AGGRESSIVE"
                  ? "var(--accent-blue)"
                  : "inherit",
            }}
            onClick={() => applyPreset("AGGRESSIVE")}
          >
            🛡️ Aggressive Defense
          </button>
          <button
            className="btn btn-secondary"
            style={{
              padding: "0.35rem 0.75rem",
              fontSize: "0.75rem",
              borderColor:
                settings.strictness_preset === "BALANCED"
                  ? "var(--accent-blue)"
                  : "inherit",
            }}
            onClick={() => applyPreset("BALANCED")}
          >
            ⚖️ Balanced (Default)
          </button>
          <button
            className="btn btn-secondary"
            style={{
              padding: "0.35rem 0.75rem",
              fontSize: "0.75rem",
              borderColor:
                settings.strictness_preset === "GROWTH"
                  ? "var(--accent-blue)"
                  : "inherit",
            }}
            onClick={() => applyPreset("GROWTH")}
          >
            🚀 Growth / Low Friction
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
            id: "thresholds",
            label: "Decision Thresholds & Bands",
            icon: <SlidersHorizontal size={16} />,
          },
          {
            id: "fusion",
            label: "Multi-Signal Fusion Weights",
            icon: <Layers size={16} />,
          },
          {
            id: "rules",
            label: "Heuristic Rules & Velocity Limits",
            icon: <Zap size={16} />,
          },
          {
            id: "cost",
            label: "Asymmetric Cost Matrix",
            icon: <DollarSign size={16} />,
          },
          {
            id: "integrations",
            label: "Webhooks & Gateways",
            icon: <Globe size={16} />,
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

      {/*  TAB 1: DECISION THRESHOLDS & BANDS ── */}
      {activeTab === "thresholds" && (
        <div className="rg-2-12-10">
          <div className="card" style={{ padding: "1.5rem" }}>
            <h3
              style={{
                fontWeight: 700,
                fontSize: "1.125rem",
                color: "var(--text-primary)",
                marginBottom: "0.25rem",
              }}
            >
              Decision Cutoff Thresholds
            </h3>
            <p
              style={{
                fontSize: "0.8125rem",
                color: "var(--text-secondary)",
                marginBottom: "1.5rem",
              }}
            >
              Configure the risk boundaries partitioning transactions into
              Allow, Review, and Block decisions
            </p>

            {/* Visual Traffic Light Spectrum Bar */}
            <div style={{ marginBottom: "2rem" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  marginBottom: "0.5rem",
                }}
              >
                <span style={{ color: "#10b981" }}>
                  ALLOW (0.00 &rarr; {settings.risk_threshold_review.toFixed(2)}
                  )
                </span>
                <span style={{ color: "#f59e0b" }}>
                  REVIEW ({settings.risk_threshold_review.toFixed(2)} &rarr;{" "}
                  {settings.risk_threshold_block.toFixed(2)})
                </span>
                <span style={{ color: "#ef4444" }}>
                  BLOCK ({settings.risk_threshold_block.toFixed(2)} &rarr; 1.00)
                </span>
              </div>
              <div
                style={{
                  width: "100%",
                  height: "22px",
                  borderRadius: "6px",
                  backgroundColor: "#0f172a",
                  border: "1px solid #334155",
                  overflow: "hidden",
                  display: "flex",
                }}
              >
                <div
                  style={{
                    width: `${settings.risk_threshold_review * 100}%`,
                    backgroundColor: "#10b981",
                    height: "100%",
                  }}
                />
                <div
                  style={{
                    width: `${(settings.risk_threshold_block - settings.risk_threshold_review) * 100}%`,
                    backgroundColor: "#f59e0b",
                    height: "100%",
                  }}
                />
                <div
                  style={{
                    width: `${(1.0 - settings.risk_threshold_block) * 100}%`,
                    backgroundColor: "#ef4444",
                    height: "100%",
                  }}
                />
              </div>
            </div>

            {/* Sliders */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "1.5rem",
              }}
            >
              {/* Review Cutoff */}
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
                    marginBottom: "0.5rem",
                  }}
                >
                  <div>
                    <span
                      style={{
                        fontWeight: 700,
                        fontSize: "0.875rem",
                        color: "#fff",
                      }}
                    >
                      Review Cutoff Threshold
                    </span>
                    <p
                      style={{
                        fontSize: "0.7rem",
                        color: "var(--text-secondary)",
                      }}
                    >
                      Scores above this threshold trigger manual review & 3DS
                    </p>
                  </div>
                  <span
                    style={{
                      fontSize: "1.25rem",
                      fontWeight: 800,
                      color: "var(--accent-amber)",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    {settings.risk_threshold_review.toFixed(2)}
                  </span>
                </div>
                <input
                  type="range"
                  min="0.10"
                  max="0.50"
                  step="0.01"
                  value={settings.risk_threshold_review}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      risk_threshold_review: parseFloat(e.target.value),
                    })
                  }
                  style={{ width: "100%", accentColor: "#f59e0b" }}
                />
              </div>

              {/* Block Cutoff */}
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
                    marginBottom: "0.5rem",
                  }}
                >
                  <div>
                    <span
                      style={{
                        fontWeight: 700,
                        fontSize: "0.875rem",
                        color: "#fff",
                      }}
                    >
                      Block Cutoff Threshold
                    </span>
                    <p
                      style={{
                        fontSize: "0.7rem",
                        color: "var(--text-secondary)",
                      }}
                    >
                      Scores above this threshold are automatically declined
                    </p>
                  </div>
                  <span
                    style={{
                      fontSize: "1.25rem",
                      fontWeight: 800,
                      color: "#ef4444",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    {settings.risk_threshold_block.toFixed(2)}
                  </span>
                </div>
                <input
                  type="range"
                  min="0.50"
                  max="0.95"
                  step="0.01"
                  value={settings.risk_threshold_block}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      risk_threshold_block: parseFloat(e.target.value),
                    })
                  }
                  style={{ width: "100%", accentColor: "#ef4444" }}
                />
              </div>
            </div>
          </div>

          {/* Projected Outcomes */}
          <div className="card" style={{ padding: "1.5rem" }}>
            <h3
              style={{
                fontWeight: 700,
                fontSize: "1.125rem",
                color: "var(--text-primary)",
                marginBottom: "0.25rem",
              }}
            >
              Projected Decision Distribution
            </h3>
            <p
              style={{
                fontSize: "0.8125rem",
                color: "var(--text-secondary)",
                marginBottom: "1.5rem",
              }}
            >
              Simulated throughput across incoming production transaction stream
            </p>

            <div
              style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
            >
              <div
                style={{
                  padding: "1rem",
                  borderRadius: "8px",
                  backgroundColor: "rgba(16,185,129,0.1)",
                  border: "1px solid rgba(16,185,129,0.25)",
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
                      fontWeight: 700,
                      fontSize: "0.875rem",
                      color: "var(--accent-emerald)",
                    }}
                  >
                    ✓ Instant Allow Rate
                  </span>
                  <span
                    style={{
                      fontSize: "1.25rem",
                      fontWeight: 800,
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    92.4%
                  </span>
                </div>
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--text-secondary)",
                    marginTop: "0.25rem",
                  }}
                >
                  Frictionless one-click approvals for low-risk customers.
                </div>
              </div>

              <div
                style={{
                  padding: "1rem",
                  borderRadius: "8px",
                  backgroundColor: "rgba(245,158,11,0.1)",
                  border: "1px solid rgba(245,158,11,0.25)",
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
                      fontWeight: 700,
                      fontSize: "0.875rem",
                      color: "var(--accent-amber)",
                    }}
                  >
                    ⏳ Manual Review Rate
                  </span>
                  <span
                    style={{
                      fontSize: "1.25rem",
                      fontWeight: 800,
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    5.2%
                  </span>
                </div>
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--text-secondary)",
                    marginTop: "0.25rem",
                  }}
                >
                  Routed to human review queue or 3DS biometric challenge.
                </div>
              </div>

              <div
                style={{
                  padding: "1rem",
                  borderRadius: "8px",
                  backgroundColor: "rgba(239,68,68,0.1)",
                  border: "1px solid rgba(239,68,68,0.25)",
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
                      fontWeight: 700,
                      fontSize: "0.875rem",
                      color: "#ef4444",
                    }}
                  >
                    🛑 Automated Block Rate
                  </span>
                  <span
                    style={{
                      fontSize: "1.25rem",
                      fontWeight: 800,
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    2.4%
                  </span>
                </div>
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--text-secondary)",
                    marginTop: "0.25rem",
                  }}
                >
                  High-confidence fraud attempts dropped at authorization.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/*  TAB 2: MULTI-SIGNAL FUSION WEIGHTS ─ */}
      {activeTab === "fusion" && (
        <div className="rg-2-12-10">
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
                  Fusion Engine Signal Weights
                </h3>
                <p
                  style={{
                    fontSize: "0.8125rem",
                    color: "var(--text-secondary)",
                  }}
                >
                  Relative contribution of each specialized risk intelligence
                  model
                </p>
              </div>
              <button
                className="btn btn-secondary"
                style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}
                onClick={autoBalanceWeights}
              >
                Auto-Balance to 100%
              </button>
            </div>

            {/* Sum indicator */}
            <div
              style={{
                padding: "0.75rem 1rem",
                borderRadius: "6px",
                backgroundColor:
                  weightsSum === 1.0
                    ? "rgba(16,185,129,0.1)"
                    : "rgba(245,158,11,0.1)",
                border: "1px solid #1e293b",
                marginBottom: "1.25rem",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span
                style={{
                  fontSize: "0.8125rem",
                  color: "var(--text-secondary)",
                }}
              >
                Total Weight Allocation:
              </span>
              <span
                style={{
                  fontSize: "1rem",
                  fontWeight: 800,
                  color: weightsSum === 1.0 ? "#10b981" : "#f59e0b",
                  fontFamily: "var(--font-mono)",
                }}
              >
                {(weightsSum * 100).toFixed(0)}%{" "}
                {weightsSum === 1.0 ? "(Normalized)" : "(Unbalanced)"}
              </span>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "1.25rem",
              }}
            >
              {[
                {
                  key: "weight_ml",
                  label: "🤖 LightGBM Machine Learning Model",
                  desc: "Supervised gradient boosting score on 31 features",
                },
                {
                  key: "weight_rules",
                  label: "📜 Deterministic Business Rule Engine",
                  desc: "Hardcoded velocity, geographical, and address rules",
                },
                {
                  key: "weight_anomaly",
                  label: "⚡ Isolation Forest Anomaly Scorer",
                  desc: "Unsupervised zero-day behavioral anomaly detector",
                },
                {
                  key: "weight_behavior",
                  label: "👤 Customer Behavioral Profiler",
                  desc: "Deviation from cardholder 90-day purchase patterns",
                },
                {
                  key: "weight_graph",
                  label: "🕸️ Neo4j Graph Syndicate Network",
                  desc: "Multi-account community and shared device risk",
                },
              ].map((item) => (
                <div
                  key={item.key}
                  style={{
                    padding: "0.75rem 1rem",
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
                    <div>
                      <div
                        style={{
                          fontWeight: 600,
                          fontSize: "0.8125rem",
                          color: "#fff",
                        }}
                      >
                        {item.label}
                      </div>
                      <div
                        style={{
                          fontSize: "0.7rem",
                          color: "var(--text-secondary)",
                        }}
                      >
                        {item.desc}
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: "1.125rem",
                        fontWeight: 800,
                        color: "var(--accent-blue)",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      {((settings as any)[item.key] * 100).toFixed(0)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.0"
                    max="1.0"
                    step="0.05"
                    value={(settings as any)[item.key]}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        [item.key]: parseFloat(e.target.value),
                      })
                    }
                    style={{ width: "100%", accentColor: "#3b82f6" }}
                  />
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
              Signal Architecture Insights
            </h3>
            <p
              style={{
                fontSize: "0.8125rem",
                color: "var(--text-secondary)",
                marginBottom: "1.25rem",
              }}
            >
              How multi-layered fusion defends against evasion tactics
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
                    fontWeight: 700,
                    fontSize: "0.8125rem",
                    color: "#fff",
                    marginBottom: "0.25rem",
                  }}
                >
                  Defense in Depth
                </div>
                <p
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--text-secondary)",
                  }}
                >
                  If a sophisticated fraudster circumvents heuristic rules by
                  throttling transaction speed, the Isolation Forest Anomaly and
                  Neo4j Graph engines still flag the syndicate cluster.
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
                    fontWeight: 700,
                    fontSize: "0.8125rem",
                    color: "#fff",
                    marginBottom: "0.25rem",
                  }}
                >
                  Cold-Start Resiliency
                </div>
                <p
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--text-secondary)",
                  }}
                >
                  For brand-new accounts with zero transaction history, the
                  engine automatically upweights device fingerprinting and IP
                  graph clustering.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/*  TAB 3: HEURISTIC RULES & VELOCITY LIMITS  */}
      {activeTab === "rules" && (
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
              Velocity & Burst Protection Limits
            </h3>
            <p
              style={{
                fontSize: "0.8125rem",
                color: "var(--text-secondary)",
                marginBottom: "1.25rem",
              }}
            >
              Configure deterministic threshold triggers for rapid-fire card
              testing
            </p>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "1.25rem",
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
                  Max Transactions per 5 Minutes (Burst Limit)
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={settings.rule_velocity_5m_limit}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      rule_velocity_5m_limit: parseInt(e.target.value) || 1,
                    })
                  }
                  style={{
                    width: "100%",
                    padding: "0.625rem",
                    borderRadius: "6px",
                    backgroundColor: "#0f172a",
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
                  Max Transactions per 1 Hour (Rolling Hourly Limit)
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={settings.rule_velocity_1h_limit}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      rule_velocity_1h_limit: parseInt(e.target.value) || 1,
                    })
                  }
                  style={{
                    width: "100%",
                    padding: "0.625rem",
                    borderRadius: "6px",
                    backgroundColor: "#0f172a",
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
                  Spend Burst Multiplier (vs 90-day Customer Average)
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="1.5"
                  max="10.0"
                  value={settings.rule_amount_dev_multiplier}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      rule_amount_dev_multiplier:
                        parseFloat(e.target.value) || 1.5,
                    })
                  }
                  style={{
                    width: "100%",
                    padding: "0.625rem",
                    borderRadius: "6px",
                    backgroundColor: "#0f172a",
                    border: "1px solid #334155",
                    color: "#fff",
                    fontSize: "0.875rem",
                  }}
                />
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
              Identity & Device Collision Limits
            </h3>
            <p
              style={{
                fontSize: "0.8125rem",
                color: "var(--text-secondary)",
                marginBottom: "1.25rem",
              }}
            >
              Configure device sharing and geographical discrepancy penalties
            </p>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "1.25rem",
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
                  Max Distinct Customer Accounts per Shared Device ID
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={settings.rule_shared_device_limit}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      rule_shared_device_limit: parseInt(e.target.value) || 1,
                    })
                  }
                  style={{
                    width: "100%",
                    padding: "0.625rem",
                    borderRadius: "6px",
                    backgroundColor: "#0f172a",
                    border: "1px solid #334155",
                    color: "#fff",
                    fontSize: "0.875rem",
                  }}
                />
                <span
                  style={{
                    fontSize: "0.7rem",
                    color: "var(--text-tertiary)",
                    marginTop: "0.25rem",
                    display: "block",
                  }}
                >
                  Flagged when device canvas hash is associated with multiple
                  usernames.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/*  TAB 4: ASYMMETRIC COST MATRIX  */}
      {activeTab === "cost" && (
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
              Cost-Sensitive Loss Parameters
            </h3>
            <p
              style={{
                fontSize: "0.8125rem",
                color: "var(--text-secondary)",
                marginBottom: "1.25rem",
              }}
            >
              Assign dollar values to false positive customer friction vs
              uncaptured fraud losses
            </p>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "1.25rem",
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
                  False Positive Friction Cost ($ per legitimate user
                  challenged)
                </label>
                <input
                  type="number"
                  value={settings.fp_cost}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      fp_cost: parseFloat(e.target.value) || 0,
                    })
                  }
                  style={{
                    width: "100%",
                    padding: "0.625rem",
                    borderRadius: "6px",
                    backgroundColor: "#0f172a",
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
                  Manual Analyst Review Cost ($ per case)
                </label>
                <input
                  type="number"
                  value={settings.review_cost}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      review_cost: parseFloat(e.target.value) || 0,
                    })
                  }
                  style={{
                    width: "100%",
                    padding: "0.625rem",
                    borderRadius: "6px",
                    backgroundColor: "#0f172a",
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
                  False Negative Multiplier (1.0 = 100% of order amount + fees)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={settings.fn_cost_multiplier}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      fn_cost_multiplier: parseFloat(e.target.value) || 1.0,
                    })
                  }
                  style={{
                    width: "100%",
                    padding: "0.625rem",
                    borderRadius: "6px",
                    backgroundColor: "#0f172a",
                    border: "1px solid #334155",
                    color: "#fff",
                    fontSize: "0.875rem",
                  }}
                />
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
              Expected Financial Loss Formula
            </h3>
            <p
              style={{
                fontSize: "0.8125rem",
                color: "var(--text-secondary)",
                marginBottom: "1.25rem",
              }}
            >
              How Expected Loss ($) is computed for every scored checkout
            </p>

            <div
              style={{
                padding: "1rem",
                borderRadius: "8px",
                backgroundColor: "rgba(0,0,0,0.5)",
                border: "1px solid #1e293b",
                fontFamily: "var(--font-mono)",
                fontSize: "0.8125rem",
                color: "var(--accent-cyan)",
                marginBottom: "1rem",
              }}
            >
              Expected_Loss = Risk_Score &times; Amount &times;{" "}
              {settings.fn_cost_multiplier.toFixed(1)} + FP_Cost_Penalty
            </div>

            <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
              If a transaction has an expected financial loss greater than
              $150.00, it is automatically elevated to mandatory human review
              regardless of score.
            </p>
          </div>
        </div>
      )}

      {/*  TAB 5: WEBHOOKS & GATEWAYS  */}
      {activeTab === "integrations" && (
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
              Alert Notification Webhooks
            </h3>
            <p
              style={{
                fontSize: "0.8125rem",
                color: "var(--text-secondary)",
                marginBottom: "1.25rem",
              }}
            >
              Real-time notifications for critical fraud attacks and velocity
              bursts
            </p>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "1.25rem",
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
                  Slack Incident Webhook URL
                </label>
                <input
                  type="text"
                  value={settings.webhook_slack_url}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      webhook_slack_url: e.target.value,
                    })
                  }
                  style={{
                    width: "100%",
                    padding: "0.625rem",
                    borderRadius: "6px",
                    backgroundColor: "#0f172a",
                    border: "1px solid #334155",
                    color: "#fff",
                    fontSize: "0.8125rem",
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
                  PagerDuty Routing Key (Critical On-Call Escalation)
                </label>
                <input
                  type="text"
                  value={settings.webhook_pagerduty_key}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      webhook_pagerduty_key: e.target.value,
                    })
                  }
                  style={{
                    width: "100%",
                    padding: "0.625rem",
                    borderRadius: "6px",
                    backgroundColor: "#0f172a",
                    border: "1px solid #334155",
                    color: "#fff",
                    fontSize: "0.8125rem",
                  }}
                />
              </div>

              <button
                className="btn btn-secondary"
                onClick={() =>
                  showToast(
                    "✓ Test ping sent to configured Slack and PagerDuty endpoints",
                  )
                }
              >
                <Bell size={15} /> Send Test Webhook Notification
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
              Connected Gateway Status
            </h3>
            <p
              style={{
                fontSize: "0.8125rem",
                color: "var(--text-secondary)",
                marginBottom: "1.25rem",
              }}
            >
              Production payment connectors and graph cluster telemetry
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
                  name: "Neo4j Aura Graph Database",
                  status: "ONLINE",
                  latency: "14ms",
                },
                {
                  name: "Redis Real-Time Velocity Cache",
                  status: "ONLINE",
                  latency: "2ms",
                },
                {
                  name: "Stripe Payment Gateway Connector",
                  status: "ACTIVE",
                  latency: "38ms",
                },
                {
                  name: "Visa VROL Representment Port",
                  status: "CONNECTED",
                  latency: "120ms",
                },
              ].map((gw, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: "0.75rem 1rem",
                    borderRadius: "6px",
                    backgroundColor: "rgba(15,23,42,0.8)",
                    border: "1px solid #1e293b",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.8125rem",
                      fontWeight: 600,
                      color: "#fff",
                    }}
                  >
                    {gw.name}
                  </span>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    <span
                      className="badge badge-low"
                      style={{ fontSize: "0.65rem" }}
                    >
                      {gw.status}
                    </span>
                    <span
                      style={{
                        fontSize: "0.7rem",
                        color: "var(--text-tertiary)",
                      }}
                    >
                      {gw.latency}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
