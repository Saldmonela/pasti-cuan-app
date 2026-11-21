// Parser template impor (US-06). Format: CSV dengan koma sebagai pemisah dan titik sebagai desimal.
import { hitungPool } from "./engine";
import { angka, tanggal, usd } from "./format";
import { hargaPasar, MULAI_BACA, msSnapshot, titikEstimasi } from "./onchain";
import { SALDO_SOL_EXCEL, SNAPSHOT_AWAL } from "./seed";
import type { Anggota, Pengaturan, Permintaan, Snapshot } from "./types";

export interface Pratinjau {
  snapshots: Snapshot[];
  transaksi: Permintaan[];
  kesalahan: { file: string; baris: number; pesan: string }[];
  peringatan: string[];
  /** Jumlah titik estimasi per jam yang akan dibuat (BR-24); 0 bila harga pasar tidak tersedia. */
  estimasi: number;
}

const KOLOM_SNAP = ["tanggal", "nilai_usd", "saldo_sol"];
const KOLOM_TX = ["tanggal_efektif", "nama", "jenis", "jumlah_usd"];
const tglOk = (t: string) => /^\d{4}-\d{2}-\d{2}$/.test(t) && !Number.isNaN(Date.parse(t));

function baris(teks: string): string[][] {
  return teks
    .replace(/\r/g, "")
    .split("\n")
    .filter((l) => l.trim())
    .map((l) => l.split(",").map((c) => c.trim()));
}

