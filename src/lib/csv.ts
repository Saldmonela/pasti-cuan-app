// Parser template impor (US-06). Format: CSV dengan koma sebagai pemisah dan titik sebagai desimal.
import { hitungPool } from "./engine";
import { tanggal, usd } from "./format";
import { LAPORAN_USD, SNAPSHOT_AWAL } from "./seed";
import type { Anggota, Pengaturan, Permintaan, Snapshot } from "./types";

export interface Pratinjau {
  snapshots: Snapshot[];
  transaksi: Permintaan[];
  kesalahan: { file: string; baris: number; pesan: string }[];
  peringatan: string[];
}

const KOLOM_SNAP = ["tanggal", "nilai_usd", "saldo_sol", "harga_sol_referensi"];
const KOLOM_TX = ["tanggal_efektif", "nama", "jenis", "jumlah_usd"];
const tglOk = (t: string) => /^\d{4}-\d{2}-\d{2}$/.test(t) && !Number.isNaN(Date.parse(t));

function baris(teks: string): string[][] {
  return teks
    .replace(/\r/g, "")
    .split("\n")
    .filter((l) => l.trim())
    .map((l) => l.split(",").map((c) => c.trim()));
}

export function pratinjau(snapCsv: string, txCsv: string, anggota: Anggota[], set: Pengaturan, oleh: string): Pratinjau {
  const kesalahan: Pratinjau["kesalahan"] = [];
  const peringatan: string[] = [];
  const snapshots: Snapshot[] = [];
  const transaksi: Permintaan[] = [];

  const s = baris(snapCsv);
  if (!s.length || KOLOM_SNAP.slice(0, 3).some((k, i) => s[0][i] !== k)) {
    kesalahan.push({ file: "snapshot.csv", baris: 1, pesan: `Kolom harus: ${KOLOM_SNAP.join(", ")}.` });
  } else {
    const seen = new Set<string>();
    s.slice(1).forEach((r, i) => {
      const no = i + 1;
      const [tgl, u, sol, ref] = r;
      const nu = Number(u);
      const ns = Number(sol);
      if (!tglOk(tgl)) return kesalahan.push({ file: "snapshot.csv", baris: no, pesan: `Baris ${no}: tanggal "${tgl}" tidak valid (pakai YYYY-MM-DD).` });
      if (seen.has(tgl)) return kesalahan.push({ file: "snapshot.csv", baris: no, pesan: `Baris ${no}: tanggal ${tanggal(tgl)} muncul dua kali.` });
      if (!(nu > 0) || !(ns > 0)) return kesalahan.push({ file: "snapshot.csv", baris: no, pesan: `Baris ${no}: nilai USD dan saldo SOL harus lebih dari 0.` });
      seen.add(tgl);
      snapshots.push({ tanggal: tgl, nilaiUsd: nu, saldoSol: ns, dibuatOleh: oleh, dibuatPada: `${tgl}T08:00:00+07:00` });
      const nr = Number(ref);
      if (ref && nr > 0) {
        const turunan = nu / ns;
        const selisih = (Math.abs(turunan - nr) / nr) * 100;
        if (selisih > 3) {
          peringatan.push(
            `Baris ${no} (${tanggal(tgl)}): harga SOL turunan ${usd(turunan)}, harga catatan ${usd(nr)} (selisih ${selisih.toLocaleString("id-ID", { maximumFractionDigits: 1 })}%). Cek apakah tanggal setoran sama di kedua file.`,
          );
        }
      }
    });
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
    h.cek.penyebab.forEach((p) => kesalahan.push({ file: "transaksi.csv", baris: 0, pesan: p }));
  }
  return { snapshots, transaksi, kesalahan, peringatan };
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

/** Isi template contoh dari data acuan (Tracker_LP_v3 untuk USD, Laporan Harian untuk SOL dan harga referensi). */
export function contohCsv(salah = false): { snapshot: string; transaksi: string } {
  const snapshot = [
    KOLOM_SNAP.join(","),
    ...SNAPSHOT_AWAL.map((x, i) => `${x.tanggal},${x.nilaiUsd},${x.saldoSol},${(LAPORAN_USD[i] / x.saldoSol).toFixed(2)}`),
  ].join("\n");
  const transaksi = [
    KOLOM_TX.join(","),
    ...NAMA_CONTOH.map(([t, n, j, a]) => `${t},${salah && n === "Hafiz" ? "Hafis" : n},${j},${a}`),
  ].join("\n");
  return { snapshot, transaksi };
}
