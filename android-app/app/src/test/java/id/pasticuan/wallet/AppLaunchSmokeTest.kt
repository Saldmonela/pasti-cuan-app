package id.pasticuan.wallet

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.hasScrollAction
import androidx.compose.ui.test.hasText
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performScrollTo
import androidx.compose.ui.test.performScrollToNode
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34], qualifiers = "w412dp-h915dp-xxhdpi")
class AppLaunchSmokeTest {

    @get:Rule
    val composeRule = createAndroidComposeRule<MainActivity>()

    @Test
    fun mainActivityFullGlassNavigationAndTogglesWorkCleanly() {
        composeRule.waitForIdle()
        composeRule.mainClock.advanceTimeBy(600)
        composeRule.waitForIdle()

        // 1. Sub-layar Setor & Tarik (FloatingSubScreenLayout + FloatingBackButton)
        composeRule.onNodeWithText("Setor").performScrollTo().performClick()
        composeRule.waitForIdle()
        composeRule.onNodeWithContentDescription("Kembali").performClick()
        composeRule.waitForIdle()

        composeRule.onNodeWithText("Tarik").performScrollTo().performClick()
        composeRule.waitForIdle()
        composeRule.onNodeWithContentDescription("Kembali").performClick()
        composeRule.waitForIdle()

        // 2. Buka ModalBottomSheet via SimulasiProtoPill (ApplyLiquidSheetWindowBlur) lalu tutup
        composeRule.onNodeWithText("Prototype · Salman (Investor)").performClick()
        composeRule.waitForIdle()
        composeRule.onNodeWithText("Pilih akun simulasi").assertIsDisplayed()
        composeRule.runOnUiThread {
            composeRule.activity.onBackPressedDispatcher.onBackPressed()
        }
        composeRule.waitForIdle()

        // 3. Navigasi tab nav bar -> Pool -> Transaksi -> Lainnya
        composeRule.onNodeWithText("Pool").performClick()
        composeRule.waitForIdle()
        composeRule.onNodeWithText("Transaksi").performClick()
        composeRule.waitForIdle()
        composeRule.onNodeWithText("Lainnya").performClick()
        composeRule.waitForIdle()

        // 4. Buka accordion Tampilan & toggle Kaca, Tema Gelap, lalu buka sub-layar Log perubahan
        composeRule.onNode(hasScrollAction()).performScrollToNode(hasText("Tampilan"))
        composeRule.onNodeWithText("Tampilan").performClick()
        composeRule.waitForIdle()
        composeRule.onNode(hasScrollAction()).performScrollToNode(hasText("Gelap"))
        composeRule.onNodeWithText("Gelap").performClick()
        composeRule.waitForIdle()
        composeRule.onNode(hasScrollAction()).performScrollToNode(hasText("Mode ringan kaca"))
        composeRule.onNodeWithText("Mode ringan kaca").performClick()
        composeRule.waitForIdle()
        composeRule.onNode(hasScrollAction()).performScrollToNode(hasText("Progressive blur atas"))
        composeRule.onNodeWithText("Progressive blur atas").performClick()
        composeRule.waitForIdle()
        composeRule.onNode(hasScrollAction()).performScrollToNode(hasText("Liquid Glass"))
        composeRule.onNodeWithText("Liquid Glass").performClick()
        composeRule.waitForIdle()
        composeRule.onNodeWithText("Liquid Glass").performClick()
        composeRule.waitForIdle()

        composeRule.onNode(hasScrollAction()).performScrollToNode(hasText("Log perubahan"))
        composeRule.onNodeWithText("Log perubahan").performClick()
        composeRule.waitForIdle()
        composeRule.onNodeWithContentDescription("Kembali").performClick()
        composeRule.waitForIdle()
    }

    @Test
    @Config(sdk = [31], qualifiers = "w412dp-h915dp-xxhdpi")
    fun mainActivityLaunchesOnApi31BlurFallback() {
        composeRule.waitForIdle()
        composeRule.mainClock.advanceTimeBy(600)
        composeRule.waitForIdle()
        composeRule.onNodeWithText("Pool").performClick()
        composeRule.waitForIdle()
    }
}
