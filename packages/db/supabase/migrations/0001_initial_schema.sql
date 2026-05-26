-- ============================================================================
-- Kavra — İlk Şema (v3 tam)
-- Migration: 0001_initial_schema
-- ============================================================================

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";
create extension if not exists "vector";

-- ============================================================================
-- 1. KULLANICI + TERCİHLER
-- ============================================================================

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  full_name text,
  avatar_url text,
  role text not null default 'student' check (role in ('student', 'admin')),
  timezone text default 'Europe/Istanbul',
  locale text default 'tr',
  onboarding_completed boolean default false,
  learning_profile jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.user_preferences (
  user_id uuid primary key references profiles(id) on delete cascade,
  -- Dil
  ui_language text default 'tr',
  content_language text default 'tr',
  -- Ses
  tts_mode text default 'auto' check (tts_mode in ('device', 'server', 'auto', 'off')),
  tts_voice text,
  tts_speed numeric default 1.0,
  stt_auto_detect boolean default true,
  voice_mode_default text default 'push_to_talk' check (voice_mode_default in ('push_to_talk', 'continuous')),
  -- Görünüm
  theme_mode text default 'system' check (theme_mode in ('light', 'dark', 'system')),
  color_theme text default 'default',
  font_size text default 'medium' check (font_size in ('small', 'medium', 'large')),
  -- Çalışma
  preferred_content_types text[] default array['text', 'video', 'diagram'],
  preferred_techniques text[] default '{}',
  blocked_techniques text[] default '{}',
  daily_goal_minutes int default 30,
  difficulty_preference text default 'adaptive' check (difficulty_preference in ('easy', 'adaptive', 'hard')),
  -- Bildirim
  notification_email boolean default true,
  notification_push boolean default true,
  quiet_hours_start time,
  quiet_hours_end time,
  -- Güvenlik
  app_lock_enabled boolean default false,
  app_lock_timeout_minutes int default 5,
  -- Kişilik
  default_personality_id uuid,
  updated_at timestamptz default now()
);

-- ============================================================================
-- 2. API KEY YÖNETİMİ (Şifreli)
-- ============================================================================

create table public.api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  provider text not null default 'groq' check (provider in ('groq', 'openai', 'anthropic')),
  label text not null,
  key_encrypted bytea not null,
  key_iv bytea not null,
  key_tag bytea not null,
  key_last4 text not null,
  is_active boolean default true,
  is_default boolean default false,
  last_used_at timestamptz,
  last_test_at timestamptz,
  last_test_success boolean,
  created_at timestamptz default now()
);

create unique index idx_one_default_per_provider
  on api_keys(user_id, provider) where is_default = true;

-- ============================================================================
-- 3. LLM MODEL KATALOĞU (Dinamik)
-- ============================================================================

create table public.llm_models (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  model_id text not null,
  display_name text not null,
  description text,
  context_window int,
  max_output_tokens int,
  input_price_per_1m numeric(10, 4),
  output_price_per_1m numeric(10, 4),
  capabilities jsonb default '{}'::jsonb,
  category text check (category in ('fast', 'versatile', 'vision', 'reasoning', 'compound', 'safety', 'stt', 'tts')),
  is_active boolean default true,
  is_recommended boolean default false,
  last_synced_at timestamptz default now(),
  unique (provider, model_id)
);

-- ============================================================================
-- 4. TEKNİK MODÜLLERİ + 150 TEKNİK
-- ============================================================================

create table public.modules (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,                  -- M1..M7, C1..C10
  kind text not null check (kind in ('technique_module', 'ai_category')),
  name text not null,
  name_en text,
  description text,
  icon text,
  display_order int,
  is_active boolean default true
);

create table public.techniques (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references modules(id),
  code text unique not null,                  -- M1-T01, C3-T02 vs.
  name text not null,
  name_en text,
  short_description text not null,
  long_description text,
  kind text not null default 'student_facing' check (kind in ('student_facing', 'engine_behavior')),
  suitable_for text[] default '{}',
  contraindications text[] default '{}',
  difficulty_level int default 1 check (difficulty_level between 1 and 5),
  cognitive_load int default 2 check (cognitive_load between 1 and 5),
  estimated_duration_minutes int,
  prompt_template text,
  system_prompt text,
  expected_output_schema jsonb,
  ui_component text,                          -- 'chat' | 'flashcard' | 'quiz' | 'mindmap' | 'journal'
  tags text[] default '{}',
  is_active boolean default true,
  metadata jsonb default '{}'::jsonb
);

-- ============================================================================
-- 5. KONULAR + KAVRAMLAR (pgvector)
-- ============================================================================

create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  description text,
  target_level text,
  target_date date,
  color text default '#4F46E5',
  icon text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.concepts (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references subjects(id) on delete cascade,
  name text not null,
  description text,
  difficulty int default 1,
  prerequisites uuid[] default '{}',
  embedding vector(1536),
  source_ref text,
  created_at timestamptz default now()
);

create index idx_concepts_embedding on concepts
  using ivfflat (embedding vector_cosine_ops) with (lists = 100);

