"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { GlassPillMotion, type PillFrame } from "@/lib/pillMotion";
import { useTema } from "@/lib/theme";

function createBevelDataURI(w: number, h: number, radius: number, rimWidth: number): string {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  if (!ctx) return "";
  const img = ctx.createImageData(w, h);
  const d = img.data;
  const hw = w / 2;
  const hh = h / 2;
  const r = Math.min(radius, hw, hh);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const qx = Math.abs(x - hw) - (hw - r);
      const qy = Math.abs(y - hh) - (hh - r);
      const outX = Math.max(qx, 0);
      const outY = Math.max(qy, 0);
      const sdf = Math.hypot(outX, outY) + Math.min(Math.max(qx, qy), 0) - r;

      let nx = 0;
      let ny = 0;
      if (sdf < 0 && sdf > -rimWidth) {
        const t = 1 - -sdf / rimWidth;
        const mag = t * t * (3 - 2 * t);
        const dx = x - hw;
        const dy = y - hh;
        const len = Math.hypot(dx / hw, dy / hh) || 1;
        nx = (dx / hw / len) * mag;
        ny = (dy / hh / len) * mag;
      }
      const i = (y * w + x) * 4;
      d[i] = Math.round(128 + nx * 127);
      d[i + 1] = Math.round(128 + ny * 127);
      d[i + 2] = 128;
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c.toDataURL("image/png");
}

