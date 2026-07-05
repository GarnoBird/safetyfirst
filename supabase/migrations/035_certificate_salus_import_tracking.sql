alter table public.certificates
  add column if not exists source text not null default 'safety_first',
  add column if not exists source_external_id text,
  add column if not exists source_metadata jsonb not null default '{}'::jsonb,
  add column if not exists imported_at timestamptz;

alter table public.certificates
  alter column issue_date drop not null,
  alter column expiry_date drop not null;

alter table public.certificate_files
  add column if not exists source text not null default 'safety_first',
  add column if not exists source_external_id text,
  add column if not exists source_metadata jsonb not null default '{}'::jsonb,
  add column if not exists imported_at timestamptz;

create unique index if not exists certificates_salus_external_id_uidx
  on public.certificates (source_external_id)
  where source = 'salus' and source_external_id is not null;

create unique index if not exists certificate_files_salus_external_id_uidx
  on public.certificate_files (source_external_id)
  where source = 'salus' and source_external_id is not null;

create index if not exists certificates_source_idx
  on public.certificates (source, imported_at desc);
