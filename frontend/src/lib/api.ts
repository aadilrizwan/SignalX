/**
 * SignalX — API Client
 *
 * Centralized API client for communicating with the FastAPI backend.
 * All API calls go through here — no direct fetch in components.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function apiFetch<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
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

// Model Performance & Monitoring

export interface ConfusionMatrix {
  tn: number;
  fp: number;
  fn: number;
  tp: number;
}

export interface ModelEvalStats {
  model_name: string;
  threshold: number;
  precision: number;
  recall: number;
  f1: number;
  pr_auc: number;
  roc_auc: number;
  fpr: number;
  fnr: number;
  confusion_matrix: ConfusionMatrix;
  pr_curve_sample?: Array<{ recall: number; precision: number }>;
  roc_curve_sample?: Array<{ fpr: number; tpr: number }>;
}

export interface CostAnalysis {
  optimal_threshold: number;
  optimal_cost: number;
  optimal_fraud_prevented: number;
  fp_cost_unit?: number;
  fn_cost_unit?: number;
}

export interface ModelMetricsResponse {
  lightgbm?: ModelEvalStats;
  logistic_regression?: ModelEvalStats;
  comparison?: {
    delta_pr_auc: number;
    delta_f1: number;
    delta_recall: number;
    delta_precision: number;
  };
  cost_analysis?: CostAnalysis;
}

export interface ModelFeatureItem {
  feature: string;
  display_name: string;
  importance: number;
  relative_weight: number;
  category: string;
  description: string;
}

export interface ModelFeaturesResponse {
  features: ModelFeatureItem[];
  total_features: number;
}

export interface ThresholdSweepPoint {
  threshold: number;
  precision: number;
  recall: number;
  f1: number;
  false_positives: number;
  false_negatives: number;
  expected_cost: number;
  fraud_prevented: number;
}

export interface ThresholdDataResponse {
  sweep: ThresholdSweepPoint[];
  optimal_threshold: number;
  current_deployed_threshold: number;
}

export interface FeatureDriftItem {
  feature: string;
  psi: number;
  status: "STABLE" | "MODERATE_SHIFT" | "SIGNIFICANT_DRIFT";
  baseline_mean: number;
  current_mean: number;
  shift_pct: number;
}

export interface ModelDriftResponse {
  status: "HEALTHY" | "WARNING" | "CRITICAL";
  overall_psi: number;
  psi_threshold_warning: number;
  psi_threshold_critical: number;
  prediction_distribution: {
    baseline_mean_risk: number;
    current_mean_risk: number;
    ks_statistic: number;
    p_value: number;
    status: string;
  };
  concept_drift: {
    historical_fraud_rate: number;
    current_30d_fraud_rate: number;
    delta_basis_points: number;
    status: string;
  };
  feature_psi_table: FeatureDriftItem[];
  last_evaluated?: string;
  next_scheduled_eval?: string;
}

export async function getModelMetrics(): Promise<ModelMetricsResponse> {
  return apiFetch<ModelMetricsResponse>("/api/model/metrics");
}

export async function getModelFeatures(): Promise<ModelFeaturesResponse> {
  return apiFetch<ModelFeaturesResponse>("/api/model/features");
}

export async function getThresholdData(): Promise<ThresholdDataResponse> {
  return apiFetch<ThresholdDataResponse>("/api/model/threshold-data");
}

export async function getModelDrift(): Promise<ModelDriftResponse> {
  return apiFetch<ModelDriftResponse>("/api/model/drift");
}

export async function triggerModelRetrain(
  reason = "SCHEDULED_WEEKLY_REFRESH",
): Promise<{ status: string; job_id: string; message: string }> {
  return apiFetch<{ status: string; job_id: string; message: string }>(
    "/api/model/retrain",
    {
      method: "POST",
      body: JSON.stringify({ trigger_reason: reason }),
    },
  );
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

export async function syncNeo4jGraph(maxTxns = 10000): Promise<{
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

// Return Abuse Detection

export interface ReturnRecord {
  id: string;
  transaction_id: string;
  customer_id: string;
  timestamp: string;
  reason: string;
  refund_amount: number;
  days_after_purchase: number;
  customer_return_rate: number;
  customer_orders_count: number;
  abuse_risk_score: number;
  risk_tier: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  recommended_action:
    | "APPROVE_INSTANT"
    | "STORE_CREDIT_ONLY"
    | "MANDATORY_INSPECTION"
    | "DENY_RETURN";
  status: string;
  executed_action?: string | null;
  is_fast_return: boolean;
}

export interface ReturnAbuseMetrics {
  total_returns: number;
  total_refund_amount: number;
  avg_days_to_return: number;
  return_abuse_rate: number;
  wardrobing_rate: number;
  wardrobing_volume: number;
  suspected_abusers_count: number;
  prevented_abuse_loss: number;
  policy_decisions: Record<string, number>;
  return_trend: Array<{
    date: string;
    total_returns: number;
    refund_amount: number;
    abuse_returns: number;
    normal_returns: number;
  }>;
  reasons_breakdown: Array<{
    reason: string;
    count: number;
    refund_total: number;
    avg_days: number;
    share: number;
    is_suspicious: boolean;
  }>;
  days_distribution: Array<{
    bracket: string;
    count: number;
    refund_amount: number;
    is_fast_abuse: boolean;
  }>;
}

export interface ReturnAbuserProfile {
  customer_id: string;
  country: string;
  total_orders: number;
  total_returns: number;
  return_rate: number;
  total_refunded: number;
  lifetime_value: number;
  avg_days_to_return: number;
  fast_returns_count: number;
  top_reason: string;
  abuse_score: number;
  risk_tier: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  recommended_policy: string;
  abuse_tags: string[];
}

export interface ReturnScoreRequest {
  customer_id: string;
  refund_amount: number;
  days_after_purchase: number;
  reason: string;
  customer_return_rate?: number;
  customer_total_orders?: number;
  category?: string;
}

export interface ReturnFactorExplanation {
  factor: string;
  weight: number;
  description: string;
}

export interface ReturnScoreResponse {
  customer_id: string;
  refund_amount: number;
  days_after_purchase: number;
  reason: string;
  abuse_risk_score: number;
  risk_tier: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  decision: string;
  policy_rationale: string;
  risk_factors: ReturnFactorExplanation[];
  evaluated_at: string;
  protection_savings_estimated: number;
}

export interface ReturnListResponse {
  returns: ReturnRecord[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export async function getReturnMetrics(): Promise<ReturnAbuseMetrics> {
  return apiFetch<ReturnAbuseMetrics>("/api/returns/metrics");
}

export async function getReturnAbusers(
  limit = 20,
): Promise<ReturnAbuserProfile[]> {
  return apiFetch<ReturnAbuserProfile[]>(`/api/returns/abusers?limit=${limit}`);
}

export async function getReturnsList(
  page = 1,
  pageSize = 50,
  riskTier?: string,
  reason?: string,
  search?: string,
  fastOnly?: boolean,
): Promise<ReturnListResponse> {
  const params = new URLSearchParams();
  params.append("page", String(page));
  params.append("page_size", String(pageSize));
  if (riskTier && riskTier !== "ALL") params.append("risk_tier", riskTier);
  if (reason && reason !== "ALL") params.append("reason", reason);
  if (search) params.append("search", search);
  if (fastOnly) params.append("fast_only", "true");

  return apiFetch<ReturnListResponse>(`/api/returns?${params.toString()}`);
}

export async function scoreReturn(
  request: ReturnScoreRequest,
): Promise<ReturnScoreResponse> {
  return apiFetch<ReturnScoreResponse>("/api/returns/score", {
    method: "POST",
    body: JSON.stringify(request),
  });
}

export async function executeReturnAction(
  returnId: string,
  action: string,
  note?: string,
): Promise<{
  return_id: string;
  action: string;
  status: string;
  message: string;
}> {
  return apiFetch(`/api/returns/${returnId}/action`, {
    method: "POST",
    body: JSON.stringify({ action, note }),
  });
}

//  Chargeback Defense & Evidence Automation

export interface ChargebackRecord {
  id: string;
  transaction_id: string;
  customer_id: string;
  timestamp: string;
  reason: string;
  status: "OPEN" | "WON" | "LOST" | "PENDING" | "REPRESENTED" | "ACCEPTED";
  amount: number;
  payment_method: string;
  billing_country: string;
  shipping_country: string;
  win_probability: number;
  ce_3_eligible: boolean;
  deadline: string;
  days_left: number;
  executed_action?: string | null;
}

export interface ChargebackMetrics {
  total_disputes: number;
  total_disputed_volume: number;
  win_rate: number;
  chargeback_rate: number;
  recovered_volume: number;
  open_disputes_count: number;
  open_dispute_volume: number;
  visa_vrol_ratio: number;
  visa_warning_threshold: number;
  visa_excessive_threshold: number;
  status_distribution: Record<string, number>;
  dispute_trend: Array<{
    date: string;
    total_disputes: number;
    disputed_volume: number;
    won_disputes: number;
    lost_disputes: number;
    open_disputes: number;
  }>;
  reasons_breakdown: Array<{
    reason: string;
    reason_code: string;
    count: number;
    volume: number;
    win_rate: number;
    share: number;
  }>;
  card_scheme_distribution: Array<{
    scheme: string;
    count: number;
    volume: number;
    win_rate: number;
  }>;
}

export interface EvidenceItem {
  category: string;
  title: string;
  status: string;
  confidence: number;
  details: string;
}

export interface DefenseRequest {
  transaction_id: string;
  customer_id: string;
  reason?: string;
  dispute_amount: number;
  carrier?: string;
  tracking_number?: string;
}

export interface DefenseResponse {
  transaction_id: string;
  customer_id: string;
  reason: string;
  dispute_amount: number;
  win_probability: number;
  recommendation: string;
  summary_rationale: string;
  ce_3_compliant: boolean;
  evidence_items: EvidenceItem[];
  legal_rebuttal_letter: string;
  generated_at: string;
}

export interface ChargebackListResponse {
  chargebacks: ChargebackRecord[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export async function getChargebackMetrics(): Promise<ChargebackMetrics> {
  return apiFetch<ChargebackMetrics>("/api/chargebacks/metrics");
}

export async function getChargebacksList(
  page = 1,
  pageSize = 50,
  status?: string,
  reason?: string,
  search?: string,
): Promise<ChargebackListResponse> {
  const params = new URLSearchParams();
  params.append("page", String(page));
  params.append("page_size", String(pageSize));
  if (status && status !== "ALL") params.append("status", status);
  if (reason && reason !== "ALL") params.append("reason", reason);
  if (search) params.append("search", search);

  return apiFetch<ChargebackListResponse>(
    `/api/chargebacks?${params.toString()}`,
  );
}

export async function generateDefensePackage(
  request: DefenseRequest,
): Promise<DefenseResponse> {
  return apiFetch<DefenseResponse>("/api/chargebacks/defend", {
    method: "POST",
    body: JSON.stringify(request),
  });
}

export async function executeChargebackAction(
  chargebackId: string,
  action: string,
  note?: string,
): Promise<{
  chargeback_id: string;
  action: string;
  status: string;
  message: string;
}> {
  return apiFetch(`/api/chargebacks/${chargebackId}/action`, {
    method: "POST",
    body: JSON.stringify({ action, note }),
  });
}

// Evidence Generator & RAG Synthesis

export interface GroundedSourceItem {
  source_layer: string;
  source_name: string;
  citation_id: string;
  title: string;
  confidence: number;
  verified_facts: string[];
  raw_proof_snippet: string;
}

export interface EvidenceDossierPackage {
  id: string;
  transaction_id: string;
  customer_id: string;
  dispute_reason: string;
  disputed_amount: number;
  target_scheme: string;
  confidence_score: number;
  rebuttal_strength: "VERY_HIGH" | "HIGH" | "MEDIUM" | "LOW";
  sources_count: number;
  ce_3_qualified: boolean;
  sources?: GroundedSourceItem[];
  legal_narrative?: string;
  llm_model?: string;
  is_live_llm?: boolean;
  pdf_url?: string;
  pdf_size_bytes?: number;
  status: string;
  created_at?: string;
  compiled_at?: string;
  summary?: string;
}

export interface EvidenceMetrics {
  total_dossiers_generated: number;
  total_evidence_artifacts: number;
  average_compilation_time_ms: number;
  source_citation_accuracy: number;
  win_rate_boost_percent: number;
  ce_3_automated_match_rate: number;
  active_sources_count: number;
  sources_health: Array<{
    source: string;
    status: string;
    latency_ms: number;
    records: number;
  }>;
  evidence_by_dispute_reason: Array<{
    reason: string;
    dossiers: number;
    avg_confidence: number;
    avg_sources: number;
  }>;
  benchmark_savings: {
    analyst_hours_saved_monthly: number;
    revenue_protected_monthly: number;
    zero_hallucination_guarantee: string;
  };
}

export interface GenerateDossierRequest {
  transaction_id: string;
  customer_id: string;
  dispute_reason?: string;
  amount: number;
  target_scheme?: string;
  carrier?: string;
  tracking_number?: string;
}

export interface EvidenceListResponse {
  packages: EvidenceDossierPackage[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export async function getEvidenceMetrics(): Promise<EvidenceMetrics> {
  return apiFetch<EvidenceMetrics>("/api/evidence/metrics");
}

export async function getEvidencePackages(
  page = 1,
  pageSize = 20,
  search?: string,
  scheme?: string,
): Promise<EvidenceListResponse> {
  const params = new URLSearchParams();
  params.append("page", String(page));
  params.append("page_size", String(pageSize));
  if (search) params.append("search", search);
  if (scheme && scheme !== "ALL") params.append("scheme", scheme);

  return apiFetch<EvidenceListResponse>(
    `/api/evidence/packages?${params.toString()}`,
  );
}

export async function generateEvidenceDossier(
  request: GenerateDossierRequest,
): Promise<EvidenceDossierPackage> {
  return apiFetch<EvidenceDossierPackage>("/api/evidence/generate", {
    method: "POST",
    body: JSON.stringify(request),
  });
}

export async function exportEvidencePackage(
  dossierId: string,
  format = "MARKDOWN",
  autoDispatch = false,
): Promise<{
  dossier_id: string;
  format: string;
  status: string;
  message: string;
}> {
  return apiFetch(`/api/evidence/packages/${dossierId}/export`, {
    method: "POST",
    body: JSON.stringify({ format, auto_dispatch: autoDispatch }),
  });
}

// Human in the Loop Review Queue

export interface ReviewShapFactor {
  factor: string;
  contribution: number;
  description: string;
}

export interface ReviewCase {
  case_id: string;
  transaction_id: string;
  customer_id: string;
  amount: number;
  currency: string;
  timestamp: string;
  payment_method: string;
  billing_country: string;
  shipping_country: string;
  risk_score: number;
  risk_tier: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  priority: "URGENT_SLA" | "HIGH_AMOUNT" | "STANDARD";
  sla_minutes_remaining: number;
  status: "OPEN" | "IN_REVIEW" | "RESOLVED";
  trigger_reasons: string[];
  assigned_analyst: string;
  shap_factors?: ReviewShapFactor[];
  executed_action?: string;
  analyst_note?: string;
}

export interface ReviewMetrics {
  total_pending_reviews: number;
  urgent_sla_count: number;
  total_pending_exposure: number;
  resolved_today: number;
  average_review_time_seconds: number;
  analyst_overturn_rate: number;
  sla_adherence_percent: number;
  decision_breakdown: Record<string, number>;
  hourly_review_volume: Array<{
    hour: string;
    incoming: number;
    resolved: number;
  }>;
  analysts: Array<{
    name: string;
    active_cases: number;
    resolved_today: number;
    avg_time_sec: number;
    accuracy: number;
  }>;
}

export interface ReviewHistoryItem {
  case_id: string;
  transaction_id: string;
  customer_id: string;
  amount: number;
  action: string;
  analyst: string;
  note: string;
  tags?: string[];
  disposed_at: string;
}

export interface ReviewQueueResponse {
  cases: ReviewCase[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export async function getReviewMetrics(): Promise<ReviewMetrics> {
  return apiFetch<ReviewMetrics>("/api/reviews/metrics");
}

export async function getReviewQueue(
  page = 1,
  pageSize = 20,
  priority?: string,
  riskTier?: string,
  search?: string,
): Promise<ReviewQueueResponse> {
  const params = new URLSearchParams();
  params.append("page", String(page));
  params.append("page_size", String(pageSize));
  if (priority && priority !== "ALL") params.append("priority", priority);
  if (riskTier && riskTier !== "ALL") params.append("risk_tier", riskTier);
  if (search) params.append("search", search);

  return apiFetch<ReviewQueueResponse>(
    `/api/reviews/queue?${params.toString()}`,
  );
}

export async function getReviewCase(caseId: string): Promise<ReviewCase> {
  return apiFetch<ReviewCase>(`/api/reviews/${caseId}`);
}

export async function getReviewHistory(
  limit = 50,
): Promise<ReviewHistoryItem[]> {
  return apiFetch<ReviewHistoryItem[]>(`/api/reviews/history?limit=${limit}`);
}

export async function executeDisposition(
  caseId: string,
  action: string,
  analyst = "Lead Analyst",
  note?: string,
  tags?: string[],
): Promise<{
  case_id: string;
  action: string;
  status: string;
  message: string;
}> {
  return apiFetch(`/api/reviews/${caseId}/disposition`, {
    method: "POST",
    body: JSON.stringify({ action, analyst, note, tags }),
  });
}

export async function batchDisposition(
  caseIds: string[],
  action: string,
  analyst = "Lead Analyst",
  note?: string,
): Promise<{ action: string; processed_count: number; results: any[] }> {
  return apiFetch("/api/reviews/batch-disposition", {
    method: "POST",
    body: JSON.stringify({ case_ids: caseIds, action, analyst, note }),
  });
}

// Risk Engine Configuration & Settings
export interface RiskEngineSettings {
  risk_threshold_block: number;
  risk_threshold_review: number;
  fp_cost: number;
  fn_cost_multiplier: number;
  review_cost: number;
  weight_ml: number;
  weight_rules: number;
  weight_anomaly: number;
  weight_behavior: number;
  weight_graph: number;
  rule_velocity_5m_limit: number;
  rule_velocity_1h_limit: number;
  rule_amount_dev_multiplier: number;
  rule_shared_device_limit: number;
  webhook_slack_url: string;
  webhook_pagerduty_key: string;
  strictness_preset: string;
}

export async function getRiskSettings(): Promise<RiskEngineSettings> {
  return apiFetch<RiskEngineSettings>("/api/risk/settings");
}

export async function updateRiskSettings(
  settings: Partial<RiskEngineSettings>,
): Promise<{ status: string; message: string; settings: RiskEngineSettings }> {
  return apiFetch("/api/risk/settings", {
    method: "POST",
    body: JSON.stringify(settings),
  });
}

export async function resetRiskSettings(): Promise<{
  status: string;
  message: string;
  settings: RiskEngineSettings;
}> {
  return apiFetch("/api/risk/settings/reset", {
    method: "POST",
  });
}

// Webhooks & Live Traffic Simulator

export interface TrafficSimParams {
  batch_size?: number;
  fraud_ratio?: number;
  include_wardrobers?: boolean;
  target_country?: string;
}

export interface TrafficSimResult {
  total_processed: number;
  allowed_count: number;
  reviewed_count: number;
  blocked_count: number;
  prevented_loss_usd: number;
  transactions: {
    id: string;
    customer_id: string;
    amount: number;
    payment_method: string;
    billing_country: string;
    risk_score: number;
    risk_level: string;
    decision: string;
    is_syndicate: boolean;
    timestamp: string;
  }[];
  execution_time_ms: number;
}

export async function simulateLiveTraffic(
  params: TrafficSimParams = { batch_size: 10, fraud_ratio: 0.2 },
): Promise<TrafficSimResult> {
  return apiFetch<TrafficSimResult>("/api/webhooks/simulate-traffic", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export async function triggerStripeWebhook(
  payload: Record<string, any>,
): Promise<any> {
  return apiFetch("/api/webhooks/stripe", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function triggerShopifyWebhook(
  payload: Record<string, any>,
  topic: string = "orders/create",
): Promise<any> {
  return apiFetch("/api/webhooks/shopify", {
    method: "POST",
    headers: { "x shopify topic": topic },
    body: JSON.stringify(payload),
  });
}
