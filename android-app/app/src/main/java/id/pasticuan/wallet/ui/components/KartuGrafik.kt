package id.pasticuan.wallet.ui.components

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import id.pasticuan.wallet.domain.engine.PoolEngine
import id.pasticuan.wallet.domain.model.ModeSatuan
import id.pasticuan.wallet.domain.model.Rentang
import id.pasticuan.wallet.domain.model.Satuan
import id.pasticuan.wallet.domain.util.Formatters
import id.pasticuan.wallet.ui.components.backdrop.backdrops.layerBackdrop
import id.pasticuan.wallet.ui.components.backdrop.backdrops.rememberLayerBackdrop
import id.pasticuan.wallet.ui.theme.PastiCuanTheme

/**
 * Kontrol Satuan 3 Ikon Vektor Asli (paritas 1:1 SatuanIkon di KartuGrafik.tsx + .seg.ikon di globals.css):
 * Tombol minimal 44x44dp, memakai ikon vektor CurrencyDollar & CurrencySolana asli (bukan teks "$◎"),
 * serta warna terpilih segSelectedBg (#163300 di Light, #263D1A di Dark).
 */
@Composable
fun SatuanIkonControl(
    mode: ModeSatuan,
    onModeChange: (ModeSatuan) -> Unit
) {
    val c = PastiCuanTheme.colors
    val kaca = PastiCuanTheme.kaca
    val haptic = LocalHapticFeedback.current
    val density = LocalDensity.current
    val items = listOf(
        ModeSatuan.USD to "Tampilkan dalam USD",
        ModeSatuan.SOL to "Tampilkan dalam SOL",
        ModeSatuan.BANDINGKAN to "Bandingkan USD dan SOL"
    )
    val selectedIdx = items.indexOfFirst { it.first == mode }.coerceAtLeast(0)
    val stepPx = with(density) { (44.dp + 2.dp).toPx() }
    val tombolPx = with(density) { 44.dp.toPx() }
    val motion = rememberGlassPillMotion(initialIndex = selectedIdx, itemCount = items.size)
    val isi = rememberLayerBackdrop()
    LaunchedEffect(selectedIdx, kaca.pillPhysics, kaca.kurangiAnimasi) {
        if (!motion.isDragging) {
            motion.animateTo(selectedIdx, enablePhysics = kaca.pillPhysics, reduceMotion = kaca.kurangiAnimasi)
        }
    }
    val bidik = motion.indeksBidikan()
    val trackBg = if (kaca.liquidGlass && !c.isDark) c.segTrackBg.copy(alpha = 0.85f) else c.segTrackBg

    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(24.dp))
            .background(trackBg)
            .padding(3.dp)
            .geserKapsulSegmen(
                motion = motion,
                centers = { items.indices.map { it * stepPx + tombolPx / 2f } },
                aktif = kaca.liquidGlass && kaca.pillPhysics,
                reduceMotion = kaca.kurangiAnimasi,
                onTick = { haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove) },
                onPilih = { i -> if (i != selectedIdx) onModeChange(items[i].first) }
            )
    ) {
        Box(modifier = if (kaca.liquidGlass) Modifier.layerBackdrop(isi) else Modifier) {
            Box(
                modifier = Modifier
                    .graphicsLayer { translationX = motion.position * stepPx }
                    .size(width = 44.dp, height = 44.dp)
                    .shadow(
                        elevation = if (c.isDark) 2.dp else 1.5.dp,
                        shape = RoundedCornerShape(24.dp),
                        ambientColor = Color.Black.copy(alpha = 0.14f),
                        spotColor = Color.Black.copy(alpha = 0.14f)
                    )
                    .clip(RoundedCornerShape(24.dp))
                    .background(c.segSelectedBg)
                    .then(
                        if (kaca.liquidGlass) {
                            Modifier.border(
                                0.5.dp,
                                if (c.isDark) Color.White.copy(alpha = 0.12f) else Color.White.copy(alpha = 0.75f),
                                RoundedCornerShape(24.dp)
                            )
                        } else Modifier
                    )
            )

            Row(
                horizontalArrangement = Arrangement.spacedBy(2.dp)
            ) {
                items.forEachIndexed { idx, (itemMode, a11yLabel) ->
                    val selected = mode == itemMode
                    val tampakAktif = bidik?.let { it == idx } ?: selected
                    val fg by animateColorAsState(
                        targetValue = if (tampakAktif) c.segSelectedFg else c.inkMuted,
                        animationSpec = tween(150),
                        label = "satuanFg"
                    )
                    Box(
                        modifier = Modifier
                            .size(width = 44.dp, height = 44.dp)
                            .clip(RoundedCornerShape(24.dp))
                            .semantics { contentDescription = a11yLabel }
                            .clickable(
                                interactionSource = remember { MutableInteractionSource() },
                                indication = null,
                                role = Role.RadioButton
                            ) {
                                if (!selected) {
                                    haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                                    onModeChange(itemMode)
                                }
                            },
                        contentAlignment = Alignment.Center
                    ) {
                        when (itemMode) {
                            ModeSatuan.USD -> Icon(
                                imageVector = PastiCuanIcons.CurrencyDollar,
                                contentDescription = null,
                                tint = fg,
                                modifier = Modifier.size(18.dp)
                            )
                            ModeSatuan.SOL -> Icon(
                                imageVector = PastiCuanIcons.CurrencySolana,
                                contentDescription = null,
                                tint = fg,
                                modifier = Modifier.size(18.dp)
                            )
                            ModeSatuan.BANDINGKAN -> Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.Center
                            ) {
                                Icon(
                                    imageVector = PastiCuanIcons.CurrencyDollar,
                                    contentDescription = null,
                                    tint = fg,
                                    modifier = Modifier.size(14.5.dp)
                                )
                                Icon(
                                    imageVector = PastiCuanIcons.CurrencySolana,
                                    contentDescription = null,
                                    tint = fg,
                                    modifier = Modifier.size(14.5.dp)
                                )
                            }
                        }
                    }
                }
            }
        }

        KacaSegmenTerangkat(
            motion = motion,
            isi = isi,
            leftPx = motion.position * stepPx,
            widthPx = tombolPx,
            heightPx = tombolPx
        )
    }
}

