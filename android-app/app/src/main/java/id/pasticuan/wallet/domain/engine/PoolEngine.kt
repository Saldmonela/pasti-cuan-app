package id.pasticuan.wallet.domain.engine

import id.pasticuan.wallet.domain.model.Anggota
import id.pasticuan.wallet.domain.model.ArahArus
import id.pasticuan.wallet.domain.model.ArusOnchain
import id.pasticuan.wallet.domain.model.Jenis
import id.pasticuan.wallet.domain.model.Pengaturan
import id.pasticuan.wallet.domain.model.Peran
import id.pasticuan.wallet.domain.model.Permintaan
import id.pasticuan.wallet.domain.model.Rentang
import id.pasticuan.wallet.domain.model.Satuan
import id.pasticuan.wallet.domain.model.Snapshot
import id.pasticuan.wallet.domain.model.StatusArus
import id.pasticuan.wallet.domain.model.StatusPermintaan
import id.pasticuan.wallet.domain.model.SumberSnapshot
import id.pasticuan.wallet.domain.model.TitikNilai
import id.pasticuan.wallet.domain.util.Formatters
import java.math.BigDecimal
import java.math.MathContext
import java.math.RoundingMode
import kotlin.math.ceil
import kotlin.math.floor
import kotlin.math.max

object PoolEngine {

    private val MC = MathContext(30, RoundingMode.HALF_UP)
    private val ZERO = BigDecimal.ZERO
    private val ONE = BigDecimal.ONE
    private val HUNDRED = BigDecimal(100)

    private fun D(v: Double): BigDecimal = BigDecimal.valueOf(v)

    data class TransaksiHari(
        val anggotaId: String,
        val nama: String,
        val jenis: Jenis,
        val jumlahUsd: Double
    )

    data class TitikSaya(
        val tanggal: String,
        val netUsd: Double,
        val netSol: Double,
        val harga: Double,
        val arusUsd: Double,
        val transaksi: List<TransaksiHari>
    )

    data class TitikPool(
        val tanggal: String,
        val nilaiUsd: Double,
        val saldoSol: Double,
        val harga: Double,
        val arusUsd: Double,
        val transaksi: List<TransaksiHari>
    )

    data class Posisi(
        val id: String,
        val nama: String,
        val peran: Peran,
        val aktif: Boolean,
        val unit: Double,
        val porsi: Double,
        val modalUsd: Double,
        val modalSol: Double,
        val grossUsd: Double,
        val feeUsd: Double,
        val netUsd: Double,
        val netSol: Double,
        val profitUsd: Double,
        val profitSol: Double,
        val roi: Double,
        val lamaIkutHari: Int,
        val tanggalMulai: String?,
        val punyaSetoran: Boolean
    )

    data class RingkasanPool(
        val nilaiUsd: Double,
        val saldoSol: Double,
        val harga: Double,
        val harga1Unit: Double,
        val totalUnit: Double
    )

    data class RingkasanPengelola(
        val id: String?,
        val unitFee: Double,
        val nilaiUnitFeeUsd: Double,
        val feeTerutangTotal: Double
    )

    data class CekInvarian(
        val lolos: Boolean,
        val penyebab: List<String>
    )

    data class LebihBayar(
        val permintaanId: String,
        val anggotaId: String,
        val tanggal: String,
        val kurangFeeUsd: Double
    )

    data class KondisiAnggotaSnap(
        val unit: Double,
        val modalUsd: Double,
        val modalSol: Double,
        val mulai: String?
    )

    data class Keadaan(
        val total: Double,
        val unitFee: Double,
        val anggota: Map<String, KondisiAnggotaSnap>
    )

    data class KeadaanSaat(
        val ms: Long,
        val tanggal: String,
        val total: Double,
        val unitFee: Double,
        val hargaUnit: Double,
        val anggota: Map<String, KondisiAnggotaSnap>,
        val settledIds: Set<String>
    )

    data class Live(
        val dibacaPada: String,
        val ms: Long,
        val nilaiMentahUsd: Double,
        val arusDinetralkanUsd: Double,
        val nilaiUsd: Double,
        val saldoSol: Double,
        val harga: Double,
        val nav: Double,
        val snapshot: String
    )

    data class HasilPool(
        val tanggalData: String?,
        val pool: RingkasanPool,
        val posisi: List<Posisi>,
        val pengelola: RingkasanPengelola,
        val riwayatPool: List<TitikPool>,
        val riwayat: Map<String, List<TitikSaya>>,
        val cek: CekInvarian,
        val lebihBayar: List<LebihBayar>,
        val nav: Map<String, Double>,
        val keadaan: Map<String, Keadaan>,
        val keadaanSaat: List<KeadaanSaat>,
        val live: Live?
    )

    data class TransaksiTitik(
        val nama: String,
        val jenis: Jenis,
        val jumlahUsd: Double
    )

    data class TitikSeri(
        val ms: Long,
        val waktu: String,
        val harian: Boolean,
        val estimasi: Boolean = false,
        val usd: Double,
        val sol: Double,
        val harga: Double,
        val nav: Double,
        val arusUsd: Double,
        val transaksi: List<TransaksiTitik>
    )

    data class Seri(
        val jenis: String, // "pool" | "saya"
        val titik: List<TitikSeri>,
        val awal: Int,
        val estimasiSampai: Long? = null
    )

    data class Kumulatif(
        val ruUsd: Double,
        val ruSol: Double,
        val persenUsd: Double,
        val persenSol: Double
    )

    data class Simulasi(
        val unitTerjual: Double,
        val feeDibayar: Double,
        val sisaNetUsd: Double,
        val sisaModalUsd: Double,
        val sisaPorsi: Double,
        val maksimal: Double
    )

    data class KonteksSeri(
        val h: HasilPool,
        val anggota: List<Anggota>,
        val snaps: List<Snapshot>,
        val permintaan: List<Permintaan>,
        val arus: List<ArusOnchain>,
        val titik: List<TitikNilai>,
        val sekarang: Long,
        val set: Pengaturan
    )

