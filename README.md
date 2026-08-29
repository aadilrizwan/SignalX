# SignalX - AI-Powered Merchant Risk Intelligence Platform

> **Built for Razorpay Buildthon** A production grade, real time fraud detection and merchant financial loss prevention platform.

---

## What is SignalX?

SignalX is a **defense only merchant risk intelligence platform** that evaluates every incoming payment for fraud signals, return abuse patterns, chargeback risk, and coordinated syndicate activity scoring transactions in **under 10ms** with full **SHAP based human readable explanations** for every decision.

### Key Capabilities

| Capability                  | Description                                                                    |
| :-------------------------- | :----------------------------------------------------------------------------- |
| **Real-Time Fraud Scoring** | 5 signal weighted fusion engine (ML + Rules + Anomaly + Behavioral + Graph)    |
| **Return Abuse Prevention** | Wardrobing detection, serial returner flagging, empty-box fraud identification |
| **Chargeback Defense**      | Auto-compiled evidence packages with LLM-powered representment narratives      |
| **Fraud Ring Intelligence** | Neo4j-powered entity linkage across device/IP/address clusters                 |
| **Explainable AI**          | TreeSHAP feature attribution every decision is fully auditable                 |
| **Role-Based Access**       | Supabase Auth with ANALYST and ADMIN roles + 1 `click demo logins              |

---

## Quick Start

### Prerequisites

- **Python 3.10+** and **pip**
- **Node.js 18+** and **npm**

### Backend Setup

```bash
# 1. Clone and install Python dependencies
git clone https://github.com/your-repo/SignalX.git
cd SignalX
pip install -r requirements.txt

# 2. Generate synthetic merchant data (10K customers, 50K transactions)
python -m synthetic_data.generator

# 3. Train ML models (LightGBM + Logistic Regression + Isolation Forest)
python -m ml.training.train_model

# 4. Start the FastAPI backend
uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend Setup

```bash
# 5. Install and start the Next.js frontend
cd frontend
npm install
npm run dev
```

### Quick Test Score a Transaction

```bash
curl -X POST http://localhost:8000/api/risk/score \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": "cust_000001",
    "amount": 74999,
    "payment_method": "credit_card",
    "device_id": "dev_fraud_999",
    "ip_address": "10.99.1.42",
    "billing_country": "NG",
    "shipping_country": "US"
  }'
```

---

## Architecture Overview

```
Transaction → Feature Engine (31 features)
                    ↓
    ┌───────────────────────────────────┐
    │  ML Model (LightGBM)        40%  │
    │  Rule Engine (8 rules)      20%  │
    │  Anomaly Detector (IsoForest) 15% │
    │  Behavior Scorer            15%  │
    │  Graph Scorer (Neo4j)       10%  │
    └───────────────────────────────────┘
                    ↓
           Risk Fusion Engine
           (weighted combination)
                    ↓
         ALLOW  /  REVIEW  /  BLOCK
                    ↓
           Explainable Decision
           (SHAP + human-readable reasons)
```

---

## ML Methodology

### Feature Engineering (31 Anti-Leakage Features)

| Category            | Count | Examples                                        |
| :------------------ | :---- | :---------------------------------------------- |
| Transaction Context | 6     | amount, hour, day_of_week, payment_method       |
| Customer Behavior   | 6     | account_age, txn_count, avg_amount, return_rate |
| Amount Deviation    | 2     | amount / customer_avg, amount / customer_max    |
| Velocity Vectors    | 5     | txn_count_1h, txn_count_24h, amount_sum_24h     |
| Device Fingerprint  | 3     | device_customer_count, device_fraud_rate        |
| IP Intelligence     | 4     | ip_customer_count, ip_fraud_rate                |
| Geographic Signals  | 2     | billing/shipping mismatch, high_risk_country    |
| Behavioral Novelty  | 3     | is_new_device, is_new_ip, is_new_country        |

All features use **point in time computation** only data available at the moment of the transaction is used. No future labels, no target leakage, no look ahead bias.

### Temporal Evaluation

```
Jan–Aug 2024  → Training    (67%)
Sep–Oct 2024  → Validation  (17%)
Nov–Dec 2024  → Test        (17%)
```

