package id.pasticuan.wallet.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import id.pasticuan.wallet.domain.engine.PoolEngine
import id.pasticuan.wallet.domain.model.Jenis
import id.pasticuan.wallet.domain.model.ModeSatuan
import id.pasticuan.wallet.domain.model.Peran
import id.pasticuan.wallet.domain.model.Rentang
import id.pasticuan.wallet.domain.model.Satuan
import id.pasticuan.wallet.domain.model.StatusPermintaan
import id.pasticuan.wallet.domain.model.SumberSnapshot
import id.pasticuan.wallet.domain.util.Formatters
import id.pasticuan.wallet.ui.components.KartuGrafik
import id.pasticuan.wallet.ui.components.PageTopHeader
import id.pasticuan.wallet.ui.components.PastiCuanButton
import id.pasticuan.wallet.ui.components.PastiCuanCard
import id.pasticuan.wallet.ui.components.PastiCuanIcons
import id.pasticuan.wallet.ui.components.StatusBanners
import id.pasticuan.wallet.ui.components.StatusPermintaanChip
import id.pasticuan.wallet.ui.components.TagRoiPill
import id.pasticuan.wallet.ui.components.kartuWaktuLiveText
import id.pasticuan.wallet.ui.state.AppRoute
import id.pasticuan.wallet.ui.state.AppUiState
import id.pasticuan.wallet.ui.state.AppViewModel
import id.pasticuan.wallet.ui.theme.PastiCuanTheme

