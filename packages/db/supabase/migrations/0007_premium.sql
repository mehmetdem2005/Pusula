-- ============================================================================
-- Kavra — Faz 7: Premium (Subscriptions + Voice Cloning + 3D + Cron + App Lock)
-- Migration: 0007_premium
-- ============================================================================

-- ---- SUBSCRIPTIONS — Stripe ile sync ----
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references profiles(id) on delete cascade,

  -- Stripe identifiers
  stripe_customer_id text,
  stripe_subscription_id text,
  stripe_price_id text,

  -- Tier ve durum
  tier text not null default 'free' check (tier in ('free', 'pro_monthly', 'pro_yearly', 'pro_lifetime')),
  status text not null default 'active' check (status in (
    'active', 'trialing', 'past_due', 'canceled', 'incomplete', 'incomplete_expired', 'unpaid', 'paused'
  )),

  -- Dönem bilgisi
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean default false,
  canceled_at timestamptz,
  trial_end timestamptz,

  -- Lifetime kilit
  lifetime_purchased_at timestamptz,

  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_subscriptions_stripe_customer on subscriptions(stripe_customer_id);
create index if not exists idx_subscriptions_stripe_sub on subscriptions(stripe_subscription_id);

alter table public.subscriptions enable row level security;
create policy if not exists "users_read_own_subscription" on subscriptions
  for select using (auth.uid() = user_id);
-- Yazma sadece service_role'dan yapılır (webhook)

-- Her kullanıcı için default 'free' kayıt — auth trigger'la insert edilmezse manual
insert into subscriptions (user_id, tier, status)
select id, 'free', 'active' from profiles
on conflict (user_id) do nothing;

-- ---- ENTİTLEMENT VIEW — basit Pro kontrol ----
-- Mobile/worker bunu okur, gerçek "premium mi?" kararını verir
create or replace view public.user_entitlements as
select
  s.user_id,
  s.tier,
  s.status,
  case
    when s.tier = 'pro_lifetime' and s.lifetime_purchased_at is not null then true
    when s.tier in ('pro_monthly', 'pro_yearly')
      and s.status in ('active', 'trialing')
      and (s.current_period_end is null or s.current_period_end > now())
    then true
    else false
  end as is_pro,
  s.current_period_end,
  s.cancel_at_period_end
from subscriptions s;

grant select on user_entitlements to authenticated, service_role;

-- ---- IS_PRO HELPER FUNCTION ----
create or replace function public.is_pro(p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
as $$
  select coalesce(
    (select is_pro from user_entitlements where user_id = p_user_id),
    false
  );
$$;

grant execute on function public.is_pro to authenticated, service_role;

-- ---- USAGE LIMITS — Free tier sayaçları (PDF/ay, voice/ay vb) ----
-- Mevcut usage_logs'a ek olarak ay bazlı sayaçlar
create table if not exists public.usage_quotas (
  user_id uuid not null references profiles(id) on delete cascade,
  period_start date not null,                  -- ayın 1'i
  pdf_uploads int default 0,
  voice_clone_minutes_used int default 0,
  voice_clones_created int default 0,
  primary key (user_id, period_start)
);

alter table public.usage_quotas enable row level security;
create policy if not exists "users_read_own_quotas" on usage_quotas
  for select using (auth.uid() = user_id);

-- ---- VOICE CLONES — F5-TTS modeller ----
create table if not exists public.voice_clones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  name text not null,                          -- 'Babamın sesi', 'Hocamızın sesi' vb.
  description text,

  -- Audio reference
  reference_audio_path text not null,          -- Supabase storage: voice-references/<user>/<id>.wav
  reference_audio_duration_seconds numeric(5, 2),
  reference_text text,                         -- F5-TTS için reference metni

  -- Modal serverless model
  modal_function_id text,                      -- Modal function deployment ID
  status text not null default 'processing' check (status in ('processing', 'ready', 'failed')),
  error_message text,

  -- Metadata
  language text default 'tr',                  -- tr, en, de, ...
  is_default boolean default false,
  use_count int default 0,
  last_used_at timestamptz,

  created_at timestamptz default now(),
  ready_at timestamptz
);

create index if not exists idx_voice_clones_user on voice_clones(user_id, created_at desc);
create unique index if not exists idx_voice_clones_default on voice_clones(user_id) where is_default = true;

alter table public.voice_clones enable row level security;
create policy if not exists "users_own_voice_clones" on voice_clones
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---- THEMES — Tema kişiselleştirme (free=3 / pro=hepsi) ----
create table if not exists public.themes (
  id text primary key,                         -- 'indigo_amber', 'forest_dawn' vb.
  name text not null,
  description text,
  preview_emoji text,
  primary_color text not null,                 -- '#1E1B4B'
  accent_color text not null,                  -- '#F59E0B'
  background_color text not null,              -- '#FAFAFA'
  text_color text not null,                    -- '#1E1B4B'
  is_pro_only boolean default false,
  display_order int default 0,
  is_active boolean default true
);

