"use client";

import { useEffect, useSyncExternalStore } from "react";

export type ModeTema = "sistem" | "terang" | "gelap";
export type TemaAktif = "light" | "dark";

export interface OpsiKaca {
  liquidGlass: boolean;
  betterPerformance: boolean;
  progressiveBlur: boolean;
  pillPhysics: boolean;
  reduceMotion: boolean;
}

const KUNCI_TEMA = "pasti-cuan-theme";
const KUNCI_KACA = "pasti-cuan-glass-opts";

const DEFAULT_KACA: OpsiKaca = {
  liquidGlass: true,
  betterPerformance: false,
  progressiveBlur: true,
  pillPhysics: true,
  reduceMotion: false,
};

let simpananTema: ModeTema | null = null;
let simpananKaca: OpsiKaca | null = null;
const pendengar = new Set<() => void>();

function beritahu() {
  pendengar.forEach((fn) => fn());
}

function bacaMode(): ModeTema {
  if (simpananTema) return simpananTema;
  if (typeof window === "undefined") return "sistem";
  try {
    const raw = localStorage.getItem(KUNCI_TEMA);
    if (raw === "terang" || raw === "gelap" || raw === "sistem") {
      simpananTema = raw;
      return raw;
    }
  } catch {
    /* ignore */
  }
  simpananTema = "sistem";
  return simpananTema;
}

function bacaOpsiKaca(): OpsiKaca {
  if (simpananKaca) return simpananKaca;
  if (typeof window === "undefined") return DEFAULT_KACA;
  try {
    const raw = localStorage.getItem(KUNCI_KACA);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<OpsiKaca>;
      simpananKaca = {
        liquidGlass: typeof parsed.liquidGlass === "boolean" ? parsed.liquidGlass : DEFAULT_KACA.liquidGlass,
        betterPerformance:
          typeof parsed.betterPerformance === "boolean" ? parsed.betterPerformance : DEFAULT_KACA.betterPerformance,
        progressiveBlur:
          typeof parsed.progressiveBlur === "boolean" ? parsed.progressiveBlur : DEFAULT_KACA.progressiveBlur,
        pillPhysics: typeof parsed.pillPhysics === "boolean" ? parsed.pillPhysics : DEFAULT_KACA.pillPhysics,
        reduceMotion: typeof parsed.reduceMotion === "boolean" ? parsed.reduceMotion : DEFAULT_KACA.reduceMotion,
      };
      return simpananKaca;
    }
  } catch {
    /* ignore */
  }
  simpananKaca = DEFAULT_KACA;
  return simpananKaca;
}

export function setModeTema(baru: ModeTema) {
  simpananTema = baru;
  try {
    localStorage.setItem(KUNCI_TEMA, baru);
  } catch {
    /* ignore */
  }
  terapkanKeDOM(baru);
  beritahu();
}

export function setOpsiKaca(patch: Partial<OpsiKaca>) {
  const sekarang = bacaOpsiKaca();
  const baru: OpsiKaca = { ...sekarang, ...patch };
  simpananKaca = baru;
  try {
    localStorage.setItem(KUNCI_KACA, JSON.stringify(baru));
  } catch {
    /* ignore */
  }
  terapkanKacaKeDOM(baru);
  beritahu();
}

export function resolveTema(mode: ModeTema): TemaAktif {
  if (mode === "gelap") return "dark";
  if (mode === "terang") return "light";
  if (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }
  return "light";
}

export function terapkanKeDOM(mode: ModeTema) {
  if (typeof document === "undefined") return;
  const aktif = resolveTema(mode);
  document.documentElement.dataset.theme = aktif;
  document.documentElement.style.colorScheme = aktif;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", aktif === "dark" ? "#0c0f0b" : "#e8ebe6");
}

export function terapkanKacaKeDOM(opsi: OpsiKaca) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.dataset.liquidGlass = opsi.liquidGlass ? "on" : "off";
  root.dataset.lgPerf = opsi.betterPerformance ? "on" : "off";
  root.dataset.lgProgBlur = opsi.progressiveBlur ? "on" : "off";
  root.dataset.lgPillPhysics = opsi.pillPhysics ? "on" : "off";
  root.dataset.lgReduceMotion = opsi.reduceMotion ? "on" : "off";
}

function langganan(fn: () => void) {
  pendengar.add(fn);
  return () => pendengar.delete(fn);
}

const serverTemaSnapshot = (): ModeTema => "sistem";
const serverKacaSnapshot = (): OpsiKaca => DEFAULT_KACA;

const emptySubscribe = () => () => {};
const clientTrue = () => true;
const serverFalse = () => false;

export function useTema() {
  const mode = useSyncExternalStore(langganan, bacaMode, serverTemaSnapshot);
  const kaca = useSyncExternalStore(langganan, bacaOpsiKaca, serverKacaSnapshot);
  const mounted = useSyncExternalStore(emptySubscribe, clientTrue, serverFalse);

  useEffect(() => {
    terapkanKeDOM(mode);
    terapkanKacaKeDOM(kaca);
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (bacaMode() === "sistem") {
        terapkanKeDOM("sistem");
        beritahu();
      }
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [mode, kaca]);

  const aktif: TemaAktif = mounted ? resolveTema(mode) : "light";
  const kacaAktif: OpsiKaca = mounted ? kaca : DEFAULT_KACA;

  return {
    mode: mounted ? mode : "sistem",
    aktif,
    setMode: setModeTema,
    kaca: kacaAktif,
    setKaca: setOpsiKaca,
  };
}
