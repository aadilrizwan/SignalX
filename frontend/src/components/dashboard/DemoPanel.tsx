"use client";

import { useState } from "react";
import { scoreTransaction, type RiskScoreResponse } from "@/lib/api";
import { RiskScoreCard } from "@/components/risk/RiskScoreCard";

export function DemoPanel() {
  const [result, setResult] = useState<RiskScoreResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const demoScenarios = [
    {
      label: "Normal Transaction",
      data: {
        customer_id: "cust_000001",
        amount: 89.99,
        payment_method: "credit_card",
        device_id: "dev_000001",
        ip_address: "192.168.1.1",
        billing_country: "US",
        shipping_country: "US",
      },
    },
    {
      label: "Suspicious: High Value + New Device",
      data: {
        customer_id: "cust_000001",
        amount: 14999.0,
        payment_method: "credit_card",
        device_id: "dev_UNKNOWN_999",
        ip_address: "10.99.1.42",
        billing_country: "US",
        shipping_country: "US",
      },
    },
    {
      label: "Suspicious: Geo Mismatch + High Amount",
      data: {
        customer_id: "cust_000002",
        amount: 74999.0,
        payment_method: "credit_card",
        device_id: "dev_000050",
        ip_address: "41.200.4.10",
        billing_country: "NG",
        shipping_country: "US",
      },
    },
  ];

  async function handleScore(scenario: (typeof demoScenarios)[0]) {
    setLoading(true);
    setError(null);
    try {
      const res = await scoreTransaction(scenario.data);
      setResult(res);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card" style={{ marginBottom: "1.5rem" }}>
      <h3 style={{ fontWeight: 600, marginBottom: "0.75rem" }}>
        🔬 Live Demo — Score a Transaction
      </h3>
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1rem" }}>
        {demoScenarios.map((scenario, i) => (
          <button
            key={i}
            className="btn btn-ghost"
            onClick={() => handleScore(scenario)}
            disabled={loading}
          >
            {scenario.label}
          </button>
        ))}
      </div>

      {loading && (
        <p style={{ color: "var(--foreground-muted)" }}>Scoring transaction...</p>
      )}

      {error && (
        <p style={{ color: "var(--risk-high)" }}>
          Error: {error}. Is the backend running?
        </p>
      )}

      {result && !loading && <RiskScoreCard result={result} />}
    </div>
  );
}
