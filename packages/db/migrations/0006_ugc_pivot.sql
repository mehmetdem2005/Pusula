-- Pusula — UGC pivot (0006)
-- Scraping bırakıldı; ilanlar artık 100% kullanıcı-üretimli.
-- ilanlar: görünürlük (public/private) + UGC yaşam döngüsü (status); "owner NULL paylaşılan havuz"
-- semantiği kaldırıldı. + public profil alanları (users) + yapılı media tablosu.

-- ── 1) ilanlar: görünürlük + durum ──────────────────────────────────────────
alter table public.ilanlar
  add column if not exists visibility text not null default 'private'
  check (visibility in ('public', 'private'));

-- status → UGC yaşam döngüsü (eski değerleri taşı, sonra constraint'i değiştir).
alter table public.ilanlar drop constraint if exists ilanlar_status_check;
update public.ilanlar set status = case status
  when 'aktif' then 'published'
  when 'pasif' then 'paused'
  when 'satildi' then 'removed'
  when 'silindi' then 'removed'
  else status end;
alter table public.ilanlar alter column status set default 'draft';
alter table public.ilanlar add constraint ilanlar_status_check
  check (status in ('draft', 'processing', 'published', 'paused', 'removed', 'rejected'));

-- Scraping kalıntıları: sahipsiz (eski scraped) satırları temizle, owner zorunlu yap,
-- kaynak/url alanlarını UGC için gevşet.
delete from public.ilanlar where owner_user_id is null;
alter table public.ilanlar alter column owner_user_id set not null;
alter table public.ilanlar alter column kaynak set default 'user';
alter table public.ilanlar alter column kaynak_id drop not null;
alter table public.ilanlar alter column ilan_url drop not null;

-- owner FK: SET NULL → CASCADE (artık NOT NULL).
alter table public.ilanlar drop constraint if exists ilanlar_owner_user_id_fkey;
alter table public.ilanlar add constraint ilanlar_owner_user_id_fkey
  foreign key (owner_user_id) references public.users(id) on delete cascade;

-- Paylaşılan-havuz kalıntılarını kaldır.
drop index if exists public.idx_ilanlar_shared_kaynak;
drop policy if exists "ilanlar_select_shared" on public.ilanlar;

-- Yeni RLS: sahip her şey + herkes yalnız public+published.
drop policy if exists "ilanlar_owner_all" on public.ilanlar;
create policy "ilanlar_owner_all" on public.ilanlar
  for all to authenticated
  using (auth.uid() = owner_user_id)
  with check (auth.uid() = owner_user_id);

drop policy if exists "ilanlar_select_public" on public.ilanlar;
create policy "ilanlar_select_public" on public.ilanlar
  for select to authenticated, anon
  using (visibility = 'public' and status = 'published');

create index if not exists idx_ilanlar_feed
  on public.ilanlar (created_at desc)
  where visibility = 'public' and status = 'published';

-- ── 2) public profil alanları (users) ────────────────────────────────────────
-- (Public profil okuması API'den service-role + güvenli kolon seçimiyle yapılır → PII sızmaz.)
alter table public.users add column if not exists handle text unique;
alter table public.users add column if not exists bio text;
alter table public.users add column if not exists avatar_url text;
alter table public.users add column if not exists is_public boolean not null default true;

-- ── 3) media (yapılı medya satırları; foto_urlleri geriye-uyum için kalır) ────
create table if not exists public.media (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.ilanlar(id) on delete cascade,
  owner_user_id uuid not null references public.users(id) on delete cascade,
  type text not null check (type in ('photo', 'video')),
  bucket text not null,
  storage_path text not null,
  poster_path text,
  width int,
  height int,
  duration_ms int,
  bytes bigint,
  ordinal int not null default 0,
  is_ai_generated boolean not null default false,
  processing_status text not null default 'uploading'
    check (processing_status in ('uploading', 'ready', 'processing', 'failed')),
  created_at timestamptz not null default now()
);
create index if not exists idx_media_listing on public.media (listing_id, ordinal);

alter table public.media enable row level security;
drop policy if exists "media_owner_all" on public.media;
create policy "media_owner_all" on public.media
  for all to authenticated
  using (auth.uid() = owner_user_id)
  with check (auth.uid() = owner_user_id);
drop policy if exists "media_select_public" on public.media;
create policy "media_select_public" on public.media
  for select to authenticated, anon
  using (exists (
    select 1 from public.ilanlar l
    where l.id = listing_id and l.visibility = 'public' and l.status = 'published'
  ));
