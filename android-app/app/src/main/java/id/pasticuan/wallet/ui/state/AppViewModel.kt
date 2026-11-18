package id.pasticuan.wallet.ui.state

import android.app.Application
import android.content.Context
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.net.Uri
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import id.pasticuan.wallet.BuildConfig
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
import id.pasticuan.wallet.data.remote.SnapshotPatchRequest
import id.pasticuan.wallet.data.repository.PastiCuanRepository
import id.pasticuan.wallet.domain.engine.OnchainSimulator
import id.pasticuan.wallet.domain.engine.PoolEngine
import id.pasticuan.wallet.domain.engine.SeedData
import id.pasticuan.wallet.domain.model.Anggota
import id.pasticuan.wallet.domain.model.ArahArus
import id.pasticuan.wallet.domain.model.ArusOnchain
import id.pasticuan.wallet.domain.model.DataPool
import id.pasticuan.wallet.domain.model.Jenis
import id.pasticuan.wallet.domain.model.LogAudit
import id.pasticuan.wallet.domain.model.ModeSatuan
import id.pasticuan.wallet.domain.model.Pengaturan
import id.pasticuan.wallet.domain.model.Peran
import id.pasticuan.wallet.domain.model.Permintaan
import id.pasticuan.wallet.domain.model.Rentang
import id.pasticuan.wallet.domain.model.Snapshot
import id.pasticuan.wallet.domain.model.StatusArus
import id.pasticuan.wallet.domain.model.StatusPermintaan
import id.pasticuan.wallet.domain.model.SumberSnapshot
import id.pasticuan.wallet.domain.model.TitikNilai
import id.pasticuan.wallet.domain.util.Formatters
import id.pasticuan.wallet.ui.theme.ModeTema
import id.pasticuan.wallet.ui.theme.PengaturanKaca
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.util.UUID
import kotlin.math.abs

enum class AppRoute {
    BERANDA,
    POOL,
    TRANSAKSI,
    KELOLA,
    KELOLA_ARUS,
    KELOLA_SALDO,
    KELOLA_PERMINTAAN,
    KELOLA_ANGGOTA,
    KELOLA_PENGATURAN,
    LAINNYA,
    SETOR,
    TARIK,
    LOG;

    /** Tab induk untuk kapsul navigasi bawah (paritas Shell.tsx INDUK & sub-rute). */
    val parentTab: AppRoute
        get() = when (this) {
            LOG -> LAINNYA
            KELOLA_ARUS, KELOLA_SALDO, KELOLA_PERMINTAAN, KELOLA_ANGGOTA, KELOLA_PENGATURAN -> KELOLA
            else -> this
        }

    /** TANPA_NAV di Shell.tsx hanya ["/setor", "/tarik"]. */
    val showBottomNav: Boolean
        get() = this != SETOR && this != TARIK
}

data class AppUiState(
    val siap: Boolean = false,
    val isSimulasiMode: Boolean = false,
    val butuhMasuk: Boolean = false,
    val sedangLogin: Boolean = false,
    val pesanErrorAuth: String? = null,
    val gagalMuat: String? = null,
    val memuatUlang: Boolean = false,
    val sedangMengirim: Boolean = false,
    val offline: Boolean = false,
    val currentRoute: AppRoute = AppRoute.BERANDA,
    val backStack: List<AppRoute> = emptyList(),
    val sayaId: String = "",
    val versiData: String = "",
    val modeSatuan: ModeSatuan = ModeSatuan.USD,
    val modeTema: ModeTema = ModeTema.SISTEM,
    val kaca: PengaturanKaca = PengaturanKaca(),
    val data: DataPool? = null,
    val titik: List<TitikNilai> = emptyList(),
    val resmi: PoolEngine.HasilPool? = null,
    val hasil: PoolEngine.HasilPool? = null,
    val sekarangMs: Long = System.currentTimeMillis(),
    val toastMessage: String? = null,
    val gantiAkunSheetTerbuka: Boolean = false
) {
    val saya: Anggota? get() = data?.anggota?.firstOrNull { it.id == sayaId }
    val menunggu: List<Permintaan>
        get() = data?.permintaan?.filter { it.status == StatusPermintaan.MENUNGGU } ?: emptyList()
    val arusBelum: List<ArusOnchain>
        get() = data?.arus?.filter { it.status == StatusArus.BELUM } ?: emptyList()
    val hariIni: String get() = Formatters.isoWib(sekarangMs).substring(0, 10)
    val titikAkhir: TitikNilai? get() = titik.filter { !it.estimasi }.maxByOrNull { it.ms }
    val lamaLiveMenit: Long
        get() {
            val akhirMs = hasil?.live?.ms ?: titikAkhir?.ms ?: return Long.MAX_VALUE
            return ((sekarangMs - akhirMs) / 60_000L).coerceAtLeast(0L)
        }
    val dataLama: Boolean
        get() {
            val set = data?.pengaturan ?: return false
            val tgl = hasil?.tanggalData ?: return false
            val snapLama = Formatters.selisihHari(tgl, hariIni) > set.batasDataLamaHari
            val liveBerhenti = hasil?.live == null || lamaLiveMenit > set.batasDataLamaHari * 24L * 60L
            return snapLama && liveBerhenti
        }
}

class AppViewModel(application: Application) : AndroidViewModel(application) {

    private val localStore = LocalAppStore(application)
    private val apiClient = PastiCuanApiClient(
        apiBaseUrl = BuildConfig.API_BASE_URL,
        supabaseUrl = BuildConfig.SUPABASE_URL,
        supabaseAnonKey = BuildConfig.SUPABASE_ANON_KEY
    )
    private val repository = PastiCuanRepository(apiClient, localStore)

    private val _state = MutableStateFlow(AppUiState())
    val state: StateFlow<AppUiState> = _state.asStateFlow()

    private var simulator: OnchainSimulator? = null
    private var pollingJob: Job? = null
    private var lastFetchAtMs: Long = 0L
    private var isForeground: Boolean = true

    init {
        val (savedSatuan, savedTema, savedKaca) = localStore.loadUiPreferences()
        _state.update { it.copy(modeSatuan = savedSatuan, modeTema = savedTema, kaca = savedKaca) }

        if (repository.isLiveConfigured) {
            mulaiModeLive()
        } else {
            viewModelScope.launch { mulaiModeSimulasi() }
        }
    }

    private fun mulaiModeLive() {
        if (!repository.hasSession()) {
            _state.update {
                it.copy(
                    siap = true,
                    isSimulasiMode = false,
                    butuhMasuk = true,
                    gagalMuat = null,
                    data = null,
                    hasil = null,
                    resmi = null
                )
            }
            return
        }

        viewModelScope.launch {
            val cached = withContext(Dispatchers.IO) { repository.loadCachedPosisi() }
            if (cached != null) {
                terapkanPayloadLive(cached, offline = !isNetworkOnline())
            }
            refreshLive(force = true)
            mulaiPollingForeground()
        }
    }

    /** Dipakai bila user mengaktifkan Mode Prototype offline khusus debug / test, atau saat build tanpa env. */
    fun aktifkanModeSimulasiLokal() {
        pollingJob?.cancel()
        viewModelScope.launch { mulaiModeSimulasi() }
    }

