"use client";

import { useEffect, useState } from "react";
import {
  RadialBarChart,
  RadialBar,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";

interface DecisionDistributionChartProps {
  data?: Record<string, number>;
}

const DEFAULT_DECISION_DATA = {
  ALLOW: 49500,
  REVIEW: 2980,
  BLOCK: 1266,
};

const DECISION_META: Record<string, { fill: string; label: string }> = {
  ALLOW: { fill: "#10b981", label: "ALLOW" },
  REVIEW: { fill: "#f59e0b", label: "REVIEW" },
  BLOCK: { fill: "#ef4444", label: "BLOCK" },
};

export function DecisionDistributionChart({ data }: DecisionDistributionChartProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const rawData = data && Object.keys(data).length > 0 ? data : DEFAULT_DECISION_DATA;

  const total = Object.values(rawData).reduce((acc, v) => acc + (v as number), 0) || 1;

  // Format data for RadialBarChart
  const chartData = Object.entries(rawData).map(([name, value]) => ({
    name,
    count: value as number,
    percentage: Number((((value as number) / total) * 100).toFixed(1)),
    fill: DECISION_META[name]?.fill || "#64748b",
  }));

  if (!mounted) {
    return <div className="chart-container" style={{ height: 280, background: "var(--bg-surface)" }} />;
  }

  return (
    <div className="chart-container" style={{ height: 280, width: "100%" }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart
          cx="50%"
          cy="50%"
          innerRadius="25%"
          outerRadius="90%"
          barSize={14}
          data={chartData}
          startAngle={180}
          endAngle={0}
        >
          <RadialBar
            background={{ fill: "#1e293e" }}
            dataKey="count"
            cornerRadius={8}
            label={{ position: "insideStart", fill: "#fff", fontSize: 10, fontWeight: 700 }}
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
              item.payload.name,
            ]}
          />
          <Legend
            iconSize={10}
            layout="horizontal"
            verticalAlign="bottom"
            align="center"
            wrapperStyle={{ fontSize: "12px", fontFamily: "Inter, sans-serif", paddingTop: "5px" }}
            formatter={(value, entry: any) => (
              <span style={{ color: "#94a3b8", fontWeight: 600, marginRight: "12px" }}>
                {entry.payload.name}: {new Intl.NumberFormat("en-US").format(entry.payload.count)} ({entry.payload.percentage}%)
              </span>
            )}
          />
        </RadialBarChart>
      </ResponsiveContainer>
    </div>
  );
}
