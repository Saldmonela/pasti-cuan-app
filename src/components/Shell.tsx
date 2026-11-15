"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { IconArrowsExchange, IconChartPie, IconDots, IconHome, IconLayoutDashboard } from "@tabler/icons-react";
import { useStore } from "@/lib/store";
import { Toast } from "./ui";
import ProtoPanel from "./ProtoPanel";

const TAB = ["/", "/pool", "/permintaan", "/kelola", "/lainnya"];

/** Kerangka aplikasi: kolom satu (maks. 480px) di atas kanvas sage, navigasi pil melayang. */
export default function Shell({ children }: { children: ReactNode }) {
  const { siap, saya, menunggu } = useStore();
  const path = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (siap && !saya) router.replace("/masuk");
  }, [siap, saya, router]);

  const pengelola = saya?.peran === "pengelola";
  const item = [
    { href: "/", label: "Beranda", Icon: IconHome },
    { href: "/pool", label: "Pool", Icon: IconChartPie },
    { href: "/permintaan", label: "Transaksi", Icon: IconArrowsExchange },
    ...(pengelola ? [{ href: "/kelola", label: "Kelola", Icon: IconLayoutDashboard }] : []),
    { href: "/lainnya", label: "Lainnya", Icon: IconDots },
  ];
  const aktif = (h: string) => (h === "/" ? path === "/" : path === h || path.startsWith(h + "/"));
  const tampilNav = TAB.includes(path);

  // Data awal tersedia sejak render server, jadi halaman langsung dirender. Yang ditahan hanya saat belum masuk.
  if (!saya) {
    return (
      <div className="app">
        <div className="col" aria-busy="true" />
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
              <Link key={href} href={href} aria-current={aktif(href) ? "page" : undefined}>
                <Icon size={20} aria-hidden="true" />
                {label}
                {href === "/kelola" && menunggu.length > 0 && (
                  <span className="badge" aria-label={`${menunggu.length} permintaan menunggu`}>
                    {menunggu.length}
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
