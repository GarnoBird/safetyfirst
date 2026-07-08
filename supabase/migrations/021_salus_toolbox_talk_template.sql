do $$
declare
  v_template_id uuid;
  v_next_version integer;
  v_field_count integer;
  v_schema jsonb := $schema$
{
  "schemaVersion": 1,
  "formType": "salus_toolbox_talk",
  "title": "Salus Toolbox Talk",
  "description": "Legacy Salus toolbox talk recreated as an editable V3 template.",
  "sections": [
    {
      "id": "form_details",
      "title": "Form Details",
      "description": "",
      "settings": { "defaultCollapsed": false },
      "fields": [
        {
          "id": "salus_toolbox_presenter",
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
          "id": "salus_toolbox_supervisor",
          "type": "short_text",
          "label": "Supervisor",
          "helperText": "",
          "required": true,
          "default": "",
          "remember": true,
          "options": [],
          "settings": { "toolboxHeaderField": "supervisor" }
        },
        {
          "id": "salus_toolbox_date",
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
          "id": "salus_toolbox_time",
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
          "id": "salus_safework_procedure",
          "type": "instructions",
          "label": "Safework Procedure",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": [],
          "settings": { "instructionStyle": "heading", "layout": { "width": "half" } }
        },
        {
          "id": "salus_additional_toolbox_topic",
          "type": "instructions",
          "label": "Additional Toolbox Topic",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": [],
          "settings": { "instructionStyle": "heading", "layout": { "width": "half" } }
        }
      ]
    },
    {
      "id": "inspection_ppe",
      "title": "08-01 Inspection PPE",
      "description": "",
      "settings": { "defaultCollapsed": false },
      "fields": [
        {
          "id": "salus_basic_ppe",
          "type": "multi_select",
          "label": "Basic Personal Protective Equipment",
          "helperText": "",
          "required": true,
          "default": "",
          "remember": false,
          "options": [
            "CSA Approved Hard Hats - visual inspection",
            "CSA Approved Safety Boots - visual inspection",
            "Adequate Clothing (Long Pants and Shirts with Minimum 4 in. Sleeves) - confirmation"
          ],
          "settings": { "choiceDisplay": "checklist", "layout": { "width": "half" } }
        },
        {
          "id": "salus_specialized_ppe",
          "type": "multi_select",
          "label": "Specialized Personal Protective Equipment",
          "helperText": "",
          "required": true,
          "default": "",
          "remember": false,
          "options": [
            "Respiratory Equipment - visual inspection and confirm formal monthly inspection (on separate form)",
            "Hi-Vis Vest - visual inspection",
            "Gloves - visual inspection",
            "Hearing Protection - visual inspection",
            "Eye Protection - visual inspection",
            "Other PPE as per scope of work - visual inspection and as required by manufacturer's instructions",
            "Fall Protection System (on separate forms)"
          ],
          "settings": { "choiceDisplay": "checklist", "layout": { "width": "half" } }
        }
      ]
    },
    {
      "id": "topics_discussed",
      "title": "Topics - choose a WSBC section",
      "description": "Select the topics discussed or enter additional procedures.",
      "settings": { "defaultCollapsed": false },
      "fields": [
        {
          "id": "salus_toolbox_topics",
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
      "id": "additional_review",
      "title": "Additional topics / Procedures reviewed",
      "description": "",
      "settings": { "defaultCollapsed": false },
      "fields": [
        {
          "id": "salus_attach_documents_photos",
          "type": "media_upload",
          "label": "Attach Documents or Photos",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": [],
          "settings": { "mediaUpload": { "acceptedKinds": ["image", "pdf"] }, "layout": { "width": "half" } }
        },
        {
          "id": "salus_toolbox_incident_review",
          "type": "toolbox_incident_review",
          "label": "Review Notes",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": [],
          "settings": {
            "defaultCollapsed": true,
            "toolboxIncidentReview": {
              "openButtonLabel": "Add incident / review notes",
              "hideButtonLabel": "Hide",
              "subfields": [
                { "key": "firstAidCount", "label": "# Of FA since last meeting", "visible": true, "order": 0 },
                { "key": "medicalAidCount", "label": "# Of Medical Aids", "visible": true, "order": 1 },
                { "key": "nearMissReviewed", "label": "Near Miss / Accidents to review?", "visible": true, "order": 2 },
                { "key": "nearMissDescription", "label": "Near miss / accident description", "visible": true, "order": 3 },
                { "key": "lessonsLearned", "label": "Comments on lessons", "visible": true, "order": 4 }
              ]
            }
          }
        },
        {
          "id": "salus_toolbox_safety_concerns",
          "type": "toolbox_safety_concerns",
          "label": "Safety Concerns Brought up by Workers",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": [],
          "settings": {
            "defaultCollapsed": true,
            "toolboxSafetyConcerns": {
              "openButtonLabel": "Add safety concern",
              "hideButtonLabel": "Hide",
              "addRowButtonLabel": "Add another concern",
              "subfields": [
                { "key": "concern", "label": "Concern", "visible": true, "order": 0 },
                { "key": "actionToTake", "label": "Action to take", "visible": true, "order": 1 },
                { "key": "dateTaken", "label": "Date taken", "visible": true, "order": 2 }
              ]
            }
          }
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
          "id": "salus_toolbox_attendance",
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
          "id": "salus_presenter_signature_instruction",
          "type": "signature",
          "label": "Presenter/Supervisor Signature - by signing you confirm that these workers participated in this toolbox talk.",
          "helperText": "",
          "required": true,
          "default": "",
          "remember": false,
          "options": [],
          "settings": { "instructionStyle": "notice" }
        },
        {
          "id": "salus_toolbox_final_confirmation",
          "type": "toolbox_final_confirmation",
          "label": "Presenter/Supervisor Confirmation",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": [],
          "settings": {}
        },
        {
          "id": "salus_revision_note",
          "type": "instructions",
          "label": "Created Jan 2024\nRevision 0.2\nIncludes Form: 08-01 Inspection PPE Rev 0.1",
          "helperText": "",
          "required": false,
          "default": "",
          "remember": false,
          "options": [],
          "settings": { "instructionStyle": "plain" }
        }
      ]
    }
  ]
}
$schema$::jsonb;
begin
  if jsonb_array_length(v_schema -> 'sections') <> 6 then
    raise exception 'Salus Toolbox Talk template conversion failed: expected 6 sections, found %.',
      jsonb_array_length(v_schema -> 'sections');
  end if;

  select coalesce(sum(jsonb_array_length(section_item -> 'fields')), 0)
  into v_field_count
  from jsonb_array_elements(v_schema -> 'sections') as section_item;

  if v_field_count <> 16 then
    raise exception 'Salus Toolbox Talk template conversion failed: expected 16 fields, found %.', v_field_count;
  end if;

  select id
  into v_template_id
  from public.form_templates
  where form_type = 'salus_toolbox_talk';

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
      'salus_toolbox_talk',
      'Salus Toolbox Talk',
      'Legacy Salus toolbox talk recreated as an editable V3 template.',
      'template',
      true,
      false,
      50
    )
    returning id into v_template_id;
  else
    update public.form_templates
    set
      label = 'Salus Toolbox Talk',
      description = 'Legacy Salus toolbox talk recreated as an editable V3 template.',
      renderer_type = 'template',
      active = true,
      worker_visible = false,
      display_order = 50,
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
    notes = coalesce(nullif(notes, ''), 'Draft archived while refreshing Salus Toolbox Talk template.'),
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
    'salus_toolbox_talk',
    v_next_version,
    'draft',
    v_schema,
    'Salus Toolbox Talk legacy form recreated as a V3 editable template.',
    null,
    now(),
    now()
  );
end $$;
