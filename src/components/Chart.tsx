"use client";
// Grafik nilai (DESIGN.md "Grafik Nilai"): garis hijau hutan 2px, arsiran 16%, penanda hari
// transaksi, geser/sentuh untuk tooltip, kontrol keyboard. Satu titik per snapshot.
import { useId, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";

export interface TitikGrafik {
  label: string;
  nilai: number;
  ditandai: boolean;
  /** Baris tooltip: judul tebal, lalu baris kecil. */
  judul: string;
  baris: string[];
}

const W = 300;
const H = 120;
const PT = 12;
const PB = 6;

export default function Chart({ titik, label }: { titik: TitikGrafik[]; label: string }) {
  const gid = useId().replace(/:/g, "");
  const [i, setI] = useState(-1);
  const svgRef = useRef<SVGSVGElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const bubRef = useRef<HTMLDivElement>(null);
  const L = titik.length - 1;

  const g = useMemo(() => {
    const v = titik.map((t) => t.nilai);
    const lo = Math.min(...v);
    const hi = Math.max(...v);
    const m = (hi - lo) * 0.1 || Math.abs(hi) * 0.05 || 1;
    const X = (k: number) => (L ? 4 + (k * (W - 8)) / L : W / 2);
    const Y = (x: number) => PT + (H - PT - PB) * (1 - (x - lo + m) / (hi - lo + 2 * m));
    const d = v.map((x, k) => `${k ? "L" : "M"}${X(k).toFixed(1)} ${Y(x).toFixed(1)}`).join("");
    return { X, Y, d, v };
  }, [titik, L]);

  const pick = (e: PointerEvent<SVGSVGElement>) => {
    const r = svgRef.current!.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * W;
    setI(Math.max(0, Math.min(L, Math.round(((x - 4) / (W - 8)) * L))));
  };
  const key = (e: KeyboardEvent) => {
    let k = i < 0 ? L : i;
    if (e.key === "ArrowLeft") k--;
    else if (e.key === "ArrowRight") k++;
    else if (e.key === "Home") k = 0;
    else if (e.key === "End") k = L;
    else if (e.key === "Escape") return setI(-1);
    else return;
    e.preventDefault();
    setI(Math.max(0, Math.min(L, k)));
  };

  // posisi tooltip diatur setelah render, saat ukuran gelembung sudah diketahui
  useLayoutEffect(() => {
    const bub = bubRef.current;
    if (i < 0 || !bub || !svgRef.current || !wrapRef.current) return;
    const sr = svgRef.current.getBoundingClientRect();
    const cr = wrapRef.current.getBoundingClientRect();
    const sc = sr.width / W;
    const bw = bub.offsetWidth;
    bub.style.left = `${Math.max(0, Math.min(cr.width - bw, sr.left - cr.left + g.X(i) * sc - bw / 2))}px`;
    bub.style.top = `${sr.top - cr.top - 4}px`;
  }, [i, g]);
  const t = i >= 0 ? titik[i] : null;
  const akhir = titik[L];

  return (
    <div className="chart" ref={wrapRef}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        tabIndex={0}
        role="slider"
        aria-label={`${label}. Geser, atau pakai panah kiri dan kanan, untuk melihat tiap hari.`}
        aria-valuemin={0}
        aria-valuemax={L}
        aria-valuenow={i < 0 ? L : i}
        aria-valuetext={t ? `${t.judul}, ${t.baris.join(", ")}` : `${akhir.judul}`}
        onPointerDown={pick}
        onPointerMove={(e) => (e.pointerType === "mouse" || e.buttons) && pick(e)}
        onPointerLeave={(e) => e.pointerType === "mouse" && document.activeElement !== svgRef.current && setI(-1)}
        onBlur={() => setI(-1)}
        onKeyDown={key}
      >
        <defs>
          <linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="var(--forest-ink)" stopOpacity="0.16" />
            <stop offset="1" stopColor="var(--forest-ink)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {L > 0 && <path d={`${g.d}L${g.X(L).toFixed(1)} ${H - PB}L${g.X(0).toFixed(1)} ${H - PB}Z`} fill={`url(#${gid})`} />}
        <path
          key={g.d}
          className="ln"
          pathLength={1}
          d={g.d}
          fill="none"
          stroke="var(--forest-ink)"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {titik.map((p, k) =>
          p.ditandai ? (
            <circle key={k} cx={g.X(k)} cy={g.Y(g.v[k])} r={4} fill="var(--card-white)" stroke="var(--forest-ink)" strokeWidth={2} />
          ) : null,
        )}
        <circle cx={g.X(L)} cy={g.Y(g.v[L])} r={3.5} fill="var(--forest-ink)" />
        {i >= 0 && (
          <g>
            <line x1={g.X(i)} x2={g.X(i)} y1={PT - 6} y2={H - PB} stroke="var(--ink-muted)" strokeDasharray="3 3" />
            <circle cx={g.X(i)} cy={g.Y(g.v[i])} r={5.5} fill="var(--forest-ink)" stroke="var(--card-white)" strokeWidth={2} />
          </g>
        )}
      </svg>
      <div ref={bubRef} className={`bub${t ? " on" : ""}`} aria-hidden="true">
        {t && (
          <>
            <b>{t.judul}</b>
            {t.baris.map((b, k) => (
              <div key={k}>{k === 0 ? <small>{b}</small> : b}</div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