    private suspend fun mulaiModeSimulasi() {
        val loaded = withContext(Dispatchers.Default) {
            val json = getApplication<Application>().assets
                .open("harga_pasar.json")
                .bufferedReader()
                .use { it.readText() }
            val s = OnchainSimulator(json)
            val data = SeedData.buatDataAwal(s)
            val est = s.titikEstimasi(data.snapshots, data.permintaan)
            val livePts = s.semuaTitik()
            val gabunganTitik = est + livePts
            val nowMs = Formatters.ms(SeedData.WAKTU_AWAL)
            val resmi = PoolEngine.hitungPool(
                anggota = data.anggota,
                snapshots = data.snapshots,
                permintaan = data.permintaan,
                set = data.pengaturan,
                arus = data.arus,
                titikReferensi = gabunganTitik
            )
            val hasil = PoolEngine.terapkanLive(
                h = resmi,
                anggota = data.anggota,
                snaps = data.snapshots,
                arus = data.arus,
                titik = gabunganTitik,
                sekarang = nowMs,
                set = data.pengaturan
            )
            InitResult(s, data, gabunganTitik, resmi, hasil, nowMs)
        }
        simulator = loaded.sim
        _state.update {
            it.copy(
                siap = true,
                isSimulasiMode = true,
                butuhMasuk = false,
                gagalMuat = null,
                pesanErrorAuth = null,
                offline = false,
                sayaId = "salman",
                sekarangMs = loaded.nowMs,
                data = loaded.data,
                titik = loaded.titik,
                resmi = loaded.resmi,
                hasil = loaded.hasil
            )
        }
    }

    private data class InitResult(
        val sim: OnchainSimulator,
        val data: DataPool,
        val titik: List<TitikNilai>,
        val resmi: PoolEngine.HasilPool,
        val hasil: PoolEngine.HasilPool,
        val nowMs: Long
    )

    private suspend fun terapkanPayloadLive(payload: PosisiResponse, offline: Boolean) {
        val computed = withContext(Dispatchers.Default) {
            val sortedTitik = payload.titik.sortedBy { it.ms }
            val nowMs = if (payload.sekarang > 0L) payload.sekarang else System.currentTimeMillis()
            val resmi = PoolEngine.hitungPool(
                anggota = payload.data.anggota,
                snapshots = payload.data.snapshots,
                permintaan = payload.data.permintaan,
                set = payload.data.pengaturan,
                arus = payload.data.arus,
                titikReferensi = sortedTitik
            )
            val hasil = PoolEngine.terapkanLive(
                h = resmi,
                anggota = payload.data.anggota,
                snaps = payload.data.snapshots,
                arus = payload.data.arus,
                titik = sortedTitik,
                sekarang = nowMs,
                set = payload.data.pengaturan
            )
            Triple(sortedTitik, resmi, hasil) to nowMs
        }
        val (triple, nowMs) = computed
        val (sortedTitik, resmi, hasil) = triple
        val sayaId = payload.saya?.id ?: _state.value.sayaId
        val peranSaya = payload.saya?.peran ?: payload.data.anggota.firstOrNull { it.id == sayaId }?.peran

        _state.update { cur ->
            val routeAman = if (cur.currentRoute.parentTab == AppRoute.KELOLA && peranSaya != Peran.PENGELOLA) {
                AppRoute.BERANDA
            } else cur.currentRoute
            cur.copy(
                siap = true,
                isSimulasiMode = false,
                butuhMasuk = false,
                sedangLogin = false,
                pesanErrorAuth = null,
                gagalMuat = null,
                memuatUlang = false,
                offline = offline,
                sayaId = sayaId,
                versiData = payload.versiData,
                sekarangMs = nowMs,
                data = payload.data,
                titik = sortedTitik,
                resmi = resmi,
                hasil = hasil,
                currentRoute = routeAman,
                backStack = if (routeAman != cur.currentRoute) emptyList() else cur.backStack
            )
        }
    }

    // ---------- Auth Google PKCE & Siklus Hidup ----------

    fun buatUrlLoginGoogle(): String {
        _state.update { it.copy(pesanErrorAuth = null) }
        return repository.beginGoogleSignIn()
    }

    fun tanganiCallbackLogin(uri: Uri) {
        if (uri.scheme != "pasticuan" || uri.host != "auth-callback") return
        viewModelScope.launch {
            _state.update { it.copy(sedangLogin = true, pesanErrorAuth = null) }
            when (val res = repository.handleAuthCallback(uri)) {
                is ApiResult.Ok -> {
                    lastFetchAtMs = System.currentTimeMillis()
                    terapkanPayloadLive(res.data, offline = false)
                    mulaiPollingForeground()
                }
                is ApiResult.Err -> {
                    _state.update {
                        it.copy(
                            siap = true,
                            butuhMasuk = true,
                            sedangLogin = false,
                            pesanErrorAuth = res.pesan
                        )
                    }
                }
            }
        }
    }

    fun setAppForeground(foreground: Boolean) {
        isForeground = foreground
        val cur = _state.value
        if (cur.isSimulasiMode || cur.butuhMasuk || !repository.hasSession()) return
        if (foreground) {
            val elapsed = System.currentTimeMillis() - lastFetchAtMs
            if (elapsed > 15_000L) {
                viewModelScope.launch { refreshLive(force = false) }
            }
            mulaiPollingForeground()
        } else {
            pollingJob?.cancel()
            pollingJob = null
        }
    }

    private fun mulaiPollingForeground() {
        pollingJob?.cancel()
        if (!isForeground || _state.value.isSimulasiMode || _state.value.butuhMasuk) return
        pollingJob = viewModelScope.launch {
            while (isActive) {
                delay(60_000L)
                if (isForeground && !_state.value.isSimulasiMode && !_state.value.butuhMasuk) {
                    refreshLive(force = false)
                }
            }
        }
    }

    suspend fun refreshLive(force: Boolean = true) {
        if (_state.value.isSimulasiMode || !repository.isLiveConfigured) return
        if (!repository.hasSession()) {
            _state.update { it.copy(siap = true, butuhMasuk = true, memuatUlang = false) }
            return
        }
        if (force) {
            _state.update { it.copy(memuatUlang = true) }
        }
        when (val res = repository.fetchPosisi()) {
            is ApiResult.Ok -> {
                lastFetchAtMs = System.currentTimeMillis()
                terapkanPayloadLive(res.data, offline = false)
            }
            is ApiResult.Err -> {
                if (res.statusCode == 401 || res.statusCode == 403) {
                    pollingJob?.cancel()
                    _state.update {
                        it.copy(
                            siap = true,
                            butuhMasuk = true,
                            sedangLogin = false,
                            memuatUlang = false,
                            gagalMuat = null,
                            pesanErrorAuth = res.pesan,
                            data = null,
                            hasil = null,
                            resmi = null
                        )
                    }
                    return
                }

                val cur = _state.value
                val punyaData = cur.data != null && cur.hasil != null
                if (punyaData) {
                    _state.update {
                        it.copy(
                            siap = true,
                            memuatUlang = false,
                            offline = res.isNetworkError || !isNetworkOnline()
                        )
                    }
                } else {
                    _state.update {
                        it.copy(
                            siap = true,
                            memuatUlang = false,
                            offline = res.isNetworkError || !isNetworkOnline(),
                            gagalMuat = res.pesan
                        )
                    }
                }
            }
        }
    }

    fun segarkanManual() {
        viewModelScope.launch { refreshLive(force = true) }
    }

    fun keluar() {
        if (_state.value.isSimulasiMode) {
            if (repository.isLiveConfigured) {
                _state.update {
                    it.copy(
                        isSimulasiMode = false,
                        butuhMasuk = true,
                        data = null,
                        hasil = null,
                        resmi = null,
                        currentRoute = AppRoute.BERANDA,
                        backStack = emptyList()
                    )
                }
            }
            return
        }
        pollingJob?.cancel()
        viewModelScope.launch {
            repository.logout()
            _state.update {
                it.copy(
                    siap = true,
                    butuhMasuk = true,
                    sedangLogin = false,
                    pesanErrorAuth = null,
                    gagalMuat = null,
                    memuatUlang = false,
                    offline = false,
                    sayaId = "",
                    versiData = "",
                    data = null,
                    titik = emptyList(),
                    hasil = null,
                    resmi = null,
                    currentRoute = AppRoute.BERANDA,
                    backStack = emptyList()
                )
            }
        }
    }