### Models

| Model               | Purpose                  | Fusion Weight |
| :------------------ | :----------------------- | :------------ |
| LightGBM            | Primary fraud classifier | 40%           |
| Isolation Forest    | Anomaly detection        | 15%           |
| Logistic Regression | Baseline comparison      | —             |

### Cost-Sensitive Decisioning

```
Expected Loss = P(fraud) × transaction_amount

False Positive Cost = $25   (blocking legitimate customer)
False Negative Cost = amount (full fraud loss)
Review Cost         = $5    (analyst review time)
```

The system finds the **cost optimal operating threshold**, not just the accuracy optimal one.

---

## Platform Modules (Frontend)

| Module                     | Route           | Description                                                                                                |
| :------------------------- | :-------------- | :--------------------------------------------------------------------------------------------------------- |
| **Landing Page**           | `/`             | Multi-section product showcase with live sandbox, architecture diagrams, and interactive risk scoring demo |
| **Merchant Dashboard**     | `/dashboard`    | Real-time KPIs: fraud rate, revenue saved, transaction volume, 30-day trends                               |
| **Transaction Inspector**  | `/transactions` | Browse, filter, and investigate transactions with risk badges and SHAP breakdowns                          |
| **Fraud Graph Visualizer** | `/fraud-graph`  | Interactive Neo4j-powered graph showing entity linkage: shared devices, IPs, addresses                     |
| **Return Abuse Analytics** | `/returns`      | Customer return rate scoring, wardrobing detection, serial returner flags                                  |
| **Chargeback Defense**     | `/chargebacks`  | Automated evidence assembly and dispute win-rate forecasting                                               |
| **Evidence Generator**     | `/evidence`     | LLM-powered (DeepSeek) evidence dossiers with source-backed dispute narratives                             |
| **Model Metrics**          | `/model`        | PR-AUC, ROC-AUC, precision/recall, confusion matrix, SHAP waterfall plots                                  |
| **Review Queue**           | `/reviews`      | Human in the loop analyst queue: Confirm Fraud, Mark Legitimate, Escalate                                  |
| **Risk Engine Settings**   | `/settings`     | Configure thresholds, cost matrix, fusion weights, rule severity levels                                    |
| **Login / Auth**           | `/login`        | Supabase email/password auth + 1-click demo logins for Judges                                              |

---

## API Endpoints

### Risk Scoring

| Method | Endpoint          | Description                                  |
| :----- | :---------------- | :------------------------------------------- |
| `POST` | `/api/risk/score` | Score a transaction's fraud risk (real-time) |
| `GET`  | `/api/risk/{id}`  | Get stored risk score by transaction ID      |

### Transaction Management

| Method | Endpoint                 | Description                                 |
| :----- | :----------------------- | :------------------------------------------ |
| `GET`  | `/api/transactions`      | List transactions (paginated, filterable)   |
| `GET`  | `/api/transactions/{id}` | Transaction detail with full risk breakdown |

### Dashboard & Analytics

| Method | Endpoint                    | Description                        |
| :----- | :-------------------------- | :--------------------------------- |
| `GET`  | `/api/dashboard/metrics`    | Dashboard overview metrics         |
| `GET`  | `/api/model/metrics`        | ML model performance metrics       |
| `GET`  | `/api/model/threshold-data` | Threshold sweep data for optimizer |
| `GET`  | `/api/model/drift`          | Model drift status                 |

### Graph Intelligence

| Method | Endpoint              | Description                        |
| :----- | :-------------------- | :--------------------------------- |
| `GET`  | `/api/graph/stats`    | Graph database statistics          |
| `GET`  | `/api/graph/rings`    | Detected fraud ring clusters       |
| `GET`  | `/api/graph/subgraph` | Entity subgraph visualization data |

### Return Abuse

| Method | Endpoint               | Description                      |
| :----- | :--------------------- | :------------------------------- |
| `GET`  | `/api/returns/metrics` | Return abuse analytics metrics   |
| `GET`  | `/api/returns/abusers` | Top return abusers ranked list   |
| `GET`  | `/api/returns`         | Return records (paginated)       |
| `POST` | `/api/returns/score`   | Score a return for abuse signals |

