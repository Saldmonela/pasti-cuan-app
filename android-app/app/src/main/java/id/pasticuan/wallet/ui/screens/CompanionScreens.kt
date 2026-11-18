package id.pasticuan.wallet.ui.screens

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.animation.expandVertically
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.shrinkVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
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
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import id.pasticuan.wallet.BuildConfig
import id.pasticuan.wallet.domain.engine.PoolEngine
import id.pasticuan.wallet.domain.model.ArahArus
import id.pasticuan.wallet.domain.model.Jenis
import id.pasticuan.wallet.domain.model.Peran
import id.pasticuan.wallet.domain.model.Permintaan
import id.pasticuan.wallet.domain.model.Rentang
import id.pasticuan.wallet.domain.model.Satuan
import id.pasticuan.wallet.domain.model.StatusPermintaan
import id.pasticuan.wallet.domain.model.SumberSnapshot
import id.pasticuan.wallet.domain.util.Formatters
import id.pasticuan.wallet.ui.components.ApplyLiquidSheetWindowBlur
import id.pasticuan.wallet.ui.components.FilterTabsTrack
import id.pasticuan.wallet.ui.components.FloatingSubScreenLayout
import id.pasticuan.wallet.ui.components.GlassSwitch
import id.pasticuan.wallet.ui.components.IconDot
import id.pasticuan.wallet.ui.components.KartuGrafik
import id.pasticuan.wallet.ui.components.PageTopHeader
import id.pasticuan.wallet.ui.components.PastiCuanButton
import id.pasticuan.wallet.ui.components.PastiCuanCard
import id.pasticuan.wallet.ui.components.PastiCuanIcons
import id.pasticuan.wallet.ui.components.RoleChip
import id.pasticuan.wallet.ui.components.SegmentedTrack
import id.pasticuan.wallet.ui.components.StatusBanners
import id.pasticuan.wallet.ui.components.StatusPermintaanChip
import id.pasticuan.wallet.ui.components.glassSheetContainerColor
import id.pasticuan.wallet.ui.components.glassSheetScrimColor
import id.pasticuan.wallet.ui.components.kartuWaktuLiveText
import id.pasticuan.wallet.ui.state.AppRoute
import id.pasticuan.wallet.ui.state.AppUiState
import id.pasticuan.wallet.ui.state.AppViewModel
import id.pasticuan.wallet.ui.theme.ModeTema
import id.pasticuan.wallet.ui.theme.PastiCuanTheme
import kotlinx.coroutines.launch
import kotlin.math.abs
import kotlin.math.roundToInt