    private fun isNetworkOnline(): Boolean {
        val cm = getApplication<Application>().getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager
            ?: return true
        val net = cm.activeNetwork ?: return false
        val caps = cm.getNetworkCapabilities(net) ?: return false
        return caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
    }

    private fun recompute(newData: DataPool) {
        val s = _state.value
        val resmi = PoolEngine.hitungPool(
            anggota = newData.anggota,
            snapshots = newData.snapshots,
            permintaan = newData.permintaan,
            set = newData.pengaturan,
            arus = newData.arus,
            titikReferensi = s.titik
        )
        val live = PoolEngine.terapkanLive(
            h = resmi,
            anggota = newData.anggota,
            snaps = newData.snapshots,
            arus = newData.arus,
            titik = s.titik,
            sekarang = s.sekarangMs,
            set = newData.pengaturan
        )
        _state.update { it.copy(data = newData, resmi = resmi, hasil = live) }
    }

    fun seri(rentang: Rentang, anggotaId: String? = null): PoolEngine.Seri {
        val s = _state.value
        val d = s.data ?: return PoolEngine.Seri(if (anggotaId != null) "saya" else "pool", emptyList(), 0)
        val h = s.resmi ?: s.hasil ?: return PoolEngine.Seri(if (anggotaId != null) "saya" else "pool", emptyList(), 0)
        val ctx = PoolEngine.KonteksSeri(
            h = h,
            anggota = d.anggota,
            snaps = d.snapshots,
            permintaan = d.permintaan,
            arus = d.arus,
            titik = s.titik,
            sekarang = s.sekarangMs,
            set = d.pengaturan
        )
        return PoolEngine.seriRentang(ctx, rentang, anggotaId)
    }

    fun navigateTo(route: AppRoute, isTab: Boolean = false) {
        _state.update { cur ->
            if (cur.currentRoute == route) return@update cur
            if (isTab) {
                cur.copy(currentRoute = route, backStack = emptyList())
            } else {
                cur.copy(currentRoute = route, backStack = cur.backStack + cur.currentRoute)
            }
        }
    }

    fun navigateBack(fallback: AppRoute = AppRoute.BERANDA): Boolean {
        val cur = _state.value
        if (cur.backStack.isEmpty()) {
            if (cur.currentRoute != fallback) {
                _state.update { it.copy(currentRoute = fallback) }
                return true
            }
            return false
        }
        val prev = cur.backStack.last()
        _state.update { it.copy(currentRoute = prev, backStack = cur.backStack.dropLast(1)) }
        return true
    }

    fun setModeSatuan(mode: ModeSatuan) {
        _state.update { cur ->
            localStore.saveUiPreferences(mode, cur.modeTema, cur.kaca)
            cur.copy(modeSatuan = mode)
        }
    }

    fun setModeTema(tema: ModeTema) {
        _state.update { cur ->
            localStore.saveUiPreferences(cur.modeSatuan, tema, cur.kaca)
            cur.copy(modeTema = tema)
        }
    }

    fun updateKaca(transform: (PengaturanKaca) -> PengaturanKaca) {
        _state.update { cur ->
            val updated = transform(cur.kaca)
            localStore.saveUiPreferences(cur.modeSatuan, cur.modeTema, updated)
            cur.copy(kaca = updated)
        }
    }

    fun setOfflineSimulasi(offline: Boolean) {
        if (!_state.value.isSimulasiMode) return
        _state.update { it.copy(offline = offline) }
    }

    fun bukaGantiAkun(terbuka: Boolean) {
        if (!_state.value.isSimulasiMode) return
        _state.update { it.copy(gantiAkunSheetTerbuka = terbuka) }
    }

    fun pilihAkunSimulasi(id: String) {
        if (!_state.value.isSimulasiMode) return
        val cur = _state.value
        val targetAnggota = cur.data?.anggota?.firstOrNull { it.id == id } ?: return
        val nextRoute = if (cur.currentRoute.parentTab == AppRoute.KELOLA && targetAnggota.peran != Peran.PENGELOLA) {
            AppRoute.BERANDA
        } else cur.currentRoute
        _state.update {
            it.copy(
                sayaId = id,
                currentRoute = nextRoute,
                backStack = if (nextRoute == AppRoute.BERANDA && cur.currentRoute != AppRoute.BERANDA) emptyList() else cur.backStack,
                gantiAkunSheetTerbuka = false
            )
        }
        tampilkanToast("Beralih akun simulasi: ${targetAnggota.nama} (${if (targetAnggota.peran == Peran.PENGELOLA) "Pengelola" else "Investor"})")
    }

    fun tampilkanToast(pesan: String) {
        _state.update { it.copy(toastMessage = pesan) }
        viewModelScope.launch {
            delay(4000)
            _state.update { cur -> if (cur.toastMessage == pesan) cur.copy(toastMessage = null) else cur }
        }
    }

    fun cekPembaruanAplikasi() {
        val labelMode = if (_state.value.isSimulasiMode) "Mode Simulasi" else "Live"
        tampilkanToast("Aplikasi sudah versi terbaru (v${BuildConfig.VERSION_NAME} · $labelMode).")
    }

    private suspend fun <T> jalankanMutasiLive(block: suspend () -> ApiResult<T>): ApiResult<T> {
        _state.update { it.copy(sedangMengirim = true) }
        return try {
            val res = block()
            if (res is ApiResult.Ok) {
                refreshLive(force = false)
            } else if (res is ApiResult.Err && (res.statusCode == 401 || res.statusCode == 403)) {
                pollingJob?.cancel()
                _state.update {
                    it.copy(
                        butuhMasuk = true,
                        pesanErrorAuth = res.pesan,
                        data = null,
                        hasil = null,
                        resmi = null
                    )
                }
            }
            res
        } finally {
            _state.update { it.copy(sedangMengirim = false) }
        }
    }

    // ---------- Investor: Setor / Tarik / Batal ----------

    suspend fun ajukanSetor(jumlahUsd: Double, tanggalTransfer: String, bukti: String?, catatan: String?): String? {
        val s = _state.value
        if (!s.isSimulasiMode) {
            val req = PermintaanCreateRequest(
                jenis = Jenis.SETOR,
                jumlahUsd = jumlahUsd,
                tanggalTransfer = tanggalTransfer,
                buktiTransaksi = bukti?.trim()?.takeIf { it.isNotEmpty() },
                catatan = catatan?.trim()?.takeIf { it.isNotEmpty() }
            )
            return when (val res = jalankanMutasiLive { repository.ajukanPermintaan(req) }) {
                is ApiResult.Ok -> {
                    tampilkanToast("Permintaan setoran ${Formatters.usd(jumlahUsd)} terkirim. Pengelola akan mengonfirmasi setelah dana diterima.")
                    navigateTo(AppRoute.TRANSAKSI, isTab = true)
                    null
                }
                is ApiResult.Err -> res.pesan
            }
        }

        val d = s.data ?: return "Data belum siap."
        val saya = s.saya ?: return "Sesi tidak ditemukan."
        if (s.menunggu.any { it.anggotaId == saya.id && it.jenis == Jenis.SETOR }) {
            return "Kamu masih punya permintaan setoran yang menunggu. Batalkan atau tunggu yang itu selesai dulu."
        }
        val baru = Permintaan(
            id = "p-${UUID.randomUUID().toString().take(6)}",
            anggotaId = saya.id,
            jenis = Jenis.SETOR,
            jumlahUsd = jumlahUsd,
            tanggalTransfer = tanggalTransfer,
            buktiTransaksi = bukti?.takeIf { it.isNotBlank() },
            catatan = catatan?.takeIf { it.isNotBlank() },
            status = StatusPermintaan.MENUNGGU,
            sumber = "app",
            dibuatOleh = saya.id,
            dibuatPada = Formatters.isoWib(s.sekarangMs)
        )
        val logBaru = LogAudit(
            id = "log-${UUID.randomUUID().toString().take(6)}",
            tabel = "permintaan",
            aksi = "insert",
            ringkasan = "Mengajukan setoran ${Formatters.usd(jumlahUsd)}",
            nilaiBaru = Formatters.usd(jumlahUsd),
            oleh = saya.id,
            pada = Formatters.isoWib(s.sekarangMs)
        )
        recompute(d.copy(permintaan = d.permintaan + baru, log = listOf(logBaru) + d.log))
        tampilkanToast("Permintaan setoran ${Formatters.usd(jumlahUsd)} terkirim. Pengelola akan mengonfirmasi setelah dana diterima.")
        navigateTo(AppRoute.TRANSAKSI, isTab = true)
        return null
    }

