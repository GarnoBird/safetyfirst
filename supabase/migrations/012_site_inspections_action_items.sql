create table if not exists public.action_items (
  id uuid primary key default gen_random_uuid(),
  source_submission_id uuid references public.form_submissions(id) on delete set null,
  source_form_type text not null default '',
  source_deficiency_index integer,
  worker_id uuid references public.worker_profiles(id) on delete set null,
  worker_name text not null default '',
  worker_phone text not null default '',
  worker_username text not null default '',
  company text not null default '',
  project text not null default '',
  area text not null default '',
  location text not null default '',
  category text not null default '',
  title text not null default '',
  description text not null default '',
  priority text not null default 'medium'
    check (priority in ('low', 'medium', 'high', 'critical')),
  status text not null default 'draft'
    check (status in ('draft', 'open', 'in_progress', 'ready_for_review', 'closed', 'void')),
  immediate_control text not null default '',
  recommended_action text not null default '',
  suggested_assignee text not null default '',
  assigned_to text not null default '',
  assigned_to_staff_id uuid references public.staff_profiles(id) on delete set null,
  due_date date,
  closeout_notes text not null default '',
  opened_at timestamptz,
  activated_at timestamptz,
  ready_for_review_at timestamptz,
  closed_at timestamptz,
  voided_at timestamptz,
  deleted_at timestamptz,
  deleted_by_staff_id uuid references public.staff_profiles(id) on delete set null,
  created_by_staff_id uuid references public.staff_profiles(id) on delete set null,
  updated_by_staff_id uuid references public.staff_profiles(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists action_items_status_due_idx
  on public.action_items (status, due_date, priority);

create index if not exists action_items_company_project_idx
  on public.action_items (company, project);

create index if not exists action_items_source_submission_idx
  on public.action_items (source_submission_id);

create index if not exists action_items_deleted_created_idx
  on public.action_items (deleted_at, created_at desc);

create table if not exists public.action_item_events (
  id uuid primary key default gen_random_uuid(),
  action_item_id uuid not null references public.action_items(id) on delete cascade,
  actor_staff_id uuid references public.staff_profiles(id) on delete set null,
  actor_username text,
  actor_role text,
  event_type text not null,
  from_status text,
  to_status text,
  body text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists action_item_events_item_created_idx
  on public.action_item_events (action_item_id, created_at desc);

create table if not exists public.action_item_files (
  id uuid primary key default gen_random_uuid(),
  action_item_id uuid not null references public.action_items(id) on delete cascade,
  bucket text not null default 'safety-form-submissions',
  storage_path text not null unique,
  original_filename text not null,
  mime_type text not null,
  size_bytes bigint not null default 0,
  uploaded_by_staff_id uuid references public.staff_profiles(id) on delete set null,
  app_deleted_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists action_item_files_item_idx
  on public.action_item_files (action_item_id, created_at desc);

alter table public.action_items enable row level security;
alter table public.action_item_events enable row level security;
alter table public.action_item_files enable row level security;
