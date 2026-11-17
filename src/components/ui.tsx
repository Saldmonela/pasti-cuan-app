// Komponen bersama. Hanya dipakai dari client component (halaman memakai "use client").
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";
import {
  IconAlertTriangle,
  IconChevronLeft,
  IconCircleCheck,
  IconExclamationCircle,
  IconRefresh,
  IconWifiOff,
} from "@tabler/icons-react";
import { useStore } from "@/lib/store";
import { jam, selisihHari, tanggal, waktu } from "@/lib/format";
import type { Status } from "@/lib/types";

// ---------- kontrol segmen ----------
export function Seg<T extends string>({ label, nilai, opsi, onChange }: { label: string; nilai: T; opsi: T[]; onChange: (v: T) => void }) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {opsi.map((o) => (
        <button key={o} type="button" aria-pressed={o === nilai} onClick={() => onChange(o)}>
          {o}
        </button>
      ))}
    </div>
  );
}

// ---------- header ----------

/** Waktu data (AC-01-01 angka 9): nilai live dan snapshot resmi. BR-20: keterangan bila nilai live lama. */
export function Stamp() {
  const { hasil, lamaLiveMenit, data } = useStore();
  if (!hasil.tanggalData) return <div className="stamp">Belum ada data saldo</div>;
  const resmi = `Snapshot resmi ${tanggal(hasil.tanggalData)}, ${data.pengaturan.jamSnapshot.replace(":", ".")} WIB`;
  if (!hasil.live) return <div className="stamp">Data per {tanggal(hasil.tanggalData)}, {data.pengaturan.jamSnapshot.replace(":", ".")} WIB</div>;
  const lama = lamaLiveMenit > data.pengaturan.batasLiveLamaMenit;
  return (
    <div className="stamp">
      {lama ? <span className="stale">Nilai terakhir diperbarui {jam(hasil.live.dibacaPada)} WIB</span> : `Nilai live per ${waktu(hasil.live.dibacaPada)}`}
      {" · "}
      {resmi}
    </div>
  );
}

export function Avatar() {
  const { saya } = useStore();
  return (
    <Link href="/lainnya" className="av" aria-label={`Akun ${saya?.nama ?? ""}`}>
      {saya?.nama.slice(0, 1).toUpperCase()}
    </Link>
  );
}

export function PageHeader({ judul, stamp = true }: { judul: string; stamp?: boolean }) {
  return (
    <header className="hd">
      <div>
        <h1>{judul}</h1>
        {stamp && <Stamp />}
      </div>
      <Avatar />
    </header>
  );
}

// Jumlah halaman yang sudah dibuka di dalam app sejak dimuat (diisi Shell).
let kunjungan = 0;
export function catatKunjungan() {
  kunjungan++;
}

/** Bar atas sub-halaman. Kembali ke halaman sebelumnya; kalau dibuka langsung dari link, ke halaman induk `ke`. */
export function BackBar({ judul, ke = "/" }: { judul: string; ke?: string }) {
  const router = useRouter();
  return (
    <header className="bar">
      <Link
        href={ke}
        className="back"
        aria-label="Kembali"
        onClick={(e) => {
          if (kunjungan > 1) {
            e.preventDefault();
            router.back();
          }
        }}
      >
        <IconChevronLeft size={22} aria-hidden="true" />
      </Link>
      <h1>{judul}</h1>
    </header>
  );
}

// ---------- banner status (BR-12, BR-15, PWA offline) ----------
export function StatusBanners() {
  const { offline, cekGagal, dataLama, hasil, resmi, hariIni, lamaLiveMenit } = useStore();
  const arusBelumCatat = resmi.cek.penyebab.find((p) => p.includes("transfer di wallet"));
  return (
    <>
      {offline && hasil.tanggalData && (
        <div className="banner dark" role="status">
          <IconWifiOff size={18} aria-hidden="true" />
          <p>Kamu sedang offline. Data terakhir {hasil.live ? waktu(hasil.live.dibacaPada) : `${tanggal(hasil.tanggalData)}, 08.00 WIB`}.</p>
        </div>
      )}
      {cekGagal && (
        <div className="banner warn" role="alert">
          <IconAlertTriangle size={18} aria-hidden="true" />
          <p>
            {arusBelumCatat ? (
              <b>{arusBelumCatat}</b>
            ) : (
              <>
                <b>Angka sedang dicek ulang oleh pengelola.</b> Jangan ajukan penarikan dulu.
              </>
            )}
          </p>
        </div>
      )}
      {!offline && hasil.tanggalData && lamaLiveMenit > 60 && (
        <div className="banner warn" role="status">
          <IconAlertTriangle size={18} aria-hidden="true" />
          <p>Pembacaan wallet sedang terganggu. Angka mungkin tertinggal.</p>
        </div>
      )}
      {dataLama && hasil.tanggalData && (
        <div className="banner warn" role="status">
          <IconAlertTriangle size={18} aria-hidden="true" />
          <p>
            Data terakhir diperbarui {selisihHari(hasil.tanggalData, hariIni)} hari lalu ({tanggal(hasil.tanggalData)}).
          </p>
        </div>
      )}
    </>
  );
}

