-- Run this after storing these Vault secrets:
--   safetyfirst_app_public_url: https://safetyfirst-one.vercel.app
--   safetyfirst_supabase_cron_secret: same value as Vercel SUPABASE_CRON_SECRET

create extension if not exists supabase_vault with schema vault;
create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;

select cron.unschedule('safetyfirst-auto-reports-every-5-min')
where exists (
  select 1 from cron.job where jobname = 'safetyfirst-auto-reports-every-5-min'
);

select cron.schedule(
  'safetyfirst-auto-reports-every-5-min',
  '*/5 * * * *',
  $$
  select
    net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'safetyfirst_app_public_url') || '/api/cron/auto-reports',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'safetyfirst_supabase_cron_secret')
      ),
      body := '{}'::jsonb
    ) as request_id;
  $$
);
