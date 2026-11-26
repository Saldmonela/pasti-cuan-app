package id.pasticuan.wallet.ui.components

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.awaitEachGesture
import androidx.compose.foundation.gestures.awaitFirstDown
import androidx.compose.foundation.gestures.awaitHorizontalTouchSlopOrCancellation
import androidx.compose.foundation.gestures.horizontalDrag
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.IntrinsicSize
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.asPaddingValues
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.wrapContentHeight
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyListScope
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.compositionLocalOf
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.layout
import androidx.compose.ui.layout.onGloballyPositioned
import androidx.compose.ui.layout.onSizeChanged
import androidx.compose.ui.layout.positionInParent
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.Constraints
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.launch
import id.pasticuan.wallet.domain.model.StatusArus
import id.pasticuan.wallet.domain.model.StatusPermintaan
import id.pasticuan.wallet.domain.model.SumberSnapshot
import id.pasticuan.wallet.domain.util.Formatters
import id.pasticuan.wallet.ui.components.backdrop.backdrops.layerBackdrop
import id.pasticuan.wallet.ui.components.backdrop.backdrops.rememberLayerBackdrop
import id.pasticuan.wallet.ui.state.AppRoute
import id.pasticuan.wallet.ui.state.AppUiState
import id.pasticuan.wallet.ui.theme.PastiCuanTheme
import kotlin.math.roundToInt

val LocalSimulasiMode = compositionLocalOf { false }

@Composable
fun PastiCuanCard(
    modifier: Modifier = Modifier,
    padding: Dp = 20.dp,
    content: @Composable ColumnScope.() -> Unit
) {
    val c = PastiCuanTheme.colors
    val shape = RoundedCornerShape(24.dp)
    Column(
        modifier = modifier
            .fillMaxWidth()
            .clip(shape)
            .background(c.card)
            .then(
                if (c.cardBorder != Color.Transparent) {
                    Modifier.border(1.dp, c.cardBorder, shape)
                } else Modifier
            )
            .padding(padding),
        content = content
    )
}

@Composable
fun PastiCuanButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    icon: ImageVector? = null,
    isPrimary: Boolean = true,
    isDanger: Boolean = false,
    isGhost: Boolean = false,
    enabled: Boolean = true,
    height: Dp = 48.dp,
    wrapText: Boolean = false
) {
    val c = PastiCuanTheme.colors
    val kaca = PastiCuanTheme.kaca
    val interactionSource = remember { MutableInteractionSource() }
    val pressed by interactionSource.collectIsPressedAsState()
    val scale by animateFloatAsState(
        targetValue = if (pressed && enabled && !kaca.kurangiAnimasi) 0.98f else 1f,
        animationSpec = tween(durationMillis = 120),
        label = "btnScale"
    )

    val bg = when {
        isGhost -> if (pressed && enabled) c.forestWash else Color.Transparent
        isDanger -> c.lossWash
        isPrimary -> c.limeAction
        else -> c.forestWash
    }
    val fg = when {
        isGhost -> c.forestInk
        isDanger -> c.loss
        isPrimary -> c.onLimeInk
        else -> c.forestInk
    }

    Box(
        modifier = modifier
            .scale(scale)
            .then(if (wrapText) Modifier.heightIn(min = height) else Modifier.height(height))
            .clip(RoundedCornerShape(24.dp))
            .background(if (enabled || isGhost) bg else bg.copy(alpha = 0.45f))
            .clickable(
                interactionSource = interactionSource,
                indication = null,
                enabled = enabled,
                role = Role.Button,
                onClick = onClick
            )
            .padding(horizontal = if (isGhost) 12.dp else 18.dp, vertical = if (wrapText) 8.dp else 0.dp),
        contentAlignment = Alignment.Center
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.Center
        ) {
            if (icon != null) {
                Icon(
                    imageVector = icon,
                    contentDescription = null,
                    tint = if (enabled) fg else fg.copy(alpha = 0.45f),
                    modifier = Modifier.size(18.dp)
                )
                Spacer(Modifier.width(7.dp))
            }
            Text(
                text = text,
                style = PastiCuanTheme.typography.title.copy(
                    fontSize = if (height < 44.dp) 14.sp else 15.sp
                ),
                color = if (enabled) fg else fg.copy(alpha = 0.45f),
                textAlign = TextAlign.Center,
                maxLines = if (wrapText) Int.MAX_VALUE else 1,
                overflow = if (wrapText) TextOverflow.Clip else TextOverflow.Ellipsis
            )
        }
    }
}

/**
 * Kontrol segmen (.seg di globals.css):
 * Light: trek sage-canvas (#E8EBE6), terpilih forest-ink (#163300) + teks lime (#9FE870).
 * Dark:  trek #0F130E, terpilih #263D1A + teks lime (#9FE870) — patuh Aturan Limau Satu Aksi!
 */