// ============================================================================
// 1. POOL SCREEN (Paritas 1:1 src/app/(app)/pool/page.tsx)
// ============================================================================
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun PoolScreen(
    state: AppUiState,
    viewModel: AppViewModel
) {
    val c = PastiCuanTheme.colors
    val data = state.data ?: return
    val hasil = state.hasil ?: return
    val resmi = state.resmi ?: hasil
    val saya = state.saya ?: return

    var rentang by rememberSaveable { mutableStateOf(Rentang.JAM_24) }
    var infoTerbuka by remember { mutableStateOf(false) }

    val opsiRentang = remember(data.permintaan) {
        PoolEngine.opsiRentang(data.permintaan, null)
    }
    LaunchedEffect(opsiRentang) {
        if (rentang !in opsiRentang) rentang = Rentang.JAM_24
    }

    val seri = remember(hasil, rentang, state.sekarangMs) {
        viewModel.seri(rentang, null)
    }
    val kosongMsg = PoolEngine.grafikKosong(seri, rentang, hasil.riwayatPool.size)
    val live = hasil.live
    val jamLive = live?.let { Formatters.jam(it.dibacaPada) }
    val isiUsd = live?.nilaiMentahUsd ?: hasil.pool.nilaiUsd
    val isiSol = if (live != null) live.nilaiMentahUsd / live.harga else hasil.pool.saldoSol
    val belumDiproses = live?.arusDinetralkanUsd ?: 0.0
    val adaSelisih = abs(belumDiproses) >= 0.01

    val diprosesIds = remember(data.permintaan, data.arus) {
        data.permintaan
            .filter { p -> p.status == StatusPermintaan.MENUNGGU && p.jenis == Jenis.TARIK && data.arus.any { it.permintaanId == p.id } }
            .map { it.anggotaId }
            .toSet()
    }

    val investor = hasil.posisi
        .filter { it.peran == Peran.INVESTOR && (it.unit > 1e-9 || it.punyaSetoran) }
        .sortedByDescending { it.porsi }
    val pengelolaPos = hasil.posisi.firstOrNull { it.id == hasil.pengelola.id }
    val totalNet = hasil.posisi.sumOf { it.netUsd } + hasil.pengelola.feeTerutangTotal
    val totalPorsi = hasil.posisi.sumOf { it.porsi }

    val barItems = buildList {
        investor.forEach { add(it.id to it.porsi) }
        if (pengelolaPos != null && pengelolaPos.unit > 1e-9) {
            add(pengelolaPos.id to pengelolaPos.porsi)
        }
    }

    var k = 0
    val warnaPorsi = barItems.associate { (id, _) ->
        id to (if (id == saya.id) c.forestInk else c.sharePalette[k++ % c.sharePalette.size])
    }

    val waktuKartu = kartuWaktuLiveText(hasil, data.pengaturan.jamSnapshot)
    val cekGagal = !hasil.cek.lolos || !resmi.cek.lolos

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(c.canvas),
        contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 8.dp, bottom = 108.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            PageTopHeader(
                judul = "Pool",
                state = state,
                showStamp = true,
                onAvatarClick = { viewModel.navigateTo(AppRoute.LAINNYA, isTab = true) }
            )
        }

        item {
            StatusBanners(state = state)
        }

        item {
            KartuGrafik(
                label = "Saldo pool ${data.pengaturan.namaPool}",
                seri = seri,
                liveUsd = isiUsd,
                liveSol = isiSol,
                waktuLive = waktuKartu,
                mode = state.modeSatuan,
                onModeChange = viewModel::setModeSatuan,
                rentang = rentang,
                opsiRentang = opsiRentang,
                onRentangChange = { rentang = it },
                kosongMessage = kosongMsg,
                infoButton = if (adaSelisih) {
                    {
                        Box(
                            modifier = Modifier
                                .size(44.dp)
                                .clip(CircleShape)
                                .background(if (infoTerbuka) c.field else Color.Transparent)
                                .clickable { infoTerbuka = !infoTerbuka },
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = PastiCuanIcons.InfoCircle,
                                contentDescription = "Kenapa angka ini berbeda dari total anggota",
                                tint = if (infoTerbuka) c.forestInk else c.inkMuted,
                                modifier = Modifier.size(20.dp)
                            )
                        }
                    }
                } else null,
                catatanInfo = if (adaSelisih && infoTerbuka) {
                    {
                        Spacer(Modifier.height(6.dp))
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(16.dp))
                                .background(c.field)
                                .padding(horizontal = 14.dp, vertical = 10.dp)
                        ) {
                            val arahKata = if (belumDiproses > 0) "keluar dari" else "masuk ke"
                            val seolahKata = if (belumDiproses > 0) "ada" else "belum ada"
                            Text(
                                text = "Isi wallet sekarang ${Formatters.usd(isiUsd)}. ${Formatters.usd(abs(belumDiproses))} sudah $arahKata wallet tapi belum dicocokkan ke permintaan, jadi nilai tiap orang masih dihitung seolah-olah dana itu $seolahKata. Akan beres setelah transfer dicocokkan.",
                                style = PastiCuanTheme.typography.caption,
                                color = c.inkMuted
                            )
                        }
                    }
                } else null,
                keteranganTambahan = {
                    Spacer(Modifier.height(10.dp))
                    Row(
                        verticalAlignment = Alignment.Top,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        // .cap .mk: lingkaran putih radius 5dp dengan tepi hijau hutan 2dp
                        Box(
                            modifier = Modifier
                                .padding(top = 3.dp)
                                .size(10.dp)
                                .clip(CircleShape)
                                .background(c.card)
                                .border(2.dp, c.forestInk, CircleShape)
                        )
                        Text(
                            text = "Titik bertanda = ada setoran atau penarikan. Naik-turun di titik itu bukan untung atau rugi." +
                                (jamLive?.let { " Titik terakhir = isi wallet $it WIB." } ?: ""),
                            style = PastiCuanTheme.typography.caption,
                            color = c.inkMuted
                        )
                    }
                }
            ) {
                Spacer(Modifier.height(14.dp))
                Text(
                    text = "Harga SOL ${jamLive?.let { "$it WIB" } ?: "hari ini"} ${Formatters.usd(hasil.pool.harga)}" +
                        (if (jamLive != null) ", dibaca otomatis dari wallet." else ", dihitung dari saldo USD dibagi saldo SOL."),
                    style = PastiCuanTheme.typography.caption,
                    color = c.inkMuted
                )
            }
        }

        // Kartu 2: Posisi semua anggota
        item {
            PastiCuanCard {
                Text(
                    text = "Posisi semua anggota",
                    style = PastiCuanTheme.typography.title,
                    color = c.ink
                )
                Spacer(Modifier.height(14.dp))
                ShareBar(items = barItems, myId = saya.id)
                Spacer(Modifier.height(14.dp))

                investor.forEachIndexed { index, p ->
                    if (index > 0) {
                        HorizontalDivider(modifier = Modifier.padding(vertical = 12.dp), color = c.hairline)
                    }
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.Top,
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .padding(top = 6.dp)
                                .size(10.dp)
                                .clip(RoundedCornerShape(3.dp))
                                .background(warnaPorsi[p.id] ?: c.hairline)
                        )
                        Column(modifier = Modifier.weight(1f)) {
                            FlowRow(
                                horizontalArrangement = Arrangement.spacedBy(6.dp),
                                verticalArrangement = Arrangement.spacedBy(4.dp)
                            ) {
                                Text(
                                    text = p.nama,
                                    style = PastiCuanTheme.typography.title,
                                    color = c.ink
                                )
                                if (p.id == saya.id) {
                                    RoleChip("Kamu")
                                }
                                if (p.id in diprosesIds) {
                                    StatusPermintaanChip(StatusPermintaan.MENUNGGU)
                                }
                                Text(
                                    text = Formatters.persen(p.porsi),
                                    style = PastiCuanTheme.typography.figureSm,
                                    color = c.inkMuted
                                )
                            }
                            Spacer(Modifier.height(2.dp))
                            val sub = buildAnnotatedString {
                                append("Modal ${Formatters.usd(p.modalUsd)} · ")
                                withStyle(
                                    SpanStyle(
                                        color = if (Formatters.isNegative(p.profitUsd, 2)) c.loss else c.gain,
                                        fontWeight = FontWeight.Medium
                                    )
                                ) {
                                    append(Formatters.bertanda(p.profitUsd, Satuan.USD))
                                }
                                append(" · Fee ${Formatters.usd(p.feeUsd)}")
                            }
                            Text(
                                text = sub,
                                style = PastiCuanTheme.typography.caption.copy(fontFeatureSettings = "tnum", fontSize = 12.5.sp),
                                color = c.inkMuted
                            )
                        }
                        Column(horizontalAlignment = Alignment.End) {
                            Text(
                                text = Formatters.usd(p.netUsd),
                                style = PastiCuanTheme.typography.bodyTabular,
                                color = c.ink
                            )
                            Text(
                                text = Formatters.sol(p.netSol),
                                style = PastiCuanTheme.typography.caption.copy(fontFeatureSettings = "tnum"),
                                color = c.inkMuted
                            )
                        }
                    }
                }

                if (pengelolaPos != null) {
                    HorizontalDivider(modifier = Modifier.padding(vertical = 12.dp), color = c.hairline)
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.Top,
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .padding(top = 6.dp)
                                .size(10.dp)
                                .clip(RoundedCornerShape(3.dp))
                                .background(warnaPorsi[pengelolaPos.id] ?: c.hairline)
                        )
                        Column(modifier = Modifier.weight(1f)) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(6.dp)
                            ) {
                                Text(
                                    text = pengelolaPos.nama,
                                    style = PastiCuanTheme.typography.title,
                                    color = c.ink
                                )
                                RoleChip("Pengelola")
                            }
                            Spacer(Modifier.height(2.dp))
                            Text(
                                text = "Unit fee ${Formatters.usd(hasil.pengelola.nilaiUnitFeeUsd)} · Fee terutang ${Formatters.usd(hasil.pengelola.feeTerutangTotal)}",
                                style = PastiCuanTheme.typography.caption.copy(fontFeatureSettings = "tnum", fontSize = 12.5.sp),
                                color = c.inkMuted
                            )
                        }
                        Column(horizontalAlignment = Alignment.End) {
                            Text(
                                text = Formatters.usd(hasil.pengelola.nilaiUnitFeeUsd + hasil.pengelola.feeTerutangTotal),
                                style = PastiCuanTheme.typography.bodyTabular,
                                color = c.ink
                            )
                            Text(
                                text = Formatters.persen(pengelolaPos.porsi),
                                style = PastiCuanTheme.typography.caption.copy(fontFeatureSettings = "tnum"),
                                color = c.inkMuted
                            )
                        }
                    }
                }

                Spacer(Modifier.height(12.dp))
                HorizontalDivider(thickness = 2.dp, color = c.ink)
                Spacer(Modifier.height(14.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.Top
                ) {
                    Text(
                        text = if (adaSelisih) "Total anggota" else "Total pool",
                        style = PastiCuanTheme.typography.title,
                        color = c.ink
                    )
                    Column(horizontalAlignment = Alignment.End) {
                        Text(
                            text = Formatters.usd(totalNet),
                            style = PastiCuanTheme.typography.figureTotal,
                            color = c.ink
                        )
                        Text(
                            text = "Porsi ${Formatters.persen(totalPorsi)}",
                            style = PastiCuanTheme.typography.caption.copy(fontFeatureSettings = "tnum"),
                            color = c.inkMuted
                        )
                    }
                }

                if (adaSelisih) {
                    Spacer(Modifier.height(8.dp))
                    Text(
                        text = "Total anggota ${Formatters.usd(totalNet)} · Belum diproses ${Formatters.bertanda(-belumDiproses, Satuan.USD)} · Isi wallet ${Formatters.usd(isiUsd)}",
                        style = PastiCuanTheme.typography.caption.copy(fontFeatureSettings = "tnum"),
                        color = c.inkMuted
                    )
                }
            }
        }

        // Kartu 3: Cek data
        item {
            PastiCuanCard {
                Text(text = "Cek data", style = PastiCuanTheme.typography.title, color = c.ink)
                Spacer(Modifier.height(8.dp))
                if (!cekGagal) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Icon(
                            imageVector = PastiCuanIcons.CircleCheck,
                            contentDescription = null,
                            tint = c.gain,
                            modifier = Modifier.size(20.dp)
                        )
                        Text(
                            text = "Semua cek lolos",
                            style = PastiCuanTheme.typography.body.copy(fontWeight = FontWeight.SemiBold),
                            color = c.gain
                        )
                    }
                } else {
                    val penyebabGabung = (hasil.cek.penyebab + resmi.cek.penyebab).distinct()
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(16.dp))
                            .background(c.warningWash)
                            .padding(horizontal = 14.dp, vertical = 12.dp),
                        horizontalArrangement = Arrangement.spacedBy(10.dp),
                        verticalAlignment = Alignment.Top
                    ) {
                        Icon(
                            imageVector = PastiCuanIcons.AlertTriangle,
                            contentDescription = null,
                            tint = c.warningInk,
                            modifier = Modifier.padding(top = 1.dp).size(18.dp)
                        )
                        Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                            penyebabGabung.forEach { msg ->
                                Text(text = msg, style = PastiCuanTheme.typography.label, color = c.warningInk)
                            }
                        }
                    }
                }
                Spacer(Modifier.height(10.dp))
                Text(
                    text = "Dicek setiap kali angka dihitung ulang: tidak ada unit negatif, tidak ada penarikan melebihi nilai bersih, setiap transaksi punya saldo harian, total nilai semua anggota sama dengan saldo pool, dan tidak ada transfer wallet yang belum dicatat sebelum snapshot terakhir.",
                    style = PastiCuanTheme.typography.caption,
                    color = c.inkMuted
                )
            }
        }
    }
}

