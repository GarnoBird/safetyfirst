create table if not exists public.form_template_share_links (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.form_templates(id) on delete cascade,
  form_type text not null,
  token uuid not null default gen_random_uuid(),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists form_template_share_links_template_idx
  on public.form_template_share_links (template_id);

create unique index if not exists form_template_share_links_token_idx
  on public.form_template_share_links (token);

create index if not exists form_template_share_links_active_idx
  on public.form_template_share_links (active, form_type);

alter table public.form_template_share_links enable row level security;

insert into public.form_template_share_links (template_id, form_type, active)
select
  template.id,
  template.form_type,
  true
from public.form_templates template
where
  template.active = true
  and template.worker_visible = true
  and template.archived_at is null
  and exists (
    select 1
    from public.form_template_versions version
    where version.template_id = template.id
      and version.status = 'published'
  )
on conflict (template_id) do update
set
  form_type = excluded.form_type,
  active = true,
  updated_at = now();

update public.form_template_share_links link
set
  active = exists (
    select 1
    from public.form_templates template
    join public.form_template_versions version
      on version.template_id = template.id
     and version.status = 'published'
    where template.id = link.template_id
      and template.active = true
      and template.worker_visible = true
      and template.archived_at is null
  ),
  updated_at = now();
