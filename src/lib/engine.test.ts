// Golden test dan skenario dari PRD Section 3.3 "Rencana Uji". Toleransi +/- $0,01.
import { describe, expect, it } from "vitest";
import { hitungPool, kumulatif, seriHarian, seriRentang, simulasiTarik, terapkanLive, untungRugi } from "./engine";
import {
  ALAMAT_POOL,
  deteksiArus,
  HARGA_15NOV,
  hargaPasar,
  ms,
  msSnapshot,
  MULAI_BACA,
  nilaiPool,
  nilaiPosisi,
  pasanganDi,
  POSISI_15NOV,
  rasio,
  RINCIAN_1303,
  semuaTitik,
  titikEstimasi,
  titikSnapshot,
  titikTerakhir,
  TX_CONTOH,
} from "./onchain";
import { contohCsv, pratinjau } from "./csv";
import { dataAwal, snapshotOtomatis, WAKTU_AWAL } from "./seed";
import type { DataPool, Permintaan } from "./types";

const near = (a: number, b: number, tol = 0.01) => expect(Math.abs(a - b)).toBeLessThanOrEqual(tol + 1e-9);

function hitung(d: DataPool) {
  return hitungPool(d.anggota, d.snapshots, d.permintaan, d.pengaturan);
}
/** Data riwayat impor sampai 14 Nov 2026 (sebelum pembacaan otomatis). */
function sampai14(): DataPool {
  const d = dataAwal();
  return { ...d, snapshots: d.snapshots.filter((s) => s.tanggal <= "2026-11-14"), arus: [] };
}
const pos = (h: ReturnType<typeof hitung>, id: string) => h.posisi.find((p) => p.id === id)!;

describe("golden test Tracker_LP_v3 per 14 Nov 2026", () => {
  const h = hitung(sampai14());

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
    const set = sampai14().pengaturan;
    near(untungRugi(seriHarian(h, set, "Semua"), "USD").jumlah, 251.53);
    near(untungRugi(seriHarian(h, set, "7H"), "USD").jumlah, -286.71);
    const salman = untungRugi(seriHarian(h, set, "Semua", "salman"), "USD");
    near(salman.jumlah, -11.26);
    near(salman.persen, -1.36, 0.005);
    near(untungRugi(seriHarian(h, set, "7H", "salman"), "USD").jumlah, -110.5);
    const rezki = untungRugi(seriHarian(h, set, "Semua", "rezki"), "USD");
    near(rezki.jumlah, 127.45);
    near(rezki.persen, 18.21, 0.005);
  });

  it("saldo SOL snapshot dihitung dari harga pasar CoinGecko 08.00 WIB (US-06 v1.3)", () => {
    near(h.pool.harga, 77.66, 0.005);
  });
});

describe("skenario tarik (BR-06)", () => {
  it("simulasi Rezki tarik $50", () => {
    const d = sampai14();
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
    const d = sampai14();
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
    const d = sampai14();
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
    const d = sampai14();
    const sim = simulasiTarik(hitung(d), "salman", 100, d.pengaturan);
    expect(sim.feeDibayar).toBe(0);
  });
});

// ---------- pembacaan onchain (PRD v1.1, 15 Nov 2026) ----------

const SEKARANG = ms(WAKTU_AWAL);

function konteks(d: DataPool, sekarang = SEKARANG) {
  const arus = d.arus.filter((a) => ms(a.waktu) <= sekarang);
  const est = d.estimasi ? titikEstimasi(d.snapshots.filter((x) => x.sumber === "impor"), d.permintaan, MULAI_BACA) : [];
  const titik = [...est.filter((t) => t.ms < MULAI_BACA), ...semuaTitik()].filter((t) => t.ms <= sekarang);
  const resmi = hitungPool(d.anggota, d.snapshots, d.permintaan, d.pengaturan, arus);
  const tampil = terapkanLive(resmi, d.anggota, d.snapshots, arus, titik, sekarang, d.pengaturan);
  return { resmi, tampil, c: { h: resmi, anggota: d.anggota, snaps: d.snapshots, permintaan: d.permintaan, arus, titik, sekarang, set: d.pengaturan } };
}