-- Seed themes
insert into themes(id, name, description, preview_emoji, primary_color, accent_color, background_color, text_color, is_pro_only, display_order) values
  ('indigo_amber', 'Indigo Amber', 'Klasik Kavra', '🌅', '#1E1B4B', '#F59E0B', '#FAFAFA', '#1E1B4B', false, 1),
  ('mono_dark', 'Mono Dark', 'Karanlıkta odak', '🌚', '#0F172A', '#94A3B8', '#020617', '#F1F5F9', false, 2),
  ('paper', 'Paper', 'Sade ve temiz', '📄', '#1E293B', '#475569', '#FEFEFE', '#0F172A', false, 3),
  ('forest_dawn', 'Forest Dawn', 'Yeşil sakinlik', '🌲', '#064E3B', '#FBBF24', '#F0FDF4', '#064E3B', true, 4),
  ('cherry_blossom', 'Cherry Blossom', 'Pembe yaratıcılık', '🌸', '#831843', '#F472B6', '#FDF2F8', '#500724', true, 5),
  ('cosmic', 'Cosmic', 'Yıldızlı gece', '🌌', '#1E1B4B', '#A78BFA', '#0C0A1E', '#E0E7FF', true, 6),
  ('sunset', 'Sunset', 'Sıcak akşam', '🌇', '#7C2D12', '#FB923C', '#FFF7ED', '#431407', true, 7),
  ('ocean', 'Ocean', 'Derin maviler', '🌊', '#0C4A6E', '#38BDF8', '#F0F9FF', '#082F49', true, 8),
  ('matcha', 'Matcha', 'Sakin yeşil', '🍵', '#365314', '#A3E635', '#F7FEE7', '#1A2E05', true, 9),
  ('graphite', 'Graphite', 'Mat profesyonel', '✏️', '#262626', '#D4D4D4', '#F5F5F5', '#171717', true, 10)
on conflict (id) do nothing;

-- ---- APP LOCK SETTINGS — kullanıcı tercihi ----
-- user_preferences tablosuna ekle (yoksa kontrol)
do $$
begin
  if not exists (select 1 from information_schema.columns
                  where table_name = 'user_preferences' and column_name = 'app_lock_enabled') then
    alter table user_preferences add column app_lock_enabled boolean default false;
    alter table user_preferences add column app_lock_method text check (app_lock_method in ('biometric', 'pin')) default 'biometric';
    alter table user_preferences add column app_lock_timeout_seconds int default 0;  -- 0 = anında, >0 = N saniye sonra
    alter table user_preferences add column theme_id text references themes(id) default 'indigo_amber';
  end if;
end $$;

-- ---- CRON JOB LOGS — scheduler audit ----
create table if not exists public.cron_job_runs (
  id uuid primary key default gen_random_uuid(),
  job_name text not null,                      -- 'daily_review_reminder', 'weekly_report_generation' vb
  started_at timestamptz default now(),
  finished_at timestamptz,
  success boolean,
  users_processed int default 0,
  users_succeeded int default 0,
  users_failed int default 0,
  error_message text,
  metadata jsonb default '{}'::jsonb
);

create index if not exists idx_cron_runs_job on cron_job_runs(job_name, started_at desc);

-- Cron logs sadece service_role görüyor (RLS yok, public erişim yok)
alter table public.cron_job_runs enable row level security;

-- ---- USER NOTIFICATION PREFERENCES ----
do $$
begin
  if not exists (select 1 from information_schema.columns
                  where table_name = 'user_preferences' and column_name = 'notify_review_reminder') then
    alter table user_preferences add column notify_review_reminder boolean default true;
    alter table user_preferences add column notify_review_reminder_hour int default 20 check (notify_review_reminder_hour between 0 and 23);
    alter table user_preferences add column notify_weekly_report boolean default true;
    alter table user_preferences add column notify_streak_warning boolean default true;
  end if;
end $$;

-- ---- LIFETIME EARLY BIRD — ilk N kullanıcıya $99 ----
-- Bu satılan toplam lifetime sayısını takip eder
create table if not exists public.lifetime_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  stripe_payment_intent_id text unique,
  amount_paid_cents int not null,
  currency text not null default 'usd',
  early_bird_number int,                       -- 1, 2, 3... — ilk 100 için
  purchased_at timestamptz default now()
);

create index if not exists idx_lifetime_user on lifetime_purchases(user_id);

-- ---- VOICE-REFERENCES STORAGE BUCKET ----
-- Bucket'ı oluştur (idempotent)
insert into storage.buckets (id, name, public)
  values ('voice-references', 'voice-references', false)
  on conflict (id) do nothing;

-- RLS — kullanıcı sadece kendi klasörüne yazabilir/okuyabilir
create policy if not exists "voice_references_user_read" on storage.objects
  for select using (
    bucket_id = 'voice-references'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy if not exists "voice_references_user_insert" on storage.objects
  for insert with check (
    bucket_id = 'voice-references'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy if not exists "voice_references_user_delete" on storage.objects
  for delete using (
    bucket_id = 'voice-references'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
