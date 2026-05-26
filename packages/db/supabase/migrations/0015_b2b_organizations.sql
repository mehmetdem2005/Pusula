-- ============================================================================
-- Kavra — Sprint 8: B2B Kurumsal
-- Migration: 0015_b2b_organizations
-- ============================================================================

-- =============== ORGANIZATIONS (multi-tenant) ============
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),

  -- Identity
  name text not null check (length(name) between 2 and 100),
  slug text unique not null check (slug ~ '^[a-z0-9-]{2,50}$'),
  logo_url text,
  website text,

  -- Type
  org_type text default 'school' check (org_type in (
    'school', 'university', 'company', 'tutoring', 'public_sector', 'nonprofit'
  )),

  -- Billing
  billing_email text,
  billing_address jsonb,
  tax_id text,                                    -- VKN/TCKN

  -- Plan
  plan text default 'team' check (plan in ('team', 'business', 'enterprise')),
  seat_count int default 0,
  max_seats int default 10,
  seats_used int default 0,

  -- Subscription
  stripe_customer_id text unique,
  stripe_subscription_id text,
  subscription_status text default 'trialing' check (subscription_status in (
    'trialing', 'active', 'past_due', 'cancelled', 'paused'
  )),
  trial_ends_at timestamptz,
  current_period_end timestamptz,

  -- SSO config
  sso_enabled boolean default false,
  sso_provider text check (sso_provider in ('google_workspace', 'microsoft_entra', 'saml', 'okta')),
  sso_domain text,                                -- "okul.k12.tr" — bu domain'den gelenler otomatik bu org'a katılır
  sso_metadata jsonb,                             -- SAML metadata, OIDC issuer URL

  -- SCIM config (provisioning)
  scim_enabled boolean default false,
  scim_token_hash text,                           -- bcrypt hash

  -- Compliance
  data_region text default 'eu-frankfurt',
  retention_days int default 730,                 -- KVKK 2 yıl

  -- Settings
  features jsonb default '{
    "allow_public_sharing": false,
    "allow_clan_creation": false,
    "ai_image_generation": true,
    "voice_clone": false,
    "audit_log": true
  }'::jsonb,

  created_at timestamptz default now(),
  created_by uuid references profiles(id),
  metadata jsonb default '{}'::jsonb
);

create index if not exists idx_orgs_slug on organizations(slug);
create index if not exists idx_orgs_sso_domain on organizations(sso_domain) where sso_domain is not null;
create index if not exists idx_orgs_plan on organizations(plan);

alter table public.organizations enable row level security;
create policy "members_read_org" on organizations for select
  using (exists (
    select 1 from organization_members om
    where om.org_id = organizations.id and om.user_id = auth.uid()
  ));
create policy "owners_update_org" on organizations for update
  using (exists (
    select 1 from organization_members om
    where om.org_id = organizations.id and om.user_id = auth.uid() and om.role = 'owner'
  ));

-- =============== ORG MEMBERS ============
create table if not exists public.organization_members (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,

  role text not null default 'member' check (role in (
    'owner', 'admin', 'teacher', 'member', 'student'
  )),

  -- Provisioning
  invited_by uuid references profiles(id),
  invitation_token text unique,
  invitation_email text,
  invitation_status text default 'accepted' check (invitation_status in (
    'pending', 'accepted', 'declined', 'expired'
  )),

  -- SCIM external mapping
  scim_external_id text,                          -- IdP user ID
  scim_active boolean default true,

  -- Stats per org
  joined_at timestamptz default now(),
  last_active_at timestamptz,
  expires_at timestamptz,                         -- süreli üyelik (kontrat bitiş)

  unique(org_id, user_id)
);

create index if not exists idx_orgmembers_user on organization_members(user_id);
create index if not exists idx_orgmembers_org on organization_members(org_id, role);
create index if not exists idx_orgmembers_invitation on organization_members(invitation_token) where invitation_token is not null;
create index if not exists idx_orgmembers_scim on organization_members(scim_external_id) where scim_external_id is not null;

alter table public.organization_members enable row level security;
create policy "members_read_org_members" on organization_members for select
  using (exists (
    select 1 from organization_members om
    where om.org_id = organization_members.org_id and om.user_id = auth.uid()
  ));
