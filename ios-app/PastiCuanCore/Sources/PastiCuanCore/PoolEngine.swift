import Foundation

/// Port 1:1 android-app/.../domain/engine/PoolEngine.kt (yang sendirinya paritas src/lib/engine.ts).
/// Perhitungan uang memakai Decimal supaya hasilnya sama persis dengan BigDecimal di Android.
/// Wajib diubah bersamaan dengan engine.ts & PoolEngine.kt (lihat AGENTS.md).
public enum PoolEngine {

    // MARK: Tipe hasil

    public struct TransaksiHari: Hashable, Sendable {
        public let anggotaId: String
        public let nama: String
        public let jenis: Jenis
        public let jumlahUsd: Double
    }

    public struct TitikSaya: Hashable, Sendable {
        public let tanggal: String
        public let netUsd: Double
        public let netSol: Double
        public let harga: Double
        public let arusUsd: Double
        public let transaksi: [TransaksiHari]
    }

    public struct TitikPool: Hashable, Sendable {
        public let tanggal: String
        public let nilaiUsd: Double
        public let saldoSol: Double
        public let harga: Double
        public let arusUsd: Double
        public let transaksi: [TransaksiHari]
    }

    public struct Posisi: Hashable, Identifiable, Sendable {
        public let id: String
        public let nama: String
        public let peran: Peran
        public let aktif: Bool
        public let unit: Double
        public let porsi: Double
        public let modalUsd: Double
        public let modalSol: Double
        public let grossUsd: Double
        public let feeUsd: Double
        public let netUsd: Double
        public let netSol: Double
        public let profitUsd: Double
        public let profitSol: Double
        public let roi: Double
        public let lamaIkutHari: Int
        public let tanggalMulai: String?
        public let punyaSetoran: Bool
    }

    public struct RingkasanPool: Hashable, Sendable {
        public var nilaiUsd: Double
        public var saldoSol: Double
        public var harga: Double
        public var harga1Unit: Double
        public var totalUnit: Double
    }

    public struct RingkasanPengelola: Hashable, Sendable {
        public var id: String?
        public var unitFee: Double
        public var nilaiUnitFeeUsd: Double
        public var feeTerutangTotal: Double
    }

    public struct CekInvarian: Hashable, Sendable {
        public let lolos: Bool
        public let penyebab: [String]
    }

    public struct LebihBayar: Hashable, Sendable {
        public let permintaanId: String
        public let anggotaId: String
        public let tanggal: String
        public let kurangFeeUsd: Double
    }

    public struct KondisiAnggotaSnap: Hashable, Sendable {
        public let unit: Double
        public let modalUsd: Double
        public let modalSol: Double
        public let mulai: String?
    }

    public struct Keadaan: Hashable, Sendable {
        public let total: Double
        public let unitFee: Double
        public let anggota: [String: KondisiAnggotaSnap]
    }

    public struct KeadaanSaat: Hashable, Sendable {
        public let ms: Int64
        public let tanggal: String
        public let total: Double
        public let unitFee: Double
        public let hargaUnit: Double
        public let anggota: [String: KondisiAnggotaSnap]
        public let settledIds: Set<String>
    }

    public struct Live: Hashable, Sendable {
        public let dibacaPada: String
        public let ms: Int64
        public let nilaiMentahUsd: Double
        public let arusDinetralkanUsd: Double
        public let nilaiUsd: Double
        public let saldoSol: Double
        public let harga: Double
        public let nav: Double
        public let snapshot: String
    }

    public struct HasilPool: Hashable, Sendable {
        public var tanggalData: String?
        public var pool: RingkasanPool
        public var posisi: [Posisi]
        public var pengelola: RingkasanPengelola
        public var riwayatPool: [TitikPool]
        public var riwayat: [String: [TitikSaya]]
        public var cek: CekInvarian
        public var lebihBayar: [LebihBayar]
        public var nav: [String: Double]
        public var keadaan: [String: Keadaan]
        public var keadaanSaat: [KeadaanSaat]
        public var live: Live?
    }

    public struct TransaksiTitik: Hashable, Sendable {
        public var nama: String
        public let jenis: Jenis
        public var jumlahUsd: Double
    }

    public struct TitikSeri: Hashable, Sendable {
        public let ms: Int64
        public let waktu: String
        public let harian: Bool
        public var estimasi: Bool = false
        public let usd: Double
        public let sol: Double
        public let harga: Double
        public let nav: Double
        public let arusUsd: Double
        public let transaksi: [TransaksiTitik]
    }

    public struct Seri: Hashable, Sendable {
        public let jenis: String // "pool" | "saya"
        public let titik: [TitikSeri]
        public let awal: Int
        public var estimasiSampai: Int64? = nil
    }

    public struct Kumulatif: Hashable, Sendable {
        public let ruUsd: Double
        public let ruSol: Double
        public let persenUsd: Double
        public let persenSol: Double
    }

    public struct Simulasi: Hashable, Sendable {
        public let unitTerjual: Double
        public let feeDibayar: Double
        public let sisaNetUsd: Double
        public let sisaModalUsd: Double
        public let sisaPorsi: Double
        public let maksimal: Double
    }

    public struct KonteksSeri: Sendable {
        public let h: HasilPool
        public let anggota: [Anggota]
        public let snaps: [Snapshot]
        public let permintaan: [Permintaan]
        public let arus: [ArusOnchain]
        public let titik: [TitikNilai]
        public let sekarang: Int64
        public let set: Pengaturan

        public init(h: HasilPool, anggota: [Anggota], snaps: [Snapshot], permintaan: [Permintaan],
                    arus: [ArusOnchain], titik: [TitikNilai], sekarang: Int64, set: Pengaturan) {
            self.h = h; self.anggota = anggota; self.snaps = snaps; self.permintaan = permintaan
            self.arus = arus; self.titik = titik; self.sekarang = sekarang; self.set = set
        }
    }

