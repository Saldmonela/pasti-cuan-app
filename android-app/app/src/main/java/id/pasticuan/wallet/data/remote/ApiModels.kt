package id.pasticuan.wallet.data.remote

import id.pasticuan.wallet.domain.model.DataPool
import id.pasticuan.wallet.domain.model.Anggota
import id.pasticuan.wallet.domain.model.Jenis
import id.pasticuan.wallet.domain.model.Peran
import id.pasticuan.wallet.domain.model.Satuan
import id.pasticuan.wallet.domain.model.TitikNilai
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class PosisiResponse(
    val saya: Anggota? = null,
    @SerialName("tanggal_data")
    val tanggalData: String? = null,
    @SerialName("versi_data")
    val versiData: String = "",
    val sekarang: Long = 0L,
    val data: DataPool,
    val titik: List<TitikNilai> = emptyList(),
    val arusBelumCount: Int = 0
)

@Serializable
data class ApiErrorBody(
    val kode: String = "ATURAN_BISNIS",
    val pesan: String = "Terjadi kesalahan pada server.",
    val detail: Map<String, String> = emptyMap()
)

@Serializable
data class SupabaseUser(
    val id: String = "",
    val email: String? = null
)

@Serializable
data class SupabaseAuthResponse(
    @SerialName("access_token")
    val accessToken: String = "",
    @SerialName("refresh_token")
    val refreshToken: String = "",
    @SerialName("expires_in")
    val expiresIn: Long = 3600L,
    @SerialName("expires_at")
    val expiresAt: Long? = null,
    @SerialName("token_type")
    val tokenType: String = "bearer",
    val user: SupabaseUser? = null,
    val error: String? = null,
    @SerialName("error_description")
    val errorDescription: String? = null,
    val msg: String? = null
)

@Serializable
data class SupabaseSession(
    val accessToken: String,
    val refreshToken: String,
    val expiresAtMs: Long,
    val userEmail: String? = null
) {
    fun isExpiringSoon(nowMs: Long = System.currentTimeMillis()): Boolean =
        nowMs >= expiresAtMs - 60_000L
}

@Serializable
data class PermintaanCreateRequest(
    val jenis: Jenis,
    @SerialName("jumlah_usd")
    val jumlahUsd: Double,
    @SerialName("tanggal_transfer")
    val tanggalTransfer: String? = null,
    @SerialName("bukti_transaksi")
    val buktiTransaksi: String? = null,
    @SerialName("alamat_wallet_tujuan")
    val alamatWalletTujuan: String? = null,
    val catatan: String? = null,
    @SerialName("versi_data")
    val versiData: String? = null
)

@Serializable
data class PermintaanSelesaiRequest(
    @SerialName("tanggal_efektif")
    val tanggalEfektif: String,
    @SerialName("jumlah_final_usd")
    val jumlahFinalUsd: Double,
    @SerialName("bukti_transaksi")
    val buktiTransaksi: String? = null,
    val alasan: String? = null
)

@Serializable
data class PermintaanTolakRequest(
    val alasan: String
)

@Serializable
data class ArusTandaiRequest(
    val ids: List<String>,
    val status: String,
    @SerialName("permintaan_id")
    val permintaanId: String? = null,
    @SerialName("anggota_id")
    val anggotaId: String? = null,
    val catatan: String? = null,
    @SerialName("alasan_selisih")
    val alasanSelisih: String? = null
)

@Serializable
data class PesanResponse(
    val ok: Boolean = true,
    val pesan: String? = null
)

@Serializable
data class SnapshotCreateRequest(
    val tanggal: String,
    @SerialName("nilai_usd")
    val nilaiUsd: Double,
    @SerialName("saldo_sol")
    val saldoSol: Double,
    @SerialName("fee_lp_diklaim_sol")
    val feeLpDiklaimSol: Double? = null,
    val catatan: String? = null
)

@Serializable
data class SnapshotCreateResponse(
    @SerialName("peringatan_lonjakan")
    val peringatanLonjakan: String? = null
)

@Serializable
data class SnapshotPatchRequest(
    @SerialName("nilai_usd")
    val nilaiUsd: Double,
    @SerialName("saldo_sol")
    val saldoSol: Double,
    @SerialName("fee_lp_diklaim_sol")
    val feeLpDiklaimSol: Double? = null,
    val catatan: String? = null,
    val alasan: String? = null,
    @SerialName("konfirmasi_hitung_ulang")
    val konfirmasiHitungUlang: Boolean = true
)

@Serializable
data class AnggotaCreateRequest(
    val nama: String,
    val email: String,
    val peran: Peran,
    @SerialName("alamat_wallet")
    val alamatWallet: List<String> = emptyList()
)

@Serializable
data class AnggotaPatchRequest(
    val nama: String? = null,
    val peran: Peran? = null,
    val aktif: Boolean? = null,
    @SerialName("alamat_wallet")
    val alamatWallet: List<String>? = null
)

@Serializable
data class PengaturanPatchRequest(
    @SerialName("fee_persen")
    val feePersen: Double? = null,
    @SerialName("satuan_dasar_fee")
    val satuanDasarFee: Satuan? = null,
    @SerialName("batas_data_lama_hari")
    val batasDataLamaHari: Int? = null,
    @SerialName("ambang_lonjakan_persen")
    val ambangLonjakanPersen: Double? = null,
    @SerialName("ambang_likuiditas_token_usd")
    val ambangLikuiditasTokenUsd: Double? = null,
    @SerialName("ambang_dust_usd")
    val ambangDustUsd: Double? = null,
    @SerialName("batas_live_lama_menit")
    val batasLiveLamaMenit: Int? = null,
    @SerialName("toleransi_cocok_persen")
    val toleransiCocokPersen: Double? = null
)

sealed class ApiResult<out T> {
    data class Ok<T>(val data: T) : ApiResult<T>()
    data class Err(
        val statusCode: Int,
        val kode: String,
        val pesan: String,
        val detail: Map<String, String> = emptyMap(),
        val isNetworkError: Boolean = false
    ) : ApiResult<Nothing>()
}