    private class KondisiMutable(
        var unit: BigDecimal = ZERO,
        var modalUsd: BigDecimal = ZERO,
        var modalSol: BigDecimal = ZERO,
        var mulai: String? = null
    )

    private fun feeDari(
        k: KondisiMutable,
        harga1Unit: BigDecimal,
        hargaSol: BigDecimal,
        set: Pengaturan,
        isPengelola: Boolean
    ): BigDecimal {
        if (isPengelola) return ZERO
        val pct = D(set.feePersen)
        val gross = k.unit.multiply(harga1Unit, MC)
        return if (set.satuanDasarFee == Satuan.SOL) {
            val untungSol = gross.divide(hargaSol, MC).subtract(k.modalSol, MC)
            untungSol.max(ZERO).multiply(pct, MC).multiply(hargaSol, MC)
        } else {
            gross.subtract(k.modalUsd, MC).max(ZERO).multiply(pct, MC)
        }
    }

    private fun waktuEfektifMs(p: Permintaan, jam: String = "08:00"): Long =
        if (!p.waktuEfektif.isNullOrBlank()) Formatters.ms(p.waktuEfektif)
        else Formatters.msSnapshot(p.tanggalEfektif!!, jam)

    fun transaksiSelesai(permintaan: List<Permintaan>, jam: String = "08:00"): List<Permintaan> =
        permintaan
            .filter { it.status == StatusPermintaan.SELESAI && (!it.tanggalEfektif.isNullOrBlank() || it.isOnchainTx) }
            .sortedWith { a, b ->
                val ta = waktuEfektifMs(a, jam)
                val tb = waktuEfektifMs(b, jam)
                if (ta != tb) ta.compareTo(tb) else a.dibuatPada.compareTo(b.dibuatPada)
            }

    private sealed class EngineEvent(val tMs: Long, val sortOrder: Int) {
        class Snap(tMs: Long, val snap: Snapshot) : EngineEvent(tMs, 0)
        class TxGroup(tMs: Long, val txs: MutableList<Permintaan>, val titik: TitikNilai) : EngineEvent(tMs, 1)
    }

    private fun terapkanTransaksi(
        t: Permintaan,
        navSaat: BigDecimal,
        hargaSolSaat: BigDecimal,
        tglEfektif: String,
        k: Map<String, KondisiMutable>,
        totalRef: Array<BigDecimal>,
        unitFeeRef: Array<BigDecimal>,
        idPengelola: String?,
        set: Pengaturan,
        nama: Map<String, String>,
        penyebab: MutableList<String>,
        lebihBayar: MutableList<LebihBayar>,
        arusAnggota: MutableMap<String, BigDecimal>,
        txHari: MutableList<TransaksiHari>
    ) {
        val m = k[t.anggotaId] ?: return
        val w = D(t.jumlahFinalUsd ?: t.jumlahUsd)
        txHari.add(TransaksiHari(t.anggotaId, nama[t.anggotaId] ?: t.anggotaId, t.jenis, w.toDouble()))
        if (t.jenis == Jenis.SETOR) {
            val u = w.divide(navSaat, MC)
            m.unit = m.unit.add(u, MC)
            m.modalUsd = m.modalUsd.add(w, MC)
            m.modalSol = m.modalSol.add(w.divide(hargaSolSaat, MC), MC)
            if (m.mulai == null) m.mulai = tglEfektif
            totalRef[0] = totalRef[0].add(u, MC)
            arusAnggota[t.anggotaId] = (arusAnggota[t.anggotaId] ?: ZERO).add(w, MC)
        } else {
            val isPengelola = t.anggotaId == idPengelola
            val gross = m.unit.multiply(navSaat, MC)
            val fee = feeDari(m, navSaat, hargaSolSaat, set, isPengelola)
            val n = gross.subtract(fee, MC)
            if (w > n.add(D(0.005), MC)) {
                lebihBayar.add(LebihBayar(t.id, t.anggotaId, tglEfektif, w.subtract(n, MC).min(fee).toDouble()))
                if (w > gross.add(D(0.005), MC)) {
                    penyebab.add("Penarikan ${nama[t.anggotaId] ?: t.anggotaId} $tglEfektif melebihi nilai bersihnya.")
                }
            }
            val f = if (n.compareTo(ZERO) == 0) ONE else ONE.min(w.divide(n, MC))
            val terjual = m.unit.multiply(f, MC)
            val keluar = w.divide(navSaat, MC)
            val keFee = terjual.subtract(keluar, MC).max(ZERO)
            m.unit = m.unit.subtract(terjual, MC)
            val satuKurangF = ONE.subtract(f, MC)
            m.modalUsd = m.modalUsd.multiply(satuKurangF, MC)
            m.modalSol = m.modalSol.multiply(satuKurangF, MC)
            if (idPengelola != null && !isPengelola) {
                k[idPengelola]?.let { kp ->
                    kp.unit = kp.unit.add(keFee, MC)
                    unitFeeRef[0] = unitFeeRef[0].add(keFee, MC)
                }
            }
            if (isPengelola) {
                unitFeeRef[0] = unitFeeRef[0].subtract(terjual, MC).max(ZERO)
            }
            totalRef[0] = totalRef[0].subtract(keluar, MC)
            arusAnggota[t.anggotaId] = (arusAnggota[t.anggotaId] ?: ZERO).subtract(w, MC)
        }
    }

