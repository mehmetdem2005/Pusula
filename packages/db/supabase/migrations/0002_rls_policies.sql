-- ============================================================================
-- Kavra — Row Level Security Policies
-- Migration: 0002_rls_policies
-- ============================================================================

-- Tüm kullanıcı tablolarında RLS aktif
alter table profiles enable row level security;
alter table user_preferences enable row level security;
alter table api_keys enable row level security;
alter table subjects enable row level security;
alter table concepts enable row level security;
alter table concept_relations enable row level security;
alter table lessons enable row level security;
alter table messages enable row level security;
alter table progress enable row level security;
alter table flashcards enable row level security;
alter table generated_flashcards enable row level security;
alter table quiz_attempts enable row level security;
alter table error_portfolio enable row level security;
alter table reflections enable row level security;
alter table goals enable row level security;
alter table streaks enable row level security;
alter table achievements enable row level security;
alter table documents enable row level security;
alter table document_chunks enable row level security;
alter table images enable row level security;
alter table audio_recordings enable row level security;
alter table personalities enable row level security;
alter table study_plans enable row level security;
alter table study_sessions enable row level security;
alter table focus_sessions enable row level security;
alter table weekly_reports enable row level security;
alter table voice_clones enable row level security;
alter table inbox_items enable row level security;
alter table exports enable row level security;
alter table usage_logs enable row level security;
alter table subscriptions enable row level security;

-- Paylaşılan tablolar: herkes okuyabilir, kimse yazamaz (service_role hariç)
alter table modules enable row level security;
alter table techniques enable row level security;
alter table llm_models enable row level security;

create policy "modules_read_all" on modules for select using (true);
create policy "techniques_read_all" on techniques for select using (true);
create policy "llm_models_read_active" on llm_models for select using (is_active = true);

-- ============================================================================
-- Kullanıcı kendi verisine tam erişim
-- ============================================================================

create policy "users_own_profile" on profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "users_own_prefs" on user_preferences
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "users_own_keys" on api_keys
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "users_own_subjects" on subjects
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Concepts: kullanıcının subject'ine ait
create policy "users_own_concepts" on concepts
  for all using (
    exists (select 1 from subjects s where s.id = concepts.subject_id and s.user_id = auth.uid())
  );

create policy "users_own_concept_relations" on concept_relations
  for all using (
    exists (select 1 from concepts c
            join subjects s on s.id = c.subject_id
            where c.id = concept_relations.from_concept_id and s.user_id = auth.uid())
  );

create policy "users_own_lessons" on lessons
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Messages: lesson'ın sahibi
create policy "users_own_messages" on messages
  for all using (
    exists (select 1 from lessons l where l.id = messages.lesson_id and l.user_id = auth.uid())
  );

create policy "users_own_progress" on progress
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "users_own_flashcards" on flashcards
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "users_own_gen_flashcards" on generated_flashcards
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "users_own_quiz" on quiz_attempts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "users_own_errors" on error_portfolio
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "users_own_reflections" on reflections
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "users_own_goals" on goals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "users_own_streaks" on streaks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "users_own_achievements" on achievements
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "users_own_documents" on documents
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "users_own_doc_chunks" on document_chunks
  for all using (
    exists (select 1 from documents d where d.id = document_chunks.document_id and d.user_id = auth.uid())
  );

create policy "users_own_images" on images
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "users_own_audio" on audio_recordings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Personalities: preset'ler herkese açık, custom'lar sadece sahibine
create policy "personalities_read" on personalities
  for select using (is_preset = true or user_id = auth.uid());
create policy "personalities_write_own" on personalities
  for insert with check (auth.uid() = user_id);
create policy "personalities_update_own" on personalities
  for update using (auth.uid() = user_id and not is_preset);
create policy "personalities_delete_own" on personalities
  for delete using (auth.uid() = user_id and not is_preset);

create policy "users_own_plans" on study_plans
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "users_own_sessions" on study_sessions
  for all using (
    exists (select 1 from study_plans p where p.id = study_sessions.plan_id and p.user_id = auth.uid())
  );

create policy "users_own_focus" on focus_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "users_own_reports" on weekly_reports
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "users_own_voice_clones" on voice_clones
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "users_own_inbox" on inbox_items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "users_own_exports" on exports
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "users_own_usage" on usage_logs
  for select using (auth.uid() = user_id);

create policy "users_own_subscription" on subscriptions
  for select using (auth.uid() = user_id);

-- ============================================================================
-- STORAGE POLICIES
-- ============================================================================

-- Bucket'ları migration'da oluştur
insert into storage.buckets (id, name, public) values
  ('user-documents', 'user-documents', false),
  ('user-images', 'user-images', false),
  ('audio-input', 'audio-input', false),
  ('audio-output', 'audio-output', false),
  ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Storage policies: kullanıcı sadece kendi klasörüne yazar/okur
create policy "users_upload_own_documents" on storage.objects
  for insert with check (
    bucket_id = 'user-documents' and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "users_read_own_documents" on storage.objects
  for select using (
    bucket_id = 'user-documents' and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "users_upload_own_images" on storage.objects
  for insert with check (
    bucket_id = 'user-images' and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "users_read_own_images" on storage.objects
  for select using (
    bucket_id = 'user-images' and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "users_upload_own_audio" on storage.objects
  for insert with check (
    bucket_id = 'audio-input' and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "users_read_own_audio" on storage.objects
  for select using (
    bucket_id = 'audio-input' and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars_public_read" on storage.objects
  for select using (bucket_id = 'avatars');

create policy "avatars_own_upload" on storage.objects
  for insert with check (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );
