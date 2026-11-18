package id.pasticuan.wallet.data.local

import android.content.Context
import id.pasticuan.wallet.data.remote.PosisiResponse
import id.pasticuan.wallet.data.remote.SupabaseSession
import id.pasticuan.wallet.domain.model.ModeSatuan
import id.pasticuan.wallet.ui.theme.ModeTema
import id.pasticuan.wallet.ui.theme.PengaturanKaca
import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

@Serializable
private data class UiPreferencesPayload(
    val modeSatuan: String = ModeSatuan.USD.name,
    val modeTema: String = ModeTema.SISTEM.name,
    val liquidGlass: Boolean = true,
    val modeRingan: Boolean = false,
    val progressiveBlur: Boolean = true,
    val pillPhysics: Boolean = true,
    val kurangiAnimasi: Boolean = false
)

class LocalAppStore(context: Context) {
    private val prefs = context.applicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    private val json = Json {
        ignoreUnknownKeys = true
        coerceInputValues = true
        encodeDefaults = true
    }

    fun loadSession(): SupabaseSession? {
        val raw = prefs.getString(KEY_SESSION, null) ?: return null
        return runCatching { json.decodeFromString<SupabaseSession>(raw) }.getOrNull()
    }

    fun saveSession(session: SupabaseSession) {
        prefs.edit().putString(KEY_SESSION, json.encodeToString(session)).apply()
    }

    fun clearSession() {
        prefs.edit()
            .remove(KEY_SESSION)
            .remove(KEY_PKCE_VERIFIER)
            .remove(KEY_CACHED_POSISI)
            .apply()
    }

    fun savePkceVerifier(verifier: String) {
        prefs.edit().putString(KEY_PKCE_VERIFIER, verifier).apply()
    }

    fun consumePkceVerifier(): String? {
        val v = prefs.getString(KEY_PKCE_VERIFIER, null)
        if (v != null) prefs.edit().remove(KEY_PKCE_VERIFIER).apply()
        return v
    }

    fun loadCachedPosisi(): PosisiResponse? {
        val raw = prefs.getString(KEY_CACHED_POSISI, null) ?: return null
        return runCatching { json.decodeFromString<PosisiResponse>(raw) }.getOrNull()
    }

    fun saveCachedPosisiRaw(rawJson: String) {
        prefs.edit().putString(KEY_CACHED_POSISI, rawJson).apply()
    }

    fun loadUiPreferences(): Triple<ModeSatuan, ModeTema, PengaturanKaca> {
        val raw = prefs.getString(KEY_UI_PREFS, null)
        if (raw.isNullOrBlank()) {
            return Triple(ModeSatuan.USD, ModeTema.SISTEM, PengaturanKaca())
        }
        val payload = runCatching { json.decodeFromString<UiPreferencesPayload>(raw) }.getOrNull()
            ?: return Triple(ModeSatuan.USD, ModeTema.SISTEM, PengaturanKaca())
        val satuan = runCatching { ModeSatuan.valueOf(payload.modeSatuan) }.getOrDefault(ModeSatuan.USD)
        val tema = runCatching { ModeTema.valueOf(payload.modeTema) }.getOrDefault(ModeTema.SISTEM)
        val kaca = PengaturanKaca(
            liquidGlass = payload.liquidGlass,
            modeRingan = payload.modeRingan,
            progressiveBlur = payload.progressiveBlur,
            pillPhysics = payload.pillPhysics,
            kurangiAnimasi = payload.kurangiAnimasi
        )
        return Triple(satuan, tema, kaca)
    }

    fun saveUiPreferences(satuan: ModeSatuan, tema: ModeTema, kaca: PengaturanKaca) {
        val payload = UiPreferencesPayload(
            modeSatuan = satuan.name,
            modeTema = tema.name,
            liquidGlass = kaca.liquidGlass,
            modeRingan = kaca.modeRingan,
            progressiveBlur = kaca.progressiveBlur,
            pillPhysics = kaca.pillPhysics,
            kurangiAnimasi = kaca.kurangiAnimasi
        )
        prefs.edit().putString(KEY_UI_PREFS, json.encodeToString(payload)).apply()
    }

    companion object {
        private const val PREFS_NAME = "pasti_cuan_live_store"
        private const val KEY_SESSION = "supabase_session_v1"
        private const val KEY_PKCE_VERIFIER = "pkce_verifier_v1"
        private const val KEY_CACHED_POSISI = "cached_posisi_v1"
        private const val KEY_UI_PREFS = "ui_prefs_v1"
    }
}