    suspend fun ajukanTarik(jumlahUsd: Double, alamatTujuan: String?, catatan: String?): String? {
        val s = _state.value
        if (!s.isSimulasiMode) {
            val req = PermintaanCreateRequest(
                jenis = Jenis.TARIK,
                jumlahUsd = jumlahUsd,
                alamatWalletTujuan = alamatTujuan?.trim()?.takeIf { it.isNotEmpty() },
                catatan = catatan?.trim()?.takeIf { it.isNotEmpty() },
                versiData = s.versiData.takeIf { it.isNotBlank() }
            )
            return when (val res = jalankanMutasiLive { repository.ajukanPermintaan(req) }) {
                is ApiResult.Ok -> {
                    tampilkanToast("Permintaan tarik ${Formatters.usd(jumlahUsd)} terkirim. Status: menunggu pengelola.")
                    navigateTo(AppRoute.TRANSAKSI, isTab = true)
                    null
                }
                is ApiResult.Err -> res.pesan
            }
        }

        val d = s.data ?: return "Data belum siap."
        val saya = s.saya ?: return "Sesi tidak ditemukan."
        if (s.menunggu.any { it.anggotaId == saya.id && it.jenis == Jenis.TARIK }) {
            return "Kamu masih punya permintaan penarikan yang menunggu. Batalkan atau tunggu yang itu selesai dulu."
        }
        val baru = Permintaan(
            id = "p-${UUID.randomUUID().toString().take(6)}",
            anggotaId = saya.id,
            jenis = Jenis.TARIK,
            jumlahUsd = jumlahUsd,
            alamatWalletTujuan = alamatTujuan?.takeIf { it.isNotBlank() },
            catatan = catatan?.takeIf { it.isNotBlank() },
            status = StatusPermintaan.MENUNGGU,
            sumber = "app",
            dibuatOleh = saya.id,
            dibuatPada = Formatters.isoWib(s.sekarangMs)
        )
        val logBaru = LogAudit(
            id = "log-${UUID.randomUUID().toString().take(6)}",
            tabel = "permintaan",
            aksi = "insert",
            ringkasan = "Mengajukan penarikan ${Formatters.usd(jumlahUsd)}",
            nilaiBaru = Formatters.usd(jumlahUsd),
            oleh = saya.id,
            pada = Formatters.isoWib(s.sekarangMs)
        )
        recompute(d.copy(permintaan = d.permintaan + baru, log = listOf(logBaru) + d.log))
        tampilkanToast("Permintaan tarik ${Formatters.usd(jumlahUsd)} terkirim. Status: menunggu pengelola.")
        navigateTo(AppRoute.TRANSAKSI, isTab = true)
        return null
    }

    suspend fun batalkanPermintaan(permintaanId: String): String? {
        val s = _state.value
        val d = s.data ?: return "Data belum siap."
        val target = d.permintaan.firstOrNull { it.id == permintaanId }
        val labelJenis = if (target?.jenis == Jenis.SETOR) "setoran" else "penarikan"

        if (!s.isSimulasiMode) {
            return when (val res = jalankanMutasiLive { repository.batalkanPermintaan(permintaanId) }) {
                is ApiResult.Ok -> {
                    tampilkanToast("Permintaan $labelJenis dibatalkan.")
                    null
                }
                is ApiResult.Err -> {
                    tampilkanToast(res.pesan)
                    res.pesan
                }
            }
        }

        val saya = s.saya ?: return "Sesi tidak ditemukan."
        if (target == null || target.anggotaId != saya.id || target.status != StatusPermintaan.MENUNGGU) return null
        val updated = d.permintaan.map {
            if (it.id == permintaanId) it.copy(status = StatusPermintaan.DIBATALKAN) else it
        }
        val logBaru = LogAudit(
            id = "log-${UUID.randomUUID().toString().take(6)}",
            tabel = "permintaan",
            aksi = "update",
            ringkasan = "Membatalkan permintaan $labelJenis ${Formatters.usd(target.jumlahUsd)}",
            nilaiLama = "Menunggu",
            nilaiBaru = "Dibatalkan",
            oleh = saya.id,
            pada = Formatters.isoWib(s.sekarangMs)
        )
        recompute(d.copy(permintaan = updated, log = listOf(logBaru) + d.log))
        tampilkanToast("Permintaan $labelJenis dibatalkan.")
        return null
    }

    // ---------- Pengelola: Permintaan (Selesai Manual & Tolak — US-03B / US-04B) ----------

    suspend fun selesaikanPermintaanManual(
        permintaanId: String,
        tanggalEfektif: String,
        jumlahFinalUsd: Double,
        bukti: String?,
        alasan: String?
    ): String? {
        val s = _state.value
        val d = s.data ?: return "Data belum siap."
        val target = d.permintaan.firstOrNull { it.id == permintaanId }
        val namaPemilik = target?.let { t -> d.anggota.firstOrNull { it.id == t.anggotaId }?.nama ?: t.anggotaId } ?: ""
        val labelJenis = if (target?.jenis == Jenis.SETOR) "Setoran" else "Penarikan"

        if (!s.isSimulasiMode) {
            val req = PermintaanSelesaiRequest(
                tanggalEfektif = tanggalEfektif,
                jumlahFinalUsd = jumlahFinalUsd,
                buktiTransaksi = bukti?.trim()?.takeIf { it.isNotEmpty() },
                alasan = alasan?.trim()?.takeIf { it.isNotEmpty() }
            )
            return when (val res = jalankanMutasiLive { repository.selesaikanPermintaan(permintaanId, req) }) {
                is ApiResult.Ok -> {
                    tampilkanToast("$labelJenis $namaPemilik ${Formatters.usd(jumlahFinalUsd)} selesai. Semua posisi sudah diperbarui.")
                    null
                }
                is ApiResult.Err -> res.pesan
            }
        }

        val saya = s.saya ?: return "Sesi tidak ditemukan."
        if (target == null || target.status != StatusPermintaan.MENUNGGU) {
            return "Permintaan ini sudah diproses."
        }
        if (d.snapshots.none { it.tanggal == tanggalEfektif }) {
            return "Belum ada saldo untuk ${Formatters.tanggal(tanggalEfektif)}. Isi saldo tanggal itu dulu."
        }
        if (abs(jumlahFinalUsd - target.jumlahUsd) > 0.004 && alasan.isNullOrBlank()) {
            return "Alasan jumlah berbeda wajib diisi."
        }

        val updatedPermintaan = d.permintaan.map {
            if (it.id == permintaanId) {
                it.copy(
                    status = StatusPermintaan.SELESAI,
                    tanggalEfektif = tanggalEfektif,
                    jumlahFinalUsd = jumlahFinalUsd,
                    buktiTransaksi = bukti?.takeIf { b -> b.isNotBlank() } ?: it.buktiTransaksi,
                    alasan = alasan?.takeIf { a -> a.isNotBlank() },
                    diprosesOleh = saya.id,
                    diprosesPada = Formatters.isoWib(s.sekarangMs)
                )
            } else it
        }

        if (target.jenis == Jenis.TARIK) {
            val uji = PoolEngine.hitungPool(d.anggota, d.snapshots, updatedPermintaan, d.pengaturan, d.arus, s.titik)
            if (uji.cek.penyebab.any { it.startsWith("Penarikan $namaPemilik") }) {
                val netNow = s.hasil?.posisi?.firstOrNull { it.id == target.anggotaId }?.netUsd ?: 0.0
                return "Nilai bersih investor sekarang ${Formatters.usd(netNow)}, kurang dari ${Formatters.usd(jumlahFinalUsd)} yang diminta."
            }
        }

        val logBaru = LogAudit(
            id = "log-${UUID.randomUUID().toString().take(6)}",
            tabel = "permintaan",
            aksi = "update",
            ringkasan = "Menyelesaikan ${labelJenis.lowercase()} $namaPemilik pada ${Formatters.tanggal(tanggalEfektif)}",
            nilaiLama = "Menunggu (${Formatters.usd(target.jumlahUsd)})",
            nilaiBaru = "Selesai (${Formatters.usd(jumlahFinalUsd)})",
            oleh = saya.id,
            pada = Formatters.isoWib(s.sekarangMs)
        )
        recompute(d.copy(permintaan = updatedPermintaan, log = listOf(logBaru) + d.log))
        tampilkanToast("$labelJenis $namaPemilik ${Formatters.usd(jumlahFinalUsd)} selesai. Semua posisi sudah diperbarui.")
        return null
    }

