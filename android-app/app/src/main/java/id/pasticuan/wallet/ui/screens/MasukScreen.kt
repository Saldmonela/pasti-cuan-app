package id.pasticuan.wallet.ui.screens

import android.content.Intent
import android.net.Uri
import androidx.browser.customtabs.CustomTabsIntent
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import id.pasticuan.wallet.BuildConfig
import id.pasticuan.wallet.ui.components.PastiCuanButton
import id.pasticuan.wallet.ui.components.PastiCuanCard
import id.pasticuan.wallet.ui.components.PastiCuanIcons
import id.pasticuan.wallet.ui.state.AppUiState
import id.pasticuan.wallet.ui.state.AppViewModel
import id.pasticuan.wallet.ui.theme.PastiCuanTheme

@Composable
fun MasukScreen(
    state: AppUiState,
    viewModel: AppViewModel
) {
    val c = PastiCuanTheme.colors
    val context = LocalContext.current

    fun bukaLoginGoogle() {
        val url = viewModel.buatUrlLoginGoogle()
        val uri = Uri.parse(url)
        val launched = runCatching {
            CustomTabsIntent.Builder()
                .setShowTitle(true)
                .build()
                .launchUrl(context, uri)
        }.isSuccess
        if (!launched) {
            runCatching {
                context.startActivity(Intent(Intent.ACTION_VIEW, uri))
            }.onFailure {
                viewModel.tampilkanToast("Tidak ditemukan browser untuk membuka login Google.")
            }
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(c.canvas)
            .statusBarsPadding()
            .navigationBarsPadding()
            .padding(horizontal = 24.dp, vertical = 32.dp),
        contentAlignment = Alignment.Center
    ) {
        Column(
            modifier = Modifier.fillMaxWidth(),
            verticalArrangement = Arrangement.spacedBy(24.dp)
        ) {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(
                    text = "Pasti Cuan",
                    style = PastiCuanTheme.typography.display.copy(
                        fontSize = 32.sp,
                        fontWeight = FontWeight.ExtraBold,
                        letterSpacing = (-0.96).sp
                    ),
                    color = c.ink
                )
                Text(
                    text = "Buku catatan bersama dana patungan LP. Masuk untuk melihat nilai, untung/rugi, dan porsi kamu.",
                    style = PastiCuanTheme.typography.body.copy(fontSize = 15.sp, lineHeight = 22.sp),
                    color = c.inkMuted
                )
            }

            PastiCuanCard(padding = 20.dp) {
                if (!state.pesanErrorAuth.isNullOrBlank()) {
                    Row(
                        verticalAlignment = Alignment.Top,
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        modifier = Modifier.padding(bottom = 14.dp)
                    ) {
                        Icon(
                            imageVector = PastiCuanIcons.ExclamationCircle,
                            contentDescription = null,
                            tint = c.loss,
                            modifier = Modifier.padding(top = 1.dp).size(17.dp)
                        )
                        Text(
                            text = state.pesanErrorAuth,
                            style = PastiCuanTheme.typography.body.copy(fontSize = 14.sp),
                            color = c.loss
                        )
                    }
                }

                PastiCuanButton(
                    text = if (state.sedangLogin) "Memverifikasi akun…" else "Masuk dengan Google",
                    icon = PastiCuanIcons.BrandGoogle,
                    isPrimary = true,
                    enabled = !state.sedangLogin,
                    onClick = { bukaLoginGoogle() },
                    modifier = Modifier.fillMaxWidth()
                )

                Spacer(Modifier.height(14.dp))

                Row(
                    verticalAlignment = Alignment.Top,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Icon(
                        imageVector = PastiCuanIcons.Lock,
                        contentDescription = null,
                        tint = c.inkMuted,
                        modifier = Modifier.padding(top = 1.dp).size(15.dp)
                    )
                    Text(
                        text = "Hanya email yang sudah didaftarkan pengelola yang bisa masuk. App tidak pernah meminta private key atau seed phrase wallet.",
                        style = PastiCuanTheme.typography.caption,
                        color = c.inkMuted
                    )
                }
            }

            if (BuildConfig.DEBUG) {
                Text(
                    text = "Buka mode prototype lokal (data contoh)",
                    style = PastiCuanTheme.typography.caption.copy(
                        fontWeight = FontWeight.SemiBold,
                        textDecoration = TextDecoration.Underline
                    ),
                    color = c.forestInk,
                    modifier = Modifier
                        .clip(CircleShape)
                        .clickable(enabled = !state.sedangLogin) { viewModel.aktifkanModeSimulasiLokal() }
                        .padding(vertical = 4.dp)
                )
            }
        }
    }
}
