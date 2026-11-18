package id.pasticuan.wallet.ui.components

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.Stable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.BlendMode
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.TileMode
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.DpOffset
import androidx.compose.ui.unit.dp
import id.pasticuan.wallet.ui.components.backdrop.Backdrop
import id.pasticuan.wallet.ui.components.backdrop.backdrops.LayerBackdrop
import id.pasticuan.wallet.ui.components.backdrop.backdrops.rememberCombinedBackdrop
import id.pasticuan.wallet.ui.components.backdrop.drawBackdrop
import id.pasticuan.wallet.ui.components.backdrop.effects.blur
import id.pasticuan.wallet.ui.components.backdrop.effects.lens
import id.pasticuan.wallet.ui.components.backdrop.highlight.Highlight
import id.pasticuan.wallet.ui.components.backdrop.highlight.HighlightStyle
import id.pasticuan.wallet.ui.components.backdrop.isRenderEffectSupported
import id.pasticuan.wallet.ui.components.backdrop.isRuntimeShaderSupported
import id.pasticuan.wallet.ui.components.backdrop.shadow.Shadow
import id.pasticuan.wallet.ui.theme.PastiCuanTheme
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlin.math.abs

/**
 * 3-axis spring physics + acceleration squash-and-stretch driver for the Liquid Glass nav pill,
 * matching BitChord's GlassPillMotion and Pasti Cuan Web's pillMotion.ts.
 */
