import Foundation

/// Port android-app/.../domain/engine/OnchainSimulator.kt: data onchain contoh untuk mode prototype lokal
/// (harga SOL/DOGE/PEPE dari harga_pasar.json, titik nilai per menit 14-16 Nov 2026, deteksi arus contoh).
public final class OnchainSimulator: @unchecked Sendable {
    public static let menit: Int64 = 60_000
    public static let alamatPool = "By6HpsukcTeVsV6FyBzhQJ2nzdHP46kXaSPtrCGUzoaR"
    static let programDlmm = "LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo"
    static let porsiEstimasi = 0.5

    public static let t0 = Formatters.ms("2026-11-14T08:00:00+07:00")
    public static let mulaiBaca = t0
    static let tSwap = Formatters.ms("2026-11-15T08:38:00+07:00")
    public static let t1303 = Formatters.ms("2026-11-15T13:03:00+07:00")
    static let akhir = Formatters.ms("2026-11-16T23:59:00+07:00")

    static let harga1303 = 70.49
    static let sol1303 = (1171.81 - 0.001) / harga1303
    static let keluarSol = 10.7416 + 0.1
    static let porsiDoge = 0.8

    static let pasangan: [(Int64, Int64, String)] = [
        (Formatters.ms("2026-10-16T20:20:00+07:00"), Formatters.ms("2026-10-22T10:47:00+07:00"), "pepe"),
        (Formatters.ms("2026-10-22T10:51:00+07:00"), Int64.max, "doge")
    ]

    public struct TransferMentah: Sendable {
        let token: String, jumlah: Double, hargaUsd: Double, dari: String, ke: String
    }

    public struct TxMentah: Sendable {
        let signature: String, waktu: String, program: [String], swap: Bool, transfer: [TransferMentah]
    }

    static let txContoh: [TxMentah] = [
        TxMentah(signature: "4sWpSwap15Nov0838", waktu: "2026-11-15T08:38:00+07:00",
                 program: ["JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4"], swap: true, transfer: [
                    TransferMentah(token: "SOL", jumlah: 10.7416, hargaUsd: 68.1, dari: alamatPool, ke: "JupiterVault"),
                    TransferMentah(token: "USDC", jumlah: 731.51, hargaUsd: 1, dari: "JupiterVault", ke: alamatPool)
                 ]),
        TxMentah(signature: "2kRbDlmmRebalance15Nov", waktu: "2026-11-15T09:12:00+07:00", program: [programDlmm], swap: false,
                 transfer: [TransferMentah(token: "SOL", jumlah: 3.2, hargaUsd: 68.9, dari: alamatPool, ke: "DlmmReserve")]),
        TxMentah(signature: "5HqTarikRezki1Usdc1004", waktu: "2026-11-15T10:04:00+07:00",
                 program: ["TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"], swap: false,
                 transfer: [TransferMentah(token: "USDC", jumlah: 1, hargaUsd: 1, dari: alamatPool, ke: "Chtm91xf…")]),
        TxMentah(signature: "3NvTarikRezki730Usdc1005", waktu: "2026-11-15T10:05:00+07:00",
                 program: ["TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"], swap: false,
                 transfer: [TransferMentah(token: "USDC", jumlah: 730.51, hargaUsd: 1, dari: alamatPool, ke: "Chtm91xf…")]),
        TxMentah(signature: "61xKirimSol01DqZ3_1022", waktu: "2026-11-15T10:22:00+07:00",
                 program: ["11111111111111111111111111111111"], swap: false,
                 transfer: [TransferMentah(token: "SOL", jumlah: 0.1, hargaUsd: 69.6, dari: alamatPool, ke: "DqZ3Dn1V…")]),
        TxMentah(signature: "2aDustMasuk0001Usdc1147", waktu: "2026-11-15T11:47:00+07:00",
                 program: ["TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"], swap: false,
                 transfer: [TransferMentah(token: "USDC", jumlah: 0.001, hargaUsd: 1, dari: "BkdHEdNX…", ke: alamatPool)]),
        TxMentah(signature: "4cContohSetorHafiz1306", waktu: "2026-11-15T13:06:00+07:00",
                 program: ["TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"], swap: false,
                 transfer: [TransferMentah(token: "USDC", jumlah: 150, hargaUsd: 1, dari: "Hfz7cOnToH…", ke: alamatPool)])
    ]

    private static func bulat(_ x: Double, _ skala: Double) -> Double { (x * skala).rounded(.toNearestOrAwayFromZero) / skala }