    // MARK: Decimal helper

    private static let nol = Decimal(0)
    private static let satu = Decimal(1)
    private static let seratus = Decimal(100)

    /// Setara BigDecimal.valueOf(double): pakai representasi desimal terpendek, bukan nilai biner mentah.
    static func D(_ v: Double) -> Decimal { Decimal(string: String(v)) ?? Decimal(v) }

    static func dbl(_ d: Decimal) -> Double { d.isNaN ? 0 : NSDecimalNumber(decimal: d).doubleValue }

    private static func bagi(_ a: Decimal, _ b: Decimal) -> Decimal { b == 0 ? nol : a / b }
    private static func maks(_ a: Decimal, _ b: Decimal) -> Decimal { a > b ? a : b }
    private static func mins(_ a: Decimal, _ b: Decimal) -> Decimal { a < b ? a : b }
    private static func mutlak(_ a: Decimal) -> Decimal { a < 0 ? -a : a }

    final class KondisiMutable {
        var unit: Decimal
        var modalUsd: Decimal
        var modalSol: Decimal
        var mulai: String?
        init(unit: Decimal = 0, modalUsd: Decimal = 0, modalSol: Decimal = 0, mulai: String? = nil) {
            self.unit = unit; self.modalUsd = modalUsd; self.modalSol = modalSol; self.mulai = mulai
        }
    }

    // MARK: Inti

    static func feeDari(_ k: KondisiMutable, _ harga1Unit: Decimal, _ hargaSol: Decimal, _ set: Pengaturan, _ isPengelola: Bool) -> Decimal {
        if isPengelola { return nol }
        let pct = D(set.feePersen)
        let gross = k.unit * harga1Unit
        if set.satuanDasarFee == .sol {
            let untungSol = bagi(gross, hargaSol) - k.modalSol
            return maks(untungSol, nol) * pct * hargaSol
        }
        return maks(gross - k.modalUsd, nol) * pct
    }

    static func waktuEfektifMs(_ p: Permintaan, _ jam: String = "08:00") -> Int64 {
        if let w = p.waktuEfektif, !w.trimmingCharacters(in: .whitespaces).isEmpty { return Formatters.ms(w) }
        return Formatters.msSnapshot(p.tanggalEfektif ?? "", jam)
    }

    public static func transaksiSelesai(_ permintaan: [Permintaan], _ jam: String = "08:00") -> [Permintaan] {
        permintaan
            .filter { $0.status == .selesai && (!($0.tanggalEfektif ?? "").isEmpty || $0.isOnchainTx) }
            .sorted { a, b in
                let ta = waktuEfektifMs(a, jam), tb = waktuEfektifMs(b, jam)
                return ta != tb ? ta < tb : a.dibuatPada < b.dibuatPada
            }
    }

    private enum EngineEvent {
        case snap(Int64, Snapshot)
        case txGroup(Int64, [Permintaan], TitikNilai)
        var tMs: Int64 {
            switch self { case let .snap(t, _): return t; case let .txGroup(t, _, _): return t }
        }
        var urut: Int {
            switch self { case .snap: return 0; case .txGroup: return 1 }
        }
    }

    private static func terapkanTransaksi(
        _ t: Permintaan, _ navSaat: Decimal, _ hargaSolSaat: Decimal, _ tglEfektif: String,
        _ k: [String: KondisiMutable], _ total: inout Decimal, _ unitFee: inout Decimal, _ idPengelola: String?,
        _ set: Pengaturan, _ nama: [String: String], _ penyebab: inout [String], _ lebihBayar: inout [LebihBayar],
        _ arusAnggota: inout [String: Decimal], _ txHari: inout [TransaksiHari]
    ) {
        guard let m = k[t.anggotaId] else { return }
        let w = D(t.jumlahFinalUsd ?? t.jumlahUsd)
        txHari.append(TransaksiHari(anggotaId: t.anggotaId, nama: nama[t.anggotaId] ?? t.anggotaId, jenis: t.jenis, jumlahUsd: dbl(w)))
        if t.jenis == .setor {
            let u = bagi(w, navSaat)
            m.unit += u
            m.modalUsd += w
            m.modalSol += bagi(w, hargaSolSaat)
            if m.mulai == nil { m.mulai = tglEfektif }
            total += u
            arusAnggota[t.anggotaId] = (arusAnggota[t.anggotaId] ?? nol) + w
        } else {
            let isPengelola = t.anggotaId == idPengelola
            let gross = m.unit * navSaat
            let fee = feeDari(m, navSaat, hargaSolSaat, set, isPengelola)
            let n = gross - fee
            if w > n + D(0.005) {
                lebihBayar.append(LebihBayar(permintaanId: t.id, anggotaId: t.anggotaId, tanggal: tglEfektif, kurangFeeUsd: dbl(mins(w - n, fee))))
                if w > gross + D(0.005) {
                    penyebab.append("Penarikan \(nama[t.anggotaId] ?? t.anggotaId) \(tglEfektif) melebihi nilai bersihnya.")
                }
            }
            let f = n == 0 ? satu : mins(satu, bagi(w, n))
            let terjual = m.unit * f
            let keluar = bagi(w, navSaat)
            let keFee = maks(terjual - keluar, nol)
            m.unit -= terjual
            let satuKurangF = satu - f
            m.modalUsd *= satuKurangF
            m.modalSol *= satuKurangF
            if let idP = idPengelola, !isPengelola, let kp = k[idP] {
                kp.unit += keFee
                unitFee += keFee
            }
            if isPengelola { unitFee = maks(unitFee - terjual, nol) }
            total -= keluar
            arusAnggota[t.anggotaId] = (arusAnggota[t.anggotaId] ?? nol) - w
        }
    }

