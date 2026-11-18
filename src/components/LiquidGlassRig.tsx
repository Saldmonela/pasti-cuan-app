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

function syncControlPill(container: HTMLElement, activeSelector: string, reduceMotion: boolean) {
  const active = container.querySelector<HTMLElement>(activeSelector);
  let pill = container.querySelector<HTMLElement>(":scope > .lg-slider");

  if (!active || active.offsetWidth === 0) {
    if (pill) pill.style.opacity = "0";
    return;
  }

  const isFirst = !pill || pill.style.opacity === "0";
  if (!pill) {
    pill = document.createElement("span");
    pill.className = "lg-slider";
    pill.setAttribute("aria-hidden", "true");
    container.prepend(pill);
  }

  const nextLeft = active.offsetLeft;
  const nextTop = active.offsetTop;
  const nextW = active.offsetWidth;
  const nextH = active.offsetHeight;

  const prevLeft = Number(pill.dataset.x ?? nextLeft);
  const moved = !isFirst && Math.abs(nextLeft - prevLeft) > 2;

  pill.dataset.x = String(nextLeft);
  pill.style.opacity = "1";
  pill.style.width = `${nextW}px`;
  pill.style.height = `${nextH}px`;

  if (isFirst || reduceMotion) {
    pill.style.transition = "none";
    pill.style.transform = `translate3d(${nextLeft}px, ${nextTop}px, 0) scale(1, 1)`;
    pill.getBoundingClientRect();
    pill.style.transition = reduceMotion ? "none" : "";
    return;
  }

  if (moved) {
    pill.style.transform = `translate3d(${nextLeft}px, ${nextTop}px, 0) scaleX(1.06) scaleY(0.95)`;
    window.clearTimeout(Number(pill.dataset.t || 0));
    const tid = window.setTimeout(() => {
      if (pill) pill.style.transform = `translate3d(${nextLeft}px, ${nextTop}px, 0) scale(1, 1)`;
    }, 150);
    pill.dataset.t = String(tid);
  } else {
    pill.style.transform = `translate3d(${nextLeft}px, ${nextTop}px, 0) scale(1, 1)`;
  }
}

function ensureNavLayers(nav: HTMLElement): { surface: HTMLElement; pill: HTMLElement } {
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
  return { surface, pill };
}

