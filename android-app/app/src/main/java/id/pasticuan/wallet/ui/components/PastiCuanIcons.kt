package id.pasticuan.wallet.ui.components

import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.PathFillType
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.graphics.vector.PathBuilder
import androidx.compose.ui.graphics.vector.path
import androidx.compose.ui.unit.dp

/**
 * Sistem ikon vektor garis tipis (stroke 2dp, round cap & join) setara @tabler/icons-react
 * yang dipakai di pasti-cuan-app Web agar identitas visual 1:1 tanpa glyph teks/emoji.
 */
object PastiCuanIcons {

    private inline fun strokeIcon(
        name: String,
        strokeWidth: Float = 2f,
        block: PathBuilder.() -> Unit
    ): ImageVector = ImageVector.Builder(
        name = name,
        defaultWidth = 24.dp,
        defaultHeight = 24.dp,
        viewportWidth = 24f,
        viewportHeight = 24f
    ).apply {
        path(
            fill = null,
            stroke = SolidColor(Color.White),
            strokeLineWidth = strokeWidth,
            strokeLineCap = StrokeCap.Round,
            strokeLineJoin = StrokeJoin.Round,
            pathFillType = PathFillType.NonZero,
            pathBuilder = block
        )
    }.build()

    // Tabler IconHome
    val Home: ImageVector by lazy {
        strokeIcon("Home") {
            moveTo(5f, 12f)
            lineTo(3f, 12f)
            lineTo(12f, 3f)
            lineTo(21f, 12f)
            lineTo(19f, 12f)
            moveTo(5f, 12f)
            verticalLineTo(19f)
            arcTo(2f, 2f, 0f, false, false, 7f, 21f)
            horizontalLineTo(17f)
            arcTo(2f, 2f, 0f, false, false, 19f, 19f)
            verticalLineTo(12f)
            moveTo(9f, 21f)
            verticalLineTo(15f)
            arcTo(2f, 2f, 0f, false, true, 11f, 13f)
            horizontalLineTo(13f)
            arcTo(2f, 2f, 0f, false, true, 15f, 15f)
            verticalLineTo(21f)
        }
    }

    // Tabler IconChartPie (Pool)
    val ChartPie: ImageVector by lazy {
        strokeIcon("ChartPie") {
            moveTo(10f, 3.2f)
            arcTo(9f, 9f, 0f, true, false, 20.8f, 14f)
            arcTo(1f, 1f, 0f, false, false, 19.8f, 13f)
            horizontalLineTo(13f)
            arcTo(2f, 2f, 0f, false, true, 11f, 11f)
            verticalLineTo(4.2f)
            arcTo(0.9f, 0.9f, 0f, false, false, 10f, 3.2f)
            close()
            moveTo(15f, 3.5f)
            arcTo(9f, 9f, 0f, false, true, 20.5f, 9f)
            horizontalLineTo(16f)
            arcTo(1f, 1f, 0f, false, true, 15f, 8f)
            verticalLineTo(3.5f)
            close()
        }
    }

    // Tabler IconArrowsExchange (Transaksi)
    val ArrowsExchange: ImageVector by lazy {
        strokeIcon("ArrowsExchange") {
            moveTo(7f, 10f)
            horizontalLineTo(21f)
            lineTo(17f, 6f)
            moveTo(17f, 14f)
            horizontalLineTo(3f)
            lineTo(7f, 18f)
        }
    }

