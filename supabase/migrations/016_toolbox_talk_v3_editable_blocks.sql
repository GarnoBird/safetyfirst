do $$
declare
  v_template_id uuid;
  v_next_version integer;
  v_schema jsonb := $schema$
{
  "schemaVersion": 1,
  "formType": "toolbox_talk",
  "title": "Toolbox Talk",
  "description": "Fast mobile toolbox meeting and attendance record.",
  "sections": [
    {
      "id": "meeting_info",
      "title": "Meeting Info",
      "description": "",
      "settings": { "defaultCollapsed": false },
      "fields": [
        {
          "id": "toolbox_project_name",
          "type": "short_text",
          "label": "Project Name",
          "helperText": "",
          "required": true,
          "default": "",
          "remember": true,
          "options": [],
          "settings": { "toolboxHeaderField": "projectName" }
        },
        {
          "id": "toolbox_address",
          "type": "short_text",
          "label": "Address",
          "helperText": "",
          "required": true,
          "default": "",
          "remember": true,
          "options": [],
          "settings": { "toolboxHeaderField": "address" }
        },
        {
          "id": "toolbox_date",
          "type": "date",
          "label": "Date",
          "helperText": "",
          "required": true,
          "default": "today",
          "remember": false,
          "options": [],
          "settings": { "toolboxHeaderField": "date" }
        },
        {
          "id": "toolbox_time",
          "type": "time",
          "label": "Time",
          "helperText": "",
          "required": true,
          "default": "now",
          "remember": false,
          "options": [],
          "settings": { "toolboxHeaderField": "time" }
        },
        {
          "id": "toolbox_presenter",
          "type": "short_text",
          "label": "Presenter",
          "helperText": "",
          "required": true,
          "default": "worker_name",
          "remember": false,
          "options": [],
          "settings": { "toolboxHeaderField": "presenter" }
        },
        {
          "id": "toolbox_supervisor",
          "type": "short_text",
          "label": "Supervisor",
          "helperText": "",
          "required": true,
          "default": "",
          "remember": true,
          "options": [],
          "settings": { "toolboxHeaderField": "supervisor" }
        }
      ]
    },
    {
      "id": "topics",
      "title": "Topics Discussed",
      "description": "Select the topics discussed or enter additional procedures.",
      "settings": { "defaultCollapsed": false },
      "fields": [
        {
          "id": "toolbox_topics",
          "type": "toolbox_topics",
          "label": "Topics Discussed",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": [],
          "settings": {
            "showCommon": true,
            "showSearch": true,
            "enabledCategoryIds": [
              "rights_responsibilities",
              "general_conditions",
              "chemical_biological",
              "substance_specific",
              "noise_vibration_temperature",
              "ppe",
              "confined_spaces",
              "lockout",
              "fall_protection",
              "tools_equipment",
              "ladders_platforms",
              "cranes_hoists",
              "rigging",
              "mobile_equipment",
              "traffic_control",
              "electrical_safety",
              "construction_excavation_demolition",
              "evacuation_rescue",
              "psychological_health_safety"
            ],
            "commonTopicLabels": [
              "Housekeeping / clean-up",
              "When needed",
              "Anchors",
              "Pre-use inspection",
              "Head / eye / face",
              "Safe Access",
              "Report all incidents",
              "Safeguards",
              "WHMIS"
            ]
          }
        }
      ]
    },
    {
      "id": "incident_review",
      "title": "Incident / Review",
      "description": "First aid counts, medical aids, near misses, accidents, and lessons learned.",
      "settings": { "defaultCollapsed": true },
      "fields": [
        {
          "id": "toolbox_incident_review",
          "type": "toolbox_incident_review",
          "label": "Review Notes",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": [],
          "settings": { "defaultCollapsed": true }
        }
      ]
    },
    {
      "id": "safety_concerns",
      "title": "Safety Concerns",
      "description": "Concerns raised by workers, actions to take, and dates taken.",
      "settings": { "defaultCollapsed": true },
      "fields": [
        {
          "id": "toolbox_safety_concerns",
          "type": "toolbox_safety_concerns",
          "label": "Safety Concerns",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": [],
          "settings": { "defaultCollapsed": true }
        }
      ]
    },
    {
      "id": "attendance",
      "title": "Attendance",
      "description": "Typed worker names for everyone who participated.",
      "settings": { "defaultCollapsed": false },
      "fields": [
        {
          "id": "toolbox_attendance",
          "type": "toolbox_attendance",
          "label": "Attendance",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": [],
          "settings": {}
        }
      ]
    },
    {
      "id": "final_check",
      "title": "Final Check",
      "description": "Presenter comments and participation confirmation.",
      "settings": { "defaultCollapsed": false },
      "fields": [
        {
          "id": "toolbox_final_confirmation",
          "type": "toolbox_final_confirmation",
          "label": "Final Check",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": [],
          "settings": {}
        }
      ]
    }
  ]
}
$schema$::jsonb;
begin
  select id
  into v_template_id
  from public.form_templates
  where form_type = 'toolbox_talk';

  if v_template_id is null then
    insert into public.form_templates (
      form_type,
      label,
      description,
      renderer_type,
      active,
      worker_visible,
      display_order
    )
    values (
      'toolbox_talk',
      'Toolbox Talk',
      'Fast mobile toolbox meeting and attendance record.',
      'template',
      true,
      true,
      10
    )
    returning id into v_template_id;
  else
    update public.form_templates
    set
      label = 'Toolbox Talk',
      description = 'Fast mobile toolbox meeting and attendance record.',
      renderer_type = 'template',
      active = true,
      worker_visible = true,
      display_order = least(display_order, 10),
      archived_at = null,
      updated_at = now()
    where id = v_template_id;
  end if;

  select coalesce(max(version_number), 0) + 1
  into v_next_version
  from public.form_template_versions
  where template_id = v_template_id;

  update public.form_template_versions
  set status = 'archived', updated_at = now()
  where template_id = v_template_id
    and status in ('published', 'draft');

  insert into public.form_template_versions (
    template_id,
    form_type,
    version_number,
    status,
    schema,
    notes,
    published_at,
    created_at,
    updated_at
  )
  values (
    v_template_id,
    'toolbox_talk',
    v_next_version,
    'published',
    v_schema,
    'Toolbox Talk editable V3 fields and special blocks.',
    now(),
    now(),
    now()
  );
end $$;
