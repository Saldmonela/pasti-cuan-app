"use client";
// Lainnya: akun, tautan ke log dan kelola, pengaturan tampilan (accordion), arti istilah (Glosarium PRD Section 2), keluar.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  IconBook,
  IconChevronRight,
  IconHistory,
  IconLayoutDashboard,
  IconLogout,
  IconMoonStars,
  IconReceipt,
} from "@tabler/icons-react";
import { GlassSwitch } from "@/components/GlassSwitch";
import { PageHeader, Seg } from "@/components/ui";
import { tanggal } from "@/lib/format";
import { useStore } from "@/lib/store";
import { type ModeTema, useTema } from "@/lib/theme";

const ISTILAH: [string, string][] = [
  ["Pool", 'Seluruh dana patungan di wallet "Pasti Cuan".'],
  ["Snapshot", "Rekap resmi saldo pool tiap jam 08.00 WIB yang dicatat otomatis."],
  [
    "Nilai live",
    "Nilai pool terbaru, dibaca dari wallet tiap menit. Transfer yang belum dicocokkan dinetralkan dulu. Bersifat perkiraan.",
  ],
  [
    "Arus onchain",
    "Transfer masuk atau keluar wallet pool. Pengelola mencocokkannya dengan setoran atau penarikan pada waktu transfer.",
  ],
  ["Unit", "Satuan kepemilikan pool. Setoran membeli unit, penarikan menjual unit."],
  ["NAV", "Harga 1 unit pada suatu waktu, dalam USD dan SOL."],
  ["Modal dasar", "Total uang yang sudah kamu setor dikurangi bagian modal yang sudah ditarik."],
  ["Nilai kotor", "Unit kamu dikali NAV, sebelum dipotong fee."],
  ["Fee terutang", "10% dari untung kamu, hanya kalau untung. Belum dibayar sampai ada penarikan."],
  ["Nilai bersih", "Nilai kotor dikurangi fee terutang. Ini jumlah maksimal yang bisa kamu tarik."],
  ["Porsi", "Unit milikmu dibagi total unit pool."],
  ["Permintaan", "Pengajuan setor atau tarik dari investor, diproses pengelola."],
];

const LABEL_TEMA: Record<ModeTema, string> = { sistem: "Sistem", terang: "Terang", gelap: "Gelap" };
const DARI_LABEL_TEMA: Record<string, ModeTema> = { Sistem: "sistem", Terang: "terang", Gelap: "gelap" };