@Composable
fun <T> SegmentedTrack(
    options: List<T>,
    selected: T,
    labelMapper: (T) -> String,
    onSelect: (T) -> Unit,
    modifier: Modifier = Modifier,
    fillWidth: Boolean = false
) {
    val c = PastiCuanTheme.colors
    val kaca = PastiCuanTheme.kaca
    val haptic = LocalHapticFeedback.current
    val bounds = remember(options.size) { mutableStateMapOf<Int, Pair<Float, Float>>() }
    val selectedIdx = options.indexOf(selected).coerceAtLeast(0)
    val motion = rememberGlassPillMotion(initialIndex = selectedIdx, itemCount = options.size)
    val isi = rememberLayerBackdrop()

    LaunchedEffect(selectedIdx, kaca.pillPhysics, kaca.kurangiAnimasi) {
        if (!motion.isDragging) {
            motion.animateTo(selectedIdx, enablePhysics = kaca.pillPhysics, reduceMotion = kaca.kurangiAnimasi)
        }
    }

    val siap = options.isNotEmpty() && bounds.size == options.size
    val lefts = options.indices.map { bounds[it]?.first ?: 0f }
    val widths = options.indices.map { bounds[it]?.second ?: 0f }
    val kapsul = { kapsulDiPosisi(motion.position, lefts, widths) }
    val pillHeightPx = with(LocalDensity.current) { 32.dp.toPx() }
    val bidik = motion.indeksBidikan()

    val trackBg = if (kaca.liquidGlass && !c.isDark) {
        c.segTrackBg.copy(alpha = 0.85f)
    } else {
        c.segTrackBg
    }

    Box(
        modifier = modifier
            .then(if (fillWidth) Modifier.fillMaxWidth() else Modifier)
            .clip(RoundedCornerShape(24.dp))
            .background(trackBg)
            .padding(3.dp)
            .geserKapsulSegmen(
                motion = motion,
                centers = { options.indices.map { lefts[it] + widths[it] / 2f } },
                aktif = kaca.liquidGlass && kaca.pillPhysics && siap && options.size > 1,
                reduceMotion = kaca.kurangiAnimasi,
                onTick = { haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove) },
                onPilih = { i -> if (i != selectedIdx) onSelect(options[i]) }
            )
    ) {
        Box(
            modifier = Modifier
                .then(if (fillWidth) Modifier.fillMaxWidth() else Modifier)
                .then(if (kaca.liquidGlass) Modifier.layerBackdrop(isi) else Modifier)
        ) {
            if (siap) {
                Box(
                    modifier = Modifier
                        .layout { measurable, constraints ->
                            val (leftPx, wF) = kapsul()
                            val wPx = wF.roundToInt().coerceIn(0, constraints.maxWidth)
                            val hPx = 32.dp.roundToPx().coerceIn(0, constraints.maxHeight)
                            val placeable = measurable.measure(Constraints.fixed(wPx, hPx))
                            layout(wPx, hPx) {
                                placeable.place(leftPx.roundToInt(), 0)
                            }
                        }
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
            }

            Row(
                modifier = if (fillWidth) Modifier.fillMaxWidth() else Modifier,
                horizontalArrangement = Arrangement.spacedBy(2.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                options.forEachIndexed { idx, option ->
                    val isSelected = option == selected
                    val tampakAktif = bidik?.let { it == idx } ?: isSelected
                    val fg by animateColorAsState(
                        targetValue = if (tampakAktif) c.segSelectedFg else c.inkMuted,
                        animationSpec = tween(150),
                        label = "segFg"
                    )
                    Box(
                        modifier = Modifier
                            .then(if (fillWidth) Modifier.weight(1f) else Modifier)
                            .height(32.dp)
                            .onGloballyPositioned { coords ->
                                val x = coords.positionInParent().x
                                val w = coords.size.width.toFloat()
                                val prev = bounds[idx]
                                if (prev == null || prev.first != x || prev.second != w) {
                                    bounds[idx] = x to w
                                }
                            }
                            .clip(RoundedCornerShape(24.dp))
                            .clickable(
                                interactionSource = remember { MutableInteractionSource() },
                                indication = null,
                                role = Role.RadioButton
                            ) {
                                if (!isSelected) {
                                    haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                                    onSelect(option)
                                }
                            }
                            .padding(horizontal = 12.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = labelMapper(option),
                            style = PastiCuanTheme.typography.caption.copy(
                                fontSize = 12.5.sp,
                                fontWeight = FontWeight.SemiBold,
                                fontFeatureSettings = "tnum"
                            ),
                            color = fg,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                }
            }
        }

        if (siap) {
            val (leftPx, wPx) = kapsul()
            KacaSegmenTerangkat(
                motion = motion,
                isi = isi,
                leftPx = leftPx,
                widthPx = wPx,
                heightPx = pillHeightPx
            )
        }
    }
}

/**
 * Tab Saring (.tabs di globals.css — dipakai di Transaksi, Arus, Kelola Permintaan):
 * Trek frosted dengan pil indikator aktif yang meluncur mulus.
 */
@Composable
fun <T> FilterTabsTrack(
    options: List<T>,
    selected: T,
    labelMapper: (T) -> String,
    countMapper: ((T) -> Int?)? = null,
    onSelect: (T) -> Unit,
    modifier: Modifier = Modifier,
    wrapLabel: Boolean = false
) {
    val c = PastiCuanTheme.colors
    val kaca = PastiCuanTheme.kaca
    val haptic = LocalHapticFeedback.current
    val shape = RoundedCornerShape(24.dp)
    val selectedIdx = options.indexOf(selected).coerceAtLeast(0)

    val trackBg = when {
        !kaca.liquidGlass -> c.tabsTrackBg
        c.isDark -> Color(0xFF191D19).copy(alpha = 0.85f)
        else -> Color.White.copy(alpha = 0.84f)
    }
    val trackBorder = when {
        c.cardBorder != Color.Transparent -> c.cardBorder
        kaca.liquidGlass && !c.isDark -> Color.Black.copy(alpha = 0.06f)
        kaca.liquidGlass && c.isDark -> Color.White.copy(alpha = 0.10f)
        else -> Color.Transparent
    }

    BoxWithConstraints(
        modifier = modifier
            .fillMaxWidth()
            .clip(shape)
            .background(trackBg)
            .then(
                if (trackBorder != Color.Transparent) Modifier.border(1.dp, trackBorder, shape)
                else Modifier
            )
            .padding(3.dp)
    ) {
        val count = options.size.coerceAtLeast(1)
        val totalGap = 2.dp * (count - 1).coerceAtLeast(0)
        val itemWidth = ((maxWidth - totalGap) / count).coerceAtLeast(1.dp)
        val density = LocalDensity.current
        val stepPx = with(density) { (itemWidth + 2.dp).toPx() }
        val itemWidthPx = with(density) { itemWidth.toPx() }
        val minHeight = if (wrapLabel) 44.dp else 36.dp
        var measuredHeightPx by remember { mutableStateOf(0) }
        val tinggiPx = if (wrapLabel && measuredHeightPx > 0) measuredHeightPx.toFloat()
            else with(density) { minHeight.toPx() }
        val motion = rememberGlassPillMotion(initialIndex = selectedIdx, itemCount = options.size)
        val isi = rememberLayerBackdrop()
        LaunchedEffect(selectedIdx, kaca.pillPhysics, kaca.kurangiAnimasi) {
            if (!motion.isDragging) {
                motion.animateTo(selectedIdx, enablePhysics = kaca.pillPhysics, reduceMotion = kaca.kurangiAnimasi)
            }
        }
        val bidik = motion.indeksBidikan()

        Box(
            modifier = Modifier
                .fillMaxWidth()
                .geserKapsulSegmen(
                    motion = motion,
                    centers = { options.indices.map { it * stepPx + itemWidthPx / 2f } },
                    aktif = kaca.liquidGlass && kaca.pillPhysics && options.size > 1,
                    reduceMotion = kaca.kurangiAnimasi,
                    onTick = { haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove) },
                    onPilih = { i -> if (i != selectedIdx) onSelect(options[i]) }
                )
        ) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .then(if (kaca.liquidGlass) Modifier.layerBackdrop(isi) else Modifier)
            ) {
                Box(
                    modifier = Modifier
                        .graphicsLayer { translationX = motion.position * stepPx }
                        .width(itemWidth)
                        .height(with(density) { tinggiPx.toDp() })
                        .shadow(
                            elevation = if (c.isDark) 2.dp else 1.5.dp,
                            shape = shape,
                            ambientColor = Color.Black.copy(alpha = 0.14f),
                            spotColor = Color.Black.copy(alpha = 0.14f)
                        )
                        .clip(shape)
                        .background(c.segSelectedBg)
                        .then(
                            if (kaca.liquidGlass) {
                                Modifier.border(
                                    0.5.dp,
                                    if (c.isDark) Color.White.copy(alpha = 0.14f) else Color.White.copy(alpha = 0.8f),
                                    shape
                                )
                            } else Modifier
                        )
                )

                Row(
                    modifier = Modifier.fillMaxWidth().then(
                        if (wrapLabel) Modifier.height(IntrinsicSize.Min).onSizeChanged { measuredHeightPx = it.height }
                        else Modifier
                    ),
                    horizontalArrangement = Arrangement.spacedBy(2.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    options.forEachIndexed { idx, option ->
                        val isSelected = option == selected
                        val tampakAktif = bidik?.let { it == idx } ?: isSelected
                        val fg by animateColorAsState(
                            targetValue = if (tampakAktif) c.segSelectedFg else c.inkMuted,
                            animationSpec = tween(150),
                            label = "tabFg"
                        )
                        val cnt = countMapper?.invoke(option)
                        Box(
                            modifier = Modifier
                                .weight(1f)
                                .then(if (wrapLabel) Modifier.fillMaxHeight().heightIn(min = minHeight) else Modifier.height(minHeight))
                                .clip(shape)
                                .clickable(
                                    interactionSource = remember { MutableInteractionSource() },
                                    indication = null
                                ) {
                                    if (!isSelected) {
                                        haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                                        onSelect(option)
                                    }
                                }
                                .padding(horizontal = 8.dp, vertical = if (wrapLabel) 6.dp else 0.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            val txt = buildAnnotatedString {
                                append(labelMapper(option))
                                if (cnt != null) {
                                    withStyle(SpanStyle(color = fg.copy(alpha = 0.82f))) {
                                        append(" $cnt")
                                    }
                                }
                            }
                            Text(
                                text = txt,
                                style = PastiCuanTheme.typography.caption.copy(
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.SemiBold,
                                    fontFeatureSettings = "tnum"
                                ),
                                color = fg,
                                textAlign = TextAlign.Center,
                                maxLines = if (wrapLabel) Int.MAX_VALUE else 1,
                                overflow = if (wrapLabel) TextOverflow.Clip else TextOverflow.Ellipsis
                            )
                        }
                    }
                }
            }

            KacaSegmenTerangkat(
                motion = motion,
                isi = isi,
                leftPx = motion.position * stepPx,
                widthPx = itemWidthPx,
                heightPx = tinggiPx
            )
        }
    }
}

/**
 * Sakelar Kustom GlassSwitch (.lg-switch 46x28dp di globals.css):
 * Menggantikan Switch bawaan Material 3 supaya 1:1 dengan Web produksi.
 */
@Composable
fun GlassSwitch(
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit,
    enabled: Boolean = true,
    modifier: Modifier = Modifier
) {
    val c = PastiCuanTheme.colors
    val kaca = PastiCuanTheme.kaca
    val haptic = LocalHapticFeedback.current

    val trackColor by animateColorAsState(
        targetValue = if (checked) c.switchOnBg else c.switchOffBg,
        animationSpec = if (kaca.kurangiAnimasi) tween(0) else tween(180),
        label = "swTrack"
    )
    val thumbColor by animateColorAsState(
        targetValue = if (checked) c.switchOnThumb else c.switchOffThumb,
        animationSpec = if (kaca.kurangiAnimasi) tween(0) else tween(180),
        label = "swThumb"
    )
    val thumbOffset by animateDpAsState(
        targetValue = if (checked) 18.dp else 0.dp,
        animationSpec = if (kaca.kurangiAnimasi) tween(0) else spring(dampingRatio = 0.78f, stiffness = Spring.StiffnessMedium),
        label = "swOffset"
    )

    Box(
        modifier = modifier
            .size(width = 46.dp, height = 28.dp)
            .clip(CircleShape)
            .background(if (enabled) trackColor else trackColor.copy(alpha = 0.4f))
            .clickable(
                enabled = enabled,
                role = Role.Switch,
                interactionSource = remember { MutableInteractionSource() },
                indication = null
            ) {
                haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                onCheckedChange(!checked)
            }
            .padding(2.dp),
        contentAlignment = Alignment.CenterStart
    ) {
        Box(
            modifier = Modifier
                .offset(x = thumbOffset)
                .size(24.dp)
                .shadow(2.dp, CircleShape)
                .clip(CircleShape)
                .background(thumbColor)
        )
    }
}

@Composable
fun TagRoiPill(text: String, isNegative: Boolean, modifier: Modifier = Modifier) {
    val c = PastiCuanTheme.colors
    val fg = if (isNegative) c.loss else c.gain
    val bg = fg.copy(alpha = 0.12f)
    Box(
        modifier = modifier
            .clip(CircleShape)
            .background(bg)
            .padding(horizontal = 8.dp, vertical = 2.dp)
    ) {
        Text(text = text, style = PastiCuanTheme.typography.tag, color = fg, maxLines = 1)
    }
}

@Composable
fun StatusPermintaanChip(status: StatusPermintaan) {
    val c = PastiCuanTheme.colors
    val (label, bg, fg) = when (status) {
        StatusPermintaan.MENUNGGU -> Triple("Menunggu", c.warningWash, c.warningInk)
        StatusPermintaan.SELESAI -> Triple("Selesai", c.gainWash, c.gain)
        StatusPermintaan.DITOLAK -> Triple("Ditolak", c.lossWash, c.loss)
        StatusPermintaan.DIBATALKAN -> Triple("Dibatalkan", c.canvas, c.inkMuted)
    }
    Box(
        modifier = Modifier
            .clip(CircleShape)
            .background(bg)
            .padding(horizontal = 10.dp, vertical = 3.dp)
    ) {
        Text(
            text = label,
            style = PastiCuanTheme.typography.tag.copy(fontSize = 11.5.sp),
            color = fg,
            maxLines = 1
        )
    }
}

@Composable
fun StatusArusChip(status: StatusArus) {
    val c = PastiCuanTheme.colors
    val (bg, fg) = when (status) {
        StatusArus.BELUM -> c.warningWash to c.warningInk
        StatusArus.DICOCOKKAN, StatusArus.HADIAH -> c.gainWash to c.gain
        StatusArus.BIAYA, StatusArus.BUKAN_ARUS -> c.canvas to c.inkMuted
    }
    Box(
        modifier = Modifier
            .clip(CircleShape)
            .background(bg)
            .padding(horizontal = 10.dp, vertical = 3.dp)
    ) {
        Text(
            text = status.label,
            style = PastiCuanTheme.typography.tag.copy(fontSize = 11.5.sp),
            color = fg
        )
    }
}

@Composable
fun SumberSnapshotChip(sumber: SumberSnapshot) {
    val c = PastiCuanTheme.colors
    val (bg, fg) = when (sumber) {
        SumberSnapshot.OTOMATIS -> c.gainWash to c.gain
        SumberSnapshot.KOREKSI -> c.warningWash to c.warningInk
        SumberSnapshot.MANUAL, SumberSnapshot.IMPOR -> c.canvas to c.inkMuted
    }
    Box(
        modifier = Modifier
            .clip(CircleShape)
            .background(bg)
            .padding(horizontal = 10.dp, vertical = 3.dp)
    ) {
        Text(
            text = sumber.label,
            style = PastiCuanTheme.typography.tag.copy(fontSize = 11.5.sp),
            color = fg,
            maxLines = 1
        )
    }
}

@Composable
fun RoleChip(text: String) {
    val c = PastiCuanTheme.colors
    Box(
        modifier = Modifier
            .clip(CircleShape)
            .background(c.forestWash)
            .padding(horizontal = 10.dp, vertical = 3.dp)
    ) {
        Text(
            text = text,
            style = PastiCuanTheme.typography.tag.copy(fontSize = 11.5.sp),
            color = c.forestInk,
            maxLines = 1
        )
    }
}

/** Avatar 36dp sesuai DESIGN.md (.av di globals.css: menuju /lainnya). */
@Composable
fun AvatarPill(inisial: String, onClick: () -> Unit) {
    val c = PastiCuanTheme.colors
    Box(
        modifier = Modifier
            .size(36.dp)
            .clip(CircleShape)
            .background(c.limeAction)
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = inisial.take(1).uppercase(),
            style = PastiCuanTheme.typography.body.copy(fontWeight = FontWeight.SemiBold, fontSize = 14.sp),
            color = c.onLimeInk
        )
    }
}

/**
 * Stempel waktu 2 bagian (ui.tsx Stamp):
 * "Nilai live per 16 Nov 2026, 23.55 WIB · Snapshot resmi 16 Nov 2026, 08.00 WIB"
 * Berubah warna warningInk saat nilai live tertinggal > batasLiveLamaMenit (BR-20).
 */
@Composable
fun StampLine(state: AppUiState) {
    val c = PastiCuanTheme.colors
    val hasil = state.hasil ?: return
    val set = state.data?.pengaturan ?: return
    val tglData = hasil.tanggalData
    if (tglData == null) {
        Text("Belum ada data saldo", style = PastiCuanTheme.typography.caption, color = c.inkMuted)
        return
    }
    val jamSnap = set.jamSnapshot.replace(":", ".")
    val resmiTeks = "Snapshot resmi ${Formatters.tanggal(tglData)}, $jamSnap WIB"
    val live = hasil.live
    if (live == null) {
        Text(
            text = "Data per ${Formatters.tanggal(tglData)}, $jamSnap WIB",
            style = PastiCuanTheme.typography.caption,
            color = c.inkMuted
        )
        return
    }
    val lama = state.lamaLiveMenit > set.batasLiveLamaMenit
    val annotated = buildAnnotatedString {
        if (lama) {
            withStyle(SpanStyle(color = c.warningInk, fontWeight = FontWeight.SemiBold)) {
                append("Nilai terakhir diperbarui ${Formatters.jam(live.dibacaPada)} WIB")
            }
        } else {
            append("Nilai live per ${Formatters.waktu(live.dibacaPada)}")
        }
        append(" · ")
        append(resmiTeks)
    }
    Text(
        text = annotated,
        style = PastiCuanTheme.typography.caption,
        color = c.inkMuted
    )
}

/** Header utama halaman tab (.hd di globals.css: padding atas lega, inset 4dp, Avatar kanan -> Lainnya). */
@Composable
fun PageTopHeader(
    judul: String,
    state: AppUiState,
    showStamp: Boolean = true,
    onAvatarClick: () -> Unit
) {
    val c = PastiCuanTheme.colors
    val namaInisial = state.saya?.nama?.take(1) ?: "P"
    val topPad = if (state.isSimulasiMode) 36.dp else 12.dp
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .statusBarsPadding()
            .padding(top = topPad, bottom = 8.dp, start = 4.dp, end = 4.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.Top
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = judul,
                style = PastiCuanTheme.typography.headline,
                color = c.ink
            )
            if (showStamp) {
                Spacer(Modifier.height(4.dp))
                StampLine(state = state)
            }
        }
        Spacer(Modifier.width(12.dp))
        AvatarPill(inisial = namaInisial, onClick = onAvatarClick)
    }
}

