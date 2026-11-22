import Foundation

/// Port android-app/.../domain/engine/SeedData.kt: data contoh mode prototype lokal (16 Okt - 15 Nov 2026).
public enum SeedData {
    public static let waktuAwal = "2026-11-15T13:03:00+07:00"
    static let mulai = "2026-10-16"

    static let nilaiUsd: [Double] = [
        397.76, 394.73, 617.0, 679.52, 725.59, 769.32, 760.73, 797.73, 808.25, 838.77,
        852.02, 1283.98, 1292.71, 1313.32, 1218.62, 1237.69, 1334.12, 1338.46, 1347.84, 1428.80,
        1413.06, 1378.53, 1438.24, 2161.13, 2098.78, 2132.23, 2068.38, 2058.19, 2129.94, 2076.53
    ]

    private static func bulat9(_ x: Double) -> Double { (x * 1e9).rounded(.toNearestOrAwayFromZero) / 1e9 }

    private static func imporSetor(_ id: String, _ anggotaId: String, _ tanggal: String, _ jumlah: Double) -> Permintaan {
        Permintaan(id: id, anggotaId: anggotaId, jenis: .setor, jumlahUsd: jumlah, tanggalTransfer: tanggal,
                   status: .selesai, tanggalEfektif: tanggal, jumlahFinalUsd: jumlah, sumber: "impor",
                   diprosesOleh: "galih", diprosesPada: "2026-11-14T09:00:00+07:00", dibuatPada: "\(tanggal)T08:00:00+07:00")
    }

    public static func snapshotAwal(_ sim: OnchainSimulator) -> [Snapshot] {
        nilaiUsd.enumerated().map { i, v in
            let tgl = Formatters.tambahHari(mulai, Int64(i))
            let hargaSol = sim.hargaPasar(Formatters.msSnapshot(tgl))
            return Snapshot(tanggal: tgl, sumber: .impor, nilaiUsd: v, saldoSol: bulat9(v / hargaSol),
                            dibuatOleh: "galih", dibuatPada: "\(tgl)T08:00:00+07:00")
        }
    }

    public static func snapshotOtomatis(_ sim: OnchainSimulator, _ tanggal: String) -> Snapshot? {
        guard let t = OnchainSimulator.titikSnapshot(sim.semuaTitik(), tanggal) else { return nil }
        return Snapshot(tanggal: tanggal, sumber: .otomatis, nilaiUsd: t.nilaiUsd, saldoSol: bulat9(t.saldoSol),
                        dibuatOleh: "sistem", dibuatPada: "\(tanggal)T08:00:00+07:00")
    }

    public static func buatDataAwal(_ sim: OnchainSimulator) -> DataPool {
        var snaps = snapshotAwal(sim)
        if let s = snapshotOtomatis(sim, "2026-11-15") { snaps.append(s) }
        var set = Pengaturan()
        set.tanggalMulai = mulai
        set.alamatWalletPool = OnchainSimulator.alamatPool
        return DataPool(
            anggota: [
                Anggota(id: "salman", nama: "Salman", email: "salman@example.com", peran: .investor,
                        alamatWallet: ["7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"], dibuatPada: "2026-10-16T08:00:00+07:00"),
                Anggota(id: "rezki", nama: "Rezki", email: "rezki@example.com", peran: .investor,
                        alamatWallet: ["Chtm91xf8K2mN9pQ4rS7vW3xY6zA1bC5dE8fG2hJ4kLm"], dibuatPada: "2026-10-16T08:00:00+07:00"),
                Anggota(id: "faiz", nama: "Faiz", email: "faiz@example.com", peran: .investor, dibuatPada: "2026-10-16T08:00:00+07:00"),
                Anggota(id: "luqman", nama: "Luqman", email: "luqman@example.com", peran: .investor, dibuatPada: "2026-10-16T08:00:00+07:00"),
                Anggota(id: "hafiz", nama: "Hafiz", email: "hafiz@example.com", peran: .investor,
                        alamatWallet: ["Hfz7cOnToH9mN2pQ5rS8vW1xY4zA7bC3dE6fG9hJ2kLp"], dibuatPada: "2026-10-27T08:00:00+07:00"),
                Anggota(id: "galih", nama: "Galih", email: "galih@example.com", peran: .pengelola, dibuatPada: "2026-10-16T08:00:00+07:00")
            ],
            snapshots: snaps,
            permintaan: [
                imporSetor("t01", "faiz", "2026-10-16", 100), imporSetor("t02", "luqman", "2026-10-16", 100),
                imporSetor("t03", "rezki", "2026-10-16", 100), imporSetor("t04", "salman", "2026-10-16", 100),
                imporSetor("t05", "rezki", "2026-10-18", 200), imporSetor("t06", "salman", "2026-10-27", 200),
                imporSetor("t07", "hafiz", "2026-10-27", 100), imporSetor("t08", "salman", "2026-11-08", 525),
                imporSetor("t09", "rezki", "2026-11-08", 200), imporSetor("t10", "rezki", "2026-11-13", 200),
                Permintaan(id: "p01", anggotaId: "hafiz", jenis: .setor, jumlahUsd: 150, tanggalTransfer: "2026-11-15",
                           buktiTransaksi: "Transfer USDC 15/11 13.00", status: .menunggu, dibuatPada: "2026-11-15T13:01:00+07:00"),
                Permintaan(id: "p02", anggotaId: "faiz", jenis: .tarik, jumlahUsd: 50, catatan: "Untuk keperluan kuliah",
                           status: .menunggu, dibuatPada: "2026-11-15T08:15:00+07:00"),
                Permintaan(id: "p03", anggotaId: "rezki", jenis: .tarik, jumlahUsd: 731.51,
                           alamatWalletTujuan: "Chtm91xf8K2mN9pQ4rS7vW3xY6zA1bC5dE8fG2hJ4kLm", status: .menunggu,
                           dibuatPada: "2026-11-15T08:20:00+07:00")
            ],
            arus: OnchainSimulator.deteksiArus(),
            estimasi: true,
            log: [
                LogAudit(id: "l05", tabel: "permintaan", aksi: "insert", ringkasan: "Mengajukan setoran US$150,00.", oleh: "hafiz", pada: "2026-11-15T13:01:00+07:00"),
                LogAudit(id: "l04", tabel: "permintaan", aksi: "insert", ringkasan: "Mengajukan penarikan US$731,51.", oleh: "rezki", pada: "2026-11-15T08:20:00+07:00"),
                LogAudit(id: "l03", tabel: "permintaan", aksi: "insert", ringkasan: "Mengajukan penarikan US$50,00.", oleh: "faiz", pada: "2026-11-15T08:15:00+07:00"),
                LogAudit(id: "l02", tabel: "snapshot", aksi: "insert", ringkasan: "Snapshot otomatis 15 Nov 2026, 08.00 WIB dari pembacaan wallet.", oleh: "sistem", pada: "2026-11-15T08:00:00+07:00"),
                LogAudit(id: "l01", tabel: "rekonstruksi", aksi: "insert", ringkasan: "Rekonstruksi awal riwayat pool sejak 16 Okt 2026.", oleh: "galih", pada: "2026-11-14T09:00:00+07:00")
            ],
            pengaturan: set
        )
    }
}
