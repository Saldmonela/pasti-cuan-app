"use client";
// Beranda (US-12 + US-01): layout C "Tumpuk kartu". Satu kartu per pertanyaan.
import Link from "next/link";
import { useState } from "react";
import { IconArrowUpRight, IconCalendar, IconChevronRight, IconPlus } from "@tabler/icons-react";
import KartuGrafik, { useWaktuLive } from "@/components/KartuGrafik";
import { Avatar, GagalMuat, Memuat, Stamp, StatusBanners } from "@/components/ui";
import { arah, bertanda, persen, persenBertanda, tanggal, uang, usd } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { Rentang } from "@/lib/types";
import { grafikKosong, WARNA_PORSI } from "@/lib/view";

export default function Beranda() {
  const s = useStore();
  const { saya, hasil, satuan, mode, setMode, skenario, offline } = s;
  const [rentang, setRentang] = useState<Rentang>("24J");
  const waktuLive = useWaktuLive();
  if (!saya) return null;

  const header = (
    <header className="hd">
      <div>
        <h1>Halo, {saya.nama}</h1>
        <Stamp />
      </div>
      <Avatar />
    </header>
  );
  if (skenario === "memuat") return (<>{header}<main><Memuat kartu={3} /></main></>);
  if (skenario === "gagal") return (<>{header}<main><GagalMuat /></main></>);

  const pos = hasil.posisi.find((p) => p.id === saya.id)!;
  const pengelola = saya.peran === "pengelola";
  const belumSetor = skenario === "belumSetor" || (!pos.punyaSetoran && pos.unit === 0);
  const riwayat = hasil.riwayat[saya.id] ?? [];
  const seri = s.seri(rentang, saya.id);
  const kosong = grafikKosong(seri, rentang, riwayat.length);
  const sayaMenunggu = s.menunggu.filter((p) => p.anggotaId === saya.id);
  const lainSaya = hasil.posisi.filter((p) => p.unit > 1e-9 || p.id === saya.id).sort((a, b) => b.porsi - a.porsi);

  return (
    <>
      {header}
      <main>
        <StatusBanners />
        {pengelola && <KartuTugas />}

        {belumSetor ? (
          <section className="card" aria-labelledby="nilai-kamu">
            <div className="lb" id="nilai-kamu">Nilai kamu</div>
            <div className="big">{uang(0, satuan)}</div>
            <p className="note" style={{ margin: "8px 0 16px" }}>
              Kamu belum punya setoran yang terkonfirmasi. Ajukan setoran pertama kamu.
            </p>
            <Link href="/setor" className="btn pri block" aria-disabled={offline} onClick={(e) => offline && e.preventDefault()}>
              <IconPlus size={18} aria-hidden="true" />
              Setor
            </Link>
          </section>
        ) : (
          <KartuGrafik
            id="nilai-kamu"
            label="Nilai kamu"
            seri={seri}
            live={{ usd: pos.netUsd, sol: pos.netSol }}
            waktuLive={waktuLive}
            mode={mode}
            onMode={setMode}
            rentang={rentang}
            onRentang={setRentang}
            kosong={kosong}
            gagal={skenario === "grafikGagal"}
            onCobaLagi={() => s.setSkenario("normal")}
          >
            <div className="btn-row" style={{ marginTop: 16 }}>
              <Link href="/setor" className="btn pri" aria-disabled={offline} onClick={(e) => offline && e.preventDefault()} tabIndex={offline ? -1 : undefined}>
                <IconPlus size={18} aria-hidden="true" />
                Setor
              </Link>
              <Link href="/tarik" className="btn ton" aria-disabled={offline} onClick={(e) => offline && e.preventDefault()} tabIndex={offline ? -1 : undefined}>
                <IconArrowUpRight size={18} aria-hidden="true" />
                Tarik
              </Link>
            </div>
            {sayaMenunggu.length > 0 && (
              <Link href="/permintaan" className="cap" style={{ margin: "14px 0 0", textDecoration: "none" }}>
                <span className="chip menunggu">Menunggu</span>
                <span style={{ flex: 1 }}>
                  {sayaMenunggu.map((p) => `${p.jenis === "setor" ? "Setoran" : "Penarikan"} ${usd(p.jumlahUsd)}`).join(", ")} sedang diproses
                  pengelola.
                </span>
                <IconChevronRight size={16} aria-hidden="true" />
              </Link>
            )}
          </KartuGrafik>
        )}

        {!belumSetor && (
          <>
            <section className="card" aria-labelledby="asal">
              <h2 id="asal">Dari mana nilai kamu</h2>
              <dl className="kv">
                <div>
                  <dt>Modal dasar</dt>
                  <dd>{usd(pos.modalUsd)}</dd>
                </div>
                <div>
                  <dt>
                    Untung/rugi <span className={`tag ${arah(pos.roi)}`}>ROI {persenBertanda(pos.roi)}</span>
                  </dt>
                  <dd className={arah(pos.profitUsd)}>{bertanda(pos.profitUsd, "USD")}</dd>
                </div>
                <div>
                  <dt>
                    Fee terutang <span className="mu">{persen(s.data.pengaturan.feePersen * 100).replace(",00", "")}</span>
                  </dt>
                  <dd>{pos.feeUsd > 0.004 ? "−" : ""}{usd(pos.feeUsd)}</dd>
                </div>
                <div className="tot">
                  <dt>Nilai bersih</dt>
                  <dd>
                    {usd(pos.netUsd)}
                    <small>{uang(pos.netSol, "SOL")}</small>
                  </dd>
                </div>
              </dl>
              <p className="note" style={{ marginTop: 10 }}>
                Nilai bersih adalah jumlah maksimal yang bisa kamu tarik hari ini, sudah dipotong fee.
              </p>
            </section>

            <section className="card" aria-labelledby="porsi">
              <h2 id="porsi">Porsi kamu di pool</h2>
              <div className="fig-lg">{persen(pos.porsi)}</div>
              <div
                className="share-bar"
                role="img"
                aria-label={`Porsi pool: ${lainSaya.map((p) => `${p.id === saya.id ? "Kamu" : p.nama} ${persen(p.porsi)}`).join(", ")}`}
              >
                {(() => {
                  let k = 0;
                  return lainSaya.map((p) => (
                    <span
                      key={p.id}
                      style={{ flex: `${p.porsi} 0 0`, background: p.id === saya.id ? "var(--forest-ink)" : WARNA_PORSI[k++ % 4] }}
                    />
                  ));
                })()}
              </div>
              <ul className="legend">
                {(() => {
                  let k = 0;
                  return lainSaya.map((p) => (
                    <li key={p.id} className={p.id === saya.id ? "me" : undefined}>
                      <i style={{ background: p.id === saya.id ? "var(--forest-ink)" : WARNA_PORSI[k++ % 4] }} aria-hidden="true" />
                      {p.id === saya.id ? "Kamu" : p.nama}
                      <b>{persen(p.porsi)}</b>
                    </li>
                  ));
                })()}
              </ul>
              <p className="since">
                <IconCalendar size={17} aria-hidden="true" />
                Ikut {pos.lamaIkutHari} hari{pos.tanggalMulai ? `, sejak ${tanggal(pos.tanggalMulai)}` : ""}
              </p>
            </section>

            <section className="card" aria-labelledby="sol">
              <h2 id="sol">Dalam SOL</h2>
              <div className={`fig-md ${arah(pos.profitSol, 4)}`} style={{ marginBottom: 4 }}>
                {bertanda(pos.profitSol, "SOL")}
              </div>
              <p className="note">
                {pos.profitUsd < 0 && pos.profitSol > 0
                  ? "Nilai USD turun karena harga SOL turun, tapi jumlah SOL kamu bertambah."
                  : "Untung/rugi SOL = jumlah SOL kamu sekarang dikurangi SOL setara modal saat disetor."}
              </p>
            </section>
          </>
        )}
      </main>
    </>
  );
}

