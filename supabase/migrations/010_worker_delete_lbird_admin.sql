update public.staff_profiles
set
  role = 'admin',
  updated_at = now()
where lower(username) = 'lbird';
