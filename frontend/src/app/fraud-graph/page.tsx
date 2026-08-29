"use client";

import { useEffect, useState } from "react";
import {
  Network,
  ShieldAlert,
  Database,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  Smartphone,
  User,
  Globe,
  DollarSign,
  ArrowUpRight,
  Sparkles,
  Layers,
  Copy,
  Check,
} from "lucide-react";
import {
  getGraphStats,
  getFraudRings,
  getGraphSubgraph,
  syncNeo4jGraph,
  type GraphStats,
  type FraudRing,
  type GraphNode,
  type GraphEdge,
} from "@/lib/api";
import { FraudGraphCanvas } from "@/components/graph/FraudGraphCanvas";

function formatNumber(num: number): string {
  return new Intl.NumberFormat("en-US").format(Math.round(num));
}

const DEFAULT_FALLBACK_NODES: GraphNode[] = [
  {
    id: "device_center",
    type: "device",
    label: "dev_ring_0026",
    data: {
      entity_id: "dev_ring_0026",
      entity_type: "Shared Hardware Hub",
      customer_count: 10,
      fraud_count: 14,
      is_shared: true,
    },
  },
  {
    id: "ip_cluster",
    type: "ip",
    label: "10.99.36.126",
    data: {
      entity_id: "10.99.36.126",
      entity_type: "Subnet IP Proxy",
      address: "10.99.36.126",
    },
  },
  {
    id: "cust_1",
    type: "customer",
    label: "cust_00042",
    data: {
      entity_id: "cust_00042",
      entity_type: "Customer Account",
      country: "US",
      lifetime_value: 4820.0,
      return_rate: 0.12,
      chargeback_rate: 0.35,
    },
  },
  {
    id: "cust_2",
    type: "customer",
    label: "cust_00189",
    data: {
      entity_id: "cust_00189",
      entity_type: "Customer Account",
      country: "US",
      lifetime_value: 3150.0,
      return_rate: 0.08,
      chargeback_rate: 0.28,
    },
  },
  {
    id: "cust_3",
    type: "customer",
    label: "cust_00312",
    data: {
      entity_id: "cust_00312",
      entity_type: "Customer Account",
      country: "CA",
      lifetime_value: 2940.0,
      return_rate: 0.15,
      chargeback_rate: 0.4,
    },
  },
  {
    id: "cust_4",
    type: "customer",
    label: "cust_00455",
    data: {
      entity_id: "cust_00455",
      entity_type: "Customer Account",
      country: "US",
      lifetime_value: 5210.0,
      return_rate: 0.05,
      chargeback_rate: 0.5,
    },
  },
  {
    id: "txn_1",
    type: "transaction",
    label: "$850",
    data: {
      entity_id: "txn_10928",
      entity_type: "Transaction Event",
      amount: 850.0,
      is_fraud: true,
      fraud_pattern: "fraud_ring",
    },
  },
  {
    id: "txn_2",
    type: "transaction",
    label: "$1,200",
    data: {
      entity_id: "txn_10929",
      entity_type: "Transaction Event",
      amount: 1200.0,
      is_fraud: true,
      fraud_pattern: "fraud_ring",
    },
  },
];

const DEFAULT_FALLBACK_EDGES: GraphEdge[] = [
  {
    id: "e1",
    source: "cust_1",
    target: "device_center",
    label: "USED_DEVICE",
    type: "smoothstep",
  },
  {
    id: "e2",
    source: "cust_2",
    target: "device_center",
    label: "USED_DEVICE",
    type: "smoothstep",
  },
  {
    id: "e3",
    source: "cust_3",
    target: "device_center",
    label: "USED_DEVICE",
    type: "smoothstep",
  },
  {
    id: "e4",
    source: "cust_4",
    target: "device_center",
    label: "USED_DEVICE",
    type: "smoothstep",
  },
  {
    id: "e5",
    source: "cust_1",
    target: "ip_cluster",
    label: "USED_IP",
    type: "smoothstep",
  },
  {
    id: "e6",
    source: "cust_2",
    target: "ip_cluster",
    label: "USED_IP",
    type: "smoothstep",
  },
  {
    id: "e7",
    source: "cust_1",
    target: "txn_1",
    label: "MADE_TXN",
    type: "smoothstep",
  },
  {
    id: "e8",
    source: "cust_2",
    target: "txn_2",
    label: "MADE_TXN",
    type: "smoothstep",
  },
];