function clientXToTabPos(nav: HTMLElement, clientX: number): number {
  const links = Array.from(nav.querySelectorAll<HTMLAnchorElement>("a[href]"));
  if (links.length <= 1) return 0;
  const r = nav.getBoundingClientRect();
  const sx = (nav.offsetWidth || r.width) / (r.width || 1);
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
      const { pill } = ensureNavLayers(nav);
      const links = Array.from(nav.querySelectorAll<HTMLAnchorElement>("a[href]"));
      if (links.length === 0) {
        pill.style.opacity = "0";
        return;
      }

      const maxIdx = links.length - 1;
      const firstCenter = links[0].offsetLeft + links[0].offsetWidth / 2;
      const lastCenter = links[maxIdx].offsetLeft + links[maxIdx].offsetWidth / 2;
      const stepPx = maxIdx > 0 ? (lastCenter - firstCenter) / maxIdx : links[0].offsetWidth;
      if (motionRef.current) motionRef.current.stepPx = stepPx;

      const clamped = Math.max(0, Math.min(maxIdx, frame.position));
      const i0 = Math.floor(clamped);
      const i1 = Math.min(maxIdx, i0 + 1);
      const t = clamped - i0;
      const over = frame.position - clamped;

      const a0 = links[i0];
      const a1 = links[i1];
      const cx0 = a0.offsetLeft + a0.offsetWidth / 2;
      const cx1 = a1.offsetLeft + a1.offsetWidth / 2;
      const cy0 = a0.offsetTop + a0.offsetHeight / 2;
      const cy1 = a1.offsetTop + a1.offsetHeight / 2;

      const cx = cx0 + (cx1 - cx0) * t + over * stepPx;
      const cy = cy0 + (cy1 - cy0) * t;
      const restW = a0.offsetWidth + (a1.offsetWidth - a0.offsetWidth) * t;
      const restH = a0.offsetHeight + (a1.offsetHeight - a0.offsetHeight) * t;

      const growW = 10;
      const growH = 10;
      const liveW = Math.max(24, (restW + growW * frame.liftX) * (1 + frame.deviation));
      const liveH = Math.max(24, (restH + growH * frame.liftY) * (1 - frame.deviation));
      const x = cx - liveW / 2;
      const y = cy - liveH / 2;

      pill.style.opacity = "1";
      pill.style.width = `${liveW.toFixed(2)}px`;
      pill.style.height = `${liveH.toFixed(2)}px`;
      pill.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`;
      pill.style.setProperty("--pill-material", frame.material.toFixed(3));
      pill.style.setProperty("--pill-presence", frame.glassPresence.toFixed(3));
      pill.style.setProperty("--pill-rim", frame.rimAlpha.toFixed(3));
      pill.dataset.lifted = frame.glassPresence > 0.025 ? "true" : "false";

      if (frame.isDragging) {
        nav.dataset.lgDragging = "true";
        const aimIdx = Math.round(clamped);
        links.forEach((a, idx) => {
          if (idx === aimIdx) a.dataset.pillAim = "true";
          else delete a.dataset.pillAim;
        });
      } else if (nav.dataset.lgDragging === "true") {
        delete nav.dataset.lgDragging;
        links.forEach((a) => {
          delete a.dataset.pillAim;
        });
      }
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
              } else {
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

      document.querySelectorAll<HTMLElement>(".seg").forEach((el) => {
        syncControlPill(el, 'button[aria-pressed="true"], button[aria-checked="true"]', kacaRef.current.reduceMotion);
      });
      document.querySelectorAll<HTMLElement>(".tabs").forEach((el) => {
        syncControlPill(el, 'button[aria-pressed="true"]', kacaRef.current.reduceMotion);
      });
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
      nav: HTMLElement;
      pointerId: number;
      startX: number;
      startY: number;
      started: boolean;
    }
    let drag: DragSession | null = null;

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
      const nav = (e.target as HTMLElement | null)?.closest?.(".nav") as HTMLElement | null;
      if (!nav) return;

      drag = {
        nav,
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
        const links = Array.from(drag.nav.querySelectorAll<HTMLAnchorElement>("a[href]"));
        const maxIdx = Math.max(0, links.length - 1);

        if (!drag.started) {
          if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) {
            drag = null;
          } else if (Math.abs(dx) > 5 && motionRef.current) {
            drag.started = true;
            try {
              drag.nav.setPointerCapture(e.pointerId);
            } catch {
              /* ignore */
            }
            const pos = clientXToTabPos(drag.nav, e.clientX);
            motionRef.current.startDrag(pos);
            motionRef.current.dragTo(pos, maxIdx);
          }
        } else if (motionRef.current) {
          const pos = clientXToTabPos(drag.nav, e.clientX);
          motionRef.current.dragTo(pos, maxIdx);
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

      if (!session.started || !motionRef.current) return;

      delete session.nav.dataset.lgDragging;
      session.nav.querySelectorAll<HTMLElement>("a[href]").forEach((a) => {
        delete a.dataset.pillAim;
      });

      if (cancelled) {
        motionRef.current.release(motionRef.current.index);
        return;
      }

      const eatClick = (ce: MouseEvent) => {
        ce.preventDefault();
        ce.stopPropagation();
      };
      window.addEventListener("click", eatClick, true);
      window.setTimeout(() => window.removeEventListener("click", eatClick, true), 90);

      const links = Array.from(session.nav.querySelectorAll<HTMLAnchorElement>("a[href]"));
      const pos = clientXToTabPos(session.nav, e.clientX);
      const targetIdx = Math.max(0, Math.min(links.length - 1, Math.round(pos)));
      motionRef.current.release(targetIdx);

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
            <feDisplacementMap in="blurred" in2="bevel" scale="-25.5" xChannelSelector="R" yChannelSelector="G" result="dispR" />
            <feDisplacementMap in="blurred" in2="bevel" scale="-24" xChannelSelector="R" yChannelSelector="G" result="dispG" />
            <feDisplacementMap in="blurred" in2="bevel" scale="-22.5" xChannelSelector="R" yChannelSelector="G" result="dispB" />
            <feColorMatrix in="dispR" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="chR" />
            <feColorMatrix in="dispG" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="chG" />
            <feColorMatrix in="dispB" type="matrix" values="0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="chB" />
            <feBlend in="chR" in2="chG" mode="screen" result="rg" />
            <feBlend in="rg" in2="chB" mode="screen" />
          </filter>

          <filter id="ios26-pill-magnifier" x="-14%" y="-18%" width="128%" height="136%" colorInterpolationFilters="sRGB">
            <feImage ref={magnifierMapRef} x="0%" y="0%" width="100%" height="100%" preserveAspectRatio="none" result="mag" />
            <feDisplacementMap in="SourceGraphic" in2="mag" scale="-19" xChannelSelector="R" yChannelSelector="G" result="mR" />
            <feDisplacementMap in="SourceGraphic" in2="mag" scale="-17.5" xChannelSelector="R" yChannelSelector="G" result="mG" />
            <feDisplacementMap in="SourceGraphic" in2="mag" scale="-16" xChannelSelector="R" yChannelSelector="G" result="mB" />
            <feColorMatrix in="mR" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="mcR" />
            <feColorMatrix in="mG" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="mcG" />
            <feColorMatrix in="mB" type="matrix" values="0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="mcB" />
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
