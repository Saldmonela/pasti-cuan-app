// Grafik nilai (DESIGN.md "Grafik Nilai"): garis hijau hutan 2px, arsiran 16%, penanda transaksi.
// Tidak ada tooltip: menggeser jari (scrub) memilih titik terdekat secara horizontal, dan kartu di atas grafik
// yang menampilkan nilainya (BR-23). Sumbu X mengikuti waktu. Mode Bandingkan menggambar 2 garis persen
// dengan satu sumbu Y (BR-22). Di HP scrub baru dimulai saat jari bergerak horizontal (NF-13).
import { useId, useMemo, useRef, type KeyboardEvent, type PointerEvent } from "react";

export interface TitikGrafik {
  /** Waktu titik (milidetik). */
  x: number;
  nilai: number;
  /** Garis kedua (mode Bandingkan: persen SOL). */
  nilai2?: number;
  ditandai: boolean;
}

const W = 300;
const H = 120;
const PT = 12;
const PB = 10;
const PL = 4;
const STEPS = [0.5, 1, 2, 5, 10, 20, 25, 50, 100];

const niceStep = (span: number) => STEPS.find((s) => span / s <= 14) ?? Math.ceil(span / 10);

const fmtPct = (v: number) => {
  if (Math.abs(v) < 1e-9) return "0%";
  const tanda = v > 0 ? "+" : "−";
  const a = Math.round(Math.abs(v) * 100) / 100;
  const angka = Number.isInteger(a)
    ? String(a)
    : Number.isInteger(a * 10)
      ? a.toFixed(1).replace(".", ",")
      : a.toFixed(2).replace(".", ",");
  return `${tanda}${angka}%`;
};

