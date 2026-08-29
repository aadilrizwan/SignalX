"use client";

import { useEffect, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface FraudTrendChartProps {
  data?: Array<{ date: string; total_count: number; fraud_count: number }>;
}

const DEFAULT_TREND_DATA = [
  { date: "Aug 01", total_count: 1420, fraud_count: 52 },
  { date: "Aug 05", total_count: 1680, fraud_count: 61 },
  { date: "Aug 10", total_count: 1540, fraud_count: 48 },
  { date: "Aug 15", total_count: 1890, fraud_count: 89 },
  { date: "Aug 20", total_count: 2100, fraud_count: 94 },
  { date: "Aug 25", total_count: 1950, fraud_count: 72 },
  { date: "Aug 30", total_count: 2240, fraud_count: 85 },
];

export function FraudTrendChart({ data }: FraudTrendChartProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const rawData = data && data.length > 0 ? data : DEFAULT_TREND_DATA;

  const chartData = rawData.map((d) => ({
    ...d,
    legit_count: d.total_count - d.fraud_count,
    fraud_rate: d.total_count > 0 ? ((d.fraud_count / d.total_count) * 100).toFixed(2) : "0",
  }));

  if (!mounted) {
    return <div className="chart-container" style={{ height: 300, background: "var(--bg-surface)" }} />;
  }

  return (
    <div className="chart-container" style={{ height: 300, width: "100%" }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
          <defs>
            <linearGradient id="gradientLegit" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
            </linearGradient>
            <linearGradient id="gradientFraud" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.45} />
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293e" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fill: "#94a3b8", fontSize: 11, fontFamily: "Inter, sans-serif" }}
            stroke="#1e293e"
          />
          <YAxis
            tick={{ fill: "#94a3b8", fontSize: 11, fontFamily: "Inter, sans-serif" }}
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
          />
          <Legend
            wrapperStyle={{ paddingTop: "10px", fontSize: "12px", fontFamily: "Inter, sans-serif" }}
          />
          <Area
            type="monotone"
            dataKey="legit_count"
            name="Legitimate Transactions"
            stroke="#3b82f6"
            fill="url(#gradientLegit)"
            strokeWidth={2.5}
          />
          <Area
            type="monotone"
            dataKey="fraud_count"
            name="Fraud Attempts"
            stroke="#ef4444"
            fill="url(#gradientFraud)"
            strokeWidth={2.5}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
