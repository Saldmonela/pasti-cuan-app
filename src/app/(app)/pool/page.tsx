"use client";
// Pool (US-08 + US-05): saldo pool = isi wallet (BR-19), grafik, posisi semua anggota dengan NAV live
// dan baris rekonsiliasi ke isi wallet, status cek data.
import { useState } from "react";
import { IconAlertTriangle, IconCircleCheck, IconInfoCircle } from "@tabler/icons-react";
import KartuGrafik, { useWaktuLive } from "@/components/KartuGrafik";
import { GagalMuat, Memuat, PageHeader, StatusBanners } from "@/components/ui";
import { arah, bertanda, persen, uang, usd } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { Rentang } from "@/lib/types";
import { grafikKosong, WARNA_PORSI } from "@/lib/view";

export default function Pool() {
  const { saya, hasil, mode, setMode, skenario, cekGagal, data, arus, seri: seriRentang, setSkenario } = useStore();
  const [rentang, setRentang] = useState<Rentang>("24J");
  const [info, setInfo] = useState(false);
  const waktuLive = useWaktuLive();
  if (!saya) return null;
  if (skenario === "memuat") return (<><PageHeader judul="Pool" /><main><Memuat kartu={3} /></main></>);
  if (skenario === "gagal") return (<><PageHeader judul="Pool" /><main><GagalMuat /></main></>);

  const seri = seriRentang(rentang);
  const kosong = grafikKosong(seri, rentang, hasil.riwayatPool.length);
  const live = hasil.live;
  const jamLive = live ? live.dibacaPada.slice(11, 16).replace(":", ".") : null;
  // angka besar = isi wallet, sama dengan Jupiter; nilai disesuaikan hanya untuk NAV (BR-19)
  const isi = live ? { usd: live.nilaiMentahUsd, sol: live.nilaiMentahUsd / live.harga } : { usd: hasil.pool.nilaiUsd, sol: hasil.pool.saldoSol };
  const belumDiproses = live ? live.arusDinetralkanUsd : 0;
  const adaSelisih = Math.abs(belumDiproses) >= 0.01;
  // penarikan yang transfernya sudah dicocokkan, menunggu snapshot berikutnya
  const diproses = new Set(
    data.permintaan
      .filter((p) => p.status === "menunggu" && p.jenis === "tarik" && arus.some((a) => a.permintaanId === p.id))
      .map((p) => p.anggotaId),
  );
  const investor = hasil.posisi.filter((p) => p.peran === "investor" && (p.unit > 1e-9 || p.punyaSetoran)).sort((a, b) => b.porsi - a.porsi);
  const pengelola = hasil.posisi.find((p) => p.id === hasil.pengelola.id);
  const totalNet = hasil.posisi.reduce((a, p) => a + p.netUsd, 0) + hasil.pengelola.feeTerutangTotal;
  const totalPorsi = hasil.posisi.reduce((a, p) => a + p.porsi, 0);
  let k = 0;
  const warna = Object.fromEntries(
    [...investor, ...(pengelola && pengelola.unit > 1e-9 ? [pengelola] : [])].map((p) => [
      p.id,
      p.id === saya.id ? "var(--forest-ink)" : WARNA_PORSI[k++ % 4],
    ]),
  );
  const masalah = skenario === "cekGagal" && hasil.cek.lolos
    ? ["Ada 1 masalah: penarikan Rezki 14 Nov 2026 melebihi nilai bersihnya. Pengelola sedang memeriksa."]
    : hasil.cek.penyebab;

  return (
    <>
      <PageHeader judul="Pool" />
      <main>
        <StatusBanners />
        <KartuGrafik
          id="saldo-pool"
          label={`Saldo pool ${data.pengaturan.namaPool}`}
          info={
            adaSelisih ? (
              <button type="button" className="info-btn" aria-expanded={info} aria-controls="info-selisih" aria-label="Kenapa angka ini berbeda dari total anggota" onClick={() => setInfo(!info)}>
                <IconInfoCircle size={20} aria-hidden="true" />
              </button>
            ) : undefined
          }
          catatan={
            adaSelisih && info ? (
              <p className="note info-isi" id="info-selisih">
                Isi wallet sekarang {usd(isi.usd)}. {usd(Math.abs(belumDiproses))} sudah {belumDiproses > 0 ? "keluar dari" : "masuk ke"} wallet tapi belum
                diproses ke unit, jadi nilai tiap orang masih dihitung seolah-olah dana itu {belumDiproses > 0 ? "ada" : "belum ada"}. Akan beres di snapshot
                berikutnya.
              </p>
            ) : undefined
          }
          seri={seri}
          live={isi}
          waktuLive={waktuLive}
          mode={mode}
          onMode={setMode}
          rentang={rentang}
          onRentang={setRentang}
          kosong={kosong}
          gagal={skenario === "grafikGagal"}
          onCobaLagi={() => setSkenario("normal")}
          keterangan={
            <p className="cap">
              <span className="mk" aria-hidden="true" />
              Titik bertanda = ada setoran atau penarikan. Naik-turun di titik itu bukan untung atau rugi.
              {jamLive ? ` Titik terakhir = isi wallet ${jamLive} WIB.` : ""}
            </p>
          }
        >
          <p className="note" style={{ marginTop: 14 }}>
            Harga SOL {jamLive ? `${jamLive} WIB` : "hari ini"} {usd(hasil.pool.harga)}
            {jamLive ? ", dibaca otomatis dari wallet." : ", dihitung dari saldo USD dibagi saldo SOL."}
          </p>
        </KartuGrafik>

        <section className="card" aria-labelledby="anggota">
          <h2 id="anggota">Posisi semua anggota</h2>
          <div className="share-bar" role="img" aria-label={`Porsi: ${investor.map((p) => `${p.nama} ${persen(p.porsi)}`).join(", ")}`}>
            {Object.entries(warna).map(([id, w]) => (
              <span key={id} style={{ flex: `${hasil.posisi.find((p) => p.id === id)!.porsi} 0 0`, background: w }} />
            ))}
          </div>
          <ul className="rows">
            {investor.map((p) => (
              <li key={p.id}>
                <i aria-hidden="true" style={{ width: 10, height: 10, borderRadius: 3, background: warna[p.id], marginTop: 6, flex: "none" }} />
                <div className="main">
                  <div className="t">
                    {p.nama}
                    {p.id === saya.id && <span className="chip peran">Kamu</span>}
                    {diproses.has(p.id) && <span className="chip menunggu">Penarikan diproses</span>}
                    <span className="mu num" style={{ fontWeight: 500 }}>{persen(p.porsi)}</span>
                  </div>
                  <div className="s">
                    Modal {usd(p.modalUsd)} · <span className={arah(p.profitUsd)}>{bertanda(p.profitUsd, "USD")}</span> · Fee {usd(p.feeUsd)}
                  </div>
                </div>
                <div className="v">
                  {usd(p.netUsd)}
                  <small>{uang(p.netSol, "SOL")}</small>
                </div>
              </li>
            ))}
            {pengelola && (
              <li>
                <i aria-hidden="true" style={{ width: 10, height: 10, borderRadius: 3, background: warna[pengelola.id] ?? "var(--hairline)", marginTop: 6, flex: "none" }} />
                <div className="main">
                  <div className="t">
                    {pengelola.nama} <span className="chip peran">Pengelola</span>
                  </div>
                  <div className="s">
                    Unit fee {usd(hasil.pengelola.nilaiUnitFeeUsd)} · Fee terutang {usd(hasil.pengelola.feeTerutangTotal)}
                  </div>
                </div>
                <div className="v">
                  {usd(hasil.pengelola.nilaiUnitFeeUsd + hasil.pengelola.feeTerutangTotal)}
                  <small>{persen(pengelola.porsi)}</small>
                </div>
              </li>
            )}
          </ul>
          <dl className="kv">
            <div className="tot">
              <dt>{adaSelisih ? "Total anggota" : "Total pool"}</dt>
              <dd>
                {usd(totalNet)}
                <small>Porsi {persen(totalPorsi)}</small>
              </dd>
            </div>
          </dl>
          {adaSelisih && (
            <p className="rekon num">
              Total anggota {usd(totalNet)} · Belum diproses {bertanda(-belumDiproses, "USD")} · Isi wallet {usd(isi.usd)}
            </p>
          )}
        </section>

        <section className="card" aria-labelledby="cek">
          <h2 id="cek">Cek data</h2>
          {!cekGagal ? (
            <p style={{ display: "flex", gap: 8, alignItems: "center" }} className="up">
              <IconCircleCheck size={20} aria-hidden="true" />
              <b style={{ fontWeight: 600 }}>Semua cek lolos</b>
            </p>
          ) : (
            <div className="banner warn" role="alert">
              <IconAlertTriangle size={18} aria-hidden="true" />
              <div>
                {masalah.map((m, i) => (
                  <p key={i}>{m}</p>
                ))}
              </div>
            </div>
          )}
          <p className="note" style={{ marginTop: 10 }}>
            Dicek setiap kali angka dihitung ulang: tidak ada unit negatif, tidak ada penarikan melebihi nilai bersih, setiap transaksi punya
            saldo harian, total nilai semua anggota sama dengan saldo pool, dan tidak ada transfer wallet yang belum dicatat sebelum snapshot
            terakhir.
          </p>
        </section>
      </main>
    </>
  );
}
