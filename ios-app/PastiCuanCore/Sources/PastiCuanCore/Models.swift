import Foundation

// Paritas android-app/.../domain/model/Models.kt (nilai raw = nama kolom/enum di Supabase & API).

public enum Peran: String, Codable, Sendable { case investor, pengelola }

public enum Jenis: String, Codable, Sendable { case setor, tarik }

public enum StatusPermintaan: String, Codable, Sendable { case menunggu, selesai, ditolak, dibatalkan }

public enum Satuan: String, Codable, Sendable { case usd = "USD", sol = "SOL" }

public enum ModeSatuan: String, Codable, CaseIterable, Sendable {
    case usd = "USD", sol = "SOL", bandingkan = "Bandingkan"
    public var satuan: Satuan { self == .sol ? .sol : .usd }
}

public enum Rentang: String, CaseIterable, Codable, Sendable {
    case jam24 = "24J", hari7 = "7H", setoranTerakhir = "Setoran Terakhir", semua = "Semua"
    public var label: String { rawValue }
    public var isPendek: Bool { self == .jam24 || self == .hari7 }
}

public enum SumberSnapshot: String, Codable, Sendable {
    case otomatis, manual, koreksi, impor
    public var label: String { rawValue.prefix(1).uppercased() + rawValue.dropFirst() }
}

public enum StatusArus: String, Codable, Sendable {
    case belum, dicocokkan, biaya
    case bukanArus = "bukan_arus"
    public var label: String {
        switch self {
        case .belum: return "Belum dicocokkan"
        case .dicocokkan: return "Dicocokkan"
        case .biaya: return "Biaya pool"
        case .bukanArus: return "Bukan arus"
        }
    }
}

public enum ArahArus: String, Codable, Sendable { case masuk, keluar }

public struct Anggota: Codable, Hashable, Identifiable, Sendable {
    public var id: String
    public var nama: String
    public var email: String = ""
    public var peran: Peran
    public var aktif: Bool = true
    public var alamatWallet: [String] = []
    public var dibuatPada: String

    public init(id: String, nama: String, email: String = "", peran: Peran, aktif: Bool = true, alamatWallet: [String] = [], dibuatPada: String) {
        self.id = id; self.nama = nama; self.email = email; self.peran = peran
        self.aktif = aktif; self.alamatWallet = alamatWallet; self.dibuatPada = dibuatPada
    }

    enum CodingKeys: String, CodingKey { case id, nama, email, peran, aktif, alamatWallet, dibuatPada }
    public init(from d: Decoder) throws {
        let c = try d.container(keyedBy: CodingKeys.self)
        id = try c.decode(String.self, forKey: .id)
        nama = try c.decode(String.self, forKey: .nama)
        email = try c.decodeIfPresent(String.self, forKey: .email) ?? ""
        peran = try c.decode(Peran.self, forKey: .peran)
        aktif = try c.decodeIfPresent(Bool.self, forKey: .aktif) ?? true
        alamatWallet = try c.decodeIfPresent([String].self, forKey: .alamatWallet) ?? []
        dibuatPada = try c.decodeIfPresent(String.self, forKey: .dibuatPada) ?? ""
    }
}

public struct Snapshot: Codable, Hashable, Sendable {
    public var tanggal: String
    public var sumber: SumberSnapshot
    public var alasan: String?
    public var nilaiUsd: Double
    public var saldoSol: Double
    public var feeLpDiklaimSol: Double?
    public var catatan: String?
    public var dibuatOleh: String = "sistem"
    public var dibuatPada: String
    public var diubahPada: String?

