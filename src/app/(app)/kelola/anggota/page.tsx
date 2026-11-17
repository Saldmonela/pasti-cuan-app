"use client";
// Kelola anggota (US-07): tambah anggota dengan email Google, nonaktifkan anggota yang sudah tarik semua.
import { useState, type SubmitEvent } from "react";
import { BackBar, describedBy, Field, KhususPengelola, Sheet, StatusBanners } from "@/components/ui";
import { usd } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { Anggota as AnggotaType, Peran } from "@/lib/types";

export default function Anggota() {
  const { saya, data, hasil, tambahAnggota, setAktif, ubahWalletAnggota, tampilkan, offline } = useStore();
  const [nm, setNm] = useState("");
  const [em, setEm] = useState("");
  const [peran, setPeran] = useState<Peran>("investor");
  const [alamat, setAlamat] = useState("");
  const [err, setErr] = useState<Record<string, string>>({});
  const [errBaris, setErrBaris] = useState<Record<string, string>>({});
  const [editWallet, setEditWallet] = useState<AnggotaType | null>(null);
  const [walletEditTeks, setWalletEditTeks] = useState("");
  const [walletEditErr, setWalletEditErr] = useState("");
  const [simpanWallet, setSimpanWallet] = useState(false);
  if (!saya) return null;
  if (saya.peran !== "pengelola") return (<><BackBar judul="Anggota" ke="/kelola" /><main><KhususPengelola /></main></>);

  async function submit(e: SubmitEvent) {
    e.preventDefault();
    const h = await tambahAnggota({ nama: nm, email: em, peran, alamatWallet: alamat.split(/[\s,]+/).filter(Boolean) });
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
                    <div className="acts" style={{ marginTop: 4, gap: 4 }}>
                      <button
                        type="button"
                        className="btn ghost sm"
                        style={{ marginLeft: -8, padding: "0 8px", height: 36, fontSize: 13 }}
                        disabled={offline}
                        onClick={() => {
                          setEditWallet(a);
                          setWalletEditTeks(a.alamatWallet?.join(", ") ?? "");
                          setWalletEditErr("");
                        }}
                      >
                        Ubah wallet
                      </button>
                      {a.id !== saya.id && (
                        <button
                          type="button"
                          className="btn ghost sm"
                          style={{ padding: "0 8px", height: 36, fontSize: 13 }}
                          disabled={offline}
                          onClick={async () => {
                            const h = await setAktif(a.id, !a.aktif);
                            setErrBaris({ [a.id]: h.ok ? "" : h.pesan });
                            if (h.ok) tampilkan(`${a.nama} ${a.aktif ? "dinonaktifkan. Riwayatnya tetap tersimpan." : "diaktifkan lagi."}`);
                          }}
                        >
                          {a.aktif ? "Nonaktifkan" : "Aktifkan"}
                        </button>
                      )}
                    </div>
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

      <Sheet buka={!!editWallet} onTutup={() => setEditWallet(null)} judul={editWallet ? `Wallet ${editWallet.nama}` : "Ubah wallet"}>
        <form
          className="form"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!editWallet || simpanWallet) return;
            setSimpanWallet(true);
            const list = walletEditTeks.split(/[\s,]+/).filter(Boolean);
            const h = await ubahWalletAnggota(editWallet.id, list);
            setSimpanWallet(false);
            if (!h.ok) {
              setWalletEditErr(h.pesan);
              return;
            }
            tampilkan(`Alamat wallet ${editWallet.nama} diperbarui.`);
            setEditWallet(null);
          }}
        >
          <Field
            id="edit-wallet"
            label="Alamat wallet Solana"
            opsional
            error={walletEditErr}
            hint="Pisahkan dengan koma atau spasi bila lebih dari satu. Kosongkan untuk menghapus."
          >
            <div className={`inp${walletEditErr ? " err" : ""}`}>
              <textarea
                id="edit-wallet"
                rows={3}
                autoComplete="off"
                spellCheck={false}
                value={walletEditTeks}
                onChange={(e) => {
                  setWalletEditTeks(e.target.value);
                  if (walletEditErr) setWalletEditErr("");
                }}
                aria-invalid={!!walletEditErr}
                aria-describedby={describedBy("edit-wallet", walletEditErr, true)}
              />
            </div>
          </Field>
          <div className="btn-row">
            <button type="button" className="btn ton" onClick={() => setEditWallet(null)}>
              Batal
            </button>
            <button type="submit" className="btn pri" disabled={simpanWallet || offline}>
              {simpanWallet ? "Menyimpan…" : "Simpan"}
            </button>
          </div>
        </form>
      </Sheet>
    </>
  );
}
