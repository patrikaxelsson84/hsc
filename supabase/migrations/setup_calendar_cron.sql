-- Run this in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/mfshfhpctymtuyvayidb/sql/new
--
-- Requires: pg_cron and pg_net extensions (enable in Dashboard → Database → Extensions)
-- Replace <SERVICE_ROLE_KEY> with the key from Dashboard → Settings → API → service_role

select cron.schedule(
  'sync-svhkf-calendar',
  '0 6 * * *',  -- every day at 06:00 UTC
  $$
  select net.http_post(
    url     := 'https://mfshfhpctymtuyvayidb.supabase.co/functions/v1/sync-calendar',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key')
    ),
    body    := '{}'::jsonb
  );
  $$
);

-- Store the service role key as a DB setting (run once separately):
-- alter database postgres set "app.service_role_key" = '<SERVICE_ROLE_KEY>';
