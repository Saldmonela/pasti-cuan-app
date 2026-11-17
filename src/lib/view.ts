// Penyusun data tampilan dari hasil mesin hitung.
import type { Seri, TitikSeri } from "./engine";
import { tanggal, usd, waktu } from "./format";
import { RENTANG, type Permintaan, type Rentang } from "./types";

export const pendek = (r: Rentang) => r === "24J" || r === "7H";

/** Opsi rentang grafik: "Setoran Terakhir" hanya tampil bila sudah setor lebih dari 1 kali (kalau 1x sama dengan Semua). */
export function opsiRentang(permintaan: Permintaan[], anggotaId: string | null): Rentang[] {
  const jumlahSetor = permintaan.filter(
    (p) => p.status === "selesai" && p.jenis === "setor" && (!anggotaId || p.anggotaId === anggotaId),
  ).length;
  return jumlahSetor > 1 ? RENTANG : RENTANG.filter((r) => r !== "Setoran Terakhir");
}

/** Indeks titik pertama yang digambar: rentang pendek ikut menampilkan titik pembanding di awal. */
export function awalTampil(s: Seri, r: Rentang): number {
  return pendek(r) ? Math.max(0, s.awal - 1) : s.awal;
}

/** Titik harian memakai tanggal; titik nilai memakai jam (BR-23 c). */
export const labelWaktu = (p: TitikSeri) => (p.harian ? tanggal(p.waktu) : waktu(p.waktu));

/**
 * Chip transaksi di titik yang disentuh (BR-23 e). Pool menyebut nama: "Tarik: Belum dicocokkan US$731,51".
 * Grafik saya cukup jumlahnya: "Setoran US$525,00".
 */
export function chipTransaksi(p: TitikSeri, jenis: Seri["jenis"]): string[] {
  const label = (j: "setor" | "tarik") => (j === "setor" ? "Setoran" : "Tarik");
  const est = p.estimasi ? ["Estimasi dari harga pasar per jam"] : [];
  if (jenis === "saya") return [...est, ...p.transaksi.map((x) => `${label(x.jenis)} ${usd(x.jumlahUsd)}`)];
  return [
    ...est,
    ...(["setor", "tarik"] as const).flatMap((j) => {
      const t = p.transaksi.filter((x) => x.jenis === j);
      return t.length ? [`${label(j)}: ${t.map((x) => `${x.nama} ${usd(x.jumlahUsd)}`).join(", ")}`] : [];
    }),
  ];
}

/** Keterangan kecil di bawah grafik yang memuat titik estimasi (BR-24), contoh "Sebelum 14 Nov 2026: estimasi per jam". */
export function keteranganEstimasi(s: Seri, r: Rentang): string | null {
  if (!s.estimasiSampai || !s.titik.slice(awalTampil(s, r)).some((p) => p.estimasi)) return null;
  return `Sebelum ${tanggal(new Date(s.estimasiSampai + 7 * 3600_000).toISOString())}: estimasi per jam`;
}

/** Pesan grafik kosong: harian butuh 2 snapshot, 24J butuh 2 titik nilai (sekitar 10 menit). */
export function grafikKosong(s: Seri, r: Rentang, jumlahHarian: number): string | null {
  if (r === "24J") return s.titik.length - awalTampil(s, r) < 2 ? "Grafik 24 jam muncul setelah ada data 10 menit." : null;
  return jumlahHarian < 2 ? "Grafik muncul setelah ada data 2 hari." : null;
}

export const WARNA_PORSI = ["var(--share-1)", "var(--share-2)", "var(--share-3)", "var(--share-4)"];
