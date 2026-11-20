"use client";
// Antrean permintaan (US-03, US-04 sisi pengelola): konfirmasi setor, tandai selesai tarik, tolak.
// Urutan UC-002 (v1.1): transfer di luar app -> transfer terdeteksi di Arus onchain dan dicocokkan ->
// tandai selesai dengan jumlah, bukti, dan tanggal efektif terisi (snapshot resmi pertama sesudah transfer).
import Link from "next/link";
import { useEffect, useState } from "react";
import { IconArrowDownLeft, IconArrowUpRight, IconInfoCircle } from "@tabler/icons-react";
import { BackBar, describedBy, Field, KhususPengelola, Sheet, StatusBanners, StatusChip } from "@/components/ui";
import { angka, parseAngka, tanggal, usd, waktu } from "@/lib/format";
import { hapusTujuanSelesai, lihatTujuanSelesai, tanggalEfektifArus, useStore } from "@/lib/store";
import type { Permintaan } from "@/lib/types";

type Filter = "menunggu" | "selesai" | "semua";
type Aksi = { p: Permintaan; jenis: "selesai" | "tolak" };

export default function AntreanPermintaan() {
  const { saya, data, arusBelum, nama, selesaikan, tolak, tampilkan, offline, hasil, hariIni } = useStore();
  const jam = data.pengaturan.jamSnapshot;
  const arusDari = (p: Permintaan) => data.arus.filter((a) => a.permintaanId === p.id).sort((a, b) => (a.waktu < b.waktu ? -1 : 1));
  const arusBelumSearah = (p: Permintaan) => arusBelum.filter((a) => (p.jenis === "setor" ? a.arah === "masuk" : a.arah === "keluar"));
  /** Isian awal "Tandai selesai": dari arus onchain yang dicocokkan bila ada (AC-13-01). */
  const isian = (p: Permintaan) => {
    const a = arusDari(p);
    if (!a.length) {
      return {
        tgl: p.jenis === "tarik" ? tanggalEfektifArus(p.dibuatPada, jam) : hariIni,
        jumlah: angka(p.jumlahUsd, 2),
        bukti: "",
      };
    }
    return {
      tgl: tanggalEfektifArus(a[a.length - 1].waktu, jam),
      jumlah: angka(a.reduce((t, x) => t + x.nilaiUsd, 0), 2),
      bukti: a.map((x) => x.signature).join(", ").slice(0, 100),
    };
  };
  // dibuka dari halaman Arus: langsung tampilkan lembar selesai untuk permintaan itu
  const tujuan = lihatTujuanSelesai();
  const pAwal = tujuan
    ? data.permintaan.find((p) => p.id === (tujuan.permintaanId ?? data.arus.find((a) => a.id === tujuan.arusId)?.permintaanId) && p.status === "menunggu")
    : undefined;
  const isiAwal = pAwal ? isian(pAwal) : null;
  useEffect(() => hapusTujuanSelesai(), []);
  const [f, setF] = useState<Filter>("menunggu");
  const [aksi, setAksi] = useState<Aksi | null>(pAwal ? { p: pAwal, jenis: "selesai" } : null);
  const [tgl, setTgl] = useState(isiAwal?.tgl ?? "");
  const [jumlah, setJumlah] = useState(isiAwal?.jumlah ?? "");
  const [bukti, setBukti] = useState(isiAwal?.bukti ?? "");
  const [alasan, setAlasan] = useState("");
  const [sedangProses, setSedangProses] = useState(false);
  const [err, setErr] = useState<Record<string, string>>({});
  if (!saya) return null;
  if (saya.peran !== "pengelola") return (<><BackBar judul="Permintaan" ke="/kelola" /><main><KhususPengelola /></main></>);

  const daftar = data.permintaan
    .filter((p) => p.sumber === "app" && (f === "semua" || (f === "menunggu" ? p.status === "menunggu" : p.status !== "menunggu")))
    .sort((a, b) => (a.dibuatPada < b.dibuatPada ? 1 : -1));
  const n = (x: Filter) => data.permintaan.filter((p) => p.sumber === "app" && (x === "semua" || (x === "menunggu" ? p.status === "menunggu" : p.status !== "menunggu"))).length;

  function buka(p: Permintaan, jenis: Aksi["jenis"]) {
    const i = isian(p);
    setAksi({ p, jenis });
    setTgl(i.tgl);
    setJumlah(i.jumlah);
    setBukti(i.bukti);
    setAlasan("");
    setErr({});
  }

  async function proses() {
    if (!aksi || sedangProses) return;
    const { p } = aksi;
    if (aksi.jenis === "tolak") {
      if (!alasan.trim()) return setErr({ alasan: "Alasan penolakan wajib diisi." });
      setSedangProses(true);
      try {
        const h = await tolak(p.id, alasan);
        if (!h.ok) return setErr({ alasan: h.pesan });
        tampilkan(`Permintaan ${nama(p.anggotaId)} ditolak.`);
        setAksi(null);
      } finally {
        setSedangProses(false);
      }
      return;
    }
    const j = parseAngka(jumlah);
    if (j === null || !(j > 0)) return setErr({ jumlah: "Jumlah harus lebih dari 0." });
    setSedangProses(true);
    try {
      const h = await selesaikan(p.id, { tanggalEfektif: tgl, jumlahFinalUsd: j, buktiTransaksi: bukti.trim() || undefined, alasan });
      if (!h.ok) return setErr({ [h.field ?? "form"]: h.pesan });
      tampilkan(`${p.jenis === "setor" ? "Setoran" : "Penarikan"} ${nama(p.anggotaId)} ${usd(j)} selesai. Semua posisi sudah diperbarui.`);
      setAksi(null);
    } finally {
      setSedangProses(false);
    }
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
                    {p.dibuatOleh && <div className="s">Dibuat pengelola dari transfer di wallet</div>}
                    {p.status === "menunggu" &&
                      (arusDari(p).length ? (
                        <div className="s up">
                          Transfer cocok: {usd(arusDari(p).reduce((t, x) => t + x.nilaiUsd, 0))} ({arusDari(p).length} transfer), efektif{" "}
                          {tanggal(tanggalEfektifArus(arusDari(p).at(-1)!.waktu, jam))}
                        </div>
                      ) : arusBelumSearah(p).length > 0 ? (
                        <div className="s">
                          Ada {arusBelumSearah(p).length} transfer {p.jenis === "setor" ? "masuk" : "keluar"} belum dicocokkan.{" "}
                          <Link href="/kelola/arus">Cocokkan di Arus onchain</Link>
                        </div>
                      ) : (
                        <div className="s">
                          Belum ada transfer yang dicocokkan. <Link href="/kelola/arus">Lihat arus onchain</Link>
                        </div>
                      ))}
                    {p.status === "selesai" && (
                      <div className="s up">
                        Efektif {p.waktuEfektif ? waktu(p.waktuEfektif) : p.tanggalEfektif ? tanggal(p.tanggalEfektif) : "—"} ·{" "}
                        {usd(p.jumlahFinalUsd ?? p.jumlahUsd)}
                      </div>
                    )}
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
            <div className="banner info" style={{ background: "var(--field)" }}>
              <IconInfoCircle size={18} aria-hidden="true" />
              <p>
                {arusDari(pAksi).length
                  ? "Transfer sudah terdeteksi dan dicocokkan. Jumlah, bukti, dan tanggal efektif terisi dari wallet."
                  : `Untuk transfer onchain, tunggu ±5 menit setelah transfer lalu cocokkan di Arus onchain — permintaan akan otomatis selesai pada waktu transfer tanpa perlu isi manual di sini.`}{" "}
                {pAksi.jenis === "tarik" && `Nilai bersih ${nama(pAksi.anggotaId)} sekarang ${usd(posInvestor?.netUsd ?? 0)}.`}
              </p>
            </div>
            {!arusDari(pAksi).length && (
              <Link href="/kelola/arus" className="btn ton sm" style={{ alignSelf: "flex-start" }}>
                Buka Arus onchain
              </Link>
            )}
            <Field
              id="tgl"
              label="Tanggal efektif"
              error={err.tanggal}
              hint={`Snapshot resmi pertama sesudah transfer. Wajib sudah ada; snapshot terakhir ${hasil.tanggalData ? tanggal(hasil.tanggalData) : "belum ada"}.`}
            >
              <div className={`inp${err.tanggal ? " err" : ""}`}>
                <input id="tgl" type="date" value={tgl} onChange={(e) => setTgl(e.target.value)} aria-invalid={!!err.tanggal} aria-describedby={describedBy("tgl", err.tanggal, true)} />
              </div>
            </Field>
            {err.tanggal && tgl <= hariIni && (
              <Link href="/kelola/saldo" className="btn ton sm" style={{ alignSelf: "flex-start" }}>
                Isi snapshot manual
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
          <button type="button" className="btn ton" onClick={() => setAksi(null)} disabled={sedangProses}>
            Batal
          </button>
          <button type="button" className={`btn ${aksi?.jenis === "tolak" ? "danger" : "pri"}`} onClick={proses} disabled={offline || sedangProses}>
            {sedangProses ? "Memproses…" : aksi?.jenis === "tolak" ? "Tolak" : pAksi?.jenis === "setor" ? "Konfirmasi" : "Tandai selesai"}
          </button>
        </div>
      </Sheet>
    </>
  );
}
