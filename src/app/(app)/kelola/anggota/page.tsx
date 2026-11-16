"use client";
// Kelola anggota (US-07): tambah anggota dengan email Google, nonaktifkan anggota yang sudah tarik semua.
import { useState, type SubmitEvent } from "react";
import { BackBar, describedBy, Field, KhususPengelola, StatusBanners } from "@/components/ui";
import { usd } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { Peran } from "@/lib/types";

export default function Anggota() {
  const { saya, data, hasil, tambahAnggota, setAktif, tampilkan, offline } = useStore();
  const [nm, setNm] = useState("");
  const [em, setEm] = useState("");
  const [peran, setPeran] = useState<Peran>("investor");
  const [alamat, setAlamat] = useState("");
  const [err, setErr] = useState<Record<string, string>>({});
  const [errBaris, setErrBaris] = useState<Record<string, string>>({});
  if (!saya) return null;
  if (saya.peran !== "pengelola") return (<><BackBar judul="Anggota" ke="/kelola" /><main><KhususPengelola /></main></>);

  function submit(e: SubmitEvent) {
    e.preventDefault();
    const h = tambahAnggota({ nama: nm, email: em, peran, alamatWallet: alamat.split(/[\s,]+/).filter(Boolean) });
    if (!h.ok) return setErr({ [h.field ?? "form"]: h.pesan });
    tampilkan(`${nm.trim()} ditambahkan. Ia bisa masuk dengan akun Google ${em.trim().toLowerCase()}.`);
    setNm("");
    setEm("");
    setAlamat("");
    setPeran("investor");
    setErr({});
  }

  return (
    <>
      <BackBar judul="Anggota" ke="/kelola" />
      <main>
        <StatusBanners />
        <section className="card" aria-labelledby="daftar">
          <h2 id="daftar">Daftar anggota</h2>
          <ul className="rows">
            {data.anggota.map((a) => {
              const p = hasil.posisi.find((x) => x.id === a.id)!;
              return (
                <li key={a.id}>
                  <span className="av" style={{ background: a.aktif ? undefined : "var(--sage-canvas)", color: a.aktif ? undefined : "var(--ink-muted)" }} aria-hidden="true">
                    {a.nama.slice(0, 1)}
                  </span>
                  <div className="main">
                    <div className="t">
                      {a.nama}
                      <span className="chip peran">{a.peran === "pengelola" ? "Pengelola" : "Investor"}</span>
                      {!a.aktif && <span className="chip dibatalkan">Nonaktif</span>}
                    </div>
                    <div className="s" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={a.email}>
                      {a.email}
                    </div>
                    {a.alamatWallet?.length ? (
                      <div className="s num" style={{ overflowWrap: "anywhere" }}>
                        Wallet: {a.alamatWallet.join(", ")}
                      </div>
                    ) : null}
                    {errBaris[a.id] && <p className="ferr" role="alert" style={{ marginTop: 6 }}>{errBaris[a.id]}</p>}
                    {a.id !== saya.id && (
                      <div className="acts" style={{ marginTop: 6 }}>
                        <button
                          type="button"
                          className="btn ghost sm"
                          style={{ marginLeft: -12 }}
                          disabled={offline}
                          onClick={() => {
                            const h = setAktif(a.id, !a.aktif);
                            setErrBaris({ [a.id]: h.ok ? "" : h.pesan });
                            if (h.ok) tampilkan(`${a.nama} ${a.aktif ? "dinonaktifkan. Riwayatnya tetap tersimpan." : "diaktifkan lagi."}`);
                          }}
                        >
                          {a.aktif ? "Nonaktifkan" : "Aktifkan"}
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="v">{usd(p.netUsd)}</div>
                </li>
              );
            })}
          </ul>
        </section>

        <form className="card form" onSubmit={submit} noValidate>
          <h2 style={{ marginBottom: -4 }}>Tambah anggota</h2>
          <fieldset disabled={offline} style={{ border: 0, padding: 0, margin: 0, display: "contents" }}>
            <Field id="nm" label="Nama" error={err.nama} hint="2 sampai 40 karakter, harus unik.">
              <div className={`inp${err.nama ? " err" : ""}`}>
                <input id="nm" maxLength={40} autoComplete="off" value={nm} onChange={(e) => setNm(e.target.value)} aria-invalid={!!err.nama} aria-describedby={describedBy("nm", err.nama, true)} />
              </div>
            </Field>
            <Field id="em" label="Email akun Google" error={err.email} hint="Anggota masuk dengan akun Google ini.">
              <div className={`inp${err.email ? " err" : ""}`}>
                <input id="em" type="email" autoComplete="off" spellCheck={false} value={em} onChange={(e) => setEm(e.target.value)} aria-invalid={!!err.email} aria-describedby={describedBy("em", err.email, true)} />
              </div>
            </Field>
            <div className="field">
              <span className="flabel" id="peran-l">Peran</span>
              <div className="seg" role="radiogroup" aria-labelledby="peran-l" style={{ alignSelf: "flex-start" }}>
                {(["investor", "pengelola"] as Peran[]).map((x) => (
                  <button key={x} type="button" role="radio" aria-checked={peran === x} onClick={() => setPeran(x)}>
                    {x === "investor" ? "Investor" : "Pengelola"}
                  </button>
                ))}
              </div>
            </div>
            <Field
              id="alamat"
              label="Alamat wallet Solana"
              opsional
              error={err.alamat}
              hint="Untuk menyarankan siapa pemilik transfer di wallet pool. Pisahkan dengan koma bila lebih dari satu. Transfer dari exchange memakai alamat exchange, jadi tetap dicocokkan manual."
            >
              <div className={`inp${err.alamat ? " err" : ""}`}>
                <input
                  id="alamat"
                  autoComplete="off"
                  spellCheck={false}
                  value={alamat}
                  onChange={(e) => setAlamat(e.target.value)}
                  aria-invalid={!!err.alamat}
                  aria-describedby={describedBy("alamat", err.alamat, true)}
                />
              </div>
            </Field>
            {err.form && <p className="ferr" role="alert">{err.form}</p>}
            <button type="submit" className="btn pri block">Tambah anggota</button>
          </fieldset>
        </form>
      </main>
    </>
  );
}
