-- Skema awal Pasti Cuan v1.0 (sesuai PRD Section 3.1 + update 17 Nov 2026)

create extension if not exists pgcrypto;
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- 1. Anggota
create table public.anggota (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  nama text not null,
  email text not null,
  peran text not null check (peran in ('investor', 'pengelola')),
  alamat_wallet text[] not null default '{}',
  aktif boolean not null default true,
  dibuat_pada timestamptz not null default now(),
  constraint anggota_nama_panjang check (char_length(btrim(nama)) between 2 and 40),
  constraint anggota_email_kecil check (email = lower(btrim(email)))
);

create unique index anggota_nama_unik on public.anggota (lower(btrim(nama)));
create unique index anggota_email_unik on public.anggota (email);

create or replace function public.rapikan_anggota()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.nama := btrim(new.nama);
  new.email := lower(btrim(new.email));
  return new;
end;
$$;

create trigger trg_rapikan_anggota
before insert or update on public.anggota
for each row execute function public.rapikan_anggota();

-- 2. Pengaturan Pool (1 baris tunggal)
create table public.pengaturan_pool (
  id int primary key default 1 check (id = 1),
  nama_pool text not null default 'Pasti Cuan',
  tanggal_mulai date not null default date '2026-10-16',
  fee_persen numeric(5,4) not null default 0.1000 check (fee_persen >= 0 and fee_persen <= 1),
  satuan_dasar_fee text not null default 'USD' check (satuan_dasar_fee in ('USD', 'SOL')),
  batas_data_lama_hari int not null default 2 check (batas_data_lama_hari >= 1),
  ambang_lonjakan_persen numeric not null default 30 check (ambang_lonjakan_persen > 0),
  zona_waktu text not null default 'Asia/Jakarta',
  alamat_wallet_pool text not null default 'By6HpsukcTeVsV6FyBzhQJ2nzdHP46kXaSPtrCGUzoaR',
  jam_snapshot_otomatis time not null default time '08:00:00',
  ambang_likuiditas_token_usd numeric not null default 10000 check (ambang_likuiditas_token_usd >= 0),
  ambang_dust_usd numeric not null default 1 check (ambang_dust_usd >= 0),
  batas_live_lama_menit int not null default 15 check (batas_live_lama_menit >= 1),
  toleransi_cocok_persen numeric not null default 2 check (toleransi_cocok_persen >= 0),
  last_signature text,
  last_flow_check_at timestamptz,
  diubah_pada timestamptz not null default now()
);

insert into public.pengaturan_pool (id) values (1) on conflict (id) do nothing;

-- 3. Titik Nilai (pembacaan wallet per 1m / ringkasan 15m / 1h / estimasi)
create table public.titik_nilai (
  id bigserial primary key,
  dibaca_pada timestamptz not null,
  resolusi text not null check (resolusi in ('1m', '15m', '1h')),
  sumber text not null check (sumber in ('baca', 'estimasi')),
  nilai_usd numeric(14,2) not null check (nilai_usd > 0),
  saldo_sol numeric(24,9) not null check (saldo_sol > 0),
  harga_sol_usd numeric(14,6) not null check (harga_sol_usd > 0),
  rincian jsonb,
  dibuat_pada timestamptz not null default now(),
  constraint titik_nilai_waktu_resolusi_unik unique (dibaca_pada, resolusi)
);

create index idx_titik_nilai_resolusi_waktu on public.titik_nilai (resolusi, dibaca_pada desc);

-- 4. Snapshot harian resmi
create table public.snapshot (
  id uuid primary key default gen_random_uuid(),
  tanggal date not null unique check (tanggal >= date '2026-10-16'),
  nilai_usd numeric(14,2) not null check (nilai_usd > 0),
  saldo_sol numeric(24,9) not null check (saldo_sol > 0),
  harga_sol_usd numeric(14,6) generated always as (nilai_usd / saldo_sol) stored,
  fee_lp_diklaim_sol numeric(24,9) check (fee_lp_diklaim_sol is null or fee_lp_diklaim_sol >= 0),
  catatan text check (catatan is null or char_length(catatan) <= 500),
  alasan text check (alasan is null or char_length(alasan) <= 500),
  sumber text not null check (sumber in ('otomatis', 'manual', 'koreksi', 'impor')),
  titik_nilai_id bigint references public.titik_nilai(id) on delete set null,
  dibuat_oleh uuid references public.anggota(id) on delete set null,
  dibuat_pada timestamptz not null default now(),
  diubah_pada timestamptz not null default now()
);

