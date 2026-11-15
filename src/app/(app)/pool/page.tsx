"use client";
// Pool (US-08 + US-05): grafik saldo pool, posisi semua anggota, status cek data.
import { useState } from "react";
import { IconAlertTriangle, IconCircleCheck } from "@tabler/icons-react";
import Chart from "@/components/Chart";
import { GagalMuat, Memuat, PageHeader, Seg, StatusBanners } from "@/components/ui";
import { deretPool, untungRugiRentang } from "@/lib/engine";
import { arah, bertanda, persen, uang, usd } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { Rentang } from "@/lib/types";
import { grafikPool, WARNA_PORSI } from "@/lib/view";

export default function Pool() {
  const { saya, hasil, satuan, setSatuan, skenario, cekGagal, data } = useStore();
  const [rentang, setRentang] = useState<Rentang>("30H");
  if (!saya) return null;
  if (skenario === "memuat") return (<><PageHeader judul="Pool" /><main><Memuat kartu={3} /></main></>);
  if (skenario === "gagal") return (<><PageHeader judul="Pool" /><main><GagalMuat /></main></>);

  const rr = untungRugiRentang(deretPool(hasil.riwayatPool, satuan), rentang);
  const nilai = satuan === "USD" ? hasil.pool.nilaiUsd : hasil.pool.saldoSol;
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
        <section className="card" aria-labelledby="saldo-pool">
          <div className="lb" id="saldo-pool">Saldo pool {data.pengaturan.namaPool}</div>
          <div className="big">{uang(nilai, satuan)}</div>
          <div className={`pl ${arah(rr.jumlah, satuan === "USD" ? 2 : 4)}`}>
            {rentang}: {bertanda(rr.jumlah, satuan)}
          </div>
          {hasil.riwayatPool.length < 2 ? (
            <div className="chart-empty">Grafik muncul setelah ada data 2 hari.</div>
          ) : skenario === "grafikGagal" ? (
            <div className="chart-empty" role="alert">Grafik belum bisa dimuat. Coba lagi.</div>
          ) : (
            <Chart titik={grafikPool(hasil.riwayatPool, satuan, rentang)} label={`Grafik saldo pool dalam ${satuan}, rentang ${rentang}`} />
          )}
          <p className="cap">
            <span className="mk" aria-hidden="true" />
            Titik bertanda = ada setoran atau penarikan. Lonjakan di titik itu bukan untung.
          </p>
          <div className="ctl">
            <Seg label="Satuan" nilai={satuan} opsi={["USD", "SOL"]} onChange={setSatuan} />
            <Seg label="Rentang" nilai={rentang} opsi={["7H", "30H", "Semua"] as Rentang[]} onChange={setRentang} />
          </div>
          <p className="note" style={{ marginTop: 14 }}>Harga SOL hari ini {usd(hasil.pool.harga)}, dihitung dari saldo USD dibagi saldo SOL.</p>
        </section>

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
              <dt>Total pool</dt>
              <dd>
                {usd(totalNet)}
                <small>Porsi {persen(totalPorsi)}</small>
              </dd>
            </div>
          </dl>
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
            saldo harian, dan total nilai semua anggota sama dengan saldo pool.
          </p>
        </section>
      </main>
    </>
  );
}
