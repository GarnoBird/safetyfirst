alter table public.worker_signins
  add column if not exists signed_out_at timestamptz,
  add column if not exists sign_out_date_vancouver date;

create index if not exists worker_signins_open_idx
  on public.worker_signins (signed_out_at, sign_in_date_vancouver);

create index if not exists worker_signins_signout_date_idx
  on public.worker_signins (sign_out_date_vancouver);