create index idx_snapshot_tanggal on public.snapshot (tanggal asc);

-- 5. Permintaan (setor/tarik + transaksi impor)
create table public.permintaan (
  id uuid primary key default gen_random_uuid(),
  anggota_id uuid not null references public.anggota(id) on delete restrict,
  jenis text not null check (jenis in ('setor', 'tarik')),
  jumlah_usd numeric(14,2) not null check (jumlah_usd > 0),
  tanggal_transfer date,
  alamat_wallet_tujuan text check (alamat_wallet_tujuan is null or char_length(alamat_wallet_tujuan) <= 64),
  bukti_transaksi text check (bukti_transaksi is null or char_length(bukti_transaksi) <= 100),
  catatan text check (catatan is null or char_length(catatan) <= 200),
  status text not null default 'menunggu' check (status in ('menunggu', 'selesai', 'ditolak', 'dibatalkan')),
  alasan text,
  tanggal_efektif date references public.snapshot(tanggal) on delete restrict,
  waktu_efektif timestamptz,
  titik_nilai_id bigint references public.titik_nilai(id) on delete restrict,
  jumlah_final_usd numeric(14,2) check (jumlah_final_usd is null or jumlah_final_usd > 0),
  sumber text not null default 'app' check (sumber in ('app', 'impor')),
  dibuat_oleh uuid references public.anggota(id) on delete set null,
  diproses_oleh uuid references public.anggota(id) on delete set null,
  diproses_pada timestamptz,
  dibuat_pada timestamptz not null default now(),
  constraint permintaan_selesai_lengkap check (
    status <> 'selesai' or (
      jumlah_final_usd is not null
      and waktu_efektif is not null
      and (tanggal_efektif is not null or titik_nilai_id is not null)
    )
  )
);

-- BR-08: maksimal 1 permintaan menunggu per investor per jenis
create unique index idx_permintaan_menunggu_unik
  on public.permintaan (anggota_id, jenis)
  where status = 'menunggu';

create index idx_permintaan_waktu_efektif on public.permintaan (waktu_efektif asc);

-- 6. Arus Onchain (transfer masuk/keluar terdeteksi di wallet)
create table public.arus_onchain (
  id uuid primary key default gen_random_uuid(),
  signature text not null,
  urutan int not null default 0,
  waktu timestamptz not null,
  arah text not null check (arah in ('masuk', 'keluar')),
  mint text not null,
  simbol text,
  jumlah numeric(30,9) not null check (jumlah > 0),
  nilai_usd numeric(14,2) not null check (nilai_usd >= 0),
  alamat_lawan text not null,
  status text not null default 'belum' check (status in ('belum', 'dicocokkan', 'biaya', 'bukan_arus')),
  permintaan_id uuid references public.permintaan(id) on delete set null,
  catatan text check (catatan is null or char_length(catatan) <= 200),
  alasan_selisih text check (alasan_selisih is null or char_length(alasan_selisih) <= 200),
  ditandai_oleh uuid references public.anggota(id) on delete set null,
  ditandai_pada timestamptz,
  dibuat_pada timestamptz not null default now(),
  constraint arus_signature_urutan_unik unique (signature, urutan),
  constraint arus_cocok_wajib_permintaan check (status <> 'dicocokkan' or permintaan_id is not null),
  constraint arus_biaya_bukan_wajib_catatan check (
    status not in ('biaya', 'bukan_arus')
    or (catatan is not null and char_length(btrim(catatan)) > 0)
  )
);

create index idx_arus_onchain_status_waktu on public.arus_onchain (status, waktu desc);

-- 7. Log Audit (immutable: hanya INSERT lewat trigger)
create table public.log_audit (
  id bigserial primary key,
  tabel text not null,
  aksi text not null check (aksi in ('insert', 'update', 'delete')),
  baris_id uuid,
  nilai_lama jsonb,
  nilai_baru jsonb,
  oleh uuid references public.anggota(id) on delete set null,
  pada timestamptz not null default now()
);

create index idx_log_audit_pada on public.log_audit (pada desc);

-- 8. Log Job Pembaca (status singkat untuk monitoring di /kelola/saldo)
create table public.job_log (
  id bigserial primary key,
  job_name text not null,
  status text not null check (status in ('ok', 'skip', 'error')),
  detail jsonb,
  dibuat_pada timestamptz not null default now()
);

create index idx_job_log_dibuat on public.job_log (dibuat_pada desc);