    fun hitungPool(
        anggota: List<Anggota>,
        snapshots: List<Snapshot>,
        permintaan: List<Permintaan>,
        set: Pengaturan,
        arus: List<ArusOnchain> = emptyList(),
        titikReferensi: List<TitikNilai> = emptyList()
    ): HasilPool {
        val snaps = snapshots.sortedBy { it.tanggal }
        val tx = transaksiSelesai(permintaan, set.jamSnapshot)
        val nama = anggota.associate { it.id to it.nama }
        val idPengelola = anggota.firstOrNull { it.peran == Peran.PENGELOLA }?.id
        val k = anggota.associate { it.id to KondisiMutable() }
        val riwayat = anggota.associate { it.id to mutableListOf<TitikSaya>() }
        val riwayatPool = mutableListOf<TitikPool>()
        val nav = mutableMapOf<String, Double>()
        val keadaan = mutableMapOf<String, Keadaan>()
        val keadaanSaat = mutableListOf<KeadaanSaat>()
        val penyebab = mutableListOf<String>()
        val lebihBayar = mutableListOf<LebihBayar>()
        val tanggalSnap = snaps.map { it.tanggal }.toSet()
        val titikById = titikReferensi.mapNotNull { ti -> ti.id?.let { it to ti } }.toMap()

        for (t in tx) {
            if (t.isOnchainTx) {
                if (!titikById.containsKey(t.titikNilaiId)) {
                    penyebab.add("Transaksi ${nama[t.anggotaId] ?: t.anggotaId} (${t.waktuEfektif}) tidak punya titik nilai referensi.")
                }
            } else if (!tanggalSnap.contains(t.tanggalEfektif)) {
                penyebab.add("Transaksi ${nama[t.anggotaId] ?: t.anggotaId} tanggal ${t.tanggalEfektif} tidak punya saldo harian.")
            }
        }

        val events = mutableListOf<EngineEvent>()
        snaps.forEach { snap ->
            events.add(EngineEvent.Snap(Formatters.msSnapshot(snap.tanggal, set.jamSnapshot), snap))
        }
        val txGroups = LinkedHashMap<String, EngineEvent.TxGroup>()
        for (t in tx) {
            if (!t.isOnchainTx) continue
            val ti = titikById[t.titikNilaiId] ?: continue
            val tMs = Formatters.ms(t.waktuEfektif!!)
            val key = "$tMs|${ti.id}"
            val existing = txGroups[key]
            if (existing != null) existing.txs.add(t)
            else txGroups[key] = EngineEvent.TxGroup(tMs, mutableListOf(t), ti)
        }
        events.addAll(txGroups.values)
        events.sortWith(compareBy<EngineEvent> { it.tMs }.thenBy { it.sortOrder })

        val totalRef = arrayOf(ZERO)
        val unitFeeRef = arrayOf(ZERO)
        var hargaUnit = ONE
        var hargaSol = ONE
        var nilaiPool = ZERO
        var saldoSol = ZERO
        var lastEventMs = Long.MIN_VALUE
        val settledIds = LinkedHashSet<String>()

        fun snapshotKeadaan(): Map<String, KondisiAnggotaSnap> =
            anggota.associate { a ->
                val m = k[a.id]!!
                a.id to KondisiAnggotaSnap(
                    unit = m.unit.toDouble(),
                    modalUsd = m.modalUsd.toDouble(),
                    modalSol = m.modalSol.toDouble(),
                    mulai = m.mulai
                )
            }

        for (ev in events) {
            when (ev) {
                is EngineEvent.Snap -> {
                    val s = ev.snap
                    val hari = tx.filter { !it.isOnchainTx && it.tanggalEfektif == s.tanggal }
                    val nilai = D(s.nilaiUsd)
                    hargaSol = nilai.divide(D(s.saldoSol), MC)
                    val setor = hari.filter { it.jenis == Jenis.SETOR }
                        .fold(ZERO) { acc, item -> acc.add(D(item.jumlahFinalUsd ?: item.jumlahUsd), MC) }
                    val tarik = hari.filter { it.jenis == Jenis.TARIK }
                        .fold(ZERO) { acc, item -> acc.add(D(item.jumlahFinalUsd ?: item.jumlahUsd), MC) }
                    val navHari = if (totalRef[0].compareTo(ZERO) == 0) {
                        ONE
                    } else {
                        nilai.subtract(setor.subtract(tarik, MC), MC).divide(totalRef[0], MC)
                    }
                    nav[s.tanggal] = navHari.toDouble()
                    val arusAnggota = mutableMapOf<String, BigDecimal>()
                    val txHari = mutableListOf<TransaksiHari>()

                    for (t in hari) {
                        terapkanTransaksi(t, navHari, hargaSol, s.tanggal, k, totalRef, unitFeeRef, idPengelola, set, nama, penyebab, lebihBayar, arusAnggota, txHari)
                        settledIds.add(t.id)
                    }

                    hargaUnit = if (totalRef[0].compareTo(ZERO) == 0) navHari else nilai.divide(totalRef[0], MC)
                    nilaiPool = nilai
                    saldoSol = D(s.saldoSol)
                    var jumlahGross = ZERO
                    for (a in anggota) {
                        val m = k[a.id]!!
                        if (m.unit < D(-1e-9)) penyebab.add("Unit ${a.nama} negatif pada ${s.tanggal}.")
                        val gross = m.unit.multiply(hargaUnit, MC)
                        jumlahGross = jumlahGross.add(gross, MC)
                        val net = gross.subtract(feeDari(m, hargaUnit, hargaSol, set, a.id == idPengelola), MC)
                        if (m.mulai != null || m.unit.compareTo(ZERO) != 0) {
                            riwayat[a.id]!!.add(
                                TitikSaya(
                                    tanggal = s.tanggal,
                                    netUsd = net.toDouble(),
                                    netSol = net.divide(hargaSol, MC).toDouble(),
                                    harga = hargaSol.toDouble(),
                                    arusUsd = (arusAnggota[a.id] ?: ZERO).toDouble(),
                                    transaksi = txHari.filter { it.anggotaId == a.id }
                                )
                            )
                        }
                    }
                    val angSnap = snapshotKeadaan()
                    keadaan[s.tanggal] = Keadaan(totalRef[0].toDouble(), unitFeeRef[0].toDouble(), angSnap)
                    keadaanSaat.add(
                        KeadaanSaat(
                            ms = ev.tMs,
                            tanggal = s.tanggal,
                            total = totalRef[0].toDouble(),
                            unitFee = unitFeeRef[0].toDouble(),
                            hargaUnit = hargaUnit.toDouble(),
                            anggota = angSnap,
                            settledIds = settledIds.toSet()
                        )
                    )
                    if (totalRef[0].compareTo(ZERO) != 0 && jumlahGross.subtract(nilai, MC).abs() > D(0.01)) {
                        penyebab.add("Total nilai anggota tidak sama dengan saldo pool pada ${s.tanggal}.")
                    }
                    riwayatPool.add(
                        TitikPool(
                            tanggal = s.tanggal,
                            nilaiUsd = nilai.toDouble(),
                            saldoSol = s.saldoSol,
                            harga = hargaSol.toDouble(),
                            arusUsd = setor.subtract(tarik, MC).toDouble(),
                            transaksi = txHari
                        )
                    )
                    lastEventMs = ev.tMs
                }

                is EngineEvent.TxGroup -> {
                    val ti = ev.titik
                    val batchIds = ev.txs.map { it.id }.toSet()
                    var netral = ZERO
                    for (a in arus) {
                        val ta = Formatters.ms(a.waktu)
                        if (ta <= lastEventMs || ta > ti.ms) continue
                        if (a.permintaanId != null && batchIds.contains(a.permintaanId) && ti.ms <= ta) continue
                        val belumSelesai = a.status == StatusArus.BELUM ||
                            (a.status == StatusArus.DICOCOKKAN && !settledIds.contains(a.permintaanId ?: ""))
                        if (!belumSelesai) continue
                        netral = netral.add(D(if (a.arah == ArahArus.KELUAR) a.nilaiUsd else -a.nilaiUsd), MC)
                    }
                    val nilaiAdjusted = D(ti.nilaiUsd).add(netral, MC)
                    hargaSol = D(ti.harga)
                    val navTx = if (totalRef[0].compareTo(ZERO) == 0) ONE else nilaiAdjusted.divide(totalRef[0], MC)
                    val tglTx = Formatters.isoWib(ev.tMs).substring(0, 10)
                    val arusAnggota = mutableMapOf<String, BigDecimal>()
                    val txHari = mutableListOf<TransaksiHari>()
                    for (t in ev.txs) {
                        terapkanTransaksi(t, navTx, hargaSol, tglTx, k, totalRef, unitFeeRef, idPengelola, set, nama, penyebab, lebihBayar, arusAnggota, txHari)
                        settledIds.add(t.id)
                    }
                    hargaUnit = navTx
                    nilaiPool = totalRef[0].multiply(navTx, MC)
                    saldoSol = nilaiPool.divide(hargaSol, MC)
                    lastEventMs = ev.tMs
                    keadaanSaat.add(
                        KeadaanSaat(
                            ms = ev.tMs,
                            tanggal = tglTx,
                            total = totalRef[0].toDouble(),
                            unitFee = unitFeeRef[0].toDouble(),
                            hargaUnit = hargaUnit.toDouble(),
                            anggota = snapshotKeadaan(),
                            settledIds = settledIds.toSet()
                        )
                    )
                }
            }
        }

        val total = totalRef[0]
        val unitFee = unitFeeRef[0]
        val tanggalData = snaps.lastOrNull()?.tanggal

        if (tanggalData != null) {
            val batas = Formatters.msSnapshot(tanggalData, set.jamSnapshot)
            val n = arus.count { it.status == StatusArus.BELUM && Formatters.ms(it.waktu) < batas }
            if (n > 0) penyebab.add("Ada $n transfer di wallet yang belum dicatat pengelola. Angka sedang dicek ulang.")
        }

        val (posisi, feeTerutangTotal) = susunPosisi(anggota, k, total, hargaUnit, hargaSol, set, idPengelola, tanggalData)

        return HasilPool(
            tanggalData = tanggalData,
            pool = RingkasanPool(
                nilaiUsd = nilaiPool.toDouble(),
                saldoSol = saldoSol.toDouble(),
                harga = hargaSol.toDouble(),
                harga1Unit = hargaUnit.toDouble(),
                totalUnit = total.toDouble()
            ),
            posisi = posisi,
            pengelola = RingkasanPengelola(
                id = idPengelola,
                unitFee = unitFee.toDouble(),
                nilaiUnitFeeUsd = unitFee.multiply(hargaUnit, MC).toDouble(),
                feeTerutangTotal = feeTerutangTotal.toDouble()
            ),
            riwayatPool = riwayatPool,
            riwayat = riwayat,
            cek = CekInvarian(lolos = penyebab.isEmpty(), penyebab = penyebab),
            lebihBayar = lebihBayar,
            nav = nav,
            keadaan = keadaan,
            keadaanSaat = keadaanSaat,
            live = null
        )
    }

