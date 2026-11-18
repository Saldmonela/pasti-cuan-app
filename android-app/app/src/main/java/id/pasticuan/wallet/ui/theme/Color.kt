package id.pasticuan.wallet.ui.theme

import androidx.compose.runtime.Immutable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color

@Immutable
data class PastiCuanColors(
    val isDark: Boolean,
    val limeAction: Color,
    val onLimeInk: Color,
    val forestInk: Color,
    val forestWash: Color,
    val canvas: Color,
    val card: Color,
    val cardBorder: Color,
    val field: Color,
    val fieldReadOnly: Color,
    val skeleton: Color,
    val ink: Color,
    val inkMuted: Color,
    val hairline: Color,
    val gain: Color,
    val gainWash: Color,
    val loss: Color,
    val lossWash: Color,
    val warningInk: Color,
    val warningWash: Color,
    val sharePalette: List<Color>,
    val segTrackBg: Color,
    val segSelectedBg: Color,
    val segSelectedFg: Color,
    val tabsTrackBg: Color,
    val switchOffBg: Color,
    val switchOffThumb: Color,
    val switchOnBg: Color,
    val switchOnThumb: Color,
    val navSolidBg: Color,
    val navIdle: Color,
    val navActiveWash: Color
)

// Palet Terang — Kanvas Sage & Kartu Putih (DESIGN.md + globals.css :root)
val LightPastiCuanColors = PastiCuanColors(
    isDark = false,
    limeAction = Color(0xFF9FE870),
    onLimeInk = Color(0xFF163300),
    forestInk = Color(0xFF163300),
    forestWash = Color(0xFFE3E7E0),
    canvas = Color(0xFFE8EBE6),
    card = Color(0xFFFFFFFF),
    cardBorder = Color.Transparent,
    field = Color(0xFFF1F3EF),
    fieldReadOnly = Color(0xFFE8EBE6),
    skeleton = Color(0xFFECEEE9),
    ink = Color(0xFF0E0F0C),
    inkMuted = Color(0xFF454745),
    hairline = Color(0xFFE2E5DF),
    gain = Color(0xFF054D28),
    gainWash = Color(0xFFE1EAE5),
    loss = Color(0xFFA72027),
    lossWash = Color(0xFFF4E4E5),
    warningInk = Color(0xFF5A4300),
    warningWash = Color(0xFFFBEFC9),
    sharePalette = listOf(
        Color(0xFFDDDDDD),
        Color(0xFFC5C5C4),
        Color(0xFFADADAC),
        Color(0xFF909190)
    ),
    segTrackBg = Color(0xFFE8EBE6),
    segSelectedBg = Color(0xFF163300),
    segSelectedFg = Color(0xFF9FE870),
    tabsTrackBg = Color(0xFFFFFFFF),
    switchOffBg = Color(0xFFCFD6CB),
    switchOffThumb = Color(0xFFFFFFFF),
    switchOnBg = Color(0xFF163300),
    switchOnThumb = Color(0xFF9FE870),
    navSolidBg = Color(0xFF0E0F0C),
    navIdle = Color(0xFFBCBCBB),
    navActiveWash = Color(0xFF353633)
)

// Palet Gelap — Wise Forest Obsidian (DESIGN.md + globals.css html[data-theme="dark"])
val DarkPastiCuanColors = PastiCuanColors(
    isDark = true,
    limeAction = Color(0xFF9FE870),
    onLimeInk = Color(0xFF142D00),
    forestInk = Color(0xFFA2E378),
    forestWash = Color(0xFF222E1D),
    canvas = Color(0xFF0C0F0B),
    card = Color(0xFF151914),
    cardBorder = Color(0x0FFFFFFF), // rgb(255 255 255 / 0.06)
    field = Color(0xFF1E241C),
    fieldReadOnly = Color(0xFF10140F),
    skeleton = Color(0xFF20261E),
    ink = Color(0xFFEDF1EB),
    inkMuted = Color(0xFF9AA396),
    hairline = Color(0xFF252C23),
    gain = Color(0xFF5CE092),
    gainWash = Color(0xFF132B1E),
    loss = Color(0xFFFF7D84),
    lossWash = Color(0xFF311619),
    warningInk = Color(0xFFFFD466),
    warningWash = Color(0xFF2D230D),
    sharePalette = listOf(
        Color(0xFF6E786B),
        Color(0xFF535D50),
        Color(0xFF3D453B),
        Color(0xFF2B3229)
    ),
    segTrackBg = Color(0xFF0F130E),
    segSelectedBg = Color(0xFF263D1A), // Aturan Limau Satu Aksi: hijau hutan gelap, bukan blok limau penuh
    segSelectedFg = Color(0xFF9FE870),
    tabsTrackBg = Color(0xFF151914),
    switchOffBg = Color(0xFF2C3529),
    switchOffThumb = Color(0xFFB7C0B3),
    switchOnBg = Color(0xFF9FE870),
    switchOnThumb = Color(0xFF142D00),
    navSolidBg = Color(0xFF1E241C),
    navIdle = Color(0xFF9AA396),
    navActiveWash = Color(0xFF2E372B)
)

val LocalPastiCuanColors = staticCompositionLocalOf { LightPastiCuanColors }
