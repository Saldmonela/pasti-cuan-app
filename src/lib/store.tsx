"use client";
// Store aplikasi Pasti Cuan: otomatis memakai Supabase + API Route Handlers di server/production,
// dan fallback ke data contoh localStorage khusus saat build preview statis (`NEXT_PUBLIC_PROTOTYPE_MODE=1`).
import { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { hitungPool, seriRentang, terapkanLive, type HasilPool, type Seri } from "./engine";
import { isSolanaAddress, selisihHari, tambahHari, tanggal, usd, waktu, wibIso } from "./format";
import { isoWib, MENIT, ms, msSnapshot, MULAI_BACA, semuaTitik, titikEstimasi, type TitikNilai } from "./onchain";
import { dataAwal, snapshotOtomatis, WAKTU_AWAL } from "./seed";
import { createSupabaseBrowserClient } from "./supabase/client";
import type { Anggota, ArusOnchain, DataPool, Jenis, LogAudit, ModeSatuan, Pengaturan, Peran, Permintaan, Rentang, Satuan, Snapshot } from "./types";

export const IS_PROTOTYPE =
  process.env.NEXT_PUBLIC_PROTOTYPE_MODE === "1" || !process.env.NEXT_PUBLIC_SUPABASE_URL;

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

export const LOMPATAN = [
  { id: "berhasil", ke: "2026-11-16T08:00:00+07:00", label: "16 Nov 2026, 08.00 WIB", ket: "Snapshot otomatis dibuat" },
  { id: "gagal", ke: "2026-11-16T08:31:00+07:00", label: "16 Nov 2026, 08.31 WIB", ket: "Pembacaan 08.00-08.30 gagal" },
] as const;

/** Waktu efektif transfer onchain (BR-18, update 17 Nov 2026 = waktu transfer). */
export function tanggalEfektifArus(waktuArus: string, jam = "08:00"): string {
  const tgl = wibIso(waktuArus).slice(0, 10);
  return ms(waktuArus) < msSnapshot(tgl, jam) ? tgl : tambahHari(tgl, 1);
}

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

export type Hasil<T = undefined> = { ok: true; nilai?: T } | { ok: false; pesan: string; field?: string };

interface Toast {
  id: number;
  pesan: string;
}

interface Ctx {
  isPrototype: boolean;
  siap: boolean;
  data: DataPool;
  hasil: HasilPool;
  resmi: HasilPool;
  sekarang: number;
  titik: TitikNilai[];
  titikAkhir: TitikNilai | null;
  lamaLiveMenit: number;
  arus: ArusOnchain[];
  arusBelum: ArusOnchain[];
  arusBelumCount: number;
  versiData: string;
  seri: (r: Rentang, anggotaId?: string | null) => Seri;
  majukanWaktu: (id: (typeof LOMPATAN)[number]["id"]) => void;
  tandaiArus: (ids: string[], a: AksiArus) => Promise<Hasil<string>>;
  batalTandai: (id: string) => Promise<Hasil>;
  saya: Anggota | null;
  skenario: Skenario;
  hariIni: string;
  dataLama: boolean;
  cekGagal: boolean;
  offline: boolean;
  satuan: Satuan;
  mode: ModeSatuan;
  toast: Toast | null;
  menunggu: Permintaan[];
  setMode: (m: ModeSatuan) => void;
  setSkenario: (s: Skenario) => void;
  masuk: (id: string) => void;
  keluar: () => Promise<void>;
  reset: () => void;
  refresh: () => Promise<void>;
  tampilkan: (pesan: string) => void;
  tutupToast: () => void;
  nama: (id: string) => string;
  ajukan: (p: { jenis: Jenis; jumlahUsd: number; tanggalTransfer?: string; buktiTransaksi?: string; alamatWalletTujuan?: string; catatan?: string }) => Promise<Hasil>;
  batalkan: (id: string) => Promise<Hasil>;
  selesaikan: (id: string, p: { tanggalEfektif: string; jumlahFinalUsd: number; buktiTransaksi?: string; alasan?: string }) => Promise<Hasil>;
  tolak: (id: string, alasan: string) => Promise<Hasil>;
  simpanSnapshot: (s: Omit<Snapshot, "dibuatOleh" | "dibuatPada" | "diubahPada" | "sumber">, ubah: boolean) => Promise<Hasil>;
  hapusSnapshot: (tgl: string) => Promise<Hasil>;
  tambahAnggota: (a: { nama: string; email: string; peran: Peran; alamatWallet?: string[] }) => Promise<Hasil>;
  setAktif: (id: string, aktif: boolean) => Promise<Hasil>;
  ubahPeran: (id: string, peran: Peran) => Promise<Hasil>;
  ubahWalletAnggota: (id: string, alamatWallet: string[]) => Promise<Hasil>;
  ubahPengaturan: (p: Partial<Pengaturan>) => Promise<Hasil>;
  batalkanImpor: () => Promise<Hasil>;
  impor: (snapshots: Snapshot[], transaksi: Permintaan[], estimasi: boolean) => Promise<Hasil>;
  buatUlangEstimasi: () => Promise<Hasil>;
}

const C = createContext<Ctx | null>(null);
const KUNCI_PROTO = "pasti-cuan-prototype-v3";
const KUNCI_CACHE = "pasti-cuan-live-cache-v1";
const KUNCI_MODE = "pasti-cuan-satuan-mode";

interface Simpanan {
  data: DataPool;
  userId: string | null;
  skenario: Skenario;
  satuan: ModeSatuan;
  waktuDasar: string;
  celah: [number, number] | null;
}

let seq = 0;
const idBaru = (p: string) => `${p}${Date.now().toString(36)}${(seq++).toString(36)}`;

const AWAL: Simpanan = { data: dataAwal(), userId: "salman", skenario: "normal", satuan: "USD", waktuDasar: WAKTU_AWAL, celah: null };
let isi: Simpanan | null = null;
const pendengar = new Set<() => void>();

function baca(): Simpanan {
  if (isi) return isi;
  isi = AWAL;
  try {
    const raw = localStorage.getItem(KUNCI_PROTO);
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
    /* ignore */
  }
  return isi;
}
function tulis(f: (s: Simpanan) => Simpanan) {
  isi = f(baca());
  try {
    localStorage.setItem(KUNCI_PROTO, JSON.stringify(isi));
  } catch {
    /* ignore */
  }
  pendengar.forEach((l) => l());
}
function dengar(l: () => void) {
  pendengar.add(l);
  return () => pendengar.delete(l);
}
const tanpaLangganan = () => () => {};

interface LiveSnapshotPayload {
  saya: Anggota | null;
  versi_data: string;
  sekarang: number;
  data: DataPool;
  titik: TitikNilai[];
  arusBelumCount: number;
}

const EMPTY_POOL: DataPool = {
  anggota: [],
  snapshots: [],
  permintaan: [],
  arus: [],
  estimasi: false,
  log: [],
  pengaturan: AWAL.data.pengaturan,
};

async function apiJson<T = Record<string, unknown>>(
  url: string,
  method: string,
  body?: unknown,
): Promise<{ ok: true; data: T } | { ok: false; pesan: string; field?: string }> {
  try {
    const res = await fetch(url, {
      method,
      headers: body !== undefined ? { "content-type": "application/json" } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (res.status === 204) return { ok: true, data: {} as T };
    const json = (await res.json().catch(() => ({}))) as {
      pesan?: string;
      detail?: Record<string, string>;
    } & T;
    if (!res.ok) {
      const firstField = json.detail ? Object.keys(json.detail)[0] : undefined;
      return { ok: false, pesan: json.pesan ?? `Gagal (${res.status}).`, field: firstField };
    }
    return { ok: true, data: json };
  } catch {
    return { ok: false, pesan: "Koneksi gagal. Cek internet kamu lalu coba lagi." };
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const browserReady = useSyncExternalStore(tanpaLangganan, () => true, () => false);
  const proto = useSyncExternalStore(dengar, baca, () => AWAL);
  const [toast, setToast] = useState<Toast | null>(null);
  const [menit, setMenit] = useState(0);

  // State khusus mode Live Supabase
  const [liveState, setLiveState] = useState<LiveSnapshotPayload | null>(null);
  const [liveReady, setLiveReady] = useState(false);
  const [liveLoadErr, setLiveLoadErr] = useState(false);
  const [isOfflineNet, setIsOfflineNet] = useState(false);
  const [fallbackNow] = useState(() => ms(WAKTU_AWAL));
  const [liveMode, setLiveMode] = useState<ModeSatuan>(() => {
    if (typeof window === "undefined") return "USD";
    const saved = window.localStorage.getItem(KUNCI_MODE);
    return saved === "SOL" || saved === "Bandingkan" ? saved : "USD";
  });

  const refreshLive = useCallback(async () => {
    if (IS_PROTOTYPE) return;
    try {
      const res = await fetch("/api/posisi", { cache: "no-store" });
      if (res.status === 401 || res.status === 403) {
        setLiveState(null);
        setLiveLoadErr(false);
        setLiveReady(true);
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const payload = (await res.json()) as LiveSnapshotPayload;
      setLiveState(payload);
      setLiveLoadErr(false);
      setIsOfflineNet(false);
      setLiveReady(true);
      try {
        localStorage.setItem(KUNCI_CACHE, JSON.stringify(payload));
      } catch {
        /* ignore */
      }
    } catch {
      try {
        const cached = localStorage.getItem(KUNCI_CACHE);
        if (cached) {
          setLiveState(JSON.parse(cached) as LiveSnapshotPayload);
        } else {
          setLiveLoadErr(true);
        }
      } catch {
        setLiveLoadErr(true);
      }
      setIsOfflineNet(typeof navigator !== "undefined" ? !navigator.onLine : false);
      setLiveReady(true);
    }
  }, []);

  useEffect(() => {
    if (IS_PROTOTYPE) {
      const id = setInterval(() => {
        if (document.visibilityState === "visible") setMenit((m) => m + 1);
      }, 60_000);
      return () => clearInterval(id);
    }

    const initId = setTimeout(() => {
      void refreshLive();
    }, 0);
    const id = setInterval(() => {
      if (document.visibilityState === "visible") void refreshLive();
    }, 60_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") void refreshLive();
    };
    const onNet = () => {
      setIsOfflineNet(!navigator.onLine);
      if (navigator.onLine) void refreshLive();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onNet);
    window.addEventListener("offline", onNet);
    return () => {
      clearTimeout(initId);
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onNet);
      window.removeEventListener("offline", onNet);
    };
  }, [refreshLive]);

  const setData = (f: (d: DataPool) => DataPool) => tulis((s) => ({ ...s, data: f(s.data) }));
  const setUserId = (id: string | null) => tulis((s) => ({ ...s, userId: id }));
  const setSkenarioState = (k: Skenario) => tulis((s) => ({ ...s, skenario: k }));
  const setModeState = (m: ModeSatuan) => {
    if (IS_PROTOTYPE) {
      tulis((s) => ({ ...s, satuan: m }));
    } else {
      setLiveMode(m);
      try {
        localStorage.setItem(KUNCI_MODE, m);
      } catch {
        /* ignore */
      }
    }
  };

  const data = IS_PROTOTYPE ? proto.data : (liveState?.data ?? EMPTY_POOL);
  const satuan = IS_PROTOTYPE ? proto.satuan : liveMode;
  const skenario: Skenario = IS_PROTOTYPE
    ? proto.skenario
    : !liveReady
      ? "memuat"
      : liveLoadErr
        ? "gagal"
        : isOfflineNet
          ? "offline"
          : "normal";

  const sekarang = IS_PROTOTYPE ? ms(proto.waktuDasar) + menit * MENIT : (liveState?.sekarang ?? fallbackNow);
  const gagalMenit = IS_PROTOTYPE ? (skenario === "liveLama" ? 20 : skenario === "walletTerganggu" ? 75 : 0) : 0;

  const estimasiProto = useMemo(
    () =>
      IS_PROTOTYPE && data.estimasi
        ? titikEstimasi(
            data.snapshots.filter((x) => x.sumber === "impor"),
            data.permintaan,
            MULAI_BACA,
            data.pengaturan.jamSnapshot,
          )
        : [],
    [data.estimasi, data.snapshots, data.permintaan, data.pengaturan.jamSnapshot],
  );

  const titik = useMemo(() => {
    if (!IS_PROTOTYPE) return liveState?.titik ?? [];
    const batas = sekarang - gagalMenit * MENIT;
    const asli = semuaTitik().filter(
      (t) => t.ms <= (gagalMenit ? batas : sekarang) && !(proto.celah && t.ms >= proto.celah[0] && t.ms <= proto.celah[1]),
    );
    return [...estimasiProto.filter((t) => t.ms < MULAI_BACA), ...asli];
  }, [liveState?.titik, sekarang, gagalMenit, proto.celah, estimasiProto]);

  const titikAkhir = titik.length && !titik[titik.length - 1].estimasi ? titik[titik.length - 1] : null;
  const arus = useMemo(
    () => (IS_PROTOTYPE ? data.arus.filter((a) => ms(a.waktu) <= sekarang) : data.arus),
    [data.arus, sekarang],
  );
  const resmi = useMemo(
    () => hitungPool(data.anggota, data.snapshots, data.permintaan, data.pengaturan, arus, titik),
    [data.anggota, data.snapshots, data.permintaan, data.pengaturan, arus, titik],
  );
  const hasil = useMemo(
    () => terapkanLive(resmi, data.anggota, data.snapshots, arus, titik, sekarang, data.pengaturan),
    [resmi, data.anggota, data.snapshots, arus, titik, sekarang, data.pengaturan],
  );
  const lamaLiveMenit = titikAkhir ? Math.floor((sekarang - titikAkhir.ms) / MENIT) : Infinity;
  const arusBelum = arus.filter((a) => a.status === "belum");
  const arusBelumCount = IS_PROTOTYPE ? arusBelum.length : (liveState?.arusBelumCount ?? 0);
  const saya = IS_PROTOTYPE ? (data.anggota.find((a) => a.id === proto.userId && a.aktif) ?? null) : (liveState?.saya ?? null);
  const hariIni =
    IS_PROTOTYPE && skenario === "dataLama" && hasil.tanggalData
      ? tambahHari(hasil.tanggalData, 3)
      : isoWib(sekarang).slice(0, 10);
  const dataLama = !!hasil.tanggalData && selisihHari(hasil.tanggalData, hariIni) > data.pengaturan.batasDataLamaHari;
  const cekGagal = (IS_PROTOTYPE && skenario === "cekGagal") || !hasil.cek.lolos;
  const offline = IS_PROTOTYPE ? skenario === "offline" : isOfflineNet;
  const menunggu = data.permintaan.filter((p) => p.status === "menunggu");
  const versiData = liveState?.versi_data ?? "";

  const nama = useCallback((id: string) => data.anggota.find((a) => a.id === id)?.nama ?? id, [data.anggota]);
  const tampilkan = useCallback((pesan: string) => setToast({ id: Date.now(), pesan }), []);
  const kini = () => isoWib(sekarang);

  function ubah(f: (d: DataPool) => DataPool, log?: Omit<LogAudit, "id" | "pada" | "oleh">) {
    setData((d) => {
      const baru = f(d);
      return log ? { ...baru, log: [{ ...log, id: idBaru("l"), pada: kini(), oleh: proto.userId ?? "sistem" }, ...baru.log] } : baru;
    });
  }

  const offlineErr: Hasil = { ok: false, pesan: "Kamu sedang offline. Form dinonaktifkan sampai koneksi kembali." };

  const ctx: Ctx = {
    isPrototype: IS_PROTOTYPE,
    siap: IS_PROTOTYPE ? browserReady : liveReady,
    data,
    hasil,
    resmi,
    sekarang,
    titik,
    titikAkhir,
    lamaLiveMenit,
    arus,
    arusBelum,
    arusBelumCount,
    versiData,
    seri: (r, anggotaId = null) =>
      seriRentang({ h: resmi, anggota: data.anggota, snaps: data.snapshots, permintaan: data.permintaan, arus, titik, sekarang, set: data.pengaturan }, r, anggotaId),

    majukanWaktu(id) {
      if (!IS_PROTOTYPE) return;
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

    async tandaiArus(ids, a) {
      if (offline) return offlineErr;
      if (!IS_PROTOTYPE) {
        const res = await apiJson<{ pesan?: string }>("/api/arus-onchain/tandai", "POST", {
          ids,
          status: a.status,
          permintaan_id: a.status === "dicocokkan" ? a.permintaanId : undefined,
          anggota_id: a.status === "buat" ? a.anggotaId : undefined,
          catatan: a.status === "biaya" || a.status === "bukan_arus" ? a.catatan : undefined,
          alasan_selisih: a.status === "dicocokkan" || a.status === "buat" ? a.alasanSelisih : undefined,
        });
        if (!res.ok) return res;
        await refreshLive();
        return { ok: true, nilai: res.data.pesan };
      }

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
          { tabel: "arus", aksi: "update", ringkasan: `Menandai transfer ${kapan} ${usd(total)} sebagai ${a.status === "biaya" ? "biaya pool" : "bukan arus"}: ${c}`, nilaiLama: "belum", nilaiBaru: a.status },
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
          return { ok: false, pesan: `Jumlah transfer ${usd(total)} berbeda dari permintaan ${usd(ada.jumlahUsd)}. Isi alasan untuk melanjutkan.`, field: "alasan" };
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
          tanggalTransfer: wibIso(pilih[0].waktu).slice(0, 10),
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
          arus: d.arus.map((x) => (ids.includes(x.id) ? { ...x, status: "dicocokkan", permintaanId: p.id, alasanSelisih, ...ditandai } : x)),
        }),
        { tabel: "arus", aksi: "update", ringkasan: `${a.status === "buat" ? "Membuat permintaan dan mencocokkan" : "Mencocokkan"} transfer ${kapan} (${usd(total)}) dengan ${label}.`, nilaiLama: "belum", nilaiBaru: "dicocokkan" },
      );
      return { ok: true, nilai: `Transfer ${kapan} dicocokkan dengan ${label}.` };
    },

    async batalTandai(id) {
      if (offline) return offlineErr;
      if (!IS_PROTOTYPE) {
        const res = await apiJson(`/api/arus-onchain/tandai?id=${encodeURIComponent(id)}`, "DELETE");
        if (!res.ok) return res;
        await refreshLive();
        return { ok: true };
      }
      if (saya?.peran !== "pengelola") return { ok: false, pesan: "Halaman ini khusus pengelola." };
      const x = data.arus.find((a) => a.id === id);
      if (!x || x.status === "belum") return { ok: false, pesan: "Transfer ini belum ditandai." };
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
    async keluar() {
      if (IS_PROTOTYPE) {
        setUserId(null);
        return;
      }
      const sb = createSupabaseBrowserClient();
      if (sb) await sb.auth.signOut();
      setLiveState(null);
      try {
        localStorage.removeItem(KUNCI_CACHE);
      } catch {
        /* ignore */
      }
    },
    reset: () => {
      if (!IS_PROTOTYPE) return;
      setMenit(0);
      tulis((st) => ({ ...st, data: dataAwal(), skenario: "normal", waktuDasar: WAKTU_AWAL, celah: null }));
      tampilkan("Data contoh dikembalikan ke kondisi awal.");
    },
    refresh: refreshLive,
    tampilkan,
    tutupToast: () => setToast(null),
    nama,

    async ajukan(p) {
      if (offline) return offlineErr;
      if (!IS_PROTOTYPE) {
        const res = await apiJson("/api/permintaan", "POST", {
          jenis: p.jenis,
          jumlah_usd: p.jumlahUsd,
          tanggal_transfer: p.tanggalTransfer,
          bukti_transaksi: p.buktiTransaksi,
          alamat_wallet_tujuan: p.alamatWalletTujuan,
          catatan: p.catatan,
          versi_data: p.jenis === "tarik" ? versiData : undefined,
        });
        if (!res.ok) return res;
        await refreshLive();
        return { ok: true };
      }

      if (!saya) return { ok: false, pesan: "Sesi kamu berakhir. Silakan masuk lagi." };
      if (!(p.jumlahUsd > 0)) return { ok: false, pesan: "Jumlah harus lebih dari 0.", field: "jumlah" };
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

    async batalkan(id) {
      if (offline) return offlineErr;
      if (!IS_PROTOTYPE) {
        const res = await apiJson(`/api/permintaan/${id}/batal`, "POST");
        if (!res.ok) return res;
        await refreshLive();
        return { ok: true };
      }
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

    async selesaikan(id, q) {
      if (offline) return offlineErr;
      if (!IS_PROTOTYPE) {
        const res = await apiJson(`/api/permintaan/${id}/selesai`, "POST", {
          tanggal_efektif: q.tanggalEfektif,
          jumlah_final_usd: q.jumlahFinalUsd,
          bukti_transaksi: q.buktiTransaksi,
          alasan: q.alasan,
        });
        if (!res.ok) return res;
        await refreshLive();
        return { ok: true };
      }
      if (saya?.peran !== "pengelola") return { ok: false, pesan: "Halaman ini khusus pengelola." };
      const p = data.permintaan.find((x) => x.id === id);
      if (!p || p.status !== "menunggu") return { ok: false, pesan: "Permintaan ini sudah diproses." };
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

    async tolak(id, alasan) {
      if (offline) return offlineErr;
      if (!IS_PROTOTYPE) {
        const res = await apiJson(`/api/permintaan/${id}/tolak`, "POST", { alasan });
        if (!res.ok) return res;
        await refreshLive();
        return { ok: true };
      }
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
        { tabel: "permintaan", aksi: "update", ringkasan: `Menolak ${p.jenis === "setor" ? "setoran" : "penarikan"} ${nama(p.anggotaId)} ${usd(p.jumlahUsd)}: ${alasan.trim()}`, nilaiLama: "menunggu", nilaiBaru: "ditolak" },
      );
      return { ok: true };
    },

    async simpanSnapshot(s, ubahLama) {
      if (offline) return offlineErr;
      if (!IS_PROTOTYPE) {
        const res = ubahLama
          ? await apiJson(`/api/snapshot/${s.tanggal}`, "PATCH", {
              nilai_usd: s.nilaiUsd,
              saldo_sol: s.saldoSol,
              fee_lp_diklaim_sol: s.feeLpDiklaimSol,
              catatan: s.catatan,
              alasan: s.alasan,
              konfirmasi_hitung_ulang: true,
            })
          : await apiJson("/api/snapshot", "POST", {
              tanggal: s.tanggal,
              nilai_usd: s.nilaiUsd,
              saldo_sol: s.saldoSol,
              fee_lp_diklaim_sol: s.feeLpDiklaimSol,
              catatan: s.catatan,
            });
        if (!res.ok) return res;
        await refreshLive();
        return { ok: true };
      }
      if (saya?.peran !== "pengelola") return { ok: false, pesan: "Halaman ini khusus pengelola." };
      const ada = data.snapshots.find((x) => x.tanggal === s.tanggal);
      if (!ubahLama && ada) {
        return { ok: false, pesan: `Saldo untuk ${tanggal(s.tanggal)} sudah ada. Ubah data yang ada atau pilih tanggal lain.`, field: "tanggal" };
      }
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

    async hapusSnapshot(tgl) {
      if (offline) return offlineErr;
      if (!IS_PROTOTYPE) {
        const res = await apiJson(`/api/snapshot/${tgl}`, "DELETE");
        if (!res.ok) return res;
        await refreshLive();
        return { ok: true };
      }
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

    async tambahAnggota(a) {
      if (offline) return offlineErr;
      if (!IS_PROTOTYPE) {
        const res = await apiJson("/api/anggota", "POST", {
          nama: a.nama,
          email: a.email,
          peran: a.peran,
          alamat_wallet: a.alamatWallet,
        });
        if (!res.ok) return res;
        await refreshLive();
        return { ok: true };
      }
      const nm = a.nama.trim();
      const em = a.email.trim().toLowerCase();
      if (nm.length < 2 || nm.length > 40) return { ok: false, pesan: "Nama harus 2 sampai 40 karakter.", field: "nama" };
      if (data.anggota.some((x) => x.nama.toLowerCase() === nm.toLowerCase())) {
        return { ok: false, pesan: "Nama ini sudah dipakai anggota lain.", field: "nama" };
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) return { ok: false, pesan: "Tulis email Google yang valid.", field: "email" };
      if (data.anggota.some((x) => x.email === em)) return { ok: false, pesan: "Email ini sudah dipakai anggota lain.", field: "email" };
      const alamat = (a.alamatWallet ?? []).map((x) => x.trim()).filter(Boolean);
      if (alamat.some((x) => !isSolanaAddress(x))) {
        return { ok: false, pesan: "Alamat wallet Solana harus 32-44 karakter (huruf dan angka base58).", field: "alamat" };
      }
      const baru: Anggota = { id: idBaru("a"), nama: nm, email: em, peran: a.peran, aktif: true, alamatWallet: alamat.length ? alamat : undefined, dibuatPada: kini() };
      ubah((d) => ({ ...d, anggota: [...d.anggota, baru] }), { tabel: "anggota", aksi: "insert", ringkasan: `Menambah anggota ${nm} (${a.peran}).` });
      return { ok: true };
    },

    async setAktif(id, aktif) {
      if (offline) return offlineErr;
      if (!IS_PROTOTYPE) {
        const res = await apiJson(`/api/anggota/${id}`, "PATCH", { aktif });
        if (!res.ok) return res;
        await refreshLive();
        return { ok: true };
      }
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

    async ubahPeran(id, peran) {
      if (offline) return offlineErr;
      if (!IS_PROTOTYPE) {
        const res = await apiJson(`/api/anggota/${id}`, "PATCH", { peran });
        if (!res.ok) return res;
        await refreshLive();
        return { ok: true };
      }
      ubah((d) => ({ ...d, anggota: d.anggota.map((x) => (x.id === id ? { ...x, peran } : x)) }), {
        tabel: "anggota",
        aksi: "update",
        ringkasan: `Mengubah peran ${nama(id)} menjadi ${peran}.`,
      });
      return { ok: true };
    },

    async ubahWalletAnggota(id, alamatWallet) {
      if (offline) return offlineErr;
      const cleaned = [...new Set(alamatWallet.map((x) => x.trim()).filter(Boolean))];
      if (cleaned.some((x) => !isSolanaAddress(x))) {
        return { ok: false, pesan: "Alamat wallet Solana harus 32–44 karakter (huruf dan angka base58).", field: "alamat" };
      }
      if (!IS_PROTOTYPE) {
        const res = await apiJson(`/api/anggota/${id}`, "PATCH", { alamat_wallet: cleaned });
        if (!res.ok) return res;
        await refreshLive();
        return { ok: true };
      }
      ubah(
        (d) => ({
          ...d,
          anggota: d.anggota.map((x) => (x.id === id ? { ...x, alamatWallet: cleaned.length ? cleaned : undefined } : x)),
        }),
        { tabel: "anggota", aksi: "update", ringkasan: `Memperbarui alamat wallet ${nama(id)}.` },
      );
      return { ok: true };
    },

    async ubahPengaturan(p) {
      if (offline) return offlineErr;
      if (!IS_PROTOTYPE) {
        const res = await apiJson("/api/pengaturan", "PATCH", {
          fee_persen: p.feePersen,
          satuan_dasar_fee: p.satuanDasarFee,
          batas_data_lama_hari: p.batasDataLamaHari,
          ambang_lonjakan_persen: p.ambangLonjakanPersen,
          ambang_likuiditas_token_usd: p.ambangLikuiditasTokenUsd,
          ambang_dust_usd: p.ambangDustUsd,
          batas_live_lama_menit: p.batasLiveLamaMenit,
          toleransi_cocok_persen: p.toleransiCocokPersen,
        });
        if (!res.ok) return res;
        await refreshLive();
        return { ok: true };
      }
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

    async batalkanImpor() {
      if (!IS_PROTOTYPE) {
        const res = await apiJson("/api/impor", "DELETE");
        if (!res.ok) return res;
        await refreshLive();
        return { ok: true };
      }
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

    async impor(snaps, transaksi, est) {
      if (offline) return offlineErr;
      if (!IS_PROTOTYPE) {
        const res = await apiJson("/api/impor", "POST", { snapshots: snaps, transaksi, estimasi: est });
        if (!res.ok) return res;
        await refreshLive();
        return { ok: true };
      }
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
        { tabel: "impor", aksi: "insert", ringkasan: `Mengimpor riwayat: ${snaps.length} saldo harian dan ${transaksi.length} transaksi${est ? ", dengan titik estimasi per jam" : ", tanpa titik estimasi"}.` },
      );
      return { ok: true };
    },

    async buatUlangEstimasi() {
      if (offline) return offlineErr;
      if (!IS_PROTOTYPE) {
        const res = await apiJson("/api/impor/estimasi", "POST");
        if (!res.ok) return res;
        await refreshLive();
        return { ok: true };
      }
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