    private fun susunPosisi(
        anggota: List<Anggota>,
        k: Map<String, KondisiMutable>,
        total: BigDecimal,
        hargaUnit: BigDecimal,
        hargaSol: BigDecimal,
        set: Pengaturan,
        idPengelola: String?,
        tanggalData: String?
    ): Pair<List<Posisi>, BigDecimal> {
        var feeTerutangTotal = ZERO
        val posisi = anggota.map { a ->
            val m = k[a.id] ?: KondisiMutable()
            val isP = a.id == idPengelola
            val gross = m.unit.multiply(hargaUnit, MC)
            val fee = feeDari(m, hargaUnit, hargaSol, set, isP)
            feeTerutangTotal = feeTerutangTotal.add(fee, MC)
            val net = gross.subtract(fee, MC)
            val profitUsd = net.subtract(m.modalUsd, MC)
            val netSol = if (tanggalData != null) net.divide(hargaSol, MC) else ZERO
            Posisi(
                id = a.id,
                nama = a.nama,
                peran = a.peran,
                aktif = a.aktif,
                unit = m.unit.toDouble(),
                porsi = if (total.compareTo(ZERO) == 0) 0.0 else m.unit.divide(total, MC).multiply(HUNDRED, MC).toDouble(),
                modalUsd = m.modalUsd.toDouble(),
                modalSol = m.modalSol.toDouble(),
                grossUsd = gross.toDouble(),
                feeUsd = fee.toDouble(),
                netUsd = net.toDouble(),
                netSol = netSol.toDouble(),
                profitUsd = profitUsd.toDouble(),
                profitSol = netSol.subtract(m.modalSol, MC).toDouble(),
                roi = if (m.modalUsd.compareTo(ZERO) == 0) 0.0 else profitUsd.divide(m.modalUsd, MC).multiply(HUNDRED, MC).toDouble(),
                lamaIkutHari = if (m.mulai != null && tanggalData != null) Formatters.selisihHari(m.mulai!!, tanggalData) else 0,
                tanggalMulai = m.mulai,
                punyaSetoran = m.mulai != null
            )
        }
        return posisi to feeTerutangTotal
    }