    public static func hitungPool(
        anggota: [Anggota], snapshots: [Snapshot], permintaan: [Permintaan], set: Pengaturan,
        arus: [ArusOnchain] = [], titikReferensi: [TitikNilai] = []
    ) -> HasilPool {
        let snaps = snapshots.sorted { $0.tanggal < $1.tanggal }
        let tx = transaksiSelesai(permintaan, set.jamSnapshot)
        let nama = Dictionary(anggota.map { ($0.id, $0.nama) }, uniquingKeysWith: { a, _ in a })
        let idPengelola = anggota.first { $0.peran == .pengelola }?.id
        var k: [String: KondisiMutable] = [:]
        for a in anggota { k[a.id] = KondisiMutable() }
        var riwayat: [String: [TitikSaya]] = [:]
        for a in anggota { riwayat[a.id] = [] }
        var riwayatPool: [TitikPool] = []
        var nav: [String: Double] = [:]
        var keadaan: [String: Keadaan] = [:]
        var keadaanSaat: [KeadaanSaat] = []
        var penyebab: [String] = []
        var lebihBayar: [LebihBayar] = []
        let tanggalSnap = Set(snaps.map(\.tanggal))
        var titikById: [Int64: TitikNilai] = [:]
        for ti in titikReferensi { if let id = ti.id { titikById[id] = ti } }

        for t in tx {
            if t.isOnchainTx {
                if titikById[t.titikNilaiId ?? -1] == nil {
                    penyebab.append("Transaksi \(nama[t.anggotaId] ?? t.anggotaId) (\(t.waktuEfektif ?? "")) tidak punya titik nilai referensi.")
                }
            } else if !tanggalSnap.contains(t.tanggalEfektif ?? "") {
                penyebab.append("Transaksi \(nama[t.anggotaId] ?? t.anggotaId) tanggal \(t.tanggalEfektif ?? "") tidak punya saldo harian.")
            }
        }

        var events: [EngineEvent] = snaps.map { .snap(Formatters.msSnapshot($0.tanggal, set.jamSnapshot), $0) }
        var urutanGrup: [String] = []
        var grup: [String: (Int64, [Permintaan], TitikNilai)] = [:]
        for t in tx where t.isOnchainTx {
            guard let ti = titikById[t.titikNilaiId ?? -1], let w = t.waktuEfektif else { continue }
            let tMs = Formatters.ms(w)
            let key = "\(tMs)|\(ti.id ?? 0)"
            if var ada = grup[key] {
                ada.1.append(t)
                grup[key] = ada
            } else {
                grup[key] = (tMs, [t], ti)
                urutanGrup.append(key)
            }
        }
        for key in urutanGrup { if let g = grup[key] { events.append(.txGroup(g.0, g.1, g.2)) } }
        // Urutan stabil: waktu, lalu snapshot sebelum transaksi, lalu urutan masuk (setara sortWith Kotlin).
        events = events.enumerated().sorted { a, b in
            if a.element.tMs != b.element.tMs { return a.element.tMs < b.element.tMs }
            if a.element.urut != b.element.urut { return a.element.urut < b.element.urut }
            return a.offset < b.offset
        }.map(\.element)

        var total = nol
        var unitFee = nol
        var hargaUnit = satu
        var hargaSol = satu
        var nilaiPool = nol
        var saldoSol = nol
        var lastEventMs = Int64.min
        var settledIds = Set<String>()

        func snapshotKeadaan() -> [String: KondisiAnggotaSnap] {
            var out: [String: KondisiAnggotaSnap] = [:]
            for a in anggota {
                let m = k[a.id]!
                out[a.id] = KondisiAnggotaSnap(unit: dbl(m.unit), modalUsd: dbl(m.modalUsd), modalSol: dbl(m.modalSol), mulai: m.mulai)
            }
            return out
        }

        for ev in events {
            switch ev {
            case let .snap(tMs, s):
                let hari = tx.filter { !$0.isOnchainTx && $0.tanggalEfektif == s.tanggal }
                let nilai = D(s.nilaiUsd)
                hargaSol = bagi(nilai, D(s.saldoSol))
                let setor = hari.filter { $0.jenis == .setor }.reduce(nol) { $0 + D($1.jumlahFinalUsd ?? $1.jumlahUsd) }
                let tarik = hari.filter { $0.jenis == .tarik }.reduce(nol) { $0 + D($1.jumlahFinalUsd ?? $1.jumlahUsd) }
                let navHari = total == 0 ? satu : bagi(nilai - (setor - tarik), total)
                nav[s.tanggal] = dbl(navHari)
                var arusAnggota: [String: Decimal] = [:]
                var txHari: [TransaksiHari] = []
                for t in hari {
                    terapkanTransaksi(t, navHari, hargaSol, s.tanggal, k, &total, &unitFee, idPengelola, set, nama,
                                      &penyebab, &lebihBayar, &arusAnggota, &txHari)
                    settledIds.insert(t.id)
                }
                hargaUnit = total == 0 ? navHari : bagi(nilai, total)
                nilaiPool = nilai
                saldoSol = D(s.saldoSol)
                var jumlahGross = nol
                for a in anggota {
                    let m = k[a.id]!
                    if m.unit < D(-1e-9) { penyebab.append("Unit \(a.nama) negatif pada \(s.tanggal).") }
                    let gross = m.unit * hargaUnit
                    jumlahGross += gross
                    let net = gross - feeDari(m, hargaUnit, hargaSol, set, a.id == idPengelola)
                    if m.mulai != nil || m.unit != 0 {
                        riwayat[a.id, default: []].append(TitikSaya(
                            tanggal: s.tanggal, netUsd: dbl(net), netSol: dbl(bagi(net, hargaSol)), harga: dbl(hargaSol),
                            arusUsd: dbl(arusAnggota[a.id] ?? nol), transaksi: txHari.filter { $0.anggotaId == a.id }))
                    }
                }
                let angSnap = snapshotKeadaan()
                keadaan[s.tanggal] = Keadaan(total: dbl(total), unitFee: dbl(unitFee), anggota: angSnap)
                keadaanSaat.append(KeadaanSaat(ms: tMs, tanggal: s.tanggal, total: dbl(total), unitFee: dbl(unitFee),
                                               hargaUnit: dbl(hargaUnit), anggota: angSnap, settledIds: settledIds))
                if total != 0 && mutlak(jumlahGross - nilai) > D(0.01) {
                    penyebab.append("Total nilai anggota tidak sama dengan saldo pool pada \(s.tanggal).")
                }
                riwayatPool.append(TitikPool(tanggal: s.tanggal, nilaiUsd: dbl(nilai), saldoSol: s.saldoSol, harga: dbl(hargaSol),
                                             arusUsd: dbl(setor - tarik), transaksi: txHari))
                lastEventMs = tMs

            case let .txGroup(tMs, txs, ti):
                let batchIds = Set(txs.map(\.id))
                var netral = nol
                for a in arus {
                    let ta = Formatters.ms(a.waktu)
                    if ta <= lastEventMs || ta > ti.ms { continue }
                    if let pid = a.permintaanId, batchIds.contains(pid), ti.ms <= ta { continue }
                    let belumSelesai = a.status == .belum || (a.status == .dicocokkan && !settledIds.contains(a.permintaanId ?? ""))
                    if !belumSelesai { continue }
                    netral += D(a.arah == .keluar ? a.nilaiUsd : -a.nilaiUsd)
                }
                let nilaiAdjusted = D(ti.nilaiUsd) + netral
                hargaSol = D(ti.harga)
                let navTx = total == 0 ? satu : bagi(nilaiAdjusted, total)
                let tglTx = String(Formatters.isoWib(tMs).prefix(10))
                var arusAnggota: [String: Decimal] = [:]
                var txHari: [TransaksiHari] = []
                for t in txs {
                    terapkanTransaksi(t, navTx, hargaSol, tglTx, k, &total, &unitFee, idPengelola, set, nama,
                                      &penyebab, &lebihBayar, &arusAnggota, &txHari)
                    settledIds.insert(t.id)
                }
                hargaUnit = navTx
                nilaiPool = total * navTx
                saldoSol = bagi(nilaiPool, hargaSol)
                lastEventMs = tMs
                keadaanSaat.append(KeadaanSaat(ms: tMs, tanggal: tglTx, total: dbl(total), unitFee: dbl(unitFee),
                                               hargaUnit: dbl(hargaUnit), anggota: snapshotKeadaan(), settledIds: settledIds))
            }
        }

        let tanggalData = snaps.last?.tanggal
        if let tgl = tanggalData {
            let batas = Formatters.msSnapshot(tgl, set.jamSnapshot)
            let n = arus.filter { $0.status == .belum && Formatters.ms($0.waktu) < batas }.count
            if n > 0 { penyebab.append("Ada \(n) transfer di wallet yang belum dicatat pengelola. Angka sedang dicek ulang.") }
        }

        let (posisi, feeTerutangTotal) = susunPosisi(anggota, k, total, hargaUnit, hargaSol, set, idPengelola, tanggalData)

        return HasilPool(
            tanggalData: tanggalData,
            pool: RingkasanPool(nilaiUsd: dbl(nilaiPool), saldoSol: dbl(saldoSol), harga: dbl(hargaSol),
                                harga1Unit: dbl(hargaUnit), totalUnit: dbl(total)),
            posisi: posisi,
            pengelola: RingkasanPengelola(id: idPengelola, unitFee: dbl(unitFee), nilaiUnitFeeUsd: dbl(unitFee * hargaUnit),
                                          feeTerutangTotal: dbl(feeTerutangTotal)),
            riwayatPool: riwayatPool, riwayat: riwayat,
            cek: CekInvarian(lolos: penyebab.isEmpty, penyebab: penyebab),
            lebihBayar: lebihBayar, nav: nav, keadaan: keadaan, keadaanSaat: keadaanSaat, live: nil
        )
    }

