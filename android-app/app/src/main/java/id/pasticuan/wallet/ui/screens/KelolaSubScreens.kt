package id.pasticuan.wallet.ui.screens

import android.app.DatePickerDialog
import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CheckboxDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.RadioButton
import androidx.compose.material3.RadioButtonDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import id.pasticuan.wallet.domain.model.Anggota
import id.pasticuan.wallet.domain.model.ArahArus
import id.pasticuan.wallet.domain.model.ArusOnchain
import id.pasticuan.wallet.domain.model.Jenis
import id.pasticuan.wallet.domain.model.Pengaturan
import id.pasticuan.wallet.domain.model.Peran
import id.pasticuan.wallet.domain.model.Permintaan
import id.pasticuan.wallet.domain.model.Satuan
import id.pasticuan.wallet.domain.model.StatusArus
import id.pasticuan.wallet.domain.model.StatusPermintaan
import id.pasticuan.wallet.domain.model.SumberSnapshot
import id.pasticuan.wallet.domain.util.Formatters
import id.pasticuan.wallet.ui.components.ApplyLiquidSheetWindowBlur
import id.pasticuan.wallet.ui.components.FilterTabsTrack
import id.pasticuan.wallet.ui.components.FloatingSubScreenLayout
import id.pasticuan.wallet.ui.components.IconDot
import id.pasticuan.wallet.ui.components.PastiCuanButton
import id.pasticuan.wallet.ui.components.PastiCuanCard
import id.pasticuan.wallet.ui.components.PastiCuanIcons
import id.pasticuan.wallet.ui.components.RoleChip
import id.pasticuan.wallet.ui.components.SegmentedTrack
import id.pasticuan.wallet.ui.components.StatusArusChip
import id.pasticuan.wallet.ui.components.StatusBanners
import id.pasticuan.wallet.ui.components.StatusPermintaanChip
import id.pasticuan.wallet.ui.components.SumberSnapshotChip
import id.pasticuan.wallet.ui.components.glassSheetContainerColor
import id.pasticuan.wallet.ui.components.glassSheetScrimColor
import id.pasticuan.wallet.ui.state.AppRoute
import id.pasticuan.wallet.ui.state.AppUiState
import id.pasticuan.wallet.ui.state.AppViewModel
import id.pasticuan.wallet.ui.theme.PastiCuanTheme
import java.time.LocalDate
import kotlin.math.abs
import kotlin.math.min
import kotlin.math.roundToInt

// ============================================================================
// 1. KELOLA -> ARUS ONCHAIN (US-13 — Paritas src/app/(app)/kelola/arus/page.tsx)
// ============================================================================
private enum class FilterArus(val label: String) {
    BELUM("Belum dicocokkan"),
    DITANDAI("Ditandai"),
    SEMUA("Semua")
}

