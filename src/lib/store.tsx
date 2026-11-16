"use client";
// Store prototype: data contoh di localStorage, menggantikan Supabase + API PRD Section 3.1.
// Setiap aksi menegakkan aturan bisnis yang sama dengan kontrak API (BR-08 s.d. BR-13) dan
// menulis log audit, lalu semua angka dihitung ulang dari fakta.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { hitungPool, seriRentang, terapkanLive, type HasilPool, type Seri } from "./engine";
import { selisihHari, tambahHari, tanggal, usd, waktu } from "./format";
import { isoWib, MENIT, ms, msSnapshot, MULAI_BACA, semuaTitik, titikEstimasi, type TitikNilai } from "./onchain";
import { dataAwal, snapshotOtomatis, WAKTU_AWAL } from "./seed";
import type { Anggota, ArusOnchain, DataPool, Jenis, LogAudit, Pengaturan, Peran, Permintaan, ModeSatuan, Rentang, Satuan, Snapshot } from "./types";

export type Skenario =
  | "normal"
  | "memuat"
  | "gagal"
  | "grafikGagal"
  | "belumSetor"
  | "dataLama"
  | "cekGagal"
  | "offline"
  | "liveLama"
  | "walletTerganggu";

export const SKENARIO: { id: Skenario; label: string; ket: string }[] = [
  { id: "normal", label: "Normal", ket: "Data lengkap" },
  { id: "memuat", label: "Memuat", ket: "Kerangka abu-abu" },
  { id: "gagal", label: "Gagal memuat", ket: "Error + Coba lagi" },
  { id: "grafikGagal", label: "Grafik gagal", ket: "Angka tampil, grafik error" },
  { id: "belumSetor", label: "Belum setor", ket: "Investor tanpa setoran" },
  { id: "dataLama", label: "Data lama", ket: "Snapshot > 2 hari" },
  { id: "cekGagal", label: "Cek data gagal", ket: "BR-12, tarik diblokir" },
  { id: "offline", label: "Offline", ket: "Banner + form nonaktif" },
  { id: "liveLama", label: "Nilai live lama", ket: "Titik terakhir 20 menit lalu (BR-20)" },
  { id: "walletTerganggu", label: "Wallet terganggu", ket: "Tidak ada titik 75 menit (BR-20)" },
];

/** Lompatan waktu prototype untuk mencoba snapshot otomatis (BR-18). */
export const LOMPATAN = [
  { id: "berhasil", ke: "2026-11-16T08:00:00+07:00", label: "16 Nov 2026, 08.00 WIB", ket: "Snapshot otomatis dibuat" },
  { id: "gagal", ke: "2026-11-16T08:31:00+07:00", label: "16 Nov 2026, 08.31 WIB", ket: "Pembacaan 08.00-08.30 gagal" },
] as const;

/** Tanggal efektif transfer onchain = tanggal snapshot resmi pertama sesudah transfer (BR-18). */
export function tanggalEfektifArus(waktuArus: string, jam = "08:00"): string {
  const tgl = waktuArus.slice(0, 10);
  return ms(waktuArus) < msSnapshot(tgl, jam) ? tgl : tambahHari(tgl, 1);
}

// Dari halaman Arus ke antrean permintaan: lembar "Tandai selesai" langsung terbuka dengan isian terisi (AC-13-01).
let tujuanSelesai: { permintaanId?: string; arusId?: string } | null = null;
export function mintaSelesai(t: { permintaanId?: string; arusId?: string }) {
  tujuanSelesai = t;
}
export function lihatTujuanSelesai() {
  return tujuanSelesai;
}
export function hapusTujuanSelesai() {
  tujuanSelesai = null;
}

type AksiArus =
  | { status: "dicocokkan"; permintaanId: string; alasanSelisih?: string }
  | { status: "buat"; anggotaId: string; alasanSelisih?: string }
  | { status: "biaya"; catatan: string }
  | { status: "bukan_arus"; catatan: string };

type Hasil<T = undefined> = { ok: true; nilai?: T } | { ok: false; pesan: string; field?: string };

interface Toast {
  id: number;
  pesan: string;
}