@Composable
fun BerandaScreen(
    state: AppUiState,
    viewModel: AppViewModel
) {
    val c = PastiCuanTheme.colors
    val data = state.data ?: return
    val hasil = state.hasil ?: return
    val saya = state.saya ?: return

    var rentang by rememberSaveable(saya.id) { mutableStateOf(Rentang.JAM_24) }
    val opsiRentang = remember(data.permintaan, saya.id) {
        PoolEngine.opsiRentang(data.permintaan, saya.id)
    }
    LaunchedEffect(opsiRentang) {
        if (rentang !in opsiRentang) rentang = Rentang.JAM_24
    }

    val pos = hasil.posisi.firstOrNull { it.id == saya.id } ?: return
    val isPengelola = saya.peran == Peran.PENGELOLA
    val belumSetor = !pos.punyaSetoran && pos.unit == 0.0
    val riwayat = hasil.riwayat[saya.id] ?: emptyList()
    val seri = remember(hasil, rentang, saya.id, state.sekarangMs) {
        viewModel.seri(rentang, saya.id)
    }
    val kosongMsg = PoolEngine.grafikKosong(seri, rentang, riwayat.size)
    val sayaMenunggu = state.menunggu.filter { it.anggotaId == saya.id }
    val lainSaya = hasil.posisi
        .filter { it.unit > 1e-9 || it.id == saya.id }
        .sortedByDescending { it.porsi }

    val waktuKartu = kartuWaktuLiveText(hasil, data.pengaturan.jamSnapshot)

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(c.canvas),
        contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 8.dp, bottom = 108.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            PageTopHeader(
                judul = "Halo, ${saya.nama}",
                state = state,
                showStamp = true,
                onAvatarClick = { viewModel.navigateTo(AppRoute.LAINNYA, isTab = true) }
            )
        }

        item {
            StatusBanners(state = state)
        }

        if (isPengelola) {
            item {
                KartuTugasPengelola(
                    state = state,
                    hasil = hasil,
                    onNavigate = { route, isTab -> viewModel.navigateTo(route, isTab = isTab) }
                )
            }
        }

        item {
            if (belumSetor) {
                PastiCuanCard {
                    Text(
                        text = "Nilai kamu",
                        style = PastiCuanTheme.typography.label,
                        color = c.inkMuted
                    )
                    Spacer(Modifier.height(4.dp))
                    Text(
                        text = Formatters.uang(0.0, state.modeSatuan.toSatuan()),
                        style = PastiCuanTheme.typography.display,
                        color = c.ink
                    )
                    Spacer(Modifier.height(8.dp))
                    Text(
                        text = "Kamu belum punya setoran yang terkonfirmasi. Ajukan setoran pertama kamu.",
                        style = PastiCuanTheme.typography.label,
                        color = c.inkMuted
                    )
                    Spacer(Modifier.height(16.dp))
                    PastiCuanButton(
                        text = "Setor",
                        icon = PastiCuanIcons.Plus,
                        enabled = !state.offline,
                        onClick = { viewModel.navigateTo(AppRoute.SETOR) },
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            } else {
                KartuGrafik(
                    label = "Nilai kamu",
                    seri = seri,
                    liveUsd = pos.netUsd,
                    liveSol = pos.netSol,
                    waktuLive = waktuKartu,
                    mode = state.modeSatuan,
                    onModeChange = viewModel::setModeSatuan,
                    rentang = rentang,
                    opsiRentang = opsiRentang,
                    onRentangChange = { rentang = it },
                    kosongMessage = kosongMsg
                ) {
                    Spacer(Modifier.height(16.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        PastiCuanButton(
                            text = "Setor",
                            icon = PastiCuanIcons.Plus,
                            isPrimary = true,
                            enabled = !state.offline,
                            onClick = { viewModel.navigateTo(AppRoute.SETOR) },
                            modifier = Modifier.weight(1f)
                        )
                        PastiCuanButton(
                            text = "Tarik",
                            icon = PastiCuanIcons.ArrowUpRight,
                            isPrimary = false,
                            enabled = !state.offline,
                            onClick = { viewModel.navigateTo(AppRoute.TARIK) },
                            modifier = Modifier.weight(1f)
                        )
                    }

                    if (pos.unit <= 1e-9) {
                        Spacer(Modifier.height(12.dp))
                        Text(
                            text = "Seluruh dana kamu sudah ditarik. Buka rentang Semua untuk melihat total riwayat untung/rugi, atau ajukan Setor untuk masuk lagi.",
                            style = PastiCuanTheme.typography.caption,
                            color = c.inkMuted
                        )
                    }

                    if (sayaMenunggu.isNotEmpty()) {
                        Spacer(Modifier.height(14.dp))
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(10.dp))
                                .clickable { viewModel.navigateTo(AppRoute.TRANSAKSI, isTab = true) }
                                .padding(vertical = 4.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            StatusPermintaanChip(StatusPermintaan.MENUNGGU)
                            Text(
                                text = sayaMenunggu.joinToString(", ") {
                                    "${if (it.jenis == Jenis.SETOR) "Setoran" else "Penarikan"} ${Formatters.usd(it.jumlahUsd)}"
                                } + " sedang diproses pengelola.",
                                style = PastiCuanTheme.typography.caption,
                                color = c.inkMuted,
                                modifier = Modifier.weight(1f)
                            )
                            Icon(
                                imageVector = PastiCuanIcons.ChevronRight,
                                contentDescription = null,
                                tint = c.inkMuted,
                                modifier = Modifier.size(16.dp)
                            )
                        }
                    }
                }
            }
        }

        if (!belumSetor) {
            // Kartu 2: Dari mana nilai kamu
            item {
                PastiCuanCard {
                    Text(
                        text = "Dari mana nilai kamu",
                        style = PastiCuanTheme.typography.title,
                        color = c.ink
                    )
                    Spacer(Modifier.height(12.dp))

                    // Mengikuti kontrol Satuan (paritas page.tsx): SOL menampilkan semua baris dalam SOL,
                    // Bandingkan menambahkan angka SOL kecil di bawah tiap angka USD.
                    val pakaiSol = state.modeSatuan == ModeSatuan.SOL
                    val bandingkan = state.modeSatuan == ModeSatuan.BANDINGKAN
                    val feeSol = if (hasil.pool.harga > 0.0) pos.feeUsd / hasil.pool.harga else 0.0
                    val roi = if (pakaiSol) {
                        if (pos.modalSol > 1e-12) pos.profitSol / pos.modalSol * 100.0 else 0.0
                    } else pos.roi
                    fun minus(x: Double, d: Int, teks: String) =
                        (if (Math.round(x * Math.pow(10.0, d.toDouble())) > 0) Formatters.MINUS else "") + teks

                    NilaiSatuanRow(
                        label = { Text("Modal dasar", style = PastiCuanTheme.typography.body, color = c.ink) },
                        teksUsd = Formatters.usd(pos.modalUsd),
                        teksSol = Formatters.sol(pos.modalSol),
                        pakaiSol = pakaiSol,
                        tampilKedua = bandingkan
                    )
                    Spacer(Modifier.height(10.dp))

                    val profitNeg = if (pakaiSol) Formatters.isNegative(pos.profitSol, 4) else Formatters.isNegative(pos.profitUsd, 2)
                    NilaiSatuanRow(
                        label = {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                Text(
                                    text = "Untung/rugi",
                                    style = PastiCuanTheme.typography.body,
                                    color = c.ink
                                )
                                TagRoiPill(
                                    text = "ROI ${Formatters.persenBertanda(roi)}",
                                    isNegative = Formatters.isNegative(roi, 2)
                                )
                            }
                        },
                        teksUsd = Formatters.bertanda(pos.profitUsd, Satuan.USD),
                        teksSol = Formatters.bertanda(pos.profitSol, Satuan.SOL),
                        pakaiSol = pakaiSol,
                        tampilKedua = bandingkan,
                        warna = if (profitNeg) c.loss else c.gain
                    )
                    Spacer(Modifier.height(10.dp))

                    val feePctLabel = Formatters.persen(data.pengaturan.feePersen * 100.0).replace(",00", "")
                    NilaiSatuanRow(
                        label = {
                            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                Text("Fee terutang", style = PastiCuanTheme.typography.body, color = c.ink)
                                Text(feePctLabel, style = PastiCuanTheme.typography.body, color = c.inkMuted)
                            }
                        },
                        teksUsd = minus(pos.feeUsd, 2, Formatters.usd(pos.feeUsd)),
                        teksSol = minus(feeSol, 4, Formatters.sol(feeSol)),
                        pakaiSol = pakaiSol,
                        tampilKedua = bandingkan
                    )

                    Spacer(Modifier.height(12.dp))
                    HorizontalDivider(thickness = 2.dp, color = c.ink)
                    Spacer(Modifier.height(14.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.Top
                    ) {
                        Text(
                            text = "Nilai bersih",
                            style = PastiCuanTheme.typography.title,
                            color = c.ink
                        )
                        Column(horizontalAlignment = Alignment.End) {
                            Text(
                                text = if (pakaiSol) Formatters.sol(pos.netSol) else Formatters.usd(pos.netUsd),
                                style = PastiCuanTheme.typography.figureTotal,
                                color = c.ink
                            )
                            Text(
                                text = if (pakaiSol) Formatters.usd(pos.netUsd) else Formatters.sol(pos.netSol),
                                style = PastiCuanTheme.typography.caption.copy(fontFeatureSettings = "tnum"),
                                color = c.inkMuted
                            )
                        }
                    }

                    Spacer(Modifier.height(10.dp))
                    Text(
                        text = "Nilai bersih adalah jumlah maksimal yang bisa kamu tarik hari ini, sudah dipotong fee.",
                        style = PastiCuanTheme.typography.caption,
                        color = c.inkMuted
                    )
                }
            }

            // Kartu 3: Porsi kamu di pool
            item {
                PastiCuanCard {
                    Text(
                        text = "Porsi kamu di pool",
                        style = PastiCuanTheme.typography.title,
                        color = c.ink
                    )
                    Spacer(Modifier.height(8.dp))
                    Text(
                        text = Formatters.persen(pos.porsi),
                        style = PastiCuanTheme.typography.figureLg,
                        color = c.ink
                    )
                    Spacer(Modifier.height(14.dp))

                    ShareBar(
                        items = lainSaya.map { it.id to it.porsi },
                        myId = saya.id
                    )

                    Spacer(Modifier.height(14.dp))
                    ShareLegendGrid(
                        items = lainSaya,
                        myId = saya.id
                    )

                    Spacer(Modifier.height(16.dp))
                    HorizontalDivider(thickness = 1.dp, color = c.hairline)
                    Spacer(Modifier.height(14.dp))
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Icon(
                            imageVector = PastiCuanIcons.Calendar,
                            contentDescription = null,
                            tint = c.inkMuted,
                            modifier = Modifier.size(17.dp)
                        )
                        Text(
                            text = "Ikut ${pos.lamaIkutHari} hari" +
                                (pos.tanggalMulai?.let { ", sejak ${Formatters.tanggal(it)}" } ?: ""),
                            style = PastiCuanTheme.typography.label,
                            color = c.inkMuted
                        )
                    }
                }
            }

            // Kartu 4: Dalam SOL
            item {
                val solNeg = Formatters.isNegative(pos.profitSol, 4)
                PastiCuanCard {
                    Text(
                        text = "Dalam SOL",
                        style = PastiCuanTheme.typography.title,
                        color = c.ink
                    )
                    Spacer(Modifier.height(8.dp))
                    Text(
                        text = Formatters.bertanda(pos.profitSol, Satuan.SOL),
                        style = PastiCuanTheme.typography.figureMd,
                        color = if (solNeg) c.loss else c.gain
                    )
                    Spacer(Modifier.height(6.dp))
                    Text(
                        text = if (pos.profitUsd < 0 && pos.profitSol > 0) {
                            "Nilai USD turun karena harga SOL turun, tapi jumlah SOL kamu bertambah."
                        } else {
                            "Untung/rugi SOL = jumlah SOL kamu sekarang dikurangi SOL setara modal saat disetor."
                        },
                        style = PastiCuanTheme.typography.caption,
                        color = c.inkMuted
                    )
                }
            }
        }
    }
}