    private fun kondisiDari(kd: Map<String, KondisiAnggotaSnap>): Map<String, KondisiMutable> =
        kd.mapValues { (_, x) -> KondisiMutable(D(x.unit), D(x.modalUsd), D(x.modalSol), x.mulai) }

    /** Arus yang dinetralkan: status belum atau dicocokkan. Hadiah/reward, biaya pool, dan bukan arus dibiarkan memengaruhi nilai. */
    private fun dinetralkan(a: ArusOnchain): Boolean =
        a.status == StatusArus.BELUM || a.status == StatusArus.DICOCOKKAN

    private fun snapshotSebelum(snaps: List<Snapshot>, t: Long, jam: String): Snapshot? {
        var s: Snapshot? = null
        for (x in snaps) {
            if (Formatters.msSnapshot(x.tanggal, jam) <= t && (s == null || x.tanggal > s.tanggal)) s = x
        }
        return s
    }

    private fun keadaanPada(h: HasilPool, t: Long): KeadaanSaat? {
        var latest: KeadaanSaat? = null
        for (ks in h.keadaanSaat) {
            if (ks.ms <= t && (latest == null || ks.ms >= latest.ms)) latest = ks
        }
        return latest
    }

    fun liveDi(h: HasilPool, snaps: List<Snapshot>, arus: List<ArusOnchain>, ti: TitikNilai, set: Pengaturan): Live? {
        val ks = keadaanPada(h, ti.ms)
        val s = snapshotSebelum(snaps, ti.ms, set.jamSnapshot)
        if (ks == null && (s == null || !h.keadaan.containsKey(s.tanggal))) return null
        val dari = ks?.ms ?: Formatters.msSnapshot(s!!.tanggal, set.jamSnapshot)
        val settled = ks?.settledIds ?: emptySet()
        val total = ks?.total ?: h.keadaan[s!!.tanggal]!!.total
        val snapTgl = ks?.tanggal ?: s!!.tanggal

        var netral = 0.0
        for (a in arus) {
            val t = Formatters.ms(a.waktu)
            if (t <= dari || t > ti.ms || !dinetralkan(a)) continue
            if (a.status == StatusArus.DICOCOKKAN && a.permintaanId != null && settled.contains(a.permintaanId)) continue
            netral += if (a.arah == ArahArus.KELUAR) a.nilaiUsd else -a.nilaiUsd
        }
        val nilaiUsd = ti.nilaiUsd + netral
        return Live(
            dibacaPada = Formatters.isoWib(ti.ms),
            ms = ti.ms,
            nilaiMentahUsd = ti.nilaiUsd,
            arusDinetralkanUsd = netral,
            nilaiUsd = nilaiUsd,
            saldoSol = nilaiUsd / ti.harga,
            harga = ti.harga,
            nav = if (total != 0.0) nilaiUsd / total else 1.0,
            snapshot = snapTgl
        )
    }

    fun terapkanLive(
        h: HasilPool,
        anggota: List<Anggota>,
        snaps: List<Snapshot>,
        arus: List<ArusOnchain>,
        titik: List<TitikNilai>,
        sekarang: Long,
        set: Pengaturan
    ): HasilPool {
        val tanggalData = h.tanggalData ?: return h
        val ti = OnchainSimulator.titikTerakhir(titik, sekarang) ?: return h
        if (ti.estimasi || ti.ms <= Formatters.msSnapshot(tanggalData, set.jamSnapshot)) return h
        val live = liveDi(h, snaps, arus, ti, set) ?: return h
        if (live.snapshot < tanggalData) return h
        val kd = keadaanPada(h, live.ms)
        val angMap = kd?.anggota ?: h.keadaan[live.snapshot]!!.anggota
        val tot = kd?.total ?: h.keadaan[live.snapshot]!!.total
        val (posisi, feeTerutangTotal) = susunPosisi(
            anggota,
            kondisiDari(angMap),
            D(tot),
            D(live.nav),
            D(live.harga),
            set,
            h.pengelola.id,
            h.tanggalData
        )
        return h.copy(
            pool = h.pool.copy(
                nilaiUsd = live.nilaiUsd,
                saldoSol = live.saldoSol,
                harga = live.harga,
                harga1Unit = live.nav
            ),
            posisi = posisi,
            pengelola = h.pengelola.copy(
                nilaiUnitFeeUsd = h.pengelola.unitFee * live.nav,
                feeTerutangTotal = feeTerutangTotal.toDouble()
            ),
            live = live
        )
    }

    fun opsiRentang(permintaan: List<Permintaan>, anggotaId: String?): List<Rentang> {
        val jumlahSetor = permintaan.count {
            it.status == StatusPermintaan.SELESAI &&
                it.jenis == Jenis.SETOR &&
                (anggotaId == null || it.anggotaId == anggotaId)
        }
        return if (jumlahSetor > 1) Rentang.entries else Rentang.entries.filter { it != Rentang.SETORAN_TERAKHIR }
    }

    private fun setoranTerakhir(permintaan: List<Permintaan>, anggotaId: String?, jam: String): Pair<Long, String>? {
        var akhir: Pair<Long, String>? = null
        for (p in permintaan) {
            if (p.status != StatusPermintaan.SELESAI || p.jenis != Jenis.SETOR) continue
            if (anggotaId != null && p.anggotaId != anggotaId) continue
            if (p.tanggalEfektif.isNullOrBlank() && !p.isOnchainTx) continue
            val t = waktuEfektifMs(p, jam)
            if (akhir == null || t > akhir.first) {
                akhir = t to (p.tanggalEfektif ?: Formatters.isoWib(t).substring(0, 10))
            }
        }
        return akhir
    }

