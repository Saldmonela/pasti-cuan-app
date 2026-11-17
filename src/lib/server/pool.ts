import { createSupabaseAdmin } from "@/lib/supabase/server";
import { hitungPool, terapkanLive } from "@/lib/engine";
import { usd, waktu as fmtWaktu } from "@/lib/format";
import type { TitikNilai } from "@/lib/onchain";
import type {
  Anggota,
  ArusOnchain,
  LogAudit,
  Pengaturan,
  Permintaan,
  Snapshot,
} from "@/lib/types";
import { mapAnggota } from "./auth";

type TitikRow = {
  id: number;
  dibaca_pada: string;
  resolusi: string;
  sumber: string;
  nilai_usd: number | string;
  saldo_sol: number | string;
  harga_sol_usd: number | string;
};

/** PostgREST membatasi 1.000 baris per query; ambil bertahap agar titik live terbaru tidak terpotong. */
async function fetchAllTitikNilai(admin: ReturnType<typeof createSupabaseAdmin>): Promise<TitikRow[]> {
  const PAGE = 1000;
  const rows: TitikRow[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await admin
      .from("titik_nilai")
      .select("id, dibaca_pada, resolusi, sumber, nilai_usd, saldo_sol, harga_sol_usd")
      .order("id", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`Gagal memuat titik nilai: ${error.message}`);
    if (!data?.length) break;
    rows.push(...data);
    if (data.length < PAGE) break;
  }
  rows.sort((a, b) => Date.parse(a.dibaca_pada) - Date.parse(b.dibaca_pada));
  return rows;
}

