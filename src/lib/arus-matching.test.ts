import { describe, expect, it } from "vitest";
import {
  batasMenitSebelumTransfer,
  cariSaranArus,
  deteksiDeltaTx,
  ekstrakAlamatLawan,
  pilihAnggotaAwal,
  pilihPermintaanAwal,
  SOL_MINT_ADDR,
  USDC_MINT_ADDR,
  validasiTanggalEfektifManual,
  type ParsedSolanaTx,
} from "./arus-matching";
import { hitungPool, terapkanLive } from "./engine";
import { ALAMAT_POOL, ms } from "./onchain";
import { dataAwal } from "./seed";
import type { Anggota, ArusOnchain, Permintaan } from "./types";

const SALMAN_WALLET = "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU";
const SALMAN_USDC_ATA = "9pQ4rS7vW3xY6zA1bC5dE8fG2hJ4kLmN8pQ4rS7vW3xY";

const ANGGOTA: Anggota[] = [
  { id: "salman", nama: "Salman", email: "salman@example.com", peran: "investor", aktif: true, dibuatPada: "2026-10-16T08:00:00+07:00" },
  {
    id: "rezki",
    nama: "Rezki",
    email: "rezki@example.com",
    peran: "investor",
    aktif: true,
    alamatWallet: ["Chtm91xf8K2mN9pQ4rS7vW3xY6zA1bC5dE8fG2hJ4kLm"],
    dibuatPada: "2026-10-16T08:00:00+07:00",
  },
  { id: "galih", nama: "Galih", email: "galih@example.com", peran: "pengelola", aktif: true, dibuatPada: "2026-10-16T08:00:00+07:00" },
];

describe("pencocokan arus onchain (US-13)", () => {
  it("menyarankan penarikan lewat permintaan.alamatWalletTujuan meski anggota.alamatWallet kosong", () => {
    const req: Permintaan = {
      id: "p_salman",
      anggotaId: "salman",
      jenis: "tarik",
      jumlahUsd: 100,
      alamatWalletTujuan: SALMAN_WALLET,
      status: "menunggu",
      sumber: "app",
      dibuatPada: "2026-11-20T10:00:00+07:00",
    };
    const arus: ArusOnchain = {
      id: "a_1",
      signature: "sig_salman_1",
      urutan: 0,
      waktu: "2026-11-20T10:05:00+07:00",
      arah: "keluar",
      token: USDC_MINT_ADDR,
      simbol: "USDC",
      jumlah: 95, // selisih 5% (> 2%) tapi alamat tujuan sama
      nilaiUsd: 95,
      alamatLawan: SALMAN_WALLET,
      status: "belum",
    };

    const saran = cariSaranArus(arus, [req], ANGGOTA, 2, [arus]);
    expect(saran).toHaveLength(1);
    expect(saran[0].p.id).toBe("p_salman");
    expect(saran[0].alasan).toBe("alamat tujuan sama");
    expect(pilihPermintaanAwal(arus, [req], ANGGOTA, 2, [arus])).toBe("p_salman");
    expect(pilihAnggotaAwal(arus, [req], ANGGOTA)).toBe("salman");
  });

  it("memilih otomatis permintaan tunggal searah walau tidak ada saran (alamat beda & selisih > 2%)", () => {
    const req: Permintaan = {
      id: "p_salman_only",
      anggotaId: "salman",
      jenis: "tarik",
      jumlahUsd: 200,
      status: "menunggu",
      sumber: "app",
      dibuatPada: "2026-11-20T10:00:00+07:00",
    };
    const arus: ArusOnchain = {
      id: "a_diff",
      signature: "sig_diff",
      urutan: 0,
      waktu: "2026-11-20T10:05:00+07:00",
      arah: "keluar",
      token: USDC_MINT_ADDR,
      simbol: "USDC",
      jumlah: 180,
      nilaiUsd: 180,
      alamatLawan: "AlamatExchangeLain11111111111111111111111111",
      status: "belum",
    };

    expect(cariSaranArus(arus, [req], ANGGOTA, 2, [arus])).toHaveLength(0);
    // Tetap auto-select agar tombol Cocokkan langsung siap dipakai
    expect(pilihPermintaanAwal(arus, [req], ANGGOTA, 2, [arus])).toBe("p_salman_only");
  });

  it("menyarankan penarikan lewat total gabungan transfer (mis. tes US$1 + sisa) walau wallet belum terdaftar", () => {
    const req: Permintaan = {
      id: "p_split",
      anggotaId: "salman",
      jenis: "tarik",
      jumlahUsd: 150,
      status: "menunggu",
      sumber: "app",
      dibuatPada: "2026-11-20T10:00:00+07:00",
    };
    const a1: ArusOnchain = {
      id: "a_tes",
      signature: "sig_tes",
      urutan: 0,
      waktu: "2026-11-20T10:04:00+07:00",
      arah: "keluar",
      token: USDC_MINT_ADDR,
      simbol: "USDC",
      jumlah: 1,
      nilaiUsd: 1,
      alamatLawan: SALMAN_WALLET,
      status: "belum",
    };
    const a2: ArusOnchain = {
      id: "a_sisa",
      signature: "sig_sisa",
      urutan: 0,
      waktu: "2026-11-20T10:05:00+07:00",
      arah: "keluar",
      token: USDC_MINT_ADDR,
      simbol: "USDC",
      jumlah: 149,
      nilaiUsd: 149,
      alamatLawan: SALMAN_WALLET,
      status: "belum",
    };

    const saran = cariSaranArus(a1, [req], ANGGOTA, 2, [a1, a2]);
    expect(saran).toHaveLength(1);
    expect(saran[0].alasan).toBe("total gabungan transfer cocok");
  });

  it("tidak mencocokkan arah transfer yang berlawanan (masuk vs tarik)", () => {
    const reqTarik: Permintaan = {
      id: "p_tarik",
      anggotaId: "salman",
      jenis: "tarik",
      jumlahUsd: 100,
      alamatWalletTujuan: SALMAN_WALLET,
      status: "menunggu",
      sumber: "app",
      dibuatPada: "2026-11-20T10:00:00+07:00",
    };
    const arusMasuk: ArusOnchain = {
      id: "a_in",
      signature: "sig_in",
      urutan: 0,
      waktu: "2026-11-20T10:05:00+07:00",
      arah: "masuk",
      token: USDC_MINT_ADDR,
      simbol: "USDC",
      jumlah: 100,
      nilaiUsd: 100,
      alamatLawan: SALMAN_WALLET,
      status: "belum",
    };
    expect(cariSaranArus(arusMasuk, [reqTarik], ANGGOTA, 2, [arusMasuk])).toHaveLength(0);
    expect(pilihPermintaanAwal(arusMasuk, [reqTarik], ANGGOTA, 2, [arusMasuk])).toBe("");
  });
});