private fun jumlahTokenLabel(a: ArusOnchain): String {
    val lbl = a.simbol ?: a.token
    val dec = when {
        lbl == "SOL" -> 4
        a.jumlah < 1.0 -> 3
        else -> 2
    }
    return "${Formatters.angka(a.jumlah, dec)} $lbl"
}

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun KelolaArusScreen(
    state: AppUiState,
    viewModel: AppViewModel
) {
    val c = PastiCuanTheme.colors
    val context = LocalContext.current
    val data = state.data ?: return

    var filter by rememberSaveable { mutableStateOf(FilterArus.BELUM) }
    var bukaArus by remember { mutableStateOf<ArusOnchain?>(null) }
    var modeSheet by remember { mutableStateOf("cocok") }
    val ikutIds = remember { mutableStateListOf<String>() }
    var pilihPermintaanId by remember { mutableStateOf("") }
    var pilihAnggotaId by remember { mutableStateOf("") }
    var catatan by remember { mutableStateOf("") }
    var alasanSelisih by remember { mutableStateOf("") }
    var errSheet by remember { mutableStateOf<String?>(null) }
    val errBaris = remember { mutableStateMapOf<String, String>() }

    val namaMap = remember(data.anggota) { data.anggota.associate { it.id to it.nama } }
    val tol = data.pengaturan.toleransiCocokPersen

    fun saranUntuk(a: ArusOnchain): List<Pair<Permintaan, String>> {
        val j = if (a.arah == ArahArus.MASUK) Jenis.SETOR else Jenis.TARIK
        return state.menunggu
            .filter { it.jenis == j }
            .mapNotNull { p ->
                val mirip = abs(a.nilaiUsd - p.jumlahUsd) / p.jumlahUsd <= tol / 100.0
                val walletSama = data.anggota.firstOrNull { it.id == p.anggotaId }?.alamatWallet?.contains(a.alamatLawan) == true
                if (!mirip && !walletSama) null
                else p to (if (walletSama) "alamat wallet sama" else "selisih jumlah di bawah ${Formatters.angka(tol, 0)}%")
            }
    }

    fun cocokFilter(a: ArusOnchain, f: FilterArus): Boolean = when (f) {
        FilterArus.BELUM -> a.status == StatusArus.BELUM
        FilterArus.DITANDAI -> a.status != StatusArus.BELUM
        FilterArus.SEMUA -> true
    }

    val daftar = remember(data.arus, filter) {
        data.arus.filter { cocokFilter(it, filter) }.sortedByDescending { it.waktu }
    }

    fun mulaiTandai(a: ArusOnchain, initialMode: String) {
        val saran = saranUntuk(a)
        bukaArus = a
        modeSheet = initialMode
        pilihPermintaanId = saran.firstOrNull()?.first?.id ?: ""
        ikutIds.clear()
        data.arus
            .filter { it.id != a.id && it.status == StatusArus.BELUM && it.arah == a.arah && it.alamatLawan == a.alamatLawan }
            .forEach { ikutIds.add(it.id) }
        pilihAnggotaId = data.anggota.firstOrNull { it.alamatWallet.contains(a.alamatLawan) }?.id
            ?: data.anggota.firstOrNull { it.aktif }?.id.orEmpty()
        catatan = ""
        alasanSelisih = ""
        errSheet = null
    }

    FloatingSubScreenLayout(
        judul = "Arus onchain",
        onBack = { viewModel.navigateBack(AppRoute.KELOLA) }
    ) {
            item { StatusBanners(state = state) }

            item {
                Column(modifier = Modifier.padding(horizontal = 4.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text(
                        text = "Transfer masuk dan keluar wallet pool yang terdeteksi otomatis. Swap, tambah atau tarik likuiditas, dan klaim fee tidak masuk daftar.",
                        style = PastiCuanTheme.typography.caption,
                        color = c.inkMuted
                    )
                    Text(
                        text = "Lihat wallet di Solscan",
                        style = PastiCuanTheme.typography.caption.copy(fontWeight = FontWeight.SemiBold),
                        color = c.forestInk,
                        modifier = Modifier.clickable {
                            context.startActivity(
                                Intent(Intent.ACTION_VIEW, Uri.parse("https://solscan.io/account/${data.pengaturan.alamatWalletPool}#transfers"))
                            )
                        }
                    )
                }
            }

            item {
                FilterTabsTrack(
                    options = FilterArus.entries,
                    selected = filter,
                    labelMapper = { it.label },
                    countMapper = { f -> data.arus.count { cocokFilter(it, f) } },
                    onSelect = { filter = it }
                )
            }

            item {
                PastiCuanCard {
                    if (daftar.isEmpty()) {
                        Text(
                            text = if (filter == FilterArus.BELUM) "Semua transfer sudah dicocokkan." else "Belum ada transfer yang ditandai.",
                            style = PastiCuanTheme.typography.caption,
                            color = c.inkMuted
                        )
                    } else {
                        daftar.forEachIndexed { idx, a ->
                            if (idx > 0) {
                                HorizontalDivider(modifier = Modifier.padding(vertical = 14.dp), color = c.hairline)
                            }
                            val pTerkait = data.permintaan.firstOrNull { it.id == a.permintaanId }
                            val saran = if (a.status == StatusArus.BELUM) saranUntuk(a) else emptyList()

                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                verticalAlignment = Alignment.Top,
                                horizontalArrangement = Arrangement.spacedBy(12.dp)
                            ) {
                                IconDot(if (a.arah == ArahArus.MASUK) PastiCuanIcons.ArrowDownLeft else PastiCuanIcons.ArrowUpRight)
                                Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) {
                                    FlowRow(
                                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                                        verticalArrangement = Arrangement.spacedBy(4.dp)
                                    ) {
                                        Text(
                                            text = "${if (a.arah == ArahArus.MASUK) "Masuk" else "Keluar"} ${jumlahTokenLabel(a)}",
                                            style = PastiCuanTheme.typography.title,
                                            color = c.ink
                                        )
                                        StatusArusChip(a.status)
                                    }
                                    Text(text = Formatters.waktu(a.waktu), style = PastiCuanTheme.typography.caption, color = c.inkMuted)
                                    Text(
                                        text = "${if (a.arah == ArahArus.MASUK) "Dari" else "Ke"} ${Formatters.ringkasAlamat(a.alamatLawan)}",
                                        style = PastiCuanTheme.typography.caption.copy(fontFeatureSettings = "tnum"),
                                        color = c.inkMuted
                                    )
                                    saran.forEach { (sp, alasan) ->
                                        Text(
                                            text = "Saran: ${if (sp.jenis == Jenis.SETOR) "setoran" else "penarikan"} ${namaMap[sp.anggotaId] ?: sp.anggotaId} ${Formatters.usd(sp.jumlahUsd)} ($alasan)",
                                            style = PastiCuanTheme.typography.caption,
                                            color = c.forestInk
                                        )
                                    }
                                    if (a.status == StatusArus.DICOCOKKAN && pTerkait != null) {
                                        val ef = pTerkait.waktuEfektif?.let { Formatters.waktu(it) }
                                            ?: pTerkait.tanggalEfektif?.let { Formatters.tanggal(it) }
                                            ?: ""
                                        Text(
                                            text = "${if (pTerkait.jenis == Jenis.SETOR) "Setoran" else "Penarikan"} ${namaMap[pTerkait.anggotaId] ?: pTerkait.anggotaId} ${Formatters.usd(pTerkait.jumlahUsd)}, selesai efektif $ef",
                                            style = PastiCuanTheme.typography.caption,
                                            color = c.gain
                                        )
                                    }
                                    if (!a.alasanSelisih.isNullOrBlank()) {
                                        Text("Alasan selisih: ${a.alasanSelisih}", style = PastiCuanTheme.typography.caption, color = c.inkMuted)
                                    }
                                    if (!a.catatan.isNullOrBlank()) {
                                        Text("Catatan: ${a.catatan}", style = PastiCuanTheme.typography.caption, color = c.inkMuted)
                                    }
                                    errBaris[a.id]?.takeIf { it.isNotEmpty() }?.let { msg ->
                                        FieldErrorRow(msg)
                                    }

                                    Spacer(Modifier.height(4.dp))
                                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                        if (a.status == StatusArus.BELUM) {
                                            PastiCuanButton(
                                                text = "Cocokkan",
                                                height = 38.dp,
                                                enabled = !state.offline,
                                                onClick = { mulaiTandai(a, "cocok") }
                                            )
                                            PastiCuanButton(
                                                text = "Tandai lain",
                                                isGhost = true,
                                                height = 38.dp,
                                                enabled = !state.offline,
                                                onClick = { mulaiTandai(a, "biaya") }
                                            )
                                        } else {
                                            PastiCuanButton(
                                                text = "Batalkan penandaan",
                                                isGhost = true,
                                                height = 38.dp,
                                                enabled = !state.offline,
                                                onClick = {
                                                    val gagal = viewModel.batalTandaiArus(a.id)
                                                    errBaris[a.id] = gagal.orEmpty()
                                                }
                                            )
                                        }
                                    }
                                }
                                Text(
                                    text = (if (a.arah == ArahArus.MASUK) "+" else Formatters.MINUS) + Formatters.usd(a.nilaiUsd),
                                    style = PastiCuanTheme.typography.bodyTabular,
                                    color = c.ink
                                )
                            }
                        }
                    }
                }
            }
    }

    if (bukaArus != null) {
        val target = bukaArus!!
        val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
        val lainSearah = data.arus.filter { it.id != target.id && it.status == StatusArus.BELUM && it.arah == target.arah }
        val semuaIds = listOf(target.id) + ikutIds
        val totalDipilih = data.arus.filter { it.id in semuaIds }.sumOf { it.nilaiUsd }
        val jenisTarget = if (target.arah == ArahArus.MASUK) Jenis.SETOR else Jenis.TARIK
        val calonPermintaan = state.menunggu.filter { it.jenis == jenisTarget }
        val saranSet = saranUntuk(target).map { it.first.id }.toSet()
        val pTerpilih = calonPermintaan.firstOrNull { it.id == pilihPermintaanId }
        val butuhAlasanSelisih = pTerpilih != null &&
            abs(totalDipilih - pTerpilih.jumlahUsd) / pTerpilih.jumlahUsd * 100.0 > tol

        ModalBottomSheet(
            onDismissRequest = { bukaArus = null },
            sheetState = sheetState,
            shape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp),
            containerColor = glassSheetContainerColor(),
            contentColor = c.ink,
            scrimColor = glassSheetScrimColor()
        ) {
            ApplyLiquidSheetWindowBlur()
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .verticalScroll(rememberScrollState())
                    .navigationBarsPadding()
                    .imePadding()
                    .padding(horizontal = 20.dp, vertical = 8.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Text(
                    text = "Transfer ${Formatters.waktu(target.waktu)}",
                    style = PastiCuanTheme.typography.pageTitle.copy(fontSize = 19.sp),
                    color = c.ink
                )
                Text(
                    text = "${if (target.arah == ArahArus.MASUK) "Masuk" else "Keluar"} ${jumlahTokenLabel(target)} · ${Formatters.usd(target.nilaiUsd)} · ${Formatters.ringkasAlamat(target.alamatLawan)}",
                    style = PastiCuanTheme.typography.caption,
                    color = c.inkMuted
                )

                Text("Tandai sebagai", style = PastiCuanTheme.typography.label.copy(fontWeight = FontWeight.SemiBold), color = c.ink)
                val radioModes = listOf(
                    "cocok" to "Cocokkan dengan ${if (target.arah == ArahArus.MASUK) "setoran" else "penarikan"} yang diajukan",
                    "buat" to "Buat permintaan untuk anggota",
                    "biaya" to "Biaya pool (dianggap rugi pool)",
                    "bukan_arus" to "Bukan arus (dust, token spam)"
                )
                radioModes.forEach { (m, lbl) ->
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable {
                                modeSheet = m
                                errSheet = null
                            }
                            .padding(vertical = 4.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        RadioButton(
                            selected = modeSheet == m,
                            onClick = {
                                modeSheet = m
                                errSheet = null
                            },
                            colors = RadioButtonDefaults.colors(selectedColor = c.forestInk)
                        )
                        Text(lbl, style = PastiCuanTheme.typography.body, color = c.ink)
                    }
                }

                if ((modeSheet == "cocok" || modeSheet == "buat") && lainSearah.isNotEmpty()) {
                    HorizontalDivider(color = c.hairline)
                    Text("Transfer lain yang ikut", style = PastiCuanTheme.typography.label.copy(fontWeight = FontWeight.SemiBold), color = c.ink)
                    lainSearah.forEach { x ->
                        val chk = x.id in ikutIds
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { if (chk) ikutIds.remove(x.id) else ikutIds.add(x.id) }
                                .padding(vertical = 2.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Checkbox(
                                checked = chk,
                                onCheckedChange = { v -> if (v) ikutIds.add(x.id) else ikutIds.remove(x.id) },
                                colors = CheckboxDefaults.colors(checkedColor = c.segSelectedBg, checkmarkColor = c.segSelectedFg)
                            )
                            Text(
                                text = "${Formatters.waktu(x.waktu)} · ${jumlahTokenLabel(x)}",
                                style = PastiCuanTheme.typography.caption,
                                color = c.ink
                            )
                        }
                    }
                    Text("Total transfer dipilih ${Formatters.usd(totalDipilih)}.", style = PastiCuanTheme.typography.caption, color = c.inkMuted)
                }

                if (modeSheet == "cocok") {
                    HorizontalDivider(color = c.hairline)
                    Text("Permintaan", style = PastiCuanTheme.typography.label.copy(fontWeight = FontWeight.SemiBold), color = c.ink)
                    if (calonPermintaan.isEmpty()) {
                        Text(
                            text = "Belum ada ${if (target.arah == ArahArus.MASUK) "setoran" else "penarikan"} yang menunggu. Pilih \"Buat permintaan untuk anggota\".",
                            style = PastiCuanTheme.typography.caption,
                            color = c.inkMuted
                        )
                    } else {
                        calonPermintaan.sortedByDescending { it.id in saranSet }.forEach { p ->
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clickable { pilihPermintaanId = p.id; errSheet = null }
                                    .padding(vertical = 2.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(6.dp)
                            ) {
                                RadioButton(
                                    selected = pilihPermintaanId == p.id,
                                    onClick = { pilihPermintaanId = p.id; errSheet = null },
                                    colors = RadioButtonDefaults.colors(selectedColor = c.forestInk)
                                )
                                Text(
                                    text = "${namaMap[p.anggotaId] ?: p.anggotaId} · ${Formatters.usd(p.jumlahUsd)}",
                                    style = PastiCuanTheme.typography.body,
                                    color = c.ink
                                )
                                if (p.id in saranSet) {
                                    StatusArusChip(StatusArus.DICOCOKKAN)
                                }
                            }
                        }
                    }

                    if (butuhAlasanSelisih) {
                        SheetTextInput(
                            label = "Alasan selisih jumlah",
                            value = alasanSelisih,
                            onValueChange = { alasanSelisih = it; errSheet = null },
                            placeholder = "Wajib karena selisih lebih dari ${Formatters.angka(tol, 0)}%"
                        )
                    }
                }

                if (modeSheet == "buat") {
                    HorizontalDivider(color = c.hairline)
                    Text("Atas nama", style = PastiCuanTheme.typography.label.copy(fontWeight = FontWeight.SemiBold), color = c.ink)
                    data.anggota.filter { it.aktif }.forEach { a ->
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { pilihAnggotaId = a.id; errSheet = null }
                                .padding(vertical = 2.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            RadioButton(
                                selected = pilihAnggotaId == a.id,
                                onClick = { pilihAnggotaId = a.id; errSheet = null },
                                colors = RadioButtonDefaults.colors(selectedColor = c.forestInk)
                            )
                            Text(a.nama, style = PastiCuanTheme.typography.body, color = c.ink)
                            if (a.alamatWallet.contains(target.alamatLawan)) {
                                RoleChip("Alamat sama")
                            }
                        }
                    }
                    Text(
                        text = "Dibuat ${if (target.arah == ArahArus.MASUK) "setoran" else "penarikan"} ${Formatters.usd(totalDipilih)}, lalu langsung dicocokkan dengan transfer ini.",
                        style = PastiCuanTheme.typography.caption,
                        color = c.inkMuted
                    )
                }

                if (modeSheet == "biaya" || modeSheet == "bukan_arus") {
                    HorizontalDivider(color = c.hairline)
                    SheetTextInput(
                        label = "Catatan",
                        value = catatan,
                        onValueChange = { if (it.length <= 200) catatan = it; errSheet = null },
                        placeholder = if (modeSheet == "biaya") "Wajib. Contoh: biaya transaksi atau sewa akun." else "Wajib. Contoh: token spam yang lolos ambang."
                    )
                }

                errSheet?.let { FieldErrorRow(it) }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    PastiCuanButton(
                        text = "Batal",
                        isPrimary = false,
                        onClick = { bukaArus = null },
                        modifier = Modifier.weight(1f)
                    )
                    PastiCuanButton(
                        text = when (modeSheet) {
                            "cocok" -> "Cocokkan"
                            "buat" -> "Buat & cocokkan"
                            else -> "Simpan tanda"
                        },
                        enabled = !state.offline && (modeSheet != "cocok" || pilihPermintaanId.isNotEmpty()),
                        onClick = {
                            val ids = if (modeSheet == "cocok" || modeSheet == "buat") semuaIds else listOf(target.id)
                            val err = viewModel.prosesArusOnchain(
                                arusIds = ids,
                                mode = modeSheet,
                                permintaanId = pilihPermintaanId,
                                anggotaId = pilihAnggotaId,
                                catatan = catatan,
                                alasanSelisih = alasanSelisih
                            )
                            if (err != null) errSheet = err else bukaArus = null
                        },
                        modifier = Modifier.weight(1f)
                    )
                }
                Spacer(Modifier.height(16.dp))
            }
        }
    }
}

