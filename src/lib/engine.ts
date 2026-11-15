// Mesin hitung Pasti Cuan (PRD Section 3.1, "Mesin Hitung").
// Prinsip: simpan fakta (saldo harian dan transaksi USD), hitung sisanya setiap kali dibaca.
// Semua perhitungan memakai decimal.js; pembulatan hanya saat tampil (BR-14).
import Decimal from "decimal.js";
import type { Anggota, Jenis, Pengaturan, Permintaan, Rentang, Satuan, Snapshot, Tanggal } from "./types";
import { selisihHari, tambahHari } from "./format";

Decimal.set({ precision: 30 });
const D = (x: Decimal.Value) => new Decimal(x);
const NOL = D(0);

export interface TransaksiHari {
  anggotaId: string;
  nama: string;
  jenis: Jenis;
  jumlahUsd: number;
}

export interface TitikSaya {
  tanggal: Tanggal;
  netUsd: number;
  netSol: number;
  harga: number;
  arusUsd: number;
  transaksi: TransaksiHari[];
}

export interface TitikPool {
  tanggal: Tanggal;
  nilaiUsd: number;
  saldoSol: number;
  harga: number;
  arusUsd: number;
  transaksi: TransaksiHari[];
}

export interface Posisi {
  id: string;
  nama: string;
  peran: Anggota["peran"];
  aktif: boolean;
  unit: number;
  porsi: number;
  modalUsd: number;
  modalSol: number;
  grossUsd: number;
  feeUsd: number;
  netUsd: number;
  netSol: number;
  profitUsd: number;
  profitSol: number;
  roi: number;
  lamaIkutHari: number;
  tanggalMulai: Tanggal | null;
  punyaSetoran: boolean;
}

export interface HasilPool {
  tanggalData: Tanggal | null;
  pool: { nilaiUsd: number; saldoSol: number; harga: number; harga1Unit: number; totalUnit: number };
  posisi: Posisi[];
  /** Unit milik pengelola dari fee yang sudah terealisasi, ditambah total fee terutang investor. */
  pengelola: { id: string | null; unitFee: number; nilaiUnitFeeUsd: number; feeTerutangTotal: number };
  riwayatPool: TitikPool[];
  riwayat: Record<string, TitikSaya[]>;
  cek: { lolos: boolean; penyebab: string[] };
  /** Harga beli/jual 1 unit (NAV, BR-02) per tanggal snapshot. */
  nav: Record<Tanggal, number>;
}

interface Kondisi {
  unit: Decimal;
  modalUsd: Decimal;
  modalSol: Decimal;
  mulai: Tanggal | null;
}

function feeDari(k: Kondisi, harga1Unit: Decimal, hargaSol: Decimal, set: Pengaturan, pengelola: boolean): Decimal {
  if (pengelola) return NOL; // unit milik pengelola tidak kena fee
  const pct = D(set.feePersen);
  const gross = k.unit.mul(harga1Unit);
  if (set.satuanDasarFee === "SOL") {
    const untungSol = gross.div(hargaSol).sub(k.modalSol);
    return Decimal.max(0, untungSol).mul(pct).mul(hargaSol);
  }
  return Decimal.max(0, gross.sub(k.modalUsd)).mul(pct);
}

export function transaksiSelesai(permintaan: Permintaan[]): Permintaan[] {
  return permintaan
    .filter((p) => p.status === "selesai" && p.tanggalEfektif)
    .sort((a, b) => (a.tanggalEfektif! < b.tanggalEfektif! ? -1 : a.tanggalEfektif! > b.tanggalEfektif! ? 1 : a.dibuatPada < b.dibuatPada ? -1 : 1));
}

