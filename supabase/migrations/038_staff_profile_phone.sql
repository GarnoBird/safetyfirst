alter table public.staff_profiles
  add column if not exists phone text not null default '';
