package id.pasticuan.wallet.data.repository

import android.net.Uri
import id.pasticuan.wallet.data.local.LocalAppStore
import id.pasticuan.wallet.data.remote.AnggotaCreateRequest
import id.pasticuan.wallet.data.remote.AnggotaPatchRequest
import id.pasticuan.wallet.data.remote.ApiResult
import id.pasticuan.wallet.data.remote.ArusTandaiRequest
import id.pasticuan.wallet.data.remote.PastiCuanApiClient
import id.pasticuan.wallet.data.remote.PengaturanPatchRequest
import id.pasticuan.wallet.data.remote.PermintaanCreateRequest
import id.pasticuan.wallet.data.remote.PermintaanSelesaiRequest
import id.pasticuan.wallet.data.remote.PosisiResponse
import id.pasticuan.wallet.data.remote.SnapshotCreateRequest
import id.pasticuan.wallet.data.remote.SnapshotCreateResponse
import id.pasticuan.wallet.data.remote.SnapshotPatchRequest
import id.pasticuan.wallet.data.remote.SupabaseSession
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import java.security.MessageDigest
import java.security.SecureRandom
import java.util.Base64

class PastiCuanRepository(
    private val api: PastiCuanApiClient,
    private val local: LocalAppStore
) {
    private val refreshMutex = Mutex()

    val isLiveConfigured: Boolean get() = api.isConfigured

    fun hasSession(): Boolean = local.loadSession() != null

    fun loadCachedPosisi(): PosisiResponse? = local.loadCachedPosisi()

    fun beginGoogleSignIn(): String {
        val bytes = ByteArray(48)
        SecureRandom().nextBytes(bytes)
        val verifier = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes)
        local.savePkceVerifier(verifier)
        val digest = MessageDigest.getInstance("SHA-256").digest(verifier.toByteArray(Charsets.US_ASCII))
        val challenge = Base64.getUrlEncoder().withoutPadding().encodeToString(digest)
        return api.buildGoogleAuthorizeUrl(challenge)
    }

    suspend fun handleAuthCallback(uri: Uri): ApiResult<PosisiResponse> {
        val err = uri.getQueryParameter("error")
        val errDesc = uri.getQueryParameter("error_description")
        if (!err.isNullOrBlank()) {
            local.consumePkceVerifier()
            val pesan = when (err) {
                "belum_terdaftar" -> "Akun Google ini belum terdaftar. Minta pengelola menambahkan email kamu."
                "access_denied" -> "Login dengan Google dibatalkan."
                else -> errDesc?.takeIf { it.isNotBlank() } ?: "Masuk dengan Google gagal. Silakan coba lagi."
            }
            return ApiResult.Err(401, "TIDAK_LOGIN", pesan)
        }

        val code = uri.getQueryParameter("code")
        val verifier = local.consumePkceVerifier()
        if (code.isNullOrBlank() || verifier.isNullOrBlank()) {
            return ApiResult.Err(401, "TIDAK_LOGIN", "Sesi login Google kedaluwarsa. Coba masuk lagi.")
        }

        val sessionRes = api.exchangePkceCode(code, verifier)
        if (sessionRes is ApiResult.Err) return sessionRes
        val session = (sessionRes as ApiResult.Ok).data
        local.saveSession(session)

        return when (val posRes = fetchPosisi()) {
            is ApiResult.Ok -> posRes
            is ApiResult.Err -> {
                if (posRes.statusCode == 401 || posRes.statusCode == 403) {
                    local.clearSession()
                }
                posRes
            }
        }
    }

    suspend fun logout() {
        val token = local.loadSession()?.accessToken.orEmpty()
        local.clearSession()
        if (token.isNotBlank()) {
            api.signOutSupabase(token)
        }
    }

    suspend fun fetchPosisi(): ApiResult<PosisiResponse> {
        val res = withValidToken { token -> api.getPosisiRaw(token) }
        return when (res) {
            is ApiResult.Ok -> {
                val (parsed, raw) = res.data
                local.saveCachedPosisiRaw(raw)
                ApiResult.Ok(parsed)
            }
            is ApiResult.Err -> {
                if (res.statusCode == 401 || res.statusCode == 403) {
                    local.clearSession()
                }
                res
            }
        }
    }

    suspend fun ajukanPermintaan(req: PermintaanCreateRequest): ApiResult<Unit> =
        withValidToken { api.ajukanPermintaan(it, req) }

    suspend fun batalkanPermintaan(id: String): ApiResult<Unit> =
        withValidToken { api.batalkanPermintaan(it, id) }

    suspend fun selesaikanPermintaan(id: String, req: PermintaanSelesaiRequest): ApiResult<Unit> =
        withValidToken { api.selesaikanPermintaan(it, id, req) }

    suspend fun tolakPermintaan(id: String, alasan: String): ApiResult<Unit> =
        withValidToken { api.tolakPermintaan(it, id, alasan) }

    suspend fun tandaiArus(req: ArusTandaiRequest): ApiResult<String> =
        withValidToken { api.tandaiArus(it, req) }

    suspend fun batalTandaiArus(id: String): ApiResult<Unit> =
        withValidToken { api.batalTandaiArus(it, id) }

    suspend fun simpanSnapshot(req: SnapshotCreateRequest): ApiResult<SnapshotCreateResponse> =
        withValidToken { api.simpanSnapshot(it, req) }

    suspend fun ubahSnapshot(tanggal: String, req: SnapshotPatchRequest): ApiResult<Unit> =
        withValidToken { api.ubahSnapshot(it, tanggal, req) }

    suspend fun hapusSnapshot(tanggal: String): ApiResult<Unit> =
        withValidToken { api.hapusSnapshot(it, tanggal) }

    suspend fun tambahAnggota(req: AnggotaCreateRequest): ApiResult<Unit> =
        withValidToken { api.tambahAnggota(it, req) }

    suspend fun ubahAnggota(id: String, req: AnggotaPatchRequest): ApiResult<Unit> =
        withValidToken { api.ubahAnggota(it, id, req) }

    suspend fun ubahPengaturan(req: PengaturanPatchRequest): ApiResult<Unit> =
        withValidToken { api.ubahPengaturan(it, req) }

    private suspend fun <T> withValidToken(block: suspend (String) -> ApiResult<T>): ApiResult<T> {
        val token = ensureFreshToken()
            ?: return ApiResult.Err(401, "TIDAK_LOGIN", "Sesi kamu berakhir. Silakan masuk lagi.")
        val first = block(token)
        if (first is ApiResult.Err && first.statusCode == 401) {
            val refreshed = refreshTokenLocked(force = true, failedAccessToken = token)
                ?: return first
            return block(refreshed.accessToken)
        }
        return first
    }

    private suspend fun ensureFreshToken(): String? {
        val current = local.loadSession() ?: return null
        if (!current.isExpiringSoon()) return current.accessToken
        return refreshTokenLocked(force = false, failedAccessToken = current.accessToken)?.accessToken
    }

    private suspend fun refreshTokenLocked(force: Boolean, failedAccessToken: String): SupabaseSession? =
        refreshMutex.withLock {
            val latest = local.loadSession() ?: return@withLock null
            if (!force && !latest.isExpiringSoon()) return@withLock latest
            if (force && latest.accessToken != failedAccessToken && !latest.isExpiringSoon()) {
                return@withLock latest
            }
            return@withLock when (val res = api.refreshSession(latest.refreshToken)) {
                is ApiResult.Ok -> {
                    local.saveSession(res.data)
                    res.data
                }
                is ApiResult.Err -> {
                    if (!res.isNetworkError && (res.statusCode == 400 || res.statusCode == 401 || res.statusCode == 403)) {
                        local.clearSession()
                    }
                    null
                }
            }
        }
}
