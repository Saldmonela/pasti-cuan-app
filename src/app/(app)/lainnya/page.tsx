"use client";
// Lainnya: akun, tautan ke log dan kelola, arti istilah (Glosarium PRD Section 2), keluar.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { IconBook, IconChevronRight, IconHistory, IconLayoutDashboard, IconLogout, IconReceipt } from "@tabler/icons-react";
import { PageHeader } from "@/components/ui";
import { tanggal } from "@/lib/format";
import { useStore } from "@/lib/store";

const ISTILAH: [string, string][] = [
  ["Pool", "Seluruh dana patungan di wallet \"Pasti Cuan\"."],
  ["Snapshot", "Catatan resmi saldo pool pada satu tanggal, dibuat otomatis jam 08.00 WIB. Dasar semua transaksi."],
  ["Nilai live", "Nilai pool terbaru, dibaca dari wallet tiap menit. Transfer yang belum masuk hitungan dinetralkan dulu. Bersifat perkiraan."],
  ["Arus onchain", "Transfer masuk atau keluar wallet pool. Pengelola mencocokkannya dengan setoran atau penarikan."],
  ["Unit", "Satuan kepemilikan pool. Setoran membeli unit, penarikan menjual unit."],
  ["NAV", "Harga 1 unit pada suatu tanggal, dalam USD dan SOL."],
  ["Modal dasar", "Total uang yang sudah kamu setor dikurangi bagian modal yang sudah ditarik."],
  ["Nilai kotor", "Unit kamu dikali NAV, sebelum dipotong fee."],
  ["Fee terutang", "10% dari untung kamu, hanya kalau untung. Belum dibayar sampai ada penarikan."],
  ["Nilai bersih", "Nilai kotor dikurangi fee terutang. Ini jumlah maksimal yang bisa kamu tarik."],
  ["Porsi", "Unit milikmu dibagi total unit pool."],
  ["Permintaan", "Pengajuan setor atau tarik dari investor, diproses pengelola."],
];

export default function Lainnya() {
  const { saya, keluar, hasil } = useStore();
  const router = useRouter();
  if (!saya) return null;
  const pos = hasil.posisi.find((p) => p.id === saya.id)!;
  const pengelola = saya.peran === "pengelola";

  return (
    <>
      <PageHeader judul="Lainnya" stamp={false} />
      <main>
        <section className="card" style={{ display: "flex", gap: 14, alignItems: "center" }}>
          <span className="av" style={{ width: 52, height: 52, fontSize: 20 }} aria-hidden="true">
            {saya.nama.slice(0, 1)}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 17 }}>{saya.nama}</div>
            <div className="note" style={{ overflowWrap: "anywhere" }}>{saya.email}</div>
            <div style={{ marginTop: 6, display: "flex", gap: 6, flexWrap: "wrap" }}>
              <span className="chip peran">{pengelola ? "Pengelola" : "Investor"}</span>
              {pos.tanggalMulai && <span className="chip dibatalkan">Ikut sejak {tanggal(pos.tanggalMulai)}</span>}
            </div>
          </div>
        </section>

        <section className="card" aria-label="Menu">
          <ul className="menu">
            <li>
              <Link href="/permintaan">
                <span className="ico-dot"><IconReceipt size={18} aria-hidden="true" /></span>
                <span className="t"><span>Status permintaan</span><small>Setoran dan penarikan kamu</small></span>
                <IconChevronRight className="chev" size={18} aria-hidden="true" />
              </Link>
            </li>
            <li>
              <Link href="/log">
                <span className="ico-dot"><IconHistory size={18} aria-hidden="true" /></span>
                <span className="t"><span>Log perubahan</span><small>Semua perubahan angka tercatat di sini</small></span>
                <IconChevronRight className="chev" size={18} aria-hidden="true" />
              </Link>
            </li>
            {pengelola && (
              <li>
                <Link href="/kelola">
                  <span className="ico-dot"><IconLayoutDashboard size={18} aria-hidden="true" /></span>
                  <span className="t"><span>Kelola pool</span><small>Arus onchain, permintaan, snapshot, anggota</small></span>
                  <IconChevronRight className="chev" size={18} aria-hidden="true" />
                </Link>
              </li>
            )}
            <li>
              <button
                type="button"
                onClick={() => {
                  keluar();
                  router.replace("/masuk");
                }}
              >
                <span className="ico-dot"><IconLogout size={18} aria-hidden="true" /></span>
                <span className="t"><span>Keluar</span></span>
              </button>
            </li>
          </ul>
        </section>

        <section className="card" aria-labelledby="istilah">
          <h2 id="istilah" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <IconBook size={18} aria-hidden="true" /> Arti istilah
          </h2>
          <dl className="kv lines">
            {ISTILAH.map(([k, v]) => (
              <div key={k} style={{ display: "block" }}>
                <dt style={{ fontWeight: 600 }}>{k}</dt>
                <dd style={{ textAlign: "left", fontWeight: 400, color: "var(--ink-muted)", marginTop: 2 }}>{v}</dd>
              </div>
            ))}
          </dl>
        </section>

        <p className="note" style={{ padding: "0 4px 8px" }}>
          App ini hanya buku catatan bersama. Uang tetap dikelola Galih di wallet, dan app tidak pernah meminta private key atau seed phrase.
        </p>
      </main>
    </>
  );
}
