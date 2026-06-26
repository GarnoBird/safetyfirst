alter table public.form_submissions
  add column if not exists form_data jsonb not null default '{}'::jsonb;
