with ranked_open_signins as (
  select
    id,
    row_number() over (
      partition by
        sign_in_date_vancouver,
        lower(btrim(name)),
        lower(btrim(company))
      order by signed_in_at asc, id asc
    ) as duplicate_rank
  from public.worker_signins
  where signed_out_at is null
)
delete from public.worker_signins
where id in (
  select id
  from ranked_open_signins
  where duplicate_rank > 1
);

create unique index if not exists worker_signins_open_date_name_company_uidx
  on public.worker_signins (
    sign_in_date_vancouver,
    (lower(btrim(name))),
    (lower(btrim(company)))
  )
  where signed_out_at is null;