create policy "admins_manage_members" on organization_members for all
  using (exists (
    select 1 from organization_members om
    where om.org_id = organization_members.org_id
      and om.user_id = auth.uid()
      and om.role in ('owner', 'admin')
  ));

-- =============== CLASSES (öğretmen-öğrenci grupları) ============
create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,

  name text not null check (length(name) between 2 and 100),
  slug text not null,
  description text,
  emoji text default '📚',
  grade_level text,                               -- '9. sınıf', '11. sınıf', 'Üniversite 1.', 'Yüksek Lisans'
  subject text,                                   -- 'Biyoloji', 'Fizik', 'TYT-AYT'

  teacher_id uuid not null references profiles(id),
  member_count int default 0,
  max_members int default 35,

  -- Lifecycle
  starts_at date,
  ends_at date,
  is_archived boolean default false,

  created_at timestamptz default now(),
  unique(org_id, slug)
);

create index if not exists idx_classes_org on classes(org_id, is_archived);
create index if not exists idx_classes_teacher on classes(teacher_id);

alter table public.classes enable row level security;
create policy "org_members_read_classes" on classes for select
  using (exists (
    select 1 from organization_members om
    where om.org_id = classes.org_id and om.user_id = auth.uid()
  ));
create policy "teachers_manage_classes" on classes for all
  using (auth.uid() = teacher_id or exists (
    select 1 from organization_members om
    where om.org_id = classes.org_id
      and om.user_id = auth.uid()
      and om.role in ('owner', 'admin')
  ));

-- =============== CLASS MEMBERS (öğrenciler) ============
create table if not exists public.class_members (
  class_id uuid not null references classes(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,

  role text default 'student' check (role in ('student', 'co_teacher', 'observer')),
  joined_at timestamptz default now(),

  -- Performance tracking (öğretmen görür)
  total_reviews int default 0,
  current_streak int default 0,
  last_active_at timestamptz,

  primary key (class_id, user_id)
);

create index if not exists idx_classmembers_user on class_members(user_id);

alter table public.class_members enable row level security;
create policy "class_members_read_self" on class_members for select using (
  auth.uid() = user_id
  or exists (select 1 from classes where id = class_members.class_id and teacher_id = auth.uid())
);

-- =============== ASSIGNMENTS (ödevler / atamalar) ============
create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classes(id) on delete cascade,
  teacher_id uuid not null references profiles(id),

  title text not null,
  description text,

  -- Atama tipi: defter ata, sınav ata, podcast dinlet, vb.
  assignment_type text not null check (assignment_type in (
    'notebook', 'flashcards', 'quiz', 'podcast', 'reading', 'custom'
  )),

  -- Hedef (clone'lanacak veya assign edilecek defter/içerik)
  source_notebook_id uuid references notebooks(id) on delete set null,
  source_content_id uuid references generated_content(id) on delete set null,
  custom_url text,

  -- Schedule
  assigned_at timestamptz default now(),
  due_at timestamptz,

  -- Grading
  is_graded boolean default false,
  max_score int default 100,

  -- Status
  is_published boolean default true,

  created_at timestamptz default now()
);

create index if not exists idx_assignments_class on assignments(class_id, due_at);
create index if not exists idx_assignments_teacher on assignments(teacher_id);

alter table public.assignments enable row level security;
create policy "class_members_read_assignments" on assignments for select using (
  exists (select 1 from class_members where class_id = assignments.class_id and user_id = auth.uid())
  or exists (select 1 from classes where id = assignments.class_id and teacher_id = auth.uid())
);
create policy "teachers_manage_assignments" on assignments for all
  using (auth.uid() = teacher_id);

-- =============== ASSIGNMENT SUBMISSIONS ============
create table if not exists public.assignment_submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references assignments(id) on delete cascade,
  student_id uuid not null references profiles(id) on delete cascade,

  status text default 'pending' check (status in (
    'pending', 'in_progress', 'submitted', 'graded', 'late'
  )),

  -- Çıktı (öğrencinin clone'ladığı defter, çözdüğü quiz, vb.)
  result_notebook_id uuid references notebooks(id) on delete set null,
  result_data jsonb,                              -- quiz answers, flashcard stats

  -- Grading
  score numeric(5,2),
  teacher_feedback text,
  graded_at timestamptz,
  graded_by uuid references profiles(id),

  submitted_at timestamptz,
  created_at timestamptz default now(),

  unique(assignment_id, student_id)
);

create index if not exists idx_submissions_student on assignment_submissions(student_id, status);
create index if not exists idx_submissions_assignment on assignment_submissions(assignment_id, status);

alter table public.assignment_submissions enable row level security;
create policy "students_read_own_submissions" on assignment_submissions for all
  using (auth.uid() = student_id) with check (auth.uid() = student_id);
create policy "teachers_read_class_submissions" on assignment_submissions for select using (
  exists (
    select 1 from assignments a
    join classes c on a.class_id = c.id
    where a.id = assignment_submissions.assignment_id
      and (c.teacher_id = auth.uid())
  )
);
create policy "teachers_grade_submissions" on assignment_submissions for update using (
  exists (
    select 1 from assignments a
    join classes c on a.class_id = c.id
    where a.id = assignment_submissions.assignment_id and c.teacher_id = auth.uid()
  )
);

-- =============== AUDIT LOG (compliance) ============
create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organizations(id) on delete cascade,
  user_id uuid references profiles(id) on delete set null,

  -- Event
  event_type text not null,                       -- 'user.invited', 'org.settings_changed', 'class.created'
  event_category text not null check (event_category in (
    'auth', 'org', 'user', 'billing', 'class', 'data', 'security', 'compliance'
  )),

  -- Context
  target_type text,                               -- 'user', 'class', 'notebook', 'organization'
  target_id text,
  ip_address inet,
  user_agent text,

  -- Snapshot
  before_state jsonb,
  after_state jsonb,
  metadata jsonb default '{}'::jsonb,

  created_at timestamptz default now()
);

