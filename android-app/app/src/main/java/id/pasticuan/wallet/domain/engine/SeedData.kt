package id.pasticuan.wallet.domain.engine

import id.pasticuan.wallet.domain.model.Anggota
import id.pasticuan.wallet.domain.model.DataPool
import id.pasticuan.wallet.domain.model.Jenis
import id.pasticuan.wallet.domain.model.LogAudit
import id.pasticuan.wallet.domain.model.Pengaturan
import id.pasticuan.wallet.domain.model.Peran
import id.pasticuan.wallet.domain.model.Permintaan
import id.pasticuan.wallet.domain.model.Satuan
import id.pasticuan.wallet.domain.model.Snapshot
import id.pasticuan.wallet.domain.model.StatusPermintaan
import id.pasticuan.wallet.domain.model.SumberSnapshot
import id.pasticuan.wallet.domain.util.Formatters
import kotlin.math.roundToLong

object SeedData {
    const val WAKTU_AWAL = "2026-11-15T13:03:00+07:00"
    private const val MULAI = "2026-10-16"

    val NILAI_USD = listOf(
        397.76, 394.73, 617.0, 679.52, 725.59, 769.32, 760.73, 797.73, 808.25, 838.77,
        852.02, 1283.98, 1292.71, 1313.32, 1218.62, 1237.69, 1334.12, 1338.46, 1347.84, 1428.80,
        1413.06, 1378.53, 1438.24, 2161.13, 2098.78, 2132.23, 2068.38, 2058.19, 2129.94, 2076.53
    )

    private fun imporSetor(id: String, anggotaId: String, tanggal: String, jumlah: Double): Permintaan =
        Permintaan(
            id = id,
            anggotaId = anggotaId,
            jenis = Jenis.SETOR,
            jumlahUsd = jumlah,
            tanggalTransfer = tanggal,
            status = StatusPermintaan.SELESAI,
            tanggalEfektif = tanggal,
            jumlahFinalUsd = jumlah,
            sumber = "impor",
            diprosesOleh = "galih",
            diprosesPada = "2026-11-14T09:00:00+07:00",
            dibuatPada = "${tanggal}T08:00:00+07:00"
        )

    fun snapshotAwal(sim: OnchainSimulator): List<Snapshot> =
        NILAI_USD.mapIndexed { i, v ->
            val tgl = Formatters.tambahHari(MULAI, i.toLong())
            val hargaSol = sim.hargaPasar(Formatters.msSnapshot(tgl))
            val saldoSol = ((v / hargaSol) * 1e9).roundToLong() / 1e9
            Snapshot(
                tanggal = tgl,
                sumber = SumberSnapshot.IMPOR,
                nilaiUsd = v,
                saldoSol = saldoSol,
                dibuatOleh = "galih",
                dibuatPada = "${tgl}T08:00:00+07:00"
            )
        }

    fun snapshotOtomatis(sim: OnchainSimulator, tanggal: String): Snapshot? {
        val t = OnchainSimulator.titikSnapshot(sim.semuaTitik(), tanggal) ?: return null
        return Snapshot(
            tanggal = tanggal,
            sumber = SumberSnapshot.OTOMATIS,
            nilaiUsd = t.nilaiUsd,
            saldoSol = (t.saldoSol * 1e9).roundToLong() / 1e9,
            dibuatOleh = "sistem",
            dibuatPada = "${tanggal}T08:00:00+07:00"
        )
    }

