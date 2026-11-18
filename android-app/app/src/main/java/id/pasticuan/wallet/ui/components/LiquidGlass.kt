package id.pasticuan.wallet.ui.components

import android.os.Build
import android.view.WindowManager
import androidx.annotation.ChecksSdkIntAtLeast
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.asPaddingValues
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.SideEffect
import androidx.compose.runtime.Stable
import androidx.compose.runtime.compositionLocalOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.composed
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.drawWithContent
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.isSpecified
import androidx.compose.ui.graphics.BlendMode
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.CompositingStrategy
import androidx.compose.ui.graphics.RectangleShape
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.graphics.TileMode
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.nestedscroll.NestedScrollConnection
import androidx.compose.ui.input.nestedscroll.NestedScrollSource
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.DpOffset
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.DialogWindowProvider
import id.pasticuan.wallet.ui.components.backdrop.Backdrop
import id.pasticuan.wallet.ui.components.backdrop.backdrops.LayerBackdrop
import id.pasticuan.wallet.ui.components.backdrop.drawBackdrop
import id.pasticuan.wallet.ui.components.backdrop.effects.blur
import id.pasticuan.wallet.ui.components.backdrop.effects.colorControls
import id.pasticuan.wallet.ui.components.backdrop.effects.lens
import id.pasticuan.wallet.ui.components.backdrop.highlight.Highlight
import id.pasticuan.wallet.ui.components.backdrop.highlight.HighlightStyle
import id.pasticuan.wallet.ui.components.backdrop.isRenderEffectSupported
import id.pasticuan.wallet.ui.components.backdrop.isRuntimeShaderSupported
import id.pasticuan.wallet.ui.components.backdrop.shadow.Shadow
import id.pasticuan.wallet.ui.theme.PastiCuanTheme

private const val GLASS_RESOLUTION_SCALE = 0.33f
private const val FROST_RESOLUTION_SCALE = 0.25f

val LocalAppBackdrop = compositionLocalOf<Backdrop?> { null }
val LocalGlassExport = compositionLocalOf<LayerBackdrop?> { null }
val LocalScrollGlassState = compositionLocalOf<ScrollGlassTracker?> { null }

@ChecksSdkIntAtLeast(api = Build.VERSION_CODES.S)
fun isGlassSupported(): Boolean = isRenderEffectSupported()

@ChecksSdkIntAtLeast(api = Build.VERSION_CODES.TIRAMISU)
fun isLensSupported(): Boolean = isRuntimeShaderSupported()

@Stable
class ScrollGlassTracker {
    var scrollOffsetPx by mutableFloatStateOf(0f)
    var isNavCompact by mutableStateOf(false)

    internal fun reset() {
        scrollOffsetPx = 0f
        isNavCompact = false
    }
}

@Composable
fun rememberScrollGlassTracker(routeKey: Any): Pair<ScrollGlassTracker, NestedScrollConnection> {
    val density = LocalDensity.current
    val tracker = remember { ScrollGlassTracker() }
    val compactEnterPx = with(density) { 56.dp.toPx() }
    val compactExitTopPx = with(density) { 20.dp.toPx() }
    val gestureRevealPx = with(density) { 10.dp.toPx() }

    LaunchedEffect(routeKey) {
        tracker.reset()
    }

    val connection = remember(compactEnterPx, compactExitTopPx, gestureRevealPx) {
        object : NestedScrollConnection {
            override fun onPostScroll(
                consumed: Offset,
                available: Offset,
                source: NestedScrollSource
            ): Offset {
                val dy = consumed.y
                if (dy != 0f) {
                    val nextOffset = (tracker.scrollOffsetPx - dy).coerceAtLeast(0f)
                    tracker.scrollOffsetPx = nextOffset
                    if (dy < -gestureRevealPx && nextOffset > compactEnterPx) {
                        tracker.isNavCompact = true
                    } else if (dy > gestureRevealPx || nextOffset < compactExitTopPx) {
                        tracker.isNavCompact = false
                    }
                } else if (available.y > 0f && source == NestedScrollSource.UserInput) {
                    // User dragged past top edge -> reset accumulated scroll drift cleanly
                    tracker.scrollOffsetPx = 0f
                    tracker.isNavCompact = false
                }
                return Offset.Zero
            }
        }
    }
    return tracker to connection
}

