package id.pasticuan.wallet.ui.components

import android.graphics.Paint
import android.graphics.Typeface
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.CubicBezierEasing
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.gestures.awaitEachGesture
import androidx.compose.foundation.gestures.awaitFirstDown
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.clipRect
import androidx.compose.ui.graphics.lerp
import androidx.compose.ui.graphics.nativeCanvas
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.res.ResourcesCompat
import id.pasticuan.wallet.R
import id.pasticuan.wallet.domain.util.Formatters
import id.pasticuan.wallet.ui.theme.PastiCuanTheme
import kotlin.math.abs
import kotlin.math.ceil
import kotlin.math.floor
import kotlin.math.max
import kotlin.math.min

data class TitikGrafikUi(
    val x: Long,
    val nilai: Double,
    val nilai2: Double? = null,
    val ditandai: Boolean = false
)

private val NICE_STEPS = listOf(0.5, 1.0, 2.0, 5.0, 10.0, 20.0, 25.0, 50.0, 100.0)

private fun niceStep(span: Double): Double =
    NICE_STEPS.firstOrNull { span / it <= 14.0 } ?: ceil(span / 10.0)

private fun fmtPctAxis(v: Double): String {
    if (abs(v) < 1e-9) return "0%"
    val sign = if (v > 0) "+" else Formatters.MINUS
    val a = abs(v)
    val isInt = abs(a - a.toLong().toDouble()) < 1e-9
    val num = if (isInt) a.toLong().toString() else String.format("%.1f", a).replace(".", ",")
    return "$sign$num%"
}