create table public.concept_relations (
  id uuid primary key default gen_random_uuid(),
  from_concept_id uuid references concepts(id) on delete cascade,
  to_concept_id uuid references concepts(id) on delete cascade,
  relation_type text check (relation_type in
    ('prerequisite', 'similar', 'opposite', 'example_of', 'part_of', 'user_linked')),
  weight numeric default 1.0,
  created_by text default 'ai',
  unique (from_concept_id, to_concept_id, relation_type)
);

-- ============================================================================
-- 6. DERS OTURUMLARI + MESAJLAR
-- ============================================================================

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  subject_id uuid references subjects(id),
  concept_id uuid references concepts(id),
  technique_id uuid references techniques(id),
  model_id uuid references llm_models(id),
  api_key_id uuid references api_keys(id),
  personality_id uuid,
  status text default 'active' check (status in ('active', 'completed', 'abandoned')),
  started_at timestamptz default now(),
  completed_at timestamptz,
  duration_seconds int,
  user_rating int check (user_rating between 1 and 5),
  user_feedback text,
  metadata jsonb default '{}'::jsonb
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references lessons(id) on delete cascade,
  role text not null check (role in ('system', 'user', 'assistant', 'tool')),
  content text not null,
  content_type text default 'text' check (content_type in ('text', 'markdown', 'code', 'image', 'audio')),
  tokens_in int,
  tokens_out int,
  model_used text,
  latency_ms int,
  created_at timestamptz default now()
);

create index idx_messages_lesson on messages(lesson_id, created_at);

-- ============================================================================
-- 7. ARALIKLI TEKRAR (SM-2) + LEITNER
-- ============================================================================

create table public.progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  concept_id uuid not null references concepts(id) on delete cascade,
  ease_factor numeric(4, 2) default 2.5,
  interval_days int default 1,
  repetitions int default 0,
  last_quality int,
  last_reviewed_at timestamptz,
  next_review_at timestamptz default now(),
  mastery_score numeric(5, 2) default 0,
  total_reviews int default 0,
  correct_reviews int default 0,
  unique (user_id, concept_id)
);

create index idx_progress_due on progress(user_id, next_review_at)
  where next_review_at <= now();

create table public.flashcards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  concept_id uuid references concepts(id),
  front text not null,
  back text not null,
  hint text,
  leitner_box int default 1 check (leitner_box between 1 and 5),
  next_review_at timestamptz default now(),
  last_reviewed_at timestamptz,
  total_reviews int default 0,
  correct_streak int default 0,
  created_by text default 'ai',
  created_at timestamptz default now()
);

create table public.generated_flashcards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  document_id uuid,
  chunk_id uuid,
  front text not null,
  back text not null,
  hint text,
  difficulty int,
  status text default 'pending' check (status in ('pending', 'accepted', 'rejected', 'edited')),
  accepted_flashcard_id uuid references flashcards(id),
  created_at timestamptz default now()
);

-- ============================================================================
-- 8. DEĞERLENDİRME + HATA PORTFÖYÜ + REFLEKSİYON
-- ============================================================================

create table public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  concept_id uuid references concepts(id),
  lesson_id uuid references lessons(id),
  question text not null,
  options jsonb,
  user_answer text,
  correct_answer text,
  is_correct boolean,
  confidence_before int,
  time_spent_seconds int,
  ai_feedback text,
  created_at timestamptz default now()
);

create table public.error_portfolio (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  concept_id uuid references concepts(id),
  quiz_attempt_id uuid references quiz_attempts(id),
  mistake_summary text not null,
  root_cause text,
  correction text not null,
  metaphor text,
  review_count int default 0,
  resolved boolean default false,
  created_at timestamptz default now()
);

create table public.reflections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  date date not null,
  content text not null,
  mood int check (mood between 1 and 5),
  energy int check (energy between 1 and 5),
  techniques_used uuid[] default '{}',
  insights text,
  ai_summary text,
  unique (user_id, date)
);

-- ============================================================================
-- 9. HEDEF + GAMİFİKASYON
-- ============================================================================

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  subject_id uuid references subjects(id),
  description text not null,
  type text default 'outcome' check (type in ('outcome', 'process', 'learning')),
  target_date date,
  status text default 'active' check (status in ('active', 'completed', 'abandoned')),
  progress_percent int default 0,
  woop_wish text,
  woop_outcome text,
  woop_obstacle text,
  woop_plan text,
  created_at timestamptz default now()
);

create table public.streaks (
  user_id uuid primary key references profiles(id) on delete cascade,
  current_streak int default 0,
  longest_streak int default 0,
  last_activity_date date,
  freeze_count int default 0
);

create table public.achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  badge_code text not null,
  earned_at timestamptz default now(),
  metadata jsonb default '{}'::jsonb,
  unique (user_id, badge_code)
);