    public static func deteksiArus(alamatPool: String = alamatPool, ambangDustUsd: Double = 1) -> [ArusOnchain] {
        var hasil: [ArusOnchain] = []
        for t in txContoh {
            if t.swap || t.program.contains(programDlmm) { continue }
            for (urutan, x) in t.transfer.enumerated() {
                let masuk = x.ke == alamatPool
                if !masuk && x.dari != alamatPool { continue }
                let dust = x.jumlah * x.hargaUsd < ambangDustUsd
                hasil.append(ArusOnchain(
                    id: "\(t.signature.prefix(8))-\(urutan)", signature: t.signature, urutan: urutan, waktu: t.waktu,
                    arah: masuk ? .masuk : .keluar, token: x.token, simbol: x.token, jumlah: x.jumlah,
                    nilaiUsd: bulat(x.jumlah * x.hargaUsd, 100), alamatLawan: masuk ? x.dari : x.ke,
                    status: dust ? .bukanArus : .belum, catatan: dust ? "dust otomatis" : nil,
                    ditandaiOleh: dust ? "sistem" : nil, ditandaiPada: dust ? t.waktu : nil))
            }
        }
        return hasil
    }

    /// Titik terakhir dengan ms <= t (titik terurut naik), pencarian biner.
    public static func titikTerakhir(_ titik: [TitikNilai], _ t: Int64) -> TitikNilai? {
        var lo = 0, hi = titik.count - 1
        var hasil: TitikNilai?
        while lo <= hi {
            let mid = (lo + hi) / 2
            if titik[mid].ms <= t { hasil = titik[mid]; lo = mid + 1 } else { hi = mid - 1 }
        }
        return hasil
    }

    public static func titikSnapshot(_ titik: [TitikNilai], _ tanggal: String, _ jam: String = "08:00") -> TitikNilai? {
        let mulai = Formatters.msSnapshot(tanggal, jam)
        return titik.first { $0.ms >= mulai && $0.ms <= mulai + 30 * menit }
    }

    private let pasar: [String: [(Int64, Double)]]

    public init(hargaPasarJson: Data) throws {
        let root = try JSONSerialization.jsonObject(with: hargaPasarJson) as? [String: Any] ?? [:]
        var p: [String: [(Int64, Double)]] = [:]
        for k in ["sol", "doge", "pepe"] {
            let arr = root[k] as? [[Any]] ?? []
            p[k] = arr.compactMap { pair in
                guard pair.count >= 2, let t = (pair[0] as? NSNumber)?.int64Value, let v = (pair[1] as? NSNumber)?.doubleValue else { return nil }
                return (t, v)
            }
        }
        pasar = p
    }

    /// Memuat harga_pasar.json yang dibundel di package.
    public convenience init() throws {
        guard let url = Bundle.module.url(forResource: "harga_pasar", withExtension: "json") else {
            throw NSError(domain: "PastiCuanCore", code: 1, userInfo: [NSLocalizedDescriptionKey: "harga_pasar.json tidak ada"])
        }
        try self.init(hargaPasarJson: Data(contentsOf: url))
    }

    public func hargaToken(_ token: String, _ t: Int64) -> Double {
        guard let d = pasar[token], let first = d.first, let last = d.last else { return 0 }
        if t <= first.0 { return first.1 }
        if t >= last.0 { return last.1 }
        var lo = 0, hi = d.count - 1
        while hi - lo > 1 {
            let mid = (lo + hi) / 2
            if d[mid].0 <= t { lo = mid } else { hi = mid }
        }
        let (t1, p1) = d[lo], (t2, p2) = d[hi]
        return p1 + (p2 - p1) * Double(t - t1) / Double(t2 - t1)
    }

    public func hargaPasar(_ t: Int64) -> Double { hargaToken("sol", t) }

    private func rasio(_ token: String, _ t: Int64) -> Double { hargaToken(token, t) / hargaToken("sol", t) }

    private func pasanganDi(_ t: Int64) -> String? {
        Self.pasangan.first { t >= $0.0 && t <= $0.1 }?.2
    }

    private func riak(_ m: Double) -> Double {
        0.0022 * sin(m / 53) + 0.0012 * sin(m / 17 + 1) + 0.0006 * sin(m / 5.3 + 2)
    }

    private func noise(_ m: Double) -> Double { riak(m) - riak(0) }

    private var m1303: Double { Double(Self.t1303 - Self.t0) / Double(Self.menit) }
    private lazy var koreksi1303: Double = Self.harga1303 / (hargaPasar(Self.t1303) * (1 + noise(m1303)))

    public func harga(_ t: Int64) -> Double {
        let m = Double(t - Self.t0) / Double(Self.menit)
        let k = 1 + (koreksi1303 - 1) * min(1, max(0, m / m1303))
        return hargaPasar(t) * (1 + noise(m)) * k
    }

    private func rasioMenit(_ t: Int64) -> Double {
        let m = Double(t - Self.t0) / Double(Self.menit)
        return rasio("doge", t) * (1 + 0.0004 * sin(m / 7.3 + 0.5) + 0.0003 * sin(m / 23 + 2) - 0.0004 * sin(0.5) - 0.0003 * sin(2.0))
    }

    private lazy var s0: Double = 2076.53 / hargaPasar(Self.t0)
    private lazy var k1303: Double = {
        let posisi1303 = s0 * (1 + Self.porsiDoge * (rasioMenit(Self.t1303) / rasioMenit(Self.t0) - 1))
        return (Self.sol1303 + Self.keluarSol) / posisi1303
    }()

