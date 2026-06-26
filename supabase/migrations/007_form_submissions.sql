create extension if not exists pgcrypto;

create table if not exists public.worker_profiles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  company text not null,
  phone text not null,
  phone_normalized text not null default '',
  username text not null,
  password_hash text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by_staff_id uuid references public.staff_profiles(id) on delete set null,
  updated_by_staff_id uuid references public.staff_profiles(id) on delete set null
);

create unique index if not exists worker_profiles_username_lower_idx
  on public.worker_profiles (lower(username));

create index if not exists worker_profiles_company_idx
  on public.worker_profiles (company);

create unique index if not exists worker_profiles_phone_normalized_idx
  on public.worker_profiles (phone_normalized)
  where phone_normalized <> '';

create index if not exists worker_profiles_active_idx
  on public.worker_profiles (active);

create table if not exists public.worker_sessions (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references public.worker_profiles(id) on delete cascade,
  token_hash text not null unique,
  remember_me boolean not null default false,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  revoked_at timestamptz
);

create index if not exists worker_sessions_worker_idx
  on public.worker_sessions (worker_id, revoked_at, expires_at);

create table if not exists public.form_submissions (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid references public.worker_profiles(id) on delete set null,
  worker_name text not null,
  worker_phone text not null,
  worker_username text not null,
  company text not null,
  form_type text not null check (form_type in ('toolbox_talk', 'site_inspection', 'daily_hazard_assessment')),
  submission_mode text not null check (submission_mode in ('submit_file', 'fill_form')),
  notes text not null default '',
  submitted_at timestamptz not null default now(),
  submitted_date_vancouver date not null,
  deleted_by_worker_at timestamptz,
  app_purged_at timestamptz,
  one_drive_backup_status text not null default 'pending'
    check (one_drive_backup_status in ('pending', 'backed_up', 'failed')),
  one_drive_item_id text,
  one_drive_item_name text,
  one_drive_web_url text,
  one_drive_path text,
  backup_attempted_at timestamptz,
  backup_error text
);

create index if not exists form_submissions_worker_idx
  on public.form_submissions (worker_id, submitted_at desc);

create index if not exists form_submissions_staff_filter_idx
  on public.form_submissions (submitted_date_vancouver, company, form_type, one_drive_backup_status);

create index if not exists form_submissions_purge_idx
  on public.form_submissions (submitted_at, deleted_by_worker_at, one_drive_backup_status, app_purged_at);

create table if not exists public.submission_files (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.form_submissions(id) on delete cascade,
  bucket text not null default 'safety-form-submissions',
  storage_path text not null,
  original_filename text not null,
  mime_type text not null default 'application/octet-stream',
  size_bytes bigint not null default 0,
  one_drive_item_id text,
  one_drive_item_name text,
  one_drive_web_url text,
  one_drive_path text,
  backup_status text not null default 'pending'
    check (backup_status in ('pending', 'backed_up', 'failed')),
  backup_attempted_at timestamptz,
  backup_error text,
  app_deleted_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists submission_files_submission_idx
  on public.submission_files (submission_id);

create index if not exists submission_files_backup_idx
  on public.submission_files (backup_status, app_deleted_at);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'safety-form-submissions',
  'safety-form-submissions',
  false,
  52428800,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

alter table public.worker_profiles enable row level security;
alter table public.worker_sessions enable row level security;
alter table public.form_submissions enable row level security;
alter table public.submission_files enable row level security;