    // Tabler IconLayoutDashboard (Kelola)
    val LayoutDashboard: ImageVector by lazy {
        strokeIcon("LayoutDashboard") {
            moveTo(5f, 4f)
            horizontalLineTo(9f)
            arcTo(1f, 1f, 0f, false, true, 10f, 5f)
            verticalLineTo(11f)
            arcTo(1f, 1f, 0f, false, true, 9f, 12f)
            horizontalLineTo(5f)
            arcTo(1f, 1f, 0f, false, true, 4f, 11f)
            verticalLineTo(5f)
            arcTo(1f, 1f, 0f, false, true, 5f, 4f)
            close()

            moveTo(5f, 16f)
            horizontalLineTo(9f)
            arcTo(1f, 1f, 0f, false, true, 10f, 17f)
            verticalLineTo(19f)
            arcTo(1f, 1f, 0f, false, true, 9f, 20f)
            horizontalLineTo(5f)
            arcTo(1f, 1f, 0f, false, true, 4f, 19f)
            verticalLineTo(17f)
            arcTo(1f, 1f, 0f, false, true, 5f, 16f)
            close()

            moveTo(15f, 12f)
            horizontalLineTo(19f)
            arcTo(1f, 1f, 0f, false, true, 20f, 13f)
            verticalLineTo(19f)
            arcTo(1f, 1f, 0f, false, true, 19f, 20f)
            horizontalLineTo(15f)
            arcTo(1f, 1f, 0f, false, true, 14f, 19f)
            verticalLineTo(13f)
            arcTo(1f, 1f, 0f, false, true, 15f, 12f)
            close()

            moveTo(15f, 4f)
            horizontalLineTo(19f)
            arcTo(1f, 1f, 0f, false, true, 20f, 5f)
            verticalLineTo(7f)
            arcTo(1f, 1f, 0f, false, true, 19f, 8f)
            horizontalLineTo(15f)
            arcTo(1f, 1f, 0f, false, true, 14f, 7f)
            verticalLineTo(5f)
            arcTo(1f, 1f, 0f, false, true, 15f, 4f)
            close()
        }
    }

    // Tabler IconDots (Lainnya)
    val Dots: ImageVector by lazy {
        strokeIcon("Dots") {
            moveTo(5f, 11f)
            arcTo(1f, 1f, 0f, true, false, 5f, 13f)
            arcTo(1f, 1f, 0f, true, false, 5f, 11f)
            close()
            moveTo(12f, 11f)
            arcTo(1f, 1f, 0f, true, false, 12f, 13f)
            arcTo(1f, 1f, 0f, true, false, 12f, 11f)
            close()
            moveTo(19f, 11f)
            arcTo(1f, 1f, 0f, true, false, 19f, 13f)
            arcTo(1f, 1f, 0f, true, false, 19f, 11f)
            close()
        }
    }

    // Tabler IconCurrencyDollar
    val CurrencyDollar: ImageVector by lazy {
        strokeIcon("CurrencyDollar") {
            moveTo(16.7f, 8f)
            arcTo(3f, 3f, 0f, false, false, 14f, 6f)
            horizontalLineTo(10f)
            arcTo(3f, 3f, 0f, false, false, 10f, 12f)
            horizontalLineTo(14f)
            arcTo(3f, 3f, 0f, false, true, 14f, 18f)
            horizontalLineTo(10f)
            arcTo(3f, 3f, 0f, false, true, 7.3f, 16f)
            moveTo(12f, 3f)
            verticalLineTo(6f)
            moveTo(12f, 18f)
            verticalLineTo(21f)
        }
    }

    // Tabler IconCurrencySolana (3 jajar genjang resmi Solana)
    val CurrencySolana: ImageVector by lazy {
        strokeIcon("CurrencySolana", strokeWidth = 1.85f) {
            // Baris bawah
            moveTo(4f, 18f)
            horizontalLineTo(16f)
            lineTo(20f, 14f)
            horizontalLineTo(8f)
            close()
            // Baris tengah
            moveTo(8f, 14f)
            lineTo(4f, 10f)
            horizontalLineTo(16f)
            lineTo(20f, 14f)
            // Baris atas
            moveTo(16f, 10f)
            lineTo(20f, 6f)
            horizontalLineTo(8f)
            lineTo(4f, 10f)
        }
    }

    // Tabler IconPlus
    val Plus: ImageVector by lazy {
        strokeIcon("Plus") {
            moveTo(12f, 5f)
            verticalLineTo(19f)
            moveTo(5f, 12f)
            horizontalLineTo(19f)
        }
    }

    // Tabler IconArrowUpRight
    val ArrowUpRight: ImageVector by lazy {
        strokeIcon("ArrowUpRight") {
            moveTo(17f, 7f)
            lineTo(7f, 17f)
            moveTo(8f, 7f)
            horizontalLineTo(17f)
            verticalLineTo(16f)
        }
    }

    // Tabler IconArrowDownLeft
    val ArrowDownLeft: ImageVector by lazy {
        strokeIcon("ArrowDownLeft") {
            moveTo(17f, 7f)
            lineTo(7f, 17f)
            moveTo(16f, 17f)
            horizontalLineTo(7f)
            verticalLineTo(8f)
        }
    }