describe("valuasi wallet (BR-17)", () => {
  it("fixture 15 Nov 2026 13.03 WIB = $1.171,81, token tanpa harga = $0", () => {
    const v = nilaiPool(RINCIAN_1303, { ambangLikuiditasTokenUsd: 10000 });
    near(v.nilaiUsd, 1171.81, 0.005);
    near(v.saldoSol, 1171.81 / 70.49, 0.0001);
    const tanpaSpam = { ...RINCIAN_1303, token: RINCIAN_1303.token.filter((t) => t.hargaUsd) };
    near(nilaiPool(tanpaSpam, { ambangLikuiditasTokenUsd: 10000 }).nilaiUsd, v.nilaiUsd, 1e-9);
  });

  it("titik nilai 13.03 WIB sama dengan fixture", () => {
    near(titikTerakhir(semuaTitik(), SEKARANG)!.nilaiUsd, 1171.81, 0.005);
  });
});

describe("deteksi arus (BR-19)", () => {
  const arus = deteksiArus(TX_CONTOH, ALAMAT_POOL, { ambangDustUsd: 1 });
  it("swap dan transaksi DLMM bukan arus", () => {
    expect(arus.some((a) => a.signature.includes("Swap") || a.signature.includes("Dlmm"))).toBe(false);
  });
  it("1 + 730,51 USDC ke Chtm91xf… = 2 arus keluar, total $731,51", () => {
    const rezki = arus.filter((a) => a.alamatLawan === "Chtm91xf…");
    expect(rezki).toHaveLength(2);
    expect(rezki.every((a) => a.arah === "keluar" && a.status === "belum")).toBe(true);
    near(rezki.reduce((t, a) => t + a.nilaiUsd, 0), 731.51);
  });
  it("0,001 USDC masuk = dust, bukan arus otomatis; 0,1 SOL keluar perlu ditandai", () => {
    const dust = arus.find((a) => a.alamatLawan === "BkdHEdNX…")!;
    expect(dust.status).toBe("bukan_arus");
    expect(dust.catatan).toBe("dust otomatis");
    const sol = arus.find((a) => a.token === "SOL")!;
    expect(sol.arah).toBe("keluar");
    expect(sol.status).toBe("belum");
  });
});

describe("nilai live dan penetralan (BR-19)", () => {
  it("penarikan Rezki 10.05 tidak menurunkan NAV live; tanpa penetralan pool turun sekitar 38%", () => {
    const { tampil } = konteks(dataAwal());
    const live = tampil.live!;
    expect(live.snapshot).toBe("2026-11-15");
    near(live.nilaiMentahUsd, 1171.81, 0.005);
    const sol = dataAwal().arus.find((a) => a.token === "SOL")!;
    near(live.arusDinetralkanUsd, 731.51 + sol.nilaiUsd);
    const snap15 = dataAwal().snapshots.find((x) => x.tanggal === "2026-11-15")!;
    const turunMentah = 1 - live.nilaiMentahUsd / snap15.nilaiUsd;
    expect(turunMentah).toBeGreaterThan(0.37);
    expect(turunMentah).toBeLessThan(0.41);
    // NAV live hanya bergerak sesuai pasar
    const sebelum = konteks(dataAwal(), ms("2026-11-15T10:03:00+07:00")).tampil.live!;
    const sesudah = konteks(dataAwal(), ms("2026-11-15T10:06:00+07:00")).tampil.live!;
    expect(Math.abs(sesudah.nav / sebelum.nav - 1)).toBeLessThan(0.01);
  });

  it("biaya pool tidak dinetralkan", () => {
    const d = dataAwal();
    const a = d.arus.find((x) => x.token === "SOL")!;
    a.status = "biaya";
    const live = konteks(d).tampil.live!;
    near(live.arusDinetralkanUsd, 731.51);
  });

  it("rekonsiliasi: total anggota = nilai disesuaikan; dikurangi yang belum diproses = isi wallet", () => {
    const { tampil } = konteks(dataAwal());
    const total = tampil.posisi.reduce((t, p) => t + p.netUsd, 0) + tampil.pengelola.feeTerutangTotal;
    near(total, tampil.live!.nilaiUsd);
    near(total - tampil.live!.arusDinetralkanUsd, tampil.live!.nilaiMentahUsd);
  });
});