// ============================================================================
// 2. TRANSAKSI SCREEN (Paritas 1:1 src/app/(app)/permintaan/page.tsx)
// ============================================================================
private enum class CakupanTx(val label: String) {
    SEMUA("Semua anggota"),
    SAYA("Milik saya")
}

private enum class FilterTx(val label: String) {
    SEMUA("Semua"),
    MENUNGGU("Menunggu"),
    DIPROSES("Diproses")
}

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun TransaksiScreen(
    state: AppUiState,
    viewModel: AppViewModel
) {
    val c = PastiCuanTheme.colors
    val data = state.data ?: return
    val saya = state.saya ?: return
    val scope = rememberCoroutineScope()

    var cakupan by rememberSaveable { mutableStateOf(CakupanTx.SEMUA) }
    var filter by rememberSaveable { mutableStateOf(FilterTx.SEMUA) }
    var targetBatal by remember { mutableStateOf<Permintaan?>(null) }

    val namaMap = remember(data.anggota) { data.anggota.associate { it.id to it.nama } }
    val sumber = remember(data.permintaan, cakupan, saya.id) {
        val base = if (cakupan == CakupanTx.SAYA) {
            data.permintaan.filter { it.anggotaId == saya.id }
        } else {
            data.permintaan
        }
        base.sortedWith(
            compareByDescending<Permintaan> { it.status == StatusPermintaan.MENUNGGU }
                .thenByDescending { it.waktuEfektif ?: it.tanggalEfektif ?: it.dibuatPada }
        )
    }

    fun cocok(s: StatusPermintaan, f: FilterTx): Boolean = when (f) {
        FilterTx.SEMUA -> true
        FilterTx.MENUNGGU -> s == StatusPermintaan.MENUNGGU
        FilterTx.DIPROSES -> s != StatusPermintaan.MENUNGGU
    }

    val daftar = sumber.filter { cocok(it.status, filter) }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(c.canvas),
        contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 8.dp, bottom = 108.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            PageTopHeader(
                judul = "Transaksi",
                state = state,
                showStamp = false,
                onAvatarClick = { viewModel.navigateTo(AppRoute.LAINNYA, isTab = true) }
            )
        }

        item {
            StatusBanners(state = state)
        }

        item {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                FilterTabsTrack(
                    options = CakupanTx.entries,
                    selected = cakupan,
                    labelMapper = { it.label },
                    onSelect = { cakupan = it }
                )
                FilterTabsTrack(
                    options = FilterTx.entries,
                    selected = filter,
                    labelMapper = { it.label },
                    countMapper = { f -> sumber.count { cocok(it.status, f) } },
                    onSelect = { filter = it }
                )
            }
        }

        item {
            PastiCuanCard {
                if (daftar.isEmpty()) {
                    Column(
                        modifier = Modifier.fillMaxWidth(),
                        verticalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Text(
                            text = if (filter == FilterTx.MENUNGGU) "Tidak ada permintaan yang menunggu." else "Belum ada transaksi.",
                            style = PastiCuanTheme.typography.title,
                            color = c.ink
                        )
                        Text(
                            text = "Setoran dan penarikan yang kamu ajukan akan muncul di sini beserta statusnya.",
                            style = PastiCuanTheme.typography.caption,
                            color = c.inkMuted
                        )
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            PastiCuanButton(
                                text = "Setor",
                                icon = PastiCuanIcons.Plus,
                                height = 40.dp,
                                enabled = !state.offline,
                                onClick = { viewModel.navigateTo(AppRoute.SETOR) },
                                modifier = Modifier.weight(1f)
                            )
                            PastiCuanButton(
                                text = "Tarik",
                                icon = PastiCuanIcons.ArrowUpRight,
                                isPrimary = false,
                                height = 40.dp,
                                enabled = !state.offline,
                                onClick = { viewModel.navigateTo(AppRoute.TARIK) },
                                modifier = Modifier.weight(1f)
                            )
                        }
                    }
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
                            IconDot(
                                icon = if (p.jenis == Jenis.SETOR) PastiCuanIcons.ArrowDownLeft else PastiCuanIcons.ArrowUpRight
                            )
                            Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) {
                                FlowRow(
                                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                                    verticalArrangement = Arrangement.spacedBy(4.dp)
                                ) {
                                    val labelJenis = if (p.jenis == Jenis.SETOR) "Setoran" else "Penarikan"
                                    val pemilik = if (cakupan == CakupanTx.SEMUA) " · ${namaMap[p.anggotaId] ?: p.anggotaId}" else ""
                                    Text(
                                        text = "$labelJenis$pemilik",
                                        style = PastiCuanTheme.typography.title,
                                        color = c.ink
                                    )
                                    StatusPermintaanChip(p.status)
                                }

                                val waktuTeks = if (p.status == StatusPermintaan.SELESAI) {
                                    val t = p.waktuEfektif?.let { Formatters.waktu(it) }
                                        ?: p.tanggalEfektif?.let { Formatters.tanggal(it) }
                                        ?: ""
                                    "Efektif $t" + (if (p.sumber == "impor") " · dari impor riwayat" else "")
                                } else {
                                    "Diajukan ${Formatters.waktu(p.dibuatPada)}"
                                }
                                Text(text = waktuTeks, style = PastiCuanTheme.typography.caption, color = c.inkMuted)

                                if (p.status == StatusPermintaan.SELESAI && p.jumlahFinalUsd != null && abs(p.jumlahFinalUsd - p.jumlahUsd) > 0.004) {
                                    val kata = if (p.jenis == Jenis.SETOR) "diterima" else "dikirim"
                                    Text(
                                        text = "Diajukan ${Formatters.usd(p.jumlahUsd)}, $kata ${Formatters.usd(p.jumlahFinalUsd)}." +
                                            (p.alasan?.let { " Alasan: $it" } ?: ""),
                                        style = PastiCuanTheme.typography.caption,
                                        color = c.inkMuted
                                    )
                                }

                                if (p.status == StatusPermintaan.DITOLAK && !p.alasan.isNullOrBlank()) {
                                    Text(text = "Ditolak: ${p.alasan}", style = PastiCuanTheme.typography.caption, color = c.loss)
                                }
                                if (p.status == StatusPermintaan.MENUNGGU && data.arus.any { it.permintaanId == p.id }) {
                                    Text(
                                        text = "Transfer sudah terlihat di wallet. Menunggu pencocokan pengelola.",
                                        style = PastiCuanTheme.typography.caption,
                                        color = c.gain
                                    )
                                }
                                if (!p.catatan.isNullOrBlank()) {
                                    Text(text = "Catatan: ${p.catatan}", style = PastiCuanTheme.typography.caption, color = c.inkMuted)
                                }
                                if (p.status == StatusPermintaan.MENUNGGU && p.anggotaId == saya.id) {
                                    Spacer(Modifier.height(4.dp))
                                    PastiCuanButton(
                                        text = "Batalkan",
                                        isGhost = true,
                                        height = 36.dp,
                                        enabled = !state.offline,
                                        onClick = { targetBatal = p }
                                    )
                                }
                            }
                            Text(
                                text = Formatters.usd(p.jumlahFinalUsd ?: p.jumlahUsd),
                                style = PastiCuanTheme.typography.bodyTabular,
                                color = c.ink
                            )
                        }
                    }
                }
            }
        }

        // Kartu Pintasan ke Log Perubahan
        item {
            PastiCuanCard(
                modifier = Modifier.clickable { viewModel.navigateTo(AppRoute.LOG) }
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text("Log perubahan", style = PastiCuanTheme.typography.title, color = c.ink)
                        Text(
                            text = "Siapa mengubah apa dan kapan. Bisa dilihat semua anggota.",
                            style = PastiCuanTheme.typography.caption,
                            color = c.inkMuted
                        )
                    }
                    Icon(
                        imageVector = PastiCuanIcons.ChevronRight,
                        contentDescription = null,
                        tint = c.inkMuted,
                        modifier = Modifier.size(18.dp)
                    )
                }
            }
        }
    }

    if (targetBatal != null) {
        val p = targetBatal!!
        val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
        ModalBottomSheet(
            onDismissRequest = { targetBatal = null },
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
                Text("Batalkan permintaan?", style = PastiCuanTheme.typography.pageTitle.copy(fontSize = 19.sp), color = c.ink)
                Text(
                    text = "${if (p.jenis == Jenis.SETOR) "Setoran" else "Penarikan"} ${Formatters.usd(p.jumlahUsd)} akan dibatalkan. Kamu bisa mengajukan lagi kapan saja.",
                    style = PastiCuanTheme.typography.body.copy(fontSize = 15.sp),
                    color = c.ink
                )
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    PastiCuanButton(
                        text = "Jangan batalkan",
                        isPrimary = false,
                        onClick = { targetBatal = null },
                        modifier = Modifier.weight(1f)
                    )
                    PastiCuanButton(
                        text = if (state.sedangMengirim) "Membatalkan…" else "Ya, batalkan",
                        isDanger = true,
                        enabled = !state.sedangMengirim,
                        onClick = {
                            scope.launch {
                                viewModel.batalkanPermintaan(p.id)
                                targetBatal = null
                            }
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
// 3. KELOLA HUB SCREEN (Paritas 1:1 src/app/(app)/kelola/page.tsx)
// ============================================================================
@Composable
fun KelolaScreen(
    state: AppUiState,
    viewModel: AppViewModel
) {
    val c = PastiCuanTheme.colors
    val data = state.data ?: return
    val hasil = state.hasil ?: return
    val resmi = state.resmi ?: hasil
    val saya = state.saya ?: return

    if (saya.peran != Peran.PENGELOLA) {
        Column(
            modifier = Modifier.fillMaxSize().background(c.canvas).padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            PageTopHeader(
                judul = "Kelola",
                state = state,
                showStamp = false,
                onAvatarClick = { viewModel.navigateTo(AppRoute.LAINNYA, isTab = true) }
            )
            PastiCuanCard {
                IconDot(PastiCuanIcons.AlertTriangle, size = 44.dp)
                Spacer(Modifier.height(12.dp))
                Text("Halaman ini khusus pengelola.", style = PastiCuanTheme.typography.title, color = c.ink)
                Spacer(Modifier.height(12.dp))
                PastiCuanButton(
                    text = "Kembali ke Beranda",
                    isPrimary = false,
                    height = 40.dp,
                    onClick = { viewModel.navigateTo(AppRoute.BERANDA, isTab = true) }
                )
            }
        }
        return
    }

    val namaMap = remember(data.anggota) { data.anggota.associate { it.id to it.nama } }
    val jam = data.pengaturan.jamSnapshot
    val snapHariIni = data.snapshots.firstOrNull { it.tanggal == state.hariIni }
    val gagalOtomatis = snapHariIni == null &&
        state.sekarangMs >= Formatters.msSnapshot(state.hariIni, jam) + 30L * 60_000L

    val urutSnap = remember(data.snapshots) { data.snapshots.sortedBy { it.tanggal } }
    val akhirSnap = urutSnap.lastOrNull()
    val sebelumSnap = if (urutSnap.size >= 2) urutSnap[urutSnap.size - 2] else null
    val lonjakanPct = if (
        akhirSnap?.sumber == SumberSnapshot.OTOMATIS &&
        sebelumSnap != null &&
        data.permintaan.none { it.status == StatusPermintaan.SELESAI && it.tanggalEfektif == akhirSnap.tanggal }
    ) {
        abs(akhirSnap.nilaiUsd - sebelumSnap.nilaiUsd) / sebelumSnap.nilaiUsd * 100.0
    } else 0.0

    val cekGagal = !hasil.cek.lolos || !resmi.cek.lolos

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(c.canvas),
        contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 8.dp, bottom = 108.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            PageTopHeader(
                judul = "Kelola",
                state = state,
                showStamp = true,
                onAvatarClick = { viewModel.navigateTo(AppRoute.LAINNYA, isTab = true) }
            )
        }

        item {
            StatusBanners(state = state)
        }

        // Kartu 1: Yang perlu dikerjakan
        item {
            PastiCuanCard {
                Text("Yang perlu dikerjakan", style = PastiCuanTheme.typography.title, color = c.ink)
                Spacer(Modifier.height(12.dp))

                // 1. Arus onchain
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.Top,
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    IconDot(PastiCuanIcons.ArrowsExchange)
                    Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                        Text(
                            text = if (state.arusBelum.isNotEmpty()) {
                                "${state.arusBelum.size} transfer belum dicocokkan"
                            } else {
                                "Semua transfer sudah dicocokkan."
                            },
                            style = PastiCuanTheme.typography.title,
                            color = c.ink
                        )
                        state.arusBelum.take(3).forEach { a ->
                            Text(
                                text = "${if (a.arah == ArahArus.MASUK) "Masuk" else "Keluar"} ${Formatters.usd(a.nilaiUsd)} · ${Formatters.jam(a.waktu)} WIB",
                                style = PastiCuanTheme.typography.caption,
                                color = c.inkMuted
                            )
                        }
                    }
                    if (state.arusBelum.isNotEmpty()) {
                        PastiCuanButton(
                            text = "Cocokkan",
                            height = 40.dp,
                            onClick = { viewModel.navigateTo(AppRoute.KELOLA_ARUS) }
                        )
                    }
                }

                HorizontalDivider(modifier = Modifier.padding(vertical = 14.dp), color = c.hairline)

                // 2. Snapshot hari ini
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.Top,
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    IconDot(PastiCuanIcons.Scale)
                    Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                        Text("Snapshot ${Formatters.tanggal(state.hariIni)}", style = PastiCuanTheme.typography.title, color = c.ink)
                        val teksSnap = when {
                            snapHariIni != null && snapHariIni.sumber == SumberSnapshot.OTOMATIS ->
                                "Dibuat otomatis ${jam.replace(":", ".")} WIB dari pembacaan wallet."
                            snapHariIni != null ->
                                "Sudah dicatat. Semua posisi sudah diperbarui."
                            gagalOtomatis ->
                                "Pembacaan wallet gagal sampai ${jam.replace(":00", ".30")} WIB. Isi snapshot manual."
                            else ->
                                "Dibuat otomatis jam ${jam.replace(":", ".")} WIB."
                        }
                        Text(
                            text = teksSnap,
                            style = PastiCuanTheme.typography.caption,
                            color = if (gagalOtomatis) c.loss else c.inkMuted
                        )
                    }
                    if (gagalOtomatis) {
                        PastiCuanButton(
                            text = "Isi manual",
                            height = 40.dp,
                            onClick = { viewModel.navigateTo(AppRoute.KELOLA_SALDO) }
                        )
                    }
                }

                if (lonjakanPct > data.pengaturan.ambangLonjakanPersen && akhirSnap != null) {
                    HorizontalDivider(modifier = Modifier.padding(vertical = 14.dp), color = c.hairline)
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.Top,
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        IconDot(PastiCuanIcons.AlertTriangle)
                        Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                            Text("Cek snapshot ${Formatters.tanggal(akhirSnap.tanggal)}", style = PastiCuanTheme.typography.title, color = c.ink)
                            Text(
                                text = "Saldo berubah ${lonjakanPct.roundToInt()}% dari kemarin tanpa ada setoran atau penarikan. Yakin angkanya benar?",
                                style = PastiCuanTheme.typography.caption,
                                color = c.inkMuted
                            )
                        }
                        PastiCuanButton(
                            text = "Cek",
                            isGhost = true,
                            height = 40.dp,
                            onClick = { viewModel.navigateTo(AppRoute.KELOLA_SALDO) }
                        )
                    }
                }

                HorizontalDivider(modifier = Modifier.padding(vertical = 14.dp), color = c.hairline)

                // 3. Permintaan menunggu
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.Top,
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    IconDot(PastiCuanIcons.ClipboardList)
                    Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                        Text(
                            text = if (state.menunggu.isNotEmpty()) "${state.menunggu.size} permintaan menunggu" else "Belum ada permintaan.",
                            style = PastiCuanTheme.typography.title,
                            color = c.ink
                        )
                        state.menunggu.take(3).forEach { p ->
                            Text(
                                text = "${namaMap[p.anggotaId] ?: p.anggotaId} · ${if (p.jenis == Jenis.SETOR) "setor" else "tarik"} ${Formatters.usd(p.jumlahUsd)}",
                                style = PastiCuanTheme.typography.caption,
                                color = c.inkMuted
                            )
                        }
                    }
                    if (state.menunggu.isNotEmpty()) {
                        PastiCuanButton(
                            text = "Proses",
                            isPrimary = false,
                            height = 40.dp,
                            onClick = { viewModel.navigateTo(AppRoute.KELOLA_PERMINTAAN) }
                        )
                    }
                }

                HorizontalDivider(modifier = Modifier.padding(vertical = 14.dp), color = c.hairline)

                // 4. Cek data
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    IconDot(PastiCuanIcons.Scale)
                    Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                        Text("Cek data", style = PastiCuanTheme.typography.title, color = c.ink)
                        Text(
                            text = if (cekGagal) "Ada masalah. Penarikan baru diblokir sampai beres." else "Semua cek lolos.",
                            style = PastiCuanTheme.typography.caption,
                            color = if (cekGagal) c.loss else c.gain
                        )
                    }
                    PastiCuanButton(
                        text = "Lihat",
                        isGhost = true,
                        height = 40.dp,
                        onClick = { viewModel.navigateTo(AppRoute.POOL, isTab = true) }
                    )
                }
            }
        }

        // Kartu 2: Menu Kelola (5 sub-halaman sesuai PRD v1.1)
        item {
            PastiCuanCard(padding = 20.dp) {
                val feePctTeks = Formatters.angka(data.pengaturan.feePersen * 100.0, 0)
                val menus = listOf(
                    Triple(
                        AppRoute.KELOLA_ARUS,
                        PastiCuanIcons.ArrowsExchange,
                        "Arus onchain" to "${state.arusBelum.size} belum dicocokkan"
                    ),
                    Triple(
                        AppRoute.KELOLA_SALDO,
                        PastiCuanIcons.Scale,
                        "Snapshot saldo" to "Otomatis tiap ${jam.replace(":", ".")} WIB · ${data.snapshots.size} tersimpan"
                    ),
                    Triple(
                        AppRoute.KELOLA_PERMINTAAN,
                        PastiCuanIcons.ClipboardList,
                        "Permintaan" to "Konfirmasi, selesaikan, atau tolak"
                    ),
                    Triple(
                        AppRoute.KELOLA_ANGGOTA,
                        PastiCuanIcons.Users,
                        "Anggota" to "${data.anggota.count { it.aktif }} anggota aktif"
                    ),
                    Triple(
                        AppRoute.KELOLA_PENGATURAN,
                        PastiCuanIcons.AdjustmentsHorizontal,
                        "Pengaturan pool" to "Fee $feePctTeks% dari untung, basis ${data.pengaturan.satuanDasarFee.label}"
                    )
                )
                menus.forEachIndexed { idx, (route, icon, texts) ->
                    if (idx > 0) {
                        HorizontalDivider(modifier = Modifier.padding(vertical = 10.dp), color = c.hairline)
                    }
                    MenuItemRow(
                        icon = icon,
                        judul = texts.first,
                        subjudul = texts.second,
                        onClick = { viewModel.navigateTo(route) }
                    )
                }
            }
        }

        item {
            Text(
                text = "Fee terutang dari investor saat ini ${Formatters.usd(hasil.pengelola.feeTerutangTotal)}. Fee baru jadi milikmu (dalam bentuk unit) saat investor menarik.",
                style = PastiCuanTheme.typography.caption,
                color = c.inkMuted,
                modifier = Modifier.padding(horizontal = 4.dp)
            )
        }
    }
}

