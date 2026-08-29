import { createClient, SupabaseClient } from "@supabase/supabase-js";

const rawUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  "https://your-project.supabase.co";

const rawKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  "eyf.dummy_anon_key";

const supabaseUrl = rawUrl.trim();
const supabaseKey = rawKey.trim();

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseKey &&
  !supabaseUrl.includes("your-project") &&
  supabaseKey !== "eyf.dummy_anon_key",
);

// Singleton Supabase Client
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

export interface LiveTransactionEvent {
  id: string;
  customer_id: string;
  amount: number;
  payment_method: string;
  risk_score: number;
  risk_level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  decision: "ALLOW" | "REVIEW" | "BLOCK";
  timestamp: string;
  fraud_pattern?: string;
  billing_country?: string;
}

export interface LiveReviewQueueEvent {
  id: string;
  transaction_id: string;
  customer_id: string;
  amount: number;
  priority: "HIGH" | "MEDIUM" | "LOW";
  status: "PENDING" | "CLAIMED" | "APPROVED" | "BLOCKED" | "ESCALATED";
  assigned_to?: string;
  sla_remaining_minutes: number;
  risk_score: number;
}

export function subscribeToLiveTransactions(
  onTransaction: (txn: LiveTransactionEvent) => void,
) {
  if (!isSupabaseConfigured) {
    // If not connected to real cloud Supabase, generate simulated live streaming events
    const interval = setInterval(() => {
      const isHighRisk = Math.random() < 0.15;
      const mockEvent: LiveTransactionEvent = {
        id: `TXN-${Math.floor(100000 + Math.random() * 900000)}`,
        customer_id: `cust_${String(Math.floor(Math.random() * 5000)).padStart(5, "0")}`,
        amount: parseFloat((20 + Math.random() * 1200).toFixed(2)),
        payment_method: ["credit_card", "debit_card", "paypal", "apple_pay"][
          Math.floor(Math.random() * 4)
        ],
        risk_score: isHighRisk
          ? parseFloat((0.72 + Math.random() * 0.25).toFixed(3))
          : parseFloat((0.02 + Math.random() * 0.25).toFixed(3)),
        risk_level: isHighRisk
          ? Math.random() > 0.5
            ? "CRITICAL"
            : "HIGH"
          : Math.random() > 0.8
            ? "MEDIUM"
            : "LOW",
        decision: isHighRisk
          ? Math.random() > 0.6
            ? "BLOCK"
            : "REVIEW"
          : "ALLOW",
        timestamp: new Date().toISOString(),
        billing_country: ["US", "GB", "CA", "DE", "NG", "BR", "FR"][
          Math.floor(Math.random() * 7)
        ],
        fraud_pattern: isHighRisk
          ? [
              "shared_device_farm",
              "velocity_burst",
              "card_testing",
              "geo_mismatch",
            ][Math.floor(Math.random() * 4)]
          : undefined,
      };
      onTransaction(mockEvent);
    }, 4500);

    return () => clearInterval(interval);
  }

  let fallbackInterval: ReturnType<typeof setInterval> | null = null;

  const startSimulatedFallback = () => {
    fallbackInterval = setInterval(() => {
      const isHighRisk = Math.random() < 0.15;
      onTransaction({
        id: `TXN-${Math.floor(100000 + Math.random() * 900000)}`,
        customer_id: `cust_${String(Math.floor(Math.random() * 5000)).padStart(5, "0")}`,
        amount: parseFloat((20 + Math.random() * 1200).toFixed(2)),
        payment_method: ["credit_card", "debit_card", "paypal", "apple_pay"][
          Math.floor(Math.random() * 4)
        ],
        risk_score: isHighRisk
          ? parseFloat((0.72 + Math.random() * 0.25).toFixed(3))
          : parseFloat((0.02 + Math.random() * 0.25).toFixed(3)),
        risk_level: isHighRisk
          ? Math.random() > 0.5
            ? "CRITICAL"
            : "HIGH"
          : Math.random() > 0.8
            ? "MEDIUM"
            : "LOW",
        decision: isHighRisk
          ? Math.random() > 0.6
            ? "BLOCK"
            : "REVIEW"
          : "ALLOW",
        timestamp: new Date().toISOString(),
        billing_country: ["US", "GB", "CA", "DE", "NG", "BR", "FR"][
          Math.floor(Math.random() * 7)
        ],
        fraud_pattern: isHighRisk
          ? [
              "shared_device_farm",
              "velocity_burst",
              "card_testing",
              "geo_mismatch",
            ][Math.floor(Math.random() * 4)]
          : undefined,
      });
    }, 4500);
  };

  // 1. Fetch the most recent 15 transactions to populate the ticker immediately
  Promise.resolve(
    supabase
      .from("transactions")
      .select(
        "id, customer_id, amount, payment_method, risk_score, risk_level, decision, created_at, fraud_pattern, billing_country",
      )
      .order("created_at", { ascending: false })
      .limit(15),
  )
    .then(({ data, error }: { data: any; error: any }) => {
      if (error) {
        console.warn(
          "[SignalX] Supabase fetch error, falling back to simulation:",
          error.message,
        );
        startSimulatedFallback();
        return;
      }
      if (!data || data.length === 0) {
        console.info(
          "[SignalX] No transactions in Supabase yet, starting simulated ticker.",
        );
        startSimulatedFallback();
        return;
      }
      // Emit each row as a LiveTransactionEvent
      const rows = [...data].reverse();
      for (const row of rows) {
        onTransaction({
          id: row.id,
          customer_id: row.customer_id || "unknown",
          amount: parseFloat(row.amount) || 0,
          payment_method: row.payment_method || "credit_card",
          risk_score: parseFloat(row.risk_score) || 0,
          risk_level: row.risk_level || "LOW",
          decision: row.decision || "ALLOW",
          timestamp: row.created_at || new Date().toISOString(),
          fraud_pattern: row.fraud_pattern,
          billing_country: row.billing_country,
        });
      }
    })
    .catch(() => {
      console.warn(
        "[SignalX] Supabase connection error, starting simulated fallback.",
      );
      startSimulatedFallback();
    });

  // 2. Subscribe to live INSERT events via Supabase Realtime
  const channel = supabase
    .channel("realtime-transactions")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "transactions" },
      (payload) => {
        if (payload.new) {
          onTransaction(payload.new as LiveTransactionEvent);
        }
      },
    )
    .subscribe();

  return () => {
    if (fallbackInterval) clearInterval(fallbackInterval);
    supabase.removeChannel(channel);
  };
}

export async function uploadEvidenceDossier(
  fileName: string,
  fileContent: Blob | string,
): Promise<{ url: string | null; error: Error | null }> {
  if (!isSupabaseConfigured) {
    return {
      url: `https://mock-storage.supabase.co/storage/v1/object/public/evidence-dossiers/${fileName}`,
      error: null,
    };
  }

  try {
    const { data, error } = await supabase.storage
      .from("evidence-dossiers")
      .upload(`dossiers/${fileName}`, fileContent, {
        cacheControl: "3600",
        upsert: true,
      });

    if (error) throw error;

    const { data: publicUrlData } = supabase.storage
      .from("evidence-dossiers")
      .getPublicUrl(data.path);

    return { url: publicUrlData.publicUrl, error: null };
  } catch (err: any) {
    return { url: null, error: err };
  }
}

export function getEvidenceDossierPublicUrl(fileName: string): string {
  const cleanPath = fileName.startsWith("dossiers/") ? fileName : `dossiers/${fileName}`;
  const { data } = supabase.storage.from("evidence-dossiers").getPublicUrl(cleanPath);
  return data.publicUrl;
}

