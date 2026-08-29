"use client";

import { useMemo, useCallback, useEffect, useState } from "react";
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
  type Node,
  type Edge,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  Smartphone,
  User,
  Globe,
  CreditCard,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
} from "lucide-react";
import {
  type GraphNode as ApiGraphNode,
  type GraphEdge as ApiGraphEdge,
} from "@/lib/api";

function formatNum(num: number): string {
  return new Intl.NumberFormat("en-US").format(Math.round(num));
}

// CUSTOM NODE COMPONENTS

function CustomerNode({ data, selected }: NodeProps) {
  const isHighRisk =
    ((data.chargeback_rate as number) || 0) > 0.3 ||
    ((data.return_rate as number) || 0) > 0.4;
  const ltv = (data.lifetime_value as number) || 0;

  return (
    <div
      style={{
        padding: "0.75rem 1rem",
        borderRadius: "8px",
        background: selected ? "rgba(59, 130, 246, 0.25)" : "#0c1222",
        border: `1.5px solid ${selected ? "#60a5fa" : isHighRisk ? "#ef4444" : "#3b82f6"}`,
        boxShadow: selected
          ? "0 0 20px rgba(96, 165, 250, 0.4)"
          : isHighRisk
            ? "0 0 12px rgba(239, 68, 68, 0.25)"
            : "0 2px 8px rgba(0,0,0,0.4)",
        minWidth: "160px",
        cursor: "pointer",
        transition: "all 0.15s ease",
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: "#3b82f6" }}
      />
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          marginBottom: "0.35rem",
        }}
      >
        <div
          style={{
            width: "24px",
            height: "24px",
            borderRadius: "50%",
            background: isHighRisk
              ? "rgba(239, 68, 68, 0.2)"
              : "rgba(59, 130, 246, 0.2)",
            color: isHighRisk ? "#ef4444" : "#60a5fa",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <User size={13} />
        </div>
        <span
          style={{
            fontWeight: 800,
            fontSize: "0.8125rem",
            color: "#f8fafc",
            fontFamily: "JetBrains Mono, monospace",
          }}
        >
          {data.entity_id as string}
        </span>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: "0.6875rem",
          color: "#94a3b8",
        }}
      >
        <span>LTV: ${formatNum(ltv)}</span>
        <span
          style={{ color: isHighRisk ? "#f87171" : "#34d399", fontWeight: 700 }}
        >
          {isHighRisk ? "HIGH RISK" : "CLEAN"}
        </span>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: "#3b82f6" }}
      />
    </div>
  );
}

function DeviceNode({ data, selected }: NodeProps) {
  return (
    <div
      style={{
        padding: "1rem 1.25rem",
        borderRadius: "10px",
        background: selected ? "rgba(16, 185, 129, 0.25)" : "#091717",
        border: `2px solid ${selected ? "#34d399" : "#10b981"}`,
        boxShadow: "0 0 25px rgba(16, 185, 129, 0.35)",
        minWidth: "200px",
        cursor: "pointer",
        textAlign: "center",
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: "#10b981" }}
      />
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.5rem",
          marginBottom: "0.35rem",
        }}
      >
        <div
          style={{
            width: "28px",
            height: "28px",
            borderRadius: "6px",
            background: "rgba(16, 185, 129, 0.2)",
            color: "#10b981",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Smartphone size={16} />
        </div>
        <div style={{ textAlign: "left" }}>
          <div
            style={{
              fontSize: "0.625rem",
              color: "#34d399",
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            SHARED HARDWARE HUB
          </div>
          <div
            style={{
              fontWeight: 800,
              fontSize: "0.875rem",
              color: "#f8fafc",
              fontFamily: "JetBrains Mono, monospace",
            }}
          >
            {data.entity_id as string}
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "0.5rem",
          marginTop: "0.4rem",
        }}
      >
        <span
          style={{
            fontSize: "0.6875rem",
            background: "rgba(16,185,129,0.15)",
            color: "#34d399",
            padding: "0.15rem 0.45rem",
            borderRadius: "4px",
            fontWeight: 700,
          }}
        >
          {(data.customer_count as number) || 2} Linked Accounts
        </span>
        <span
          style={{
            fontSize: "0.6875rem",
            background: "rgba(239,68,68,0.15)",
            color: "#f87171",
            padding: "0.15rem 0.45rem",
            borderRadius: "4px",
            fontWeight: 700,
          }}
        >
          Syndicate Core
        </span>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: "#10b981" }}
      />
    </div>
  );
}