@Stable
class GlassPillMotion(
    private val scope: CoroutineScope,
    initialIndex: Int,
    itemCount: Int
) {
    private val clampedInit = initialIndex.coerceIn(0, (itemCount - 1).coerceAtLeast(0))
    private val positionAnim = Animatable(clampedInit.toFloat())
    private val materialAnim = Animatable(0f)
    private val squashAnim = Animatable(0f)

    var maxIndex by mutableIntStateOf((itemCount - 1).coerceAtLeast(0))
    var targetIndex by mutableIntStateOf(clampedInit)
        private set
    var isDragging by mutableStateOf(false)
        private set

    private var lastSampledPos by mutableFloatStateOf(clampedInit.toFloat())
    private var settleJob: Job? = null

    val position: Float get() = positionAnim.value
    val glassPresence: Float get() = materialAnim.value.coerceIn(0f, 1f)
    val squashFactor: Float get() = squashAnim.value

    val stretchScaleX: Float
        get() {
            val liftStretch = 1f + 0.08f * glassPresence
            val velocityStretch = 1f + (abs(squashFactor) * 0.16f).coerceAtMost(0.20f)
            return liftStretch * velocityStretch
        }

    val squashScaleY: Float
        get() {
            val liftSwell = 1f + 0.15f * glassPresence
            val volumeComp = 1f - (abs(squashFactor) * 0.08f).coerceAtMost(0.11f)
            return liftSwell * volumeComp
        }

    fun updateItemCount(newCount: Int, currentActiveIndex: Int) {
        val nextMax = (newCount - 1).coerceAtLeast(0)
        if (nextMax != maxIndex) {
            maxIndex = nextMax
            val safe = currentActiveIndex.coerceIn(0, nextMax)
            targetIndex = safe
            scope.launch {
                positionAnim.snapTo(safe.toFloat())
                materialAnim.snapTo(0f)
                squashAnim.snapTo(0f)
            }
        }
    }

    fun snapTo(index: Int) {
        val safe = index.coerceIn(0, maxIndex)
        targetIndex = safe
        isDragging = false
        settleJob?.cancel()
        scope.launch {
            positionAnim.snapTo(safe.toFloat())
            materialAnim.snapTo(0f)
            squashAnim.snapTo(0f)
        }
    }

    fun animateTo(index: Int, enablePhysics: Boolean, reduceMotion: Boolean) {
        val safe = index.coerceIn(0, maxIndex)
        if (reduceMotion) {
            snapTo(safe)
            return
        }
        val distance = abs(safe.toFloat() - positionAnim.value)
        targetIndex = safe
        isDragging = false
        settleJob?.cancel()

        scope.launch {
            positionAnim.animateTo(
                targetValue = safe.toFloat(),
                animationSpec = if (enablePhysics) {
                    spring(
                        dampingRatio = 0.64f,
                        stiffness = 380f
                    )
                } else {
                    tween(durationMillis = 200)
                }
            )
        }

        if (enablePhysics && distance > 0.05f) {
            scope.launch {
                materialAnim.animateTo(
                    targetValue = 0.92f,
                    animationSpec = spring(
                        dampingRatio = 0.72f,
                        stiffness = 820f
                    )
                )
            }
            scope.launch {
                val kick = (safe.toFloat() - positionAnim.value).coerceIn(-1.5f, 1.5f)
                squashAnim.animateTo(
                    targetValue = kick * 0.7f,
                    animationSpec = spring(dampingRatio = 0.55f, stiffness = 700f)
                )
                squashAnim.animateTo(
                    targetValue = 0f,
                    animationSpec = spring(dampingRatio = 0.68f, stiffness = 420f)
                )
            }
            settleJob = scope.launch {
                delay(230)
                if (!isDragging) {
                    materialAnim.animateTo(
                        targetValue = 0f,
                        animationSpec = spring(
                            dampingRatio = 0.82f,
                            stiffness = 340f
                        )
                    )
                }
            }
        } else {
            scope.launch {
                materialAnim.animateTo(0f, animationSpec = tween(160))
                squashAnim.animateTo(0f, animationSpec = tween(160))
            }
        }
    }

    fun startDrag() {
        isDragging = true
        settleJob?.cancel()
        lastSampledPos = positionAnim.value
        scope.launch {
            materialAnim.animateTo(
                targetValue = 1f,
                animationSpec = spring(
                    dampingRatio = 0.70f,
                    stiffness = 860f
                )
            )
        }
    }

    fun dragTo(targetFraction: Float) {
        val clamped = targetFraction.coerceIn(0f, maxIndex.toFloat())
        val delta = clamped - lastSampledPos
        lastSampledPos = clamped
        scope.launch {
            positionAnim.snapTo(clamped)
            val impulse = (delta * 8f).coerceIn(-1.2f, 1.2f)
            squashAnim.snapTo((squashAnim.value * 0.65f + impulse * 0.35f).coerceIn(-1.2f, 1.2f))
        }
    }

    fun release(finalIndex: Int, reduceMotion: Boolean) {
        val safe = finalIndex.coerceIn(0, maxIndex)
        targetIndex = safe
        isDragging = false
        settleJob?.cancel()
        if (reduceMotion) {
            snapTo(safe)
            return
        }
        scope.launch {
            positionAnim.animateTo(
                targetValue = safe.toFloat(),
                animationSpec = spring(
                    dampingRatio = 0.62f,
                    stiffness = 390f
                )
            )
        }
        scope.launch {
            squashAnim.animateTo(
                targetValue = 0f,
                animationSpec = spring(
                    dampingRatio = 0.62f,
                    stiffness = 360f
                )
            )
        }
        settleJob = scope.launch {
            delay(160)
            if (!isDragging) {
                materialAnim.animateTo(
                    targetValue = 0f,
                    animationSpec = spring(
                        dampingRatio = 0.84f,
                        stiffness = 310f
                    )
                )
            }
        }
    }
}

@Composable
fun rememberGlassPillMotion(initialIndex: Int, itemCount: Int): GlassPillMotion {
    val scope = rememberCoroutineScope()
    val motion = remember(scope) {
        GlassPillMotion(scope = scope, initialIndex = initialIndex, itemCount = itemCount)
    }
    motion.updateItemCount(itemCount, initialIndex)
    return motion
}

/**
 * Resting pill fill drawn behind icons/labels when the capsule has settled.
 */
