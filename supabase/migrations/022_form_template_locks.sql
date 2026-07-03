alter table public.form_templates
  add column if not exists locked_at timestamptz,
  add column if not exists locked_by_staff_id uuid references public.staff_profiles(id) on delete set null;

create index if not exists form_templates_locked_idx
  on public.form_templates (locked_at)
  where locked_at is not null;