    private func posisiSol(_ t: Int64) -> Double {
        let m = Double(t - Self.t0) / Double(Self.menit)
        let k = 1 + (k1303 - 1) * min(1, max(0, m / m1303))
        return s0 * (1 + Self.porsiDoge * (rasioMenit(t) / rasioMenit(Self.t0) - 1)) * k
    }

    private lazy var transferTercatat: [(Int64, TransferMentah)] = Self.txContoh
        .filter { !$0.swap && !$0.program.contains(Self.programDlmm) }
        .flatMap { tx in tx.transfer.map { (Formatters.ms(tx.waktu), $0) } }

    private func kepemilikan(_ t: Int64) -> (Double, Double) {
        var sol = posisiSol(t)
        var usdc = 0.0
        if t >= Self.tSwap { sol -= 10.7416; usdc += 731.51 }
        for (waktu, tr) in transferTercatat where waktu <= t {
            let sign = tr.ke == Self.alamatPool ? 1.0 : -1.0
            if tr.token == "SOL" { sol += sign * tr.jumlah } else { usdc += sign * tr.jumlah }
        }
        return (sol, usdc)
    }

    private var cacheTitik: [TitikNilai]?

    public func semuaTitik() -> [TitikNilai] {
        if let c = cacheTitik { return c }
        var out: [TitikNilai] = []
        let wajib: Set<Int64> = [Self.t0, Self.t1303, Formatters.ms("2026-11-15T08:00:00+07:00"), Formatters.ms("2026-11-16T08:00:00+07:00")]
        var idSeq: Int64 = 10_000
        var t = Self.t0
        while t <= Self.akhir {
            let m = (t - Self.t0) / Self.menit
            if !wajib.contains(t) && (m * 7919) % 211 == 0 {
                t += Self.menit
                continue
            }
            let h = harga(t)
            let (sol, usdc) = kepemilikan(t)
            let nilaiUsd = Self.bulat(sol * h + usdc, 100)
            out.append(TitikNilai(id: idSeq, ms: t, nilaiUsd: nilaiUsd, saldoSol: nilaiUsd / h, harga: h, estimasi: false))
            idSeq += 1
            t += Self.menit
        }
        cacheTitik = out
        return out
    }

    public func titikEstimasi(_ snapshots: [Snapshot], _ permintaan: [Permintaan], sampai: Int64 = mulaiBaca,
                              jam: String = "08:00", w: Double = porsiEstimasi) -> [TitikNilai] {
        let snaps = snapshots.sorted { $0.tanggal < $1.tanggal }.filter { Formatters.msSnapshot($0.tanggal, jam) <= sampai }
        let jamMs = 60 * Self.menit

        func arusHari(_ tgl: String) -> Double {
            permintaan.filter { $0.status == .selesai && $0.tanggalEfektif == tgl }
                .reduce(0) { $0 + ($1.jenis == .setor ? 1 : -1) * ($1.jumlahFinalUsd ?? $1.jumlahUsd) }
        }

        func faktorPasar(_ ta: Int64, _ tb: Int64) -> [Int64: Double] {
            var m: [Int64: Double] = [:]
            var kunci: String?
            var tAnchor = ta
            var mAnchor = 1.0
            var mSebelum = 1.0
            var t = ta
            while t <= tb {
                let pas = pasanganDi(t)
                if pas != kunci {
                    kunci = pas
                    tAnchor = t
                    mAnchor = mSebelum
                }
                let v = pas != nil ? mAnchor * (1 + w * (rasio(pas!, t) / rasio(pas!, tAnchor) - 1)) : mAnchor
                m[t] = v
                mSebelum = v
                t += jamMs
            }
            return m
        }

        var out: [TitikNilai] = []
        var estId: Int64 = 1
        for (i, a) in snaps.enumerated() {
            let ta = Formatters.msSnapshot(a.tanggal, jam)
            let b: Snapshot? = i + 1 < snaps.count ? snaps[i + 1] : nil
            let tbPenuh = b != nil ? Formatters.msSnapshot(b!.tanggal, jam) : ta + jamMs
            let tb = min(tbPenuh, sampai)
            let solA = a.saldoSol
            let mMap = faktorPasar(ta, tbPenuh)
            let solB: Double
            if let b = b {
                solB = b.saldoSol - arusHari(b.tanggal) / (b.nilaiUsd / b.saldoSol)
            } else {
                solB = solA * (mMap[tbPenuh] ?? 1)
            }
            let kB = solB / (solA * (mMap[tbPenuh] ?? 1))
            var t = ta
            while t < tb {
                let denom = tbPenuh - ta != 0 ? Double(tbPenuh - ta) : 1
                let k = 1 + (kB - 1) * Double(t - ta) / denom
                let sol = solA * (mMap[t] ?? 1) * k
                let h = t == ta ? a.nilaiUsd / a.saldoSol : hargaPasar(t)
                let nilaiUsd = Self.bulat(sol * h, 100)
                out.append(TitikNilai(id: estId, ms: t, nilaiUsd: nilaiUsd, saldoSol: nilaiUsd / h, harga: h, estimasi: true))
                estId += 1
                t += jamMs
            }
        }
        return out
    }
}