export async function loadPoolContext(options: { includeArusDetails?: boolean } = {}) {
  const admin = createSupabaseAdmin();

  const [
    { data: cfgRow, error: cfgErr },
    { data: anggotaRows, error: angErr },
    { data: snapRows, error: snapErr },
    { data: reqRows, error: reqErr },
    { data: arusRows, error: arusErr },
    titikRows,
    { data: logRows },
    { data: jobRows },
  ] = await Promise.all([
    admin.from("pengaturan_pool").select("*").eq("id", 1).single(),
    admin.from("anggota").select("*").order("dibuat_pada", { ascending: true }),
    admin.from("snapshot").select("*").order("tanggal", { ascending: true }),
    admin.from("permintaan").select("*").order("dibuat_pada", { ascending: true }),
    admin.from("arus_onchain").select("*").order("waktu", { ascending: true }),
    fetchAllTitikNilai(admin),
    admin.from("log_audit").select("*").order("pada", { ascending: false }).limit(100),
    admin.from("job_log").select("*").order("dibuat_pada", { ascending: false }).limit(5),
  ]);

  if (cfgErr || !cfgRow) throw new Error(`Gagal memuat pengaturan pool: ${cfgErr?.message}`);
  if (angErr) throw new Error(`Gagal memuat anggota: ${angErr.message}`);
  if (snapErr) throw new Error(`Gagal memuat snapshot: ${snapErr.message}`);
  if (reqErr) throw new Error(`Gagal memuat permintaan: ${reqErr.message}`);
  if (arusErr) throw new Error(`Gagal memuat arus onchain: ${arusErr.message}`);

  const pengaturan: Pengaturan = {
    namaPool: cfgRow.nama_pool,
    tanggalMulai: cfgRow.tanggal_mulai,
    feePersen: Number(cfgRow.fee_persen),
    satuanDasarFee: cfgRow.satuan_dasar_fee,
    batasDataLamaHari: Number(cfgRow.batas_data_lama_hari),
    ambangLonjakanPersen: Number(cfgRow.ambang_lonjakan_persen),
    alamatWalletPool: cfgRow.alamat_wallet_pool,
    jamSnapshot: String(cfgRow.jam_snapshot_otomatis).slice(0, 5),
    ambangLikuiditasTokenUsd: Number(cfgRow.ambang_likuiditas_token_usd),
    ambangDustUsd: Number(cfgRow.ambang_dust_usd),
    batasLiveLamaMenit: Number(cfgRow.batas_live_lama_menit),
    toleransiCocokPersen: Number(cfgRow.toleransi_cocok_persen),
  };

  const anggota: Anggota[] = (anggotaRows ?? []).map(mapAnggota);
  const snapshots: Snapshot[] = (snapRows ?? []).map((s) => ({
    tanggal: s.tanggal,
    sumber: s.sumber,
    alasan: s.alasan ?? undefined,
    nilaiUsd: Number(s.nilai_usd),
    saldoSol: Number(s.saldo_sol),
    feeLpDiklaimSol: s.fee_lp_diklaim_sol != null ? Number(s.fee_lp_diklaim_sol) : undefined,
    catatan: s.catatan ?? undefined,
    dibuatOleh: s.dibuat_oleh ?? "sistem",
    dibuatPada: s.dibuat_pada,
    diubahPada: s.diubah_pada ?? undefined,
  }));

  const permintaan: Permintaan[] = (reqRows ?? []).map((p) => ({
    id: p.id,
    anggotaId: p.anggota_id,
    jenis: p.jenis,
    jumlahUsd: Number(p.jumlah_usd),
    tanggalTransfer: p.tanggal_transfer ?? undefined,
    alamatWalletTujuan: p.alamat_wallet_tujuan ?? undefined,
    buktiTransaksi: p.bukti_transaksi ?? undefined,
    catatan: p.catatan ?? undefined,
    status: p.status,
    alasan: p.alasan ?? undefined,
    tanggalEfektif: p.tanggal_efektif ?? undefined,
    waktuEfektif: p.waktu_efektif ?? undefined,
    titikNilaiId: p.titik_nilai_id != null ? Number(p.titik_nilai_id) : undefined,
    jumlahFinalUsd: p.jumlah_final_usd != null ? Number(p.jumlah_final_usd) : undefined,
    sumber: p.sumber,
    dibuatOleh: p.dibuat_oleh ?? undefined,
    diprosesOleh: p.diproses_oleh ?? undefined,
    diprosesPada: p.diproses_pada ?? undefined,
    dibuatPada: p.dibuat_pada,
  }));

  const arusAll: ArusOnchain[] = (arusRows ?? []).map((a) => ({
    id: a.id,
    signature: a.signature,
    urutan: Number(a.urutan),
    waktu: a.waktu,
    arah: a.arah,
    token: a.mint,
    simbol: a.simbol ?? undefined,
    jumlah: Number(a.jumlah),
    nilaiUsd: Number(a.nilai_usd),
    alamatLawan: a.alamat_lawan,
    status: a.status,
    permintaanId: a.permintaan_id ?? undefined,
    catatan: a.catatan ?? undefined,
    alasanSelisih: a.alasan_selisih ?? undefined,
    ditandaiOleh: a.ditandai_oleh ?? undefined,
    ditandaiPada: a.ditandai_pada ?? undefined,
  }));

  // Pilih resolusi terbaik bila ada duplikat waktu, atau pertahankan urutan kronologis
  const titik: TitikNilai[] = (titikRows ?? []).map((t) => ({
    id: Number(t.id),
    ms: Date.parse(t.dibaca_pada),
    nilaiUsd: Number(t.nilai_usd),
    saldoSol: Number(t.saldo_sol),
    harga: Number(t.harga_sol_usd),
    estimasi: t.sumber === "estimasi" ? true : undefined,
  }));

  const sekarang = Date.now();
  const resmi = hitungPool(anggota, snapshots, permintaan, pengaturan, arusAll, titik);
  const hasil = terapkanLive(resmi, anggota, snapshots, arusAll, titik, sekarang, pengaturan);

  // Versi data untuk proteksi konkurensi pengajuan tarik (PRD 3.1, Konkurensi)
  const versiCandidates = [
    cfgRow.diubah_pada,
    ...(snapRows ?? []).map((s) => s.diubah_pada || s.dibuat_pada),
    ...(reqRows ?? []).map((p) => p.diproses_pada || p.dibuat_pada),
  ].filter(Boolean) as string[];
  const versiData = versiCandidates.sort().at(-1) ?? new Date(0).toISOString();

  const namaMap = new Map(anggota.map((a) => [a.id, a.nama]));
  const log: LogAudit[] = (logRows ?? []).map((l) => formatAuditRow(l, namaMap));

  return {
    admin,
    pengaturan,
    anggota,
    snapshots,
    permintaan,
    arus: options.includeArusDetails ? arusAll : [],
    arusBelumCount: arusAll.filter((a) => a.status === "belum").length,
    arusAll,
    titik,
    estimasi: titik.some((t) => t.estimasi),
    resmi,
    hasil,
    sekarang,
    versiData,
    log,
    jobLog: jobRows ?? [],
  };
}

