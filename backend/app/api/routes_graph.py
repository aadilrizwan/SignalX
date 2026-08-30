"""
SignalX - Graph API Routes

Endpoints for Neo4j Aura graph statistics, fraud ring syndicate detection,
interactive subgraphs (React Flow format), and dataset synchronization.
"""

from fastapi import APIRouter, Query, HTTPException
from typing import Optional, Dict, Any, List
from backend.app.services.neo4j_service import Neo4jService

router = APIRouter(prefix="/api/graph", tags=["Graph Intelligence"])


@router.get("/stats", summary="Get Neo4j Graph Statistics & Connectivity")
def get_graph_stats() -> Dict[str, Any]:
    """Return graph health, node/edge counts, detected rings, and financial exposure."""
    svc = Neo4jService.get_instance()
    stats = svc.get_graph_stats()
    conn_info = svc.get_connection_info()
    return {
        **stats,
        "connection": conn_info,
    }


@router.get("/rings", summary="List Detected Fraud Rings")
def get_fraud_rings(
    min_accounts: int = Query(2, ge=2, le=50, description="Minimum linked accounts to form a ring"),
    limit: int = Query(20, ge=1, le=100, description="Max rings to return"),
) -> List[Dict[str, Any]]:
    """Return multi-account syndicates sharing devices, IPs, or addresses."""
    svc = Neo4jService.get_instance()
    return svc.get_fraud_rings(min_accounts=min_accounts, limit=limit)


@router.get("/subgraph", summary="Get Subgraph for Visualization")
def get_subgraph(
    ring_id: Optional[str] = Query(None, description="Ring ID (e.g. RING-DEV-001)"),
    entity_id: Optional[str] = Query(None, description="Device ID, IP, or Customer ID"),
) -> Dict[str, Any]:
    """Return nodes and edges formatted for React Flow graph rendering."""
    target = entity_id or ring_id or "dev_ring_0026"
    svc = Neo4jService.get_instance()
    return svc.get_ring_subgraph(target)


@router.post("/sync", summary="Sync Dataset into Neo4j Aura")
def sync_neo4j_dataset(
    max_txns: int = Query(10000, ge=100, le=50000, description="Max transactions to batch load"),
) -> Dict[str, Any]:
    """Trigger background batch load of customers, devices, and transactions into Neo4j."""
    svc = Neo4jService.get_instance()
    if not svc.is_connected():
        raise HTTPException(status_code=503, detail="Neo4j Aura database is not connected.")
    try:
        result = svc.sync_dataset_to_neo4j(max_txns=max_txns)
        return result
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Neo4j sync failed: {str(exc)}")
