"use client";
// Snapshot saldo (US-02 v1.1): status pembaca wallet, daftar snapshot otomatis/manual, isi manual saat
// pembacaan gagal, dan koreksi dengan konfirmasi hitung ulang (BR-11) serta peringatan lonjakan.
import { useState, type SubmitEvent } from "react";
import { IconAlertTriangle, IconCircleCheck, IconPencil, IconTrash } from "@tabler/icons-react";
import { BackBar, describedBy, Field, KhususPengelola, Sheet, StatusBanners } from "@/components/ui";
import { angka, desimal, parseAngka, sol, tambahHari, tanggal, usd, waktu } from "@/lib/format";
import { isoWib, ms, msSnapshot, nilaiToken, RINCIAN_1303, WAKTU_1303 } from "@/lib/onchain";
import { useStore } from "@/lib/store";
import type { SumberSnapshot } from "@/lib/types";

const LABEL_SUMBER: Record<SumberSnapshot, string> = { otomatis: "Otomatis", manual: "Manual", koreksi: "Koreksi", impor: "Impor" };

type Tunda = { jenis: "lonjakan"; persen: number } | { jenis: "ubah" } | { jenis: "hapus"; tgl: string };

export default function Saldo() {
  const { saya, data, hariIni, simpanSnapshot, hapusSnapshot, tampilkan, offline, titik, titikAkhir, lamaLiveMenit, sekarang } = useStore();
  const adaHariIni = data.snapshots.some((s) => s.tanggal === hariIni);
  const [bukaForm, setTampilForm] = useState(false);
  // snapshot hari ini belum ada (pembacaan otomatis gagal): form manual selalu terbuka
  const tampilForm = bukaForm || !adaHariIni;
  const [alasan, setAlasan] = useState("");
  const [tglIsi, setTgl] = useState("");
  const tgl = tglIsi || hariIni;
  const [usdTeks, setUsd] = useState("");
  const [solTeks, setSol] = useState("");
  const [feeLp, setFeeLp] = useState("");
  const [catatan, setCatatan] = useState("");
  const [mode, setMode] = useState<"baru" | "ubah">("baru");
  const [err, setErr] = useState<Record<string, string>>({});
  const [tunda, setTunda] = useState<Tunda | null>(null);
  const [kirim, setKirim] = useState(false);
  const [semua, setSemua] = useState(false);
  if (!saya) return null;
  if (saya.peran !== "pengelola") return (<><BackBar judul="Snapshot saldo" ke="/kelola" /><main><KhususPengelola /></main></>);

  const nUsd = parseAngka(usdTeks);
  const nSol = parseAngka(solTeks);
  const harga = nUsd && nSol && nUsd > 0 && nSol > 0 ? nUsd / nSol : null;
  const urut = [...data.snapshots].sort((a, b) => (a.tanggal < b.tanggal ? 1 : -1));
  const dipakai = new Set(data.permintaan.filter((p) => p.status === "selesai").map((p) => p.tanggalEfektif));
  const jam = data.pengaturan.jamSnapshot;
  const yangDiubah = mode === "ubah" ? data.snapshots.find((x) => x.tanggal === tgl) : undefined;
  const butuhAlasan = yangDiubah?.sumber === "otomatis" || yangDiubah?.sumber === "koreksi";
  // NF-10: persentase menit hari ini yang menghasilkan titik nilai
  const awalHari = ms(hariIni);
  const menitHariIni = Math.max(1, Math.floor((sekarang - awalHari) / 60_000) + 1);
  const berhasil = titik.filter((t) => t.ms >= awalHari).length;
  const persenBerhasil = Math.min(100, (berhasil / menitHariIni) * 100);
  const lama = lamaLiveMenit > data.pengaturan.batasLiveLamaMenit;
  const berikut = sekarang >= msSnapshot(hariIni, jam) ? tambahHari(hariIni, 1) : hariIni;
  const tokenNol = RINCIAN_1303.token.filter((t) => nilaiToken(t, data.pengaturan) === 0).length;

  function validasi(): boolean {
    const e: Record<string, string> = {};
    if (!tgl) e.tgl = "Pilih tanggal.";
    else if (tgl > hariIni) e.tgl = "Tanggal tidak boleh di masa depan.";
    else if (tgl < data.pengaturan.tanggalMulai) e.tgl = `Tanggal tidak boleh sebelum ${tanggal(data.pengaturan.tanggalMulai)}.`;
    else if (mode === "baru" && data.snapshots.some((s) => s.tanggal === tgl))
      e.tgl = `Saldo untuk ${tanggal(tgl)} sudah ada. Ubah data yang ada atau pilih tanggal lain.`;
    if (nUsd === null || nSol === null || !(nUsd > 0) || !(nSol > 0)) e.nilai = "Nilai USD dan saldo SOL harus lebih dari 0.";
    else if (desimal(usdTeks) > 2) e.nilai = "Nilai USD maksimal 2 angka di belakang koma.";
    else if (desimal(solTeks) > 6) e.nilai = "Saldo SOL maksimal 6 angka di belakang koma.";
    const fl = feeLp.trim() ? parseAngka(feeLp) : 0;
    if (fl === null || fl < 0) e.feeLp = "Fee LP tidak boleh negatif.";
    if (butuhAlasan && !alasan.trim()) e.alasan = "Alasan koreksi wajib diisi.";
    setErr(e);
    return !Object.keys(e).length;
  }

  function lonjakan(): number | null {
    const sebelum = urut.find((s) => s.tanggal < tgl);
    if (!sebelum || !nUsd) return null;
    const adaArus = data.permintaan.some((p) => p.status === "selesai" && p.tanggalEfektif === tgl);
    const pct = (Math.abs(nUsd - sebelum.nilaiUsd) / sebelum.nilaiUsd) * 100;
    return !adaArus && pct > data.pengaturan.ambangLonjakanPersen ? pct : null;
  }

  function simpan() {
    setKirim(true);
    const h = simpanSnapshot(
      {
        tanggal: tgl,
        nilaiUsd: nUsd!,
        saldoSol: nSol!,
        feeLpDiklaimSol: feeLp.trim() ? parseAngka(feeLp)! : undefined,
        catatan: catatan.trim() || undefined,
        alasan: alasan.trim() || undefined,
      },
      mode === "ubah",
    );
    setKirim(false);
    setTunda(null);
    if (!h.ok) return setErr({ [h.field === "tanggal" ? "tgl" : (h.field ?? "form")]: h.pesan });
    tampilkan(`Saldo ${tanggal(tgl)} tersimpan. Semua posisi sudah diperbarui.`);
    setMode("baru");
    setAlasan("");
    setTampilForm(false);
    setUsd("");
    setSol("");
    setFeeLp("");
    setCatatan("");
  }

  function submit(e: SubmitEvent) {
    e.preventDefault();
    if (kirim || !validasi()) return;
    const l = lonjakan();
    if (l !== null) return setTunda({ jenis: "lonjakan", persen: l });
    if (mode === "ubah") return setTunda({ jenis: "ubah" });
    simpan();
  }

  function mulaiUbah(t: string) {
    const s = data.snapshots.find((x) => x.tanggal === t)!;
    setMode("ubah");
    setTgl(t);
    setUsd(angka(s.nilaiUsd, 2));
    setSol(String(s.saldoSol).replace(".", ","));
    setFeeLp(s.feeLpDiklaimSol !== undefined ? String(s.feeLpDiklaimSol).replace(".", ",") : "");
    setCatatan(s.catatan ?? "");
    setAlasan("");
    setErr({});
    setTampilForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <>
      <BackBar judul="Snapshot saldo" ke="/kelola" />
      <main>
        <StatusBanners />
        <section className="card" aria-labelledby="pembaca">
          <h2 id="pembaca">Pembaca wallet</h2>
          <p style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }} className={lama ? undefined : "up"}>
            {lama ? <IconAlertTriangle size={20} aria-hidden="true" /> : <IconCircleCheck size={20} aria-hidden="true" />}
            <b style={{ fontWeight: 600 }}>{lama ? "Pembacaan tertunda" : "Berjalan normal"}</b>
          </p>
          <dl className="kv lines">
            <div>
              <dt>Titik nilai terakhir</dt>
              <dd>{titikAkhir ? waktu(isoWib(titikAkhir.ms)) : "Belum ada"}</dd>
            </div>
            {titikAkhir && (
              <div>
                <dt>Isi wallet</dt>
                <dd>
                  {usd(titikAkhir.nilaiUsd)}
                  <small>{sol(titikAkhir.saldoSol)}</small>
                </dd>
              </div>
            )}
            <div>
              <dt>Menit berhasil hari ini</dt>
              <dd>{angka(persenBerhasil, 1)}%</dd>
            </div>
            <div>
              <dt>Snapshot otomatis berikutnya</dt>
              <dd>
                {tanggal(berikut)}, {jam.replace(":", ".")} WIB
              </dd>
            </div>
          </dl>
          {titikAkhir?.ms === WAKTU_1303 && (
            <details style={{ marginTop: 10 }}>
              <summary className="note" style={{ cursor: "pointer" }}>
                Rincian pembacaan 13.03 WIB
              </summary>
              <dl className="kv" style={{ marginTop: 6 }}>
                <div>
                  <dt>Posisi Meteora DLMM</dt>
                  <dd>{usd(RINCIAN_1303.dlmmUsd)}</dd>
                </div>
                <div>
                  <dt>Fee LP belum diklaim</dt>
                  <dd>{usd(RINCIAN_1303.feeBelumKlaimUsd)}</dd>
                </div>
                <div>
                  <dt>SOL di wallet ({angka(RINCIAN_1303.solNative, 4)} SOL)</dt>
                  <dd>{usd(RINCIAN_1303.solNative * RINCIAN_1303.hargaSol)}</dd>
                </div>
                {RINCIAN_1303.token
                  .filter((t) => nilaiToken(t, data.pengaturan) > 0)
                  .map((t) => (
                    <div key={t.mint}>
                      <dt>{t.simbol}</dt>
                      <dd>{usd(nilaiToken(t, data.pengaturan))}</dd>
                    </div>
                  ))}
                {tokenNol > 0 && (
                  <div>
                    <dt>{tokenNol} token tanpa harga atau likuiditas</dt>
                    <dd>{usd(0)}</dd>
                  </div>
                )}
              </dl>
            </details>
          )}
          <p className="note" style={{ marginTop: 10 }}>
            Dibaca otomatis tiap menit dari Meteora, Solana RPC, dan Jupiter. Titik nilai pertama sesudah {jam.replace(":", ".")} WIB menjadi snapshot
            resmi. Isi manual hanya bila pembacaan gagal atau angkanya keliru.
          </p>
          {!tampilForm && (
            <button type="button" className="btn ton sm" style={{ marginTop: 12 }} onClick={() => setTampilForm(true)}>
              Isi snapshot manual
            </button>
          )}
        </section>

        {tampilForm && (
        <form className="card form" onSubmit={submit} noValidate>
          <h2 style={{ marginBottom: -4 }}>{mode === "ubah" ? `${butuhAlasan ? "Koreksi" : "Ubah"} snapshot ${tanggal(tgl)}` : "Snapshot manual"}</h2>
          {titikAkhir && mode === "baru" && (
            <div className="banner info" style={{ background: "var(--field)" }}>
              <p>
                Pembanding, titik nilai terakhir yang berhasil: {waktu(isoWib(titikAkhir.ms))} · {usd(titikAkhir.nilaiUsd)} · {sol(titikAkhir.saldoSol)}.{" "}
                <button
                  type="button"
                  className="linkish"
                  onClick={() => {
                    setUsd(angka(titikAkhir.nilaiUsd, 2));
                    setSol(angka(titikAkhir.saldoSol, 6));
                  }}
                >
                  Pakai angka ini
                </button>
              </p>
            </div>
          )}
          <fieldset disabled={offline} style={{ border: 0, padding: 0, margin: 0, display: "contents" }}>
            <Field id="tgl" label="Tanggal" error={err.tgl} hint="Satu tanggal maksimal satu saldo. Dicatat sesudah setoran atau penarikan hari itu.">
              <div className={`inp${err.tgl ? " err" : ""}${mode === "ubah" ? " ro" : ""}`}>
                <input
                  id="tgl"
                  type="date"
                  value={tgl}
                  min={data.pengaturan.tanggalMulai}
                  max={hariIni}
                  readOnly={mode === "ubah"}
                  onChange={(e) => setTgl(e.target.value)}
                  aria-invalid={!!err.tgl}
                  aria-describedby={describedBy("tgl", err.tgl, true)}
                />
              </div>
            </Field>
            <Field id="usd" label="Nilai wallet (USD)" hint="Total nilai wallet seperti terlihat di Jupiter.">
              <div className={`inp${err.nilai ? " err" : ""}`}>
                <span className="pre">US$</span>
                <input id="usd" inputMode="decimal" placeholder="2.076,53" value={usdTeks} onChange={(e) => setUsd(e.target.value)} aria-describedby="usd-hint" aria-invalid={!!err.nilai} />
              </div>
            </Field>
            <Field id="sol" label="Saldo wallet (SOL)" error={err.nilai} hint="Total nilai wallet dalam SOL, maks. 6 desimal.">
              <div className={`inp${err.nilai ? " err" : ""}`}>
                <input id="sol" inputMode="decimal" placeholder="27,439535" value={solTeks} onChange={(e) => setSol(e.target.value)} aria-describedby={describedBy("sol", err.nilai, true)} aria-invalid={!!err.nilai} />
                <span className="pre">SOL</span>
              </div>
            </Field>
            <div className="field">
              <span className="flabel">Harga SOL turunan</span>
              <div className="inp ro" aria-live="polite">
                <span style={{ padding: "14px 0", fontSize: 16 }} className="num">{harga ? `${usd(harga)} per SOL` : "Terisi otomatis dari USD ÷ SOL"}</span>
              </div>
              <p className="hint">Cek kewajarannya dengan harga SOL hari ini.</p>
            </div>
            <Field id="feelp" label="Fee LP yang diklaim (SOL)" opsional error={err.feeLp}>
              <div className={`inp${err.feeLp ? " err" : ""}`}>
                <input id="feelp" inputMode="decimal" placeholder="0" value={feeLp} onChange={(e) => setFeeLp(e.target.value)} aria-invalid={!!err.feeLp} aria-describedby={describedBy("feelp", err.feeLp)} />
              </div>
            </Field>
            <Field id="cat" label="Catatan" opsional hint={`${catatan.length}/500 karakter`}>
              <div className="inp">
                <textarea id="cat" maxLength={500} rows={2} value={catatan} onChange={(e) => setCatatan(e.target.value)} aria-describedby="cat-hint" />
              </div>
            </Field>
            {butuhAlasan && (
              <Field id="alasan" label="Alasan koreksi" error={err.alasan} hint="Wajib untuk snapshot otomatis. Tercatat di log audit.">
                <div className={`inp${err.alasan ? " err" : ""}`}>
                  <input id="alasan" maxLength={200} value={alasan} onChange={(e) => setAlasan(e.target.value)} aria-invalid={!!err.alasan} aria-describedby={describedBy("alasan", err.alasan, true)} />
                </div>
              </Field>
            )}
            {err.form && <p className="ferr" role="alert">{err.form}</p>}
            <div className="btn-row">
              <button
                type="button"
                className="btn ton"
                onClick={() => {
                  setMode("baru");
                  setTgl(hariIni);
                  setUsd("");
                  setSol("");
                  setAlasan("");
                  setErr({});
                  setTampilForm(false);
                }}
              >
                Batal
              </button>
              <button type="submit" className="btn pri" disabled={kirim}>
                {kirim ? "Menyimpan…" : "Simpan"}
              </button>
            </div>
          </fieldset>
        </form>
        )}

        <section className="card" aria-labelledby="riwayat-saldo">
          <h2 id="riwayat-saldo">Riwayat snapshot</h2>
          {urut.length === 0 ? (
            <p className="note">Belum ada saldo. Catat saldo pertama atau impor riwayat.</p>
          ) : (
            <ul className="rows">
              {(semua ? urut : urut.slice(0, 7)).map((s) => (
                <li key={s.tanggal}>
                  <div className="main">
                    <div className="t">
                      {tanggal(s.tanggal)}
                      <span className={`chip ${s.sumber === "otomatis" ? "dicocokkan" : s.sumber === "koreksi" ? "belum" : "dibatalkan"}`}>
                        {LABEL_SUMBER[s.sumber]}
                      </span>
                      {dipakai.has(s.tanggal) && <span className="chip dibatalkan">Ada transaksi</span>}
                    </div>
                    <div className="s">
                      {angka(s.saldoSol, 4)} SOL · Harga SOL {usd(s.nilaiUsd / s.saldoSol)}
                      {s.diubahPada ? " · diubah" : ""}
                      {s.alasan ? ` · ${s.alasan}` : ""}
                    </div>
                  </div>
                  <div className="v">{usd(s.nilaiUsd)}</div>
                  <div style={{ display: "flex", gap: 2, marginTop: -6 }}>
                    <button type="button" className="btn ghost sm" style={{ padding: "0 10px" }} aria-label={`Ubah saldo ${tanggal(s.tanggal)}`} onClick={() => mulaiUbah(s.tanggal)} disabled={offline}>
                      <IconPencil size={18} aria-hidden="true" />
                    </button>
                    <button type="button" className="btn ghost sm" style={{ padding: "0 10px" }} aria-label={`Hapus saldo ${tanggal(s.tanggal)}`} onClick={() => setTunda({ jenis: "hapus", tgl: s.tanggal })} disabled={offline}>
                      <IconTrash size={18} aria-hidden="true" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {urut.length > 7 && (
            <button type="button" className="btn ghost sm" onClick={() => setSemua(!semua)}>
              {semua ? "Tampilkan 7 terakhir" : `Tampilkan semua (${urut.length})`}
            </button>
          )}
        </section>
      </main>

      <Sheet
        buka={!!tunda}
        onTutup={() => setTunda(null)}
        judul={tunda?.jenis === "lonjakan" ? "Yakin angkanya benar?" : tunda?.jenis === "hapus" ? `Hapus saldo ${tanggal(tunda.tgl)}?` : "Hitung ulang semua angka?"}
      >
        {tunda?.jenis === "lonjakan" && (
          <p style={{ fontSize: 15 }}>
            Saldo berubah {Math.round(tunda.persen)}% dari kemarin tanpa ada setoran atau penarikan. Yakin angkanya benar?
          </p>
        )}
        {tunda?.jenis === "ubah" && <p style={{ fontSize: 15 }}>Mengubah saldo tanggal ini akan menghitung ulang semua angka sesudahnya. Lanjutkan?</p>}
        {tunda?.jenis === "hapus" && (
          <p style={{ fontSize: 15 }}>
            {dipakai.has(tunda.tgl)
              ? "Saldo ini dipakai sebagai tanggal efektif transaksi, jadi hanya bisa diubah, tidak bisa dihapus."
              : "Angka sesudah tanggal ini dihitung ulang. Perubahan tercatat di log."}
          </p>
        )}
        <div className="btn-row">
          <button type="button" className="btn ton" onClick={() => setTunda(null)}>
            {tunda?.jenis === "lonjakan" ? "Cek lagi" : "Batal"}
          </button>
          {tunda?.jenis === "hapus" ? (
            <button
              type="button"
              className="btn danger"
              disabled={dipakai.has(tunda.tgl)}
              onClick={() => {
                const h = hapusSnapshot(tunda.tgl);
                setTunda(null);
                if (h.ok) tampilkan(`Saldo ${tanggal(tunda.tgl)} dihapus. Semua posisi sudah diperbarui.`);
              }}
            >
              Hapus
            </button>
          ) : (
            <button type="button" className="btn pri" onClick={simpan} disabled={kirim}>
              {tunda?.jenis === "lonjakan" ? "Simpan tetap" : "Lanjutkan"}
            </button>
          )}
        </div>
      </Sheet>
    </>
  );
}
