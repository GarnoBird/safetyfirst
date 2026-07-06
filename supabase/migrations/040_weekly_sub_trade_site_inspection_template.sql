do $$
declare
  v_template_id uuid;
  v_next_version integer;
  v_field_count integer;
  v_schema jsonb := $schema$
{
  "schemaVersion": 1,
  "formType": "weekly_sub_trade_site_inspection",
  "title": "Weekly Sub-Trade Site Inspection",
  "description": "Weekly sub-trade site inspection recreated as an editable V3 template.",
  "sections": [
    {
      "id": "weekly_sub_trade_general_information",
      "title": "General Information",
      "description": "",
      "settings": { "layout": { "width": "full" } },
      "fields": [
        {
          "id": "weekly_sub_trade_date",
          "type": "date",
          "label": "Date Field",
          "helperText": "",
          "required": true,
          "default": "today",
          "remember": false,
          "options": [],
          "settings": { "layout": { "width": "half" } }
        },
        {
          "id": "weekly_sub_trade_inspector",
          "type": "short_text",
          "label": "Inspector",
          "helperText": "",
          "required": false,
          "default": "worker_name",
          "remember": false,
          "options": [],
          "settings": { "layout": { "width": "half" } }
        },
        {
          "id": "weekly_sub_trade_trade_name",
          "type": "short_text",
          "label": "Trade Name",
          "helperText": "",
          "required": false,
          "default": "worker_company",
          "remember": false,
          "options": [],
          "settings": { "layout": { "width": "half" } }
        },
        {
          "id": "weekly_sub_trade_critical_tasks_next_week",
          "type": "multi_select",
          "label": "Will you team be doing any of the following critical tasks next week?: (check all that apply)",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": [
            "Hot Work within 50 feet of a fire hazard",
            "Confined Space Entry",
            "Leading Edge Work (work within 6.5 feet from any unprotected fall hazard that is 10 ft or higher, or when unusual risk of injury below)",
            "Work in elevated work platforms exceeding 25 ft in height",
            "Fly tables installation and removal/stripping",
            "Critical lift as defined by OHS regulation",
            "Building/Dismantling scaffolds that are higher than 10 feet",
            "Suspended Equipment operations if any",
            "Work behind the wall in an excavation, in shafts, and other enclosed areas"
          ],
          "settings": { "choiceDisplay": "checklist", "layout": { "width": "full" } }
        }
      ]
    },
    {
      "id": "weekly_sub_trade_housekeeping_sanitation",
      "title": "Housekeeping and Sanitation",
      "description": "",
      "settings": { "layout": { "width": "full" } },
      "fields": [
        {
          "id": "weekly_sub_trade_work_areas_clean",
          "type": "dropdown",
          "label": "Project work areas are clean, orderly, and free of excess trash and debris",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": ["Pass", "Fail", "N/A"],
          "settings": { "choiceDisplay": "radio", "layout": { "width": "full" } }
        },
        {
          "id": "weekly_sub_trade_drains_clear",
          "type": "dropdown",
          "label": "Area around drains clear of sludge and debris",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": ["Pass", "Fail", "N/A"],
          "settings": { "choiceDisplay": "radio", "layout": { "width": "full" } }
        },
        {
          "id": "weekly_sub_trade_material_equipment_stored",
          "type": "dropdown",
          "label": "Material and equipment clean, properly stored, and orderly",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": ["Pass", "Fail", "N/A"],
          "settings": { "choiceDisplay": "radio", "layout": { "width": "full" } }
        },
        {
          "id": "weekly_sub_trade_scrap_material_safe",
          "type": "dropdown",
          "label": "Scrap material free of protruding nails or other puncture hazards",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": ["Pass", "Fail", "N/A"],
          "settings": { "choiceDisplay": "radio", "layout": { "width": "full" } }
        },
        {
          "id": "weekly_sub_trade_trash_receptacles",
          "type": "dropdown",
          "label": "Trash receptables provided and maintained",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": ["Pass", "Fail", "N/A"],
          "settings": { "choiceDisplay": "radio", "layout": { "width": "full" } }
        },
        {
          "id": "weekly_sub_trade_toilets_wash_facilities",
          "type": "dropdown",
          "label": "Well maintained portable toilets and hand wash facilities",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": ["Pass", "Fail", "N/A"],
          "settings": { "choiceDisplay": "radio", "layout": { "width": "full" } }
        },
        {
          "id": "weekly_sub_trade_hazardous_materials_secured",
          "type": "dropdown",
          "label": "Fuel and hazardous materials secured and stored safely. Your trades Safety Data Sheets accessible.",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": ["Pass", "Fail", "N/A"],
          "settings": { "choiceDisplay": "radio", "layout": { "width": "full" } }
        }
      ]
    },
    {
      "id": "weekly_sub_trade_stairs_ramps_scaffold",
      "title": "Stairs, Ramps and Scaffold",
      "description": "",
      "settings": { "layout": { "width": "full" } },
      "fields": [
        {
          "id": "weekly_sub_trade_access_egress_clear",
          "type": "dropdown",
          "label": "Stairwells, scaffolds and ramps clear of materials/equipment/debris for clear access/egress",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": ["Pass", "Fail", "N/A"],
          "settings": { "choiceDisplay": "radio", "layout": { "width": "full" } }
        },
        {
          "id": "weekly_sub_trade_handrails_secured",
          "type": "dropdown",
          "label": "Handrails secured to work surface, protruding 30 in. to 36 in. above the stair tread",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": ["Pass", "Fail", "N/A"],
          "settings": { "choiceDisplay": "radio", "layout": { "width": "full" } }
        }
      ]
    },
    {
      "id": "weekly_sub_trade_floor_openings_penetrations",
      "title": "Floor Openings / Penetrations",
      "description": "",
      "settings": { "layout": { "width": "full" } },
      "fields": [
        {
          "id": "weekly_sub_trade_floor_openings_covered",
          "type": "dropdown",
          "label": "Floor openings are covered and identified",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": ["Pass", "Fail", "N/A"],
          "settings": { "choiceDisplay": "radio", "layout": { "width": "full" } }
        },
        {
          "id": "weekly_sub_trade_guardrails_toeboards",
          "type": "dropdown",
          "label": "Guardrails around openings include toe boards and are properly maintained",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": ["Pass", "Fail", "N/A"],
          "settings": { "choiceDisplay": "radio", "layout": { "width": "full" } }
        },
        {
          "id": "weekly_sub_trade_dowel_protection",
          "type": "dropdown",
          "label": "Dowel protection utilized",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": ["Pass", "Fail", "N/A"],
          "settings": { "choiceDisplay": "radio", "layout": { "width": "full" } }
        }
      ]
    },
    {
      "id": "weekly_sub_trade_fall_perimeter_protection",
      "title": "Fall Protection and Perimeter Protection",
      "description": "",
      "settings": { "layout": { "width": "full" } },
      "fields": [
        {
          "id": "weekly_sub_trade_pfas_used_properly",
          "type": "dropdown",
          "label": "Personal fall arrest systems used properly when needed",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": ["Pass", "Fail", "N/A"],
          "settings": { "choiceDisplay": "radio", "layout": { "width": "full" } }
        },
        {
          "id": "weekly_sub_trade_controlled_access_zones",
          "type": "dropdown",
          "label": "Controlled access zones are established with physical barriers and proper signage",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": ["Pass", "Fail", "N/A"],
          "settings": { "choiceDisplay": "radio", "layout": { "width": "full" } }
        },
        {
          "id": "weekly_sub_trade_ladders_secured",
          "type": "dropdown",
          "label": "Ladders properly secured, used, maintained and inspected",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": ["Pass", "Fail", "N/A"],
          "settings": { "choiceDisplay": "radio", "layout": { "width": "full" } }
        },
        {
          "id": "weekly_sub_trade_working_levels_access",
          "type": "dropdown",
          "label": "Proper access / egress provided to all working levels",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": ["Pass", "Fail", "N/A"],
          "settings": { "choiceDisplay": "radio", "layout": { "width": "full" } }
        }
      ]
    },
    {
      "id": "weekly_sub_trade_fire_protection",
      "title": "Fire Protection",
      "description": "",
      "settings": { "layout": { "width": "full" } },
      "fields": [
        {
          "id": "weekly_sub_trade_extinguishers_air_horns",
          "type": "dropdown",
          "label": "Fire extinguishers and air horns quickly accessible",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": ["Pass", "Fail", "N/A"],
          "settings": { "choiceDisplay": "radio", "layout": { "width": "full" } }
        },
        {
          "id": "weekly_sub_trade_emergency_plan_routes",
          "type": "dropdown",
          "label": "Emergency plan practiced and egress routes maintained",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": ["Pass", "Fail", "N/A"],
          "settings": { "choiceDisplay": "radio", "layout": { "width": "full" } }
        },
        {
          "id": "weekly_sub_trade_hot_work_permits",
          "type": "dropdown",
          "label": "Hot work permits are utilized for all hot work operations and fire watch provided",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": ["Pass", "Fail", "N/A"],
          "settings": { "choiceDisplay": "radio", "layout": { "width": "full" } }
        },
        {
          "id": "weekly_sub_trade_flammable_liquids_storage",
          "type": "dropdown",
          "label": "Flammable / combustible liquids are not stored within 10' from stairwells, elevators, and exits",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": ["Pass", "Fail", "N/A"],
          "settings": { "choiceDisplay": "radio", "layout": { "width": "full" } }
        }
      ]
    },
    {
      "id": "weekly_sub_trade_personal_protective_equipment",
      "title": "Personal Protective Equipment",
      "description": "",
      "settings": { "layout": { "width": "full" } },
      "fields": [
        {
          "id": "weekly_sub_trade_ppe_inspected_documented",
          "type": "dropdown",
          "label": "Personal protective equipment inspected and documented",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": ["Pass", "Fail", "N/A"],
          "settings": { "choiceDisplay": "radio", "layout": { "width": "full" } }
        },
        {
          "id": "weekly_sub_trade_headgear_hivis_footwear",
          "type": "dropdown",
          "label": "Safety headgear, high visibility clothing and protective footwear worn by workers",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": ["Pass", "Fail", "N/A"],
          "settings": { "choiceDisplay": "radio", "layout": { "width": "full" } }
        },
        {
          "id": "weekly_sub_trade_eye_face_hearing_respiratory",
          "type": "dropdown",
          "label": "Eye, face, hearing and respiratory protection supplied to workers and used correctly",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": ["Pass", "Fail", "N/A"],
          "settings": { "choiceDisplay": "radio", "layout": { "width": "full" } }
        },
        {
          "id": "weekly_sub_trade_respiratory_fit_test",
          "type": "dropdown",
          "label": "Workers wearing respiratory protection are clean shaven and have up-to-date fit-test",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": ["Pass", "Fail", "N/A"],
          "settings": { "choiceDisplay": "radio", "layout": { "width": "full" } }
        },
        {
          "id": "weekly_sub_trade_leading_edge_tethered",
          "type": "dropdown",
          "label": "Personnel working on leading edges have tools/equipment/hard hat tethered",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": ["Pass", "Fail", "N/A"],
          "settings": { "choiceDisplay": "radio", "layout": { "width": "full" } }
        }
      ]
    },
    {
      "id": "weekly_sub_trade_lighting_electricity",
      "title": "Lighting and Electricity",
      "description": "",
      "settings": { "layout": { "width": "full" } },
      "fields": [
        {
          "id": "weekly_sub_trade_access_lighting",
          "type": "dropdown",
          "label": "Lights provided throughout the project for access / egress routes",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": ["Pass", "Fail", "N/A"],
          "settings": { "choiceDisplay": "radio", "layout": { "width": "full" } }
        },
        {
          "id": "weekly_sub_trade_task_lighting",
          "type": "dropdown",
          "label": "Adequate task lighting is provided for each employee",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": ["Pass", "Fail", "N/A"],
          "settings": { "choiceDisplay": "radio", "layout": { "width": "full" } }
        },
        {
          "id": "weekly_sub_trade_electrical_power",
          "type": "dropdown",
          "label": "Electrical power provided and accessible",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": ["Pass", "Fail", "N/A"],
          "settings": { "choiceDisplay": "radio", "layout": { "width": "full" } }
        }
      ]
    },
    {
      "id": "weekly_sub_trade_hand_power_tools",
      "title": "Hand and Power Tools",
      "description": "",
      "settings": { "layout": { "width": "full" } },
      "fields": [
        {
          "id": "weekly_sub_trade_tools_condition",
          "type": "dropdown",
          "label": "Hand and power tools inspected and maintained in good working order",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": ["Pass", "Fail", "N/A"],
          "settings": { "choiceDisplay": "radio", "layout": { "width": "full" } }
        },
        {
          "id": "weekly_sub_trade_tool_guards",
          "type": "dropdown",
          "label": "Proper guards in place and maintained in good working order",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": ["Pass", "Fail", "N/A"],
          "settings": { "choiceDisplay": "radio", "layout": { "width": "full" } }
        },
        {
          "id": "weekly_sub_trade_tools_intended_use",
          "type": "dropdown",
          "label": "Tools are being used for their intended use",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": ["Pass", "Fail", "N/A"],
          "settings": { "choiceDisplay": "radio", "layout": { "width": "full" } }
        }
      ]
    },
    {
      "id": "weekly_sub_trade_signage_documentation",
      "title": "Signage and Documentation",
      "description": "",
      "settings": { "layout": { "width": "full" } },
      "fields": [
        {
          "id": "weekly_sub_trade_ecp_swp_accessible",
          "type": "dropdown",
          "label": "Your trades Exposure Control Plans and Safe Work Procedures accessible",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": ["Pass", "Fail", "N/A"],
          "settings": { "choiceDisplay": "radio", "layout": { "width": "full" } }
        },
        {
          "id": "weekly_sub_trade_site_safety_map",
          "type": "dropdown",
          "label": "Site safety map posted and all employees are informed of gathering point",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": ["Pass", "Fail", "N/A"],
          "settings": { "choiceDisplay": "radio", "layout": { "width": "full" } }
        },
        {
          "id": "weekly_sub_trade_controlled_area_signage",
          "type": "dropdown",
          "label": "Signage posted in controlled areas to inform workers (ex. Silica exposure, stripping form work, loud work area, overhead hazards, confined space etc.)",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": ["Pass", "Fail", "N/A"],
          "settings": { "choiceDisplay": "radio", "layout": { "width": "full" } }
        }
      ]
    },
    {
      "id": "weekly_sub_trade_msi_prevention",
      "title": "MSI Prevention",
      "description": "",
      "settings": { "layout": { "width": "full" } },
      "fields": [
        {
          "id": "weekly_sub_trade_msi_awareness",
          "type": "dropdown",
          "label": "Workers aware of risk factors, signs and symptoms of MSI injuries, and potential health effects.",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": ["Pass", "Fail", "N/A"],
          "settings": { "choiceDisplay": "radio", "layout": { "width": "full" } }
        },
        {
          "id": "weekly_sub_trade_msi_control_measures",
          "type": "dropdown",
          "label": "Control measures in place, where required, to eliminate or minimize the risk to workers.",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": ["Pass", "Fail", "N/A"],
          "settings": { "choiceDisplay": "radio", "layout": { "width": "full" } }
        }
      ]
    },
    {
      "id": "weekly_sub_trade_corrective_actions",
      "title": "Corrective Actions",
      "description": "",
      "settings": { "layout": { "width": "full" } },
      "fields": [
        {
          "id": "weekly_sub_trade_corrective_actions",
          "type": "action_item_rows",
          "label": "Corrective Actions",
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
  if jsonb_array_length(v_schema -> 'sections') <> 12 then
    raise exception 'Weekly Sub-Trade Site Inspection template conversion failed: expected 12 sections, found %.',
      jsonb_array_length(v_schema -> 'sections');
  end if;

  select coalesce(sum(jsonb_array_length(section_item -> 'fields')), 0)
  into v_field_count
  from jsonb_array_elements(v_schema -> 'sections') as section_item;

  if v_field_count <> 41 then
    raise exception 'Weekly Sub-Trade Site Inspection template conversion failed: expected 41 fields, found %.', v_field_count;
  end if;

  select id
  into v_template_id
  from public.form_templates
  where form_type = 'weekly_sub_trade_site_inspection';

  if v_template_id is null then
    insert into public.form_templates (
      form_type,
      label,
      description,
      renderer_type,
      active,
      worker_visible,
      display_order,
      created_by_staff_id,
      updated_by_staff_id,
      locked_at,
      locked_by_staff_id
    )
    values (
      'weekly_sub_trade_site_inspection',
      'Weekly Sub-Trade Site Inspection',
      'Weekly sub-trade site inspection recreated as an editable V3 template.',
      'template',
      true,
      true,
      120,
      null,
      null,
      null,
      null
    )
    returning id into v_template_id;
  else
    update public.form_templates
    set
      label = 'Weekly Sub-Trade Site Inspection',
      description = 'Weekly sub-trade site inspection recreated as an editable V3 template.',
      renderer_type = 'template',
      active = true,
      worker_visible = true,
      display_order = 120,
      archived_at = null,
      locked_at = null,
      locked_by_staff_id = null,
      created_by_staff_id = null,
      updated_by_staff_id = null,
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
    notes = coalesce(nullif(notes, ''), 'Archived while refreshing Weekly Sub-Trade Site Inspection template.'),
    updated_at = now()
  where template_id = v_template_id
    and status in ('draft', 'published');

  insert into public.form_template_versions (
    template_id,
    form_type,
    version_number,
    status,
    schema,
    notes,
    published_at,
    created_by_staff_id,
    updated_by_staff_id,
    published_by_staff_id,
    created_at,
    updated_at
  )
  values (
    v_template_id,
    'weekly_sub_trade_site_inspection',
    v_next_version,
    'published',
    v_schema,
    'Weekly Sub-Trade Site Inspection recreated from the Salus form as a V3 editable template.',
    now(),
    null,
    null,
    null,
    now(),
    now()
  );
end $$;
