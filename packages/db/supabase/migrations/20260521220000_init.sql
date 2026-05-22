-- Pusula — Initial schema
-- Supabase / PostgreSQL 16 + pgvector
-- Run with: supabase migration up

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS vector;

-- ────────────────────────────────────────────────────────
-- Kullanıcılar & Auth
-- ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  role TEXT NOT NULL DEFAULT 'individual' CHECK (role IN ('individual', 'agent', 'dealer', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_email ON public.users(email);

-- BYOK provider key'leri (client-side AES-GCM encrypted blob)
CREATE TABLE IF NOT EXISTS public.user_provider_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('groq', 'gemini', 'deepseek', 'anthropic', 'openai', 'openrouter')),
  /** AES-GCM 256 ciphertext, base64 encoded. Server zero-knowledge. */
  encrypted_key TEXT NOT NULL,
  iv TEXT NOT NULL,
  key_label TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ,
  UNIQUE (user_id, provider, key_label)
);

CREATE INDEX idx_user_provider_keys_user ON public.user_provider_keys(user_id);

-- ────────────────────────────────────────────────────────
-- İlanlar
-- ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.ilanlar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  kategori TEXT NOT NULL CHECK (kategori IN ('konut', 'arsa', 'tarla', 'oto', 'ofis')),
  kaynak TEXT NOT NULL,
  kaynak_id TEXT,
  ilan_url TEXT NOT NULL,
  baslik TEXT NOT NULL,
  aciklama TEXT,
  fiyat_tl BIGINT NOT NULL,
  il TEXT,
  ilce TEXT,
  mahalle TEXT,
  enlem DOUBLE PRECISION,
  boylam DOUBLE PRECISION,
  net_m2 INT,
  brut_m2 INT,
  oda_sayisi TEXT,
  bina_yasi INT,
  bulundugu_kat TEXT,
  ozellikler JSONB NOT NULL DEFAULT '{}'::jsonb,
  foto_urlleri TEXT[] NOT NULL DEFAULT '{}',
  parse_versiyonu TEXT,
  parse_tarihi TIMESTAMPTZ,
  ilan_tarihi TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'aktif' CHECK (status IN ('aktif', 'pasif', 'satildi', 'silindi')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (kaynak, kaynak_id)
);

CREATE INDEX idx_ilanlar_owner ON public.ilanlar(owner_user_id);
CREATE INDEX idx_ilanlar_kategori_il_ilce ON public.ilanlar(kategori, il, ilce);
CREATE INDEX idx_ilanlar_mahalle ON public.ilanlar(mahalle);
CREATE INDEX idx_ilanlar_fiyat ON public.ilanlar(fiyat_tl);
CREATE INDEX idx_ilanlar_created ON public.ilanlar(created_at DESC);

-- Skor sonuçları (her ilan + her formül versiyonu için)
CREATE TABLE IF NOT EXISTS public.scoring_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ilan_id UUID NOT NULL REFERENCES public.ilanlar(id) ON DELETE CASCADE,
  formul_versiyonu TEXT NOT NULL,
  toplam NUMERIC(5, 2) NOT NULL,
  etiket TEXT NOT NULL,
  bilesenler JSONB NOT NULL,
  alt_bilesenler JSONB NOT NULL,
  comparable JSONB NOT NULL,
  confidence TEXT NOT NULL,
  uyarilar TEXT[] NOT NULL DEFAULT '{}',
  hesap_zamani TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_scoring_results_ilan ON public.scoring_results(ilan_id, hesap_zamani DESC);

-- ────────────────────────────────────────────────────────
-- Chat geçmişi
-- ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.chat_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  ilan_id UUID REFERENCES public.ilanlar(id) ON DELETE SET NULL,
  title TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES public.chat_threads(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('system', 'user', 'assistant', 'tool')),
  content TEXT NOT NULL,
  task_type TEXT,
  provider TEXT,
  model TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_chat_messages_thread ON public.chat_messages(thread_id, created_at);

-- ────────────────────────────────────────────────────────
-- Usage / Quota tracking
-- ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.usage_events (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  task_type TEXT NOT NULL,
  input_tokens INT NOT NULL DEFAULT 0,
  output_tokens INT NOT NULL DEFAULT 0,
  cost_usd NUMERIC(10, 6) NOT NULL DEFAULT 0,
  latency_ms INT,
  key_source TEXT NOT NULL DEFAULT 'user_byok' CHECK (key_source IN ('user_byok', 'platform_pool')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_usage_events_user_time ON public.usage_events(user_id, created_at DESC);

-- ────────────────────────────────────────────────────────
-- V2 Subscription & Billing (V1'de boş şema hazır)
-- ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  billing_period TEXT NOT NULL CHECK (billing_period IN ('weekly', 'monthly', 'yearly')),
  price_try NUMERIC(10, 2) NOT NULL,
  monthly_ilan_quota INT,
  monthly_photo_ai_quota INT,
  allowed_providers TEXT[],
  allowed_models TEXT[],
  features JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  plan_id TEXT REFERENCES public.subscription_plans(id),
  status TEXT NOT NULL CHECK (status IN ('trialing', 'active', 'past_due', 'canceled', 'unpaid')),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  stripe_subscription_id TEXT UNIQUE,
  stripe_customer_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_subscriptions_user ON public.subscriptions(user_id);

CREATE TABLE IF NOT EXISTS public.platform_provider_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  vault_secret_id TEXT NOT NULL,
  monthly_token_cap BIGINT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.quota_usage (
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  ilan_count INT NOT NULL DEFAULT 0,
  photo_ai_count INT NOT NULL DEFAULT 0,
  token_count BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, period_start)
);

-- ────────────────────────────────────────────────────────
-- Mahalle/bölge bağlam (TÜİK + AFAD enrichment cache)
-- ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.mahalle_enrichment (
  /** İl-İlçe-Mahalle string normalize edilmiş key */
  mahalle_key TEXT PRIMARY KEY,
  il TEXT NOT NULL,
  ilce TEXT NOT NULL,
  mahalle TEXT NOT NULL,
  tuik_gelir_quintile SMALLINT,
  tuik_yas_dagilimi JSONB,
  afad_pga_band SMALLINT CHECK (afad_pga_band BETWEEN 1 AND 4),
  fay_mesafe_m INT,
  son_12ay_fiyat_ivmesi_yuzde NUMERIC(6, 2),
  son_guncelleme TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ────────────────────────────────────────────────────────
-- Row-Level Security (RLS) — Supabase varsayılan
-- ────────────────────────────────────────────────────────

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_provider_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ilanlar ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scoring_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quota_usage ENABLE ROW LEVEL SECURITY;

-- Kullanıcı kendi kayıtlarını görür
CREATE POLICY "users_select_own" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "user_provider_keys_select_own" ON public.user_provider_keys
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "ilanlar_select_own" ON public.ilanlar
  FOR ALL USING (auth.uid() = owner_user_id);

CREATE POLICY "scoring_results_select_via_ilan" ON public.scoring_results
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.ilanlar i WHERE i.id = scoring_results.ilan_id AND i.owner_user_id = auth.uid())
  );

CREATE POLICY "chat_threads_select_own" ON public.chat_threads
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "chat_messages_select_own" ON public.chat_messages
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.chat_threads t WHERE t.id = chat_messages.thread_id AND t.user_id = auth.uid())
  );

CREATE POLICY "usage_events_select_own" ON public.usage_events
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "subscriptions_select_own" ON public.subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "quota_usage_select_own" ON public.quota_usage
  FOR SELECT USING (auth.uid() = user_id);
