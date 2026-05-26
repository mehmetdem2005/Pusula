-- ============================================================================
-- Kavra — Faz 6: Reflections + Achievements + Focus + Goals
-- Migration: 0006_reflections_and_motivation
-- ============================================================================

-- ---- DAILY REFLECTIONS — günlük yazılı yansıtma ----
create table if not exists public.reflections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  date date not null,                              -- bir günde tek reflection
  mood int check (mood between 1 and 5),           -- 1=zor, 5=harika
  energy int check (energy between 1 and 5),
  what_learned text,                                -- "bugün ne öğrendim?"
  what_struggled text,                              -- "neyle zorlandım?"
  tomorrow_focus text,                              -- "yarın neye odaklanacağım?"
  ai_summary text,                                  -- haftalık raporda kullanılır
  created_at timestamptz default now(),
  unique(user_id, date)
);

create index if not exists idx_reflections_user_date on reflections(user_id, date desc);

alter table public.reflections enable row level security;
create policy if not exists "users_own_reflections" on reflections
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---- WEEKLY REPORTS — AI tarafından üretilen haftalık özet ----
create table if not exists public.weekly_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  week_start date not null,                        -- pazartesi
  week_end date not null,                          -- pazar
  total_minutes int default 0,
  total_lessons int default 0,
  total_reviews int default 0,
  total_quiz_attempts int default 0,
  quiz_accuracy numeric(3, 2),
  most_used_technique_id uuid references techniques(id) on delete set null,
  highlights jsonb,                                -- {"top_concept": "...", "best_day": "..."}
  ai_narrative text,                               -- AI'nın oluşturduğu insan dilinde özet
  ai_recommendations jsonb,                        -- ["...", "..."]
  created_at timestamptz default now(),
  unique(user_id, week_start)
);

create index if not exists idx_reports_user on weekly_reports(user_id, week_start desc);

alter table public.weekly_reports enable row level security;
create policy if not exists "users_own_reports" on weekly_reports
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---- ACHIEVEMENTS (preset rozetler) ----
create table if not exists public.achievements (
  id text primary key,                             -- 'streak_7', 'first_lesson' vb.
  name text not null,
  description text not null,
  emoji text not null,
  category text not null,                          -- streak | volume | mastery | exploration | social
  threshold int,                                   -- gereken eşik değer (örn: 7 streak)
  is_active boolean default true,
  display_order int default 0
);

-- Achievements seed
insert into achievements(id, name, description, emoji, category, threshold, display_order) values
  ('first_lesson', 'İlk Adım', 'İlk dersini tamamladın', '🌱', 'volume', 1, 1),
  ('first_quiz', 'Sınamacı', 'İlk quizini çözdün', '📝', 'volume', 1, 2),
  ('first_review', 'Disiplin', 'İlk tekrarını yaptın', '🔁', 'volume', 1, 3),
  ('streak_3', '3 Günlük Seri', 'Üç gün üst üste çalıştın', '🔥', 'streak', 3, 10),
  ('streak_7', 'Haftalık Seri', 'Yedi gün üst üste çalıştın', '🔥🔥', 'streak', 7, 11),
  ('streak_30', 'Aylık Seri', '30 gün üst üste çalıştın', '🔥🔥🔥', 'streak', 30, 12),
  ('streak_100', 'Efsane', '100 gün üst üste çalıştın', '👑', 'streak', 100, 13),
  ('lessons_10', 'Meraklı', '10 ders tamamladın', '🧠', 'volume', 10, 20),
  ('lessons_50', 'Düzenli', '50 ders tamamladın', '🎓', 'volume', 50, 21),
  ('lessons_100', 'Akademisyen', '100 ders tamamladın', '🏆', 'volume', 100, 22),
  ('reviews_50', 'Tekrarcı', '50 flashcard tekrarladın', '📚', 'volume', 50, 23),
  ('reviews_500', 'Hafıza Ustası', '500 flashcard tekrarladın', '🎯', 'volume', 500, 24),
  ('first_mastery', 'İlk Ustalık', 'Bir kavramı %100 mastery yaptın', '⭐', 'mastery', 1, 30),
  ('mastery_10', 'On Usta', '10 kavramda ustalaştın', '⭐⭐', 'mastery', 10, 31),
  ('quiz_perfect', 'Mükemmel', 'Bir quizden %100 aldın', '💯', 'mastery', 1, 32),
  ('quiz_streak_5', 'İsabet', '5 quiz üst üste >%80 aldın', '🎯', 'mastery', 5, 33),
  ('errors_resolved_10', 'Hatadan Öğrenen', '10 hatayı kalıcı çözdün', '🔍', 'mastery', 10, 34),
  ('first_pdf', 'Yükledikçe', 'İlk PDF yükledin', '📄', 'exploration', 1, 40),
  ('pomodoro_5', 'Odaklanma', '5 Pomodoro tamamladın', '🍅', 'volume', 5, 50),
  ('reflection_7', 'Düşünen', '7 gün üst üste yansıma yazdın', '📖', 'mastery', 7, 51),
  ('voice_lesson_first', 'Sesli', 'İlk sesli dersini aldın', '🎙️', 'exploration', 1, 60),
  ('night_owl', 'Gece Kuşu', 'Gece 23:00-04:00 arası ders', '🦉', 'exploration', 1, 70),
  ('early_bird', 'Erkenci', 'Sabah 05:00-08:00 arası ders', '🐦', 'exploration', 1, 71)