export function hitungPool(anggota: Anggota[], snapshots: Snapshot[], permintaan: Permintaan[], set: Pengaturan): HasilPool {
  const snaps = [...snapshots].sort((a, b) => (a.tanggal < b.tanggal ? -1 : 1));
  const tx = transaksiSelesai(permintaan);
  const nama = Object.fromEntries(anggota.map((a) => [a.id, a.nama]));
  const idPengelola = anggota.find((a) => a.peran === "pengelola")?.id ?? null;
  const k: Record<string, Kondisi> = Object.fromEntries(
    anggota.map((a) => [a.id, { unit: NOL, modalUsd: NOL, modalSol: NOL, mulai: null }]),
  );
  const riwayat: Record<string, TitikSaya[]> = Object.fromEntries(anggota.map((a) => [a.id, []]));
  const riwayatPool: TitikPool[] = [];
  const nav: Record<string, number> = {};
  const penyebab: string[] = [];
  const tanggalSnap = new Set(snaps.map((s) => s.tanggal));

  // (c) setiap transaksi selesai wajib punya snapshot di tanggal efektifnya (BR-10, BR-12c)
  for (const t of tx) {
    if (!tanggalSnap.has(t.tanggalEfektif!)) {
      penyebab.push(`Transaksi ${nama[t.anggotaId] ?? t.anggotaId} tanggal ${t.tanggalEfektif} tidak punya saldo harian.`);
    }
  }

  let total = NOL;
  let unitFee = NOL;
  let hargaUnit = D(1);
  let hargaSol = D(1);
  let nilaiPool = NOL;
  let saldoSol = NOL;

  for (const s of snaps) {
    const hari = tx.filter((t) => t.tanggalEfektif === s.tanggal);
    const nilai = D(s.nilaiUsd);
    hargaSol = nilai.div(s.saldoSol);
    const setor = hari.filter((t) => t.jenis === "setor").reduce((a, t) => a.add(t.jumlahFinalUsd!), NOL);
    const tarik = hari.filter((t) => t.jenis === "tarik").reduce((a, t) => a.add(t.jumlahFinalUsd!), NOL);
    // BR-01: snapshot pertama 1 unit = $1. BR-02: NAV = (nilai - arus) / unit sebelum arus.
    const navHari = total.isZero() ? D(1) : nilai.sub(setor.sub(tarik)).div(total);
    nav[s.tanggal] = navHari.toNumber();
    const arusAnggota: Record<string, Decimal> = {};
    const txHari: TransaksiHari[] = [];

    for (const t of hari) {
      const m = k[t.anggotaId];
      if (!m) continue;
      const w = D(t.jumlahFinalUsd!);
      txHari.push({ anggotaId: t.anggotaId, nama: nama[t.anggotaId], jenis: t.jenis, jumlahUsd: w.toNumber() });
      if (t.jenis === "setor") {
        // BR-03: unit dibeli = setoran / NAV tanggal efektif
        const u = w.div(navHari);
        m.unit = m.unit.add(u);
        m.modalUsd = m.modalUsd.add(w);
        m.modalSol = m.modalSol.add(w.div(hargaSol));
        m.mulai ??= s.tanggal;
        total = total.add(u);
        arusAnggota[t.anggotaId] = (arusAnggota[t.anggotaId] ?? NOL).add(w);
      } else {
        // BR-06: tarik W dari nilai bersih N, proporsi f = W / N
        const pengelola = t.anggotaId === idPengelola;
        const gross = m.unit.mul(navHari);
        const fee = feeDari(m, navHari, hargaSol, set, pengelola);
        const N = gross.sub(fee);
        if (w.gt(N.add(0.005))) {
          penyebab.push(`Penarikan ${nama[t.anggotaId]} ${t.tanggalEfektif} melebihi nilai bersihnya.`);
        }
        const f = N.isZero() ? D(1) : Decimal.min(1, w.div(N));
        const terjual = m.unit.mul(f);
        const keluar = w.div(navHari);
        const keFee = Decimal.max(0, terjual.sub(keluar));
        m.unit = m.unit.sub(terjual);
        m.modalUsd = m.modalUsd.mul(D(1).sub(f));
        m.modalSol = m.modalSol.mul(D(1).sub(f));
        if (idPengelola && !pengelola) {
          k[idPengelola].unit = k[idPengelola].unit.add(keFee);
          unitFee = unitFee.add(keFee);
        }
        if (pengelola) unitFee = Decimal.max(0, unitFee.sub(terjual));
        total = total.sub(keluar);
        arusAnggota[t.anggotaId] = (arusAnggota[t.anggotaId] ?? NOL).sub(w);
      }
    }

    hargaUnit = total.isZero() ? navHari : nilai.div(total);
    nilaiPool = nilai;
    saldoSol = D(s.saldoSol);
    let jumlahGross = NOL;
    for (const a of anggota) {
      const m = k[a.id];
      if (m.unit.lt(-1e-9)) penyebab.push(`Unit ${a.nama} negatif pada ${s.tanggal}.`);
      const gross = m.unit.mul(hargaUnit);
      jumlahGross = jumlahGross.add(gross);
      const net = gross.sub(feeDari(m, hargaUnit, hargaSol, set, a.id === idPengelola));
      if (m.mulai || !m.unit.isZero()) {
        riwayat[a.id].push({
          tanggal: s.tanggal,
          netUsd: net.toNumber(),
          netSol: net.div(hargaSol).toNumber(),
          harga: hargaSol.toNumber(),
          arusUsd: (arusAnggota[a.id] ?? NOL).toNumber(),
          transaksi: txHari.filter((t) => t.anggotaId === a.id),
        });
      }
    }
    if (!total.isZero() && jumlahGross.sub(nilai).abs().gt(0.01)) {
      penyebab.push(`Total nilai anggota tidak sama dengan saldo pool pada ${s.tanggal}.`);
    }
    riwayatPool.push({
      tanggal: s.tanggal,
      nilaiUsd: nilai.toNumber(),
      saldoSol: s.saldoSol,
      harga: hargaSol.toNumber(),
      arusUsd: setor.sub(tarik).toNumber(),
      transaksi: txHari,
    });
  }

  const tanggalData = snaps.length ? snaps[snaps.length - 1].tanggal : null;
  let feeTerutangTotal = NOL;
  const posisi: Posisi[] = anggota.map((a) => {
    const m = k[a.id];
    const isP = a.id === idPengelola;
    const gross = m.unit.mul(hargaUnit);
    const fee = feeDari(m, hargaUnit, hargaSol, set, isP);
    feeTerutangTotal = feeTerutangTotal.add(fee);
    const net = gross.sub(fee);
    const profitUsd = net.sub(m.modalUsd);
    const netSol = snaps.length ? net.div(hargaSol) : NOL;
    return {
      id: a.id,
      nama: a.nama,
      peran: a.peran,
      aktif: a.aktif,
      unit: m.unit.toNumber(),
      porsi: total.isZero() ? 0 : m.unit.div(total).mul(100).toNumber(),
      modalUsd: m.modalUsd.toNumber(),
      modalSol: m.modalSol.toNumber(),
      grossUsd: gross.toNumber(),
      feeUsd: fee.toNumber(),
      netUsd: net.toNumber(),
      netSol: netSol.toNumber(),
      profitUsd: profitUsd.toNumber(),
      profitSol: netSol.sub(m.modalSol).toNumber(),
      roi: m.modalUsd.isZero() ? 0 : profitUsd.div(m.modalUsd).mul(100).toNumber(),
      lamaIkutHari: m.mulai && tanggalData ? selisihHari(m.mulai, tanggalData) : 0,
      tanggalMulai: m.mulai,
      punyaSetoran: !!m.mulai,
    };
  });

  return {
    tanggalData,
    pool: {
      nilaiUsd: nilaiPool.toNumber(),
      saldoSol: saldoSol.toNumber(),
      harga: hargaSol.toNumber(),
      harga1Unit: hargaUnit.toNumber(),
      totalUnit: total.toNumber(),
    },
    posisi,
    pengelola: {
      id: idPengelola,
      unitFee: unitFee.toNumber(),
      nilaiUnitFeeUsd: unitFee.mul(hargaUnit).toNumber(),
      feeTerutangTotal: feeTerutangTotal.toNumber(),
    },
    riwayatPool,
    riwayat,
    cek: { lolos: penyebab.length === 0, penyebab },
    nav,
  };
}