describe("snapshot otomatis (BR-18) dan cek BR-12 (e)", () => {
  it("titik 08.00 menjadi snapshot otomatis; tanpa titik 08.00-08.30 tidak ada snapshot", () => {
    const s = snapshotOtomatis("2026-11-16")!;
    expect(s.sumber).toBe("otomatis");
    near(s.nilaiUsd, semuaTitik().find((t) => t.ms === ms("2026-11-16T08:00:00+07:00"))!.nilaiUsd);
    const gagal = semuaTitik().filter((t) => t.ms < ms("2026-11-16T08:00:00+07:00") || t.ms > ms("2026-11-16T08:30:00+07:00"));
    expect(titikSnapshot(gagal, "2026-11-16")).toBeNull();
  });

  it("arus belum dicocokkan sebelum snapshot resmi membuat cek gagal", () => {
    const d = dataAwal();
    d.snapshots.push(snapshotOtomatis("2026-11-16")!);
    const { resmi } = konteks(d, ms("2026-11-16T08:00:00+07:00"));
    expect(resmi.cek.lolos).toBe(false);
    expect(resmi.cek.penyebab.join(" ")).toContain("transfer di wallet yang belum dicatat");
  });
});

describe("grafik rentang pendek (BR-21)", () => {
  it("24J: maksimal 289 titik per 5 menit; grafik pool = isi wallet, penarikan terlihat tapi bukan rugi", () => {
    const { c } = konteks(dataAwal());
    const s = seriRentang(c, "24J");
    expect(s.titik.length).toBeLessThanOrEqual(289);
    expect(s.titik.length).toBeGreaterThan(280);
    // titik terakhir = isi wallet (sama dengan Jupiter), bukan nilai disesuaikan
    near(s.titik.at(-1)!.usd, 1171.81, 0.005);
    // isi wallet memang turun saat Rezki menarik
    const turun = s.titik.some((p, i) => i > 0 && p.usd / s.titik[i - 1].usd - 1 < -0.3);
    expect(turun).toBe(true);
    // untung/rugi rentang tidak menghitung penarikan sebagai rugi
    const rr = untungRugi(s, "USD");
    expect(Math.abs(rr.jumlah)).toBeLessThan(s.titik[s.awal - 1].usd * 0.1);
  });

  it("transfer 10.04 dan 10.05 WIB menjadi satu penanda, berapa pun jam sekarang", () => {
    for (const menit of [0, 1, 2, 3, 4, 7]) {
      const { c } = konteks(dataAwal(), SEKARANG + menit * 60_000);
      const s = seriRentang(c, "24J");
      expect(s.titik.length).toBeLessThanOrEqual(289);
      const bertanda = s.titik.filter((p) => p.transaksi.some((t) => t.nama === "Belum dicocokkan" && t.jenis === "tarik" && t.jumlahUsd >= 1));
      const tarik = bertanda.filter((p) => p.transaksi.some((t) => t.jumlahUsd > 700));
      expect(tarik).toHaveLength(1);
      near(tarik[0].transaksi.find((t) => t.jumlahUsd > 700)!.jumlahUsd, 731.51);
    }
  });

  it("mode Bandingkan: persen USD dan SOL mulai 0% dan tidak melompat saat penarikan (BR-22)", () => {
    const { c } = konteks(dataAwal());
    const s = seriRentang(c, "24J");
    const k = kumulatif(s);
    expect(k[s.awal - 1].persenUsd).toBe(0);
    expect(k[s.awal - 1].persenSol).toBe(0);
    for (let i = s.awal + 1; i < k.length; i++) {
      expect(Math.abs(k[i].persenUsd - k[i - 1].persenUsd)).toBeLessThan(2);
      expect(Math.abs(k[i].persenSol - k[i - 1].persenSol)).toBeLessThan(2);
    }
    // persen di ujung garis sama dengan persen mode USD/SOL biasa
    near(k.at(-1)!.persenUsd, untungRugi(s, "USD").persen, 1e-9);
    near(k.at(-1)!.persenSol, untungRugi(s, "SOL").persen, 1e-9);
  });

  it("transaksi efektif di snapshot berikutnya diakui sebagai arus, bukan untung/rugi", () => {
    const d = dataAwal();
    d.snapshots.push(snapshotOtomatis("2026-11-16")!);
    for (const a of d.arus) if (a.alamatLawan === "Chtm91xf…") Object.assign(a, { status: "dicocokkan", permintaanId: "p03" });
    for (const a of d.arus) if (a.token === "SOL") a.status = "biaya";
    for (const a of d.arus) if (a.alamatLawan === "Hfz7cOnToH…") Object.assign(a, { status: "dicocokkan", permintaanId: "p01" });
    for (const p of d.permintaan) {
      if (p.id === "p03" || p.id === "p01") Object.assign(p, { status: "selesai", tanggalEfektif: "2026-11-16", jumlahFinalUsd: p.jumlahUsd });
    }
    const { c, resmi } = konteks(d, ms("2026-11-16T08:30:00+07:00"));
    expect(resmi.cek.lolos).toBe(true);
    const s = seriRentang(c, "24J");
    const rr = untungRugi(s, "USD");
    const awal = s.titik[s.awal - 1].usd;
    // pasar bergerak beberapa persen; tanpa pengakuan arus, untung/rugi akan sekitar -$581
    expect(Math.abs(rr.jumlah)).toBeLessThan(awal * 0.05);
  });
});

