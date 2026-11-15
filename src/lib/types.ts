export type Peran = "investor" | "pengelola";
export type Jenis = "setor" | "tarik";
export type Status = "menunggu" | "selesai" | "ditolak" | "dibatalkan";
export type Satuan = "USD" | "SOL";
export type Rentang = "7H" | "30H" | "Semua";

/** Tanggal disimpan sebagai string ISO "YYYY-MM-DD" (WIB). */
export type Tanggal = string;

export interface Anggota {
  id: string;
  nama: string;
  email: string;
  peran: Peran;
  aktif: boolean;
  dibuatPada: string;
}

export interface Snapshot {
  tanggal: Tanggal;
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
  dibuatPada: string;
}

export interface Pengaturan {
  namaPool: string;
  tanggalMulai: Tanggal;
  feePersen: number;
  satuanDasarFee: Satuan;
  batasDataLamaHari: number;
  ambangLonjakanPersen: number;
}

export interface LogAudit {
  id: string;
  tabel: "snapshot" | "permintaan" | "anggota" | "pengaturan" | "impor";
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
  log: LogAudit[];
  pengaturan: Pengaturan;
}