// ---------- rentang & untung/rugi (BR-16) ----------

export function tanggalAwalRentang(terakhir: Tanggal, r: Rentang): Tanggal | null {
  if (r === "Semua") return null;
  return tambahHari(terakhir, r === "7H" ? -6 : -29);
}

interface Deret {
  tanggal: Tanggal;
  nilai: number;
  arus: number;
}

/** Untung/rugi rentang = jumlah perubahan harian; setoran dan penarikan tidak dihitung untung. */
export function untungRugiRentang(deret: Deret[], r: Rentang): { awal: number; jumlah: number; persen: number } {
  if (!deret.length) return { awal: 0, jumlah: 0, persen: 0 };
  const mulai = tanggalAwalRentang(deret[deret.length - 1].tanggal, r);
  let awal = deret.findIndex((d) => !mulai || d.tanggal >= mulai);
  if (awal < 0) awal = deret.length - 1;
  let jumlah = 0;
  let setoran = 0;
  for (let i = awal; i < deret.length; i++) {
    const sebelum = i ? deret[i - 1].nilai : 0;
    jumlah += deret[i].nilai - sebelum - deret[i].arus;
    if (deret[i].arus > 0) setoran += deret[i].arus;
  }
  const dasar = (awal ? deret[awal - 1].nilai : 0) + setoran;
  return { awal, jumlah, persen: dasar ? (100 * jumlah) / dasar : 0 };
}