/** Bar atas sub-halaman (.bar & .back bulat 44dp dengan kaca Liquid Glass sesuai globals.css). */
@Composable
fun FloatingBackButton(
    onBack: () -> Unit,
    modifier: Modifier = Modifier
) {
    val c = PastiCuanTheme.colors
    val kaca = PastiCuanTheme.kaca
    val haptic = LocalHapticFeedback.current
    val interactionSource = remember { MutableInteractionSource() }
    val pressed by interactionSource.collectIsPressedAsState()
    val scale by animateFloatAsState(
        targetValue = if (pressed && !kaca.kurangiAnimasi) 0.92f else 1f,
        animationSpec = spring(dampingRatio = 0.72f, stiffness = 700f),
        label = "backBtnScale"
    )
    Box(
        modifier = modifier
            .size(44.dp)
            .graphicsLayer {
                scaleX = scale
                scaleY = scale
            }
            .pastiCuanLiquidGlass(
                spec = GlassSurfaceSpec(
                    shape = CircleShape,
                    blurDp = 5.dp,
                    frostBlurDp = 16.dp,
                    lensHeightFraction = 0.44f,
                    lensAmountFraction = 0.46f,
                    maxLensDp = 18.dp,
                    lightCrystalAlpha = 0.42f,
                    darkCrystalAlpha = 0.52f,
                    shadowRadius = 14.dp,
                    shadowOffsetY = 5.dp
                )
            )
            .clip(CircleShape)
            .clickable(
                interactionSource = interactionSource,
                indication = null,
                role = Role.Button
            ) {
                haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                onBack()
            },
        contentAlignment = Alignment.Center
    ) {
        Icon(
            imageVector = PastiCuanIcons.ChevronLeft,
            contentDescription = "Kembali",
            tint = c.ink,
            modifier = Modifier.size(22.dp)
        )
    }
}

