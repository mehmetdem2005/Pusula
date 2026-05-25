-- Pusula — kullanıcı listeleri + favoriler (0005)
-- lists: kullanıcının listeleri; her kullanıcıda silinemez bir varsayılan "Favorilerim".
-- list_items: liste ↔ ilan bağı (UNIQUE). Idempotent / fresh-setup için güvenli.

create table if not exists public.lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

-- Her kullanıcıda en fazla bir varsayılan (favori) liste.
create unique index if not exists idx_lists_one_default
  on public.lists (user_id) where is_default;
create index if not exists idx_lists_user on public.lists (user_id);

create table if not exists public.list_items (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.lists(id) on delete cascade,
  ilan_id uuid not null references public.ilanlar(id) on delete cascade,
  added_at timestamptz not null default now(),
  unique (list_id, ilan_id)
);
create index if not exists idx_list_items_list on public.list_items (list_id);
create index if not exists idx_list_items_ilan on public.list_items (ilan_id);

-- RLS (servis rolü API bypass eder; yine de derinlemesine savunma).
alter table public.lists enable row level security;
alter table public.list_items enable row level security;

drop policy if exists "lists_owner_all" on public.lists;
create policy "lists_owner_all" on public.lists
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "list_items_owner_all" on public.list_items;
create policy "list_items_owner_all" on public.list_items
  for all to authenticated
  using (exists (select 1 from public.lists l where l.id = list_id and l.user_id = auth.uid()))
  with check (exists (select 1 from public.lists l where l.id = list_id and l.user_id = auth.uid()));

-- Varsayılan (favori) listeyi DB seviyesinde de silinemez yap.
create or replace function public.prevent_default_list_delete()
returns trigger language plpgsql as $$
begin
  if old.is_default then
    raise exception 'Varsayılan liste silinemez';
  end if;
  return old;
end $$;

drop trigger if exists trg_prevent_default_list_delete on public.lists;
create trigger trg_prevent_default_list_delete
  before delete on public.lists
  for each row execute function public.prevent_default_list_delete();
