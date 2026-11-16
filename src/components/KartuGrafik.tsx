// Kartu nilai + grafik bersama untuk Beranda (US-12) dan Pool (US-08).
// Urutan: label dan kontrol satuan 3 ikon di kanan atas, angka besar, baris untung/rugi, waktu, chip transaksi,
// grafik, rentang, lalu isi tambahan (Setor/Tarik). Saat grafik disentuh, angka ikut titik yang disentuh (BR-23).
import { useRef, useState, type ReactNode } from "react";
import { IconCurrencyDollar, IconCurrencySolana, IconRefresh } from "@tabler/icons-react";
import Chart, { type TitikGrafik } from "./Chart";
import { Seg } from "./ui";
import { kumulatif, type Seri } from "@/lib/engine";
import { arah, bertanda, persenBertanda, tanggal, uang } from "@/lib/format";
import { useStore } from "@/lib/store";
import { RENTANG, type ModeSatuan, type Rentang, type Satuan } from "@/lib/types";
import { awalTampil, chipTransaksi, keteranganEstimasi, labelWaktu } from "@/lib/view";

const OPSI: { nilai: ModeSatuan; nama: string; ikon: ReactNode }[] = [
  { nilai: "USD", nama: "Tampilkan dalam USD", ikon: <IconCurrencyDollar size={18} aria-hidden="true" /> },
  { nilai: "SOL", nama: "Tampilkan dalam SOL", ikon: <IconCurrencySolana size={18} aria-hidden="true" /> },
  {
    nilai: "Bandingkan",
    nama: "Bandingkan USD dan SOL",
    ikon: (
      <span className="duo" aria-hidden="true">
        <IconCurrencyDollar size={15} />
        <IconCurrencySolana size={15} />
      </span>
    ),
  },
];

/** Keterangan waktu nilai live; tampil lagi saat jari dilepas dari grafik (BR-23). */
export function useWaktuLive() {
  const { hasil, data } = useStore();
  if (hasil.live) return `Nilai live ${hasil.live.dibacaPada.slice(11, 16).replace(":", ".")} WIB`;
  return hasil.tanggalData ? `Data per ${tanggal(hasil.tanggalData)}, ${data.pengaturan.jamSnapshot.replace(":", ".")} WIB` : "";
}

/** Kontrol satuan: segmented control 3 ikon, target sentuh 44px (US-12 poin 4). */
export function SatuanIkon({ nilai, onChange }: { nilai: ModeSatuan; onChange: (m: ModeSatuan) => void }) {
  return (
    <div className="seg ikon" role="radiogroup" aria-label="Satuan">
      {OPSI.map((o) => (
        <button key={o.nilai} type="button" role="radio" aria-checked={nilai === o.nilai} aria-label={o.nama} title={o.nama} onClick={() => onChange(o.nilai)}>
          {o.ikon}
        </button>
      ))}
    </div>
  );
}