/**
 * Container sub-halaman dengan tombol kembali Liquid Glass mengapung di pojok kiri atas
 * dan judul halaman ikut menggulir mulus ke bawah Progressive Blur saat scroll (bebas tabrakan).
 */
@Composable
fun FloatingSubScreenLayout(
    judul: String,
    onBack: () -> Unit,
    modifier: Modifier = Modifier,
    useImePadding: Boolean = false,
    bottomPadding: Dp = 108.dp,
    content: LazyListScope.() -> Unit
) {
    val c = PastiCuanTheme.colors
    val isSimulasi = LocalSimulasiMode.current
    val topBelowStatus = if (isSimulasi) 36.dp else 10.dp
    val statusTop = WindowInsets.statusBars.asPaddingValues().calculateTopPadding()
    val listState = rememberLazyListState()
    val showProgBlur by remember {
        derivedStateOf {
            listState.firstVisibleItemIndex > 0 || listState.firstVisibleItemScrollOffset > 12
        }
    }
    val canvasColor = c.canvas
    val subBackdrop = rememberLayerBackdrop {
        drawRect(canvasColor)
        drawContent()
    }

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(c.canvas)
            .then(if (useImePadding) Modifier.imePadding() else Modifier)
    ) {
        LazyColumn(
            state = listState,
            modifier = Modifier
                .fillMaxSize()
                .layerBackdrop(subBackdrop),
            contentPadding = PaddingValues(
                start = 16.dp,
                end = 16.dp,
                top = statusTop + topBelowStatus,
                bottom = bottomPadding
            ),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            item(key = "_floating_sub_header") {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(bottom = 4.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Spacer(Modifier.width(54.dp))
                    Text(
                        text = judul,
                        style = PastiCuanTheme.typography.pageTitle,
                        color = c.ink,
                        modifier = Modifier
                            .weight(1f)
                            .defaultMinSize(minHeight = 44.dp)
                            .wrapContentHeight(Alignment.CenterVertically)
                    )
                }
            }
            content()
        }

        CompositionLocalProvider(LocalAppBackdrop provides subBackdrop) {
            TopProgressiveBlur(
                visible = showProgBlur,
                extraHeight = topBelowStatus + 14.dp,
                modifier = Modifier.align(Alignment.TopCenter)
            )

            FloatingBackButton(
                onBack = onBack,
                modifier = Modifier
                    .align(Alignment.TopStart)
                    .statusBarsPadding()
                    .padding(start = 16.dp, top = topBelowStatus)
            )
        }
    }
}