/**
 * Styling parameters for crystal-neutral Pasti Cuan Liquid Glass surfaces.
 */
@Immutable
data class GlassSurfaceSpec(
    val shape: Shape = RoundedCornerShape(999.dp),
    val blurDp: Dp = 6.dp,
    val frostBlurDp: Dp = 18.dp,
    val enableLens: Boolean = true,
    val lensHeightFraction: Float = 0.45f,
    val lensAmountFraction: Float = 0.48f,
    val maxLensDp: Dp = 28.dp,
    val lightCrystalAlpha: Float = 0.38f,
    val darkCrystalAlpha: Float = 0.50f,
    val lightFrostAlpha: Float = 0.72f,
    val darkFrostAlpha: Float = 0.74f,
    val shadowRadius: Dp = 18.dp,
    val shadowOffsetY: Dp = 8.dp
)

/**
 * Applies BitChord-grade real GPU Liquid Glass (RenderEffect blur + AGSL rounded-rect
 * refraction with dispersion & directional specular highlight) over [LocalAppBackdrop],
 * honoring Mode Ringan Kaca (frosted blur without lens shader) and Liquid Glass toggle.
 */
fun Modifier.pastiCuanLiquidGlass(
    spec: GlassSurfaceSpec = GlassSurfaceSpec(),
    exportedBackdrop: LayerBackdrop? = null
): Modifier = composed {
    val c = PastiCuanTheme.colors
    val kaca = PastiCuanTheme.kaca
    val backdrop = LocalAppBackdrop.current

    if (!kaca.liquidGlass) {
        val solidBorder = if (c.cardBorder != Color.Transparent) c.cardBorder else c.hairline
        return@composed this
            .shadow(
                elevation = if (c.isDark) 8.dp else 4.dp,
                shape = spec.shape,
                ambientColor = Color.Black.copy(alpha = 0.25f),
                spotColor = Color.Black.copy(alpha = 0.25f)
            )
            .background(c.card, spec.shape)
            .border(1.dp, solidBorder, spec.shape)
    }

    if (backdrop == null || !isGlassSupported()) {
        val fallbackBg = if (c.isDark) {
            Color(0xFF171A17).copy(alpha = 0.90f)
        } else {
            Color.White.copy(alpha = 0.90f)
        }
        val fallbackBorder = if (c.isDark) {
            Color.White.copy(alpha = 0.14f)
        } else {
            Color.Black.copy(alpha = 0.08f)
        }
        return@composed this
            .shadow(
                elevation = if (c.isDark) 10.dp else 6.dp,
                shape = spec.shape,
                ambientColor = Color.Black.copy(alpha = 0.22f),
                spotColor = Color.Black.copy(alpha = 0.22f)
            )
            .background(fallbackBg, spec.shape)
            .border(1.dp, fallbackBorder, spec.shape)
    }

    val useFrostOnly = kaca.modeRingan || !spec.enableLens || !isLensSupported()
    val resolutionScale = if (useFrostOnly) FROST_RESOLUTION_SCALE else GLASS_RESOLUTION_SCALE
    val maxLensPx = with(LocalDensity.current) { spec.maxLensDp.toPx() }
    val blurDp = if (useFrostOnly) spec.frostBlurDp else spec.blurDp

    val surfaceBrush = if (c.isDark) {
        if (useFrostOnly) {
            Brush.verticalGradient(
                listOf(
                    Color(0xFF202320).copy(alpha = spec.darkFrostAlpha),
                    Color(0xFF151815).copy(alpha = (spec.darkFrostAlpha + 0.06f).coerceAtMost(0.95f))
                )
            )
        } else {
            Brush.verticalGradient(
                listOf(
                    Color(0xFF232623).copy(alpha = (spec.darkCrystalAlpha - 0.06f).coerceAtLeast(0.24f)),
                    Color(0xFF131613).copy(alpha = (spec.darkCrystalAlpha + 0.04f).coerceAtMost(0.75f))
                )
            )
        }
    } else {
        if (useFrostOnly) {
            Brush.verticalGradient(
                listOf(
                    Color.White.copy(alpha = (spec.lightFrostAlpha + 0.06f).coerceAtMost(0.94f)),
                    Color(0xFFF6F8F5).copy(alpha = spec.lightFrostAlpha)
                )
            )
        } else {
            Brush.verticalGradient(
                listOf(
                    Color.White.copy(alpha = (spec.lightCrystalAlpha + 0.10f).coerceAtMost(0.68f)),
                    Color.White.copy(alpha = (spec.lightCrystalAlpha - 0.06f).coerceAtLeast(0.20f))
                )
            )
        }
    }

    val specularColor = if (c.isDark) {
        Color.White.copy(alpha = if (useFrostOnly) 0.26f else 0.36f)
    } else {
        Color.White.copy(alpha = if (useFrostOnly) 0.72f else 0.90f)
    }
    val shadowColor = if (c.isDark) {
        Color.Black.copy(alpha = 0.42f)
    } else {
        Color(0xFF0E0F0C).copy(alpha = 0.10f)
    }
    val rimBorder = if (c.isDark) {
        Color.White.copy(alpha = 0.14f)
    } else {
        Color.Black.copy(alpha = 0.05f)
    }

    this
        .drawBackdrop(
            backdrop = backdrop,
            shape = { spec.shape },
            effects = {
                colorControls(
                    brightness = 0f,
                    contrast = 1.0f,
                    saturation = if (useFrostOnly) 1.32f else 1.24f
                )
                val scaledBlurPx = blurDp.toPx() * resolutionScale
                if (scaledBlurPx > 0.5f) {
                    blur(radius = scaledBlurPx, edgeTreatment = TileMode.Clamp)
                }
                if (!useFrostOnly && size.isSpecified && size.width >= 1f && size.height >= 1f) {
                    val minSide = size.minDimension
                    val cap = maxLensPx * resolutionScale
                    val h = (minSide * spec.lensHeightFraction).coerceAtMost(cap)
                    val amt = (minSide * spec.lensAmountFraction).coerceAtMost(cap)
                    if (h >= 1f && amt >= 1f) {
                        lens(
                            refractionHeight = h,
                            refractionAmount = amt,
                            depthEffect = true,
                            chromaticAberration = true
                        )
                    }
                }
            },
            highlight = {
                Highlight(
                    width = if (useFrostOnly) 0.75.dp else 1.dp,
                    blurRadius = 0.5.dp,
                    alpha = 1f,
                    style = HighlightStyle.Default(
                        color = specularColor,
                        blendMode = BlendMode.Plus,
                        angle = 45f,
                        falloff = 1.15f
                    )
                )
            },
            shadow = {
                Shadow(
                    radius = spec.shadowRadius,
                    offset = DpOffset(0.dp, spec.shadowOffsetY),
                    color = shadowColor,
                    alpha = 1f
                )
            },
            exportedBackdrop = exportedBackdrop,
            backdropScale = resolutionScale,
            onDrawSurface = {
                drawRect(brush = surfaceBrush)
            }
        )
        .border(0.6.dp, rimBorder, spec.shape)
}

