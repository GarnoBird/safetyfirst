alter table public.form_submissions
  add column if not exists staff_signoffs jsonb not null default '[]'::jsonb,
  add column if not exists staff_reviewed_at timestamptz,
  add column if not exists staff_reviewed_by_staff_id uuid references public.staff_profiles(id) on delete set null;

create index if not exists form_submissions_staff_reviewed_idx
  on public.form_submissions (staff_reviewed_at desc)
  where staff_reviewed_at is not null;
