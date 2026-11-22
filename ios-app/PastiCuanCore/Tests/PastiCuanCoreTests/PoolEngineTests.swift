import XCTest
@testable import PastiCuanCore

/// Paritas android-app/app/src/test/.../PoolEngineTest.kt: angka emas yang sama harus keluar di iOS.
final class PoolEngineTests: XCTestCase {

    private func seed() throws -> (OnchainSimulator, DataPool) {
        let sim = try OnchainSimulator()
        return (sim, SeedData.buatDataAwal(sim))
    }

    func testGolden14Nov2026Parity() throws {
        let (_, data) = try seed()
        let snaps = data.snapshots.filter { $0.tanggal <= "2026-11-14" }
        let h = PoolEngine.hitungPool(anggota: data.anggota, snapshots: snaps, permintaan: data.permintaan, set: data.pengaturan)

        XCTAssertTrue(h.cek.lolos, "Semua invarian harus lolos: \(h.cek.penyebab)")
        XCTAssertEqual(h.tanggalData, "2026-11-14")
        let pos = Dictionary(uniqueKeysWithValues: h.posisi.map { ($0.id, $0) })
        XCTAssertEqual(pos["faiz"]!.netUsd, 155.71, accuracy: 0.01)
        XCTAssertEqual(pos["luqman"]!.netUsd, 155.71, accuracy: 0.01)
        XCTAssertEqual(pos["rezki"]!.netUsd, 827.45, accuracy: 0.01)
        XCTAssertEqual(pos["salman"]!.netUsd, 813.74, accuracy: 0.01)
        XCTAssertEqual(pos["hafiz"]!.netUsd, 97.38, accuracy: 0.01)
        XCTAssertEqual(pos["hafiz"]!.feeUsd, 0, accuracy: 0.001)
        XCTAssertEqual(h.pengelola.feeTerutangTotal, 26.54, accuracy: 0.01)
        XCTAssertEqual(h.posisi.reduce(0) { $0 + $1.netUsd } + h.pengelola.feeTerutangTotal, 2076.53, accuracy: 0.01)

        let tarik = PoolEngine.simulasiTarik(h, "rezki", 50, data.pengaturan)
        XCTAssertEqual(tarik.feeDibayar, 0.86, accuracy: 0.01)
        XCTAssertEqual(tarik.sisaModalUsd, 657.70, accuracy: 0.01)
        XCTAssertEqual(tarik.sisaNetUsd, 777.45, accuracy: 0.01)
    }

    func testAdaptiveRentangAndTransferTimeSettlement() throws {
        let (sim, data) = try seed()
        let semuaTitik = sim.titikEstimasi(data.snapshots, data.permintaan) + sim.semuaTitik()

        XCTAssertTrue(PoolEngine.opsiRentang(data.permintaan, "salman").contains(.setoranTerakhir))
        XCTAssertFalse(PoolEngine.opsiRentang(data.permintaan, "hafiz").contains(.setoranTerakhir))

        let arusHafiz = data.arus.first { $0.signature == "4cContohSetorHafiz1306" }!
        let titikAcuan = OnchainSimulator.titikTerakhir(semuaTitik.filter { !$0.estimasi }, Formatters.ms(arusHafiz.waktu))!
        let arus = data.arus.map { a -> ArusOnchain in
            var b = a
            if a.id == arusHafiz.id { b.status = .dicocokkan; b.permintaanId = "p01" }
            return b
        }
        let permintaan = data.permintaan.map { p -> Permintaan in
            var q = p
            if p.id == "p01" {
                q.status = .selesai
                q.waktuEfektif = arusHafiz.waktu
                q.titikNilaiId = titikAcuan.id
                q.jumlahFinalUsd = arusHafiz.nilaiUsd
            }
            return q
        }
        let h = PoolEngine.hitungPool(anggota: data.anggota, snapshots: data.snapshots, permintaan: permintaan,
                                      set: data.pengaturan, arus: arus, titikReferensi: semuaTitik)
        XCTAssertEqual(h.posisi.first { $0.id == "hafiz" }!.modalUsd, 250, accuracy: 0.01)
        XCTAssertTrue(PoolEngine.opsiRentang(permintaan, "hafiz").contains(.setoranTerakhir))
    }

    private func tarikRezki14Nov(_ jumlah: Double) -> Permintaan {
        Permintaan(id: "xrezki", anggotaId: "rezki", jenis: .tarik, jumlahUsd: jumlah, status: .selesai,
                   tanggalEfektif: "2026-11-14", jumlahFinalUsd: jumlah, dibuatPada: "2026-11-14T10:00:00+07:00")
    }