export default function KartuGrafik({
  id,
  label,
  info,
  catatan,
  seri,
  live,
  waktuLive,
  mode,
  onMode,
  rentang,
  onRentang,
  kosong,
  gagal,
  onCobaLagi,
  keterangan,
  children,
}: {
  id: string;
  label: string;
  /** Tombol info di samping angka besar (Pool: selisih isi wallet dan nilai disesuaikan). */
  info?: ReactNode;
  /** Isi yang dibuka tombol info, tampil di bawah angka besar. */
  catatan?: ReactNode;
  seri: Seri;
  live: { usd: number; sol: number };
  waktuLive: string;
  mode: ModeSatuan;
  onMode: (m: ModeSatuan) => void;
  rentang: Rentang;
  onRentang: (r: Rentang) => void;
  kosong: string | null;
  gagal?: boolean;
  onCobaLagi?: () => void;
  keterangan?: ReactNode;
  children?: ReactNode;
}) {
  const [aktif, setAktif] = useState<number | null>(null);
  const umum = useRef<HTMLParagraphElement>(null);
  const antre = useRef<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const mulai = awalTampil(seri, rentang);
  const tampil = seri.titik.slice(mulai);
  const kum = kumulatif(seri);
  const kumTampil = kum.slice(mulai);
  const akhir = kum.at(-1) ?? { ruUsd: 0, ruSol: 0, persenUsd: 0, persenSol: 0 };
  const bandingkan = mode === "Bandingkan";
  const u: Satuan = mode === "SOL" ? "SOL" : "USD";
  const i = aktif !== null && aktif < tampil.length ? aktif : null;
  const p = i !== null ? tampil[i] : null;
  const k = i !== null ? kumTampil[i] : akhir;
  const nilaiUsd = p ? p.usd : live.usd;
  const nilaiSol = p ? p.sol : live.sol;
  const ru = u === "USD" ? k.ruUsd : k.ruSol;
  const pr = u === "USD" ? k.persenUsd : k.persenSol;
  const chip = p ? chipTransaksi(p, seri.jenis) : [];

  const titik: TitikGrafik[] = tampil.map((t, j) => ({
    x: t.ms,
    nilai: bandingkan ? kumTampil[j].persenUsd : u === "USD" ? t.usd : t.sol,
    nilai2: bandingkan ? kumTampil[j].persenSol : undefined,
    ditandai: t.transaksi.length > 0,
  }));

  // NF-13 (d): umumkan perubahan angka ke screen reader, maksimal 1 kali per 500 ms
  function umumkan(teks: string) {
    antre.current = teks;
    if (timer.current) return;
    const tulis = () => {
      if (umum.current && antre.current) umum.current.textContent = antre.current;
      antre.current = null;
    };
    tulis();
    timer.current = setTimeout(() => {
      timer.current = null;
      tulis();
    }, 500);
  }

  function pilih(j: number | null) {
    setAktif(j);
    if (j === null) return umumkan(`Kembali ke nilai terbaru, ${uang(u === "USD" ? live.usd : live.sol, u)}.`);
    const t = tampil[j];
    umumkan(`${labelWaktu(t)}, ${uang(u === "USD" ? t.usd : t.sol, u)}, ${persenBertanda(u === "USD" ? kumTampil[j].persenUsd : kumTampil[j].persenSol)}.`);
  }

  return (
    <section className="card" aria-labelledby={id}>
      <div className="card-top">
        <div className="lb" id={id}>
          {label}
        </div>
        <SatuanIkon nilai={mode} onChange={onMode} />
      </div>
      {bandingkan ? (
        <div className="duo-big">
          <div>
            <div className="fig-duo">{uang(nilaiUsd, "USD")}</div>
            <div className={`pl ${arah(k.persenUsd)}`}>{persenBertanda(k.persenUsd)}</div>
          </div>
          <div>
            <div className="fig-duo">{uang(nilaiSol, "SOL")}</div>
            <div className={`pl ${arah(k.persenSol)}`}>{persenBertanda(k.persenSol)}</div>
          </div>
          {info}
        </div>
      ) : (
        <div className="big-row">
          <div className="big">{uang(u === "USD" ? nilaiUsd : nilaiSol, u)}</div>
          {info}
        </div>
      )}
      {catatan}
      <div className={`pl ${arah(bandingkan ? k.ruUsd : ru, u === "USD" ? 2 : 4)}`}>
        {bandingkan ? `${bertanda(k.ruUsd, "USD")} · ${bertanda(k.ruSol, "SOL")}` : `${bertanda(ru, u)} (${persenBertanda(pr)})`} · {rentang}
      </div>
      <div className="stamp" style={{ marginTop: 2 }}>
        {p ? labelWaktu(p) : waktuLive}
      </div>
      {chip.length > 0 && (
        <div className="chips">
          {chip.map((c) => (
            <span key={c} className="chip tx">
              {c}
            </span>
          ))}
        </div>
      )}
      <p className="sr-only" aria-live="polite" ref={umum} />

      {gagal ? (
        <div className="chart-empty" role="alert">
          <p>Grafik belum bisa dimuat. Coba lagi.</p>
          {onCobaLagi && (
            <button type="button" className="btn ton sm" onClick={onCobaLagi}>
              <IconRefresh size={18} aria-hidden="true" />
              Coba lagi
            </button>
          )}
        </div>
      ) : kosong ? (
        <div className="chart-empty">{kosong}</div>
      ) : (
        <Chart
          titik={titik}
          aktif={i}
          onAktif={pilih}
          persen={bandingkan}
          label={`Grafik ${label.toLowerCase()} ${bandingkan ? "dalam persen, USD dan SOL" : `dalam ${u}`}, rentang ${rentang}`}
        />
      )}
      {!kosong && !gagal && keteranganEstimasi(seri, rentang) && <p className="cap-est">{keteranganEstimasi(seri, rentang)}</p>}
      {bandingkan && !kosong && !gagal && (
        <p className="legend-garis">
          <span className="g usd" aria-hidden="true" /> USD <span className="g sol" aria-hidden="true" /> SOL · persen sejak awal rentang
        </p>
      )}
      {keterangan}
      <div className="ctl">
        <Seg label="Rentang" nilai={rentang} opsi={RENTANG} onChange={onRentang} />
      </div>
      {children}
    </section>
  );
}