    suspend fun tolakPermintaan(permintaanId: String, alasan: String): String? {
        val s = _state.value
        val d = s.data ?: return "Data belum siap."
        val bersihAlasan = alasan.trim()
        if (bersihAlasan.isEmpty()) return "Alasan penolakan wajib diisi."
        val target = d.permintaan.firstOrNull { it.id == permintaanId }
        val namaPemilik = target?.let { t -> d.anggota.firstOrNull { it.id == t.anggotaId }?.nama ?: t.anggotaId } ?: "Anggota"

        if (!s.isSimulasiMode) {
            return when (val res = jalankanMutasiLive { repository.tolakPermintaan(permintaanId, bersihAlasan) }) {
                is ApiResult.Ok -> {
                    tampilkanToast("Permintaan $namaPemilik ditolak.")
                    null
                }
                is ApiResult.Err -> res.pesan
            }
        }

        val saya = s.saya ?: return "Sesi tidak ditemukan."
        if (target == null || target.status != StatusPermintaan.MENUNGGU) {
            return "Permintaan ini sudah diproses."
        }
        val updated = d.permintaan.map {
            if (it.id == permintaanId) {
                it.copy(
                    status = StatusPermintaan.DITOLAK,
                    alasan = bersihAlasan,
                    diprosesOleh = saya.id,
                    diprosesPada = Formatters.isoWib(s.sekarangMs)
                )
            } else it
        }
        val logBaru = LogAudit(
            id = "log-${UUID.randomUUID().toString().take(6)}",
            tabel = "permintaan",
            aksi = "update",
            ringkasan = "Menolak permintaan $namaPemilik (${Formatters.usd(target.jumlahUsd)})",
            nilaiLama = "Menunggu",
            nilaiBaru = "Ditolak: $bersihAlasan",
            oleh = saya.id,
            pada = Formatters.isoWib(s.sekarangMs)
        )
        recompute(d.copy(permintaan = updated, log = listOf(logBaru) + d.log))
        tampilkanToast("Permintaan $namaPemilik ditolak.")
        return null
    }

    // ---------- Pengelola: Arus Onchain (US-13 — 4 Mode + Batal Tandai) ----------

