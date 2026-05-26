-- ============================================================================
-- Kavra — Faz 10: NotebookLM Klonu
-- Migration: 0011_notebooks_and_studio
-- ============================================================================

-- pgvector extension
create extension if not exists vector;

-- ---- NOTEBOOKS (Kavra "Defter") ----
create table if not exists public.notebooks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,

  title text not null,
  description text,
  emoji text default '📓',
  color text default '#1E1B4B',
  language text default 'tr',                -- chat ve özet dili

  is_archived boolean default false,
  is_pinned boolean default false,

  -- Aggregated counts (cached for performance)
  source_count int default 0,
  message_count int default 0,
  generated_content_count int default 0,

  last_accessed_at timestamptz default now(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_notebooks_user
  on notebooks(user_id, is_archived, last_accessed_at desc);

alter table public.notebooks enable row level security;
create policy "users_own_notebooks" on notebooks for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---- NOTEBOOK SOURCES (kaynak: PDF, URL, audio, YouTube, text) ----
create table if not exists public.notebook_sources (
  id uuid primary key default gen_random_uuid(),
  notebook_id uuid not null references notebooks(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,

  source_type text not null check (source_type in (
    'pdf', 'url', 'youtube', 'audio', 'text', 'epub', 'docx'
  )),

  title text not null,
  storage_path text,                          -- Supabase Storage path
  external_url text,                          -- URL/YouTube link
  raw_text text,                              -- text source için doğrudan içerik

  -- Metadata
  metadata jsonb default '{}'::jsonb,         -- author, duration, page_count, etc
  language text,                              -- detected language
  word_count int,
  char_count int,

  -- Processing
  status text default 'pending' check (status in (
    'pending', 'processing', 'ready', 'failed'
  )),
  error_message text,
  processed_at timestamptz,

  -- Chunk count (for UI)
  chunk_count int default 0,

  created_at timestamptz default now()
);

create index if not exists idx_sources_notebook
  on notebook_sources(notebook_id, created_at desc);
create index if not exists idx_sources_status
  on notebook_sources(status) where status in ('pending', 'processing');

alter table public.notebook_sources enable row level security;
create policy "users_own_sources" on notebook_sources for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---- SOURCE CHUNKS (RAG için chunked + embedded) ----
create table if not exists public.source_chunks (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references notebook_sources(id) on delete cascade,
  notebook_id uuid not null references notebooks(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,

  chunk_index int not null,
  text text not null,
  -- 1536d for OpenAI text-embedding-3-small
  embedding vector(1536),

  -- Metadata for citation
  page_number int,
  section_title text,
  start_char int,
  end_char int,
  -- For YouTube/audio
  start_time_ms int,
  end_time_ms int,

  token_count int,
  created_at timestamptz default now(),

  unique(source_id, chunk_index)
);

create index if not exists idx_chunks_source on source_chunks(source_id, chunk_index);
create index if not exists idx_chunks_notebook on source_chunks(notebook_id);

-- pgvector HNSW index (post-create, vector index)
create index if not exists idx_chunks_embedding
  on source_chunks using hnsw (embedding vector_cosine_ops)
  with (m = 16, ef_construction = 64);

alter table public.source_chunks enable row level security;
create policy "users_own_chunks" on source_chunks for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---- NOTEBOOK CHAT MESSAGES (RAG-grounded chat) ----
create table if not exists public.notebook_messages (
  id uuid primary key default gen_random_uuid(),
  notebook_id uuid not null references notebooks(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,

  role text not null check (role in ('user', 'assistant')),
  content text not null,

  -- Citations (for assistant messages)
  citations jsonb default '[]'::jsonb,        -- [{chunk_id, source_id, source_title, snippet}]

  -- LLM meta
  model text,
  tokens_input int,
  tokens_output int,

  created_at timestamptz default now()
);

create index if not exists idx_messages_notebook
  on notebook_messages(notebook_id, created_at);

alter table public.notebook_messages enable row level security;
create policy "users_own_messages" on notebook_messages for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---- GENERATED CONTENT (Studio outputs: podcast, quiz, slides, flashcards) ----
create table if not exists public.generated_content (
  id uuid primary key default gen_random_uuid(),
  notebook_id uuid not null references notebooks(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,

  content_type text not null check (content_type in (
    'audio_overview',     -- Sesli Özet (2-host podcast)
    'video_overview',     -- Videolu Özet (defer)
    'flashcards',         -- Bilgi kartları
    'quiz',               -- Test
    'infographic',        -- İnfografik (Mermaid/SVG)
    'slides',             -- Slayt sunusu
    'summary'             -- Düz metin özet
  )),

  title text not null,
  config jsonb default '{}'::jsonb,           -- duration, language, style, etc
  status text default 'pending' check (status in (
    'pending', 'processing', 'ready', 'failed'
  )),

  -- Output paths/data
  storage_path text,                          -- audio/video/pdf storage
  raw_content jsonb,                          -- structured content (slides JSON, quiz items, flashcards)
  duration_seconds int,                       -- audio için

  -- Processing meta
  source_ids uuid[] default '{}'::uuid[],     -- hangi kaynaklar kullanıldı
  model text,
  generation_seconds int,
  error_message text,

  created_at timestamptz default now(),
  ready_at timestamptz
);

create index if not exists idx_generated_notebook
  on generated_content(notebook_id, created_at desc);
create index if not exists idx_generated_status
  on generated_content(status) where status in ('pending', 'processing');

alter table public.generated_content enable row level security;
create policy "users_own_generated" on generated_content for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---- PODCAST SCRIPTS (audio_overview için detaylı transcript) ----
create table if not exists public.podcast_scripts (
  id uuid primary key default gen_random_uuid(),
  generated_content_id uuid not null references generated_content(id) on delete cascade,

  -- [{speaker: "Aoede", text: "...", audio_offset_ms: 0, duration_ms: 5000}]
  turns jsonb not null,

  total_turns int,
  total_chars int,
  language text,

  created_at timestamptz default now()
);

create index if not exists idx_scripts_content on podcast_scripts(generated_content_id);

alter table public.podcast_scripts enable row level security;
create policy "users_own_scripts" on podcast_scripts for select
  using (
    exists (
      select 1 from generated_content gc
      where gc.id = generated_content_id and gc.user_id = auth.uid()
    )
  );

-- ---- STORAGE BUCKETS ----

-- notebook-sources: PDF/audio/etc kaynaklar (private)
insert into storage.buckets (id, name, public)
  values ('notebook-sources', 'notebook-sources', false)
  on conflict (id) do nothing;

create policy if not exists "users_read_own_sources" on storage.objects
  for select using (
    bucket_id = 'notebook-sources'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy if not exists "users_upload_own_sources" on storage.objects
  for insert with check (
    bucket_id = 'notebook-sources'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy if not exists "users_delete_own_sources" on storage.objects
  for delete using (
    bucket_id = 'notebook-sources'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- notebook-outputs: üretilen podcast/PDF/video (private)
insert into storage.buckets (id, name, public)
  values ('notebook-outputs', 'notebook-outputs', false)
  on conflict (id) do nothing;

create policy if not exists "users_read_own_outputs" on storage.objects
  for select using (
    bucket_id = 'notebook-outputs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy if not exists "service_writes_outputs" on storage.objects
  for insert with check (
    bucket_id = 'notebook-outputs' and auth.role() = 'service_role'
  );

-- ---- HELPER: source aggregate counter ----
create or replace function public.recount_notebook_aggregates(p_notebook_id uuid)
returns void
language sql
security definer
as $$
  update notebooks set
    source_count = (select count(*) from notebook_sources where notebook_id = p_notebook_id),
    message_count = (select count(*) from notebook_messages where notebook_id = p_notebook_id),
    generated_content_count = (select count(*) from generated_content where notebook_id = p_notebook_id and status = 'ready'),
    updated_at = now()
  where id = p_notebook_id;
$$;

grant execute on function public.recount_notebook_aggregates to authenticated, service_role;

-- ---- HELPER: hybrid search (vector + BM25-style with Postgres FTS) ----
create or replace function public.search_chunks_hybrid(
  p_notebook_id uuid,
  p_user_id uuid,
  p_query_embedding vector(1536),
  p_query_text text,
  p_match_count int default 10,
  p_full_text_weight float default 0.3,
  p_semantic_weight float default 0.7
)
returns table (
  id uuid,
  source_id uuid,
  text text,
  page_number int,
  section_title text,
  start_time_ms int,
  end_time_ms int,
  rank_semantic float,
  rank_text float,
  combined_rank float
)
language sql
stable
as $$
  with semantic as (
    select
      c.id,
      c.source_id,
      c.text,
      c.page_number,
      c.section_title,
      c.start_time_ms,
      c.end_time_ms,
      1 - (c.embedding <=> p_query_embedding) as semantic_similarity
    from source_chunks c
    where c.notebook_id = p_notebook_id
      and c.user_id = p_user_id
    order by c.embedding <=> p_query_embedding
    limit p_match_count * 3
  ),
  text_search as (
    select
      c.id,
      ts_rank_cd(
        to_tsvector('simple', unaccent(c.text)),
        plainto_tsquery('simple', unaccent(p_query_text))
      ) as text_rank
    from source_chunks c
    where c.notebook_id = p_notebook_id
      and c.user_id = p_user_id
      and to_tsvector('simple', unaccent(c.text)) @@ plainto_tsquery('simple', unaccent(p_query_text))
  )
  select
    s.id,
    s.source_id,
    s.text,
    s.page_number,
    s.section_title,
    s.start_time_ms,
    s.end_time_ms,
    s.semantic_similarity as rank_semantic,
    coalesce(t.text_rank, 0)::float as rank_text,
    (s.semantic_similarity * p_semantic_weight + coalesce(t.text_rank, 0) * p_full_text_weight)::float as combined_rank
  from semantic s
  left join text_search t on t.id = s.id
  order by combined_rank desc
  limit p_match_count;
$$;

grant execute on function public.search_chunks_hybrid to authenticated, service_role;

-- unaccent extension for Turkish-friendly FTS
create extension if not exists unaccent;