-- Helper akses (dipakai RLS dan trigger)
create or replace function public.anggota_saya()
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select id
  from public.anggota
  where auth_user_id = auth.uid()
    and aktif = true
  limit 1;
$$;

create or replace function public.is_pengelola()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.anggota
    where auth_user_id = auth.uid()
      and aktif = true
      and peran = 'pengelola'
  );
$$;

-- Trigger Audit Otomatis
create or replace function public.catat_log_audit()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid;
  v_baris_id uuid;
  v_lama jsonb;
  v_baru jsonb;
  v_diff_old jsonb;
  v_diff_new jsonb;
begin
  v_actor := public.anggota_saya();

  if tg_table_name = 'pengaturan_pool' then
    v_baris_id := null;
    if tg_op = 'UPDATE' then
      v_diff_old := to_jsonb(old) - 'last_signature' - 'last_flow_check_at' - 'diubah_pada';
      v_diff_new := to_jsonb(new) - 'last_signature' - 'last_flow_check_at' - 'diubah_pada';
      if v_diff_old = v_diff_new then
        return new;
      end if;
    end if;
  else
    v_baris_id := coalesce(
      case when tg_op in ('INSERT', 'UPDATE') then new.id else null end,
      case when tg_op = 'DELETE' then old.id else null end
    );
  end if;

  if tg_op = 'INSERT' then
    v_lama := null;
    v_baru := to_jsonb(new);
  elsif tg_op = 'UPDATE' then
    v_lama := to_jsonb(old);
    v_baru := to_jsonb(new);
  else
    v_lama := to_jsonb(old);
    v_baru := null;
  end if;

  insert into public.log_audit (tabel, aksi, baris_id, nilai_lama, nilai_baru, oleh)
  values (tg_table_name, lower(tg_op), v_baris_id, v_lama, v_baru, v_actor);

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger trg_audit_snapshot
after insert or update or delete on public.snapshot
for each row execute function public.catat_log_audit();

create trigger trg_audit_permintaan
after insert or update or delete on public.permintaan
for each row execute function public.catat_log_audit();

create trigger trg_audit_anggota
after insert or update or delete on public.anggota
for each row execute function public.catat_log_audit();

create trigger trg_audit_pengaturan_pool
after update on public.pengaturan_pool
for each row execute function public.catat_log_audit();

create trigger trg_audit_arus_onchain
after update or delete on public.arus_onchain
for each row execute function public.catat_log_audit();

-- Enable Row Level Security di seluruh tabel
alter table public.anggota enable row level security;
alter table public.pengaturan_pool enable row level security;
alter table public.titik_nilai enable row level security;
alter table public.snapshot enable row level security;
alter table public.permintaan enable row level security;
alter table public.arus_onchain enable row level security;
alter table public.log_audit enable row level security;
alter table public.job_log enable row level security;

-- Policies: anggota aktif bisa membaca data bersama; arus mentah hanya untuk pengelola (RBAC 2.5)
create policy "anggota_select_aktif" on public.anggota
  for select to authenticated
  using (public.anggota_saya() is not null);

create policy "anggota_kelola_write" on public.anggota
  for all to authenticated
  using (public.is_pengelola())
  with check (public.is_pengelola());

create policy "pengaturan_select_aktif" on public.pengaturan_pool
  for select to authenticated
  using (public.anggota_saya() is not null);

create policy "pengaturan_kelola_update" on public.pengaturan_pool
  for update to authenticated
  using (public.is_pengelola())
  with check (public.is_pengelola());

create policy "titik_nilai_select_aktif" on public.titik_nilai
  for select to authenticated
  using (public.anggota_saya() is not null);

create policy "snapshot_select_aktif" on public.snapshot
  for select to authenticated
  using (public.anggota_saya() is not null);

create policy "snapshot_kelola_write" on public.snapshot
  for all to authenticated
  using (public.is_pengelola())
  with check (public.is_pengelola());

-- OQ-07: semua anggota aktif boleh melihat permintaan setor/tarik semua anggota
create policy "permintaan_select_aktif" on public.permintaan
  for select to authenticated
  using (public.anggota_saya() is not null);

create policy "permintaan_insert_sendiri" on public.permintaan
  for insert to authenticated
  with check (
    public.anggota_saya() is not null
    and anggota_id = public.anggota_saya()
    and status = 'menunggu'
    and sumber = 'app'
  );

