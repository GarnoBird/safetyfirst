create extension if not exists pgcrypto;

alter table public.staff_profiles
  add column if not exists display_name text,
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists created_by_staff_id uuid references public.staff_profiles(id) on delete set null,
  add column if not exists updated_by_staff_id uuid references public.staff_profiles(id) on delete set null,
  add column if not exists last_login_at timestamptz;

update public.staff_profiles
set
  display_name = coalesce(nullif(display_name, ''), username),
  updated_at = coalesce(updated_at, created_at, now());

update public.staff_profiles
set role = 'owner'
where lower(username) = 'lbird';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'staff_profiles_role_check'
      and conrelid = 'public.staff_profiles'::regclass
  ) then
    alter table public.staff_profiles
      add constraint staff_profiles_role_check
      check (role in ('owner', 'admin', 'staff'));
  end if;
end $$;

create unique index if not exists staff_profiles_email_lower_idx
  on public.staff_profiles (lower(email));

create index if not exists staff_profiles_active_role_idx
  on public.staff_profiles (active, role);

create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_staff_id uuid references public.staff_profiles(id) on delete set null,
  actor_username text,
  actor_role text,
  action text not null,
  target_type text not null default '',
  target_id text not null default '',
  summary text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists audit_events_created_idx
  on public.audit_events (created_at desc);

create index if not exists audit_events_action_idx
  on public.audit_events (action, created_at desc);

create index if not exists audit_events_actor_idx
  on public.audit_events (actor_staff_id, created_at desc);

create table if not exists public.security_login_attempts (
  id uuid primary key default gen_random_uuid(),
  scope text not null check (scope in ('staff', 'worker')),
  identifier text not null default '',
  ip_address text not null default '',
  user_agent text,
  success boolean not null default false,
  failure_reason text,
  created_at timestamptz not null default now()
);

create index if not exists security_login_attempts_identifier_idx
  on public.security_login_attempts (scope, identifier, success, created_at desc);

create index if not exists security_login_attempts_ip_idx
  on public.security_login_attempts (scope, ip_address, success, created_at desc);

create table if not exists public.system_alerts (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  alert_key text not null,
  severity text not null check (severity in ('info', 'warning', 'critical')),
  status text not null default 'open' check (status in ('open', 'acknowledged', 'resolved')),
  title text not null,
  body text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  occurrence_count integer not null default 1,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  acknowledged_at timestamptz,
  acknowledged_by_staff_id uuid references public.staff_profiles(id) on delete set null,
  resolved_at timestamptz,
  resolved_by_staff_id uuid references public.staff_profiles(id) on delete set null,
  last_notified_at timestamptz
);

create unique index if not exists system_alerts_active_key_idx
  on public.system_alerts (source, alert_key)
  where status in ('open', 'acknowledged');

create index if not exists system_alerts_status_idx
  on public.system_alerts (status, severity, last_seen_at desc);

create table if not exists public.job_runs (
  id uuid primary key default gen_random_uuid(),
  job_name text not null,
  status text not null check (status in ('running', 'succeeded', 'failed', 'skipped')),
  triggered_by text not null default 'system',
  triggered_by_staff_id uuid references public.staff_profiles(id) on delete set null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  summary jsonb not null default '{}'::jsonb,
  error text
);

create index if not exists job_runs_job_started_idx
  on public.job_runs (job_name, started_at desc);

create index if not exists job_runs_status_idx
  on public.job_runs (status, started_at desc);

create table if not exists public.submission_uploads (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid references public.worker_profiles(id) on delete set null,
  bucket text not null default 'safety-form-submissions',
  storage_path text not null unique,
  original_filename text not null,
  mime_type text not null,
  size_bytes bigint not null default 0,
  form_type text not null default '',
  created_at timestamptz not null default now(),
  attached_submission_id uuid references public.form_submissions(id) on delete set null,
  attached_at timestamptz,
  deleted_at timestamptz
);

create index if not exists submission_uploads_worker_idx
  on public.submission_uploads (worker_id, created_at desc);

create index if not exists submission_uploads_cleanup_idx
  on public.submission_uploads (attached_submission_id, deleted_at, created_at);

alter table public.audit_events enable row level security;
alter table public.security_login_attempts enable row level security;
alter table public.system_alerts enable row level security;
alter table public.job_runs enable row level security;
alter table public.submission_uploads enable row level security;
