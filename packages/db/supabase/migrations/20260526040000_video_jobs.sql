-- Pusula — AI video üretimi iş kuyruğu (0010)
-- Sahip bir ilan için "AI sanal tur" videosu ister; iş asenkron işlenir.
-- Sağlayıcı soyut (mock/veo/runway/kling); maliyet/adet kapağı owner+gün penceresiyle.
-- API servis-rolü yazar; RLS derinlemesine-savunma (sahip okur).

create table if not exists public.video_jobs (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.ilanlar(id) on delete cascade,
  owner_user_id uuid not null references public.users(id) on delete cascade,
  status text not null default 'queued'
    check (status in ('queued', 'running', 'succeeded', 'failed', 'canceled')),
  provider text not null default 'mock',
  provider_job_id text,
  prompt text,
  template_id text,
  input_media_ids uuid[] not null default '{}',
  output_media_id uuid references public.media(id) on delete set null,
  cost_usd numeric(10, 4) not null default 0,
  error text,
  attempts int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_video_jobs_owner_time on public.video_jobs (owner_user_id, created_at desc);
create index if not exists idx_video_jobs_status_time on public.video_jobs (status, created_at);
create index if not exists idx_video_jobs_listing on public.video_jobs (listing_id);

alter table public.video_jobs enable row level security;
drop policy if exists "video_jobs_owner_all" on public.video_jobs;
create policy "video_jobs_owner_all" on public.video_jobs
  for all to authenticated using (auth.uid() = owner_user_id) with check (auth.uid() = owner_user_id);
