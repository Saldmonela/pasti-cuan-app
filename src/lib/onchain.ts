// Pembaca wallet versi prototype (PRD 3.1 "Job Pembaca Wallet", BR-17 s.d. BR-21).
// App asli membaca Meteora, Solana RPC, dan Jupiter tiap menit. Prototype memakai deret titik nilai
// buatan yang deterministik, dikunci ke angka yang diuji PRD pada 15 Nov 2026:
//   - 13.03 WIB: nilai pool $1.171,81 dengan harga SOL $70,49 (fixture BR-17);
//   - 08.38 swap 10,7416 SOL ke 731,51 USDC, lalu 1 + 730,51 USDC keluar ke `Chtm91xf…` (penarikan Rezki);
//   - 10.22 0,1 SOL keluar ke `DqZ3Dn1V…`; 0,001 USDC masuk dari `BkdHEdNX…` (dust).
// Setoran Hafiz 150 USDC pukul 13.06 hanya contoh prototype, tidak ada di wallet asli.
import type { ArusOnchain, Pengaturan, Permintaan, Snapshot } from "./types";
import HARGA from "./harga-pasar.json";

export const MENIT = 60_000;
const OFFSET_WIB = 7 * 60 * MENIT;

/** "2026-11-15T13:03:00+07:00" atau "2026-11-15" -> milidetik. */
export function ms(iso: string): number {
  return Date.parse(iso.length <= 10 ? `${iso}T00:00:00+07:00` : iso);
}

/** Milidetik -> "2026-11-15T13:03:00+07:00". */
export function isoWib(t: number): string {
  return new Date(t + OFFSET_WIB).toISOString().slice(0, 16) + ":00+07:00";
}

/** Waktu resmi snapshot: tanggal itu, jam snapshot otomatis (BR-18). */
export function msSnapshot(tanggal: string, jam = "08:00"): number {
  return ms(`${tanggal}T${jam}:00+07:00`);
}

// ---------- BR-17: valuasi satu pembacaan ----------

export interface TokenWallet {
  mint: string;
  simbol?: string;
  jumlah: number;
  /** Harga Jupiter; kosong bila token tidak punya harga. */
  hargaUsd?: number;
  likuiditasUsd?: number;
}

export interface Rincian {
  dlmmUsd: number;
  feeBelumKlaimUsd: number;
  solNative: number;
  hargaSol: number;
  token: TokenWallet[];
}

/** Token dihitung hanya jika punya harga dan likuiditas >= ambang; selain itu $0 (spam/airdrop). */
export function nilaiToken(t: TokenWallet, set: Pick<Pengaturan, "ambangLikuiditasTokenUsd">): number {
  if (!t.hargaUsd || (t.likuiditasUsd ?? 0) < set.ambangLikuiditasTokenUsd) return 0;
  return t.jumlah * t.hargaUsd;
}

export function nilaiPool(r: Rincian, set: Pick<Pengaturan, "ambangLikuiditasTokenUsd">) {
  const nilaiUsd = r.dlmmUsd + r.feeBelumKlaimUsd + r.solNative * r.hargaSol + r.token.reduce((a, t) => a + nilaiToken(t, set), 0);
  return { nilaiUsd, saldoSol: nilaiUsd / r.hargaSol };
}

/** Pembacaan wallet pool 15 Nov 2026 13.03 WIB (PRD Rencana Uji, "Valuasi"). */
export const RINCIAN_1303: Rincian = {
  dlmmUsd: 1150.3861,
  feeBelumKlaimUsd: 0.0003,
  solNative: 0.2709,
  hargaSol: 70.49,
  token: [
    { mint: "DOGE", simbol: "DOGE", jumlah: 9.42, hargaUsd: 0.17915, likuiditasUsd: 2_400_000 },
    { mint: "USDC", simbol: "USDC", jumlah: 0.641, hargaUsd: 1, likuiditasUsd: 900_000_000 },
    { mint: "B3Dxm6…", jumlah: 1_000_000 },
    { mint: "BvZxkX…", jumlah: 420 },
  ],
};

