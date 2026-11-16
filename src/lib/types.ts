export type Peran = "investor" | "pengelola";
export type Jenis = "setor" | "tarik";
export type Status = "menunggu" | "selesai" | "ditolak" | "dibatalkan";
export type Satuan = "USD" | "SOL";
/** Kontrol satuan grafik: USD, SOL, atau Bandingkan keduanya dalam persen (BR-22). */
export type ModeSatuan = Satuan | "Bandingkan";
export type Rentang = "24J" | "7H" | "30H" | "Semua";
/** Rentang pendek memakai titik nilai (BR-21), sisanya snapshot harian. */
export const RENTANG: Rentang[] = ["24J", "7H", "30H", "Semua"];

/** Tanggal disimpan sebagai string ISO "YYYY-MM-DD" (WIB). */
export type Tanggal = string;

export interface Anggota {
  id: string;
  nama: string;
  email: string;
  peran: Peran;
  aktif: boolean;
  /** Opsional, hanya untuk saran pencocokan arus (AC-07-01, US-13). */
  alamatWallet?: string[];
  dibuatPada: string;
}

/** Asal snapshot (BR-18, AC-02-02). */
export type SumberSnapshot = "otomatis" | "manual" | "koreksi" | "impor";

export interface Snapshot {
  tanggal: Tanggal;
  sumber: SumberSnapshot;
  /** Wajib saat snapshot otomatis dikoreksi. */
  alasan?: string;
  nilaiUsd: number;
  saldoSol: number;
  feeLpDiklaimSol?: number;
  catatan?: string;
  dibuatOleh: string;
  dibuatPada: string;
  diubahPada?: string;
}

export interface Permintaan {
  id: string;
  anggotaId: string;
  jenis: Jenis;
  jumlahUsd: number;
  tanggalTransfer?: Tanggal;
  alamatWalletTujuan?: string;
  buktiTransaksi?: string;
  catatan?: string;
  status: Status;
  alasan?: string;
  tanggalEfektif?: Tanggal;
  jumlahFinalUsd?: number;
  sumber: "app" | "impor";
  diprosesOleh?: string;
  diprosesPada?: string;
  /** Diisi bila pengelola membuat permintaan atas nama anggota dari arus onchain (US-13). */
  dibuatOleh?: string;
  dibuatPada: string;
}

export type StatusArus = "belum" | "dicocokkan" | "biaya" | "bukan_arus";

/** Transfer masuk/keluar wallet pool ke/dari alamat luar (BR-19, tabel `arus_onchain`). */
export interface ArusOnchain {
  id: string;
  signature: string;
  urutan: number;
  /** ISO dengan zona WIB. */
  waktu: string;
  arah: "masuk" | "keluar";
  token: string;
  jumlah: number;
  nilaiUsd: number;
  alamatLawan: string;
  status: StatusArus;
  permintaanId?: string;
  catatan?: string;
  alasanSelisih?: string;
  ditandaiOleh?: string;
  ditandaiPada?: string;
}

export interface Pengaturan {
  namaPool: string;
  tanggalMulai: Tanggal;
  feePersen: number;
  satuanDasarFee: Satuan;
  batasDataLamaHari: number;
  ambangLonjakanPersen: number;
  alamatWalletPool: string;
  /** Jam snapshot otomatis WIB, "08:00" (BR-18). */
  jamSnapshot: string;
  ambangLikuiditasTokenUsd: number;
  ambangDustUsd: number;
  batasLiveLamaMenit: number;
  toleransiCocokPersen: number;
}

export interface LogAudit {
  id: string;
  tabel: "snapshot" | "permintaan" | "anggota" | "pengaturan" | "impor" | "arus";
  aksi: "insert" | "update" | "delete";
  ringkasan: string;
  nilaiLama?: string;
  nilaiBaru?: string;
  oleh: string;
  pada: string;
}

export interface DataPool {
  anggota: Anggota[];
  snapshots: Snapshot[];
  permintaan: Permintaan[];
  arus: ArusOnchain[];
  /** Titik estimasi riwayat sudah dibuat saat impor (BR-24). False bila harga pasar tidak bisa diambil. */
  estimasi: boolean;
  log: LogAudit[];
  pengaturan: Pengaturan;
}
