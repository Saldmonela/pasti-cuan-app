"use client";
// Arus onchain (US-13): transfer masuk/keluar wallet yang terdeteksi otomatis, dicocokkan pengelola
// dengan permintaan, dibuatkan permintaan, atau ditandai biaya pool / bukan arus.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { IconArrowDownLeft, IconArrowUpRight } from "@tabler/icons-react";
import { BackBar, describedBy, Field, KhususPengelola, Sheet, StatusBanners } from "@/components/ui";
import { angka, tanggal, usd, waktu } from "@/lib/format";
import { mintaSelesai, tanggalEfektifArus, useStore } from "@/lib/store";
import type { ArusOnchain, Permintaan, StatusArus } from "@/lib/types";

type Filter = "belum" | "ditandai" | "semua";
type Mode = "cocok" | "buat" | "biaya" | "bukan_arus";

const LABEL_STATUS: Record<StatusArus, string> = { belum: "Belum dicocokkan", dicocokkan: "Dicocokkan", biaya: "Biaya pool", bukan_arus: "Bukan arus" };
const jumlahToken = (a: ArusOnchain) => `${angka(a.jumlah, a.token === "SOL" ? 4 : a.jumlah < 1 ? 3 : 2)} ${a.token}`;

export default function Arus() {
  const { saya, data, arus, nama, tandaiArus, batalTandai, tampilkan, offline, hariIni } = useStore();
  const router = useRouter();
  const [f, setF] = useState<Filter>("belum");
  const [buka, setBuka] = useState<ArusOnchain | null>(null);
  const [mode, setMode] = useState<Mode>("cocok");
  const [ikut, setIkut] = useState<string[]>([]);
  const [pid, setPid] = useState("");
  const [aid, setAid] = useState("");
  const [catatan, setCatatan] = useState("");
  const [alasan, setAlasan] = useState("");
  const [err, setErr] = useState<Record<string, string>>({});
  const [errBaris, setErrBaris] = useState<Record<string, string>>({});
  if (!saya) return null;
  if (saya.peran !== "pengelola") return (<><BackBar judul="Arus onchain" ke="/kelola" /><main><KhususPengelola /></main></>);

  const tol = data.pengaturan.toleransiCocokPersen;
  const jenisArus = (a: ArusOnchain) => (a.arah === "masuk" ? "setor" : "tarik");
  const menunggu = data.permintaan.filter((p) => p.status === "menunggu");

  /** Saran pencocokan: permintaan sejenis dengan selisih <= toleransi, atau anggota dengan alamat wallet yang sama. */
  function saran(a: ArusOnchain): { p: Permintaan; alasan: string }[] {
    return menunggu
      .filter((p) => p.jenis === jenisArus(a))
      .flatMap((p) => {
        const mirip = Math.abs(a.nilaiUsd - p.jumlahUsd) / p.jumlahUsd <= tol / 100;
        const alamat = data.anggota.find((x) => x.id === p.anggotaId)?.alamatWallet?.includes(a.alamatLawan);
        if (!mirip && !alamat) return [];
        return [{ p, alasan: alamat ? "alamat wallet sama" : `selisih jumlah di bawah ${tol}%` }];
      });
  }

  const daftar = [...arus]
    .filter((a) => f === "semua" || (f === "belum" ? a.status === "belum" : a.status !== "belum"))
    .sort((a, b) => (a.waktu < b.waktu ? 1 : -1));
  const n = (x: Filter) => arus.filter((a) => x === "semua" || (x === "belum" ? a.status === "belum" : a.status !== "belum")).length;

  function mulai(a: ArusOnchain, m: Mode) {
    const s = saran(a);
    setBuka(a);
    setMode(m);
    setPid(s[0]?.p.id ?? "");
    // transfer lain ke/dari alamat yang sama ikut dicocokkan (contoh: 1 USDC + 730,51 USDC)
    setIkut(arus.filter((x) => x.id !== a.id && x.status === "belum" && x.arah === a.arah && x.alamatLawan === a.alamatLawan).map((x) => x.id));
    setAid(data.anggota.find((x) => x.alamatWallet?.includes(a.alamatLawan))?.id ?? "");
    setCatatan("");
    setAlasan("");
    setErr({});
  }

  const lain = buka ? arus.filter((x) => x.id !== buka.id && x.status === "belum" && x.arah === buka.arah) : [];
  const ids = buka ? [buka.id, ...ikut] : [];
  const total = arus.filter((x) => ids.includes(x.id)).reduce((t, x) => t + x.nilaiUsd, 0);
  const pPilih = menunggu.find((p) => p.id === pid);
  const selisih = pPilih ? Math.abs(total - pPilih.jumlahUsd) / pPilih.jumlahUsd > tol / 100 : false;
  const calon = buka ? menunggu.filter((p) => p.jenis === jenisArus(buka)) : [];
  const saranId = new Set(buka ? saran(buka).map((s) => s.p.id) : []);

  function simpan() {
    if (!buka) return;
    const h =
      mode === "cocok"
        ? tandaiArus(ids, { status: "dicocokkan", permintaanId: pid, alasanSelisih: alasan })
        : mode === "buat"
          ? tandaiArus(ids, { status: "buat", anggotaId: aid })
          : tandaiArus([buka.id], { status: mode, catatan });
    if (!h.ok) return setErr({ [h.field ?? "form"]: h.pesan });
    tampilkan(h.nilai!);
    const lanjut = mode === "cocok" ? pid : mode === "buat" ? "baru" : null;
    setBuka(null);
    if (lanjut) {
      // AC-13-01: lanjut ke "Konfirmasi diterima" / "Tandai selesai" dengan isian terisi
      mintaSelesai(lanjut === "baru" ? { arusId: buka.id } : { permintaanId: lanjut });
      router.push("/kelola/permintaan");
    }
  }

  return (
    <>
      <BackBar judul="Arus onchain" ke="/kelola" />
      <main>
        <StatusBanners />
        <p className="note" style={{ padding: "0 4px" }}>
          Transfer masuk dan keluar wallet pool yang terdeteksi otomatis. Swap, tambah atau tarik likuiditas, dan klaim fee tidak masuk daftar.{" "}
          <a href={`https://solscan.io/account/${data.pengaturan.alamatWalletPool}#transfers`} target="_blank" rel="noreferrer">
            Lihat wallet di Solscan
          </a>
        </p>
        <div className="tabs" role="group" aria-label="Saring transfer">
          {(["belum", "ditandai", "semua"] as Filter[]).map((x) => (
            <button key={x} type="button" aria-pressed={f === x} onClick={() => setF(x)}>
              {x === "belum" ? "Belum dicocokkan" : x === "ditandai" ? "Ditandai" : "Semua"}
              <span className="n">{n(x)}</span>
            </button>
          ))}
        </div>
        <section className="card" aria-label="Daftar transfer">
          {daftar.length === 0 ? (
            <p className="note">{f === "belum" ? "Semua transfer sudah dicocokkan." : "Belum ada transfer yang ditandai."}</p>
          ) : (
            <ul className="rows">
              {daftar.map((a) => {
                const p = data.permintaan.find((x) => x.id === a.permintaanId);
                const s = a.status === "belum" ? saran(a) : [];
                return (
                  <li key={a.id}>
                    <span className="ico-dot" aria-hidden="true">
                      {a.arah === "masuk" ? <IconArrowDownLeft size={18} /> : <IconArrowUpRight size={18} />}
                    </span>
                    <div className="main">
                      <div className="t">
                        {a.arah === "masuk" ? "Masuk" : "Keluar"} {jumlahToken(a)}
                        <span className={`chip ${a.status}`}>{LABEL_STATUS[a.status]}</span>
                      </div>
                      <div className="s">{waktu(a.waktu)}</div>
                      <div className="s num">
                        {a.arah === "masuk" ? "Dari" : "Ke"} {a.alamatLawan}
                      </div>
                      {s.map((x) => (
                        <div className="s" key={x.p.id}>
                          Saran: {x.p.jenis === "setor" ? "setoran" : "penarikan"} {nama(x.p.anggotaId)} {usd(x.p.jumlahUsd)} ({x.alasan})
                        </div>
                      ))}
                      {a.status === "dicocokkan" && p && (
                        <div className="s up">
                          {p.jenis === "setor" ? "Setoran" : "Penarikan"} {nama(p.anggotaId)} {usd(p.jumlahUsd)}
                          {p.status === "selesai" ? `, selesai efektif ${tanggal(p.tanggalEfektif!)}` : `, efektif ${tanggal(tanggalEfektifArus(a.waktu, data.pengaturan.jamSnapshot))}`}
                        </div>
                      )}
                      {a.alasanSelisih && <div className="s">Alasan selisih: {a.alasanSelisih}</div>}
                      {a.catatan && <div className="s">Catatan: {a.catatan}</div>}
                      {errBaris[a.id] && (
                        <p className="ferr" role="alert" style={{ marginTop: 6 }}>
                          {errBaris[a.id]}
                        </p>
                      )}
                      <div className="acts">
                        {a.status === "belum" ? (
                          <>
                            <button type="button" className="btn pri sm" disabled={offline} onClick={() => mulai(a, "cocok")}>
                              Cocokkan
                            </button>
                            <button type="button" className="btn ghost sm" disabled={offline} onClick={() => mulai(a, "biaya")}>
                              Tandai lain
                            </button>
                          </>
                        ) : (
                          <>
                            {p && p.status === "menunggu" && (
                              <Link
                                href="/kelola/permintaan"
                                className="btn ton sm"
                                onClick={() => mintaSelesai({ permintaanId: p.id })}
                              >
                                {p.jenis === "setor" ? "Konfirmasi diterima" : "Tandai selesai"}
                              </Link>
                            )}
                            <button
                              type="button"
                              className="btn ghost sm"
                              disabled={offline}
                              onClick={() => {
                                const h = batalTandai(a.id);
                                setErrBaris({ [a.id]: h.ok ? "" : h.pesan });
                                if (h.ok) tampilkan(`Penandaan transfer ${waktu(a.waktu)} dibatalkan.`);
                              }}
                            >
                              Batalkan penandaan
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="v">
                      {a.arah === "masuk" ? "+" : "−"}
                      {usd(a.nilaiUsd)}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
        <p className="note" style={{ padding: "0 4px" }}>
          Tanggal efektif transfer = snapshot resmi pertama sesudahnya. Transfer yang belum dicocokkan saat snapshot dibuat membuat cek data gagal.
          Hari ini {tanggal(hariIni)}.
        </p>
      </main>

      <Sheet buka={!!buka} onTutup={() => setBuka(null)} judul={buka ? `Transfer ${waktu(buka.waktu)}` : ""}>
        {buka && (
          <>
            <p className="note" style={{ marginTop: -6 }}>
              {buka.arah === "masuk" ? "Masuk" : "Keluar"} {jumlahToken(buka)} · {usd(buka.nilaiUsd)} · {buka.arah === "masuk" ? "dari" : "ke"} {buka.alamatLawan}
            </p>
            <div className="field">
              <span className="flabel" id="mode-l">Tandai sebagai</span>
              <ul className="menu" role="radiogroup" aria-labelledby="mode-l">
                {(
                  [
                    ["cocok", `Cocokkan dengan ${buka.arah === "masuk" ? "setoran" : "penarikan"} yang diajukan`],
                    ["buat", "Buat permintaan untuk anggota"],
                    ["biaya", "Biaya pool (dianggap rugi pool)"],
                    ["bukan_arus", "Bukan arus (dust, token spam)"],
                  ] as [Mode, string][]
                ).map(([m, l]) => (
                  <li key={m}>
                    <label className="check" style={{ minHeight: 44, alignItems: "center" }}>
                      <input type="radio" name="mode" checked={mode === m} onChange={() => { setMode(m); setErr({}); }} />
                      <span>{l}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </div>

            {(mode === "cocok" || mode === "buat") && lain.length > 0 && (
              <div className="field">
                <span className="flabel">Transfer lain yang ikut</span>
                <ul className="menu">
                  {lain.map((x) => (
                    <li key={x.id}>
                      <label className="check" style={{ minHeight: 44, alignItems: "center" }}>
                        <input
                          type="checkbox"
                          checked={ikut.includes(x.id)}
                          onChange={(e) => setIkut(e.target.checked ? [...ikut, x.id] : ikut.filter((y) => y !== x.id))}
                        />
                        <span>
                          {waktu(x.waktu)} · {jumlahToken(x)} <span className="mu">· {x.alamatLawan}</span>
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
                <p className="hint">Total transfer dipilih {usd(total)}.</p>
              </div>
            )}

            {mode === "cocok" && (
              <div className="field">
                <span className="flabel" id="p-l">Permintaan</span>
                {calon.length === 0 ? (
                  <p className="note">Belum ada {buka.arah === "masuk" ? "setoran" : "penarikan"} yang menunggu. Pilih &ldquo;Buat permintaan untuk anggota&rdquo;.</p>
                ) : (
                  <ul className="menu" role="radiogroup" aria-labelledby="p-l">
                    {[...calon]
                      .sort((a, b) => Number(saranId.has(b.id)) - Number(saranId.has(a.id)))
                      .map((p) => (
                        <li key={p.id}>
                          <label className="check" style={{ minHeight: 44, alignItems: "center" }}>
                            <input type="radio" name="pid" checked={pid === p.id} onChange={() => { setPid(p.id); setErr({}); }} />
                            <span>
                              {nama(p.anggotaId)} · {usd(p.jumlahUsd)} {saranId.has(p.id) && <span className="chip dicocokkan">Saran</span>}
                            </span>
                          </label>
                        </li>
                      ))}
                  </ul>
                )}
                {pPilih && <p className="hint">Total transfer {usd(total)} · permintaan {usd(pPilih.jumlahUsd)}.</p>}
              </div>
            )}
            {mode === "cocok" && selisih && (
              <Field id="alasan" label="Alasan selisih jumlah" error={err.alasan} hint={`Wajib karena selisih lebih dari ${tol}%.`}>
                <div className={`inp${err.alasan ? " err" : ""}`}>
                  <input id="alasan" value={alasan} onChange={(e) => setAlasan(e.target.value)} aria-invalid={!!err.alasan} aria-describedby={describedBy("alasan", err.alasan, true)} />
                </div>
              </Field>
            )}

            {mode === "buat" && (
              <div className="field">
                <span className="flabel" id="a-l">Atas nama</span>
                <ul className="menu" role="radiogroup" aria-labelledby="a-l">
                  {data.anggota
                    .filter((x) => x.aktif)
                    .map((x) => (
                      <li key={x.id}>
                        <label className="check" style={{ minHeight: 44, alignItems: "center" }}>
                          <input type="radio" name="aid" checked={aid === x.id} onChange={() => { setAid(x.id); setErr({}); }} />
                          <span>
                            {x.nama} {x.alamatWallet?.includes(buka.alamatLawan) && <span className="chip dicocokkan">Alamat sama</span>}
                          </span>
                        </label>
                      </li>
                    ))}
                </ul>
                {err.anggota && <p className="ferr" role="alert">{err.anggota}</p>}
                <p className="hint">
                  Dibuat {buka.arah === "masuk" ? "setoran" : "penarikan"} {usd(total)}, lalu langsung dicocokkan dengan transfer ini.
                </p>
              </div>
            )}

            {(mode === "biaya" || mode === "bukan_arus") && (
              <Field
                id="cat"
                label="Catatan"
                error={err.catatan}
                hint={mode === "biaya" ? "Wajib. Contoh: biaya transaksi atau sewa akun. Nilainya mengurangi pool." : "Wajib. Contoh: token spam yang lolos ambang."}
              >
                <div className={`inp${err.catatan ? " err" : ""}`}>
                  <textarea id="cat" rows={2} maxLength={200} value={catatan} onChange={(e) => setCatatan(e.target.value)} aria-invalid={!!err.catatan} aria-describedby={describedBy("cat", err.catatan, true)} />
                </div>
              </Field>
            )}

            {err.form && (
              <p className="ferr" role="alert">
                {err.form}
              </p>
            )}
            <div className="btn-row">
              <button type="button" className="btn ton" onClick={() => setBuka(null)}>
                Batal
              </button>
              <button type="button" className="btn pri" onClick={simpan} disabled={offline || (mode === "cocok" && !pid)}>
                {mode === "cocok" ? "Cocokkan" : mode === "buat" ? "Buat dan cocokkan" : "Simpan tanda"}
              </button>
            </div>
          </>
        )}
      </Sheet>
    </>
  );
}
