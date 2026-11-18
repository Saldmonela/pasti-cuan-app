package id.pasticuan.wallet.data.remote

import android.net.Uri
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.IOException
import java.util.concurrent.TimeUnit

class PastiCuanApiClient(
    private val apiBaseUrl: String,
    private val supabaseUrl: String,
    private val supabaseAnonKey: String,
    private val client: OkHttpClient = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(25, TimeUnit.SECONDS)
        .writeTimeout(20, TimeUnit.SECONDS)
        .build()
) {
    val json = Json {
        ignoreUnknownKeys = true
        coerceInputValues = true
        explicitNulls = false
    }

    private val jsonMediaType = "application/json; charset=utf-8".toMediaType()

    val isConfigured: Boolean
        get() = apiBaseUrl.isNotBlank() && supabaseUrl.isNotBlank() && supabaseAnonKey.isNotBlank()

    fun androidRedirectUrl(): String = "${apiBaseUrl.trimEnd('/')}/auth/android"

    fun buildGoogleAuthorizeUrl(codeChallenge: String, redirectTo: String = androidRedirectUrl()): String =
        Uri.parse("${supabaseUrl.trimEnd('/')}/auth/v1/authorize")
            .buildUpon()
            .appendQueryParameter("provider", "google")
            .appendQueryParameter("redirect_to", redirectTo)
            .appendQueryParameter("code_challenge", codeChallenge)
            .appendQueryParameter("code_challenge_method", "s256")
            .build()
            .toString()

    suspend fun exchangePkceCode(code: String, codeVerifier: String): ApiResult<SupabaseSession> =
        authTokenRequest(
            grantType = "pkce",
            payload = buildJsonObject {
                put("auth_code", code)
                put("code_verifier", codeVerifier)
            }.toString()
        )

    suspend fun refreshSession(refreshToken: String): ApiResult<SupabaseSession> =
        authTokenRequest(
            grantType = "refresh_token",
            payload = buildJsonObject {
                put("refresh_token", refreshToken)
            }.toString()
        )

    suspend fun signOutSupabase(accessToken: String) = withContext(Dispatchers.IO) {
        if (supabaseUrl.isBlank() || supabaseAnonKey.isBlank() || accessToken.isBlank()) return@withContext
        val req = Request.Builder()
            .url("${supabaseUrl.trimEnd('/')}/auth/v1/logout")
            .post("{}".toRequestBody(jsonMediaType))
            .header("apikey", supabaseAnonKey)
            .header("Authorization", "Bearer $accessToken")
            .build()
        runCatching { client.newCall(req).execute().close() }
    }

    private suspend fun authTokenRequest(grantType: String, payload: String): ApiResult<SupabaseSession> =
        withContext(Dispatchers.IO) {
            if (!isConfigured) {
                return@withContext ApiResult.Err(500, "KONFIGURASI", "Konfigurasi Supabase belum diisi.")
            }
            val url = "${supabaseUrl.trimEnd('/')}/auth/v1/token?grant_type=$grantType"
            val req = Request.Builder()
                .url(url)
                .post(payload.toRequestBody(jsonMediaType))
                .header("apikey", supabaseAnonKey)
                .header("Accept", "application/json")
                .build()
            try {
                client.newCall(req).execute().use { res ->
                    val raw = res.body?.string().orEmpty()
                    val parsed = runCatching { json.decodeFromString<SupabaseAuthResponse>(raw) }.getOrNull()
                    if (!res.isSuccessful || parsed == null || parsed.accessToken.isBlank() || parsed.refreshToken.isBlank()) {
                        val msg = parsed?.errorDescription ?: parsed?.msg ?: parsed?.error ?: "Masuk dengan Google gagal (${res.code})."
                        return@withContext ApiResult.Err(
                            statusCode = res.code,
                            kode = if (res.code == 401 || res.code == 400) "TIDAK_LOGIN" else "ATURAN_BISNIS",
                            pesan = msg
                        )
                    }
                    val now = System.currentTimeMillis()
                    val expMs = parsed.expiresAt?.let { it * 1000L } ?: (now + parsed.expiresIn * 1000L)
                    ApiResult.Ok(
                        SupabaseSession(
                            accessToken = parsed.accessToken,
                            refreshToken = parsed.refreshToken,
                            expiresAtMs = expMs,
                            userEmail = parsed.user?.email
                        )
                    )
                }
            } catch (_: IOException) {
                ApiResult.Err(0, "JARINGAN", "Koneksi gagal. Cek internet kamu lalu coba lagi.", isNetworkError = true)
            }
        }

    suspend fun getPosisiRaw(accessToken: String): ApiResult<Pair<PosisiResponse, String>> =
        executeRaw("GET", "/api/posisi", accessToken, bodyJson = null) { raw ->
            json.decodeFromString<PosisiResponse>(raw) to raw
        }

    suspend fun ajukanPermintaan(accessToken: String, body: PermintaanCreateRequest): ApiResult<Unit> =
        executeUnit("POST", "/api/permintaan", accessToken, json.encodeToString(body))

    suspend fun batalkanPermintaan(accessToken: String, id: String): ApiResult<Unit> =
        executeUnit("POST", "/api/permintaan/${Uri.encode(id)}/batal", accessToken, "{}")

    suspend fun selesaikanPermintaan(accessToken: String, id: String, body: PermintaanSelesaiRequest): ApiResult<Unit> =
        executeUnit("POST", "/api/permintaan/${Uri.encode(id)}/selesai", accessToken, json.encodeToString(body))

    suspend fun tolakPermintaan(accessToken: String, id: String, alasan: String): ApiResult<Unit> =
        executeUnit("POST", "/api/permintaan/${Uri.encode(id)}/tolak", accessToken, json.encodeToString(PermintaanTolakRequest(alasan)))

    suspend fun tandaiArus(accessToken: String, body: ArusTandaiRequest): ApiResult<String> =
        executeRaw("POST", "/api/arus-onchain/tandai", accessToken, json.encodeToString(body)) { raw ->
            val parsed = runCatching { json.decodeFromString<PesanResponse>(raw) }.getOrNull()
            parsed?.pesan ?: "Transfer diperbarui."
        }

    suspend fun batalTandaiArus(accessToken: String, id: String): ApiResult<Unit> =
        executeUnit("DELETE", "/api/arus-onchain/tandai?id=${Uri.encode(id)}", accessToken, null)

    suspend fun simpanSnapshot(accessToken: String, body: SnapshotCreateRequest): ApiResult<SnapshotCreateResponse> =
        executeRaw("POST", "/api/snapshot", accessToken, json.encodeToString(body)) { raw ->
            runCatching { json.decodeFromString<SnapshotCreateResponse>(raw) }.getOrDefault(SnapshotCreateResponse())
        }

    suspend fun ubahSnapshot(accessToken: String, tanggal: String, body: SnapshotPatchRequest): ApiResult<Unit> =
        executeUnit("PATCH", "/api/snapshot/${Uri.encode(tanggal)}", accessToken, json.encodeToString(body))

    suspend fun hapusSnapshot(accessToken: String, tanggal: String): ApiResult<Unit> =
        executeUnit("DELETE", "/api/snapshot/${Uri.encode(tanggal)}", accessToken, null)

    suspend fun tambahAnggota(accessToken: String, body: AnggotaCreateRequest): ApiResult<Unit> =
        executeUnit("POST", "/api/anggota", accessToken, json.encodeToString(body))

    suspend fun ubahAnggota(accessToken: String, id: String, body: AnggotaPatchRequest): ApiResult<Unit> =
        executeUnit("PATCH", "/api/anggota/${Uri.encode(id)}", accessToken, json.encodeToString(body))

    suspend fun ubahPengaturan(accessToken: String, body: PengaturanPatchRequest): ApiResult<Unit> =
        executeUnit("PATCH", "/api/pengaturan", accessToken, json.encodeToString(body))

    private suspend fun executeUnit(
        method: String,
        path: String,
        accessToken: String,
        bodyJson: String?
    ): ApiResult<Unit> = executeRaw(method, path, accessToken, bodyJson) { }

    private suspend fun <T> executeRaw(
        method: String,
        path: String,
        accessToken: String,
        bodyJson: String?,
        decode: (String) -> T
    ): ApiResult<T> = withContext(Dispatchers.IO) {
        if (!isConfigured) {
            return@withContext ApiResult.Err(500, "KONFIGURASI", "Konfigurasi backend belum diisi.")
        }
        val url = "${apiBaseUrl.trimEnd('/')}$path"
        val reqBody = bodyJson?.toRequestBody(jsonMediaType)
        val req = Request.Builder()
            .url(url)
            .method(method, reqBody)
            .header("Authorization", "Bearer $accessToken")
            .header("X-Client-Platform", "android")
            .header("Accept", "application/json")
            .header("Cache-Control", "no-store")
            .build()

        try {
            client.newCall(req).execute().use { res ->
                val raw = res.body?.string().orEmpty()
                if (!res.isSuccessful) {
                    val err = runCatching { json.decodeFromString<ApiErrorBody>(raw) }.getOrNull()
                    return@withContext ApiResult.Err(
                        statusCode = res.code,
                        kode = err?.kode ?: when (res.code) {
                            401 -> "TIDAK_LOGIN"
                            403 -> "TIDAK_BERHAK"
                            404 -> "TIDAK_DITEMUKAN"
                            409 -> "KONFLIK"
                            else -> "ATURAN_BISNIS"
                        },
                        pesan = err?.pesan?.takeIf { it.isNotBlank() } ?: "Gagal memuat data (${res.code}).",
                        detail = err?.detail.orEmpty()
                    )
                }
                val value = runCatching { decode(raw) }.getOrElse { ex ->
                    return@withContext ApiResult.Err(
                        statusCode = 500,
                        kode = "PARSE_ERROR",
                        pesan = "Format respons server tidak dikenali: ${ex.localizedMessage ?: "error"}"
                    )
                }
                ApiResult.Ok(value)
            }
        } catch (_: IOException) {
            ApiResult.Err(0, "JARINGAN", "Koneksi gagal. Cek internet kamu lalu coba lagi.", isNetworkError = true)
        }
    }
}