/** Jumlah token di satu posisi DLMM, dari API posisi Meteora (`unrealizedPnl.balanceTokenX/Y`, `unclaimedFeeTokenX/Y`). */
export interface PosisiDlmm {
  tokenX: string;
  tokenY: string;
  jumlahX: number;
  jumlahY: number;
  feeX: number;
  feeY: number;
}

/**
 * BR-17 v1.4: nilai posisi dan fee = jumlah token x harga Jupiter di menit yang sama, bukan angka USD Meteora.
 * Saldo SOL = nilai / harga SOL dari sumber harga yang sama, jadi USD dan SOL selalu konsisten.
 */
export function nilaiPosisi(posisi: PosisiDlmm[], hargaUsd: Record<string, number>) {
  let dlmmUsd = 0;
  let feeUsd = 0;
  for (const p of posisi) {
    dlmmUsd += p.jumlahX * hargaUsd[p.tokenX] + p.jumlahY * hargaUsd[p.tokenY];
    feeUsd += p.feeX * hargaUsd[p.tokenX] + p.feeY * hargaUsd[p.tokenY];
  }
  return { dlmmUsd, feeUsd, saldoSol: (dlmmUsd + feeUsd) / hargaUsd.SOL };
}

/** Fixture API posisi 15 Nov 2026 (PRD Rencana Uji, "Valuasi jumlah token"). */
export const POSISI_15NOV: PosisiDlmm[] = [
  { tokenX: "DOGE", tokenY: "SOL", jumlahX: 15869.72, jumlahY: 3.2745, feeX: 0.20699, feeY: 0.002972 },
];
/** Harga Jupiter fixture: DOGE $938,13 / 15.869,72 dan SOL $235,54 / 3,2745. */
export const HARGA_15NOV: Record<string, number> = { DOGE: 938.13 / 15869.72, SOL: 235.54 / 3.2745 };

// ---------- BR-19: deteksi arus ----------

export const PROGRAM_DLMM = "LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo";

export interface TransferMentah {
  token: string;
  jumlah: number;
  /** Harga token saat transfer; USDC = 1. */
  hargaUsd: number;
  dari: string;
  ke: string;
}

export interface TxMentah {
  signature: string;
  waktu: string;
  program: string[];
  swap?: boolean;
  transfer: TransferMentah[];
}

/** Ubah transaksi wallet menjadi arus onchain. Swap dan aktivitas DLMM bukan arus; transfer di bawah ambang = dust. */
export function deteksiArus(tx: TxMentah[], alamatPool: string, set: Pick<Pengaturan, "ambangDustUsd">): ArusOnchain[] {
  const hasil: ArusOnchain[] = [];
  for (const t of tx) {
    if (t.swap || t.program.includes(PROGRAM_DLMM)) continue;
    t.transfer.forEach((x, urutan) => {
      const masuk = x.ke === alamatPool;
      if (!masuk && x.dari !== alamatPool) return;
      const nilaiUsd = Math.round(x.jumlah * x.hargaUsd * 100) / 100;
      const dust = x.jumlah * x.hargaUsd < set.ambangDustUsd;
      hasil.push({
        id: `${t.signature.slice(0, 8)}-${urutan}`,
        signature: t.signature,
        urutan,
        waktu: t.waktu,
        arah: masuk ? "masuk" : "keluar",
        token: x.token,
        jumlah: x.jumlah,
        nilaiUsd,
        alamatLawan: masuk ? x.dari : x.ke,
        status: dust ? "bukan_arus" : "belum",
        catatan: dust ? "dust otomatis" : undefined,
        ditandaiOleh: dust ? "sistem" : undefined,
        ditandaiPada: dust ? t.waktu : undefined,
      });
    });
  }
  return hasil;
}

