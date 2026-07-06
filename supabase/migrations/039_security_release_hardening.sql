-- Explicit release hardening backstops for direct anon/authenticated access.
-- The app API still uses the service role; these policies make accidental direct
-- client access fail closed.

do $$
declare
  app_table text;
  app_tables text[] := array[
    'staff_profiles',
    'worker_signins',
    'report_runs',
    'site_settings',
    'company_profiles',
    'staff_report_settings',
    'worker_profiles',
    'worker_sessions',
    'form_submissions',
    'submission_files',
    'audit_events',
    'security_login_attempts',
    'system_alerts',
    'job_runs',
    'submission_uploads',
    'action_items',
    'action_item_events',
    'action_item_files',
    'form_templates',
    'form_template_versions',
    'assets',
    'asset_log_entries',
    'asset_maintenance_entries',
    'certificate_types',
    'certificate_providers',
    'certificates',
    'certificate_files',
    'form_template_share_links'
  ];
begin
  foreach app_table in array app_tables loop
    if to_regclass('public.' || quote_ident(app_table)) is not null then
      execute format('alter table public.%I enable row level security', app_table);
      if not exists (
        select 1
        from pg_policies
        where schemaname = 'public'
          and tablename = app_table
          and policyname = 'deny_direct_client_access'
      ) then
        execute format(
          'create policy deny_direct_client_access on public.%I for all to anon, authenticated using (false) with check (false)',
          app_table
        );
      end if;
    end if;
  end loop;
end $$;

update storage.buckets
set public = false
where id = 'safety-form-submissions';

alter table storage.objects enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'deny_direct_client_safety_form_submissions'
  ) then
    create policy deny_direct_client_safety_form_submissions
      on storage.objects
      as restrictive
      for all
      to anon, authenticated
      using (bucket_id <> 'safety-form-submissions')
      with check (bucket_id <> 'safety-form-submissions');
  end if;
end $$;