function IpNode({ data, selected }: NodeProps) {
  return (
    <div
      style={{
        padding: "0.75rem 1rem",
        borderRadius: "8px",
        background: selected ? "rgba(168, 85, 247, 0.25)" : "#130f1e",
        border: `1.5px solid ${selected ? "#c084fc" : "#a855f7"}`,
        boxShadow: "0 0 16px rgba(168, 85, 247, 0.25)",
        minWidth: "160px",
        cursor: "pointer",
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: "#a855f7" }}
      />
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          marginBottom: "0.25rem",
        }}
      >
        <div
          style={{
            width: "24px",
            height: "24px",
            borderRadius: "50%",
            background: "rgba(168, 85, 247, 0.2)",
            color: "#c084fc",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Globe size={13} />
        </div>
        <span
          style={{
            fontWeight: 800,
            fontSize: "0.8125rem",
            color: "#f8fafc",
            fontFamily: "JetBrains Mono, monospace",
          }}
        >
          {data.entity_id as string}
        </span>
      </div>
      <div style={{ fontSize: "0.6875rem", color: "#c084fc" }}>
        Subnet Cluster Proxy
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: "#a855f7" }}
      />
    </div>
  );
}

function TransactionNode({ data, selected }: NodeProps) {
  const isFraud = data.is_fraud as boolean;

  return (
    <div
      style={{
        padding: "0.6rem 0.85rem",
        borderRadius: "6px",
        background: isFraud ? "rgba(239, 68, 68, 0.15)" : "#09121c",
        border: `1px solid ${isFraud ? "#ef4444" : "#06b6d4"}`,
        minWidth: "120px",
        cursor: "pointer",
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: isFraud ? "#ef4444" : "#06b6d4" }}
      />
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "0.5rem",
        }}
      >
        <span
          style={{
            fontWeight: 800,
            fontSize: "0.8125rem",
            color: isFraud ? "#f87171" : "#22d3ee",
          }}
        >
          ${data.amount as number}
        </span>
        <span
          style={{
            fontSize: "0.625rem",
            fontWeight: 700,
            color: isFraud ? "#ef4444" : "#10b981",
          }}
        >
          {isFraud ? "FRAUD" : "AUTH"}
        </span>
      </div>
      <div
        style={{
          fontSize: "0.625rem",
          color: "#64748b",
          fontFamily: "JetBrains Mono, monospace",
          marginTop: "0.15rem",
        }}
      >
        {data.entity_id as string}
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: isFraud ? "#ef4444" : "#06b6d4" }}
      />
    </div>
  );
}

const nodeTypes = {
  customer: CustomerNode,
  device: DeviceNode,
  ip: IpNode,
  transaction: TransactionNode,
};

// GRAPH CANVAS MAIN COMPONENT

interface FraudGraphCanvasProps {
  apiNodes: ApiGraphNode[];
  apiEdges: ApiGraphEdge[];
  onSelectNode: (node: ApiGraphNode | null) => void;
  selectedEntityId?: string;
}

