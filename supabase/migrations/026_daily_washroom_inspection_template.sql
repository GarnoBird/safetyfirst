do $$
declare
  v_template_id uuid;
  v_next_version integer;
  v_field_count integer;
  v_schema jsonb := $schema$
{
  "schemaVersion": 1,
  "formType": "daily_washroom_inspection",
  "title": "Daily Washroom Inspection",
  "description": "Daily washroom inspection recreated as an editable V3 template.",
  "sections": [
    {
      "id": "daily_washroom_inspection_details",
      "title": "Daily Washroom Inspection",
      "description": "",
      "settings": { "layout": { "width": "full" } },
      "fields": [
        {
          "id": "daily_washroom_persons_inspecting",
          "type": "short_text",
          "label": "Person(s) Inspecting",
          "helperText": "",
          "required": true,
          "default": "worker_name",
          "remember": false,
          "options": [],
          "settings": { "layout": { "width": "half" } }
        },
        {
          "id": "daily_washroom_date",
          "type": "date",
          "label": "Date",
          "helperText": "",
          "required": true,
          "default": "today",
          "remember": false,
          "options": [],
          "settings": { "layout": { "width": "third" } }
        },
        {
          "id": "daily_washroom_time",
          "type": "time",
          "label": "Time",
          "helperText": "",
          "required": false,
          "default": "now",
          "remember": false,
          "options": [],
          "settings": { "layout": { "width": "third" } }
        }
      ]
    },
    {
      "id": "daily_washroom_bathroom_inspection",
      "title": "Bathroom Inspection",
      "description": "",
      "settings": { "layout": { "width": "full" } },
      "fields": [
        {
          "id": "daily_washroom_flushables_1_2_3_status",
          "type": "dropdown",
          "label": "Flushables 1-2-3 - AT GATE 1 (HOIST)",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": ["Pass", "Serviced by Safety", "Fail"],
          "settings": { "choiceDisplay": "radio", "layout": { "width": "full" } }
        },
        {
          "id": "daily_washroom_flushables_1_2_3_issues",
          "type": "long_text",
          "label": "Flushables 1-2-3: Describe Issues",
          "helperText": "Complete when serviced by Safety or failed.",
          "required": false,
          "default": "",
          "remember": false,
          "options": [],
          "settings": { "layout": { "width": "full" } }
        },
        {
          "id": "daily_washroom_flushables_4_5_status",
          "type": "dropdown",
          "label": "Flushables 4-5 - NORTH GL (WHITE UNITS)",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": ["Pass", "Serviced by Safety", "Fail"],
          "settings": { "choiceDisplay": "radio", "layout": { "width": "full" } }
        },
        {
          "id": "daily_washroom_flushables_4_5_issues",
          "type": "long_text",
          "label": "Flushables 4-5: Describe Issues",
          "helperText": "Complete when serviced by Safety or failed.",
          "required": false,
          "default": "",
          "remember": false,
          "options": [],
          "settings": { "layout": { "width": "full" } }
        },
        {
          "id": "daily_washroom_chemical_1_5_status",
          "type": "dropdown",
          "label": "Chemical 1-2-3-4-5 - NORTH EAST GROUND LEVEL",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": ["Pass", "Serviced by Safety", "Fail"],
          "settings": { "choiceDisplay": "radio", "layout": { "width": "full" } }
        },
        {
          "id": "daily_washroom_chemical_1_5_issues",
          "type": "long_text",
          "label": "Chemical 1-2-3-4-5: Describe Issues",
          "helperText": "Complete when serviced by Safety or failed.",
          "required": false,
          "default": "",
          "remember": false,
          "options": [],
          "settings": { "layout": { "width": "full" } }
        },
        {
          "id": "daily_washroom_chemical_6_12_status",
          "type": "dropdown",
          "label": "Chemical 6-7-8-9-10-11-12 - IN TOWER",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": ["Pass", "Serviced by Safety", "Fail"],
          "settings": { "choiceDisplay": "radio", "layout": { "width": "full" } }
        },
        {
          "id": "daily_washroom_chemical_6_12_issues",
          "type": "long_text",
          "label": "Chemical 6-7-8-9-10-11-12: Describe Issues",
          "helperText": "Complete when serviced by Safety or failed.",
          "required": false,
          "default": "",
          "remember": false,
          "options": [],
          "settings": { "layout": { "width": "full" } }
        },
        {
          "id": "daily_washroom_additional_notes",
          "type": "long_text",
          "label": "Additional Notes",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": [],
          "settings": { "layout": { "width": "full" } }
        }
      ]
    }
  ]
}
$schema$::jsonb;
begin
  select coalesce(sum(jsonb_array_length(section->'fields')), 0)
  into v_field_count
  from jsonb_array_elements(v_schema->'sections') as section;

  if v_field_count <> 12 then
    raise exception 'Daily Washroom Inspection template conversion failed: expected 12 fields, found %.', v_field_count;
  end if;

  select id
  into v_template_id
  from public.form_templates
  where form_type = 'daily_washroom_inspection';

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
      'daily_washroom_inspection',
      'Daily Washroom Inspection',
      'Daily washroom inspection recreated as an editable V3 template.',
      'template',
      true,
      false,
      100
    )
    returning id into v_template_id;
  else
    update public.form_templates
    set
      label = 'Daily Washroom Inspection',
      description = 'Daily washroom inspection recreated as an editable V3 template.',
      renderer_type = 'template',
      active = true,
      worker_visible = false,
      display_order = 100,
      archived_at = null,
      updated_at = now()
    where id = v_template_id;
  end if;

  select coalesce(max(version_number), 0) + 1
  into v_next_version
  from public.form_template_versions
  where template_id = v_template_id;

  update public.form_template_versions
  set
    status = 'archived',
    notes = coalesce(nullif(notes, ''), 'Draft archived while refreshing Daily Washroom Inspection template.'),
    updated_at = now()
  where template_id = v_template_id
    and status = 'draft';

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
    'daily_washroom_inspection',
    v_next_version,
    'draft',
    v_schema,
    'Daily Washroom Inspection legacy form recreated as a V3 editable template.',
    null,
    now(),
    now()
  );
end $$;
