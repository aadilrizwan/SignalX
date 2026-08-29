"use client";

import { useEffect, useState } from "react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

interface RiskDistributionChartProps {
  data?: Record<string, number>;
}

const DEFAULT_RISK_DATA = {
  LOW: 48210,
  MEDIUM: 3120,
  HIGH: 1840,
  CRITICAL: 576,
};

export function RiskDistributionChart({ data }: RiskDistributionChartProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const rawData = data && Object.keys(data).length > 0 ? data : DEFAULT_RISK_DATA;

  // Map to Radar format with logarithmic or normalized scale for visual clarity
  const total = Object.values(rawData).reduce((acc, v) => acc + (v as number), 0) || 1;
  const chartData = [
    { riskTier: "LOW", count: rawData.LOW || 0, percentage: Number((((rawData.LOW || 0) / total) * 100).toFixed(1)) },
    { riskTier: "MEDIUM", count: rawData.MEDIUM || 0, percentage: Number((((rawData.MEDIUM || 0) / total) * 100).toFixed(1)) },
    { riskTier: "HIGH", count: rawData.HIGH || 0, percentage: Number((((rawData.HIGH || 0) / total) * 100).toFixed(1)) },
    { riskTier: "CRITICAL", count: rawData.CRITICAL || 0, percentage: Number((((rawData.CRITICAL || 0) / total) * 100).toFixed(1)) },
  ];

  if (!mounted) {
    return <div className="chart-container" style={{ height: 280, background: "var(--bg-surface)" }} />;
  }

  return (
    <div className="chart-container" style={{ height: 280, width: "100%" }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData}>
          <PolarGrid stroke="#1e293e" />
          <PolarAngleAxis
            dataKey="riskTier"
            tick={{ fill: "#94a3b8", fontSize: 11, fontWeight: 700, fontFamily: "Plus Jakarta Sans, sans-serif" }}
          />
          <PolarRadiusAxis
            angle={30}
            domain={[0, 'auto']}
            tick={{ fill: "#64748b", fontSize: 9 }}
            stroke="#1e293e"
          />
          <Tooltip
            contentStyle={{
              background: "#0f1422",
              border: "1px solid #1e293e",
              borderRadius: "8px",
              color: "#f8fafc",
              fontSize: "12px",
              fontFamily: "Inter, sans-serif",
              boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
            }}
            formatter={(value: any, name: any, item: any) => [
              `${new Intl.NumberFormat("en-US").format(Number(value))} txns (${item.payload.percentage}%)`,
              "Volume",
            ]}
          />
          <Radar
            name="Risk Spectrum"
            dataKey="count"
            stroke="#3b82f6"
            fill="#3b82f6"
            fillOpacity={0.35}
            strokeWidth={2}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
