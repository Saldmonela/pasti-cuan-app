"use client";
// Antrean permintaan (US-03, US-04 sisi pengelola): konfirmasi setor, tandai selesai tarik, tolak.
// Urutan UC-002: transfer di luar app -> isi saldo tanggal efektif (sesudah transfer) -> tandai selesai.
import Link from "next/link";
import { useState } from "react";
import { IconArrowDownLeft, IconArrowUpRight, IconInfoCircle } from "@tabler/icons-react";
import { BackBar, describedBy, Field, KhususPengelola, Sheet, StatusBanners, StatusChip } from "@/components/ui";
import { angka, parseAngka, tanggal, usd, waktu } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { Permintaan } from "@/lib/types";

type Filter = "menunggu" | "selesai" | "semua";
type Aksi = { p: Permintaan; jenis: "selesai" | "tolak" };

export default function AntreanPermintaan() {
  const { saya, data, nama, selesaikan, tolak, tampilkan, offline, hasil, hariIni } = useStore();
  const [f, setF] = useState<Filter>("menunggu");
  const [aksi, setAksi] = useState<Aksi | null>(null);
  const [tgl, setTgl] = useState("");
  const [jumlah, setJumlah] = useState("");
  const [bukti, setBukti] = useState("");
  const [alasan, setAlasan] = useState("");
  const [err, setErr] = useState<Record<string, string>>({});
  if (!saya) return null;
  if (saya.peran !== "pengelola") return (<><BackBar judul="Permintaan" ke="/kelola" /><main><KhususPengelola /></main></>);

  const daftar = data.permintaan
    .filter((p) => p.sumber === "app" && (f === "semua" || (f === "menunggu" ? p.status === "menunggu" : p.status !== "menunggu")))
    .sort((a, b) => (a.dibuatPada < b.dibuatPada ? 1 : -1));
  const n = (x: Filter) => data.permintaan.filter((p) => p.sumber === "app" && (x === "semua" || (x === "menunggu" ? p.status === "menunggu" : p.status !== "menunggu"))).length;

  function buka(p: Permintaan, jenis: Aksi["jenis"]) {
    setAksi({ p, jenis });
    setTgl(hariIni);
    setJumlah(angka(p.jumlahUsd, 2));
    setBukti("");
    setAlasan("");
    setErr({});
  }

  function proses() {
    if (!aksi) return;
    const { p } = aksi;
    if (aksi.jenis === "tolak") {
      const h = tolak(p.id, alasan);
      if (!h.ok) return setErr({ alasan: h.pesan });
      tampilkan(`Permintaan ${nama(p.anggotaId)} ditolak.`);
      return setAksi(null);
    }
    const j = parseAngka(jumlah);
    if (j === null || !(j > 0)) return setErr({ jumlah: "Jumlah harus lebih dari 0." });
    const h = selesaikan(p.id, { tanggalEfektif: tgl, jumlahFinalUsd: j, buktiTransaksi: bukti.trim() || undefined, alasan });
    if (!h.ok) return setErr({ [h.field ?? "form"]: h.pesan });
    tampilkan(`${p.jenis === "setor" ? "Setoran" : "Penarikan"} ${nama(p.anggotaId)} ${usd(j)} selesai. Semua posisi sudah diperbarui.`);
    setAksi(null);
  }

  const pAksi = aksi?.p;
  const posInvestor = pAksi ? hasil.posisi.find((x) => x.id === pAksi.anggotaId) : null;
  const jBeda = pAksi && parseAngka(jumlah) !== null && Math.abs(parseAngka(jumlah)! - pAksi.jumlahUsd) > 0.004;

  return (
    <>
      <BackBar judul="Permintaan" ke="/kelola" />
      <main>
        <StatusBanners />
        <div className="tabs" role="group" aria-label="Saring permintaan">
          {(["menunggu", "selesai", "semua"] as Filter[]).map((x) => (
            <button key={x} type="button" aria-pressed={f === x} onClick={() => setF(x)}>
              {x === "menunggu" ? "Menunggu" : x === "selesai" ? "Diproses" : "Semua"}
              <span className="n">{n(x)}</span>
            </button>
          ))}
        </div>
        <section className="card" aria-label="Daftar permintaan">
          {daftar.length === 0 ? (
            <p className="note">{f === "menunggu" ? "Belum ada permintaan." : "Belum ada permintaan yang diproses."}</p>
          ) : (
            <ul className="rows">
              {daftar.map((p) => (
                <li key={p.id}>
                  <span className="ico-dot" aria-hidden="true">
                    {p.jenis === "setor" ? <IconArrowDownLeft size={18} /> : <IconArrowUpRight size={18} />}
                  </span>
                  <div className="main">
                    <div className="t">
                      {nama(p.anggotaId)} · {p.jenis === "setor" ? "setor" : "tarik"}
                      <StatusChip s={p.status} />
                    </div>
                    <div className="s">Diajukan {waktu(p.dibuatPada)}</div>
                    {p.tanggalTransfer && <div className="s">Ditransfer {tanggal(p.tanggalTransfer)}</div>}
                    {p.buktiTransaksi && <div className="s">Bukti: {p.buktiTransaksi}</div>}
                    {p.alamatWalletTujuan && <div className="s" style={{ overflowWrap: "anywhere" }}>Ke wallet: {p.alamatWalletTujuan}</div>}
                    {p.catatan && <div className="s">Catatan: {p.catatan}</div>}
                    {p.status === "selesai" && <div className="s up">Efektif {tanggal(p.tanggalEfektif!)} · {usd(p.jumlahFinalUsd!)}</div>}
                    {p.status === "ditolak" && <div className="s dn">Ditolak: {p.alasan}</div>}
                    {p.status === "menunggu" && (
                      <div className="acts">
                        <button type="button" className="btn pri sm" disabled={offline} onClick={() => buka(p, "selesai")}>
                          {p.jenis === "setor" ? "Konfirmasi diterima" : "Tandai selesai"}
                        </button>
                        <button type="button" className="btn ghost sm" disabled={offline} onClick={() => buka(p, "tolak")}>
                          Tolak
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="v">{usd(p.jumlahUsd)}</div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      <Sheet
        buka={!!aksi}
        onTutup={() => setAksi(null)}
        judul={
          !pAksi ? "" : aksi!.jenis === "tolak" ? `Tolak permintaan ${nama(pAksi.anggotaId)}?` : pAksi.jenis === "setor" ? `Konfirmasi setoran ${nama(pAksi.anggotaId)}` : `Selesaikan penarikan ${nama(pAksi.anggotaId)}`
        }
      >
        {pAksi && aksi!.jenis === "tolak" && (
          <Field id="alasan" label="Alasan" error={err.alasan} hint="Wajib diisi. Investor akan melihat alasan ini.">
            <div className={`inp${err.alasan ? " err" : ""}`}>
              <textarea id="alasan" rows={2} value={alasan} onChange={(e) => setAlasan(e.target.value)} aria-invalid={!!err.alasan} aria-describedby={describedBy("alasan", err.alasan, true)} />
            </div>
          </Field>
        )}
        {pAksi && aksi!.jenis === "selesai" && (
          <>
            {pAksi.jenis === "tarik" && (
              <div className="banner info" style={{ background: "var(--field)" }}>
                <IconInfoCircle size={18} aria-hidden="true" />
                <p>
                  Transfer {usd(pAksi.jumlahUsd)} di luar app dulu, lalu isi saldo tanggal efektif (sesudah transfer). Nilai bersih {nama(pAksi.anggotaId)} sekarang{" "}
                  {usd(posInvestor?.netUsd ?? 0)}.
                </p>
              </div>
            )}
            <Field
              id="tgl"
              label="Tanggal efektif"
              error={err.tanggal}
              hint={`Wajib punya saldo harian. Saldo terakhir: ${hasil.tanggalData ? tanggal(hasil.tanggalData) : "belum ada"}.`}
            >
              <div className={`inp${err.tanggal ? " err" : ""}`}>
                <input id="tgl" type="date" value={tgl} onChange={(e) => setTgl(e.target.value)} aria-invalid={!!err.tanggal} aria-describedby={describedBy("tgl", err.tanggal, true)} />
              </div>
            </Field>
            {err.tanggal && (
              <Link href="/kelola/saldo" className="btn ton sm" style={{ alignSelf: "flex-start" }}>
                Isi saldo dulu
              </Link>
            )}
            <Field id="jml" label={pAksi.jenis === "setor" ? "Jumlah diterima" : "Jumlah dikirim"} error={err.jumlah} hint={`Diajukan ${usd(pAksi.jumlahUsd)}.`}>
              <div className={`inp${err.jumlah ? " err" : ""}`}>
                <span className="pre">US$</span>
                <input id="jml" inputMode="decimal" value={jumlah} onChange={(e) => setJumlah(e.target.value)} aria-invalid={!!err.jumlah} aria-describedby={describedBy("jml", err.jumlah, true)} />
              </div>
            </Field>
            {jBeda && (
              <Field id="alasan2" label="Alasan jumlah berbeda" error={err.alasan} hint="Wajib. Investor akan melihat kedua angka.">
                <div className={`inp${err.alasan ? " err" : ""}`}>
                  <input id="alasan2" value={alasan} onChange={(e) => setAlasan(e.target.value)} aria-invalid={!!err.alasan} aria-describedby={describedBy("alasan2", err.alasan, true)} />
                </div>
              </Field>
            )}
            <Field id="bkt" label="Bukti transaksi" opsional>
              <div className="inp">
                <input id="bkt" maxLength={100} value={bukti} onChange={(e) => setBukti(e.target.value)} />
              </div>
            </Field>
          </>
        )}
        {err.form && <p className="ferr" role="alert">{err.form}</p>}
        <div className="btn-row">
          <button type="button" className="btn ton" onClick={() => setAksi(null)}>
            Batal
          </button>
          <button type="button" className={`btn ${aksi?.jenis === "tolak" ? "danger" : "pri"}`} onClick={proses} disabled={offline}>
            {aksi?.jenis === "tolak" ? "Tolak" : pAksi?.jenis === "setor" ? "Konfirmasi" : "Tandai selesai"}
          </button>
        </div>
      </Sheet>
    </>
  );
}