    private fun titikHarian(c: KonteksSeri, anggotaId: String?): List<TitikSeri> {
        val jam = c.set.jamSnapshot
        if (anggotaId != null) {
            return (c.h.riwayat[anggotaId] ?: emptyList()).map { p ->
                TitikSeri(
                    ms = Formatters.msSnapshot(p.tanggal, jam),
                    waktu = "${p.tanggal}T$jam:00+07:00",
                    harian = true,
                    usd = p.netUsd,
                    sol = p.netSol,
                    harga = p.harga,
                    nav = c.h.nav[p.tanggal] ?: 1.0,
                    arusUsd = p.arusUsd,
                    transaksi = p.transaksi.map { TransaksiTitik(it.nama, it.jenis, it.jumlahUsd) }
                )
            }
        }
        return c.h.riwayatPool.map { p ->
            TitikSeri(
                ms = Formatters.msSnapshot(p.tanggal, jam),
                waktu = "${p.tanggal}T$jam:00+07:00",
                harian = true,
                usd = p.nilaiUsd,
                sol = p.saldoSol,
                harga = p.harga,
                nav = c.h.nav[p.tanggal] ?: 1.0,
                arusUsd = p.arusUsd,
                transaksi = p.transaksi.map { TransaksiTitik(it.nama, it.jenis, it.jumlahUsd) }
            )
        }
    }

    private data class NilaiTitik(val usd: Double, val sol: Double, val nav: Double, val snapshot: String)

    private fun nilaiDi(c: KonteksSeri, ti: TitikNilai, anggotaId: String?): NilaiTitik? {
        val live = liveDi(c.h, c.snaps, c.arus, ti, c.set) ?: return null
        if (anggotaId == null) {
            return NilaiTitik(ti.nilaiUsd, ti.nilaiUsd / ti.harga, live.nav, live.snapshot)
        }
        val kd = keadaanPada(c.h, ti.ms)
        val angMap = kd?.anggota ?: c.h.keadaan[live.snapshot]?.anggota ?: return null
        val m = angMap[anggotaId] ?: return null
        if (m.mulai == null && m.unit == 0.0) return null
        val isP = anggotaId == c.h.pengelola.id
        val km = KondisiMutable(D(m.unit), D(m.modalUsd), D(m.modalSol), m.mulai)
        val nav = D(live.nav)
        val net = km.unit.multiply(nav, MC).subtract(feeDari(km, nav, D(live.harga), c.set, isP), MC)
        return NilaiTitik(net.toDouble(), net.divide(D(live.harga), MC).toDouble(), live.nav, live.snapshot)
    }

    private fun arusDiAntara(
        c: KonteksSeri,
        dari: Long,
        sampai: Long,
        anggotaId: String?,
        skipPermintaan: Set<String> = emptySet()
    ): Pair<List<TransaksiTitik>, Double> {
        val kelompok = LinkedHashMap<String, TransaksiTitik>()
        var bersih = 0.0
        for (a in c.arus) {
            val t = Formatters.ms(a.waktu)
            if (t <= dari || t > sampai || !dinetralkan(a)) continue
            if (a.permintaanId != null && skipPermintaan.contains(a.permintaanId)) continue
            val pemilikId = if (a.status == StatusArus.DICOCOKKAN) {
                c.permintaan.firstOrNull { it.id == a.permintaanId }?.anggotaId
            } else null
            if (anggotaId != null && pemilikId != anggotaId) continue
            val jenis = if (a.arah == ArahArus.MASUK) Jenis.SETOR else Jenis.TARIK
            bersih += if (jenis == Jenis.SETOR) a.nilaiUsd else -a.nilaiUsd
            val kunci = "${pemilikId ?: "-"}|${jenis.raw}"
            val namaPemilik = c.anggota.firstOrNull { it.id == pemilikId }?.nama ?: "Belum dicocokkan"
            val ada = kelompok[kunci]
            if (ada != null) {
                kelompok[kunci] = ada.copy(jumlahUsd = ada.jumlahUsd + a.nilaiUsd)
            } else {
                kelompok[kunci] = TransaksiTitik(namaPemilik, jenis, a.nilaiUsd)
            }
        }
        return kelompok.values.toList() to bersih
    }

    private const val MENIT = 60_000L
    private const val OFFSET_WIB = 7 * 60 * MENIT
    private const val MAKS_TITIK = 365
    private val INTERVAL_SEMUA = listOf(2L, 4L, 6L, 12L, 24L).map { it * 60L * MENIT }
    private val INTERVAL_SETOR = listOf(30L, 60L, 120L, 240L, 360L, 720L, 1440L).map { it * MENIT }

    private fun intervalSemua(panjang: Long): Long =
        INTERVAL_SEMUA.firstOrNull { ceil(panjang.toDouble() / it.toDouble()) <= MAKS_TITIK } ?: INTERVAL_SEMUA.last()

    private fun intervalSetor(panjang: Long): Long =
        INTERVAL_SETOR.firstOrNull { ceil(panjang.toDouble() / it.toDouble()) <= MAKS_TITIK } ?: INTERVAL_SETOR.last()

