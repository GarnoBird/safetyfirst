create table if not exists public.certificate_types (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  required boolean not null default false,
  source text not null default 'safety_first',
  source_metadata jsonb not null default '{}'::jsonb,
  archived_at timestamptz,
  created_by_staff_id uuid references public.staff_profiles(id) on delete set null,
  updated_by_staff_id uuid references public.staff_profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.certificate_providers (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  source text not null default 'safety_first',
  source_metadata jsonb not null default '{}'::jsonb,
  archived_at timestamptz,
  created_by_staff_id uuid references public.staff_profiles(id) on delete set null,
  updated_by_staff_id uuid references public.staff_profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.certificates (
  id uuid primary key default gen_random_uuid(),
  worker_name text not null,
  certificate_type_id uuid references public.certificate_types(id) on delete set null,
  certificate_type_name text not null,
  certificate_provider_id uuid references public.certificate_providers(id) on delete set null,
  certificate_provider_name text not null default '',
  issue_date date not null,
  expiry_date date not null,
  status text not null default 'approved'
    check (status in ('approved', 'archived')),
  archived_at timestamptz,
  created_by_staff_id uuid references public.staff_profiles(id) on delete set null,
  updated_by_staff_id uuid references public.staff_profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.certificate_files (
  id uuid primary key default gen_random_uuid(),
  certificate_id uuid not null references public.certificates(id) on delete cascade,
  bucket text not null default 'safety-form-submissions',
  storage_path text not null unique,
  original_filename text not null,
  mime_type text not null,
  size_bytes bigint not null default 0,
  uploaded_by_staff_id uuid references public.staff_profiles(id) on delete set null,
  app_deleted_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists certificate_types_active_name_idx
  on public.certificate_types (lower(name))
  where archived_at is null;

create index if not exists certificate_providers_active_name_idx
  on public.certificate_providers (lower(name))
  where archived_at is null;

create index if not exists certificates_active_expiry_idx
  on public.certificates (archived_at, expiry_date, worker_name);

create index if not exists certificates_type_provider_idx
  on public.certificates (certificate_type_id, certificate_provider_id)
  where archived_at is null;

create index if not exists certificate_files_certificate_idx
  on public.certificate_files (certificate_id, created_at desc);

alter table public.certificate_types enable row level security;
alter table public.certificate_providers enable row level security;
alter table public.certificates enable row level security;
alter table public.certificate_files enable row level security;

with seed(slug, name, required, position) as (
  values
    ('core-of-supervision', 'Core of Supervision', false, 10),
    ('bc-drivers-license', 'BC Driver''s License', false, 20),
    ('cor-auditor-certificate', 'COR Auditor Certificate', false, 30),
    ('core-of-confined-spaces', 'Core of Confined Spaces', false, 40),
    ('core-of-fall-protection', 'Core of Fall Protection', false, 50),
    ('core-of-johs', 'Core of JOHS', false, 60),
    ('cso-tsc', 'CSO - TSC', false, 70),
    ('ed-operator-personnel-hoist-constr-elevator', 'ED Operator - Personnel Hoist & Constr Elevator', false, 80),
    ('forklift', 'Forklift', false, 90),
    ('hearing-test', 'Hearing Test', false, 100),
    ('mewp-operator', 'MEWP Operator', false, 110),
    ('mobile-equipment-operator-certificate', 'Mobile Equipment Operator Certificate', false, 120),
    ('occupational-first-aid', 'Occupational First Aid', false, 130),
    ('occupational-first-aid-lvl-2', 'Occupational First Aid Lvl 2', false, 140),
    ('occupational-first-aid-lvl-3', 'Occupational First Aid Lvl 3', false, 150),
    ('other', 'Other', false, 160),
    ('respiratory-fit-test-large', 'Respiratory Fit Test - Large', false, 170),
    ('respiratory-fit-test-medium', 'Respiratory Fit Test - Medium', false, 180),
    ('rigging-intermediate-lvl-2', 'Rigging, Intermediate Lvl 2', false, 190),
    ('skid-steer', 'Skid Steer', false, 200),
    ('tower-rescue-canada-lvl-a-1', 'Tower Rescue Canada - Lvl A-1', false, 210),
    ('traffic-control-person', 'Traffic Control Person', false, 220),
    ('whmis', 'WHMIS', false, 230)
)
insert into public.certificate_types (
  slug,
  name,
  required,
  source,
  source_metadata,
  archived_at,
  updated_at
)
select
  seed.slug,
  seed.name,
  seed.required,
  'salus_reference',
  jsonb_build_object('source', 'Salus certificate types', 'position', seed.position),
  null,
  now()
from seed
on conflict (slug) do update set
  name = excluded.name,
  required = excluded.required,
  source = excluded.source,
  source_metadata = public.certificate_types.source_metadata || excluded.source_metadata,
  archived_at = null,
  updated_at = now();

with seed(slug, name, position) as (
  values
    ('access-rescue-canada', 'Access Rescue Canada', 10),
    ('aix-health-safety-and-environmental', 'Aix Health Safety and Environmental', 20),
    ('bccsa', 'BCCSA', 30),
    ('care-institute-of-safety-health-inc', 'Care Institute of Safety & Health Inc', 40),
    ('ccohs', 'CCOHS', 50),
    ('dominion-masonry', 'Dominion Masonry', 60),
    ('leavitt-training', 'Leavitt Training', 70),
    ('lift-pro', 'Lift Pro', 80),
    ('other', 'Other', 90),
    ('reliable-hearing-van', 'Reliable Hearing Van', 100),
    ('st-johns-ambulance', 'St John''s Ambulance', 110),
    ('technical-safety-bc', 'Technical Safety BC', 120),
    ('trauma-tech', 'Trauma Tech', 130),
    ('true-north-safety', 'True North Safety', 140),
    ('universal-health-safety', 'Universal Health & Safety', 150),
    ('we-the-safe', 'We the Safe', 160)
)
insert into public.certificate_providers (
  slug,
  name,
  source,
  source_metadata,
  archived_at,
  updated_at
)
select
  seed.slug,
  seed.name,
  'salus_reference',
  jsonb_build_object('source', 'Salus certificate providers', 'position', seed.position),
  null,
  now()
from seed
on conflict (slug) do update set
  name = excluded.name,
  source = excluded.source,
  source_metadata = public.certificate_providers.source_metadata || excluded.source_metadata,
  archived_at = null,
  updated_at = now();
