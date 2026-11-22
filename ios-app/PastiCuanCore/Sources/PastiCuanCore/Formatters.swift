import Foundation

/// Paritas android-app/.../domain/util/Formatters.kt dan src/lib/format.ts (BR-14):
/// format Indonesia, USD 2 desimal, SOL 4 desimal, zona waktu WIB, tanda minus U+2212.
public enum Formatters {
    public static let minus = "\u{2212}"

    private static let bulan = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"]
    private static let wibDetik: Int64 = 7 * 3600

    // MARK: Angka

    /// Pembulatan HALF_UP dari representasi desimal terpendek (setara BigDecimal.valueOf(x).setScale).
    public static func rounded(_ x: Double, _ decimals: Int) -> Double {
        guard x.isFinite else { return 0 }
        var d = Decimal(string: String(x)) ?? Decimal(x)
        var r = Decimal()
        NSDecimalRound(&r, &d, decimals, .plain)
        let v = NSDecimalNumber(decimal: r).doubleValue
        return v == 0 ? 0 : v
    }

    private static var formatterCache: [Int: NumberFormatter] = [:]
    private static let cacheLock = NSLock()

    private static func nf(_ x: Double, _ decimals: Int) -> String {
        cacheLock.lock()
        let f: NumberFormatter
        if let ada = formatterCache[decimals] {
            f = ada
        } else {
            f = NumberFormatter()
            f.numberStyle = .decimal
            f.locale = Locale(identifier: "en_US_POSIX")
            f.groupingSeparator = "."
            f.decimalSeparator = ","
            f.usesGroupingSeparator = true
            f.groupingSize = 3
            f.minimumFractionDigits = decimals
            f.maximumFractionDigits = decimals
            f.roundingMode = .halfUp
            formatterCache[decimals] = f
        }
        cacheLock.unlock()
        let nilai = Decimal(string: String(abs(x))) ?? Decimal(abs(x))
        return f.string(from: NSDecimalNumber(decimal: nilai)) ?? String(abs(x))
    }

    public static func angka(_ x: Double, _ decimals: Int) -> String {
        let r = rounded(x, decimals)
        return (r < 0 ? minus : "") + nf(r, decimals)
    }

    public static func usd(_ x: Double) -> String {
        let r = rounded(x, 2)
        return (r < 0 ? minus : "") + "US$" + nf(r, 2)
    }

    public static func sol(_ x: Double) -> String {
        let r = rounded(x, 4)
        return (r < 0 ? minus : "") + nf(r, 4) + " SOL"
    }

    public static func uang(_ x: Double, _ satuan: Satuan) -> String { satuan == .usd ? usd(x) : sol(x) }

    public static func bertanda(_ x: Double, _ satuan: Satuan) -> String {
        let d = satuan == .usd ? 2 : 4
        let r = rounded(x, d)
        let s = r < 0 ? minus : "+"
        return satuan == .usd ? "\(s)US$\(nf(r, 2))" : "\(s)\(nf(r, 4)) SOL"
    }

    public static func persen(_ x: Double) -> String { nf(rounded(x, 2), 2) + "%" }

    public static func persenBertanda(_ x: Double) -> String {
        let r = rounded(x, 2)
        return (r < 0 ? minus : "+") + nf(r, 2) + "%"
    }

    public static func isNegative(_ x: Double, _ decimals: Int = 2) -> Bool { rounded(x, decimals) < 0 }

