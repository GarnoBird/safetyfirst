do $$
declare
  v_template_id uuid;
  v_next_version integer;
  v_field_count integer;
  v_schema jsonb := $schema$
{
  "schemaVersion": 1,
  "formType": "skid_steer_loader_pre_use_inspection",
  "title": "Pre-use Inspection Checklist for Skid Steer Loader",
  "description": "Skid steer loader pre-use inspection checklist recreated as an editable V3 template.",
  "sections": [
    {
      "id": "skid_steer_pre_use_notes",
      "title": "Pre-use Inspection Checklist for Skid Steer Loader",
      "description": "",
      "settings": { "layout": { "width": "full" } },
      "fields": [
        {
          "id": "skid_steer_operator_pre_use_checklist",
          "type": "instructions",
          "label": "Operator pre-use checklist - perform prior to each use",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": [],
          "settings": { "layout": { "width": "full" }, "instructionStyle": "heading" }
        },
        {
          "id": "skid_steer_general_condition_note",
          "type": "instructions",
          "label": "Note general vehicle condition. Clear away all collected debris and steam if necessary. Check for mechanical damage and loose or leaking components. Report faults to your supervisor or the maintenance department, whichever your company requires.",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": [],
          "settings": { "layout": { "width": "full" }, "instructionStyle": "policy" }
        }
      ]
    },
    {
      "id": "skid_steer_visual_inspection",
      "title": "Visual Inspection",
      "description": "",
      "settings": { "layout": { "width": "full" } },
      "fields": [
        {
          "id": "skid_steer_before_start_checks",
          "type": "multi_select",
          "label": "Before starting engine, check the following:",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": [
            "Engine (check oil levels, look for leaks)",
            "Fuel tank (drain off moisture or sediment)",
            "Radiator (check coolant level, look for leaks)",
            "Hydraulic tank (check oil level, look for leaks)",
            "Air Cleaner (check indicator, clean or change A/R)",
            "Engine belts (check for adjustment/wear)",
            "Fuel filter (service when gauge indicates low pressure)",
            "Wheels & tire assemblies (condition/pressure)",
            "Lubricate chassis (refer to lube chart, as required)"
          ],
          "settings": { "choiceDisplay": "checklist", "layout": { "width": "full" } }
        },
        {
          "id": "skid_steer_operating_near_leading_edge",
          "type": "dropdown",
          "label": "Operating near a leading edge?",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": ["Yes (permit required)", "No"],
          "settings": { "choiceDisplay": "radio", "layout": { "width": "half" } }
        },
        {
          "id": "skid_steer_operating_near_powerlines",
          "type": "dropdown",
          "label": "Operating near powerlines or other services?",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": ["Yes (risk assessment required)", "No"],
          "settings": { "choiceDisplay": "radio", "layout": { "width": "half" } }
        },
        {
          "id": "skid_steer_other_workers_in_area",
          "type": "dropdown",
          "label": "Other workers in the area?",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": ["Yes (TCP may be required)", "No"],
          "settings": { "choiceDisplay": "radio", "layout": { "width": "half" } }
        },
        {
          "id": "skid_steer_visual_remarks",
          "type": "short_text",
          "label": "Remarks",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": [],
          "settings": { "layout": { "width": "half" } }
        }
      ]
    },
    {
      "id": "skid_steer_startup_items",
      "title": "Start-up Items",
      "description": "",
      "settings": { "layout": { "width": "full" } },
      "fields": [
        {
          "id": "skid_steer_after_start_checks",
          "type": "multi_select",
          "label": "After starting engine, check the following:",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": [
            "Engine (does it sound normal?)",
            "Instruments (check for normal readings)",
            "Controls (check for normal operation)",
            "Exhaust system (check for lead and excessive smoke)",
            "Lights and horn",
            "Back-up alarm"
          ],
          "settings": { "choiceDisplay": "checklist", "layout": { "width": "full" } }
        },
        {
          "id": "skid_steer_startup_remarks",
          "type": "short_text",
          "label": "Remarks",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": [],
          "settings": { "layout": { "width": "full" } }
        }
      ]
    },
    {
      "id": "skid_steer_abnormal_repair_note",
      "title": "Note:",
      "description": "",
      "settings": { "layout": { "width": "full" } },
      "fields": [
        {
          "id": "skid_steer_anything_abnormal",
          "type": "long_text",
          "label": "Note anything abnormal or in need of repair:",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": [],
          "settings": { "layout": { "width": "full" } }
        }
      ]
    },
    {
      "id": "skid_steer_operator_information",
      "title": "Operator Information",
      "description": "",
      "settings": { "layout": { "width": "full" } },
      "fields": [
        {
          "id": "skid_steer_operator_name",
          "type": "short_text",
          "label": "Operator Name",
          "helperText": "",
          "required": false,
          "default": "worker_name",
          "remember": false,
          "options": [],
          "settings": { "layout": { "width": "half" } }
        },
        {
          "id": "skid_steer_vehicle_number",
          "type": "short_text",
          "label": "Vehicle #",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": [],
          "settings": { "layout": { "width": "half" } }
        },
        {
          "id": "skid_steer_hour_meter_reading",
          "type": "short_text",
          "label": "Hour Meter Reading",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": [],
          "settings": { "layout": { "width": "half" } }
        },
        {
          "id": "skid_steer_inspection_date",
          "type": "date",
          "label": "Date",
          "helperText": "",
          "required": false,
          "default": "today",
          "remember": false,
          "options": [],
          "settings": { "layout": { "width": "half" } }
        },
        {
          "id": "skid_steer_copyright_note",
          "type": "instructions",
          "label": "NOTE: This page may be reproduced without permission from the copyright holder. This checklist is provided for general use only and should be supplemented with good judgment and the recommendation of the manufacturer.",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": [],
          "settings": { "layout": { "width": "full" }, "instructionStyle": "policy" }
        }
      ]
    }
  ]
}
$schema$::jsonb;
begin
  if jsonb_array_length(v_schema -> 'sections') <> 5 then
    raise exception 'Skid Steer Loader Pre-use Inspection template conversion failed: expected 5 sections, found %.',
      jsonb_array_length(v_schema -> 'sections');
  end if;

  select coalesce(sum(jsonb_array_length(section_item -> 'fields')), 0)
  into v_field_count
  from jsonb_array_elements(v_schema -> 'sections') as section_item;

  if v_field_count <> 15 then
    raise exception 'Skid Steer Loader Pre-use Inspection template conversion failed: expected 15 fields, found %.', v_field_count;
  end if;

  select id
  into v_template_id
  from public.form_templates
  where form_type = 'skid_steer_loader_pre_use_inspection';

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
      'skid_steer_loader_pre_use_inspection',
      'Skid Steer Loader Pre-use Inspection',
      'Skid steer loader pre-use inspection checklist recreated as an editable V3 template.',
      'template',
      true,
      false,
      110
    )
    returning id into v_template_id;
  else
    update public.form_templates
    set
      label = 'Skid Steer Loader Pre-use Inspection',
      description = 'Skid steer loader pre-use inspection checklist recreated as an editable V3 template.',
      renderer_type = 'template',
      active = true,
      worker_visible = false,
      display_order = 110,
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
    notes = coalesce(nullif(notes, ''), 'Draft archived while refreshing Skid Steer Loader Pre-use Inspection template.'),
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
    'skid_steer_loader_pre_use_inspection',
    v_next_version,
    'draft',
    v_schema,
    'Skid Steer Loader Pre-use Inspection legacy form recreated as a V3 editable template.',
    null,
    now(),
    now()
  );
end $$;
