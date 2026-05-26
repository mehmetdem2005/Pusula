-- ============================================================================
-- Kavra — Faz 9: Book Reader + Language Learning
-- Migration: 0009_books_and_vocabulary
-- ============================================================================

-- ---- BOOKS (kullanıcının yüklediği kitaplar) ----
create table if not exists public.books (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  -- Eğer library_documents'tan kaynaklıysa
  library_document_id uuid references library_documents(id) on delete set null,

  title text not null,
  author text,
  cover_url text,
  language text not null default 'en',          -- 'en', 'de', 'tr', 'fr' vb
  source_lang text default 'en',                -- okuma dili
  target_lang text default 'tr',                -- kullanıcının ana dili (çeviri için)

  format text not null check (format in ('epub', 'pdf', 'txt')),
  storage_path text,                            -- Supabase Storage path

  total_pages int,
  total_words int,
  estimated_minutes int,                        -- ortalama okuma süresi

  -- İlerleme
  current_cfi text,                             -- EPUB için CFI canonical fragment id
  current_page int default 0,
  current_position numeric default 0,           -- 0..1 yüzde
  last_read_at timestamptz,
  total_reading_seconds int default 0,

  -- Durum
  status text default 'not_started' check (status in ('not_started', 'reading', 'finished', 'archived')),

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_books_user_status on books(user_id, status, last_read_at desc);
create index if not exists idx_books_user_lang on books(user_id, language);

alter table public.books enable row level security;
create policy "users_own_books" on books for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---- BOOK SENTENCES (preprocessed: cümle bazında pozisyon + audio) ----
-- Curated katalog kitaplarında bu tablo dolu olur (paylaşılan).
-- Kullanıcı yüklemelerinde lazy doldurur (chapter okurken).
create table if not exists public.book_sentences (
  id uuid primary key default gen_random_uuid(),
  -- Eğer library_documents'taysa shared, eğer user book ise per-user
  library_document_id uuid references library_documents(id) on delete cascade,
  user_book_id uuid references books(id) on delete cascade,

  chapter_index int not null,
  sentence_index int not null,                  -- chapter içinde sıra
  text text not null,
  word_count int,

  -- Audio cache (curated için shared)
  tts_voice_id text,                            -- 'azure-en-AriaNeural' vb
  audio_url text,                               -- Supabase Storage path
  duration_ms int,
  word_timings jsonb,                           -- [{word, startMs, endMs}, ...]

  created_at timestamptz default now(),

  check (library_document_id is not null or user_book_id is not null)
);

create index if not exists idx_sentences_lib on book_sentences(library_document_id, chapter_index, sentence_index)
  where library_document_id is not null;
create index if not exists idx_sentences_user on book_sentences(user_book_id, chapter_index, sentence_index)
  where user_book_id is not null;

alter table public.book_sentences enable row level security;

-- Library kitap cümleleri herkese açık (audio cache shared)
create policy "all_users_read_lib_sentences" on book_sentences
  for select using (library_document_id is not null);

-- User book cümleleri sadece sahibine
create policy "users_own_book_sentences" on book_sentences
  for all using (
    user_book_id is not null
    and exists (select 1 from books where id = user_book_id and user_id = auth.uid())
  );

-- ---- USER VOCABULARY (kişisel sözcük dağarcığı, FSRS bağlı) ----
create table if not exists public.user_vocabulary (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,

  -- Sözcük (lemma form)
  word text not null,
  language text not null default 'en',
  lemma text,                                   -- "ran" → "run"

  -- Anlam ve telaffuz
  ipa text,
  definitions jsonb,                            -- [{partOfSpeech, definition, example}, ...]
  translations jsonb,                           -- [{lang: 'tr', translations: ['koşmak', 'kaçmak']}]

  -- Bağlam (kelime ilk öğrenildiği cümle)
  source_book_id uuid references books(id) on delete set null,
  source_sentence text,
  source_translation text,

  -- SRS (FSRS-5 ile entegre)
  srs_card_id uuid,                             -- srs_cards tablosuna referans
  encounters int default 1,                     -- kaç kez gördüğü

  -- Durum
  status text default 'learning' check (status in ('new', 'learning', 'reviewing', 'mastered', 'ignored')),

  added_at timestamptz default now(),
  last_seen_at timestamptz default now(),

  unique(user_id, word, language)
);

create index if not exists idx_vocab_user on user_vocabulary(user_id, status, last_seen_at desc);
create index if not exists idx_vocab_book on user_vocabulary(source_book_id);

alter table public.user_vocabulary enable row level security;
create policy "users_own_vocabulary" on user_vocabulary for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---- DICTIONARY CACHE (lookup sonuçları paylaşılır) ----
-- Aynı sözcüğün aynı dil çiftinde tekrar tekrar AI'ya çevrilmesini engellemek için.
create table if not exists public.dictionary_cache (
  id uuid primary key default gen_random_uuid(),
  word text not null,
  source_lang text not null,
  target_lang text not null,

  ipa text,
  pronunciation_audio_url text,
  definitions jsonb,
  translations jsonb,
  examples jsonb,
  synonyms text[],

  source text,                                  -- 'free-dictionary', 'gemini', 'wiktionary'
  hit_count int default 0,
  last_used_at timestamptz default now(),
  created_at timestamptz default now(),

  unique(word, source_lang, target_lang)
);

create index if not exists idx_dict_word on dictionary_cache(word, source_lang, target_lang);
create index if not exists idx_dict_used on dictionary_cache(last_used_at desc);

-- Anyone can read dict cache (it's just public dictionary data)
alter table public.dictionary_cache enable row level security;
create policy "all_users_read_dict" on dictionary_cache for select using (true);

-- ---- SENTENCE TRANSLATION CACHE ----
create table if not exists public.sentence_translation_cache (
  id uuid primary key default gen_random_uuid(),
  source_text_hash text not null,               -- sha256(source_text)
  source_text text not null,
  source_lang text not null,
  target_lang text not null,

  translation text not null,
  alternatives jsonb,                           -- [{translation, confidence}, ...]
  notes text,                                   -- AI'ın açıklaması (deyim, kayıt vb)

  model text not null,                          -- 'gemini-flash' veya 'claude-sonnet'
  hit_count int default 0,
  created_at timestamptz default now(),

  unique(source_text_hash, source_lang, target_lang)
);

create index if not exists idx_sent_trans_hash on sentence_translation_cache(source_text_hash);

alter table public.sentence_translation_cache enable row level security;
create policy "all_users_read_sent_trans" on sentence_translation_cache for select using (true);

-- ---- WORD FREQUENCY LISTS (En İyi 500/1000 - Linga özelliği) ----
create table if not exists public.word_frequency (
  id uuid primary key default gen_random_uuid(),
  language text not null,
  word text not null,
  rank int not null,                            -- 1 = en sık
  frequency_per_million numeric,
  cefr_level text,                              -- A1, A2, B1, B2, C1, C2

  unique(language, word)
);

create index if not exists idx_freq_lang_rank on word_frequency(language, rank);

alter table public.word_frequency enable row level security;
create policy "all_users_read_freq" on word_frequency for select using (true);

-- ---- READING SESSIONS (oturum başına metrik) ----
create table if not exists public.reading_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  book_id uuid not null references books(id) on delete cascade,

  started_at timestamptz default now(),
  ended_at timestamptz,
  duration_seconds int,

  start_position numeric,                       -- 0..1
  end_position numeric,
  words_looked_up int default 0,
  sentences_translated int default 0,
  words_added_to_vocab int default 0
);

create index if not exists idx_reading_sessions_user on reading_sessions(user_id, started_at desc);
create index if not exists idx_reading_sessions_book on reading_sessions(book_id, started_at desc);

alter table public.reading_sessions enable row level security;
create policy "users_own_sessions" on reading_sessions for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---- BOOK BOOKMARKS ----
create table if not exists public.book_bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  book_id uuid not null references books(id) on delete cascade,

  cfi text,                                     -- EPUB için CFI
  page int,                                     -- PDF için
  position numeric,                             -- 0..1

  selected_text text,
  note text,
  color text default '#F59E0B',

  created_at timestamptz default now()
);