    suspend fun prosesArusOnchain(
        arusIds: List<String>,
        mode: String, // "cocok" | "buat" | "biaya" | "bukan_arus"
        permintaanId: String? = null,
        anggotaId: String? = null,
        catatan: String? = null,
        alasanSelisih: String? = null
    ): String? {
        val s = _state.value
        if (!s.isSimulasiMode) {
            val statusServer = if (mode == "cocok") "dicocokkan" else mode
            val req = ArusTandaiRequest(
                ids = arusIds,
                status = statusServer,
                permintaanId = if (mode == "cocok") permintaanId else null,
                anggotaId = if (mode == "buat") anggotaId else null,
                catatan = if (mode == "biaya" || mode == "bukan_arus") catatan?.trim() else null,
                alasanSelisih = if (mode == "cocok" || mode == "buat") alasanSelisih?.trim()?.takeIf { it.isNotEmpty() } else null
            )
            return when (val res = jalankanMutasiLive { repository.tandaiArus(req) }) {
                is ApiResult.Ok -> {
                    tampilkanToast(res.data)
                    null
                }
                is ApiResult.Err -> res.pesan
            }
        }

        val d = s.data ?: return "Data belum siap."
        val saya = s.saya ?: return "Sesi tidak ditemukan."
        val pilih = d.arus.filter { it.id in arusIds }
        if (pilih.isEmpty()) return "Pilih minimal satu transfer."
        if (pilih.any { it.status != StatusArus.BELUM }) return "Transfer ini sudah dicocokkan."
        val arah = pilih.first().arah
        if (pilih.any { it.arah != arah }) return "Transfer masuk dan keluar tidak bisa digabung."

        val urutPilih = pilih.sortedBy { Formatters.ms(it.waktu) }
        val waktuTerakhir = urutPilih.last().waktu
        val kapan = Formatters.waktu(waktuTerakhir)
        val totalUsd = Formatters.rounded(pilih.sumOf { it.nilaiUsd }, 2)
        val nowIso = Formatters.isoWib(s.sekarangMs)

        if (mode == "biaya" || mode == "bukan_arus") {
            val cat = catatan?.trim().orEmpty()
            if (cat.isEmpty()) return "Catatan wajib diisi."
            val st = if (mode == "biaya") StatusArus.BIAYA else StatusArus.BUKAN_ARUS
            val updatedArus = d.arus.map { a ->
                if (a.id in arusIds) a.copy(status = st, catatan = cat, ditandaiOleh = saya.id, ditandaiPada = nowIso) else a
            }
            val logBaru = LogAudit(
                id = "log-${UUID.randomUUID().toString().take(6)}",
                tabel = "arus",
                aksi = "update",
                ringkasan = "Menandai transfer $kapan sebagai ${st.label}",
                nilaiLama = "Belum dicocokkan",
                nilaiBaru = "${st.label} ($cat)",
                oleh = saya.id,
                pada = nowIso
            )
            recompute(d.copy(arus = updatedArus, log = listOf(logBaru) + d.log))
            tampilkanToast(if (mode == "biaya") "Transfer $kapan ditandai biaya pool." else "Transfer $kapan ditandai bukan arus.")
            return null
        }

        val jenis = if (arah == ArahArus.MASUK) Jenis.SETOR else Jenis.TARIK
        val msTransfer = Formatters.ms(waktuTerakhir)
        val titikAcuan = OnchainSimulator.titikTerakhir(s.titik.filter { !it.estimasi }, msTransfer)
            ?: s.titik.firstOrNull { !it.estimasi }
            ?: return "Belum ada titik nilai onchain untuk menilai transfer ini."

        val bukti = urutPilih.joinToString(", ") { it.signature }.take(100)
        val alasanBersih = alasanSelisih?.trim()?.takeIf { it.isNotEmpty() }

        var finalPermintaanId = permintaanId
        var finalAnggotaId = anggotaId
        var listPermintaanBaru = d.permintaan

        if (mode == "cocok") {
            val targetP = d.permintaan.firstOrNull { it.id == permintaanId && it.status == StatusPermintaan.MENUNGGU }
                ?: return "Pilih permintaan menunggu yang sesuai."
            if (targetP.jenis != jenis) return "Arah transfer tidak sesuai jenis permintaan."
            val selisihPct = abs(totalUsd - targetP.jumlahUsd) / targetP.jumlahUsd * 100.0
            if (selisihPct > d.pengaturan.toleransiCocokPersen && alasanBersih == null) {
                return "Jumlah transfer ${Formatters.usd(totalUsd)} berbeda dari permintaan ${Formatters.usd(targetP.jumlahUsd)}. Isi alasan untuk melanjutkan."
            }
            finalAnggotaId = targetP.anggotaId
            listPermintaanBaru = d.permintaan.map { p ->
                if (p.id == targetP.id) {
                    p.copy(
                        status = StatusPermintaan.SELESAI,
                        waktuEfektif = waktuTerakhir,
                        titikNilaiId = titikAcuan.id,
                        jumlahFinalUsd = totalUsd,
                        buktiTransaksi = bukti,
                        alasan = alasanBersih ?: p.alasan,
                        diprosesOleh = saya.id,
                        diprosesPada = nowIso
                    )
                } else p
            }
        } else if (mode == "buat") {
            val ang = d.anggota.firstOrNull { it.id == anggotaId } ?: return "Pilih anggota."
            if (d.permintaan.any { it.anggotaId == ang.id && it.jenis == jenis && it.status == StatusPermintaan.MENUNGGU }) {
                return "${ang.nama} masih punya ${if (jenis == Jenis.SETOR) "setoran" else "penarikan"} yang menunggu. Cocokkan dengan permintaan itu."
            }
            val newId = "p-${UUID.randomUUID().toString().take(6)}"
            finalPermintaanId = newId
            finalAnggotaId = ang.id
            val created = Permintaan(
                id = newId,
                anggotaId = ang.id,
                jenis = jenis,
                jumlahUsd = totalUsd,
                tanggalTransfer = Formatters.wibIso(waktuTerakhir).substring(0, 10),
                buktiTransaksi = bukti,
                status = StatusPermintaan.SELESAI,
                waktuEfektif = waktuTerakhir,
                titikNilaiId = titikAcuan.id,
                jumlahFinalUsd = totalUsd,
                alasan = alasanBersih,
                sumber = "app",
                dibuatOleh = saya.id,
                diprosesOleh = saya.id,
                diprosesPada = nowIso,
                dibuatPada = nowIso
            )
            listPermintaanBaru = d.permintaan + created
        } else {
            return "Mode penandaan tidak valid."
        }

        val namaAnggota = d.anggota.firstOrNull { it.id == finalAnggotaId }?.nama ?: finalAnggotaId.orEmpty()
        val updatedArus = d.arus.map { a ->
            if (a.id in arusIds) {
                a.copy(
                    status = StatusArus.DICOCOKKAN,
                    permintaanId = finalPermintaanId,
                    alasanSelisih = alasanBersih,
                    ditandaiOleh = saya.id,
                    ditandaiPada = nowIso
                )
            } else a
        }

        if (jenis == Jenis.TARIK) {
            val uji = PoolEngine.hitungPool(d.anggota, d.snapshots, listPermintaanBaru, d.pengaturan, updatedArus, s.titik)
            if (uji.cek.penyebab.any { it.startsWith("Penarikan $namaAnggota") }) {
                return "Jumlah transfer ${Formatters.usd(totalUsd)} melebihi nilai bersih $namaAnggota saat transfer terjadi."
            }
        }

        val labelTx = "${if (jenis == Jenis.SETOR) "setoran" else "penarikan"} $namaAnggota ${Formatters.usd(totalUsd)}"
        val logBaru = LogAudit(
            id = "log-${UUID.randomUUID().toString().take(6)}",
            tabel = "arus",
            aksi = "update",
            ringkasan = "Mencocokkan transfer $kapan ke $labelTx (efektif waktu transfer)",
            nilaiLama = "Belum dicocokkan",
            nilaiBaru = "Dicocokkan ($labelTx)",
            oleh = saya.id,
            pada = nowIso
        )
        recompute(d.copy(arus = updatedArus, permintaan = listPermintaanBaru, log = listOf(logBaru) + d.log))
        tampilkanToast("Transfer $kapan dicocokkan dengan $labelTx (efektif waktu transfer).")
        return null
    }

    suspend fun batalTandaiArus(arusId: String): String? {
        val s = _state.value
        val d = s.data ?: return "Data belum siap."
        val target = d.arus.firstOrNull { it.id == arusId }

        if (!s.isSimulasiMode) {
            return when (val res = jalankanMutasiLive { repository.batalTandaiArus(arusId) }) {
                is ApiResult.Ok -> {
                    val ket = target?.let { Formatters.waktu(it.waktu) } ?: "transfer"
                    tampilkanToast("Penandaan transfer $ket dibatalkan.")
                    null
                }
                is ApiResult.Err -> res.pesan
            }
        }

        val saya = s.saya ?: return "Sesi tidak ditemukan."
        if (target == null) return "Transfer tidak ditemukan."
        if (target.status == StatusArus.BELUM) return "Transfer ini belum ditandai."

        val snapMengunci = d.snapshots.firstOrNull {
            Formatters.msSnapshot(it.tanggal, d.pengaturan.jamSnapshot) > Formatters.ms(target.waktu)
        }
        if (snapMengunci != null) {
            return "Transfer ini sudah dipakai snapshot ${Formatters.tanggal(snapMengunci.tanggal)}. Perbaiki lewat koreksi saldo."
        }
        val pTerkait = d.permintaan.firstOrNull { it.id == target.permintaanId }
        if (pTerkait != null && pTerkait.status == StatusPermintaan.SELESAI) {
            return "Permintaan terkait sudah selesai. Perbaiki lewat koreksi."
        }

        val updated = d.arus.map { a ->
            if (a.id == arusId) {
                a.copy(
                    status = StatusArus.BELUM,
                    permintaanId = null,
                    catatan = null,
                    alasanSelisih = null,
                    ditandaiOleh = null,
                    ditandaiPada = null
                )
            } else a
        }
        val logBaru = LogAudit(
            id = "log-${UUID.randomUUID().toString().take(6)}",
            tabel = "arus",
            aksi = "update",
            ringkasan = "Membatalkan penandaan transfer ${Formatters.waktu(target.waktu)}",
            nilaiLama = target.status.label,
            nilaiBaru = "Belum dicocokkan",
            oleh = saya.id,
            pada = Formatters.isoWib(s.sekarangMs)
        )
        recompute(d.copy(arus = updated, log = listOf(logBaru) + d.log))
        tampilkanToast("Penandaan transfer ${Formatters.waktu(target.waktu)} dibatalkan.")
        return null
    }

    // ---------- Pengelola: Snapshot Saldo (US-02A / US-02B) ----------