describe("parsing transaksi Solana (baca-wallet)", () => {
  it("mengambil alamat wallet pemilik (owner) untuk transfer USDC keluar, bukan ATA", () => {
    const txUsdcKeluar: ParsedSolanaTx = {
      blockTime: 1795150000,
      meta: {
        err: null,
        fee: 5000,
        preBalances: [1_000_000_000, 2_039_280],
        postBalances: [999_995_000, 2_039_280],
        preTokenBalances: [
          { accountIndex: 1, mint: USDC_MINT_ADDR, owner: ALAMAT_POOL, uiTokenAmount: { uiAmountString: "200" } },
          { accountIndex: 2, mint: USDC_MINT_ADDR, owner: SALMAN_WALLET, uiTokenAmount: { uiAmountString: "10" } },
        ],
        postTokenBalances: [
          { accountIndex: 1, mint: USDC_MINT_ADDR, owner: ALAMAT_POOL, uiTokenAmount: { uiAmountString: "100" } },
          { accountIndex: 2, mint: USDC_MINT_ADDR, owner: SALMAN_WALLET, uiTokenAmount: { uiAmountString: "110" } },
        ],
      },
      transaction: {
        message: {
          accountKeys: [ALAMAT_POOL, "PoolUsdcATA", SALMAN_USDC_ATA],
          instructions: [
            {
              programId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
              parsed: {
                type: "transferChecked",
                info: { source: "PoolUsdcATA", destination: SALMAN_USDC_ATA, authority: ALAMAT_POOL },
              },
            },
          ],
        },
      },
    };

    expect(ekstrakAlamatLawan(txUsdcKeluar, ALAMAT_POOL, "keluar", USDC_MINT_ADDR)).toBe(SALMAN_WALLET);
    const arus = deteksiDeltaTx(txUsdcKeluar, ALAMAT_POOL, 75, {}, 1);
    expect(arus).toHaveLength(1);
    expect(arus[0]).toMatchObject({
      arah: "keluar",
      mint: USDC_MINT_ADDR,
      jumlah: 100,
      nilaiUsd: 100,
      alamatLawan: SALMAN_WALLET,
      isDust: false,
    });
  });

  it("tidak mengabaikan penarikan penuh USDC yang menutup ATA dan menerima refund rent ~0,002 SOL", () => {
    const txCloseAta: ParsedSolanaTx = {
      blockTime: 1795150000,
      meta: {
        err: null,
        fee: 5000,
        // Wallet dapat kembali 2_039_280 lamports (0.00203928 SOL = ~$0.15 < $1 dust) dari closeAccount
        preBalances: [1_000_000_000],
        postBalances: [1_002_034_280],
        preTokenBalances: [
          { accountIndex: 1, mint: USDC_MINT_ADDR, owner: ALAMAT_POOL, uiTokenAmount: { uiAmountString: "100" } },
        ],
        postTokenBalances: [
          { accountIndex: 2, mint: USDC_MINT_ADDR, owner: SALMAN_WALLET, uiTokenAmount: { uiAmountString: "100" } },
        ],
      },
      transaction: {
        message: {
          accountKeys: [ALAMAT_POOL, "PoolUsdcATA", SALMAN_USDC_ATA],
          instructions: [],
        },
      },
    };

    const arus = deteksiDeltaTx(txCloseAta, ALAMAT_POOL, 75, {}, 1);
    const usdcOut = arus.find((a) => a.mint === USDC_MINT_ADDR);
    const solRent = arus.find((a) => a.mint === SOL_MINT_ADDR);
    expect(usdcOut).toBeDefined();
    expect(usdcOut?.arah).toBe("keluar");
    expect(usdcOut?.nilaiUsd).toBe(100);
    expect(usdcOut?.isDust).toBe(false);
    expect(usdcOut?.alamatLawan).toBe(SALMAN_WALLET);
    expect(solRent?.isDust).toBe(true);
  });

  it("tetap mengabaikan swap asli (masuk & keluar sama-sama non-dust)", () => {
    const txSwap: ParsedSolanaTx = {
      blockTime: 1795150000,
      meta: {
        err: null,
        fee: 5000,
        preBalances: [10_000_000_000],
        postBalances: [8_999_995_000], // keluar 1 SOL ($75)
        preTokenBalances: [
          { accountIndex: 1, mint: USDC_MINT_ADDR, owner: ALAMAT_POOL, uiTokenAmount: { uiAmountString: "0" } },
        ],
        postTokenBalances: [
          { accountIndex: 1, mint: USDC_MINT_ADDR, owner: ALAMAT_POOL, uiTokenAmount: { uiAmountString: "75" } },
        ],
      },
      transaction: {
        message: {
          accountKeys: [ALAMAT_POOL, "PoolUsdcATA"],
          instructions: [],
        },
      },
    };

    expect(deteksiDeltaTx(txSwap, ALAMAT_POOL, 75, {}, 1)).toEqual([]);
  });
});

