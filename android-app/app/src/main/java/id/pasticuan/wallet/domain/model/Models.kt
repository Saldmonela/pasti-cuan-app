package id.pasticuan.wallet.domain.model

enum class Peran(val raw: String) {
    INVESTOR("investor"),
    PENGELOLA("pengelola")
}

enum class Jenis(val raw: String) {
    SETOR("setor"),
    TARIK("tarik")
}

enum class StatusPermintaan(val raw: String) {
    MENUNGGU("menunggu"),
    SELESAI("selesai"),
    DITOLAK("ditolak"),
    DIBATALKAN("dibatalkan")
}

enum class Satuan(val label: String) {
    USD("USD"),
    SOL("SOL")
}

enum class ModeSatuan(val label: String) {
    USD("USD"),
    SOL("SOL"),
    BANDINGKAN("Bandingkan");

    fun toSatuan(): Satuan = if (this == SOL) Satuan.SOL else Satuan.USD
}

enum class Rentang(val label: String) {
    JAM_24("24J"),
    HARI_7("7H"),
    SETORAN_TERAKHIR("Setoran Terakhir"),
    SEMUA("Semua");

    val isPendek: Boolean get() = this == JAM_24 || this == HARI_7
}

enum class SumberSnapshot(val raw: String, val label: String) {
    OTOMATIS("otomatis", "Otomatis"),
    MANUAL("manual", "Manual"),
    KOREKSI("koreksi", "Koreksi"),
    IMPOR("impor", "Impor")
}

enum class StatusArus(val raw: String, val label: String) {
    BELUM("belum", "Belum dicocokkan"),
    DICOCOKKAN("dicocokkan", "Dicocokkan"),
    BIAYA("biaya", "Biaya pool"),
    BUKAN_ARUS("bukan_arus", "Bukan arus")
}

enum class ArahArus(val raw: String) {
    MASUK("masuk"),
    KELUAR("keluar")
}

data class Anggota(
    val id: String,
    val nama: String,
    val email: String,
    val peran: Peran,
    val aktif: Boolean = true,
    val alamatWallet: List<String> = emptyList(),
    val dibuatPada: String
)

data class Snapshot(
    val tanggal: String, // YYYY-MM-DD (WIB)
    val sumber: SumberSnapshot,
    val alasan: String? = null,
    val nilaiUsd: Double,
    val saldoSol: Double,
    val feeLpDiklaimSol: Double? = null,
    val catatan: String? = null,
    val dibuatOleh: String,
    val dibuatPada: String,
    val diubahPada: String? = null
)

data class Permintaan(
    val id: String,
    val anggotaId: String,
    val jenis: Jenis,
    val jumlahUsd: Double,
    val tanggalTransfer: String? = null,
    val alamatWalletTujuan: String? = null,
    val buktiTransaksi: String? = null,
    val catatan: String? = null,
    val status: StatusPermintaan,
    val alasan: String? = null,
    val tanggalEfektif: String? = null,
    val waktuEfektif: String? = null,
    val titikNilaiId: Long? = null,
    val jumlahFinalUsd: Double? = null,
    val sumber: String = "app", // "app" | "impor"
    val diprosesOleh: String? = null,
    val diprosesPada: String? = null,
    val dibuatOleh: String? = null,
    val dibuatPada: String
) {
    val isOnchainTx: Boolean get() = !waktuEfektif.isNullOrBlank() && titikNilaiId != null
}

data class ArusOnchain(
    val id: String,
    val signature: String,
    val urutan: Int,
    val waktu: String,
    val arah: ArahArus,
    val token: String,
    val simbol: String? = null,
    val jumlah: Double,
    val nilaiUsd: Double,
    val alamatLawan: String,
    val status: StatusArus,
    val permintaanId: String? = null,
    val catatan: String? = null,
    val alasanSelisih: String? = null,
    val ditandaiOleh: String? = null,
    val ditandaiPada: String? = null
)

data class Pengaturan(
    val namaPool: String = "Pasti Cuan",
    val tanggalMulai: String = "2026-10-16",
    val feePersen: Double = 0.10,
    val satuanDasarFee: Satuan = Satuan.USD,
    val batasDataLamaHari: Int = 2,
    val ambangLonjakanPersen: Double = 30.0,
    val alamatWalletPool: String = "By6HpsukcTeVsV6FyBzhQJ2nzdHP46kXaSPtrCGUzoaR",
    val jamSnapshot: String = "08:00",
    val ambangLikuiditasTokenUsd: Double = 10000.0,
    val ambangDustUsd: Double = 1.0,
    val batasLiveLamaMenit: Int = 15,
    val toleransiCocokPersen: Double = 2.0
)

data class LogAudit(
    val id: String,
    val tabel: String,
    val aksi: String,
    val ringkasan: String,
    val nilaiLama: String? = null,
    val nilaiBaru: String? = null,
    val oleh: String,
    val pada: String
)

data class TitikNilai(
    val id: Long? = null,
    val ms: Long,
    val nilaiUsd: Double,
    val saldoSol: Double,
    val harga: Double,
    val estimasi: Boolean = false
)

data class DataPool(
    val anggota: List<Anggota>,
    val snapshots: List<Snapshot>,
    val permintaan: List<Permintaan>,
    val arus: List<ArusOnchain>,
    val estimasi: Boolean,
    val log: List<LogAudit>,
    val pengaturan: Pengaturan
)