    // Tabler IconChevronLeft
    val ChevronLeft: ImageVector by lazy {
        strokeIcon("ChevronLeft") {
            moveTo(15f, 6f)
            lineTo(9f, 12f)
            lineTo(15f, 18f)
        }
    }

    // Tabler IconChevronRight
    val ChevronRight: ImageVector by lazy {
        strokeIcon("ChevronRight") {
            moveTo(9f, 6f)
            lineTo(15f, 12f)
            lineTo(9f, 18f)
        }
    }

    // Tabler IconCalendar
    val Calendar: ImageVector by lazy {
        strokeIcon("Calendar") {
            moveTo(4f, 7f)
            arcTo(2f, 2f, 0f, false, true, 6f, 5f)
            horizontalLineTo(18f)
            arcTo(2f, 2f, 0f, false, true, 20f, 7f)
            verticalLineTo(19f)
            arcTo(2f, 2f, 0f, false, true, 18f, 21f)
            horizontalLineTo(6f)
            arcTo(2f, 2f, 0f, false, true, 4f, 19f)
            close()
            moveTo(16f, 3f)
            verticalLineTo(7f)
            moveTo(8f, 3f)
            verticalLineTo(7f)
            moveTo(4f, 11f)
            horizontalLineTo(20f)
        }
    }

    // Tabler IconInfoCircle
    val InfoCircle: ImageVector by lazy {
        strokeIcon("InfoCircle") {
            moveTo(12f, 3f)
            arcTo(9f, 9f, 0f, true, false, 12f, 21f)
            arcTo(9f, 9f, 0f, true, false, 12f, 3f)
            close()
            moveTo(12f, 8.5f)
            horizontalLineTo(12.01f)
            moveTo(11f, 12f)
            horizontalLineTo(12f)
            verticalLineTo(16f)
            horizontalLineTo(13f)
        }
    }

    // Tabler IconCircleCheck
    val CircleCheck: ImageVector by lazy {
        strokeIcon("CircleCheck") {
            moveTo(12f, 3f)
            arcTo(9f, 9f, 0f, true, false, 12f, 21f)
            arcTo(9f, 9f, 0f, true, false, 12f, 3f)
            close()
            moveTo(9f, 12f)
            lineTo(11f, 14f)
            lineTo(15f, 10f)
        }
    }

    // Tabler IconAlertTriangle
    val AlertTriangle: ImageVector by lazy {
        strokeIcon("AlertTriangle") {
            moveTo(12f, 9f)
            verticalLineTo(13f)
            moveTo(12f, 17f)
            horizontalLineTo(12.01f)
            moveTo(10.36f, 3.59f)
            lineTo(2.26f, 17.14f)
            arcTo(1.9f, 1.9f, 0f, false, false, 3.9f, 20f)
            horizontalLineTo(20.1f)
            arcTo(1.9f, 1.9f, 0f, false, false, 21.74f, 17.14f)
            lineTo(13.64f, 3.59f)
            arcTo(1.9f, 1.9f, 0f, false, false, 10.36f, 3.59f)
            close()
        }
    }

    // Tabler IconExclamationCircle
    val ExclamationCircle: ImageVector by lazy {
        strokeIcon("ExclamationCircle") {
            moveTo(12f, 3f)
            arcTo(9f, 9f, 0f, true, false, 12f, 21f)
            arcTo(9f, 9f, 0f, true, false, 12f, 3f)
            close()
            moveTo(12f, 8f)
            verticalLineTo(12.5f)
            moveTo(12f, 16f)
            horizontalLineTo(12.01f)
        }
    }

    // Tabler IconWifiOff
    val WifiOff: ImageVector by lazy {
        strokeIcon("WifiOff") {
            moveTo(3f, 3f)
            lineTo(21f, 21f)
            moveTo(12f, 18f)
            horizontalLineTo(12.01f)
            moveTo(9.17f, 15.17f)
            arcTo(4f, 4f, 0f, false, true, 14.83f, 15.17f)
            moveTo(6.34f, 12.34f)
            arcTo(8f, 8f, 0f, false, true, 9.2f, 10.4f)
            moveTo(13.5f, 10.2f)
            arcTo(8f, 8f, 0f, false, true, 17.66f, 12.34f)
            moveTo(3.52f, 9.52f)
            arcTo(12f, 12f, 0f, false, true, 6.5f, 7.3f)
            moveTo(10.5f, 6.1f)
            arcTo(12f, 12f, 0f, false, true, 20.48f, 9.52f)
        }
    }

