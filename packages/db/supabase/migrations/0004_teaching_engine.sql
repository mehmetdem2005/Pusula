-- ============================================================================
-- Kavra — Teaching Engine DB Eklemeleri
-- Migration: 0004_teaching_engine
-- ============================================================================

-- ---- BANDIT: Her kullanıcı-teknik çifti için arm state ----
create table public.technique_arms (
  user_id uuid not null references profiles(id) on delete cascade,
  technique_id uuid not null references techniques(id) on delete cascade,
  alpha numeric(10, 4) not null default 1.0,          -- Beta distribution: başarılı kullanımlar + 1
  beta numeric(10, 4) not null default 1.0,           -- Başarısız kullanımlar + 1
  total_uses int not null default 0,
  total_successes int not null default 0,
  last_used_at timestamptz,
  avg_rating numeric(3, 2),                           -- Son N kullanımın ortalama rating'i
  last_context text,                                   -- Son kullanıldığı context
  metadata jsonb default '{}'::jsonb,
  primary key (user_id, technique_id)
);

create index idx_arms_user on technique_arms(user_id, last_used_at desc);

alter table technique_arms enable row level security;
create policy "users_own_arms" on technique_arms
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---- ENGINE DECISIONS: Her ders için engine'in aldığı kararı logla ----
create table public.engine_decisions (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references lessons(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  detected_context text not null,                      -- 'first_exposure' | 'review' | 'weak_spot' vs
  candidate_count int,                                 -- Context'ten dönen aday sayısı
  selected_technique_id uuid references techniques(id),
  selected_behavior_codes text[] default '{}',        -- Aktif behavior'lar: ['C2-T02', 'C3-T04']
  bandit_sample_score numeric,                        -- Thompson sample değeri
  reasoning jsonb,                                     -- Debug için: {intent, mastery, time_of_day, ...}
  rag_chunks_used int default 0,
  created_at timestamptz default now()
);

create index idx_decisions_lesson on engine_decisions(lesson_id, created_at desc);
create index idx_decisions_user on engine_decisions(user_id, created_at desc);

alter table engine_decisions enable row level security;
create policy "users_own_decisions" on engine_decisions
  for select using (auth.uid() = user_id);

-- ---- PROGRESS ek alanları ----
alter table progress add column if not exists confidence numeric(3, 2) default 0.5;  -- 0-1
alter table progress add column if not exists last_context text;

-- ---- SUBJECTS ek alanları (exam prep, hedef) ----
alter table subjects add column if not exists exam_date date;
alter table subjects add column if not exists total_study_minutes int default 0;

-- ---- INTENT CLASSIFICATION CACHE ----
-- Kullanıcı mesajlarını sınıflandırırken Groq çağrısını cache'le
create table public.intent_cache (
  message_hash text primary key,                       -- SHA256
  intent text not null,
  confidence numeric(3, 2),
  created_at timestamptz default now()
);

-- Cache 30 gün sonra temizlensin (cron)
create index idx_intent_cache_cleanup on intent_cache(created_at);

-- ---- SIMILAR-CONCEPTS FUNCTION (RAG için) ----
create or replace function public.match_document_chunks(
  query_embedding vector(1536),
  match_user_id uuid,
  match_subject_id uuid default null,
  match_threshold float default 0.7,
  match_count int default 5
)
returns table (
  chunk_id uuid,
  document_id uuid,
  content text,
  page_number int,
  similarity float
)
language sql
stable
security definer
as $$
  select
    c.id as chunk_id,
    c.document_id,
    c.content,
    c.page_number,
    1 - (c.embedding <=> query_embedding) as similarity
  from document_chunks c
  inner join documents d on d.id = c.document_id
  where
    d.user_id = match_user_id
    and (match_subject_id is null or d.subject_id = match_subject_id)
    and 1 - (c.embedding <=> query_embedding) > match_threshold
  order by c.embedding <=> query_embedding
  limit match_count;
$$;

grant execute on function public.match_document_chunks to authenticated, service_role;

-- ---- CONCEPT SEARCH FUNCTION ----
create or replace function public.match_concepts(
  query_embedding vector(1536),
  match_user_id uuid,
  match_subject_id uuid default null,
  match_threshold float default 0.7,
  match_count int default 5
)
returns table (
  concept_id uuid,
  name text,
  description text,
  similarity float
)
language sql
stable
security definer
as $$
  select
    c.id as concept_id,
    c.name,
    c.description,
    1 - (c.embedding <=> query_embedding) as similarity
  from concepts c
  inner join subjects s on s.id = c.subject_id
  where
    s.user_id = match_user_id
    and (match_subject_id is null or s.id = match_subject_id)
    and c.embedding is not null
    and 1 - (c.embedding <=> query_embedding) > match_threshold
  order by c.embedding <=> query_embedding
  limit match_count;
$$;

grant execute on function public.match_concepts to authenticated, service_role;
