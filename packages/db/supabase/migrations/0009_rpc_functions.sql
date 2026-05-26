-- ============================================================================
-- RPC Functions for Faz 9
-- ============================================================================

-- Vocabulary encounter sayısını artır
create or replace function public.increment_vocab_encounters(
  p_user_id uuid,
  p_word text,
  p_lang text
) returns void
language sql
security definer
as $$
  update user_vocabulary
  set encounters = encounters + 1,
      last_seen_at = now()
  where user_id = p_user_id
    and word = lower(p_word)
    and language = p_lang;
$$;

grant execute on function public.increment_vocab_encounters to authenticated, service_role;

-- Kitap okuma süresini artır
create or replace function public.increment_book_reading_time(
  p_book_id uuid,
  p_user_id uuid,
  p_seconds int
) returns void
language sql
security definer
as $$
  update books
  set total_reading_seconds = coalesce(total_reading_seconds, 0) + p_seconds,
      last_read_at = now()
  where id = p_book_id
    and user_id = p_user_id;
$$;

grant execute on function public.increment_book_reading_time to authenticated, service_role;

-- Library document download counter
create or replace function public.increment_library_downloads(
  p_document_id uuid
) returns void
language sql
security definer
as $$
  update library_documents
  set download_count = coalesce(download_count, 0) + 1
  where id = p_document_id;
$$;

grant execute on function public.increment_library_downloads to authenticated, service_role;