export default function Lainnya() {
  const { saya, data, keluar, hasil } = useStore();
  const { mode: modeTema, setMode: setModeTema, kaca, setKaca } = useTema();
  const [bukaTampilan, setBukaTampilan] = useState(false);
  const router = useRouter();
  if (!saya) return null;
  const pos = hasil.posisi.find((p) => p.id === saya.id)!;
  const pengelola = saya.peran === "pengelola";
  const pengelolaNama =
    data.anggota.find((a) => a.peran === "pengelola" && a.aktif)?.nama ??
    data.anggota.find((a) => a.peran === "pengelola")?.nama ??
    "pengelola";

  const teksTema =
    modeTema === "sistem" ? "Mengikuti sistem" : modeTema === "gelap" ? "Mode gelap" : "Mode terang";
  const teksKaca = !kaca.liquidGlass ? "Kaca mati" : kaca.betterPerformance ? "Mode ringan" : "Liquid Glass";
  const ringkasanTampilan = `${teksTema} · ${teksKaca}`;

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
            <div className="note" style={{ overflowWrap: "anywhere" }}>
              {saya.email}
            </div>
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
                <span className="ico-dot">
                  <IconReceipt size={18} aria-hidden="true" />
                </span>
                <span className="t">
                  <span>Status permintaan</span>
                  <small>Setoran dan penarikan kamu</small>
                </span>
                <IconChevronRight className="chev" size={18} aria-hidden="true" />
              </Link>
            </li>
            <li>
              <Link href="/log">
                <span className="ico-dot">
                  <IconHistory size={18} aria-hidden="true" />
                </span>
                <span className="t">
                  <span>Log perubahan</span>
                  <small>Semua perubahan angka tercatat di sini</small>
                </span>
                <IconChevronRight className="chev" size={18} aria-hidden="true" />
              </Link>
            </li>
            {pengelola && (
              <li>
                <Link href="/kelola">
                  <span className="ico-dot">
                    <IconLayoutDashboard size={18} aria-hidden="true" />
                  </span>
                  <span className="t">
                    <span>Kelola pool</span>
                    <small>Arus onchain, permintaan, snapshot, anggota</small>
                  </span>
                  <IconChevronRight className="chev" size={18} aria-hidden="true" />
                </Link>
              </li>
            )}
            <li className="menu-acc">
              <button
                type="button"
                aria-expanded={bukaTampilan}
                aria-controls="panel-tampilan"
                onClick={() => setBukaTampilan((v) => !v)}
              >
                <span className="ico-dot">
                  <IconMoonStars size={18} aria-hidden="true" />
                </span>
                <span className="t">
                  <span>Tampilan</span>
                  <small>{ringkasanTampilan}</small>
                </span>
                <IconChevronRight
                  className="chev acc-chev"
                  data-open={bukaTampilan ? "true" : "false"}
                  size={18}
                  aria-hidden="true"
                />
              </button>

              <div
                id="panel-tampilan"
                className="lg-acc"
                data-open={bukaTampilan ? "true" : "false"}
              >
                <div className="lg-acc-in" inert={!bukaTampilan}>
                  <div className="lg-pref-rows">
                    <div className="lg-pref-row theme-row">
                      <div className="t">
                        <span>Tema warna</span>
                        <small>Sistem menyesuaikan pengaturan layar perangkat</small>
                      </div>
                      <Seg
                        label="Mode tampilan"
                        nilai={LABEL_TEMA[modeTema]}
                        opsi={["Sistem", "Terang", "Gelap"]}
                        onChange={(v) => setModeTema(DARI_LABEL_TEMA[v])}
                      />
                    </div>

                    <div
                      className="lg-pref-row"
                      onClick={() => setKaca({ liquidGlass: !kaca.liquidGlass })}
                    >
                      <div className="t">
                        <span>Liquid Glass</span>
                        <small>
                          Kaca pembias cahaya di navigasi melayang, tombol kembali, dan lembar bawah. Matikan untuk
                          warna solid.
                        </small>
                      </div>
                      <GlassSwitch
                        checked={kaca.liquidGlass}
                        onChange={(v) => setKaca({ liquidGlass: v })}
                        label="Liquid Glass"
                      />
                    </div>

                    {kaca.liquidGlass && (
                      <>
                        <div
                          className="lg-pref-row sub"
                          onClick={() => setKaca({ betterPerformance: !kaca.betterPerformance })}
                        >
                          <div className="t">
                            <span>Mode ringan kaca</span>
                            <small>Ganti pembiasan lensa ke frosted blur yang lebih hemat baterai.</small>
                          </div>
                          <GlassSwitch
                            checked={kaca.betterPerformance}
                            onChange={(v) => setKaca({ betterPerformance: v })}
                            label="Mode ringan kaca"
                          />
                        </div>

                        <div
                          className="lg-pref-row sub"
                          onClick={() => setKaca({ progressiveBlur: !kaca.progressiveBlur })}
                        >
                          <div className="t">
                            <span>Progressive blur atas</span>
                            <small>Blur gradasi tanpa kabut warna di tepi atas layar saat halaman digulir.</small>
                          </div>
                          <GlassSwitch
                            checked={kaca.progressiveBlur}
                            onChange={(v) => setKaca({ progressiveBlur: v })}
                            label="Progressive blur atas"
                          />
                        </div>

                        <div
                          className="lg-pref-row sub"
                          onClick={() => setKaca({ pillPhysics: !kaca.pillPhysics })}
                        >
                          <div className="t">
                            <span>Pill pegas & geser jari</span>
                            <small>Kapsul navigasi mengembang saat pindah dan bisa digeser langsung dengan jari.</small>
                          </div>
                          <GlassSwitch
                            checked={kaca.pillPhysics}
                            onChange={(v) => setKaca({ pillPhysics: v })}
                            label="Pill pegas dan geser jari"
                          />
                        </div>
                      </>
                    )}

                    <div
                      className="lg-pref-row"
                      onClick={() => setKaca({ reduceMotion: !kaca.reduceMotion })}
                    >
                      <div className="t">
                        <span>Kurangi animasi</span>
                        <small>Pindahkan indikator tab dan buka lembar secara langsung tanpa ayunan.</small>
                      </div>
                      <GlassSwitch
                        checked={kaca.reduceMotion}
                        onChange={(v) => setKaca({ reduceMotion: v })}
                        label="Kurangi animasi"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </li>
            <li>
              <button
                type="button"
                onClick={async () => {
                  await keluar();
                  router.replace("/masuk");
                }}
              >
                <span className="ico-dot">
                  <IconLogout size={18} aria-hidden="true" />
                </span>
                <span className="t">
                  <span>Keluar</span>
                </span>
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
          App ini hanya buku catatan bersama. Uang tetap dikelola {pengelolaNama} di wallet, dan app tidak pernah
          meminta private key atau seed phrase.
        </p>
      </main>
    </>
  );
}
