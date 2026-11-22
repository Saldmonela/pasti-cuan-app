package id.pasticuan.wallet.ui.components

import androidx.compose.foundation.gestures.awaitEachGesture
import androidx.compose.foundation.gestures.awaitFirstDown
import androidx.compose.foundation.gestures.awaitHorizontalTouchSlopOrCancellation
import androidx.compose.foundation.gestures.horizontalDrag
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.ui.Modifier
import androidx.compose.ui.composed
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.graphics.BlendMode
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.TileMode
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.layout
import androidx.compose.ui.unit.Constraints
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.DpOffset
import androidx.compose.ui.unit.dp
import id.pasticuan.wallet.ui.components.backdrop.backdrops.LayerBackdrop
import id.pasticuan.wallet.ui.components.backdrop.drawBackdrop
import id.pasticuan.wallet.ui.components.backdrop.effects.blur
import id.pasticuan.wallet.ui.components.backdrop.effects.lens
import id.pasticuan.wallet.ui.components.backdrop.highlight.Highlight
import id.pasticuan.wallet.ui.components.backdrop.highlight.HighlightStyle
import id.pasticuan.wallet.ui.components.backdrop.isRenderEffectSupported
import id.pasticuan.wallet.ui.components.backdrop.isRuntimeShaderSupported
import id.pasticuan.wallet.ui.components.backdrop.shadow.Shadow
import id.pasticuan.wallet.ui.theme.PastiCuanTheme
import kotlin.math.abs
import kotlin.math.roundToInt

/**
 * Kaca pegas untuk kontrol segmen & tab saring (paritas .seg/.tabs + .lg-glass di globals.css):
 * kapsul hijau diam tetap terlihat, kaca terangkat menambah lensa, pelangi RGB, tint hijau, dan tepi berkilau
 * saat di-tap, ditahan, atau digeser jari. Melepas jari memilih opsi terdekat.
 */

/** Posisi fraksional (indeks) dari koordinat x berdasarkan titik tengah tiap opsi. Paritas clientXToTabPos di Web. */
fun posisiDariX(x: Float, centers: List<Float>): Float {
    if (centers.size <= 1) return 0f
    val last = centers.lastIndex
    if (x <= centers[0]) return 0f
    if (x >= centers[last]) return last.toFloat()
    for (i in 0 until last) {
        if (x <= centers[i + 1]) {
            val span = (centers[i + 1] - centers[i]).takeIf { it > 0f } ?: 1f
            return i + (x - centers[i]) / span
        }
    }
    return last.toFloat()
}

/** Interpolasi kiri & lebar kapsul di antara dua opsi sesuai posisi pegas (opsi boleh beda lebar). */
fun kapsulDiPosisi(pos: Float, lefts: List<Float>, widths: List<Float>): Pair<Float, Float> {
    if (lefts.isEmpty()) return 0f to 0f
    val p = pos.coerceIn(0f, lefts.lastIndex.toFloat())
    val i0 = p.toInt().coerceIn(0, lefts.lastIndex)
    val i1 = (i0 + 1).coerceAtMost(lefts.lastIndex)
    val t = p - i0
    val c0 = lefts[i0] + widths[i0] / 2f
    val c1 = lefts[i1] + widths[i1] / 2f
    val w = widths[i0] + (widths[i1] - widths[i0]) * t
    val cx = c0 + (c1 - c0) * t
    return (cx - w / 2f) to w
}

/** Indeks opsi yang sedang dibidik kapsul saat digeser, atau null bila tidak sedang digeser. */
fun GlassPillMotion.indeksBidikan(): Int? =
    if (isDragging) position.roundToInt().coerceIn(0, maxIndex) else null

/**
 * Gestur tahan-geser horizontal di trek segmen. Koordinat [centers] harus satu ruang dengan pointerInput ini
 * (di dalam padding trek). Tap biasa tetap ditangani clickable masing-masing opsi.
 */
