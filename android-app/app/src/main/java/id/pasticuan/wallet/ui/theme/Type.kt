package id.pasticuan.wallet.ui.theme

import androidx.compose.runtime.Immutable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp
import id.pasticuan.wallet.R

val InterFontFamily = FontFamily(
    Font(R.font.inter_regular, FontWeight.Normal),
    Font(R.font.inter_medium, FontWeight.Medium),
    Font(R.font.inter_semibold, FontWeight.SemiBold),
    Font(R.font.inter_bold, FontWeight.Bold),
    Font(R.font.inter_extrabold, FontWeight.ExtraBold)
)

@Immutable
data class PastiCuanTypography(
    val display: TextStyle,
    val figureLg: TextStyle,
    val figureDuo: TextStyle,
    val figureMd: TextStyle,
    val figureTotal: TextStyle,
    val inputMoney: TextStyle,
    val headline: TextStyle,
    val pageTitle: TextStyle,
    val title: TextStyle,
    val body: TextStyle,
    val bodyTabular: TextStyle,
    val label: TextStyle,
    val figureSm: TextStyle,
    val caption: TextStyle,
    val tag: TextStyle
)

val DefaultPastiCuanTypography = PastiCuanTypography(
    display = TextStyle(
        fontFamily = InterFontFamily,
        fontWeight = FontWeight.ExtraBold,
        fontSize = 40.sp,
        lineHeight = 43.sp,
        letterSpacing = (-1.2).sp,
        fontFeatureSettings = "tnum"
    ),
    figureLg = TextStyle(
        fontFamily = InterFontFamily,
        fontWeight = FontWeight.ExtraBold,
        fontSize = 34.sp,
        lineHeight = 37.sp,
        letterSpacing = (-1.0).sp,
        fontFeatureSettings = "tnum"
    ),
    figureDuo = TextStyle(
        fontFamily = InterFontFamily,
        fontWeight = FontWeight.ExtraBold,
        fontSize = 26.sp,
        lineHeight = 30.sp,
        letterSpacing = (-0.8).sp,
        fontFeatureSettings = "tnum"
    ),
    figureMd = TextStyle(
        fontFamily = InterFontFamily,
        fontWeight = FontWeight.ExtraBold,
        fontSize = 24.sp,
        lineHeight = 28.sp,
        letterSpacing = (-0.7).sp,
        fontFeatureSettings = "tnum"
    ),
    figureTotal = TextStyle(
        fontFamily = InterFontFamily,
        fontWeight = FontWeight.ExtraBold,
        fontSize = 22.sp,
        lineHeight = 25.sp,
        letterSpacing = (-0.6).sp,
        fontFeatureSettings = "tnum"
    ),
    inputMoney = TextStyle(
        fontFamily = InterFontFamily,
        fontWeight = FontWeight.ExtraBold,
        fontSize = 28.sp,
        lineHeight = 32.sp,
        letterSpacing = (-0.8).sp,
        fontFeatureSettings = "tnum"
    ),
    headline = TextStyle(
        fontFamily = InterFontFamily,
        fontWeight = FontWeight.Bold,
        fontSize = 25.sp,
        lineHeight = 30.sp,
        letterSpacing = (-0.5).sp
    ),
    pageTitle = TextStyle(
        fontFamily = InterFontFamily,
        fontWeight = FontWeight.Bold,
        fontSize = 17.sp,
        lineHeight = 22.sp
    ),
    title = TextStyle(
        fontFamily = InterFontFamily,
        fontWeight = FontWeight.SemiBold,
        fontSize = 15.sp,
        lineHeight = 22.sp
    ),
    body = TextStyle(
        fontFamily = InterFontFamily,
        fontWeight = FontWeight.Normal,
        fontSize = 14.sp,
        lineHeight = 20.sp
    ),
    bodyTabular = TextStyle(
        fontFamily = InterFontFamily,
        fontWeight = FontWeight.SemiBold,
        fontSize = 14.sp,
        lineHeight = 20.sp,
        fontFeatureSettings = "tnum"
    ),
    label = TextStyle(
        fontFamily = InterFontFamily,
        fontWeight = FontWeight.Normal,
        fontSize = 13.sp,
        lineHeight = 19.sp
    ),
    figureSm = TextStyle(
        fontFamily = InterFontFamily,
        fontWeight = FontWeight.Medium,
        fontSize = 13.sp,
        lineHeight = 19.sp,
        fontFeatureSettings = "tnum"
    ),
    caption = TextStyle(
        fontFamily = InterFontFamily,
        fontWeight = FontWeight.Normal,
        fontSize = 12.sp,
        lineHeight = 17.sp
    ),
    tag = TextStyle(
        fontFamily = InterFontFamily,
        fontWeight = FontWeight.SemiBold,
        fontSize = 11.sp,
        lineHeight = 16.sp,
        fontFeatureSettings = "tnum"
    )
)

val LocalPastiCuanTypography = staticCompositionLocalOf { DefaultPastiCuanTypography }