    private static func susunPosisi(
        _ anggota: [Anggota], _ k: [String: KondisiMutable], _ total: Decimal, _ hargaUnit: Decimal, _ hargaSol: Decimal,
        _ set: Pengaturan, _ idPengelola: String?, _ tanggalData: String?
    ) -> ([Posisi], Decimal) {
        var feeTerutangTotal = nol
        let posisi: [Posisi] = anggota.map { a in
            let m = k[a.id] ?? KondisiMutable()
            let isP = a.id == idPengelola
            let gross = m.unit * hargaUnit
            let fee = feeDari(m, hargaUnit, hargaSol, set, isP)
            feeTerutangTotal += fee
            let net = gross - fee
            let profitUsd = net - m.modalUsd
            let netSol = tanggalData != nil ? bagi(net, hargaSol) : nol
            return Posisi(
                id: a.id, nama: a.nama, peran: a.peran, aktif: a.aktif, unit: dbl(m.unit),
                porsi: total == 0 ? 0 : dbl(bagi(m.unit, total) * seratus),
                modalUsd: dbl(m.modalUsd), modalSol: dbl(m.modalSol), grossUsd: dbl(gross), feeUsd: dbl(fee),
                netUsd: dbl(net), netSol: dbl(netSol), profitUsd: dbl(profitUsd), profitSol: dbl(netSol - m.modalSol),
                roi: m.modalUsd == 0 ? 0 : dbl(bagi(profitUsd, m.modalUsd) * seratus),
                lamaIkutHari: (m.mulai != nil && tanggalData != nil) ? Formatters.selisihHari(m.mulai!, tanggalData!) : 0,
                tanggalMulai: m.mulai, punyaSetoran: m.mulai != nil)
        }
        return (posisi, feeTerutangTotal)
    }

