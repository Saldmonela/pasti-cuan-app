package id.pasticuan.wallet.domain.engine

import id.pasticuan.wallet.domain.model.ArahArus
import id.pasticuan.wallet.domain.model.ArusOnchain
import id.pasticuan.wallet.domain.model.Jenis
import id.pasticuan.wallet.domain.model.Permintaan
import id.pasticuan.wallet.domain.model.Snapshot
import id.pasticuan.wallet.domain.model.StatusArus
import id.pasticuan.wallet.domain.model.StatusPermintaan
import id.pasticuan.wallet.domain.model.TitikNilai
import id.pasticuan.wallet.domain.util.Formatters
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.double
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.long
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToLong
import kotlin.math.sin

class OnchainSimulator(hargaPasarJson: String) {

    companion object {
        const val MENIT = 60_000L
        const val ALAMAT_POOL = "By6HpsukcTeVsV6FyBzhQJ2nzdHP46kXaSPtrCGUzoaR"
        const val PROGRAM_DLMM = "LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo"
        const val PORSI_ESTIMASI = 0.5

        val T0: Long = Formatters.ms("2026-11-14T08:00:00+07:00")
        val MULAI_BACA: Long = T0
        val T_SWAP: Long = Formatters.ms("2026-11-15T08:38:00+07:00")
        val T_1303: Long = Formatters.ms("2026-11-15T13:03:00+07:00")
        val AKHIR: Long = Formatters.ms("2026-11-16T23:59:00+07:00")

        private const val HARGA_1303 = 70.49
        private const val SOL_1303 = (1171.81 - 0.001) / HARGA_1303
        private const val KELUAR_SOL = 10.7416 + 0.1
        private const val PORSI_DOGE = 0.8

        private val PASANGAN = listOf(
            Triple(
                Formatters.ms("2026-10-16T20:20:00+07:00"),
                Formatters.ms("2026-10-22T10:47:00+07:00"),
                "pepe"
            ),
            Triple(
                Formatters.ms("2026-10-22T10:51:00+07:00"),
                Long.MAX_VALUE,
                "doge"
            )
        )

        data class TransferMentah(
            val token: String,
            val jumlah: Double,
            val hargaUsd: Double,
            val dari: String,
            val ke: String
        )

        data class TxMentah(
            val signature: String,
            val waktu: String,
            val program: List<String>,
            val swap: Boolean = false,
            val transfer: List<TransferMentah>
        )

        val TX_CONTOH: List<TxMentah> = listOf(
            TxMentah(
                signature = "4sWpSwap15Nov0838",
                waktu = "2026-11-15T08:38:00+07:00",
                program = listOf("JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4"),
                swap = true,
                transfer = listOf(
                    TransferMentah("SOL", 10.7416, 68.1, ALAMAT_POOL, "JupiterVault"),
                    TransferMentah("USDC", 731.51, 1.0, "JupiterVault", ALAMAT_POOL)
                )
            ),
            TxMentah(
                signature = "2kRbDlmmRebalance15Nov",
                waktu = "2026-11-15T09:12:00+07:00",
                program = listOf(PROGRAM_DLMM),
                transfer = listOf(TransferMentah("SOL", 3.2, 68.9, ALAMAT_POOL, "DlmmReserve"))
            ),
            TxMentah(
                signature = "5HqTarikRezki1Usdc1004",
                waktu = "2026-11-15T10:04:00+07:00",
                program = listOf("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
                transfer = listOf(TransferMentah("USDC", 1.0, 1.0, ALAMAT_POOL, "Chtm91xf…"))
            ),
            TxMentah(
                signature = "3NvTarikRezki730Usdc1005",
                waktu = "2026-11-15T10:05:00+07:00",
                program = listOf("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
                transfer = listOf(TransferMentah("USDC", 730.51, 1.0, ALAMAT_POOL, "Chtm91xf…"))
            ),
            TxMentah(
                signature = "61xKirimSol01DqZ3_1022",
                waktu = "2026-11-15T10:22:00+07:00",
                program = listOf("11111111111111111111111111111111"),
                transfer = listOf(TransferMentah("SOL", 0.1, 69.6, ALAMAT_POOL, "DqZ3Dn1V…"))
            ),
            TxMentah(
                signature = "2aDustMasuk0001Usdc1147",
                waktu = "2026-11-15T11:47:00+07:00",
                program = listOf("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
                transfer = listOf(TransferMentah("USDC", 0.001, 1.0, "BkdHEdNX…", ALAMAT_POOL))
            ),
            TxMentah(
                signature = "4cContohSetorHafiz1306",
                waktu = "2026-11-15T13:06:00+07:00",
                program = listOf("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
                transfer = listOf(TransferMentah("USDC", 150.0, 1.0, "Hfz7cOnToH…", ALAMAT_POOL))
            )
        )

        fun deteksiArus(
            txList: List<TxMentah> = TX_CONTOH,
            alamatPool: String = ALAMAT_POOL,
            ambangDustUsd: Double = 1.0
        ): List<ArusOnchain> {
            val hasil = mutableListOf<ArusOnchain>()
            for (t in txList) {
                if (t.swap || t.program.contains(PROGRAM_DLMM)) continue
                t.transfer.forEachIndexed { urutan, x ->
                    val masuk = x.ke == alamatPool
                    if (!masuk && x.dari != alamatPool) return@forEachIndexed
                    val nilaiUsd = (x.jumlah * x.hargaUsd * 100.0).roundToLong() / 100.0
                    val dust = x.jumlah * x.hargaUsd < ambangDustUsd
                    hasil.add(
                        ArusOnchain(
                            id = "${t.signature.take(8)}-$urutan",
                            signature = t.signature,
                            urutan = urutan,
                            waktu = t.waktu,
                            arah = if (masuk) ArahArus.MASUK else ArahArus.KELUAR,
                            token = x.token,
                            simbol = x.token,
                            jumlah = x.jumlah,
                            nilaiUsd = nilaiUsd,
                            alamatLawan = if (masuk) x.dari else x.ke,
                            status = if (dust) StatusArus.BUKAN_ARUS else StatusArus.BELUM,
                            catatan = if (dust) "dust otomatis" else null,
                            ditandaiOleh = if (dust) "sistem" else null,
                            ditandaiPada = if (dust) t.waktu else null
                        )
                    )
                }
            }
            return hasil
        }

        fun titikTerakhir(titik: List<TitikNilai>, t: Long): TitikNilai? {
            var lo = 0
            var hi = titik.size - 1
            var hasil: TitikNilai? = null
            while (lo <= hi) {
                val mid = (lo + hi) ushr 1
                if (titik[mid].ms <= t) {
                    hasil = titik[mid]
                    lo = mid + 1
                } else {
                    hi = mid - 1
                }
            }
            return hasil
        }

        fun titikSnapshot(titik: List<TitikNilai>, tanggal: String, jam: String = "08:00"): TitikNilai? {
            val mulai = Formatters.msSnapshot(tanggal, jam)
            return titik.firstOrNull { it.ms in mulai..(mulai + 30 * MENIT) }
        }
    }

    private val pasar: Map<String, List<Pair<Long, Double>>>

    init {
        val root = Json.parseToJsonElement(hargaPasarJson).jsonObject
        pasar = mapOf("sol", "doge", "pepe").let { keys ->
            keys.associateWith { k ->
                root[k]!!.jsonArray.map { pair ->
                    val arr = pair.jsonArray
                    arr[0].jsonPrimitive.long to arr[1].jsonPrimitive.double
                }
            }
        }
    }

    private fun <T> mapOf(vararg items: T): List<T> = items.toList()

    fun hargaToken(token: String, t: Long): Double {
        val d = pasar[token] ?: error("Token tidak dikenal: $token")
        if (t <= d.first().first) return d.first().second
        if (t >= d.last().first) return d.last().second
        var lo = 0
        var hi = d.size - 1
        while (hi - lo > 1) {
            val mid = (lo + hi) ushr 1
            if (d[mid].first <= t) lo = mid else hi = mid
        }
        val (t1, p1) = d[lo]
        val (t2, p2) = d[hi]
        return p1 + ((p2 - p1) * (t - t1).toDouble()) / (t2 - t1).toDouble()
    }

    fun hargaPasar(t: Long): Double = hargaToken("sol", t)

    private fun rasio(token: String, t: Long): Double =
        hargaToken(token, t) / hargaToken("sol", t)

    private fun pasanganDi(t: Long): String? =
        PASANGAN.firstOrNull { t >= it.first && t <= it.second }?.third

    private fun riak(m: Double): Double =
        0.0022 * sin(m / 53.0) + 0.0012 * sin(m / 17.0 + 1.0) + 0.0006 * sin(m / 5.3 + 2.0)

    private fun noise(m: Double): Double = riak(m) - riak(0.0)

    private val m1303 = (T_1303 - T0).toDouble() / MENIT
    private val koreksi1303 by lazy {
        HARGA_1303 / (hargaPasar(T_1303) * (1.0 + noise(m1303)))
    }

    fun harga(t: Long): Double {
        val m = (t - T0).toDouble() / MENIT
        val k = 1.0 + (koreksi1303 - 1.0) * min(1.0, max(0.0, m / m1303))
        return hargaPasar(t) * (1.0 + noise(m)) * k
    }

    private fun rasioMenit(t: Long): Double {
        val m = (t - T0).toDouble() / MENIT
        return rasio("doge", t) * (1.0 + 0.0004 * sin(m / 7.3 + 0.5) + 0.0003 * sin(m / 23.0 + 2.0) - 0.0004 * sin(0.5) - 0.0003 * sin(2.0))
    }

    private val s0 by lazy { 2076.53 / hargaPasar(T0) }
    private val k1303 by lazy {
        val posisi1303 = s0 * (1.0 + PORSI_DOGE * (rasioMenit(T_1303) / rasioMenit(T0) - 1.0))
        (SOL_1303 + KELUAR_SOL) / posisi1303
    }

    private fun posisiSol(t: Long): Double {
        val m = (t - T0).toDouble() / MENIT
        val k = 1.0 + (k1303 - 1.0) * min(1.0, max(0.0, m / m1303))
        return s0 * (1.0 + PORSI_DOGE * (rasioMenit(t) / rasioMenit(T0) - 1.0)) * k
    }

    private fun kepemilikan(t: Long): Pair<Double, Double> {
        var sol = posisiSol(t)
        var usdc = 0.0
        if (t >= T_SWAP) {
            sol -= 10.7416
            usdc += 731.51
        }
        for (x in TX_CONTOH) {
            if (x.swap || x.program.contains(PROGRAM_DLMM) || Formatters.ms(x.waktu) > t) continue
            for (tr in x.transfer) {
                val sign = if (tr.ke == ALAMAT_POOL) 1.0 else -1.0
                if (tr.token == "SOL") sol += sign * tr.jumlah
                else usdc += sign * tr.jumlah
            }
        }
        return sol to usdc
    }

    private var cacheTitik: List<TitikNilai>? = null

    fun semuaTitik(): List<TitikNilai> {
        cacheTitik?.let { return it }
        val out = mutableListOf<TitikNilai>()
        val wajib = setOf(
            T0,
            T_1303,
            Formatters.ms("2026-11-15T08:00:00+07:00"),
            Formatters.ms("2026-11-16T08:00:00+07:00")
        )
        var idSeq = 10_000L
        var t = T0
        while (t <= AKHIR) {
            val m = (t - T0) / MENIT
            if (t !in wajib && (m * 7919L) % 211L == 0L) {
                t += MENIT
                continue
            }
            val h = harga(t)
            val (sol, usdc) = kepemilikan(t)
            val nilaiUsd = ((sol * h + usdc) * 100.0).roundToLong() / 100.0
            out.add(TitikNilai(id = idSeq++, ms = t, nilaiUsd = nilaiUsd, saldoSol = nilaiUsd / h, harga = h, estimasi = false))
            t += MENIT
        }
        cacheTitik = out
        return out
    }

    fun titikEstimasi(
        snapshots: List<Snapshot>,
        permintaan: List<Permintaan>,
        sampai: Long = MULAI_BACA,
        jam: String = "08:00",
        w: Double = PORSI_ESTIMASI
    ): List<TitikNilai> {
        val snaps = snapshots.sortedBy { it.tanggal }.filter { Formatters.msSnapshot(it.tanggal, jam) <= sampai }
        val jamMs = 60 * MENIT

        fun arusHari(tgl: String): Double =
            permintaan
                .filter { it.status == StatusPermintaan.SELESAI && it.tanggalEfektif == tgl }
                .sumOf { (if (it.jenis == Jenis.SETOR) 1.0 else -1.0) * (it.jumlahFinalUsd ?: it.jumlahUsd) }

        fun faktorPasar(ta: Long, tb: Long): Map<Long, Double> {
            val m = HashMap<Long, Double>()
            var kunci: String? = null
            var tAnchor = ta
            var mAnchor = 1.0
            var mSebelum = 1.0
            var t = ta
            while (t <= tb) {
                val pas = pasanganDi(t)
                if (pas != kunci) {
                    kunci = pas
                    tAnchor = t
                    mAnchor = mSebelum
                }
                val v = if (pas != null) mAnchor * (1.0 + w * (rasio(pas, t) / rasio(pas, tAnchor) - 1.0)) else mAnchor
                m[t] = v
                mSebelum = v
                t += jamMs
            }
            return m
        }

        val out = mutableListOf<TitikNilai>()
        var estId = 1L
        for (i in snaps.indices) {
            val a = snaps[i]
            val ta = Formatters.msSnapshot(a.tanggal, jam)
            val b = snaps.getOrNull(i + 1)
            val tbPenuh = if (b != null) Formatters.msSnapshot(b.tanggal, jam) else ta + jamMs
            val tb = min(tbPenuh, sampai)
            val solA = a.saldoSol
            val mMap = faktorPasar(ta, tbPenuh)
            val solB = if (b != null) {
                b.saldoSol - arusHari(b.tanggal) / (b.nilaiUsd / b.saldoSol)
            } else {
                solA * (mMap[tbPenuh] ?: 1.0)
            }
            val kB = solB / (solA * (mMap[tbPenuh] ?: 1.0))
            var t = ta
            while (t < tb) {
                val denom = if (tbPenuh - ta != 0L) (tbPenuh - ta).toDouble() else 1.0
                val k = 1.0 + ((kB - 1.0) * (t - ta).toDouble()) / denom
                val sol = solA * (mMap[t] ?: 1.0) * k
                val h = if (t == ta) a.nilaiUsd / a.saldoSol else hargaPasar(t)
                val nilaiUsd = (sol * h * 100.0).roundToLong() / 100.0
                out.add(TitikNilai(id = estId++, ms = t, nilaiUsd = nilaiUsd, saldoSol = nilaiUsd / h, harga = h, estimasi = true))
                t += jamMs
            }
        }
        return out
    }
}