    // Tabler IconLock
    val Lock: ImageVector by lazy {
        strokeIcon("Lock") {
            moveTo(7f, 11f)
            horizontalLineTo(17f)
            arcTo(2f, 2f, 0f, false, true, 19f, 13f)
            verticalLineTo(19f)
            arcTo(2f, 2f, 0f, false, true, 17f, 21f)
            horizontalLineTo(7f)
            arcTo(2f, 2f, 0f, false, true, 5f, 19f)
            verticalLineTo(13f)
            arcTo(2f, 2f, 0f, false, true, 7f, 11f)
            close()
            moveTo(8f, 11f)
            verticalLineTo(7f)
            arcTo(4f, 4f, 0f, false, true, 16f, 7f)
            verticalLineTo(11f)
            moveTo(12f, 15.5f)
            verticalLineTo(16.5f)
        }
    }

    // Tabler IconBook
    val Book: ImageVector by lazy {
        strokeIcon("Book") {
            moveTo(3f, 19f)
            arcTo(9f, 9f, 0f, false, true, 12f, 19f)
            arcTo(9f, 9f, 0f, false, true, 21f, 19f)
            moveTo(3f, 6f)
            arcTo(9f, 9f, 0f, false, true, 12f, 6f)
            arcTo(9f, 9f, 0f, false, true, 21f, 6f)
            moveTo(3f, 6f)
            verticalLineTo(19f)
            moveTo(12f, 6f)
            verticalLineTo(19f)
            moveTo(21f, 6f)
            verticalLineTo(19f)
        }
    }

    // Tabler IconHistory
    val History: ImageVector by lazy {
        strokeIcon("History") {
            moveTo(12f, 8f)
            verticalLineTo(12f)
            lineTo(14.5f, 14.5f)
            moveTo(3.05f, 11f)
            arcTo(9f, 9f, 0f, true, true, 3.55f, 15f)
            moveTo(3.05f, 20f)
            verticalLineTo(15f)
            horizontalLineTo(8.05f)
        }
    }

    // Tabler IconReceipt
    val Receipt: ImageVector by lazy {
        strokeIcon("Receipt") {
            moveTo(5f, 21f)
            verticalLineTo(5f)
            arcTo(2f, 2f, 0f, false, true, 7f, 3f)
            horizontalLineTo(17f)
            arcTo(2f, 2f, 0f, false, true, 19f, 5f)
            verticalLineTo(21f)
            lineTo(16f, 19f)
            lineTo(14f, 21f)
            lineTo(12f, 19f)
            lineTo(10f, 21f)
            lineTo(8f, 19f)
            close()
            moveTo(9f, 8f)
            horizontalLineTo(15f)
            moveTo(9f, 12f)
            horizontalLineTo(15f)
            moveTo(9f, 16f)
            horizontalLineTo(13f)
        }
    }

    // Tabler IconMoonStars
    val MoonStars: ImageVector by lazy {
        strokeIcon("MoonStars") {
            moveTo(12f, 3f)
            arcTo(7.5f, 7.5f, 0f, false, false, 20f, 15.4f)
            arcTo(9f, 9f, 0f, true, true, 12f, 3f)
            close()
            moveTo(17f, 4f)
            verticalLineTo(8f)
            moveTo(15f, 6f)
            horizontalLineTo(19f)
        }
    }

    // Tabler IconCopy
    val Copy: ImageVector by lazy {
        strokeIcon("Copy") {
            moveTo(9f, 7f)
            horizontalLineTo(18f)
            arcTo(2f, 2f, 0f, false, true, 20f, 9f)
            verticalLineTo(18f)
            arcTo(2f, 2f, 0f, false, true, 18f, 20f)
            horizontalLineTo(9f)
            arcTo(2f, 2f, 0f, false, true, 7f, 18f)
            verticalLineTo(9f)
            arcTo(2f, 2f, 0f, false, true, 9f, 7f)
            close()
            moveTo(16f, 7f)
            verticalLineTo(6f)
            arcTo(2f, 2f, 0f, false, false, 14f, 4f)
            horizontalLineTo(6f)
            arcTo(2f, 2f, 0f, false, false, 4f, 6f)
            verticalLineTo(14f)
            arcTo(2f, 2f, 0f, false, false, 6f, 16f)
            horizontalLineTo(7f)
        }
    }