describe("batas menit titik acuan & alur penuh tarik -> cocokkan -> selesai", () => {
  it("batasMenitSebelumTransfer memotong ke awal menit agar titik post-transfer di menit yang sama tidak terpilih", () => {
    expect(batasMenitSebelumTransfer("2026-11-20T04:30:15.000Z")).toBe("2026-11-20T04:30:00.000Z");
    expect(batasMenitSebelumTransfer("2026-11-20T11:30:45+07:00")).toBe("2026-11-20T04:30:00.000Z");
  });

  it("alur penuh: Salman tarik penuh -> dicocokkan pakai titik sebelum menit transfer -> unit 0 & invarian lolos", () => {
    const d = dataAwal();
    const snaps14 = d.snapshots.filter((s) => s.tanggal <= "2026-11-14");
    const hAwal = hitungPool(d.anggota, snaps14, d.permintaan, d.pengaturan, [], []);
    const salmanAwal = hAwal.posisi.find((p) => p.id === "salman")!;
    const jumlahTarik = Math.floor(salmanAwal.netUsd * 100) / 100;

    // 1. Transfer terjadi di 14 Nov 10:30:15 WIB.
    //    Titik 10:29:00 = pra-transfer ($2076.53).
    //    Titik 10:30:00 = pembacaan 10:30:40 yang dibulatkan ke :00 (sudah terpotong penarikan Salman!).
    const tTransfer = "2026-11-14T10:30:15+07:00";
    const titik = [
      { id: 501, ms: ms("2026-11-14T10:29:00+07:00"), nilaiUsd: 2076.53, saldoSol: 27.4395, harga: 75.6766 },
      { id: 502, ms: ms("2026-11-14T10:30:00+07:00"), nilaiUsd: 2076.53 - jumlahTarik, saldoSol: (2076.53 - jumlahTarik) / 75.6766, harga: 75.6766 },
      { id: 503, ms: ms("2026-11-14T11:00:00+07:00"), nilaiUsd: 2076.53 - jumlahTarik, saldoSol: (2076.53 - jumlahTarik) / 75.6766, harga: 75.6766 },
    ];

    // Pilih titik dengan < batasMenitSebelumTransfer(tTransfer) -> pasti memilih id 501 (10:29:00), bukan 502!
    const batasMs = ms(batasMenitSebelumTransfer(tTransfer));
    const titikTerpilih = [...titik].reverse().find((t) => t.ms < batasMs)!;
    expect(titikTerpilih.id).toBe(501);

    const permSalman: Permintaan = {
      id: "p_salman_full",
      anggotaId: "salman",
      jenis: "tarik",
      jumlahUsd: jumlahTarik,
      alamatWalletTujuan: SALMAN_WALLET,
      status: "selesai",
      waktuEfektif: tTransfer,
      titikNilaiId: titikTerpilih.id,
      jumlahFinalUsd: jumlahTarik,
      sumber: "app",
      dibuatPada: "2026-11-14T10:00:00+07:00",
    };
    const arusSalman: ArusOnchain = {
      id: "ar_salman_full",
      signature: "sig_salman_full",
      urutan: 0,
      waktu: tTransfer,
      arah: "keluar",
      token: USDC_MINT_ADDR,
      simbol: "USDC",
      jumlah: jumlahTarik,
      nilaiUsd: jumlahTarik,
      alamatLawan: SALMAN_WALLET,
      status: "dicocokkan",
      permintaanId: permSalman.id,
    };

    const resmi = hitungPool(d.anggota, snaps14, [...d.permintaan, permSalman], d.pengaturan, [arusSalman], titik);
    expect(resmi.cek.lolos).toBe(true);
    const salmanAkhir = resmi.posisi.find((p) => p.id === "salman")!;
    expect(salmanAkhir.netUsd).toBeLessThan(0.02);

    const live = terapkanLive(resmi, d.anggota, snaps14, [arusSalman], titik, ms("2026-11-14T11:05:00+07:00"), d.pengaturan);
    expect(live.live?.arusDinetralkanUsd).toBe(0);
    expect(Math.abs(live.pool.nilaiUsd - (2076.53 - jumlahTarik))).toBeLessThan(0.02);
  });

  it("validasiTanggalEfektifManual menolak penarikan manual memakai snapshot sebelum penarikan diajukan", () => {
    // Kasus nyata 20 Nov 2026: pengajuan tarik 09.13 WIB tidak boleh memakai snapshot pagi 08.00 WIB
    const msg = validasiTanggalEfektifManual(
      { jenis: "tarik", dibuatPada: "2026-11-20T02:13:01+00:00" },
      "2026-11-20",
      "08:00",
    );
    expect(msg).toContain("sebelum penarikan diajukan");
    expect(msg).toContain("Arus onchain");

    // Snapshot besoknya (21 Nov 08.00 WIB) diizinkan
    expect(
      validasiTanggalEfektifManual({ jenis: "tarik", dibuatPada: "2026-11-20T02:13:01+00:00" }, "2026-11-21", "08:00"),
    ).toBeNull();

    // Penarikan diajukan 07.30 WIB boleh memakai snapshot hari sama 08.00 WIB
    expect(
      validasiTanggalEfektifManual({ jenis: "tarik", dibuatPada: "2026-11-20T07:30:00+07:00" }, "2026-11-20", "08:00"),
    ).toBeNull();

    // Setoran tidak boleh efektif sebelum tanggal transfernya, tapi boleh di tanggal transfernya
    expect(
      validasiTanggalEfektifManual(
        { jenis: "setor", dibuatPada: "2026-11-20T09:00:00+07:00", tanggalTransfer: "2026-11-20" },
        "2026-11-19",
        "08:00",
      ),
    ).toContain("sebelum tanggal transfer");
    expect(
      validasiTanggalEfektifManual(
        { jenis: "setor", dibuatPada: "2026-11-20T09:00:00+07:00", tanggalTransfer: "2026-11-20" },
        "2026-11-20",
        "08:00",
      ),
    ).toBeNull();
  });
});