    fun buatDataAwal(sim: OnchainSimulator): DataPool {
        val snaps = buildList {
            addAll(snapshotAwal(sim))
            snapshotOtomatis(sim, "2026-11-15")?.let { add(it) }
        }
        return DataPool(
            pengaturan = Pengaturan(
                namaPool = "Pasti Cuan",
                tanggalMulai = MULAI,
                feePersen = 0.10,
                satuanDasarFee = Satuan.USD,
                batasDataLamaHari = 2,
                ambangLonjakanPersen = 30.0,
                alamatWalletPool = OnchainSimulator.ALAMAT_POOL,
                jamSnapshot = "08:00",
                ambangLikuiditasTokenUsd = 10000.0,
                ambangDustUsd = 1.0,
                batasLiveLamaMenit = 15,
                toleransiCocokPersen = 2.0
            ),
            anggota = listOf(
                Anggota("salman", "Salman", "salman@example.com", Peran.INVESTOR, true, listOf("7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"), "2026-10-16T08:00:00+07:00"),
                Anggota("rezki", "Rezki", "rezki@example.com", Peran.INVESTOR, true, listOf("Chtm91xf8K2mN9pQ4rS7vW3xY6zA1bC5dE8fG2hJ4kLm"), "2026-10-16T08:00:00+07:00"),
                Anggota("faiz", "Faiz", "faiz@example.com", Peran.INVESTOR, true, emptyList(), "2026-10-16T08:00:00+07:00"),
                Anggota("luqman", "Luqman", "luqman@example.com", Peran.INVESTOR, true, emptyList(), "2026-10-16T08:00:00+07:00"),
                Anggota("hafiz", "Hafiz", "hafiz@example.com", Peran.INVESTOR, true, listOf("Hfz7cOnToH9mN2pQ5rS8vW1xY4zA7bC3dE6fG9hJ2kLp"), "2026-10-27T08:00:00+07:00"),
                Anggota("galih", "Galih", "galih@example.com", Peran.PENGELOLA, true, emptyList(), "2026-10-16T08:00:00+07:00")
            ),
            snapshots = snaps,
            arus = OnchainSimulator.deteksiArus(),
            estimasi = true,
            permintaan = listOf(
                imporSetor("t01", "faiz", "2026-10-16", 100.0),
                imporSetor("t02", "luqman", "2026-10-16", 100.0),
                imporSetor("t03", "rezki", "2026-10-16", 100.0),
                imporSetor("t04", "salman", "2026-10-16", 100.0),
                imporSetor("t05", "rezki", "2026-10-18", 200.0),
                imporSetor("t06", "salman", "2026-10-27", 200.0),
                imporSetor("t07", "hafiz", "2026-10-27", 100.0),
                imporSetor("t08", "salman", "2026-11-08", 525.0),
                imporSetor("t09", "rezki", "2026-11-08", 200.0),
                imporSetor("t10", "rezki", "2026-11-13", 200.0),
                Permintaan(
                    id = "p01",
                    anggotaId = "hafiz",
                    jenis = Jenis.SETOR,
                    jumlahUsd = 150.0,
                    tanggalTransfer = "2026-11-15",
                    buktiTransaksi = "Transfer USDC 15/11 13.00",
                    status = StatusPermintaan.MENUNGGU,
                    sumber = "app",
                    dibuatPada = "2026-11-15T13:01:00+07:00"
                ),
                Permintaan(
                    id = "p02",
                    anggotaId = "faiz",
                    jenis = Jenis.TARIK,
                    jumlahUsd = 50.0,
                    catatan = "Untuk keperluan kuliah",
                    status = StatusPermintaan.MENUNGGU,
                    sumber = "app",
                    dibuatPada = "2026-11-15T08:15:00+07:00"
                ),
                Permintaan(
                    id = "p03",
                    anggotaId = "rezki",
                    jenis = Jenis.TARIK,
                    jumlahUsd = 731.51,
                    alamatWalletTujuan = "Chtm91xf8K2mN9pQ4rS7vW3xY6zA1bC5dE8fG2hJ4kLm",
                    status = StatusPermintaan.MENUNGGU,
                    sumber = "app",
                    dibuatPada = "2026-11-15T08:20:00+07:00"
                )
            ),
            log = listOf(
                LogAudit("l05", "permintaan", "insert", "Mengajukan setoran US$150,00.", oleh = "hafiz", pada = "2026-11-15T13:01:00+07:00"),
                LogAudit("l04", "permintaan", "insert", "Mengajukan penarikan US$731,51.", oleh = "rezki", pada = "2026-11-15T08:20:00+07:00"),
                LogAudit("l03", "permintaan", "insert", "Mengajukan penarikan US$50,00.", oleh = "faiz", pada = "2026-11-15T08:15:00+07:00"),
                LogAudit("l02", "snapshot", "insert", "Snapshot otomatis 15 Nov 2026, 08.00 WIB dari pembacaan wallet.", oleh = "sistem", pada = "2026-11-15T08:00:00+07:00"),
                LogAudit("l01", "rekonstruksi", "insert", "Rekonstruksi awal riwayat pool sejak 16 Okt 2026.", oleh = "galih", pada = "2026-11-14T09:00:00+07:00")
            )
        )
    }
}
