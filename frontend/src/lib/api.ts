/**
 * SignalX — API Client
 *
 * Centralized API client for communicating with the FastAPI backend.
 * All API calls go through here — no direct fetch in components.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...options,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(error.detail || `API error: ${res.status}`);
  }

  return res.json();
}

//  Risk Scoring

export interface TransactionScoreRequest {
  customer_id: string;
  amount: number;
  payment_method: string;
  currency?: string;
  device_id?: string;
  ip_address?: string;
  billing_country?: string;
  shipping_country?: string;
  product_id?: string;
  merchant_id?: string;
  timestamp?: string;
}

export interface RiskExplanation {
  feature: string;
  display_name: string;
  shap_value: number;
  feature_value: number;
  reason: string;
}

export interface RuleTriggered {
  rule_id: string;
  triggered: boolean;
  severity: string;
  reason: string;
  risk_contribution: number;
}

export interface RiskScoreResponse {
  transaction_id: string;
  risk_score: number;
  risk_level: string;
  decision: string;
  confidence: number;
  expected_loss: number;
  ml_score: number;
  behavior_score: number;
  graph_score: number;
  anomaly_score: number;
  rule_score: number;
  risk_factors: RiskExplanation[];
  protective_factors: RiskExplanation[];
  triggered_rules: RuleTriggered[];
  scored_at: string;
  model_version: string;
}

export async function scoreTransaction(
  request: TransactionScoreRequest,
): Promise<RiskScoreResponse> {
  return apiFetch<RiskScoreResponse>("/api/risk/score", {
    method: "POST",
    body: JSON.stringify(request),
  });
}

export async function getRiskScore(
  transactionId: string,
): Promise<RiskScoreResponse> {
  return apiFetch<RiskScoreResponse>(`/api/risk/${transactionId}`);
}

//  Transactions

export interface Transaction {
  id: string;
  customer_id: string;
  merchant_id: string;
  timestamp: string;
  amount: number;
  currency: string;
  payment_method: string;
  device_id: string | null;
  ip_address: string | null;
  billing_country: string | null;
  shipping_country: string | null;
  product_id: string | null;
  is_fraud: boolean;
}

export interface TransactionListResponse {
  transactions: Transaction[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export async function getTransactions(
  page = 1,
  pageSize = 50,
  fraudOnly = false,
): Promise<TransactionListResponse> {
  return apiFetch<TransactionListResponse>(
    `/api/transactions?page=${page}&page_size=${pageSize}&fraud_only=${fraudOnly}`,
  );
}

export async function getTransaction(id: string): Promise<Transaction> {
  return apiFetch<Transaction>(`/api/transactions/${id}`);
}

//  Dashboard

export interface DashboardMetrics {
  total_transactions: number;
  fraud_detected: number;
  fraud_prevented_amount: number;
  current_fraud_rate: number;
  false_positive_rate: number;
  chargeback_rate: number;
  return_abuse_rate: number;
  expected_loss: number;
  decisions: Record<string, number>;
  risk_levels: Record<string, number>;
  fraud_trend: Array<{
    date: string;
    total_count: number;
    fraud_count: number;
  }>;
  fraud_by_country: Array<{
    billing_country: string;
    count: number;
    fraud: number;
    rate: number;
  }>;
  fraud_by_payment_method: Array<{
    payment_method: string;
    count: number;
    fraud: number;
    rate: number;
  }>;
}

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  return apiFetch<DashboardMetrics>("/api/dashboard/metrics");
}

//  Model

export async function getModelMetrics(): Promise<Record<string, unknown>> {
  return apiFetch<Record<string, unknown>>("/api/model/metrics");
}

export async function getThresholdData(): Promise<Record<string, unknown>> {
  return apiFetch<Record<string, unknown>>("/api/model/threshold-data");
}

export async function getModelDrift(): Promise<Record<string, unknown>> {
  return apiFetch<Record<string, unknown>>("/api/model/drift");
}

//  Graph Intelligence (Neo4j Aura) 

export interface GraphConnectionInfo {
  connected: boolean;
  uri: string;
  latency_ms: number | null;
  total_nodes: number;
  total_relationships: number;
}

export interface GraphStats {
  connected: boolean;
  total_nodes: number;
  total_relationships: number;
  total_fraud_rings: number;
  high_risk_accounts: number;
  total_loss_exposure: number;
  active_syndicates: number;
  provider: string;
  connection: GraphConnectionInfo;
}

export interface FraudRing {
  ring_id: string;
  name: string;
  ring_type:
    | "SHARED_DEVICE"
    | "SHARED_IP"
    | "SHARED_ADDRESS"
    | "SYNDICATE_CLUSTER";
  shared_entity: string;
  accounts: string[];
  account_count: number;
  total_transactions: number;
  fraud_transactions: number;
  total_volume: number;
  fraud_volume: number;
  fraud_rate: number;
  risk_score: number;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  patterns: string[];
}

export interface GraphNode {
  id: string;
  type: "customer" | "device" | "ip" | "transaction" | "address";
  label: string;
  data: {
    entity_id: string;
    entity_type: string;
    [key: string]: unknown;
  };
  position?: { x: number; y: number };
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label: string;
  type?: string;
  animated?: boolean;
}

export interface GraphSubgraphResponse {
  ring_id: string;
  shared_entity: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  node_count: number;
  edge_count: number;
}

export async function getGraphStats(): Promise<GraphStats> {
  return apiFetch<GraphStats>("/api/graph/stats");
}

export async function getFraudRings(
  minAccounts = 2,
  limit = 20,
): Promise<FraudRing[]> {
  return apiFetch<FraudRing[]>(
    `/api/graph/rings?min_accounts=${minAccounts}&limit=${limit}`,
  );
}

export async function getGraphSubgraph(
  ringId?: string,
  entityId?: string,
): Promise<GraphSubgraphResponse> {
  const params = new URLSearchParams();
  if (ringId) params.append("ring_id", ringId);
  if (entityId) params.append("entity_id", entityId);
  return apiFetch<GraphSubgraphResponse>(
    `/api/graph/subgraph?${params.toString()}`,
  );
}

export async function syncNeo4jGraph(
  maxTxns = 10000,
): Promise<{
  status: string;
  duration_seconds: number;
  [key: string]: unknown;
}> {
  return apiFetch<{
    status: string;
    duration_seconds: number;
    [key: string]: unknown;
  }>(`/api/graph/sync?max_txns=${maxTxns}`, { method: "POST" });
}