    fun seriRentang(c: KonteksSeri, r: Rentang, anggotaId: String? = null): Seri {
        val jenis = if (anggotaId != null) "saya" else "pool"
        val harian = titikHarian(c, anggotaId).filter { it.ms <= c.sekarang }
        val tersedia = c.titik.filter { it.ms <= c.sekarang }
        val awalData = listOfNotNull(harian.firstOrNull()?.ms, tersedia.firstOrNull()?.ms).minOrNull()
            ?: return Seri(jenis, emptyList(), 0)
        val setor = if (r == Rentang.SETORAN_TERAKHIR) setoranTerakhir(c.permintaan, anggotaId, c.set.jamSnapshot) else null
        val semua = r == Rentang.SEMUA || (r == Rentang.SETORAN_TERAKHIR && (setor == null || setor.first <= awalData))

        val panjang: Long
        val langkah: Long
        val mulai: Long
        when {
            semua -> {
                panjang = max(c.sekarang - awalData, MENIT)
                langkah = intervalSemua(panjang)
                mulai = awalData - 1L
            }
            r == Rentang.SETORAN_TERAKHIR && setor != null -> {
                mulai = setor.first - 1L
                panjang = max(c.sekarang - setor.first, MENIT)
                langkah = intervalSetor(panjang)
            }
            r == Rentang.JAM_24 -> {
                panjang = 24L * 60L * MENIT
                langkah = 5L * MENIT
                mulai = ceil((c.sekarang - panjang + OFFSET_WIB).toDouble() / langkah.toDouble()).toLong() * langkah - OFFSET_WIB
            }
            else -> {
                panjang = 7L * 24L * 60L * MENIT
                langkah = 30L * MENIT
                mulai = ceil((c.sekarang - panjang + OFFSET_WIB).toDouble() / langkah.toDouble()).toLong() * langkah - OFFSET_WIB
            }
        }

        val cukup = tersedia.isNotEmpty() && tersedia.first().ms <= mulai + 1L + (0.1 * panjang).toLong()
        if (!cukup && r != Rentang.JAM_24) {
            val titik = harian.toMutableList()
            val terakhir = tersedia.lastOrNull()
            val akhir = titik.lastOrNull()
            if (terakhir != null && akhir != null && terakhir.ms > akhir.ms) {
                val v = nilaiDi(c, terakhir, anggotaId)
                if (v != null) {
                    val akhirTgl = akhir.waktu.substring(0, 10)
                    val sudah = c.permintaan
                        .filter { it.status == StatusPermintaan.SELESAI && !it.isOnchainTx && it.tanggalEfektif != null && it.tanggalEfektif <= akhirTgl }
                        .map { it.id }.toSet()
                    val (txUjung, bersihUjung) = if (anggotaId != null) emptyList<TransaksiTitik>() to 0.0 else arusDiAntara(c, akhir.ms, terakhir.ms, null, sudah)
                    titik.add(
                        TitikSeri(
                            ms = terakhir.ms,
                            waktu = Formatters.isoWib(terakhir.ms),
                            harian = false,
                            estimasi = terakhir.estimasi,
                            usd = v.usd,
                            sol = v.sol,
                            harga = terakhir.harga,
                            nav = v.nav,
                            arusUsd = bersihUjung,
                            transaksi = txUjung
                        )
                    )
                }
            }
            if (titik.isEmpty()) return Seri(jenis, titik, 0)
            val tglBatas = when (r) {
                Rentang.SETORAN_TERAKHIR -> setor?.second
                Rentang.HARI_7 -> Formatters.tambahHari(titik.last().waktu.substring(0, 10), -6)
                else -> null
            }
            val batas = tglBatas?.let { Formatters.ms(it) } ?: Long.MIN_VALUE
            val idx = titik.indexOfFirst { it.ms >= batas }.let { if (it < 0) 0 else it }
            return Seri(jenis, titik, idx)
        }

        val titikPilih = mutableListOf<TitikNilai>()
        val pembanding = if (semua) null else OnchainSimulator.titikTerakhir(tersedia, mulai)
        if (pembanding != null) titikPilih.add(pembanding)
        var ember = Long.MIN_VALUE
        for (t in tersedia) {
            if (t.ms <= mulai) continue
            val e = floor((t.ms + OFFSET_WIB - 1L).toDouble() / langkah.toDouble()).toLong()
            if (e == ember) titikPilih[titikPilih.lastIndex] = t
            else titikPilih.add(t)
            ember = e
        }

        val sumber = c.snaps.associate { it.tanggal to it.sumber }
        val sudahArus = HashSet<String>()
        val out = mutableListOf<TitikSeri>()
        var snapSebelum: String? = null
        var tSebelum = Long.MIN_VALUE

        for (ti in titikPilih) {
            val v = nilaiDi(c, ti, anggotaId) ?: continue
            var arusUsd = 0.0
            val transaksi = mutableListOf<TransaksiTitik>()
            val pindah = if (snapSebelum != null) v.snapshot != snapSebelum else semua
            if (pindah && (anggotaId != null || sumber[v.snapshot] == SumberSnapshot.IMPOR || ti.estimasi)) {
                val hs = harian.firstOrNull { it.waktu.startsWith(v.snapshot) }
                if (hs != null) {
                    arusUsd = hs.arusUsd
                    val efektif = !ti.estimasi && sumber[v.snapshot] != SumberSnapshot.IMPOR
                    transaksi.addAll(hs.transaksi.map { x -> x.copy(nama = if (efektif) "${x.nama}, efektif" else x.nama) })
                    if (anggotaId == null) {
                        c.permintaan.filter { it.status == StatusPermintaan.SELESAI && !it.isOnchainTx && it.tanggalEfektif == v.snapshot }
                            .forEach { sudahArus.add(it.id) }
                    }
                }
            }
            if (tSebelum > Long.MIN_VALUE) {
                val (txAntara, bersihAntara) = arusDiAntara(c, tSebelum, ti.ms, anggotaId, sudahArus)
                if (anggotaId == null) arusUsd += bersihAntara
                transaksi.addAll(txAntara)
                if (anggotaId != null) {
                    for (p in c.permintaan) {
                        if (p.status != StatusPermintaan.SELESAI || p.anggotaId != anggotaId || !p.isOnchainTx) continue
                        val tp = Formatters.ms(p.waktuEfektif!!)
                        if (tp in (tSebelum + 1)..ti.ms) {
                            val jml = p.jumlahFinalUsd ?: p.jumlahUsd
                            arusUsd += if (p.jenis == Jenis.SETOR) jml else -jml
                        }
                    }
                }
            } else if (semua && anggotaId != null) {
                val namaAnggota = c.anggota.firstOrNull { it.id == anggotaId }?.nama ?: anggotaId
                for (p in c.permintaan) {
                    if (p.status != StatusPermintaan.SELESAI || p.anggotaId != anggotaId || !p.isOnchainTx) continue
                    if (Formatters.ms(p.waktuEfektif!!) <= ti.ms) {
                        val jml = p.jumlahFinalUsd ?: p.jumlahUsd
                        arusUsd += if (p.jenis == Jenis.SETOR) jml else -jml
                        transaksi.add(TransaksiTitik(namaAnggota, p.jenis, jml))
                    }
                }
            }
            out.add(
                TitikSeri(
                    ms = ti.ms,
                    waktu = Formatters.isoWib(ti.ms),
                    harian = false,
                    estimasi = ti.estimasi,
                    usd = v.usd,
                    sol = v.sol,
                    harga = ti.harga,
                    nav = v.nav,
                    arusUsd = arusUsd,
                    transaksi = transaksi
                )
            )
            snapSebelum = v.snapshot
            tSebelum = ti.ms
        }

        val asli = tersedia.firstOrNull { !it.estimasi }
        val estimasiSampai = if (out.any { it.estimasi }) asli?.ms else null
        if (semua) return Seri(jenis, out, 0, estimasiSampai)
        val idx = out.indexOfFirst { it.ms > mulai }
        val awal = if (idx < 0) out.size else max(idx, if (out.size > 1) 1 else 0)
        return Seri(jenis, out, awal, estimasiSampai)
    }