describe("impor dengan harga SOL pasar (US-06 v1.3)", () => {
  const d = dataAwal();
  const c = contohCsv();
  const pv = pratinjau(c.snapshot, c.transaksi, d.anggota, d.pengaturan, "galih");

  it("5 baris diberi peringatan, 25 lolos, saldo SOL disimpan dari harga pasar", () => {
    expect(pv.kesalahan).toHaveLength(0);
    expect(pv.peringatan).toHaveLength(5);
    const tgl = pv.peringatan.map((x) => x.match(/\((\d+ \w+ 2026)\)/)![1]);
    expect(tgl).toEqual(["31 Okt 2026", "4 Nov 2026", "5 Nov 2026", "8 Nov 2026", "13 Nov 2026"]);
    const disimpan = Object.fromEntries(pv.snapshots.map((x) => [x.tanggal, x.saldoSol]));
    near(disimpan["2026-10-31"], 12.8002, 0.0001);
    near(disimpan["2026-11-04"], 15.4679, 0.0001);
    near(disimpan["2026-11-05"], 14.7609, 0.0001);
    near(disimpan["2026-11-08"], 24.1867, 0.0001);
    near(disimpan["2026-11-13"], 26.1305, 0.0001);
  });

  it("pesan peringatan 8 Nov sesuai PRD", () => {
    expect(pv.peringatan[3]).toBe(
      "Baris 24 (8 Nov 2026): harga SOL turunan US$133,96, harga pasar US$89,35 (selisih 49,9%). Saldo SOL disimpan 24,1867 (dari harga pasar), bukan 16,1325. Cek apakah tanggal setoran sama di kedua file.",
    );
  });

  it("harga pasar 16 Okt 08.00 WIB cocok dengan snapshot", () => {
    near(hargaPasar(msSnapshot("2026-10-16")), 105.34, 0.1);
  });

  it("harga pasar gagal: SOL dari Laporan Harian, tanpa estimasi", () => {
    const g = pratinjau(c.snapshot, c.transaksi, d.anggota, d.pengaturan, "galih", { pasarGagal: true });
    expect(g.estimasi).toBe(0);
    expect(g.peringatan[0]).toContain("tidak bisa diambil");
    near(g.snapshots.find((x) => x.tanggal === "2026-11-08")!.saldoSol, 16.132547, 1e-6);
  });
});