/**
 * Pure blur-only progressive top strip matching `.lg-prog-blur` in Web and BitChord's TopFadeBlur.
 * Renders stacked variable-radius blur bands with vertical DstIn mask fading cleanly to 0% alpha
 * and zero colored canvas fog, appearing subtly as the screen scrolls.
 */
@Composable
fun TopProgressiveBlur(
    visible: Boolean,
    modifier: Modifier = Modifier,
    extraHeight: Dp = 36.dp
) {
    val kaca = PastiCuanTheme.kaca
    val backdrop = LocalAppBackdrop.current
    if (!kaca.liquidGlass || !kaca.progressiveBlur || backdrop == null || !isGlassSupported()) {
        return
    }

    val statusBarTop = WindowInsets.statusBars.asPaddingValues().calculateTopPadding()
    val totalHeight = statusBarTop + extraHeight

    val targetAlpha = if (visible) 1f else 0f
    val animatedAlpha by animateFloatAsState(
        targetValue = targetAlpha,
        animationSpec = if (kaca.kurangiAnimasi) {
            tween(durationMillis = 0)
        } else {
            tween(durationMillis = 220)
        },
        label = "topProgressiveBlurAlpha"
    )
    if (animatedAlpha <= 0.01f) return

    Box(
        modifier = modifier
            .fillMaxWidth()
            .height(totalHeight)
            .alpha(animatedAlpha)
    ) {
        // 4 layered blur bands (heights 100%, 78%, 56%, 34% matching Web .lg-prog-blur)
        BlurFadeBand(
            backdrop = backdrop,
            height = totalHeight,
            blurRadiusDp = 2.5.dp,
            solidTopFraction = 0.25f
        )
        BlurFadeBand(
            backdrop = backdrop,
            height = totalHeight * 0.78f,
            blurRadiusDp = 5.5.dp,
            solidTopFraction = 0.28f
        )
        BlurFadeBand(
            backdrop = backdrop,
            height = totalHeight * 0.56f,
            blurRadiusDp = 11.dp,
            solidTopFraction = 0.32f
        )
        BlurFadeBand(
            backdrop = backdrop,
            height = totalHeight * 0.34f,
            blurRadiusDp = 19.dp,
            solidTopFraction = 0.40f
        )
    }
}