function KartuTugas() {
  const { menunggu, data, hariIni, hasil, arusBelum } = useStore();
  const snapHariIni = data.snapshots.find((x) => x.tanggal === hariIni);
  return (
    <section className="card" aria-labelledby="tugas">
      <div className="card-h">
        <h2 id="tugas" style={{ fontSize: 15, fontWeight: 600 }}>
          Tugas pengelola hari ini
        </h2>
        <Link href="/kelola">
          Kelola <IconChevronRight size={16} aria-hidden="true" />
        </Link>
      </div>
      <dl className="kv lines">
        <div>
          <dt>Permintaan menunggu</dt>
          <dd>
            <Link href="/kelola/permintaan" style={{ textDecoration: "none" }}>
              {menunggu.length ? `${menunggu.length} permintaan` : "Tidak ada"}
            </Link>
          </dd>
        </div>
        <div>
          <dt>Transfer belum dicocokkan</dt>
          <dd>
            <Link href="/kelola/arus" style={{ textDecoration: "none" }}>
              {arusBelum.length ? `${arusBelum.length} transfer` : "Tidak ada"}
            </Link>
          </dd>
        </div>
        <div>
          <dt>Snapshot {tanggal(hariIni)}</dt>
          <dd className={snapHariIni ? "up" : undefined}>
            {snapHariIni ? (snapHariIni.sumber === "otomatis" ? "Dibuat otomatis" : "Sudah dicatat") : <Link href="/kelola/saldo">Belum ada</Link>}
          </dd>
        </div>
        <div>
          <dt>Fee terutang dari investor</dt>
          <dd>{usd(hasil.pengelola.feeTerutangTotal)}</dd>
        </div>
      </dl>
    </section>
  );
}