export const ALAMAT_POOL = "By6HpsukcTeVsV6FyBzhQJ2nzdHP46kXaSPtrCGUzoaR";
const P = ALAMAT_POOL;

// ---------- harga pasar (CoinGecko, per jam) ----------

export type Token = "sol" | "doge" | "pepe";
/** Harga USD per jam 15 Okt - 16 Nov 2026 dari CoinGecko `market_chart/range` (scripts/fetch-harga-pasar.mjs). */
const PASAR = HARGA as Record<Token, [number, number][]>;

/** Harga USD token pada waktu t: garis lurus di antara dua titik per jam CoinGecko. */
export function hargaToken(token: Token, t: number): number {
  const d = PASAR[token];
  if (t <= d[0][0]) return d[0][1];
  if (t >= d[d.length - 1][0]) return d[d.length - 1][1];
  let lo = 0;
  let hi = d.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (d[mid][0] <= t) lo = mid;
    else hi = mid;
  }
  const [t1, p1] = d[lo];
  const [t2, p2] = d[hi];
  return p1 + ((p2 - p1) * (t - t1)) / (t2 - t1);
}

/** Harga SOL pasar pada waktu t. */
export const hargaPasar = (t: number) => hargaToken("sol", t);

/** Harga token pasangan dalam SOL (R di BR-24). */
export const rasio = (token: Exclude<Token, "sol">, t: number) => hargaToken(token, t) / hargaToken("sol", t);

/**
 * Token pasangan posisi DLMM per periode (OQ-15), dari riwayat posisi di API Meteora
 * (`positions/{pool}/pnl?status=closed|open`, 267 posisi): PEPE/SOL 16 Okt 20.20 - 22 Okt 10.47 WIB, lalu DOGE/SOL
 * mulai 22 Okt 10.51 WIB (pindah pool sekali pada 30 Okt 20.30, tetap DOGE/SOL). Sebelum 16 Okt 20.20 belum ada posisi.
 */
export const PASANGAN: { dari: number; sampai: number; token: Exclude<Token, "sol"> }[] = [
  { dari: ms("2026-10-16T20:20:00+07:00"), sampai: ms("2026-10-22T10:47:00+07:00"), token: "pepe" },
  { dari: ms("2026-10-22T10:51:00+07:00"), sampai: Infinity, token: "doge" },
];
export const pasanganDi = (t: number) => PASANGAN.find((x) => t >= x.dari && t <= x.sampai)?.token ?? null;

/** Porsi token pasangan untuk estimasi riwayat (BR-24, usulan OQ-12). */
export const PORSI_ESTIMASI = 0.5;

// ---------- deret harga dan kepemilikan (dasar titik nilai buatan) ----------

const T0 = ms("2026-11-14T08:00:00+07:00");
/** Pembacaan otomatis (titik nilai asli) mulai berjalan. Sebelumnya grafik memakai titik estimasi (BR-24). */
export const MULAI_BACA = T0;
const T_SWAP = ms("2026-11-15T08:38:00+07:00");
const T_1303 = ms("2026-11-15T13:03:00+07:00");
/** Waktu pembacaan yang diuji PRD (fixture BR-17). */
export const WAKTU_1303 = T_1303;
const AKHIR = ms("2026-11-16T23:59:00+07:00");

const riak = (m: number) => 0.0022 * Math.sin(m / 53) + 0.0012 * Math.sin(m / 17 + 1) + 0.0006 * Math.sin(m / 5.3 + 2);
const noise = (m: number) => riak(m) - riak(0);
const HARGA_1303 = 70.49; // fixture BR-17 (Jupiter)
const SOL_1303 = (1171.81 - 0.001) / HARGA_1303; // 0,001 = dust USDC yang masuk 11.47
const KELUAR_SOL = 10.7416 + 0.1;
const M_1303 = (T_1303 - T0) / MENIT;
/** Porsi DOGE di posisi DLMM data contoh: 15.869,72 DOGE ($938,13) + 3,2745 SOL ($235,54), sekitar 80% DOGE. */
const PORSI_DOGE = 0.8;
const KOREKSI_1303 = HARGA_1303 / (hargaPasar(T_1303) * (1 + noise(M_1303)));