function formatAuditRow(
  row: {
    id: number;
    tabel: string;
    aksi: "insert" | "update" | "delete";
    nilai_lama: Record<string, unknown> | null;
    nilai_baru: Record<string, unknown> | null;
    oleh: string | null;
    pada: string;
  },
  namaMap: Map<string, string>,
): LogAudit {
  const tabelMap: Record<string, LogAudit["tabel"]> = {
    snapshot: "snapshot",
    permintaan: "permintaan",
    anggota: "anggota",
    pengaturan_pool: "pengaturan",
    arus_onchain: "arus",
  };
  const tabel = tabelMap[row.tabel] ?? "impor";
  const b = row.nilai_baru ?? {};
  const l = row.nilai_lama ?? {};

  let ringkasan = `${row.aksi.toUpperCase()} pada ${row.tabel}`;
  let nilaiLama: string | undefined;
  let nilaiBaru: string | undefined;

  if (row.tabel === "snapshot") {
    const tgl = String(b.tanggal ?? l.tanggal ?? "");
    if (row.aksi === "insert") {
      ringkasan = `Snapshot ${String(b.sumber ?? "")} ${tgl}: ${usd(Number(b.nilai_usd ?? 0))}.`;
    } else if (row.aksi === "update") {
      ringkasan = `Mengubah snapshot ${tgl}${b.alasan ? `: ${String(b.alasan)}` : ""}.`;
      nilaiLama = `${usd(Number(l.nilai_usd ?? 0))} · ${l.saldo_sol} SOL`;
      nilaiBaru = `${usd(Number(b.nilai_usd ?? 0))} · ${b.saldo_sol} SOL`;
    } else {
      ringkasan = `Menghapus snapshot ${tgl}.`;
      nilaiLama = `${usd(Number(l.nilai_usd ?? 0))}`;
    }
  } else if (row.tabel === "permintaan") {
    const nm = namaMap.get(String(b.anggota_id ?? l.anggota_id ?? "")) ?? "Anggota";
    const jns = (b.jenis ?? l.jenis) === "setor" ? "setoran" : "penarikan";
    const jml = usd(Number(b.jumlah_final_usd ?? b.jumlah_usd ?? l.jumlah_usd ?? 0));
    if (row.aksi === "insert") {
      ringkasan = `${nm} mengajukan ${jns} ${jml}.`;
    } else if (row.aksi === "update") {
      ringkasan = `${jns[0].toUpperCase() + jns.slice(1)} ${nm} ${jml} → ${String(b.status ?? "")}.`;
      nilaiLama = String(l.status ?? "");
      nilaiBaru = String(b.status ?? "");
    } else {
      ringkasan = `Menghapus permintaan ${jns} ${nm} ${jml}.`;
    }
  } else if (row.tabel === "arus_onchain") {
    const wkt = b.waktu || l.waktu ? fmtWaktu(String(b.waktu ?? l.waktu)) : "";
    const jml = usd(Number(b.nilai_usd ?? l.nilai_usd ?? 0));
    ringkasan = `Arus ${wkt} (${jml}): ${String(l.status ?? "")} → ${String(b.status ?? "")}.`;
    nilaiLama = String(l.status ?? "");
    nilaiBaru = String(b.status ?? "");
  } else if (row.tabel === "anggota") {
    const nm = String(b.nama ?? l.nama ?? "");
    ringkasan = row.aksi === "insert" ? `Menambah anggota ${nm} (${String(b.peran ?? "")}).` : `Memperbarui data anggota ${nm}.`;
  } else if (row.tabel === "pengaturan_pool") {
    ringkasan = "Mengubah pengaturan pool.";
  }

  return {
    id: String(row.id),
    tabel,
    aksi: row.aksi,
    ringkasan,
    nilaiLama,
    nilaiBaru,
    oleh: row.oleh ?? "sistem",
    pada: row.pada,
  };
}
