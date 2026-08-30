"use client";

import { useState } from "react";
import Link from "next/link";
import { ShieldCheck, ArrowRight, Menu, X } from "lucide-react";

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="top-navbar">
      <div className="top-navbar-container">
        {/* Brand */}
        <Link href="/" className="navbar-brand">
          <div className="navbar-logo">
            <ShieldCheck size={20} />
          </div>
          <span className="navbar-title">SignalX</span>
          <span className="navbar-badge hide-on-mobile">ENTERPRISE</span>
        </Link>

        {/* Desktop Links */}
        <nav className="navbar-links">
          <a href="#features" className="nav-link">
            Platform
          </a>
          <a href="#live-sandbox" className="nav-link">
            Live Sandbox
          </a>
          <a href="#architecture" className="nav-link">
            Architecture
          </a>
          <Link href="/model" className="nav-link">
            Model Metrics
          </Link>
          <Link href="/settings" className="nav-link">
            Risk Engine
          </Link>
        </nav>

        {/* Action CTAs */}
        <div className="navbar-actions">
          <div className="status-indicator hide-on-mobile">
            <span className="status-dot" />
            <span>API Operational</span>
          </div>

          <Link
            href="/login"
            className="btn btn-secondary btn-sm nav-cta-secondary"
            style={{
              padding: "0.4rem 0.75rem",
              fontSize: "0.8125rem",
              borderColor: "rgba(255,255,255,0.12)",
            }}
          >
            Sign In / Demo
          </Link>

          <Link href="/dashboard" className="btn btn-primary btn-sm nav-cta-primary">
            <span className="nav-cta-text-full">Launch Dashboard</span>
            <span className="nav-cta-text-short">Dashboard</span>
            <ArrowRight size={14} />
          </Link>

          {/* Mobile Hamburger Toggle */}
          <button
            className="mobile-menu-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Nav Drawer */}
      <div className={`mobile-nav-drawer ${mobileMenuOpen ? "open" : ""}`}>
        <a
          href="#features"
          className="mobile-drawer-link"
          onClick={() => setMobileMenuOpen(false)}
        >
          Platform Features
        </a>
        <a
          href="#live-sandbox"
          className="mobile-drawer-link"
          onClick={() => setMobileMenuOpen(false)}
        >
          Live Scoring Sandbox
        </a>
        <a
          href="#architecture"
          className="mobile-drawer-link"
          onClick={() => setMobileMenuOpen(false)}
        >
          Engine Architecture
        </a>
        <Link
          href="/model"
          className="mobile-drawer-link"
          onClick={() => setMobileMenuOpen(false)}
        >
          Model Performance & Metrics
        </Link>
        <Link
          href="/settings"
          className="mobile-drawer-link"
          onClick={() => setMobileMenuOpen(false)}
        >
          Risk Engine & Thresholds
        </Link>

        <div className="mobile-drawer-actions">
          <Link
            href="/login"
            className="btn btn-secondary"
            style={{ width: "100%", justifyContent: "center", padding: "0.6rem" }}
            onClick={() => setMobileMenuOpen(false)}
          >
            Sign In / 1-Click Demo Access
          </Link>
          <Link
            href="/dashboard"
            className="btn btn-primary"
            style={{ width: "100%", justifyContent: "center", padding: "0.6rem" }}
            onClick={() => setMobileMenuOpen(false)}
          >
            Launch Merchant Dashboard <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </header>
  );
}