/**
 * Harga SOL per menit untuk titik nilai buatan: harga pasar per jam CoinGecko ditambah riak kecil, lalu
 * dikoreksi perlahan supaya tepat $70,49 pada 13.03 WIB (harga Jupiter di fixture BR-17).
 */
export function harga(t: number): number {
  const m = (t - T0) / MENIT;
  const k = 1 + (KOREKSI_1303 - 1) * Math.min(1, Math.max(0, m / M_1303));
  return hargaPasar(t) * (1 + noise(m)) * k;
}

/** Harga DOGE dalam SOL per menit: harga pasar per jam ditambah riak kecil. */
function rasioMenit(t: number): number {
  const m = (t - T0) / MENIT;
  return rasio("doge", t) * (1 + 0.0004 * Math.sin(m / 7.3 + 0.5) + 0.0003 * Math.sin(m / 23 + 2) - 0.0004 * Math.sin(0.5) - 0.0003 * Math.sin(2));
}

/**
 * Nilai posisi dalam SOL (data contoh): posisi DLMM DOGE/SOL dengan porsi DOGE 80%, jadi nilainya dalam SOL ikut
 * gerak harga DOGE/SOL, bukan SOL murni (Rencana Uji, syarat data contoh). Faktor koreksi bergerak perlahan supaya
 * nilai tepat $2.076,53 pada snapshot 14 Nov 08.00 dan $1.171,81 pada 13.03 WIB 15 Nov (fixture BR-17).
 */
const S0 = 2076.53 / hargaPasar(T0);
const POSISI_1303 = S0 * (1 + PORSI_DOGE * (rasioMenit(T_1303) / rasioMenit(T0) - 1));
const K_1303 = (SOL_1303 + KELUAR_SOL) / POSISI_1303;
function posisiSol(t: number): number {
  const m = (t - T0) / MENIT;
  const k = 1 + (K_1303 - 1) * Math.min(1, Math.max(0, m / M_1303));
  return S0 * (1 + PORSI_DOGE * (rasioMenit(t) / rasioMenit(T0) - 1)) * k;
}

/** Transaksi wallet contoh: angka 15 Nov dari PRD, setoran Hafiz 13.06 hanya contoh. */
export const TX_CONTOH: TxMentah[] = [
  {
    signature: "4sWpSwap15Nov0838",
    waktu: "2026-11-15T08:38:00+07:00",
    program: ["JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4"],
    swap: true,
    transfer: [
      { token: "SOL", jumlah: 10.7416, hargaUsd: 68.1, dari: P, ke: "JupiterVault" },
      { token: "USDC", jumlah: 731.51, hargaUsd: 1, dari: "JupiterVault", ke: P },
    ],
  },
  {
    signature: "2kRbDlmmRebalance15Nov",
    waktu: "2026-11-15T09:12:00+07:00",
    program: [PROGRAM_DLMM],
    transfer: [{ token: "SOL", jumlah: 3.2, hargaUsd: 68.9, dari: P, ke: "DlmmReserve" }],
  },
  {
    signature: "5HqTarikRezki1Usdc1004",
    waktu: "2026-11-15T10:04:00+07:00",
    program: ["TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"],
    transfer: [{ token: "USDC", jumlah: 1, hargaUsd: 1, dari: P, ke: "Chtm91xf…" }],
  },
  {
    signature: "3NvTarikRezki730Usdc1005",
    waktu: "2026-11-15T10:05:00+07:00",
    program: ["TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"],
    transfer: [{ token: "USDC", jumlah: 730.51, hargaUsd: 1, dari: P, ke: "Chtm91xf…" }],
  },
  {
    signature: "61xKirimSol01DqZ3_1022",
    waktu: "2026-11-15T10:22:00+07:00",
    program: ["11111111111111111111111111111111"],
    transfer: [{ token: "SOL", jumlah: 0.1, hargaUsd: 69.6, dari: P, ke: "DqZ3Dn1V…" }],
  },
  {
    signature: "2aDustMasuk0001Usdc1147",
    waktu: "2026-11-15T11:47:00+07:00",
    program: ["TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"],
    transfer: [{ token: "USDC", jumlah: 0.001, hargaUsd: 1, dari: "BkdHEdNX…", ke: P }],
  },
  {
    signature: "4cContohSetorHafiz1306",
    waktu: "2026-11-15T13:06:00+07:00",
    program: ["TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"],
    transfer: [{ token: "USDC", jumlah: 150, hargaUsd: 1, dari: "Hfz7cOnToH…", ke: P }],
  },
];

