-- ============================================================================
-- Kavra — Faz 9 Sprint 2: TTS, FSRS, Exercises
-- Migration: 0010_tts_fsrs_exercises
-- ============================================================================

-- ---- VOCABULARY SRS CARDS (FSRS-5) ----
-- Her user_vocabulary kelimesi için bir SRS kartı.
-- Kavramların SRS'inden (existing srs_cards) farklı tutuyoruz çünkü
-- vocabulary cards'ın ayrı domain'i var (kelime ↔ çeviri).
create table if not exists public.vocabulary_srs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  vocabulary_id uuid not null references user_vocabulary(id) on delete cascade,

  -- FSRS-5 parametreleri
  difficulty numeric not null default 5.0 check (difficulty >= 0 and difficulty <= 10),
  stability numeric not null default 1.0,
  retrievability numeric default 1.0,
  state text not null default 'new' check (state in ('new', 'learning', 'review', 'relearning')),
  step int not null default 0,

  -- Schedule
  due_at timestamptz not null default now(),
  last_review_at timestamptz,
  reps int default 0,
  lapses int default 0,

  -- Card variants (vocabulary için farklı sorma yolları)
  card_type text default 'recognition' check (card_type in (
    'recognition',     -- Kelimeyi gördüğünde anlamını söyle
    'production',      -- Anlamı gördüğünde kelimeyi söyle
    'cloze',           -- Cümlede boşluğu doldur
    'listening'        -- Sesli duyduğun kelimeyi yaz
  )),

  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  unique(user_id, vocabulary_id, card_type)
);

create index if not exists idx_vocab_srs_due
  on vocabulary_srs(user_id, due_at)
  where state != 'new' or due_at <= now();

create index if not exists idx_vocab_srs_vocab on vocabulary_srs(vocabulary_id);

alter table public.vocabulary_srs enable row level security;
create policy "users_own_vocab_srs" on vocabulary_srs for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---- VOCABULARY REVIEW HISTORY ----
create table if not exists public.vocabulary_review_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  vocab_srs_id uuid not null references vocabulary_srs(id) on delete cascade,

  rating int not null check (rating in (1, 2, 3, 4)),  -- 1=Again, 2=Hard, 3=Good, 4=Easy
  duration_ms int,                                      -- ne kadar düşündü

  -- FSRS state snapshot (algoritma debug + retraining için)
  difficulty_before numeric,
  stability_before numeric,
  retrievability_before numeric,
  difficulty_after numeric,
  stability_after numeric,

  reviewed_at timestamptz default now()
);

create index if not exists idx_vocab_review_log_user
  on vocabulary_review_log(user_id, reviewed_at desc);

alter table public.vocabulary_review_log enable row level security;
create policy "users_own_vocab_log" on vocabulary_review_log for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---- USER FSRS PARAMETERS (kişiselleştirilmiş w-vector) ----
-- 1000+ inceleme sonrası kullanıcıya özel FSRS parametreleri optimize edilebilir.
-- O zamana kadar default w (ts-fsrs library'sinden gelen).
create table if not exists public.user_fsrs_params (
  user_id uuid primary key references profiles(id) on delete cascade,

  parameters numeric[] default array[
    0.4072, 1.1829, 3.1262, 15.4722, 7.2102, 0.5316, 1.0651, 0.0234,
    1.616, 0.1544, 1.0824, 1.9813, 0.0953, 0.2975, 2.2042, 0.2407, 2.9466
  ]::numeric[],
  request_retention numeric default 0.9 check (request_retention > 0.7 and request_retention < 0.99),
  maximum_interval int default 36500,                   -- gün
  enable_short_term boolean default true,

  optimized_at timestamptz,                             -- son optimize edildiği tarih
  total_reviews_at_optimize int,
  rmse_at_optimize numeric,                             -- algoritma kalitesi metriği

  updated_at timestamptz default now()
);

alter table public.user_fsrs_params enable row level security;
create policy "users_own_fsrs_params" on user_fsrs_params for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---- BOOK TTS SETTINGS (kullanıcı tercihleri) ----
create table if not exists public.book_tts_settings (
  user_id uuid primary key references profiles(id) on delete cascade,

  engine text default 'edge' check (engine in ('edge', 'piper', 'elevenlabs', 'azure')),
  voice_id text,                                        -- 'en-US-AriaNeural' vb
  speed numeric default 1.0 check (speed >= 0.5 and speed <= 3.0),
  pitch numeric default 0,
  highlight_color text default '#F59E0B',
  highlight_mode text default 'word' check (highlight_mode in ('word', 'sentence', 'off')),

  auto_advance boolean default true,                    -- cümle bitince sonraki cümleye geç

  updated_at timestamptz default now()
);

alter table public.book_tts_settings enable row level security;
create policy "users_own_tts_settings" on book_tts_settings for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---- EXERCISES TABLE (Linga "Egzersizler" sekmesi) ----
-- Egzersiz oturumları kaydediliyor; her tipinde performans ölçülebilsin.
create table if not exists public.exercise_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,

  exercise_type text not null check (exercise_type in (
    'flashcard',           -- Klasik kart
    'multiple_choice',     -- Çoktan seçmeli
    'word_formation',      -- Kelime oluştur (anagram)
    'cloze',               -- Boşluk doldurma
    'listening',           -- Dinleme + yazma
    'mixed'                -- Karışık
  )),

  language text not null,                               -- hangi dil için

  -- Hangi havuzdan
  source_book_id uuid references books(id) on delete set null,
  source_filter text,                                   -- 'learning', 'reviewing', 'all'

  -- Sonuç
  total_questions int default 0,
  correct_answers int default 0,
  duration_seconds int,

  started_at timestamptz default now(),
  ended_at timestamptz
);

create index if not exists idx_exercise_user
  on exercise_sessions(user_id, started_at desc);

alter table public.exercise_sessions enable row level security;
create policy "users_own_exercises" on exercise_sessions for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---- VOCABULARY DAILY GOAL TRACKING ----
create table if not exists public.vocabulary_daily_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  date date not null default current_date,

  words_learned int default 0,                          -- yeni öğrenilen
  words_reviewed int default 0,                         -- tekrar yapılan
  exercises_completed int default 0,
  reading_minutes int default 0,

  goal_met boolean default false,

  unique(user_id, date)
);

create index if not exists idx_vocab_daily_user
  on vocabulary_daily_progress(user_id, date desc);

alter table public.vocabulary_daily_progress enable row level security;
create policy "users_own_daily_progress" on vocabulary_daily_progress for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---- HELPER: vocabulary review sonrası SRS güncellemesi ----
create or replace function public.upsert_vocab_srs_card(
  p_user_id uuid,
  p_vocabulary_id uuid,
  p_card_type text default 'recognition'
) returns uuid
language plpgsql
security definer
as $$
declare
  v_id uuid;
begin
  insert into vocabulary_srs (user_id, vocabulary_id, card_type)
  values (p_user_id, p_vocabulary_id, p_card_type)
  on conflict (user_id, vocabulary_id, card_type)
    do update set updated_at = now()
  returning id into v_id;
  return v_id;
end;
$$;

grant execute on function public.upsert_vocab_srs_card to authenticated, service_role;