@Composable
fun BackTopBar(judul: String, onBack: () -> Unit) {
    val c = PastiCuanTheme.colors
    val isSimulasi = LocalSimulasiMode.current
    val topPad = if (isSimulasi) 36.dp else 10.dp
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .statusBarsPadding()
            .padding(start = 16.dp, end = 16.dp, top = topPad, bottom = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        FloatingBackButton(onBack = onBack)
        Text(
            text = judul,
            style = PastiCuanTheme.typography.pageTitle,
            color = c.ink,
            modifier = Modifier.weight(1f)
        )
    }
}

/**
 * Pil tipis penanda Mode Simulasi (.proto-btn di globals.css: tinggi 25dp, tepi garis putus-putus,
 * Liquid Glass nyata mengaburkan konten yang menggulir di bawahnya).
 */
@Composable
fun SimulasiProtoPill(
    namaAktif: String,
    peranLabel: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val c = PastiCuanTheme.colors
    val strokeColor = if (c.isDark) Color.White.copy(alpha = 0.28f) else c.inkMuted.copy(alpha = 0.55f)

    Box(
        modifier = modifier
            .statusBarsPadding()
            .padding(top = 4.dp)
            .height(25.dp)
            .pastiCuanLiquidGlass(
                spec = GlassSurfaceSpec(
                    shape = CircleShape,
                    blurDp = 5.dp,
                    frostBlurDp = 14.dp,
                    lensHeightFraction = 0.40f,
                    lensAmountFraction = 0.40f,
                    maxLensDp = 11.dp,
                    lightCrystalAlpha = 0.48f,
                    darkCrystalAlpha = 0.54f,
                    lightFrostAlpha = 0.78f,
                    darkFrostAlpha = 0.78f,
                    shadowRadius = 10.dp,
                    shadowOffsetY = 4.dp
                )
            )
            .clip(CircleShape)
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center
    ) {
        Canvas(modifier = Modifier.matchParentSize()) {
            drawRoundRect(
                color = strokeColor,
                style = Stroke(
                    width = 1.dp.toPx(),
                    pathEffect = PathEffect.dashPathEffect(floatArrayOf(3.5.dp.toPx(), 3.dp.toPx()), 0f)
                ),
                cornerRadius = CornerRadius(size.height / 2f, size.height / 2f)
            )
        }
        Row(
            modifier = Modifier.padding(horizontal = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(5.dp)
        ) {
            Box(
                modifier = Modifier
                    .size(6.dp)
                    .clip(CircleShape)
                    .background(c.forestInk)
            )
            Text(
                text = "Prototype · $namaAktif ($peranLabel)",
                style = PastiCuanTheme.typography.tag.copy(fontSize = 11.sp),
                color = c.ink
            )
        }
    }
}

/**
 * Strip Banner Status (paritas 1:1 ui.tsx StatusBanners: BR-12, BR-15, BR-20, Offline).
 */
@Composable
fun StatusBanners(state: AppUiState) {
    val c = PastiCuanTheme.colors
    val hasil = state.hasil ?: return
    val resmi = state.resmi ?: hasil
    val cekGagal = !hasil.cek.lolos || !resmi.cek.lolos
    val arusBelumCatat = resmi.cek.penyebab.firstOrNull { it.contains("transfer di wallet") }
    val adaBanner = (state.offline && hasil.tanggalData != null) ||
        cekGagal ||
        (!state.offline && hasil.tanggalData != null && state.lamaLiveMenit > 60) ||
        (state.dataLama && hasil.tanggalData != null)

    if (!adaBanner) return

    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        if (state.offline && hasil.tanggalData != null) {
            val tglTeks = hasil.live?.let { Formatters.waktu(it.dibacaPada) }
                ?: "${Formatters.tanggal(hasil.tanggalData)}, 08.00 WIB"
            val darkBannerBg = if (c.isDark) Color(0xFF20261E) else c.ink
            val darkBannerFg = if (c.isDark) c.ink else c.card
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(16.dp))
                    .background(darkBannerBg)
                    .then(if (c.isDark) Modifier.border(1.dp, c.hairline, RoundedCornerShape(16.dp)) else Modifier)
                    .padding(horizontal = 14.dp, vertical = 12.dp),
                verticalAlignment = Alignment.Top,
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Icon(
                    imageVector = PastiCuanIcons.WifiOff,
                    contentDescription = null,
                    tint = darkBannerFg,
                    modifier = Modifier.padding(top = 1.dp).size(18.dp)
                )
                Text(
                    text = "Kamu sedang offline. Data terakhir $tglTeks.",
                    style = PastiCuanTheme.typography.label,
                    color = darkBannerFg
                )
            }
        }

        if (cekGagal) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(16.dp))
                    .background(c.warningWash)
                    .padding(horizontal = 14.dp, vertical = 12.dp),
                verticalAlignment = Alignment.Top,
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Icon(
                    imageVector = PastiCuanIcons.AlertTriangle,
                    contentDescription = null,
                    tint = c.warningInk,
                    modifier = Modifier.padding(top = 1.dp).size(18.dp)
                )
                val msg = buildAnnotatedString {
                    if (arusBelumCatat != null) {
                        withStyle(SpanStyle(fontWeight = FontWeight.SemiBold)) {
                            append(arusBelumCatat)
                        }
                    } else {
                        withStyle(SpanStyle(fontWeight = FontWeight.SemiBold)) {
                            append("Angka sedang dicek ulang oleh pengelola. ")
                        }
                        append("Jangan ajukan penarikan dulu.")
                    }
                }
                Text(text = msg, style = PastiCuanTheme.typography.label, color = c.warningInk)
            }
        }

        if (!state.offline && hasil.tanggalData != null && state.lamaLiveMenit > 60) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(16.dp))
                    .background(c.warningWash)
                    .padding(horizontal = 14.dp, vertical = 12.dp),
                verticalAlignment = Alignment.Top,
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Icon(
                    imageVector = PastiCuanIcons.AlertTriangle,
                    contentDescription = null,
                    tint = c.warningInk,
                    modifier = Modifier.padding(top = 1.dp).size(18.dp)
                )
                Text(
                    text = "Pembacaan wallet sedang terganggu. Angka mungkin tertinggal.",
                    style = PastiCuanTheme.typography.label,
                    color = c.warningInk
                )
            }
        }

        if (state.dataLama && hasil.tanggalData != null) {
            val selisih = Formatters.selisihHari(hasil.tanggalData, state.hariIni)
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(16.dp))
                    .background(c.warningWash)
                    .padding(horizontal = 14.dp, vertical = 12.dp),
                verticalAlignment = Alignment.Top,
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Icon(
                    imageVector = PastiCuanIcons.AlertTriangle,
                    contentDescription = null,
                    tint = c.warningInk,
                    modifier = Modifier.padding(top = 1.dp).size(18.dp)
                )
                Text(
                    text = "Data terakhir diperbarui $selisih hari lalu (${Formatters.tanggal(hasil.tanggalData)}).",
                    style = PastiCuanTheme.typography.label,
                    color = c.warningInk
                )
            }
        }
    }
}