// ---------- titik nilai (BR-17, tabel `titik_nilai`) ----------

export interface TitikNilai {
  id?: number;
  ms: number;
  nilaiUsd: number;
  saldoSol: number;
  harga: number;
  /** Titik estimasi riwayat (BR-24): hanya untuk grafik, tidak pernah untuk NAV, snapshot, atau tarik. */
  estimasi?: boolean;
}

/**
 * Titik estimasi per jam untuk riwayat sebelum pembacaan otomatis (BR-24 v1.4). Di antara snapshot A dan B:
 * nilai SOL = S_A x [1 + w x (R(t)/R(t_A) - 1)] x k(t), dengan R = harga token pasangan dalam SOL dan w = 0,5.
 * k(t) bergerak linear dari 1 di A sampai nilai yang membuat garis tepat melewati snapshot B (sebelum arus).
 * Bila token pasangan berganti di tengah, R dihitung ulang dari awal pasangan baru; bila tidak ada posisi, faktor
 * pasar = 1 (garis lurus). Setoran dan penarikan tidak diestimasi: lompatannya tepat di jam snapshot.
 * Tidak dibuat untuk waktu yang sudah punya titik asli (mulai `sampai`).
 */
export function titikEstimasi(
  snapshots: Snapshot[],
  permintaan: Permintaan[],
  sampai: number,
  jam = "08:00",
  w = PORSI_ESTIMASI,
): TitikNilai[] {
  const snaps = [...snapshots].sort((a, b) => (a.tanggal < b.tanggal ? -1 : 1)).filter((s) => msSnapshot(s.tanggal, jam) <= sampai);
  const arusHari = (tgl: string) =>
    permintaan
      .filter((p) => p.status === "selesai" && p.tanggalEfektif === tgl)
      .reduce((t, p) => t + (p.jenis === "setor" ? 1 : -1) * (p.jumlahFinalUsd ?? p.jumlahUsd), 0);
  const JAM = 60 * MENIT;

  /** Faktor pasar M(t) di dalam satu segmen [ta, tb]: dimulai 1, ikut R pasangan yang aktif. */
  const faktorPasar = (ta: number, tb: number) => {
    const m = new Map<number, number>();
    let kunci: Exclude<Token, "sol"> | null = null;
    let tAnchor = ta;
    let mAnchor = 1;
    let mSebelum = 1;
    for (let t = ta; t <= tb; t += JAM) {
      const pas = pasanganDi(t);
      if (pas !== kunci) {
        kunci = pas;
        tAnchor = t;
        mAnchor = mSebelum;
      }
      const v = pas ? mAnchor * (1 + w * (rasio(pas, t) / rasio(pas, tAnchor) - 1)) : mAnchor;
      m.set(t, v);
      mSebelum = v;
    }
    return m;
  };

  const out: TitikNilai[] = [];
  for (let i = 0; i < snaps.length; i++) {
    const a = snaps[i];
    const ta = msSnapshot(a.tanggal, jam);
    const b = snaps[i + 1];
    const tbPenuh = b ? msSnapshot(b.tanggal, jam) : ta + JAM;
    const tb = Math.min(tbPenuh, sampai);
    const solA = a.saldoSol;
    const M = faktorPasar(ta, tbPenuh);
    // SOL sebelum arus di snapshot berikutnya; k membuat garis tepat melewati titik itu
    const solB = b ? b.saldoSol - arusHari(b.tanggal) / (b.nilaiUsd / b.saldoSol) : solA * (M.get(tbPenuh) ?? 1);
    const kB = solB / (solA * (M.get(tbPenuh) ?? 1));
    for (let t = ta; t < tb; t += JAM) {
      const k = 1 + ((kB - 1) * (t - ta)) / (tbPenuh - ta || 1);
      const sol = solA * (M.get(t) ?? 1) * k;
      const h = t === ta ? a.nilaiUsd / a.saldoSol : hargaPasar(t);
      const nilaiUsd = Math.round(sol * h * 100) / 100;
      out.push({ ms: t, nilaiUsd, saldoSol: nilaiUsd / h, harga: h, estimasi: true });
    }
  }
  return out;
}