    public init(tanggal: String, sumber: SumberSnapshot, alasan: String? = nil, nilaiUsd: Double, saldoSol: Double,
                feeLpDiklaimSol: Double? = nil, catatan: String? = nil, dibuatOleh: String = "sistem",
                dibuatPada: String, diubahPada: String? = nil) {
        self.tanggal = tanggal; self.sumber = sumber; self.alasan = alasan; self.nilaiUsd = nilaiUsd
        self.saldoSol = saldoSol; self.feeLpDiklaimSol = feeLpDiklaimSol; self.catatan = catatan
        self.dibuatOleh = dibuatOleh; self.dibuatPada = dibuatPada; self.diubahPada = diubahPada
    }
}

public struct Permintaan: Codable, Hashable, Identifiable, Sendable {
    public var id: String
    public var anggotaId: String
    public var jenis: Jenis
    public var jumlahUsd: Double
    public var tanggalTransfer: String?
    public var alamatWalletTujuan: String?
    public var buktiTransaksi: String?
    public var catatan: String?
    public var status: StatusPermintaan
    public var alasan: String?
    public var tanggalEfektif: String?
    public var waktuEfektif: String?
    public var titikNilaiId: Int64?
    public var jumlahFinalUsd: Double?
    public var sumber: String = "app"
    public var diprosesOleh: String?
    public var diprosesPada: String?
    public var dibuatOleh: String?
    public var dibuatPada: String

    public init(id: String, anggotaId: String, jenis: Jenis, jumlahUsd: Double, tanggalTransfer: String? = nil,
                alamatWalletTujuan: String? = nil, buktiTransaksi: String? = nil, catatan: String? = nil,
                status: StatusPermintaan, alasan: String? = nil, tanggalEfektif: String? = nil,
                waktuEfektif: String? = nil, titikNilaiId: Int64? = nil, jumlahFinalUsd: Double? = nil,
                sumber: String = "app", diprosesOleh: String? = nil, diprosesPada: String? = nil,
                dibuatOleh: String? = nil, dibuatPada: String) {
        self.id = id; self.anggotaId = anggotaId; self.jenis = jenis; self.jumlahUsd = jumlahUsd
        self.tanggalTransfer = tanggalTransfer; self.alamatWalletTujuan = alamatWalletTujuan
        self.buktiTransaksi = buktiTransaksi; self.catatan = catatan; self.status = status; self.alasan = alasan
        self.tanggalEfektif = tanggalEfektif; self.waktuEfektif = waktuEfektif; self.titikNilaiId = titikNilaiId
        self.jumlahFinalUsd = jumlahFinalUsd; self.sumber = sumber; self.diprosesOleh = diprosesOleh
        self.diprosesPada = diprosesPada; self.dibuatOleh = dibuatOleh; self.dibuatPada = dibuatPada
    }

    /// Transaksi onchain dinilai pada waktu transfer (BR-18), bukan pada snapshot harian.
    public var isOnchainTx: Bool { !(waktuEfektif ?? "").trimmingCharacters(in: .whitespaces).isEmpty && titikNilaiId != nil }
}

public struct ArusOnchain: Codable, Hashable, Identifiable, Sendable {
    public var id: String
    public var signature: String
    public var urutan: Int
    public var waktu: String
    public var arah: ArahArus
    public var token: String
    public var simbol: String?
    public var jumlah: Double
    public var nilaiUsd: Double
    public var alamatLawan: String = ""
    public var status: StatusArus
    public var permintaanId: String?
    public var catatan: String?
    public var alasanSelisih: String?
    public var ditandaiOleh: String?
    public var ditandaiPada: String?

    public init(id: String, signature: String, urutan: Int, waktu: String, arah: ArahArus, token: String,
                simbol: String? = nil, jumlah: Double, nilaiUsd: Double, alamatLawan: String = "",
                status: StatusArus, permintaanId: String? = nil, catatan: String? = nil,
                alasanSelisih: String? = nil, ditandaiOleh: String? = nil, ditandaiPada: String? = nil) {
        self.id = id; self.signature = signature; self.urutan = urutan; self.waktu = waktu; self.arah = arah
        self.token = token; self.simbol = simbol; self.jumlah = jumlah; self.nilaiUsd = nilaiUsd
        self.alamatLawan = alamatLawan; self.status = status; self.permintaanId = permintaanId
        self.catatan = catatan; self.alasanSelisih = alasanSelisih; self.ditandaiOleh = ditandaiOleh
        self.ditandaiPada = ditandaiPada
    }
}