### Chargeback Defense

| Method | Endpoint                   | Description                        |
| :----- | :------------------------- | :--------------------------------- |
| `GET`  | `/api/chargebacks/metrics` | Chargeback analytics metrics       |
| `GET`  | `/api/chargebacks`         | Chargeback records (paginated)     |
| `POST` | `/api/chargebacks/defend`  | Generate automated defense package |

### Evidence & Disputes

| Method | Endpoint                 | Description                           |
| :----- | :----------------------- | :------------------------------------ |
| `GET`  | `/api/evidence/metrics`  | Evidence generation metrics           |
| `GET`  | `/api/evidence/packages` | Generated evidence packages           |
| `POST` | `/api/evidence/generate` | Generate LLM-powered evidence dossier |

### Review Queue

| Method | Endpoint               | Description          |
| :----- | :--------------------- | :------------------- |
| `GET`  | `/api/reviews/metrics` | Review queue metrics |
| `GET`  | `/api/reviews/queue`   | Pending review cases |

### Webhooks & System

| Method | Endpoint                 | Description                  |
| :----- | :----------------------- | :--------------------------- |
| `POST` | `/api/webhooks/razorpay` | Razorpay webhook integration |
| `GET`  | `/health`                | Health check endpoint        |
| `GET`  | `/docs`                  | Interactive Swagger API docs |

---

## Authentication & Security

- **Supabase Auth** — Email/password authentication with JWT tokens
- **Role-Based Access Control** — ANALYST (read-only, review queue) and ADMIN (full configuration)
- **1-Click Demo Logins** — Pre-configured demo accounts for hackathon judges
- **Row Level Security** — Supabase RLS policies on the `profiles` table
- **Input Validation** — Pydantic schemas on all API endpoints
- **SQL Injection Protection** — SQLAlchemy ORM with parameterized queries
- **CORS** — Configured for Vercel, Render, and Railway deployment origins

---

## Synthetic Data Engine

Generates realistic merchant data with **6 labeled fraud patterns**:

1. **Stolen Payment** — New device, unusual amount, unusual location
2. **Payment Testing** — Multiple low value transactions in minutes
3. **Account Abuse** — Multiple accounts on same device/IP
4. **Fraud Ring** — 5+ customers sharing device/IP/address
5. **High-Value Anomaly** — 50–75× normal customer spend
6. **Return Abuse** — >60% return rate with fast returns

Default: 10K customers, 50K transactions, ~4% fraud rate.

```bash
# Scale up for stress testing
python -m synthetic_data.generator --customers 100000 --transactions 500000
```

---

## 📁 Repository Structure

```
SignalX/
├── backend/                    # FastAPI application
│   ├── app/
│   │   ├── api/                # 10 route modules (risk, graph, returns, etc.)
│   │   ├── auth.py             # JWT auth + RBAC dependencies
│   │   ├── config.py           # Settings via pydantic-settings
│   │   ├── database.py         # SQLAlchemy engine + session
│   │   ├── main.py             # FastAPI app, CORS, lifespan
│   │   ├── models/             # SQLAlchemy ORM models
│   │   ├── schemas/            # Pydantic request/response schemas
│   │   ├── services/           # Business logic (10 service modules)
│   │   │   ├── neo4j_service.py      # Graph intelligence
│   │   │   ├── llm_service.py        # DeepSeek LLM integration
│   │   │   ├── evidence_service.py   # Evidence dossier generation
│   │   │   ├── pdf_service.py        # PDF export (ReportLab)
│   │   │   └── supabase_service.py   # Supabase cloud integration
│   │   └── risk_engine/        # ML scoring pipeline
│   │       ├── ml_scorer.py          # LightGBM inference
│   │       ├── rule_engine.py        # 8 deterministic rules
│   │       ├── velocity_tracker.py   # In-memory sliding window
│   │       ├── fusion_engine.py      # Weighted score fusion
│   │       ├── decision_engine.py    # ALLOW/REVIEW/BLOCK decisioning
│   │       └── feature_engine.py     # 31-feature extraction
│   └── tests/                  # pytest suite
├── frontend/                   # Next.js 16 application
│   ├── src/
│   │   ├── app/                # App Router pages (12 routes)
│   │   ├── components/         # Reusable UI components
│   │   │   ├── dashboard/      # Charts (FraudTrend, RiskDistribution, etc.)
│   │   │   ├── graph/          # Force-directed graph visualization
│   │   │   ├── home/           # ArchitectureGraph, PipelineFlowchart
│   │   │   ├── layout/         # Navbar, Sidebar
│   │   │   ├── risk/           # RiskScoreCard
│   │   │   └── transactions/   # Transaction table components
│   │   ├── context/            # AuthContext (Supabase + Demo auth)
│   │   └── lib/                # API client, Supabase client, utilities
│   └── package.json
├── ml/                         # ML pipeline
│   ├── features/               # Feature engineering (31 features)
│   ├── training/               # LightGBM + LR + IsoForest training
│   ├── evaluation/             # Temporal eval + cost analysis
│   ├── explainability/         # SHAP explanations
│   └── models/                 # Saved model artifacts (.pkl)
├── synthetic_data/             # Data generation (6 fraud patterns)
├── data/                       # Generated CSV data
├── Dockerfile                  # Backend container image
├── docker-compose.yml          # Full-stack Docker Compose
├── render.yaml                 # Render deployment blueprint
├── Procfile                    # Heroku/Render process file
├── architecture.md             # Detailed system architecture
├── DEPLOYMENT.md               # Production deployment guide
└── requirements.txt            # Python dependencies
```

