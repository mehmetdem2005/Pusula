-- Pusula — Faz A: multi-tenant ilanlar + paylaşılan okuma RLS
-- Tarih: 23 Mayıs 2026
--
-- A1: ilanlar tekilliği (kaynak,kaynak_id) → (owner_user_id,kaynak,kaynak_id).
--     Böylece iki farklı kullanıcı aynı ilanı ingest ederse AYRI satır olur; biri diğerinin
--     kaydını ezemez/sahiplenemez (service-role RLS bypass'ında cross-tenant yazma kapanır).
--     Sahipsiz (owner NULL) scraped havuz için ayrı partial-unique ile tekillik korunur.
-- A4: scraped (owner_user_id NULL) ilanlar authenticated kullanıcı bağlamında da okunabilsin
--     (comparable havuzu RLS altında erişilebilir olsun).

-- A1 — tekillik kısıtı
ALTER TABLE public.ilanlar DROP CONSTRAINT IF EXISTS ilanlar_kaynak_kaynak_id_key;
ALTER TABLE public.ilanlar
  ADD CONSTRAINT ilanlar_owner_kaynak_key UNIQUE (owner_user_id, kaynak, kaynak_id);

-- Sahipsiz (owner NULL) havuzda (kaynak,kaynak_id) tekilliği — NULL'lar unique'te ayrı sayıldığı
-- için partial unique index ile collector dup'larını önle.
CREATE UNIQUE INDEX IF NOT EXISTS idx_ilanlar_shared_kaynak
  ON public.ilanlar (kaynak, kaynak_id)
  WHERE owner_user_id IS NULL;

-- A4 — paylaşılan okuma policy (mevcut ilanlar_select_own FOR ALL korunur; SELECT için OR'lanır)
DROP POLICY IF EXISTS "ilanlar_select_shared" ON public.ilanlar;
CREATE POLICY "ilanlar_select_shared" ON public.ilanlar
  FOR SELECT
  TO authenticated
  USING (owner_user_id IS NULL OR auth.uid() = owner_user_id);
