do $$
declare
  v_updated_versions integer := 0;
begin
  update public.form_template_versions version_row
  set
    schema = jsonb_set(
      version_row.schema,
      '{sections}',
      (
        select jsonb_agg(
          case
            when section_item.section -> 'settings' -> 'layout' ->> 'width' = 'half' then
              jsonb_set(section_item.section, '{settings,layout,width}', '"full"'::jsonb, true)
            else
              section_item.section
          end
          order by section_item.ordinality
        )
        from jsonb_array_elements(version_row.schema -> 'sections') with ordinality as section_item(section, ordinality)
      ),
      false
    ),
    notes = concat_ws(
      ' ',
      nullif(version_row.notes, ''),
      'Corrected imported Salus section widths so major form sections render full-width.'
    ),
    updated_at = now()
  where version_row.form_type in (
      'new_worker_orientation',
      'speed_fan_inspection',
      'hoist_competency_observation',
      'fall_protection_form',
      'daily_safety_inspection',
      'daily_washroom_inspection'
    )
    and jsonb_typeof(version_row.schema -> 'sections') = 'array'
    and exists (
      select 1
      from jsonb_array_elements(version_row.schema -> 'sections') as section_item(section)
      where section_item.section -> 'settings' -> 'layout' ->> 'width' = 'half'
    );

  get diagnostics v_updated_versions = row_count;

  update public.form_templates template_row
  set updated_at = now()
  where template_row.form_type in (
      'new_worker_orientation',
      'speed_fan_inspection',
      'hoist_competency_observation',
      'fall_protection_form',
      'daily_safety_inspection',
      'daily_washroom_inspection'
    )
    and exists (
      select 1
      from public.form_template_versions version_row
      where version_row.template_id = template_row.id
        and position('Corrected imported Salus section widths' in coalesce(version_row.notes, '')) > 0
    );

  raise notice 'Corrected section widths in % imported Salus template versions.', v_updated_versions;
end $$;
