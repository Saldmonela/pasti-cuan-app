"use client";
// Kelola (hub pengelola): tugas hari ini dan menu kelola.
import Link from "next/link";
import {
  IconAdjustmentsHorizontal,
  IconAlertTriangle,
  IconArrowsExchange,
  IconChevronRight,
  IconClipboardList,
  IconDatabaseImport,
  IconScale,
  IconUsers,
} from "@tabler/icons-react";
import { KhususPengelola, PageHeader, StatusBanners } from "@/components/ui";
import { tanggal, usd } from "@/lib/format";
import { msSnapshot } from "@/lib/onchain";
import { useStore } from "@/lib/store";

export default function Kelola() {
  const { saya, menunggu, data, hariIni, hasil, nama, cekGagal, arusBelum, sekarang } = useStore();
  if (!saya) return null;
  if (saya.peran !== "pengelola") return (<><PageHeader judul="Kelola" /><main><KhususPengelola /></main></>);
  const jam = data.pengaturan.jamSnapshot;
  const snap = data.snapshots.find((s) => s.tanggal === hariIni);
  // BR-18: belum ada titik nilai sampai 08.30 -> pengelola diberi tahu untuk mengisi manual
  const gagalOtomatis = !snap && sekarang >= msSnapshot(hariIni, jam) + 30 * 60_000;
  // AC-02-03: lonjakan > ambang tanpa transaksi pada snapshot otomatis dikirim sebagai peringatan
  const urut = [...data.snapshots].sort((a, b) => (a.tanggal < b.tanggal ? -1 : 1));
  const akhir = urut.at(-1);
  const sebelum = urut.at(-2);
  const lonjakan =
    akhir?.sumber === "otomatis" && sebelum && !data.permintaan.some((p) => p.status === "selesai" && p.tanggalEfektif === akhir.tanggal)
      ? (Math.abs(akhir.nilaiUsd - sebelum.nilaiUsd) / sebelum.nilaiUsd) * 100
      : 0;

  return (
    <>
      <PageHeader judul="Kelola" />
      <main>
        <StatusBanners />
        <section className="card" aria-labelledby="tugas">
          <h2 id="tugas">Yang perlu dikerjakan</h2>
          <ul className="rows">
            <li>
              <span className="ico-dot" aria-hidden="true"><IconArrowsExchange size={18} /></span>
              <div className="main">
                <div className="t">{arusBelum.length ? `${arusBelum.length} transfer belum dicocokkan` : "Semua transfer sudah dicocokkan."}</div>
                {arusBelum.slice(0, 3).map((a) => (
                  <div className="s" key={a.id}>
                    {a.arah === "masuk" ? "Masuk" : "Keluar"} {usd(a.nilaiUsd)} · {a.waktu.slice(11, 16).replace(":", ".")} WIB
                  </div>
                ))}
              </div>
              {arusBelum.length > 0 && <Link href="/kelola/arus" className="btn pri sm">Cocokkan</Link>}
            </li>
            <li>
              <span className="ico-dot" aria-hidden="true"><IconScale size={18} /></span>
              <div className="main">
                <div className="t">Snapshot {tanggal(hariIni)}</div>
                <div className={`s${gagalOtomatis ? " dn" : ""}`}>
                  {snap
                    ? snap.sumber === "otomatis"
                      ? `Dibuat otomatis ${jam.replace(":", ".")} WIB dari pembacaan wallet.`
                      : "Sudah dicatat. Semua posisi sudah diperbarui."
                    : gagalOtomatis
                      ? `Pembacaan wallet gagal sampai ${jam.replace(":00", ".30")} WIB. Isi snapshot manual.`
                      : `Dibuat otomatis jam ${jam.replace(":", ".")} WIB.`}
                </div>
              </div>
              {gagalOtomatis && <Link href="/kelola/saldo" className="btn pri sm">Isi manual</Link>}
            </li>
            {lonjakan > data.pengaturan.ambangLonjakanPersen && akhir && (
              <li>
                <span className="ico-dot" aria-hidden="true"><IconAlertTriangle size={18} /></span>
                <div className="main">
                  <div className="t">Cek snapshot {tanggal(akhir.tanggal)}</div>
                  <div className="s">
                    Saldo berubah {Math.round(lonjakan)}% dari kemarin tanpa ada setoran atau penarikan. Yakin angkanya benar? Selesaikan transaksi
                    yang transfernya sudah dicocokkan, atau koreksi snapshot.
                  </div>
                </div>
                <Link href="/kelola/saldo" className="btn ghost sm">Cek</Link>
              </li>
            )}
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
              { href: "/kelola/arus", Icon: IconArrowsExchange, t: "Arus onchain", s: `${arusBelum.length} belum dicocokkan` },
              { href: "/kelola/saldo", Icon: IconScale, t: "Snapshot saldo", s: `Otomatis tiap ${jam.replace(":", ".")} WIB · ${data.snapshots.length} tersimpan` },
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
