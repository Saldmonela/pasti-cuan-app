"use client";
// Transaksi: status permintaan setor/tarik milik saya (route /permintaan, PRD 3.2) + riwayat yang sudah selesai.
import Link from "next/link";
import { useState } from "react";
import { IconArrowDownLeft, IconArrowUpRight, IconChevronRight, IconPlus } from "@tabler/icons-react";
import { GagalMuat, Memuat, PageHeader, Sheet, StatusBanners, StatusChip } from "@/components/ui";
import { tanggal, usd, waktu } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { Permintaan, Status } from "@/lib/types";

type Filter = "menunggu" | "selesai" | "semua";
type Cakupan = "semua" | "saya";

export default function Transaksi() {
  const { saya, data, nama, batalkan, tampilkan, skenario, offline } = useStore();
  const [f, setF] = useState<Filter>("semua");
  const [cakupan, setCakupan] = useState<Cakupan>("semua");
  const [batal, setBatal] = useState<Permintaan | null>(null);
  const [err, setErr] = useState("");
  if (!saya) return null;
  if (skenario === "memuat") return (<><PageHeader judul="Transaksi" /><main><Memuat kartu={2} /></main></>);
  if (skenario === "gagal") return (<><PageHeader judul="Transaksi" /><main><GagalMuat /></main></>);

  const sumber = (cakupan === "saya" ? data.permintaan.filter((p) => p.anggotaId === saya.id) : data.permintaan)
    .slice()
    .sort((a, b) => ((b.waktuEfektif ?? b.tanggalEfektif ?? b.dibuatPada) > (a.waktuEfektif ?? a.tanggalEfektif ?? a.dibuatPada) ? 1 : -1))
    .sort((a, b) => Number(b.status === "menunggu") - Number(a.status === "menunggu"));
  const cocok = (s: Status) => (f === "semua" ? true : f === "menunggu" ? s === "menunggu" : s !== "menunggu");
  const daftar = sumber.filter((p) => cocok(p.status));
  const n = (x: Filter) => sumber.filter((p) => (x === "semua" ? true : x === "menunggu" ? p.status === "menunggu" : p.status !== "menunggu")).length;

  return (
    <>
      <PageHeader judul="Transaksi" stamp={false} />
      <main>
        <StatusBanners />
        <div className="tabs" role="group" aria-label="Cakupan anggota" style={{ marginBottom: 8 }}>
          <button type="button" aria-pressed={cakupan === "semua"} onClick={() => setCakupan("semua")}>Semua anggota</button>
          <button type="button" aria-pressed={cakupan === "saya"} onClick={() => setCakupan("saya")}>Milik saya</button>
        </div>
        <div className="tabs" role="group" aria-label="Saring transaksi">
          {(["semua", "menunggu", "selesai"] as Filter[]).map((x) => (
            <button key={x} type="button" aria-pressed={f === x} onClick={() => setF(x)}>
              {x === "semua" ? "Semua" : x === "menunggu" ? "Menunggu" : "Diproses"}
              <span className="n">{n(x)}</span>
            </button>
          ))}
        </div>

        <section className="card" aria-label="Daftar transaksi">
          {daftar.length === 0 ? (
            <div className="empty">
              <p style={{ fontWeight: 600 }}>{f === "menunggu" ? "Tidak ada permintaan yang menunggu." : "Belum ada transaksi."}</p>
              <p className="note">Setoran dan penarikan yang kamu ajukan akan muncul di sini beserta statusnya.</p>
              <div className="btn-row" style={{ width: "100%" }}>
                <Link href="/setor" className="btn pri sm">
                  <IconPlus size={18} aria-hidden="true" />
                  Setor
                </Link>
                <Link href="/tarik" className="btn ton sm">
                  <IconArrowUpRight size={18} aria-hidden="true" />
                  Tarik
                </Link>
              </div>
            </div>
          ) : (
            <ul className="rows">
              {daftar.map((p) => (
                <li key={p.id}>
                  <span className="ico-dot" aria-hidden="true">
                    {p.jenis === "setor" ? <IconArrowDownLeft size={18} /> : <IconArrowUpRight size={18} />}
                  </span>
                  <div className="main">
                    <div className="t">
                      {p.jenis === "setor" ? "Setoran" : "Penarikan"}
                      {cakupan === "semua" ? ` · ${nama(p.anggotaId)}` : ""}
                      <StatusChip s={p.status} />
                    </div>
                    <div className="s">
                      {p.status === "selesai"
                        ? `Efektif ${p.waktuEfektif ? waktu(p.waktuEfektif) : tanggal(p.tanggalEfektif!)}${p.sumber === "impor" ? " · dari impor riwayat" : ""}`
                        : `Diajukan ${waktu(p.dibuatPada)}`}
                    </div>
                    {p.status === "selesai" && p.jumlahFinalUsd !== undefined && Math.abs(p.jumlahFinalUsd - p.jumlahUsd) > 0.004 && (
                      <div className="s">
                        Diajukan {usd(p.jumlahUsd)}, {p.jenis === "setor" ? "diterima" : "dikirim"} {usd(p.jumlahFinalUsd)}. Alasan: {p.alasan}
                      </div>
                    )}
                    {p.status === "ditolak" && <div className="s dn">Ditolak: {p.alasan}</div>}
                    {p.status === "menunggu" && data.arus.some((a) => a.permintaanId === p.id) && (
                      <div className="s up">Transfer sudah terlihat di wallet. Menunggu pencocokan pengelola.</div>
                    )}
                    {p.catatan && <div className="s">Catatan: {p.catatan}</div>}
                    {p.status === "menunggu" && p.anggotaId === saya.id && (
                      <div className="acts">
                        <button type="button" className="btn ghost sm" disabled={offline} onClick={() => { setErr(""); setBatal(p); }}>
                          Batalkan
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="v">{usd(p.jumlahFinalUsd ?? p.jumlahUsd)}</div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <Link href="/log" className="card" style={{ display: "flex", alignItems: "center", gap: 12, textDecoration: "none" }}>
          <span style={{ flex: 1 }}>
            <b style={{ fontWeight: 600 }}>Log perubahan</b>
            <span className="note" style={{ display: "block" }}>Siapa mengubah apa dan kapan. Bisa dilihat semua anggota.</span>
          </span>
          <IconChevronRight size={18} aria-hidden="true" />
        </Link>
      </main>

      <Sheet buka={!!batal} onTutup={() => setBatal(null)} judul="Batalkan permintaan?">
        {batal && (
          <p style={{ fontSize: 15 }}>
            {batal.jenis === "setor" ? "Setoran" : "Penarikan"} {usd(batal.jumlahUsd)} akan dibatalkan. Kamu bisa mengajukan lagi kapan saja.
          </p>
        )}
        {err && <p className="ferr" role="alert">{err}</p>}
        <div className="btn-row">
          <button type="button" className="btn ton" onClick={() => setBatal(null)}>
            Jangan batalkan
          </button>
          <button
            type="button"
            className="btn danger"
            onClick={async () => {
              const h = await batalkan(batal!.id);
              if (!h.ok) return setErr(h.pesan);
              tampilkan(`Permintaan ${batal!.jenis === "setor" ? "setoran" : "penarikan"} dibatalkan.`);
              setBatal(null);
            }}
          >
            Ya, batalkan
          </button>
        </div>
      </Sheet>
    </>
  );
}
