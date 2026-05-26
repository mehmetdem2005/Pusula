-- ============================================================================
-- Kavra — Faz 11 Sprint 4: YouTube Transkript
-- Migration: 0012_youtube_transcripts
-- ============================================================================

-- YouTube source için ek alanlar (notebook_sources'a eklenmesi gerekir,
-- ama metadata jsonb'sinde tutuyoruz; burada sadece çeviri cache).

create table if not exists public.youtube_translation_cache (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references notebook_sources(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,

  -- Birden çok dile çeviri için bir kayıt = bir hedef dil
  source_language text not null,                -- 'en'
  target_language text not null,                -- 'tr'

  -- chunk-level translations (chunk_index → translated text)
  translations jsonb not null default '{}'::jsonb,

  -- meta
  total_chunks int default 0,
  translated_chunks int default 0,
  status text default 'pending' check (status in ('pending', 'processing', 'ready', 'failed')),

  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  unique(source_id, target_language)
);

create index if not exists idx_yt_cache_source on youtube_translation_cache(source_id);

alter table public.youtube_translation_cache enable row level security;
drop policy if exists "users_own_yt_cache" on youtube_translation_cache;
create policy "users_own_yt_cache" on youtube_translation_cache for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---- YOUTUBE METADATA columns added to notebook_sources ----
-- (notebook_sources zaten var, sadece YouTube-specific alanları ekliyoruz)

alter table public.notebook_sources
  add column if not exists youtube_video_id text,
  add column if not exists youtube_duration_seconds int,
  add column if not exists youtube_channel_name text,
  add column if not exists transcript_source text;
  -- 'supadata-auto', 'supadata-asr', 'whisper-fallback'

create index if not exists idx_sources_youtube
  on notebook_sources(youtube_video_id) where youtube_video_id is not null;

-- ---- VIDEO_PLAYBACK_HISTORY (kullanıcının nereden devam edeceği) ----
create table if not exists public.video_playback_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  source_id uuid not null references notebook_sources(id) on delete cascade,

  last_position_ms int not null default 0,
  watched_seconds int default 0,
  is_completed boolean default false,

  updated_at timestamptz default now(),

  unique(user_id, source_id)
);

create index if not exists idx_playback_user on video_playback_history(user_id, updated_at desc);

alter table public.video_playback_history enable row level security;
drop policy if exists "users_own_playback" on video_playback_history;
create policy "users_own_playback" on video_playback_history for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
