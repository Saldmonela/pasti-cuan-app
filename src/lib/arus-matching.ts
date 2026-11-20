// Logika pencocokan arus onchain (US-13) dan helper parsing transfer Solana.
// Dipakai bersama oleh UI /kelola/arus, API /api/arus-onchain/tandai, dan unit test.
import { tanggal } from "./format";
import { ms, msSnapshot } from "./onchain";
import type { Anggota, ArusOnchain, Jenis, Permintaan } from "./types";

export interface SaranArus {
  p: Permintaan;
  alasan: string;
}

export function jenisDariArah(arah: ArusOnchain["arah"]): Jenis {
  return arah === "masuk" ? "setor" : "tarik";
}

/**
 * Cari permintaan menunggu yang cocok dengan arus onchain:
 * 1. Alamat tujuan pada permintaan tarik sama dengan alamat lawan transfer
 * 2. Alamat wallet terdaftar milik anggota sama dengan alamat lawan transfer
 * 3. Selisih nominal satu transfer <= toleransi %
 * 4. Total gabungan transfer belum-dicocokkan searah & lawan sama <= toleransi % (mis. tes US$1 + sisa)
 */
export function cariSaranArus(
  a: ArusOnchain,
  menunggu: Permintaan[],
  anggota: Anggota[],
  toleransiPersen: number,
  semuaArusBelum: ArusOnchain[] = [a],
): SaranArus[] {
  const jenis = jenisDariArah(a.arah);
  const lawan = a.alamatLawan.trim();
  const grupTotal = semuaArusBelum
    .filter((x) => x.status === "belum" && x.arah === a.arah && x.alamatLawan.trim() === lawan)
    .reduce((sum, x) => sum + x.nilaiUsd, 0);

  return menunggu
    .filter((p) => p.status === "menunggu" && p.jenis === jenis)
    .flatMap((p) => {
      const alamatTujuanSama = Boolean(lawan && p.alamatWalletTujuan?.trim() === lawan);
      const alamatAnggotaSama = Boolean(
        lawan && anggota.find((x) => x.id === p.anggotaId)?.alamatWallet?.some((w) => w.trim() === lawan),
      );
      const miripTunggal = p.jumlahUsd > 0 && (Math.abs(a.nilaiUsd - p.jumlahUsd) / p.jumlahUsd) * 100 <= toleransiPersen;
      const miripGabungan =
        !miripTunggal &&
        grupTotal > a.nilaiUsd + 1e-6 &&
        p.jumlahUsd > 0 &&
        (Math.abs(grupTotal - p.jumlahUsd) / p.jumlahUsd) * 100 <= toleransiPersen;

      if (!alamatTujuanSama && !alamatAnggotaSama && !miripTunggal && !miripGabungan) return [];

      const alasan = alamatTujuanSama
        ? "alamat tujuan sama"
        : alamatAnggotaSama
          ? "alamat wallet sama"
          : miripTunggal
            ? `selisih jumlah di bawah ${toleransiPersen}%`
            : "total gabungan transfer cocok";

      return [{ p, alasan }];
    });
}

/**
 * Pilih permintaan awal saat sheet "Cocokkan" dibuka:
 * - Prioritas pertama: hasil saran terbaik
 * - Jika tidak ada saran namun hanya ada tepat 1 permintaan menunggu searah: pilih otomatis
 *   agar tombol "Cocokkan" tidak terkunci tanpa alasan.
 */
export function pilihPermintaanAwal(
  a: ArusOnchain,
  menunggu: Permintaan[],
  anggota: Anggota[],
  toleransiPersen: number,
  semuaArusBelum: ArusOnchain[] = [a],
): string {
  const saran = cariSaranArus(a, menunggu, anggota, toleransiPersen, semuaArusBelum);
  if (saran.length > 0) return saran[0].p.id;
  const jenis = jenisDariArah(a.arah);
  const calon = menunggu.filter((p) => p.status === "menunggu" && p.jenis === jenis);
  return calon.length === 1 ? calon[0].id : "";
}

/** Pilih anggota awal untuk mode "Buat permintaan untuk anggota". */
export function pilihAnggotaAwal(a: ArusOnchain, menunggu: Permintaan[], anggota: Anggota[]): string {
  const lawan = a.alamatLawan.trim();
  if (!lawan) return "";
  const dariProfil = anggota.find((x) => x.aktif && x.alamatWallet?.some((w) => w.trim() === lawan))?.id;
  if (dariProfil) return dariProfil;
  const dariPermintaan = menunggu.find((p) => p.alamatWalletTujuan?.trim() === lawan)?.anggotaId;
  return dariPermintaan ?? "";
}

