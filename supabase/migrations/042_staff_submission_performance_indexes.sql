create extension if not exists pg_trgm;

create index if not exists form_submissions_active_submitted_at_idx
  on public.form_submissions (submitted_at desc)
  where deleted_by_worker_at is null
    and deleted_by_staff_at is null
    and app_purged_at is null;

create index if not exists form_submissions_active_submitted_date_idx
  on public.form_submissions (submitted_date_vancouver desc, submitted_at desc)
  where deleted_by_worker_at is null
    and deleted_by_staff_at is null
    and app_purged_at is null;

create index if not exists form_submissions_active_form_type_idx
  on public.form_submissions (form_type, submitted_at desc)
  where deleted_by_worker_at is null
    and deleted_by_staff_at is null
    and app_purged_at is null;

create index if not exists form_submissions_active_backup_status_idx
  on public.form_submissions (one_drive_backup_status, submitted_at desc)
  where deleted_by_worker_at is null
    and deleted_by_staff_at is null
    and app_purged_at is null;

create index if not exists form_submissions_active_company_sort_idx
  on public.form_submissions (company, submitted_at desc)
  where deleted_by_worker_at is null
    and deleted_by_staff_at is null
    and app_purged_at is null;

create index if not exists form_submissions_active_worker_name_sort_idx
  on public.form_submissions (worker_name, submitted_at desc)
  where deleted_by_worker_at is null
    and deleted_by_staff_at is null
    and app_purged_at is null;

create index if not exists form_submissions_active_worker_phone_sort_idx
  on public.form_submissions (worker_phone, submitted_at desc)
  where deleted_by_worker_at is null
    and deleted_by_staff_at is null
    and app_purged_at is null;

create index if not exists form_submissions_active_company_trgm_idx
  on public.form_submissions using gin (company gin_trgm_ops)
  where deleted_by_worker_at is null
    and deleted_by_staff_at is null
    and app_purged_at is null;

create index if not exists form_submissions_active_worker_name_trgm_idx
  on public.form_submissions using gin (worker_name gin_trgm_ops)
  where deleted_by_worker_at is null
    and deleted_by_staff_at is null
    and app_purged_at is null;

create index if not exists form_submissions_active_worker_phone_trgm_idx
  on public.form_submissions using gin (worker_phone gin_trgm_ops)
  where deleted_by_worker_at is null
    and deleted_by_staff_at is null
    and app_purged_at is null;
