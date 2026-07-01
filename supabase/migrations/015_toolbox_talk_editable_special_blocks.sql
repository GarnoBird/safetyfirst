update public.form_templates
set
  renderer_type = 'template',
  active = true,
  worker_visible = true,
  description = coalesce(nullif(description, ''), 'Fast mobile toolbox meeting and attendance record.'),
  updated_at = now()
where form_type = 'toolbox_talk';

with toolbox_schema as (
  select
    t.id as template_id,
    t.form_type,
    '{
      "schemaVersion": 1,
      "formType": "toolbox_talk",
      "title": "Toolbox Talk",
      "description": "Fast mobile toolbox meeting and attendance record.",
      "sections": [
        {
          "id": "meeting_info",
          "title": "Meeting Info",
          "description": "Project, address, date, time, presenter, and supervisor.",
          "fields": [
            {"id": "toolbox_meeting_info", "type": "toolbox_meeting_info", "label": "Meeting Info", "required": false}
          ]
        },
        {
          "id": "topics",
          "title": "Topics Discussed",
          "description": "Select the topics discussed or enter additional procedures.",
          "fields": [
            {"id": "toolbox_topics", "type": "toolbox_topics", "label": "Topics Discussed", "required": false}
          ]
        },
        {
          "id": "incident_review",
          "title": "Incident / Review",
          "description": "First aid counts, medical aids, near misses, accidents, and lessons learned.",
          "fields": [
            {"id": "toolbox_incident_review", "type": "toolbox_incident_review", "label": "Incident / Review", "required": false}
          ]
        },
        {
          "id": "safety_concerns",
          "title": "Safety Concerns",
          "description": "Concerns raised by workers, actions to take, and dates taken.",
          "fields": [
            {"id": "toolbox_safety_concerns", "type": "toolbox_safety_concerns", "label": "Safety Concerns", "required": false}
          ]
        },
        {
          "id": "attendance",
          "title": "Attendance",
          "description": "Typed worker names for everyone who participated.",
          "fields": [
            {"id": "toolbox_attendance", "type": "toolbox_attendance", "label": "Attendance", "required": false}
          ]
        },
        {
          "id": "final_check",
          "title": "Final Check",
          "description": "Presenter comments and participation confirmation.",
          "fields": [
            {"id": "toolbox_final_confirmation", "type": "toolbox_final_confirmation", "label": "Final Confirmation", "required": false}
          ]
        }
      ]
    }'::jsonb as schema
  from public.form_templates t
  where t.form_type = 'toolbox_talk'
)
update public.form_template_versions v
set
  schema = toolbox_schema.schema,
  notes = case
    when v.notes = '' then 'Editable Toolbox Talk special-block schema.'
    else v.notes
  end,
  updated_at = now()
from toolbox_schema
where v.template_id = toolbox_schema.template_id
  and v.status in ('published', 'draft');

with toolbox_schema as (
  select
    t.id as template_id,
    t.form_type,
    '{
      "schemaVersion": 1,
      "formType": "toolbox_talk",
      "title": "Toolbox Talk",
      "description": "Fast mobile toolbox meeting and attendance record.",
      "sections": [
        {"id": "meeting_info", "title": "Meeting Info", "description": "Project, address, date, time, presenter, and supervisor.", "fields": [{"id": "toolbox_meeting_info", "type": "toolbox_meeting_info", "label": "Meeting Info", "required": false}]},
        {"id": "topics", "title": "Topics Discussed", "description": "Select the topics discussed or enter additional procedures.", "fields": [{"id": "toolbox_topics", "type": "toolbox_topics", "label": "Topics Discussed", "required": false}]},
        {"id": "incident_review", "title": "Incident / Review", "description": "First aid counts, medical aids, near misses, accidents, and lessons learned.", "fields": [{"id": "toolbox_incident_review", "type": "toolbox_incident_review", "label": "Incident / Review", "required": false}]},
        {"id": "safety_concerns", "title": "Safety Concerns", "description": "Concerns raised by workers, actions to take, and dates taken.", "fields": [{"id": "toolbox_safety_concerns", "type": "toolbox_safety_concerns", "label": "Safety Concerns", "required": false}]},
        {"id": "attendance", "title": "Attendance", "description": "Typed worker names for everyone who participated.", "fields": [{"id": "toolbox_attendance", "type": "toolbox_attendance", "label": "Attendance", "required": false}]},
        {"id": "final_check", "title": "Final Check", "description": "Presenter comments and participation confirmation.", "fields": [{"id": "toolbox_final_confirmation", "type": "toolbox_final_confirmation", "label": "Final Confirmation", "required": false}]}
      ]
    }'::jsonb as schema
  from public.form_templates t
  where t.form_type = 'toolbox_talk'
)
insert into public.form_template_versions (
  template_id,
  form_type,
  version_number,
  status,
  schema,
  notes,
  published_at
)
select
  template_id,
  form_type,
  coalesce((
    select max(v.version_number) + 1
    from public.form_template_versions v
    where v.template_id = toolbox_schema.template_id
  ), 1),
  'published',
  schema,
  'Editable Toolbox Talk special-block schema.',
  now()
from toolbox_schema
where not exists (
  select 1
  from public.form_template_versions v
  where v.template_id = toolbox_schema.template_id
    and v.status = 'published'
);
