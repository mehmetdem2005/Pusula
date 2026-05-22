-- Pusula — Auth foundation migration
-- Tarih: 22 Mayıs 2026
--
-- Eklenenler:
--  1. auth.users → public.users profil oluşturma trigger'ı (handle_new_user)
--     + mevcut auth kullanıcıları için backfill
--  2. users.email nullable (telefon-only kullanıcılar) + users.phone kolonu
--  3. users INSERT policy (trigger SECURITY DEFINER yazar; kullanıcı kendi profilini güncelleyebilir)
--  4. auth_audit_log tablosu (giriş/güvenlik olayları) + RLS
--
-- Run: supabase db push  (veya Management API ile uygulanır)

-- ────────────────────────────────────────────────────────
-- 1. users tablosu: email nullable + phone
-- ────────────────────────────────────────────────────────
ALTER TABLE public.users ALTER COLUMN email DROP NOT NULL;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_phone ON public.users(phone) WHERE phone IS NOT NULL;

-- ────────────────────────────────────────────────────────
-- 2. handle_new_user — auth.users insert'inde public.users profili aç
-- ────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, phone, display_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.phone,
    COALESCE(
      NEW.raw_user_meta_data->>'display_name',
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name'
    ),
    COALESCE(NEW.raw_user_meta_data->>'role', 'individual')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Mevcut auth kullanıcıları için backfill (profili olmayanlar)
INSERT INTO public.users (id, email, phone, display_name, role)
SELECT
  u.id, u.email, u.phone,
  COALESCE(
    u.raw_user_meta_data->>'display_name',
    u.raw_user_meta_data->>'full_name',
    u.raw_user_meta_data->>'name'
  ),
  COALESCE(u.raw_user_meta_data->>'role', 'individual')
FROM auth.users u
ON CONFLICT (id) DO NOTHING;

-- ────────────────────────────────────────────────────────
-- 3. users self-update / insert policy (RLS zaten açık)
-- ────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "users_update_own" ON public.users;
CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "users_insert_own" ON public.users;
CREATE POLICY "users_insert_own" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- ────────────────────────────────────────────────────────
-- 4. auth_audit_log — giriş/güvenlik olayları (AAA: accounting)
-- ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.auth_audit_log (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  event TEXT NOT NULL,
  provider TEXT,
  user_agent TEXT,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_auth_audit_user_time ON public.auth_audit_log(user_id, created_at DESC);

ALTER TABLE public.auth_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_select_own" ON public.auth_audit_log;
CREATE POLICY "audit_select_own" ON public.auth_audit_log
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "audit_insert_own" ON public.auth_audit_log;
CREATE POLICY "audit_insert_own" ON public.auth_audit_log
  FOR INSERT WITH CHECK (auth.uid() = user_id);
