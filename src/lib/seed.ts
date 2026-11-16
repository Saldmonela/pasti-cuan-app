// Data contoh prototype. Sumber: angka acuan PRD per 14 Nov 2026 (Tracker_LP_v3 untuk USD,
// Laporan Harian untuk SOL). Nilai USD harian diturunkan oleh scripts/derive-seed.mjs supaya
// lolos golden test di PRD Section 3.3 "Rencana Uji". Email masih contoh, bukan email asli.
// Sejak 15 Nov 2026 nilai pool dibaca otomatis (onchain.ts): snapshot 15 Nov 08.00 dibuat otomatis,
// dan arus onchain 15 Nov mengikuti hasil baca wallet di PRD.
import type { DataPool, Permintaan, Snapshot } from "./types";
import { tambahHari } from "./format";
import { ALAMAT_POOL, deteksiArus, hargaPasar, msSnapshot, semuaTitik, titikSnapshot, TX_CONTOH } from "./onchain";

/** Waktu awal prototype: pembacaan wallet terakhir yang diuji PRD. */
export const WAKTU_AWAL = "2026-11-15T13:03:00+07:00";

const NILAI_USD = [
  397.76, 394.73, 617, 679.52, 725.59, 769.32, 760.73, 797.73, 808.25, 838.77, 852.02, 1283.98, 1292.71, 1313.32,
  1218.62, 1237.69, 1334.12, 1338.46, 1347.84, 1428.8, 1413.06, 1378.53, 1438.24, 2161.13, 2098.78, 2132.23, 2068.38,
  2058.19, 2129.94, 2076.53,
];
/** Saldo SOL dari Laporan Harian (Excel). Hanya pembanding di template impor; yang disimpan dihitung dari harga pasar. */
export const SALDO_SOL_EXCEL = [
  3.7765, 3.81307, 6.030244, 6.463, 6.7965, 7.24, 7.221, 7.6675, 7.8961, 8.22, 8.43, 12.72, 12.788673, 12.85187,
  13.124562, 13.343513, 13.994646, 14.14162, 14.675705, 14.87561, 15.369292, 15.392349, 16.117308, 16.132547, 24.349833,
  24.626014, 24.799459, 24.682586, 24.801594, 27.439535,
];
const MULAI = "2026-10-16";

/**
 * Riwayat impor Tracker_LP_v3 (16 Okt - 14 Nov 2026). Saldo SOL = nilai USD / harga SOL pasar CoinGecko jam 08.00 WIB
 * (US-06, diputuskan 15 Nov 2026), bukan angka Laporan Harian.
 */
export const SNAPSHOT_AWAL: Snapshot[] = NILAI_USD.map((v, i) => ({
  tanggal: tambahHari(MULAI, i),
  sumber: "impor",
  nilaiUsd: v,
  saldoSol: Math.round((v / hargaPasar(msSnapshot(tambahHari(MULAI, i)))) * 1e9) / 1e9,
  dibuatOleh: "galih",
  dibuatPada: `${tambahHari(MULAI, i)}T08:00:00+07:00`,
}));

/** Snapshot otomatis dari titik nilai pertama pada/sesudah 08.00 WIB (BR-18). */
export function snapshotOtomatis(tanggal: string): Snapshot | null {
  const t = titikSnapshot(semuaTitik(), tanggal);
  if (!t) return null;
  return {
    tanggal,
    sumber: "otomatis",
    nilaiUsd: t.nilaiUsd,
    saldoSol: Math.round(t.saldoSol * 1e9) / 1e9,
    dibuatOleh: "sistem",
    dibuatPada: `${tanggal}T08:00:00+07:00`,
  };
}

const impor = (id: string, anggotaId: string, tanggal: string, jumlah: number): Permintaan => ({
  id,
  anggotaId,
  jenis: "setor",
  jumlahUsd: jumlah,
  tanggalTransfer: tanggal,
  status: "selesai",
  tanggalEfektif: tanggal,
  jumlahFinalUsd: jumlah,
  sumber: "impor",
  diprosesOleh: "galih",
  diprosesPada: "2026-11-14T09:00:00+07:00",
  dibuatPada: `${tanggal}T08:00:00+07:00`,
});