describe("titik estimasi riwayat (BR-24)", () => {
  const d = dataAwal();
  const impor = d.snapshots.filter((x) => x.sumber === "impor");
  const est = titikEstimasi(impor, d.permintaan, MULAI_BACA);

  it("sekitar 700 titik per jam, berhenti sebelum pembacaan otomatis", () => {
    expect(est.length).toBeGreaterThan(690);
    expect(est.length).toBeLessThan(730);
    expect(est.every((t) => t.estimasi && t.ms < MULAI_BACA)).toBe(true);
  });

  it("titik 08.00 WIB tiap tanggal sama dengan snapshot", () => {
    for (const s of impor.filter((x) => msSnapshot(x.tanggal) < MULAI_BACA)) {
      const t = est.find((x) => x.ms === msSnapshot(s.tanggal))!;
      near(t.nilaiUsd, s.nilaiUsd, 0.01);
    }
  });

  it("setoran 8 Nov tampil sebagai satu lompatan tepat di 8 Nov 08.00 WIB", () => {
    const jam8 = msSnapshot("2026-11-08");
    const sebelum = est.find((x) => x.ms === jam8 - 3600_000)!;
    const pada = est.find((x) => x.ms === jam8)!;
    const setor = 525 + 200;
    // lompatan sebesar setoran, sisanya gerak pasar 1 jam
    expect(Math.abs(pada.nilaiUsd - sebelum.nilaiUsd - setor)).toBeLessThan(sebelum.nilaiUsd * 0.03);
    // jam-jam sebelumnya tidak ikut naik karena setoran
    const duaJam = est.find((x) => x.ms === jam8 - 2 * 3600_000)!;
    expect(Math.abs(sebelum.nilaiUsd / duaJam.nilaiUsd - 1)).toBeLessThan(0.03);
  });

  it("estimasi tidak mengubah angka resmi", () => {
    const tanpa = konteks({ ...dataAwal(), estimasi: false }).tampil;
    const dengan = konteks(dataAwal()).tampil;
    near(dengan.posisi.find((p) => p.id === "salman")!.netUsd, tanpa.posisi.find((p) => p.id === "salman")!.netUsd, 1e-9);
  });
});

describe("kerapatan grafik (BR-21 v1.3)", () => {
  const { c } = konteks(dataAwal());
  it("24J <= 288, 7H <= 336, 30H <= 360, Semua <= 365 titik (+1 pembanding)", () => {
    const n = (r: "24J" | "7H" | "30H" | "Semua") => seriRentang(c, r).titik.length;
    expect(n("24J")).toBeLessThanOrEqual(289);
    expect(n("7H")).toBeLessThanOrEqual(337);
    // bagian riwayat 7H hanya punya titik estimasi per jam (BR-24), jadi baru 336 setelah seminggu data asli
    expect(n("7H")).toBeGreaterThan(190);
    expect(n("30H")).toBeLessThanOrEqual(361);
    expect(n("30H")).toBeGreaterThan(340);
    expect(n("Semua")).toBeLessThanOrEqual(365);
    expect(n("Semua")).toBeGreaterThan(300);
  });

  it("riwayat sebelum pembacaan otomatis memakai titik estimasi", () => {
    const s = seriRentang(c, "30H");
    expect(s.titik.some((p) => p.estimasi)).toBe(true);
    expect(s.titik.at(-1)!.estimasi).toBe(false);
    expect(s.estimasiSampai).toBe(MULAI_BACA);
  });

  it("tanpa estimasi, 7H memakai snapshot harian + 1 titik nilai di ujung", () => {
    const t = konteks({ ...dataAwal(), estimasi: false }).c;
    const s = seriRentang(t, "7H");
    expect(s.titik.filter((p) => !p.harian)).toHaveLength(1);
  });

  it("Semua mulai dari 0: setoran awal tidak terbaca sebagai untung", () => {
    const s = seriRentang(c, "Semua");
    const k = kumulatif(s);
    // titik pertama 16 Okt 08.00: nilai $397,76 setelah setoran $400
    near(k[0].ruUsd, 397.76 - 400, 0.01);
  });
});

describe("valuasi jumlah token x harga (BR-17 v1.4)", () => {
  it("fixture posisi 15 Nov: nilai = jumlah x harga Jupiter, dihitung ulang", () => {
    const v = nilaiPosisi(POSISI_15NOV, HARGA_15NOV);
    near(v.dlmmUsd, 938.13 + 235.54);
    near(v.feeUsd, 0.20699 * HARGA_15NOV.DOGE + 0.002972 * HARGA_15NOV.SOL);
    near(v.saldoSol, (v.dlmmUsd + v.feeUsd) / HARGA_15NOV.SOL, 1e-9);
  });

  it("harga SOL berubah, harga DOGE tetap: saldo SOL hanya bergerak sebesar efek DOGE/SOL, tidak ikut bergerak palsu", () => {
    const d = HARGA_15NOV.DOGE;
    const a = nilaiPosisi(POSISI_15NOV, { DOGE: d, SOL: 72 });
    const b = nilaiPosisi(POSISI_15NOV, { DOGE: d, SOL: 72.5 });
    const doge = POSISI_15NOV[0].jumlahX + POSISI_15NOV[0].feeX;
    near(b.saldoSol - a.saldoSol, doge * d * (1 / 72.5 - 1 / 72), 1e-9);
    // cara lama: USD Meteora tertahan dibagi harga SOL baru, SOL ikut bergeser walau token di posisi tidak berubah
    const lama = (a.dlmmUsd + a.feeUsd) / 72.5 - a.saldoSol;
    expect(Math.abs(b.saldoSol - a.saldoSol)).toBeLessThan(Math.abs(lama));
  });
});