// ============================================================================
// 2. KELOLA -> SNAPSHOT SALDO (US-02A/B — Paritas src/app/(app)/kelola/saldo/page.tsx)
// ============================================================================
@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun KelolaSaldoScreen(
    state: AppUiState,
    viewModel: AppViewModel
) {
    val c = PastiCuanTheme.colors
    val context = LocalContext.current
    val data = state.data ?: return

    val adaHariIni = data.snapshots.any { it.tanggal == state.hariIni }
    var bukaForm by rememberSaveable { mutableStateOf(false) }
    val tampilForm = bukaForm || !adaHariIni

    var modeForm by rememberSaveable { mutableStateOf("baru") } // "baru" | "ubah"
    var tgl by rememberSaveable { mutableStateOf(state.hariIni) }
    var usdTeks by rememberSaveable { mutableStateOf("") }
    var solTeks by rememberSaveable { mutableStateOf("") }
    var feeLpTeks by rememberSaveable { mutableStateOf("") }
    var catatan by rememberSaveable { mutableStateOf("") }
    var alasan by rememberSaveable { mutableStateOf("") }
    var tampilSemua by rememberSaveable { mutableStateOf(false) }
    var errMsg by remember { mutableStateOf<String?>(null) }

    var dialogLonjakanPct by remember { mutableStateOf<Double?>(null) }
    var dialogKonfirmasiUbah by remember { mutableStateOf(false) }
    var dialogHapusTgl by remember { mutableStateOf<String?>(null) }

    val nUsd = Formatters.parseAngka(usdTeks)
    val nSol = Formatters.parseAngka(solTeks)
    val hargaTurunan = if (nUsd != null && nSol != null && nUsd > 0 && nSol > 0) nUsd / nSol else null
    val urut = remember(data.snapshots) { data.snapshots.sortedByDescending { it.tanggal } }
    val dipakaiSet = remember(data.permintaan) {
        data.permintaan.filter { it.status == StatusPermintaan.SELESAI }.mapNotNull { it.tanggalEfektif }.toSet()
    }
    val yangDiubah = if (modeForm == "ubah") data.snapshots.firstOrNull { it.tanggal == tgl } else null
    val butuhAlasan = yangDiubah?.sumber == SumberSnapshot.OTOMATIS || yangDiubah?.sumber == SumberSnapshot.KOREKSI

    val awalHariMs = Formatters.ms(state.hariIni)
    val menitHariIni = ((state.sekarangMs - awalHariMs) / 60_000L + 1L).coerceAtLeast(1L)
    val menitBerhasil = state.titik.count { !it.estimasi && it.ms >= awalHariMs }
    val persenBerhasil = min(100.0, menitBerhasil.toDouble() / menitHariIni.toDouble() * 100.0)
    val jam = data.pengaturan.jamSnapshot
    val lama = state.lamaLiveMenit > data.pengaturan.batasLiveLamaMenit
    val berikut = if (state.sekarangMs >= Formatters.msSnapshot(state.hariIni, jam)) {
        Formatters.tambahHari(state.hariIni, 1)
    } else state.hariIni
    val titikAkhir = state.titikAkhir

    fun eksekusiSimpan() {
        val fl = if (feeLpTeks.trim().isNotEmpty()) Formatters.parseAngka(feeLpTeks) else null
        val gagal = viewModel.simpanSnapshot(
            tanggal = tgl,
            nilaiUsd = nUsd ?: 0.0,
            saldoSol = nSol ?: 0.0,
            feeLpSol = fl,
            catatan = catatan,
            alasan = alasan,
            isUbah = modeForm == "ubah"
        )
        dialogLonjakanPct = null
        dialogKonfirmasiUbah = false
        if (gagal != null) {
            errMsg = gagal
        } else {
            modeForm = "baru"
            bukaForm = false
            usdTeks = ""
            solTeks = ""
            feeLpTeks = ""
            catatan = ""
            alasan = ""
            errMsg = null
        }
    }

    FloatingSubScreenLayout(
        judul = "Snapshot saldo",
        onBack = { viewModel.navigateBack(AppRoute.KELOLA) },
        useImePadding = true
    ) {
            item { StatusBanners(state = state) }

            // Kartu 1: Pembaca wallet
            item {
                PastiCuanCard {
                    Text("Pembaca wallet", style = PastiCuanTheme.typography.title, color = c.ink)
                    Spacer(Modifier.height(8.dp))
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Icon(
                            imageVector = if (lama) PastiCuanIcons.AlertTriangle else PastiCuanIcons.CircleCheck,
                            contentDescription = null,
                            tint = if (lama) c.warningInk else c.gain,
                            modifier = Modifier.size(20.dp)
                        )
                        Text(
                            text = if (lama) "Pembacaan tertunda" else "Berjalan normal",
                            style = PastiCuanTheme.typography.body.copy(fontWeight = FontWeight.SemiBold),
                            color = if (lama) c.warningInk else c.gain
                        )
                    }
                    Spacer(Modifier.height(10.dp))
                    KvRow(
                        label = "Titik nilai terakhir",
                        value = titikAkhir?.let { Formatters.waktu(Formatters.isoWib(it.ms)) } ?: "Belum ada"
                    )
                    if (titikAkhir != null) {
                        HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp), color = c.hairline)
                        KvRow(
                            label = "Isi wallet",
                            value = "${Formatters.usd(titikAkhir.nilaiUsd)} (${Formatters.sol(titikAkhir.saldoSol)})"
                        )
                    }
                    HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp), color = c.hairline)
                    KvRow(
                        label = "Menit berhasil hari ini",
                        value = "${Formatters.angka(persenBerhasil, 1)}%"
                    )
                    HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp), color = c.hairline)
                    KvRow(
                        label = "Snapshot otomatis berikutnya",
                        value = "${Formatters.tanggal(berikut)}, ${jam.replace(":", ".")} WIB"
                    )
                    Spacer(Modifier.height(10.dp))
                    Text(
                        text = "Dibaca otomatis tiap menit dari Meteora, Solana RPC, dan Jupiter. Titik nilai pertama sesudah ${jam.replace(":", ".")} WIB menjadi snapshot resmi.",
                        style = PastiCuanTheme.typography.caption,
                        color = c.inkMuted
                    )
                    if (!tampilForm) {
                        Spacer(Modifier.height(12.dp))
                        PastiCuanButton(
                            text = "Isi snapshot manual",
                            isPrimary = false,
                            height = 40.dp,
                            onClick = {
                                modeForm = "baru"
                                tgl = state.hariIni
                                bukaForm = true
                            }
                        )
                    }
                }
            }

            // Kartu 2: Form Snapshot Manual / Koreksi
            if (tampilForm) {
                item {
                    PastiCuanCard {
                        Text(
                            text = if (modeForm == "ubah") {
                                "${if (butuhAlasan) "Koreksi" else "Ubah"} snapshot ${Formatters.tanggal(tgl)}"
                            } else "Snapshot manual",
                            style = PastiCuanTheme.typography.title,
                            color = c.ink
                        )
                        Spacer(Modifier.height(10.dp))

                        if (titikAkhir != null && modeForm == "baru") {
                            Column(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clip(RoundedCornerShape(16.dp))
                                    .background(c.field)
                                    .padding(12.dp),
                                verticalArrangement = Arrangement.spacedBy(4.dp)
                            ) {
                                Text(
                                    text = "Pembanding, titik nilai terakhir: ${Formatters.waktu(Formatters.isoWib(titikAkhir.ms))} · ${Formatters.usd(titikAkhir.nilaiUsd)} · ${Formatters.sol(titikAkhir.saldoSol)}.",
                                    style = PastiCuanTheme.typography.caption,
                                    color = c.ink
                                )
                                Text(
                                    text = "Pakai angka ini",
                                    style = PastiCuanTheme.typography.caption.copy(fontWeight = FontWeight.SemiBold),
                                    color = c.forestInk,
                                    modifier = Modifier.clickable {
                                        usdTeks = Formatters.angka(titikAkhir.nilaiUsd, 2)
                                        solTeks = Formatters.angka(titikAkhir.saldoSol, 6)
                                        errMsg = null
                                    }
                                )
                            }
                            Spacer(Modifier.height(12.dp))
                        }

                        Text("Tanggal", style = PastiCuanTheme.typography.label.copy(fontWeight = FontWeight.SemiBold), color = c.ink)
                        Spacer(Modifier.height(6.dp))
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(52.dp)
                                .clip(RoundedCornerShape(16.dp))
                                .background(if (modeForm == "ubah") c.fieldReadOnly else c.field)
                                .clickable(enabled = !state.offline && modeForm == "baru") {
                                    val parsed = runCatching { LocalDate.parse(tgl) }.getOrElse { LocalDate.parse(state.hariIni) }
                                    DatePickerDialog(
                                        context,
                                        { _, y, m, d -> tgl = LocalDate.of(y, m + 1, d).toString(); errMsg = null },
                                        parsed.year,
                                        parsed.monthValue - 1,
                                        parsed.dayOfMonth
                                    ).show()
                                }
                                .padding(horizontal = 16.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(Formatters.tanggal(tgl), style = PastiCuanTheme.typography.body.copy(fontSize = 16.sp), color = c.ink)
                            Icon(PastiCuanIcons.Calendar, contentDescription = null, tint = c.inkMuted, modifier = Modifier.size(18.dp))
                        }

                        Spacer(Modifier.height(12.dp))
                        SheetTextInput(
                            label = "Nilai wallet (USD)",
                            prefix = "US$",
                            value = usdTeks,
                            onValueChange = { usdTeks = it; errMsg = null },
                            placeholder = "2.076,53",
                            keyboardType = KeyboardType.Decimal
                        )
                        Spacer(Modifier.height(12.dp))
                        SheetTextInput(
                            label = "Saldo wallet (SOL)",
                            suffix = "SOL",
                            value = solTeks,
                            onValueChange = { solTeks = it; errMsg = null },
                            placeholder = "27,439535",
                            keyboardType = KeyboardType.Decimal
                        )
                        Spacer(Modifier.height(12.dp))
                        Text("Harga SOL turunan", style = PastiCuanTheme.typography.label.copy(fontWeight = FontWeight.SemiBold), color = c.ink)
                        Spacer(Modifier.height(6.dp))
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(52.dp)
                                .clip(RoundedCornerShape(16.dp))
                                .background(c.fieldReadOnly)
                                .padding(horizontal = 16.dp),
                            contentAlignment = Alignment.CenterStart
                        ) {
                            Text(
                                text = hargaTurunan?.let { "${Formatters.usd(it)} per SOL" } ?: "Terisi otomatis dari USD ÷ SOL",
                                style = PastiCuanTheme.typography.bodyTabular,
                                color = c.inkMuted
                            )
                        }

                        Spacer(Modifier.height(12.dp))
                        SheetTextInput(
                            label = "Fee LP yang diklaim (SOL) · Opsional",
                            value = feeLpTeks,
                            onValueChange = { feeLpTeks = it; errMsg = null },
                            placeholder = "0",
                            keyboardType = KeyboardType.Decimal
                        )
                        Spacer(Modifier.height(12.dp))
                        SheetTextInput(
                            label = "Catatan · Opsional (${catatan.length}/500)",
                            value = catatan,
                            onValueChange = { if (it.length <= 500) catatan = it },
                            placeholder = "Opsional"
                        )
                        if (butuhAlasan) {
                            Spacer(Modifier.height(12.dp))
                            SheetTextInput(
                                label = "Alasan koreksi",
                                value = alasan,
                                onValueChange = { if (it.length <= 200) alasan = it; errMsg = null },
                                placeholder = "Wajib untuk snapshot otomatis/koreksi"
                            )
                        }

                        errMsg?.let {
                            Spacer(Modifier.height(10.dp))
                            FieldErrorRow(it)
                        }

                        Spacer(Modifier.height(16.dp))
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            PastiCuanButton(
                                text = "Batal",
                                isPrimary = false,
                                onClick = {
                                    modeForm = "baru"
                                    bukaForm = false
                                    errMsg = null
                                },
                                modifier = Modifier.weight(1f)
                            )
                            PastiCuanButton(
                                text = "Simpan",
                                enabled = !state.offline,
                                onClick = {
                                    when {
                                        tgl > state.hariIni -> errMsg = "Tanggal tidak boleh di masa depan."
                                        tgl < data.pengaturan.tanggalMulai -> errMsg = "Tanggal tidak boleh sebelum ${Formatters.tanggal(data.pengaturan.tanggalMulai)}."
                                        modeForm == "baru" && data.snapshots.any { it.tanggal == tgl } ->
                                            errMsg = "Saldo untuk ${Formatters.tanggal(tgl)} sudah ada. Ubah data yang ada atau pilih tanggal lain."
                                        nUsd == null || nSol == null || nUsd <= 0 || nSol <= 0 ->
                                            errMsg = "Nilai USD dan saldo SOL harus lebih dari 0."
                                        Formatters.desimal(usdTeks) > 2 ->
                                            errMsg = "Nilai USD maksimal 2 angka di belakang koma."
                                        Formatters.desimal(solTeks) > 6 ->
                                            errMsg = "Saldo SOL maksimal 6 angka di belakang koma."
                                        feeLpTeks.isNotBlank() && (Formatters.parseAngka(feeLpTeks) == null || Formatters.parseAngka(feeLpTeks)!! < 0) ->
                                            errMsg = "Fee LP tidak boleh negatif."
                                        butuhAlasan && alasan.isBlank() ->
                                            errMsg = "Alasan koreksi wajib diisi."
                                        else -> {
                                            val sebelum = urut.firstOrNull { it.tanggal < tgl }
                                            val adaTx = data.permintaan.any {
                                                it.status == StatusPermintaan.SELESAI &&
                                                    (it.tanggalEfektif == tgl || (it.waktuEfektif != null && Formatters.wibIso(it.waktuEfektif).startsWith(tgl)))
                                            }
                                            val adaArus = data.arus.any {
                                                it.status != StatusArus.BUKAN_ARUS && Formatters.wibIso(it.waktu).startsWith(tgl)
                                            }
                                            val pct = if (sebelum != null) abs(nUsd - sebelum.nilaiUsd) / sebelum.nilaiUsd * 100.0 else 0.0
                                            when {
                                                sebelum != null && !adaTx && !adaArus && pct > data.pengaturan.ambangLonjakanPersen ->
                                                    dialogLonjakanPct = pct
                                                modeForm == "ubah" -> dialogKonfirmasiUbah = true
                                                else -> eksekusiSimpan()
                                            }
                                        }
                                    }
                                },
                                modifier = Modifier.weight(1f)
                            )
                        }
                    }
                }
            }

            // Kartu 3: Riwayat snapshot
            item {
                PastiCuanCard {
                    Text("Riwayat snapshot", style = PastiCuanTheme.typography.title, color = c.ink)
                    Spacer(Modifier.height(10.dp))
                    val listTampil = if (tampilSemua) urut else urut.take(7)
                    listTampil.forEachIndexed { idx, s ->
                        if (idx > 0) {
                            HorizontalDivider(modifier = Modifier.padding(vertical = 12.dp), color = c.hairline)
                        }
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            verticalAlignment = Alignment.Top,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) {
                                FlowRow(
                                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                                    verticalArrangement = Arrangement.spacedBy(4.dp)
                                ) {
                                    Text(Formatters.tanggal(s.tanggal), style = PastiCuanTheme.typography.title, color = c.ink)
                                    SumberSnapshotChip(s.sumber)
                                    if (s.tanggal in dipakaiSet) {
                                        Box(
                                            modifier = Modifier
                                                .clip(CircleShape)
                                                .background(c.canvas)
                                                .padding(horizontal = 8.dp, vertical = 2.dp)
                                        ) {
                                            Text("Ada transaksi", style = PastiCuanTheme.typography.tag, color = c.inkMuted)
                                        }
                                    }
                                }
                                Text(
                                    text = "${Formatters.angka(s.saldoSol, 4)} SOL · Harga SOL ${Formatters.usd(s.nilaiUsd / s.saldoSol)}" +
                                        (s.alasan?.let { " · $it" } ?: ""),
                                    style = PastiCuanTheme.typography.caption.copy(fontFeatureSettings = "tnum"),
                                    color = c.inkMuted
                                )
                            }
                            Text(Formatters.usd(s.nilaiUsd), style = PastiCuanTheme.typography.bodyTabular, color = c.ink)
                            Row {
                                Box(
                                    modifier = Modifier
                                        .size(36.dp)
                                        .clip(CircleShape)
                                        .clickable(enabled = !state.offline) {
                                            modeForm = "ubah"
                                            tgl = s.tanggal
                                            usdTeks = Formatters.angka(s.nilaiUsd, 2)
                                            solTeks = Formatters.angka(s.saldoSol, 6)
                                            feeLpTeks = s.feeLpDiklaimSol?.let { Formatters.angka(it, 6) }.orEmpty()
                                            catatan = s.catatan.orEmpty()
                                            alasan = ""
                                            errMsg = null
                                            bukaForm = true
                                        },
                                    contentAlignment = Alignment.Center
                                ) {
                                    Icon(PastiCuanIcons.Pencil, contentDescription = "Ubah", tint = c.forestInk, modifier = Modifier.size(18.dp))
                                }
                                Box(
                                    modifier = Modifier
                                        .size(36.dp)
                                        .clip(CircleShape)
                                        .clickable(enabled = !state.offline) { dialogHapusTgl = s.tanggal },
                                    contentAlignment = Alignment.Center
                                ) {
                                    Icon(PastiCuanIcons.Trash, contentDescription = "Hapus", tint = c.forestInk, modifier = Modifier.size(18.dp))
                                }
                            }
                        }
                    }

                    if (urut.size > 7) {
                        Spacer(Modifier.height(10.dp))
                        PastiCuanButton(
                            text = if (tampilSemua) "Tampilkan 7 terakhir" else "Tampilkan semua (${urut.size})",
                            isGhost = true,
                            height = 38.dp,
                            onClick = { tampilSemua = !tampilSemua }
                        )
                    }
                }
            }
    }

    if (dialogLonjakanPct != null || dialogKonfirmasiUbah || dialogHapusTgl != null) {
        val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
        ModalBottomSheet(
            onDismissRequest = {
                dialogLonjakanPct = null
                dialogKonfirmasiUbah = false
                dialogHapusTgl = null
            },
            sheetState = sheetState,
            shape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp),
            containerColor = glassSheetContainerColor(),
            contentColor = c.ink,
            scrimColor = glassSheetScrimColor()
        ) {
            ApplyLiquidSheetWindowBlur()
            val hapusTarget = dialogHapusTgl
            val dipakai = hapusTarget != null && hapusTarget in dipakaiSet
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .navigationBarsPadding()
                    .padding(horizontal = 20.dp, vertical = 8.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                Text(
                    text = when {
                        dialogLonjakanPct != null -> "Yakin angkanya benar?"
                        hapusTarget != null -> "Hapus saldo ${Formatters.tanggal(hapusTarget)}?"
                        else -> "Hitung ulang semua angka?"
                    },
                    style = PastiCuanTheme.typography.pageTitle.copy(fontSize = 19.sp),
                    color = c.ink
                )
                Text(
                    text = when {
                        dialogLonjakanPct != null ->
                            "Saldo berubah ${dialogLonjakanPct!!.roundToInt()}% dari kemarin tanpa ada setoran atau penarikan. Yakin angkanya benar?"
                        hapusTarget != null && dipakai ->
                            "Saldo ini dipakai sebagai tanggal efektif transaksi, jadi hanya bisa diubah, tidak bisa dihapus."
                        hapusTarget != null ->
                            "Angka sesudah tanggal ini dihitung ulang. Perubahan tercatat di log."
                        else ->
                            "Mengubah saldo tanggal ini akan menghitung ulang semua angka sesudahnya. Lanjutkan?"
                    },
                    style = PastiCuanTheme.typography.body.copy(fontSize = 15.sp),
                    color = c.ink
                )
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    PastiCuanButton(
                        text = if (dialogLonjakanPct != null) "Cek lagi" else "Batal",
                        isPrimary = false,
                        onClick = {
                            dialogLonjakanPct = null
                            dialogKonfirmasiUbah = false
                            dialogHapusTgl = null
                        },
                        modifier = Modifier.weight(1f)
                    )
                    if (hapusTarget != null) {
                        PastiCuanButton(
                            text = "Hapus",
                            isDanger = true,
                            enabled = !dipakai,
                            onClick = {
                                viewModel.hapusSnapshot(hapusTarget)
                                dialogHapusTgl = null
                            },
                            modifier = Modifier.weight(1f)
                        )
                    } else {
                        PastiCuanButton(
                            text = if (dialogLonjakanPct != null) "Simpan tetap" else "Lanjutkan",
                            onClick = { eksekusiSimpan() },
                            modifier = Modifier.weight(1f)
                        )
                    }
                }
                Spacer(Modifier.height(16.dp))
            }
        }
    }
}

