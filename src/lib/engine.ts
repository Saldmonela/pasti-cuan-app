// Mesin hitung Pasti Cuan (PRD Section 3.1, "Mesin Hitung").
// Prinsip: simpan fakta (saldo harian dan transaksi USD), hitung sisanya setiap kali dibaca.
// Semua perhitungan memakai decimal.js; pembulatan hanya saat tampil (BR-14).
import Decimal from "decimal.js";
import type { Anggota, ArusOnchain, Jenis, Pengaturan, Permintaan, Rentang, Satuan, Snapshot, Tanggal } from "./types";
import { selisihHari, tambahHari } from "./format";
import { isoWib, MENIT, ms, msSnapshot, titikTerakhir, type TitikNilai } from "./onchain";

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
  /** Unit dan modal tiap anggota sesudah tiap snapshot, dasar nilai live di antara dua snapshot. */
  keadaan: Record<Tanggal, Keadaan>;
  /** Keadaan kronologis (termasuk transaksi onchain di waktu transfer) untuk liveDi & seriRentang. */
  keadaanSaat: KeadaanSaat[];
  /** Terisi bila ada titik nilai sesudah snapshot resmi terakhir (BR-19). */
  live: Live | null;
}

export interface Keadaan {
  total: number;
  unitFee: number;
  anggota: Record<string, { unit: number; modalUsd: number; modalSol: number; mulai: Tanggal | null }>;
}

export interface KeadaanSaat extends Keadaan {
  ms: number;
  tanggal: Tanggal;
  hargaUnit: number;
  settledIds: string[];
}