@Composable
private fun KartuTugasPengelola(
    state: AppUiState,
    hasil: PoolEngine.HasilPool,
    onNavigate: (AppRoute, Boolean) -> Unit
) {
    val c = PastiCuanTheme.colors
    val data = state.data ?: return
    val snapHariIni = data.snapshots.firstOrNull { it.tanggal == state.hariIni }

    PastiCuanCard {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "Tugas pengelola hari ini",
                style = PastiCuanTheme.typography.title,
                color = c.ink
            )
            Row(
                modifier = Modifier
                    .clip(RoundedCornerShape(8.dp))
                    .clickable { onNavigate(AppRoute.KELOLA, true) }
                    .padding(horizontal = 4.dp, vertical = 2.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(2.dp)
            ) {
                Text(
                    text = "Kelola",
                    style = PastiCuanTheme.typography.label.copy(fontWeight = FontWeight.SemiBold),
                    color = c.forestInk
                )
                Icon(
                    imageVector = PastiCuanIcons.ChevronRight,
                    contentDescription = null,
                    tint = c.forestInk,
                    modifier = Modifier.size(16.dp)
                )
            }
        }
        Spacer(Modifier.height(10.dp))
        KvRow(
            label = "Permintaan menunggu",
            value = if (state.menunggu.isNotEmpty()) "${state.menunggu.size} permintaan" else "Tidak ada",
            valueColor = if (state.menunggu.isNotEmpty()) c.forestInk else c.ink,
            onClick = { onNavigate(AppRoute.KELOLA_PERMINTAAN, false) }
        )
        HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp), color = c.hairline)
        KvRow(
            label = "Transfer belum dicocokkan",
            value = if (state.arusBelum.isNotEmpty()) "${state.arusBelum.size} transfer" else "Tidak ada",
            valueColor = if (state.arusBelum.isNotEmpty()) c.forestInk else c.ink,
            onClick = { onNavigate(AppRoute.KELOLA_ARUS, false) }
        )
        HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp), color = c.hairline)
        KvRow(
            label = "Snapshot ${Formatters.tanggal(state.hariIni)}",
            value = when {
                snapHariIni == null -> "Belum ada"
                snapHariIni.sumber == SumberSnapshot.OTOMATIS -> "Dibuat otomatis"
                else -> "Sudah dicatat"
            },
            valueColor = if (snapHariIni != null) c.gain else c.forestInk,
            onClick = if (snapHariIni == null) ({ onNavigate(AppRoute.KELOLA_SALDO, false) }) else null
        )
        HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp), color = c.hairline)
        KvRow(
            label = "Fee terutang dari investor",
            value = Formatters.usd(hasil.pengelola.feeTerutangTotal)
        )
    }
}

