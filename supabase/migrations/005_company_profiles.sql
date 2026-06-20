create table if not exists public.company_profiles (
  id uuid primary key default gen_random_uuid(),
  company_name text not null unique,
  trade_category text not null default 'Unmapped',
  active boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by_staff_id uuid references public.staff_profiles(id) on delete set null
);

create index if not exists company_profiles_trade_category_idx
  on public.company_profiles (trade_category);

alter table public.company_profiles enable row level security;
