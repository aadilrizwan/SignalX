"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface FraudByCountryChartProps {
  data?: Array<{ billing_country: string; count: number; fraud: number; rate: number }>;
}

const DEFAULT_COUNTRY_DATA = [
  { billing_country: "NG", count: 1850, fraud: 490, rate: 0.264 },
  { billing_country: "US", count: 32400, fraud: 380, rate: 0.011 },
  { billing_country: "GB", count: 4200, fraud: 120, rate: 0.028 },
  { billing_country: "BR", count: 2100, fraud: 95, rate: 0.045 },
  { billing_country: "RU", count: 890, fraud: 82, rate: 0.092 },
  { billing_country: "CA", count: 3100, fraud: 45, rate: 0.014 },
  { billing_country: "DE", count: 2800, fraud: 32, rate: 0.011 },
];

export function FraudByCountryChart({ data }: FraudByCountryChartProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const rawData = data && data.length > 0 ? data : DEFAULT_COUNTRY_DATA;

  const chartData = rawData.slice(0, 7).map((d) => ({
    country: d.billing_country,
    fraudCount: d.fraud,
    rate: (d.rate * 100).toFixed(1),
  }));

  if (!mounted) {
    return <div className="chart-container" style={{ height: 260, background: "var(--bg-surface)" }} />;
  }

  return (
    <div className="chart-container" style={{ height: 260, width: "100%" }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} layout="vertical" margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293e" horizontal={false} />
          <XAxis type="number" tick={{ fill: "#94a3b8", fontSize: 11, fontFamily: "Inter, sans-serif" }} stroke="#1e293e" />
          <YAxis
            type="category"
            dataKey="country"
            width={40}
            tick={{ fill: "#f8fafc", fontSize: 12, fontWeight: 600, fontFamily: "JetBrains Mono, monospace" }}
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
            }}
            formatter={(value: any, name: any) => [value, name === "fraudCount" ? "Fraud Transactions" : name]}
          />
          <Bar dataKey="fraudCount" radius={[0, 4, 4, 0]}>
            {chartData.map((entry, i) => (
              <Cell key={i} fill={i === 0 ? "#ef4444" : i < 3 ? "#f59e0b" : "#3b82f6"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
