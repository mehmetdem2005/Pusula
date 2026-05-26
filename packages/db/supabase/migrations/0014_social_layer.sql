-- ============================================================================
-- Kavra — Sprint 6: Sosyal & Gamification
-- Migration: 0014_social_layer
-- ============================================================================

-- =============== USERNAMES (kullanıcı adları, public profiller için) ============
alter table public.profiles
  add column if not exists username text unique check (username ~ '^[a-z0-9_]{3,20}$'),
  add column if not exists bio text,
  add column if not exists avatar_url text,
  add column if not exists is_public boolean default false,
  add column if not exists banner_color text default '#1E1B4B',
  add column if not exists pronouns text;

create index if not exists idx_profiles_username on profiles(username) where username is not null;
create index if not exists idx_profiles_public on profiles(is_public) where is_public = true;

-- ============== FOLLOWS (sosyal grafik) ===========
create table if not exists public.follows (
  follower_id uuid not null references profiles(id) on delete cascade,
  following_id uuid not null references profiles(id) on delete cascade,

  created_at timestamptz default now(),

  primary key (follower_id, following_id),
  check (follower_id != following_id)
);

create index if not exists idx_follows_following on follows(following_id);
create index if not exists idx_follows_follower on follows(follower_id);

alter table public.follows enable row level security;
create policy "anyone_reads_follows" on follows for select using (true);
create policy "users_create_own_follows" on follows for insert
  with check (auth.uid() = follower_id);
create policy "users_delete_own_follows" on follows for delete
  using (auth.uid() = follower_id);

-- ============== NOTEBOOK SHARING ===========
alter table public.notebooks
  add column if not exists is_public boolean default false,
  add column if not exists public_slug text unique,                -- /n/abc123
  add column if not exists view_count int default 0,
  add column if not exists save_count int default 0,
  add column if not exists shared_at timestamptz,
  add column if not exists allow_clone boolean default true,
  add column if not exists category text;                          -- 'biology', 'history', 'turkish', vb.

create index if not exists idx_notebooks_public on notebooks(is_public, shared_at desc) where is_public = true;
create index if not exists idx_notebooks_slug on notebooks(public_slug) where public_slug is not null;
create index if not exists idx_notebooks_category on notebooks(category, is_public) where is_public = true;

-- Slug generator helper
create or replace function public.generate_notebook_slug()
returns text language sql as $$
  select string_agg(substr('abcdefghijkmnpqrstuvwxyz23456789', floor(random() * 32)::int + 1, 1), '')
  from generate_series(1, 8);
$$;

-- View count atomik increment (anonim kullanıcı bile artırabilir)
create or replace function public.increment_notebook_views(p_notebook_id uuid)
returns void language sql as $$
  update notebooks set view_count = view_count + 1 where id = p_notebook_id and is_public = true;
$$;

-- ============== NOTEBOOK SAVES (forking) ===========
create table if not exists public.notebook_saves (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  notebook_id uuid not null references notebooks(id) on delete cascade,

  -- Eğer clone'ladıysa, kendi defterinin id'si
  cloned_notebook_id uuid references notebooks(id) on delete set null,

  created_at timestamptz default now(),
  unique(user_id, notebook_id)
);

create index if not exists idx_saves_user on notebook_saves(user_id, created_at desc);
create index if not exists idx_saves_notebook on notebook_saves(notebook_id);

alter table public.notebook_saves enable row level security;
create policy "users_own_saves" on notebook_saves for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============== CLANS (10 kişilik study group) ===========
create table if not exists public.clans (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 3 and 40),
  slug text unique not null check (slug ~ '^[a-z0-9-]{3,30}$'),
  description text check (length(description) <= 500),
  emoji text default '🦁',
  color text default '#1E1B4B',

  founder_id uuid not null references profiles(id) on delete restrict,
  member_count int default 1,
  max_members int default 10,                                       -- Pro klan = 25

  is_public boolean default true,                                   -- discoverable olur
  invite_code text unique default substr(md5(random()::text), 0, 9),

  -- Stats
  total_streak_days int default 0,
  total_reviews int default 0,

  created_at timestamptz default now()
);

create index if not exists idx_clans_slug on clans(slug);
create index if not exists idx_clans_public on clans(is_public, member_count) where is_public = true;
create index if not exists idx_clans_invite on clans(invite_code);

alter table public.clans enable row level security;
create policy "anyone_reads_public_clans" on clans for select
  using (is_public = true or exists (
    select 1 from clan_members where clan_id = clans.id and user_id = auth.uid()
  ));
create policy "founders_update_clans" on clans for update
  using (auth.uid() = founder_id) with check (auth.uid() = founder_id);
create policy "users_create_clans" on clans for insert
  with check (auth.uid() = founder_id);

