-- 0016_fix_missing_columns.sql
-- Kodun referans verdigi ama semada olmayan kolonlar (derin tarama bulgulari).
-- Hepsi additive ADD COLUMN — mevcut veriyi bozmaz.

-- 1) concepts: kullanici-olusturdugu kavramlar ve kavram hiyerarsisi
alter table public.concepts
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists parent_concept_id uuid references public.concepts(id) on delete set null;

create index if not exists idx_concepts_user_id on public.concepts(user_id);
create index if not exists idx_concepts_parent on public.concepts(parent_concept_id);

-- 2) messages: AI karar/teknik metadata'si (chat.ts insert ediyor)
alter table public.messages
  add column if not exists metadata jsonb default '{}'::jsonb;