interface Ctx {
  siap: boolean;
  data: DataPool;
  /** Angka untuk tampilan: NAV live bila ada titik nilai sesudah snapshot terakhir. */
  hasil: HasilPool;
  /** Angka resmi per snapshot terakhir, dasar transaksi. */
  resmi: HasilPool;
  sekarang: number;
  /** Titik nilai yang tersedia sampai sekarang (menit gagal tidak ada). */
  titik: TitikNilai[];
  titikAkhir: TitikNilai | null;
  /** Menit sejak titik nilai terakhir (BR-20). */
  lamaLiveMenit: number;
  arus: ArusOnchain[];
  arusBelum: ArusOnchain[];
  seri: (r: Rentang, anggotaId?: string | null) => Seri;
  majukanWaktu: (id: (typeof LOMPATAN)[number]["id"]) => void;
  tandaiArus: (ids: string[], a: AksiArus) => Hasil<string>;
  batalTandai: (id: string) => Hasil;
  saya: Anggota | null;
  skenario: Skenario;
  hariIni: string;
  dataLama: boolean;
  cekGagal: boolean;
  offline: boolean;
  /** Satuan aktif untuk angka dan kartu lain; di mode Bandingkan = USD. */
  satuan: Satuan;
  mode: ModeSatuan;
  toast: Toast | null;
  menunggu: Permintaan[];
  setMode: (m: ModeSatuan) => void;
  setSkenario: (s: Skenario) => void;
  masuk: (id: string) => void;
  keluar: () => void;
  reset: () => void;
  tampilkan: (pesan: string) => void;
  tutupToast: () => void;
  nama: (id: string) => string;
  ajukan: (p: { jenis: Jenis; jumlahUsd: number; tanggalTransfer?: string; buktiTransaksi?: string; alamatWalletTujuan?: string; catatan?: string }) => Hasil;
  batalkan: (id: string) => Hasil;
  selesaikan: (id: string, p: { tanggalEfektif: string; jumlahFinalUsd: number; buktiTransaksi?: string; alasan?: string }) => Hasil;
  tolak: (id: string, alasan: string) => Hasil;
  simpanSnapshot: (s: Omit<Snapshot, "dibuatOleh" | "dibuatPada" | "diubahPada" | "sumber">, ubah: boolean) => Hasil;
  hapusSnapshot: (tgl: string) => Hasil;
  tambahAnggota: (a: { nama: string; email: string; peran: Peran; alamatWallet?: string[] }) => Hasil;
  setAktif: (id: string, aktif: boolean) => Hasil;
  ubahPeran: (id: string, peran: Peran) => Hasil;
  ubahPengaturan: (p: Partial<Pengaturan>) => Hasil;
  batalkanImpor: () => Hasil;
  impor: (snapshots: Snapshot[], transaksi: Permintaan[], estimasi: boolean) => Hasil;
  buatUlangEstimasi: () => Hasil;
}

const C = createContext<Ctx | null>(null);
const KUNCI = "pasti-cuan-prototype-v3";

interface Simpanan {
  data: DataPool;
  userId: string | null;
  skenario: Skenario;
  satuan: ModeSatuan;
  /** Jam prototype (WIB). Bertambah 1 menit tiap menit selama halaman terbuka. */
  waktuDasar: string;
  /** Rentang waktu tanpa titik nilai (pembacaan gagal). */
  celah: [number, number] | null;
}

let seq = 0;
const idBaru = (p: string) => `${p}${Date.now().toString(36)}${(seq++).toString(36)}`;

// ---------- penyimpanan di luar React (localStorage), dibaca lewat useSyncExternalStore ----------
const AWAL: Simpanan = { data: dataAwal(), userId: "salman", skenario: "normal", satuan: "USD", waktuDasar: WAKTU_AWAL, celah: null };
let isi: Simpanan | null = null;
const pendengar = new Set<() => void>();

function baca(): Simpanan {
  if (isi) return isi;
  isi = AWAL;
  try {
    const raw = localStorage.getItem(KUNCI);
    if (raw) {
      const s = JSON.parse(raw) as Simpanan;
      if (s.data?.anggota && s.data.arus) {
        isi = {
          data: s.data,
          userId: s.userId ?? null,
          skenario: s.skenario ?? "normal",
          satuan: s.satuan === "SOL" || s.satuan === "Bandingkan" ? s.satuan : "USD",
          waktuDasar: s.waktuDasar ?? WAKTU_AWAL,
          celah: s.celah ?? null,
        };
      }
    }
  } catch {
    /* data rusak: pakai data contoh */
  }
  return isi;
}
function tulis(f: (s: Simpanan) => Simpanan) {
  isi = f(baca());
  try {
    localStorage.setItem(KUNCI, JSON.stringify(isi));
  } catch {
    /* penyimpanan penuh atau diblokir: tetap jalan di memori */
  }
  pendengar.forEach((l) => l());
}
function dengar(l: () => void) {
  pendengar.add(l);
  return () => pendengar.delete(l);
}
const tanpaLangganan = () => () => {};

