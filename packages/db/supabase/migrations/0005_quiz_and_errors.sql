-- ============================================================================
-- Kavra — Faz 5: Quiz + Error Portfolio + Flashcard Geliştirmeleri
-- Migration: 0005_quiz_and_errors
-- ============================================================================

-- ---- QUIZZES tablosu (var olmayabilir, idempotent) ----
create table if not exists public.quizzes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  subject_id uuid references subjects(id) on delete set null,
  concept_id uuid references concepts(id) on delete set null,
  document_id uuid references documents(id) on delete set null,
  title text,
  question_count int default 0,
  difficulty_avg numeric(3, 2),
  source text default 'ai_generated', -- ai_generated | manual | imported
  created_at timestamptz default now()
);

alter table public.quizzes enable row level security;
create policy if not exists "users_own_quizzes" on quizzes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---- QUIZ_QUESTIONS ----
create table if not exists public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references quizzes(id) on delete cascade,
  position int not null,
  type text not null check (type in ('multiple_choice', 'true_false', 'open_ended', 'fill_blank')),
  prompt text not null,
  choices jsonb,                     -- {a, b, c, d} for multiple_choice
  correct_answer text not null,      -- mc için 'a'/'b'/'c'/'d', tf için 'true'/'false', open için açık metin
  explanation text,
  difficulty int default 2 check (difficulty between 1 and 5),
  source_chunk_id uuid references document_chunks(id) on delete set null,
  created_at timestamptz default now()
);

create index if not exists idx_quiz_questions_quiz on quiz_questions(quiz_id, position);

alter table public.quiz_questions enable row level security;
create policy if not exists "users_own_quiz_questions" on quiz_questions
  for all using (
    exists (
      select 1 from quizzes q
      where q.id = quiz_questions.quiz_id and q.user_id = auth.uid()
    )
  );

-- ---- QUIZ_ATTEMPTS (var olmayabilir) ----
create table if not exists public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  quiz_id uuid not null references quizzes(id) on delete cascade,
  question_id uuid not null references quiz_questions(id) on delete cascade,
  user_answer text,
  is_correct boolean not null,
  time_spent_ms int,
  created_at timestamptz default now()
);

create index if not exists idx_quiz_attempts_user on quiz_attempts(user_id, created_at desc);
create index if not exists idx_quiz_attempts_question on quiz_attempts(question_id);

alter table public.quiz_attempts enable row level security;
create policy if not exists "users_own_attempts" on quiz_attempts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---- ERROR_PORTFOLIO ----
create table if not exists public.error_portfolio (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  concept_id uuid references concepts(id) on delete set null,
  subject_id uuid references subjects(id) on delete set null,
  source_type text not null check (source_type in ('quiz', 'flashcard', 'lesson_self_report', 'manual')),
  source_id uuid,                          -- quiz_attempt.id veya flashcard_review.id
  user_answer text,
  correct_answer text,
  mistake_summary text not null,           -- AI tarafından kısa özet ("- birim hatası: cm² yerine cm³ yazıldı")
  root_causes jsonb,                       -- 5 Whys analizi: ["birim karıştı", "alan/hacim ayrımı yok", ...]
  resolved boolean default false,
  resolved_at timestamptz,
  resolution_lesson_id uuid references lessons(id) on delete set null,
  review_count int default 0,
  created_at timestamptz default now()
);

create index if not exists idx_errors_user_unresolved on error_portfolio(user_id, resolved, created_at desc)
  where resolved = false;
create index if not exists idx_errors_concept on error_portfolio(concept_id) where concept_id is not null;

alter table public.error_portfolio enable row level security;
create policy if not exists "users_own_errors" on error_portfolio
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---- FLASHCARD_REVIEWS (SM-2 history) ----
create table if not exists public.flashcard_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  flashcard_id uuid not null references flashcards(id) on delete cascade,
  rating int not null check (rating between 0 and 5),  -- SM-2 quality (0-5)
  time_spent_ms int,
  prev_ease_factor numeric(4, 2),
  prev_interval_days int,
  prev_repetitions int,
  new_ease_factor numeric(4, 2) not null,
  new_interval_days int not null,
  new_repetitions int not null,
  next_review_at timestamptz not null,
  created_at timestamptz default now()
);

create index if not exists idx_reviews_user_date on flashcard_reviews(user_id, created_at desc);
create index if not exists idx_reviews_flashcard on flashcard_reviews(flashcard_id, created_at desc);