function supportsSvgBackdropLens(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") return true;
  const ua = navigator.userAgent || "";
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (isIOS) return false;
  if (/Firefox\//i.test(ua)) return false;
  return /Chrome\/|Chromium\/|Edg\/|OPR\/|SamsungBrowser\//i.test(ua);
}

const KONTROL = ".seg, .tabs";
const AKTIF_KONTROL = 'button[aria-pressed="true"], button[aria-checked="true"]';

function lapisan(kelas: string): HTMLElement {
  const el = document.createElement("span");
  el.className = kelas;
  el.setAttribute("aria-hidden", "true");
  return el;
}

/** Item yang bisa dipilih kapsul: tautan di navigasi, tombol di kontrol segmen/tab. */
function itemsOf(host: HTMLElement): HTMLElement[] {
  return Array.from(host.querySelectorAll<HTMLElement>(host.classList.contains("nav") ? "a[href]" : ":scope > button"));
}

/** Geser jari hanya masuk akal bila semua item berada di satu baris (.seg bisa wrap di layar sempit). */
function satuBaris(items: HTMLElement[]): boolean {
  return items.every((b) => Math.abs(b.offsetTop - items[0].offsetTop) < 4);
}

function ensureControlLayers(container: HTMLElement): { pill: HTMLElement; glass: HTMLElement } {
  let pill = container.querySelector<HTMLElement>(":scope > .lg-slider");
  if (!pill) {
    pill = lapisan("lg-slider");
    container.prepend(pill);
  }
  let glass = container.querySelector<HTMLElement>(":scope > .lg-glass");
  if (!glass) {
    glass = lapisan("lg-glass");
    pill.insertAdjacentElement("afterend", glass);
  }
  return { pill, glass };
}

interface OpsiGambar {
  grow: [number, number];
  /** Navigasi: kapsul diam memudar saat kaca muncul. Kontrol segmen: kapsul hijau tetap terlihat di bawah kaca. */
  pudarkanDiam: boolean;
  ringan: boolean;
}

/** Menggambar satu frame pegas ke kapsul diam (.lg-slider) dan kaca terangkat (.lg-glass). */
function gambarKapsul(
  host: HTMLElement,
  items: HTMLElement[],
  pill: HTMLElement,
  glass: HTMLElement,
  frame: PillFrame,
  motion: GlassPillMotion | undefined,
  opsi: OpsiGambar,
) {
  const maxIdx = items.length - 1;
  const firstCenter = items[0].offsetLeft + items[0].offsetWidth / 2;
  const lastCenter = items[maxIdx].offsetLeft + items[maxIdx].offsetWidth / 2;
  const stepPx = maxIdx > 0 ? (lastCenter - firstCenter) / maxIdx : items[0].offsetWidth;
  if (motion) motion.stepPx = stepPx;

  const clamped = Math.max(0, Math.min(maxIdx, frame.position));
  const i0 = Math.floor(clamped);
  const i1 = Math.min(maxIdx, i0 + 1);
  const t = clamped - i0;
  const over = frame.position - clamped;

  const a0 = items[i0];
  const a1 = items[i1];
  const cx0 = a0.offsetLeft + a0.offsetWidth / 2;
  const cx1 = a1.offsetLeft + a1.offsetWidth / 2;
  const cy0 = a0.offsetTop + a0.offsetHeight / 2;
  const cy1 = a1.offsetTop + a1.offsetHeight / 2;

  const cx = cx0 + (cx1 - cx0) * t + over * stepPx;
  const cy = cy0 + (cy1 - cy0) * t;
  const restW = a0.offsetWidth + (a1.offsetWidth - a0.offsetWidth) * t;
  const restH = a0.offsetHeight + (a1.offsetHeight - a0.offsetHeight) * t;

  const [growW, growH] = opsi.grow;
  const liveW = Math.max(24, (restW + growW * frame.liftX) * (1 + frame.deviation));
  const liveH = Math.max(24, (restH + growH * frame.liftY) * (1 - frame.deviation));
  const x = cx - liveW / 2;
  const y = cy - liveH / 2;

  const kaca = opsi.ringan ? 0 : frame.glassPresence;
  pill.style.opacity = opsi.pudarkanDiam ? (1 - kaca).toFixed(3) : "1";
  glass.style.opacity = kaca.toFixed(3);
  for (const el of [pill, glass]) {
    el.style.width = `${liveW.toFixed(2)}px`;
    el.style.height = `${liveH.toFixed(2)}px`;
    el.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`;
  }
  pill.style.setProperty("--pill-material", frame.material.toFixed(3));
  pill.style.setProperty("--pill-presence", frame.glassPresence.toFixed(3));
  pill.style.setProperty("--pill-rim", frame.rimAlpha.toFixed(3));
  pill.dataset.lifted = frame.glassPresence > 0.025 ? "true" : "false";

  if (frame.isDragging) {
    host.dataset.lgDragging = "true";
    const aimIdx = Math.round(clamped);
    items.forEach((a, idx) => {
      if (idx === aimIdx) a.dataset.pillAim = "true";
      else delete a.dataset.pillAim;
    });
  } else if (host.dataset.lgDragging === "true") {
    delete host.dataset.lgDragging;
    items.forEach((a) => {
      delete a.dataset.pillAim;
    });
  }
}

function ensureNavLayers(nav: HTMLElement): { surface: HTMLElement; pill: HTMLElement; glass: HTMLElement } {
  let surface = nav.querySelector<HTMLElement>(":scope > .lg-nav-surface");
  if (!surface) {
    surface = document.createElement("span");
    surface.className = "lg-nav-surface";
    surface.setAttribute("aria-hidden", "true");
    nav.prepend(surface);
  }
  let rim = nav.querySelector<HTMLElement>(":scope > .lg-nav-rim");
  if (!rim) {
    rim = document.createElement("span");
    rim.className = "lg-nav-rim";
    rim.setAttribute("aria-hidden", "true");
    surface.insertAdjacentElement("afterend", rim);
  }
  let pill = nav.querySelector<HTMLElement>(":scope > .lg-slider");
  if (!pill) {
    pill = document.createElement("span");
    pill.className = "lg-slider";
    pill.setAttribute("aria-hidden", "true");
    rim.insertAdjacentElement("afterend", pill);
  }
  // Kaca terangkat dipisah dari kapsul diam supaya keduanya bisa di-crossfade, bukan berganti dalam satu frame.
  let glass = nav.querySelector<HTMLElement>(":scope > .lg-glass");
  if (!glass) {
    glass = document.createElement("span");
    glass.className = "lg-glass";
    glass.setAttribute("aria-hidden", "true");
    pill.insertAdjacentElement("afterend", glass);
  }
  return { surface, pill, glass };
}

function clientXToTabPos(host: HTMLElement, clientX: number): number {
  const links = itemsOf(host);
  if (links.length <= 1) return 0;
  const r = host.getBoundingClientRect();
  const sx = (host.offsetWidth || r.width) / (r.width || 1);
  const localX = (clientX - r.left) * sx;
  const centers = links.map((a) => a.offsetLeft + a.offsetWidth / 2);

  if (localX <= centers[0]) {
    const step = centers[1] - centers[0] || 1;
    return (localX - centers[0]) / step;
  }
  const last = centers.length - 1;
  if (localX >= centers[last]) {
    const step = centers[last] - centers[last - 1] || 1;
    return last + (localX - centers[last]) / step;
  }
  for (let i = 0; i < last; i++) {
    if (localX >= centers[i] && localX <= centers[i + 1]) {
      const span = centers[i + 1] - centers[i] || 1;
      return i + (localX - centers[i]) / span;
    }
  }
  return 0;
}

export default function LiquidGlassRig() {
  const { aktif: temaAktif, kaca } = useTema();
  const pillMapRef = useRef<SVGFEImageElement>(null);
  const magnifierMapRef = useRef<SVGFEImageElement>(null);
  const circleMapRef = useRef<SVGFEImageElement>(null);
  const motionRef = useRef<GlassPillMotion | null>(null);
  const navRef = useRef<HTMLElement | null>(null);
  const kontrolRef = useRef(new Map<HTMLElement, GlassPillMotion>());
  const kacaRef = useRef(kaca);
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);
  const router = useRouter();

  useEffect(() => {
    kacaRef.current = kaca;
    pathnameRef.current = pathname;
  }, [kaca, pathname]);

  useEffect(() => {
    document.documentElement.dataset.lgEngine = supportsSvgBackdropLens() ? "svg" : "webkit";
    const pillURI = createBevelDataURI(280, 68, 34, 19);
    const magURI = createBevelDataURI(148, 68, 34, 26);
    const circleURI = createBevelDataURI(96, 96, 48, 20);
    if (pillMapRef.current && pillURI) pillMapRef.current.setAttribute("href", pillURI);
    if (magnifierMapRef.current && magURI) magnifierMapRef.current.setAttribute("href", magURI);
    if (circleMapRef.current && circleURI) circleMapRef.current.setAttribute("href", circleURI);
  }, []);

  useEffect(() => {
    const renderNavFrame = (frame: PillFrame) => {
      const nav = document.querySelector<HTMLElement>(".nav");
      if (!nav || !kacaRef.current.liquidGlass) return;
      const { pill, glass } = ensureNavLayers(nav);
      const links = itemsOf(nav);
      if (links.length === 0) {
        pill.style.opacity = "0";
        glass.style.opacity = "0";
        return;
      }
      gambarKapsul(nav, links, pill, glass, frame, motionRef.current ?? undefined, {
        grow: [10, 10],
        pudarkanDiam: true,
        ringan: kacaRef.current.betterPerformance,
      });
    };

    const kontrol = kontrolRef.current;
    const renderKontrolFrame = (el: HTMLElement, frame: PillFrame) => {
      if (!el.isConnected || !kacaRef.current.liquidGlass) return;
      const items = itemsOf(el);
      if (items.length === 0) return;
      const { pill, glass } = ensureControlLayers(el);
      gambarKapsul(el, items, pill, glass, frame, kontrol.get(el), {
        grow: [8, 6],
        pudarkanDiam: false,
        ringan: kacaRef.current.betterPerformance,
      });
    };

    const syncKontrol = () => {
      for (const [el, m] of kontrol) {
        if (!el.isConnected) {
          m.destroy();
          kontrol.delete(el);
        }
      }
      document.querySelectorAll<HTMLElement>(KONTROL).forEach((el) => {
        const items = itemsOf(el);
        const activeIdx = items.findIndex((b) => b.matches(AKTIF_KONTROL));
        const { pill, glass } = ensureControlLayers(el);
        if (activeIdx < 0 || items[activeIdx].offsetWidth === 0) {
          pill.style.opacity = "0";
          glass.style.opacity = "0";
          kontrol.get(el)?.destroy();
          kontrol.delete(el);
          return;
        }
        let m = kontrol.get(el);
        const baru = !m;
        if (!m) {
          m = new GlassPillMotion(activeIdx, (f) => renderKontrolFrame(el, f));
          kontrol.set(el, m);
        }
        m.physicsEnabled = kacaRef.current.pillPhysics;
        m.reduceMotion = kacaRef.current.reduceMotion;
        if (baru) m.snapTo(activeIdx);
        else if (!m.isDragging) {
          if (activeIdx !== m.index) m.animateTo(activeIdx);
          else if (!m.isAnimating) m.snapTo(activeIdx);
        }
      });
    };

    const syncAll = () => {
      if (!kacaRef.current.liquidGlass) return;

      const nav = document.querySelector<HTMLElement>(".nav");
      if (nav) {
        ensureNavLayers(nav);
        const links = Array.from(nav.querySelectorAll<HTMLAnchorElement>("a[href]"));
        const activeIdx = links.findIndex((a) => a.hasAttribute("aria-current"));

        if (activeIdx >= 0) {
          const isNewNav = navRef.current !== nav || !motionRef.current;
          if (isNewNav) {
            motionRef.current?.destroy();
            navRef.current = nav;
            const m = new GlassPillMotion(activeIdx, renderNavFrame);
            m.physicsEnabled = kacaRef.current.pillPhysics;
            m.reduceMotion = kacaRef.current.reduceMotion;
            motionRef.current = m;
            m.snapTo(activeIdx);
          } else if (motionRef.current) {
            const m = motionRef.current;
            m.physicsEnabled = kacaRef.current.pillPhysics;
            m.reduceMotion = kacaRef.current.reduceMotion;
            if (!m.isDragging) {
              if (activeIdx !== m.index) {
                m.animateTo(activeIdx);
              } else if (!m.isAnimating) {
                // Jangan potong pegas lepas-geser saat aria-current berganti karena pindah halaman.
                m.snapTo(activeIdx);
              }
            }
          }
        }
      } else {
        motionRef.current?.destroy();
        motionRef.current = null;
        navRef.current = null;
      }

      syncKontrol();
    };

    const raf = requestAnimationFrame(syncAll);
    const mo = new MutationObserver(() => {
      requestAnimationFrame(syncAll);
    });
    mo.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["aria-current", "aria-pressed", "aria-checked", "aria-expanded", "data-open"],
    });

    window.addEventListener("resize", syncAll);
    return () => {
      cancelAnimationFrame(raf);
      mo.disconnect();
      window.removeEventListener("resize", syncAll);
      kontrol.forEach((m) => m.destroy());
      kontrol.clear();
    };
  }, [kaca.liquidGlass, kaca.pillPhysics, kaca.reduceMotion, kaca.betterPerformance, pathname, temaAktif]);

  useEffect(() => {
    return () => {
      motionRef.current?.destroy();
    };
  }, []);

  useEffect(() => {
    let lastY = window.scrollY;
    let compact = false;

    interface DragSession {
      host: HTMLElement;
      isNav: boolean;
      pointerId: number;
      startX: number;
      startY: number;
      started: boolean;
    }
    let drag: DragSession | null = null;
    const motionOf = (s: DragSession) => (s.isNav ? motionRef.current : kontrolRef.current.get(s.host)) ?? null;

    const onScroll = () => {
      const y = window.scrollY;
      const dy = y - lastY;
      lastY = y;
      document.documentElement.dataset.lgScrolled = y > 6 ? "true" : "false";

      if (dy > 7 && y > 72 && !compact) {
        compact = true;
        document.documentElement.dataset.lgNavCompact = "true";
      } else if ((dy < -5 || y <= 24) && compact) {
        compact = false;
        document.documentElement.dataset.lgNavCompact = "false";
      }
    };

    const onDragStart = (e: DragEvent) => {
      if ((e.target as HTMLElement | null)?.closest?.(".nav")) {
        e.preventDefault();
      }
    };

    const onPointerDown = (e: PointerEvent) => {
      if (!kacaRef.current.liquidGlass || !kacaRef.current.pillPhysics) return;
      if (e.button !== 0) return;
      const host = (e.target as HTMLElement | null)?.closest?.(`.nav, ${KONTROL}`) as HTMLElement | null;
      if (!host) return;
      const isNav = host.classList.contains("nav");
      if (!isNav) {
        const items = itemsOf(host);
        if (items.length < 2 || !satuBaris(items) || items.some((b) => (b as HTMLButtonElement).disabled)) return;
      }

      drag = {
        host,
        isNav,
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        started: false,
      };
    };

    const onPointerMove = (e: PointerEvent) => {
      if (drag && drag.pointerId === e.pointerId) {
        const dx = e.clientX - drag.startX;
        const dy = e.clientY - drag.startY;
        const maxIdx = Math.max(0, itemsOf(drag.host).length - 1);
        const m = motionOf(drag);

        if (!drag.started) {
          if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) {
            drag = null;
          } else if (Math.abs(dx) > 5 && m) {
            drag.started = true;
            try {
              drag.host.setPointerCapture(e.pointerId);
            } catch {
              /* ignore */
            }
            const pos = clientXToTabPos(drag.host, e.clientX);
            m.startDrag(pos);
            m.dragTo(pos, maxIdx);
          }
        } else if (m) {
          const pos = clientXToTabPos(drag.host, e.clientX);
          m.dragTo(pos, maxIdx);
        }
      }

      if (e.pointerType === "touch") return;
      const nav = document.querySelector<HTMLElement>(".nav");
      if (!nav) return;
      const r = nav.getBoundingClientRect();
      const sx = (nav.offsetWidth || r.width) / (r.width || 1);
      const sy = (nav.offsetHeight || r.height) / (r.height || 1);
      const x = (e.clientX - r.left) * sx;
      const y = (e.clientY - r.top) * sy;
      const odx = Math.max(r.left - e.clientX, 0, e.clientX - r.right);
      const ody = Math.max(r.top - e.clientY, 0, e.clientY - r.bottom);
      const dist = Math.hypot(odx, ody);
      const proximityRadius = 28;
      const alpha = dist === 0 ? 1 : dist < proximityRadius ? 1 - dist / proximityRadius : 0;

      nav.style.setProperty("--lg-x", `${x.toFixed(1)}px`);
      nav.style.setProperty("--lg-y", `${y.toFixed(1)}px`);
      nav.style.setProperty("--lg-alpha", alpha.toFixed(3));
    };

    const finishPointer = (e: PointerEvent, cancelled: boolean) => {
      if (!drag || drag.pointerId !== e.pointerId) return;
      const session = drag;
      drag = null;

      const m = motionOf(session);
      if (!session.started || !m) return;

      const links = itemsOf(session.host);
      delete session.host.dataset.lgDragging;
      links.forEach((a) => {
        delete a.dataset.pillAim;
      });

      if (cancelled) {
        m.release(m.index);
        return;
      }

      const pos = clientXToTabPos(session.host, e.clientX);
      const targetIdx = Math.max(0, Math.min(links.length - 1, Math.round(pos)));
      m.release(targetIdx);

      // Kontrol segmen: pilih tombol tujuan lewat klik programatik (state React yang mengubah aria-pressed/checked).
      if (!session.isNav) {
        const tujuan = links[targetIdx];
        if (tujuan && !tujuan.matches(AKTIF_KONTROL)) tujuan.click();
      }

      // Telan klik bawaan dari pointerup supaya tombol/tautan di bawah jari tidak ikut terpicu.
      const eatClick = (ce: MouseEvent) => {
        ce.preventDefault();
        ce.stopPropagation();
      };
      window.addEventListener("click", eatClick, true);
      window.setTimeout(() => window.removeEventListener("click", eatClick, true), 90);
      if (!session.isNav) return;

      const href = links[targetIdx]?.getAttribute("href");
      if (href) {
        const cleanCurrent = pathnameRef.current.length > 1 ? pathnameRef.current.replace(/\/+$/, "") : pathnameRef.current;
        if (href !== cleanCurrent) {
          router.push(href);
        }
      }
    };

    const onPointerUp = (e: PointerEvent) => finishPointer(e, false);
    const onPointerCancel = (e: PointerEvent) => finishPointer(e, true);

    const onPointerLeaveWindow = () => {
      const nav = document.querySelector<HTMLElement>(".nav");
      if (nav) nav.style.setProperty("--lg-alpha", "0");
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("dragstart", onDragStart);
    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerCancel);
    document.addEventListener("mouseleave", onPointerLeaveWindow);
    return () => {
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("dragstart", onDragStart);
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerCancel);
      document.removeEventListener("mouseleave", onPointerLeaveWindow);
    };
  }, [router]);

  return (
    <>
      <svg width="0" height="0" style={{ position: "fixed", pointerEvents: "none" }} aria-hidden="true">
        <defs>
          <filter id="ios26-bevel-lens" x="-12%" y="-12%" width="124%" height="124%" colorInterpolationFilters="sRGB">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4.5" edgeMode="duplicate" result="blurred" />
            <feImage ref={pillMapRef} x="0%" y="0%" width="100%" height="100%" preserveAspectRatio="none" result="bevel" />
            {/* Badan navbar tanpa pelangi RGB: pemisahan kanal di sini memunculkan garis biru/kuning di tepi atas */}
            <feDisplacementMap in="blurred" in2="bevel" scale="-24" xChannelSelector="R" yChannelSelector="G" />
          </filter>

          {/* objectBoundingBox: peta lensa menempel tepat di kapsul; userSpaceOnUse membuat isi kapsul turun & tidak sejajar */}
          <filter
            id="ios26-pill-magnifier"
            x="-14%"
            y="-18%"
            width="128%"
            height="136%"
            primitiveUnits="objectBoundingBox"
            colorInterpolationFilters="sRGB"
          >
            <feImage ref={magnifierMapRef} x="0" y="0" width="1" height="1" preserveAspectRatio="none" result="mag" />
            <feDisplacementMap in="SourceGraphic" in2="mag" scale="-0.1" xChannelSelector="R" yChannelSelector="G" result="lens" />
            {/* Pelangi RGB: merah & biru digeser ±~1px (relatif ukuran kapsul) di sekitar hijau, tanpa menggeser isi */}
            <feOffset in="lens" dx="-0.01" dy="-0.017" result="mR" />
            <feOffset in="lens" dx="0.01" dy="0.017" result="mB" />
            <feColorMatrix in="mR" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="mcR" />
            <feColorMatrix in="lens" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="mcG" />
            <feColorMatrix in="mB" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="mcB" />
            <feBlend in="mcR" in2="mcG" mode="screen" result="mRG" />
            <feBlend in="mRG" in2="mcB" mode="screen" />
          </filter>

          <filter id="ios26-bevel-circle" x="-12%" y="-12%" width="124%" height="124%" colorInterpolationFilters="sRGB">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4.2" edgeMode="duplicate" result="blurredC" />
            <feImage ref={circleMapRef} x="0%" y="0%" width="100%" height="100%" preserveAspectRatio="none" result="bevelC" />
            <feDisplacementMap in="blurredC" in2="bevelC" scale="-16" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
      </svg>

      <div className="lg-prog-blur" aria-hidden="true">
        <span className="b1" />
        <span className="b2" />
        <span className="b3" />
        <span className="b4" />
      </div>
    </>
  );
}
