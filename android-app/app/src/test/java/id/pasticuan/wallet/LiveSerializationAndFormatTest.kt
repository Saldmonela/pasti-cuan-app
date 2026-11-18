package id.pasticuan.wallet

import android.content.Context
import androidx.test.core.app.ApplicationProvider
import id.pasticuan.wallet.data.local.LocalAppStore
import id.pasticuan.wallet.data.remote.ApiResult
import id.pasticuan.wallet.data.remote.PastiCuanApiClient
import id.pasticuan.wallet.data.remote.PengaturanPatchRequest
import id.pasticuan.wallet.data.remote.SupabaseSession
import id.pasticuan.wallet.data.repository.PastiCuanRepository
import id.pasticuan.wallet.domain.engine.PoolEngine
import id.pasticuan.wallet.domain.model.Satuan
import id.pasticuan.wallet.domain.util.Formatters
import kotlinx.coroutines.runBlocking
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Protocol
import okhttp3.Response
import okhttp3.ResponseBody.Companion.toResponseBody
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import java.util.concurrent.atomic.AtomicInteger

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class LiveSerializationAndFormatTest {

    @Test
    fun formattersHandlesPostgresAndIsoTimestamps() {
        val expectedMs = Formatters.ms("2026-11-17T08:00:00+07:00")
        assertEquals(expectedMs, Formatters.ms("2026-11-17T01:00:00+00:00"))
        assertEquals(expectedMs, Formatters.ms("2026-11-17T01:00:00.000000Z"))
        assertEquals(expectedMs, Formatters.ms("2026-11-17 01:00:00+00"))
        assertEquals("2026-11-17T08:00:00+07:00", Formatters.wibIso("2026-11-17 01:00:00+00"))
        assertEquals("17 Nov 2026, 08.00 WIB", Formatters.waktu("2026-11-17 01:00:00.123456+00"))
    }

    @Test
    fun repositoryFetchesPosisiRefreshesExpiredTokenAndSupportsPatch() = runBlocking {
        val samplePayload = """
            {
              "saya": {
                "id": "u-salman",
                "nama": "Salman",
                "email": "salman@example.com",
                "peran": "investor",
                "aktif": true,
                "dibuatPada": "2026-10-16 01:00:00+00"
              },
              "tanggal_data": "2026-11-18",
              "versi_data": "2026-11-18T01:00:00+00:00",
              "sekarang": 1795000000000,
              "data": {
                "anggota": [
                  {
                    "id": "u-salman",
                    "nama": "Salman",
                    "email": "salman@example.com",
                    "peran": "investor",
                    "aktif": true,
                    "dibuatPada": "2026-10-16 01:00:00+00"
                  },
                  {
                    "id": "u-galih",
                    "nama": "Galih",
                    "email": "",
                    "peran": "pengelola",
                    "aktif": true,
                    "dibuatPada": "2026-10-16 01:00:00+00"
                  }
                ],
                "snapshots": [
                  {
                    "tanggal": "2026-10-16",
                    "sumber": "impor",
                    "nilaiUsd": 100.0,
                    "saldoSol": 1.0,
                    "feeLpDiklaimSol": null,
                    "dibuatOleh": "sistem",
                    "dibuatPada": "2026-10-16T01:00:00Z"
                  }
                ],
                "permintaan": [
                  {
                    "id": "p-1",
                    "anggotaId": "u-salman",
                    "jenis": "setor",
                    "jumlahUsd": 100.0,
                    "status": "selesai",
                    "tanggalEfektif": "2026-10-16",
                    "waktuEfektif": "2026-10-16T08:00:00+07:00",
                    "jumlahFinalUsd": 100.0,
                    "sumber": "impor",
                    "dibuatPada": "2026-10-16T01:00:00Z"
                  }
                ],
                "arus": [
                  {
                    "id": "a-1",
                    "signature": "sig1",
                    "urutan": 0,
                    "waktu": "2026-11-18T02:00:00+00:00",
                    "arah": "masuk",
                    "token": "USDC",
                    "jumlah": 10.0,
                    "nilaiUsd": 10.0,
                    "alamatLawan": "",
                    "status": "bukan_arus"
                  }
                ],
                "estimasi": false,
                "log": [
                  {
                    "id": "1",
                    "tabel": "snapshot",
                    "aksi": "insert",
                    "ringkasan": "Snapshot impor",
                    "oleh": "sistem",
                    "pada": "2026-10-16 01:00:00+00"
                  }
                ],
                "pengaturan": {
                  "namaPool": "Pasti Cuan",
                  "tanggalMulai": "2026-10-16",
                  "feePersen": 0.1,
                  "satuanDasarFee": "USD",
                  "batasDataLamaHari": 2,
                  "ambangLonjakanPersen": 30,
                  "alamatWalletPool": "By6HpsukcTeVsV6FyBzhQJ2nzdHP46kXaSPtrCGUzoaR",
                  "jamSnapshot": "08:00",
                  "ambangLikuiditasTokenUsd": 10000,
                  "ambangDustUsd": 1,
                  "batasLiveLamaMenit": 15,
                  "toleransiCocokPersen": 2
                }
              },
              "titik": [
                {
                  "id": 99,
                  "ms": 1794999940000,
                  "nilaiUsd": 115.0,
                  "saldoSol": 1.15,
                  "harga": 100.0
                }
              ],
              "arusBelumCount": 0,
              "hasil": { "unknownServerField": true },
              "resmi": { "unknownServerField": true }
            }
        """.trimIndent()

        val posisiCalls = AtomicInteger(0)
        val patchMethodSeen = AtomicInteger(0)
        val jsonType = "application/json".toMediaType()

        val mockClient = OkHttpClient.Builder()
            .addInterceptor { chain ->
                val req = chain.request()
                val path = req.url.encodedPath
                val auth = req.header("Authorization")

                val (code, body) = when (path) {
                    "/auth/v1/token" -> {
                        200 to """{"access_token":"token-new","refresh_token":"ref-new","expires_in":3600}"""
                    }
                    "/api/posisi" -> {
                        val n = posisiCalls.incrementAndGet()
                        if (auth == "Bearer token-old" && n == 1) {
                            401 to """{"kode":"TIDAK_LOGIN","pesan":"expired"}"""
                        } else if (auth == "Bearer token-new") {
                            200 to samplePayload
                        } else {
                            403 to """{"kode":"TIDAK_BERHAK","pesan":"forbidden"}"""
                        }
                    }
                    "/api/pengaturan" -> {
                        if (req.method == "PATCH") patchMethodSeen.incrementAndGet()
                        200 to """{"pengaturan":{}}"""
                    }
                    else -> 404 to "{}"
                }

                Response.Builder()
                    .request(req)
                    .protocol(Protocol.HTTP_1_1)
                    .code(code)
                    .message("OK")
                    .body(body.toResponseBody(jsonType))
                    .build()
            }
            .build()

        val ctx = ApplicationProvider.getApplicationContext<Context>()
        val local = LocalAppStore(ctx).apply {
            clearSession()
            saveSession(
                SupabaseSession(
                    accessToken = "token-old",
                    refreshToken = "ref-old",
                    expiresAtMs = System.currentTimeMillis() + 3_600_000L
                )
            )
        }
        val api = PastiCuanApiClient(
            apiBaseUrl = "https://example.test",
            supabaseUrl = "https://example.test",
            supabaseAnonKey = "anon-key",
            client = mockClient
        )
        val repo = PastiCuanRepository(api, local)

        val res = repo.fetchPosisi()
        assertTrue("Expected Ok but got $res", res is ApiResult.Ok)
        val payload = (res as ApiResult.Ok).data
        assertEquals("Salman", payload.saya?.nama)
        assertEquals(1, payload.titik.size)
        assertFalse(payload.titik.first().estimasi)
        assertNotNull(local.loadCachedPosisi())
        assertEquals("token-new", local.loadSession()?.accessToken)

        val hasil = PoolEngine.hitungPool(
            anggota = payload.data.anggota,
            snapshots = payload.data.snapshots,
            permintaan = payload.data.permintaan,
            set = payload.data.pengaturan,
            arus = payload.data.arus,
            titikReferensi = payload.titik
        )
        assertTrue(hasil.cek.lolos)
        assertEquals(100.0, hasil.posisi.first { it.id == "u-salman" }.netUsd, 0.01)

        val patchRes = repo.ubahPengaturan(PengaturanPatchRequest(satuanDasarFee = Satuan.USD))
        assertTrue(patchRes is ApiResult.Ok)
        assertEquals(1, patchMethodSeen.get())
    }
}
