// Penyusun data tampilan dari hasil mesin hitung.
import type { TitikGrafik } from "@/components/Chart";
import { tanggalAwalRentang, type TitikPool, type TitikSaya } from "./engine";
import { tanggal, uang, usd } from "./format";
import type { Rentang, Satuan } from "./types";

function potong<T extends { tanggal: string }>(t: T[], r: Rentang): T[] {
  if (!t.length) return t;
  const mulai = tanggalAwalRentang(t[t.length - 1].tanggal, r);
  return mulai ? t.filter((p) => p.tanggal >= mulai) : t;
}

const lain = (u: Satuan): Satuan => (u === "USD" ? "SOL" : "USD");
const jenisLabel = (j: "setor" | "tarik") => (j === "setor" ? "Setoran" : "Penarikan");

/** Grafik nilai saya (US-12). Tooltip: tanggal · nilai · nilai satuan lain · harga SOL · transaksi saya. */
export function grafikSaya(t: TitikSaya[], u: Satuan, r: Rentang): TitikGrafik[] {
  return potong(t, r).map((p) => {
    const v = u === "USD" ? p.netUsd : p.netSol;
    const o = u === "USD" ? p.netSol : p.netUsd;
    return {
      label: p.tanggal,
      nilai: v,
      ditandai: p.transaksi.length > 0,
      judul: `${tanggal(p.tanggal)} · ${uang(v, u)}`,
      baris: [
        uang(o, lain(u)),
        `Harga SOL ${usd(p.harga)}`,
        ...p.transaksi.map((x) => `${jenisLabel(x.jenis)} ${usd(x.jumlahUsd)}`),
      ],
    };
  });
}

/** Grafik saldo pool (US-08). Tooltip menyebut transaksi semua anggota hari itu. */
export function grafikPool(t: TitikPool[], u: Satuan, r: Rentang): TitikGrafik[] {
  return potong(t, r).map((p) => {
    const v = u === "USD" ? p.nilaiUsd : p.saldoSol;
    const o = u === "USD" ? p.saldoSol : p.nilaiUsd;
    const setor = p.transaksi.filter((x) => x.jenis === "setor");
    const tarik = p.transaksi.filter((x) => x.jenis === "tarik");
    return {
      label: p.tanggal,
      nilai: v,
      ditandai: p.transaksi.length > 0,
      judul: `${tanggal(p.tanggal)} · ${uang(v, u)}`,
      baris: [
        uang(o, lain(u)),
        `Harga SOL ${usd(p.harga)}`,
        ...(setor.length ? [`Setoran: ${setor.map((x) => `${x.nama} ${usd(x.jumlahUsd)}`).join(", ")}`] : []),
        ...(tarik.length ? [`Penarikan: ${tarik.map((x) => `${x.nama} ${usd(x.jumlahUsd)}`).join(", ")}`] : []),
      ],
    };
  });
}

export const WARNA_PORSI = ["var(--share-1)", "var(--share-2)", "var(--share-3)", "var(--share-4)"];
