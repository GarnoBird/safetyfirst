alter table public.form_submissions
  add column if not exists deleted_by_staff_at timestamptz,
  add column if not exists deleted_by_staff_id uuid references public.staff_profiles(id) on delete set null;

create index if not exists form_submissions_staff_deleted_idx
  on public.form_submissions (deleted_by_staff_at, submitted_at desc);