/**
 * Awal menit (floor ke :00 detik) dari waktu transfer.
 * Karena pembacaan `baca-wallet` membulatkan `dibaca_pada` ke awal menit, titik nilai pada menit yang sama
 * bisa diambil sesudah transaksi di dalam menit tersebut dieksekusi. Memilih `dibaca_pada < awalMenit`
 * menjamin titik nilai acuan benar-benar dibaca sebelum dana berpindah.
 */
export function batasMenitSebelumTransfer(waktuTransferIso: string): string {
  const t = Date.parse(waktuTransferIso);
  if (Number.isNaN(t)) return waktuTransferIso;
  return new Date(Math.floor(t / 60_000) * 60_000).toISOString();
}

/**
 * Validasi tanggal efektif snapshot manual agar tidak memakai snapshot yang diambil
 * sebelum penarikan diajukan (atau sebelum tanggal transfer setoran), karena akan
 * membuat NAV snapshot salah hitung dan menyisakan arus onchain yang tidak cocok.
 */
export function validasiTanggalEfektifManual(
  p: Pick<Permintaan, "jenis" | "dibuatPada" | "tanggalTransfer">,
  tglEfektif: string,
  jamSnapshot = "08:00",
): string | null {
  if (!tglEfektif) return null;
  const snapMs = msSnapshot(tglEfektif, jamSnapshot);
  const jamLabel = jamSnapshot.replace(":", ".");
  if (p.jenis === "tarik" && p.dibuatPada) {
    const dibuatMs = ms(p.dibuatPada);
    if (!Number.isNaN(dibuatMs) && snapMs < dibuatMs) {
      return `Snapshot ${tanggal(tglEfektif)} (${jamLabel} WIB) diambil sebelum penarikan diajukan. Tunggu ±5 menit setelah transfer lalu cocokkan di Arus onchain (otomatis selesai pada waktu transfer).`;
    }
  }
  if (p.jenis === "setor" && p.tanggalTransfer && tglEfektif < p.tanggalTransfer) {
    return `Tanggal efektif tidak boleh sebelum tanggal transfer (${tanggal(p.tanggalTransfer)}).`;
  }
  return null;
}

// ---------- Helper parsing transaksi Solana (mirror logika Edge Function baca-wallet) ----------

export const SOL_MINT_ADDR = "So11111111111111111111111111111111111111112";
export const USDC_MINT_ADDR = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
export const USDT_MINT_ADDR = "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB";

export interface ParsedTokenBalance {
  accountIndex: number;
  mint: string;
  owner?: string;
  uiTokenAmount?: { uiAmount?: number | null; uiAmountString?: string };
}

export interface ParsedSolanaTx {
  blockTime?: number | null;
  meta?: {
    err?: unknown;
    fee?: number;
    preBalances?: number[];
    postBalances?: number[];
    preTokenBalances?: ParsedTokenBalance[];
    postTokenBalances?: ParsedTokenBalance[];
    innerInstructions?: Array<{
      instructions?: Array<{ programId?: string }>;
    }>;
  };
  transaction?: {
    message?: {
      accountKeys?: Array<{ pubkey?: string } | string>;
      instructions?: Array<{
        programId?: string;
        parsed?: {
          type?: string;
          info?: Record<string, unknown>;
        };
      }>;
    };
  };
}