-- ============== CLAN MEMBERS ===========
create table if not exists public.clan_members (
  clan_id uuid not null references clans(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,

  role text default 'member' check (role in ('founder', 'admin', 'member')),
  joined_at timestamptz default now(),

  -- Üye stats (clan içinde gösterilir)
  weekly_reviews int default 0,
  weekly_minutes int default 0,
  current_streak int default 0,

  primary key (clan_id, user_id)
);

create index if not exists idx_members_user on clan_members(user_id);
create index if not exists idx_members_clan on clan_members(clan_id, weekly_reviews desc);

alter table public.clan_members enable row level security;
create policy "members_read_clan_members" on clan_members for select using (
  exists (select 1 from clan_members cm where cm.clan_id = clan_members.clan_id and cm.user_id = auth.uid())
  or exists (select 1 from clans where id = clan_members.clan_id and is_public = true)
);
create policy "users_join_leave" on clan_members for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============== CLAN MESSAGES (basit chat) ===========
create table if not exists public.clan_messages (
  id uuid primary key default gen_random_uuid(),
  clan_id uuid not null references clans(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,

  content text not null check (length(content) between 1 and 1000),
  message_type text default 'text' check (message_type in ('text', 'system', 'achievement')),

  reply_to uuid references clan_messages(id) on delete set null,

  created_at timestamptz default now(),
  edited_at timestamptz
);

create index if not exists idx_messages_clan on clan_messages(clan_id, created_at desc);

alter table public.clan_messages enable row level security;
create policy "members_read_messages" on clan_messages for select using (
  exists (select 1 from clan_members where clan_id = clan_messages.clan_id and user_id = auth.uid())
);
create policy "members_post_messages" on clan_messages for insert with check (
  auth.uid() = user_id
  and exists (select 1 from clan_members where clan_id = clan_messages.clan_id and user_id = auth.uid())
);
create policy "users_delete_own_messages" on clan_messages for delete using (auth.uid() = user_id);

-- ============== ACHIEVEMENTS (rozet sistemi) ===========
create table if not exists public.achievements (
  id text primary key,                                              -- 'first-podcast', 'streak-7', etc.

  name text not null,
  description text,
  emoji text not null,
  category text check (category in ('learning', 'social', 'streak', 'creator', 'milestone')),

  -- Hangi şartla kazanılır (frontend için referans)
  criteria_type text,                                               -- 'count', 'streak', 'event'
  criteria_threshold int,
  criteria_target text,                                             -- 'reviews', 'podcasts', vb.

  rarity text default 'common' check (rarity in ('common', 'rare', 'epic', 'legendary')),

  display_order int default 0,
  is_active boolean default true,

  created_at timestamptz default now()
);

alter table public.achievements enable row level security;
create policy "anyone_reads_achievements" on achievements for select using (is_active = true);

-- Seed achievements
insert into achievements (id, name, description, emoji, category, criteria_type, criteria_threshold, criteria_target, rarity, display_order) values
  ('first-notebook', 'İlk Defter', 'İlk defterini oluşturdun', '📓', 'milestone', 'count', 1, 'notebooks', 'common', 1),
  ('first-podcast', 'Sesli Çağ', 'İlk sesli özetini ürettin', '🎙️', 'creator', 'count', 1, 'podcasts', 'common', 2),
  ('streak-7', 'Bir Hafta', '7 gün üst üste tekrar yaptın', '🔥', 'streak', 'streak', 7, 'days', 'common', 3),
  ('streak-30', 'Ay Disiplini', '30 gün üst üste tekrar yaptın', '🌙', 'streak', 'streak', 30, 'days', 'rare', 4),
  ('streak-100', 'Yüzü Geçti', '100 gün üst üste tekrar yaptın', '💎', 'streak', 'streak', 100, 'days', 'epic', 5),
  ('streak-365', 'Yıl Tamam', '365 gün üst üste tekrar yaptın', '👑', 'streak', 'streak', 365, 'days', 'legendary', 6),

  ('reviews-100', 'Yüz Kart', '100 flashcard tekrarladın', '🃏', 'learning', 'count', 100, 'reviews', 'common', 10),
  ('reviews-1000', 'Bin Kart', '1000 flashcard tekrarladın', '🎴', 'learning', 'count', 1000, 'reviews', 'rare', 11),
  ('reviews-10000', 'On Bin Kart', '10.000 flashcard tekrarladın', '✨', 'learning', 'count', 10000, 'reviews', 'epic', 12),

  ('first-clan', 'Sürüye Katıldı', 'İlk klanına katıldın', '🦁', 'social', 'count', 1, 'clans_joined', 'common', 20),
  ('clan-founder', 'Önder', 'Kendi klanını kurdun', '⚔️', 'social', 'count', 1, 'clans_founded', 'rare', 21),
  ('first-share', 'Paylaşan El', 'İlk defterini paylaştın', '🔗', 'creator', 'count', 1, 'notebooks_shared', 'common', 30),
  ('viral-share', 'Viral', 'Defterin 100 kez görüntülendi', '🌍', 'creator', 'count', 100, 'views', 'rare', 31),
  ('saved-by-100', '100 Yıldızcı', 'Defterin 100 kez kaydedildi', '⭐', 'creator', 'count', 100, 'saves', 'epic', 32),

  ('vocab-100', 'Yüz Kelime', '100 yeni kelime öğrendin', '📚', 'learning', 'count', 100, 'vocab', 'common', 40),
  ('vocab-1000', 'Bin Kelime', '1000 yeni kelime öğrendin', '🎓', 'learning', 'count', 1000, 'vocab', 'rare', 41),

  ('first-pro', 'Pro Geçti', 'Pro üye oldun', '⚡', 'milestone', 'event', 1, 'pro_upgrade', 'rare', 50),
  ('lifetime-club', 'Lifetime Kulübü', 'Lifetime üye oldun', '💛', 'milestone', 'event', 1, 'lifetime_purchase', 'legendary', 51),

  ('night-owl', 'Gece Kuşu', 'Gece 02:00-05:00 arası tekrar yaptın', '🦉', 'streak', 'event', 1, 'late_night_review', 'rare', 60),
  ('early-bird', 'Erken Kuş', 'Sabah 05:00-07:00 arası tekrar yaptın', '🐦', 'streak', 'event', 1, 'early_morning_review', 'rare', 61)
on conflict (id) do nothing;

-- ============== USER ACHIEVEMENTS (kazanılan rozetler) ===========
create table if not exists public.user_achievements (
  user_id uuid not null references profiles(id) on delete cascade,
  achievement_id text not null references achievements(id) on delete cascade,

  unlocked_at timestamptz default now(),
  progress int default 0,                                           -- partial progress (henüz kazanılmadıysa)
  is_unlocked boolean default true,

  primary key (user_id, achievement_id)
);

create index if not exists idx_user_ach_unlocked on user_achievements(user_id, unlocked_at desc) where is_unlocked = true;

alter table public.user_achievements enable row level security;
create policy "anyone_reads_unlocked_achievements" on user_achievements for select
  using (is_unlocked = true);
create policy "service_writes_achievements" on user_achievements for all
  using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

-- ============== LEADERBOARD MATERIALIZED VIEW ============
-- Haftalık/aylık scores precomputed (saatte bir refresh)
create materialized view if not exists public.weekly_leaderboard as
select
  p.id as user_id,
  p.username,
  p.full_name,
  p.avatar_url,
  count(distinct vrl.id) as review_count,
  count(distinct date_trunc('day', vrl.reviewed_at)) as active_days,
  count(distinct vrl.id) * 1.0 + count(distinct date_trunc('day', vrl.reviewed_at)) * 5 as score,
  rank() over (order by count(distinct vrl.id) * 1.0 + count(distinct date_trunc('day', vrl.reviewed_at)) * 5 desc) as rank
from profiles p
left join vocabulary_review_log vrl on vrl.user_id = p.id
  and vrl.reviewed_at >= date_trunc('week', now())
  and vrl.reviewed_at < date_trunc('week', now()) + interval '7 days'
where p.is_public = true
group by p.id, p.username, p.full_name, p.avatar_url
having count(distinct vrl.id) > 0
order by score desc
limit 100;

create unique index if not exists idx_weekly_lb_user on weekly_leaderboard(user_id);
create index if not exists idx_weekly_lb_rank on weekly_leaderboard(rank);

-- ============== USER STATS HELPER (profil sayfası için) ============
create or replace function public.user_public_stats(p_user_id uuid)
returns table(
  notebook_count int,
  public_notebook_count int,
  total_views int,
  total_saves int,
  reviews_total int,
  current_streak int,
  achievements_count int,
  followers_count int,
  following_count int
)
language sql stable as $$
  select
    (select count(*)::int from notebooks where user_id = p_user_id),
    (select count(*)::int from notebooks where user_id = p_user_id and is_public = true),
    (select coalesce(sum(view_count), 0)::int from notebooks where user_id = p_user_id),
    (select coalesce(sum(save_count), 0)::int from notebooks where user_id = p_user_id),
    (select count(*)::int from vocabulary_review_log where user_id = p_user_id),
    coalesce((select current_streak from clan_members where user_id = p_user_id order by current_streak desc limit 1), 0),
    (select count(*)::int from user_achievements where user_id = p_user_id and is_unlocked = true),
    (select count(*)::int from follows where following_id = p_user_id),
    (select count(*)::int from follows where follower_id = p_user_id)
$$;

-- Member count trigger
create or replace function public.update_clan_member_count()
returns trigger language plpgsql as $$
begin
  if TG_OP = 'INSERT' then
    update clans set member_count = member_count + 1 where id = NEW.clan_id;
  elsif TG_OP = 'DELETE' then
    update clans set member_count = greatest(0, member_count - 1) where id = OLD.clan_id;
  end if;
  return coalesce(NEW, OLD);
end;
$$;

drop trigger if exists trg_clan_member_count on clan_members;
create trigger trg_clan_member_count
after insert or delete on clan_members
for each row execute function public.update_clan_member_count();
