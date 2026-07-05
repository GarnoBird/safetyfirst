alter table public.assets
  add column if not exists model text not null default '',
  add column if not exists year text not null default '',
  add column if not exists kms_miles text not null default '',
  add column if not exists description text not null default '',
  add column if not exists created_by_staff_id uuid references public.staff_profiles(id) on delete set null;

create table if not exists public.asset_log_entries (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.assets(id) on delete cascade,
  status text not null default 'active',
  site text not null default '',
  hours numeric,
  kms_miles text not null default '',
  notes text not null default '',
  entry_date timestamptz not null default now(),
  created_by_staff_id uuid references public.staff_profiles(id) on delete set null,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.asset_maintenance_entries (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.assets(id) on delete cascade,
  status text not null default 'active',
  site text not null default '',
  hours numeric,
  kms_miles text not null default '',
  performed_by text not null default '',
  notes text not null default '',
  maintenance_date timestamptz not null default now(),
  created_by_staff_id uuid references public.staff_profiles(id) on delete set null,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.asset_log_entries enable row level security;
alter table public.asset_maintenance_entries enable row level security;

create index if not exists asset_log_entries_asset_date_idx
  on public.asset_log_entries (asset_id, entry_date desc)
  where archived_at is null;

create index if not exists asset_maintenance_entries_asset_date_idx
  on public.asset_maintenance_entries (asset_id, maintenance_date desc)
  where archived_at is null;

create index if not exists assets_current_site_idx
  on public.assets (lower(current_site))
  where archived_at is null;

with seed(asset_key, name, asset_type, serial_number, current_site, status, model, year, hours, kms_miles, description, last_used_at, notes, source_id) as (
  values
    ('solo4-aerius:justin-lanyard:fall-protection:gemtor', 'Justin - Lanyard', 'Fall Protection', 'GEMTOR', 'SOLO 4: Aerius', 'active', 'SP 1101L3', '24', null::numeric, 'N/A', 'MFG DATE: 04/24 MAX LENGTH 42" MAX FREE FALL 6'' LENGTH 3'' MATERIAL: POLYESTER CAPACITY 350LBS MAX', '2024-09-03 15:32:00-07'::timestamptz, '', 'solo4-aerius-justin-lanyard'),
    ('solo4-aerius:justin-harness:fall-protection:e004035007e9392b', 'Justin - Harness', 'Fall Protection', 'E004035007E9392B', 'SOLO 4: Aerius', 'active', '', '', null::numeric, '', '', '2024-09-03 15:31:00-07'::timestamptz, '', 'solo4-aerius-justin-harness'),
    ('solo4-aerius:guy-harness:fall-protection', 'Guy - Harness', 'Fall Protection', '', 'SOLO 4: Aerius', 'active', '', '', null::numeric, '', '', '2024-09-03 15:31:00-07'::timestamptz, '', 'solo4-aerius-guy-harness'),
    ('solo4-aerius:gustavo-harness:fall-protection:5832992', 'Gustavo - Harness', 'Fall Protection', '5832992', 'SOLO 4: Aerius', 'active', '', '', null::numeric, '', '', '2024-09-03 15:30:00-07'::timestamptz, '', 'solo4-aerius-gustavo-harness'),
    ('solo4-aerius:brandon-lanyard:fall-protection:15.09.21-0028', 'Brandon - Lanyard', 'Fall Protection', '15.09.21 0028', 'SOLO 4: Aerius', 'active', '', '', null::numeric, '', '', '2024-09-03 15:30:00-07'::timestamptz, '', 'solo4-aerius-brandon-lanyard'),
    ('solo4-aerius:brandon-harness:fall-protection:0291750', 'Brandon - Harness', 'Fall Protection', '0291750', 'SOLO 4: Aerius', 'active', '', '', null::numeric, '', '', '2024-09-03 15:29:00-07'::timestamptz, '', 'solo4-aerius-brandon-harness'),
    ('solo4-aerius:leanne-lanyard:fall-protection:000194', 'Leanne - Lanyard', 'Fall Protection', '000194', 'SOLO 4: Aerius', 'active', '', '', null::numeric, '', '', '2024-08-19 10:02:00-07'::timestamptz, '', 'solo4-aerius-leanne-lanyard'),
    ('solo4-aerius:gabriel-lanyard:fall-protection:000186', 'Gabriel - Lanyard', 'Fall Protection', '000186', 'SOLO 4: Aerius', 'active', '', '', null::numeric, '', '', '2024-08-19 10:02:00-07'::timestamptz, '', 'solo4-aerius-gabriel-lanyard'),
    ('solo4-aerius:leanne-harness:fall-protection:792650', 'Leanne - Harness', 'Fall Protection', '792650', 'SOLO 4: Aerius', 'active', '', '', null::numeric, '', '', '2024-08-19 09:47:00-07'::timestamptz, '', 'solo4-aerius-leanne-harness'),
    ('solo4-aerius:tony-lanyard:fall-protection:001156', 'Tony - Lanyard', 'Fall Protection', '001156', 'SOLO 4: Aerius', 'active', '', '', null::numeric, '', '', '2024-08-19 09:43:00-07'::timestamptz, '', 'solo4-aerius-tony-lanyard'),
    ('solo4-aerius:tony-harness:fall-protection:e00403501f52af7f', 'Tony - Harness', 'Fall Protection', 'E00403501F52AF7F', 'SOLO 4: Aerius', 'active', '', '', null::numeric, '', '', '2024-08-19 09:42:00-07'::timestamptz, '', 'solo4-aerius-tony-harness'),
    ('solo4-aerius:guy-lanyard:fall-protection', 'Guy - Lanyard', 'Fall Protection', '', 'SOLO 4: Aerius', 'active', '', '', null::numeric, '', '', '2024-08-19 09:41:00-07'::timestamptz, '', 'solo4-aerius-guy-lanyard'),
    ('solo4-aerius:hilti-cordless-caulking-dispenser:power-tools', 'Hilti Cordless Caulking Dispenser', 'Power Tools', '', 'SOLO 4: Aerius', 'active', '', '', null::numeric, '', '', '2024-06-03 08:48:00-07'::timestamptz, '', 'solo4-aerius-hilti-caulking-dispenser'),
    ('solo4-aerius:wire-rope-assembly-single-leg-pigtail:below-the-hook:300901-02', 'Wire Rope Assembly Single Leg (PigTail)', 'Below the Hook', '300901-02', 'SOLO 4: Aerius', 'active', '', '', 11200::numeric, '', '', '2024-03-20 14:37:00-07'::timestamptz, '', 'solo4-aerius-wire-rope-pigtail'),
    ('solo4-aerius:para-stairs:ladders-scaffolds-stairs', 'Para Stairs', 'Ladders/Scaffolds/Stairs', '', 'SOLO 4: Aerius', 'active', '', '', null::numeric, '', '', '2023-09-25 08:04:00-07'::timestamptz, '', 'solo4-aerius-para-stairs'),
    ('solo4-aerius:12-allright-straight-ladder:ladders-scaffolds-stairs', '12 ''Allright Straight Ladder', 'Ladders/Scaffolds/Stairs', '', 'SOLO 4: Aerius', 'active', '', '', null::numeric, '', '', '2023-09-12 11:23:00-07'::timestamptz, '', 'solo4-aerius-12-allright-straight-ladder'),
    ('solo4-aerius:36-extension-ladder:ladders-scaffolds-stairs', '36'' extension ladder', 'Ladders/Scaffolds/Stairs', '', 'SOLO 4: Aerius', 'active', '', '', null::numeric, '', '', '2023-09-12 11:20:00-07'::timestamptz, '', 'solo4-aerius-36-extension-ladder'),
    ('solo4-aerius:4-allright-stepladder:ladders-scaffolds-stairs:ar665-04c', '4'' Allright Stepladder', 'Ladders/Scaffolds/Stairs', 'ar665-04c', 'SOLO 4: Aerius', 'active', '', '', null::numeric, '', '', '2023-09-12 11:19:00-07'::timestamptz, '', 'solo4-aerius-4-allright-stepladder'),
    ('solo4-aerius:17-mastercraft-telescopic-ladder:ladders-scaffolds-stairs', '17'' Mastercraft Telescopic Ladder', 'Ladders/Scaffolds/Stairs', '', 'SOLO 4: Aerius', 'active', '', '', null::numeric, '', '', '2023-09-12 10:26:00-07'::timestamptz, '', 'solo4-aerius-17-mastercraft-telescopic-ladder')
)
insert into public.assets (
  asset_key,
  name,
  asset_type,
  serial_number,
  current_site,
  status,
  model,
  year,
  hours,
  kms_miles,
  description,
  last_used_at,
  notes,
  source,
  source_id,
  source_metadata,
  archived_at,
  updated_at
)
select
  asset_key,
  name,
  asset_type,
  serial_number,
  current_site,
  status,
  model,
  year,
  hours,
  kms_miles,
  description,
  last_used_at,
  notes,
  'local_reference',
  source_id,
  jsonb_build_object('copiedFrom', 'local reference data', 'site', current_site),
  null,
  now()
from seed
on conflict (asset_key) do update set
  name = excluded.name,
  asset_type = excluded.asset_type,
  serial_number = excluded.serial_number,
  current_site = excluded.current_site,
  status = excluded.status,
  model = excluded.model,
  year = excluded.year,
  hours = excluded.hours,
  kms_miles = excluded.kms_miles,
  description = excluded.description,
  last_used_at = excluded.last_used_at,
  notes = excluded.notes,
  source = excluded.source,
  source_id = excluded.source_id,
  source_metadata = public.assets.source_metadata || excluded.source_metadata,
  archived_at = null,
  updated_at = now();