// ---------- isian ----------
export function Field({
  id,
  label,
  opsional,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  opsional?: boolean;
  hint?: ReactNode;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="field">
      <label htmlFor={id}>
        <span>{label}</span>
        {opsional && <span className="opt">Opsional</span>}
      </label>
      {children}
      {error ? (
        <p className="ferr" id={`${id}-err`} role="alert">
          <IconExclamationCircle size={15} aria-hidden="true" />
          {error}
        </p>
      ) : (
        hint && (
          <p className="hint" id={`${id}-hint`}>
            {hint}
          </p>
        )
      )}
    </div>
  );
}

export function describedBy(id: string, error?: string, hint?: unknown) {
  return error ? `${id}-err` : hint ? `${id}-hint` : undefined;
}

// ---------- lembar konfirmasi ----------
export function Sheet({ buka, onTutup, judul, children }: { buka: boolean; onTutup: () => void; judul: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (buka && !d.open) d.showModal();
    if (!buka && d.open) d.close();
  }, [buka]);
  return (
    <dialog
      ref={ref}
      className="sheet"
      aria-label={judul}
      onClose={onTutup}
      onClick={(e) => e.target === ref.current && onTutup()}
    >
      {buka && (
        <div className="sheet-in">
          <div className="grip" aria-hidden="true" />
          <h2>{judul}</h2>
          {children}
        </div>
      )}
    </dialog>
  );
}

// ---------- status ----------
const LABEL_STATUS: Record<Status, string> = { menunggu: "Menunggu", selesai: "Selesai", ditolak: "Ditolak", dibatalkan: "Dibatalkan" };
export function StatusChip({ s }: { s: Status }) {
  return <span className={`chip ${s}`}>{LABEL_STATUS[s]}</span>;
}

// ---------- kerangka loading & error ----------
export function SkeletonCard({ tinggi = 120, baris = 3, besar = false }: { tinggi?: number; baris?: number; besar?: boolean }) {
  return (
    <div className="card" aria-hidden="true">
      <div className="sk" style={{ width: 90, height: 12 }} />
      {besar && <div className="sk" style={{ width: "62%", height: 40, marginTop: 10 }} />}
      {besar && <div className="sk" style={{ width: "48%", height: 12, marginTop: 10 }} />}
      {tinggi > 0 && <div className="sk" style={{ height: tinggi, marginTop: 20, borderRadius: 16 }} />}
      {Array.from({ length: baris }).map((_, k) => (
        <div key={k} className="sk" style={{ height: 12, marginTop: 14, width: `${80 - k * 12}%` }} />
      ))}
    </div>
  );
}

export function Memuat({ kartu = 3 }: { kartu?: number }) {
  return (
    <div role="status" aria-label="Memuat data" style={{ display: "contents" }}>
      <SkeletonCard besar tinggi={112} baris={1} />
      {Array.from({ length: kartu - 1 }).map((_, k) => (
        <SkeletonCard key={k} tinggi={0} baris={4} />
      ))}
    </div>
  );
}

export function GagalMuat() {
  const { setSkenario } = useStore();
  return (
    <section className="card empty" role="alert">
      <span className="ico-dot">
        <IconAlertTriangle size={22} aria-hidden="true" />
      </span>
      <h2 style={{ fontSize: 15, fontWeight: 600 }}>Data belum bisa dimuat.</h2>
      <p className="note">Cek koneksi kamu, lalu coba lagi.</p>
      <button type="button" className="btn ton sm" onClick={() => setSkenario("normal")}>
        <IconRefresh size={18} aria-hidden="true" />
        Coba lagi
      </button>
    </section>
  );
}

export function KhususPengelola() {
  return (
    <section className="card empty">
      <span className="ico-dot">
        <IconAlertTriangle size={22} aria-hidden="true" />
      </span>
      <h2 style={{ fontSize: 15, fontWeight: 600 }}>Halaman ini khusus pengelola.</h2>
      <Link href="/" className="btn ton sm">
        Kembali ke Beranda
      </Link>
    </section>
  );
}

// ---------- toast ----------
export function Toast() {
  const { toast, tutupToast } = useStore();
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(tutupToast, 4200);
    return () => clearTimeout(t);
  }, [toast, tutupToast]);
  if (!toast) return null;
  return (
    <div className="toast" role="status" aria-live="polite" key={toast.id}>
      <IconCircleCheck size={18} aria-hidden="true" />
      <p>{toast.pesan}</p>
    </div>
  );
}
