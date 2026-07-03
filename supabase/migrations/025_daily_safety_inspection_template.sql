do $$
declare
  v_template_id uuid;
  v_next_version integer;
  v_field_count integer;
  v_schema jsonb := $schema$
{
  "schemaVersion": 1,
  "formType": "daily_safety_inspection",
  "title": "Daily Safety Inspection",
  "description": "Daily safety inspection recreated as an editable V3 template.",
  "sections": [
    {
      "id": "daily_work_area_inspection_report",
      "title": "Work Area Inspection Report",
      "description": "",
      "settings": { "layout": { "width": "full" } },
      "fields": [
        {
          "id": "daily_today_date",
          "type": "date",
          "label": "Today's Date",
          "helperText": "",
          "required": true,
          "default": "today",
          "remember": false,
          "options": [],
          "settings": { "layout": { "width": "half" } }
        },
        {
          "id": "daily_safety_coordinator",
          "type": "dropdown",
          "label": "Safety Coordinator / OFA",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": true,
          "options": ["Leanne", "Diesel", "Guy", "Gabriel"],
          "settings": { "choiceDisplay": "select", "layout": { "width": "half" } }
        },
        {
          "id": "daily_weather_conditions",
          "type": "short_text",
          "label": "Weather Conditions / Temperature",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": true,
          "options": [],
          "settings": { "layout": { "width": "half" } }
        },
        {
          "id": "daily_number_trades",
          "type": "number",
          "label": "Number of Trades",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": [],
          "settings": { "layout": { "width": "half" } }
        },
        {
          "id": "daily_number_workers",
          "type": "number",
          "label": "Number of Workers",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": [],
          "settings": { "layout": { "width": "half" } }
        },
        {
          "id": "daily_asset_log",
          "type": "short_text",
          "label": "Asset Log (if any)",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": [],
          "settings": { "layout": { "width": "half" } }
        },
        {
          "id": "daily_hazards_summary",
          "type": "long_text",
          "label": "Today's Hazards / Activities Summary",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": [],
          "settings": { "layout": { "width": "full" } }
        },
        {
          "id": "daily_radio_check_complete",
          "type": "multi_select",
          "label": "Radio Check Complete",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": [
            "Radio ID: First Aid",
            "User: First Aid Room",
            "Radio ID: Diesel",
            "User: Diesel",
            "Radio ID: Gabriel",
            "User: Gabriel",
            "Radio ID: Guy",
            "User: Guy",
            "Radio ID: Leanne",
            "User: Leanne",
            "Radio ID: Flagger 1",
            "User: CrissCross Traffic Control",
            "Radio ID: Flagger 2",
            "User: CrissCross Traffic Control"
          ],
          "settings": { "choiceDisplay": "checklist", "layout": { "width": "full" } }
        }
      ]
    },
    {
      "id": "daily_access_egress_inspection",
      "title": "Access Egress Inspection",
      "description": "",
      "settings": { "layout": { "width": "full" } },
      "fields": [
        {
          "id": "daily_site_access_clear",
          "type": "dropdown",
          "label": "Access / egress to the site is cleared of hazards (ice, cables, garbage, building materials, etc.)",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": ["Yes", "No"],
          "settings": { "choiceDisplay": "radio", "optionPreset": "yes_no", "layout": { "width": "full" } }
        },
        {
          "id": "daily_dep_box_accessible",
          "type": "dropdown",
          "label": "Is the DEP box accessible (doors not blocked)?",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": ["Yes", "No"],
          "settings": { "choiceDisplay": "radio", "optionPreset": "yes_no", "layout": { "width": "full" } }
        },
        {
          "id": "daily_core_access_clear",
          "type": "dropdown",
          "label": "Access / egress to the core is cleared of hazards (ice, cables, garbage, building materials, etc.)",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": ["Yes", "No"],
          "settings": { "choiceDisplay": "radio", "optionPreset": "yes_no", "layout": { "width": "full" } }
        },
        {
          "id": "daily_access_hazard_description",
          "type": "long_text",
          "label": "Describe the hazard(s), location(s), and trade(s) responsible to correct",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": [],
          "settings": { "layout": { "width": "full" } }
        },
        {
          "id": "daily_access_items",
          "type": "multi_select",
          "label": "Select all access / egress items being inspected",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": ["Para-Stairs", "Scaffold", "Permanent Stair Way", "Temporary Alternate Stair Access"],
          "settings": { "choiceDisplay": "checklist", "layout": { "width": "full" } }
        },
        {
          "id": "daily_indoor_gas_heaters_completed_by",
          "type": "short_text",
          "label": "Indoor Gas Heaters Inspection Completed By",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": [],
          "settings": { "layout": { "width": "half" } }
        },
        {
          "id": "daily_decibel_reading",
          "type": "short_text",
          "label": "Decibel Reading - note location / task",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": [],
          "settings": { "layout": { "width": "half" } }
        },
        {
          "id": "daily_bathroom_completed_by",
          "type": "short_text",
          "label": "Bathroom Inspections Completed By",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": [],
          "settings": { "layout": { "width": "half" } }
        },
        {
          "id": "daily_bathroom_notes",
          "type": "long_text",
          "label": "Bathroom Inspection Notes",
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
      "id": "daily_scaffold_inspection",
      "title": "Scaffold Inspection",
      "description": "",
      "settings": {
        "layout": { "width": "full" },
        "visibility": { "enabled": true, "sourceFieldId": "daily_access_items", "operator": "contains", "value": "Scaffold" }
      },
      "fields": [
        {
          "id": "daily_scaffold_braces_checked",
          "type": "dropdown",
          "label": "Braces Checked",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": ["Yes", "No"],
          "settings": { "choiceDisplay": "radio", "optionPreset": "yes_no", "layout": { "width": "half" } }
        },
        {
          "id": "daily_scaffold_ledgers_checked",
          "type": "dropdown",
          "label": "Ledgers with Pins Checked (horizontal tubes that run along the scaffold's length)",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": ["Yes", "No"],
          "settings": { "choiceDisplay": "radio", "optionPreset": "yes_no", "layout": { "width": "half" } }
        },
        {
          "id": "daily_scaffold_stairs_ladders_checked",
          "type": "dropdown",
          "label": "Stairs / Ladders Checked",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": ["Yes", "No"],
          "settings": { "choiceDisplay": "radio", "optionPreset": "yes_no", "layout": { "width": "half" } }
        },
        {
          "id": "daily_scaffold_guardrails_toeboards_checked",
          "type": "dropdown",
          "label": "Guardrails and Toe Boards Checked",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": ["Yes", "No"],
          "settings": { "choiceDisplay": "radio", "optionPreset": "yes_no", "layout": { "width": "half" } }
        },
        {
          "id": "daily_scaffold_standards_checked",
          "type": "dropdown",
          "label": "Standards Checked",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": ["Yes", "No"],
          "settings": { "choiceDisplay": "radio", "optionPreset": "yes_no", "layout": { "width": "half" } }
        },
        {
          "id": "daily_scaffold_cleared_debris",
          "type": "dropdown",
          "label": "Cleared of debris",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": ["Yes", "No"],
          "settings": { "choiceDisplay": "radio", "optionPreset": "yes_no", "layout": { "width": "half" } }
        },
        {
          "id": "daily_scaffold_notes",
          "type": "long_text",
          "label": "Scaffold Notes",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": [],
          "settings": { "layout": { "width": "full" } }
        },
        {
          "id": "daily_scaffold_remove_notice",
          "type": "instructions",
          "label": "If any defects or damage are found during inspection, remove from service until repairs have been completed.",
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
      "id": "daily_para_stair_inspection",
      "title": "Para-Stair Inspection",
      "description": "",
      "settings": {
        "layout": { "width": "full" },
        "visibility": { "enabled": true, "sourceFieldId": "daily_access_items", "operator": "contains", "value": "Para-Stairs" }
      },
      "fields": [
        {
          "id": "daily_para_upper_lower_brackets",
          "type": "dropdown",
          "label": "Upper and lower para-stair brackets secured to the work surfaces",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": ["Yes", "No"],
          "settings": { "choiceDisplay": "radio", "optionPreset": "yes_no", "layout": { "width": "half" } }
        },
        {
          "id": "daily_para_rails_damage",
          "type": "dropdown",
          "label": "No visible damage or deformation to the para-stair rails",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": ["Yes", "No"],
          "settings": { "choiceDisplay": "radio", "optionPreset": "yes_no", "layout": { "width": "half" } }
        },
        {
          "id": "daily_para_step_treads",
          "type": "dropdown",
          "label": "Para stair step treads not broken or damaged",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": ["Yes", "No"],
          "settings": { "choiceDisplay": "radio", "optionPreset": "yes_no", "layout": { "width": "half" } }
        },
        {
          "id": "daily_para_step_tubes",
          "type": "dropdown",
          "label": "Para stair step tubes not broken or bent",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": ["Yes", "No"],
          "settings": { "choiceDisplay": "radio", "optionPreset": "yes_no", "layout": { "width": "half" } }
        },
        {
          "id": "daily_para_handrails",
          "type": "dropdown",
          "label": "Para stair handrails installed and secured in proper position",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": ["Yes", "No"],
          "settings": { "choiceDisplay": "radio", "optionPreset": "yes_no", "layout": { "width": "half" } }
        },
        {
          "id": "daily_para_hardware",
          "type": "dropdown",
          "label": "Para stair hardware all present and tight",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": ["Yes", "No"],
          "settings": { "choiceDisplay": "radio", "optionPreset": "yes_no", "layout": { "width": "half" } }
        },
        {
          "id": "daily_para_notes",
          "type": "long_text",
          "label": "Para-Stair Notes",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": [],
          "settings": { "layout": { "width": "full" } }
        },
        {
          "id": "daily_para_remove_notice",
          "type": "instructions",
          "label": "If any defects or damage are found during inspection, remove para stair from service until repairs have been completed.",
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
      "id": "daily_temporary_alternate_stair_access_inspection",
      "title": "Temporary Alternate Stair Access Inspection",
      "description": "",
      "settings": {
        "layout": { "width": "full" },
        "visibility": { "enabled": true, "sourceFieldId": "daily_access_items", "operator": "contains", "value": "Temporary Alternate Stair Access" }
      },
      "fields": [
        {
          "id": "daily_alt_upper_lower_brackets",
          "type": "dropdown",
          "label": "Upper and lower stair brackets secured to the work surfaces",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": ["Yes", "No"],
          "settings": { "choiceDisplay": "radio", "optionPreset": "yes_no", "layout": { "width": "half" } }
        },
        {
          "id": "daily_alt_rails_damage",
          "type": "dropdown",
          "label": "No visible damage or deformation to the stair rails",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": ["Yes", "No"],
          "settings": { "choiceDisplay": "radio", "optionPreset": "yes_no", "layout": { "width": "half" } }
        },
        {
          "id": "daily_alt_step_treads",
          "type": "dropdown",
          "label": "Step treads not broken or damaged",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": ["Yes", "No"],
          "settings": { "choiceDisplay": "radio", "optionPreset": "yes_no", "layout": { "width": "half" } }
        },
        {
          "id": "daily_alt_handrails_guardrails",
          "type": "dropdown",
          "label": "Handrails and guardrails beside stairs installed correctly and secured",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": ["Yes", "No"],
          "settings": { "choiceDisplay": "radio", "optionPreset": "yes_no", "layout": { "width": "half" } }
        },
        {
          "id": "daily_alt_steps_stable",
          "type": "dropdown",
          "label": "Steps leading to and from the stairs are less than 18 inches and stable",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": ["Yes", "No"],
          "settings": { "choiceDisplay": "radio", "optionPreset": "yes_no", "layout": { "width": "full" } }
        },
        {
          "id": "daily_alt_notes",
          "type": "long_text",
          "label": "Alt-Stair Notes",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": [],
          "settings": { "layout": { "width": "full" } }
        },
        {
          "id": "daily_alt_remove_notice",
          "type": "instructions",
          "label": "If any defects or damage are found during inspection, remove stair access from service until repairs have been completed.",
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
      "id": "daily_permanent_stairway_inspection",
      "title": "Permanent Stairway Inspection",
      "description": "",
      "settings": {
        "layout": { "width": "full" },
        "visibility": { "enabled": true, "sourceFieldId": "daily_access_items", "operator": "contains", "value": "Permanent Stair Way" }
      },
      "fields": [
        {
          "id": "daily_perm_stairway_damage",
          "type": "dropdown",
          "label": "No visible damage or deformation to stairway",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": ["Yes", "No"],
          "settings": { "choiceDisplay": "radio", "optionPreset": "yes_no", "layout": { "width": "half" } }
        },
        {
          "id": "daily_perm_stairway_clear_access",
          "type": "dropdown",
          "label": "Clear access (slip / trip hazards eliminated)",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": ["Yes", "No"],
          "settings": { "choiceDisplay": "radio", "optionPreset": "yes_no", "layout": { "width": "half" } }
        },
        {
          "id": "daily_perm_handrails",
          "type": "dropdown",
          "label": "Handrails installed and secured in proper position",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": ["Yes", "No"],
          "settings": { "choiceDisplay": "radio", "optionPreset": "yes_no", "layout": { "width": "half" } }
        },
        {
          "id": "daily_perm_notes",
          "type": "long_text",
          "label": "Stairway Notes",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": [],
          "settings": { "layout": { "width": "full" } }
        },
        {
          "id": "daily_perm_remove_notice",
          "type": "instructions",
          "label": "If any defects or damage are found during inspection, remove stairway from service until repairs have been completed.",
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
      "id": "daily_compliant_or_not_applicable",
      "title": "Check all items that are compliant OR not applicable",
      "description": "",
      "settings": { "layout": { "width": "full" } },
      "fields": [
        {
          "id": "daily_general_safety",
          "type": "multi_select",
          "label": "General Safety",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": ["Housekeeping", "Protruding equipment / hardware", "Adequate illumination", "Engineer drawings", "First Aid attendant", "Treatment record book", "Signage", "Excavations", "Overhead hazards", "Guardrails in place", "First Aid Supplies", "WCB Form 7A", "Material Storage", "Floor Openings Protected", "Exposed Rebar", "Dust control", "Work areas"],
          "settings": { "choiceDisplay": "checklist", "layout": { "width": "half" } }
        },
        {
          "id": "daily_access_egress",
          "type": "multi_select",
          "label": "Access & Egress",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": ["Stairwells lighting / clear / railings", "Loading Zone", "Covered Walkway"],
          "settings": { "choiceDisplay": "checklist", "layout": { "width": "half" } }
        },
        {
          "id": "daily_ppe",
          "type": "multi_select",
          "label": "PPE",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": ["Hard hats", "Safety footwear", "Safety glasses", "Hearing protection", "Respirator / dust masks", "Safety harness", "Torn / loose clothing", "Hi-Vis Vest"],
          "settings": { "choiceDisplay": "checklist", "layout": { "width": "half" } }
        },
        {
          "id": "daily_ladders",
          "type": "multi_select",
          "label": "Ladders",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": ["Secured top or bottom", "In good repair", "3 feet above platform", "Suitability", "Workers not on top 2 steps", "Not in hazardous location"],
          "settings": { "choiceDisplay": "checklist", "layout": { "width": "half" } }
        },
        {
          "id": "daily_scaffold_checklist",
          "type": "multi_select",
          "label": "Scaffold",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": ["Suitability", "Firm Base / Wheels locked", "Scaffold Installation", "All braces on", "All connections on", "Planks", "Guardrails / Handrails"],
          "settings": { "choiceDisplay": "checklist", "layout": { "width": "half" } }
        },
        {
          "id": "daily_tools_equipment",
          "type": "multi_select",
          "label": "Tools & Equipment",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": ["Power saws", "Drills", "Proper Tool Use", "Hand tools", "Chipping Hammers", "Tool Condition", "Guards", "Lock-out procedures", "Operating Procedures"],
          "settings": { "choiceDisplay": "checklist", "layout": { "width": "half" } }
        },
        {
          "id": "daily_electrical_safety",
          "type": "multi_select",
          "label": "Electrical Safety",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": ["Temp. power distribution", "Assured grounding program", "Lockout program", "Power cords", "Hi-Voltage Hazard", "Hi-voltage line protection", "Hi-volt. Clearance"],
          "settings": { "choiceDisplay": "checklist", "layout": { "width": "half" } }
        },
        {
          "id": "daily_fire_prevention",
          "type": "multi_select",
          "label": "Fire Prevention",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": ["Fire extinguishers", "Exits clear", "Flammables stored safely"],
          "settings": { "choiceDisplay": "checklist", "layout": { "width": "half" } }
        },
        {
          "id": "daily_whmis",
          "type": "multi_select",
          "label": "WHMIS",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": ["Labels on controlled products", "MSDS sheets up to date", "MSDS for products", "Worker training"],
          "settings": { "choiceDisplay": "checklist", "layout": { "width": "half" } }
        },
        {
          "id": "daily_safety_program",
          "type": "multi_select",
          "label": "Safety Program",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": ["Following of all applicable rules", "Safety Manual On Site", "Orientations up to date", "Site specific SWP", "Training", "Record Keeping", "Emergency Procedures Posted", "Tool box meetings"],
          "settings": { "choiceDisplay": "checklist", "layout": { "width": "half" } }
        },
        {
          "id": "daily_fall_protection",
          "type": "multi_select",
          "label": "Fall Protection",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": ["Fall Protection / Arrest being used", "Use of control zones", "Anchors suitable for application", "Equipment inspections", "Barricades"],
          "settings": { "choiceDisplay": "checklist", "layout": { "width": "half" } }
        },
        {
          "id": "daily_mobile_equipment",
          "type": "multi_select",
          "label": "Mobile Equipment",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": ["Operator qualified", "Use of fall protection", "Daily Inspection", "Safety devices in place"],
          "settings": { "choiceDisplay": "checklist", "layout": { "width": "half" } }
        }
      ]
    },
    {
      "id": "daily_safety_concerns_raised",
      "title": "Safety Concerns Raised",
      "description": "",
      "settings": { "layout": { "width": "full" } },
      "fields": [
        {
          "id": "daily_safety_concerns_today",
          "type": "dropdown",
          "label": "Are there any safety concerns raised by workers or supervisors today?",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": ["Yes", "No"],
          "settings": { "choiceDisplay": "radio", "optionPreset": "yes_no", "layout": { "width": "full" } }
        },
        {
          "id": "daily_safety_concern_rows",
          "type": "action_item_rows",
          "label": "Safety Concerns Raised",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": [],
          "settings": {
            "layout": { "width": "full" },
            "actionItemRows": {
              "noneLabel": "No safety concerns raised today.",
              "rowLabel": "Safety concern",
              "addButtonLabel": "Add safety concern",
              "subfields": [
                { "key": "category", "label": "Category", "visible": false, "order": 0 },
                { "key": "priority", "label": "Priority", "visible": false, "order": 1 },
                { "key": "location", "label": "Location / area", "visible": false, "order": 2 },
                { "key": "suggestedAssignee", "label": "Referred To", "visible": true, "order": 3 },
                { "key": "description", "label": "Safety Concern Raised", "visible": true, "order": 4 },
                { "key": "recommendedAction", "label": "Corrective Action", "visible": true, "order": 5 },
                { "key": "dueDate", "label": "Date Corrected", "visible": true, "order": 6 },
                { "key": "immediateControl", "label": "Raised By", "visible": true, "order": 7 }
              ]
            }
          }
        },
        {
          "id": "daily_safety_concern_notes",
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
      "id": "daily_observed_act_condition",
      "title": "Observed Act / Condition",
      "description": "",
      "settings": { "layout": { "width": "full" } },
      "fields": [
        {
          "id": "daily_observed_hazard_description",
          "type": "long_text",
          "label": "Describe the hazard(s), location(s), and trade(s) responsible to correct",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": [],
          "settings": { "layout": { "width": "full" } }
        },
        {
          "id": "daily_observed_photo",
          "type": "media_upload",
          "label": "Add Photo",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": [],
          "settings": { "mediaUpload": { "acceptedKinds": ["image"] }, "layout": { "width": "full" } }
        }
      ]
    },
    {
      "id": "daily_signatures",
      "title": "Signatures",
      "description": "",
      "settings": { "layout": { "width": "full" } },
      "fields": [
        {
          "id": "daily_inspector_name",
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
          "id": "daily_inspector_signature",
          "type": "signature",
          "label": "Inspector Signatures",
          "helperText": "",
          "required": true,
          "default": "",
          "remember": false,
          "options": [],
          "settings": { "layout": { "width": "half" } }
        },
        {
          "id": "daily_supervisor_signature",
          "type": "signature",
          "label": "Supervisor Signatures",
          "helperText": "",
          "required": true,
          "default": "",
          "remember": false,
          "options": [],
          "settings": { "layout": { "width": "half" } }
        }
      ]
    },
    {
      "id": "daily_safety_team_hazard_assessment",
      "title": "Safety Team Daily Hazard Assessment",
      "description": "",
      "settings": { "layout": { "width": "full" } },
      "fields": [
        {
          "id": "daily_task_initial_hazard_level",
          "type": "long_text",
          "label": "Task and Initial Hazard Level",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": [],
          "settings": { "layout": { "width": "full" } }
        },
        {
          "id": "daily_controls_hazard_level",
          "type": "long_text",
          "label": "Controls and Hazard Level after Controls in Place",
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

  if v_field_count <> 67 then
    raise exception 'Daily Safety Inspection template conversion failed: expected 67 fields, found %.', v_field_count;
  end if;

  select id
  into v_template_id
  from public.form_templates
  where form_type = 'daily_safety_inspection';

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
      'daily_safety_inspection',
      'Daily Safety Inspection',
      'Daily safety inspection recreated as an editable V3 template.',
      'template',
      true,
      false,
      90
    )
    returning id into v_template_id;
  else
    update public.form_templates
    set
      label = 'Daily Safety Inspection',
      description = 'Daily safety inspection recreated as an editable V3 template.',
      renderer_type = 'template',
      active = true,
      worker_visible = false,
      display_order = 90,
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
    notes = coalesce(nullif(notes, ''), 'Draft archived while refreshing Daily Safety Inspection template.'),
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
    'daily_safety_inspection',
    v_next_version,
    'draft',
    v_schema,
    'Daily Safety Inspection legacy form recreated as a V3 editable template.',
    null,
    now(),
    now()
  );
end $$;
