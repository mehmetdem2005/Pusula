-- ============================================================================
-- Kavra — Faz 12 Sprint 5: Yayın Hazırlık
-- Migration: 0013_launch_infrastructure
-- ============================================================================

-- ---- USER DEVICES (multi-device sync, push notification tokens) ----
create table if not exists public.user_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,

  device_id text not null,                     -- Expo Constants.deviceId
  device_name text,                             -- "Ahmet'in iPhone 15"
  platform text not null check (platform in ('ios', 'android', 'web')),
  app_version text,
  os_version text,

  push_token text,                              -- Expo Push Token "ExponentPushToken[xxx]"
  push_enabled boolean default true,

  last_active_at timestamptz default now(),
  created_at timestamptz default now(),

  unique(user_id, device_id)
);

create index if not exists idx_devices_user on user_devices(user_id, last_active_at desc);
create index if not exists idx_devices_push on user_devices(push_enabled) where push_enabled = true;

alter table public.user_devices enable row level security;
create policy "users_own_devices" on user_devices for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---- AI CONTENT MODERATION LOG ----
create table if not exists public.moderation_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete set null,

  content_type text not null,                   -- 'image', 'text', 'audio_transcript'
  content_hash text,                             -- sha256 (image dedup)

  -- Verdict
  verdict text not null check (verdict in ('clean', 'flagged', 'blocked')),
  categories jsonb default '[]'::jsonb,         -- ['nsfw', 'violence', 'hate']
  confidence numeric(4,3),                      -- 0.000-1.000

  -- Action taken
  action text,                                  -- 'show', 'blur', 'hide', 'ban_user'
  reviewed_by_admin boolean default false,
  admin_override text,

  source_table text,                             -- 'generated_content', 'reflections'
  source_id uuid,

  created_at timestamptz default now()
);

create index if not exists idx_moderation_user on moderation_log(user_id, created_at desc);
create index if not exists idx_moderation_flagged on moderation_log(verdict) where verdict in ('flagged', 'blocked');

alter table public.moderation_log enable row level security;
create policy "users_read_own_moderation" on moderation_log for select
  using (auth.uid() = user_id);
create policy "service_writes_moderation" on moderation_log for insert
  with check (auth.role() = 'service_role');
create policy "admins_manage_moderation" on moderation_log for all
  using (
    exists (
      select 1 from profiles p where p.id = auth.uid() and p.role in ('admin', 'super_admin')
    )
  );

-- ---- USER FEEDBACK (in-app feedback collection) ----
create table if not exists public.user_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete set null,

  feedback_type text not null check (feedback_type in (
    'bug', 'feature_request', 'rating', 'general', 'crash'
  )),
  rating int check (rating >= 1 and rating <= 5),
  message text not null,

  app_version text,
  platform text,
  device_id text,

  -- Triage
  status text default 'new' check (status in ('new', 'triaged', 'in_progress', 'resolved', 'dismissed')),
  admin_notes text,

  created_at timestamptz default now()
);

create index if not exists idx_feedback_status on user_feedback(status, created_at desc);

alter table public.user_feedback enable row level security;
create policy "users_create_feedback" on user_feedback for insert
  with check (auth.uid() = user_id);
create policy "users_read_own_feedback" on user_feedback for select
  using (auth.uid() = user_id);
create policy "admins_manage_feedback" on user_feedback for all
  using (
    exists (
      select 1 from profiles p where p.id = auth.uid() and p.role in ('admin', 'super_admin')
    )
  );

-- ---- APP STORE REVIEWS PROMPT (when to ask) ----
create table if not exists public.review_prompt_state (
  user_id uuid primary key references profiles(id) on delete cascade,

  has_reviewed boolean default false,
  prompt_count int default 0,
  last_prompted_at timestamptz,
  declined_at timestamptz,

  -- Yayın günü ilk versiyonda gösterilmez
  first_eligible_at timestamptz,

  updated_at timestamptz default now()
);

alter table public.review_prompt_state enable row level security;
create policy "users_own_review_state" on review_prompt_state for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---- ANNOUNCEMENTS (in-app notification banner) ----
create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),

  title text not null,
  message text not null,
  cta_label text,                               -- "Şimdi Dene"
  cta_url text,                                 -- internal route or external

  level text default 'info' check (level in ('info', 'feature', 'maintenance', 'critical')),

  -- Targeting
  target_users text default 'all' check (target_users in ('all', 'free', 'pro', 'admin')),
  target_platforms text[] default array['ios', 'android', 'web'],
  target_app_versions jsonb,                    -- { min: '1.0.0', max: '2.0.0' }

  -- Lifecycle
  is_active boolean default true,
  starts_at timestamptz default now(),
  ends_at timestamptz,

  created_at timestamptz default now(),
  created_by uuid references profiles(id)
);

