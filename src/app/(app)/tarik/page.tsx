"use client";
// Tarik modal dengan simulasi (US-04, BR-06). Simulasi dihitung ulang setiap kali jumlah diketik.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type SubmitEvent } from "react";
import { IconAlertTriangle, IconInfoCircle } from "@tabler/icons-react";
import { BackBar, describedBy, Field, Sheet, StatusBanners } from "@/components/ui";
import { simulasiTarik } from "@/lib/engine";
import { angka, desimal, parseAngka, persen, uang, usd } from "@/lib/format";
import { useStore } from "@/lib/store";

export default function Tarik() {
  const { saya, hasil, data, ajukan, tampilkan, offline, cekGagal, menunggu } = useStore();
  const router = useRouter();
  const [jumlah, setJumlah] = useState("");
  const [alamat, setAlamat] = useState("");
  const [catatan, setCatatan] = useState("");
  const [err, setErr] = useState<Record<string, string>>({});
  const [konfirmasi, setKonfirmasi] = useState<{ net: number } | null>(null);
  const [kirim, setKirim] = useState(false);
  if (!saya) return null;

  const pos = hasil.posisi.find((p) => p.id === saya.id)!;
  const pending = menunggu.find((p) => p.anggotaId === saya.id && p.jenis === "tarik");
  const n = parseAngka(jumlah);
  const lewat = n !== null && n > pos.netUsd + 0.005;
  const sim = n !== null && n > 0 && !lewat ? simulasiTarik(hasil, saya.id, n, data.pengaturan) : null;
  const nonaktif = offline || cekGagal || !!pending || pos.netUsd <= 0.004;

  function cek(e: SubmitEvent) {
    e.preventDefault();
    const e2: Record<string, string> = {};
    if (n === null || !(n > 0)) e2.jumlah = "Tulis jumlah penarikan lebih dari 0.";
    else if (desimal(jumlah) > 2) e2.jumlah = "Jumlah USD maksimal 2 angka di belakang koma.";
    else if (lewat) e2.jumlah = `Maksimal yang bisa kamu tarik hari ini ${usd(pos.netUsd)}.`;
    setErr(e2);
    if (!Object.keys(e2).length) setKonfirmasi({ net: pos.netUsd });
  }

  function ajukanSekarang() {
    if (kirim || !konfirmasi) return;
    // versi_data: jika angka berubah sejak simulasi, minta investor cek ulang
    if (Math.abs(konfirmasi.net - pos.netUsd) > 0.004) {
      setKonfirmasi(null);
      setErr({ form: "Angka baru saja diperbarui. Cek lagi simulasi kamu." });
      return;
    }
    setKirim(true);
    const h = ajukan({
      jenis: "tarik",
      jumlahUsd: n!,
      alamatWalletTujuan: alamat.trim() || undefined,
      catatan: catatan.trim() || undefined,
    });
    if (!h.ok) {
      setKonfirmasi(null);
      setErr({ [h.field ?? "form"]: h.pesan });
      setKirim(false);
      return;
    }
    tampilkan(`Permintaan tarik ${usd(n!)} terkirim. Status: menunggu pengelola.`);
    router.push("/permintaan");
  }

  return (
    <>
      <BackBar judul="Tarik modal" />
      <main>
        <StatusBanners />
        {cekGagal && (
          <div className="banner warn" role="alert">
            <IconAlertTriangle size={18} aria-hidden="true" />
            <p>Penarikan ditahan sementara karena angka sedang dicek ulang.</p>
          </div>
        )}
        {pending && (
          <div className="banner warn" role="status">
            <IconInfoCircle size={18} aria-hidden="true" />
            <p>
              Kamu masih punya permintaan penarikan {usd(pending.jumlahUsd)} yang menunggu. Batalkan atau tunggu yang itu selesai dulu.{" "}
              <Link href="/permintaan">Lihat permintaan</Link>
            </p>
          </div>
        )}

        <section className="card" aria-labelledby="maks">
          <div className="lb" id="maks">Bisa ditarik hari ini</div>
          <div className="fig-lg" style={{ marginTop: 4 }}>{usd(pos.netUsd)}</div>
          <p className="note" style={{ marginTop: 4 }}>
            {uang(pos.netSol, "SOL")} · sudah dipotong fee terutang {usd(pos.feeUsd)}
          </p>
        </section>

        <form className="card form" onSubmit={cek} noValidate>
          <fieldset disabled={nonaktif} style={{ border: 0, padding: 0, margin: 0, display: "contents" }}>
            <Field
              id="jumlah"
              label="Jumlah penarikan"
              error={err.jumlah}
              hint="Boleh sebagian atau semua, kapan saja."
            >
              <div className={`inp big-inp${err.jumlah ? " err" : ""}`}>
                <span className="pre">US$</span>
                <input
                  id="jumlah"
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder="0,00"
                  value={jumlah}
                  onChange={(e) => {
                    setJumlah(e.target.value);
                    if (err.jumlah) setErr({});
                  }}
                  aria-invalid={!!err.jumlah}
                  aria-describedby={describedBy("jumlah", err.jumlah, true)}
                />
                <button
                  type="button"
                  className="btn ghost sm"
                  onClick={() => setJumlah(angka(Math.floor(pos.netUsd * 100) / 100, 2))}
                >
                  Tarik semua
                </button>
              </div>
            </Field>

            <div aria-live="polite">
              {sim ? (
                <div style={{ background: "var(--field)", borderRadius: 16, padding: "12px 16px" }}>
                  <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Kalau kamu tarik {usd(n!)} hari ini</h3>
                  <dl className="kv">
                    <div>
                      <dt>Unit terjual</dt>
                      <dd>{angka(sim.unitTerjual, 4)}</dd>
                    </div>
                    <div>
                      <dt>Fee dibayar ke pengelola</dt>
                      <dd>{usd(sim.feeDibayar)}</dd>
                    </div>
                    <div>
                      <dt>Sisa modal dasar</dt>
                      <dd>{usd(sim.sisaModalUsd)}</dd>
                    </div>
                    <div>
                      <dt>Sisa porsi</dt>
                      <dd>{persen(sim.sisaPorsi)}</dd>
                    </div>
                    <div className="tot">
                      <dt>Sisa nilai bersih</dt>
                      <dd>{usd(sim.sisaNetUsd)}</dd>
                    </div>
                  </dl>
                  {pos.profitUsd < 0 && <p className="note" style={{ marginTop: 6 }}>Kamu sedang rugi, jadi tidak ada fee yang dipotong.</p>}
                  {hasil.live && (
                    <p className="note" style={{ marginTop: 6 }}>
                      Perkiraan dengan nilai {hasil.live.dibacaPada.slice(11, 16).replace(":", ".")} WIB. Angka final memakai nilai pada tanggal efektif.
                    </p>
                  )}
                </div>
              ) : (
                <p className="note">Simulasi muncul setelah kamu mengetik jumlah.</p>
              )}
            </div>

            <Field id="alamat" label="Alamat wallet tujuan" opsional hint="Maks. 64 karakter. Pengelola mentransfer di luar app.">
              <div className="inp">
                <input id="alamat" maxLength={64} autoComplete="off" spellCheck={false} value={alamat} onChange={(e) => setAlamat(e.target.value)} aria-describedby="alamat-hint" />
              </div>
            </Field>
            <Field id="catatan" label="Catatan" opsional hint={`${catatan.length}/200 karakter`}>
              <div className="inp">
                <textarea id="catatan" maxLength={200} rows={2} value={catatan} onChange={(e) => setCatatan(e.target.value)} aria-describedby="catatan-hint" />
              </div>
            </Field>
            {err.form && (
              <p className="ferr" role="alert">
                {err.form}
              </p>
            )}
            <button type="submit" className="btn pri block" disabled={nonaktif}>
              Ajukan penarikan
            </button>
          </fieldset>
        </form>
      </main>

      <Sheet buka={!!konfirmasi} onTutup={() => setKonfirmasi(null)} judul={`Tarik ${n !== null ? usd(n) : ""}?`}>
        {sim && (
          <p style={{ fontSize: 15 }}>
            Fee {usd(sim.feeDibayar)} akan dibayarkan ke pengelola. Sisa nilai kamu {usd(sim.sisaNetUsd)}.
          </p>
        )}
        <p className="note">Uang dikirim pengelola di luar app. Kamu bisa membatalkan selama status masih menunggu.</p>
        <div className="btn-row">
          <button type="button" className="btn ton" onClick={() => setKonfirmasi(null)}>
            Batal
          </button>
          <button type="button" className="btn pri" onClick={ajukanSekarang} disabled={kirim}>
            {kirim ? "Mengirim…" : "Ya, ajukan"}
          </button>
        </div>
      </Sheet>
    </>
  );
}
