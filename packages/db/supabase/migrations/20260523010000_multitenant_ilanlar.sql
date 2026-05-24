-- Pusula — multi-tenant ilanlar + paylaşılan okuma RLS
-- (packages/db/migrations/0004_multitenant_ilanlar.sql ile eş, idempotent).
-- Canlı DB'ye Management API ile uygulandı; bu dosya supabase db push (fresh kurulum) içindir.

ALTER TABLE public.ilanlar DROP CONSTRAINT IF EXISTS ilanlar_kaynak_kaynak_id_key;
ALTER TABLE public.ilanlar DROP CONSTRAINT IF EXISTS ilanlar_owner_kaynak_key;
ALTER TABLE public.ilanlar
  ADD CONSTRAINT ilanlar_owner_kaynak_key UNIQUE (owner_user_id, kaynak, kaynak_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ilanlar_shared_kaynak
  ON public.ilanlar (kaynak, kaynak_id)
  WHERE owner_user_id IS NULL;

DROP POLICY IF EXISTS "ilanlar_select_shared" ON public.ilanlar;
CREATE POLICY "ilanlar_select_shared" ON public.ilanlar
  FOR SELECT
  TO authenticated
  USING (owner_user_id IS NULL OR auth.uid() = owner_user_id);
