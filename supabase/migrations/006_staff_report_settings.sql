create table if not exists public.staff_report_settings (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null unique references public.staff_profiles(id) on delete cascade,
  recipient_emails text not null default 'garnobird@gmail.com',
  auto_enabled boolean not null default true,
  auto_time time not null default '08:00',
  timezone text not null default 'America/Vancouver',
  report_format text not null default 'both',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by_staff_id uuid references public.staff_profiles(id) on delete set null,
  constraint staff_report_settings_report_format_check
    check (report_format in ('csv', 'xml', 'both'))
);

insert into public.staff_report_settings (
  staff_id,
  recipient_emails,
  auto_enabled,
  auto_time,
  timezone,
  report_format,
  updated_by_staff_id
)
select
  staff_profiles.id,
  coalesce(site_settings.report_recipient_email, 'garnobird@gmail.com'),
  coalesce(site_settings.report_auto_enabled, true),
  coalesce(site_settings.report_auto_time, '08:00'::time),
  coalesce(site_settings.timezone, 'America/Vancouver'),
  coalesce(site_settings.report_format, 'both'),
  site_settings.updated_by_staff_id
from public.staff_profiles
cross join public.site_settings
where staff_profiles.active = true
on conflict (staff_id) do nothing;

create index if not exists staff_report_settings_auto_idx
  on public.staff_report_settings (auto_enabled, auto_time);

create unique index if not exists report_runs_auto_staff_once_idx
  on public.report_runs (report_date, triggered_by_staff_id)
  where kind = 'auto' and triggered_by_staff_id is not null;

alter table public.staff_report_settings enable row level security;
