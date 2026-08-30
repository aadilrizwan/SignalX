"""
SignalX - FastAPI Application

Main application entry point. Mounts all API routers,
configures CORS, and loads ML models on startup.
"""

import os
import sys
from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Add project root to path
project_root = str(Path(__file__).parent.parent.parent)
if project_root not in sys.path:
    sys.path.insert(0, project_root)

from backend.app.config import get_settings
from backend.app.api.routes_risk import router as risk_router
from backend.app.api.routes_transactions import router as transactions_router
from backend.app.api.routes_dashboard import router as dashboard_router
from backend.app.api.routes_model import router as model_router
from backend.app.api.routes_graph import router as graph_router
from backend.app.api.routes_returns import router as returns_router
from backend.app.api.routes_chargebacks import router as chargebacks_router
from backend.app.api.routes_evidence import router as evidence_router
from backend.app.api.routes_reviews import router as reviews_router
from backend.app.api.routes_webhooks import router as webhooks_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: auto-bootstrap dataset and ML models, cleanup on shutdown."""
    settings = get_settings()
    print("=" * 50)
    print("  SignalX — Starting up...")
    print("=" * 50)

    # 1. Ensure data directory and seed datasets exist
    os.makedirs(settings.data_dir, exist_ok=True)
    txn_path = os.path.join(settings.data_dir, "transactions.csv")
    if not os.path.exists(txn_path) or os.path.getsize(txn_path) < 100:
        try:
            print("  ⚡ Auto-bootstrapping synthetic merchant datasets...")
            from synthetic_data.generator import generate_all
            generate_all(
                n_customers=2000,
                n_transactions=10000,
                n_devices=1000,
                n_ips=1500,
                output_dir=settings.data_dir,
                seed=42,
            )
            print("  ✓ Synthetic datasets bootstrapped")
        except Exception as e:
            print(f"  ⚠ Dataset bootstrap: {e}")

    # 2. Ensure ML models exist
    model_path = settings.ml_model_path
    if not os.path.exists(model_path):
        try:
            print("  ⚡ Auto-training ML models on startup...")
            from ml.training.train_model import train_models
            train_models(data_dir=settings.data_dir, model_dir="ml/models")
            print("  ✓ ML models trained and saved")
        except Exception as e:
            print(f"  ⚠ Model training bootstrap: {e}")

    # 3. Create database tables
    try:
        from backend.app.database import create_tables
        create_tables()
        print("  ✓ Database tables created")
    except Exception as e:
        print(f"  ⚠ Database setup: {e}")

    # 4. Pre-warm risk service (loads ML models)
    try:
        from backend.app.api.routes_risk import get_risk_service
        service = get_risk_service()
        print("  ✓ Risk engine initialized")
    except Exception as e:
        print(f"  ⚠ Risk engine: {e}")

    # 5. Pre-warm data services
    try:
        from backend.app.api.routes_transactions import get_txn_service
        from backend.app.services.returns_service import get_returns_service
        from backend.app.services.chargebacks_service import get_chargebacks_service
        from backend.app.services.reviews_service import get_reviews_service
        from backend.app.services.evidence_service import get_evidence_service
        get_txn_service()
        get_returns_service()
        get_chargebacks_service()
        get_reviews_service()
        get_evidence_service()
        print("  ✓ Merchant data services loaded in memory")
    except Exception as e:
        print(f"  ⚠ Data services: {e}")

    # 6. Pre-warm velocity engine (Redis / In-memory)
    try:
        from backend.app.risk_engine.velocity_tracker import get_velocity_tracker
        tracker = get_velocity_tracker()
        backend_type = "Redis" if tracker.use_redis else "In-Memory Sliding Window"
        print(f"  ✓ Velocity engine active ({backend_type})")
    except Exception as e:
        print(f"  ⚠ Velocity engine: {e}")

    # 7. Pre-warm Supabase service
    try:
        from backend.app.services.supabase_service import get_supabase_service
        sb = get_supabase_service()
        sb_status = "Connected" if sb.is_connected else "Local Fallback Simulation"
        print(f"  ✓ Supabase cloud service ({sb_status})")
    except Exception as e:
        print(f"  ⚠ Supabase service: {e}")

    print("  ✓ Ready to accept requests")
    print("=" * 50)

    yield  # Application runs

    print("  SignalX — Shutting down...")



# Create FastAPI app
app = FastAPI(
    title="SignalX",
    description="AI-powered Risk Management Platform for Merchants. "
                "Detects payment fraud, return abuse, chargebacks, and coordinated fraud rings.",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS configuration for local and cloud deployments (Vercel, Render, Railway)
settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_origin_regex=r"^https://.*(\.vercel\.app|\.onrender\.com|\.railway\.app)$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount routers
app.include_router(risk_router)
app.include_router(transactions_router)
app.include_router(dashboard_router)
app.include_router(model_router)
app.include_router(graph_router)
app.include_router(returns_router)
app.include_router(chargebacks_router)
app.include_router(evidence_router)
app.include_router(reviews_router)
app.include_router(webhooks_router)


@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "SignalX",
        "version": "1.0.0",
    }


@app.get("/", tags=["Root"])
async def root():
    """API root — redirects to documentation."""
    return {
        "service": "SignalX",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health",
        "endpoints": {
            "risk_scoring": "/api/risk/score",
            "transactions": "/api/transactions",
            "dashboard": "/api/dashboard/metrics",
            "model_metrics": "/api/model/metrics",
            "graph_intelligence": "/api/graph/stats",
            "fraud_rings": "/api/graph/rings",
            "graph_subgraph": "/api/graph/subgraph",
            "returns_metrics": "/api/returns/metrics",
            "returns_abusers": "/api/returns/abusers",
            "returns_list": "/api/returns",
            "returns_scoring": "/api/returns/score",
            "chargebacks_metrics": "/api/chargebacks/metrics",
            "chargebacks_list": "/api/chargebacks",
            "chargebacks_defend": "/api/chargebacks/defend",
            "evidence_metrics": "/api/evidence/metrics",
            "evidence_packages": "/api/evidence/packages",
            "evidence_generate": "/api/evidence/generate",
            "review_metrics": "/api/reviews/metrics",
            "review_queue": "/api/reviews/queue",
        },
    }
