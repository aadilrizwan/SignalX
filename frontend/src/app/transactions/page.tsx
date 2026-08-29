"use client";

import { useEffect, useState } from "react";
import { getTransactions, type Transaction, type TransactionListResponse } from "@/lib/api";
import { TransactionTable } from "@/components/transactions/TransactionTable";

export default function TransactionsPage() {
  const [data, setData] = useState<TransactionListResponse | null>(null);
  const [page, setPage] = useState(1);
  const [fraudOnly, setFraudOnly] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getTransactions(page, 50, fraudOnly)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page, fraudOnly]);

  return (
    <div>
      <div className="page-header">
        <h1>Transaction Investigation</h1>
        <p>Browse and investigate transactions for fraud indicators</p>
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
            Loading transactions...
          </div>
        ) : data ? (
          <TransactionTable transactions={data.transactions} />
        ) : (
          <div style={{ padding: "2rem", textAlign: "center" }}>No data</div>
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