// ============================================================================
// 4. LAINNYA SCREEN (Paritas 1:1 src/app/(app)/lainnya/page.tsx — Tanpa Kartu Bersarang)
// ============================================================================
private val DAFTAR_ISTILAH = listOf(
    "Pool" to "Seluruh dana patungan di wallet \"Pasti Cuan\".",
    "Snapshot" to "Rekap resmi saldo pool tiap jam 08.00 WIB yang dicatat otomatis.",
    "Nilai live" to "Nilai pool terbaru, dibaca dari wallet tiap menit. Transfer yang belum dicocokkan dinetralkan dulu. Bersifat perkiraan.",
    "Arus onchain" to "Transfer masuk atau keluar wallet pool. Pengelola mencocokkannya dengan setoran atau penarikan pada waktu transfer.",
    "Unit" to "Satuan kepemilikan pool. Setoran membeli unit, penarikan menjual unit.",
    "NAV" to "Harga 1 unit pada suatu waktu, dalam USD dan SOL.",
    "Modal dasar" to "Total uang yang sudah kamu setor dikurangi bagian modal yang sudah ditarik.",
    "Nilai kotor" to "Unit kamu dikali NAV, sebelum dipotong fee.",
    "Fee terutang" to "10% dari untung kamu, hanya kalau untung. Belum dibayar sampai ada penarikan.",
    "Nilai bersih" to "Nilai kotor dikurangi fee terutang. Ini jumlah maksimal yang bisa kamu tarik.",
    "Porsi" to "Unit milikmu dibagi total unit pool.",
    "Permintaan" to "Pengajuan setor atau tarik dari investor, diproses pengelola."
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LainnyaScreen(
    state: AppUiState,
    viewModel: AppViewModel
) {
    val c = PastiCuanTheme.colors
    val data = state.data ?: return
    val hasil = state.hasil ?: return
    val saya = state.saya ?: return
    val pos = hasil.posisi.firstOrNull { it.id == saya.id } ?: return
    val isPengelola = saya.peran == Peran.PENGELOLA
    val pengelolaNama = data.anggota.firstOrNull { it.peran == Peran.PENGELOLA && it.aktif }?.nama
        ?: data.anggota.firstOrNull { it.peran == Peran.PENGELOLA }?.nama
        ?: "pengelola"

    var bukaTampilan by rememberSaveable { mutableStateOf(false) }
    var konfirmasiKeluar by remember { mutableStateOf(false) }

    val teksTema = when (state.modeTema) {
        ModeTema.SISTEM -> "Mengikuti sistem"
        ModeTema.GELAP -> "Mode gelap"
        ModeTema.TERANG -> "Mode terang"
    }
    val teksKaca = when {
        !state.kaca.liquidGlass -> "Kaca mati"
        state.kaca.modeRingan -> "Mode ringan"
        else -> "Liquid Glass"
    }
    val ringkasanTampilan = "$teksTema · $teksKaca"

    val chevRotation by animateFloatAsState(
        targetValue = if (bukaTampilan) 90f else 0f,
        animationSpec = if (state.kaca.kurangiAnimasi) tween(0) else tween(220),
        label = "accChev"
    )

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(c.canvas),
        contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 8.dp, bottom = 108.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            PageTopHeader(
                judul = "Lainnya",
                state = state,
                showStamp = false,
                onAvatarClick = { if (state.isSimulasiMode) viewModel.bukaGantiAkun(true) }
            )
        }

        // Kartu 1: Profil Anggota
        item {
            PastiCuanCard {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(14.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .size(52.dp)
                            .clip(CircleShape)
                            .background(c.limeAction),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = saya.nama.take(1).uppercase(),
                            style = PastiCuanTheme.typography.pageTitle.copy(fontSize = 20.sp),
                            color = c.onLimeInk
                        )
                    }
                    Column(modifier = Modifier.weight(1f)) {
                        Text(text = saya.nama, style = PastiCuanTheme.typography.pageTitle, color = c.ink)
                        Text(text = saya.email, style = PastiCuanTheme.typography.caption, color = c.inkMuted)
                        Spacer(Modifier.height(6.dp))
                        Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            RoleChip(if (isPengelola) "Pengelola" else "Investor")
                            if (pos.tanggalMulai != null) {
                                Box(
                                    modifier = Modifier
                                        .clip(CircleShape)
                                        .background(c.canvas)
                                        .padding(horizontal = 10.dp, vertical = 3.dp)
                                ) {
                                    Text(
                                        text = "Ikut sejak ${Formatters.tanggal(pos.tanggalMulai)}",
                                        style = PastiCuanTheme.typography.tag.copy(fontSize = 11.5.sp),
                                        color = c.inkMuted
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }

        // Kartu 2: Menu & Accordion Tampilan Inline (Tanpa Kartu Bersarang!)
        item {
            PastiCuanCard(padding = 20.dp) {
                MenuItemRow(
                    icon = PastiCuanIcons.Receipt,
                    judul = "Status permintaan",
                    subjudul = "Setoran dan penarikan kamu",
                    onClick = { viewModel.navigateTo(AppRoute.TRANSAKSI, isTab = true) }
                )
                HorizontalDivider(modifier = Modifier.padding(vertical = 10.dp), color = c.hairline)

                MenuItemRow(
                    icon = PastiCuanIcons.History,
                    judul = "Log perubahan",
                    subjudul = "Semua perubahan angka tercatat di sini",
                    onClick = { viewModel.navigateTo(AppRoute.LOG) }
                )

                if (isPengelola) {
                    HorizontalDivider(modifier = Modifier.padding(vertical = 10.dp), color = c.hairline)
                    MenuItemRow(
                        icon = PastiCuanIcons.LayoutDashboard,
                        judul = "Kelola pool",
                        subjudul = "Arus onchain, permintaan, snapshot, anggota",
                        onClick = { viewModel.navigateTo(AppRoute.KELOLA, isTab = true) }
                    )
                }

                HorizontalDivider(modifier = Modifier.padding(vertical = 10.dp), color = c.hairline)

                // Baris Accordion Tampilan
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { bukaTampilan = !bukaTampilan }
                        .padding(vertical = 4.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    IconDot(PastiCuanIcons.MoonStars)
                    Column(modifier = Modifier.weight(1f)) {
                        Text("Tampilan", style = PastiCuanTheme.typography.title, color = c.ink)
                        Text(ringkasanTampilan, style = PastiCuanTheme.typography.caption, color = c.inkMuted)
                    }
                    Icon(
                        imageVector = PastiCuanIcons.ChevronRight,
                        contentDescription = null,
                        tint = c.inkMuted,
                        modifier = Modifier
                            .size(18.dp)
                            .rotate(chevRotation)
                    )
                }

                // Isi Accordion Tampilan (.lg-pref-rows inline tanpa kotak latar kartu di dalam kartu!)
                AnimatedVisibility(
                    visible = bukaTampilan,
                    enter = if (state.kaca.kurangiAnimasi) fadeIn(tween(0)) else expandVertically(tween(220)) + fadeIn(tween(180)),
                    exit = if (state.kaca.kurangiAnimasi) fadeOut(tween(0)) else shrinkVertically(tween(200)) + fadeOut(tween(150))
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(start = 12.dp, top = 8.dp, bottom = 4.dp)
                    ) {
                        HorizontalDivider(color = c.hairline)
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 10.dp),
                            verticalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                                Text("Tema warna", style = PastiCuanTheme.typography.body.copy(fontWeight = FontWeight.SemiBold), color = c.ink)
                                Text(
                                    text = "Sistem menyesuaikan pengaturan layar perangkat",
                                    style = PastiCuanTheme.typography.caption,
                                    color = c.inkMuted
                                )
                            }
                            SegmentedTrack(
                                options = ModeTema.entries,
                                selected = state.modeTema,
                                labelMapper = { it.label },
                                onSelect = viewModel::setModeTema,
                                fillWidth = true
                            )
                        }

                        HorizontalDivider(color = c.hairline)
                        PrefSwitchRow(
                            judul = "Liquid Glass",
                            subjudul = "Kaca pembias cahaya di navigasi melayang, tombol kembali, dan lembar bawah. Matikan untuk warna solid.",
                            checked = state.kaca.liquidGlass,
                            onCheckedChange = { v -> viewModel.updateKaca { it.copy(liquidGlass = v) } }
                        )

                        if (state.kaca.liquidGlass) {
                            HorizontalDivider(color = c.hairline)
                            PrefSwitchRow(
                                judul = "Mode ringan kaca",
                                subjudul = "Ganti pembiasan lensa ke frosted blur yang lebih hemat baterai.",
                                checked = state.kaca.modeRingan,
                                onCheckedChange = { v -> viewModel.updateKaca { it.copy(modeRingan = v) } },
                                indented = true
                            )
                            HorizontalDivider(color = c.hairline)
                            PrefSwitchRow(
                                judul = "Progressive blur atas",
                                subjudul = "Blur gradasi tanpa kabut warna di tepi atas layar saat halaman digulir.",
                                checked = state.kaca.progressiveBlur,
                                onCheckedChange = { v -> viewModel.updateKaca { it.copy(progressiveBlur = v) } },
                                indented = true
                            )
                            HorizontalDivider(color = c.hairline)
                            PrefSwitchRow(
                                judul = "Pill pegas & geser jari",
                                subjudul = "Kapsul navigasi mengembang saat pindah dan bisa digeser langsung dengan jari.",
                                checked = state.kaca.pillPhysics,
                                onCheckedChange = { v -> viewModel.updateKaca { it.copy(pillPhysics = v) } },
                                indented = true
                            )
                        }

                        HorizontalDivider(color = c.hairline)
                        PrefSwitchRow(
                            judul = "Kurangi animasi",
                            subjudul = "Pindahkan indikator tab dan buka lembar secara langsung tanpa ayunan.",
                            checked = state.kaca.kurangiAnimasi,
                            onCheckedChange = { v -> viewModel.updateKaca { it.copy(kurangiAnimasi = v) } }
                        )
                    }
                }

                HorizontalDivider(modifier = Modifier.padding(vertical = 10.dp), color = c.hairline)

                MenuItemRow(
                    icon = PastiCuanIcons.Refresh,
                    judul = "Cek pembaruan aplikasi",
                    subjudul = "Versi terpasang v${BuildConfig.VERSION_NAME} (internal grup)",
                    onClick = { viewModel.cekPembaruanAplikasi() }
                )

                if (!state.isSimulasiMode) {
                    HorizontalDivider(modifier = Modifier.padding(vertical = 10.dp), color = c.hairline)
                    MenuItemRow(
                        icon = PastiCuanIcons.Refresh,
                        judul = if (state.memuatUlang) "Menyegarkan data…" else "Segarkan data",
                        subjudul = "Muat posisi dan pembacaan wallet terbaru dari server",
                        onClick = { if (!state.memuatUlang) viewModel.segarkanManual() }
                    )

                    HorizontalDivider(modifier = Modifier.padding(vertical = 10.dp), color = c.hairline)
                    MenuItemRow(
                        icon = PastiCuanIcons.Logout,
                        judul = "Keluar",
                        subjudul = "Keluar dari akun ${saya.email.ifBlank { saya.nama }}",
                        onClick = { konfirmasiKeluar = true }
                    )
                }

                if (state.isSimulasiMode) {
                    HorizontalDivider(modifier = Modifier.padding(vertical = 10.dp), color = c.hairline)
                    MenuItemRow(
                        icon = PastiCuanIcons.Users,
                        judul = "Ganti akun simulasi",
                        subjudul = "Sedang melihat sebagai ${saya.nama} (${if (isPengelola) "Pengelola" else "Investor"})",
                        onClick = { viewModel.bukaGantiAkun(true) }
                    )

                    HorizontalDivider(modifier = Modifier.padding(vertical = 10.dp), color = c.hairline)
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { viewModel.setOfflineSimulasi(!state.offline) }
                            .padding(vertical = 4.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        IconDot(PastiCuanIcons.WifiOff)
                        Column(modifier = Modifier.weight(1f)) {
                            Text("Simulasi mode offline", style = PastiCuanTheme.typography.title, color = c.ink)
                            Text("Uji tampilan cache lokal tanpa internet", style = PastiCuanTheme.typography.caption, color = c.inkMuted)
                        }
                        GlassSwitch(
                            checked = state.offline,
                            onCheckedChange = viewModel::setOfflineSimulasi
                        )
                    }
                }
            }
        }

        // Kartu 3: Arti istilah (12 istilah)
        item {
            PastiCuanCard {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Icon(
                        imageVector = PastiCuanIcons.Book,
                        contentDescription = null,
                        tint = c.ink,
                        modifier = Modifier.size(18.dp)
                    )
                    Text("Arti istilah", style = PastiCuanTheme.typography.title, color = c.ink)
                }
                Spacer(Modifier.height(12.dp))
                DAFTAR_ISTILAH.forEachIndexed { idx, (istilah, arti) ->
                    if (idx > 0) {
                        HorizontalDivider(modifier = Modifier.padding(vertical = 10.dp), color = c.hairline)
                    }
                    Text(
                        text = istilah,
                        style = PastiCuanTheme.typography.body.copy(fontWeight = FontWeight.SemiBold),
                        color = c.ink
                    )
                    Spacer(Modifier.height(2.dp))
                    Text(
                        text = arti,
                        style = PastiCuanTheme.typography.caption,
                        color = c.inkMuted
                    )
                }
            }
        }

        item {
            Text(
                text = "App ini hanya buku catatan bersama. Uang tetap dikelola $pengelolaNama di wallet, dan app tidak pernah meminta private key atau seed phrase.",
                style = PastiCuanTheme.typography.caption,
                color = c.inkMuted,
                modifier = Modifier.padding(horizontal = 4.dp)
            )
        }
    }

    if (konfirmasiKeluar) {
        val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
        ModalBottomSheet(
            onDismissRequest = { konfirmasiKeluar = false },
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
                Text("Keluar dari akun?", style = PastiCuanTheme.typography.pageTitle.copy(fontSize = 19.sp), color = c.ink)
                Text(
                    text = "Kamu perlu masuk lagi dengan akun Google untuk melihat data live Pasti Cuan.",
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
                        onClick = { konfirmasiKeluar = false },
                        modifier = Modifier.weight(1f)
                    )
                    PastiCuanButton(
                        text = "Keluar",
                        isDanger = true,
                        onClick = {
                            konfirmasiKeluar = false
                            viewModel.keluar()
                        },
                        modifier = Modifier.weight(1f)
                    )
                }
                Spacer(Modifier.height(16.dp))
            }
        }
    }
}