    // Tabler IconCheck
    val Check: ImageVector by lazy {
        strokeIcon("Check") {
            moveTo(5f, 12f)
            lineTo(10f, 17f)
            lineTo(20f, 7f)
        }
    }

    // Tabler IconExternalLink
    val ExternalLink: ImageVector by lazy {
        strokeIcon("ExternalLink") {
            moveTo(12f, 6f)
            horizontalLineTo(6f)
            arcTo(2f, 2f, 0f, false, false, 4f, 8f)
            verticalLineTo(18f)
            arcTo(2f, 2f, 0f, false, false, 6f, 20f)
            horizontalLineTo(16f)
            arcTo(2f, 2f, 0f, false, false, 18f, 18f)
            verticalLineTo(12f)
            moveTo(11f, 13f)
            lineTo(20f, 4f)
            moveTo(15f, 4f)
            horizontalLineTo(20f)
            verticalLineTo(9f)
        }
    }

    // Tabler IconScale (Snapshot saldo)
    val Scale: ImageVector by lazy {
        strokeIcon("Scale") {
            moveTo(7f, 20f)
            horizontalLineTo(17f)
            moveTo(12f, 3f)
            verticalLineTo(20f)
            moveTo(6f, 6f)
            lineTo(12f, 5f)
            lineTo(18f, 6f)
            moveTo(6f, 6f)
            lineTo(9f, 12f)
            arcTo(3f, 3f, 0f, false, true, 3f, 12f)
            close()
            moveTo(18f, 6f)
            lineTo(21f, 12f)
            arcTo(3f, 3f, 0f, false, true, 15f, 12f)
            close()
        }
    }

    // Tabler IconClipboardList (Kelola Permintaan)
    val ClipboardList: ImageVector by lazy {
        strokeIcon("ClipboardList") {
            moveTo(9f, 5f)
            horizontalLineTo(7f)
            arcTo(2f, 2f, 0f, false, false, 5f, 7f)
            verticalLineTo(19f)
            arcTo(2f, 2f, 0f, false, false, 7f, 21f)
            horizontalLineTo(17f)
            arcTo(2f, 2f, 0f, false, false, 19f, 19f)
            verticalLineTo(7f)
            arcTo(2f, 2f, 0f, false, false, 17f, 5f)
            horizontalLineTo(15f)
            moveTo(9f, 5f)
            arcTo(2f, 2f, 0f, false, true, 11f, 3f)
            horizontalLineTo(13f)
            arcTo(2f, 2f, 0f, false, true, 15f, 5f)
            arcTo(2f, 2f, 0f, false, true, 13f, 7f)
            horizontalLineTo(11f)
            arcTo(2f, 2f, 0f, false, true, 9f, 5f)
            close()
            moveTo(9f, 12f)
            horizontalLineTo(15f)
            moveTo(9f, 16f)
            horizontalLineTo(15f)
        }
    }

    // Tabler IconUsers (Kelola Anggota)
    val Users: ImageVector by lazy {
        strokeIcon("Users") {
            moveTo(9f, 3f)
            arcTo(4f, 4f, 0f, true, false, 9f, 11f)
            arcTo(4f, 4f, 0f, true, false, 9f, 3f)
            close()
            moveTo(3f, 21f)
            verticalLineTo(19f)
            arcTo(4f, 4f, 0f, false, true, 7f, 15f)
            horizontalLineTo(11f)
            arcTo(4f, 4f, 0f, false, true, 15f, 19f)
            verticalLineTo(21f)
            moveTo(16f, 3.13f)
            arcTo(4f, 4f, 0f, false, true, 16f, 10.88f)
            moveTo(21f, 21f)
            verticalLineTo(19f)
            arcTo(4f, 4f, 0f, false, false, 18f, 15.15f)
        }
    }