@Composable
fun ChartCanvas(
    titik: List<TitikGrafikUi>,
    aktifIndex: Int?,
    onScrubIndex: (Int?) -> Unit,
    isPersenMode: Boolean,
    chartKey: String,
    accessibilityLabel: String,
    modifier: Modifier = Modifier,
    formatNilai: ((Double) -> String)? = null
) {
    val c = PastiCuanTheme.colors
    val kaca = PastiCuanTheme.kaca
    val context = LocalContext.current
    val density = LocalDensity.current
    val haptic = LocalHapticFeedback.current
    val currentOnScrub by rememberUpdatedState(onScrubIndex)
    val currentTitik by rememberUpdatedState(titik)

    val interSemiBold = remember(context) {
        runCatching { ResourcesCompat.getFont(context, R.font.inter_semibold) }.getOrNull()
            ?: Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
    }

    val drawProgress = remember { Animatable(1f) }
    LaunchedEffect(chartKey) {
        if (kaca.kurangiAnimasi) {
            drawProgress.snapTo(1f)
        } else {
            drawProgress.snapTo(0f)
            drawProgress.animateTo(
                targetValue = 1f,
                animationSpec = tween(
                    durationMillis = 700,
                    easing = CubicBezierEasing(0.16f, 1f, 0.3f, 1f)
                )
            )
        }
    }

    val lastIdx = remember { mutableStateOf<Int?>(null) }

    val axisPaint = remember(c.inkMuted, density) {
        Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = c.inkMuted.toArgb()
            textSize = with(density) { 10.5.sp.toPx() }
            textAlign = Paint.Align.RIGHT
            typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
        }
    }

    val hiLoHaloPaint = remember(c.card, density, interSemiBold) {
        Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = c.card.toArgb()
            textSize = with(density) { 10.5.sp.toPx() }
            typeface = interSemiBold
            fontFeatureSettings = "tnum"
            style = Paint.Style.STROKE
            strokeWidth = with(density) { 3.dp.toPx() }
            strokeJoin = Paint.Join.ROUND
            strokeCap = Paint.Cap.ROUND
        }
    }

    val hiLoTextPaint = remember(c.ink, c.inkMuted, density, interSemiBold) {
        Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = lerp(c.inkMuted, c.ink, 0.86f).toArgb()
            textSize = with(density) { 10.5.sp.toPx() }
            typeface = interSemiBold
            fontFeatureSettings = "tnum"
            style = Paint.Style.FILL
        }
    }

    Canvas(
        modifier = modifier
            .fillMaxWidth()
            .height(148.dp)
            .semantics { contentDescription = accessibilityLabel }
            .pointerInput(isPersenMode) {
                val thresholdPx = 6.dp.toPx()
                val padLeft = 4.dp.toPx()
                val padRight = if (isPersenMode) 42.dp.toPx() else 4.dp.toPx()

                fun nearestIndex(px: Float): Int {
                    val pts = currentTitik
                    if (pts.size <= 1) return 0
                    val plotW = (size.width - padLeft - padRight).coerceAtLeast(1f)
                    val x0 = pts.first().x
                    val span = (pts.last().x - x0).coerceAtLeast(1L)
                    val targetMs = x0 + (((px - padLeft) / plotW).coerceIn(0f, 1f) * span.toDouble()).toLong()
                    var best = 0
                    var bestDiff = abs(pts[0].x - targetMs)
                    for (k in 1..pts.lastIndex) {
                        val diff = abs(pts[k].x - targetMs)
                        if (diff < bestDiff) {
                            best = k
                            bestDiff = diff
                        }
                    }
                    return best
                }

                awaitEachGesture {
                    val down = awaitFirstDown(requireUnconsumed = false)
                    val startX = down.position.x
                    val startY = down.position.y
                    var scrubbing = false
                    lastIdx.value = null

                    while (true) {
                        val event = awaitPointerEvent()
                        val change = event.changes.firstOrNull { it.id == down.id } ?: break
                        if (!change.pressed) break

                        if (!scrubbing) {
                            val dx = abs(change.position.x - startX)
                            val dy = abs(change.position.y - startY)
                            // NF-13: Gerakan vertikal tetap menggulir halaman, hanya horizontal yg mengaktifkan scrub
                            if (dx >= thresholdPx && dx > dy) {
                                scrubbing = true
                            }
                        }

                        if (scrubbing) {
                            change.consume()
                            val idx = nearestIndex(change.position.x)
                            if (idx != lastIdx.value) {
                                lastIdx.value = idx
                                val isTx = currentTitik.getOrNull(idx)?.ditandai == true
                                haptic.performHapticFeedback(
                                    if (isTx) HapticFeedbackType.LongPress else HapticFeedbackType.TextHandleMove
                                )
                                currentOnScrub(idx)
                            }
                        }
                    }

                    if (scrubbing) {
                        lastIdx.value = null
                        currentOnScrub(null)
                    }
                }
            }
    ) {
        if (titik.isEmpty()) return@Canvas
        val padTop = 14.dp.toPx()
        val padBottom = 10.dp.toPx()
        val padLeft = 4.dp.toPx()
        val padRight = if (isPersenMode) 42.dp.toPx() else 4.dp.toPx()
        val plotW = (size.width - padLeft - padRight).coerceAtLeast(1f)
        val plotH = (size.height - padTop - padBottom).coerceAtLeast(1f)

        val l = titik.lastIndex
        val dua = titik.any { it.nilai2 != null }
        val v1 = titik.map { it.nilai }
        val v2 = titik.map { it.nilai2 ?: it.nilai }
        val semua = if (isPersenMode) (v1 + v2 + 0.0) else v1

        val rawLo = semua.minOrNull() ?: 0.0
        val rawHi = semua.maxOrNull() ?: 1.0
        var lo = rawLo
        var hi = rawHi
        val ticks = mutableListOf<Double>()

        if (isPersenMode) {
            val step = niceStep((rawHi - rawLo).let { if (it == 0.0) 1.0 else it })
            val hiTick = if (rawHi > 0) ceil(rawHi / step) * step else 0.0
            val loTick = if (rawLo < 0) floor(rawLo / step) * step else 0.0
            hi = max(rawHi, hiTick)
            lo = min(rawLo, loTick)
            ticks.add(0.0)
            if (hiTick > 0) ticks.add(hiTick)
            if (loTick < 0) ticks.add(loTick)
        }

        val margin = if (isPersenMode) 0.0 else {
            val diff = hi - lo
            if (diff != 0.0) diff * 0.1 else (if (abs(hi) != 0.0) abs(hi) * 0.05 else 1.0)
        }

        val x0 = titik.first().x
        val span = (titik.last().x - x0)
        val denomY = (hi - lo + 2.0 * margin).let { if (it == 0.0) 1.0 else it }

        fun mapX(idx: Int): Float =
            if (l > 0 && span > 0L) {
                padLeft + (((titik[idx].x - x0).toDouble() / span.toDouble()) * plotW).toFloat()
            } else {
                padLeft + plotW / 2f
            }

        fun mapY(value: Double): Float =
            padTop + (plotH * (1.0 - (value - lo + margin) / denomY)).toFloat()

        // Sumbu 0% & persen kanan (mode Bandingkan)
        if (isPersenMode) {
            val y0 = mapY(0.0)
            drawLine(
                color = c.hairline,
                start = Offset(padLeft, y0),
                end = Offset(size.width - padRight + 4.dp.toPx(), y0),
                strokeWidth = 1.dp.toPx()
            )
            ticks.filter { it == 0.0 || abs(mapY(it) - y0) >= 16.dp.toPx() }.forEach { tick ->
                val ty = mapY(tick) + 4.dp.toPx()
                drawContext.canvas.nativeCanvas.drawText(
                    fmtPctAxis(tick),
                    size.width - 2.dp.toPx(),
                    ty,
                    axisPaint
                )
            }
        }

        val linePath1 = Path()
        val linePath2 = Path()
        val areaPath = Path()

        for (k in 0..l) {
            val px = mapX(k)
            val py1 = mapY(v1[k])
            val py2 = mapY(v2[k])
            if (k == 0) {
                linePath1.moveTo(px, py1)
                linePath2.moveTo(px, py2)
                areaPath.moveTo(px, py1)
            } else {
                linePath1.lineTo(px, py1)
                linePath2.lineTo(px, py2)
                areaPath.lineTo(px, py1)
            }
        }
        if (!isPersenMode && l > 0) {
            areaPath.lineTo(mapX(l), size.height - padBottom)
            areaPath.lineTo(mapX(0), size.height - padBottom)
            areaPath.close()
        }

        val clipRight = padLeft + plotW * drawProgress.value
        clipRect(left = 0f, top = 0f, right = clipRight + 6.dp.toPx(), bottom = size.height) {
            if (!isPersenMode && l > 0) {
                drawPath(
                    path = areaPath,
                    brush = Brush.verticalGradient(
                        colors = listOf(c.forestInk.copy(alpha = 0.16f), c.forestInk.copy(alpha = 0f)),
                        startY = padTop,
                        endY = size.height - padBottom
                    )
                )
            }
            if (dua) {
                drawPath(
                    path = linePath2,
                    color = c.inkMuted,
                    style = Stroke(
                        width = 2.dp.toPx(),
                        cap = StrokeCap.Round,
                        join = StrokeJoin.Round,
                        pathEffect = PathEffect.dashPathEffect(floatArrayOf(5.dp.toPx(), 4.dp.toPx()), 0f)
                    )
                )
            }
            drawPath(
                path = linePath1,
                color = c.forestInk,
                style = Stroke(width = 2.dp.toPx(), cap = StrokeCap.Round, join = StrokeJoin.Round)
            )
        }

        if (drawProgress.value >= 0.98f) {
            // Penanda titik transaksi (AC-12-01)
            for (k in 0..l) {
                if (titik[k].ditandai) {
                    val center = Offset(mapX(k), mapY(v1[k]))
                    drawCircle(color = c.card, radius = 4.dp.toPx(), center = center)
                    drawCircle(
                        color = c.forestInk,
                        radius = 4.dp.toPx(),
                        center = center,
                        style = Stroke(width = 2.dp.toPx())
                    )
                }
            }

            if (aktifIndex == null) {
                if (dua) {
                    drawCircle(
                        color = c.inkMuted,
                        radius = 3.dp.toPx(),
                        center = Offset(mapX(l), mapY(v2[l]))
                    )
                }
                drawCircle(
                    color = c.forestInk,
                    radius = 3.5.dp.toPx(),
                    center = Offset(mapX(l), mapY(v1[l]))
                )
            }

            // Penanda nilai tertinggi & terendah pada rentang aktif (gaya garis penunjuk Bitget)
            if (titik.size >= 2 && formatNilai != null) {
                var hiIdx = 0
                var loIdx = 0
                for (k in 1..l) {
                    if (v1[k] > v1[hiIdx]) hiIdx = k
                    if (v1[k] < v1[loIdx]) loIdx = k
                }
                if (hiIdx != loIdx) {
                    val teksHi = formatNilai(v1[hiIdx])
                    val teksLo = formatNilai(v1[loIdx])
                    val yHi = mapY(v1[hiIdx])
                    val yLo = mapY(v1[loIdx])
                    if (teksHi != teksLo && abs(yLo - yHi) >= 12.dp.toPx()) {
                        for ((idx, teks) in listOf(hiIdx to teksHi, loIdx to teksLo)) {
                            val vx = mapX(idx)
                            val vy = mapY(v1[idx])
                            val goRight = vx <= padLeft + plotW / 2f
                            val dir = if (goRight) 1f else -1f
                            val hasDot = titik[idx].ditandai || (idx == l && aktifIndex == null)
                            val startPad = when {
                                titik[idx].ditandai -> 5.5.dp.toPx()
                                idx == l && aktifIndex == null -> 5.dp.toPx()
                                else -> 1.dp.toPx()
                            }
                            val x1 = vx + dir * startPad
                            val x2 = vx + dir * (if (hasDot) startPad + 12.dp.toPx() else 14.dp.toPx())
                            val tx = x2 + dir * 3.dp.toPx()

                            drawLine(
                                color = c.inkMuted.copy(alpha = 0.75f),
                                start = Offset(x1, vy),
                                end = Offset(x2, vy),
                                strokeWidth = 1.dp.toPx()
                            )

                            val align = if (goRight) Paint.Align.LEFT else Paint.Align.RIGHT
                            hiLoHaloPaint.textAlign = align
                            hiLoTextPaint.textAlign = align
                            val baselineY = vy - (hiLoTextPaint.ascent() + hiLoTextPaint.descent()) / 2f
                            drawContext.canvas.nativeCanvas.drawText(teks, tx, baselineY, hiLoHaloPaint)
                            drawContext.canvas.nativeCanvas.drawText(teks, tx, baselineY, hiLoTextPaint)
                        }
                    }
                }
            }

            if (aktifIndex != null && aktifIndex in 0..l) {
                val sx = mapX(aktifIndex)
                drawLine(
                    color = c.inkMuted,
                    start = Offset(sx, padTop - 6.dp.toPx()),
                    end = Offset(sx, size.height - padBottom),
                    strokeWidth = 1.dp.toPx(),
                    pathEffect = PathEffect.dashPathEffect(floatArrayOf(3.dp.toPx(), 3.dp.toPx()), 0f)
                )
                if (dua) {
                    val c2 = Offset(sx, mapY(v2[aktifIndex]))
                    drawCircle(color = c.card, radius = 6.dp.toPx(), center = c2)
                    drawCircle(color = c.inkMuted, radius = 4.5.dp.toPx(), center = c2)
                }
                val c1 = Offset(sx, mapY(v1[aktifIndex]))
                drawCircle(color = c.card, radius = 7.dp.toPx(), center = c1)
                drawCircle(color = c.forestInk, radius = 5.5.dp.toPx(), center = c1)
            }
        }
    }
}