on conflict (id) do nothing;

-- ---- USER ACHIEVEMENTS — kullanıcının kazandıkları ----
create table if not exists public.user_achievements (
  user_id uuid not null references profiles(id) on delete cascade,
  achievement_id text not null references achievements(id) on delete cascade,
  earned_at timestamptz default now(),
  primary key (user_id, achievement_id)
);

create index if not exists idx_user_achievements on user_achievements(user_id, earned_at desc);

alter table public.user_achievements enable row level security;
create policy if not exists "users_own_achievements" on user_achievements
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---- FOCUS SESSIONS — Pomodoro / deep work kayıtları ----
create table if not exists public.focus_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  subject_id uuid references subjects(id) on delete set null,
  type text not null check (type in ('pomodoro', 'deep_work', 'review_block')),
  planned_duration_minutes int not null,
  actual_duration_minutes int,
  completed boolean default false,
  interrupted_count int default 0,                -- kaç kez başka sekmeye geçti vb.
  notes text,
  started_at timestamptz default now(),
  completed_at timestamptz
);

create index if not exists idx_focus_user on focus_sessions(user_id, started_at desc);

alter table public.focus_sessions enable row level security;
create policy if not exists "users_own_focus" on focus_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---- WOOP GOALS — Wish / Outcome / Obstacle / Plan (mental contrasting) ----
create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  subject_id uuid references subjects(id) on delete set null,
  wish text not null,                              -- "Almanca B1'i geçmek"
  outcome text not null,                           -- "Erasmus için Almanya'ya gitmek"
  obstacle text,                                   -- "Düzenli çalışmamak, kelime ezberi sıkıcı"
  plan text,                                       -- "Eğer hafta içi akşam 21'de olursam, Anki açacağım"
  target_date date,
  completed boolean default false,
  completed_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists idx_goals_user on goals(user_id, created_at desc);

alter table public.goals enable row level security;
create policy if not exists "users_own_goals" on goals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---- PUSH TOKENS — Expo Push notifications için ----
create table if not exists public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  token text not null,
  device_info jsonb,                               -- {platform, model, app_version}
  is_active boolean default true,
  last_used_at timestamptz default now(),
  created_at timestamptz default now(),
  unique(user_id, token)
);

create index if not exists idx_tokens_user_active on push_tokens(user_id, is_active);

alter table public.push_tokens enable row level security;
create policy if not exists "users_own_tokens" on push_tokens
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---- STREAKS tablosu (varsa kontrol, yoksa ekle) ----
create table if not exists public.streaks (
  user_id uuid primary key references profiles(id) on delete cascade,
  current_streak int default 0,
  longest_streak int default 0,
  last_activity_date date,
  updated_at timestamptz default now()
);

