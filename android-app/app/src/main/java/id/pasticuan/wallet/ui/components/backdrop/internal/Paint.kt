/*
 * Vendored from Kyant0/backdrop v2.0.0 (io.github.kyant0:backdrop)
 * https://github.com/Kyant0/backdrop — Copyright 2025 Kyant0, Apache License 2.0
 *
 * Vendored so the library ships as source with this app (binary AARs compiled
 * against older Compose broke at runtime) and to add a backdrop resolution
 * scale for cheaper effect rendering. KMP expect/actual declarations were
 * merged into this single Android source set. Package renamed accordingly.
 */
package id.pasticuan.wallet.ui.components.backdrop.internal

import android.graphics.BlurMaskFilter
import androidx.compose.ui.graphics.Paint
import id.pasticuan.wallet.ui.components.backdrop.RuntimeShader
import id.pasticuan.wallet.ui.components.backdrop.asAndroidRuntimeShader

private val blurMaskCache = HashMap<Float, BlurMaskFilter>()

internal fun Paint.blur(radius: Float) {
    val fp = this.asFrameworkPaint()
    fp.maskFilter =
        if (radius > 0f) blurMaskCache.getOrPut(radius) { BlurMaskFilter(radius, BlurMaskFilter.Blur.NORMAL) }
        else null
}

internal fun Paint.setRuntimeShader(runtimeShader: RuntimeShader?) {
    this.asFrameworkPaint().shader = runtimeShader?.asAndroidRuntimeShader()
}