export function pratinjau(
  snapCsv: string,
  txCsv: string,
  anggota: Anggota[],
  set: Pengaturan,
  oleh: string,
  opsi: { pasarGagal?: boolean } = {},
): Pratinjau {
  const kesalahan: Pratinjau["kesalahan"] = [];
  const peringatan: string[] = [];
  const snapshots: Snapshot[] = [];
  const transaksi: Permintaan[] = [];

  const s = baris(snapCsv);
  if (!s.length || KOLOM_SNAP.slice(0, 2).some((k, i) => s[0][i] !== k)) {
    kesalahan.push({ file: "snapshot.csv", baris: 1, pesan: `Kolom harus: ${KOLOM_SNAP.join(", ")} (saldo_sol opsional).` });
  } else {
    const seen = new Set<string>();
    s.slice(1).forEach((r, i) => {
      const no = i + 1;
      const [tgl, u, sol] = r;
      const nu = Number(u);
      const ns = sol ? Number(sol) : NaN;
      if (!tglOk(tgl)) return kesalahan.push({ file: "snapshot.csv", baris: no, pesan: `Baris ${no}: tanggal "${tgl}" tidak valid (pakai YYYY-MM-DD).` });
      if (seen.has(tgl)) return kesalahan.push({ file: "snapshot.csv", baris: no, pesan: `Baris ${no}: tanggal ${tanggal(tgl)} muncul dua kali.` });
      if (!(nu > 0)) return kesalahan.push({ file: "snapshot.csv", baris: no, pesan: `Baris ${no}: nilai USD harus lebih dari 0.` });
      if (sol && !(ns > 0)) return kesalahan.push({ file: "snapshot.csv", baris: no, pesan: `Baris ${no}: saldo SOL harus lebih dari 0 atau dikosongkan.` });
      seen.add(tgl);
      // Saldo SOL disimpan = nilai USD / harga SOL pasar jam 08.00 WIB (US-06). Laporan Harian hanya pembanding.
      const pasar = opsi.pasarGagal ? null : hargaPasar(msSnapshot(tgl, set.jamSnapshot));
      if (!pasar && !(ns > 0)) {
        return kesalahan.push({ file: "snapshot.csv", baris: no, pesan: `Baris ${no}: harga pasar tidak tersedia, jadi saldo SOL wajib diisi.` });
      }
      const disimpan = pasar ? Math.round((nu / pasar) * 1e9) / 1e9 : ns;
      snapshots.push({ tanggal: tgl, sumber: "impor", nilaiUsd: nu, saldoSol: disimpan, dibuatOleh: oleh, dibuatPada: `${tgl}T08:00:00+07:00` });
      if (pasar && ns > 0) {
        const turunan = nu / ns;
        const selisih = ((turunan - pasar) / pasar) * 100;
        if (Math.abs(selisih) > 3) {
          const pct = Math.abs(selisih).toLocaleString("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
          peringatan.push(
            `Baris ${no} (${tanggal(tgl)}): harga SOL turunan ${usd(turunan)}, harga pasar ${usd(pasar)} (selisih ${pct}%). Saldo SOL disimpan ${angka(disimpan, 4)} (dari harga pasar), bukan ${angka(ns, 4)}. Cek apakah tanggal setoran sama di kedua file.`,
          );
        }
      }
    });
    if (opsi.pasarGagal && snapshots.length) {
      peringatan.unshift("Harga SOL pasar (CoinGecko) tidak bisa diambil. Saldo SOL memakai Laporan Harian, dan titik estimasi per jam tidak dibuat. Kamu bisa membuatnya ulang nanti.");
    }
  }

  const t = baris(txCsv);
  const namaKe = new Map(anggota.map((a) => [a.nama, a.id]));
  const tglSnap = new Set(snapshots.map((x) => x.tanggal));
  if (!t.length || KOLOM_TX.some((k, i) => t[0][i] !== k)) {
    kesalahan.push({ file: "transaksi.csv", baris: 1, pesan: `Kolom harus: ${KOLOM_TX.join(", ")}.` });
  } else {
    t.slice(1).forEach((r, i) => {
      const no = i + 1;
      const [tgl, nm, jenis, j] = r;
      const nj = Number(j);
      if (!tglOk(tgl)) return kesalahan.push({ file: "transaksi.csv", baris: no, pesan: `Baris ${no}: tanggal "${tgl}" tidak valid.` });
      if (!namaKe.has(nm)) return kesalahan.push({ file: "transaksi.csv", baris: no, pesan: `Baris ${no}: nama '${nm}' tidak ada di daftar anggota.` });
      if (jenis !== "setor" && jenis !== "tarik") return kesalahan.push({ file: "transaksi.csv", baris: no, pesan: `Baris ${no}: jenis harus "setor" atau "tarik".` });
      if (!(nj > 0)) return kesalahan.push({ file: "transaksi.csv", baris: no, pesan: `Baris ${no}: jumlah harus lebih dari 0.` });
      if (!tglSnap.has(tgl)) return kesalahan.push({ file: "transaksi.csv", baris: no, pesan: `Baris ${no}: belum ada saldo untuk ${tanggal(tgl)} di snapshot.csv.` });
      transaksi.push({
        id: `imp${no}`,
        anggotaId: namaKe.get(nm)!,
        jenis,
        jumlahUsd: nj,
        tanggalTransfer: tgl,
        status: "selesai",
        tanggalEfektif: tgl,
        jumlahFinalUsd: nj,
        sumber: "impor",
        diprosesOleh: oleh,
        dibuatPada: `${tgl}T08:00:00+07:00`,
      });
    });
  }
  if (!kesalahan.length) {
    const h = hitungPool(anggota, snapshots, transaksi, set);
    const lebih = h.lebihBayar.map((x) => `Penarikan ${anggota.find((a) => a.id === x.anggotaId)?.nama} ${x.tanggal} melebihi nilai bersihnya.`);
    new Set([...h.cek.penyebab, ...lebih]).forEach((p) => kesalahan.push({ file: "transaksi.csv", baris: 0, pesan: p }));
  }
  const estimasi = !kesalahan.length && !opsi.pasarGagal ? titikEstimasi(snapshots, transaksi, MULAI_BACA, set.jamSnapshot).length : 0;
  return { snapshots, transaksi, kesalahan, peringatan, estimasi };
}

const NAMA_CONTOH: [string, string, string, number][] = [
  ["2026-10-16", "Faiz", "setor", 100],
  ["2026-10-16", "Luqman", "setor", 100],
  ["2026-10-16", "Rezki", "setor", 100],
  ["2026-10-16", "Salman", "setor", 100],
  ["2026-10-18", "Rezki", "setor", 200],
  ["2026-10-27", "Salman", "setor", 200],
  ["2026-10-27", "Hafiz", "setor", 100],
  ["2026-11-08", "Salman", "setor", 525],
  ["2026-11-08", "Rezki", "setor", 200],
  ["2026-11-13", "Rezki", "setor", 200],
];

/** Isi template contoh dari data acuan (Tracker_LP_v3 untuk USD, Laporan Harian untuk SOL sebagai pembanding). */
export function contohCsv(salah = false): { snapshot: string; transaksi: string } {
  const snapshot = [KOLOM_SNAP.join(","), ...SNAPSHOT_AWAL.map((x, i) => `${x.tanggal},${x.nilaiUsd},${SALDO_SOL_EXCEL[i]}`)].join("\n");
  const transaksi = [
    KOLOM_TX.join(","),
    ...NAMA_CONTOH.map(([t, n, j, a]) => `${t},${salah && n === "Hafiz" ? "Hafis" : n},${j},${a}`),
  ].join("\n");
  return { snapshot, transaksi };
}
