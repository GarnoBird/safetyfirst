alter table public.form_submissions
  drop constraint if exists form_submissions_form_type_check;

alter table public.form_templates
  drop constraint if exists form_templates_form_type_check;

alter table public.form_template_versions
  drop constraint if exists form_template_versions_form_type_check;

alter table public.form_templates
  add column if not exists description text not null default '',
  add column if not exists worker_visible boolean not null default false,
  add column if not exists display_order integer not null default 1000,
  add column if not exists archived_at timestamptz,
  add column if not exists created_by_staff_id uuid references public.staff_profiles(id) on delete set null,
  add column if not exists updated_by_staff_id uuid references public.staff_profiles(id) on delete set null;

alter table public.form_templates
  drop constraint if exists form_templates_form_type_slug_check;

alter table public.form_template_versions
  drop constraint if exists form_template_versions_form_type_slug_check;

alter table public.form_submissions
  drop constraint if exists form_submissions_form_type_slug_check;

alter table public.form_templates
  add constraint form_templates_form_type_slug_check
  check (form_type ~ '^[a-z0-9]+(?:[-_][a-z0-9]+)*$') not valid;

alter table public.form_template_versions
  add constraint form_template_versions_form_type_slug_check
  check (form_type ~ '^[a-z0-9]+(?:[-_][a-z0-9]+)*$') not valid;

alter table public.form_submissions
  add constraint form_submissions_form_type_slug_check
  check (form_type ~ '^[a-z0-9]+(?:[-_][a-z0-9]+)*$') not valid;

create index if not exists form_templates_worker_visible_idx
  on public.form_templates (worker_visible, active, display_order, label);

update public.form_templates
set
  worker_visible = true,
  display_order = case form_type
    when 'toolbox_talk' then 10
    when 'site_inspection' then 20
    when 'daily_hazard_assessment' then 30
    else display_order
  end,
  updated_at = now()
where form_type in ('toolbox_talk', 'site_inspection', 'daily_hazard_assessment');