// ============================================================================
// 3. KELOLA -> PERMINTAAN (US-03B/04B — Paritas src/app/(app)/kelola/permintaan/page.tsx)
// ============================================================================
private enum class FilterKelolaReq(val label: String) {
    MENUNGGU("Menunggu"),
    DIPROSES("Diproses"),
    SEMUA("Semua")
}

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun KelolaPermintaanScreen(
    state: AppUiState,
    viewModel: AppViewModel
) {
    val c = PastiCuanTheme.colors
    val data = state.data ?: return
    val hasil = state.hasil ?: return

    var filter by rememberSaveable { mutableStateOf(FilterKelolaReq.MENUNGGU) }
    var targetAksi by remember { mutableStateOf<Pair<Permintaan, String>?>(null) } // "selesai" | "tolak"
    var tglEfektif by remember { mutableStateOf(state.hariIni) }
    var jumlahFinal by remember { mutableStateOf("") }
    var bukti by remember { mutableStateOf("") }
    var alasan by remember { mutableStateOf("") }
    var errSheet by remember { mutableStateOf<String?>(null) }

    val namaMap = remember(data.anggota) { data.anggota.associate { it.id to it.nama } }
    val sumberApp = remember(data.permintaan) { data.permintaan.filter { it.sumber == "app" }.sortedByDescending { it.dibuatPada } }

    fun cocok(p: Permintaan, f: FilterKelolaReq): Boolean = when (f) {
        FilterKelolaReq.MENUNGGU -> p.status == StatusPermintaan.MENUNGGU
        FilterKelolaReq.DIPROSES -> p.status != StatusPermintaan.MENUNGGU
        FilterKelolaReq.SEMUA -> true
    }

    val daftar = sumberApp.filter { cocok(it, filter) }

    fun bukaSheet(p: Permintaan, jenisAksi: String) {
        val arusTerkait = data.arus.filter { it.permintaanId == p.id }.sortedBy { it.waktu }
        targetAksi = p to jenisAksi
        tglEfektif = state.hariIni
        jumlahFinal = if (arusTerkait.isNotEmpty()) {
            Formatters.angka(arusTerkait.sumOf { it.nilaiUsd }, 2)
        } else {
            Formatters.angka(p.jumlahUsd, 2)
        }
        bukti = arusTerkait.joinToString(", ") { it.signature }.take(100)
        alasan = ""
        errSheet = null
    }

    FloatingSubScreenLayout(
        judul = "Permintaan",
        onBack = { viewModel.navigateBack(AppRoute.KELOLA) }
    ) {
            item { StatusBanners(state = state) }

            item {
                FilterTabsTrack(
                    options = FilterKelolaReq.entries,
                    selected = filter,
                    labelMapper = { it.label },
                    countMapper = { f -> sumberApp.count { cocok(it, f) } },
                    onSelect = { filter = it }
                )
            }

            item {
                PastiCuanCard {
                    if (daftar.isEmpty()) {
                        Text(
                            text = if (filter == FilterKelolaReq.MENUNGGU) "Belum ada permintaan." else "Belum ada permintaan yang diproses.",
                            style = PastiCuanTheme.typography.caption,
                            color = c.inkMuted
                        )
                    } else {
                        daftar.forEachIndexed { idx, p ->
                            if (idx > 0) {
                                HorizontalDivider(modifier = Modifier.padding(vertical = 14.dp), color = c.hairline)
                            }
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                verticalAlignment = Alignment.Top,
                                horizontalArrangement = Arrangement.spacedBy(12.dp)
                            ) {
                                IconDot(if (p.jenis == Jenis.SETOR) PastiCuanIcons.ArrowDownLeft else PastiCuanIcons.ArrowUpRight)
                                Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) {
                                    FlowRow(
                                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                                        verticalArrangement = Arrangement.spacedBy(4.dp)
                                    ) {
                                        Text(
                                            text = "${namaMap[p.anggotaId] ?: p.anggotaId} · ${if (p.jenis == Jenis.SETOR) "setor" else "tarik"}",
                                            style = PastiCuanTheme.typography.title,
                                            color = c.ink
                                        )
                                        StatusPermintaanChip(p.status)
                                    }
                                    Text("Diajukan ${Formatters.waktu(p.dibuatPada)}", style = PastiCuanTheme.typography.caption, color = c.inkMuted)
                                    p.tanggalTransfer?.let {
                                        Text("Ditransfer ${Formatters.tanggal(it)}", style = PastiCuanTheme.typography.caption, color = c.inkMuted)
                                    }
                                    p.alamatWalletTujuan?.let {
                                        Text("Ke wallet: $it", style = PastiCuanTheme.typography.caption, color = c.inkMuted)
                                    }
                                    p.catatan?.let {
                                        Text("Catatan: $it", style = PastiCuanTheme.typography.caption, color = c.inkMuted)
                                    }
                                    if (p.status == StatusPermintaan.MENUNGGU) {
                                        Text(
                                            text = "Lihat arus onchain untuk mencocokkan pada waktu transfer",
                                            style = PastiCuanTheme.typography.caption.copy(fontWeight = FontWeight.SemiBold),
                                            color = c.forestInk,
                                            modifier = Modifier.clickable { viewModel.navigateTo(AppRoute.KELOLA_ARUS) }
                                        )
                                        Spacer(Modifier.height(4.dp))
                                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                            PastiCuanButton(
                                                text = if (p.jenis == Jenis.SETOR) "Konfirmasi diterima" else "Tandai selesai",
                                                height = 38.dp,
                                                enabled = !state.offline,
                                                onClick = { bukaSheet(p, "selesai") }
                                            )
                                            PastiCuanButton(
                                                text = "Tolak",
                                                isGhost = true,
                                                height = 38.dp,
                                                enabled = !state.offline,
                                                onClick = { bukaSheet(p, "tolak") }
                                            )
                                        }
                                    }
                                    if (p.status == StatusPermintaan.SELESAI) {
                                        val ef = p.waktuEfektif?.let { Formatters.waktu(it) }
                                            ?: p.tanggalEfektif?.let { Formatters.tanggal(it) } ?: ""
                                        Text(
                                            text = "Efektif $ef · ${Formatters.usd(p.jumlahFinalUsd ?: p.jumlahUsd)}",
                                            style = PastiCuanTheme.typography.caption,
                                            color = c.gain
                                        )
                                    }
                                    if (p.status == StatusPermintaan.DITOLAK && !p.alasan.isNullOrBlank()) {
                                        Text("Ditolak: ${p.alasan}", style = PastiCuanTheme.typography.caption, color = c.loss)
                                    }
                                }
                                Text(Formatters.usd(p.jumlahUsd), style = PastiCuanTheme.typography.bodyTabular, color = c.ink)
                            }
                        }
                    }
                }
            }
    }

    if (targetAksi != null) {
        val (p, mode) = targetAksi!!
        val context = LocalContext.current
        val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
        val pemilik = namaMap[p.anggotaId] ?: p.anggotaId
        val posInv = hasil.posisi.firstOrNull { it.id == p.anggotaId }
        val parsedJml = Formatters.parseAngka(jumlahFinal)
        val bedaNominal = parsedJml != null && abs(parsedJml - p.jumlahUsd) > 0.004

        ModalBottomSheet(
            onDismissRequest = { targetAksi = null },
            sheetState = sheetState,
            shape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp),
            containerColor = glassSheetContainerColor(),
            contentColor = c.ink,
            scrimColor = glassSheetScrimColor()
        ) {
            ApplyLiquidSheetWindowBlur()
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .navigationBarsPadding()
                    .imePadding()
                    .padding(horizontal = 20.dp, vertical = 8.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Text(
                    text = when {
                        mode == "tolak" -> "Tolak permintaan $pemilik?"
                        p.jenis == Jenis.SETOR -> "Konfirmasi setoran $pemilik"
                        else -> "Selesaikan penarikan $pemilik"
                    },
                    style = PastiCuanTheme.typography.pageTitle.copy(fontSize = 19.sp),
                    color = c.ink
                )

                if (mode == "tolak") {
                    SheetTextInput(
                        label = "Alasan",
                        value = alasan,
                        onValueChange = { if (it.length <= 200) alasan = it; errSheet = null },
                        placeholder = "Wajib diisi. Investor akan melihat alasan ini."
                    )
                } else {
                    if (p.jenis == Jenis.TARIK) {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(16.dp))
                                .background(c.field)
                                .padding(12.dp)
                        ) {
                            Text(
                                text = "Nilai bersih $pemilik sekarang ${Formatters.usd(posInv?.netUsd ?: 0.0)}. Untuk menilai tepat di waktu transfer, cocokkan lewat Arus onchain.",
                                style = PastiCuanTheme.typography.caption,
                                color = c.ink
                            )
                        }
                    }

                    Text("Tanggal efektif (snapshot)", style = PastiCuanTheme.typography.label.copy(fontWeight = FontWeight.SemiBold), color = c.ink)
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(52.dp)
                            .clip(RoundedCornerShape(16.dp))
                            .background(c.field)
                            .clickable {
                                val parsed = runCatching { LocalDate.parse(tglEfektif) }.getOrElse { LocalDate.parse(state.hariIni) }
                                DatePickerDialog(
                                    context,
                                    { _, y, m, d -> tglEfektif = LocalDate.of(y, m + 1, d).toString(); errSheet = null },
                                    parsed.year,
                                    parsed.monthValue - 1,
                                    parsed.dayOfMonth
                                ).show()
                            }
                            .padding(horizontal = 16.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(Formatters.tanggal(tglEfektif), style = PastiCuanTheme.typography.body.copy(fontSize = 16.sp), color = c.ink)
                        Icon(PastiCuanIcons.Calendar, contentDescription = null, tint = c.inkMuted, modifier = Modifier.size(18.dp))
                    }

                    SheetTextInput(
                        label = if (p.jenis == Jenis.SETOR) "Jumlah diterima" else "Jumlah dikirim",
                        prefix = "US$",
                        value = jumlahFinal,
                        onValueChange = { jumlahFinal = it; errSheet = null },
                        placeholder = Formatters.angka(p.jumlahUsd, 2),
                        keyboardType = KeyboardType.Decimal
                    )
                    if (bedaNominal) {
                        SheetTextInput(
                            label = "Alasan jumlah berbeda",
                            value = alasan,
                            onValueChange = { if (it.length <= 200) alasan = it; errSheet = null },
                            placeholder = "Wajib. Investor akan melihat kedua angka."
                        )
                    }
                    SheetTextInput(
                        label = "Bukti transaksi · Opsional",
                        value = bukti,
                        onValueChange = { if (it.length <= 100) bukti = it },
                        placeholder = "Signature atau keterangan"
                    )
                }

                errSheet?.let { msg ->
                    FieldErrorRow(msg)
                    if (msg.startsWith("Belum ada saldo")) {
                        PastiCuanButton(
                            text = "Isi snapshot manual",
                            isPrimary = false,
                            height = 38.dp,
                            onClick = {
                                targetAksi = null
                                viewModel.navigateTo(AppRoute.KELOLA_SALDO)
                            }
                        )
                    }
                }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    PastiCuanButton(
                        text = "Batal",
                        isPrimary = false,
                        onClick = { targetAksi = null },
                        modifier = Modifier.weight(1f)
                    )
                    PastiCuanButton(
                        text = when {
                            mode == "tolak" -> "Tolak"
                            p.jenis == Jenis.SETOR -> "Konfirmasi"
                            else -> "Tandai selesai"
                        },
                        isDanger = mode == "tolak",
                        onClick = {
                            val err = if (mode == "tolak") {
                                viewModel.tolakPermintaan(p.id, alasan)
                            } else {
                                val j = Formatters.parseAngka(jumlahFinal)
                                if (j == null || j <= 0.0) "Jumlah harus lebih dari 0."
                                else viewModel.selesaikanPermintaanManual(p.id, tglEfektif, j, bukti, alasan)
                            }
                            if (err != null) errSheet = err else targetAksi = null
                        },
                        modifier = Modifier.weight(1f)
                    )
                }
                Spacer(Modifier.height(16.dp))
            }
        }
    }
}