-- ============================================================================
-- 10. DOSYA + SES KAYDI
-- ============================================================================

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  subject_id uuid references subjects(id),
  filename text not null,
  storage_path text not null,
  mime_type text,
  size_bytes bigint,
  page_count int,
  extracted_text text,
  status text default 'processing' check (status in ('processing', 'ready', 'failed')),
  error_message text,
  created_at timestamptz default now()
);

create table public.document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references documents(id) on delete cascade,
  chunk_index int,
  content text not null,
  page_number int,
  embedding vector(1536),
  tokens int
);

create index idx_chunks_embedding on document_chunks
  using ivfflat (embedding vector_cosine_ops) with (lists = 100);

create table public.images (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  lesson_id uuid references lessons(id),
  storage_path text not null,
  analysis_result text,
  created_at timestamptz default now()
);

create table public.audio_recordings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  message_id uuid references messages(id),
  type text check (type in ('user_input', 'ai_output')),
  storage_path text not null,
  duration_seconds numeric,
  language text,
  transcription text,
  created_at timestamptz default now()
);

-- ============================================================================
-- 11. KİŞİLİKLER + PLAN + FOCUS + RAPOR
-- ============================================================================

create table public.personalities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  name text not null,
  system_prompt_fragment text not null,
  recommended_temperature numeric default 0.7,
  recommended_voice text,
  emoji text,
  is_preset boolean default false,
  created_at timestamptz default now()
);

-- user_preferences.default_personality_id için FK (geç bağlama)
alter table user_preferences
  add constraint fk_default_personality
  foreign key (default_personality_id) references personalities(id) on delete set null;

create table public.study_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  subject_id uuid references subjects(id),
  title text,
  start_date date,
  end_date date,
  status text default 'active',
  ai_generated boolean default true,
  calendar_synced boolean default false,
  plan_data jsonb,
  created_at timestamptz default now()
);

create table public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid references study_plans(id) on delete cascade,
  scheduled_at timestamptz not null,
  duration_minutes int,
  topic text,
  technique_code text,
  completed boolean default false,
  actual_lesson_id uuid references lessons(id),
  calendar_event_id text
);

create table public.focus_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  subject_id uuid references subjects(id),
  duration_minutes int not null,
  break_minutes int,
  started_at timestamptz not null,
  ended_at timestamptz,
  completed boolean default false,
  interruptions int default 0,
  productivity_rating int check (productivity_rating between 1 and 5),
  background_sound text
);

create table public.weekly_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  week_start date not null,
  week_end date not null,
  stats jsonb,
  narrative text,
  recommendations text[],
  sent_at timestamptz,
  read_at timestamptz,
  unique (user_id, week_start)
);

-- ============================================================================
-- 12. VOICE CLONE (Premium)
-- ============================================================================

create table public.voice_clones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  name text not null,
  reference_audio_path text not null,
  embedding bytea,
  language text,
  status text default 'processing',
  created_at timestamptz default now()
);

-- ============================================================================
-- 13. INBOX (Paylaşım Menüsünden Gelenler)
-- ============================================================================

create table public.inbox_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  source text,
  content_type text,
  raw_content text,
  storage_path text,
  url text,
  subject_id uuid references subjects(id),
  processed boolean default false,
  created_at timestamptz default now()
);

-- ============================================================================
-- 14. EXPORT + KULLANIM LOGLARI
-- ============================================================================

create table public.exports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  type text check (type in ('learning_journal', 'mastery_report', 'flashcards', 'data_dump')),
  date_from date,
  date_to date,
  status text default 'pending',
  storage_path text,
  expires_at timestamptz,
  created_at timestamptz default now()
);

create table public.usage_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  api_key_id uuid references api_keys(id),
  model_id uuid references llm_models(id),
  lesson_id uuid references lessons(id),
  tokens_in int not null default 0,
  tokens_out int not null default 0,
  cost_usd numeric(10, 6),
  latency_ms int,
  success boolean default true,
  error_message text,
  created_at timestamptz default now()
);

create index idx_usage_user_date on usage_logs(user_id, created_at desc);

-- ============================================================================
-- 15. ABONELİK (Stripe, Faz 7)
-- ============================================================================

create table public.subscriptions (
  user_id uuid primary key references profiles(id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text,
  plan text not null default 'free' check (plan in ('free', 'pro_monthly', 'pro_yearly', 'pro_lifetime')),
  status text not null default 'active',
  current_period_end timestamptz,
  cancel_at_period_end boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================================
-- TRIGGER: updated_at otomatik güncelleme
-- ============================================================================

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger trg_profiles_updated before update on profiles
  for each row execute function set_updated_at();
create trigger trg_prefs_updated before update on user_preferences
  for each row execute function set_updated_at();
create trigger trg_subjects_updated before update on subjects
  for each row execute function set_updated_at();
create trigger trg_subs_updated before update on subscriptions
  for each row execute function set_updated_at();

-- ============================================================================
-- TRIGGER: auth.users → profiles + user_preferences + streaks otomatik oluştur
-- ============================================================================

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', ''));

  insert into public.user_preferences (user_id) values (new.id);
  insert into public.streaks (user_id) values (new.id);
  insert into public.subscriptions (user_id) values (new.id);

  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
