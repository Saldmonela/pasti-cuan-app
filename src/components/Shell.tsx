"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { IconArrowsExchange, IconChartPie, IconDots, IconHome, IconLayoutDashboard } from "@tabler/icons-react";
import { useStore } from "@/lib/store";
import { catatKunjungan, GagalMuat, Memuat, Toast } from "./ui";
import ProtoPanel from "./ProtoPanel";

// Alur uang yang butuh fokus: tanpa navbar, cukup tombol kembali (DESIGN.md, Navigasi).
const TANPA_NAV = ["/setor", "/tarik"];
// Sub-halaman yang tidak berada di bawah tab-nya sendiri: tab induk mana yang menyala.
const INDUK: Record<string, string> = { "/log": "/lainnya" };

/** Kerangka aplikasi: kolom satu (maks. 480px) di atas kanvas sage, navigasi pil melayang. */
export default function Shell({ children }: { children: ReactNode }) {
  const { siap, saya, menunggu, arusBelumCount, skenario } = useStore();
  // Badge Kelola: permintaan menunggu + arus onchain yang belum dicocokkan (PRD 3.2, Navigasi)
  const tugas = menunggu.length + arusBelumCount;
  // Build preview memakai trailingSlash ("/pool/"), dev tidak ("/pool"): samakan dulu.
  const mentah = usePathname();
  const path = mentah.length > 1 ? mentah.replace(/\/+$/, "") : mentah;
  const router = useRouter();

  useEffect(() => {
    if (siap && !saya && skenario !== "gagal") router.replace("/masuk");
  }, [siap, saya, skenario, router]);

  // Hitung perpindahan halaman di dalam app, supaya tombol kembali tahu ada halaman sebelumnya.
  useEffect(() => {
    catatKunjungan();
  }, [path]);

  const pengelola = saya?.peran === "pengelola";
  const item = [
    { href: "/", label: "Beranda", Icon: IconHome },
    { href: "/pool", label: "Pool", Icon: IconChartPie },
    { href: "/permintaan", label: "Transaksi", Icon: IconArrowsExchange },
    ...(pengelola ? [{ href: "/kelola", label: "Kelola", Icon: IconLayoutDashboard }] : []),
    { href: "/lainnya", label: "Lainnya", Icon: IconDots },
  ];
  const tabDari = (p: string) => INDUK[p] ?? item.map((x) => x.href).find((h) => h !== "/" && (p === h || p.startsWith(h + "/"))) ?? "/";
  const tabAktif = tabDari(path);
  // "page" bila memang di halaman tab itu; "true" bila sedang di sub-halamannya
  const status = (h: string) => (h !== tabAktif ? undefined : h === path ? ("page" as const) : ("true" as const));
  const tampilNav = !TANPA_NAV.includes(path);

  // Data awal tersedia sejak render server atau dimuat via /api/posisi. Saat gagal muat sebelum sesi terbaca, beri tombol muat ulang.
  if (!saya) {
    if (siap && skenario === "gagal") {
      return (
        <div className="app">
          <div className="col">
            <header className="hd">
              <div>
                <h1>Pasti Cuan</h1>
              </div>
            </header>
            <main>
              <GagalMuat />
            </main>
          </div>
        </div>
      );
    }
    return (
      <div className="app">
        <div className="col" aria-busy="true">
          <header className="hd" aria-hidden="true">
            <div style={{ flex: 1 }}>
              <div className="sk" style={{ width: 140, height: 26 }} />
              <div className="sk" style={{ width: 220, height: 12, marginTop: 8 }} />
            </div>
            <div className="sk" style={{ width: 36, height: 36, borderRadius: 999 }} />
          </header>
          <main>
            <Memuat kartu={3} />
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="col">
        {children}
        {tampilNav && (
          <nav className="nav" aria-label="Navigasi utama">
            {item.map(({ href, label, Icon }) => (
              <Link key={href} href={href} aria-current={status(href)}>
                <Icon size={20} aria-hidden="true" />
                {label}
                {href === "/kelola" && tugas > 0 && (
                  <span className="badge" aria-label={`${menunggu.length} permintaan menunggu, ${arusBelumCount} transfer belum dicocokkan`}>
                    {tugas}
                  </span>
                )}
              </Link>
            ))}
          </nav>
        )}
      </div>
      <Toast />
      <ProtoPanel />
    </div>
  );
}
