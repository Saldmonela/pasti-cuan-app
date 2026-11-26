-- 1. Bersihkan baris titik_nilai '15m' sumber 'estimasi' hasil pembulatan mundur (termasuk id 10290 penyebab spike -44,97% pada 15 Nov 2026)
delete from public.titik_nilai t
where t.sumber = 'estimasi'
  and t.resolusi = '15m'
  and not exists (select 1 from public.permintaan p where p.titik_nilai_id = t.id)
  and not exists (select 1 from public.snapshot s where s.titik_nilai_id = t.id);

-- 2. Bersihkan baris ringkasan '15m' yang menduplikasi waktu persis baris '1m' atau '1h'
delete from public.titik_nilai t
where t.resolusi = '15m'
  and exists (
    select 1 from public.titik_nilai x
    where x.dibaca_pada = t.dibaca_pada
      and x.resolusi in ('1m', '1h')
  )
  and not exists (select 1 from public.permintaan p where p.titik_nilai_id = t.id)
  and not exists (select 1 from public.snapshot s where s.titik_nilai_id = t.id);

-- 3. Bersihkan 2 titik anomali 1 menit akibat jeda indexer Meteora saat rebalance LP 19 Nov 2026
delete from public.titik_nilai t
where t.id in (5411, 5527)
  and t.sumber = 'baca'
  and not exists (select 1 from public.permintaan p where p.titik_nilai_id = t.id)
  and not exists (select 1 from public.snapshot s where s.titik_nilai_id = t.id);

-- 4. Perbaiki ringkas_titik_nilai():
--    - Hanya meringkas sumber = 'baca' (jangan pernah menyentuh 'estimasi').
--    - Promosikan resolusi baris pemenang di tempat (UPDATE resolusi) dengan mempertahankan dibaca_pada & id asli,
--      sehingga nilai sesudah setoran/penarikan tidak pernah mundur melintasi waktu transaksi.
create or replace function public.ringkas_titik_nilai()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_ins_15m int := 0;
  v_del_1m int := 0;
  v_ins_1h int := 0;
  v_del_15m int := 0;
begin
  with pemenang_15m as (
    select distinct on (
      date_trunc('hour', dibaca_pada) + floor(extract(minute from dibaca_pada) / 15) * interval '15 minutes'
    ) id
    from public.titik_nilai
    where resolusi = '1m'
      and sumber = 'baca'
      and dibaca_pada < now() - interval '7 days'
    order by
      date_trunc('hour', dibaca_pada) + floor(extract(minute from dibaca_pada) / 15) * interval '15 minutes',
      dibaca_pada desc,
      id desc
  ),
  upd_15m as (
    update public.titik_nilai t
    set resolusi = '15m',
        rincian = null
    from pemenang_15m w
    where t.id = w.id
      and not exists (
        select 1 from public.titik_nilai x
        where x.dibaca_pada = t.dibaca_pada
          and x.resolusi = '15m'
      )
    returning t.id
  )
  select count(*) into v_ins_15m from upd_15m;

  with del_1m as (
    delete from public.titik_nilai t
    where t.resolusi = '1m'
      and t.sumber = 'baca'
      and t.dibaca_pada < now() - interval '7 days'
      and not exists (select 1 from public.permintaan p where p.titik_nilai_id = t.id)
      and not exists (select 1 from public.snapshot s where s.titik_nilai_id = t.id)
    returning id
  )
  select count(*) into v_del_1m from del_1m;

  with pemenang_1h as (
    select distinct on (date_trunc('hour', dibaca_pada)) id
    from public.titik_nilai
    where resolusi = '15m'
      and sumber = 'baca'
      and dibaca_pada < now() - interval '90 days'
    order by
      date_trunc('hour', dibaca_pada),
      dibaca_pada desc,
      id desc
  ),
  upd_1h as (
    update public.titik_nilai t
    set resolusi = '1h',
        rincian = null
    from pemenang_1h w
    where t.id = w.id
      and not exists (
        select 1 from public.titik_nilai x
        where x.dibaca_pada = t.dibaca_pada
          and x.resolusi = '1h'
      )
    returning t.id
  )
  select count(*) into v_ins_1h from upd_1h;

  with del_15m as (
    delete from public.titik_nilai t
    where t.resolusi = '15m'
      and t.sumber = 'baca'
      and t.dibaca_pada < now() - interval '90 days'
      and not exists (select 1 from public.permintaan p where p.titik_nilai_id = t.id)
      and not exists (select 1 from public.snapshot s where s.titik_nilai_id = t.id)
    returning id
  )
  select count(*) into v_del_15m from del_15m;

  delete from public.job_log where dibuat_pada < now() - interval '14 days';

  return jsonb_build_object(
    'inserted_15m', v_ins_15m,
    'deleted_1m', v_del_1m,
    'inserted_1h', v_ins_1h,
    'deleted_15m', v_del_15m
  );
end;
$$;

-- Batasi eksekusi fungsi SECURITY DEFINER hanya untuk postgres/cron & service_role
revoke all on function public.ringkas_titik_nilai() from public, anon, authenticated;
