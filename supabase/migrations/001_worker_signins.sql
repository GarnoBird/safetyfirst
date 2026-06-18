create extension if not exists pgcrypto;

create table if not exists public.staff_profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  username text not null unique,
  email text not null,
  role text not null default 'staff',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.worker_signins (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  trade text not null,
  company text not null,
  signed_in_at timestamptz not null default now(),
  sign_in_date_vancouver date not null
);

create table if not exists public.report_runs (
  id uuid primary key default gen_random_uuid(),
  report_date date not null,
  kind text not null check (kind in ('auto', 'manual')),
  recipient_email text not null,
  row_count integer not null default 0,
  status text not null check (status in ('sent', 'skipped', 'failed')),
  sent_at timestamptz not null default now(),
  triggered_by_staff_id uuid references public.staff_profiles(id) on delete set null
);

create index if not exists worker_signins_date_idx
  on public.worker_signins (sign_in_date_vancouver);

create index if not exists worker_signins_sort_idx
  on public.worker_signins (sign_in_date_vancouver, signed_in_at);

create index if not exists report_runs_auto_sent_idx
  on public.report_runs (report_date, kind, status);

alter table public.staff_profiles enable row level security;
alter table public.worker_signins enable row level security;
alter table public.report_runs enable row level security;
