do $$
declare
  v_source record;
  v_next_version integer;
  v_published_count integer;
begin
  update public.form_templates as t
  set
    label = defaults.label,
    description = defaults.description,
    renderer_type = 'template',
    active = true,
    worker_visible = true,
    display_order = defaults.display_order,
    archived_at = null,
    updated_at = now()
  from (
    values
      ('toolbox_talk', 'Toolbox Talk', 'Fast mobile toolbox meeting and attendance record.', 10),
      ('site_inspection', 'Site Inspection', 'Fast mobile site inspection with deficiency tracking.', 20),
      ('daily_hazard_assessment', 'Daily Hazard Assessment', 'Fast mobile hazard review.', 30)
  ) as defaults(form_type, label, description, display_order)
  where t.form_type = defaults.form_type;

  update public.form_template_versions
  set
    status = 'archived',
    notes = coalesce(nullif(notes, ''), 'Draft archived while resetting protected default form.'),
    updated_at = now()
  where form_type in ('toolbox_talk', 'site_inspection', 'daily_hazard_assessment')
    and status = 'draft';

  for v_source in
    with candidates as (
      select
        t.id as template_id,
        t.form_type,
        t.label,
        t.description,
        v.schema,
        row_number() over (
          partition by t.form_type
          order by
            case when v.status = 'published' then 0 else 1 end,
            v.version_number desc,
            v.created_at desc
        ) as rn
      from public.form_templates t
      join public.form_template_versions v on v.template_id = t.id
      where t.form_type in ('toolbox_talk', 'site_inspection', 'daily_hazard_assessment')
        and jsonb_typeof(v.schema -> 'sections') = 'array'
        and jsonb_array_length(v.schema -> 'sections') > 0
    )
    select *
    from candidates
    where rn = 1
  loop
    select coalesce(max(version_number), 0) + 1
    into v_next_version
    from public.form_template_versions
    where template_id = v_source.template_id;

    update public.form_template_versions
    set status = 'archived', updated_at = now()
    where template_id = v_source.template_id
      and status = 'published';

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
      v_source.template_id,
      v_source.form_type,
      v_next_version,
      'published',
      jsonb_set(
        jsonb_set(
          jsonb_set(v_source.schema, '{formType}', to_jsonb(v_source.form_type), true),
          '{title}',
          to_jsonb(v_source.label),
          true
        ),
        '{description}',
        to_jsonb(coalesce(v_source.description, '')),
        true
      ),
      'Reset protected default form template to the latest non-empty saved layout.',
      now(),
      now(),
      now()
    );
  end loop;

  select count(*)
  into v_published_count
  from public.form_templates t
  join public.form_template_versions v on v.template_id = t.id
  where t.form_type in ('toolbox_talk', 'site_inspection', 'daily_hazard_assessment')
    and v.status = 'published'
    and jsonb_typeof(v.schema -> 'sections') = 'array'
    and jsonb_array_length(v.schema -> 'sections') > 0;

  if v_published_count <> 3 then
    raise exception 'Protected default form reset failed: expected 3 non-empty published templates, found %.', v_published_count;
  end if;
end $$;
