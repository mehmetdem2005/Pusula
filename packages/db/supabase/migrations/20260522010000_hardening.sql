-- Pusula — Hardening migration
-- Tarih: 22 Mayıs 2026
--
-- Eklenenler:
--  1. updated_at otomatik güncelleme trigger'ı (users, ilanlar, subscriptions)
--  2. mahalle_enrichment için RLS + authenticated SELECT policy
--  3. Eksik index'ler (chat_threads, usage_events, ilanlar.parse_tarihi, scoring_results)
--  4. Trigram (pg_trgm) — mahalle fuzzy arama için
--  5. usage_events üzerinde günlük particion (V0.2'de aktif)
--
-- Run: supabase db push

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ────────────────────────────────────────────────────────
-- 1. updated_at trigger fonksiyonu + tetikleyiciler
-- ────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename IN ('users', 'ilanlar', 'subscriptions')
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_updated_at ON public.%I;
       CREATE TRIGGER trg_updated_at BEFORE UPDATE ON public.%I
       FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();',
      r.tablename, r.tablename);
  END LOOP;
END $$;

-- ────────────────────────────────────────────────────────
-- 2. mahalle_enrichment RLS — authenticated read-only
-- ────────────────────────────────────────────────────────

ALTER TABLE public.mahalle_enrichment ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mahalle_select_authenticated" ON public.mahalle_enrichment;
CREATE POLICY "mahalle_select_authenticated"
  ON public.mahalle_enrichment
  FOR SELECT
  TO authenticated
  USING (true);

-- platform_provider_keys de RLS olmalı (sadece admin)
ALTER TABLE public.platform_provider_keys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "platform_keys_admin_only" ON public.platform_provider_keys;
CREATE POLICY "platform_keys_admin_only"
  ON public.platform_provider_keys
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

-- subscription_plans her authenticated kullanıcı görebilir
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "subscription_plans_select_all" ON public.subscription_plans;
CREATE POLICY "subscription_plans_select_all"
  ON public.subscription_plans
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- ────────────────────────────────────────────────────────
-- 3. Eksik index'ler
-- ────────────────────────────────────────────────────────

-- chat_threads (kullanıcı bazlı listeleme)
CREATE INDEX IF NOT EXISTS idx_chat_threads_user_created
  ON public.chat_threads(user_id, created_at DESC);

-- usage_events sıralı sorgu (provider + zaman)
CREATE INDEX IF NOT EXISTS idx_usage_events_user_provider_time
  ON public.usage_events(user_id, provider, created_at DESC);

-- ilanlar comparable query — partial index aktif + zaman
CREATE INDEX IF NOT EXISTS idx_ilanlar_aktif_parse_tarihi
  ON public.ilanlar(parse_tarihi DESC)
  WHERE status = 'aktif';

-- scoring_results analytics (formül versiyonu × etiket dağılımı)
CREATE INDEX IF NOT EXISTS idx_scoring_results_formul_etiket
  ON public.scoring_results(formul_versiyonu, etiket);

-- mahalle fuzzy arama
CREATE INDEX IF NOT EXISTS idx_ilanlar_mahalle_trgm
  ON public.ilanlar USING gin (mahalle gin_trgm_ops);

-- ────────────────────────────────────────────────────────
-- 4. Subscription FK / index'leri
-- ────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_subscriptions_status
  ON public.subscriptions(status)
  WHERE status IN ('trialing', 'active');

CREATE INDEX IF NOT EXISTS idx_subscriptions_period_end
  ON public.subscriptions(current_period_end)
  WHERE status = 'active';