    func testGantiSatuanFeeKeSolSesudahTarikSemuaJadiKurangFee() throws {
        let (_, data) = try seed()
        let snaps = data.snapshots.filter { $0.tanggal <= "2026-11-14" }
        var sol = data.pengaturan
        sol.satuanDasarFee = .sol
        let rezki = PoolEngine.hitungPool(anggota: data.anggota, snapshots: snaps, permintaan: data.permintaan, set: data.pengaturan)
            .posisi.first { $0.id == "rezki" }!
        let feeSol = PoolEngine.hitungPool(anggota: data.anggota, snapshots: snaps, permintaan: data.permintaan, set: sol)
            .posisi.first { $0.id == "rezki" }!.feeUsd
        var akhir = snaps.last!
        let sisa = akhir.nilaiUsd - rezki.netUsd
        akhir.saldoSol = akhir.saldoSol * sisa / akhir.nilaiUsd
        akhir.nilaiUsd = sisa
        let h = PoolEngine.hitungPool(anggota: data.anggota, snapshots: Array(snaps.dropLast()) + [akhir],
                                      permintaan: data.permintaan + [tarikRezki14Nov(rezki.netUsd)], set: sol)

        XCTAssertTrue(feeSol > rezki.feeUsd + 1)
        XCTAssertTrue(h.cek.lolos, "Cek harus lolos: \(h.cek.penyebab)")
        XCTAssertEqual(h.lebihBayar.count, 1)
        XCTAssertEqual(h.lebihBayar.first?.permintaanId, "xrezki")
        XCTAssertEqual(h.lebihBayar.first?.tanggal, "2026-11-14")
        XCTAssertEqual(h.lebihBayar[0].kurangFeeUsd, feeSol - rezki.feeUsd, accuracy: 0.01)
        XCTAssertEqual(h.pengelola.nilaiUnitFeeUsd, rezki.feeUsd, accuracy: 0.01)
    }

    func testPenarikanMelebihiNilaiKotorTetapMembuatCekGagal() throws {
        let (_, data) = try seed()
        let snaps = data.snapshots.filter { $0.tanggal <= "2026-11-14" }
        let rezki = PoolEngine.hitungPool(anggota: data.anggota, snapshots: snaps, permintaan: data.permintaan, set: data.pengaturan)
            .posisi.first { $0.id == "rezki" }!
        let jumlah = rezki.grossUsd + 10
        var akhir = snaps.last!
        akhir.nilaiUsd -= jumlah
        let h = PoolEngine.hitungPool(anggota: data.anggota, snapshots: Array(snaps.dropLast()) + [akhir],
                                      permintaan: data.permintaan + [tarikRezki14Nov(jumlah)], set: data.pengaturan)
        XCTAssertFalse(h.cek.lolos)
        XCTAssertTrue(h.cek.penyebab.contains("Penarikan Rezki 2026-11-14 melebihi nilai bersihnya."))
        XCTAssertEqual(h.lebihBayar[0].kurangFeeUsd, rezki.feeUsd, accuracy: 0.01)
    }

    func testSeriBerandaLiveDanGrafik() throws {
        let (sim, data) = try seed()
        let titik = sim.titikEstimasi(data.snapshots, data.permintaan) + sim.semuaTitik()
        let sekarang = Formatters.ms(SeedData.waktuAwal)
        let resmi = PoolEngine.hitungPool(anggota: data.anggota, snapshots: data.snapshots, permintaan: data.permintaan,
                                          set: data.pengaturan, arus: data.arus, titikReferensi: titik)
        let h = PoolEngine.terapkanLive(resmi, anggota: data.anggota, snaps: data.snapshots, arus: data.arus,
                                        titik: titik, sekarang: sekarang, set: data.pengaturan)
        XCTAssertNotNil(h.live)
        let salman = h.posisi.first { $0.id == "salman" }!
        // Angka yang tampil di prototype web & Android (Beranda Salman, 15 Nov 2026 13.03 WIB).
        XCTAssertEqual(Formatters.usd(salman.netUsd), "US$748,59")
        XCTAssertEqual(Formatters.sol(salman.netSol), "10,6198 SOL")
        let konteks = PoolEngine.KonteksSeri(h: resmi, anggota: data.anggota, snaps: data.snapshots, permintaan: data.permintaan,
                                             arus: data.arus, titik: titik, sekarang: sekarang, set: data.pengaturan)
        for r in Rentang.allCases {
            let s = PoolEngine.seriRentang(konteks, r, anggotaId: "salman")
            XCTAssertFalse(s.titik.isEmpty, "Seri \(r.label) kosong")
        }
    }

    func testFormattersIndonesia() {
        XCTAssertEqual(Formatters.usd(2076.53), "US$2.076,53")
        XCTAssertEqual(Formatters.usd(-12.34), "\u{2212}US$12,34")
        XCTAssertEqual(Formatters.persenBertanda(14.25), "+14,25%")
        XCTAssertEqual(Formatters.persenBertanda(-2.62), "\u{2212}2,62%")
        XCTAssertTrue(Formatters.isSolanaAddress("By6HpsukcTeVsV6FyBzhQJ2nzdHP46kXaSPtrCGUzoaR"))
        XCTAssertFalse(Formatters.isSolanaAddress("0xInvalidEthAddress"))
        XCTAssertEqual(Formatters.ms("2026-11-17 01:00:00+00"), Formatters.ms("2026-11-17T08:00:00+07:00"))
        XCTAssertEqual(Formatters.isoWib(Formatters.ms("2026-11-15T06:03:00Z")), "2026-11-15T13:03:00+07:00")
        XCTAssertEqual(Formatters.waktu("2026-11-15T13:03:00+07:00"), "15 Nov 2026, 13.03 WIB")
        XCTAssertEqual(Formatters.tambahHari("2026-10-31", 1), "2026-11-01")
        XCTAssertEqual(Formatters.selisihHari("2026-10-16", "2026-11-15"), 30)
    }
}