// ============================================================================
// 4. KELOLA -> ANGGOTA (US-07B — Paritas src/app/(app)/kelola/anggota/page.tsx)
// ============================================================================
@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun KelolaAnggotaScreen(
    state: AppUiState,
    viewModel: AppViewModel
) {
    val c = PastiCuanTheme.colors
    val data = state.data ?: return
    val hasil = state.hasil ?: return
    val saya = state.saya ?: return

    var namaBaru by rememberSaveable { mutableStateOf("") }
    var emailBaru by rememberSaveable { mutableStateOf("") }
    var peranBaru by rememberSaveable { mutableStateOf(Peran.INVESTOR) }
    var walletBaru by rememberSaveable { mutableStateOf("") }
    var errForm by remember { mutableStateOf<Map<String, String>>(emptyMap()) }
    val errBaris = remember { mutableStateMapOf<String, String>() }

    var editTarget by remember { mutableStateOf<Anggota?>(null) }
    var editWalletTeks by remember { mutableStateOf("") }
    var editWalletErr by remember { mutableStateOf<String?>(null) }

    FloatingSubScreenLayout(
        judul = "Anggota",
        onBack = { viewModel.navigateBack(AppRoute.KELOLA) },
        useImePadding = true
    ) {
            item { StatusBanners(state = state) }

            // Daftar Anggota
            item {
                PastiCuanCard {
                    Text("Daftar anggota", style = PastiCuanTheme.typography.title, color = c.ink)
                    Spacer(Modifier.height(10.dp))

                    data.anggota.forEachIndexed { idx, a ->
                        if (idx > 0) {
                            HorizontalDivider(modifier = Modifier.padding(vertical = 12.dp), color = c.hairline)
                        }
                        val pos = hasil.posisi.firstOrNull { it.id == a.id }
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            verticalAlignment = Alignment.Top,
                            horizontalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(36.dp)
                                    .clip(CircleShape)
                                    .background(if (a.aktif) c.limeAction else c.canvas),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    text = a.nama.take(1).uppercase(),
                                    style = PastiCuanTheme.typography.body.copy(fontWeight = FontWeight.SemiBold),
                                    color = if (a.aktif) c.onLimeInk else c.inkMuted
                                )
                            }
                            Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) {
                                FlowRow(
                                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                                    verticalArrangement = Arrangement.spacedBy(4.dp)
                                ) {
                                    Text(a.nama, style = PastiCuanTheme.typography.title, color = c.ink)
                                    RoleChip(if (a.peran == Peran.PENGELOLA) "Pengelola" else "Investor")
                                    if (!a.aktif) {
                                        Box(
                                            modifier = Modifier
                                                .clip(CircleShape)
                                                .background(c.canvas)
                                                .padding(horizontal = 8.dp, vertical = 2.dp)
                                        ) {
                                            Text("Nonaktif", style = PastiCuanTheme.typography.tag, color = c.inkMuted)
                                        }
                                    }
                                }
                                Text(a.email, style = PastiCuanTheme.typography.caption, color = c.inkMuted)
                                if (a.alamatWallet.isNotEmpty()) {
                                    Text(
                                        text = "Wallet: ${a.alamatWallet.joinToString(", ") { Formatters.ringkasAlamat(it) }}",
                                        style = PastiCuanTheme.typography.caption.copy(fontFeatureSettings = "tnum"),
                                        color = c.inkMuted
                                    )
                                }
                                errBaris[a.id]?.takeIf { it.isNotEmpty() }?.let { FieldErrorRow(it) }
                                Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                    PastiCuanButton(
                                        text = "Ubah wallet",
                                        isGhost = true,
                                        height = 36.dp,
                                        enabled = !state.offline,
                                        onClick = {
                                            editTarget = a
                                            editWalletTeks = a.alamatWallet.joinToString(", ")
                                            editWalletErr = null
                                        }
                                    )
                                    if (a.id != saya.id) {
                                        PastiCuanButton(
                                            text = if (a.aktif) "Nonaktifkan" else "Aktifkan",
                                            isGhost = true,
                                            height = 36.dp,
                                            enabled = !state.offline,
                                            onClick = {
                                                val gagal = viewModel.setAktifAnggota(a.id, !a.aktif)
                                                errBaris[a.id] = gagal.orEmpty()
                                            }
                                        )
                                    }
                                }
                            }
                            Text(Formatters.usd(pos?.netUsd ?: 0.0), style = PastiCuanTheme.typography.bodyTabular, color = c.ink)
                        }
                    }
                }
            }

            // Form Tambah Anggota
            item {
                PastiCuanCard {
                    Text("Tambah anggota", style = PastiCuanTheme.typography.title, color = c.ink)
                    Spacer(Modifier.height(12.dp))

                    SheetTextInput(
                        label = "Nama",
                        value = namaBaru,
                        onValueChange = { if (it.length <= 40) namaBaru = it; errForm = errForm - "nama" },
                        placeholder = "2 sampai 40 karakter, harus unik",
                        error = errForm["nama"]
                    )
                    Spacer(Modifier.height(12.dp))
                    SheetTextInput(
                        label = "Email akun Google",
                        value = emailBaru,
                        onValueChange = { emailBaru = it; errForm = errForm - "email" },
                        placeholder = "nama@gmail.com",
                        keyboardType = KeyboardType.Email,
                        error = errForm["email"]
                    )
                    Spacer(Modifier.height(12.dp))
                    Text("Peran", style = PastiCuanTheme.typography.label.copy(fontWeight = FontWeight.SemiBold), color = c.ink)
                    Spacer(Modifier.height(6.dp))
                    SegmentedTrack(
                        options = Peran.entries,
                        selected = peranBaru,
                        labelMapper = { if (it == Peran.INVESTOR) "Investor" else "Pengelola" },
                        onSelect = { peranBaru = it }
                    )
                    Spacer(Modifier.height(12.dp))
                    SheetTextInput(
                        label = "Alamat wallet Solana · Opsional",
                        value = walletBaru,
                        onValueChange = { walletBaru = it; errForm = errForm - "alamat" },
                        placeholder = "Pisahkan dengan koma bila lebih dari satu",
                        error = errForm["alamat"]
                    )

                    Spacer(Modifier.height(16.dp))
                    PastiCuanButton(
                        text = "Tambah anggota",
                        enabled = !state.offline,
                        onClick = {
                            val list = walletBaru.split(Regex("[\\s,]+")).filter { it.isNotBlank() }
                            val errs = viewModel.tambahAnggota(namaBaru, emailBaru, peranBaru, list)
                            if (errs.isNotEmpty()) {
                                errForm = errs
                            } else {
                                namaBaru = ""
                                emailBaru = ""
                                walletBaru = ""
                                peranBaru = Peran.INVESTOR
                                errForm = emptyMap()
                            }
                        },
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            }
    }

    if (editTarget != null) {
        val target = editTarget!!
        val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
        ModalBottomSheet(
            onDismissRequest = { editTarget = null },
            sheetState = sheetState,
            shape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp),
            containerColor = glassSheetContainerColor(),
            contentColor = c.ink,
            scrimColor = glassSheetScrimColor()
        ) {
            ApplyLiquidSheetWindowBlur()
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .navigationBarsPadding()
                    .imePadding()
                    .padding(horizontal = 20.dp, vertical = 8.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Text("Wallet ${target.nama}", style = PastiCuanTheme.typography.pageTitle.copy(fontSize = 19.sp), color = c.ink)
                SheetTextInput(
                    label = "Alamat wallet Solana · Opsional",
                    value = editWalletTeks,
                    onValueChange = { editWalletTeks = it; editWalletErr = null },
                    placeholder = "Pisahkan dengan koma atau spasi. Kosongkan untuk menghapus.",
                    error = editWalletErr
                )
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    PastiCuanButton(
                        text = "Batal",
                        isPrimary = false,
                        onClick = { editTarget = null },
                        modifier = Modifier.weight(1f)
                    )
                    PastiCuanButton(
                        text = "Simpan",
                        enabled = !state.offline,
                        onClick = {
                            val list = editWalletTeks.split(Regex("[\\s,]+")).filter { it.isNotBlank() }
                            val err = viewModel.ubahWalletAnggota(target.id, list)
                            if (err != null) editWalletErr = err else editTarget = null
                        },
                        modifier = Modifier.weight(1f)
                    )
                }
                Spacer(Modifier.height(16.dp))
            }
        }
    }
}

