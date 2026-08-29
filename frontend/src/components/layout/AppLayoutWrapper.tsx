"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Sidebar } from "@/components/layout/Sidebar";
import { Navbar } from "@/components/layout/Navbar";
import {
  ShieldCheck,
  Menu,
  X,
  LayoutDashboard,
  CreditCard,
  Network,
  RotateCcw,
  Shield,
  FileText,
  BarChart3,
  Activity,
  Settings,
  Home,
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

import { AuthProvider } from "@/context/AuthContext";

export function AppLayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isHomePage = pathname === "/";
  const isLoginPage = pathname === "/login";
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (isLoginPage) {
    return (
      <AuthProvider>
        <main>{children}</main>
      </AuthProvider>
    );
  }

  if (isHomePage) {
    return (
      <AuthProvider>
        <div className="landing-layout">
          <Navbar />
          <main>{children}</main>
        </div>
      </AuthProvider>
    );
  }

  return (
    <AuthProvider>
      <div className="app-layout">
      {/* Mobile Top Bar for App Pages */}
      <header className="mobile-app-header">
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <div
            className="navbar-logo"
            style={{ width: "30px", height: "30px" }}
          >
            <ShieldCheck size={18} />
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span
              style={{
                fontWeight: 800,
                fontSize: "1rem",
                letterSpacing: "-0.02em",
                color: "var(--text-primary)",
                lineHeight: 1.2,
              }}
            >
              SignalX
            </span>
            <span
              style={{
                fontSize: "0.625rem",
                color: "var(--text-tertiary)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                fontWeight: 700,
              }}
            >
              Merchant Defense
            </span>
          </div>
        </div>
        <button
          className="mobile-menu-btn"
          style={{ display: "inline-flex" }}
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle App Menu"
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>

      {/* Mobile Nav Drawer for App Pages */}
      {mobileMenuOpen && (
        <div className="mobile-app-drawer">
          {NAV_GROUPS.map((group) => (
            <div key={group.group} style={{ marginBottom: "0.75rem" }}>
              <div
                style={{
                  fontSize: "0.6875rem",
                  fontWeight: 700,
                  color: "var(--text-tertiary)",
                  letterSpacing: "0.08em",
                  padding: "0 0.5rem 0.35rem 0.5rem",
                  textTransform: "uppercase",
                  fontFamily: "var(--font-heading)",
                }}
              >
                {group.group}
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.2rem",
                }}
              >
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
                      onClick={() => setMobileMenuOpen(false)}
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
      )}

      <Sidebar />
      <main className="main-content">{children}</main>
    </div>
    </AuthProvider>
  );
}
