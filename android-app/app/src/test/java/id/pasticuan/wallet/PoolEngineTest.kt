package id.pasticuan.wallet

import id.pasticuan.wallet.domain.engine.OnchainSimulator
import id.pasticuan.wallet.domain.engine.PoolEngine
import id.pasticuan.wallet.domain.engine.SeedData
import id.pasticuan.wallet.domain.model.ArahArus
import id.pasticuan.wallet.domain.model.ArusOnchain
import id.pasticuan.wallet.domain.model.Jenis
import id.pasticuan.wallet.domain.model.Permintaan
import id.pasticuan.wallet.domain.model.Rentang
import id.pasticuan.wallet.domain.model.Satuan
import id.pasticuan.wallet.domain.model.StatusArus
import id.pasticuan.wallet.domain.model.StatusPermintaan
import id.pasticuan.wallet.domain.util.Formatters
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

class PoolEngineTest {

    private fun loadHargaPasarJson(): String {
        val candidates = listOf(
            File("src/main/assets/harga_pasar.json"),
            File("app/src/main/assets/harga_pasar.json")
        )
        val file = candidates.firstOrNull { it.exists() }
            ?: error("harga_pasar.json tidak ditemukan di ${File(".").absolutePath}")
        return file.readText()
    }

    @Test
    fun goldenTest14Nov2026Parity() {
        val sim = OnchainSimulator(loadHargaPasarJson())
        val seed = SeedData.buatDataAwal(sim)
        val snaps14Nov = seed.snapshots.filter { it.tanggal <= "2026-11-14" }

        val h = PoolEngine.hitungPool(
            anggota = seed.anggota,
            snapshots = snaps14Nov,
            permintaan = seed.permintaan,
            set = seed.pengaturan,
            arus = emptyList()
        )

        assertTrue("Semua invarian harus lolos: ${h.cek.penyebab}", h.cek.lolos)
        assertEquals("2026-11-14", h.tanggalData)

        val posById = h.posisi.associateBy { it.id }
        assertEquals(155.71, posById.getValue("faiz").netUsd, 0.01)
        assertEquals(155.71, posById.getValue("luqman").netUsd, 0.01)
        assertEquals(827.45, posById.getValue("rezki").netUsd, 0.01)
        assertEquals(813.74, posById.getValue("salman").netUsd, 0.01)
        assertEquals(97.38, posById.getValue("hafiz").netUsd, 0.01)
        assertEquals(0.0, posById.getValue("hafiz").feeUsd, 0.001)
        assertEquals(26.54, h.pengelola.feeTerutangTotal, 0.01)

        val totalRekonsiliasi = h.posisi.sumOf { it.netUsd } + h.pengelola.feeTerutangTotal
        assertEquals(2076.53, totalRekonsiliasi, 0.01)

        // Simulasi penarikan sebagian Rezki US$50,00 sesuai Golden Test PRD BR-24
        val tarikRezki50 = PoolEngine.simulasiTarik(h, "rezki", 50.0, seed.pengaturan)
        assertEquals(0.86, tarikRezki50.feeDibayar, 0.01)
        assertEquals(657.70, tarikRezki50.sisaModalUsd, 0.01)
        assertEquals(777.45, tarikRezki50.sisaNetUsd, 0.01)
    }

