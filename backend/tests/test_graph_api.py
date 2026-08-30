"""
SignalX - Graph API Tests

Tests for /api/graph/stats, /api/graph/rings, and /api/graph/subgraph endpoints.
"""

import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)


def test_graph_stats_endpoint():
    """Verify graph stats endpoint returns health and metrics."""
    response = client.get("/api/graph/stats")
    assert response.status_code == 200
    data = response.json()
    assert "total_nodes" in data
    assert "total_relationships" in data
    assert "total_fraud_rings" in data
    assert "connection" in data
    assert "connected" in data["connection"]


def test_graph_rings_endpoint():
    """Verify fraud rings detection list endpoint."""
    response = client.get("/api/graph/rings?limit=5")
    assert response.status_code == 200
    rings = response.json()
    assert isinstance(rings, list)
    if len(rings) > 0:
        ring = rings[0]
        assert "ring_id" in ring
        assert "account_count" in ring
        assert "risk_score" in ring
        assert "severity" in ring


def test_graph_subgraph_endpoint():
    """Verify subgraph endpoint returns React Flow compatible nodes and edges."""
    response = client.get("/api/graph/subgraph?ring_id=RING-DEV-001")
    assert response.status_code == 200
    subgraph = response.json()
    assert "nodes" in subgraph
    assert "edges" in subgraph
    assert "node_count" in subgraph
    assert "edge_count" in subgraph
    assert len(subgraph["nodes"]) > 0
    assert len(subgraph["edges"]) > 0

    # Verify node structure
    node = subgraph["nodes"][0]
    assert "id" in node
    assert "type" in node
    assert "data" in node