    fun awalTampil(s: Seri, r: Rentang): Int =
        if (r.isPendek) max(0, s.awal - 1) else s.awal

    fun kumulatif(s: Seri): List<Kumulatif> {
        val out = MutableList(s.titik.size) { Kumulatif(0.0, 0.0, 0.0, 0.0) }
        if (s.titik.isEmpty()) return out
        val b = max(0, s.awal - 1)
        val pb = s.titik[b]
        val dasarUsd = if (s.awal > 0) pb.usd else 0.0
        val dasarSol = if (s.awal > 0) pb.sol else 0.0
        var ruUsd = 0.0
        var ruSol = 0.0
        var setorUsd = 0.0
        var setorSol = 0.0
        for (i in s.awal until s.titik.size) {
            val p = s.titik[i]
            val q = if (i > 0) s.titik[i - 1] else null
            val aSol = p.arusUsd / p.harga
            ruUsd += p.usd - (q?.usd ?: 0.0) - p.arusUsd
            ruSol += p.sol - (q?.sol ?: 0.0) - aSol
            if (p.arusUsd > 0) {
                setorUsd += p.arusUsd
                setorSol += aSol
            }
            val isPool = s.jenis == "pool"
            val pUsd = if (isPool) {
                (p.nav / pb.nav - 1.0) * 100.0
            } else if (dasarUsd + setorUsd != 0.0) {
                (100.0 * ruUsd) / (dasarUsd + setorUsd)
            } else 0.0

            val pSol = if (isPool) {
                ((p.nav / p.harga) / (pb.nav / pb.harga) - 1.0) * 100.0
            } else if (dasarSol + setorSol != 0.0) {
                (100.0 * ruSol) / (dasarSol + setorSol)
            } else 0.0

            out[i] = Kumulatif(ruUsd, ruSol, pUsd, pSol)
        }
        return out
    }

    fun chipTransaksi(p: TitikSeri, jenisSeri: String): List<String> {
        fun label(j: Jenis) = if (j == Jenis.SETOR) "Setoran" else "Tarik"
        val est = if (p.estimasi) listOf("Estimasi dari harga pasar per jam") else emptyList()
        if (jenisSeri == "saya") {
            return est + p.transaksi.map { "${label(it.jenis)} ${Formatters.usd(it.jumlahUsd)}" }
        }
        val grouped = listOf(Jenis.SETOR, Jenis.TARIK).mapNotNull { j ->
            val list = p.transaksi.filter { it.jenis == j }
            if (list.isNotEmpty()) {
                "${label(j)}: ${list.joinToString(", ") { "${it.nama} ${Formatters.usd(it.jumlahUsd)}" }}"
            } else null
        }
        return est + grouped
    }

    fun keteranganEstimasi(s: Seri, r: Rentang): String? {
        val sampai = s.estimasiSampai ?: return null
        val sub = s.titik.drop(awalTampil(s, r))
        if (sub.none { it.estimasi }) return null
        return "Sebelum ${Formatters.tanggal(Formatters.isoWib(sampai))}: estimasi per jam"
    }

    fun grafikKosong(s: Seri, r: Rentang, jumlahHarian: Int): String? {
        return if (r == Rentang.JAM_24) {
            if (s.titik.size - awalTampil(s, r) < 2) "Grafik 24 jam muncul setelah ada data 10 menit." else null
        } else {
            if (jumlahHarian < 2) "Grafik muncul setelah ada data 2 hari." else null
        }
    }

    fun simulasiTarik(h: HasilPool, anggotaId: String, w: Double, set: Pengaturan): Simulasi {
        val p = h.posisi.first { it.id == anggotaId }
        val harga = D(h.pool.harga1Unit)
        val isP = anggotaId == h.pengelola.id
        val n = D(p.netUsd)
        val wClamped = D(max(0.0, w)).min(n)
        val f = if (n.compareTo(ZERO) == 0) ZERO else wClamped.divide(n, MC)
        val unit = D(p.unit)
        val terjual = unit.multiply(f, MC)
        val fee = if (isP) ZERO else D(p.feeUsd).multiply(f, MC)
        val keluar = if (harga.compareTo(ZERO) == 0) ZERO else wClamped.divide(harga, MC)
        val sisaUnit = unit.subtract(terjual, MC)
        val sisaTotal = D(h.pool.totalUnit).subtract(keluar, MC)
        val satuKurangF = ONE.subtract(f, MC)
        val sisaModal = D(p.modalUsd).multiply(satuKurangF, MC)
        val k = KondisiMutable(sisaUnit, sisaModal, D(p.modalSol).multiply(satuKurangF, MC), null)
        val sisaFee = feeDari(k, harga, D(h.pool.harga), set, isP)
        return Simulasi(
            unitTerjual = terjual.toDouble(),
            feeDibayar = fee.toDouble(),
            sisaNetUsd = sisaUnit.multiply(harga, MC).subtract(sisaFee, MC).toDouble(),
            sisaModalUsd = sisaModal.toDouble(),
            sisaPorsi = if (sisaTotal.compareTo(ZERO) == 0) 0.0 else sisaUnit.divide(sisaTotal, MC).multiply(HUNDRED, MC).toDouble(),
            maksimal = n.toDouble()
        )
    }
}