create index if not exists idx_audit_org on audit_log(org_id, created_at desc);
create index if not exists idx_audit_user on audit_log(user_id, created_at desc);
create index if not exists idx_audit_event on audit_log(event_type, created_at desc);

alter table public.audit_log enable row level security;
create policy "admins_read_audit" on audit_log for select using (
  exists (
    select 1 from organization_members om
    where om.org_id = audit_log.org_id
      and om.user_id = auth.uid()
      and om.role in ('owner', 'admin')
  )
);
create policy "service_writes_audit" on audit_log for insert
  with check (auth.role() = 'service_role');

-- =============== SEAT MANAGEMENT ============
-- Seat = bir ödenmiş kullanıcı slot'u. Kullanıcı org'a katılınca seat tüketilir.
create or replace function public.org_seat_check(p_org_id uuid)
returns table(used int, total int, available int)
language sql stable as $$
  select
    o.seats_used,
    o.max_seats,
    greatest(0, o.max_seats - o.seats_used)
  from organizations o where o.id = p_org_id;
$$;

create or replace function public.recompute_org_seats(p_org_id uuid)
returns void language sql as $$
  update organizations
  set seats_used = (
    select count(*) from organization_members
    where org_id = p_org_id
      and invitation_status = 'accepted'
      and (expires_at is null or expires_at > now())
      and scim_active = true
  )
  where id = p_org_id;
$$;

create or replace function public.update_class_member_count()
returns trigger language plpgsql as $$
begin
  if TG_OP = 'INSERT' then
    update classes set member_count = member_count + 1 where id = NEW.class_id;
  elsif TG_OP = 'DELETE' then
    update classes set member_count = greatest(0, member_count - 1) where id = OLD.class_id;
  end if;
  return coalesce(NEW, OLD);
end;
$$;

drop trigger if exists trg_class_member_count on class_members;
create trigger trg_class_member_count
after insert or delete on class_members
for each row execute function public.update_class_member_count();

-- Org-scoped notebooks (organization üyesi bütün defterlerini org'a bağlar)
alter table public.notebooks
  add column if not exists org_id uuid references organizations(id) on delete set null,
  add column if not exists assignment_id uuid references assignments(id) on delete set null;

create index if not exists idx_notebooks_org on notebooks(org_id) where org_id is not null;
create index if not exists idx_notebooks_assignment on notebooks(assignment_id) where assignment_id is not null;

-- =============== USER ENTITLEMENTS — org Pro ============
-- Org seat'i alan kullanıcı otomatik Pro olur
alter table public.user_entitlements
  add column if not exists org_id uuid references organizations(id) on delete set null;

create index if not exists idx_entitlements_org on user_entitlements(org_id) where org_id is not null;
