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
  const [likuid, setLikuid] = useState(String(p.ambangLikuiditasTokenUsd));
  const [dust, setDust] = useState(String(p.ambangDustUsd));
  const [liveLama, setLiveLama] = useState(String(p.batasLiveLamaMenit));
  const [toleransi, setToleransi] = useState(String(p.toleransiCocokPersen));
  const [err, setErr] = useState<Record<string, string>>({});
  const [yakin, setYakin] = useState(false);
  if (!saya) return null;
  if (saya.peran !== "pengelola") return (<><BackBar judul="Pengaturan pool" ke="/kelola" /><main><KhususPengelola /></main></>);

  const nFee = parseAngka(fee);
  const nLama = parseAngka(lama);
  const nAmbang = parseAngka(ambang);
  const nLikuid = parseAngka(likuid);
  const nDust = parseAngka(dust);
  const nLiveLama = parseAngka(liveLama);
  const nToleransi = parseAngka(toleransi);

  function submit(e: SubmitEvent) {
    e.preventDefault();
    const e2: Record<string, string> = {};
    if (nFee === null || nFee < 0 || nFee > 100) e2.fee = "Fee harus antara 0 dan 100%.";
    if (nLama === null || nLama < 1 || !Number.isInteger(nLama)) e2.lama = "Tulis jumlah hari, minimal 1.";
    if (nAmbang === null || nAmbang <= 0) e2.ambang = "Ambang harus lebih dari 0%.";
    if (nLikuid === null || nLikuid < 0) e2.likuid = "Ambang likuiditas tidak boleh negatif.";
    if (nDust === null || nDust < 0) e2.dust = "Ambang dust tidak boleh negatif.";
    if (nLiveLama === null || nLiveLama < 1 || !Number.isInteger(nLiveLama)) e2.liveLama = "Tulis jumlah menit, minimal 1.";
    if (nToleransi === null || nToleransi < 0 || nToleransi > 100) e2.toleransi = "Toleransi harus antara 0 dan 100%.";
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
            <div>
              <dt>Wallet pool</dt>
              <dd className="num" style={{ overflowWrap: "anywhere", textAlign: "right", maxWidth: "60%" }}>
                <a href={`https://solscan.io/account/${p.alamatWalletPool}`} target="_blank" rel="noreferrer">
                  {p.alamatWalletPool.slice(0, 6)}…{p.alamatWalletPool.slice(-4)}
                </a>
              </dd>
            </div>
            <div><dt>Snapshot otomatis</dt><dd>Tiap hari {p.jamSnapshot.replace(":", ".")} WIB</dd></div>
          </dl>
          <p className="note" style={{ marginTop: 10 }}>App hanya membaca alamat publik wallet ini tiap 1 menit, tidak pernah memegang kunci.</p>
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
            <h3 style={{ fontSize: 13, fontWeight: 600, marginTop: 4 }}>Pembacaan wallet</h3>
            <Field id="likuid" label="Likuiditas minimal token" error={err.likuid} hint="Token di bawah ini dihitung $0, misalnya token spam. Usulan PRD: $10.000 (BR-17).">
              <div className={`inp${err.likuid ? " err" : ""}`}>
                <span className="pre">US$</span>
                <input id="likuid" inputMode="decimal" value={likuid} onChange={(e) => setLikuid(e.target.value)} aria-invalid={!!err.likuid} aria-describedby={describedBy("likuid", err.likuid, true)} />
              </div>
            </Field>
            <Field id="dust" label="Ambang dust" error={err.dust} hint="Transfer di bawah ini otomatis ditandai bukan arus. Usulan PRD: $1 (BR-19).">
              <div className={`inp${err.dust ? " err" : ""}`}>
                <span className="pre">US$</span>
                <input id="dust" inputMode="decimal" value={dust} onChange={(e) => setDust(e.target.value)} aria-invalid={!!err.dust} aria-describedby={describedBy("dust", err.dust, true)} />
              </div>
            </Field>
            <Field id="livelama" label="Keterangan nilai lama setelah" error={err.liveLama} hint="Usulan PRD: 15 menit tanpa pembacaan baru (BR-20).">
              <div className={`inp${err.liveLama ? " err" : ""}`}>
                <input id="livelama" inputMode="numeric" value={liveLama} onChange={(e) => setLiveLama(e.target.value)} aria-invalid={!!err.liveLama} aria-describedby={describedBy("livelama", err.liveLama, true)} />
                <span className="pre">menit</span>
              </div>
            </Field>
            <Field id="toleransi" label="Toleransi pencocokan" error={err.toleransi} hint="Selisih transfer dan permintaan di atas ini wajib diberi alasan. Usulan PRD: 2% (AC-13-01).">
              <div className={`inp${err.toleransi ? " err" : ""}`}>
                <input id="toleransi" inputMode="decimal" value={toleransi} onChange={(e) => setToleransi(e.target.value)} aria-invalid={!!err.toleransi} aria-describedby={describedBy("toleransi", err.toleransi, true)} />
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
              ubahPengaturan({
                feePersen: nFee! / 100,
                satuanDasarFee: dasar,
                batasDataLamaHari: nLama!,
                ambangLonjakanPersen: nAmbang!,
                ambangLikuiditasTokenUsd: nLikuid!,
                ambangDustUsd: nDust!,
                batasLiveLamaMenit: nLiveLama!,
                toleransiCocokPersen: nToleransi!,
              });
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