// ============================================================================
// 5. KELOLA -> PENGATURAN POOL (US-17 — Paritas src/app/(app)/kelola/pengaturan/page.tsx)
// ============================================================================
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun KelolaPengaturanScreen(
    state: AppUiState,
    viewModel: AppViewModel
) {
    val c = PastiCuanTheme.colors
    val context = LocalContext.current
    val data = state.data ?: return
    val p = data.pengaturan

    var fee by rememberSaveable { mutableStateOf(Formatters.angka(p.feePersen * 100.0, 0)) }
    var dasar by rememberSaveable { mutableStateOf(p.satuanDasarFee) }
    var lamaHari by rememberSaveable { mutableStateOf(p.batasDataLamaHari.toString()) }
    var ambangLonjakan by rememberSaveable { mutableStateOf(Formatters.angka(p.ambangLonjakanPersen, 0)) }
    var likuidUsd by rememberSaveable { mutableStateOf(Formatters.angka(p.ambangLikuiditasTokenUsd, 0)) }
    var dustUsd by rememberSaveable { mutableStateOf(Formatters.angka(p.ambangDustUsd, 0)) }
    var liveLamaMenit by rememberSaveable { mutableStateOf(p.batasLiveLamaMenit.toString()) }
    var toleransiPct by rememberSaveable { mutableStateOf(Formatters.angka(p.toleransiCocokPersen, 0)) }
    var errs by remember { mutableStateOf<Map<String, String>>(emptyMap()) }
    var konfirmasiTerbuka by remember { mutableStateOf(false) }

    val nFee = Formatters.parseAngka(fee)
    val nLama = lamaHari.trim().toIntOrNull()
    val nAmbang = Formatters.parseAngka(ambangLonjakan)
    val nLikuid = Formatters.parseAngka(likuidUsd)
    val nDust = Formatters.parseAngka(dustUsd)
    val nLiveLama = liveLamaMenit.trim().toIntOrNull()
    val nToleransi = Formatters.parseAngka(toleransiPct)

    FloatingSubScreenLayout(
        judul = "Pengaturan pool",
        onBack = { viewModel.navigateBack(AppRoute.KELOLA) },
        useImePadding = true
    ) {
            item { StatusBanners(state = state) }

            // Kartu 1: Identitas Pool Hanya-Baca
            item {
                PastiCuanCard {
                    KvRow(label = "Nama pool", value = p.namaPool)
                    HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp), color = c.hairline)
                    KvRow(label = "Tanggal mulai", value = Formatters.tanggal(p.tanggalMulai))
                    HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp), color = c.hairline)
                    KvRow(
                        label = "Wallet pool",
                        value = Formatters.ringkasAlamat(p.alamatWalletPool),
                        valueColor = c.forestInk,
                        onClick = {
                            context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("https://solscan.io/account/${p.alamatWalletPool}")))
                        }
                    )
                    HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp), color = c.hairline)
                    KvRow(label = "Snapshot otomatis", value = "Tiap hari ${p.jamSnapshot.replace(":", ".")} WIB")
                    Spacer(Modifier.height(10.dp))
                    Text(
                        text = "App hanya membaca alamat publik wallet ini tiap 1 menit, tidak pernah memegang kunci.",
                        style = PastiCuanTheme.typography.caption,
                        color = c.inkMuted
                    )
                }
            }

            // Kartu 2: Form 8 Parameter Pengaturan Pool (US-17)
            item {
                PastiCuanCard {
                    SheetTextInput(
                        label = "Fee pengelola",
                        suffix = "%",
                        value = fee,
                        onValueChange = { fee = it; errs = errs - "fee" },
                        placeholder = "10",
                        keyboardType = KeyboardType.Decimal,
                        hint = "Dipotong dari untung tiap investor, hanya kalau untung.",
                        error = errs["fee"],
                        enabled = !state.offline
                    )
                    Spacer(Modifier.height(14.dp))

                    Text("Satuan dasar fee", style = PastiCuanTheme.typography.label.copy(fontWeight = FontWeight.SemiBold), color = c.ink)
                    Spacer(Modifier.height(6.dp))
                    SegmentedTrack(
                        options = Satuan.entries,
                        selected = dasar,
                        labelMapper = { it.label },
                        onSelect = { if (!state.offline) dasar = it }
                    )
                    Spacer(Modifier.height(4.dp))
                    Text(
                        text = if (dasar == Satuan.USD) {
                            "Disepakati 14 Nov 2026 (OQ-01). Investor yang rugi dalam USD tidak kena fee walau jumlah SOL-nya bertambah."
                        } else {
                            "Fee dihitung dari untung dalam SOL, lalu dikonversi ke USD dengan harga SOL hari itu."
                        },
                        style = PastiCuanTheme.typography.caption,
                        color = c.inkMuted
                    )

                    Spacer(Modifier.height(14.dp))
                    SheetTextInput(
                        label = "Banner data lama setelah",
                        suffix = "hari",
                        value = lamaHari,
                        onValueChange = { lamaHari = it; errs = errs - "lama" },
                        placeholder = "2",
                        keyboardType = KeyboardType.Number,
                        hint = "Usulan PRD: 2 hari (BR-15).",
                        error = errs["lama"],
                        enabled = !state.offline
                    )

                    Spacer(Modifier.height(14.dp))
                    SheetTextInput(
                        label = "Peringatan lonjakan saldo",
                        suffix = "%",
                        value = ambangLonjakan,
                        onValueChange = { ambangLonjakan = it; errs = errs - "ambang" },
                        placeholder = "30",
                        keyboardType = KeyboardType.Decimal,
                        hint = "Usulan PRD: 30% tanpa setoran atau penarikan.",
                        error = errs["ambang"],
                        enabled = !state.offline
                    )

                    Spacer(Modifier.height(16.dp))
                    Text("Pembacaan wallet", style = PastiCuanTheme.typography.label.copy(fontWeight = FontWeight.SemiBold), color = c.ink)
                    Spacer(Modifier.height(10.dp))

                    SheetTextInput(
                        label = "Likuiditas minimal token",
                        prefix = "US$",
                        value = likuidUsd,
                        onValueChange = { likuidUsd = it; errs = errs - "likuid" },
                        placeholder = "10.000",
                        keyboardType = KeyboardType.Decimal,
                        hint = "Token di bawah ini dihitung US$0 (mis. token spam). Usulan: US$10.000 (BR-17).",
                        error = errs["likuid"],
                        enabled = !state.offline
                    )

                    Spacer(Modifier.height(14.dp))
                    SheetTextInput(
                        label = "Ambang dust",
                        prefix = "US$",
                        value = dustUsd,
                        onValueChange = { dustUsd = it; errs = errs - "dust" },
                        placeholder = "1",
                        keyboardType = KeyboardType.Decimal,
                        hint = "Transfer di bawah ini otomatis ditandai bukan arus (BR-19).",
                        error = errs["dust"],
                        enabled = !state.offline
                    )

                    Spacer(Modifier.height(14.dp))
                    SheetTextInput(
                        label = "Keterangan nilai lama setelah",
                        suffix = "menit",
                        value = liveLamaMenit,
                        onValueChange = { liveLamaMenit = it; errs = errs - "liveLama" },
                        placeholder = "15",
                        keyboardType = KeyboardType.Number,
                        hint = "Usulan PRD: 15 menit tanpa pembacaan baru (BR-20).",
                        error = errs["liveLama"],
                        enabled = !state.offline
                    )

                    Spacer(Modifier.height(14.dp))
                    SheetTextInput(
                        label = "Toleransi pencocokan",
                        suffix = "%",
                        value = toleransiPct,
                        onValueChange = { toleransiPct = it; errs = errs - "toleransi" },
                        placeholder = "2",
                        keyboardType = KeyboardType.Decimal,
                        hint = "Selisih transfer dan permintaan di atas ini wajib diberi alasan.",
                        error = errs["toleransi"],
                        enabled = !state.offline
                    )

                    Spacer(Modifier.height(18.dp))
                    PastiCuanButton(
                        text = "Simpan pengaturan",
                        enabled = !state.offline,
                        onClick = {
                            val e2 = mutableMapOf<String, String>()
                            if (nFee == null || nFee < 0.0 || nFee > 100.0) e2["fee"] = "Fee harus antara 0 dan 100%."
                            if (nLama == null || nLama < 1) e2["lama"] = "Tulis jumlah hari, minimal 1."
                            if (nAmbang == null || nAmbang <= 0.0) e2["ambang"] = "Ambang harus lebih dari 0%."
                            if (nLikuid == null || nLikuid < 0.0) e2["likuid"] = "Ambang likuiditas tidak boleh negatif."
                            if (nDust == null || nDust < 0.0) e2["dust"] = "Ambang dust tidak boleh negatif."
                            if (nLiveLama == null || nLiveLama < 1) e2["liveLama"] = "Tulis jumlah menit, minimal 1."
                            if (nToleransi == null || nToleransi < 0.0 || nToleransi > 100.0) e2["toleransi"] = "Toleransi harus antara 0 dan 100%."
                            errs = e2
                            if (e2.isEmpty()) konfirmasiTerbuka = true
                        },
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            }
    }

    if (konfirmasiTerbuka) {
        val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
        ModalBottomSheet(
            onDismissRequest = { konfirmasiTerbuka = false },
            sheetState = sheetState,
            shape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp),
            containerColor = glassSheetContainerColor(),
            contentColor = c.ink,
            scrimColor = glassSheetScrimColor()
        ) {
            ApplyLiquidSheetWindowBlur()
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .navigationBarsPadding()
                    .padding(horizontal = 20.dp, vertical = 8.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                Text("Hitung ulang semua angka?", style = PastiCuanTheme.typography.pageTitle.copy(fontSize = 19.sp), color = c.ink)
                Text(
                    text = "Mengubah pengaturan akan menghitung ulang posisi semua anggota. Perubahan tercatat di log.",
                    style = PastiCuanTheme.typography.body.copy(fontSize = 15.sp),
                    color = c.ink
                )
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    PastiCuanButton(
                        text = "Batal",
                        isPrimary = false,
                        onClick = { konfirmasiTerbuka = false },
                        modifier = Modifier.weight(1f)
                    )
                    PastiCuanButton(
                        text = "Simpan",
                        onClick = {
                            viewModel.ubahPengaturan(
                                p.copy(
                                    feePersen = (nFee ?: 10.0) / 100.0,
                                    satuanDasarFee = dasar,
                                    batasDataLamaHari = nLama ?: 2,
                                    ambangLonjakanPersen = nAmbang ?: 30.0,
                                    ambangLikuiditasTokenUsd = nLikuid ?: 10000.0,
                                    ambangDustUsd = nDust ?: 1.0,
                                    batasLiveLamaMenit = nLiveLama ?: 15,
                                    toleransiCocokPersen = nToleransi ?: 2.0
                                )
                            )
                            konfirmasiTerbuka = false
                        },
                        modifier = Modifier.weight(1f)
                    )
                }
                Spacer(Modifier.height(16.dp))
            }
        }
    }
}

