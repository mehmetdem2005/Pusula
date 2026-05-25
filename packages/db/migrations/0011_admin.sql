-- Pusula — Admin paneli
-- Süper admin promotion + askıya alma (ban) + admin denetim günlüğü.
-- Run with: supabase migration up

-- 1) Süper admin (e-posta ile). Kayıt varsa rolünü admin yapar; yoksa API'deki
--    SUPER_ADMIN_EMAILS allowlist'i ilk girişte rolü kendiliğinden admin'e çeker.
UPDATE public.users SET role = 'admin', updated_at = now()
WHERE lower(email) = lower('mehmetdem782100@gmail.com');

-- 2) Askıya alma (ban). NULL = aktif.
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ;

-- 3) Admin denetim günlüğü (her mutasyon kaydı).
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created ON public.admin_audit_log(created_at DESC);

-- Yalnız service-role (API) erişir. RLS açık + politika yok → istemciye tamamen kapalı.
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