    // Tabler IconAdjustmentsHorizontal (Pengaturan Pool)
    val AdjustmentsHorizontal: ImageVector by lazy {
        strokeIcon("AdjustmentsHorizontal") {
            moveTo(14f, 4f)
            arcTo(2f, 2f, 0f, true, false, 14f, 8f)
            arcTo(2f, 2f, 0f, true, false, 14f, 4f)
            close()
            moveTo(4f, 6f)
            horizontalLineTo(12f)
            moveTo(16f, 6f)
            horizontalLineTo(20f)

            moveTo(8f, 10f)
            arcTo(2f, 2f, 0f, true, false, 8f, 14f)
            arcTo(2f, 2f, 0f, true, false, 8f, 10f)
            close()
            moveTo(4f, 12f)
            horizontalLineTo(6f)
            moveTo(10f, 12f)
            horizontalLineTo(20f)

            moveTo(17f, 16f)
            arcTo(2f, 2f, 0f, true, false, 17f, 20f)
            arcTo(2f, 2f, 0f, true, false, 17f, 16f)
            close()
            moveTo(4f, 18f)
            horizontalLineTo(15f)
            moveTo(19f, 18f)
            horizontalLineTo(20f)
        }
    }

    // Tabler IconPencil
    val Pencil: ImageVector by lazy {
        strokeIcon("Pencil") {
            moveTo(4f, 20f)
            horizontalLineTo(8f)
            lineTo(18.5f, 9.5f)
            arcTo(2.83f, 2.83f, 0f, false, false, 14.5f, 5.5f)
            lineTo(4f, 16f)
            close()
            moveTo(13.5f, 6.5f)
            lineTo(17.5f, 10.5f)
        }
    }

    // Tabler IconTrash
    val Trash: ImageVector by lazy {
        strokeIcon("Trash") {
            moveTo(4f, 7f)
            horizontalLineTo(20f)
            moveTo(10f, 11f)
            verticalLineTo(17f)
            moveTo(14f, 11f)
            verticalLineTo(17f)
            moveTo(5f, 7f)
            lineTo(6f, 19f)
            arcTo(2f, 2f, 0f, false, false, 8f, 21f)
            horizontalLineTo(16f)
            arcTo(2f, 2f, 0f, false, false, 18f, 19f)
            lineTo(19f, 7f)
            moveTo(9f, 7f)
            verticalLineTo(4f)
            arcTo(1f, 1f, 0f, false, true, 10f, 3f)
            horizontalLineTo(14f)
            arcTo(1f, 1f, 0f, false, true, 15f, 4f)
            verticalLineTo(7f)
        }
    }

    // Tabler IconRefresh
    val Refresh: ImageVector by lazy {
        strokeIcon("Refresh") {
            moveTo(20f, 11f)
            arcTo(8.1f, 8.1f, 0f, false, false, 4.5f, 9f)
            moveTo(4f, 5f)
            verticalLineTo(9f)
            horizontalLineTo(8f)
            moveTo(4f, 13f)
            arcTo(8.1f, 8.1f, 0f, false, false, 19.5f, 15f)
            moveTo(20f, 19f)
            verticalLineTo(15f)
            horizontalLineTo(16f)
        }
    }

    // Tabler IconBrandGoogle
    val BrandGoogle: ImageVector by lazy {
        strokeIcon("BrandGoogle") {
            moveTo(20.945f, 11f)
            arcTo(9f, 9f, 0f, true, false, 18.8f, 18.082f)
            arcTo(8.94f, 8.94f, 0f, false, false, 21f, 12f)
            horizontalLineTo(12f)
        }
    }

    // Tabler IconLogout
    val Logout: ImageVector by lazy {
        strokeIcon("Logout") {
            moveTo(14f, 8f)
            verticalLineTo(6f)
            arcTo(2f, 2f, 0f, false, false, 12f, 4f)
            horizontalLineTo(5f)
            arcTo(2f, 2f, 0f, false, false, 3f, 6f)
            verticalLineTo(18f)
            arcTo(2f, 2f, 0f, false, false, 5f, 20f)
            horizontalLineTo(12f)
            arcTo(2f, 2f, 0f, false, false, 14f, 18f)
            verticalLineTo(16f)
            moveTo(9f, 12f)
            horizontalLineTo(21f)
            lineTo(18f, 9f)
            moveTo(18f, 15f)
            lineTo(21f, 12f)
        }
    }
}