@Composable
fun MenuItemRow(
    icon: ImageVector,
    judul: String,
    subjudul: String,
    onClick: () -> Unit
) {
    val c = PastiCuanTheme.colors
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        IconDot(icon)
        Column(modifier = Modifier.weight(1f)) {
            Text(judul, style = PastiCuanTheme.typography.title, color = c.ink)
            Text(subjudul, style = PastiCuanTheme.typography.caption, color = c.inkMuted)
        }
        Icon(
            imageVector = PastiCuanIcons.ChevronRight,
            contentDescription = null,
            tint = c.inkMuted,
            modifier = Modifier.size(18.dp)
        )
    }
}

@Composable
private fun PrefSwitchRow(
    judul: String,
    subjudul: String,
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit,
    indented: Boolean = false
) {
    val c = PastiCuanTheme.colors
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onCheckedChange(!checked) }
            .padding(start = if (indented) 14.dp else 0.dp, top = 10.dp, bottom = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(judul, style = PastiCuanTheme.typography.body.copy(fontWeight = FontWeight.SemiBold), color = c.ink)
            Spacer(Modifier.height(2.dp))
            Text(subjudul, style = PastiCuanTheme.typography.caption, color = c.inkMuted)
        }
        GlassSwitch(
            checked = checked,
            onCheckedChange = onCheckedChange
        )
    }
}

