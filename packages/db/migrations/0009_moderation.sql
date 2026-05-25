-- Pusula — moderasyon (0009): rapor + takedown (notice-and-takedown, dava-riski azaltma).

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_user_id uuid not null references public.users(id) on delete cascade,
  listing_id uuid not null references public.ilanlar(id) on delete cascade,
  media_id uuid references public.media(id) on delete set null,
  reason text not null check (reason in ('spam', 'fraud', 'copyright', 'illegal', 'personal_data', 'other')),
  detail text,
  status text not null default 'open' check (status in ('open', 'reviewing', 'actioned', 'dismissed')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolver_note text
);
create index if not exists idx_reports_status on public.reports (status, created_at desc);
create index if not exists idx_reports_listing on public.reports (listing_id);

alter table public.reports enable row level security;
drop policy if exists "reports_insert_auth" on public.reports;
create policy "reports_insert_auth" on public.reports
  for insert to authenticated with check (auth.uid() = reporter_user_id);
drop policy if exists "reports_select_own" on public.reports;
create policy "reports_select_own" on public.reports
  for select to authenticated using (auth.uid() = reporter_user_id);
-- Admin okuma/çözüm API'den servis-rolü ile (RLS bypass).

create table if not exists public.takedowns (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references public.ilanlar(id) on delete set null,
  reason text not null,
  source text not null check (source in ('report', 'dmca', 'kvkk', 'admin')),
  actor_user_id uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.takedowns enable row level security;
-- Yalnız servis-rolü (API) erişir; public policy yok.