    /// "1.234,56", "1234.56", atau "US$12" -> angka.
    public static func parseAngka(_ teks: String) -> Double? {
        var t = teks.trimmingCharacters(in: .whitespacesAndNewlines).replacingOccurrences(of: " ", with: "")
        if t.lowercased().hasPrefix("us$") { t = String(t.dropFirst(3)) }
        if t.isEmpty { return nil }
        var norm = t
        if t.contains(",") {
            norm = t.replacingOccurrences(of: ".", with: "").replacingOccurrences(of: ",", with: ".")
        } else if t.filter({ $0 == "." }).count > 1 {
            norm = t.replacingOccurrences(of: ".", with: "")
        }
        guard norm.range(of: #"^-?\d+(\.\d+)?$"#, options: .regularExpression) != nil else { return nil }
        return Double(norm)
    }

    public static func desimal(_ teks: String) -> Int {
        let t = teks.trimmingCharacters(in: .whitespaces)
        let sep: Character? = t.contains(",") ? "," : (t.filter { $0 == "." }.count == 1 ? "." : nil)
        guard let s = sep, let idx = t.lastIndex(of: s) else { return 0 }
        return t.distance(from: idx, to: t.endIndex) - 1
    }

    // MARK: Tanggal & waktu (kalender proleptik Gregorian, tanpa bergantung zona perangkat)

    static func hariDariCivil(_ y: Int64, _ m: Int64, _ d: Int64) -> Int64 {
        let yy = m <= 2 ? y - 1 : y
        let era = (yy >= 0 ? yy : yy - 399) / 400
        let yoe = yy - era * 400
        let mp = (m + 9) % 12
        let doy = (153 * mp + 2) / 5 + d - 1
        let doe = yoe * 365 + yoe / 4 - yoe / 100 + doy
        return era * 146097 + doe - 719468
    }

    static func civilDariHari(_ z0: Int64) -> (Int64, Int64, Int64) {
        let z = z0 + 719468
        let era = (z >= 0 ? z : z - 146096) / 146097
        let doe = z - era * 146097
        let yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365
        let doy = doe - (365 * yoe + yoe / 4 - yoe / 100)
        let mp = (5 * doy + 2) / 153
        let d = doy - (153 * mp + 2) / 5 + 1
        let m = mp < 10 ? mp + 3 : mp - 9
        return (m <= 2 ? yoe + era * 400 + 1 : yoe + era * 400, m, d)
    }

    private static func angkaDi(_ c: [Character], _ dari: Int, _ panjang: Int) -> Int64? {
        guard dari + panjang <= c.count else { return nil }
        var v: Int64 = 0
        for i in dari..<(dari + panjang) {
            guard let n = c[i].wholeNumberValue else { return nil }
            v = v * 10 + Int64(n)
        }
        return v
    }

    /// Parsing ISO-8601 / stempel Postgres ("2026-11-17 01:00:00+00", ".123456+00:00", "Z", "2026-11-17")
    /// ke epoch milidetik. Tanpa offset dianggap WIB. Gagal parse -> 0.
    public static func ms(_ iso: String) -> Int64 {
        let c = Array(iso.trimmingCharacters(in: .whitespacesAndNewlines))
        guard let y = angkaDi(c, 0, 4), let mo = angkaDi(c, 5, 2), let d = angkaDi(c, 8, 2) else { return 0 }
        let hari = hariDariCivil(y, mo, d)
        if c.count <= 10 { return (hari * 86400 - wibDetik) * 1000 }
        let h = angkaDi(c, 11, 2) ?? 0
        let mi = angkaDi(c, 14, 2) ?? 0
        var i = 16
        var detik: Int64 = 0
        var milli: Int64 = 0
        if i < c.count, c[i] == ":" {
            detik = angkaDi(c, i + 1, 2) ?? 0
            i += 3
            if i < c.count, c[i] == "." {
                i += 1
                var digit = 0
                while i < c.count, let n = c[i].wholeNumberValue {
                    if digit < 3 { milli = milli * 10 + Int64(n) }
                    digit += 1
                    i += 1
                }
                while digit < 3 { milli *= 10; digit += 1 }
            }
        }
        var offset = wibDetik
        if i < c.count {
            if c[i] == "Z" || c[i] == "z" {
                offset = 0
            } else if c[i] == "+" || c[i] == "-" {
                let tanda: Int64 = c[i] == "-" ? -1 : 1
                let oh = angkaDi(c, i + 1, 2) ?? 0
                var om: Int64 = 0
                if i + 3 < c.count {
                    om = c[i + 3] == ":" ? (angkaDi(c, i + 4, 2) ?? 0) : (angkaDi(c, i + 3, 2) ?? 0)
                }
                offset = tanda * (oh * 3600 + om * 60)
            }
        }
        return (hari * 86400 + h * 3600 + mi * 60 + detik - offset) * 1000 + milli
    }

    public static func msSnapshot(_ tanggal: String, _ jam: String = "08:00") -> Int64 {
        ms("\(tanggal)T\(jam):00+07:00")
    }

    private static func dua(_ v: Int64) -> String { v < 10 ? "0\(v)" : "\(v)" }

    /// Epoch ms -> "yyyy-MM-ddTHH:mm:00+07:00" (detik dibulatkan ke menit seperti Android).
    public static func isoWib(_ epochMs: Int64) -> String {
        let total = Int64((Double(epochMs) / 1000).rounded(.down)) + wibDetik
        let hari = Int64((Double(total) / 86400).rounded(.down))
        let sisa = total - hari * 86400
        let (y, m, d) = civilDariHari(hari)
        return "\(y)-\(dua(m))-\(dua(d))T\(dua(sisa / 3600)):\(dua((sisa % 3600) / 60)):00+07:00"
    }

    /// ISO apa pun -> "yyyy-MM-ddTHH:mm:ss+07:00" di WIB. Tanggal saja dibiarkan apa adanya.
    public static func wibIso(_ iso: String) -> String {
        let t = iso.trimmingCharacters(in: .whitespacesAndNewlines)
        if t.count <= 10 { return t }
        let e = ms(t)
        let total = Int64((Double(e) / 1000).rounded(.down)) + wibDetik
        let hari = Int64((Double(total) / 86400).rounded(.down))
        let sisa = total - hari * 86400
        let (y, m, d) = civilDariHari(hari)
        return "\(y)-\(dua(m))-\(dua(d))T\(dua(sisa / 3600)):\(dua((sisa % 3600) / 60)):\(dua(sisa % 60))+07:00"
    }

    public static func tanggal(_ iso: String) -> String {
        let s = Array(wibIso(iso))
        guard s.count >= 10, let y = angkaDi(s, 0, 4), let m = angkaDi(s, 5, 2), let d = angkaDi(s, 8, 2) else {
            return iso
        }
        return "\(d) \(bulan[Int(min(max(m, 1), 12)) - 1]) \(y)"
    }

    public static func jam(_ iso: String) -> String {
        let s = wibIso(iso)
        guard s.count >= 16 else { return s }
        return String(Array(s)[11..<16]).replacingOccurrences(of: ":", with: ".")
    }

    public static func waktu(_ iso: String) -> String {
        let s = wibIso(iso)
        guard s.count >= 16 else { return tanggal(s) }
        return "\(tanggal(s)), \(jam(s)) WIB"
    }

    private static func hariDariTanggal(_ iso: String) -> Int64 {
        let c = Array(iso)
        return hariDariCivil(angkaDi(c, 0, 4) ?? 1970, angkaDi(c, 5, 2) ?? 1, angkaDi(c, 8, 2) ?? 1)
    }

    public static func selisihHari(_ dari: String, _ sampai: String) -> Int {
        Int(hariDariTanggal(sampai) - hariDariTanggal(dari))
    }

    public static func tambahHari(_ iso: String, _ hari: Int64) -> String {
        let (y, m, d) = civilDariHari(hariDariTanggal(iso) + hari)
        return "\(y)-\(dua(m))-\(dua(d))"
    }

    public static func isSolanaAddress(_ alamat: String) -> Bool {
        alamat.trimmingCharacters(in: .whitespaces)
            .range(of: "^[1-9A-HJ-NP-Za-km-z]{32,44}$", options: .regularExpression) != nil
    }

    public static func ringkasAlamat(_ alamat: String) -> String {
        let s = alamat.trimmingCharacters(in: .whitespaces)
        return s.count <= 12 ? s : "\(s.prefix(6))…\(s.suffix(4))"
    }
}