    private static func kondisiDari(_ kd: [String: KondisiAnggotaSnap]) -> [String: KondisiMutable] {
        kd.mapValues { KondisiMutable(unit: D($0.unit), modalUsd: D($0.modalUsd), modalSol: D($0.modalSol), mulai: $0.mulai) }
    }

    private static func dinetralkan(_ a: ArusOnchain) -> Bool { a.status == .belum || a.status == .dicocokkan }

    private static func snapshotSebelum(_ snaps: [Snapshot], _ t: Int64, _ jam: String) -> Snapshot? {
        var s: Snapshot?
        for x in snaps where Formatters.msSnapshot(x.tanggal, jam) <= t && (s == nil || x.tanggal > s!.tanggal) { s = x }
        return s
    }

    private static func keadaanPada(_ h: HasilPool, _ t: Int64) -> KeadaanSaat? {
        var latest: KeadaanSaat?
        for ks in h.keadaanSaat where ks.ms <= t && (latest == nil || ks.ms >= latest!.ms) { latest = ks }
        return latest
    }

    public static func liveDi(_ h: HasilPool, _ snaps: [Snapshot], _ arus: [ArusOnchain], _ ti: TitikNilai, _ set: Pengaturan) -> Live? {
        let ks = keadaanPada(h, ti.ms)
        let s = snapshotSebelum(snaps, ti.ms, set.jamSnapshot)
        if ks == nil && (s == nil || h.keadaan[s!.tanggal] == nil) { return nil }
        let dari = ks?.ms ?? Formatters.msSnapshot(s!.tanggal, set.jamSnapshot)
        let settled = ks?.settledIds ?? []
        let total = ks?.total ?? h.keadaan[s!.tanggal]!.total
        let snapTgl = ks?.tanggal ?? s!.tanggal

        var netral = 0.0
        for a in arus {
            let t = Formatters.ms(a.waktu)
            if t <= dari || t > ti.ms || !dinetralkan(a) { continue }
            if a.status == .dicocokkan, let pid = a.permintaanId, settled.contains(pid) { continue }
            netral += a.arah == .keluar ? a.nilaiUsd : -a.nilaiUsd
        }
        let nilaiUsd = ti.nilaiUsd + netral
        return Live(dibacaPada: Formatters.isoWib(ti.ms), ms: ti.ms, nilaiMentahUsd: ti.nilaiUsd, arusDinetralkanUsd: netral,
                    nilaiUsd: nilaiUsd, saldoSol: nilaiUsd / ti.harga, harga: ti.harga,
                    nav: total != 0 ? nilaiUsd / total : 1, snapshot: snapTgl)
    }

    public static func terapkanLive(
        _ h: HasilPool, anggota: [Anggota], snaps: [Snapshot], arus: [ArusOnchain], titik: [TitikNilai],
        sekarang: Int64, set: Pengaturan
    ) -> HasilPool {
        guard let tanggalData = h.tanggalData, let ti = OnchainSimulator.titikTerakhir(titik, sekarang) else { return h }
        if ti.estimasi || ti.ms <= Formatters.msSnapshot(tanggalData, set.jamSnapshot) { return h }
        guard let live = liveDi(h, snaps, arus, ti, set), live.snapshot >= tanggalData else { return h }
        let kd = keadaanPada(h, live.ms)
        guard let angMap = kd?.anggota ?? h.keadaan[live.snapshot]?.anggota,
              let tot = kd?.total ?? h.keadaan[live.snapshot]?.total else { return h }
        let (posisi, feeTerutangTotal) = susunPosisi(anggota, kondisiDari(angMap), D(tot), D(live.nav), D(live.harga),
                                                     set, h.pengelola.id, h.tanggalData)
        var out = h
        out.pool.nilaiUsd = live.nilaiUsd
        out.pool.saldoSol = live.saldoSol
        out.pool.harga = live.harga
        out.pool.harga1Unit = live.nav
        out.posisi = posisi
        out.pengelola.nilaiUnitFeeUsd = h.pengelola.unitFee * live.nav
        out.pengelola.feeTerutangTotal = dbl(feeTerutangTotal)
        out.live = live
        return out
    }

    // MARK: Seri grafik

    public static func opsiRentang(_ permintaan: [Permintaan], _ anggotaId: String?) -> [Rentang] {
        let jumlahSetor = permintaan.filter {
            $0.status == .selesai && $0.jenis == .setor && (anggotaId == nil || $0.anggotaId == anggotaId)
        }.count
        return jumlahSetor > 1 ? Rentang.allCases : Rentang.allCases.filter { $0 != .setoranTerakhir }
    }

    private static func setoranTerakhir(_ permintaan: [Permintaan], _ anggotaId: String?, _ jam: String) -> (Int64, String)? {
        var akhir: (Int64, String)?
        for p in permintaan {
            if p.status != .selesai || p.jenis != .setor { continue }
            if let id = anggotaId, p.anggotaId != id { continue }
            if (p.tanggalEfektif ?? "").isEmpty && !p.isOnchainTx { continue }
            let t = waktuEfektifMs(p, jam)
            if akhir == nil || t > akhir!.0 {
                akhir = (t, p.tanggalEfektif ?? String(Formatters.isoWib(t).prefix(10)))
            }
        }
        return akhir
    }

