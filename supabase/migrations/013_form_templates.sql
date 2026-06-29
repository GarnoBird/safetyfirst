create table if not exists public.form_templates (
  id uuid primary key default gen_random_uuid(),
  form_type text not null unique
    check (form_type in ('toolbox_talk', 'site_inspection', 'daily_hazard_assessment')),
  label text not null,
  renderer_type text not null default 'template'
    check (renderer_type in ('template', 'special')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.form_template_versions (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.form_templates(id) on delete cascade,
  form_type text not null
    check (form_type in ('toolbox_talk', 'site_inspection', 'daily_hazard_assessment')),
  version_number integer not null,
  status text not null default 'draft'
    check (status in ('draft', 'published', 'archived')),
  schema jsonb not null default '{}'::jsonb,
  notes text not null default '',
  created_by_staff_id uuid references public.staff_profiles(id) on delete set null,
  updated_by_staff_id uuid references public.staff_profiles(id) on delete set null,
  published_by_staff_id uuid references public.staff_profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);

create unique index if not exists form_template_versions_number_idx
  on public.form_template_versions (template_id, version_number);

create unique index if not exists form_template_versions_draft_idx
  on public.form_template_versions (template_id)
  where status = 'draft';

create unique index if not exists form_template_versions_published_idx
  on public.form_template_versions (template_id)
  where status = 'published';

create index if not exists form_template_versions_form_type_idx
  on public.form_template_versions (form_type, status);

alter table public.form_submissions
  add column if not exists form_template_version_id uuid references public.form_template_versions(id) on delete set null,
  add column if not exists form_schema_snapshot jsonb not null default '{}'::jsonb;

create index if not exists form_submissions_template_version_idx
  on public.form_submissions (form_template_version_id);

alter table public.form_templates enable row level security;
alter table public.form_template_versions enable row level security;

insert into public.form_templates (form_type, label, renderer_type)
values
  ('toolbox_talk', 'Toolbox Talk', 'special'),
  ('site_inspection', 'Site Inspection', 'special'),
  ('daily_hazard_assessment', 'Daily Hazard Assessment', 'template')
on conflict (form_type) do update
set
  label = excluded.label,
  renderer_type = excluded.renderer_type,
  updated_at = now();

insert into public.form_template_versions (template_id, form_type, version_number, status, schema, notes, published_at)
select
  t.id,
  t.form_type,
  1,
  'published',
  case t.form_type
    when 'daily_hazard_assessment' then
      '{
        "schemaVersion": 1,
        "title": "Daily Hazard Assessment",
        "description": "Fast mobile hazard review.",
        "sections": [
          {
            "id": "job_info",
            "title": "Job Info",
            "description": "Basic job details.",
            "fields": [
              {"id": "project", "type": "short_text", "label": "Project", "required": true, "remember": true},
              {"id": "area", "type": "short_text", "label": "Work area", "required": true},
              {"id": "date", "type": "date", "label": "Date", "required": true, "default": "today"},
              {"id": "time", "type": "time", "label": "Time", "required": true, "default": "now"},
              {"id": "assessed_by", "type": "short_text", "label": "Completed by", "required": true, "default": "worker_name"},
              {"id": "supervisor", "type": "short_text", "label": "Supervisor", "required": false, "remember": true}
            ]
          },
          {
            "id": "work_summary",
            "title": "Work Summary",
            "description": "What work is happening today?",
            "fields": [
              {"id": "task", "type": "long_text", "label": "Task / work activity", "required": true},
              {"id": "trades_present", "type": "short_text", "label": "Trades present", "required": false, "remember": true}
            ]
          },
          {
            "id": "hazards",
            "title": "Hazards",
            "description": "Tap all hazards that apply.",
            "fields": [
              {
                "id": "hazards_observed",
                "type": "multi_select",
                "label": "Hazards observed",
                "required": true,
                "options": ["Fall protection", "Housekeeping", "Tools / equipment", "Electrical", "Traffic", "Material handling", "Weather", "PPE", "Other"]
              },
              {"id": "other_hazards", "type": "long_text", "label": "Other hazards / notes", "required": false}
            ]
          },
          {
            "id": "controls",
            "title": "Controls",
            "description": "Confirm how hazards are controlled.",
            "fields": [
              {"id": "controls_in_place", "type": "long_text", "label": "Controls in place", "required": true},
              {"id": "additional_notes", "type": "long_text", "label": "Additional notes", "required": false}
            ]
          },
          {
            "id": "confirmation",
            "title": "Final Check",
            "description": "Completed by the worker submitting this form.",
            "fields": [
              {"id": "confirmed", "type": "checkbox", "label": "I reviewed today’s hazards and controls.", "required": true}
            ]
          }
        ]
      }'::jsonb
    else
      jsonb_build_object(
        'schemaVersion', 1,
        'title', t.label,
        'renderer', 'special',
        'sections', '[]'::jsonb
      )
  end,
  'Initial published version.',
  now()
from public.form_templates t
where not exists (
  select 1
  from public.form_template_versions v
  where v.template_id = t.id
    and v.status = 'published'
);