    suspend fun simpanSnapshot(
        tanggal: String,
        nilaiUsd: Double,
        saldoSol: Double,
        feeLpSol: Double?,
        catatan: String?,
        alasan: String?,
        isUbah: Boolean
    ): String? {
        val s = _state.value
        if (!s.isSimulasiMode) {
            val res = if (isUbah) {
                val req = SnapshotPatchRequest(
                    nilaiUsd = nilaiUsd,
                    saldoSol = saldoSol,
                    feeLpDiklaimSol = feeLpSol,
                    catatan = catatan?.trim()?.takeIf { it.isNotEmpty() },
                    alasan = alasan?.trim()?.takeIf { it.isNotEmpty() },
                    konfirmasiHitungUlang = true
                )
                jalankanMutasiLive { repository.ubahSnapshot(tanggal, req) }
            } else {
                val req = SnapshotCreateRequest(
                    tanggal = tanggal,
                    nilaiUsd = nilaiUsd,
                    saldoSol = saldoSol,
                    feeLpDiklaimSol = feeLpSol,
                    catatan = catatan?.trim()?.takeIf { it.isNotEmpty() }
                )
                jalankanMutasiLive { repository.simpanSnapshot(req) }
            }
            return when (res) {
                is ApiResult.Ok -> {
                    tampilkanToast("Saldo ${Formatters.tanggal(tanggal)} tersimpan. Semua posisi sudah diperbarui.")
                    null
                }
                is ApiResult.Err -> res.pesan
            }
        }

        val d = s.data ?: return "Data belum siap."
        val saya = s.saya ?: return "Sesi tidak ditemukan."
        val nowIso = Formatters.isoWib(s.sekarangMs)
        val existing = d.snapshots.firstOrNull { it.tanggal == tanggal }

        if (!isUbah && existing != null) {
            return "Saldo untuk ${Formatters.tanggal(tanggal)} sudah ada. Ubah data yang ada atau pilih tanggal lain."
        }
        if (isUbah && existing == null) {
            return "Snapshot tanggal tersebut tidak ditemukan."
        }

        val newSnaps = if (isUbah && existing != null) {
            d.snapshots.map {
                if (it.tanggal == tanggal) {
                    it.copy(
                        sumber = SumberSnapshot.KOREKSI,
                        nilaiUsd = nilaiUsd,
                        saldoSol = saldoSol,
                        feeLpDiklaimSol = feeLpSol,
                        catatan = catatan?.takeIf { c -> c.isNotBlank() },
                        alasan = alasan?.takeIf { a -> a.isNotBlank() },
                        diubahPada = nowIso
                    )
                } else it
            }
        } else {
            (d.snapshots + Snapshot(
                tanggal = tanggal,
                sumber = SumberSnapshot.MANUAL,
                nilaiUsd = nilaiUsd,
                saldoSol = saldoSol,
                feeLpDiklaimSol = feeLpSol,
                catatan = catatan?.takeIf { it.isNotBlank() },
                dibuatOleh = saya.id,
                dibuatPada = nowIso
            )).sortedBy { it.tanggal }
        }

        val uji = PoolEngine.hitungPool(d.anggota, newSnaps, d.permintaan, d.pengaturan, d.arus, s.titik)
        val pelanggaranTarik = uji.cek.penyebab.firstOrNull { it.startsWith("Penarikan ") }
        if (pelanggaranTarik != null) {
            return "Koreksi ditolak karena melanggar konsistensi penarikan: $pelanggaranTarik"
        }

        val logBaru = LogAudit(
            id = "log-${UUID.randomUUID().toString().take(6)}",
            tabel = "snapshot",
            aksi = if (isUbah) "update" else "insert",
            ringkasan = if (isUbah) {
                "Mengoreksi snapshot ${Formatters.tanggal(tanggal)}" + (alasan?.takeIf { it.isNotBlank() }?.let { " ($it)" } ?: "")
            } else {
                "Mencatat snapshot manual ${Formatters.tanggal(tanggal)}"
            },
            nilaiLama = existing?.let { "${Formatters.usd(it.nilaiUsd)} · ${Formatters.sol(it.saldoSol)}" },
            nilaiBaru = "${Formatters.usd(nilaiUsd)} · ${Formatters.sol(saldoSol)}",
            oleh = saya.id,
            pada = nowIso
        )
        recompute(d.copy(snapshots = newSnaps, log = listOf(logBaru) + d.log))
        tampilkanToast("Saldo ${Formatters.tanggal(tanggal)} tersimpan. Semua posisi sudah diperbarui.")
        return null
    }

    suspend fun hapusSnapshot(tanggal: String): String? {
        val s = _state.value
        if (!s.isSimulasiMode) {
            return when (val res = jalankanMutasiLive { repository.hapusSnapshot(tanggal) }) {
                is ApiResult.Ok -> {
                    tampilkanToast("Saldo ${Formatters.tanggal(tanggal)} dihapus. Semua posisi sudah diperbarui.")
                    null
                }
                is ApiResult.Err -> {
                    tampilkanToast(res.pesan)
                    res.pesan
                }
            }
        }

        val d = s.data ?: return "Data belum siap."
        val saya = s.saya ?: return "Sesi tidak ditemukan."
        val existing = d.snapshots.firstOrNull { it.tanggal == tanggal } ?: return "Snapshot tidak ditemukan."
        val dipakai = d.permintaan.any { it.status == StatusPermintaan.SELESAI && it.tanggalEfektif == tanggal }
        if (dipakai) {
            return "Saldo ini dipakai sebagai tanggal efektif transaksi, jadi hanya bisa diubah, tidak bisa dihapus."
        }
        val sisa = d.snapshots.filterNot { it.tanggal == tanggal }
        val logBaru = LogAudit(
            id = "log-${UUID.randomUUID().toString().take(6)}",
            tabel = "snapshot",
            aksi = "delete",
            ringkasan = "Menghapus snapshot ${Formatters.tanggal(tanggal)}",
            nilaiLama = "${Formatters.usd(existing.nilaiUsd)} · ${Formatters.sol(existing.saldoSol)}",
            nilaiBaru = null,
            oleh = saya.id,
            pada = Formatters.isoWib(s.sekarangMs)
        )
        recompute(d.copy(snapshots = sisa, log = listOf(logBaru) + d.log))
        tampilkanToast("Saldo ${Formatters.tanggal(tanggal)} dihapus. Semua posisi sudah diperbarui.")
        return null
    }

    // ---------- Pengelola: Anggota (US-07B — Tanpa Ubah Email Eksisting) ----------

    suspend fun tambahAnggota(nama: String, email: String, peran: Peran, alamatList: List<String>): Map<String, String> {
        val s = _state.value
        val nm = nama.trim()
        val em = email.trim().lowercase()
        val cleanedWallet = alamatList.map { it.trim() }.filter { it.isNotEmpty() }.distinct()

        if (!s.isSimulasiMode) {
            val req = AnggotaCreateRequest(nama = nm, email = em, peran = peran, alamatWallet = cleanedWallet)
            return when (val res = jalankanMutasiLive { repository.tambahAnggota(req) }) {
                is ApiResult.Ok -> {
                    tampilkanToast("$nm ditambahkan. Ia bisa masuk dengan akun Google $em.")
                    emptyMap()
                }
                is ApiResult.Err -> {
                    if (res.detail.isNotEmpty()) res.detail
                    else mapOf("form" to res.pesan)
                }
            }
        }

        val d = s.data ?: return mapOf("form" to "Data belum siap.")
        val saya = s.saya ?: return mapOf("form" to "Sesi tidak ditemukan.")
        val errs = mutableMapOf<String, String>()

        if (nm.length !in 2..40) errs["nama"] = "Nama harus 2 sampai 40 karakter."
        else if (d.anggota.any { it.nama.equals(nm, ignoreCase = true) }) errs["nama"] = "Nama ini sudah terdaftar."

        if (!em.contains("@") || !em.contains(".")) errs["email"] = "Masukkan alamat email Google yang valid."
        else if (d.anggota.any { it.email.equals(em, ignoreCase = true) }) errs["email"] = "Email ini sudah terdaftar."

        if (cleanedWallet.any { !Formatters.isSolanaAddress(it) }) {
            errs["alamat"] = "Alamat wallet Solana harus 32–44 karakter (huruf dan angka base58)."
        }
        if (errs.isNotEmpty()) return errs

        val nowIso = Formatters.isoWib(s.sekarangMs)
        val baru = Anggota(
            id = nm.lowercase().replace(Regex("[^a-z0-9]"), "") + "-" + UUID.randomUUID().toString().take(4),
            nama = nm,
            email = em,
            peran = peran,
            aktif = true,
            alamatWallet = cleanedWallet,
            dibuatPada = nowIso
        )
        val logBaru = LogAudit(
            id = "log-${UUID.randomUUID().toString().take(6)}",
            tabel = "anggota",
            aksi = "insert",
            ringkasan = "Menambahkan anggota ${baru.nama} (${if (peran == Peran.PENGELOLA) "Pengelola" else "Investor"})",
            nilaiBaru = "${baru.nama} · ${baru.email}",
            oleh = saya.id,
            pada = nowIso
        )
        recompute(d.copy(anggota = d.anggota + baru, log = listOf(logBaru) + d.log))
        tampilkanToast("${baru.nama} ditambahkan. Ia bisa masuk dengan akun Google ${baru.email}.")
        return emptyMap()
    }

