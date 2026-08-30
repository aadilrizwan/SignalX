-- SignalX — Supabase Database & Storage Setup SQL

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector"; -- pgvector for semantic evidence search

-- 2. Create Storage Bucket for Dispute Evidence Dossiers
INSERT INTO storage.buckets (id, name, public)
VALUES ('evidence-dossiers', 'evidence-dossiers', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Security Policy (Allow public reads for dispute PDFs, authenticated writes)
CREATE POLICY "Public Read Dossiers" ON storage.objects
FOR SELECT USING (bucket_id = 'evidence-dossiers');

CREATE POLICY "Allow Upload Dossiers" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'evidence-dossiers');

-- 3. Merchants & Organizations Table
CREATE TABLE IF NOT EXISTS public.merchants (
    id TEXT PRIMARY KEY DEFAULT ('mch_' || substr(md5(random()::text), 1, 12)),
    name TEXT NOT NULL,
    api_key_hash TEXT,
    plan TEXT DEFAULT 'ENTERPRISE',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Transactions Table (Real-Time scoring events)
CREATE TABLE IF NOT EXISTS public.transactions (
    id TEXT PRIMARY KEY,
    merchant_id TEXT REFERENCES public.merchants(id) ON DELETE SET NULL,
    customer_id TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    payment_method TEXT NOT NULL,
    device_id TEXT,
    ip_address TEXT,
    billing_country TEXT,
    shipping_country TEXT,
    risk_score NUMERIC(5, 4) NOT NULL,
    risk_level TEXT NOT NULL,
    decision TEXT NOT NULL,
    is_fraud BOOLEAN DEFAULT FALSE,
    fraud_pattern TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for velocity & search
CREATE INDEX IF NOT EXISTS idx_txn_customer ON public.transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_txn_device ON public.transactions(device_id);
CREATE INDEX IF NOT EXISTS idx_txn_ip ON public.transactions(ip_address);
CREATE INDEX IF NOT EXISTS idx_txn_created_at ON public.transactions(created_at DESC);

-- 5. Chargebacks & Disputes Table
CREATE TABLE IF NOT EXISTS public.chargebacks (
    id TEXT PRIMARY KEY DEFAULT ('cb_' || substr(md5(random()::text), 1, 12)),
    transaction_id TEXT REFERENCES public.transactions(id) ON DELETE CASCADE,
    customer_id TEXT NOT NULL,
    disputed_amount NUMERIC(12, 2) NOT NULL,
    dispute_reason TEXT NOT NULL,
    target_scheme TEXT DEFAULT 'VISA_VROL',
    status TEXT DEFAULT 'NEEDS_RESPONSE',
    win_probability NUMERIC(5, 4) DEFAULT 0.50,
    evidence_package_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Returns & Abuse Log Table
CREATE TABLE IF NOT EXISTS public.returns (
    id TEXT PRIMARY KEY DEFAULT ('ret_' || substr(md5(random()::text), 1, 12)),
    customer_id TEXT NOT NULL,
    refund_amount NUMERIC(12, 2) NOT NULL,
    days_after_purchase INTEGER NOT NULL,
    reason TEXT NOT NULL,
    abuse_risk_score NUMERIC(5, 4) NOT NULL,
    risk_tier TEXT NOT NULL,
    decision TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Review Queue Cases Table
CREATE TABLE IF NOT EXISTS public.reviews (
    id TEXT PRIMARY KEY DEFAULT ('case_' || substr(md5(random()::text), 1, 12)),
    transaction_id TEXT REFERENCES public.transactions(id) ON DELETE CASCADE,
    customer_id TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    risk_score NUMERIC(5, 4) NOT NULL,
    priority TEXT DEFAULT 'HIGH',
    status TEXT DEFAULT 'PENDING',
    assigned_to TEXT,
    sla_expires_at TIMESTAMPTZ,
    decision_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. User Profiles & Role-Based Access Control (RBAC)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    role TEXT DEFAULT 'ANALYST', -- 'ADMIN' or 'ANALYST'
    merchant_id TEXT REFERENCES public.merchants(id) ON DELETE SET NULL,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policy for Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public Profiles Read" ON public.profiles
FOR SELECT USING (true);

CREATE POLICY "Users Update Own Profile" ON public.profiles
FOR UPDATE USING (auth.uid() = id);

-- 9. Enable Supabase Realtime Replication on Live Event Tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reviews;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chargebacks;

-- 10. Insert Sample Default Merchant
INSERT INTO public.merchants (id, name, plan)
VALUES ('mch_signalx_demo', 'SignalX Global Merchant', 'ENTERPRISE')
ON CONFLICT (id) DO NOTHING;

COMMENT ON TABLE public.transactions IS 'Real-time transaction scoring log with Supabase Realtime broadcast enabled.';
COMMENT ON TABLE public.profiles IS 'User profiles with role-based access control (ADMIN / ANALYST).';
