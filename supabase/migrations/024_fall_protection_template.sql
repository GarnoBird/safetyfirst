do $$
declare
  v_template_id uuid;
  v_next_version integer;
  v_field_count integer;
  v_schema jsonb := $schema$
{
  "schemaVersion": 1,
  "formType": "fall_protection_form",
  "title": "Fall Protection Form",
  "description": "Fall protection equipment inspection checklist and log recreated as an editable V3 template.",
  "sections": [
    {
      "id": "fall_protection_log",
      "title": "Fall Protection Equipment Inspection Checklist and Log",
      "description": "",
      "settings": { "layout": { "width": "half" } },
      "fields": [
        {
          "id": "fall_inspection_date",
          "type": "date",
          "label": "Inspection Date",
          "helperText": "",
          "required": true,
          "default": "today",
          "remember": false,
          "options": [],
          "settings": { "layout": { "width": "half" } }
        },
        {
          "id": "fall_worker_name",
          "type": "short_text",
          "label": "Worker's Name",
          "helperText": "",
          "required": true,
          "default": "worker_name",
          "remember": false,
          "options": [],
          "settings": { "layout": { "width": "half" } }
        },
        {
          "id": "fall_equipment_inspected",
          "type": "dropdown",
          "label": "Equipment Inspected",
          "helperText": "",
          "required": true,
          "default": "",
          "remember": false,
          "options": ["Full Body Harness", "Lanyard", "Vertical Life Line", "Rope Grab", "SRL - Type 1/2/3"],
          "settings": { "choiceDisplay": "radio", "layout": { "width": "full" } }
        },
        {
          "id": "fall_manufacturer_instruction_notice",
          "type": "instructions",
          "label": "If you are not sure about any part of the inspection, check the manufacturer's instructions.",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": [],
          "settings": { "instructionStyle": "policy", "layout": { "width": "full" } }
        }
      ]
    },
    {
      "id": "fall_equipment_information",
      "title": "Equipment Information",
      "description": "",
      "settings": { "layout": { "width": "half" } },
      "fields": [
        {
          "id": "fall_inspection_scope",
          "type": "instructions",
          "label": "Inspect the fall protection equipment using the manufacturer's instructions and look for deficiencies including corrosion, fraying, broken stitching, bird-caging, broken plastic components, pits, burrs, rough surfaces, sharp edges, rust, paint buildup, excessive heating, alterations, and missing or illegible labels. Immediately remove equipment from service if defects or damage are found.",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": [],
          "settings": { "instructionStyle": "policy", "layout": { "width": "full" } }
        },
        {
          "id": "fall_equipment_input_method",
          "type": "dropdown",
          "label": "How will you input Make/Model/Serial # information?",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": ["Manually", "Photo", "Select Appia Asset"],
          "settings": { "choiceDisplay": "radio", "layout": { "width": "full" } }
        },
        {
          "id": "fall_equipment_make",
          "type": "short_text",
          "label": "Make",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": true,
          "options": [],
          "settings": { "layout": { "width": "half" } }
        },
        {
          "id": "fall_equipment_model",
          "type": "short_text",
          "label": "Model",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": true,
          "options": [],
          "settings": { "layout": { "width": "half" } }
        },
        {
          "id": "fall_equipment_serial",
          "type": "short_text",
          "label": "Serial #",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": true,
          "options": [],
          "settings": { "layout": { "width": "half" } }
        },
        {
          "id": "fall_equipment_mfg_date",
          "type": "short_text",
          "label": "Mfg date",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": [],
          "settings": { "layout": { "width": "half" } }
        },
        {
          "id": "fall_equipment_photos",
          "type": "media_upload",
          "label": "Add images of Make/Model/Serial #/Mfg date instead of typing above",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": [],
          "settings": { "layout": { "width": "full" }, "mediaUpload": { "acceptedKinds": ["image"] } }
        },
        {
          "id": "fall_harness_asset",
          "type": "short_text",
          "label": "Select harness to be inspected (Appia only)",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": [],
          "settings": {
            "layout": { "width": "half" },
            "visibility": { "enabled": true, "sourceFieldId": "fall_equipment_input_method", "operator": "equals", "value": "Select Appia Asset" }
          }
        },
        {
          "id": "fall_lanyard_asset",
          "type": "short_text",
          "label": "Select lanyard to be inspected (Appia only)",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": [],
          "settings": {
            "layout": { "width": "half" },
            "visibility": { "enabled": true, "sourceFieldId": "fall_equipment_input_method", "operator": "equals", "value": "Select Appia Asset" }
          }
        },
        {
          "id": "fall_vertical_lifeline_asset",
          "type": "short_text",
          "label": "Select vertical life line to be inspected (Appia only)",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": [],
          "settings": {
            "layout": { "width": "half" },
            "visibility": { "enabled": true, "sourceFieldId": "fall_equipment_input_method", "operator": "equals", "value": "Select Appia Asset" }
          }
        },
        {
          "id": "fall_rope_grab_asset",
          "type": "short_text",
          "label": "Select rope grab to be inspected (Appia only)",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": [],
          "settings": {
            "layout": { "width": "half" },
            "visibility": { "enabled": true, "sourceFieldId": "fall_equipment_input_method", "operator": "equals", "value": "Select Appia Asset" }
          }
        },
        {
          "id": "fall_srl_asset",
          "type": "short_text",
          "label": "Select Self Retracting Lifeline to be inspected (Appia only)",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": [],
          "settings": {
            "layout": { "width": "half" },
            "visibility": { "enabled": true, "sourceFieldId": "fall_equipment_input_method", "operator": "equals", "value": "Select Appia Asset" }
          }
        }
      ]
    },
    {
      "id": "fall_harness_inspection",
      "title": "11-06 Harness Inspection",
      "description": "",
      "settings": {
        "layout": { "width": "half" },
        "visibility": { "enabled": true, "sourceFieldId": "fall_equipment_inspected", "operator": "equals", "value": "Full Body Harness" }
      },
      "fields": [
        {
          "id": "fall_harness_has_indicator",
          "type": "dropdown",
          "label": "Does the harness have a fall arrest indicator?",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": ["Yes", "No"],
          "settings": { "choiceDisplay": "radio", "optionPreset": "yes_no", "layout": { "width": "full" } }
        },
        {
          "id": "fall_harness_indicator",
          "type": "multi_select",
          "label": "Identify fall arrest indicator defects",
          "helperText": "Original form note: check box = NO.",
          "required": false,
          "default": "",
          "remember": false,
          "options": ["Is it deployed?", "Is it damaged?"],
          "settings": { "choiceDisplay": "checklist", "layout": { "width": "half" } }
        },
        {
          "id": "fall_harness_label",
          "type": "multi_select",
          "label": "Manufacturer Label",
          "helperText": "Original form note: check box = YES.",
          "required": false,
          "default": "",
          "remember": false,
          "options": ["Label Present", "Fully Legible", "CSA/ ANSI Approved"],
          "settings": { "choiceDisplay": "checklist", "layout": { "width": "half" } }
        },
        {
          "id": "fall_harness_webbing",
          "type": "multi_select",
          "label": "Webbing defects",
          "helperText": "Inspect for cuts, burns, tears, abrasion, frays, excessive soiling, writing, and discoloration.",
          "required": false,
          "default": "",
          "remember": false,
          "options": ["Cuts / Frays / Holes", "Grease / Paint / Stains", "Discoloration", "Burnt/Melted fibers", "Chemicals / Odor", "Missing/Pulled stitches", "Uneven width", "Undue stretching", "Hard or shiny spots", "Missing straps", "Writing/ Modification", "Mold/ Mildew"],
          "settings": { "choiceDisplay": "checklist", "layout": { "width": "full" } }
        },
        {
          "id": "fall_harness_keepers",
          "type": "multi_select",
          "label": "Keepers defects",
          "helperText": "Original form note: check box = NO.",
          "required": false,
          "default": "",
          "remember": false,
          "options": ["Missing", "Cut/ Broken", "Sharp Edge", "Burnt/ Melted", "Stretched/ Distorted", "Paint/ Stains"],
          "settings": { "choiceDisplay": "checklist", "layout": { "width": "half" } }
        },
        {
          "id": "fall_harness_hardware",
          "type": "multi_select",
          "label": "Hardware defects",
          "helperText": "Look for distortion, sharp edges, burrs, cracks, corrosion, and proper operation.",
          "required": false,
          "default": "",
          "remember": false,
          "options": ["Missing", "Paint/ Stains", "Rust", "Cracks/ Nicks", "Rough/ Sharp Edges", "Welds", "Bent/ Distorted", "Buckles defective", "Springs stuck"],
          "settings": { "choiceDisplay": "checklist", "layout": { "width": "half" } }
        },
        {
          "id": "fall_harness_comments",
          "type": "long_text",
          "label": "PASS or FAIL? Comment as needed.",
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
      "id": "fall_srl_inspection",
      "title": "11-09 SRL Inspection",
      "description": "",
      "settings": {
        "layout": { "width": "half" },
        "visibility": { "enabled": true, "sourceFieldId": "fall_equipment_inspected", "operator": "equals", "value": "SRL - Type 1/2/3" }
      },
      "fields": [
        {
          "id": "fall_srl_has_indicator",
          "type": "dropdown",
          "label": "Does the SRL have a fall arrest indicator?",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": ["Yes", "No"],
          "settings": { "choiceDisplay": "radio", "optionPreset": "yes_no", "layout": { "width": "full" } }
        },
        {
          "id": "fall_srl_indicator",
          "type": "multi_select",
          "label": "Fall Arrest Indicator defects",
          "helperText": "Original form note: check box = NO.",
          "required": false,
          "default": "",
          "remember": false,
          "options": ["Is it deployed?", "Is it damaged?"],
          "settings": { "choiceDisplay": "checklist", "layout": { "width": "half" } }
        },
        {
          "id": "fall_srl_label",
          "type": "multi_select",
          "label": "Manufacturer Label",
          "helperText": "Original form note: check box = YES.",
          "required": false,
          "default": "",
          "remember": false,
          "options": ["Label Present", "Fully Legible", "CSA/ ANSI Approved"],
          "settings": { "choiceDisplay": "checklist", "layout": { "width": "half" } }
        },
        {
          "id": "fall_srl_operation",
          "type": "multi_select",
          "label": "Operation",
          "helperText": "Original form note: check box = YES.",
          "required": false,
          "default": "",
          "remember": false,
          "options": ["Retracts smoothly", "Breaks normally", "Hooks operating"],
          "settings": { "choiceDisplay": "checklist", "layout": { "width": "half" } }
        },
        {
          "id": "fall_srl_housing_hardware",
          "type": "multi_select",
          "label": "Housing and Hardware defects",
          "helperText": "Original form note: check box = NO.",
          "required": false,
          "default": "",
          "remember": false,
          "options": ["Bent/ Distorted", "Cracks/ Nicks", "Broken", "Worn", "Rust"],
          "settings": { "choiceDisplay": "checklist", "layout": { "width": "half" } }
        },
        {
          "id": "fall_srl_lifeline_type",
          "type": "dropdown",
          "label": "Type of Lifeline",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": ["Webbing", "Cable"],
          "settings": { "choiceDisplay": "radio", "layout": { "width": "full" } }
        },
        {
          "id": "fall_srl_webbing_lifeline",
          "type": "multi_select",
          "label": "Webbing Lifeline defects",
          "helperText": "Original form note: check box = NO.",
          "required": false,
          "default": "",
          "remember": false,
          "options": ["Cuts / Frays / Holes", "Grease / Paint / Stains", "Discoloration", "Burnt/Melted fibers", "Chemicals / Odor", "Missing/Pulled stitches", "Uneven width", "Undue stretching", "Hard or shiny spots", "Writing/ Modification", "Mold/ Mildew", "Knots"],
          "settings": { "choiceDisplay": "checklist", "layout": { "width": "full" } }
        },
        {
          "id": "fall_srl_cable_lifeline",
          "type": "multi_select",
          "label": "Cable Lifeline defects",
          "helperText": "Original form note: check box = NO.",
          "required": false,
          "default": "",
          "remember": false,
          "options": ["Bent/ Distorted", "Cracks/ Nicks", "Broken", "Worn", "Rust", "Paint/ Stains", "Welds", "Rough/ Sharp Edges", "Bird Caging", "Crushed/ Flattened", "Uneven width"],
          "settings": { "choiceDisplay": "checklist", "layout": { "width": "full" } }
        },
        {
          "id": "fall_srl_comments",
          "type": "long_text",
          "label": "PASS or FAIL? Comment as needed.",
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
      "id": "fall_lanyard_inspection",
      "title": "11-11 Lanyard Inspection",
      "description": "",
      "settings": {
        "layout": { "width": "half" },
        "visibility": { "enabled": true, "sourceFieldId": "fall_equipment_inspected", "operator": "equals", "value": "Lanyard" }
      },
      "fields": [
        {
          "id": "fall_lanyard_has_indicator",
          "type": "dropdown",
          "label": "Does the lanyard have a fall arrest indicator?",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": ["Yes", "No"],
          "settings": { "choiceDisplay": "radio", "optionPreset": "yes_no", "layout": { "width": "full" } }
        },
        {
          "id": "fall_lanyard_indicator",
          "type": "multi_select",
          "label": "Fall Arrest Indicator defects",
          "helperText": "Original form note: check box = NO.",
          "required": false,
          "default": "",
          "remember": false,
          "options": ["Is it deployed?", "Is it damaged?"],
          "settings": { "choiceDisplay": "checklist", "layout": { "width": "half" } }
        },
        {
          "id": "fall_lanyard_label",
          "type": "multi_select",
          "label": "Manufacturer Label",
          "helperText": "Original form note: check box = YES.",
          "required": false,
          "default": "",
          "remember": false,
          "options": ["Label Present", "Fully Legible", "CSA/ ANSI Approved"],
          "settings": { "choiceDisplay": "checklist", "layout": { "width": "half" } }
        },
        {
          "id": "fall_lanyard_webbing_rope",
          "type": "multi_select",
          "label": "Webbing / Synthetic Rope defects",
          "helperText": "Note: Writing on webbing, unauthorized modifications, and partial deployment of shock absorber.",
          "required": false,
          "default": "",
          "remember": false,
          "options": ["Cuts / Frays / Holes", "Grease / Paint / Stains", "Discoloration", "Burnt/Melted fibers", "Chemicals / Odor", "Missing/Pulled stitches", "Uneven width", "Undue stretching", "Hard or shiny spots", "Writing/ Modification", "Mold/ Mildew", "Knots", "Unraveling or worn fibers"],
          "settings": { "choiceDisplay": "checklist", "layout": { "width": "full" } }
        },
        {
          "id": "fall_lanyard_keepers",
          "type": "multi_select",
          "label": "Keepers defects",
          "helperText": "Original form note: check box = NO.",
          "required": false,
          "default": "",
          "remember": false,
          "options": ["Missing", "Cut/ Broken", "Sharp Edge", "Burnt/ Melted", "Stretched/ Distorted", "Paint/ Stains", "Bent/ Distorted"],
          "settings": { "choiceDisplay": "checklist", "layout": { "width": "half" } }
        },
        {
          "id": "fall_lanyard_hardware_cable",
          "type": "multi_select",
          "label": "Hardware / Cable defects",
          "helperText": "Look for distortion, sharp edges, burrs, cracks, corrosion, and proper operation.",
          "required": false,
          "default": "",
          "remember": false,
          "options": ["Bent/ Distorted", "Cracks/ Nicks", "Broken", "Rust", "Paint/ Stains", "Welds", "Rough/ Sharp Edges", "Bird Caging", "Crushed/ Flattened", "Uneven width"],
          "settings": { "choiceDisplay": "checklist", "layout": { "width": "half" } }
        },
        {
          "id": "fall_lanyard_comments",
          "type": "long_text",
          "label": "PASS or FAIL? Comment as needed.",
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
      "id": "fall_vertical_lifeline_inspection",
      "title": "11-12 Vertical Lifeline Inspection",
      "description": "",
      "settings": {
        "layout": { "width": "half" },
        "visibility": { "enabled": true, "sourceFieldId": "fall_equipment_inspected", "operator": "equals", "value": "Vertical Life Line" }
      },
      "fields": [
        {
          "id": "fall_vertical_labels_markings",
          "type": "multi_select",
          "label": "Labels and Markings",
          "helperText": "Original form note: check box = YES.",
          "required": false,
          "default": "",
          "remember": false,
          "options": ["Label Present", "Fully Legible", "CSA/ ANSI Approved", "Inspections up to date"],
          "settings": { "choiceDisplay": "checklist", "layout": { "width": "half" } }
        },
        {
          "id": "fall_vertical_hardware",
          "type": "multi_select",
          "label": "Hardware, Buckles and D-Rings",
          "helperText": "Original form note: check box = PASS.",
          "required": false,
          "default": "",
          "remember": false,
          "options": ["Connector (Self-closing and locking)", "Hook Gate/ Rivets", "Corrosion", "Pitted or Nicks"],
          "settings": { "choiceDisplay": "checklist", "layout": { "width": "half" } }
        },
        {
          "id": "fall_vertical_cable_rope",
          "type": "multi_select",
          "label": "Cable or Rope",
          "helperText": "Inspect for broken threads, loose eye connections, excessive abrasions, crushing, and stretching.",
          "required": false,
          "default": "",
          "remember": false,
          "options": ["Cuts / Frays / Holes", "Burnt/Melted fibers", "Missing/Pulled stitches", "Termination (Stitching, splice or swage)", "Kinks", "Separation or Bird Caging"],
          "settings": { "choiceDisplay": "checklist", "layout": { "width": "full" } }
        },
        {
          "id": "fall_vertical_has_shock_pack",
          "type": "dropdown",
          "label": "Does the Vertical Lifeline include a Shock Pack?",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": ["Yes", "No"],
          "settings": { "choiceDisplay": "radio", "optionPreset": "yes_no", "layout": { "width": "full" } }
        },
        {
          "id": "fall_vertical_shock_pack",
          "type": "multi_select",
          "label": "Shock Pack",
          "helperText": "Original form note: check box = PASS.",
          "required": false,
          "default": "",
          "remember": false,
          "options": ["Cover/Shrink Tube (Don't cut or remove)", "Damage/ Fraying/ Broken Stitching", "Impact Indicator"],
          "settings": { "choiceDisplay": "checklist", "layout": { "width": "half" } }
        },
        {
          "id": "fall_vertical_comments",
          "type": "long_text",
          "label": "PASS or FAIL? Comment as needed.",
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
      "id": "fall_rope_grab_inspection",
      "title": "11-13 Rope Grab Inspection",
      "description": "",
      "settings": {
        "layout": { "width": "half" },
        "visibility": { "enabled": true, "sourceFieldId": "fall_equipment_inspected", "operator": "equals", "value": "Rope Grab" }
      },
      "fields": [
        {
          "id": "fall_rope_labels",
          "type": "multi_select",
          "label": "Labels",
          "helperText": "Inspect to ensure all labels are present and held securely in place, all text is legible, and directional indicators are visible.",
          "required": false,
          "default": "",
          "remember": false,
          "options": ["Visible \"Up\" arrow", "Visible CSA/ANSI approval", "Visible rope diameter"],
          "settings": { "choiceDisplay": "checklist", "layout": { "width": "half" } }
        },
        {
          "id": "fall_rope_metal_condition",
          "type": "multi_select",
          "label": "Metal Condition defects",
          "helperText": "Original form note: check box = NO.",
          "required": false,
          "default": "",
          "remember": false,
          "options": ["Paint/ Stains", "Rust", "Corrosion", "Cracks/ Nicks", "Welds", "Bent/ Distorted", "Rough/ Sharp Edges"],
          "settings": { "choiceDisplay": "checklist", "layout": { "width": "half" } }
        },
        {
          "id": "fall_rope_parts_condition",
          "type": "multi_select",
          "label": "Parts Condition",
          "helperText": "Original form note: check box = YES.",
          "required": false,
          "default": "",
          "remember": false,
          "options": ["Anti-panic components in working condition", "Spring in working condition", "Gravity latch present and in working condition", "Locking screw present and in working condition", "Secondary lock present and in working condition", "Roller guide present and in working condition", "Opens and closes smoothly with no debris or rust in hinges"],
          "settings": { "choiceDisplay": "checklist", "layout": { "width": "full" } }
        },
        {
          "id": "fall_rope_operating_condition",
          "type": "multi_select",
          "label": "Operating condition",
          "helperText": "Locking mechanism functioning, all connectors present and functioning, gates open/close, system operates as designed.",
          "required": false,
          "default": "",
          "remember": false,
          "options": ["Arresting function in working condition", "Panic function in working condition", "Does not close upside down (if applicable)", "Moves smoothly upwards when pulled by attached lanyard (Automatic type only)", "Moves smoothly downwards when pulled through back"],
          "settings": { "choiceDisplay": "checklist", "layout": { "width": "full" } }
        },
        {
          "id": "fall_rope_comments",
          "type": "long_text",
          "label": "PASS or FAIL? Comment as needed.",
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
      "id": "fall_signatures",
      "title": "Signatures",
      "description": "",
      "settings": { "layout": { "width": "half" } },
      "fields": [
        {
          "id": "fall_general_notes",
          "type": "long_text",
          "label": "Notes",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": [],
          "settings": { "layout": { "width": "full" } }
        },
        {
          "id": "fall_inspector_name",
          "type": "short_text",
          "label": "Inspector's Name",
          "helperText": "",
          "required": false,
          "default": "worker_name",
          "remember": false,
          "options": [],
          "settings": { "layout": { "width": "half" } }
        },
        {
          "id": "fall_inspector_signature",
          "type": "signature",
          "label": "Inspector's Signature",
          "helperText": "",
          "required": true,
          "default": "",
          "remember": false,
          "options": [],
          "settings": { "layout": { "width": "half" } }
        }
      ]
    }
  ]
}
$schema$::jsonb;
begin
  if jsonb_array_length(v_schema -> 'sections') <> 8 then
    raise exception 'Fall Protection Form template conversion failed: expected 8 sections, found %.',
      jsonb_array_length(v_schema -> 'sections');
  end if;

  select coalesce(sum(jsonb_array_length(section_item -> 'fields')), 0)
  into v_field_count
  from jsonb_array_elements(v_schema -> 'sections') as section_item;

  if v_field_count <> 53 then
    raise exception 'Fall Protection Form template conversion failed: expected 53 fields, found %.', v_field_count;
  end if;

  select id
  into v_template_id
  from public.form_templates
  where form_type = 'fall_protection_form';

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
      'fall_protection_form',
      'Fall Protection Form',
      'Fall protection equipment inspection checklist and log recreated as an editable V3 template.',
      'template',
      true,
      false,
      80
    )
    returning id into v_template_id;
  else
    update public.form_templates
    set
      label = 'Fall Protection Form',
      description = 'Fall protection equipment inspection checklist and log recreated as an editable V3 template.',
      renderer_type = 'template',
      active = true,
      worker_visible = false,
      display_order = 80,
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
    notes = coalesce(nullif(notes, ''), 'Draft archived while refreshing Fall Protection Form template.'),
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
    'fall_protection_form',
    v_next_version,
    'draft',
    v_schema,
    'Fall Protection Form legacy inspection recreated as a V3 editable template.',
    null,
    now(),
    now()
  );
end $$;