    suspend fun ubahWalletAnggota(anggotaId: String, alamatList: List<String>): String? {
        val s = _state.value
        val d = s.data ?: return "Data belum siap."
        val target = d.anggota.firstOrNull { it.id == anggotaId } ?: return "Anggota tidak ditemukan."
        val cleaned = alamatList.map { it.trim() }.filter { it.isNotEmpty() }.distinct()
        if (cleaned.any { !Formatters.isSolanaAddress(it) }) {
            return "Alamat wallet Solana harus 32–44 karakter (huruf dan angka base58)."
        }

        if (!s.isSimulasiMode) {
            val req = AnggotaPatchRequest(alamatWallet = cleaned)
            return when (val res = jalankanMutasiLive { repository.ubahAnggota(anggotaId, req) }) {
                is ApiResult.Ok -> {
                    tampilkanToast("Alamat wallet ${target.nama} diperbarui.")
                    null
                }
                is ApiResult.Err -> res.pesan
            }
        }

        val saya = s.saya ?: return "Sesi tidak ditemukan."
        val updated = d.anggota.map {
            if (it.id == anggotaId) it.copy(alamatWallet = cleaned) else it
        }
        val logBaru = LogAudit(
            id = "log-${UUID.randomUUID().toString().take(6)}",
            tabel = "anggota",
            aksi = "update",
            ringkasan = "Memperbarui daftar wallet ${target.nama}",
            nilaiLama = target.alamatWallet.joinToString(", ").ifEmpty { "kosong" },
            nilaiBaru = cleaned.joinToString(", ").ifEmpty { "kosong" },
            oleh = saya.id,
            pada = Formatters.isoWib(s.sekarangMs)
        )
        recompute(d.copy(anggota = updated, log = listOf(logBaru) + d.log))
        tampilkanToast("Alamat wallet ${target.nama} diperbarui.")
        return null
    }

    suspend fun setAktifAnggota(anggotaId: String, aktifBaru: Boolean): String? {
        val s = _state.value
        val d = s.data ?: return "Data belum siap."
        val target = d.anggota.firstOrNull { it.id == anggotaId } ?: return "Anggota tidak ditemukan."

        if (!s.isSimulasiMode) {
            val req = AnggotaPatchRequest(aktif = aktifBaru)
            return when (val res = jalankanMutasiLive { repository.ubahAnggota(anggotaId, req) }) {
                is ApiResult.Ok -> {
                    tampilkanToast("${target.nama} ${if (!aktifBaru) "dinonaktifkan. Riwayatnya tetap tersimpan." else "diaktifkan lagi."}")
                    null
                }
                is ApiResult.Err -> res.pesan
            }
        }

        val saya = s.saya ?: return "Sesi tidak ditemukan."
        if (!aktifBaru) {
            val pos = s.hasil?.posisi?.firstOrNull { it.id == anggotaId }
            if (pos != null && pos.unit > 1e-9) {
                return "${target.nama} masih punya dana ${Formatters.usd(pos.netUsd)}. Tarik semua dulu sebelum menonaktifkan."
            }
        }
        val updated = d.anggota.map {
            if (it.id == anggotaId) it.copy(aktif = aktifBaru) else it
        }
        val logBaru = LogAudit(
            id = "log-${UUID.randomUUID().toString().take(6)}",
            tabel = "anggota",
            aksi = "update",
            ringkasan = "${if (aktifBaru) "Mengaktifkan kembali" else "Menonaktifkan"} anggota ${target.nama}",
            nilaiLama = if (target.aktif) "Aktif" else "Nonaktif",
            nilaiBaru = if (aktifBaru) "Aktif" else "Nonaktif",
            oleh = saya.id,
            pada = Formatters.isoWib(s.sekarangMs)
        )
        recompute(d.copy(anggota = updated, log = listOf(logBaru) + d.log))
        tampilkanToast("${target.nama} ${if (!aktifBaru) "dinonaktifkan. Riwayatnya tetap tersimpan." else "diaktifkan lagi."}")
        return null
    }

    // ---------- Pengelola: Pengaturan Pool (US-17) ----------

    suspend fun ubahPengaturan(baru: Pengaturan): String? {
        val s = _state.value
        if (!s.isSimulasiMode) {
            val req = PengaturanPatchRequest(
                feePersen = baru.feePersen,
                satuanDasarFee = baru.satuanDasarFee,
                batasDataLamaHari = baru.batasDataLamaHari,
                ambangLonjakanPersen = baru.ambangLonjakanPersen,
                ambangLikuiditasTokenUsd = baru.ambangLikuiditasTokenUsd,
                ambangDustUsd = baru.ambangDustUsd,
                batasLiveLamaMenit = baru.batasLiveLamaMenit,
                toleransiCocokPersen = baru.toleransiCocokPersen
            )
            return when (val res = jalankanMutasiLive { repository.ubahPengaturan(req) }) {
                is ApiResult.Ok -> {
                    tampilkanToast("Pengaturan tersimpan. Semua posisi sudah diperbarui.")
                    null
                }
                is ApiResult.Err -> {
                    tampilkanToast(res.pesan)
                    res.pesan
                }
            }
        }

        val d = s.data ?: return "Data belum siap."
        val saya = s.saya ?: return "Sesi tidak ditemukan."
        val lama = d.pengaturan
        val logBaru = LogAudit(
            id = "log-${UUID.randomUUID().toString().take(6)}",
            tabel = "pengaturan",
            aksi = "update",
            ringkasan = "Memperbarui pengaturan & ambang pembacaan pool",
            nilaiLama = "Fee ${Formatters.angka(lama.feePersen * 100, 1)}% (${lama.satuanDasarFee.label}) · Toleransi ${Formatters.angka(lama.toleransiCocokPersen, 1)}%",
            nilaiBaru = "Fee ${Formatters.angka(baru.feePersen * 100, 1)}% (${baru.satuanDasarFee.label}) · Toleransi ${Formatters.angka(baru.toleransiCocokPersen, 1)}%",
            oleh = saya.id,
            pada = Formatters.isoWib(s.sekarangMs)
        )
        recompute(d.copy(pengaturan = baru, log = listOf(logBaru) + d.log))
        tampilkanToast("Pengaturan tersimpan. Semua posisi sudah diperbarui.")
        return null
    }
}
