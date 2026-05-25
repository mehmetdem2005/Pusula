-- Pusula — engagement + ML cache (0008)
-- Feed etkileşimi (izleme/beğeni/kaydet…) + popülerlik/affinity cache (ML için).
-- API servis-rolü yazar; RLS derinlemesine-savunma.

-- ── engagement_events (append-only, yüksek hacim) ───────────────────────────
create table if not exists public.engagement_events (
  id bigserial primary key,
  user_id uuid references public.users(id) on delete cascade,
  listing_id uuid not null references public.ilanlar(id) on delete cascade,
  event_type text not null check (event_type in
    ('view', 'dwell', 'like', 'unlike', 'rewatch', 'save', 'skip', 'share', 'report')),
  dwell_ms int,
  position int,
  created_at timestamptz not null default now()
);
create index if not exists idx_engagement_user_time on public.engagement_events (user_id, created_at desc);
create index if not exists idx_engagement_listing_time on public.engagement_events (listing_id, created_at desc);

alter table public.engagement_events enable row level security;
drop policy if exists "events_insert_own" on public.engagement_events;
create policy "events_insert_own" on public.engagement_events
  for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "events_select_own" on public.engagement_events;
create policy "events_select_own" on public.engagement_events
  for select to authenticated using (auth.uid() = user_id);

-- ── likes (idempotent beğeni durumu + hızlı sayım) ──────────────────────────
create table if not exists public.likes (
  user_id uuid not null references public.users(id) on delete cascade,
  listing_id uuid not null references public.ilanlar(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);
create index if not exists idx_likes_listing on public.likes (listing_id);

alter table public.likes enable row level security;
drop policy if exists "likes_owner_all" on public.likes;
create policy "likes_owner_all" on public.likes
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── listing_stats (popülerlik cache; worker tazeler — Faz 4) ─────────────────
create table if not exists public.listing_stats (
  listing_id uuid primary key references public.ilanlar(id) on delete cascade,
  view_count bigint not null default 0,
  like_count bigint not null default 0,
  save_count bigint not null default 0,
  avg_dwell_ms int,
  completion_rate numeric,
  score numeric,
  last_engaged_at timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.listing_stats enable row level security;
drop policy if exists "listing_stats_select_all" on public.listing_stats;
create policy "listing_stats_select_all" on public.listing_stats
  for select to authenticated, anon using (true);

-- ── user_affinity (per-user feature store; worker doldurur — Faz 4) ──────────
create table if not exists public.user_affinity (
  user_id uuid not null references public.users(id) on delete cascade,
  dimension text not null,
  key text not null,
  weight numeric not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, dimension, key)
);
alter table public.user_affinity enable row level security;
drop policy if exists "user_affinity_own" on public.user_affinity;
create policy "user_affinity_own" on public.user_affinity
  for select to authenticated using (auth.uid() = user_id);
