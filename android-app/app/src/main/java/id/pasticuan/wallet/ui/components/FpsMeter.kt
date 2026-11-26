package id.pasticuan.wallet.ui.components

import android.app.Activity
import android.content.Context
import android.content.ContextWrapper
import android.os.Build
import android.os.Handler
import android.os.HandlerThread
import android.os.Looper
import android.view.FrameMetrics
import android.view.Window
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import java.util.Locale
import java.util.concurrent.atomic.AtomicReference
import kotlin.math.roundToInt

private tailrec fun Context.findActivity(): Activity? = when (this) {
    is Activity -> this
    is ContextWrapper -> baseContext.findActivity()
    else -> null
}

private data class FrameSample(
    val arrivalNanos: Long,
    val totalNanos: Long,
    val janky: Boolean
)

@Composable
fun FpsMeterOverlay(modifier: Modifier = Modifier) {
    val view = LocalView.current
    val activity = remember(view.context) { view.context.findActivity() } ?: return
    val window = activity.window ?: return

    var label by remember { mutableStateOf("FPS: diam (gulir untuk ukur)") }

    DisposableEffect(window) {
        val thread = HandlerThread("pc-fps").apply { start() }
        val bgHandler = Handler(thread.looper)
        val mainHandler = Handler(Looper.getMainLooper())
        val samples = ArrayDeque<FrameSample>()
        var lastPostNanos = 0L
        val refreshHz = AtomicReference(view.display?.refreshRate?.takeIf { it > 0f } ?: 60f)

        val listener = Window.OnFrameMetricsAvailableListener { _, frameMetrics, _ ->
            val nowNanos = System.nanoTime()
            val totalNs = frameMetrics.getMetric(FrameMetrics.TOTAL_DURATION)
            val hzSnapshot = refreshHz.get()
            val budgetNs = 1_000_000_000.0 / hzSnapshot
            val deadlineNs = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                frameMetrics.getMetric(FrameMetrics.DEADLINE).takeIf { it > 0L } ?: budgetNs.toLong()
            } else {
                budgetNs.toLong()
            }
            val janky = totalNs > deadlineNs

            samples.addLast(FrameSample(nowNanos, totalNs, janky))
            val cutoff = nowNanos - 1_000_000_000L
            while (samples.isNotEmpty() && samples.first().arrivalNanos < cutoff) {
                samples.removeFirst()
            }

            if (nowNanos - lastPostNanos >= 500_000_000L) {
                lastPostNanos = nowNanos
                val count = samples.size
                val nextLabel = if (count < 6) {
                    "FPS: diam (gulir untuk ukur)"
                } else {
                    var jankCount = 0
                    var maxNs = 0L
                    for (s in samples) {
                        if (s.janky) jankCount++
                        if (s.totalNanos > maxNs) maxNs = s.totalNanos
                    }
                    val pct = (jankCount * 100.0 / count).roundToInt()
                    val maxMs = String.format(Locale.US, "%.1f", maxNs / 1_000_000.0)
                    val hz = hzSnapshot.roundToInt()
                    "$count fps · $hz Hz · jank $pct% · maks $maxMs ms"
                }
                mainHandler.post {
                    val liveHz = view.display?.refreshRate?.takeIf { it > 0f }
                    if (liveHz != null) refreshHz.set(liveHz)
                    if (label != nextLabel) {
                        label = nextLabel
                    }
                }
            }
        }

        window.addOnFrameMetricsAvailableListener(listener, bgHandler)
        onDispose {
            runCatching { window.removeOnFrameMetricsAvailableListener(listener) }
            mainHandler.removeCallbacksAndMessages(null)
            thread.quitSafely()
        }
    }

    Box(
        modifier = modifier
            .statusBarsPadding()
            .padding(top = 4.dp, end = 8.dp)
            .clip(RoundedCornerShape(999.dp))
            .background(Color.Black.copy(alpha = 0.70f))
            .padding(horizontal = 10.dp, vertical = 4.dp)
    ) {
        Text(
            text = label,
            color = Color.White,
            fontSize = 11.sp,
            fontWeight = FontWeight.Medium,
            fontFamily = FontFamily.Monospace
        )
    }
}
