alter table public.site_settings
  add column if not exists report_recipient_email text not null default 'garnobird@gmail.com',
  add column if not exists report_auto_enabled boolean not null default true,
  add column if not exists report_auto_time time not null default '08:00',
  add column if not exists report_format text not null default 'both';

alter table public.site_settings
  drop constraint if exists site_settings_report_format_check;

alter table public.site_settings
  add constraint site_settings_report_format_check
  check (report_format in ('csv', 'xml', 'both'));
