create table if not exists public.assets (
  id uuid primary key default gen_random_uuid(),
  asset_key text not null unique,
  name text not null default '',
  asset_type text not null default '',
  serial_number text not null default '',
  current_site text not null default '',
  status text not null default 'active',
  hours numeric,
  last_used_at timestamptz,
  notes text not null default '',
  source text not null default 'local_import',
  source_id text not null default '',
  source_metadata jsonb not null default '{}'::jsonb,
  imported_by_staff_id uuid references public.staff_profiles(id) on delete set null,
  updated_by_staff_id uuid references public.staff_profiles(id) on delete set null,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists assets_asset_key_idx
  on public.assets (asset_key);

alter table public.assets enable row level security;

create index if not exists assets_active_type_idx
  on public.assets (status, asset_type, current_site)
  where archived_at is null;

create index if not exists assets_name_idx
  on public.assets (lower(name));

create index if not exists assets_serial_idx
  on public.assets (lower(serial_number));

do $$
declare
  v_asset_field jsonb := '{
    "id": "fall_selected_asset",
    "type": "asset_picker",
    "label": "Select Safety First asset",
    "helperText": "Search imported Fall Protection assets.",
    "required": false,
    "default": "",
    "remember": false,
    "options": [],
    "settings": {
      "layout": { "width": "full" },
      "assetPicker": { "typeFilter": "Fall Protection", "siteFilter": "", "statusFilter": "active" },
      "visibility": {
        "enabled": true,
        "sourceFieldId": "fall_equipment_input_method",
        "operator": "equals",
        "value": "Select Safety First Asset"
      }
    }
  }'::jsonb;
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
            when section_item.section ->> 'id' = 'fall_equipment_information' then
              jsonb_set(
                section_item.section,
                '{fields}',
                (
                  with cleaned_fields as (
                    select
                      case
                        when field_item.field ->> 'id' = 'fall_equipment_input_method' then
                          jsonb_set(
                            field_item.field,
                            '{options}',
                            '["Manually", "Photo", "Select Safety First Asset"]'::jsonb,
                            true
                          )
                        else field_item.field
                      end as field,
                      field_item.ordinality
                    from jsonb_array_elements(section_item.section -> 'fields') with ordinality as field_item(field, ordinality)
                    where not (
                      field_item.field ->> 'id' in (
                        'fall_harness_asset',
                        'fall_lanyard_asset',
                        'fall_vertical_lifeline_asset',
                        'fall_rope_grab_asset',
                        'fall_srl_asset',
                        'fall_selected_asset'
                      )
                    )
                  )
                  select coalesce(jsonb_agg(cleaned_fields.field order by cleaned_fields.ordinality), '[]'::jsonb)
                    || jsonb_build_array(v_asset_field)
                  from cleaned_fields
                ),
                true
              )
            else section_item.section
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
      'Replaced Appia asset placeholders with the local Safety First asset picker.'
    ),
    updated_at = now()
  where version_row.form_type = 'fall_protection_form'
    and jsonb_typeof(version_row.schema -> 'sections') = 'array'
    and exists (
      select 1
      from jsonb_array_elements(version_row.schema -> 'sections') as section_item(section)
      where section_item.section ->> 'id' = 'fall_equipment_information'
    );

  get diagnostics v_updated_versions = row_count;

  update public.form_templates template_row
  set updated_at = now()
  where template_row.form_type = 'fall_protection_form';

  raise notice 'Updated % Fall Protection template versions with local asset picker.', v_updated_versions;
end $$;
