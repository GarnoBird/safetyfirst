do $$
declare
  manual_visibility jsonb := '{"enabled": true, "sourceFieldId": "fall_equipment_input_method", "operator": "equals", "value": "Manually"}'::jsonb;
  asset_visibility jsonb := '{"enabled": true, "sourceFieldId": "fall_equipment_input_method", "operator": "equals", "value": "Select Safety First Asset"}'::jsonb;
begin
  update public.form_template_versions version
  set
    schema = patched.schema,
    updated_at = now()
  from (
    select source.id,
      jsonb_set(
        jsonb_set(
          jsonb_set(
            jsonb_set(
              jsonb_set(
                jsonb_set(
                  jsonb_set(
                    source.schema,
                    input_method_field.path || array['options'],
                    '["Manually", "Select Safety First Asset"]'::jsonb,
                    true
                  ),
                  make_field.path || array['settings', 'visibility'],
                  manual_visibility,
                  true
                ),
                model_field.path || array['settings', 'visibility'],
                manual_visibility,
                true
              ),
              serial_field.path || array['settings', 'visibility'],
              manual_visibility,
              true
            ),
            mfg_date_field.path || array['settings', 'visibility'],
            manual_visibility,
            true
          ),
          photos_field.path || array['settings', 'visibility'],
          manual_visibility,
          true
        ),
        asset_field.path || array['settings', 'visibility'],
        asset_visibility,
        true
      ) as schema
    from public.form_template_versions source
    cross join lateral (
      select array['sections', (section.ordinality - 1)::text, 'fields', (field.ordinality - 1)::text] as path
      from jsonb_array_elements(source.schema->'sections') with ordinality as section(value, ordinality)
      cross join lateral jsonb_array_elements(section.value->'fields') with ordinality as field(value, ordinality)
      where field.value->>'id' = 'fall_equipment_input_method'
      limit 1
    ) input_method_field
    cross join lateral (
      select array['sections', (section.ordinality - 1)::text, 'fields', (field.ordinality - 1)::text] as path
      from jsonb_array_elements(source.schema->'sections') with ordinality as section(value, ordinality)
      cross join lateral jsonb_array_elements(section.value->'fields') with ordinality as field(value, ordinality)
      where field.value->>'id' = 'fall_equipment_make'
      limit 1
    ) make_field
    cross join lateral (
      select array['sections', (section.ordinality - 1)::text, 'fields', (field.ordinality - 1)::text] as path
      from jsonb_array_elements(source.schema->'sections') with ordinality as section(value, ordinality)
      cross join lateral jsonb_array_elements(section.value->'fields') with ordinality as field(value, ordinality)
      where field.value->>'id' = 'fall_equipment_model'
      limit 1
    ) model_field
    cross join lateral (
      select array['sections', (section.ordinality - 1)::text, 'fields', (field.ordinality - 1)::text] as path
      from jsonb_array_elements(source.schema->'sections') with ordinality as section(value, ordinality)
      cross join lateral jsonb_array_elements(section.value->'fields') with ordinality as field(value, ordinality)
      where field.value->>'id' = 'fall_equipment_serial'
      limit 1
    ) serial_field
    cross join lateral (
      select array['sections', (section.ordinality - 1)::text, 'fields', (field.ordinality - 1)::text] as path
      from jsonb_array_elements(source.schema->'sections') with ordinality as section(value, ordinality)
      cross join lateral jsonb_array_elements(section.value->'fields') with ordinality as field(value, ordinality)
      where field.value->>'id' = 'fall_equipment_mfg_date'
      limit 1
    ) mfg_date_field
    cross join lateral (
      select array['sections', (section.ordinality - 1)::text, 'fields', (field.ordinality - 1)::text] as path
      from jsonb_array_elements(source.schema->'sections') with ordinality as section(value, ordinality)
      cross join lateral jsonb_array_elements(section.value->'fields') with ordinality as field(value, ordinality)
      where field.value->>'id' = 'fall_equipment_photos'
      limit 1
    ) photos_field
    cross join lateral (
      select array['sections', (section.ordinality - 1)::text, 'fields', (field.ordinality - 1)::text] as path
      from jsonb_array_elements(source.schema->'sections') with ordinality as section(value, ordinality)
      cross join lateral jsonb_array_elements(section.value->'fields') with ordinality as field(value, ordinality)
      where field.value->>'id' = 'fall_selected_asset'
      limit 1
    ) asset_field
    where source.form_type = 'fall_protection_form'
  ) patched
  where version.id = patched.id;

  update public.form_templates
  set updated_at = now()
  where form_type = 'fall_protection_form';
end $$;