function num(v: unknown): number {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Ambil alamat wallet lawan transaksi:
 * - Untuk SPL token (USDC/USDT/dll): baca `owner` dari preTokenBalances/postTokenBalances
 *   supaya dapat alamat wallet utama penerima/pengirim, bukan Associated Token Account (ATA).
 * - Untuk SOL native: baca `destination`/`source` dari system transfer, lalu fallback delta saldo.
 */
export function ekstrakAlamatLawan(
  tx: ParsedSolanaTx,
  wallet: string,
  arah: "masuk" | "keluar",
  mint: string,
): string {
  if (mint !== SOL_MINT_ADDR) {
    const pre = new Map<string, number>();
    const post = new Map<string, number>();
    for (const b of tx.meta?.preTokenBalances ?? []) {
      if (b.mint === mint && b.owner && b.owner !== wallet) {
        pre.set(b.owner, (pre.get(b.owner) ?? 0) + num(b.uiTokenAmount?.uiAmountString ?? b.uiTokenAmount?.uiAmount));
      }
    }
    for (const b of tx.meta?.postTokenBalances ?? []) {
      if (b.mint === mint && b.owner && b.owner !== wallet) {
        post.set(b.owner, (post.get(b.owner) ?? 0) + num(b.uiTokenAmount?.uiAmountString ?? b.uiTokenAmount?.uiAmount));
      }
    }
    const owners = new Set([...pre.keys(), ...post.keys()]);
    let terbaik = "";
    let maksDelta = 0;
    for (const owner of owners) {
      const delta = (post.get(owner) ?? 0) - (pre.get(owner) ?? 0);
      const cocok = arah === "keluar" ? delta > 1e-9 : delta < -1e-9;
      if (cocok && Math.abs(delta) > maksDelta) {
        maksDelta = Math.abs(delta);
        terbaik = owner;
      }
    }
    if (terbaik) return terbaik;
  }

  const ixs = tx.transaction?.message?.instructions ?? [];
  for (const ix of ixs) {
    const info = ix.parsed?.info;
    if (!info) continue;
    const src = String(info.source ?? info.authority ?? "");
    const dst = String(info.destination ?? "");
    if (arah === "keluar" && dst && dst !== wallet) return dst;
    if (arah === "masuk" && src && src !== wallet) return src;
  }

  const keys = (tx.transaction?.message?.accountKeys ?? []).map((k) => (typeof k === "string" ? k : (k.pubkey ?? "")));
  const other = keys.find((k) => k && k !== wallet && k !== "11111111111111111111111111111111");
  return other ?? "tidak_diketahui";
}

export interface ArusTerdeteksi {
  arah: "masuk" | "keluar";
  mint: string;
  jumlah: number;
  nilaiUsd: number;
  alamatLawan: string;
  isDust: boolean;
}

/**
 * Ekstrak arus masuk/keluar non-swap dari transaksi Solana ter-parse.
 * Transaksi hanya dianggap swap jika ada aset masuk DAN aset keluar yang keduanya >= ambangDust,
 * sehingga penarikan penuh token SPL yang ikut menutup ATA (reclaim rent ~0,002 SOL) tidak diabaikan.
 */
export function deteksiDeltaTx(
  tx: ParsedSolanaTx,
  wallet: string,
  hargaSolUsd: number,
  prices: Record<string, { usdPrice?: number }>,
  ambangDustUsd: number,
): ArusTerdeteksi[] {
  if (!tx.meta) return [];

  const preTok = new Map<string, number>();
  const postTok = new Map<string, number>();
  for (const b of tx.meta.preTokenBalances ?? []) {
    if (b.owner === wallet) {
      preTok.set(b.mint, (preTok.get(b.mint) ?? 0) + num(b.uiTokenAmount?.uiAmountString ?? b.uiTokenAmount?.uiAmount));
    }
  }
  for (const b of tx.meta.postTokenBalances ?? []) {
    if (b.owner === wallet) {
      postTok.set(b.mint, (postTok.get(b.mint) ?? 0) + num(b.uiTokenAmount?.uiAmountString ?? b.uiTokenAmount?.uiAmount));
    }
  }

  const deltas: Array<{ mint: string; delta: number }> = [];
  for (const m of new Set([...preTok.keys(), ...postTok.keys()])) {
    const d = (postTok.get(m) ?? 0) - (preTok.get(m) ?? 0);
    if (Math.abs(d) > 1e-9) deltas.push({ mint: m, delta: d });
  }

  const keys = (tx.transaction?.message?.accountKeys ?? []).map((k) => (typeof k === "string" ? k : (k.pubkey ?? "")));
  const walletIdx = keys.indexOf(wallet);
  if (walletIdx >= 0 && tx.meta.preBalances && tx.meta.postBalances) {
    const preLam = tx.meta.preBalances[walletIdx] ?? 0;
    const postLam = tx.meta.postBalances[walletIdx] ?? 0;
    const feeLam = walletIdx === 0 ? (tx.meta.fee ?? 0) : 0;
    const netSol = (postLam - preLam + feeLam) / 1e9;
    if (Math.abs(netSol) > 1e-6) {
      deltas.push({ mint: SOL_MINT_ADDR, delta: netSol });
    }
  }

  const dinilai = deltas.map((d) => {
    const arah: "masuk" | "keluar" = d.delta > 0 ? "masuk" : "keluar";
    const jumlah = Math.abs(d.delta);
    const px =
      d.mint === USDC_MINT_ADDR || d.mint === USDT_MINT_ADDR
        ? 1
        : d.mint === SOL_MINT_ADDR
          ? hargaSolUsd
          : num(prices[d.mint]?.usdPrice);
    const nilaiUsd = Number((jumlah * px).toFixed(2));
    return {
      arah,
      mint: d.mint,
      jumlah: Number(jumlah.toFixed(9)),
      nilaiUsd,
      alamatLawan: ekstrakAlamatLawan(tx, wallet, arah, d.mint),
      isDust: nilaiUsd < ambangDustUsd,
    };
  });

  const hasNonDustIn = dinilai.some((d) => d.arah === "masuk" && !d.isDust);
  const hasNonDustOut = dinilai.some((d) => d.arah === "keluar" && !d.isDust);
  if (hasNonDustIn && hasNonDustOut) return [];

  return dinilai;
}