alter table public.streaks enable row level security;
create policy if not exists "users_own_streak" on streaks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---- STREAK HESAPLAMA TRIGGER (lesson tamamlandığında çalışır) ----
create or replace function public.update_streak_on_lesson()
returns trigger
language plpgsql
security definer
as $$
declare
  v_today date := current_date;
  v_yesterday date := current_date - interval '1 day';
  v_last date;
  v_current int;
  v_longest int;
begin
  if new.status != 'completed' or old.status = 'completed' then
    return new;
  end if;

  select last_activity_date, current_streak, longest_streak
    into v_last, v_current, v_longest
    from streaks where user_id = new.user_id;

  if v_last is null then
    -- ilk activity
    insert into streaks(user_id, current_streak, longest_streak, last_activity_date)
      values(new.user_id, 1, 1, v_today)
      on conflict (user_id) do update
        set current_streak = 1, longest_streak = greatest(streaks.longest_streak, 1),
            last_activity_date = v_today, updated_at = now();
  elsif v_last = v_today then
    -- bugün zaten saydı, dokunma
    null;
  elsif v_last = v_yesterday then
    -- ardışık gün
    update streaks
       set current_streak = current_streak + 1,
           longest_streak = greatest(longest_streak, current_streak + 1),
           last_activity_date = v_today,
           updated_at = now()
       where user_id = new.user_id;
  else
    -- seri kırıldı
    update streaks
       set current_streak = 1,
           last_activity_date = v_today,
           updated_at = now()
       where user_id = new.user_id;
  end if;

  return new;
end $$;

drop trigger if exists trg_streak_on_lesson on lessons;
create trigger trg_streak_on_lesson
  after update on lessons
  for each row
  execute function public.update_streak_on_lesson();