@Composable
fun RestingSelectionPill(
    motion: GlassPillMotion,
    tabWidthDp: Dp,
    pillHeightDp: Dp,
    modifier: Modifier = Modifier
) {
    val c = PastiCuanTheme.colors
    val kaca = PastiCuanTheme.kaca
    val density = LocalDensity.current
    val tabWidthPx = with(density) { tabWidthDp.toPx() }

    val restAlpha = if (kaca.pillPhysics && !kaca.kurangiAnimasi) {
        (1f - motion.glassPresence * 0.85f).coerceIn(0.15f, 1f)
    } else {
        1f
    }

    val fillBrush = when {
        !kaca.liquidGlass -> Brush.verticalGradient(
            listOf(c.limeAction.copy(alpha = 0.24f), c.limeAction.copy(alpha = 0.16f))
        )
        c.isDark -> Brush.verticalGradient(
            listOf(
                Color.White.copy(alpha = 0.15f),
                Color.White.copy(alpha = 0.08f)
            )
        )
        else -> Brush.verticalGradient(
            listOf(
                Color(0xFF0E0F0C).copy(alpha = 0.075f),
                Color(0xFF0E0F0C).copy(alpha = 0.045f)
            )
        )
    }
    val borderCol = when {
        !kaca.liquidGlass -> c.limeAction.copy(alpha = 0.35f)
        c.isDark -> Color.White.copy(alpha = 0.14f)
        else -> Color.White.copy(alpha = 0.65f)
    }

    Box(
        modifier = modifier
            .size(width = tabWidthDp, height = pillHeightDp)
            .graphicsLayer {
                translationX = motion.position * tabWidthPx
                alpha = restAlpha
                val s = if (!kaca.pillPhysics || kaca.kurangiAnimasi) 1f else {
                    1f + abs(motion.squashFactor) * 0.04f
                }
                scaleX = s
            }
            .background(brush = fillBrush, shape = CircleShape)
            .border(0.75.dp, borderCol, CircleShape)
    )
}

/**
 * Floating crystal magnifying lens rendered ABOVE the tab row when tapped or finger-dragged,
 * sampling [appBackdrop] + [barGlass] + [tabRow] and refracting the glyphs underneath via AGSL.
 */
@Composable
fun LiftedGlassSelectionPill(
    motion: GlassPillMotion,
    tabWidthDp: Dp,
    pillHeightDp: Dp,
    barGlass: LayerBackdrop,
    tabRow: LayerBackdrop,
    modifier: Modifier = Modifier
) {
    val c = PastiCuanTheme.colors
    val kaca = PastiCuanTheme.kaca
    val appBackdrop = LocalAppBackdrop.current

    if (!kaca.liquidGlass || !kaca.pillPhysics || kaca.kurangiAnimasi) return
    val presence = motion.glassPresence
    if (presence <= 0.015f) return
    if (!isRenderEffectSupported()) return

    val combinedBackdrop: Backdrop = if (appBackdrop != null) {
        rememberCombinedBackdrop(appBackdrop, barGlass, tabRow)
    } else {
        rememberCombinedBackdrop(barGlass, tabRow)
    }

    val density = LocalDensity.current
    val tabWidthPx = with(density) { tabWidthDp.toPx() }
    val useFrostOnly = kaca.modeRingan || !isRuntimeShaderSupported()

    val specularColor = Color.White.copy(alpha = (if (c.isDark) 0.55f else 0.95f) * presence)
    val lensTintColor = if (c.isDark) {
        Color.White.copy(alpha = 0.06f * presence)
    } else {
        Color.White.copy(alpha = 0.14f * presence)
    }

    Box(
        modifier = modifier
            .size(width = tabWidthDp, height = pillHeightDp)
            .drawBackdrop(
                backdrop = combinedBackdrop,
                shape = { CircleShape },
                layerBlock = {
                    translationX = motion.position * tabWidthPx
                    scaleX = motion.stretchScaleX
                    scaleY = motion.squashScaleY
                    alpha = presence
                },
                effects = {
                    if (useFrostOnly) {
                        val b = 6.dp.toPx() * presence
                        if (b > 0.5f) {
                            blur(radius = b, edgeTreatment = TileMode.Clamp)
                        }
                    } else {
                        val h = (12.dp.toPx() * presence).coerceAtLeast(1f)
                        val amt = (16.dp.toPx() * presence).coerceAtLeast(1f)
                        lens(
                            refractionHeight = h,
                            refractionAmount = amt,
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
                            color = specularColor,
                            blendMode = BlendMode.Plus,
                            angle = 45f,
                            falloff = 1.1f
                        )
                    )
                },
                shadow = {
                    Shadow(
                        radius = 12.dp * presence,
                        offset = DpOffset(0.dp, 4.dp * presence),
                        color = Color.Black.copy(alpha = (if (c.isDark) 0.44f else 0.14f) * presence),
                        alpha = 1f
                    )
                },
                backdropScale = 1f,
                onDrawSurface = {
                    drawRect(color = lensTintColor)
                }
            )
    )
}