/** Lingkaran ikon latar basuhan hutan (.ico-dot 36dp di globals.css). */
@Composable
fun IconDot(icon: ImageVector, size: Dp = 36.dp) {
    val c = PastiCuanTheme.colors
    Box(
        modifier = Modifier
            .size(size)
            .clip(CircleShape)
            .background(c.forestWash),
        contentAlignment = Alignment.Center
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = c.forestInk,
            modifier = Modifier.size(18.dp)
        )
    }
}

/** Kerangka statis loading 3 kartu tanpa kedip (.sk di globals.css & Memuat di ui.tsx). */
@Composable
fun SkeletonLoadingCards(count: Int = 3) {
    val c = PastiCuanTheme.colors
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(c.canvas)
            .statusBarsPadding()
            .padding(horizontal = 16.dp, vertical = 22.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Box(Modifier.size(width = 140.dp, height = 26.dp).clip(RoundedCornerShape(8.dp)).background(c.skeleton))
                Box(Modifier.size(width = 220.dp, height = 12.dp).clip(RoundedCornerShape(6.dp)).background(c.skeleton))
            }
            Box(Modifier.size(36.dp).clip(CircleShape).background(c.skeleton))
        }
        repeat(count) { idx ->
            PastiCuanCard {
                Box(Modifier.size(width = 90.dp, height = 12.dp).clip(RoundedCornerShape(6.dp)).background(c.skeleton))
                if (idx == 0) {
                    Spacer(Modifier.height(10.dp))
                    Box(Modifier.fillMaxWidth(0.62f).height(40.dp).clip(RoundedCornerShape(8.dp)).background(c.skeleton))
                    Spacer(Modifier.height(10.dp))
                    Box(Modifier.fillMaxWidth(0.48f).height(12.dp).clip(RoundedCornerShape(6.dp)).background(c.skeleton))
                    Spacer(Modifier.height(20.dp))
                    Box(Modifier.fillMaxWidth().height(112.dp).clip(RoundedCornerShape(16.dp)).background(c.skeleton))
                } else {
                    repeat(3) { r ->
                        Spacer(Modifier.height(14.dp))
                        Box(Modifier.fillMaxWidth(0.85f - r * 0.12f).height(12.dp).clip(RoundedCornerShape(6.dp)).background(c.skeleton))
                    }
                }
            }
        }
    }
}