/** Kepemilikan wallet pada waktu t: posisi DOGE/SOL (setara SOL) dan USDC, mengikuti TX_CONTOH. */
function kepemilikan(t: number): { sol: number; usdc: number } {
  let sol = posisiSol(t);
  let usdc = 0;
  if (t >= T_SWAP) {
    sol -= 10.7416;
    usdc += 731.51;
  }
  for (const x of TX_CONTOH) {
    if (x.swap || x.program.includes(PROGRAM_DLMM) || ms(x.waktu) > t) continue;
    for (const tr of x.transfer) {
      const arah = tr.ke === P ? 1 : -1;
      if (tr.token === "SOL") sol += arah * tr.jumlah;
      else usdc += arah * tr.jumlah;
    }
  }
  return { sol, usdc };
}

let cacheTitik: TitikNilai[] | null = null;

/** Satu titik per menit dari 14 Nov 08.00 sampai 16 Nov 23.59 WIB. Sekitar 0,5% menit gagal dibaca (dilewati). */
export function semuaTitik(): TitikNilai[] {
  if (cacheTitik) return cacheTitik;
  const out: TitikNilai[] = [];
  const wajib = new Set([T0, T_1303, ms("2026-11-15T08:00:00+07:00"), ms("2026-11-16T08:00:00+07:00")]);
  let idSeq = 10_000;
  for (let t = T0; t <= AKHIR; t += MENIT) {
    const m = (t - T0) / MENIT;
    if (!wajib.has(t) && (m * 7919) % 211 === 0) continue; // menit gagal: tidak ada titik, tidak diisi angka karangan
    const h = harga(t);
    const { sol, usdc } = kepemilikan(t);
    const nilaiUsd = Math.round((sol * h + usdc) * 100) / 100;
    out.push({ id: idSeq++, ms: t, nilaiUsd, saldoSol: nilaiUsd / h, harga: h });
  }
  cacheTitik = out;
  return out;
}

/** Titik terakhir yang tersedia pada atau sebelum t. */
export function titikTerakhir(titik: TitikNilai[], t: number): TitikNilai | null {
  let lo = 0;
  let hi = titik.length - 1;
  let hasil: TitikNilai | null = null;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (titik[mid].ms <= t) {
      hasil = titik[mid];
      lo = mid + 1;
    } else hi = mid - 1;
  }
  return hasil;
}

/** Titik pertama yang berhasil pada atau sesudah jam snapshot, sampai batas 30 menit (BR-18). */
export function titikSnapshot(titik: TitikNilai[], tanggal: string, jam = "08:00"): TitikNilai | null {
  const mulai = msSnapshot(tanggal, jam);
  return titik.find((x) => x.ms >= mulai && x.ms <= mulai + 30 * MENIT) ?? null;
}

const ringkas = (s: string) => (s.length > 14 ? `${s.slice(0, 4)}…${s.slice(-4)}` : s);
export { ringkas as ringkasAlamat };