export function deretSaya(t: TitikSaya[], u: Satuan): Deret[] {
  return t.map((p) => ({
    tanggal: p.tanggal,
    nilai: u === "USD" ? p.netUsd : p.netSol,
    arus: u === "USD" ? p.arusUsd : p.arusUsd / p.harga,
  }));
}

export function deretPool(t: TitikPool[], u: Satuan): Deret[] {
  return t.map((p) => ({
    tanggal: p.tanggal,
    nilai: u === "USD" ? p.nilaiUsd : p.saldoSol,
    arus: u === "USD" ? p.arusUsd : p.arusUsd / p.harga,
  }));
}

// ---------- simulasi tarik (BR-06, AC-04-01) ----------

export interface Simulasi {
  unitTerjual: number;
  feeDibayar: number;
  sisaNetUsd: number;
  sisaModalUsd: number;
  sisaPorsi: number;
  maksimal: number;
}

export function simulasiTarik(h: HasilPool, anggotaId: string, w: number, set: Pengaturan): Simulasi {
  const p = h.posisi.find((x) => x.id === anggotaId)!;
  const harga = D(h.pool.harga1Unit);
  const isP = anggotaId === h.pengelola.id;
  const N = D(p.netUsd);
  const W = Decimal.min(D(Math.max(0, w)), N);
  const f = N.isZero() ? NOL : W.div(N);
  const unit = D(p.unit);
  const terjual = unit.mul(f);
  const fee = isP ? NOL : D(p.feeUsd).mul(f);
  const keluar = harga.isZero() ? NOL : W.div(harga);
  const sisaUnit = unit.sub(terjual);
  const sisaTotal = D(h.pool.totalUnit).sub(keluar);
  const sisaModal = D(p.modalUsd).mul(D(1).sub(f));
  const k: Kondisi = { unit: sisaUnit, modalUsd: sisaModal, modalSol: D(p.modalSol).mul(D(1).sub(f)), mulai: null };
  const sisaFee = feeDari(k, harga, D(h.pool.harga), set, isP);
  return {
    unitTerjual: terjual.toNumber(),
    feeDibayar: fee.toNumber(),
    sisaNetUsd: sisaUnit.mul(harga).sub(sisaFee).toNumber(),
    sisaModalUsd: sisaModal.toNumber(),
    sisaPorsi: sisaTotal.isZero() ? 0 : sisaUnit.div(sisaTotal).mul(100).toNumber(),
    maksimal: N.toNumber(),
  };
}