data class NavItemData(
    val route: AppRoute,
    val label: String,
    val icon: ImageVector,
    val badgeCount: Int = 0
)

/**
 * Kapsul Navigasi Bawah Melayang (paritas 1:1 .nav di globals.css baris 94-100 & 688-824):
 * - Light + Liquid Glass ON: Kaca putih kristal bening terang (rgba(255,255,255,0.78 -> 0.58)),
 *   teks idle #414540, teks aktif #0E0F0C tebal, pil indikator putih susu (#FFFFFF 95%) berbayang lembut!
 * - Dark + Liquid Glass ON:  Kaca kristal obsidian gelap (#1A1B1A -> #0E0F0E),
 *   teks idle #A8ADA6, teks aktif #FFFFFF, pil indikator putih bening 16%!
 * - Liquid Glass OFF:        Pil solid #0E0F0C (Light) / #1E241C (Dark) dengan pil aktif #353633 / #2E372B.
 */
@Composable
fun FloatingPillNav(
    items: List<NavItemData>,
    activeTabRoute: AppRoute,
    onSelect: (AppRoute) -> Unit,
    modifier: Modifier = Modifier
) {
    val c = PastiCuanTheme.colors
    val kaca = PastiCuanTheme.kaca
    val haptic = LocalHapticFeedback.current
    val density = LocalDensity.current
    val scrollGlass = LocalScrollGlassState.current
    val activeIdx = items.indexOfFirst { it.route == activeTabRoute }.coerceAtLeast(0)

    val isCompact = scrollGlass?.isNavCompact == true && kaca.liquidGlass && !kaca.kurangiAnimasi
    val barHeight by animateDpAsState(
        targetValue = if (isCompact) 55.dp else 62.dp,
        animationSpec = if (kaca.kurangiAnimasi) tween(0) else spring(
            dampingRatio = 0.80f,
            stiffness = 380f
        ),
        label = "navBarHeight"
    )
    val outerHorizontalPad by animateDpAsState(
        targetValue = if (isCompact) 26.dp else 16.dp,
        animationSpec = if (kaca.kurangiAnimasi) tween(0) else spring(
            dampingRatio = 0.80f,
            stiffness = 380f
        ),
        label = "navOuterPad"
    )

    val barGlass = rememberLayerBackdrop()
    val tabRow = rememberLayerBackdrop()
    val motion = rememberGlassPillMotion(initialIndex = activeIdx, itemCount = items.size)

    LaunchedEffect(activeIdx, kaca.pillPhysics, kaca.kurangiAnimasi) {
        if (!motion.isDragging) {
            motion.animateTo(
                index = activeIdx,
                enablePhysics = kaca.pillPhysics,
                reduceMotion = kaca.kurangiAnimasi
            )
        }
    }

    val idleColor = when {
        !kaca.liquidGlass -> c.navIdle
        c.isDark -> Color(0xFFA8ADA6)
        else -> Color(0xFF414540)
    }
    val activeTextColor = when {
        !kaca.liquidGlass -> if (c.isDark) c.ink else Color.White
        c.isDark -> Color.White
        else -> c.ink
    }

    Box(
        modifier = modifier
            .fillMaxWidth()
            .navigationBarsPadding()
            .padding(horizontal = outerHorizontalPad, vertical = 12.dp),
        contentAlignment = Alignment.Center
    ) {
        BoxWithConstraints(
            modifier = Modifier
                .fillMaxWidth()
                .height(barHeight)
        ) {
            val itemCount = items.size.coerceAtLeast(1)
            val horizontalInset = 6.dp
            val verticalInset = if (isCompact) 4.dp else 5.dp
            val trackWidthDp = (maxWidth - horizontalInset * 2).coerceAtLeast(1.dp)
            val trackWidthPx = with(density) { trackWidthDp.toPx() }
            val itemWidth = trackWidthDp / itemCount
            val pillHeight = (barHeight - verticalInset * 2).coerceAtLeast(36.dp)

            // 1. Lapisan kapsul luar bar (Liquid Glass nyata atau solid crisp saat OFF)
            Box(
                modifier = Modifier
                    .matchParentSize()
                    .then(
                        if (kaca.liquidGlass) {
                            Modifier.pastiCuanLiquidGlass(
                                spec = GlassSurfaceSpec(
                                    shape = CircleShape,
                                    blurDp = 6.dp,
                                    frostBlurDp = 20.dp,
                                    enableLens = true,
                                    lensHeightFraction = 0.45f,
                                    lensAmountFraction = 0.48f,
                                    maxLensDp = 28.dp,
                                    lightCrystalAlpha = 0.36f,
                                    darkCrystalAlpha = 0.50f,
                                    lightFrostAlpha = 0.72f,
                                    darkFrostAlpha = 0.76f,
                                    shadowRadius = 20.dp,
                                    shadowOffsetY = 8.dp
                                ),
                                exportedBackdrop = barGlass
                            )
                        } else {
                            Modifier
                                .shadow(
                                    elevation = 16.dp,
                                    shape = CircleShape,
                                    ambientColor = Color.Black.copy(alpha = if (c.isDark) 0.62f else 0.24f),
                                    spotColor = Color.Black.copy(alpha = if (c.isDark) 0.62f else 0.24f)
                                )
                                .clip(CircleShape)
                                .background(c.navSolidBg)
                                .then(
                                    if (c.isDark) Modifier.border(1.dp, Color.White.copy(alpha = 0.09f), CircleShape)
                                    else Modifier
                                )
                        }
                    )
            )

            // 2. Trek isi tab + indikator istirahat + LiftedGlassSelectionPill (tanpa clip)
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(horizontal = horizontalInset, vertical = verticalInset)
                    .pointerInput(items, kaca.pillPhysics, kaca.kurangiAnimasi, activeTabRoute, trackWidthPx) {
                        if (!kaca.pillPhysics || trackWidthPx <= 0f) return@pointerInput
                        awaitEachGesture {
                            val down = awaitFirstDown(requireUnconsumed = false)
                            var dragStarted = false
                            var lastTickIdx = activeIdx
                            var dragFraction = ((down.position.x / trackWidthPx) * itemCount - 0.5f)
                                .coerceIn(0f, (itemCount - 1).toFloat())

                            val overSlop = awaitHorizontalTouchSlopOrCancellation(down.id) { change, _ ->
                                dragStarted = true
                                dragFraction = ((change.position.x / trackWidthPx) * itemCount - 0.5f)
                                    .coerceIn(0f, (itemCount - 1).toFloat())
                                change.consume()
                            }

                            if (overSlop != null && dragStarted) {
                                motion.startDrag()
                                motion.dragTo(dragFraction)
                                val initSnap = dragFraction.roundToInt().coerceIn(0, items.lastIndex)
                                if (initSnap != lastTickIdx) {
                                    lastTickIdx = initSnap
                                    haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                                }
                                val finished = horizontalDrag(overSlop.id) { change ->
                                    val nextFrac = ((change.position.x / trackWidthPx) * itemCount - 0.5f)
                                        .coerceIn(0f, (itemCount - 1).toFloat())
                                    motion.dragTo(nextFrac)
                                    val snapped = nextFrac.roundToInt().coerceIn(0, items.lastIndex)
                                    if (snapped != lastTickIdx) {
                                        lastTickIdx = snapped
                                        haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                                    }
                                    change.consume()
                                }
                                val finalIdx = if (finished) {
                                    motion.position.roundToInt().coerceIn(0, items.lastIndex)
                                } else {
                                    activeIdx
                                }
                                motion.release(finalIdx, reduceMotion = kaca.kurangiAnimasi)
                                val targetRoute = items[finalIdx].route
                                if (finished && targetRoute != activeTabRoute) {
                                    onSelect(targetRoute)
                                }
                            }
                        }
                    }
            ) {
                RestingSelectionPill(
                    motion = motion,
                    tabWidthDp = itemWidth,
                    pillHeightDp = pillHeight,
                    modifier = Modifier.align(Alignment.CenterStart)
                )

                Row(
                    modifier = Modifier
                        .fillMaxSize()
                        .then(if (kaca.liquidGlass) Modifier.layerBackdrop(tabRow) else Modifier)
                ) {
                    items.forEachIndexed { idx, item ->
                        val isTargetSelected = if (motion.isDragging) {
                            motion.position.roundToInt().coerceIn(0, items.lastIndex) == idx
                        } else {
                            item.route == activeTabRoute
                        }
                        val fgColor by animateColorAsState(
                            targetValue = if (isTargetSelected) activeTextColor else idleColor,
                            animationSpec = tween(130),
                            label = "navFgColor"
                        )
                        Box(
                            modifier = Modifier
                                .weight(1f)
                                .fillMaxHeight()
                                .clip(CircleShape)
                                .clickable(
                                    interactionSource = remember { MutableInteractionSource() },
                                    indication = null
                                ) {
                                    haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                                    motion.animateTo(
                                        index = idx,
                                        enablePhysics = kaca.pillPhysics,
                                        reduceMotion = kaca.kurangiAnimasi
                                    )
                                    onSelect(item.route)
                                },
                            contentAlignment = Alignment.Center
                        ) {
                            Column(
                                horizontalAlignment = Alignment.CenterHorizontally,
                                verticalArrangement = Arrangement.Center
                            ) {
                                Box {
                                    Icon(
                                        imageVector = item.icon,
                                        contentDescription = item.label,
                                        tint = fgColor,
                                        modifier = Modifier.size(if (isCompact) 18.dp else 20.dp)
                                    )
                                    if (item.badgeCount > 0) {
                                        Box(
                                            modifier = Modifier
                                                .align(Alignment.TopEnd)
                                                .offset(x = 9.dp, y = (-4).dp)
                                                .height(17.dp)
                                                .clip(CircleShape)
                                                .background(c.limeAction)
                                                .padding(horizontal = 5.dp),
                                            contentAlignment = Alignment.Center
                                        ) {
                                            Text(
                                                text = item.badgeCount.toString(),
                                                style = PastiCuanTheme.typography.tag.copy(
                                                    fontSize = 10.sp,
                                                    fontWeight = FontWeight.Bold
                                                ),
                                                color = c.onLimeInk
                                            )
                                        }
                                    }
                                }
                                Spacer(Modifier.height(1.dp))
                                Text(
                                    text = item.label,
                                    style = PastiCuanTheme.typography.tag.copy(
                                        fontSize = if (isCompact) 10.sp else 10.5.sp,
                                        fontWeight = if (isTargetSelected) {
                                            if (kaca.liquidGlass && !c.isDark) FontWeight.Bold else FontWeight.SemiBold
                                        } else FontWeight.Normal
                                    ),
                                    color = fgColor,
                                    maxLines = 1
                                )
                            }
                        }
                    }
                }

                LiftedGlassSelectionPill(
                    motion = motion,
                    tabWidthDp = itemWidth,
                    pillHeightDp = pillHeight,
                    barGlass = barGlass,
                    tabRow = tabRow,
                    modifier = Modifier.align(Alignment.CenterStart)
                )
            }
        }
    }
}
