"use client";
// Setor modal (US-03): investor mengajukan, pengelola mengonfirmasi setelah dana diterima.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type SubmitEvent } from "react";
import { IconInfoCircle } from "@tabler/icons-react";
import { BackBar, describedBy, Field, StatusBanners } from "@/components/ui";
import { desimal, parseAngka, tanggal, usd } from "@/lib/format";
import { useStore } from "@/lib/store";

export default function Setor() {
  const { saya, ajukan, tampilkan, hariIni, offline, menunggu, data } = useStore();
  const router = useRouter();
  const [jumlah, setJumlah] = useState("");
  const [tglIsi, setTgl] = useState("");
  const tgl = tglIsi || hariIni;
  const [bukti, setBukti] = useState("");
  const [catatan, setCatatan] = useState("");
  const [err, setErr] = useState<Record<string, string>>({});
  const [kirim, setKirim] = useState(false);
  if (!saya) return null;

  const pending = menunggu.find((p) => p.anggotaId === saya.id && p.jenis === "setor");
  const nonaktif = offline || !!pending;

  function submit(e: SubmitEvent) {
    e.preventDefault();
    if (kirim) return;
    const e2: Record<string, string> = {};
    const n = parseAngka(jumlah);
    if (n === null || !(n > 0)) e2.jumlah = "Tulis jumlah setoran lebih dari 0.";
    else if (desimal(jumlah) > 2) e2.jumlah = "Jumlah USD maksimal 2 angka di belakang koma.";
    if (!tgl) e2.tgl = "Pilih tanggal transfer.";
    else if (tgl > hariIni) e2.tgl = "Tanggal transfer tidak boleh di masa depan.";
    else if (tgl < data.pengaturan.tanggalMulai) e2.tgl = `Tanggal transfer tidak boleh sebelum ${tanggal(data.pengaturan.tanggalMulai)}.`;
    setErr(e2);
    if (Object.keys(e2).length) return;
    setKirim(true);
    const h = ajukan({
      jenis: "setor",
      jumlahUsd: n!,
      tanggalTransfer: tgl,
      buktiTransaksi: bukti.trim() || undefined,
      catatan: catatan.trim() || undefined,
    });
    if (!h.ok) {
      setErr({ [h.field ?? "form"]: h.pesan });
      setKirim(false);
      return;
    }
    tampilkan(`Permintaan setoran ${usd(n!)} terkirim. Pengelola akan mengonfirmasi setelah dana diterima.`);
    router.push("/permintaan");
  }

  return (
    <>
      <BackBar judul="Setor modal" />
      <main>
        <StatusBanners />
        {pending && (
          <div className="banner warn" role="status">
            <IconInfoCircle size={18} aria-hidden="true" />
            <p>
              Kamu masih punya permintaan setoran {usd(pending.jumlahUsd)} yang menunggu. Batalkan atau tunggu yang itu selesai dulu.{" "}
              <Link href="/permintaan">Lihat permintaan</Link>
            </p>
          </div>
        )}
        <section className="card">
          <h2>Cara kerjanya</h2>
          <ol className="note" style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 4 }}>
            <li>Transfer dana ke wallet Pasti Cuan seperti biasa.</li>
            <li>Ajukan setoran di sini dengan jumlah dan tanggal transfernya.</li>
            <li>Galih mengonfirmasi setelah dana diterima. Unit kamu dibeli dengan harga 1 unit pada tanggal efektif, jadi kamu tidak ikut untung sebelum masuk.</li>
          </ol>
        </section>
        <form className="card form" onSubmit={submit} noValidate aria-describedby={err.form ? "form-err" : undefined}>
          <fieldset disabled={nonaktif} style={{ border: 0, padding: 0, margin: 0, display: "contents" }}>
            <Field id="jumlah" label="Jumlah setoran" error={err.jumlah} hint="Dalam USD, sesuai jumlah yang kamu transfer.">
              <div className={`inp big-inp${err.jumlah ? " err" : ""}`}>
                <span className="pre">US$</span>
                <input
                  id="jumlah"
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder="0,00"
                  value={jumlah}
                  onChange={(e) => setJumlah(e.target.value)}
                  aria-invalid={!!err.jumlah}
                  aria-describedby={describedBy("jumlah", err.jumlah, true)}
                />
              </div>
            </Field>
            <Field id="tgl" label="Tanggal transfer" error={err.tgl}>
              <div className={`inp${err.tgl ? " err" : ""}`}>
                <input id="tgl" type="date" value={tgl} max={hariIni} min={data.pengaturan.tanggalMulai} onChange={(e) => setTgl(e.target.value)} aria-invalid={!!err.tgl} aria-describedby={describedBy("tgl", err.tgl)} />
              </div>
            </Field>
            <Field id="bukti" label="Bukti transaksi" opsional hint="Misalnya hash transaksi atau keterangan transfer. Maks. 100 karakter.">
              <div className="inp">
                <input id="bukti" maxLength={100} value={bukti} onChange={(e) => setBukti(e.target.value)} aria-describedby="bukti-hint" />
              </div>
            </Field>
            <Field id="catatan" label="Catatan" opsional hint={`${catatan.length}/200 karakter`}>
              <div className="inp">
                <textarea id="catatan" maxLength={200} rows={2} value={catatan} onChange={(e) => setCatatan(e.target.value)} aria-describedby="catatan-hint" />
              </div>
            </Field>
            {err.form && (
              <p className="ferr" id="form-err" role="alert">
                {err.form}
              </p>
            )}
            <button type="submit" className="btn pri block" disabled={kirim || nonaktif}>
              {kirim ? "Mengirim…" : "Ajukan setoran"}
            </button>
          </fieldset>
        </form>
      </main>
    </>
  );
}