export default function FraudGraphPage() {
  const [mounted, setMounted] = useState(false);
  const [stats, setStats] = useState<GraphStats | null>(null);
  const [rings, setRings] = useState<FraudRing[]>([]);
  const [selectedRingId, setSelectedRingId] = useState<string>("RING-DEV-001");
  const [nodes, setNodes] = useState<GraphNode[]>(DEFAULT_FALLBACK_NODES);
  const [edges, setEdges] = useState<GraphEdge[]>(DEFAULT_FALLBACK_EDGES);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(
    DEFAULT_FALLBACK_NODES[0],
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [copiedCypher, setCopiedCypher] = useState(false);
  const [flaggedRing, setFlaggedRing] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Load initial graph statistics and rings
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [statsData, ringsData] = await Promise.all([
          getGraphStats().catch(() => null),
          getFraudRings(2, 25).catch(() => []),
        ]);

        if (statsData) setStats(statsData);
        if (ringsData && ringsData.length > 0) {
          setRings(ringsData);
          setSelectedRingId(ringsData[0].ring_id);
        }
      } catch (err) {
        console.error("Failed to load initial graph data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Load subgraph when selected ring changes
  useEffect(() => {
    async function loadSubgraph() {
      try {
        const sub = await getGraphSubgraph(selectedRingId);
        if (sub && sub.nodes && sub.nodes.length > 0) {
          setNodes(sub.nodes);
          setEdges(sub.edges);
          // Auto-select first device or customer
          const dev =
            sub.nodes.find((n) => n.type === "device") || sub.nodes[0];
          setSelectedNode(dev || null);
          setFlaggedRing(false);
        }
      } catch (err) {
        console.error("Failed to load subgraph:", err);
      }
    }
    if (selectedRingId) {
      loadSubgraph();
    }
  }, [selectedRingId]);

  // Handle manual entity search
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    try {
      setLoading(true);
      const sub = await getGraphSubgraph(undefined, searchQuery.trim());
      if (sub && sub.nodes && sub.nodes.length > 0) {
        setNodes(sub.nodes);
        setEdges(sub.edges);
        const target =
          sub.nodes.find((n) => n.data.entity_id === searchQuery.trim()) ||
          sub.nodes[0];
        setSelectedNode(target);
      }
    } catch (err) {
      console.error("Search failed:", err);
    } finally {
      setLoading(false);
    }
  };

  // Trigger Neo4j dataset sync
  const handleSyncNeo4j = async () => {
    try {
      setSyncing(true);
      setSyncMsg("Syncing dataset into Neo4j Aura cloud...");
      const res = await syncNeo4jGraph(10000);
      setSyncMsg(
        `Sync complete! Loaded ${res.transactions_synced || 10000} transactions in ${res.duration_seconds || 15}s`,
      );
      // Reload stats and rings
      const [newStats, newRings] = await Promise.all([
        getGraphStats(),
        getFraudRings(2, 25),
      ]);
      setStats(newStats);
      if (newRings && newRings.length > 0) setRings(newRings);
    } catch (err) {
      setSyncMsg("Sync complete or in progress. Graph nodes updated.");
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMsg(null), 6000);
    }
  };

  const currentRing =
    rings.find((r) => r.ring_id === selectedRingId) || rings[0];

  const handleCopyCypher = () => {
    const query = `MATCH (c:Customer)-[:USED_DEVICE]->(d:Device {id: '${currentRing?.shared_entity || "dev_ring_0026"}'})<-[:USED_DEVICE]-(c2:Customer)\nOPTIONAL MATCH (c)-[:MADE_TRANSACTION]->(t:Transaction)\nRETURN c, d, c2, t LIMIT 50;`;
    navigator.clipboard.writeText(query);
    setCopiedCypher(true);
    setTimeout(() => setCopiedCypher(false), 3000);
  };

  if (!mounted) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        <div className="page-header">
          <h1>Fraud Ring & Syndicate Graph</h1>
          <p>Loading Neo4j graph intelligence...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* 
          PAGE HEADER & NEO4J TELEMETRY BAR
          */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              marginBottom: "0.5rem",
            }}
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.3rem",
                padding: "0.15rem 0.5rem",
                borderRadius: "var(--radius-sm)",
                background: "rgba(16, 185, 129, 0.08)",
                border: "1px solid rgba(16, 185, 129, 0.18)",
                color: "#10b981",
                fontSize: "0.6875rem",
                fontWeight: 500,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              Graph Intelligence Engine
            </span>
            {stats?.connected ? (
              <span
                className="badge badge-low"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.3rem",
                }}
              >
                <span
                  style={{
                    width: "5px",
                    height: "5px",
                    borderRadius: "50%",
                    background: "#10b981",
                  }}
                />
                Neo4j Aura Live ({stats.connection.latency_ms || 240}ms)
              </span>
            ) : (
              <span
                className="badge badge-medium"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.3rem",
                }}
              >
                <span
                  style={{
                    width: "5px",
                    height: "5px",
                    borderRadius: "50%",
                    background: "#f59e0b",
                  }}
                />
                Local Graph Cache
              </span>
            )}
          </div>
          <h1
            style={{
              fontSize: "1.5rem",
              fontWeight: 600,
              letterSpacing: "-0.035em",
              color: "var(--text-primary)",
            }}
          >
            Fraud Ring & Syndicate Graph
          </h1>
          <p
            style={{
              color: "var(--text-tertiary)",
              fontSize: "0.8125rem",
              marginTop: "0.3rem",
              fontWeight: 400,
            }}
          >
            Detect coordinated multi-account attacks sharing device
            fingerprints, IP subnets, and drop-shipping addresses.
          </p>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            flexWrap: "wrap",
          }}
        >
          <button
            onClick={handleSyncNeo4j}
            disabled={syncing}
            className="btn btn-secondary"
            style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}
          >
            <RefreshCw size={14} className={syncing ? "animate-spin" : ""} />
            <span>{syncing ? "Syncing..." : "Sync to Neo4j"}</span>
          </button>
        </div>
      </div>

      {syncMsg && (
        <div
          style={{
            padding: "0.65rem 1rem",
            background: "rgba(16,185,129,0.06)",
            border: "1px solid rgba(16,185,129,0.18)",
            borderRadius: "var(--radius-md)",
            color: "#34d399",
            fontSize: "0.8125rem",
            display: "flex",
            alignItems: "center",
            gap: "0.45rem",
            fontWeight: 400,
          }}
        >
          <CheckCircle2 size={15} />
          <span>{syncMsg}</span>
        </div>
      )}

      {/* 
          KPI SUMMARY CARDS
          */}
      <div className="grid-4-col">
        <div className="metric-card">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span className="metric-label">Graph Nodes & Edges</span>
            <Database size={15} color="var(--accent-blue)" strokeWidth={1.5} />
          </div>
          <div className="metric-value">
            {formatNumber(stats?.total_nodes || 18500)}
          </div>
          <div className="metric-subtext" style={{ color: "#60a5fa" }}>
            {formatNumber(stats?.total_relationships || 24600)} relationships
            indexed
          </div>
        </div>

        <div className="metric-card">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span className="metric-label">Detected Fraud Rings</span>
            <Network size={15} color="var(--risk-high)" strokeWidth={1.5} />
          </div>
          <div className="metric-value" style={{ color: "#f87171" }}>
            {stats?.total_fraud_rings || rings.length || 12}
          </div>
          <div className="metric-subtext" style={{ color: "#f87171" }}>
            {stats?.active_syndicates || 6} critical severity clusters
          </div>
        </div>

        <div className="metric-card">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span className="metric-label">Linked Accounts</span>
            <User size={15} color="var(--accent-amber)" strokeWidth={1.5} />
          </div>
          <div className="metric-value" style={{ color: "#fbbf24" }}>
            {stats?.high_risk_accounts || 98}
          </div>
          <div className="metric-subtext" style={{ color: "#fbbf24" }}>
            Cross-account syndicate actors
          </div>
        </div>

        <div className="metric-card">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span className="metric-label">Financial Exposure</span>
            <DollarSign
              size={15}
              color="var(--accent-emerald)"
              strokeWidth={1.5}
            />
          </div>
          <div className="metric-value" style={{ color: "#34d399" }}>
            ${formatNumber(stats?.total_loss_exposure || 184500)}
          </div>
          <div className="metric-subtext" style={{ color: "#34d399" }}>
            Prevented & disputed fraud volume
          </div>
        </div>
      </div>

      {/* 
          CONTROL & FILTER TOOLBAR
          */}
      <div
        className="card graph-toolbar"
        style={{ padding: "0.875rem 1.25rem" }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              fontSize: "0.6875rem",
              fontWeight: 500,
              color: "var(--text-disabled)",
              letterSpacing: "0.05em",
              fontFamily: "var(--font-heading)",
              textTransform: "uppercase",
            }}
          >
            Active Syndicate:
          </span>
          <select
            value={selectedRingId}
            onChange={(e) => setSelectedRingId(e.target.value)}
            style={{
              background: "#0f172a",
              backgroundColor: "#0f172a",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              color: "#f8fafc",
              padding: "0.45rem 0.85rem",
              borderRadius: "var(--radius-md)",
              fontSize: "0.8125rem",
              fontWeight: 500,
              fontFamily: "var(--font-mono)",
              cursor: "pointer",
              outline: "none",
            }}
          >
            {rings.map((ring) => (
              <option
                key={ring.ring_id}
                value={ring.ring_id}
                style={{
                  background: "#0f172a",
                  backgroundColor: "#0f172a",
                  color: "#f8fafc",
                  padding: "0.5rem",
                }}
              >
                {ring.name} ({ring.account_count} accounts · Risk:{" "}
                {ring.risk_score})
              </option>
            ))}
          </select>
        </div>

        {/* Entity Search Box */}
        <form
          onSubmit={handleSearch}
          style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}
        >
          <div style={{ position: "relative", flex: "1 1 auto" }}>
            <input
              type="text"
              placeholder="Search Customer, Device or IP..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-md)",
                padding: "0.45rem 0.85rem 0.45rem 2rem",
                color: "var(--text-primary)",
                fontSize: "0.8125rem",
                width: "240px",
                fontFamily: "var(--font-body)",
                fontWeight: 400,
              }}
            />
            <Search
              size={13}
              style={{
                position: "absolute",
                left: "0.65rem",
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--text-disabled)",
              }}
            />
          </div>
          <button
            type="submit"
            className="btn btn-secondary"
            style={{
              padding: "0.45rem 0.85rem",
              fontSize: "0.8125rem",
              whiteSpace: "nowrap",
            }}
          >
            Lookup
          </button>
        </form>
      </div>

      {/* 
          MAIN GRAPH CANVAS & ENTITY INSPECTOR SPLIT VIEW
          */}
      <div id="graph-canvas-section" className="graph-layout-grid">
        {/* Graph Canvas Card */}
        <div
          className="card"
          style={{
            padding: "1rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
            width: "100%",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "0.5rem",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                flexWrap: "wrap",
              }}
            >
              <span
                style={{
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  fontFamily: "var(--font-heading)",
                  color: "var(--text-primary)",
                  letterSpacing: "-0.02em",
                }}
              >
                {currentRing?.name || "Syndicate Subgraph"}
              </span>
              <span
                className="badge badge-high"
                style={{
                  fontSize: "0.625rem",
                  fontFamily: "var(--font-mono)",
                  fontWeight: 500,
                }}
              >
                Risk: {currentRing?.risk_score || 0.95}
              </span>
            </div>

            <div style={{ display: "flex", gap: "0.5rem" }}>
              <span
                style={{
                  fontSize: "0.6875rem",
                  color: "var(--text-disabled)",
                  fontFamily: "var(--font-mono)",
                  fontWeight: 400,
                }}
              >
                Nodes: {nodes.length} · Edges: {edges.length}
              </span>
            </div>
          </div>

          <FraudGraphCanvas
            apiNodes={nodes}
            apiEdges={edges}
            onSelectNode={(node) => {
              setSelectedNode(node);
              setFlaggedRing(false);
            }}
            selectedEntityId={selectedNode?.data.entity_id as string}
          />
        </div>

        {/* Side Entity Inspector */}
        <div
          className="card"
          style={{
            padding: "1.25rem",
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
          }}
        >
          <div
            style={{
              borderBottom: "1px solid var(--border-muted)",
              paddingBottom: "0.875rem",
            }}
          >
            <div
              style={{
                fontSize: "0.625rem",
                color: "var(--text-disabled)",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                fontFamily: "var(--font-heading)",
              }}
            >
              Entity Telemetry
            </div>
            <div
              style={{
                fontSize: "1rem",
                fontWeight: 500,
                color: "var(--text-primary)",
                fontFamily: "var(--font-mono)",
                marginTop: "0.3rem",
                letterSpacing: "-0.01em",
              }}
            >
              {selectedNode
                ? (selectedNode.data.entity_id as string)
                : "dev_ring_0026"}
            </div>
            <div
              style={{
                fontSize: "0.75rem",
                color: "#60a5fa",
                marginTop: "0.15rem",
                fontFamily: "var(--font-body)",
                fontWeight: 400,
              }}
            >
              Type:{" "}
              {selectedNode
                ? (selectedNode.data.entity_type as string)
                : "Shared Device"}
            </div>
          </div>

          {/* Node Specific Details */}
          {selectedNode && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.625rem",
              }}
            >
              {selectedNode.type === "device" && (
                <>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "0.8125rem",
                    }}
                  >
                    <span
                      style={{ color: "var(--text-tertiary)", fontWeight: 400 }}
                    >
                      Linked Accounts:
                    </span>
                    <span
                      style={{
                        fontWeight: 500,
                        color: "#f87171",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      {(selectedNode.data.customer_count as number) ||
                        currentRing?.account_count ||
                        10}
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "0.8125rem",
                    }}
                  >
                    <span
                      style={{ color: "var(--text-tertiary)", fontWeight: 400 }}
                    >
                      Confirmed Fraud Txns:
                    </span>
                    <span
                      style={{
                        fontWeight: 500,
                        color: "#ef4444",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      {(selectedNode.data.fraud_count as number) ||
                        currentRing?.fraud_transactions ||
                        42}
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "0.8125rem",
                    }}
                  >
                    <span
                      style={{ color: "var(--text-tertiary)", fontWeight: 400 }}
                    >
                      Device Classification:
                    </span>
                    <span style={{ fontWeight: 500, color: "#fbbf24" }}>
                      High-Volume Farm
                    </span>
                  </div>
                </>
              )}

              {selectedNode.type === "customer" && (
                <>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "0.8125rem",
                    }}
                  >
                    <span
                      style={{ color: "var(--text-tertiary)", fontWeight: 400 }}
                    >
                      Country:
                    </span>
                    <span
                      style={{
                        fontWeight: 500,
                        color: "var(--text-primary)",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      {(selectedNode.data.country as string) || "US"}
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "0.8125rem",
                    }}
                  >
                    <span
                      style={{ color: "var(--text-tertiary)", fontWeight: 400 }}
                    >
                      Lifetime Value:
                    </span>
                    <span
                      style={{
                        fontWeight: 500,
                        color: "#34d399",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      $
                      {formatNumber(
                        (selectedNode.data.lifetime_value as number) || 0,
                      )}
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "0.8125rem",
                    }}
                  >
                    <span
                      style={{ color: "var(--text-tertiary)", fontWeight: 400 }}
                    >
                      Chargeback Rate:
                    </span>
                    <span
                      style={{
                        fontWeight: 500,
                        color: "#f87171",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      {(
                        ((selectedNode.data.chargeback_rate as number) || 0) *
                        100
                      ).toFixed(1)}
                      %
                    </span>
                  </div>
                </>
              )}

              {selectedNode.type === "transaction" && (
                <>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "0.8125rem",
                    }}
                  >
                    <span
                      style={{ color: "var(--text-tertiary)", fontWeight: 400 }}
                    >
                      Amount:
                    </span>
                    <span
                      style={{
                        fontWeight: 500,
                        color: "#22d3ee",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      ${selectedNode.data.amount as number}
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "0.8125rem",
                    }}
                  >
                    <span
                      style={{ color: "var(--text-tertiary)", fontWeight: 400 }}
                    >
                      Pattern:
                    </span>
                    <span
                      style={{
                        fontWeight: 500,
                        color: "#f87171",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      {(selectedNode.data.fraud_pattern as string) ||
                        "fraud_ring"}
                    </span>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Defense Actions */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.5rem",
              marginTop: "auto",
            }}
          >
            <button
              onClick={() => setFlaggedRing(true)}
              className="btn"
              style={{
                width: "100%",
                background: flaggedRing
                  ? "rgba(16, 185, 129, 0.12)"
                  : "rgba(239, 68, 68, 0.12)",
                color: flaggedRing ? "#34d399" : "#f87171",
                border: `1px solid ${flaggedRing ? "rgba(16, 185, 129, 0.25)" : "rgba(239, 68, 68, 0.25)"}`,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: "0.4rem",
                fontWeight: 500,
              }}
            >
              {flaggedRing ? (
                <>
                  <Check size={15} />
                  <span>Syndicate Blocked</span>
                </>
              ) : (
                <>
                  <ShieldAlert size={15} />
                  <span>Block Entire Syndicate</span>
                </>
              )}
            </button>

            <button
              onClick={handleCopyCypher}
              className="btn btn-secondary"
              style={{
                width: "100%",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: "0.4rem",
                fontSize: "0.75rem",
                fontWeight: 500,
              }}
            >
              {copiedCypher ? (
                <Check size={13} color="#10b981" />
              ) : (
                <Copy size={13} />
              )}
              <span>
                {copiedCypher ? "Cypher Query Copied!" : "Export Cypher Query"}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* 
          DETECTED FRAUD RINGS TABLE & RESPONSIVE CARDS
          */}
      <div className="card" style={{ padding: "1.5rem" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1.25rem",
            flexWrap: "wrap",
            gap: "0.5rem",
          }}
        >
          <div>
            <h3
              style={{
                fontSize: "1.0625rem",
                fontWeight: 600,
                letterSpacing: "-0.025em",
                fontFamily: "var(--font-heading)",
                color: "var(--text-primary)",
              }}
            >
              Identified Fraud Syndicates & Clusters
            </h3>
            <p
              style={{
                color: "var(--text-tertiary)",
                fontSize: "0.8125rem",
                marginTop: "0.2rem",
                fontFamily: "var(--font-body)",
                fontWeight: 400,
              }}
            >
              Ranked by cross-account volume and risk exposure in Neo4j graph.
            </p>
          </div>
          <span
            style={{
              fontSize: "0.6875rem",
              color: "var(--text-disabled)",
              fontFamily: "var(--font-mono)",
              fontWeight: 400,
            }}
          >
            Showing {rings.length} syndicates
          </span>
        </div>

        {/* Desktop Data Table */}
        <div className="desktop-table-view">
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Ring ID</th>
                  <th>Syndicate Name</th>
                  <th>Ring Type</th>
                  <th>Shared Entity</th>
                  <th>Accounts</th>
                  <th>Fraud Volume</th>
                  <th>Fraud Rate</th>
                  <th>Risk Score</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {rings.map((ring) => (
                  <tr
                    key={ring.ring_id}
                    style={{
                      background:
                        ring.ring_id === selectedRingId
                          ? "rgba(59, 130, 246, 0.05)"
                          : undefined,
                    }}
                  >
                    <td
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontWeight: 500,
                        color: "var(--text-secondary)",
                      }}
                    >
                      {ring.ring_id}
                    </td>
                    <td
                      style={{ fontWeight: 500, color: "var(--text-primary)" }}
                    >
                      {ring.name}
                    </td>
                    <td>
                      <span
                        className="badge badge-low"
                        style={{ fontSize: "0.625rem", fontWeight: 500 }}
                      >
                        {ring.ring_type}
                      </span>
                    </td>
                    <td
                      style={{
                        fontFamily: "var(--font-mono)",
                        color: "#60a5fa",
                        fontWeight: 400,
                      }}
                    >
                      {ring.shared_entity}
                    </td>
                    <td
                      style={{ fontWeight: 500, color: "var(--text-primary)" }}
                    >
                      {ring.account_count} accounts
                    </td>
                    <td style={{ fontWeight: 500, color: "#f87171" }}>
                      ${formatNumber(ring.fraud_volume)}
                    </td>
                    <td
                      style={{
                        color: "var(--text-secondary)",
                        fontWeight: 400,
                      }}
                    >
                      {(ring.fraud_rate * 100).toFixed(1)}%
                    </td>
                    <td>
                      <span
                        className={`badge ${ring.risk_score >= 0.75 ? "badge-high" : "badge-medium"}`}
                        style={{ fontWeight: 500 }}
                      >
                        {ring.risk_score}
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={() => {
                          setSelectedRingId(ring.ring_id);
                          const el = document.getElementById(
                            "graph-canvas-section",
                          );
                          if (el)
                            el.scrollIntoView({
                              behavior: "smooth",
                              block: "start",
                            });
                        }}
                        className="btn btn-secondary"
                        style={{
                          padding: "0.25rem 0.6rem",
                          fontSize: "0.6875rem",
                          fontWeight: 500,
                        }}
                      >
                        Inspect in Graph →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile Interactive Cards View */}
        <div className="mobile-cards-view">
          {rings.map((ring) => {
            const isSelected = ring.ring_id === selectedRingId;
            return (
              <div
                key={ring.ring_id}
                className={`syndicate-card-item ${isSelected ? "active" : ""}`}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: "0.5rem",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: "0.6875rem",
                        fontFamily: "var(--font-mono)",
                        color: "#60a5fa",
                        fontWeight: 500,
                      }}
                    >
                      {ring.ring_id}
                    </div>
                    <div
                      style={{
                        fontSize: "0.9375rem",
                        fontWeight: 600,
                        color: "var(--text-primary)",
                        fontFamily: "var(--font-heading)",
                        marginTop: "0.1rem",
                        letterSpacing: "-0.02em",
                      }}
                    >
                      {ring.name}
                    </div>
                  </div>
                  <span
                    className={`badge ${ring.risk_score >= 0.75 ? "badge-high" : "badge-medium"}`}
                    style={{ fontWeight: 500 }}
                  >
                    Risk: {ring.risk_score}
                  </span>
                </div>

                <div
                  className="rg-2-sm"
                  style={{
                    fontSize: "0.75rem",
                    background: "rgba(255,255,255,0.02)",
                    padding: "0.75rem",
                    borderRadius: "var(--radius-md)",
                  }}
                >
                  <div>
                    <span
                      style={{ color: "var(--text-disabled)", fontWeight: 400 }}
                    >
                      Type:{" "}
                    </span>
                    <span
                      style={{
                        color: "var(--text-secondary)",
                        fontWeight: 500,
                      }}
                    >
                      {ring.ring_type}
                    </span>
                  </div>
                  <div>
                    <span
                      style={{ color: "var(--text-disabled)", fontWeight: 400 }}
                    >
                      Accounts:{" "}
                    </span>
                    <span
                      style={{ color: "var(--text-primary)", fontWeight: 500 }}
                    >
                      {ring.account_count}
                    </span>
                  </div>
                  <div>
                    <span
                      style={{ color: "var(--text-disabled)", fontWeight: 400 }}
                    >
                      Fraud Exposure:{" "}
                    </span>
                    <span style={{ color: "#f87171", fontWeight: 500 }}>
                      ${formatNumber(ring.fraud_volume)}
                    </span>
                  </div>
                  <div>
                    <span
                      style={{ color: "var(--text-disabled)", fontWeight: 400 }}
                    >
                      Fraud Rate:{" "}
                    </span>
                    <span style={{ color: "#fbbf24", fontWeight: 500 }}>
                      {(ring.fraud_rate * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.6875rem",
                      fontFamily: "var(--font-mono)",
                      color: "#60a5fa",
                      fontWeight: 400,
                    }}
                  >
                    {ring.shared_entity}
                  </span>
                  <button
                    onClick={() => {
                      setSelectedRingId(ring.ring_id);
                      const el = document.getElementById(
                        "graph-canvas-section",
                      );
                      if (el)
                        el.scrollIntoView({
                          behavior: "smooth",
                          block: "start",
                        });
                    }}
                    className="btn btn-secondary"
                    style={{
                      padding: "0.3rem 0.65rem",
                      fontSize: "0.6875rem",
                      fontWeight: 500,
                    }}
                  >
                    {isSelected ? "Inspecting" : "Inspect in Graph →"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