export function StoreProvider({ children }: { children: ReactNode }) {
  // siap = sudah di browser; server dan render pertama memakai data awal supaya hidrasi cocok
  const siap = useSyncExternalStore(tanpaLangganan, () => true, () => false);
  const { data, userId, skenario, satuan, waktuDasar, celah } = useSyncExternalStore(dengar, baca, () => AWAL);
  const [toast, setToast] = useState<Toast | null>(null);
  // Jam berjalan: Beranda dan Pool memuat ulang angka tiap 60 detik selama tab aktif (PRD 3.2, Pembaruan angka)
  const [menit, setMenit] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") setMenit((m) => m + 1);
    }, 60_000);
    return () => clearInterval(id);
  }, []);
  const setData = (f: (d: DataPool) => DataPool) => tulis((s) => ({ ...s, data: f(s.data) }));
  const setUserId = (id: string | null) => tulis((s) => ({ ...s, userId: id }));
  const setSkenarioState = (k: Skenario) => tulis((s) => ({ ...s, skenario: k }));
  const setModeState = (m: ModeSatuan) => tulis((s) => ({ ...s, satuan: m }));

  const sekarang = ms(waktuDasar) + menit * MENIT;
  // Skenario BR-20: pembacaan wallet gagal 20 atau 75 menit terakhir
  const gagalMenit = skenario === "liveLama" ? 20 : skenario === "walletTerganggu" ? 75 : 0;
  // Titik estimasi per jam untuk riwayat impor (BR-24), hanya untuk grafik. Titik asli menggantikannya mulai MULAI_BACA.
  const estimasi = useMemo(
    () => (data.estimasi ? titikEstimasi(data.snapshots.filter((x) => x.sumber === "impor"), data.permintaan, MULAI_BACA, data.pengaturan.jamSnapshot) : []),
    [data.estimasi, data.snapshots, data.permintaan, data.pengaturan.jamSnapshot],
  );
  const titik = useMemo(() => {
    const batas = sekarang - gagalMenit * MENIT;
    const asli = semuaTitik().filter((t) => t.ms <= (gagalMenit ? batas : sekarang) && !(celah && t.ms >= celah[0] && t.ms <= celah[1]));
    return [...estimasi.filter((t) => t.ms < MULAI_BACA), ...asli];
  }, [sekarang, gagalMenit, celah, estimasi]);
  const titikAkhir = titik.length && !titik[titik.length - 1].estimasi ? titik[titik.length - 1] : null;
  const arus = useMemo(() => data.arus.filter((a) => ms(a.waktu) <= sekarang), [data.arus, sekarang]);
  const resmi = useMemo(
    () => hitungPool(data.anggota, data.snapshots, data.permintaan, data.pengaturan, arus),
    [data.anggota, data.snapshots, data.permintaan, data.pengaturan, arus],
  );
  const hasil = useMemo(
    () => terapkanLive(resmi, data.anggota, data.snapshots, arus, titik, sekarang, data.pengaturan),
    [resmi, data.anggota, data.snapshots, arus, titik, sekarang, data.pengaturan],
  );
  const lamaLiveMenit = titikAkhir ? Math.floor((sekarang - titikAkhir.ms) / MENIT) : Infinity;
  const arusBelum = arus.filter((a) => a.status === "belum");
  const saya = data.anggota.find((a) => a.id === userId && a.aktif) ?? null;
  const hariIni = skenario === "dataLama" && hasil.tanggalData ? tambahHari(hasil.tanggalData, 3) : isoWib(sekarang).slice(0, 10);
  const dataLama = !!hasil.tanggalData && selisihHari(hasil.tanggalData, hariIni) > data.pengaturan.batasDataLamaHari;
  const cekGagal = skenario === "cekGagal" || !hasil.cek.lolos;
  const offline = skenario === "offline";
  const menunggu = data.permintaan.filter((p) => p.status === "menunggu");

  const nama = useCallback((id: string) => data.anggota.find((a) => a.id === id)?.nama ?? id, [data.anggota]);
  const tampilkan = useCallback((pesan: string) => setToast({ id: Date.now(), pesan }), []);
  const kini = () => isoWib(sekarang);

  function ubah(f: (d: DataPool) => DataPool, log?: Omit<LogAudit, "id" | "pada" | "oleh">) {
    setData((d) => {
      const baru = f(d);
      return log ? { ...baru, log: [{ ...log, id: idBaru("l"), pada: kini(), oleh: userId ?? "sistem" }, ...baru.log] } : baru;
    });
  }

  const offlineErr: Hasil = { ok: false, pesan: "Kamu sedang offline. Form dinonaktifkan sampai koneksi kembali." };

  const ctx: Ctx = {
    siap,
    data,
    hasil,
    resmi,
    sekarang,
    titik,
    titikAkhir,
    lamaLiveMenit,
    arus,
    arusBelum,
    seri: (r, anggotaId = null) =>
      seriRentang({ h: resmi, anggota: data.anggota, snaps: data.snapshots, permintaan: data.permintaan, arus, titik, sekarang, set: data.pengaturan }, r, anggotaId),

    majukanWaktu(id) {
      const l = LOMPATAN.find((x) => x.id === id)!;
      const tgl = l.ke.slice(0, 10);
      const gagal = id === "gagal";
      setMenit(0);
      tulis((st) => {
        let d = st.data;
        if (!gagal && !d.snapshots.some((x) => x.tanggal === tgl)) {
          const snap = snapshotOtomatis(tgl);
          if (snap) {
            d = {
              ...d,
              snapshots: [...d.snapshots, snap],
              log: [
                {
                  id: idBaru("l"),
                  tabel: "snapshot",
                  aksi: "insert",
                  ringkasan: `Snapshot otomatis ${waktu(snap.dibuatPada)} dari pembacaan wallet: ${usd(snap.nilaiUsd)}.`,
                  oleh: "sistem",
                  pada: snap.dibuatPada,
                },
                ...d.log,
              ],
            };
          }
        }
        return {
          ...st,
          data: d,
          waktuDasar: l.ke,
          celah: gagal ? [msSnapshot(tgl, d.pengaturan.jamSnapshot), ms(l.ke)] : st.celah,
        };
      });
      tampilkan(gagal ? "Waktu prototype: 16 Nov 08.31. Pembacaan wallet 08.00-08.30 gagal." : "Waktu prototype: 16 Nov 08.00. Snapshot otomatis dibuat.");
    },

    tandaiArus(ids, a) {
      if (offline) return offlineErr;
      if (saya?.peran !== "pengelola") return { ok: false, pesan: "Halaman ini khusus pengelola." };
      const pilih = data.arus.filter((x) => ids.includes(x.id));
      if (!pilih.length) return { ok: false, pesan: "Pilih minimal satu transfer." };
      if (pilih.some((x) => x.status !== "belum")) return { ok: false, pesan: "Transfer ini sudah dicocokkan. Muat ulang daftar." };
      const arah = pilih[0].arah;
      if (pilih.some((x) => x.arah !== arah)) return { ok: false, pesan: "Transfer masuk dan keluar tidak bisa dicocokkan ke satu permintaan." };
      const total = pilih.reduce((t, x) => t + x.nilaiUsd, 0);
      const ditandai = { ditandaiOleh: saya.id, ditandaiPada: kini() };
      const kapan = waktu(pilih[pilih.length - 1].waktu);

      if (a.status === "biaya" || a.status === "bukan_arus") {
        const c = a.catatan.trim();
        if (!c) return { ok: false, pesan: "Catatan wajib diisi.", field: "catatan" };
        if (c.length > 200) return { ok: false, pesan: "Catatan maksimal 200 karakter.", field: "catatan" };
        ubah(
          (d) => ({ ...d, arus: d.arus.map((x) => (ids.includes(x.id) ? { ...x, status: a.status, catatan: c, ...ditandai } : x)) }),
          {
            tabel: "arus",
            aksi: "update",
            ringkasan: `Menandai transfer ${kapan} ${usd(total)} sebagai ${a.status === "biaya" ? "biaya pool" : "bukan arus"}: ${c}`,
            nilaiLama: "belum",
            nilaiBaru: a.status,
          },
        );
        return { ok: true, nilai: a.status === "biaya" ? `Transfer ${kapan} ditandai biaya pool.` : `Transfer ${kapan} ditandai bukan arus.` };
      }

      const jenis: Jenis = arah === "masuk" ? "setor" : "tarik";
      const alasanSelisih = a.alasanSelisih?.trim() || undefined;
      let p: Permintaan;
      if (a.status === "dicocokkan") {
        const ada = data.permintaan.find((x) => x.id === a.permintaanId);
        if (!ada || ada.status !== "menunggu") return { ok: false, pesan: "Permintaan ini sudah diproses. Muat ulang daftar." };
        if (ada.jenis !== jenis) return { ok: false, pesan: `Transfer ${arah} hanya bisa dicocokkan dengan ${arah === "masuk" ? "setoran" : "penarikan"}.` };
        const selisih = (Math.abs(total - ada.jumlahUsd) / ada.jumlahUsd) * 100;
        if (selisih > data.pengaturan.toleransiCocokPersen && !a.alasanSelisih?.trim()) {
          return {
            ok: false,
            pesan: `Jumlah transfer ${usd(total)} berbeda dari permintaan ${usd(ada.jumlahUsd)}. Isi alasan untuk melanjutkan.`,
            field: "alasan",
          };
        }
        p = ada;
      } else {
        const idAng = a.anggotaId;
        const ang = data.anggota.find((x) => x.id === idAng);
        if (!ang) return { ok: false, pesan: "Pilih anggota.", field: "anggota" };
        if (data.permintaan.some((x) => x.anggotaId === ang.id && x.jenis === jenis && x.status === "menunggu")) {
          return { ok: false, pesan: `${ang.nama} masih punya ${jenis === "setor" ? "setoran" : "penarikan"} yang menunggu. Cocokkan dengan permintaan itu.`, field: "anggota" };
        }
        p = {
          id: idBaru("p"),
          anggotaId: ang.id,
          jenis,
          jumlahUsd: Math.round(total * 100) / 100,
          tanggalTransfer: pilih[0].waktu.slice(0, 10),
          buktiTransaksi: pilih.map((x) => x.signature).join(", "),
          status: "menunggu",
          sumber: "app",
          dibuatOleh: saya.id,
          dibuatPada: kini(),
        };
      }
      const nm = nama(p.anggotaId);
      const label = `${jenis === "setor" ? "setoran" : "penarikan"} ${nm} ${usd(p.jumlahUsd)}`;
      ubah(
        (d) => ({
          ...d,
          permintaan: a.status === "buat" ? [...d.permintaan, p] : d.permintaan,
          arus: d.arus.map((x) =>
            ids.includes(x.id) ? { ...x, status: "dicocokkan", permintaanId: p.id, alasanSelisih, ...ditandai } : x,
          ),
        }),
        {
          tabel: "arus",
          aksi: "update",
          ringkasan: `${a.status === "buat" ? "Membuat permintaan dan mencocokkan" : "Mencocokkan"} transfer ${kapan} (${usd(total)}) dengan ${label}.`,
          nilaiLama: "belum",
          nilaiBaru: "dicocokkan",
        },
      );
      return { ok: true, nilai: `Transfer ${kapan} dicocokkan dengan ${label}.` };
    },

    batalTandai(id) {
      if (offline) return offlineErr;
      if (saya?.peran !== "pengelola") return { ok: false, pesan: "Halaman ini khusus pengelola." };
      const x = data.arus.find((a) => a.id === id);
      if (!x || x.status === "belum") return { ok: false, pesan: "Transfer ini belum ditandai." };
      // AC-13-02: hanya selama snapshot resmi yang memakai arus ini belum dibuat
      const dipakai = data.snapshots.find((sn) => msSnapshot(sn.tanggal, data.pengaturan.jamSnapshot) > ms(x.waktu));
      if (dipakai) return { ok: false, pesan: `Transfer ini sudah dipakai snapshot ${tanggal(dipakai.tanggal)}. Perbaiki lewat koreksi saldo.` };
      const p = data.permintaan.find((q) => q.id === x.permintaanId);
      if (p && p.status === "selesai") return { ok: false, pesan: "Permintaan yang terkait sudah selesai. Perbaiki lewat koreksi." };
      ubah(
        (d) => ({
          ...d,
          arus: d.arus.map((a) =>
            a.id === id ? { ...a, status: "belum", permintaanId: undefined, catatan: undefined, alasanSelisih: undefined, ditandaiOleh: undefined, ditandaiPada: undefined } : a,
          ),
        }),
        { tabel: "arus", aksi: "update", ringkasan: `Membatalkan penandaan transfer ${waktu(x.waktu)} ${usd(x.nilaiUsd)}.`, nilaiLama: x.status, nilaiBaru: "belum" },
      );
      return { ok: true };
    },
    saya,
    skenario,
    hariIni,
    dataLama,
    cekGagal,
    offline,
    satuan: satuan === "SOL" ? "SOL" : "USD",
    mode: satuan,
    toast,
    menunggu,
    setMode: setModeState,
    setSkenario: setSkenarioState,
    masuk: (id) => setUserId(id),
    keluar: () => setUserId(null),
    reset: () => {
      setMenit(0);
      tulis((st) => ({ ...st, data: dataAwal(), skenario: "normal", waktuDasar: WAKTU_AWAL, celah: null }));
      tampilkan("Data contoh dikembalikan ke kondisi awal.");
    },
    tampilkan,
    tutupToast: () => setToast(null),
    nama,

    ajukan(p) {
      if (offline) return offlineErr;
      if (!saya) return { ok: false, pesan: "Sesi kamu berakhir. Silakan masuk lagi." };
      if (!(p.jumlahUsd > 0)) return { ok: false, pesan: "Jumlah harus lebih dari 0.", field: "jumlah" };
      // BR-08: maksimal 1 permintaan menunggu per investor per jenis
      if (data.permintaan.some((x) => x.anggotaId === saya.id && x.jenis === p.jenis && x.status === "menunggu")) {
        return {
          ok: false,
          pesan:
            p.jenis === "setor"
              ? "Kamu masih punya permintaan setoran yang menunggu. Batalkan atau tunggu yang itu selesai dulu."
              : "Kamu masih punya permintaan penarikan yang menunggu. Batalkan atau tunggu yang itu selesai dulu.",
        };
      }
      if (p.jenis === "tarik") {
        if (cekGagal) return { ok: false, pesan: "Penarikan ditahan sementara karena angka sedang dicek ulang." };
        const pos = hasil.posisi.find((x) => x.id === saya.id)!;
        if (p.jumlahUsd > pos.netUsd + 0.005) {
          return { ok: false, pesan: `Maksimal yang bisa kamu tarik hari ini ${usd(pos.netUsd)}.`, field: "jumlah" };
        }
      }
      const baru: Permintaan = { id: idBaru("p"), anggotaId: saya.id, status: "menunggu", sumber: "app", dibuatPada: kini(), ...p };
      ubah((d) => ({ ...d, permintaan: [...d.permintaan, baru] }), {
        tabel: "permintaan",
        aksi: "insert",
        ringkasan: `Mengajukan ${p.jenis === "setor" ? "setoran" : "penarikan"} ${usd(p.jumlahUsd)}.`,
      });
      return { ok: true };
    },

    batalkan(id) {
      if (offline) return offlineErr;
      const p = data.permintaan.find((x) => x.id === id);
      if (!p || p.anggotaId !== saya?.id) return { ok: false, pesan: "Kamu hanya bisa membatalkan permintaan milikmu sendiri." };
      if (p.status !== "menunggu") return { ok: false, pesan: "Permintaan ini sudah diproses dan tidak bisa dibatalkan." };
      if (data.arus.some((a) => a.permintaanId === id)) {
        return { ok: false, pesan: "Transfernya sudah tercatat di wallet, jadi tidak bisa dibatalkan di app. Hubungi pengelola." };
      }
      ubah((d) => ({ ...d, permintaan: d.permintaan.map((x) => (x.id === id ? { ...x, status: "dibatalkan" } : x)) }), {
        tabel: "permintaan",
        aksi: "update",
        ringkasan: `Membatalkan ${p.jenis === "setor" ? "setoran" : "penarikan"} ${usd(p.jumlahUsd)}.`,
        nilaiLama: "menunggu",
        nilaiBaru: "dibatalkan",
      });
      return { ok: true };
    },

    selesaikan(id, q) {
      if (offline) return offlineErr;
      if (saya?.peran !== "pengelola") return { ok: false, pesan: "Halaman ini khusus pengelola." };
      const p = data.permintaan.find((x) => x.id === id);
      if (!p || p.status !== "menunggu") return { ok: false, pesan: "Permintaan ini sudah diproses." };
      // BR-10: tanggal efektif wajib punya snapshot
      if (!data.snapshots.some((s) => s.tanggal === q.tanggalEfektif)) {
        const jam = data.pengaturan.jamSnapshot.replace(":", ".");
        return {
          ok: false,
          pesan:
            msSnapshot(q.tanggalEfektif, data.pengaturan.jamSnapshot) > sekarang
              ? `Snapshot ${tanggal(q.tanggalEfektif)} belum ada. Snapshot otomatis dibuat ${tanggal(q.tanggalEfektif)}, ${jam} WIB; tandai selesai sesudahnya.`
              : `Belum ada snapshot untuk ${tanggal(q.tanggalEfektif)}. Isi snapshot manual dulu.`,
          field: "tanggal",
        };
      }
      if (!(q.jumlahFinalUsd > 0)) return { ok: false, pesan: "Jumlah harus lebih dari 0.", field: "jumlah" };
      if (Math.abs(q.jumlahFinalUsd - p.jumlahUsd) > 0.004 && !q.alasan?.trim()) {
        return { ok: false, pesan: "Jumlah berbeda dari yang diajukan. Tulis alasannya.", field: "alasan" };
      }
      const final: Permintaan = {
        ...p,
        status: "selesai",
        tanggalEfektif: q.tanggalEfektif,
        jumlahFinalUsd: q.jumlahFinalUsd,
        buktiTransaksi: q.buktiTransaksi || p.buktiTransaksi,
        alasan: q.alasan?.trim() || undefined,
        diprosesOleh: saya.id,
        diprosesPada: kini(),
      };
      if (p.jenis === "tarik") {
        // BR-09: hitung ulang dengan penarikan ini; tolak jika melebihi nilai bersih pada tanggal efektif
        const uji = hitungPool(data.anggota, data.snapshots, data.permintaan.map((x) => (x.id === id ? final : x)), data.pengaturan);
        const nm = nama(p.anggotaId);
        if (uji.cek.penyebab.some((s) => s.startsWith(`Penarikan ${nm}`))) {
          const sebelum = hitungPool(
            data.anggota,
            data.snapshots.filter((s) => s.tanggal <= q.tanggalEfektif),
            data.permintaan,
            data.pengaturan,
          ).posisi.find((x) => x.id === p.anggotaId)!;
          return {
            ok: false,
            pesan: `Nilai bersih investor sekarang ${usd(sebelum.netUsd)}, kurang dari ${usd(q.jumlahFinalUsd)} yang diminta.`,
            field: "jumlah",
          };
        }
      }
      ubah((d) => ({ ...d, permintaan: d.permintaan.map((x) => (x.id === id ? final : x)) }), {
        tabel: "permintaan",
        aksi: "update",
        ringkasan: `Menandai selesai ${p.jenis === "setor" ? "setoran" : "penarikan"} ${nama(p.anggotaId)} ${usd(q.jumlahFinalUsd)}, efektif ${tanggal(q.tanggalEfektif)}.`,
        nilaiLama: "menunggu",
        nilaiBaru: "selesai",
      });
      return { ok: true };
    },

    tolak(id, alasan) {
      if (offline) return offlineErr;
      if (saya?.peran !== "pengelola") return { ok: false, pesan: "Halaman ini khusus pengelola." };
      if (!alasan.trim()) return { ok: false, pesan: "Alasan penolakan wajib diisi.", field: "alasan" };
      const p = data.permintaan.find((x) => x.id === id);
      if (!p || p.status !== "menunggu") return { ok: false, pesan: "Permintaan ini sudah diproses." };
      ubah(
        (d) => ({
          ...d,
          permintaan: d.permintaan.map((x) =>
            x.id === id ? { ...x, status: "ditolak", alasan: alasan.trim(), diprosesOleh: saya.id, diprosesPada: kini() } : x,
          ),
        }),
        {
          tabel: "permintaan",
          aksi: "update",
          ringkasan: `Menolak ${p.jenis === "setor" ? "setoran" : "penarikan"} ${nama(p.anggotaId)} ${usd(p.jumlahUsd)}: ${alasan.trim()}`,
          nilaiLama: "menunggu",
          nilaiBaru: "ditolak",
        },
      );
      return { ok: true };
    },

    simpanSnapshot(s, ubahLama) {
      if (offline) return offlineErr;
      if (saya?.peran !== "pengelola") return { ok: false, pesan: "Halaman ini khusus pengelola." };
      const ada = data.snapshots.find((x) => x.tanggal === s.tanggal);
      if (!ubahLama && ada) {
        return { ok: false, pesan: `Saldo untuk ${tanggal(s.tanggal)} sudah ada. Ubah data yang ada atau pilih tanggal lain.`, field: "tanggal" };
      }
      // AC-02-02: snapshot otomatis yang diubah menjadi `koreksi`, alasan wajib
      const jadiKoreksi = ubahLama && ada && (ada.sumber === "otomatis" || ada.sumber === "koreksi");
      if (jadiKoreksi && !s.alasan?.trim()) return { ok: false, pesan: "Alasan koreksi wajib diisi.", field: "alasan" };
      const rec: Snapshot = ubahLama && ada
        ? { ...ada, ...s, sumber: jadiKoreksi ? "koreksi" : ada.sumber, alasan: s.alasan?.trim() || ada.alasan, diubahPada: kini() }
        : { ...s, sumber: "manual", dibuatOleh: saya.id, dibuatPada: kini() };
      ubah(
        (d) => ({ ...d, snapshots: ubahLama ? d.snapshots.map((x) => (x.tanggal === s.tanggal ? rec : x)) : [...d.snapshots, rec] }),
        {
          tabel: "snapshot",
          aksi: ubahLama ? "update" : "insert",
          ringkasan: ubahLama
            ? `${jadiKoreksi ? "Mengoreksi snapshot otomatis" : "Mengubah saldo"} ${tanggal(s.tanggal)}${jadiKoreksi ? `: ${s.alasan!.trim()}` : ""}. Semua angka sesudahnya dihitung ulang.`
            : `Mencatat snapshot manual ${tanggal(s.tanggal)}: ${usd(s.nilaiUsd)}, ${s.saldoSol.toLocaleString("id-ID", { maximumFractionDigits: 6 })} SOL.`,
          nilaiLama: ada ? `${usd(ada.nilaiUsd)} · ${ada.saldoSol} SOL` : undefined,
          nilaiBaru: `${usd(s.nilaiUsd)} · ${s.saldoSol} SOL`,
        },
      );
      return { ok: true };
    },

    hapusSnapshot(tgl) {
      if (offline) return offlineErr;
      if (data.permintaan.some((p) => p.status === "selesai" && p.tanggalEfektif === tgl)) {
        return { ok: false, pesan: `Saldo ${tanggal(tgl)} dipakai sebagai tanggal efektif transaksi, jadi hanya bisa diubah.` };
      }
      const ada = data.snapshots.find((x) => x.tanggal === tgl);
      ubah((d) => ({ ...d, snapshots: d.snapshots.filter((x) => x.tanggal !== tgl) }), {
        tabel: "snapshot",
        aksi: "delete",
        ringkasan: `Menghapus saldo ${tanggal(tgl)}.`,
        nilaiLama: ada ? `${usd(ada.nilaiUsd)} · ${ada.saldoSol} SOL` : undefined,
      });
      return { ok: true };
    },

    tambahAnggota(a) {
      if (offline) return offlineErr;
      const nm = a.nama.trim();
      const em = a.email.trim().toLowerCase();
      if (nm.length < 2 || nm.length > 40) return { ok: false, pesan: "Nama harus 2 sampai 40 karakter.", field: "nama" };
      if (data.anggota.some((x) => x.nama.toLowerCase() === nm.toLowerCase())) {
        return { ok: false, pesan: "Nama ini sudah dipakai anggota lain.", field: "nama" };
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) return { ok: false, pesan: "Tulis email Google yang valid.", field: "email" };
      if (data.anggota.some((x) => x.email === em)) return { ok: false, pesan: "Email ini sudah dipakai anggota lain.", field: "email" };
      const alamat = (a.alamatWallet ?? []).map((x) => x.trim()).filter(Boolean);
      if (alamat.some((x) => !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(x))) {
        return { ok: false, pesan: "Alamat wallet Solana harus 32-44 karakter (huruf dan angka base58).", field: "alamat" };
      }
      const baru: Anggota = { id: idBaru("a"), nama: nm, email: em, peran: a.peran, aktif: true, alamatWallet: alamat.length ? alamat : undefined, dibuatPada: kini() };
      ubah((d) => ({ ...d, anggota: [...d.anggota, baru] }), {
        tabel: "anggota",
        aksi: "insert",
        ringkasan: `Menambah anggota ${nm} (${a.peran}).`,
      });
      return { ok: true };
    },

    setAktif(id, aktif) {
      if (offline) return offlineErr;
      const pos = hasil.posisi.find((p) => p.id === id);
      const nm = nama(id);
      if (!aktif && pos && pos.unit > 1e-9) {
        return { ok: false, pesan: `${nm} masih punya dana ${usd(pos.netUsd)}. Tarik semua dulu sebelum menonaktifkan.` };
      }
      ubah((d) => ({ ...d, anggota: d.anggota.map((x) => (x.id === id ? { ...x, aktif } : x)) }), {
        tabel: "anggota",
        aksi: "update",
        ringkasan: `${aktif ? "Mengaktifkan" : "Menonaktifkan"} anggota ${nm}.`,
      });
      return { ok: true };
    },

    ubahPeran(id, peran) {
      if (offline) return offlineErr;
      ubah((d) => ({ ...d, anggota: d.anggota.map((x) => (x.id === id ? { ...x, peran } : x)) }), {
        tabel: "anggota",
        aksi: "update",
        ringkasan: `Mengubah peran ${nama(id)} menjadi ${peran}.`,
      });
      return { ok: true };
    },

    ubahPengaturan(p) {
      if (offline) return offlineErr;
      const lama = data.pengaturan;
      const beda = (Object.keys(p) as (keyof Pengaturan)[]).filter((k) => p[k] !== lama[k]);
      if (!beda.length) return { ok: true };
      ubah((d) => ({ ...d, pengaturan: { ...d.pengaturan, ...p } }), {
        tabel: "pengaturan",
        aksi: "update",
        ringkasan: `Mengubah pengaturan pool: ${beda.join(", ")}. Semua angka dihitung ulang.`,
        nilaiLama: beda.map((k) => `${k}=${lama[k]}`).join(", "),
        nilaiBaru: beda.map((k) => `${k}=${p[k]}`).join(", "),
      });
      return { ok: true };
    },

    batalkanImpor() {
      if (data.permintaan.some((p) => p.sumber === "app" && p.status === "selesai")) {
        return { ok: false, pesan: "Impor tidak bisa dibatalkan karena sudah ada transaksi baru yang diproses lewat app." };
      }
      ubah((d) => ({ ...d, snapshots: d.snapshots.filter((x) => x.sumber !== "impor"), permintaan: d.permintaan.filter((p) => p.sumber !== "impor") }), {
        tabel: "impor",
        aksi: "delete",
        ringkasan: "Membatalkan impor riwayat. Semua data impor dihapus.",
      });
      return { ok: true };
    },

    impor(snaps, transaksi, est) {
      if (offline) return offlineErr;
      if (data.snapshots.some((x) => x.sumber === "impor") || data.permintaan.some((p) => p.status === "selesai")) {
        return { ok: false, pesan: "Pool sudah punya data. Batalkan impor yang lama dulu." };
      }
      const tgl = new Set(snaps.map((x) => x.tanggal));
      ubah(
        (d) => ({
          ...d,
          snapshots: [...snaps, ...d.snapshots.filter((x) => !tgl.has(x.tanggal))],
          permintaan: [...transaksi, ...d.permintaan],
          estimasi: est,
        }),
        {
          tabel: "impor",
          aksi: "insert",
          ringkasan: `Mengimpor riwayat: ${snaps.length} saldo harian dan ${transaksi.length} transaksi${est ? ", dengan titik estimasi per jam" : ", tanpa titik estimasi"}.`,
        },
      );
      return { ok: true };
    },

    buatUlangEstimasi() {
      if (offline) return offlineErr;
      if (saya?.peran !== "pengelola") return { ok: false, pesan: "Halaman ini khusus pengelola." };
      ubah((d) => ({ ...d, estimasi: true }), {
        tabel: "impor",
        aksi: "update",
        ringkasan: "Membuat ulang titik estimasi per jam dari harga SOL pasar (BR-24).",
      });
      return { ok: true };
    },
  };

  return <C.Provider value={ctx}>{children}</C.Provider>;
}

export function useStore(): Ctx {
  const c = useContext(C);
  if (!c) throw new Error("useStore harus dipakai di dalam StoreProvider");
  return c;
}