create index if not exists idx_bookmarks_book on book_bookmarks(book_id, created_at desc);

alter table public.book_bookmarks enable row level security;
create policy "users_own_bookmarks" on book_bookmarks for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---- USER VOCABULARY GOAL TRACKING ----
do $$
begin
  if not exists (select 1 from information_schema.columns
                  where table_name = 'profiles' and column_name = 'daily_word_goal') then
    alter table profiles add column daily_word_goal int default 10;
    alter table profiles add column reading_languages text[] default array['en']::text[];
  end if;
end $$;

-- ---- BOOK STORAGE BUCKET ----
insert into storage.buckets (id, name, public)
  values ('books', 'books', false)
  on conflict (id) do nothing;

create policy if not exists "users_read_own_books_storage" on storage.objects
  for select using (
    bucket_id = 'books'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy if not exists "users_upload_own_books" on storage.objects
  for insert with check (
    bucket_id = 'books'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy if not exists "users_delete_own_books" on storage.objects
  for delete using (
    bucket_id = 'books'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ---- TTS AUDIO BUCKET (cache) ----
insert into storage.buckets (id, name, public)
  values ('book-audio', 'book-audio', true)    -- public read for shared cache
  on conflict (id) do nothing;

create policy if not exists "public_read_book_audio" on storage.objects
  for select using (bucket_id = 'book-audio');

create policy if not exists "service_writes_book_audio" on storage.objects
  for insert with check (
    bucket_id = 'book-audio' and auth.role() = 'service_role'
  );

-- ---- SEED ENGLISH WORD FREQUENCY (top 100, demo) ----
-- Production'da kaikki/COCA dump'ı yüklenir. Burada örnek seed.
insert into word_frequency (language, word, rank, cefr_level) values
  ('en', 'the', 1, 'A1'), ('en', 'be', 2, 'A1'), ('en', 'to', 3, 'A1'),
  ('en', 'of', 4, 'A1'), ('en', 'and', 5, 'A1'), ('en', 'a', 6, 'A1'),
  ('en', 'in', 7, 'A1'), ('en', 'that', 8, 'A1'), ('en', 'have', 9, 'A1'),
  ('en', 'i', 10, 'A1'), ('en', 'it', 11, 'A1'), ('en', 'for', 12, 'A1'),
  ('en', 'not', 13, 'A1'), ('en', 'on', 14, 'A1'), ('en', 'with', 15, 'A1'),
  ('en', 'he', 16, 'A1'), ('en', 'as', 17, 'A1'), ('en', 'you', 18, 'A1'),
  ('en', 'do', 19, 'A1'), ('en', 'at', 20, 'A1')
on conflict (language, word) do nothing;