// ============================================================================
// 5. LOG SCREEN (Paritas 1:1 src/app/(app)/log/page.tsx — Navbar Lainnya Menyala)
// ============================================================================
private enum class KategoriLog(val label: String, val tabels: Set<String>?) {
    SEMUA("Semua", null),
    SALDO("Saldo", setOf("snapshot", "impor")),
    PERMINTAAN("Permintaan", setOf("permintaan", "arus")),
    ANGGOTA("Anggota", setOf("anggota", "pengaturan"))
}

@Composable
fun LogScreen(
    state: AppUiState,
    viewModel: AppViewModel
) {
    val c = PastiCuanTheme.colors
    val data = state.data ?: return
    val namaMap = remember(data.anggota) { data.anggota.associate { it.id to it.nama } }
    var kategori by rememberSaveable { mutableStateOf(KategoriLog.SEMUA) }

    val daftar = remember(data.log, kategori) {
        val tabels = kategori.tabels
        data.log
            .filter { l -> tabels == null || l.tabel in tabels }
            .sortedByDescending { it.pada }
            .take(50)
    }

    FloatingSubScreenLayout(
        judul = "Log perubahan",
        onBack = { viewModel.navigateBack(AppRoute.LAINNYA) }
    ) {
            // Banner Info Gembok Imutabilitas (.banner.info di log/page.tsx)
            item {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(16.dp))
                        .background(c.card)
                        .then(if (c.cardBorder != Color.Transparent) Modifier.border(1.dp, c.cardBorder, RoundedCornerShape(16.dp)) else Modifier)
                        .padding(horizontal = 14.dp, vertical = 12.dp),
                    verticalAlignment = Alignment.Top,
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Icon(
                        imageVector = PastiCuanIcons.Lock,
                        contentDescription = null,
                        tint = c.ink,
                        modifier = Modifier.padding(top = 1.dp).size(18.dp)
                    )
                    Text(
                        text = "Log ini tidak bisa dihapus atau diubah siapa pun, termasuk pengelola.",
                        style = PastiCuanTheme.typography.label,
                        color = c.ink
                    )
                }
            }

            // Segmented Control 4 Kategori
            item {
                Row(modifier = Modifier.horizontalScroll(rememberScrollState())) {
                    SegmentedTrack(
                        options = KategoriLog.entries,
                        selected = kategori,
                        labelMapper = { it.label },
                        onSelect = { kategori = it }
                    )
                }
            }

            // Satu Kartu Daftar Baris Log (dengan nilaiLama -> nilaiBaru)
            item {
                PastiCuanCard {
                    if (daftar.isEmpty()) {
                        Text(
                            text = "Belum ada perubahan di kategori ini.",
                            style = PastiCuanTheme.typography.caption,
                            color = c.inkMuted
                        )
                    } else {
                        daftar.forEachIndexed { idx, l ->
                            if (idx > 0) {
                                HorizontalDivider(modifier = Modifier.padding(vertical = 12.dp), color = c.hairline)
                            }
                            Column(verticalArrangement = Arrangement.spacedBy(3.dp)) {
                                val pelaku = namaMap[l.oleh] ?: l.oleh
                                Text(
                                    text = buildAnnotatedString {
                                        withStyle(SpanStyle(fontWeight = FontWeight.Bold)) {
                                            append(pelaku)
                                        }
                                        append(" · ${l.ringkasan}")
                                    },
                                    style = PastiCuanTheme.typography.body,
                                    color = c.ink
                                )
                                if (l.nilaiLama != null || l.nilaiBaru != null) {
                                    Text(
                                        text = "${l.nilaiLama ?: "—"} → ${l.nilaiBaru ?: "dihapus"}",
                                        style = PastiCuanTheme.typography.caption.copy(fontFeatureSettings = "tnum"),
                                        color = c.inkMuted
                                    )
                                }
                                Text(
                                    text = Formatters.waktu(l.pada),
                                    style = PastiCuanTheme.typography.caption.copy(fontFeatureSettings = "tnum"),
                                    color = c.inkMuted
                                )
                            }
                        }
                    }
                }
            }
    }
}
