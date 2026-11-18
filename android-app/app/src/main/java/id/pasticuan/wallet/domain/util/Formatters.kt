package id.pasticuan.wallet.domain.util

import id.pasticuan.wallet.domain.model.Satuan
import java.math.BigDecimal
import java.math.RoundingMode
import java.text.DecimalFormat
import java.text.DecimalFormatSymbols
import java.time.Instant
import java.time.LocalDate
import java.time.OffsetDateTime
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter
import java.time.temporal.ChronoUnit
import java.util.Locale
import kotlin.math.abs

object Formatters {
    const val MINUS = "−" // U+2212 sesuai DESIGN.md & BR-14

    private val idSymbols = DecimalFormatSymbols(Locale("id", "ID")).apply {
        groupingSeparator = '.'
        decimalSeparator = ','
    }

    private val bulan = arrayOf(
        "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
        "Jul", "Agu", "Sep", "Okt", "Nov", "Des"
    )

    private val wibOffset: ZoneOffset = ZoneOffset.ofHours(7)
    private val solanaRegex = Regex("^[1-9A-HJ-NP-Za-km-z]{32,44}$")

    fun rounded(x: Double, decimals: Int): Double {
        if (x.isNaN() || x.isInfinite()) return 0.0
        val bd = BigDecimal.valueOf(x).setScale(decimals, RoundingMode.HALF_UP)
        val v = bd.toDouble()
        return if (v == 0.0) 0.0 else v
    }

    private fun nf(x: Double, decimals: Int): String {
        val pattern = if (decimals > 0) {
            "#,##0." + "0".repeat(decimals)
        } else {
            "#,##0"
        }
        val df = DecimalFormat(pattern, idSymbols)
        return df.format(abs(x))
    }

    fun angka(x: Double, decimals: Int): String {
        val r = rounded(x, decimals)
        return (if (r < 0) MINUS else "") + nf(r, decimals)
    }

    fun usd(x: Double): String {
        val r = rounded(x, 2)
        return (if (r < 0) MINUS else "") + "US$" + nf(r, 2)
    }

    fun sol(x: Double): String {
        val r = rounded(x, 4)
        return (if (r < 0) MINUS else "") + nf(r, 4) + " SOL"
    }

    fun uang(x: Double, satuan: Satuan): String =
        if (satuan == Satuan.USD) usd(x) else sol(x)

    fun bertanda(x: Double, satuan: Satuan): String {
        val d = if (satuan == Satuan.USD) 2 else 4
        val r = rounded(x, d)
        val sign = if (r < 0) MINUS else "+"
        return if (satuan == Satuan.USD) "${sign}US$${nf(r, 2)}" else "${sign}${nf(r, 4)} SOL"
    }

    fun persen(x: Double): String = nf(rounded(x, 2), 2) + "%"

    fun persenBertanda(x: Double): String {
        val r = rounded(x, 2)
        val sign = if (r < 0) MINUS else "+"
        return sign + nf(r, 2) + "%"
    }

    fun isNegative(x: Double, decimals: Int = 2): Boolean = rounded(x, decimals) < 0.0

    fun parseAngka(teks: String): Double? {
        val clean = teks.trim().replace(Regex("\\s+"), "").replace(Regex("^US\\$", RegexOption.IGNORE_CASE), "")
        if (clean.isEmpty()) return null
        val norm = when {
            clean.contains(",") -> clean.replace(".", "").replace(",", ".")
            clean.count { it == '.' } > 1 -> clean.replace(".", "")
            else -> clean
        }
        if (!Regex("^-?\\d+(\\.\\d+)?$").matches(norm)) return null
        return norm.toDoubleOrNull()
    }

    fun desimal(teks: String): Int {
        val t = teks.trim()
        val sep = when {
            t.contains(",") -> ","
            t.count { it == '.' } == 1 -> "."
            else -> ""
        }
        return if (sep.isNotEmpty()) t.length - t.lastIndexOf(sep) - 1 else 0
    }

    private val wibIsoFmt = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss'+07:00'")
    private val shortOffsetRegex = Regex("([+-]\\d{2})$")
    private val compactOffsetRegex = Regex("([+-]\\d{2})(\\d{2})$")

    /**
     * Parsing ISO-8601 maupun stempel waktu Postgres/PostgREST (mis. `2026-11-17 01:00:00+00`,
     * `2026-11-17T01:00:00.123456+00:00`, `2026-11-17T01:00:00Z`, atau `2026-11-17`) menjadi [Instant].
     */
    fun parseInstantSafe(iso: String): Instant {
        var s = iso.trim()
        if (s.isEmpty()) return Instant.EPOCH
        if (s.length <= 10) {
            return LocalDate.parse(s).atStartOfDay(wibOffset).toInstant()
        }
        if (s.length > 10 && s[10] == ' ') {
            s = s.substring(0, 10) + "T" + s.substring(11)
        }
        s = shortOffsetRegex.replace(s, "$1:00")
        s = compactOffsetRegex.replace(s, "$1:$2")
        return runCatching { OffsetDateTime.parse(s).toInstant() }
            .recoverCatching { Instant.parse(s) }
            .recoverCatching { java.time.LocalDateTime.parse(s).atOffset(wibOffset).toInstant() }
            .getOrDefault(Instant.EPOCH)
    }

    fun ms(iso: String): Long = parseInstantSafe(iso).toEpochMilli()

    fun msSnapshot(tanggal: String, jam: String = "08:00"): Long =
        ms("${tanggal}T${jam}:00+07:00")

    fun isoWib(epochMs: Long): String {
        val odt = Instant.ofEpochMilli(epochMs).atOffset(wibOffset)
        return odt.format(DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:00'+07:00'"))
    }

    fun wibIso(iso: String): String {
        val trimmed = iso.trim()
        if (trimmed.length <= 10) return trimmed
        return try {
            parseInstantSafe(trimmed).atOffset(wibOffset).format(wibIsoFmt)
        } catch (_: Exception) {
            trimmed
        }
    }

    fun tanggal(iso: String): String {
        val s = wibIso(iso)
        if (s.length < 10) return s
        val parts = s.substring(0, 10).split("-")
        if (parts.size < 3) return s
        val y = parts[0].toIntOrNull() ?: return s
        val m = parts[1].toIntOrNull()?.coerceIn(1, 12) ?: return s
        val d = parts[2].toIntOrNull() ?: return s
        return "$d ${bulan[m - 1]} $y"
    }

    fun jam(iso: String): String {
        val s = wibIso(iso)
        return if (s.length >= 16) s.substring(11, 16).replace(":", ".") else s
    }

    fun waktu(iso: String): String {
        val s = wibIso(iso)
        return if (s.length >= 16) "${tanggal(s)}, ${s.substring(11, 16).replace(":", ".")} WIB" else tanggal(s)
    }

    fun selisihHari(dari: String, sampai: String): Int {
        val d1 = LocalDate.parse(dari.substring(0, 10))
        val d2 = LocalDate.parse(sampai.substring(0, 10))
        return ChronoUnit.DAYS.between(d1, d2).toInt()
    }

    fun tambahHari(iso: String, hari: Long): String =
        LocalDate.parse(iso.substring(0, 10)).plusDays(hari).toString()

    fun isSolanaAddress(alamat: String): Boolean =
        solanaRegex.matches(alamat.trim())

    fun ringkasAlamat(alamat: String): String {
        val s = alamat.trim()
        return if (s.length <= 12) s else "${s.take(6)}…${s.takeLast(4)}"
    }
}