export function dataAwal(): DataPool {
  return {
    pengaturan: {
      namaPool: "Pasti Cuan",
      tanggalMulai: MULAI,
      feePersen: 0.1,
      satuanDasarFee: "USD",
      batasDataLamaHari: 2,
      ambangLonjakanPersen: 30,
      alamatWalletPool: ALAMAT_POOL,
      jamSnapshot: "08:00",
      ambangLikuiditasTokenUsd: 10000,
      ambangDustUsd: 1,
      batasLiveLamaMenit: 15,
      toleransiCocokPersen: 2,
    },
    anggota: [
      { id: "faiz", nama: "Faiz", email: "faiz@example.com", peran: "investor", aktif: true, dibuatPada: "2026-10-16T08:00:00+07:00" },
      { id: "luqman", nama: "Luqman", email: "luqman@example.com", peran: "investor", aktif: true, dibuatPada: "2026-10-16T08:00:00+07:00" },
      { id: "rezki", nama: "Rezki", email: "rezki@example.com", peran: "investor", aktif: true, alamatWallet: ["Chtm91xf…"], dibuatPada: "2026-10-16T08:00:00+07:00" },
      { id: "salman", nama: "Salman", email: "salman@example.com", peran: "investor", aktif: true, dibuatPada: "2026-10-16T08:00:00+07:00" },
      { id: "hafiz", nama: "Hafiz", email: "hafiz@example.com", peran: "investor", aktif: true, alamatWallet: ["Hfz7cOnToH…"], dibuatPada: "2026-10-27T08:00:00+07:00" },
      { id: "galih", nama: "Galih", email: "galih@example.com", peran: "pengelola", aktif: true, dibuatPada: "2026-10-16T08:00:00+07:00" },
    ],
    snapshots: [...SNAPSHOT_AWAL.map((s) => ({ ...s })), snapshotOtomatis("2026-11-15")!],
    arus: deteksiArus(TX_CONTOH, ALAMAT_POOL, { ambangDustUsd: 1 }),
    estimasi: true,
    permintaan: [
      impor("t01", "faiz", "2026-10-16", 100),
      impor("t02", "luqman", "2026-10-16", 100),
      impor("t03", "rezki", "2026-10-16", 100),
      impor("t04", "salman", "2026-10-16", 100),
      impor("t05", "rezki", "2026-10-18", 200),
      impor("t06", "salman", "2026-10-27", 200),
      impor("t07", "hafiz", "2026-10-27", 100),
      impor("t08", "salman", "2026-11-08", 525),
      impor("t09", "rezki", "2026-11-08", 200),
      impor("t10", "rezki", "2026-11-13", 200),
      {
        id: "p01",
        anggotaId: "hafiz",
        jenis: "setor",
        jumlahUsd: 150,
        tanggalTransfer: "2026-11-15",
        buktiTransaksi: "Transfer USDC 15/11 13.00",
        status: "menunggu",
        sumber: "app",
        dibuatPada: "2026-11-15T13:01:00+07:00",
      },
      {
        id: "p02",
        anggotaId: "faiz",
        jenis: "tarik",
        jumlahUsd: 50,
        catatan: "Untuk keperluan kuliah",
        status: "menunggu",
        sumber: "app",
        dibuatPada: "2026-11-15T08:15:00+07:00",
      },
      {
        id: "p03",
        anggotaId: "rezki",
        jenis: "tarik",
        jumlahUsd: 731.51,
        alamatWalletTujuan: "Chtm91xf…",
        status: "menunggu",
        sumber: "app",
        dibuatPada: "2026-11-15T08:20:00+07:00",
      },
    ],
    log: [
      {
        id: "l01",
        tabel: "impor",
        aksi: "insert",
        ringkasan: "Mengimpor riwayat dari Tracker_LP_v3: 30 saldo harian dan 10 setoran.",
        oleh: "galih",
        pada: "2026-11-14T09:00:00+07:00",
      },
      {
        id: "l02",
        tabel: "snapshot",
        aksi: "insert",
        ringkasan: "Snapshot otomatis 15 Nov 2026, 08.00 WIB dari pembacaan wallet.",
        oleh: "sistem",
        pada: "2026-11-15T08:00:00+07:00",
      },
      {
        id: "l03",
        tabel: "permintaan",
        aksi: "insert",
        ringkasan: "Mengajukan penarikan US$50,00.",
        oleh: "faiz",
        pada: "2026-11-15T08:15:00+07:00",
      },
      {
        id: "l04",
        tabel: "permintaan",
        aksi: "insert",
        ringkasan: "Mengajukan penarikan US$731,51.",
        oleh: "rezki",
        pada: "2026-11-15T08:20:00+07:00",
      },
      {
        id: "l05",
        tabel: "permintaan",
        aksi: "insert",
        ringkasan: "Mengajukan setoran US$150,00.",
        oleh: "hafiz",
        pada: "2026-11-15T13:01:00+07:00",
      },
    ],
  };
}
