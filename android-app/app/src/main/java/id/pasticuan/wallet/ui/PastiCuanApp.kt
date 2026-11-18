package id.pasticuan.wallet.ui

import androidx.activity.compose.BackHandler
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.ContentDrawScope
import androidx.compose.ui.input.nestedscroll.nestedScroll
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import id.pasticuan.wallet.BuildConfig
import id.pasticuan.wallet.domain.model.Peran
import id.pasticuan.wallet.domain.util.Formatters
import id.pasticuan.wallet.ui.components.ApplyLiquidSheetWindowBlur
import id.pasticuan.wallet.ui.components.FloatingPillNav
import id.pasticuan.wallet.ui.components.GlassSurfaceSpec
import id.pasticuan.wallet.ui.components.LocalAppBackdrop
import id.pasticuan.wallet.ui.components.LocalScrollGlassState
import id.pasticuan.wallet.ui.components.LocalSimulasiMode
import id.pasticuan.wallet.ui.components.NavItemData
import id.pasticuan.wallet.ui.components.PastiCuanIcons
import id.pasticuan.wallet.ui.components.RoleChip
import id.pasticuan.wallet.ui.components.SimulasiProtoPill
import id.pasticuan.wallet.ui.components.SkeletonLoadingCards
import id.pasticuan.wallet.ui.components.TopProgressiveBlur
import id.pasticuan.wallet.ui.components.backdrop.backdrops.layerBackdrop
import id.pasticuan.wallet.ui.components.backdrop.backdrops.rememberLayerBackdrop
import id.pasticuan.wallet.ui.components.glassSheetContainerColor
import id.pasticuan.wallet.ui.components.glassSheetScrimColor
import id.pasticuan.wallet.ui.components.pastiCuanLiquidGlass
import id.pasticuan.wallet.ui.components.rememberScrollGlassTracker
import id.pasticuan.wallet.ui.screens.BerandaScreen
import id.pasticuan.wallet.ui.screens.KelolaAnggotaScreen
import id.pasticuan.wallet.ui.screens.KelolaArusScreen
import id.pasticuan.wallet.ui.screens.KelolaPengaturanScreen
import id.pasticuan.wallet.ui.screens.KelolaPermintaanScreen
import id.pasticuan.wallet.ui.screens.KelolaSaldoScreen
import id.pasticuan.wallet.ui.screens.KelolaScreen
import id.pasticuan.wallet.ui.screens.LainnyaScreen
import id.pasticuan.wallet.ui.screens.LogScreen
import id.pasticuan.wallet.ui.screens.PoolScreen
import id.pasticuan.wallet.ui.screens.SetorScreen
import id.pasticuan.wallet.ui.screens.TarikScreen
import id.pasticuan.wallet.ui.screens.TransaksiScreen
import id.pasticuan.wallet.ui.state.AppRoute
import id.pasticuan.wallet.ui.state.AppViewModel
import id.pasticuan.wallet.ui.theme.PastiCuanTheme

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PastiCuanApp(
    viewModel: AppViewModel = viewModel()
) {
    val state by viewModel.state.collectAsState()

    PastiCuanTheme(
        modeTema = state.modeTema,
        kaca = state.kaca
    ) {
        val c = PastiCuanTheme.colors
        val kaca = PastiCuanTheme.kaca

        BackHandler(enabled = state.currentRoute != AppRoute.BERANDA || state.backStack.isNotEmpty()) {
            viewModel.navigateBack()
        }

        if (!state.siap || state.data == null || state.hasil == null) {
            SkeletonLoadingCards(count = 3)
            return@PastiCuanTheme
        }

        val saya = state.saya
        val isPengelola = saya?.peran == Peran.PENGELOLA
        val pendingTaskCount = state.menunggu.size + state.arusBelum.size

        // Ikon 1:1 dengan Shell.tsx (@tabler/icons-react: Home, ChartPie, ArrowsExchange, LayoutDashboard, Dots)
        val navItems = buildList {
            add(NavItemData(AppRoute.BERANDA, "Beranda", PastiCuanIcons.Home))
            add(NavItemData(AppRoute.POOL, "Pool", PastiCuanIcons.ChartPie))
            add(NavItemData(AppRoute.TRANSAKSI, "Transaksi", PastiCuanIcons.ArrowsExchange))
            if (isPengelola) {
                add(
                    NavItemData(
                        route = AppRoute.KELOLA,
                        label = "Kelola",
                        icon = PastiCuanIcons.LayoutDashboard,
                        badgeCount = pendingTaskCount
                    )
                )
            }
            add(NavItemData(AppRoute.LAINNYA, "Lainnya", PastiCuanIcons.Dots))
        }

        val canvasBg = c.canvas
        val paintBackdrop = remember<ContentDrawScope.() -> Unit>(canvasBg) {
            {
                drawRect(canvasBg)
                drawContent()
            }
        }
        val appBackdrop = rememberLayerBackdrop(onDraw = paintBackdrop)
        val (scrollGlass, nestedScrollConn) = rememberScrollGlassTracker(state.currentRoute)
        val blurThresholdPx = with(LocalDensity.current) { 8.dp.toPx() }

        CompositionLocalProvider(
            LocalAppBackdrop provides appBackdrop,
            LocalScrollGlassState provides scrollGlass,
            LocalSimulasiMode provides state.isSimulasiMode
        ) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(c.canvas)
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .layerBackdrop(appBackdrop)
                        .nestedScroll(nestedScrollConn)
                ) {
                    when (state.currentRoute) {
                        AppRoute.BERANDA -> BerandaScreen(state = state, viewModel = viewModel)
                        AppRoute.POOL -> PoolScreen(state = state, viewModel = viewModel)
                        AppRoute.TRANSAKSI -> TransaksiScreen(state = state, viewModel = viewModel)
                        AppRoute.KELOLA -> KelolaScreen(state = state, viewModel = viewModel)
                        AppRoute.KELOLA_ARUS -> KelolaArusScreen(state = state, viewModel = viewModel)
                        AppRoute.KELOLA_SALDO -> KelolaSaldoScreen(state = state, viewModel = viewModel)
                        AppRoute.KELOLA_PERMINTAAN -> KelolaPermintaanScreen(state = state, viewModel = viewModel)
                        AppRoute.KELOLA_ANGGOTA -> KelolaAnggotaScreen(state = state, viewModel = viewModel)
                        AppRoute.KELOLA_PENGATURAN -> KelolaPengaturanScreen(state = state, viewModel = viewModel)
                        AppRoute.LAINNYA -> LainnyaScreen(state = state, viewModel = viewModel)
                        AppRoute.SETOR -> SetorScreen(state = state, viewModel = viewModel)
                        AppRoute.TARIK -> TarikScreen(state = state, viewModel = viewModel)
                        AppRoute.LOG -> LogScreen(state = state, viewModel = viewModel)
                    }
                }

                // Progressive blur murni tanpa kabut warna di bawah status bar untuk layar tab utama
                if (state.currentRoute.showBottomNav) {
                    TopProgressiveBlur(
                        visible = scrollGlass.scrollOffsetPx > blurThresholdPx,
                        extraHeight = if (state.isSimulasiMode) 42.dp else 28.dp,
                        modifier = Modifier.align(Alignment.TopCenter)
                    )
                }

                // Pil tipis penanda Mode Simulasi (.proto-btn di tengah atas, tanpa kabut warna canvas)
                if (state.isSimulasiMode && saya != null) {
                    SimulasiProtoPill(
                        namaAktif = saya.nama,
                        peranLabel = if (isPengelola) "Pengelola" else "Investor",
                        onClick = { viewModel.bukaGantiAkun(true) },
                        modifier = Modifier.align(Alignment.TopCenter)
                    )
                }

                if (state.currentRoute.showBottomNav) {
                    FloatingPillNav(
                        items = navItems,
                        activeTabRoute = state.currentRoute.parentTab,
                        onSelect = { route -> viewModel.navigateTo(route, isTab = true) },
                        modifier = Modifier.align(Alignment.BottomCenter)
                    )
                }

                // Toast di atas kapsul navigasi bawah (.toast di globals.css: bottom 96px + ikon centang)
                AnimatedVisibility(
                    visible = state.toastMessage != null,
                    enter = fadeIn(),
                    exit = fadeOut(),
                    modifier = Modifier
                        .align(Alignment.BottomCenter)
                        .navigationBarsPadding()
                        .padding(start = 16.dp, end = 16.dp, bottom = if (state.currentRoute.showBottomNav) 86.dp else 20.dp)
                ) {
                    val toastFg = when {
                        !kaca.liquidGlass -> if (c.isDark) c.ink else c.card
                        else -> c.ink
                    }
                    val toastIconTint = if (kaca.liquidGlass && !c.isDark) c.gain else c.limeAction
                    val solidToastBg = if (c.isDark) Color(0xFF21281F) else c.ink
                    val solidToastBorder = if (c.isDark) Color.White.copy(alpha = 0.10f) else Color.Transparent

                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .then(
                                if (kaca.liquidGlass) {
                                    Modifier.pastiCuanLiquidGlass(
                                        spec = GlassSurfaceSpec(
                                            shape = RoundedCornerShape(16.dp),
                                            blurDp = 8.dp,
                                            frostBlurDp = 18.dp,
                                            enableLens = false,
                                            lightCrystalAlpha = 0.68f,
                                            darkCrystalAlpha = 0.72f,
                                            lightFrostAlpha = 0.84f,
                                            darkFrostAlpha = 0.86f,
                                            shadowRadius = 14.dp,
                                            shadowOffsetY = 6.dp
                                        )
                                    )
                                } else {
                                    Modifier
                                        .shadow(12.dp, RoundedCornerShape(16.dp))
                                        .clip(RoundedCornerShape(16.dp))
                                        .background(solidToastBg)
                                        .then(
                                            if (solidToastBorder != Color.Transparent) {
                                                Modifier.border(1.dp, solidToastBorder, RoundedCornerShape(16.dp))
                                            } else Modifier
                                        )
                                }
                            )
                            .padding(horizontal = 14.dp, vertical = 12.dp),
                        verticalAlignment = Alignment.Top,
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Icon(
                            imageVector = PastiCuanIcons.CircleCheck,
                            contentDescription = null,
                            tint = toastIconTint,
                            modifier = Modifier.padding(top = 1.dp).size(18.dp)
                        )
                        Text(
                            text = state.toastMessage ?: "",
                            style = PastiCuanTheme.typography.label.copy(fontSize = 13.5.sp),
                            color = toastFg,
                            modifier = Modifier.weight(1f)
                        )
                    }
                }
            }
        }

        // Lembar Bawah Pemilih Akun / Peran Simulasi (setara ProtoPanel di Web)
        if (state.gantiAkunSheetTerbuka) {
            val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
            val data = state.data!!
            val hasil = state.hasil!!
            ModalBottomSheet(
                onDismissRequest = { viewModel.bukaGantiAkun(false) },
                sheetState = sheetState,
                shape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp),
                containerColor = glassSheetContainerColor(),
                contentColor = c.ink,
                scrimColor = glassSheetScrimColor()
            ) {
                ApplyLiquidSheetWindowBlur()
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .navigationBarsPadding()
                        .padding(horizontal = 20.dp, vertical = 8.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Text(
                        text = "Pilih akun simulasi",
                        style = PastiCuanTheme.typography.pageTitle.copy(fontSize = 19.sp),
                        color = c.ink
                    )
                    Text(
                        text = "Mode Simulasi M2 (v${BuildConfig.VERSION_NAME}): uji seluruh tampilan Investor maupun Pengelola (Galih) secara lokal.",
                        style = PastiCuanTheme.typography.caption,
                        color = c.inkMuted
                    )
                    Spacer(Modifier.height(2.dp))

                    data.anggota.forEach { a ->
                        val aktif = a.id == state.sayaId
                        val pos = hasil.posisi.firstOrNull { it.id == a.id }
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(16.dp))
                                .background(if (aktif) c.forestWash else c.field)
                                .clickable { viewModel.pilihAkunSimulasi(a.id) }
                                .padding(horizontal = 14.dp, vertical = 12.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(36.dp)
                                    .clip(CircleShape)
                                    .background(if (aktif) c.segSelectedBg else c.limeAction),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    text = a.nama.take(1).uppercase(),
                                    style = PastiCuanTheme.typography.title,
                                    color = if (aktif) c.segSelectedFg else c.onLimeInk
                                )
                            }
                            Column(modifier = Modifier.weight(1f)) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                                ) {
                                    Text(a.nama, style = PastiCuanTheme.typography.title, color = c.ink)
                                    RoleChip(if (a.peran == Peran.PENGELOLA) "Pengelola" else "Investor")
                                    if (!a.aktif) {
                                        Box(
                                            modifier = Modifier
                                                .clip(CircleShape)
                                                .background(c.canvas)
                                                .padding(horizontal = 8.dp, vertical = 2.dp)
                                        ) {
                                            Text("Nonaktif", style = PastiCuanTheme.typography.tag, color = c.inkMuted)
                                        }
                                    }
                                }
                                val ringkasNilai = if (a.peran == Peran.PENGELOLA) {
                                    "Unit fee ${Formatters.usd(hasil.pengelola.nilaiUnitFeeUsd)} · Fee terutang ${Formatters.usd(hasil.pengelola.feeTerutangTotal)}"
                                } else {
                                    "Nilai bersih ${Formatters.usd(pos?.netUsd ?: 0.0)} · Porsi ${Formatters.persen(pos?.porsi ?: 0.0)}"
                                }
                                Text(ringkasNilai, style = PastiCuanTheme.typography.caption, color = c.inkMuted)
                            }
                            if (aktif) {
                                Icon(
                                    imageVector = PastiCuanIcons.Check,
                                    contentDescription = "Aktif",
                                    tint = c.forestInk,
                                    modifier = Modifier.size(20.dp)
                                )
                            }
                        }
                    }
                    Spacer(Modifier.height(14.dp))
                }
            }
        }
    }
}