---

## Deployment

SignalX is designed for cloud-native deployment:

| Service         | Platform         | Purpose                 |
| :-------------- | :--------------- | :---------------------- |
| **Frontend**    | Vercel           | Next.js 16 App Router   |
| **Backend API** | Render / Railway | FastAPI + ML models     |
| **Database**    | Supabase Cloud   | PostgreSQL + Auth + RLS |
| **Graph DB**    | Neo4j AuraDB     | Fraud ring detection    |
| **LLM**         | DeepSeek API     | Evidence narratives     |

---

## Technology Stack

| Layer          | Technology                         | Purpose                               |
| :------------- | :--------------------------------- | :------------------------------------ |
| **Frontend**   | Next.js 16, React 19, TypeScript   | App Router, SSR, RSC                  |
| **UI**         | Tailwind CSS 4, Radix UI, Recharts | Styling, primitives, charts           |
| **Graphs**     | React Flow (@xyflow/react)         | Interactive architecture diagrams     |
| **Backend**    | FastAPI, Python 3.10+              | REST API server                       |
| **ML**         | LightGBM, scikit-learn, SHAP       | Fraud classification + explainability |
| **Anomaly**    | Isolation Forest                   | Unsupervised outlier detection        |
| **Database**   | SQLAlchemy + SQLite/PostgreSQL     | Data persistence (dual-mode)          |
| **Cloud DB**   | Supabase (PostgreSQL + Auth)       | Production database + authentication  |
| **Graph DB**   | Neo4j                              | Fraud ring entity linkage             |
| **LLM**        | DeepSeek API                       | Evidence narrative generation         |
| **PDF**        | ReportLab                          | Evidence dossier export               |
| **Validation** | Pydantic v2                        | Request/response schemas              |
| **Data Gen**   | NumPy, Pandas, Faker               | Synthetic fraud data                  |

---

## Testing

```bash
# Run all tests
pytest backend/tests/ -v

# Run specific test suites
pytest backend/tests/test_risk_engine.py -v
pytest backend/tests/test_features.py -v
pytest backend/tests/test_api.py -v
```

## License & Terms of Use

This project is submitted specifically for the **Razorpay Buildthon 2026**.

- **Evaluation Grant**: Granted strictly to the official judges, evaluators, mentors, and organizers of Razorpay Buildthon to clone, build, execute, and evaluate this codebase.
- **Usage Restrictions**: Unauthorized commercial use, redistribution, sublicensing, or re-submission as third-party work is strictly prohibited.
- See the full [LICENSE](LICENSE) file for complete legal terms and copyright details.

**Copyright (c) 2026 MA RIZWAN. All Rights Reserved.**
