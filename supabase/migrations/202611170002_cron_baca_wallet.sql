-- Fungsi pemicu Edge Function baca-wallet lewat pg_net + Vault (BR-17)
create or replace function public.panggil_baca_wallet()
returns void
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_url text;
  v_secret text;
begin
  select decrypted_secret into v_url
  from vault.decrypted_secrets
  where name = 'pasti_cuan_project_url'
  limit 1;

  select decrypted_secret into v_secret
  from vault.decrypted_secrets
  where name = 'pasti_cuan_cron_secret'
  limit 1;

  if v_url is null or v_secret is null then
    return;
  end if;

  perform net.http_post(
    url := v_url || '/functions/v1/baca-wallet',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', v_secret
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 10000
  );
end;
$$;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'baca-wallet-per-menit') then
    perform cron.unschedule('baca-wallet-per-menit');
  end if;
  perform cron.schedule(
    'baca-wallet-per-menit',
    '* * * * *',
    $job$select public.panggil_baca_wallet();$job$
  );
end $$;
