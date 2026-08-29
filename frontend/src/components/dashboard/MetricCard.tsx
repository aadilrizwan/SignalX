"use client";

import React from "react";

interface MetricCardProps {
  label: string;
  value: string;
  icon?: React.ReactNode;
  variant?: "default" | "success" | "danger" | "warning";
  change?: string;
  changeDirection?: "up" | "down";
}

export function MetricCard({
  label,
  value,
  icon,
  variant = "default",
  change,
  changeDirection,
}: MetricCardProps) {
  const valueColor: Record<string, string> = {
    default: "var(--foreground)",
    success: "var(--risk-low)",
    danger: "var(--risk-high)",
    warning: "var(--risk-medium)",
  };

  return (
    <div className="card metric-card animate-fade-in">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span className="metric-label">{label}</span>
        {icon && <span style={{ color: "var(--foreground-dim)" }}>{icon}</span>}
      </div>
      <span className="metric-value" style={{ color: valueColor[variant] }}>
        {value}
      </span>
      {change && (
        <span className={`metric-change ${changeDirection === "up" ? "negative" : "positive"}`}>
          {changeDirection === "up" ? "▲" : "▼"} {change}
        </span>
      )}
    </div>
  );
}
