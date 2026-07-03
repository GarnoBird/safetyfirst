do $$
declare
  v_template_id uuid;
  v_next_version integer;
  v_field_count integer;
  v_schema jsonb := $speed_fan_schema$
{
  "schemaVersion": 1,
  "formType": "speed_fan_inspection",
  "title": "Speed Fan Inspection",
  "description": "Speed fan inspection recreated as an editable V3 template.",
  "sections": [
    {
      "id": "speed_fan_general_information",
      "title": "General Information",
      "description": "",
      "settings": { "layout": { "width": "full" } },
      "fields": [
        {
          "id": "speed_fan_weather",
          "type": "short_text",
          "label": "Weather Conditions/Temperature",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": true,
          "options": [],
          "settings": { "layout": { "width": "half" } }
        },
        {
          "id": "speed_fan_count",
          "type": "number",
          "label": "Number of Fan Inspecting",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": [],
          "settings": { "layout": { "width": "half" }, "numberMode": "integer" }
        },
        {
          "id": "speed_fan_inspector_name",
          "type": "short_text",
          "label": "Inspector Name",
          "helperText": "",
          "required": true,
          "default": "worker_name",
          "remember": false,
          "options": [],
          "settings": { "layout": { "width": "half" } }
        },
        {
          "id": "speed_fan_location",
          "type": "long_text",
          "label": "Location: Include Level, Residential or Office, etc.",
          "helperText": "",
          "required": true,
          "default": "",
          "remember": true,
          "options": [],
          "settings": { "layout": { "width": "full" } }
        }
      ]
    },
    {
      "id": "speed_fan_system_verification",
      "title": "Compliant/Meets the Standard",
      "description": "",
      "settings": { "layout": { "width": "full" } },
      "fields": [
        {
          "id": "speed_fan_attention",
          "type": "instructions",
          "label": "ATTENTION:\nAll work must be in conformance with all applicable local health and safety laws, regulations and standards. All fall protection requirements are to be followed in accordance with local requirements. Personal fall protection is required if removal of guardrail is required for inspection and when removing debris from netting.",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": [],
          "settings": { "instructionStyle": "policy", "layout": { "width": "full" } }
        },
        {
          "id": "speed_fan_system_verification_checklist",
          "type": "multi_select",
          "label": "SYSTEM VERIFICATION",
          "helperText": "",
          "required": true,
          "default": "",
          "remember": false,
          "options": [
            "Verify all anchors are snug, in good condition and free from tampering.",
            "Verify all scaffold tube clamps are secured and the scaffold tube is unable to move freely.",
            "Verify all Speed Fan Frame bolted connections are secure and free from damage or tampering.",
            "Verify all Speed Fan Frame structural elements are in good condition and free from any visible damage or deformation.",
            "Carefully, remove all debris or objects from the netting.",
            "Verify no visible damage to coarse or fine debris nets.",
            "Verify wind locks are down and correctly in place"
          ],
          "settings": { "choiceDisplay": "checklist", "layout": { "width": "full" } }
        }
      ]
    },
    {
      "id": "speed_fan_inspection_checklists",
      "title": "Inspection Checklist",
      "description": "Select all inspected items that meet the standard.",
      "settings": { "layout": { "width": "full" } },
      "fields": [
        {
          "id": "speed_fan_general_safety",
          "type": "multi_select",
          "label": "General Safety",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": [
            "Housekeeping",
            "Protruding equipment/hardware",
            "Adequate illumination",
            "Engineer drawings",
            "First Aid attendant",
            "Treatment record book",
            "Signage",
            "Overhead hazards",
            "Excavations",
            "Guardrails in place",
            "First Aid Supplies",
            "WCB Form 7A",
            "Material Storage",
            "Floor Openings Protected",
            "Exposed Rebar",
            "Dust control",
            "Work areas"
          ],
          "settings": { "choiceDisplay": "checklist", "layout": { "width": "half" } }
        },
        {
          "id": "speed_fan_access_egress",
          "type": "multi_select",
          "label": "Access & Egress",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": [
            "Stairwells lighting/clear/railings",
            "Loading Zone",
            "Covered Walkway"
          ],
          "settings": { "choiceDisplay": "checklist", "layout": { "width": "half" } }
        },
        {
          "id": "speed_fan_ppe",
          "type": "multi_select",
          "label": "PPE",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": [
            "Hard hats",
            "Safety footwear",
            "Safety glasses",
            "Hearing protection",
            "Respirator/dust masks",
            "Safety harness",
            "Tom/loose clothing",
            "Hi-Vis Vest"
          ],
          "settings": { "choiceDisplay": "checklist", "layout": { "width": "half" } }
        },
        {
          "id": "speed_fan_ladders",
          "type": "multi_select",
          "label": "Ladders",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": [
            "Secured top or bottom",
            "In good repair",
            "3' above platform",
            "Suitability",
            "Workers not on top 2 steps",
            "Not in hazardous location"
          ],
          "settings": { "choiceDisplay": "checklist", "layout": { "width": "half" } }
        },
        {
          "id": "speed_fan_scaffold",
          "type": "multi_select",
          "label": "Scaffold",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": [
            "Suitability",
            "Firm Base/Wheels locked",
            "Scaffold Installation",
            "All braces on",
            "All connections on",
            "Planks",
            "Guardrails/Handrails"
          ],
          "settings": { "choiceDisplay": "checklist", "layout": { "width": "half" } }
        },
        {
          "id": "speed_fan_tools_equipment",
          "type": "multi_select",
          "label": "Tools & Equipment",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": [
            "Power saws",
            "Drills",
            "Proper Tool Use",
            "Chipping Hammers",
            "Hand tools",
            "Tool Condition",
            "Guards",
            "Lock-out procedures",
            "Operating Procedures"
          ],
          "settings": { "choiceDisplay": "checklist", "layout": { "width": "half" } }
        },
        {
          "id": "speed_fan_electrical_safety",
          "type": "multi_select",
          "label": "Electrical Safety",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": [
            "Temp. power distribution",
            "Assured grounding program",
            "Lockout program",
            "Power cords",
            "Hi-Voltage Hazard",
            "Hi-voltage line protection",
            "Hi-volt. Clearance"
          ],
          "settings": { "choiceDisplay": "checklist", "layout": { "width": "half" } }
        },
        {
          "id": "speed_fan_fire_prevention",
          "type": "multi_select",
          "label": "Fire Prevention",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": [
            "Fire extinguishers",
            "Exits clear",
            "Flammables stored safely"
          ],
          "settings": { "choiceDisplay": "checklist", "layout": { "width": "half" } }
        },
        {
          "id": "speed_fan_whmis",
          "type": "multi_select",
          "label": "WHMIS",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": [
            "Labels on controlled products",
            "MSDS sheets up to date",
            "MSDS for products",
            "Worker training"
          ],
          "settings": { "choiceDisplay": "checklist", "layout": { "width": "half" } }
        },
        {
          "id": "speed_fan_safety_program",
          "type": "multi_select",
          "label": "Safety Program",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": [
            "Following of all applicable rules",
            "Safety Manual On Site",
            "Orientations up to date",
            "Site specific SWP",
            "Training",
            "Record Keeping",
            "Emergency Procedures Posted",
            "Tool box meetings"
          ],
          "settings": { "choiceDisplay": "checklist", "layout": { "width": "half" } }
        },
        {
          "id": "speed_fan_fall_protection",
          "type": "multi_select",
          "label": "Fall Protection",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": [
            "Fall Protection/Arrest being used",
            "Use of control zones",
            "Anchors suitable for application",
            "Equipment inspections",
            "Barricades"
          ],
          "settings": { "choiceDisplay": "checklist", "layout": { "width": "half" } }
        },
        {
          "id": "speed_fan_mobile_equipment",
          "type": "multi_select",
          "label": "Mobile Equipment",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": [
            "Operator qualified",
            "Use of fall protection",
            "Daily Inspection",
            "Safety devices in place"
          ],
          "settings": { "choiceDisplay": "checklist", "layout": { "width": "half" } }
        }
      ]
    },
    {
      "id": "speed_fan_unsafe_act_condition",
      "title": "List of Inspected Topics & Areas, Unsafe Act/Condition",
      "description": "",
      "settings": { "layout": { "width": "full" } },
      "fields": [
        {
          "id": "speed_fan_unsafe_heading",
          "type": "instructions",
          "label": "List of Inspected Topics & Areas, Unsafe Act/Condition",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": [],
          "settings": { "instructionStyle": "heading", "layout": { "width": "full" } }
        },
        {
          "id": "speed_fan_topics_area_inspected",
          "type": "short_text",
          "label": "Topics & Area Inspected",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": [],
          "settings": { "layout": { "width": "full" } }
        },
        {
          "id": "speed_fan_rating",
          "type": "dropdown",
          "label": "Rating",
          "helperText": "Stop work and address the situation immediately, address within 24 hours, or address within 72 hours.",
          "required": false,
          "default": "",
          "remember": false,
          "options": [
            "Stop work and address immediately",
            "Address within 24 hours",
            "Address within 72 hours"
          ],
          "settings": { "choiceDisplay": "radio", "layout": { "width": "full" } }
        },
        {
          "id": "speed_fan_unsafe_condition",
          "type": "short_text",
          "label": "Unsafe Act / Condition",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": [],
          "settings": { "layout": { "width": "full" } }
        },
        {
          "id": "speed_fan_corrected",
          "type": "boolean",
          "label": "Corrected",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": [],
          "settings": { "layout": { "width": "half" } }
        },
        {
          "id": "speed_fan_who_responsible",
          "type": "short_text",
          "label": "Who Is Responsible",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": [],
          "settings": { "layout": { "width": "half" } }
        },
        {
          "id": "speed_fan_unsafe_notes",
          "type": "long_text",
          "label": "Notes",
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
      "id": "speed_fan_safety_concerns",
      "title": "List of Safety Concerns Raised",
      "description": "",
      "settings": { "layout": { "width": "full" } },
      "fields": [
        {
          "id": "speed_fan_safety_concerns_heading",
          "type": "instructions",
          "label": "List of Safety Concerns Raised",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": [],
          "settings": { "instructionStyle": "heading", "layout": { "width": "full" } }
        },
        {
          "id": "speed_fan_safety_concern",
          "type": "short_text",
          "label": "Safety Concerns Raised",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": [],
          "settings": { "layout": { "width": "half" } }
        },
        {
          "id": "speed_fan_raised_by",
          "type": "short_text",
          "label": "Raised By",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": [],
          "settings": { "layout": { "width": "half" } }
        },
        {
          "id": "speed_fan_referred_to",
          "type": "short_text",
          "label": "Referred To",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": [],
          "settings": { "layout": { "width": "half" } }
        },
        {
          "id": "speed_fan_follow_up_by",
          "type": "short_text",
          "label": "Follow-up (By Who)",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": [],
          "settings": { "layout": { "width": "half" } }
        },
        {
          "id": "speed_fan_follow_up_date",
          "type": "date",
          "label": "Follow-up (By Date)",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": [],
          "settings": { "layout": { "width": "half" } }
        },
        {
          "id": "speed_fan_safety_notes",
          "type": "long_text",
          "label": "Notes",
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
      "id": "speed_fan_photos_signoff",
      "title": "Photos and Signoff",
      "description": "",
      "settings": { "layout": { "width": "full" } },
      "fields": [
        {
          "id": "speed_fan_inspection_notes",
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
          "id": "speed_fan_photo",
          "type": "media_upload",
          "label": "Add Photo",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": [],
          "settings": { "mediaUpload": { "acceptedKinds": ["image"] }, "layout": { "width": "half" } }
        },
        {
          "id": "speed_fan_inspector_signature",
          "type": "signature",
          "label": "Inspector Signatures",
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
$speed_fan_schema$::jsonb;
begin
  if jsonb_array_length(v_schema -> 'sections') <> 6 then
    raise exception 'Speed Fan Inspection template conversion failed: expected 6 sections, found %.',
      jsonb_array_length(v_schema -> 'sections');
  end if;

  select coalesce(sum(jsonb_array_length(section_item -> 'fields')), 0)
  into v_field_count
  from jsonb_array_elements(v_schema -> 'sections') as section_item;

  if v_field_count <> 35 then
    raise exception 'Speed Fan Inspection template conversion failed: expected 35 fields, found %.', v_field_count;
  end if;

  select id
  into v_template_id
  from public.form_templates
  where form_type = 'speed_fan_inspection';

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
      'speed_fan_inspection',
      'Speed Fan Inspection',
      'Speed fan inspection recreated as an editable V3 template.',
      'template',
      true,
      false,
      60
    )
    returning id into v_template_id;
  else
    update public.form_templates
    set
      label = 'Speed Fan Inspection',
      description = 'Speed fan inspection recreated as an editable V3 template.',
      renderer_type = 'template',
      active = true,
      worker_visible = false,
      display_order = 60,
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
    notes = coalesce(nullif(notes, ''), 'Draft archived while refreshing Speed Fan Inspection template.'),
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
    'speed_fan_inspection',
    v_next_version,
    'draft',
    v_schema,
    'Speed Fan Inspection legacy form recreated as a V3 editable template.',
    null,
    now(),
    now()
  );
end $$;

do $$
declare
  v_template_id uuid;
  v_next_version integer;
  v_field_count integer;
  v_schema jsonb := $hoist_schema$
{
  "schemaVersion": 1,
  "formType": "hoist_competency_observation",
  "title": "Hoist Competency Observation",
  "description": "Hoist competency observation recreated as an editable V3 template.",
  "sections": [
    {
      "id": "hoist_form_details",
      "title": "Form Details",
      "description": "",
      "settings": { "layout": { "width": "full" } },
      "fields": [
        {
          "id": "hoist_intro",
          "type": "instructions",
          "label": "The competency observation form is one method of documenting effective training of workers. It is a method of evaluating continual competency.",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": [],
          "settings": { "instructionStyle": "policy", "layout": { "width": "full" } }
        },
        {
          "id": "hoist_is_appia_worker",
          "type": "dropdown",
          "label": "Is this an Appia worker?",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": ["Yes", "No"],
          "settings": { "choiceDisplay": "radio", "optionPreset": "yes_no", "layout": { "width": "half" } }
        },
        {
          "id": "hoist_worker_observed",
          "type": "short_text",
          "label": "Name of worker observed",
          "helperText": "",
          "required": false,
          "default": "worker_name",
          "remember": false,
          "options": [],
          "settings": { "layout": { "width": "half" } }
        },
        {
          "id": "hoist_employer_observed",
          "type": "short_text",
          "label": "Employer of worker observed",
          "helperText": "",
          "required": true,
          "default": "",
          "remember": true,
          "options": [],
          "settings": {
            "layout": { "width": "half" },
            "visibility": {
              "enabled": true,
              "sourceFieldId": "hoist_is_appia_worker",
              "operator": "equals",
              "value": "No"
            }
          }
        },
        {
          "id": "hoist_area_observed",
          "type": "long_text",
          "label": "General area competency observed (level, side, unit)",
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
      "id": "hoist_pre_use_safety_check",
      "title": "Pre-Use and Safety Check",
      "description": "",
      "settings": { "layout": { "width": "full" } },
      "fields": [
        {
          "id": "hoist_pre_use_heading",
          "type": "instructions",
          "label": "Pre-Use and Safety Check",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": [],
          "settings": { "instructionStyle": "heading", "layout": { "width": "full" } }
        },
        {
          "id": "hoist_pre_use_inspection",
          "type": "dropdown",
          "label": "Performs pre-use inspection (cables, brakes, controls, doors)",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": ["Yes", "No", "N/A"],
          "settings": { "choiceDisplay": "radio", "optionPreset": "yes_no_na", "layout": { "width": "full" } }
        },
        {
          "id": "hoist_tests_communication",
          "type": "dropdown",
          "label": "Tests communication system and emergency stop",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": ["Yes", "No", "N/A"],
          "settings": { "choiceDisplay": "radio", "optionPreset": "yes_no_na", "layout": { "width": "full" } }
        },
        {
          "id": "hoist_clean_safe_access",
          "type": "dropdown",
          "label": "Maintains clean and safe access to hoist",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": ["Yes", "No", "N/A"],
          "settings": { "choiceDisplay": "radio", "optionPreset": "yes_no_na", "layout": { "width": "full" } }
        }
      ]
    },
    {
      "id": "hoist_operation_safety_awareness",
      "title": "Operation and Safety Awareness",
      "description": "",
      "settings": { "layout": { "width": "full" } },
      "fields": [
        {
          "id": "hoist_operation_heading",
          "type": "instructions",
          "label": "Operation and Safety Awareness",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": [],
          "settings": { "instructionStyle": "heading", "layout": { "width": "full" } }
        },
        {
          "id": "hoist_operates_smoothly",
          "type": "dropdown",
          "label": "Operates smoothly and within load limits",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": ["Yes", "No", "N/A"],
          "settings": { "choiceDisplay": "radio", "optionPreset": "yes_no_na", "layout": { "width": "full" } }
        },
        {
          "id": "hoist_uses_communication",
          "type": "dropdown",
          "label": "Uses communication protocols effectively",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": ["Yes", "No", "N/A"],
          "settings": { "choiceDisplay": "radio", "optionPreset": "yes_no_na", "layout": { "width": "full" } }
        },
        {
          "id": "hoist_gates_doors",
          "type": "dropdown",
          "label": "Ensures all gates/doors closed before movement",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": ["Yes", "No", "N/A"],
          "settings": { "choiceDisplay": "radio", "optionPreset": "yes_no_na", "layout": { "width": "full" } }
        }
      ]
    },
    {
      "id": "hoist_verbal_check",
      "title": "Verbal Check",
      "description": "",
      "settings": { "layout": { "width": "full" } },
      "fields": [
        {
          "id": "hoist_verbal_heading",
          "type": "instructions",
          "label": "Verbal Check",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": [],
          "settings": { "instructionStyle": "heading", "layout": { "width": "full" } }
        },
        {
          "id": "hoist_rated_capacity",
          "type": "multi_select",
          "label": "What is the hoist rated capacity?",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": ["Pass", "Fail"],
          "settings": { "choiceDisplay": "checklist", "layout": { "width": "half" } }
        },
        {
          "id": "hoist_failure_question",
          "type": "multi_select",
          "label": "What would you do in case of a hoist failure?",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": ["Pass", "Fail"],
          "settings": { "choiceDisplay": "checklist", "layout": { "width": "half" } }
        }
      ]
    },
    {
      "id": "hoist_outcome_signatures",
      "title": "Outcome and Signatures",
      "description": "",
      "settings": { "layout": { "width": "full" } },
      "fields": [
        {
          "id": "hoist_additional_comments",
          "type": "long_text",
          "label": "Additional comments",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": [],
          "settings": { "layout": { "width": "full" } }
        },
        {
          "id": "hoist_evaluation_outcome",
          "type": "dropdown",
          "label": "Evaluation Outcome",
          "helperText": "",
          "required": true,
          "default": "",
          "remember": false,
          "options": [
            "Competent - Approved to operate",
            "Needs Improvement - Retraining required",
            "Not Competent - Do not operate"
          ],
          "settings": { "choiceDisplay": "radio", "layout": { "width": "full" } }
        },
        {
          "id": "hoist_operator_signature",
          "type": "signature",
          "label": "Operator Signature",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": [],
          "settings": { "layout": { "width": "half" } }
        },
        {
          "id": "hoist_evaluator_signature",
          "type": "signature",
          "label": "Evaluator Signature",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": [],
          "settings": { "layout": { "width": "half" } }
        }
      ]
    }
  ]
}
$hoist_schema$::jsonb;
begin
  if jsonb_array_length(v_schema -> 'sections') <> 5 then
    raise exception 'Hoist Competency Observation template conversion failed: expected 5 sections, found %.',
      jsonb_array_length(v_schema -> 'sections');
  end if;

  select coalesce(sum(jsonb_array_length(section_item -> 'fields')), 0)
  into v_field_count
  from jsonb_array_elements(v_schema -> 'sections') as section_item;

  if v_field_count <> 20 then
    raise exception 'Hoist Competency Observation template conversion failed: expected 20 fields, found %.', v_field_count;
  end if;

  select id
  into v_template_id
  from public.form_templates
  where form_type = 'hoist_competency_observation';

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
      'hoist_competency_observation',
      'Hoist Competency Observation',
      'Hoist competency observation recreated as an editable V3 template.',
      'template',
      true,
      false,
      70
    )
    returning id into v_template_id;
  else
    update public.form_templates
    set
      label = 'Hoist Competency Observation',
      description = 'Hoist competency observation recreated as an editable V3 template.',
      renderer_type = 'template',
      active = true,
      worker_visible = false,
      display_order = 70,
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
    notes = coalesce(nullif(notes, ''), 'Draft archived while refreshing Hoist Competency Observation template.'),
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
    'hoist_competency_observation',
    v_next_version,
    'draft',
    v_schema,
    'Hoist Competency Observation legacy form recreated as a V3 editable template.',
    null,
    now(),
    now()
  );
end $$;
