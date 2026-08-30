"use client";

import { useEffect, useState } from "react";
import { getTransactions, type TransactionListResponse } from "@/lib/api";
import { TransactionTable } from "@/components/transactions/TransactionTable";

export default function TransactionsPage() {
  const [data, setData] = useState<TransactionListResponse | null>(null);
  const [page, setPage] = useState(1);
  const [fraudOnly, setFraudOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    getTransactions(page, 50, fraudOnly)
      .then((res) => {
        setData(res);
      })
      .catch((err) => {
        console.error("Failed to fetch transactions:", err);
        setError(err?.message || "Failed to load transactions from backend API");
      })
      .finally(() => setLoading(false));
  }, [page, fraudOnly]);

  return (
    <div>
      <div className="page-header">
        <h1>Transaction Investigation</h1>
        <p>Browse and investigate live transactions for fraud indicators</p>
      </div>

      <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1rem" }}>
        <button
          className={`btn ${!fraudOnly ? "btn-primary" : "btn-ghost"}`}
          onClick={() => { setFraudOnly(false); setPage(1); }}
        >
          All Transactions
        </button>
        <button
          className={`btn ${fraudOnly ? "btn-danger" : "btn-ghost"}`}
          onClick={() => { setFraudOnly(true); setPage(1); }}
        >
          Fraud Only
        </button>
        {data && (
          <span style={{ alignSelf: "center", color: "var(--foreground-muted)", fontSize: "0.875rem" }}>
            {new Intl.NumberFormat("en-US").format(data.total)} total · Page {data.page} of {data.total_pages}
          </span>
        )}
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: "2rem", textAlign: "center", color: "var(--foreground-muted)" }}>
            Loading live transactions from API...
          </div>
        ) : error ? (
          <div style={{ padding: "2rem", textAlign: "center", color: "var(--danger)" }}>
            {error}
          </div>
        ) : data && data.transactions.length > 0 ? (
          <TransactionTable transactions={data.transactions} />
        ) : (
          <div style={{ padding: "2rem", textAlign: "center", color: "var(--foreground-muted)" }}>
            No transactions found.
          </div>
        )}
      </div>

      {data && data.total_pages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", gap: "0.5rem", marginTop: "1rem" }}>
          <button className="btn btn-ghost" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            Previous
          </button>
          <button className="btn btn-ghost" disabled={page >= data.total_pages} onClick={() => setPage(page + 1)}>
            Next
          </button>
        </div>
      )}
    </div>
  );
}


