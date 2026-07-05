do $$
declare
  v_visibility jsonb := '{"enabled":true,"sourceFieldId":"daily_safety_concerns_today","operator":"equals","value":"Yes"}'::jsonb;
begin
  update public.form_template_versions version
  set
    schema = patched.schema,
    updated_at = now()
  from (
    select
      source.id,
      jsonb_set(
        jsonb_set(
          source.schema,
          array[
            'sections',
            (concern_rows.section_index - 1)::text,
            'fields',
            (concern_rows.field_index - 1)::text,
            'settings',
            'visibility'
          ],
          v_visibility,
          true
        ),
        array[
          'sections',
          (concern_notes.section_index - 1)::text,
          'fields',
          (concern_notes.field_index - 1)::text,
          'settings',
          'visibility'
        ],
        v_visibility,
        true
      ) as schema
    from public.form_template_versions source
    cross join lateral (
      select section.ordinality as section_index, field.ordinality as field_index
      from jsonb_array_elements(source.schema->'sections') with ordinality as section(value, ordinality)
      cross join lateral jsonb_array_elements(section.value->'fields') with ordinality as field(value, ordinality)
      where field.value->>'id' = 'daily_safety_concern_rows'
      limit 1
    ) concern_rows
    cross join lateral (
      select section.ordinality as section_index, field.ordinality as field_index
      from jsonb_array_elements(source.schema->'sections') with ordinality as section(value, ordinality)
      cross join lateral jsonb_array_elements(section.value->'fields') with ordinality as field(value, ordinality)
      where field.value->>'id' = 'daily_safety_concern_notes'
      limit 1
    ) concern_notes
    where source.form_type = 'daily_safety_inspection'
  ) patched
  where version.id = patched.id;

  update public.form_templates
  set updated_at = now()
  where form_type = 'daily_safety_inspection';
end $$;