create index if not exists idx_announcements_active on announcements(is_active, starts_at, ends_at);

alter table public.announcements enable row level security;
create policy "anyone_reads_active" on announcements for select
  using (
    is_active = true
    and starts_at <= now()
    and (ends_at is null or ends_at >= now())
  );
create policy "admins_manage_announcements" on announcements for all
  using (
    exists (
      select 1 from profiles p where p.id = auth.uid() and p.role in ('admin', 'super_admin')
    )
  );

-- ---- USER ANNOUNCEMENT DISMISSALS ----
create table if not exists public.user_announcement_state (
  user_id uuid not null references profiles(id) on delete cascade,
  announcement_id uuid not null references announcements(id) on delete cascade,

  dismissed_at timestamptz default now(),
  clicked boolean default false,

  primary key (user_id, announcement_id)
);

alter table public.user_announcement_state enable row level security;
create policy "users_own_announcement_state" on user_announcement_state for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---- ACCOUNT DELETION REQUESTS (Apple/Google requirement) ----
create table if not exists public.account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references profiles(id) on delete cascade,

  reason text,
  scheduled_for timestamptz default (now() + interval '14 days'),

  -- Recovery window (kullanıcı vazgeçerse)
  cancelled_at timestamptz,
  completed_at timestamptz,

  status text default 'pending' check (status in ('pending', 'cancelled', 'completed', 'failed')),

  created_at timestamptz default now()
);

create index if not exists idx_deletion_pending on account_deletion_requests(status, scheduled_for) where status = 'pending';

alter table public.account_deletion_requests enable row level security;
create policy "users_own_deletion" on account_deletion_requests for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---- HELPER: Active devices count for a user ----
create or replace function public.user_active_devices(p_user_id uuid, p_within_days int default 30)
returns int
language sql
stable
as $$
  select count(*)::int
  from user_devices
  where user_id = p_user_id
    and last_active_at >= now() - (p_within_days || ' days')::interval;
$$;

-- ============================================================================
-- USER_ENTITLEMENTS: view → table'a migrate (mobile in-app purchase için)
-- ============================================================================

-- Eski view'ı kaldır
drop view if exists public.user_entitlements cascade;

-- Tablo olarak yeniden yarat
create table if not exists public.user_entitlements (
  user_id uuid primary key references profiles(id) on delete cascade,

  tier text default 'free',
  is_pro boolean default false,
  valid_until timestamptz,

  -- Source: hangi store'dan
  source text check (source in ('stripe', 'app_store', 'play_store', 'revenuecat', 'promotional', 'admin_grant')),
  external_subscription_id text,                 -- transaction id

  metadata jsonb default '{}'::jsonb,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_entitlements_pro on user_entitlements(is_pro, valid_until);
create index if not exists idx_entitlements_external on user_entitlements(external_subscription_id);

alter table public.user_entitlements enable row level security;
create policy "users_read_own_entitlement" on user_entitlements for select
  using (auth.uid() = user_id);
create policy "service_writes_entitlements" on user_entitlements for all
  using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

-- Mevcut Stripe Pro user'ları için seed (varsa premium subscription'lardan)
insert into user_entitlements (user_id, tier, is_pro, valid_until, source)
select
  user_id,
  'pro' as tier,
  true as is_pro,
  current_period_end as valid_until,
  'stripe' as source
from premium_subscriptions
where status = 'active'
on conflict (user_id) do nothing;

-- ============================================================================
-- SUBSCRIPTION EVENTS (audit log)
-- ============================================================================

create table if not exists public.subscription_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete set null,

  event_type text not null,                     -- INITIAL_PURCHASE, RENEWAL, etc.
  provider text not null,                        -- stripe, revenuecat
  external_id text,                              -- webhook event id

  product_id text,
  store text,                                    -- APP_STORE, PLAY_STORE, STRIPE

  metadata jsonb default '{}'::jsonb,

  created_at timestamptz default now()
);

create index if not exists idx_sub_events_user on subscription_events(user_id, created_at desc);
create index if not exists idx_sub_events_type on subscription_events(event_type, created_at desc);

alter table public.subscription_events enable row level security;
create policy "users_read_own_sub_events" on subscription_events for select
  using (auth.uid() = user_id);
create policy "service_writes_sub_events" on subscription_events for insert
  with check (auth.role() = 'service_role');