alter table public.flashcard_reviews enable row level security;
create policy if not exists "users_own_reviews" on flashcard_reviews
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---- FLASHCARDS ek alanları (yoksa ekle) ----
do $$
begin
  if not exists (select 1 from information_schema.columns
                  where table_name = 'flashcards' and column_name = 'ease_factor') then
    alter table flashcards add column ease_factor numeric(4, 2) default 2.5;
    alter table flashcards add column interval_days int default 0;
    alter table flashcards add column repetitions int default 0;
    alter table flashcards add column next_review_at timestamptz default now();
    alter table flashcards add column last_reviewed_at timestamptz;
    alter table flashcards add column total_reviews int default 0;
    alter table flashcards add column lapses int default 0;
  end if;
end $$;

create index if not exists idx_flashcards_due on flashcards(user_id, next_review_at)
  where next_review_at is not null;

-- ---- DUE FLASHCARDS RPC — bugün/şu an bakılması gereken kartlar ----
create or replace function public.get_due_flashcards(
  match_user_id uuid,
  match_subject_id uuid default null,
  match_limit int default 50
)
returns table (
  id uuid,
  front text,
  back text,
  hint text,
  ease_factor numeric,
  interval_days int,
  repetitions int,
  next_review_at timestamptz,
  total_reviews int,
  lapses int,
  concept_id uuid,
  is_new boolean
)
language sql
stable
security definer
as $$
  select
    f.id,
    f.front,
    f.back,
    f.hint,
    f.ease_factor,
    f.interval_days,
    f.repetitions,
    f.next_review_at,
    f.total_reviews,
    f.lapses,
    f.concept_id,
    (f.repetitions = 0) as is_new
  from flashcards f
  left join concepts c on c.id = f.concept_id
  left join subjects s on s.id = c.subject_id
  where f.user_id = match_user_id
    and f.next_review_at <= now()
    and (match_subject_id is null or s.id = match_subject_id)
  order by
    (f.repetitions = 0) desc,    -- yeni kartlar önce
    f.next_review_at asc          -- en gecikmişler önce
  limit match_limit;
$$;

grant execute on function public.get_due_flashcards to authenticated, service_role;

-- ---- SUBJECT STATS RPC ----
create or replace function public.get_subject_stats(
  match_user_id uuid,
  match_subject_id uuid
)
returns table (
  total_concepts int,
  mastered_concepts int,        -- mastery > 70
  due_flashcards int,
  total_flashcards int,
  total_lessons int,
  total_quiz_attempts int,
  quiz_accuracy numeric,         -- 0-1
  unresolved_errors int,
  last_lesson_at timestamptz,
  total_minutes int
)
language sql
stable
security definer
as $$
  select
    (select count(*)::int from concepts c
      where c.subject_id = match_subject_id) as total_concepts,
    (select count(*)::int from concepts c
      left join progress p on p.concept_id = c.id and p.user_id = match_user_id
      where c.subject_id = match_subject_id and coalesce(p.mastery_score, 0) > 70) as mastered_concepts,
    (select count(*)::int from flashcards f
      left join concepts c on c.id = f.concept_id
      where f.user_id = match_user_id
        and (c.subject_id = match_subject_id or f.subject_id = match_subject_id)
        and f.next_review_at <= now()) as due_flashcards,
    (select count(*)::int from flashcards f
      left join concepts c on c.id = f.concept_id
      where f.user_id = match_user_id
        and (c.subject_id = match_subject_id or f.subject_id = match_subject_id)) as total_flashcards,
    (select count(*)::int from lessons
      where user_id = match_user_id and subject_id = match_subject_id) as total_lessons,
    (select count(*)::int from quiz_attempts qa
      join quizzes q on q.id = qa.quiz_id
      where qa.user_id = match_user_id and q.subject_id = match_subject_id) as total_quiz_attempts,
    (select coalesce(avg(case when qa.is_correct then 1.0 else 0.0 end), 0)::numeric from quiz_attempts qa
      join quizzes q on q.id = qa.quiz_id
      where qa.user_id = match_user_id and q.subject_id = match_subject_id) as quiz_accuracy,
    (select count(*)::int from error_portfolio
      where user_id = match_user_id and subject_id = match_subject_id and not resolved) as unresolved_errors,
    (select max(started_at) from lessons
      where user_id = match_user_id and subject_id = match_subject_id) as last_lesson_at,
    (select coalesce(sum(extract(epoch from (coalesce(completed_at, started_at + interval '5 minutes') - started_at)) / 60), 0)::int
      from lessons where user_id = match_user_id and subject_id = match_subject_id) as total_minutes;
$$;

grant execute on function public.get_subject_stats to authenticated, service_role;

-- ---- FLASHCARD ek alanı: subject_id (concept yoksa direkt subject'e bağlanabilsin) ----
do $$
begin
  if not exists (select 1 from information_schema.columns
                  where table_name = 'flashcards' and column_name = 'subject_id') then
    alter table flashcards add column subject_id uuid references subjects(id) on delete set null;
  end if;
end $$;
