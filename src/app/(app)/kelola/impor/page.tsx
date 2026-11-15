"use client";
// Impor riwayat awal (US-06): unggah 2 template CSV, pratinjau posisi tiap orang, lalu impor.
import { useState } from "react";
import { IconAlertTriangle, IconCircleCheck, IconDownload, IconFileSpreadsheet } from "@tabler/icons-react";
import { BackBar, KhususPengelola, Sheet, StatusBanners } from "@/components/ui";
import { contohCsv, pratinjau, type Pratinjau } from "@/lib/csv";
import { hitungPool } from "@/lib/engine";
import { tanggal, usd } from "@/lib/format";
import { useStore } from "@/lib/store";

function unduh(nama: string, isi: string) {
  const url = URL.createObjectURL(new Blob([isi], { type: "text/csv" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nama;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Impor() {
  const { saya, data, impor, batalkanImpor, tampilkan, offline } = useStore();
  const [snapCsv, setSnapCsv] = useState<{ nama: string; isi: string } | null>(null);
  const [txCsv, setTxCsv] = useState<{ nama: string; isi: string } | null>(null);
  const [pv, setPv] = useState<Pratinjau | null>(null);
  const [batal, setBatal] = useState(false);
  const [err, setErr] = useState("");
  if (!saya) return null;
  if (saya.peran !== "pengelola") return (<><BackBar judul="Impor riwayat" ke="/kelola" /><main><KhususPengelola /></main></>);

  const sudah = data.snapshots.length > 0 || data.permintaan.some((p) => p.sumber === "impor");
  const logImpor = data.log.find((l) => l.tabel === "impor" && l.aksi === "insert");

  function baca(f: File | undefined, set: (v: { nama: string; isi: string }) => void) {
    if (!f) return;
    f.text().then((isi) => {
      set({ nama: f.name, isi });
      setPv(null);
    });
  }
  function lihat(s: string, t: string) {
    setPv(pratinjau(s, t, data.anggota, data.pengaturan, saya!.id));
  }
  const pakaiContoh = (salah: boolean) => {
    const c = contohCsv(salah);
    setSnapCsv({ nama: "snapshot.csv (contoh)", isi: c.snapshot });
    setTxCsv({ nama: salah ? "transaksi.csv (contoh berisi kesalahan)" : "transaksi.csv (contoh)", isi: c.transaksi });
    lihat(c.snapshot, c.transaksi);
  };
  const posisi = pv && !pv.kesalahan.length ? hitungPool(data.anggota, pv.snapshots, pv.transaksi, data.pengaturan).posisi : [];

  return (
    <>
      <BackBar judul="Impor riwayat" ke="/kelola" />
      <main>
        <StatusBanners />
        {sudah ? (
          <section className="card" aria-labelledby="status-impor">
            <h2 id="status-impor" style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <IconCircleCheck size={20} className="up" aria-hidden="true" /> Riwayat sudah diimpor
            </h2>
            <p>
              {data.snapshots.length} saldo harian dan {data.permintaan.filter((p) => p.sumber === "impor").length} transaksi
              {logImpor ? `, diimpor ${tanggal(logImpor.pada)}` : ""}.
            </p>
            <p className="note" style={{ marginTop: 8 }}>
              Impor hanya bisa dibatalkan sebelum ada transaksi baru yang diproses lewat app. Membatalkan akan menghapus semua data impor.
            </p>
            {err && <p className="ferr" role="alert" style={{ marginTop: 10 }}>{err}</p>}
            <button type="button" className="btn danger sm" style={{ marginTop: 14 }} disabled={offline} onClick={() => setBatal(true)}>
              Batalkan impor
            </button>
          </section>
        ) : (
          <>
            <section className="card form" aria-labelledby="unggah">
              <h2 id="unggah" style={{ marginBottom: -4 }}>Unggah template</h2>
              <p className="note">
                Salin data dari Tracker_LP_v3 (USD) dan Laporan Harian (SOL) ke dua template ini sekali saja. Format tanggal YYYY-MM-DD, desimal pakai titik.
              </p>
              {[
                { id: "f1", label: "snapshot.csv", kolom: "tanggal, nilai_usd, saldo_sol, harga_sol_referensi", v: snapCsv, set: setSnapCsv },
                { id: "f2", label: "transaksi.csv", kolom: "tanggal_efektif, nama, jenis, jumlah_usd", v: txCsv, set: setTxCsv },
              ].map((x) => (
                <div className="field" key={x.id}>
                  <label htmlFor={x.id}>
                    <span>{x.label}</span>
                  </label>
                  <label className="inp" htmlFor={x.id} style={{ cursor: "pointer" }}>
                    <IconFileSpreadsheet size={20} aria-hidden="true" />
                    <span style={{ flex: 1, padding: "14px 0", fontSize: 15 }} className={x.v ? undefined : "mu"}>
                      {x.v ? x.v.nama : "Pilih file CSV"}
                    </span>
                  </label>
                  <input id={x.id} type="file" accept=".csv,text/csv" className="sr" onChange={(e) => baca(e.target.files?.[0], x.set)} />
                  <p className="hint">Kolom: {x.kolom}</p>
                </div>
              ))}
              <button type="button" className="btn ton block" disabled={!snapCsv || !txCsv} onClick={() => lihat(snapCsv!.isi, txCsv!.isi)}>
                Lihat pratinjau
              </button>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button type="button" className="btn ghost sm" onClick={() => pakaiContoh(false)}>Pakai file contoh</button>
                <button type="button" className="btn ghost sm" onClick={() => pakaiContoh(true)}>Contoh berisi kesalahan</button>
                <button type="button" className="btn ghost sm" onClick={() => { const c = contohCsv(); unduh("snapshot.csv", c.snapshot); unduh("transaksi.csv", c.transaksi); }}>
                  <IconDownload size={16} aria-hidden="true" /> Unduh template
                </button>
              </div>
            </section>

            {pv && (
              <section className="card" aria-labelledby="pv" aria-live="polite">
                <h2 id="pv">Pratinjau</h2>
                <p>
                  {pv.snapshots.length} saldo harian, {pv.transaksi.length} transaksi.
                </p>
                {pv.kesalahan.length > 0 && (
                  <div className="banner warn" role="alert" style={{ background: "var(--loss-wash)", color: "var(--loss)", marginTop: 12 }}>
                    <IconAlertTriangle size={18} aria-hidden="true" />
                    <div>
                      <p style={{ fontWeight: 600 }}>Impor diblokir sampai semua baris benar.</p>
                      {pv.kesalahan.map((k, i) => (
                        <p key={i}>
                          {k.file}: {k.pesan}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
                {pv.peringatan.length > 0 && (
                  <div className="banner warn" style={{ marginTop: 12 }}>
                    <IconAlertTriangle size={18} aria-hidden="true" />
                    <div>
                      <p style={{ fontWeight: 600 }}>{pv.peringatan.length} baris perlu dicek (tidak memblokir impor)</p>
                      {pv.peringatan.map((k, i) => (
                        <p key={i} style={{ marginTop: 4 }}>{k}</p>
                      ))}
                    </div>
                  </div>
                )}
                {posisi.length > 0 && (
                  <>
                    <h3 style={{ fontSize: 13, fontWeight: 600, margin: "16px 0 0" }}>Posisi hasil hitung</h3>
                    <dl className="kv lines">
                      {posisi.filter((p) => p.punyaSetoran).map((p) => (
                        <div key={p.id}>
                          <dt>{p.nama}</dt>
                          <dd>{usd(p.netUsd)}</dd>
                        </div>
                      ))}
                    </dl>
                  </>
                )}
                <button
                  type="button"
                  className="btn pri block"
                  style={{ marginTop: 16 }}
                  disabled={!!pv.kesalahan.length || offline}
                  onClick={() => {
                    const h = impor(pv.snapshots, pv.transaksi);
                    if (!h.ok) return setErr(h.pesan);
                    tampilkan(`Riwayat diimpor: ${pv.snapshots.length} saldo harian dan ${pv.transaksi.length} transaksi.`);
                    setPv(null);
                    setSnapCsv(null);
                    setTxCsv(null);
                  }}
                >
                  Impor
                </button>
              </section>
            )}
          </>
        )}
      </main>

      <Sheet buka={batal} onTutup={() => setBatal(false)} judul="Batalkan impor?">
        <p style={{ fontSize: 15 }}>Semua saldo harian dan transaksi hasil impor akan dihapus. Kamu bisa mengimpor ulang setelahnya.</p>
        <div className="btn-row">
          <button type="button" className="btn ton" onClick={() => setBatal(false)}>Jangan</button>
          <button
            type="button"
            className="btn danger"
            onClick={() => {
              const h = batalkanImpor();
              setBatal(false);
              if (!h.ok) return setErr(h.pesan);
              setErr("");
              tampilkan("Impor dibatalkan. Semua data impor dihapus.");
            }}
          >
            Ya, hapus data impor
          </button>
        </div>
      </Sheet>
    </>
  );
}