/** Baris rincian nilai: angka utama mengikuti satuan aktif, angka satuan lain kecil di bawahnya bila [tampilKedua]. */
@Composable
private fun NilaiSatuanRow(
    label: @Composable () -> Unit,
    teksUsd: String,
    teksSol: String,
    pakaiSol: Boolean,
    tampilKedua: Boolean,
    warna: Color? = null
) {
    val c = PastiCuanTheme.colors
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = if (tampilKedua) Alignment.Top else Alignment.CenterVertically
    ) {
        Box(modifier = Modifier.weight(1f)) { label() }
        Spacer(Modifier.width(8.dp))
        Column(horizontalAlignment = Alignment.End) {
            Text(
                text = if (pakaiSol) teksSol else teksUsd,
                style = PastiCuanTheme.typography.bodyTabular,
                color = warna ?: c.ink,
                textAlign = TextAlign.End
            )
            if (tampilKedua) {
                Text(
                    text = if (pakaiSol) teksUsd else teksSol,
                    style = PastiCuanTheme.typography.caption.copy(fontFeatureSettings = "tnum"),
                    color = c.inkMuted,
                    textAlign = TextAlign.End
                )
            }
        }
    }
}

@Composable
fun KvRow(
    label: String,
    value: String,
    valueColor: Color? = null,
    onClick: (() -> Unit)? = null
) {
    val c = PastiCuanTheme.colors
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .then(if (onClick != null) Modifier.clickable(onClick = onClick) else Modifier),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = label,
            style = PastiCuanTheme.typography.body,
            color = c.ink,
            modifier = Modifier.weight(1f)
        )
        Spacer(Modifier.width(8.dp))
        Text(
            text = value,
            style = PastiCuanTheme.typography.bodyTabular,
            color = valueColor ?: c.ink,
            textAlign = TextAlign.End
        )
    }
}