create policy "permintaan_batal_sendiri" on public.permintaan
  for update to authenticated
  using (
    anggota_id = public.anggota_saya()
    and status = 'menunggu'
  )
  with check (
    anggota_id = public.anggota_saya()
    and status = 'dibatalkan'
  );

create policy "permintaan_kelola_all" on public.permintaan
  for all to authenticated
  using (public.is_pengelola())
  with check (public.is_pengelola());

create policy "arus_select_pengelola" on public.arus_onchain
  for select to authenticated
  using (public.is_pengelola());

create policy "arus_update_pengelola" on public.arus_onchain
  for update to authenticated
  using (public.is_pengelola())
  with check (public.is_pengelola());

create policy "log_audit_select_aktif" on public.log_audit
  for select to authenticated
  using (public.anggota_saya() is not null);

create policy "job_log_select_pengelola" on public.job_log
  for select to authenticated
  using (public.is_pengelola());

-- Job ringkasan harian (BR-21): 1m (>7 hari) -> 15m; 15m (>90 hari) -> 1h
-- Titik terakhir tiap kelompok waktu disimpan (bukan rata-rata); titik yg direferensikan transaksi/snapshot tetap aman.
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
  with kandidat as (
    select distinct on (date_trunc('hour', dibaca_pada) + floor(extract(minute from dibaca_pada) / 15) * interval '15 minutes')
      date_trunc('hour', dibaca_pada) + floor(extract(minute from dibaca_pada) / 15) * interval '15 minutes' as bucket,
      sumber, nilai_usd, saldo_sol, harga_sol_usd
    from public.titik_nilai
    where resolusi = '1m'
      and dibaca_pada < now() - interval '7 days'
    order by 1, dibaca_pada desc
  ),
  ins as (
    insert into public.titik_nilai (dibaca_pada, resolusi, sumber, nilai_usd, saldo_sol, harga_sol_usd, rincian)
    select bucket, '15m', sumber, nilai_usd, saldo_sol, harga_sol_usd, null
    from kandidat
    on conflict (dibaca_pada, resolusi) do nothing
    returning id
  )
  select count(*) into v_ins_15m from ins;

  with del as (
    delete from public.titik_nilai t
    where t.resolusi = '1m'
      and t.dibaca_pada < now() - interval '7 days'
      and not exists (select 1 from public.permintaan p where p.titik_nilai_id = t.id)
      and not exists (select 1 from public.snapshot s where s.titik_nilai_id = t.id)
    returning id
  )
  select count(*) into v_del_1m from del;

  with kandidat_1h as (
    select distinct on (date_trunc('hour', dibaca_pada))
      date_trunc('hour', dibaca_pada) as bucket,
      sumber, nilai_usd, saldo_sol, harga_sol_usd
    from public.titik_nilai
    where resolusi = '15m'
      and dibaca_pada < now() - interval '90 days'
    order by 1, dibaca_pada desc
  ),
  ins_1h as (
    insert into public.titik_nilai (dibaca_pada, resolusi, sumber, nilai_usd, saldo_sol, harga_sol_usd, rincian)
    select bucket, '1h', sumber, nilai_usd, saldo_sol, harga_sol_usd, null
    from kandidat_1h
    on conflict (dibaca_pada, resolusi) do nothing
    returning id
  )
  select count(*) into v_ins_1h from ins_1h;

  with del_15m as (
    delete from public.titik_nilai t
    where t.resolusi = '15m'
      and t.dibaca_pada < now() - interval '90 days'
      and not exists (select 1 from public.permintaan p where p.titik_nilai_id = t.id)
      and not exists (select 1 from public.snapshot s where s.titik_nilai_id = t.id)
    returning id
  )
  select count(*) into v_del_15m from del_15m;

  -- Bersihkan job_log lebih dari 14 hari
  delete from public.job_log where dibuat_pada < now() - interval '14 days';

  return jsonb_build_object(
    'inserted_15m', v_ins_15m,
    'deleted_1m', v_del_1m,
    'inserted_1h', v_ins_1h,
    'deleted_15m', v_del_15m
  );
end;
$$;

-- Jadwalkan ringkasan harian jam 03.00 WIB (20:00 UTC)
do $$
begin
  if exists (select 1 from cron.job where jobname = 'ringkas-titik-nilai-harian') then
    perform cron.unschedule('ringkas-titik-nilai-harian');
  end if;
  perform cron.schedule(
    'ringkas-titik-nilai-harian',
    '0 20 * * *',
    $job$select public.ringkas_titik_nilai();$job$
  );
end $$;