fun Modifier.geserKapsulSegmen(
    motion: GlassPillMotion,
    centers: () -> List<Float>,
    aktif: Boolean,
    reduceMotion: Boolean,
    onTick: () -> Unit,
    onPilih: (Int) -> Unit
): Modifier = composed {
    val pilih by rememberUpdatedState(onPilih)
    val tick by rememberUpdatedState(onTick)
    pointerInput(aktif, reduceMotion, motion) {
        if (!aktif) return@pointerInput
        awaitEachGesture {
            val down = awaitFirstDown(requireUnconsumed = false)
            var frac = posisiDariX(down.position.x, centers())
            var mulai = false
            val over = awaitHorizontalTouchSlopOrCancellation(down.id) { change, _ ->
                mulai = true
                frac = posisiDariX(change.position.x, centers())
                change.consume()
            }
            if (over == null || !mulai) return@awaitEachGesture

            motion.startDrag()
            motion.dragTo(frac)
            var terakhir = frac.roundToInt()
            val selesai = horizontalDrag(over.id) { change ->
                val f = posisiDariX(change.position.x, centers())
                motion.dragTo(f)
                val s = f.roundToInt()
                if (s != terakhir) {
                    terakhir = s
                    tick()
                }
                change.consume()
            }
            val akhir = if (selesai) motion.position.roundToInt().coerceIn(0, motion.maxIndex) else motion.targetIndex
            motion.release(akhir, reduceMotion = reduceMotion)
            if (selesai) pilih(akhir)
        }
    }
}

/**
 * Kaca terangkat di atas kapsul segmen. [isi] merekam trek (kapsul hijau + label) supaya lensa
 * membiaskan label di bawahnya. [leftPx]/[widthPx]/[heightPx] adalah ukuran kapsul diam saat ini.
 */
@Composable
fun KacaSegmenTerangkat(
    motion: GlassPillMotion,
    isi: LayerBackdrop,
    leftPx: Float,
    widthPx: Float,
    heightPx: Float,
    modifier: Modifier = Modifier,
    radius: Dp = 24.dp
) {
    val c = PastiCuanTheme.colors
    val kaca = PastiCuanTheme.kaca
    if (!kaca.liquidGlass || !kaca.pillPhysics || kaca.kurangiAnimasi) return
    val presence = motion.glassPresence
    if (presence <= 0.015f || widthPx < 1f || !isRenderEffectSupported()) return

    val useFrostOnly = kaca.modeRingan || !isRuntimeShaderSupported()
    val shape = RoundedCornerShape(radius)
    val tint = kacaHijauTint(c.isDark, presence, kuatTerang = 0.20f, kuatGelap = 0.13f)
    val rim = kacaHijauRim(c.isDark, presence)
    val specular = Color.White.copy(alpha = (if (c.isDark) 0.50f else 0.90f) * presence)

    Box(
        modifier = modifier
            .layout { measurable, _ ->
                val growW = 8.dp.toPx() * presence
                val growH = 6.dp.toPx() * presence
                val w = (widthPx + growW).roundToInt().coerceAtLeast(1)
                val h = (heightPx + growH).roundToInt().coerceAtLeast(1)
                val placeable = measurable.measure(Constraints.fixed(w, h))
                layout(w, h) {
                    placeable.place((leftPx - growW / 2f).roundToInt(), (-growH / 2f).roundToInt())
                }
            }
            .drawBackdrop(
                backdrop = isi,
                shape = { shape },
                layerBlock = {
                    alpha = presence
                    scaleX = 1f + abs(motion.squashFactor) * 0.04f
                },
                effects = {
                    if (useFrostOnly) {
                        val b = 4.dp.toPx() * presence
                        if (b > 0.5f) blur(radius = b, edgeTreatment = TileMode.Clamp)
                    } else {
                        lens(
                            refractionHeight = (8.dp.toPx() * presence).coerceAtLeast(1f),
                            refractionAmount = (10.dp.toPx() * presence).coerceAtLeast(1f),
                            depthEffect = true,
                            chromaticAberration = true
                        )
                    }
                },
                highlight = {
                    Highlight(
                        width = 1.dp,
                        blurRadius = 0.5.dp,
                        alpha = presence,
                        style = HighlightStyle.Default(
                            color = specular,
                            blendMode = BlendMode.Plus,
                            angle = 45f,
                            falloff = 1.1f
                        )
                    )
                },
                shadow = {
                    Shadow(
                        radius = 10.dp * presence,
                        offset = DpOffset(0.dp, 4.dp * presence),
                        color = Color.Black.copy(alpha = (if (c.isDark) 0.55f else 0.22f) * presence),
                        alpha = 1f
                    )
                },
                backdropScale = 1f,
                onDrawSurface = {
                    drawRect(brush = tint)
                    drawRoundRect(
                        color = rim,
                        cornerRadius = CornerRadius(radius.toPx().coerceAtMost(size.height / 2f)),
                        style = Stroke(width = 1.dp.toPx())
                    )
                }
            )
    )
}
