// Golden test dan skenario dari PRD Section 3.3 "Rencana Uji". Toleransi +/- $0,01.
import { describe, expect, it } from "vitest";
import { deretPool, deretSaya, hitungPool, simulasiTarik, untungRugiRentang } from "./engine";
import { dataAwal } from "./seed";
import type { DataPool, Permintaan } from "./types";

const near = (a: number, b: number, tol = 0.01) => expect(Math.abs(a - b)).toBeLessThanOrEqual(tol + 1e-9);

function hitung(d: DataPool) {
  return hitungPool(d.anggota, d.snapshots, d.permintaan, d.pengaturan);
}
const pos = (h: ReturnType<typeof hitung>, id: string) => h.posisi.find((p) => p.id === id)!;

describe("golden test Tracker_LP_v3 per 14 Nov 2026", () => {
  const h = hitung(dataAwal());

  it("nilai bersih tiap anggota", () => {
    near(pos(h, "faiz").netUsd, 155.71);
    near(pos(h, "luqman").netUsd, 155.71);
    near(pos(h, "rezki").netUsd, 827.45);
    near(pos(h, "salman").netUsd, 813.74);
    near(pos(h, "hafiz").netUsd, 97.38);
    near(h.pengelola.feeTerutangTotal, 26.54);
    near(h.pool.nilaiUsd, 2076.53);
  });

  it("posisi Salman sesuai AC-01-01", () => {
    const s = pos(h, "salman");
    near(s.modalUsd, 825);
    near(s.profitUsd, -11.26);
    near(s.porsi, 39.19, 0.005);
    expect(s.feeUsd).toBe(0);
    expect(s.lamaIkutHari).toBe(29);
  });

  it("total porsi 100% dan semua cek lolos", () => {
    near(h.posisi.reduce((a, p) => a + p.porsi, 0), 100, 1e-6);
    expect(h.cek.lolos).toBe(true);
  });

  it("unit setoran Rezki 18 Okt (AC-03-01)", () => {
    near(h.nav["2026-10-18"], 1.0425, 1e-6);
    near(200 / h.nav["2026-10-18"], 191.85);
  });

  it("grafik pool dan pribadi mode USD (BR-16)", () => {
    near(untungRugiRentang(deretPool(h.riwayatPool, "USD"), "Semua").jumlah, 251.53);
    near(untungRugiRentang(deretPool(h.riwayatPool, "USD"), "7H").jumlah, -286.71);
    const salman = untungRugiRentang(deretSaya(h.riwayat.salman, "USD"), "Semua");
    near(salman.jumlah, -11.26);
    near(salman.persen, -1.36, 0.005);
    near(untungRugiRentang(deretSaya(h.riwayat.salman, "USD"), "7H").jumlah, -110.5);
    const rezki = untungRugiRentang(deretSaya(h.riwayat.rezki, "USD"), "Semua");
    near(rezki.jumlah, 127.45);
    near(rezki.persen, 18.21, 0.005);
  });

  it("harga SOL turunan dari snapshot 14 Nov (AC-02-01)", () => {
    near(h.pool.harga, 75.68, 0.005);
  });
});

describe("skenario tarik (BR-06)", () => {
  it("simulasi Rezki tarik $50", () => {
    const d = dataAwal();
    const sim = simulasiTarik(hitung(d), "rezki", 50, d.pengaturan);
    near(sim.feeDibayar, 0.86);
    near(sim.sisaModalUsd, 657.7);
    near(sim.sisaNetUsd, 777.45);
  });

  const selesai = (anggotaId: string, jumlah: number): Permintaan => ({
    id: "x" + anggotaId,
    anggotaId,
    jenis: "tarik",
    jumlahUsd: jumlah,
    status: "selesai",
    tanggalEfektif: "2026-11-14",
    jumlahFinalUsd: jumlah,
    sumber: "app",
    dibuatPada: "2026-11-14T10:00:00+07:00",
  });

  it("penarikan Rezki $50 diproses: Galih dapat $0,86", () => {
    const d = dataAwal();
    d.permintaan.push(selesai("rezki", 50));
    // BR-02: saldo snapshot dicatat sesudah penarikan, jadi saldo 14 Nov berkurang $50
    d.snapshots[d.snapshots.length - 1].nilaiUsd = 2026.53;
    const h = hitung(d);
    near(h.nav["2026-11-14"], 1.619, 0.0001);
    near(pos(h, "rezki").netUsd, 777.45);
    near(pos(h, "rezki").modalUsd, 657.7);
    near(h.pengelola.nilaiUnitFeeUsd, 0.86);
    near(pos(h, "salman").netUsd, 813.74); // anggota lain tidak terpengaruh
    expect(h.cek.lolos).toBe(true);
  });

  it("tarik semua: unit, modal, porsi jadi nol dan seluruh fee pindah ke pengelola", () => {
    const d = dataAwal();
    const h0 = hitung(d);
    const rezki = pos(h0, "rezki");
    d.permintaan.push(selesai("rezki", rezki.netUsd));
    d.snapshots[d.snapshots.length - 1].nilaiUsd = 2076.53 - rezki.netUsd;
    const h = hitung(d);
    near(pos(h, "rezki").unit, 0, 1e-6);
    near(pos(h, "rezki").modalUsd, 0, 1e-6);
    near(pos(h, "rezki").porsi, 0, 1e-6);
    near(h.pengelola.nilaiUnitFeeUsd, rezki.feeUsd);
    expect(h.cek.lolos).toBe(true);
  });

  it("tarik sebagian saat rugi: fee $0", () => {
    const d = dataAwal();
    const sim = simulasiTarik(hitung(d), "salman", 100, d.pengaturan);
    expect(sim.feeDibayar).toBe(0);
  });
});