export function FraudGraphCanvas({
  apiNodes,
  apiEdges,
  onSelectNode,
  selectedEntityId,
}: FraudGraphCanvasProps) {
  // Transform API nodes to React Flow layout
  const { initialNodes, initialEdges } = useMemo(() => {
    const centerX = 380;
    const centerY = 280;

    // Categorize nodes
    const deviceNodes = apiNodes.filter((n) => n.type === "device");
    const ipNodes = apiNodes.filter((n) => n.type === "ip");
    const customerNodes = apiNodes.filter((n) => n.type === "customer");
    const txnNodes = apiNodes.filter((n) => n.type === "transaction");

    const rfNodes: Node[] = [];

    // Position Devices at Center
    deviceNodes.forEach((n, idx) => {
      rfNodes.push({
        id: n.id,
        type: "device",
        position: { x: centerX + idx * 240, y: centerY },
        data: n.data,
        selected: n.data.entity_id === selectedEntityId,
      });
    });

    // If no device node found, place a center dummy device anchor
    if (deviceNodes.length === 0 && apiNodes.length > 0) {
      rfNodes.push({
        id: "center_hub",
        type: "device",
        position: { x: centerX, y: centerY },
        data: {
          entity_id: "dev_cluster_hub",
          customer_count: customerNodes.length,
        },
      });
    }

    // Position IPs slightly above
    ipNodes.forEach((n, idx) => {
      rfNodes.push({
        id: n.id,
        type: "ip",
        position: { x: centerX - 200 + idx * 220, y: centerY - 170 },
        data: n.data,
        selected: n.data.entity_id === selectedEntityId,
      });
    });

    // Position Customers radially below
    customerNodes.forEach((n, idx) => {
      const angle =
        (idx / Math.max(customerNodes.length, 1)) * Math.PI - Math.PI / 2;
      const radius = 240;
      rfNodes.push({
        id: n.id,
        type: "customer",
        position: {
          x: centerX + Math.cos(angle) * radius * 1.5,
          y: centerY + 150 + Math.sin(angle) * 70,
        },
        data: n.data,
        selected: n.data.entity_id === selectedEntityId,
      });
    });

    // Position Transactions around outer perimeter
    txnNodes.forEach((n, idx) => {
      rfNodes.push({
        id: n.id,
        type: "transaction",
        position: {
          x: 80 + (idx % 4) * 170,
          y: centerY + 310 + Math.floor(idx / 4) * 75,
        },
        data: n.data,
        selected: n.data.entity_id === selectedEntityId,
      });
    });

    // Format Edges
    const rfEdges: Edge[] = apiEdges.map((e) => {
      const isDeviceEdge =
        e.target.includes("device") || e.source.includes("device");
      return {
        id: e.id,
        source: e.source,
        target: e.target,
        type: "smoothstep",
        animated: isDeviceEdge,
        style: {
          stroke: isDeviceEdge
            ? "#10b981"
            : e.target.includes("ip")
              ? "#a855f7"
              : "#3b82f6",
          strokeWidth: isDeviceEdge ? 2 : 1.5,
        },
        label: e.label,
        labelStyle: {
          fill: "#94a3b8",
          fontSize: 10,
          fontFamily: "JetBrains Mono, monospace",
        },
        labelBgStyle: {
          fill: "#090d16",
          fillOpacity: 0.9,
        },
      };
    });

    return { initialNodes: rfNodes, initialEdges: rfEdges };
  }, [apiNodes, apiEdges, selectedEntityId]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Sync React Flow nodes/edges when API data changes
  useEffect(() => {
    setNodes(initialNodes);
  }, [initialNodes, setNodes]);

  useEffect(() => {
    setEdges(initialEdges);
  }, [initialEdges, setEdges]);

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      const found = apiNodes.find((n) => n.id === node.id);
      if (found) {
        onSelectNode(found);
      }
    },
    [apiNodes, onSelectNode],
  );

  return (
    <div
      className="graph-canvas-container"
      style={{
        background: "#060910",
        border: "1px solid #1a2336",
      }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        onNodeClick={handleNodeClick}
        fitView
        minZoom={0.2}
        maxZoom={2}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="rgba(255,255,255,0.08)"
        />
        <Controls
          style={{
            background: "#1e293b",
            border: "1px solid #334155",
            borderRadius: "6px",
          }}
        />
        <MiniMap
          nodeColor={(n) => {
            if (n.type === "device") return "#10b981";
            if (n.type === "customer") return "#3b82f6";
            if (n.type === "ip") return "#a855f7";
            return "#06b6d4";
          }}
          style={{
            background: "#080c16",
            border: "1px solid #1e293e",
            borderRadius: "6px",
          }}
        />
      </ReactFlow>
    </div>
  );
}