    private static func titikHarian(_ c: KonteksSeri, _ anggotaId: String?) -> [TitikSeri] {
        let jam = c.set.jamSnapshot
        func ubah(_ t: [TransaksiHari]) -> [TransaksiTitik] { t.map { TransaksiTitik(nama: $0.nama, jenis: $0.jenis, jumlahUsd: $0.jumlahUsd) } }
        if let id = anggotaId {
            return (c.h.riwayat[id] ?? []).map { p in
                TitikSeri(ms: Formatters.msSnapshot(p.tanggal, jam), waktu: "\(p.tanggal)T\(jam):00+07:00", harian: true,
                          usd: p.netUsd, sol: p.netSol, harga: p.harga, nav: c.h.nav[p.tanggal] ?? 1,
                          arusUsd: p.arusUsd, transaksi: ubah(p.transaksi))
            }
        }
        return c.h.riwayatPool.map { p in
            TitikSeri(ms: Formatters.msSnapshot(p.tanggal, jam), waktu: "\(p.tanggal)T\(jam):00+07:00", harian: true,
                      usd: p.nilaiUsd, sol: p.saldoSol, harga: p.harga, nav: c.h.nav[p.tanggal] ?? 1,
                      arusUsd: p.arusUsd, transaksi: ubah(p.transaksi))
        }
    }

    private struct NilaiTitik { let usd: Double; let sol: Double; let nav: Double; let snapshot: String }

    private static func nilaiDi(_ c: KonteksSeri, _ ti: TitikNilai, _ anggotaId: String?) -> NilaiTitik? {
        guard let live = liveDi(c.h, c.snaps, c.arus, ti, c.set) else { return nil }
        guard let id = anggotaId else {
            return NilaiTitik(usd: ti.nilaiUsd, sol: ti.nilaiUsd / ti.harga, nav: live.nav, snapshot: live.snapshot)
        }
        let kd = keadaanPada(c.h, ti.ms)
        guard let angMap = kd?.anggota ?? c.h.keadaan[live.snapshot]?.anggota, let m = angMap[id] else { return nil }
        if m.mulai == nil && m.unit == 0 { return nil }
        let isP = id == c.h.pengelola.id
        let km = KondisiMutable(unit: D(m.unit), modalUsd: D(m.modalUsd), modalSol: D(m.modalSol), mulai: m.mulai)
        let navD = D(live.nav)
        let net = km.unit * navD - feeDari(km, navD, D(live.harga), c.set, isP)
        return NilaiTitik(usd: dbl(net), sol: dbl(bagi(net, D(live.harga))), nav: live.nav, snapshot: live.snapshot)
    }

    private static func arusDiAntara(_ c: KonteksSeri, _ dari: Int64, _ sampai: Int64, _ anggotaId: String?,
                                     _ skip: Set<String> = []) -> ([TransaksiTitik], Double) {
        var urutan: [String] = []
        var kelompok: [String: TransaksiTitik] = [:]
        var bersih = 0.0
        for a in c.arus {
            let t = Formatters.ms(a.waktu)
            if t <= dari || t > sampai || !dinetralkan(a) { continue }
            if let pid = a.permintaanId, skip.contains(pid) { continue }
            let pemilikId: String? = a.status == .dicocokkan ? c.permintaan.first { $0.id == a.permintaanId }?.anggotaId : nil
            if let id = anggotaId, pemilikId != id { continue }
            let jenis: Jenis = a.arah == .masuk ? .setor : .tarik
            bersih += jenis == .setor ? a.nilaiUsd : -a.nilaiUsd
            let kunci = "\(pemilikId ?? "-")|\(jenis.rawValue)"
            let namaPemilik = c.anggota.first { $0.id == pemilikId }?.nama ?? "Belum dicocokkan"
            if var ada = kelompok[kunci] {
                ada.jumlahUsd += a.nilaiUsd
                kelompok[kunci] = ada
            } else {
                kelompok[kunci] = TransaksiTitik(nama: namaPemilik, jenis: jenis, jumlahUsd: a.nilaiUsd)
                urutan.append(kunci)
            }
        }
        return (urutan.compactMap { kelompok[$0] }, bersih)
    }

    private static let menit: Int64 = 60_000
    private static let offsetWib: Int64 = 7 * 60 * 60_000
    private static let maksTitik = 365.0
    private static let intervalSemuaList: [Int64] = [2, 4, 6, 12, 24].map { $0 * 60 * 60_000 }
    private static let intervalSetorList: [Int64] = [30, 60, 120, 240, 360, 720, 1440].map { $0 * 60_000 }

    private static func pilihInterval(_ panjang: Int64, _ daftar: [Int64]) -> Int64 {
        daftar.first { (Double(panjang) / Double($0)).rounded(.up) <= maksTitik } ?? daftar.last!
    }

    private static func lantai(_ a: Int64, _ b: Int64) -> Int64 { Int64((Double(a) / Double(b)).rounded(.down)) }
    private static func atap(_ a: Int64, _ b: Int64) -> Int64 { Int64((Double(a) / Double(b)).rounded(.up)) }