/** Bar porsi setinggi 12dp berbentuk pil penuh (.share-bar di DESIGN.md & globals.css). */
@Composable
fun ShareBar(
    items: List<Pair<String, Double>>,
    myId: String
) {
    val c = PastiCuanTheme.colors
    val active = items.filter { it.second > 0.0001 }
    if (active.isEmpty()) return

    var k = 0
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .height(12.dp)
            .clip(CircleShape),
        horizontalArrangement = Arrangement.spacedBy(2.dp)
    ) {
        active.forEach { (id, porsi) ->
            val color = if (id == myId) c.forestInk else c.sharePalette[k++ % c.sharePalette.size]
            Box(
                modifier = Modifier
                    .weight(porsi.toFloat().coerceAtLeast(0.01f))
                    .height(12.dp)
                    .background(color)
            )
        }
    }
}

@Composable
private fun ShareLegendGrid(
    items: List<PoolEngine.Posisi>,
    myId: String
) {
    val c = PastiCuanTheme.colors
    var paletteIdx = 0
    val colored = items.map { p ->
        val col = if (p.id == myId) c.forestInk else c.sharePalette[paletteIdx++ % c.sharePalette.size]
        p to col
    }

    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        colored.chunked(2).forEach { pair ->
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(20.dp)
            ) {
                pair.forEach { (p, col) ->
                    val isMe = p.id == myId
                    Row(
                        modifier = Modifier.weight(1f),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .size(10.dp)
                                .clip(RoundedCornerShape(3.dp))
                                .background(col)
                        )
                        Text(
                            text = if (isMe) "Kamu" else p.nama,
                            style = PastiCuanTheme.typography.caption.copy(
                                fontWeight = if (isMe) FontWeight.Bold else FontWeight.Normal,
                                fontSize = 12.5.sp
                            ),
                            color = c.ink,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                            modifier = Modifier.weight(1f)
                        )
                        Text(
                            text = Formatters.persen(p.porsi),
                            style = PastiCuanTheme.typography.caption.copy(
                                fontWeight = if (isMe) FontWeight.Bold else FontWeight.Medium,
                                fontFeatureSettings = "tnum",
                                fontSize = 12.5.sp
                            ),
                            color = c.ink
                        )
                    }
                }
                if (pair.size == 1) {
                    Spacer(Modifier.weight(1f))
                }
            }
        }
    }
}
