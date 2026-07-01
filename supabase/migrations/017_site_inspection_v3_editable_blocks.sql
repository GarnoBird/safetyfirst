do $$
declare
  v_template_id uuid;
  v_next_version integer;
  v_schema jsonb := $schema$
{
  "schemaVersion": 1,
  "formType": "site_inspection",
  "title": "Site Inspection",
  "description": "Fast mobile site inspection with deficiency tracking.",
  "sections": [
    {
      "id": "inspection_info",
      "title": "Inspection Info",
      "description": "",
      "settings": { "defaultCollapsed": false },
      "fields": [
        {
          "id": "site_project",
          "type": "short_text",
          "label": "Project",
          "helperText": "",
          "required": true,
          "default": "",
          "remember": true,
          "options": [],
          "settings": { "siteInspectionHeaderField": "project" }
        },
        {
          "id": "site_area_inspected",
          "type": "short_text",
          "label": "Area inspected",
          "helperText": "",
          "required": true,
          "default": "",
          "remember": false,
          "options": [],
          "settings": { "siteInspectionHeaderField": "areaInspected" }
        },
        {
          "id": "site_address",
          "type": "short_text",
          "label": "Address",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": true,
          "options": [],
          "settings": { "siteInspectionHeaderField": "address" }
        },
        {
          "id": "site_date",
          "type": "date",
          "label": "Date",
          "helperText": "",
          "required": true,
          "default": "today",
          "remember": false,
          "options": [],
          "settings": { "siteInspectionHeaderField": "date" }
        },
        {
          "id": "site_time",
          "type": "time",
          "label": "Time",
          "helperText": "",
          "required": true,
          "default": "now",
          "remember": false,
          "options": [],
          "settings": { "siteInspectionHeaderField": "time" }
        },
        {
          "id": "site_inspector",
          "type": "short_text",
          "label": "Inspector",
          "helperText": "",
          "required": true,
          "default": "worker_name",
          "remember": false,
          "options": [],
          "settings": { "siteInspectionHeaderField": "inspector" }
        },
        {
          "id": "site_trades_present",
          "type": "short_text",
          "label": "Trades present",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": true,
          "options": [],
          "settings": { "siteInspectionHeaderField": "tradesPresent" }
        },
        {
          "id": "site_reviewer",
          "type": "short_text",
          "label": "Reviewer / Supervisor",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": true,
          "options": [],
          "settings": { "siteInspectionHeaderField": "reviewer" }
        }
      ]
    },
    {
      "id": "positive_observations",
      "title": "Positive observations",
      "description": "",
      "settings": { "defaultCollapsed": true },
      "fields": [
        {
          "id": "site_positive_observations",
          "type": "long_text",
          "label": "Positive observations",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": [],
          "settings": { "siteInspectionObservationField": "positive" }
        }
      ]
    },
    {
      "id": "high_risk_work",
      "title": "High-risk work observed",
      "description": "",
      "settings": { "defaultCollapsed": true },
      "fields": [
        {
          "id": "site_high_risk_work",
          "type": "long_text",
          "label": "High-risk work observed",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": [],
          "settings": { "siteInspectionObservationField": "highRiskWork" }
        }
      ]
    },
    {
      "id": "immediate_controls",
      "title": "Immediate controls",
      "description": "",
      "settings": { "defaultCollapsed": true },
      "fields": [
        {
          "id": "site_immediate_controls",
          "type": "long_text",
          "label": "Immediate controls",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": [],
          "settings": { "siteInspectionObservationField": "immediateControls" }
        }
      ]
    },
    {
      "id": "deficiencies",
      "title": "Deficiencies",
      "description": "",
      "settings": { "defaultCollapsed": false },
      "fields": [
        {
          "id": "site_deficiencies",
          "type": "site_deficiencies",
          "label": "Deficiencies",
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
      "id": "follow_up_notes",
      "title": "Follow-up notes",
      "description": "",
      "settings": { "defaultCollapsed": true },
      "fields": [
        {
          "id": "site_follow_up_notes",
          "type": "long_text",
          "label": "Follow-up notes",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": [],
          "settings": { "siteInspectionObservationField": "followUpNotes" }
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
  where form_type = 'site_inspection';

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
      'site_inspection',
      'Site Inspection',
      'Fast mobile site inspection with deficiency tracking.',
      'template',
      true,
      true,
      20
    )
    returning id into v_template_id;
  else
    update public.form_templates
    set
      label = 'Site Inspection',
      description = 'Fast mobile site inspection with deficiency tracking.',
      renderer_type = 'template',
      active = true,
      worker_visible = true,
      display_order = least(display_order, 20),
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
    'site_inspection',
    v_next_version,
    'published',
    v_schema,
    'Site Inspection editable V3 fields and deficiency special block.',
    now(),
    now(),
    now()
  );
end $$;
