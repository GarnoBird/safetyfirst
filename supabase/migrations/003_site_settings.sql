create table if not exists public.site_settings (
  id text primary key default 'default' check (id = 'default'),
  site_name text not null default 'Safety First',
  site_location text not null default 'Vancouver condo tower site',
  timezone text not null default 'America/Vancouver',
  signout_cutoff_time time not null default '16:30',
  signout_reminders_enabled boolean not null default false,
  signout_reminder_message text not null default 'Hello {{name}}, APPIA records show you are still signed in on site today. If you have left site, please sign out here: {{signout_link}}. If you are still on site, no action is needed.',
  updated_at timestamptz not null default now(),
  updated_by_staff_id uuid references public.staff_profiles(id) on delete set null
);

insert into public.site_settings (id)
values ('default')
on conflict (id) do nothing;

alter table public.site_settings enable row level security;