export interface Live {
  dibacaPada: string;
  ms: number;
  nilaiMentahUsd: number;
  /** Arus keluar dikurangi arus masuk sejak snapshot terakhir, yang ditambahkan kembali ke nilai mentah. */
  arusDinetralkanUsd: number;
  nilaiUsd: number;
  saldoSol: number;
  harga: number;
  nav: number;
  snapshot: Tanggal;
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

const isOnchainTx = (p: Permintaan) => Boolean(p.waktuEfektif && p.titikNilaiId);

function waktuEfektifMs(p: Permintaan, jam = "08:00"): number {
  if (p.waktuEfektif) return ms(p.waktuEfektif);
  return msSnapshot(p.tanggalEfektif!, jam);
}

export function transaksiSelesai(permintaan: Permintaan[], jam = "08:00"): Permintaan[] {
  return permintaan
    .filter((p) => p.status === "selesai" && (!!p.tanggalEfektif || isOnchainTx(p)))
    .sort((a, b) => {
      const ta = waktuEfektifMs(a, jam);
      const tb = waktuEfektifMs(b, jam);
      if (ta !== tb) return ta - tb;
      return a.dibuatPada < b.dibuatPada ? -1 : a.dibuatPada > b.dibuatPada ? 1 : 0;
    });
}

function terapkanTransaksi(
  t: Permintaan,
  navSaat: Decimal,
  hargaSolSaat: Decimal,
  tglEfektif: Tanggal,
  k: Record<string, Kondisi>,
  totalRef: { val: Decimal },
  unitFeeRef: { val: Decimal },
  idPengelola: string | null,
  set: Pengaturan,
  nama: Record<string, string>,
  penyebab: string[],
  arusAnggota: Record<string, Decimal>,
  txHari: TransaksiHari[],
) {
  const m = k[t.anggotaId];
  if (!m) return;
  const w = D(t.jumlahFinalUsd!);
  txHari.push({ anggotaId: t.anggotaId, nama: nama[t.anggotaId], jenis: t.jenis, jumlahUsd: w.toNumber() });
  if (t.jenis === "setor") {
    // BR-03: unit dibeli = setoran / NAV efektif
    const u = w.div(navSaat);
    m.unit = m.unit.add(u);
    m.modalUsd = m.modalUsd.add(w);
    m.modalSol = m.modalSol.add(w.div(hargaSolSaat));
    m.mulai ??= tglEfektif;
    totalRef.val = totalRef.val.add(u);
    arusAnggota[t.anggotaId] = (arusAnggota[t.anggotaId] ?? NOL).add(w);
  } else {
    // BR-06: tarik W dari nilai bersih N, proporsi f = W / N
    const pengelola = t.anggotaId === idPengelola;
    const gross = m.unit.mul(navSaat);
    const fee = feeDari(m, navSaat, hargaSolSaat, set, pengelola);
    const N = gross.sub(fee);
    if (w.gt(N.add(0.005))) {
      penyebab.push(`Penarikan ${nama[t.anggotaId]} ${tglEfektif} melebihi nilai bersihnya.`);
    }
    const f = N.isZero() ? D(1) : Decimal.min(1, w.div(N));
    const terjual = m.unit.mul(f);
    const keluar = w.div(navSaat);
    const keFee = Decimal.max(0, terjual.sub(keluar));
    m.unit = m.unit.sub(terjual);
    m.modalUsd = m.modalUsd.mul(D(1).sub(f));
    m.modalSol = m.modalSol.mul(D(1).sub(f));
    if (idPengelola && !pengelola) {
      k[idPengelola].unit = k[idPengelola].unit.add(keFee);
      unitFeeRef.val = unitFeeRef.val.add(keFee);
    }
    if (pengelola) unitFeeRef.val = Decimal.max(0, unitFeeRef.val.sub(terjual));
    totalRef.val = totalRef.val.sub(keluar);
    arusAnggota[t.anggotaId] = (arusAnggota[t.anggotaId] ?? NOL).sub(w);
  }
}

export function hitungPool(
  anggota: Anggota[],
  snapshots: Snapshot[],
  permintaan: Permintaan[],
  set: Pengaturan,
  arus: ArusOnchain[] = [],
  titikReferensi: TitikNilai[] = [],
): HasilPool {
  const snaps = [...snapshots].sort((a, b) => (a.tanggal < b.tanggal ? -1 : 1));
  const tx = transaksiSelesai(permintaan, set.jamSnapshot);
  const nama = Object.fromEntries(anggota.map((a) => [a.id, a.nama]));
  const idPengelola = anggota.find((a) => a.peran === "pengelola")?.id ?? null;
  const k: Record<string, Kondisi> = Object.fromEntries(
    anggota.map((a) => [a.id, { unit: NOL, modalUsd: NOL, modalSol: NOL, mulai: null }]),
  );
  const riwayat: Record<string, TitikSaya[]> = Object.fromEntries(anggota.map((a) => [a.id, []]));
  const riwayatPool: TitikPool[] = [];
  const nav: Record<string, number> = {};
  const keadaan: Record<string, Keadaan> = {};
  const keadaanSaat: KeadaanSaat[] = [];
  const penyebab: string[] = [];
  const tanggalSnap = new Set(snaps.map((s) => s.tanggal));
  const titikById = new Map<number, TitikNilai>();
  for (const ti of titikReferensi) {
    if (ti.id != null) titikById.set(ti.id, ti);
  }

  // (c) setiap transaksi selesai wajib punya snapshot (manual/impor) atau titik nilai (onchain) (BR-10, BR-12c)
  for (const t of tx) {
    if (isOnchainTx(t)) {
      if (!titikById.has(t.titikNilaiId!)) {
        penyebab.push(`Transaksi ${nama[t.anggotaId] ?? t.anggotaId} (${t.waktuEfektif}) tidak punya titik nilai referensi.`);
      }
    } else if (!tanggalSnap.has(t.tanggalEfektif!)) {
      penyebab.push(`Transaksi ${nama[t.anggotaId] ?? t.anggotaId} tanggal ${t.tanggalEfektif} tidak punya saldo harian.`);
    }
  }

  type Event =
    | { kind: "snap"; tMs: number; snap: Snapshot }
    | { kind: "tx"; tMs: number; tx: Permintaan; titik: TitikNilai };

  const events: Event[] = snaps.map((snap) => ({
    kind: "snap",
    tMs: msSnapshot(snap.tanggal, set.jamSnapshot),
    snap,
  }));
  for (const t of tx) {
    if (!isOnchainTx(t)) continue;
    const ti = titikById.get(t.titikNilaiId!);
    if (ti) {
      events.push({ kind: "tx", tMs: ms(t.waktuEfektif!), tx: t, titik: ti });
    }
  }
  events.sort((a, b) => {
    if (a.tMs !== b.tMs) return a.tMs - b.tMs;
    if (a.kind !== b.kind) return a.kind === "snap" ? -1 : 1;
    return 0;
  });

  const totalRef = { val: NOL };
  const unitFeeRef = { val: NOL };
  let hargaUnit = D(1);
  let hargaSol = D(1);
  let nilaiPool = NOL;
  let saldoSol = NOL;
  let lastEventMs = -Infinity;
  const settledIds = new Set<string>();

  const snapshotKeadaan = (): Keadaan["anggota"] =>
    Object.fromEntries(
      anggota.map((a) => [
        a.id,
        { unit: k[a.id].unit.toNumber(), modalUsd: k[a.id].modalUsd.toNumber(), modalSol: k[a.id].modalSol.toNumber(), mulai: k[a.id].mulai },
      ]),
    );

  for (const ev of events) {
    if (ev.kind === "snap") {
      const s = ev.snap;
      const hari = tx.filter((t) => !isOnchainTx(t) && t.tanggalEfektif === s.tanggal);
      const nilai = D(s.nilaiUsd);
      hargaSol = nilai.div(s.saldoSol);
      const setor = hari.filter((t) => t.jenis === "setor").reduce((a, t) => a.add(t.jumlahFinalUsd!), NOL);
      const tarik = hari.filter((t) => t.jenis === "tarik").reduce((a, t) => a.add(t.jumlahFinalUsd!), NOL);
      // BR-01: snapshot pertama 1 unit = $1. BR-02: NAV = (nilai - arus) / unit sebelum arus.
      const navHari = totalRef.val.isZero() ? D(1) : nilai.sub(setor.sub(tarik)).div(totalRef.val);
      nav[s.tanggal] = navHari.toNumber();
      const arusAnggota: Record<string, Decimal> = {};
      const txHari: TransaksiHari[] = [];

      for (const t of hari) {
        terapkanTransaksi(t, navHari, hargaSol, s.tanggal, k, totalRef, unitFeeRef, idPengelola, set, nama, penyebab, arusAnggota, txHari);
        settledIds.add(t.id);
      }

      hargaUnit = totalRef.val.isZero() ? navHari : nilai.div(totalRef.val);
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
      const angSnap = snapshotKeadaan();
      keadaan[s.tanggal] = { total: totalRef.val.toNumber(), unitFee: unitFeeRef.val.toNumber(), anggota: angSnap };
      keadaanSaat.push({ ms: ev.tMs, tanggal: s.tanggal, total: totalRef.val.toNumber(), unitFee: unitFeeRef.val.toNumber(), hargaUnit: hargaUnit.toNumber(), anggota: angSnap, settledIds: [...settledIds] });
      if (!totalRef.val.isZero() && jumlahGross.sub(nilai).abs().gt(0.01)) {
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
      lastEventMs = ev.tMs;
    } else {
      // Transaksi onchain dinilai pada waktu transfer memakai titik nilai referensi (BR-18, update 17 Nov 2026)
      const t = ev.tx;
      const ti = ev.titik;
      let netral = NOL;
      for (const a of arus) {
        const ta = ms(a.waktu);
        if (ta <= lastEventMs || ta > ti.ms) continue;
        // Arus milik transaksi ini sendiri baru terpotong dari isi wallet bila titik referensi diambil SESUDAH waktu blok transfer.
        if (a.permintaanId === t.id && ti.ms <= ta) continue;
        const belumSelesai = a.status === "belum" || (a.status === "dicocokkan" && !settledIds.has(a.permintaanId ?? ""));
        if (!belumSelesai) continue;
        netral = netral.add(a.arah === "keluar" ? a.nilaiUsd : -a.nilaiUsd);
      }
      const nilaiAdjusted = D(ti.nilaiUsd).add(netral);
      hargaSol = D(ti.harga);
      const navTx = totalRef.val.isZero() ? D(1) : nilaiAdjusted.div(totalRef.val);
      const tglTx = isoWib(ev.tMs).slice(0, 10);
      const arusAnggota: Record<string, Decimal> = {};
      const txHari: TransaksiHari[] = [];
      terapkanTransaksi(t, navTx, hargaSol, tglTx, k, totalRef, unitFeeRef, idPengelola, set, nama, penyebab, arusAnggota, txHari);
      settledIds.add(t.id);
      hargaUnit = navTx;
      nilaiPool = totalRef.val.mul(navTx);
      saldoSol = nilaiPool.div(hargaSol);
      lastEventMs = ev.tMs;
      keadaanSaat.push({
        ms: ev.tMs,
        tanggal: tglTx,
        total: totalRef.val.toNumber(),
        unitFee: unitFeeRef.val.toNumber(),
        hargaUnit: hargaUnit.toNumber(),
        anggota: snapshotKeadaan(),
        settledIds: [...settledIds],
      });
    }
  }

  const total = totalRef.val;
  const unitFee = unitFeeRef.val;
  const tanggalData = snaps.length ? snaps[snaps.length - 1].tanggal : null;

  // (e) arus onchain yang belum ditandai tidak boleh terjadi sebelum snapshot resmi terakhir (BR-12e, BR-19)
  if (tanggalData) {
    const batas = msSnapshot(tanggalData, set.jamSnapshot);
    const n = arus.filter((a) => a.status === "belum" && ms(a.waktu) < batas).length;
    if (n) penyebab.push(`Ada ${n} transfer di wallet yang belum dicatat pengelola. Angka sedang dicek ulang.`);
  }

  const { posisi, feeTerutangTotal } = susunPosisi(anggota, k, total, hargaUnit, hargaSol, set, idPengelola, tanggalData);

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
    keadaan,
    keadaanSaat,
    live: null,
  };
}

function susunPosisi(
  anggota: Anggota[],
  k: Record<string, Kondisi>,
  total: Decimal,
  hargaUnit: Decimal,
  hargaSol: Decimal,
  set: Pengaturan,
  idPengelola: string | null,
  tanggalData: Tanggal | null,
): { posisi: Posisi[]; feeTerutangTotal: Decimal } {
  let feeTerutangTotal = NOL;
  const posisi: Posisi[] = anggota.map((a) => {
    const m = k[a.id] ?? { unit: NOL, modalUsd: NOL, modalSol: NOL, mulai: null };
    const isP = a.id === idPengelola;
    const gross = m.unit.mul(hargaUnit);
    const fee = feeDari(m, hargaUnit, hargaSol, set, isP);
    feeTerutangTotal = feeTerutangTotal.add(fee);
    const net = gross.sub(fee);
    const profitUsd = net.sub(m.modalUsd);
    const netSol = tanggalData ? net.div(hargaSol) : NOL;
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
  return { posisi, feeTerutangTotal };
}

const kondisiDari = (kd: Keadaan): Record<string, Kondisi> =>
  Object.fromEntries(
    Object.entries(kd.anggota).map(([id, x]) => [id, { unit: D(x.unit), modalUsd: D(x.modalUsd), modalSol: D(x.modalSol), mulai: x.mulai }]),
  );

// ---------- nilai live (BR-19) ----------

/** Arus yang dinetralkan: status belum atau dicocokkan. Biaya pool dan bukan arus dibiarkan memengaruhi nilai. */
const dinetralkan = (a: ArusOnchain) => a.status === "belum" || a.status === "dicocokkan";

/** Snapshot resmi terakhir pada atau sebelum t. */
function snapshotSebelum(snaps: Snapshot[], t: number, jam: string): Snapshot | null {
  let s: Snapshot | null = null;
  for (const x of snaps) if (msSnapshot(x.tanggal, jam) <= t && (!s || x.tanggal > s.tanggal)) s = x;
  return s;
}

function keadaanPada(h: HasilPool, t: number): KeadaanSaat | null {
  let latest: KeadaanSaat | null = null;
  for (const ks of h.keadaanSaat) {
    if (ks.ms <= t && (!latest || ks.ms >= latest.ms)) latest = ks;
  }
  return latest;
}

/** Nilai live di satu titik: nilai mentah - arus masuk + arus keluar yang belum diproses sejak keadaan terakhir. */
export function liveDi(h: HasilPool, snaps: Snapshot[], arus: ArusOnchain[], ti: TitikNilai, set: Pengaturan): Live | null {
  const ks = keadaanPada(h, ti.ms);
  const s = snapshotSebelum(snaps, ti.ms, set.jamSnapshot);
  if (!ks && (!s || !h.keadaan[s.tanggal])) return null;
  const dari = ks ? ks.ms : msSnapshot(s!.tanggal, set.jamSnapshot);
  const settled = new Set(ks?.settledIds ?? []);
  const total = ks ? ks.total : h.keadaan[s!.tanggal].total;
  const snapTgl = ks ? ks.tanggal : s!.tanggal;

  let netral = 0;
  for (const a of arus) {
    const t = ms(a.waktu);
    if (t <= dari || t > ti.ms || !dinetralkan(a)) continue;
    if (a.status === "dicocokkan" && a.permintaanId && settled.has(a.permintaanId)) continue;
    netral += a.arah === "keluar" ? a.nilaiUsd : -a.nilaiUsd;
  }
  const nilaiUsd = ti.nilaiUsd + netral;
  return {
    dibacaPada: isoWib(ti.ms),
    ms: ti.ms,
    nilaiMentahUsd: ti.nilaiUsd,
    arusDinetralkanUsd: netral,
    nilaiUsd,
    saldoSol: nilaiUsd / ti.harga,
    harga: ti.harga,
    nav: total ? nilaiUsd / total : 1,
    snapshot: snapTgl,
  };
}

function posisiLive(h: HasilPool, anggota: Anggota[], live: Live, set: Pengaturan) {
  const kd = keadaanPada(h, live.ms) ?? h.keadaan[live.snapshot];
  return susunPosisi(anggota, kondisiDari(kd), D(kd.total), D(live.nav), D(live.harga), set, h.pengelola.id, h.tanggalData);
}

/**
 * Hasil untuk tampilan: angka memakai NAV live bila ada titik nilai sesudah snapshot resmi terakhir.
 * Jika belum ada, sama dengan hasil snapshot (AC-01-01). Porsi, modal, dan lama ikut tidak bergantung NAV.
 */
export function terapkanLive(
  h: HasilPool,
  anggota: Anggota[],
  snaps: Snapshot[],
  arus: ArusOnchain[],
  titik: TitikNilai[],
  sekarang: number,
  set: Pengaturan,
): HasilPool {
  if (!h.tanggalData) return h;
  const ti = titikTerakhir(titik, sekarang);
  // titik estimasi (BR-24) tidak pernah dipakai untuk NAV live
  if (!ti || ti.estimasi || ti.ms <= msSnapshot(h.tanggalData, set.jamSnapshot)) return h;
  const live = liveDi(h, snaps, arus, ti, set);
  if (!live || live.snapshot < h.tanggalData) return h;
  const { posisi, feeTerutangTotal } = posisiLive(h, anggota, live, set);
  return {
    ...h,
    pool: { ...h.pool, nilaiUsd: live.nilaiUsd, saldoSol: live.saldoSol, harga: live.harga, harga1Unit: live.nav },
    posisi,
    pengelola: { ...h.pengelola, nilaiUnitFeeUsd: h.pengelola.unitFee * live.nav, feeTerutangTotal: feeTerutangTotal.toNumber() },
    live,
  };
}

// ---------- seri grafik dan untung/rugi rentang (BR-16, BR-21, BR-22) ----------

export interface TransaksiTitik {
  nama: string;
  jenis: Jenis;
  jumlahUsd: number;
}

/** Satu titik grafik. Titik harian = snapshot resmi; titik pendek = titik nilai (BR-21). */
export interface TitikSeri {
  ms: number;
  waktu: string;
  harian: boolean;
  /** Titik estimasi riwayat (BR-24): chip "Estimasi dari harga pasar per jam" saat di-scrub. */
  estimasi?: boolean;
  /** Pool: isi wallet (BR-19). Saya: nilai bersih saya. */
  usd: number;
  sol: number;
  harga: number;
  /** NAV USD di titik ini; dasar persen pool dan mode Bandingkan (BR-16, BR-22). */
  nav: number;
  /** Arus yang diakui di titik ini (setor positif, tarik negatif), dikeluarkan dari untung/rugi. */
  arusUsd: number;
  /** Transaksi di kelompok waktu titik ini, digabung jadi satu penanda (BR-21). */
  transaksi: TransaksiTitik[];
}

export interface Seri {
  jenis: "pool" | "saya";
  titik: TitikSeri[];
  /** Indeks titik pertama di dalam rentang; titik sebelumnya menjadi pembanding. */
  awal: number;
  /** Bila seri memuat titik estimasi: waktu pembacaan otomatis mulai berjalan (keterangan grafik, BR-24). */
  estimasiSampai?: number;
}

export function tanggalAwalRentang(terakhir: Tanggal, r: Rentang): Tanggal | null {
  if (r === "Semua" || r === "24J") return null;
  return tambahHari(terakhir, r === "7H" ? -6 : -29);
}

export interface KonteksSeri {
  h: HasilPool;
  anggota: Anggota[];
  snaps: Snapshot[];
  permintaan: Permintaan[];
  arus: ArusOnchain[];
  titik: TitikNilai[];
  sekarang: number;
  set: Pengaturan;
}

function titikHarian(c: KonteksSeri, anggotaId: string | null): TitikSeri[] {
  const jam = c.set.jamSnapshot;
  const dasar = (tanggal: Tanggal) => ({ ms: msSnapshot(tanggal, jam), waktu: `${tanggal}T${jam}:00+07:00`, harian: true, nav: c.h.nav[tanggal] ?? 1 });
  if (anggotaId) {
    return (c.h.riwayat[anggotaId] ?? []).map((p) => ({
      ...dasar(p.tanggal),
      usd: p.netUsd,
      sol: p.netSol,
      harga: p.harga,
      arusUsd: p.arusUsd,
      transaksi: p.transaksi.map((t) => ({ nama: t.nama, jenis: t.jenis, jumlahUsd: t.jumlahUsd })),
    }));
  }
  return c.h.riwayatPool.map((p) => ({
    ...dasar(p.tanggal),
    usd: p.nilaiUsd,
    sol: p.saldoSol,
    harga: p.harga,
    arusUsd: p.arusUsd,
    transaksi: p.transaksi.map((t) => ({ nama: t.nama, jenis: t.jenis, jumlahUsd: t.jumlahUsd })),
  }));
}

/**
 * Nilai di satu titik nilai. Pool: isi wallet apa adanya (BR-19, sama dengan Jupiter).
 * Saya: unit saya x NAV live - fee terutang (BR-21).
 */
function nilaiDi(c: KonteksSeri, ti: TitikNilai, anggotaId: string | null): { usd: number; sol: number; nav: number; snapshot: Tanggal } | null {
  const live = liveDi(c.h, c.snaps, c.arus, ti, c.set);
  if (!live) return null;
  if (!anggotaId) return { usd: ti.nilaiUsd, sol: ti.nilaiUsd / ti.harga, nav: live.nav, snapshot: live.snapshot };
  const kd = keadaanPada(c.h, ti.ms) ?? c.h.keadaan[live.snapshot];
  const m = kd.anggota[anggotaId];
  if (!m || (!m.mulai && m.unit === 0)) return null;
  const isP = anggotaId === c.h.pengelola.id;
  const k: Kondisi = { unit: D(m.unit), modalUsd: D(m.modalUsd), modalSol: D(m.modalSol), mulai: m.mulai };
  const nav = D(live.nav);
  const net = k.unit.mul(nav).sub(feeDari(k, nav, D(live.harga), c.set, isP));
  return { usd: net.toNumber(), sol: net.div(live.harga).toNumber(), nav: live.nav, snapshot: live.snapshot };
}

/** Arus onchain di antara dua titik: daftar transaksi untuk chip (BR-23) dan arus bersihnya. */
function arusDiAntara(c: KonteksSeri, dari: number, sampai: number, anggotaId: string | null): { transaksi: TransaksiTitik[]; bersih: number } {
  const pemilik = (a: ArusOnchain) => c.permintaan.find((p) => p.id === a.permintaanId)?.anggotaId;
  const nama = (id?: string) => c.anggota.find((x) => x.id === id)?.nama ?? "Belum dicocokkan";
  const kelompok = new Map<string, TransaksiTitik>();
  let bersih = 0;
  for (const a of c.arus) {
    const t = ms(a.waktu);
    if (t <= dari || t > sampai || !dinetralkan(a)) continue;
    const id = a.status === "dicocokkan" ? pemilik(a) : undefined;
    if (anggotaId && id !== anggotaId) continue;
    const jenis: Jenis = a.arah === "masuk" ? "setor" : "tarik";
    bersih += jenis === "setor" ? a.nilaiUsd : -a.nilaiUsd;
    const kunci = `${id ?? "-"}|${jenis}`;
    const ada = kelompok.get(kunci);
    if (ada) ada.jumlahUsd += a.nilaiUsd;
    else kelompok.set(kunci, { nama: nama(id), jenis, jumlahUsd: a.nilaiUsd });
  }
  return { transaksi: [...kelompok.values()], bersih };
}

/** Titik nilai terakhir sebagai ujung seri harian (30H, Semua, dan 7H yang belum cukup titik nilai). */
function titikUjung(c: KonteksSeri, ti: TitikNilai, sebelum: TitikSeri, anggotaId: string | null): TitikSeri | null {
  const v = nilaiDi(c, ti, anggotaId);
  if (!v) return null;
  // pool: isi wallet sudah turun/naik karena transfer sejak snapshot terakhir, jadi transfernya diakui sebagai arus
  const a = anggotaId ? { transaksi: [], bersih: 0 } : arusDiAntara(c, sebelum.ms, ti.ms, null);
  return { ms: ti.ms, waktu: isoWib(ti.ms), harian: false, estimasi: !!ti.estimasi, usd: v.usd, sol: v.sol, harga: ti.harga, nav: v.nav, arusUsd: a.bersih, transaksi: a.transaksi };
}

/** Interval tiap rentang (BR-21): target 150-365 titik, sama untuk USD dan SOL. */
const INTERVAL: Record<Exclude<Rentang, "Semua">, { panjang: number; langkah: number }> = {
  "24J": { panjang: 24 * 60 * MENIT, langkah: 5 * MENIT },
  "7H": { panjang: 7 * 24 * 60 * MENIT, langkah: 30 * MENIT },
  "30H": { panjang: 30 * 24 * 60 * MENIT, langkah: 120 * MENIT },
};
/** Pilihan interval rentang Semua: yang terkecil dengan jumlah titik <= 365. */
const INTERVAL_SEMUA = [2, 4, 6, 12, 24].map((j) => j * 60 * MENIT);
export const MAKS_TITIK = 365;
const OFFSET_WIB = 7 * 60 * MENIT;

export function intervalSemua(panjang: number): number {
  return INTERVAL_SEMUA.find((l) => Math.ceil(panjang / l) <= MAKS_TITIK) ?? INTERVAL_SEMUA[INTERVAL_SEMUA.length - 1];
}

/** Seri harian (snapshot) + 1 titik nilai di ujung: dipakai bila titik nilai belum mencakup 90% rentang. */
function seriHarianDenganUjung(c: KonteksSeri, r: Rentang, anggotaId: string | null, harian: TitikSeri[], terakhir?: TitikNilai): Seri {
  const jenis = anggotaId ? "saya" : "pool";
  const titik = [...harian];
  const akhir = titik[titik.length - 1];
  if (terakhir && akhir && terakhir.ms > akhir.ms) {
    const u = titikUjung(c, terakhir, akhir, anggotaId);
    if (u) titik.push(u);
  }
  if (!titik.length) return { jenis, titik, awal: 0 };
  const tgl = tanggalAwalRentang(titik[titik.length - 1].waktu.slice(0, 10), r);
  const batas = tgl ? ms(tgl) : -Infinity;
  const awal = Math.max(0, titik.findIndex((p) => p.ms >= batas));
  return { jenis, titik, awal };
}

/**
 * Seri grafik untuk satu rentang (BR-21). Semua rentang memakai titik nilai (asli, atau estimasi per jam untuk
 * riwayat sebelum pembacaan otomatis, BR-24) dengan interval: 24J 5 menit, 7H 30 menit, 30H 2 jam, Semua otomatis
 * (<= 365 titik). Tiap kelompok waktu memakai titik terakhirnya, bukan rata-rata. Bila titik nilai belum mencakup
 * 90% rentang, seluruh rentang memakai snapshot harian + 1 titik nilai di ujung, supaya kerapatan tidak bercampur.
 */
export function seriRentang(c: KonteksSeri, r: Rentang, anggotaId: string | null = null): Seri {
  const jenis = anggotaId ? "saya" : "pool";
  const harian = titikHarian(c, anggotaId).filter((p) => p.ms <= c.sekarang);
  const tersedia = c.titik.filter((t) => t.ms <= c.sekarang);
  const terakhir = tersedia[tersedia.length - 1];
  const semua = r === "Semua";

  let panjang: number;
  let langkah: number;
  let mulai: number;
  if (semua) {
    const awalData = Math.min(harian[0]?.ms ?? Infinity, tersedia[0]?.ms ?? Infinity);
    if (awalData === Infinity) return { jenis, titik: [], awal: 0 };
    panjang = Math.max(c.sekarang - awalData, MENIT);
    langkah = intervalSemua(panjang);
    mulai = awalData - 1;
  } else {
    ({ panjang, langkah } = INTERVAL[r]);
    // awal rentang dibulatkan ke batas kelompok: jumlah kelompok tidak melebihi target + 1 pembanding
    mulai = Math.ceil((c.sekarang - panjang + OFFSET_WIB) / langkah) * langkah - OFFSET_WIB;
  }
  const cukup = !!tersedia[0] && tersedia[0].ms <= mulai + 1 + 0.1 * panjang;
  if (!cukup && r !== "24J") return seriHarianDenganUjung(c, r, anggotaId, harian, terakhir);

  const titikPilih: TitikNilai[] = [];
  const pembanding = semua ? null : titikTerakhir(tersedia, mulai);
  if (pembanding) titikPilih.push(pembanding);
  // titik terakhir di tiap kelompok; kelompok mengikuti jam WIB (10.00-10.05, 08.00-10.00, ...) supaya tidak
  // bergeser saat jam berjalan. Menit tanpa titik tidak diisi.
  let ember = -1;
  for (const t of tersedia) {
    if (t.ms <= mulai) continue;
    const e = Math.floor((t.ms + OFFSET_WIB - 1) / langkah);
    if (e === ember) titikPilih[titikPilih.length - 1] = t;
    else titikPilih.push(t);
    ember = e;
  }

  const sumber = new Map(c.snaps.map((s) => [s.tanggal, s.sumber]));
  const out: TitikSeri[] = [];
  let snapSebelum: Tanggal | null = null;
  let tSebelum = -Infinity;
  for (const ti of titikPilih) {
    const v = nilaiDi(c, ti, anggotaId);
    if (!v) continue;
    let arusUsd = 0;
    const transaksi: TransaksiTitik[] = [];
    const pindah = snapSebelum ? v.snapshot !== snapSebelum : semua;
    // Transaksi yang efektif di snapshot diakui sebagai arus saat unit berubah: selalu untuk grafik saya, dan untuk
    // pool pada riwayat impor (belum ada transfer onchain). Rentang Semua mulai dari 0, jadi titik pertama ikut.
    if (pindah && (anggotaId || sumber.get(v.snapshot) === "impor" || ti.estimasi)) {
      const hs = harian.find((p) => p.waktu.startsWith(v.snapshot));
      if (hs) {
        arusUsd = hs.arusUsd;
        const efektif = !ti.estimasi && sumber.get(v.snapshot) !== "impor";
        transaksi.push(...hs.transaksi.map((x) => ({ ...x, nama: efektif ? `${x.nama}, efektif` : x.nama })));
      }
    }
    if (tSebelum > -Infinity) {
      const a = arusDiAntara(c, tSebelum, ti.ms, anggotaId);
      // pool: isi wallet berubah saat transfer terjadi, jadi transfer onchain diakui sebagai arus di titik itu
      if (!anggotaId) arusUsd += a.bersih;
      transaksi.push(...a.transaksi);
      // saya: untuk transaksi onchain yang langsung selesai pada waktu transfer (BR-18), unit berubah di titik ini
      if (anggotaId) {
        for (const p of c.permintaan) {
          if (p.status !== "selesai" || p.anggotaId !== anggotaId || !isOnchainTx(p)) continue;
          const tp = ms(p.waktuEfektif!);
          if (tp > tSebelum && tp <= ti.ms) {
            arusUsd += p.jenis === "setor" ? p.jumlahFinalUsd! : -p.jumlahFinalUsd!;
          }
        }
      }
    }
    out.push({
      ms: ti.ms,
      waktu: isoWib(ti.ms),
      harian: false,
      estimasi: !!ti.estimasi,
      usd: v.usd,
      sol: v.sol,
      harga: ti.harga,
      nav: v.nav,
      arusUsd,
      transaksi,
    });
    snapSebelum = v.snapshot;
    tSebelum = ti.ms;
  }
  const asli = tersedia.find((t) => !t.estimasi);
  const estimasiSampai = out.some((p) => p.estimasi) ? asli?.ms : undefined;
  if (semua) return { jenis, titik: out, awal: 0, estimasiSampai };
  const awal = out.findIndex((p) => p.ms > mulai);
  return { jenis, titik: out, awal: awal < 0 ? out.length : Math.max(awal, out.length > 1 ? 1 : 0), estimasiSampai };
}

export interface Kumulatif {
  ruUsd: number;
  ruSol: number;
  persenUsd: number;
  persenSol: number;
}

/**
 * Untung/rugi dan persen dari awal rentang sampai tiap titik (BR-16, BR-22, BR-23).
 * Untung/rugi = jumlah perubahan antar titik dikurangi arus. Persen saya = untung/rugi / (nilai awal + setoran
 * sampai titik itu). Persen pool = perubahan NAV (NAV SOL = NAV USD / harga SOL), sehingga setor/tarik tidak
 * membuat persen melompat. Titik sebelum pembanding bernilai nol.
 */
export function kumulatif(s: Seri): Kumulatif[] {
  const out: Kumulatif[] = s.titik.map(() => ({ ruUsd: 0, ruSol: 0, persenUsd: 0, persenSol: 0 }));
  if (!s.titik.length) return out;
  const b = Math.max(0, s.awal - 1);
  const pb = s.titik[b];
  const dasarUsd = s.awal ? pb.usd : 0;
  const dasarSol = s.awal ? pb.sol : 0;
  let ruUsd = 0;
  let ruSol = 0;
  let setorUsd = 0;
  let setorSol = 0;
  for (let i = s.awal; i < s.titik.length; i++) {
    const p = s.titik[i];
    const q = i ? s.titik[i - 1] : null;
    const aSol = p.arusUsd / p.harga;
    ruUsd += p.usd - (q?.usd ?? 0) - p.arusUsd;
    ruSol += p.sol - (q?.sol ?? 0) - aSol;
    if (p.arusUsd > 0) {
      setorUsd += p.arusUsd;
      setorSol += aSol;
    }
    const pool = s.jenis === "pool";
    out[i] = {
      ruUsd,
      ruSol,
      persenUsd: pool ? (p.nav / pb.nav - 1) * 100 : dasarUsd + setorUsd ? (100 * ruUsd) / (dasarUsd + setorUsd) : 0,
      persenSol: pool ? (p.nav / p.harga / (pb.nav / pb.harga) - 1) * 100 : dasarSol + setorSol ? (100 * ruSol) / (dasarSol + setorSol) : 0,
    };
  }
  return out;
}

/** Untung/rugi rentang = nilai kumulatif di titik terakhir. */
export function untungRugi(s: Seri, u: Satuan): { jumlah: number; persen: number } {
  const k = kumulatif(s).at(-1);
  if (!k) return { jumlah: 0, persen: 0 };
  return u === "USD" ? { jumlah: k.ruUsd, persen: k.persenUsd } : { jumlah: k.ruSol, persen: k.persenSol };
}

/** Seri harian saja (tanpa titik nilai), dipakai golden test riwayat impor. 7H = 7 snapshot terakhir. */
export function seriHarian(h: HasilPool, set: Pengaturan, r: Rentang, anggotaId: string | null = null): Seri {
  const c: KonteksSeri = { h, anggota: [], snaps: [], permintaan: [], arus: [], titik: [], sekarang: Infinity, set };
  const titik = titikHarian(c, anggotaId);
  const jenis = anggotaId ? "saya" : "pool";
  if (!titik.length) return { jenis, titik, awal: 0 };
  const mulai = tanggalAwalRentang(titik[titik.length - 1].waktu.slice(0, 10), r);
  const awal = mulai ? Math.max(0, titik.findIndex((p) => p.waktu.slice(0, 10) >= mulai)) : 0;
  return { jenis, titik, awal };
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
