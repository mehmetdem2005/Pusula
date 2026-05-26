-- ============================================================================
-- Kavra — Faz 8: Multi-Auth + Roles + Admin Panel + Custom Content
-- Migration: 0008_admin_and_auth
-- ============================================================================

-- ---- USER ROLES — Super admin / admin / user ----
do $$
begin
  if not exists (select 1 from information_schema.columns
                  where table_name = 'profiles' and column_name = 'role') then
    alter table profiles add column role text not null default 'user'
      check (role in ('super_admin', 'admin', 'user'));
    alter table profiles add column phone_number text;
    alter table profiles add column phone_verified_at timestamptz;
    alter table profiles add column auth_providers jsonb default '[]'::jsonb;
    -- Hangi providerlerden giriş yapmış: ['google', 'email', 'phone', 'facebook', 'magic_link']
  end if;
end $$;

create index if not exists idx_profiles_role on profiles(role) where role != 'user';
create index if not exists idx_profiles_phone on profiles(phone_number) where phone_number is not null;

-- ---- IS_ADMIN HELPERS ----
create or replace function public.is_admin(p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
as $$
  select coalesce(
    (select role in ('super_admin', 'admin') from profiles where id = p_user_id),
    false
  );
$$;

create or replace function public.is_super_admin(p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
as $$
  select coalesce(
    (select role = 'super_admin' from profiles where id = p_user_id),
    false
  );
$$;

grant execute on function public.is_admin to authenticated, service_role;
grant execute on function public.is_super_admin to authenticated, service_role;

-- ---- AUTOMATIC FIRST USER → SUPER ADMIN ----
-- İlk kayıt olan kullanıcı otomatik super_admin olur
create or replace function public.assign_first_user_super_admin()
returns trigger
language plpgsql
security definer
as $$
declare
  user_count int;
begin
  select count(*) into user_count from profiles;
  -- Yeni kullanıcı bizim trigger çalışırken zaten kayıtlı olduğu için 1 = ilk
  if user_count = 1 then
    update profiles set role = 'super_admin' where id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_first_user_super_admin on profiles;
create trigger trg_first_user_super_admin
  after insert on profiles
  for each row
  execute function assign_first_user_super_admin();

-- ---- OTP CODES (telefon + e-posta doğrulama) ----
create table if not exists public.otp_codes (
  id uuid primary key default gen_random_uuid(),
  identifier text not null,                   -- telefon ya da e-posta
  identifier_type text not null check (identifier_type in ('phone', 'email')),
  code_hash text not null,                    -- bcrypt hash, plaintext değil
  purpose text not null check (purpose in ('signup', 'login', 'password_reset', 'phone_verify', 'email_verify')),
  attempts int default 0,
  max_attempts int default 5,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  ip_address inet,
  user_agent text,
  created_at timestamptz default now()
);

create index if not exists idx_otp_identifier on otp_codes(identifier, purpose) where consumed_at is null;
create index if not exists idx_otp_expires on otp_codes(expires_at);

-- Eski OTP'leri otomatik temizle (24 saat sonra)
create or replace function public.cleanup_expired_otps()
returns void
language sql
as $$
  delete from otp_codes where expires_at < now() - interval '1 day';
$$;

-- RLS — kimse OTP tablosunu okuyamaz, sadece service_role
alter table public.otp_codes enable row level security;

-- ---- ADMIN AUDIT LOG ----
create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid references profiles(id) on delete set null,
  action text not null,                       -- 'user_promoted', 'pdf_uploaded', 'user_banned' vb
  target_type text,                           -- 'user', 'document', 'subject'
  target_id uuid,
  metadata jsonb default '{}'::jsonb,
  ip_address inet,
  created_at timestamptz default now()
);

create index if not exists idx_admin_audit_admin on admin_audit_logs(admin_user_id, created_at desc);
create index if not exists idx_admin_audit_action on admin_audit_logs(action, created_at desc);

alter table public.admin_audit_logs enable row level security;
create policy "admins_read_audit_logs" on admin_audit_logs
  for select using (is_admin());

-- ---- CUSTOM SUBJECTS (kullanıcı tanımlı) ----
-- Subjects tablosu zaten var, ama kullanıcı kendi konusunu/kavramını ekleyebilsin
-- diye custom_emoji ve custom_color alanı ekleyelim
do $$
begin
  if not exists (select 1 from information_schema.columns
                  where table_name = 'subjects' and column_name = 'is_custom') then
    alter table subjects add column is_custom boolean default true;
    alter table subjects add column custom_icon_name text;
    -- Lucide icon name (eğer Lucide kullanılırsa) örn: 'book-open', 'flask-conical'
    alter table subjects add column emoji text;
    -- Kullanıcı emoji seçmek isterse (Almanca için 🇩🇪 vb)
  end if;
end $$;

-- Suggested subjects — sistem önerileri (admin tarafından eklenebilir)
create table if not exists public.suggested_subjects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  emoji text,
  icon_name text,                             -- Lucide icon
  color text,                                 -- Hex color
  category text,                              -- 'language', 'science', 'humanities', 'tech', 'art'
  display_order int default 0,
  is_featured boolean default false,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

-- Seed önerilen konular
insert into suggested_subjects (name, description, emoji, icon_name, color, category, display_order, is_featured) values
  ('Almanca A2', 'Goethe sertifikası', '🇩🇪', 'languages', '#CA8A04', 'language', 1, true),
  ('İngilizce', 'Genel İngilizce', '🇬🇧', 'languages', '#1D4ED8', 'language', 2, true),
  ('Matematik', 'YKS / üniversite', '🧮', 'calculator', '#1E1B4B', 'science', 3, true),
  ('Kimya', 'AYT için', '⚗️', 'flask-conical', '#7C3AED', 'science', 4, true),
  ('Biyoloji', 'YKS biyoloji', '🧬', 'dna', '#059669', 'science', 5, true),
  ('Fizik', 'YKS / öğrencilik', '⚛️', 'atom', '#0891B2', 'science', 6, true),
  ('Tarih', 'Türk ve dünya', '📜', 'scroll', '#92400E', 'humanities', 7, true),
  ('Edebiyat', 'Türk edebiyatı', '📚', 'book-open', '#B4452D', 'humanities', 8, true),
  ('Coğrafya', 'Fiziki ve beşeri', '🌍', 'globe', '#0E7490', 'humanities', 9, true),
  ('Felsefe', 'Antik ve modern', '💭', 'lightbulb', '#7C2D12', 'humanities', 10, false),
  ('Yazılım', 'Web/Mobil', '💻', 'code', '#0F172A', 'tech', 11, true),
  ('Veri Bilimi', 'Python + İstatistik', '📊', 'bar-chart', '#1E40AF', 'tech', 12, false),
  ('Resim', 'Çizim ve renk', '🎨', 'palette', '#DB2777', 'art', 13, false),
  ('Müzik Teorisi', 'Notalar ve armoni', '🎵', 'music', '#9333EA', 'art', 14, false),
  ('Stoacılık', 'Marcus Aurelius', '🧘', 'sparkles', '#92400E', 'humanities', 15, false)
on conflict do nothing;

alter table public.suggested_subjects enable row level security;
create policy "all_users_read_suggested" on suggested_subjects
  for select using (true);
create policy "admins_modify_suggested" on suggested_subjects
  for all using (is_admin()) with check (is_admin());

-- ---- ADMIN UPLOADED DOCUMENTS (sistem kütüphanesi) ----
create table if not exists public.library_documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  author text,
  description text,
  cover_image_url text,
  file_path text not null,                    -- storage: library/<filename>.pdf
  file_size_bytes bigint,
  page_count int,
  language text default 'tr',
  category text,                              -- 'textbook', 'novel', 'reference', 'exam_prep'
  subject_tags text[],                        -- ['Almanca', 'A2']
  is_pro_only boolean default false,
  download_count int default 0,
  uploaded_by uuid references profiles(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_library_category on library_documents(category);
create index if not exists idx_library_tags on library_documents using gin(subject_tags);

alter table public.library_documents enable row level security;
create policy "all_users_read_library" on library_documents
  for select using (true);
create policy "admins_manage_library" on library_documents
  for all using (is_admin()) with check (is_admin());

-- Library storage bucket
insert into storage.buckets (id, name, public)
  values ('library', 'library', true)         -- public read for cover images
  on conflict (id) do nothing;

create policy if not exists "public_read_library_storage" on storage.objects
  for select using (bucket_id = 'library');

create policy if not exists "admins_upload_library" on storage.objects
  for insert with check (
    bucket_id = 'library' and is_admin()
  );

create policy if not exists "admins_delete_library" on storage.objects
  for delete using (
    bucket_id = 'library' and is_admin()
  );

-- ---- USER LIBRARY DOWNLOADS (audit + count) ----
create table if not exists public.library_downloads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  document_id uuid not null references library_documents(id) on delete cascade,
  downloaded_at timestamptz default now(),
  unique(user_id, document_id)
);

alter table public.library_downloads enable row level security;
create policy "users_read_own_downloads" on library_downloads
  for select using (auth.uid() = user_id);
create policy "users_record_own_downloads" on library_downloads
  for insert with check (auth.uid() = user_id);

-- ---- BANS (super admin'in kullanıcı yasaklama yetkisi) ----
do $$
begin
  if not exists (select 1 from information_schema.columns
                  where table_name = 'profiles' and column_name = 'banned_at') then
    alter table profiles add column banned_at timestamptz;
    alter table profiles add column ban_reason text;
  end if;
end $$;

-- ---- AI IMAGES (sohbette üretilen görseller, Pro feature) ----
create table if not exists public.ai_images (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  conversation_id uuid references conversations(id) on delete cascade,
  prompt text not null,
  refined_prompt text,                        -- AI'nın iyileştirdiği prompt
  model text not null,                        -- 'flux-schnell', 'sdxl', 'gpt-image' vb
  image_url text,                             -- Supabase Storage path
  thumbnail_url text,
  width int,
  height int,
  generation_time_ms int,
  cost_credits int default 1,                 -- kullanıcı kotası için
  created_at timestamptz default now()
);

create index if not exists idx_ai_images_user on ai_images(user_id, created_at desc);
create index if not exists idx_ai_images_conv on ai_images(conversation_id);

alter table public.ai_images enable row level security;
create policy "users_own_ai_images" on ai_images
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- AI image storage
insert into storage.buckets (id, name, public)
  values ('ai-images', 'ai-images', false)
  on conflict (id) do nothing;

create policy if not exists "users_read_own_ai_images_storage" on storage.objects
  for select using (
    bucket_id = 'ai-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ---- USAGE QUOTAS (AI image, voice clone vs) ----
do $$
begin
  if not exists (select 1 from information_schema.columns
                  where table_name = 'usage_quotas' and column_name = 'ai_images_generated') then
    alter table usage_quotas add column ai_images_generated int default 0;
  end if;
end $$;