export default function Chart({
  titik,
  label,
  aktif,
  onAktif,
  persen = false,
  formatNilai,
}: {
  titik: TitikGrafik[];
  label: string;
  /** Indeks titik yang sedang disentuh, null = nilai live. */
  aktif: number | null;
  onAktif: (i: number | null) => void;
  persen?: boolean;
  /** Pemformat angka untuk penanda tertinggi & terendah pada rentang aktif. */
  formatNilai?: (v: number) => string;
}) {
  const gid = useId().replace(/:/g, "");
  const svgRef = useRef<SVGSVGElement>(null);
  const sentuh = useRef<{ x: number; y: number; scrub: boolean } | null>(null);
  const L = titik.length - 1;
  const dua = titik.some((t) => t.nilai2 !== undefined);
  const pr = persen ? 38 : 4;

  const g = useMemo(() => {
    const v = titik.map((t) => t.nilai);
    const v2 = titik.map((t) => t.nilai2 ?? t.nilai);
    const semua = persen ? [...v, ...v2, 0] : v;
    const rawLo = Math.min(...semua);
    const rawHi = Math.max(...semua);
    let lo = rawLo;
    let hi = rawHi;
    let ticks: number[] = [];
    let hiTick = 0;
    let loTick = 0;

    if (persen) {
      const step = niceStep(rawHi - rawLo || 1);
      hiTick = rawHi > 0 ? Math.ceil(rawHi / step) * step : 0;
      loTick = rawLo < 0 ? Math.floor(rawLo / step) * step : 0;
      hi = Math.max(rawHi, hiTick);
      lo = Math.min(rawLo, loTick);
      ticks = [0];
      if (hiTick > 0) ticks.push(hiTick);
      if (loTick < 0) ticks.push(loTick);
    }

    const m = persen ? 0 : (hi - lo) * 0.1 || Math.abs(hi) * 0.05 || 1;
    const x0 = titik[0]?.x ?? 0;
    const span = (titik[L]?.x ?? 0) - x0;
    const plotW = W - PL - pr;
    const plotH = H - PT - PB;
    const X = (k: number) => (L && span ? PL + ((titik[k].x - x0) * plotW) / span : PL + plotW / 2);
    const Y = (x: number) => PT + plotH * (1 - (x - lo + m) / (hi - lo + 2 * m || 1));
    const jalur = (a: number[]) => a.map((x, k) => `${k ? "L" : "M"}${X(k).toFixed(1)} ${Y(x).toFixed(1)}`).join("");
    const y0 = Y(0);
    if (persen) {
      if (hiTick > 0 && Math.abs(Y(hiTick) - y0) >= plotH * 0.55) ticks.push(hiTick / 2);
      if (loTick < 0 && Math.abs(Y(loTick) - y0) >= plotH * 0.55) ticks.push(loTick / 2);
    }
    // Hindari label bertumpuk jika terlalu dekat garis 0%
    const sumbu = ticks.filter((val) => val === 0 || Math.abs(Y(val) - y0) >= 16);
    let hiIdx = 0;
    let loIdx = 0;
    for (let k = 1; k <= L; k++) {
      if (v[k] > v[hiIdx]) hiIdx = k;
      if (v[k] < v[loIdx]) loIdx = k;
    }
    return { X, Y, d: jalur(v), d2: jalur(v2), v, v2, x0, span, plotW, sumbu, hiIdx, loIdx };
  }, [titik, L, persen, pr]);

  let ekstrem: { idx: number; teks: string }[] | null = null;
  if (titik.length >= 2 && formatNilai && g.hiIdx !== g.loIdx && Math.abs(g.Y(g.v[g.loIdx]) - g.Y(g.v[g.hiIdx])) >= 12) {
    const teksHi = formatNilai(g.v[g.hiIdx]);
    const teksLo = formatNilai(g.v[g.loIdx]);
    if (teksHi !== teksLo) {
      ekstrem = [
        { idx: g.hiIdx, teks: teksHi },
        { idx: g.loIdx, teks: teksLo },
      ];
    }
  }

  /** Titik terdekat secara horizontal dari posisi pointer (snap). */
  const terdekat = (clientX: number) => {
    const r = svgRef.current!.getBoundingClientRect();
    const t = g.x0 + ((((clientX - r.left) / r.width) * W - PL) / g.plotW) * g.span;
    let best = 0;
    for (let k = 1; k <= L; k++) if (Math.abs(titik[k].x - t) < Math.abs(titik[best].x - t)) best = k;
    return best;
  };

  const down = (e: PointerEvent<SVGSVGElement>) => {
    if (e.pointerType === "mouse") return onAktif(terdekat(e.clientX));
    sentuh.current = { x: e.clientX, y: e.clientY, scrub: false };
  };
  const move = (e: PointerEvent<SVGSVGElement>) => {
    if (e.pointerType === "mouse") return onAktif(terdekat(e.clientX));
    const s = sentuh.current;
    if (!s) return;
    if (!s.scrub) {
      const dx = Math.abs(e.clientX - s.x);
      const dy = Math.abs(e.clientY - s.y);
      if (dx < 6 || dx <= dy) return; // gerakan vertikal tetap menggulir halaman
      s.scrub = true;
      svgRef.current?.setPointerCapture(e.pointerId);
    }
    onAktif(terdekat(e.clientX));
  };
  const selesai = () => {
    sentuh.current = null;
    onAktif(null);
  };
  const key = (e: KeyboardEvent) => {
    let k = aktif ?? L;
    if (e.key === "ArrowLeft") k = aktif === null ? L : k - 1;
    else if (e.key === "ArrowRight") k = aktif === null ? L : k + 1;
    else if (e.key === "Home") k = 0;
    else if (e.key === "End") k = L;
    else if (e.key === "Escape") return onAktif(null);
    else return;
    e.preventDefault();
    onAktif(Math.max(0, Math.min(L, k)));
  };

  const i = aktif;

  return (
    <div className="chart">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        tabIndex={0}
        role="img"
        aria-label={`${label}. Geser jari di grafik, atau pakai panah kiri dan kanan, untuk melihat nilai tiap titik. Esc kembali ke nilai terbaru.`}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={(e) => e.pointerType !== "mouse" && selesai()}
        onPointerCancel={selesai}
        onPointerLeave={(e) => e.pointerType === "mouse" && onAktif(null)}
        onBlur={() => onAktif(null)}
        onKeyDown={key}
      >
        <defs>
          <linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="var(--forest-ink)" stopOpacity="0.16" />
            <stop offset="1" stopColor="var(--forest-ink)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {persen && <line x1={PL} x2={W - pr + 2} y1={g.Y(0)} y2={g.Y(0)} stroke="var(--hairline)" strokeWidth={1} />}
        {persen &&
          g.sumbu.map((val) => (
            <text key={val} x={W - 1} y={g.Y(val)} dy="0.32em" textAnchor="end" className="ax" aria-hidden="true">
              {fmtPct(val)}
            </text>
          ))}
        {!persen && L > 0 && <path d={`${g.d}L${g.X(L).toFixed(1)} ${H - PB}L${g.X(0).toFixed(1)} ${H - PB}Z`} fill={`url(#${gid})`} />}
        {dua && (
          <path
            key={`${label}-2`}
            className="ln"
            d={g.d2}
            fill="none"
            stroke="var(--ink-muted)"
            strokeWidth={2}
            strokeDasharray="5 4"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}
        <path key={label} className="ln" d={g.d} fill="none" stroke="var(--forest-ink)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {titik.map((p, k) =>
          p.ditandai ? <circle key={k} cx={g.X(k)} cy={g.Y(g.v[k])} r={4} fill="var(--card-white)" stroke="var(--forest-ink)" strokeWidth={2} /> : null,
        )}
        {i === null && dua && <circle cx={g.X(L)} cy={g.Y(g.v2[L])} r={3} fill="var(--ink-muted)" />}
        {i === null && <circle cx={g.X(L)} cy={g.Y(g.v[L])} r={3.5} fill="var(--forest-ink)" />}
        {ekstrem && (
          <g key={`${label}-hl`} className="hl" aria-hidden="true">
            {ekstrem.map(({ idx, teks }) => {
              const vx = g.X(idx);
              const vy = g.Y(g.v[idx]);
              const dir = vx <= PL + g.plotW / 2 ? 1 : -1;
              const adaTitik = titik[idx].ditandai || (idx === L && i === null);
              const startPad = titik[idx].ditandai ? 5.5 : idx === L && i === null ? 5 : 1;
              const x1 = vx + dir * startPad;
              const x2 = vx + dir * (adaTitik ? startPad + 12 : 14);
              const tx = x2 + dir * 3;
              return (
                <g key={idx}>
                  <line className="hl-ln" x1={x1} y1={vy} x2={x2} y2={vy} />
                  <text className="hl-txt" x={tx} y={vy} dy="0.34em" textAnchor={dir === 1 ? "start" : "end"}>
                    {teks}
                  </text>
                </g>
              );
            })}
          </g>
        )}
        {i !== null && (
          <g>
            <line x1={g.X(i)} x2={g.X(i)} y1={PT - 6} y2={H - PB} stroke="var(--ink-muted)" strokeDasharray="3 3" />
            {dua && <circle cx={g.X(i)} cy={g.Y(g.v2[i])} r={4.5} fill="var(--ink-muted)" stroke="var(--card-white)" strokeWidth={2} />}
            <circle cx={g.X(i)} cy={g.Y(g.v[i])} r={5.5} fill="var(--forest-ink)" stroke="var(--card-white)" strokeWidth={2} />
          </g>
        )}
      </svg>
    </div>
  );
}