/** Format baris waktu di dalam KartuGrafik (paritas useWaktuLive() di KartuGrafik.tsx baris 30-34). */
fun kartuWaktuLiveText(hasil: PoolEngine.HasilPool, jamSnapshot: String = "08:00"): String {
    val live = hasil.live
    if (live != null) {
        return "Nilai live ${Formatters.jam(live.dibacaPada)} WIB"
    }
    return hasil.tanggalData?.let {
        "Data per ${Formatters.tanggal(it)}, ${jamSnapshot.replace(":", ".")} WIB"
    } ?: ""
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun KartuGrafik(
    label: String,
    seri: PoolEngine.Seri,
    liveUsd: Double,
    liveSol: Double,
    waktuLive: String,
    mode: ModeSatuan,
    onModeChange: (ModeSatuan) -> Unit,
    rentang: Rentang,
    opsiRentang: List<Rentang>,
    onRentangChange: (Rentang) -> Unit,
    kosongMessage: String?,
    gagal: Boolean = false,
    onCobaLagi: (() -> Unit)? = null,
    infoButton: (@Composable () -> Unit)? = null,
    catatanInfo: (@Composable () -> Unit)? = null,
    keteranganTambahan: (@Composable () -> Unit)? = null,
    bottomContent: (@Composable ColumnScope.() -> Unit)? = null
) {
    val c = PastiCuanTheme.colors
    var aktifIdx by remember(rentang, mode, seri.titik.size) { mutableStateOf<Int?>(null) }

    val mulai = PoolEngine.awalTampil(seri, rentang)
    val tampil = remember(seri, mulai) { seri.titik.drop(mulai) }
    val kum = remember(seri) { PoolEngine.kumulatif(seri) }
    val kumTampil = remember(kum, mulai) { kum.drop(mulai) }
    val akhir = kum.lastOrNull() ?: PoolEngine.Kumulatif(0.0, 0.0, 0.0, 0.0)

    val bandingkan = mode == ModeSatuan.BANDINGKAN
    val satuanAktif = mode.toSatuan()

    val validIdx = aktifIdx?.takeIf { it in tampil.indices }
    val p = validIdx?.let { tampil[it] }
    val k = validIdx?.let { kumTampil[it] } ?: akhir

    val nilaiUsd = p?.usd ?: liveUsd
    val nilaiSol = p?.sol ?: liveSol
    val ru = if (satuanAktif == Satuan.USD) k.ruUsd else k.ruSol
    val pr = if (satuanAktif == Satuan.USD) k.persenUsd else k.persenSol
    val chips = if (p != null) PoolEngine.chipTransaksi(p, seri.jenis) else emptyList()

    val titikUi = remember(tampil, kumTampil, bandingkan, satuanAktif) {
        tampil.mapIndexed { j, t ->
            TitikGrafikUi(
                x = t.ms,
                nilai = if (bandingkan) kumTampil[j].persenUsd else if (satuanAktif == Satuan.USD) t.usd else t.sol,
                nilai2 = if (bandingkan) kumTampil[j].persenSol else null,
                ditandai = t.transaksi.isNotEmpty()
            )
        }
    }

    PastiCuanCard {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = label,
                style = PastiCuanTheme.typography.label,
                color = c.inkMuted
            )
            SatuanIkonControl(mode = mode, onModeChange = onModeChange)
        }

        Spacer(Modifier.height(4.dp))

        if (bandingkan) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(20.dp),
                verticalAlignment = Alignment.Top
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = Formatters.usd(nilaiUsd),
                        style = PastiCuanTheme.typography.figureDuo,
                        color = c.ink
                    )
                    Text(
                        text = Formatters.persenBertanda(k.persenUsd),
                        style = PastiCuanTheme.typography.figureSm,
                        color = if (Formatters.isNegative(k.persenUsd)) c.loss else c.gain
                    )
                }
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = Formatters.sol(nilaiSol),
                        style = PastiCuanTheme.typography.figureDuo,
                        color = c.ink
                    )
                    Text(
                        text = Formatters.persenBertanda(k.persenSol),
                        style = PastiCuanTheme.typography.figureSm,
                        color = if (Formatters.isNegative(k.persenSol)) c.loss else c.gain
                    )
                }
                infoButton?.invoke()
            }
        } else {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                Text(
                    text = Formatters.uang(if (satuanAktif == Satuan.USD) nilaiUsd else nilaiSol, satuanAktif),
                    style = PastiCuanTheme.typography.display,
                    color = c.ink,
                    modifier = Modifier.weight(1f, fill = false)
                )
                infoButton?.invoke()
            }
        }

        catatanInfo?.invoke()

        Spacer(Modifier.height(6.dp))

        // Baris untung/rugi + persen (pemisahan warna bila arah berbeda, sesuai KartuGrafik.tsx)
        val dec = if (satuanAktif == Satuan.USD) 2 else 4
        val ruNeg = Formatters.isNegative(ru, dec)
        val prNeg = Formatters.isNegative(pr, 2)
        val pnlText = buildAnnotatedString {
            if (bandingkan) {
                withStyle(SpanStyle(color = if (Formatters.isNegative(k.ruUsd, 2)) c.loss else c.gain)) {
                    append(Formatters.bertanda(k.ruUsd, Satuan.USD))
                }
                withStyle(SpanStyle(color = c.inkMuted)) { append(" · ") }
                withStyle(SpanStyle(color = if (Formatters.isNegative(k.ruSol, 4)) c.loss else c.gain)) {
                    append(Formatters.bertanda(k.ruSol, Satuan.SOL))
                }
            } else if (ruNeg == prNeg) {
                withStyle(SpanStyle(color = if (ruNeg) c.loss else c.gain)) {
                    append("${Formatters.bertanda(ru, satuanAktif)} (${Formatters.persenBertanda(pr)})")
                }
            } else {
                withStyle(SpanStyle(color = if (ruNeg) c.loss else c.gain)) {
                    append(Formatters.bertanda(ru, satuanAktif))
                }
                withStyle(SpanStyle(color = c.inkMuted)) { append(" (") }
                withStyle(SpanStyle(color = if (prNeg) c.loss else c.gain)) {
                    append(Formatters.persenBertanda(pr))
                    if (seri.jenis == "pool") append(" nilai unit")
                }
                withStyle(SpanStyle(color = c.inkMuted)) { append(")") }
            }
            withStyle(SpanStyle(color = c.inkMuted)) {
                append(" · ${rentang.label}")
            }
        }
        Text(text = pnlText, style = PastiCuanTheme.typography.figureSm)

        Spacer(Modifier.height(2.dp))
        val teksWaktu = if (p != null) {
            if (p.harian) Formatters.tanggal(p.waktu) else Formatters.waktu(p.waktu)
        } else waktuLive
        Text(
            text = teksWaktu,
            style = PastiCuanTheme.typography.caption,
            color = c.inkMuted
        )

        if (chips.isNotEmpty()) {
            Spacer(Modifier.height(8.dp))
            FlowRow(
                horizontalArrangement = Arrangement.spacedBy(6.dp),
                verticalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                chips.forEach { ch ->
                    Box(
                        modifier = Modifier
                            .clip(CircleShape)
                            .background(c.forestWash)
                            .padding(horizontal = 10.dp, vertical = 3.dp)
                    ) {
                        Text(
                            text = ch,
                            style = PastiCuanTheme.typography.tag,
                            color = c.forestInk
                        )
                    }
                }
            }
        }

        Spacer(Modifier.height(20.dp))

        if (gagal) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(16.dp))
                    .background(c.field)
                    .padding(16.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Text(
                    text = "Grafik belum bisa dimuat. Coba lagi.",
                    style = PastiCuanTheme.typography.label,
                    color = c.inkMuted
                )
                if (onCobaLagi != null) {
                    PastiCuanButton(
                        text = "Coba lagi",
                        icon = PastiCuanIcons.Refresh,
                        isPrimary = false,
                        height = 40.dp,
                        onClick = onCobaLagi
                    )
                }
            }
        } else if (kosongMessage != null) {
            // .chart-empty memakai latar var(--field), bukan canvas
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(112.dp)
                    .clip(RoundedCornerShape(16.dp))
                    .background(c.field)
                    .padding(16.dp),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = kosongMessage,
                    style = PastiCuanTheme.typography.label,
                    color = c.inkMuted
                )
            }
        } else {
            ChartCanvas(
                titik = titikUi,
                aktifIndex = validIdx,
                onScrubIndex = { aktifIdx = it },
                isPersenMode = bandingkan,
                chartKey = "${seri.jenis}-${rentang.name}-${mode.name}",
                accessibilityLabel = "Grafik $label rentang ${rentang.label}"
            )
        }

        val ketEst = PoolEngine.keteranganEstimasi(seri, rentang)
        if (!gagal && kosongMessage == null && ketEst != null) {
            Spacer(Modifier.height(6.dp))
            Text(
                text = ketEst,
                style = PastiCuanTheme.typography.caption,
                color = c.inkMuted
            )
        }

        if (bandingkan && !gagal && kosongMessage == null) {
            Spacer(Modifier.height(6.dp))
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                val forestCol = c.forestInk
                val mutedCol = c.inkMuted
                Canvas(modifier = Modifier.width(18.dp).height(4.dp)) {
                    drawLine(
                        color = forestCol,
                        start = Offset(0f, size.height / 2f),
                        end = Offset(size.width, size.height / 2f),
                        strokeWidth = 2.dp.toPx()
                    )
                }
                Text("USD", style = PastiCuanTheme.typography.caption, color = c.inkMuted)
                Spacer(Modifier.width(4.dp))
                Canvas(modifier = Modifier.width(18.dp).height(4.dp)) {
                    drawLine(
                        color = mutedCol,
                        start = Offset(0f, size.height / 2f),
                        end = Offset(size.width, size.height / 2f),
                        strokeWidth = 2.dp.toPx(),
                        pathEffect = PathEffect.dashPathEffect(floatArrayOf(4.dp.toPx(), 3.dp.toPx()), 0f)
                    )
                }
                Text(
                    text = if (seri.jenis == "pool") {
                        "SOL · persen kinerja unit sejak awal rentang (bukan total saldo)"
                    } else {
                        "SOL · persen untung/rugi sejak awal rentang"
                    },
                    style = PastiCuanTheme.typography.caption,
                    color = c.inkMuted
                )
            }
        }

        keteranganTambahan?.invoke()

        Spacer(Modifier.height(14.dp))
        SegmentedTrack(
            options = opsiRentang,
            selected = rentang,
            labelMapper = { it.label },
            onSelect = onRentangChange
        )

        if (bottomContent != null) {
            bottomContent()
        }
    }
}