    @Test
    fun adaptiveRentangAndTransferTimeSettlement() {
        val sim = OnchainSimulator(loadHargaPasarJson())
        val seed = SeedData.buatDataAwal(sim)
        val semuaTitik = sim.titikEstimasi(seed.snapshots, seed.permintaan) + sim.semuaTitik()

        // Salman punya >1 setoran selesai -> ada opsi Setoran Terakhir
        val opsiSalman = PoolEngine.opsiRentang(seed.permintaan, "salman")
        assertTrue(Rentang.SETORAN_TERAKHIR in opsiSalman)

        // Hafiz baru punya 1 setoran selesai -> belum ada opsi Setoran Terakhir
        val opsiHafiz = PoolEngine.opsiRentang(seed.permintaan, "hafiz")
        assertFalse(Rentang.SETORAN_TERAKHIR in opsiHafiz)

        // Simulasikan pencocokan transfer 150 USDC Hafiz pada waktu transfer 13:06 WIB (BR-18)
        val arusHafiz = seed.arus.first { it.signature == "4cContohSetorHafiz1306" }
        val msTransfer = Formatters.ms(arusHafiz.waktu)
        val titikAcuan = OnchainSimulator.titikTerakhir(semuaTitik.filter { !it.estimasi }, msTransfer)!!

        val updatedArus = seed.arus.map {
            if (it.id == arusHafiz.id) it.copy(status = StatusArus.DICOCOKKAN, permintaanId = "p01") else it
        }
        val updatedPermintaan = seed.permintaan.map {
            if (it.id == "p01") {
                it.copy(
                    status = StatusPermintaan.SELESAI,
                    waktuEfektif = arusHafiz.waktu,
                    titikNilaiId = titikAcuan.id,
                    jumlahFinalUsd = arusHafiz.nilaiUsd
                )
            } else it
        }

        val hasilSetelahCocok = PoolEngine.hitungPool(
            anggota = seed.anggota,
            snapshots = seed.snapshots,
            permintaan = updatedPermintaan,
            set = seed.pengaturan,
            arus = updatedArus,
            titikReferensi = semuaTitik
        )

        val hafiz = hasilSetelahCocok.posisi.first { it.id == "hafiz" }
        assertEquals(250.0, hafiz.modalUsd, 0.01)
        // Kini Hafiz punya 2 setoran selesai -> opsi Setoran Terakhir otomatis muncul!
        assertTrue(Rentang.SETORAN_TERAKHIR in PoolEngine.opsiRentang(updatedPermintaan, "hafiz"))
    }

    private fun tarikRezki14Nov(jumlah: Double) = Permintaan(
        id = "xrezki",
        anggotaId = "rezki",
        jenis = Jenis.TARIK,
        jumlahUsd = jumlah,
        status = StatusPermintaan.SELESAI,
        tanggalEfektif = "2026-11-14",
        jumlahFinalUsd = jumlah,
        dibuatPada = "2026-11-14T10:00:00+07:00"
    )

    @Test
    fun gantiSatuanFeeKeSolSesudahTarikSemuaJadiKurangFeeBukanCekGagal() {
        val seed = SeedData.buatDataAwal(OnchainSimulator(loadHargaPasarJson()))
        val snaps = seed.snapshots.filter { it.tanggal <= "2026-11-14" }
        val sol = seed.pengaturan.copy(satuanDasarFee = Satuan.SOL)
        val rezki = PoolEngine.hitungPool(seed.anggota, snaps, seed.permintaan, seed.pengaturan).posisi.first { it.id == "rezki" }
        val feeSol = PoolEngine.hitungPool(seed.anggota, snaps, seed.permintaan, sol).posisi.first { it.id == "rezki" }.feeUsd
        val akhir = snaps.last()
        val sisa = akhir.nilaiUsd - rezki.netUsd
        val snapsSesudah = snaps.dropLast(1) + akhir.copy(nilaiUsd = sisa, saldoSol = akhir.saldoSol * sisa / akhir.nilaiUsd)

        val h = PoolEngine.hitungPool(seed.anggota, snapsSesudah, seed.permintaan + tarikRezki14Nov(rezki.netUsd), sol)

        assertTrue(feeSol > rezki.feeUsd + 1)
        assertTrue("Cek harus lolos: ${h.cek.penyebab}", h.cek.lolos)
        assertEquals(1, h.lebihBayar.size)
        assertEquals("xrezki", h.lebihBayar[0].permintaanId)
        assertEquals("2026-11-14", h.lebihBayar[0].tanggal)
        assertEquals(feeSol - rezki.feeUsd, h.lebihBayar[0].kurangFeeUsd, 0.01)
        assertEquals(rezki.feeUsd, h.pengelola.nilaiUnitFeeUsd, 0.01)
    }

