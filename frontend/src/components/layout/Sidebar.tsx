"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  LayoutDashboard,
  CreditCard,
  Network,
  RotateCcw,
  Shield,
  FileText,
  Settings,
  BarChart3,
  Activity,
  ShieldCheck,
  Zap,
} from "lucide-react";

interface NavGroup {
  group: string;
  items: {
    href: string;
    label: string;
    icon: React.ElementType;
    badge?: string;
  }[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    group: "OVERVIEW",
    items: [
      { href: "/", label: "Landing Home", icon: Home },
      {
        href: "/dashboard",
        label: "Merchant Dashboard",
        icon: LayoutDashboard,
      },
      { href: "/transactions", label: "Transactions", icon: CreditCard },
    ],
  },
  {
    group: "DEFENSE ENGINES",
    items: [
      { href: "/fraud-graph", label: "Fraud Ring Graph", icon: Network },
      { href: "/returns", label: "Return Abuse", icon: RotateCcw },
      { href: "/chargebacks", label: "Chargeback Defense", icon: Shield },
      { href: "/evidence", label: "Evidence Package", icon: FileText },
    ],
  },
  {
    group: "INTELLIGENCE & CONFIG",
    items: [
      {
        href: "/model",
        label: "Model Metrics",
        icon: BarChart3,
        badge: "LightGBM",
      },
      {
        href: "/reviews",
        label: "Review Queue",
        icon: Activity,
        badge: "Live",
      },
      { href: "/settings", label: "Risk Engine Settings", icon: Settings },
    ],
  },
];

import { useAuth } from "@/context/AuthContext";
import { LogOut, User as UserIcon } from "lucide-react";

export function Sidebar() {
  const pathname = usePathname();
  const { user, role, signOut, isDemoUser } = useAuth();

  const getInitials = (name?: string) => {
    if (!name) return "RO";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const handleSignOut = async () => {
    await signOut();
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
  };

  return (
    <aside className="sidebar">
      {/* Brand Header */}
      <div className="sidebar-brand">
        <div className="sidebar-brand-icon">
          <ShieldCheck size={20} />
        </div>
        <div className="sidebar-brand-text">
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <h1>SignalX</h1>
          </div>
          <span>Merchant Risk Defense</span>
        </div>
      </div>

      {/* Nav Groups */}
      <div className="sidebar-nav">
        {NAV_GROUPS.map((group) => (
          <div key={group.group} className="sidebar-group">
            <div className="sidebar-group-title">{group.group}</div>
            <div className="sidebar-group-items">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname === item.href ||
                      pathname.startsWith(`${item.href}/`);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`sidebar-link ${isActive ? "active" : ""}`}
                  >
                    <Icon size={17} className="sidebar-link-icon" />
                    <span className="sidebar-link-label">{item.label}</span>
                    {item.badge && (
                      <span className="sidebar-link-badge">{item.badge}</span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* User Profile Card & Engine Status */}
      <div className="sidebar-footer" style={{ padding: "0.85rem 0.75rem", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {/* User Card */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0.5rem 0.65rem",
            borderRadius: "8px",
            background: "rgba(15, 23, 42, 0.6)",
            border: "1px solid rgba(255, 255, 255, 0.05)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", overflow: "hidden" }}>
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                background: role === "ADMIN" ? "linear-gradient(135deg, #a855f7, #ec4899)" : "linear-gradient(135deg, #3b82f6, #06b6d4)",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: "0.75rem",
                flexShrink: 0,
              }}
            >
              {getInitials(user?.name)}
            </div>
            <div style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
              <span
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  color: "#fff",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {user?.name || "Risk Analyst"}
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                <span
                  style={{
                    fontSize: "0.625rem",
                    padding: "0.1rem 0.35rem",
                    borderRadius: "4px",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    background: role === "ADMIN" ? "rgba(168, 85, 247, 0.15)" : "rgba(6, 182, 212, 0.15)",
                    color: role === "ADMIN" ? "#c084fc" : "#22d3ee",
                    border: `1px solid ${role === "ADMIN" ? "rgba(168, 85, 247, 0.3)" : "rgba(6, 182, 212, 0.3)"}`,
                  }}
                >
                  {role}
                </span>
                {isDemoUser && (
                  <span style={{ fontSize: "0.6rem", color: "var(--text-tertiary)" }}>Demo</span>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
            <Link
              href="/login"
              title="Switch User / Roles"
              style={{
                color: "var(--text-tertiary)",
                padding: "0.25rem",
                borderRadius: "4px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                textDecoration: "none",
              }}
              className="hover:text-white"
            >
              <UserIcon size={14} />
            </Link>
            <button
              type="button"
              onClick={handleSignOut}
              title="Log Out of SignalX"
              style={{
                background: "transparent",
                border: "none",
                color: "#f87171",
                cursor: "pointer",
                padding: "0.25rem",
                borderRadius: "4px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              className="hover:opacity-80"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>

        {/* Engine Status */}
        <div className="sidebar-footer-status" style={{ padding: 0 }}>
          <span className="sidebar-status-dot" />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span
              style={{
                fontSize: "0.75rem",
                fontWeight: 700,
                color: "var(--text-primary)",
              }}
            >
              Engine Online
            </span>
            <span
              style={{ fontSize: "0.6875rem", color: "var(--text-tertiary)" }}
            >
              Latency &lt;10ms · P99
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}
