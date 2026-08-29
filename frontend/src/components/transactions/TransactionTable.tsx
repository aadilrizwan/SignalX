"use client";

import type { Transaction } from "@/lib/api";

interface TransactionTableProps {
  transactions: Transaction[];
}

export function TransactionTable({ transactions }: TransactionTableProps) {
  if (!transactions || transactions.length === 0) {
    return (
      <div style={{ padding: "2rem", textAlign: "center", color: "var(--foreground-muted)" }}>
        No transactions found
      </div>
    );
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table className="data-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Timestamp</th>
            <th>Customer</th>
            <th>Amount</th>
            <th>Payment</th>
            <th>Country</th>
            <th>Device</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((txn) => (
            <tr key={txn.id}>
              <td style={{ fontFamily: "monospace", fontSize: "0.75rem", color: "var(--foreground-dim)" }}>
                {txn.id.slice(0, 15)}...
              </td>
              <td style={{ fontSize: "0.8125rem" }}>
                {new Date(txn.timestamp).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </td>
              <td style={{ fontFamily: "monospace", fontSize: "0.8125rem" }}>
                {txn.customer_id.slice(0, 12)}
              </td>
              <td style={{ fontWeight: 600, fontFamily: "monospace" }}>
                ${new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(txn.amount)}
              </td>
              <td>
                <span style={{ fontSize: "0.8125rem" }}>{txn.payment_method}</span>
              </td>
              <td>
                <span style={{ fontSize: "0.8125rem" }}>{txn.billing_country}</span>
                {txn.billing_country !== txn.shipping_country && (
                  <span style={{ color: "var(--risk-medium)", marginLeft: "0.25rem" }}>
                    → {txn.shipping_country}
                  </span>
                )}
              </td>
              <td style={{ fontFamily: "monospace", fontSize: "0.75rem", color: "var(--foreground-dim)" }}>
                {txn.device_id ? txn.device_id.slice(0, 10) : "—"}
              </td>
              <td>
                {txn.is_fraud ? (
                  <span className="badge badge-critical">FRAUD</span>
                ) : (
                  <span className="badge badge-low">LEGIT</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