    @Test
    fun penarikanMelebihiNilaiKotorTetapMembuatCekGagal() {
        val seed = SeedData.buatDataAwal(OnchainSimulator(loadHargaPasarJson()))
        val snaps = seed.snapshots.filter { it.tanggal <= "2026-11-14" }
        val rezki = PoolEngine.hitungPool(seed.anggota, snaps, seed.permintaan, seed.pengaturan).posisi.first { it.id == "rezki" }
        val jumlah = rezki.grossUsd + 10
        val snapsSesudah = snaps.dropLast(1) + snaps.last().copy(nilaiUsd = snaps.last().nilaiUsd - jumlah)

        val h = PoolEngine.hitungPool(seed.anggota, snapsSesudah, seed.permintaan + tarikRezki14Nov(jumlah), seed.pengaturan)

        assertFalse(h.cek.lolos)
        assertTrue(h.cek.penyebab.contains("Penarikan Rezki 2026-11-14 melebihi nilai bersihnya."))
        assertEquals(rezki.feeUsd, h.lebihBayar[0].kurangFeeUsd, 0.01)
    }

    @Test
    fun hadiahRewardTidakDinetralkanDanMenambahNilaiPool() {
        val sim = OnchainSimulator(loadHargaPasarJson())
        val seed = SeedData.buatDataAwal(sim)
        val semuaTitik = sim.titikEstimasi(seed.snapshots, seed.permintaan) + sim.semuaTitik()
        val sekarang = Formatters.ms("2026-11-15T14:30:00+07:00")
        val arusReward = ArusOnchain(
            id = "a_reward_meteora",
            signature = "5iuJRewardMeteora",
            urutan = 0,
            waktu = "2026-11-15T10:07:00+07:00",
            arah = ArahArus.MASUK,
            token = "USDC",
            simbol = "USDC",
            jumlah = 1.79,
            nilaiUsd = 1.79,
            alamatLawan = "OmniBridge",
            status = StatusArus.BELUM
        )
        val resmiSebelum = PoolEngine.hitungPool(seed.anggota, seed.snapshots, seed.permintaan, seed.pengaturan, seed.arus + arusReward, semuaTitik)
        val liveSebelum = PoolEngine.terapkanLive(resmiSebelum, seed.anggota, seed.snapshots, seed.arus + arusReward, semuaTitik, sekarang, seed.pengaturan).live!!

        val arusSesudah = seed.arus + arusReward.copy(status = StatusArus.HADIAH, catatan = "Reward Meteora")
        val resmiSesudah = PoolEngine.hitungPool(seed.anggota, seed.snapshots, seed.permintaan, seed.pengaturan, arusSesudah, semuaTitik)
        val liveSesudah = PoolEngine.terapkanLive(resmiSesudah, seed.anggota, seed.snapshots, arusSesudah, semuaTitik, sekarang, seed.pengaturan).live!!

        assertEquals(1.79, liveSesudah.nilaiUsd - liveSebelum.nilaiUsd, 0.005)
        assertEquals(1.79, liveSesudah.arusDinetralkanUsd - liveSebelum.arusDinetralkanUsd, 0.005)
    }

    @Test
    fun formattersFollowIndonesianAndMinusRules() {
        assertEquals("US$2.076,53", Formatters.usd(2076.53))
        assertEquals("−US$12,34", Formatters.usd(-12.34))
        assertEquals("+14,25%", Formatters.persenBertanda(14.25))
        assertEquals("−2,62%", Formatters.persenBertanda(-2.62))
        assertTrue(Formatters.isSolanaAddress("By6HpsukcTeVsV6FyBzhQJ2nzdHP46kXaSPtrCGUzoaR"))
        assertFalse(Formatters.isSolanaAddress("0xInvalidEthAddress"))
    }
}