@Composable
private fun BoxScope.BlurFadeBand(
    backdrop: Backdrop,
    height: Dp,
    blurRadiusDp: Dp,
    solidTopFraction: Float
) {
    val maskBrush = remember(solidTopFraction) {
        Brush.verticalGradient(
            0f to Color.Black,
            solidTopFraction to Color.Black,
            (solidTopFraction + 0.42f).coerceAtMost(0.95f) to Color.Black.copy(alpha = 0.45f),
            1f to Color.Transparent
        )
    }

    Box(
        modifier = Modifier
            .align(Alignment.TopCenter)
            .fillMaxWidth()
            .height(height)
            .graphicsLayer {
                compositingStrategy = CompositingStrategy.Offscreen
            }
            .drawWithContent {
                drawContent()
                drawRect(
                    brush = maskBrush,
                    blendMode = BlendMode.DstIn
                )
            }
            .drawBackdrop(
                backdrop = backdrop,
                shape = { RectangleShape },
                effects = {
                    val radiusPx = blurRadiusDp.toPx() * FROST_RESOLUTION_SCALE
                    if (radiusPx > 0.5f) {
                        blur(radius = radiusPx, edgeTreatment = TileMode.Clamp)
                    }
                },
                highlight = null,
                shadow = null,
                backdropScale = FROST_RESOLUTION_SCALE
            )
    )
}

/**
 * Applies native Android 12+ background blur behind ModalBottomSheet dialogs when Liquid Glass is active
 * and ensures consistent modal container/scrim colors across all sheets.
 */
@Composable
fun ApplyLiquidSheetWindowBlur() {
    val kaca = PastiCuanTheme.kaca
    val view = LocalView.current
    SideEffect {
        val window = (view.parent as? DialogWindowProvider)?.window ?: return@SideEffect
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            if (kaca.liquidGlass) {
                window.addFlags(WindowManager.LayoutParams.FLAG_BLUR_BEHIND)
                window.attributes = window.attributes.apply {
                    blurBehindRadius = if (kaca.modeRingan) 22 else 28
                }
            } else {
                window.clearFlags(WindowManager.LayoutParams.FLAG_BLUR_BEHIND)
                window.attributes = window.attributes.apply {
                    blurBehindRadius = 0
                }
            }
        }
    }
}

@Composable
fun glassSheetContainerColor(): Color {
    val c = PastiCuanTheme.colors
    val kaca = PastiCuanTheme.kaca
    return when {
        !kaca.liquidGlass -> c.card
        c.isDark -> Color(0xFF191C19).copy(alpha = 0.94f)
        else -> Color(0xFFFFFFFF).copy(alpha = 0.94f)
    }
}

@Composable
fun glassSheetScrimColor(): Color {
    val c = PastiCuanTheme.colors
    return if (c.isDark) {
        Color.Black.copy(alpha = 0.58f)
    } else {
        Color(0xFF0E0F0C).copy(alpha = 0.36f)
    }
}