    public static func seriRentang(_ c: KonteksSeri, _ r: Rentang, anggotaId: String? = nil) -> Seri {
        let jenis = anggotaId != nil ? "saya" : "pool"
        let harian = titikHarian(c, anggotaId).filter { $0.ms <= c.sekarang }
        let tersedia = c.titik.filter { $0.ms <= c.sekarang }
        guard let awalData = [harian.first?.ms, tersedia.first?.ms].compactMap({ $0 }).min() else {
            return Seri(jenis: jenis, titik: [], awal: 0)
        }
        let setor = r == .setoranTerakhir ? setoranTerakhir(c.permintaan, anggotaId, c.set.jamSnapshot) : nil
        let semua = r == .semua || (r == .setoranTerakhir && (setor == nil || setor!.0 <= awalData))

        let panjang: Int64, langkah: Int64, mulai: Int64
        if semua {
            panjang = max(c.sekarang - awalData, menit)
            langkah = pilihInterval(panjang, intervalSemuaList)
            mulai = awalData - 1
        } else if r == .setoranTerakhir, let s = setor {
            mulai = s.0 - 1
            panjang = max(c.sekarang - s.0, menit)
            langkah = pilihInterval(panjang, intervalSetorList)
        } else if r == .jam24 {
            panjang = 24 * 60 * menit
            langkah = 5 * menit
            mulai = atap(c.sekarang - panjang + offsetWib, langkah) * langkah - offsetWib
        } else {
            panjang = 7 * 24 * 60 * menit
            langkah = 30 * menit
            mulai = atap(c.sekarang - panjang + offsetWib, langkah) * langkah - offsetWib
        }

        let cukup = !tersedia.isEmpty && tersedia[0].ms <= mulai + 1 + Int64(0.1 * Double(panjang))
        if !cukup && r != .jam24 {
            var titik = harian
            if let terakhir = tersedia.last, let akhir = titik.last, terakhir.ms > akhir.ms,
               let v = nilaiDi(c, terakhir, anggotaId) {
                let akhirTgl = String(akhir.waktu.prefix(10))
                let sudah = Set(c.permintaan.filter {
                    $0.status == .selesai && !$0.isOnchainTx && $0.tanggalEfektif != nil && $0.tanggalEfektif! <= akhirTgl
                }.map(\.id))
                let (txUjung, bersihUjung): ([TransaksiTitik], Double) = anggotaId != nil
                    ? ([], 0) : arusDiAntara(c, akhir.ms, terakhir.ms, nil, sudah)
                titik.append(TitikSeri(ms: terakhir.ms, waktu: Formatters.isoWib(terakhir.ms), harian: false,
                                       estimasi: terakhir.estimasi, usd: v.usd, sol: v.sol, harga: terakhir.harga,
                                       nav: v.nav, arusUsd: bersihUjung, transaksi: txUjung))
            }
            if titik.isEmpty { return Seri(jenis: jenis, titik: titik, awal: 0) }
            let tglBatas: String?
            switch r {
            case .setoranTerakhir: tglBatas = setor?.1
            case .hari7: tglBatas = Formatters.tambahHari(String(titik.last!.waktu.prefix(10)), -6)
            default: tglBatas = nil
            }
            let batas = tglBatas.map { Formatters.ms($0) } ?? Int64.min
            let idx = titik.firstIndex { $0.ms >= batas } ?? 0
            return Seri(jenis: jenis, titik: titik, awal: idx)
        }

        var titikPilih: [TitikNilai] = []
        if !semua, let pembanding = OnchainSimulator.titikTerakhir(tersedia, mulai) { titikPilih.append(pembanding) }
        var ember = Int64.min
        for t in tersedia where t.ms > mulai {
            let e = lantai(t.ms + offsetWib - 1, langkah)
            if e == ember { titikPilih[titikPilih.count - 1] = t } else { titikPilih.append(t) }
            ember = e
        }

        var sumber: [String: SumberSnapshot] = [:]
        for s in c.snaps { sumber[s.tanggal] = s.sumber }
        var sudahArus = Set<String>()
        var out: [TitikSeri] = []
        var snapSebelum: String?
        var tSebelum = Int64.min

        for ti in titikPilih {
            guard let v = nilaiDi(c, ti, anggotaId) else { continue }
            var arusUsd = 0.0
            var transaksi: [TransaksiTitik] = []
            let pindah = snapSebelum != nil ? v.snapshot != snapSebelum : semua
            if pindah && (anggotaId != nil || sumber[v.snapshot] == .impor || ti.estimasi),
               let hs = harian.first(where: { $0.waktu.hasPrefix(v.snapshot) }) {
                arusUsd = hs.arusUsd
                let efektif = !ti.estimasi && sumber[v.snapshot] != .impor
                transaksi.append(contentsOf: hs.transaksi.map { x in
                    var y = x
                    if efektif { y.nama = "\(x.nama), efektif" }
                    return y
                })
                if anggotaId == nil {
                    for p in c.permintaan where p.status == .selesai && !p.isOnchainTx && p.tanggalEfektif == v.snapshot {
                        sudahArus.insert(p.id)
                    }
                }
            }
            if tSebelum > Int64.min {
                let (txAntara, bersihAntara) = arusDiAntara(c, tSebelum, ti.ms, anggotaId, sudahArus)
                if anggotaId == nil { arusUsd += bersihAntara }
                transaksi.append(contentsOf: txAntara)
                if let id = anggotaId {
                    for p in c.permintaan where p.status == .selesai && p.anggotaId == id && p.isOnchainTx {
                        let tp = Formatters.ms(p.waktuEfektif!)
                        if tp > tSebelum && tp <= ti.ms {
                            let jml = p.jumlahFinalUsd ?? p.jumlahUsd
                            arusUsd += p.jenis == .setor ? jml : -jml
                        }
                    }
                }
            } else if semua, let id = anggotaId {
                let namaAnggota = c.anggota.first { $0.id == id }?.nama ?? id
                for p in c.permintaan where p.status == .selesai && p.anggotaId == id && p.isOnchainTx {
                    if Formatters.ms(p.waktuEfektif!) <= ti.ms {
                        let jml = p.jumlahFinalUsd ?? p.jumlahUsd
                        arusUsd += p.jenis == .setor ? jml : -jml
                        transaksi.append(TransaksiTitik(nama: namaAnggota, jenis: p.jenis, jumlahUsd: jml))
                    }
                }
            }
            out.append(TitikSeri(ms: ti.ms, waktu: Formatters.isoWib(ti.ms), harian: false, estimasi: ti.estimasi,
                                 usd: v.usd, sol: v.sol, harga: ti.harga, nav: v.nav, arusUsd: arusUsd, transaksi: transaksi))
            snapSebelum = v.snapshot
            tSebelum = ti.ms
        }

        let asli = tersedia.first { !$0.estimasi }
        let estimasiSampai = out.contains { $0.estimasi } ? asli?.ms : nil
        if semua { return Seri(jenis: jenis, titik: out, awal: 0, estimasiSampai: estimasiSampai) }
        let idx = out.firstIndex { $0.ms > mulai }
        let awal = idx == nil ? out.count : max(idx!, out.count > 1 ? 1 : 0)
        return Seri(jenis: jenis, titik: out, awal: awal, estimasiSampai: estimasiSampai)
    }