describe("data contoh memodelkan posisi DOGE/SOL (Rencana Uji v1.4)", () => {
  const sampai = ms("2026-11-15T08:30:00+07:00");
  const jam = semuaTitik().filter((t) => t.ms < sampai && (t.ms / 60_000) % 60 === 0);
  const gerak = (a: number[]) => a.slice(1).reduce((t, v, i) => t + Math.abs(v / a[i] - 1), 0) / (a.length - 1);

  it("nilai pool dalam SOL bergerak 0,1-0,25% per jam, 3-5 kali lebih kecil dari USD", () => {
    const sol = gerak(jam.map((t) => t.saldoSol));
    const usd = gerak(jam.map((t) => t.nilaiUsd));
    expect(sol).toBeGreaterThan(0.001);
    expect(sol).toBeLessThan(0.0025);
    expect(usd / sol).toBeGreaterThan(3);
    expect(usd / sol).toBeLessThan(5);
  });

  it("grafik SOL 24J milik Salman tidak punya patahan tajam", () => {
    const { c } = konteks(dataAwal());
    const s = seriRentang(c, "24J", "salman");
    for (let i = 1; i < s.titik.length; i++) expect(Math.abs(s.titik[i].sol / s.titik[i - 1].sol - 1)).toBeLessThan(0.005);
  });
});

describe("estimasi mengikuti harga token pasangan (BR-24 v1.4)", () => {
  const d = dataAwal();
  const est = titikEstimasi(d.snapshots.filter((x) => x.sumber === "impor"), d.permintaan, MULAI_BACA);

  it("token pasangan per periode dari riwayat posisi Meteora (OQ-15)", () => {
    expect(pasanganDi(ms("2026-10-16T12:00:00+07:00"))).toBeNull();
    expect(pasanganDi(ms("2026-10-18T12:00:00+07:00"))).toBe("pepe");
    expect(pasanganDi(ms("2026-10-25T12:00:00+07:00"))).toBe("doge");
  });

  it("garis SOL bukan garis lurus: perubahan per jam mengikuti DOGE/SOL dengan porsi 0,5", () => {
    const a = d.snapshots.find((x) => x.tanggal === "2026-11-01")!;
    const ta = msSnapshot("2026-11-01");
    const tb = msSnapshot("2026-11-02");
    const seg = est.filter((t) => t.ms >= ta && t.ms < tb);
    const solB = d.snapshots.find((x) => x.tanggal === "2026-11-02")!.saldoSol;
    const mB = 1 + 0.5 * (rasio("doge", tb) / rasio("doge", ta) - 1);
    const kB = solB / (a.saldoSol * mB);
    for (const t of seg) {
      const k = 1 + ((kB - 1) * (t.ms - ta)) / (tb - ta);
      const harap = a.saldoSol * (1 + 0.5 * (rasio("doge", t.ms) / rasio("doge", ta) - 1)) * k;
      near(t.saldoSol, harap, 0.0005);
    }
    const langkah = seg.slice(1).map((t, i) => t.saldoSol - seg[i].saldoSol);
    const rata = langkah.reduce((x, y) => x + y, 0) / langkah.length;
    const sd = Math.sqrt(langkah.reduce((x, y) => x + (y - rata) ** 2, 0) / langkah.length);
    expect(sd).toBeGreaterThan(0.001); // garis lurus = sd 0
  });

  it("periode tanpa posisi (16 Okt sebelum 20.20) tetap garis lurus", () => {
    const ta = msSnapshot("2026-10-16");
    const seg = est.filter((t) => t.ms >= ta && t.ms < ms("2026-10-16T20:00:00+07:00"));
    const langkah = seg.slice(1).map((t, i) => t.saldoSol - seg[i].saldoSol);
    for (const l of langkah) near(l, langkah[0], 1e-4);
  });
});
