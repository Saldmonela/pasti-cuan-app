"use client";
// Pengaturan pool (PATCH /api/pengaturan): fee, satuan dasar fee, batas data lama, ambang lonjakan.
import { useState, type SubmitEvent } from "react";
import { BackBar, describedBy, Field, KhususPengelola, Sheet, StatusBanners } from "@/components/ui";
import { parseAngka, tanggal } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { Satuan } from "@/lib/types";

export default function Pengaturan() {
  const { saya, data, ubahPengaturan, tampilkan, offline } = useStore();
  const p = data.pengaturan;
  const [fee, setFee] = useState(String(p.feePersen * 100));
  const [dasar, setDasar] = useState<Satuan>(p.satuanDasarFee);
  const [lama, setLama] = useState(String(p.batasDataLamaHari));
  const [ambang, setAmbang] = useState(String(p.ambangLonjakanPersen));
  const [err, setErr] = useState<Record<string, string>>({});
  const [yakin, setYakin] = useState(false);
  if (!saya) return null;
  if (saya.peran !== "pengelola") return (<><BackBar judul="Pengaturan pool" ke="/kelola" /><main><KhususPengelola /></main></>);

  const nFee = parseAngka(fee);
  const nLama = parseAngka(lama);
  const nAmbang = parseAngka(ambang);

  function submit(e: SubmitEvent) {
    e.preventDefault();
    const e2: Record<string, string> = {};
    if (nFee === null || nFee < 0 || nFee > 100) e2.fee = "Fee harus antara 0 dan 100%.";
    if (nLama === null || nLama < 1 || !Number.isInteger(nLama)) e2.lama = "Tulis jumlah hari, minimal 1.";
    if (nAmbang === null || nAmbang <= 0) e2.ambang = "Ambang harus lebih dari 0%.";
    setErr(e2);
    if (!Object.keys(e2).length) setYakin(true);
  }

  return (
    <>
      <BackBar judul="Pengaturan pool" ke="/kelola" />
      <main>
        <StatusBanners />
        <section className="card">
          <dl className="kv lines">
            <div><dt>Nama pool</dt><dd>{p.namaPool}</dd></div>
            <div><dt>Tanggal mulai</dt><dd>{tanggal(p.tanggalMulai)}</dd></div>
          </dl>
        </section>
        <form className="card form" onSubmit={submit} noValidate>
          <fieldset disabled={offline} style={{ border: 0, padding: 0, margin: 0, display: "contents" }}>
            <Field id="fee" label="Fee pengelola" error={err.fee} hint="Dipotong dari untung tiap investor, hanya kalau untung.">
              <div className={`inp${err.fee ? " err" : ""}`}>
                <input id="fee" inputMode="decimal" value={fee} onChange={(e) => setFee(e.target.value)} aria-invalid={!!err.fee} aria-describedby={describedBy("fee", err.fee, true)} />
                <span className="pre">%</span>
              </div>
            </Field>
            <div className="field">
              <span className="flabel" id="dasar-l">Satuan dasar fee</span>
              <div className="seg" role="radiogroup" aria-labelledby="dasar-l" style={{ alignSelf: "flex-start" }}>
                {(["USD", "SOL"] as Satuan[]).map((x) => (
                  <button key={x} type="button" role="radio" aria-checked={dasar === x} onClick={() => setDasar(x)}>
                    {x}
                  </button>
                ))}
              </div>
              <p className="hint">
                {dasar === "USD"
                  ? "Disepakati 14 Nov 2026 (OQ-01). Investor yang rugi dalam USD tidak kena fee walau jumlah SOL-nya bertambah."
                  : "Fee dihitung dari untung dalam SOL, lalu dikonversi ke USD dengan harga SOL hari itu."}
              </p>
            </div>
            <Field id="lama" label="Banner data lama setelah" error={err.lama} hint="Usulan PRD: 2 hari (BR-15).">
              <div className={`inp${err.lama ? " err" : ""}`}>
                <input id="lama" inputMode="numeric" value={lama} onChange={(e) => setLama(e.target.value)} aria-invalid={!!err.lama} aria-describedby={describedBy("lama", err.lama, true)} />
                <span className="pre">hari</span>
              </div>
            </Field>
            <Field id="ambang" label="Peringatan lonjakan saldo" error={err.ambang} hint="Usulan PRD: 30% tanpa setoran atau penarikan (AC-02-03).">
              <div className={`inp${err.ambang ? " err" : ""}`}>
                <input id="ambang" inputMode="decimal" value={ambang} onChange={(e) => setAmbang(e.target.value)} aria-invalid={!!err.ambang} aria-describedby={describedBy("ambang", err.ambang, true)} />
                <span className="pre">%</span>
              </div>
            </Field>
            <button type="submit" className="btn pri block">Simpan pengaturan</button>
          </fieldset>
        </form>
      </main>
      <Sheet buka={yakin} onTutup={() => setYakin(false)} judul="Hitung ulang semua angka?">
        <p style={{ fontSize: 15 }}>Mengubah pengaturan akan menghitung ulang posisi semua anggota. Perubahan tercatat di log.</p>
        <div className="btn-row">
          <button type="button" className="btn ton" onClick={() => setYakin(false)}>Batal</button>
          <button
            type="button"
            className="btn pri"
            onClick={() => {
              ubahPengaturan({ feePersen: nFee! / 100, satuanDasarFee: dasar, batasDataLamaHari: nLama!, ambangLonjakanPersen: nAmbang! });
              setYakin(false);
              tampilkan("Pengaturan tersimpan. Semua posisi sudah diperbarui.");
            }}
          >
            Simpan
          </button>
        </div>
      </Sheet>
    </>
  );
}