-- ---- ACHIEVEMENT CHECKER RPC (manuel veya cron'la çağrılır) ----
create or replace function public.check_achievements(p_user_id uuid)
returns table (achievement_id text, just_earned boolean)
language plpgsql
security definer
as $$
declare
  v_already record;
  v_lessons int;
  v_completed_lessons int;
  v_quizzes int;
  v_perfect_quizzes int;
  v_reviews int;
  v_mastered int;
  v_resolved int;
  v_pomodoro int;
  v_streak_current int;
  v_pdf_count int;
  v_voice_count int;
  v_reflection_count int;
  v_night_lesson_count int;
  v_morning_lesson_count int;
  rec record;
  v_should_have boolean;
begin
  -- Önce metrikleri topla
  select count(*) into v_lessons from lessons where user_id = p_user_id;
  select count(*) into v_completed_lessons from lessons where user_id = p_user_id and status = 'completed';
  select count(*) into v_quizzes from quizzes where user_id = p_user_id;
  select count(distinct qa.quiz_id) into v_perfect_quizzes
    from quiz_attempts qa
    group by qa.quiz_id, qa.user_id
    having qa.user_id = p_user_id
      and avg(case when qa.is_correct then 1.0 else 0.0 end) = 1.0;
  select count(*) into v_reviews from flashcard_reviews where user_id = p_user_id;
  select count(*) into v_mastered from progress
    where user_id = p_user_id and mastery_score >= 100;
  select count(*) into v_resolved from error_portfolio
    where user_id = p_user_id and resolved = true;
  select count(*) into v_pomodoro from focus_sessions
    where user_id = p_user_id and type = 'pomodoro' and completed = true;
  select coalesce(current_streak, 0) into v_streak_current from streaks where user_id = p_user_id;
  select count(*) into v_pdf_count from documents where user_id = p_user_id;
  select count(*) into v_voice_count from messages m
    join lessons l on l.id = m.lesson_id
    where l.user_id = p_user_id and m.metadata::text like '%voice%';
  -- Reflection 7-day
  select count(*) into v_reflection_count from reflections
    where user_id = p_user_id and date >= current_date - interval '7 days';
  -- Night/morning owl
  select count(*) into v_night_lesson_count from lessons
    where user_id = p_user_id
      and (extract(hour from started_at) >= 23 or extract(hour from started_at) < 4);
  select count(*) into v_morning_lesson_count from lessons
    where user_id = p_user_id
      and extract(hour from started_at) between 5 and 8;

  -- Her achievement için kontrol et
  for rec in select * from achievements where is_active = true loop
    -- Hak ediyor mu?
    v_should_have := case rec.id
      when 'first_lesson' then v_lessons >= 1
      when 'first_quiz' then v_quizzes >= 1
      when 'first_review' then v_reviews >= 1
      when 'first_pdf' then v_pdf_count >= 1
      when 'voice_lesson_first' then v_voice_count >= 1
      when 'streak_3' then v_streak_current >= 3
      when 'streak_7' then v_streak_current >= 7
      when 'streak_30' then v_streak_current >= 30
      when 'streak_100' then v_streak_current >= 100
      when 'lessons_10' then v_completed_lessons >= 10
      when 'lessons_50' then v_completed_lessons >= 50
      when 'lessons_100' then v_completed_lessons >= 100
      when 'reviews_50' then v_reviews >= 50
      when 'reviews_500' then v_reviews >= 500
      when 'first_mastery' then v_mastered >= 1
      when 'mastery_10' then v_mastered >= 10
      when 'quiz_perfect' then v_perfect_quizzes >= 1
      when 'errors_resolved_10' then v_resolved >= 10
      when 'pomodoro_5' then v_pomodoro >= 5
      when 'reflection_7' then v_reflection_count >= 7
      when 'night_owl' then v_night_lesson_count >= 1
      when 'early_bird' then v_morning_lesson_count >= 1
      else false
    end;

    if v_should_have then
      select 1 into v_already from user_achievements
        where user_id = p_user_id and achievement_id = rec.id;

      if not found then
        insert into user_achievements(user_id, achievement_id)
          values(p_user_id, rec.id);
        achievement_id := rec.id;
        just_earned := true;
        return next;
      end if;
    end if;
  end loop;
end $$;

grant execute on function public.check_achievements to authenticated, service_role;

-- ---- WEEKLY METRICS RPC ----
create or replace function public.get_weekly_metrics(
  p_user_id uuid,
  p_week_start date
)
returns table (
  total_minutes int,
  total_lessons int,
  total_reviews int,
  total_quiz_attempts int,
  quiz_accuracy numeric,
  most_used_technique_id uuid,
  most_used_technique_name text,
  most_active_subject_id uuid,
  most_active_subject_name text,
  best_day date
)
language sql
stable
security definer
as $$
  with week_lessons as (
    select * from lessons
    where user_id = p_user_id
      and started_at >= p_week_start
      and started_at < p_week_start + interval '7 days'
  )
  select
    (select coalesce(sum(extract(epoch from (coalesce(completed_at, started_at + interval '5 minutes') - started_at)) / 60), 0)::int from week_lessons) as total_minutes,
    (select count(*)::int from week_lessons) as total_lessons,
    (select count(*)::int from flashcard_reviews
      where user_id = p_user_id
        and created_at >= p_week_start
        and created_at < p_week_start + interval '7 days') as total_reviews,
    (select count(*)::int from quiz_attempts
      where user_id = p_user_id
        and created_at >= p_week_start
        and created_at < p_week_start + interval '7 days') as total_quiz_attempts,
    (select coalesce(avg(case when is_correct then 1.0 else 0.0 end), 0)::numeric from quiz_attempts
      where user_id = p_user_id
        and created_at >= p_week_start
        and created_at < p_week_start + interval '7 days') as quiz_accuracy,
    (select t.id from week_lessons l
      join techniques t on t.id = l.technique_id
      group by t.id, t.name
      order by count(*) desc limit 1) as most_used_technique_id,
    (select t.name from week_lessons l
      join techniques t on t.id = l.technique_id
      group by t.id, t.name
      order by count(*) desc limit 1) as most_used_technique_name,
    (select s.id from week_lessons l
      join subjects s on s.id = l.subject_id
      group by s.id, s.name
      order by count(*) desc limit 1) as most_active_subject_id,
    (select s.name from week_lessons l
      join subjects s on s.id = l.subject_id
      group by s.id, s.name
      order by count(*) desc limit 1) as most_active_subject_name,
    (select date(started_at) from week_lessons
      group by date(started_at)
      order by count(*) desc limit 1) as best_day;
$$;

grant execute on function public.get_weekly_metrics to authenticated, service_role;
