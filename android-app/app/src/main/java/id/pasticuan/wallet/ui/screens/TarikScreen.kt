package id.pasticuan.wallet.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import id.pasticuan.wallet.domain.engine.PoolEngine
import id.pasticuan.wallet.domain.model.Jenis
import id.pasticuan.wallet.domain.util.Formatters
import id.pasticuan.wallet.ui.components.ApplyLiquidSheetWindowBlur
import id.pasticuan.wallet.ui.components.FloatingSubScreenLayout
import id.pasticuan.wallet.ui.components.PastiCuanButton
import id.pasticuan.wallet.ui.components.PastiCuanCard
import id.pasticuan.wallet.ui.components.PastiCuanIcons
import id.pasticuan.wallet.ui.components.StatusBanners
import id.pasticuan.wallet.ui.components.glassSheetContainerColor
import id.pasticuan.wallet.ui.components.glassSheetScrimColor
import id.pasticuan.wallet.ui.state.AppRoute
import id.pasticuan.wallet.ui.state.AppUiState
import id.pasticuan.wallet.ui.state.AppViewModel
import id.pasticuan.wallet.ui.theme.PastiCuanTheme
import kotlinx.coroutines.launch
import kotlin.math.abs
import kotlin.math.floor

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun TarikScreen(
    state: AppUiState,
    viewModel: AppViewModel
) {
    val c = PastiCuanTheme.colors
    val data = state.data ?: return
    val hasil = state.hasil ?: return
    val resmi = state.resmi ?: hasil
    val saya = state.saya ?: return
    val pos = hasil.posisi.firstOrNull { it.id == saya.id } ?: return
    val scope = rememberCoroutineScope()

    var jumlah by rememberSaveable { mutableStateOf("") }
    var alamat by rememberSaveable { mutableStateOf("") }
    var catatan by rememberSaveable { mutableStateOf("") }
    var errJumlah by remember { mutableStateOf<String?>(null) }
    var errAlamat by remember { mutableStateOf<String?>(null) }
    var errForm by remember { mutableStateOf<String?>(null) }
    var konfirmasiNet by remember { mutableStateOf<Double?>(null) }

    val cekGagal = !hasil.cek.lolos || !resmi.cek.lolos
    val pending = state.menunggu.firstOrNull { it.anggotaId == saya.id && it.jenis == Jenis.TARIK }
    val n = Formatters.parseAngka(jumlah)
    val lewat = n != null && n > pos.netUsd + 0.005
    val sim = if (n != null && n > 0.0 && !lewat) {
        PoolEngine.simulasiTarik(hasil, saya.id, n, data.pengaturan)
    } else null
    val nonaktif = state.offline || cekGagal || pending != null || pos.netUsd <= 0.004 || state.sedangMengirim

    FloatingSubScreenLayout(
        judul = "Tarik modal",
        onBack = { viewModel.navigateBack(AppRoute.BERANDA) },
        useImePadding = true,
        bottomPadding = 36.dp
    ) {
            item {
                StatusBanners(state = state)
            }

            if (cekGagal) {
                item {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(16.dp))
                            .background(c.warningWash)
                            .padding(horizontal = 14.dp, vertical = 12.dp),
                        horizontalArrangement = Arrangement.spacedBy(10.dp),
                        verticalAlignment = Alignment.Top
                    ) {
                        Icon(
                            imageVector = PastiCuanIcons.AlertTriangle,
                            contentDescription = null,
                            tint = c.warningInk,
                            modifier = Modifier.padding(top = 1.dp).size(18.dp)
                        )
                        Text(
                            text = "Penarikan ditahan sementara karena angka sedang dicek ulang.",
                            style = PastiCuanTheme.typography.label,
                            color = c.warningInk
                        )
                    }
                }
            }

            if (pending != null) {
                item {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(16.dp))
                            .background(c.warningWash)
                            .clickable { viewModel.navigateTo(AppRoute.TRANSAKSI, isTab = true) }
                            .padding(horizontal = 14.dp, vertical = 12.dp),
                        horizontalArrangement = Arrangement.spacedBy(10.dp),
                        verticalAlignment = Alignment.Top
                    ) {
                        Icon(
                            imageVector = PastiCuanIcons.InfoCircle,
                            contentDescription = null,
                            tint = c.warningInk,
                            modifier = Modifier.padding(top = 1.dp).size(18.dp)
                        )
                        Text(
                            text = "Kamu masih punya permintaan penarikan ${Formatters.usd(pending.jumlahUsd)} yang menunggu. Batalkan atau tunggu yang itu selesai dulu. Lihat permintaan",
                            style = PastiCuanTheme.typography.label,
                            color = c.warningInk
                        )
                    }
                }
            }

            item {
                PastiCuanCard {
                    Text(
                        text = "Bisa ditarik hari ini",
                        style = PastiCuanTheme.typography.label,
                        color = c.inkMuted
                    )
                    Spacer(Modifier.height(4.dp))
                    Text(
                        text = Formatters.usd(pos.netUsd),
                        style = PastiCuanTheme.typography.figureLg,
                        color = c.ink
                    )
                    Spacer(Modifier.height(4.dp))
                    Text(
                        text = "${Formatters.sol(pos.netSol)} · sudah dipotong fee terutang ${Formatters.usd(pos.feeUsd)}",
                        style = PastiCuanTheme.typography.caption,
                        color = c.inkMuted
                    )
                }
            }

            item {
                PastiCuanCard {
                    Text(
                        text = "Jumlah penarikan",
                        style = PastiCuanTheme.typography.label.copy(fontWeight = FontWeight.SemiBold),
                        color = c.ink
                    )
                    Spacer(Modifier.height(6.dp))

                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(64.dp)
                            .clip(RoundedCornerShape(16.dp))
                            .background(if (errJumlah != null) c.card else c.field)
                            .then(
                                if (errJumlah != null) Modifier.border(1.5.dp, c.loss, RoundedCornerShape(16.dp))
                                else Modifier
                            )
                            .padding(horizontal = 16.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Text(
                            text = "US$",
                            style = PastiCuanTheme.typography.figureTotal.copy(fontWeight = FontWeight.SemiBold),
                            color = c.inkMuted
                        )
                        BasicTextField(
                            value = jumlah,
                            onValueChange = {
                                jumlah = it
                                errJumlah = null
                                errForm = null
                            },
                            enabled = !nonaktif,
                            singleLine = true,
                            textStyle = PastiCuanTheme.typography.inputMoney.copy(color = c.ink),
                            cursorBrush = SolidColor(c.forestInk),
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                            modifier = Modifier.weight(1f),
                            decorationBox = { inner ->
                                Box {
                                    if (jumlah.isEmpty()) {
                                        Text(
                                            text = "0,00",
                                            style = PastiCuanTheme.typography.inputMoney,
                                            color = c.inkMuted.copy(alpha = 0.45f)
                                        )
                                    }
                                    inner()
                                }
                            }
                        )
                        Box(
                            modifier = Modifier
                                .height(36.dp)
                                .clip(CircleShape)
                                .clickable(enabled = !nonaktif) {
                                    val maks = floor(pos.netUsd * 100.0) / 100.0
                                    jumlah = Formatters.angka(maks, 2)
                                    errJumlah = null
                                    errForm = null
                                }
                                .padding(horizontal = 10.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = "Tarik semua",
                                style = PastiCuanTheme.typography.body.copy(fontWeight = FontWeight.SemiBold),
                                color = c.forestInk
                            )
                        }
                    }

                    if (errJumlah != null) {
                        Spacer(Modifier.height(6.dp))
                        FieldErrorRow(errJumlah!!)
                    } else {
                        Spacer(Modifier.height(6.dp))
                        Text(
                            text = "Boleh sebagian atau semua, kapan saja.",
                            style = PastiCuanTheme.typography.caption,
                            color = c.inkMuted
                        )
                    }

                    Spacer(Modifier.height(14.dp))

                    if (sim != null && n != null) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(16.dp))
                                .background(c.field)
                                .padding(horizontal = 16.dp, vertical = 14.dp)
                        ) {
                            Text(
                                text = "Kalau kamu tarik ${Formatters.usd(n)} hari ini",
                                style = PastiCuanTheme.typography.label.copy(fontWeight = FontWeight.SemiBold),
                                color = c.ink
                            )
                            Spacer(Modifier.height(10.dp))
                            KvRow(label = "Unit terjual", value = Formatters.angka(sim.unitTerjual, 4))
                            Spacer(Modifier.height(6.dp))
                            KvRow(label = "Fee dibayar ke pengelola", value = Formatters.usd(sim.feeDibayar))
                            Spacer(Modifier.height(6.dp))
                            KvRow(label = "Sisa modal dasar", value = Formatters.usd(sim.sisaModalUsd))
                            Spacer(Modifier.height(6.dp))
                            KvRow(label = "Sisa porsi", value = Formatters.persen(sim.sisaPorsi))
                            Spacer(Modifier.height(10.dp))
                            HorizontalDivider(thickness = 2.dp, color = c.ink)
                            Spacer(Modifier.height(12.dp))
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = "Sisa nilai bersih",
                                    style = PastiCuanTheme.typography.title,
                                    color = c.ink
                                )
                                Text(
                                    text = Formatters.usd(sim.sisaNetUsd),
                                    style = PastiCuanTheme.typography.figureTotal,
                                    color = c.ink
                                )
                            }
                            if (pos.profitUsd < 0) {
                                Spacer(Modifier.height(8.dp))
                                Text(
                                    text = "Kamu sedang rugi, jadi tidak ada fee yang dipotong.",
                                    style = PastiCuanTheme.typography.caption,
                                    color = c.inkMuted
                                )
                            }
                            if (hasil.live != null) {
                                Spacer(Modifier.height(6.dp))
                                Text(
                                    text = "Perkiraan dengan nilai live ${Formatters.jam(hasil.live.dibacaPada)} WIB. Angka final memakai nilai saat transfer dicocokkan.",
                                    style = PastiCuanTheme.typography.caption,
                                    color = c.inkMuted
                                )
                            }
                        }
                    } else {
                        Text(
                            text = "Simulasi muncul setelah kamu mengetik jumlah.",
                            style = PastiCuanTheme.typography.caption,
                            color = c.inkMuted
                        )
                    }

                    Spacer(Modifier.height(16.dp))

                    // Alamat wallet tujuan
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text(
                            text = "Alamat wallet tujuan",
                            style = PastiCuanTheme.typography.label.copy(fontWeight = FontWeight.SemiBold),
                            color = c.ink
                        )
                        Text("Opsional", style = PastiCuanTheme.typography.label, color = c.inkMuted)
                    }
                    Spacer(Modifier.height(6.dp))
                    BasicTextField(
                        value = alamat,
                        onValueChange = {
                            if (it.length <= 64) {
                                alamat = it
                                errAlamat = null
                            }
                        },
                        enabled = !nonaktif,
                        singleLine = true,
                        textStyle = PastiCuanTheme.typography.bodyTabular.copy(fontSize = 15.sp, color = c.ink),
                        cursorBrush = SolidColor(c.forestInk),
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(52.dp)
                            .clip(RoundedCornerShape(16.dp))
                            .background(if (errAlamat != null) c.card else c.field)
                            .then(
                                if (errAlamat != null) Modifier.border(1.5.dp, c.loss, RoundedCornerShape(16.dp))
                                else Modifier
                            )
                            .padding(horizontal = 16.dp),
                        decorationBox = { inner ->
                            Box(contentAlignment = Alignment.CenterStart) {
                                if (alamat.isEmpty()) {
                                    Text(
                                        text = "Alamat Solana (32–44 karakter base58)",
                                        style = PastiCuanTheme.typography.body.copy(fontSize = 15.sp),
                                        color = c.inkMuted.copy(alpha = 0.55f)
                                    )
                                }
                                inner()
                            }
                        }
                    )
                    if (errAlamat != null) {
                        Spacer(Modifier.height(6.dp))
                        FieldErrorRow(errAlamat!!)
                    } else {
                        Spacer(Modifier.height(6.dp))
                        Text(
                            text = "Alamat Solana tujuan (32–44 karakter). Pengelola mentransfer di luar app.",
                            style = PastiCuanTheme.typography.caption,
                            color = c.inkMuted
                        )
                    }

                    if (saya.alamatWallet.isNotEmpty()) {
                        Spacer(Modifier.height(10.dp))
                        FlowRow(
                            horizontalArrangement = Arrangement.spacedBy(6.dp),
                            verticalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            saya.alamatWallet.forEach { w ->
                                val terpilih = alamat.trim() == w
                                Row(
                                    modifier = Modifier
                                        .height(38.dp)
                                        .clip(CircleShape)
                                        .background(if (terpilih) c.segSelectedBg else c.forestWash)
                                        .clickable(enabled = !nonaktif) {
                                            alamat = w
                                            errAlamat = null
                                        }
                                        .padding(horizontal = 14.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                                ) {
                                    if (terpilih) {
                                        Icon(
                                            imageVector = PastiCuanIcons.Check,
                                            contentDescription = null,
                                            tint = c.segSelectedFg,
                                            modifier = Modifier.size(15.dp)
                                        )
                                    }
                                    Text(
                                        text = "Pakai ${Formatters.ringkasAlamat(w)}",
                                        style = PastiCuanTheme.typography.body.copy(fontWeight = FontWeight.SemiBold),
                                        color = if (terpilih) c.segSelectedFg else c.forestInk
                                    )
                                }
                            }
                        }
                    }

                    Spacer(Modifier.height(16.dp))

                    // Catatan
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text(
                            text = "Catatan",
                            style = PastiCuanTheme.typography.label.copy(fontWeight = FontWeight.SemiBold),
                            color = c.ink
                        )
                        Text("Opsional", style = PastiCuanTheme.typography.label, color = c.inkMuted)
                    }
                    Spacer(Modifier.height(6.dp))
                    BasicTextField(
                        value = catatan,
                        onValueChange = { if (it.length <= 200) catatan = it },
                        enabled = !nonaktif,
                        textStyle = PastiCuanTheme.typography.body.copy(fontSize = 16.sp, color = c.ink),
                        cursorBrush = SolidColor(c.forestInk),
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(76.dp)
                            .clip(RoundedCornerShape(16.dp))
                            .background(c.field)
                            .padding(horizontal = 16.dp, vertical = 14.dp),
                        decorationBox = { inner -> inner() }
                    )
                    Spacer(Modifier.height(6.dp))
                    Text(
                        text = "${catatan.length}/200 karakter",
                        style = PastiCuanTheme.typography.caption,
                        color = c.inkMuted
                    )

                    if (errForm != null) {
                        Spacer(Modifier.height(10.dp))
                        FieldErrorRow(errForm!!)
                    }

                    Spacer(Modifier.height(18.dp))
                    PastiCuanButton(
                        text = "Ajukan penarikan",
                        enabled = !nonaktif,
                        onClick = {
                            var ok = true
                            if (n == null || n <= 0.0) {
                                errJumlah = "Tulis jumlah penarikan lebih dari 0."
                                ok = false
                            } else if (Formatters.desimal(jumlah) > 2) {
                                errJumlah = "Jumlah USD maksimal 2 angka di belakang koma."
                                ok = false
                            } else if (lewat) {
                                errJumlah = "Maksimal yang bisa kamu tarik hari ini ${Formatters.usd(pos.netUsd)}."
                                ok = false
                            }
                            if (alamat.trim().isNotEmpty() && !Formatters.isSolanaAddress(alamat)) {
                                errAlamat = "Alamat wallet Solana harus 32–44 karakter (huruf dan angka base58)."
                                ok = false
                            }
                            if (ok) {
                                konfirmasiNet = pos.netUsd
                            }
                        },
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            }
    }

    if (konfirmasiNet != null && n != null) {
        val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
        ModalBottomSheet(
            onDismissRequest = { konfirmasiNet = null },
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
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                Text(
                    text = "Tarik ${Formatters.usd(n)}?",
                    style = PastiCuanTheme.typography.pageTitle.copy(fontSize = 19.sp),
                    color = c.ink
                )
                if (sim != null) {
                    Text(
                        text = "Fee ${Formatters.usd(sim.feeDibayar)} akan dibayarkan ke pengelola. Sisa nilai kamu ${Formatters.usd(sim.sisaNetUsd)}.",
                        style = PastiCuanTheme.typography.body.copy(fontSize = 15.sp),
                        color = c.ink
                    )
                }
                Text(
                    text = "Uang dikirim pengelola di luar app. Kamu bisa membatalkan selama status masih menunggu.",
                    style = PastiCuanTheme.typography.caption,
                    color = c.inkMuted
                )
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    PastiCuanButton(
                        text = "Batal",
                        isPrimary = false,
                        onClick = { konfirmasiNet = null },
                        modifier = Modifier.weight(1f)
                    )
                    PastiCuanButton(
                        text = if (state.sedangMengirim) "Mengirim…" else "Ya, ajukan",
                        isPrimary = true,
                        enabled = !state.sedangMengirim,
                        onClick = {
                            val baseline = konfirmasiNet ?: pos.netUsd
                            if (abs(baseline - pos.netUsd) > 0.004) {
                                konfirmasiNet = null
                                errForm = "Angka baru saja diperbarui. Cek lagi simulasi kamu."
                            } else {
                                scope.launch {
                                    val gagal = viewModel.ajukanTarik(n, alamat.trim(), catatan.trim())
                                    konfirmasiNet = null
                                    if (gagal != null) errForm = gagal
                                }
                            }
                        },
                        modifier = Modifier.weight(1f)
                    )
                }
                Spacer(Modifier.height(16.dp))
            }
        }
    }
}
