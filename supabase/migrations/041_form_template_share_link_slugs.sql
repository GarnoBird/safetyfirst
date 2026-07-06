alter table public.form_template_share_links
  add column if not exists slug text;

do $$
declare
  link_record record;
  base_slug text;
  candidate_slug text;
  suffix integer;
begin
  for link_record in
    select
      link.id,
      coalesce(nullif(template.label, ''), nullif(link.form_type, ''), 'form') as source_label
    from public.form_template_share_links link
    left join public.form_templates template
      on template.id = link.template_id
    where nullif(link.slug, '') is null
    order by link.created_at, link.id
  loop
    base_slug := lower(link_record.source_label);
    base_slug := regexp_replace(base_slug, '&', ' and ', 'g');
    base_slug := regexp_replace(base_slug, '[^a-z0-9]+', '-', 'g');
    base_slug := regexp_replace(base_slug, '(^-+|-+$)', '', 'g');
    base_slug := left(base_slug, 64);
    base_slug := regexp_replace(base_slug, '-+$', '', 'g');

    if base_slug = '' then
      base_slug := 'form';
    end if;

    candidate_slug := base_slug;
    suffix := 2;

    while exists (
      select 1
      from public.form_template_share_links existing
      where existing.slug = candidate_slug
        and existing.id <> link_record.id
    ) loop
      candidate_slug := regexp_replace(
        left(base_slug, greatest(1, 64 - length(suffix::text) - 1)),
        '-+$',
        '',
        'g'
      ) || '-' || suffix::text;
      suffix := suffix + 1;
    end loop;

    update public.form_template_share_links
    set
      slug = candidate_slug,
      updated_at = now()
    where id = link_record.id;
  end loop;
end $$;

alter table public.form_template_share_links
  alter column slug set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'form_template_share_links_slug_check'
  ) then
    alter table public.form_template_share_links
      add constraint form_template_share_links_slug_check
      check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$');
  end if;
end $$;

create unique index if not exists form_template_share_links_slug_idx
  on public.form_template_share_links (slug);