public struct Pengaturan: Codable, Hashable, Sendable {
    public var namaPool: String = "Pasti Cuan"
    public var tanggalMulai: String = "2026-10-16"
    public var feePersen: Double = 0.10
    public var satuanDasarFee: Satuan = .usd
    public var batasDataLamaHari: Int = 2
    public var ambangLonjakanPersen: Double = 30
    public var alamatWalletPool: String = "By6HpsukcTeVsV6FyBzhQJ2nzdHP46kXaSPtrCGUzoaR"
    public var jamSnapshot: String = "08:00"
    public var ambangLikuiditasTokenUsd: Double = 10000
    public var ambangDustUsd: Double = 1
    public var batasLiveLamaMenit: Int = 15
    public var toleransiCocokPersen: Double = 2

    public init() {}
}

public struct LogAudit: Codable, Hashable, Identifiable, Sendable {
    public var id: String
    public var tabel: String
    public var aksi: String
    public var ringkasan: String
    public var nilaiLama: String?
    public var nilaiBaru: String?
    public var oleh: String
    public var pada: String

    public init(id: String, tabel: String, aksi: String, ringkasan: String, nilaiLama: String? = nil,
                nilaiBaru: String? = nil, oleh: String, pada: String) {
        self.id = id; self.tabel = tabel; self.aksi = aksi; self.ringkasan = ringkasan
        self.nilaiLama = nilaiLama; self.nilaiBaru = nilaiBaru; self.oleh = oleh; self.pada = pada
    }
}

public struct TitikNilai: Codable, Hashable, Sendable {
    public var id: Int64?
    public var ms: Int64
    public var nilaiUsd: Double
    public var saldoSol: Double
    public var harga: Double
    public var estimasi: Bool = false

    public init(id: Int64? = nil, ms: Int64, nilaiUsd: Double, saldoSol: Double, harga: Double, estimasi: Bool = false) {
        self.id = id; self.ms = ms; self.nilaiUsd = nilaiUsd; self.saldoSol = saldoSol
        self.harga = harga; self.estimasi = estimasi
    }

    enum CodingKeys: String, CodingKey { case id, ms, nilaiUsd, saldoSol, harga, estimasi }
    public init(from d: Decoder) throws {
        let c = try d.container(keyedBy: CodingKeys.self)
        id = try c.decodeIfPresent(Int64.self, forKey: .id)
        ms = try c.decode(Int64.self, forKey: .ms)
        nilaiUsd = try c.decode(Double.self, forKey: .nilaiUsd)
        saldoSol = try c.decode(Double.self, forKey: .saldoSol)
        harga = try c.decode(Double.self, forKey: .harga)
        estimasi = try c.decodeIfPresent(Bool.self, forKey: .estimasi) ?? false
    }
}

public struct DataPool: Codable, Hashable, Sendable {
    public var anggota: [Anggota]
    public var snapshots: [Snapshot]
    public var permintaan: [Permintaan]
    public var arus: [ArusOnchain]
    public var estimasi: Bool = false
    public var log: [LogAudit] = []
    public var pengaturan: Pengaturan

    public init(anggota: [Anggota], snapshots: [Snapshot], permintaan: [Permintaan], arus: [ArusOnchain],
                estimasi: Bool = false, log: [LogAudit] = [], pengaturan: Pengaturan) {
        self.anggota = anggota; self.snapshots = snapshots; self.permintaan = permintaan; self.arus = arus
        self.estimasi = estimasi; self.log = log; self.pengaturan = pengaturan
    }
}
