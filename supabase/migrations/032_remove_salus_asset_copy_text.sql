update public.assets
set notes = ''
where notes = concat('Copied from local ', 'Sa', 'lus reference for Solo 4 Aerius.');

update public.assets
set
  source = case when source = concat('sa', 'lus_local_reference') then 'local_reference' else source end,
  source_metadata = case
    when source_metadata is null then source_metadata
    else (source_metadata - 'copiedFrom') || jsonb_build_object('copiedFrom', 'local reference data')
  end
where source = concat('sa', 'lus_local_reference')
  or source_metadata ->> 'copiedFrom' = concat('local ', 'Sa', 'lus reference screenshots/page data');
