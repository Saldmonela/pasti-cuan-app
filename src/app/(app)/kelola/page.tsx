"use client";
// Kelola (hub pengelola): tugas hari ini dan menu kelola.
import Link from "next/link";
import {
  IconAdjustmentsHorizontal,
  IconChevronRight,
  IconClipboardList,
  IconDatabaseImport,
  IconScale,
  IconUsers,
} from "@tabler/icons-react";
import { KhususPengelola, PageHeader, StatusBanners } from "@/components/ui";
import { tanggal, usd } from "@/lib/format";
import { useStore } from "@/lib/store";

export default function Kelola() {
  const { saya, menunggu, data, hariIni, hasil, nama, cekGagal } = useStore();
  if (!saya) return null;
  if (saya.peran !== "pengelola") return (<><PageHeader judul="Kelola" /><main><KhususPengelola /></main></>);
  const saldoHariIni = data.snapshots.some((s) => s.tanggal === hariIni);

  return (
    <>
      <PageHeader judul="Kelola" />
      <main>
        <StatusBanners />
        <section className="card" aria-labelledby="tugas">
          <h2 id="tugas">Yang perlu dikerjakan</h2>
          <ul className="rows">
            <li>
              <span className="ico-dot" aria-hidden="true"><IconScale size={18} /></span>
              <div className="main">
                <div className="t">Saldo {tanggal(hariIni)}</div>
                <div className="s">{saldoHariIni ? "Sudah dicatat. Semua posisi sudah diperbarui." : "Belum dicatat. Isi dari total wallet di Jupiter."}</div>
              </div>
              {!saldoHariIni && <Link href="/kelola/saldo" className="btn pri sm">Catat</Link>}
            </li>
            <li>
              <span className="ico-dot" aria-hidden="true"><IconClipboardList size={18} /></span>
              <div className="main">
                <div className="t">{menunggu.length ? `${menunggu.length} permintaan menunggu` : "Belum ada permintaan."}</div>
                {menunggu.slice(0, 3).map((p) => (
                  <div className="s" key={p.id}>
                    {nama(p.anggotaId)} · {p.jenis === "setor" ? "setor" : "tarik"} {usd(p.jumlahUsd)}
                  </div>
                ))}
              </div>
              {menunggu.length > 0 && <Link href="/kelola/permintaan" className="btn ton sm">Proses</Link>}
            </li>
            <li>
              <span className="ico-dot" aria-hidden="true"><IconScale size={18} /></span>
              <div className="main">
                <div className="t">Cek data</div>
                <div className={`s ${cekGagal ? "dn" : "up"}`}>{cekGagal ? "Ada masalah. Penarikan baru diblokir sampai beres." : "Semua cek lolos."}</div>
              </div>
              <Link href="/pool" className="btn ghost sm">Lihat</Link>
            </li>
          </ul>
        </section>

        <section className="card" aria-label="Menu kelola">
          <ul className="menu">
            {[
              { href: "/kelola/saldo", Icon: IconScale, t: "Saldo harian", s: `${data.snapshots.length} saldo tercatat` },
              { href: "/kelola/permintaan", Icon: IconClipboardList, t: "Permintaan", s: "Konfirmasi, selesaikan, atau tolak" },
              { href: "/kelola/anggota", Icon: IconUsers, t: "Anggota", s: `${data.anggota.filter((a) => a.aktif).length} anggota aktif` },
              { href: "/kelola/impor", Icon: IconDatabaseImport, t: "Impor riwayat", s: "Dari template CSV" },
              {
                href: "/kelola/pengaturan",
                Icon: IconAdjustmentsHorizontal,
                t: "Pengaturan pool",
                s: `Fee ${data.pengaturan.feePersen * 100}% dari untung, basis ${data.pengaturan.satuanDasarFee}`,
              },
            ].map(({ href, Icon, t, s }) => (
              <li key={href}>
                <Link href={href}>
                  <span className="ico-dot"><Icon size={18} aria-hidden="true" /></span>
                  <span className="t"><span>{t}</span><small>{s}</small></span>
                  <IconChevronRight className="chev" size={18} aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
        <p className="note" style={{ padding: "0 4px" }}>
          Fee terutang dari investor saat ini {usd(hasil.pengelola.feeTerutangTotal)}. Fee baru jadi milikmu (dalam bentuk unit) saat investor menarik.
        </p>
      </main>
    </>
  );
}
