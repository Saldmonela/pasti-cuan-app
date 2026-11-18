package id.pasticuan.wallet.ui.screens

import android.app.DatePickerDialog
import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import id.pasticuan.wallet.domain.model.Jenis
import id.pasticuan.wallet.domain.model.Peran
import id.pasticuan.wallet.domain.util.Formatters
import id.pasticuan.wallet.ui.components.FloatingSubScreenLayout
import id.pasticuan.wallet.ui.components.PastiCuanButton
import id.pasticuan.wallet.ui.components.PastiCuanCard
import id.pasticuan.wallet.ui.components.PastiCuanIcons
import id.pasticuan.wallet.ui.components.RoleChip
import id.pasticuan.wallet.ui.components.StatusBanners
import id.pasticuan.wallet.ui.state.AppRoute
import id.pasticuan.wallet.ui.state.AppUiState
import id.pasticuan.wallet.ui.state.AppViewModel
import id.pasticuan.wallet.ui.theme.PastiCuanTheme
import kotlinx.coroutines.delay
import java.time.LocalDate

@Composable
fun SetorScreen(
    state: AppUiState,
    viewModel: AppViewModel
) {
    val c = PastiCuanTheme.colors
    val context = LocalContext.current
    val clipboard = LocalClipboardManager.current
    val data = state.data ?: return
    val saya = state.saya ?: return

    var jumlah by rememberSaveable { mutableStateOf("") }
    var tanggalTransfer by rememberSaveable { mutableStateOf(state.hariIni) }
    var bukti by rememberSaveable { mutableStateOf("") }
    var catatan by rememberSaveable { mutableStateOf("") }
    var errJumlah by remember { mutableStateOf<String?>(null) }
    var errTanggal by remember { mutableStateOf<String?>(null) }
    var errForm by remember { mutableStateOf<String?>(null) }
    var tersalin by remember { mutableStateOf(false) }

    LaunchedEffect(tersalin) {
        if (tersalin) {
            delay(2000)
            tersalin = false
        }
    }

    val pending = state.menunggu.firstOrNull { it.anggotaId == saya.id && it.jenis == Jenis.SETOR }
    val nonaktif = state.offline || pending != null
    val walletPool = data.pengaturan.alamatWalletPool
    val pengelolaNama = data.anggota.firstOrNull { it.peran == Peran.PENGELOLA && it.aktif }?.nama
        ?: data.anggota.firstOrNull { it.peran == Peran.PENGELOLA }?.nama
        ?: "Pengelola"

    FloatingSubScreenLayout(
        judul = "Setor modal",
        onBack = { viewModel.navigateBack(AppRoute.BERANDA) },
        useImePadding = true,
        bottomPadding = 36.dp
    ) {
            item {
                StatusBanners(state = state)
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
                            text = "Kamu masih punya permintaan setoran ${Formatters.usd(pending.jumlahUsd)} yang menunggu. Batalkan atau tunggu yang itu selesai dulu. Lihat permintaan",
                            style = PastiCuanTheme.typography.label,
                            color = c.warningInk
                        )
                    }
                }
            }

            item {
                PastiCuanCard {
                    Text(
                        text = "Cara kerjanya",
                        style = PastiCuanTheme.typography.title,
                        color = c.ink
                    )
                    Spacer(Modifier.height(8.dp))
                    val steps = listOf(
                        "1. Kirim dana ke alamat wallet pool Pasti Cuan di bawah ini.",
                        "2. Ajukan setoran di formulir ini sesuai jumlah dan tanggal transfernya.",
                        "3. $pengelolaNama mencocokkan transfer kamu. Unit dihitung memakai nilai pool saat transfer terdeteksi di wallet."
                    )
                    steps.forEach { step ->
                        Text(
                            text = step,
                            style = PastiCuanTheme.typography.caption,
                            color = c.inkMuted,
                            modifier = Modifier.padding(bottom = 4.dp)
                        )
                    }

                    Spacer(Modifier.height(10.dp))
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(16.dp))
                            .background(c.field)
                            .padding(14.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = "Alamat wallet tujuan (Solana)",
                                style = PastiCuanTheme.typography.label.copy(fontWeight = FontWeight.SemiBold),
                                color = c.ink
                            )
                            RoleChip("SOL / USDC")
                        }

                        Text(
                            text = walletPool,
                            style = PastiCuanTheme.typography.bodyTabular.copy(fontSize = 13.5.sp),
                            color = c.ink
                        )

                        Row(
                            horizontalArrangement = Arrangement.spacedBy(6.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(
                                modifier = Modifier
                                    .height(40.dp)
                                    .clip(CircleShape)
                                    .background(c.forestWash)
                                    .clickable {
                                        clipboard.setText(AnnotatedString(walletPool))
                                        tersalin = true
                                        viewModel.tampilkanToast("Alamat wallet pool disalin.")
                                    }
                                    .padding(horizontal = 14.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(6.dp)
                            ) {
                                Icon(
                                    imageVector = if (tersalin) PastiCuanIcons.Check else PastiCuanIcons.Copy,
                                    contentDescription = null,
                                    tint = c.forestInk,
                                    modifier = Modifier.size(16.dp)
                                )
                                Text(
                                    text = if (tersalin) "Tersalin" else "Salin alamat",
                                    style = PastiCuanTheme.typography.body.copy(fontWeight = FontWeight.SemiBold),
                                    color = c.forestInk
                                )
                            }

                            Row(
                                modifier = Modifier
                                    .height(40.dp)
                                    .clip(CircleShape)
                                    .clickable {
                                        val intent = Intent(
                                            Intent.ACTION_VIEW,
                                            Uri.parse("https://solscan.io/account/$walletPool")
                                        )
                                        context.startActivity(intent)
                                    }
                                    .padding(horizontal = 10.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(6.dp)
                            ) {
                                Icon(
                                    imageVector = PastiCuanIcons.ExternalLink,
                                    contentDescription = null,
                                    tint = c.forestInk,
                                    modifier = Modifier.size(16.dp)
                                )
                                Text(
                                    text = "Cek di Solscan",
                                    style = PastiCuanTheme.typography.body.copy(fontWeight = FontWeight.SemiBold),
                                    color = c.forestInk
                                )
                            }
                        }

                        Text(
                            text = "Kirim hanya lewat jaringan Solana (SOL atau USDC) supaya dana tidak hilang.",
                            style = PastiCuanTheme.typography.caption,
                            color = c.inkMuted
                        )
                    }
                }
            }

            item {
                PastiCuanCard {
                    Text(
                        text = "Jumlah setoran",
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
                    }
                    if (errJumlah != null) {
                        Spacer(Modifier.height(6.dp))
                        FieldErrorRow(errJumlah!!)
                    } else {
                        Spacer(Modifier.height(6.dp))
                        Text(
                            text = "Dalam USD, sesuai jumlah yang kamu transfer.",
                            style = PastiCuanTheme.typography.caption,
                            color = c.inkMuted
                        )
                    }

                    Spacer(Modifier.height(16.dp))

                    // Tanggal transfer
                    Text(
                        text = "Tanggal transfer",
                        style = PastiCuanTheme.typography.label.copy(fontWeight = FontWeight.SemiBold),
                        color = c.ink
                    )
                    Spacer(Modifier.height(6.dp))
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(52.dp)
                            .clip(RoundedCornerShape(16.dp))
                            .background(if (errTanggal != null) c.card else c.field)
                            .then(
                                if (errTanggal != null) Modifier.border(1.5.dp, c.loss, RoundedCornerShape(16.dp))
                                else Modifier
                            )
                            .clickable(enabled = !nonaktif) {
                                val parsed = runCatching { LocalDate.parse(tanggalTransfer) }
                                    .getOrElse { LocalDate.parse(state.hariIni) }
                                DatePickerDialog(
                                    context,
                                    { _, year, month, dayOfMonth ->
                                        val picked = LocalDate.of(year, month + 1, dayOfMonth).toString()
                                        tanggalTransfer = picked
                                        errTanggal = null
                                    },
                                    parsed.year,
                                    parsed.monthValue - 1,
                                    parsed.dayOfMonth
                                ).show()
                            }
                            .padding(horizontal = 16.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = Formatters.tanggal(tanggalTransfer),
                            style = PastiCuanTheme.typography.body.copy(fontSize = 16.sp, fontFeatureSettings = "tnum"),
                            color = c.ink
                        )
                        Icon(
                            imageVector = PastiCuanIcons.Calendar,
                            contentDescription = "Pilih tanggal",
                            tint = c.inkMuted,
                            modifier = Modifier.size(18.dp)
                        )
                    }
                    if (errTanggal != null) {
                        Spacer(Modifier.height(6.dp))
                        FieldErrorRow(errTanggal!!)
                    }

                    Spacer(Modifier.height(16.dp))

                    // Bukti transaksi
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text(
                            text = "Bukti transaksi",
                            style = PastiCuanTheme.typography.label.copy(fontWeight = FontWeight.SemiBold),
                            color = c.ink
                        )
                        Text("Opsional", style = PastiCuanTheme.typography.label, color = c.inkMuted)
                    }
                    Spacer(Modifier.height(6.dp))
                    BasicTextField(
                        value = bukti,
                        onValueChange = { if (it.length <= 100) bukti = it },
                        enabled = !nonaktif,
                        singleLine = true,
                        textStyle = PastiCuanTheme.typography.body.copy(fontSize = 16.sp, color = c.ink),
                        cursorBrush = SolidColor(c.forestInk),
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(52.dp)
                            .clip(RoundedCornerShape(16.dp))
                            .background(c.field)
                            .padding(horizontal = 16.dp),
                        decorationBox = { inner ->
                            Box(contentAlignment = Alignment.CenterStart) {
                                if (bukti.isEmpty()) {
                                    Text(
                                        text = "Hash transaksi atau keterangan transfer",
                                        style = PastiCuanTheme.typography.body.copy(fontSize = 15.sp),
                                        color = c.inkMuted.copy(alpha = 0.55f)
                                    )
                                }
                                inner()
                            }
                        }
                    )
                    Spacer(Modifier.height(6.dp))
                    Text(
                        text = "Misalnya hash transaksi atau keterangan transfer. Maks. 100 karakter.",
                        style = PastiCuanTheme.typography.caption,
                        color = c.inkMuted
                    )

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
                        text = "Ajukan setoran",
                        enabled = !nonaktif,
                        onClick = {
                            val n = Formatters.parseAngka(jumlah)
                            var ok = true
                            if (n == null || n <= 0.0) {
                                errJumlah = "Tulis jumlah setoran lebih dari 0."
                                ok = false
                            } else if (Formatters.desimal(jumlah) > 2) {
                                errJumlah = "Jumlah USD maksimal 2 angka di belakang koma."
                                ok = false
                            }
                            if (tanggalTransfer.isBlank()) {
                                errTanggal = "Pilih tanggal transfer."
                                ok = false
                            } else if (tanggalTransfer > state.hariIni) {
                                errTanggal = "Tanggal transfer tidak boleh di masa depan."
                                ok = false
                            } else if (tanggalTransfer < data.pengaturan.tanggalMulai) {
                                errTanggal = "Tanggal transfer tidak boleh sebelum ${Formatters.tanggal(data.pengaturan.tanggalMulai)}."
                                ok = false
                            }
                            if (ok && n != null) {
                                val gagal = viewModel.ajukanSetor(n, tanggalTransfer, bukti.trim(), catatan.trim())
                                if (gagal != null) errForm = gagal
                            }
                        },
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            }
    }
}

@Composable
fun FieldErrorRow(message: String) {
    val c = PastiCuanTheme.colors
    Row(
        verticalAlignment = Alignment.Top,
        horizontalArrangement = Arrangement.spacedBy(6.dp)
    ) {
        Icon(
            imageVector = PastiCuanIcons.ExclamationCircle,
            contentDescription = null,
            tint = c.loss,
            modifier = Modifier.padding(top = 1.dp).size(15.dp)
        )
        Text(
            text = message,
            style = PastiCuanTheme.typography.caption.copy(fontSize = 12.5.sp),
            color = c.loss
        )
    }
}
