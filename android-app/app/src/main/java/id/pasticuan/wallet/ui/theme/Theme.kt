package id.pasticuan.wallet.ui.theme

import android.app.Activity
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.ReadOnlyComposable
import androidx.compose.runtime.SideEffect
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

enum class ModeTema(val label: String) {
    SISTEM("Sistem"),
    TERANG("Terang"),
    GELAP("Gelap")
}

@Immutable
data class PengaturanKaca(
    val liquidGlass: Boolean = true,
    val modeRingan: Boolean = false,
    val progressiveBlur: Boolean = true,
    val pillPhysics: Boolean = true,
    val kurangiAnimasi: Boolean = false
)

val LocalPengaturanKaca = staticCompositionLocalOf { PengaturanKaca() }

object PastiCuanTheme {
    val colors: PastiCuanColors
        @Composable
        @ReadOnlyComposable
        get() = LocalPastiCuanColors.current

    val typography: PastiCuanTypography
        @Composable
        @ReadOnlyComposable
        get() = LocalPastiCuanTypography.current

    val kaca: PengaturanKaca
        @Composable
        @ReadOnlyComposable
        get() = LocalPengaturanKaca.current
}

@Composable
fun PastiCuanTheme(
    modeTema: ModeTema = ModeTema.SISTEM,
    kaca: PengaturanKaca = PengaturanKaca(),
    content: @Composable () -> Unit
) {
    val systemDark = isSystemInDarkTheme()
    val useDark = when (modeTema) {
        ModeTema.SISTEM -> systemDark
        ModeTema.TERANG -> false
        ModeTema.GELAP -> true
    }
    val colors = if (useDark) DarkPastiCuanColors else LightPastiCuanColors

    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as? Activity)?.window ?: return@SideEffect
            val controller = WindowCompat.getInsetsController(window, view)
            controller.isAppearanceLightStatusBars = !useDark
            controller.isAppearanceLightNavigationBars = !useDark
        }
    }

    val m3Scheme = if (useDark) {
        darkColorScheme(
            primary = colors.limeAction,
            onPrimary = colors.onLimeInk,
            secondary = colors.forestWash,
            onSecondary = colors.forestInk,
            background = colors.canvas,
            onBackground = colors.ink,
            surface = colors.card,
            onSurface = colors.ink,
            error = colors.loss,
            onError = colors.card
        )
    } else {
        lightColorScheme(
            primary = colors.limeAction,
            onPrimary = colors.onLimeInk,
            secondary = colors.forestWash,
            onSecondary = colors.forestInk,
            background = colors.canvas,
            onBackground = colors.ink,
            surface = colors.card,
            onSurface = colors.ink,
            error = colors.loss,
            onError = colors.card
        )
    }

    CompositionLocalProvider(
        LocalPastiCuanColors provides colors,
        LocalPastiCuanTypography provides DefaultPastiCuanTypography,
        LocalPengaturanKaca provides kaca
    ) {
        MaterialTheme(
            colorScheme = m3Scheme,
            content = content
        )
    }
}