    public static func awalTampil(_ s: Seri, _ r: Rentang) -> Int { r.isPendek ? max(0, s.awal - 1) : s.awal }

    public static func kumulatif(_ s: Seri) -> [Kumulatif] {
        var out = Array(repeating: Kumulatif(ruUsd: 0, ruSol: 0, persenUsd: 0, persenSol: 0), count: s.titik.count)
        if s.titik.isEmpty { return out }
        let pb = s.titik[max(0, s.awal - 1)]
        let dasarUsd = s.awal > 0 ? pb.usd : 0
        let dasarSol = s.awal > 0 ? pb.sol : 0
        var ruUsd = 0.0, ruSol = 0.0, setorUsd = 0.0, setorSol = 0.0
        guard s.awal < s.titik.count else { return out }
        for i in s.awal..<s.titik.count {
            let p = s.titik[i]
            let q: TitikSeri? = i > 0 ? s.titik[i - 1] : nil
            let aSol = p.arusUsd / p.harga
            ruUsd += p.usd - (q?.usd ?? 0) - p.arusUsd
            ruSol += p.sol - (q?.sol ?? 0) - aSol
            if p.arusUsd > 0 { setorUsd += p.arusUsd; setorSol += aSol }
            let isPool = s.jenis == "pool"
            let pUsd = isPool ? (p.nav / pb.nav - 1) * 100 : (dasarUsd + setorUsd != 0 ? 100 * ruUsd / (dasarUsd + setorUsd) : 0)
            let pSol = isPool ? ((p.nav / p.harga) / (pb.nav / pb.harga) - 1) * 100
                : (dasarSol + setorSol != 0 ? 100 * ruSol / (dasarSol + setorSol) : 0)
            out[i] = Kumulatif(ruUsd: ruUsd, ruSol: ruSol, persenUsd: pUsd, persenSol: pSol)
        }
        return out
    }

    public static func chipTransaksi(_ p: TitikSeri, _ jenisSeri: String) -> [String] {
        func label(_ j: Jenis) -> String { j == .setor ? "Setoran" : "Tarik" }
        let est = p.estimasi ? ["Estimasi dari harga pasar per jam"] : []
        if jenisSeri == "saya" { return est + p.transaksi.map { "\(label($0.jenis)) \(Formatters.usd($0.jumlahUsd))" } }
        let grouped: [String] = [Jenis.setor, .tarik].compactMap { j in
            let list = p.transaksi.filter { $0.jenis == j }
            return list.isEmpty ? nil : "\(label(j)): " + list.map { "\($0.nama) \(Formatters.usd($0.jumlahUsd))" }.joined(separator: ", ")
        }
        return est + grouped
    }

    public static func keteranganEstimasi(_ s: Seri, _ r: Rentang) -> String? {
        guard let sampai = s.estimasiSampai else { return nil }
        let sub = s.titik.dropFirst(awalTampil(s, r))
        if !sub.contains(where: \.estimasi) { return nil }
        return "Sebelum \(Formatters.tanggal(Formatters.isoWib(sampai))): estimasi per jam"
    }

    public static func grafikKosong(_ s: Seri, _ r: Rentang, _ jumlahHarian: Int) -> String? {
        if r == .jam24 {
            return s.titik.count - awalTampil(s, r) < 2 ? "Grafik 24 jam muncul setelah ada data 10 menit." : nil
        }
        return jumlahHarian < 2 ? "Grafik muncul setelah ada data 2 hari." : nil
    }

    public static func simulasiTarik(_ h: HasilPool, _ anggotaId: String, _ w: Double, _ set: Pengaturan) -> Simulasi {
        guard let p = h.posisi.first(where: { $0.id == anggotaId }) else {
            return Simulasi(unitTerjual: 0, feeDibayar: 0, sisaNetUsd: 0, sisaModalUsd: 0, sisaPorsi: 0, maksimal: 0)
        }
        let harga = D(h.pool.harga1Unit)
        let isP = anggotaId == h.pengelola.id
        let n = D(p.netUsd)
        let wClamped = mins(D(max(0, w)), n)
        let f = n == 0 ? nol : bagi(wClamped, n)
        let unit = D(p.unit)
        let terjual = unit * f
        let fee = isP ? nol : D(p.feeUsd) * f
        let keluar = bagi(wClamped, harga)
        let sisaUnit = unit - terjual
        let sisaTotal = D(h.pool.totalUnit) - keluar
        let satuKurangF = satu - f
        let sisaModal = D(p.modalUsd) * satuKurangF
        let k = KondisiMutable(unit: sisaUnit, modalUsd: sisaModal, modalSol: D(p.modalSol) * satuKurangF)
        let sisaFee = feeDari(k, harga, D(h.pool.harga), set, isP)
        return Simulasi(unitTerjual: dbl(terjual), feeDibayar: dbl(fee), sisaNetUsd: dbl(sisaUnit * harga - sisaFee),
                         sisaModalUsd: dbl(sisaModal), sisaPorsi: sisaTotal == 0 ? 0 : dbl(bagi(sisaUnit, sisaTotal) * seratus),
                         maksimal: dbl(n))
    }
}