// ---------- Komponen Kolom Input Bersama untuk Form Kelola ----------
@Composable
private fun SheetTextInput(
    label: String,
    value: String,
    onValueChange: (String) -> Unit,
    placeholder: String = "",
    prefix: String? = null,
    suffix: String? = null,
    hint: String? = null,
    error: String? = null,
    keyboardType: KeyboardType = KeyboardType.Text,
    enabled: Boolean = true
) {
    val c = PastiCuanTheme.colors
    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Text(label, style = PastiCuanTheme.typography.label.copy(fontWeight = FontWeight.SemiBold), color = c.ink)
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .height(52.dp)
                .clip(RoundedCornerShape(16.dp))
                .background(if (error != null) c.card else c.field)
                .then(
                    if (error != null) Modifier.border(1.5.dp, c.loss, RoundedCornerShape(16.dp))
                    else Modifier
                )
                .padding(horizontal = 16.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            if (prefix != null) {
                Text(prefix, style = PastiCuanTheme.typography.body.copy(fontWeight = FontWeight.SemiBold, fontSize = 15.sp), color = c.inkMuted)
            }
            BasicTextField(
                value = value,
                onValueChange = onValueChange,
                enabled = enabled,
                singleLine = true,
                textStyle = PastiCuanTheme.typography.body.copy(fontSize = 16.sp, color = c.ink, fontFeatureSettings = "tnum"),
                cursorBrush = SolidColor(c.forestInk),
                keyboardOptions = KeyboardOptions(keyboardType = keyboardType),
                modifier = Modifier.weight(1f),
                decorationBox = { inner ->
                    Box(contentAlignment = Alignment.CenterStart) {
                        if (value.isEmpty() && placeholder.isNotEmpty()) {
                            Text(
                                text = placeholder,
                                style = PastiCuanTheme.typography.body.copy(fontSize = 15.sp),
                                color = c.inkMuted.copy(alpha = 0.55f)
                            )
                        }
                        inner()
                    }
                }
            )
            if (suffix != null) {
                Text(
                    text = suffix,
                    style = PastiCuanTheme.typography.body.copy(fontWeight = FontWeight.SemiBold, fontSize = 15.sp),
                    color = c.inkMuted,
                    textAlign = TextAlign.End
                )
            }
        }
        if (error != null) {
            FieldErrorRow(error)
        } else if (hint != null) {
            Text(hint, style = PastiCuanTheme.typography.caption, color = c.inkMuted)
        }
    }
}
