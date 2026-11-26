"use client";
// Arus onchain (US-13): transfer masuk/keluar wallet yang terdeteksi otomatis, dicocokkan pengelola
// dengan permintaan, dibuatkan permintaan, atau ditandai biaya pool / bukan arus.
import Link from "next/link";
import { useState } from "react";
import { IconArrowDownLeft, IconArrowUpRight } from "@tabler/icons-react";
import { BackBar, describedBy, Field, KhususPengelola, Sheet, StatusBanners } from "@/components/ui";
import { cariSaranArus, jenisDariArah, pilihAnggotaAwal, pilihPermintaanAwal } from "@/lib/arus-matching";
import { angka, ringkasAlamat, tanggal, usd, waktu } from "@/lib/format";
import { ms } from "@/lib/onchain";
import { mintaSelesai, tanggalEfektifArus, useStore } from "@/lib/store";
import type { ArusOnchain, StatusArus } from "@/lib/types";

type Filter = "belum" | "ditandai" | "semua";
type Mode = "cocok" | "buat" | "hadiah" | "biaya" | "bukan_arus";

const LABEL_STATUS: Record<StatusArus, string> = {
  belum: "Belum dicocokkan",
  dicocokkan: "Dicocokkan",
  hadiah: "Hadiah / reward",
  biaya: "Biaya pool",
  bukan_arus: "Bukan arus",
};
const jumlahToken = (a: ArusOnchain) => {
  const lbl = a.simbol ?? a.token;
  return `${angka(a.jumlah, lbl === "SOL" ? 4 : a.jumlah < 1 ? 3 : 2)} ${lbl}`;
};

export default function Arus() {
  const { saya, data, arus, arusBelum, nama, tandaiArus, batalTandai, tampilkan, offline, hariIni } = useStore();
  const [f, setF] = useState<Filter>("belum");
  const [buka, setBuka] = useState<ArusOnchain | null>(null);
  const [mode, setMode] = useState<Mode>("cocok");
  const [ikut, setIkut] = useState<string[]>([]);
  const [pid, setPid] = useState("");
  const [aid, setAid] = useState("");
  const [catatan, setCatatan] = useState("");
  const [alasan, setAlasan] = useState("");
  const [sedangSimpan, setSedangSimpan] = useState(false);
  const [err, setErr] = useState<Record<string, string>>({});
  const [errBaris, setErrBaris] = useState<Record<string, string>>({});
  if (!saya) return null;
  if (saya.peran !== "pengelola") return (<><BackBar judul="Arus onchain" ke="/kelola" /><main><KhususPengelola /></main></>);

  const tol = data.pengaturan.toleransiCocokPersen;
  const menunggu = data.permintaan.filter((p) => p.status === "menunggu");

  const saran = (a: ArusOnchain) => cariSaranArus(a, menunggu, data.anggota, tol, arusBelum);

  const daftar = [...arus]
    .filter((a) => f === "semua" || (f === "belum" ? a.status === "belum" : a.status !== "belum"))
    .sort((a, b) => (a.waktu < b.waktu ? 1 : -1));
  const n = (x: Filter) => arus.filter((a) => x === "semua" || (x === "belum" ? a.status === "belum" : a.status !== "belum")).length;

  function mulai(a: ArusOnchain, m: Mode) {
    setBuka(a);
    setMode(m);
    setPid(pilihPermintaanAwal(a, menunggu, data.anggota, tol, arusBelum));
    // transfer lain ke/dari alamat yang sama ikut dicocokkan (contoh: 1 USDC + 730,51 USDC)
    setIkut(
      arus
        .filter((x) => x.id !== a.id && x.status === "belum" && x.arah === a.arah && x.alamatLawan === a.alamatLawan)
        .map((x) => x.id),
    );
    setAid(pilihAnggotaAwal(a, menunggu, data.anggota));
    setCatatan("");
    setAlasan("");
    setErr({});
  }

  const lain = buka ? arus.filter((x) => x.id !== buka.id && x.status === "belum" && x.arah === buka.arah) : [];
  const ids = buka ? [buka.id, ...ikut] : [];
  const total = arus.filter((x) => ids.includes(x.id)).reduce((t, x) => t + x.nilaiUsd, 0);
  const pPilih = menunggu.find((p) => p.id === pid);
  const selisih = pPilih ? Math.abs(total - pPilih.jumlahUsd) / pPilih.jumlahUsd > tol / 100 : false;
  const calon = buka ? menunggu.filter((p) => p.jenis === jenisDariArah(buka.arah)) : [];
  const permintaanTertaut = new Set(arus.map((x) => x.permintaanId).filter(Boolean));
  const selesaiTanpaArus = buka
    ? data.permintaan
        .filter(
          (p) =>
            p.status === "selesai" &&
            p.sumber === "app" &&
            p.jenis === jenisDariArah(buka.arah) &&
            !p.titikNilaiId &&
            !permintaanTertaut.has(p.id) &&
            Math.abs(ms(p.diprosesPada ?? p.dibuatPada) - ms(buka.waktu)) <= 48 * 60 * 60 * 1000,
        )
        .sort((a, b) => (a.dibuatPada < b.dibuatPada ? 1 : -1))
    : [];
  const saranId = new Set(buka ? saran(buka).map((s) => s.p.id) : []);

  async function simpan() {
    if (!buka || sedangSimpan) return;
    if (mode === "cocok") {
      if (!pid) {
        setErr({ pid: "Pilih salah satu permintaan di atas terlebih dahulu." });
        return;
      }
      if (selisih && !alasan.trim()) {
        setErr({ alasan: `Isi alasan selisih karena berbeda lebih dari ${tol}%.` });
        return;
      }
    } else if (mode === "buat") {
      if (!aid) {
        setErr({ anggota: "Pilih anggota terlebih dahulu." });
        return;
      }
    } else if (!catatan.trim()) {
      setErr({ catatan: "Catatan wajib diisi." });
      return;
    }

    setSedangSimpan(true);
    try {
      const h =
        mode === "cocok"
          ? await tandaiArus(ids, { status: "dicocokkan", permintaanId: pid, alasanSelisih: alasan })
          : mode === "buat"
            ? await tandaiArus(ids, { status: "buat", anggotaId: aid })
            : await tandaiArus([buka.id], { status: mode, catatan });
      if (!h.ok) {
        setErr({ [h.field ?? "form"]: h.pesan });
        return;
      }
      tampilkan(h.nilai!);
      setBuka(null);
    } finally {
      setSedangSimpan(false);
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
        <div className="tabs arus-tabs" role="group" aria-label="Saring transfer">
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
            <ul className="rows arus-rows">
              {daftar.map((a) => {
                const p = data.permintaan.find((x) => x.id === a.permintaanId);
                const s = a.status === "belum" ? saran(a) : [];
                return (
                  <li key={a.id}>
                    <span className="ico-dot" aria-hidden="true">
                      {a.arah === "masuk" ? <IconArrowDownLeft size={18} /> : <IconArrowUpRight size={18} />}
                    </span>
                    <div className="main">
                      <div className="arus-heading">
                        <span className="t">{a.arah === "masuk" ? "Masuk" : "Keluar"} {jumlahToken(a)}</span>
                        <span className="v">{a.arah === "masuk" ? "+" : "−"}{usd(a.nilaiUsd)}</span>
                      </div>
                      <span className={`chip ${a.status}`}>{LABEL_STATUS[a.status]}</span>
                      <div className="s">{waktu(a.waktu)}</div>
                      <div className="s num" style={{ overflowWrap: "anywhere" }}>
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
                          {p.status === "selesai"
                            ? `, selesai efektif ${p.waktuEfektif ? waktu(p.waktuEfektif) : tanggal(p.tanggalEfektif!)}`
                            : `, efektif ${tanggal(tanggalEfektifArus(a.waktu, data.pengaturan.jamSnapshot))}`}
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
                            <button
                              type="button"
                              className="btn ghost sm"
                              disabled={offline}
                              onClick={() => mulai(a, a.arah === "masuk" ? "hadiah" : "biaya")}
                            >
                              {a.arah === "masuk" ? "Tandai hadiah / lainnya" : "Tandai biaya atau bukan arus"}
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
                              onClick={async () => {
                                const h = await batalTandai(a.id);
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
                  </li>
                );
              })}
            </ul>
          )}
        </section>
        <p className="note" style={{ padding: "0 4px" }}>
          Transfer yang dicocokkan langsung menyelesaikan permintaan pada waktu transfer (memakai titik nilai terdekat sebelumnya). Transfer yang
          belum dicocokkan saat snapshot dibuat membuat cek data gagal. Hari ini {tanggal(hariIni)}.
        </p>
      </main>

      <Sheet buka={!!buka} onTutup={() => setBuka(null)} judul={buka ? `Transfer ${waktu(buka.waktu)}` : ""}>
        {buka && (
          <>
            <p className="note" style={{ marginTop: -6, overflowWrap: "anywhere" }}>
              {buka.arah === "masuk" ? "Masuk" : "Keluar"} {jumlahToken(buka)} · {usd(buka.nilaiUsd)} · {buka.arah === "masuk" ? "dari" : "ke"} {buka.alamatLawan}
            </p>
            <div className="field">
              <span className="flabel" id="mode-l">Tandai sebagai</span>
              <ul className="menu" role="radiogroup" aria-labelledby="mode-l">
                {(
                  [
                    ["cocok", `Cocokkan dengan ${buka.arah === "masuk" ? "setoran" : "penarikan"} yang diajukan`],
                    ["buat", "Buat permintaan untuk anggota"],
                    ...(buka.arah === "masuk" ? ([["hadiah", "Hadiah / reward (masuk nilai pool)"]] as [Mode, string][]) : []),
                    [
                      "biaya",
                      buka.arah === "masuk"
                        ? "Operasional / pengembalian biaya pool (masuk nilai pool)"
                        : "Biaya pool / operasional (mengurangi nilai pool)",
                    ],
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
                        <span style={{ overflowWrap: "anywhere" }}>
                          {waktu(x.waktu)} · {jumlahToken(x)} <span className="mu">· {ringkasAlamat(x.alamatLawan)}</span>
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
                  <div style={{ display: "grid", gap: 8 }}>
                    {selesaiTanpaArus.length > 0 && (
                      <div className="banner warn">
                        <p>
                          Sudah ada {buka.arah === "masuk" ? "setoran" : "penarikan"} yang ditandai selesai manual tanpa tertaut transfer (
                          <b>
                            {nama(selesaiTanpaArus[0].anggotaId)} {usd(selesaiTanpaArus[0].jumlahFinalUsd ?? selesaiTanpaArus[0].jumlahUsd)}
                          </b>
                          ). Jangan pilih &ldquo;Buat permintaan untuk anggota&rdquo; agar tidak tercatat dobel.
                        </p>
                      </div>
                    )}
                    <p className="note">
                      Belum ada {buka.arah === "masuk" ? "setoran" : "penarikan"} yang menunggu.
                      {buka.arah === "masuk"
                        ? ' Pilih "Buat permintaan untuk anggota" jika ini setoran, atau "Hadiah / reward" jika ini hadiah/insentif protokol.'
                        : ' Pilih "Buat permintaan untuk anggota" jika belum ada permintaan.'}
                    </p>
                    {selesaiTanpaArus.length === 0 && (
                      <button
                        type="button"
                        className="btn ton sm"
                        style={{ justifySelf: "start" }}
                        onClick={() => {
                          setMode("buat");
                          setErr({});
                        }}
                      >
                        Pindah ke Buat permintaan
                      </button>
                    )}
                  </div>
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
                              {p.alamatWalletTujuan && (
                                <span className="mu" style={{ display: "block", fontSize: 12 }}>
                                  Ke {ringkasAlamat(p.alamatWalletTujuan)}
                                </span>
                              )}
                            </span>
                          </label>
                        </li>
                      ))}
                  </ul>
                )}
                {err.pid && <p className="ferr" role="alert">{err.pid}</p>}
                {pPilih && <p className="hint">Total transfer {usd(total)} · permintaan {usd(pPilih.jumlahUsd)}.</p>}
              </div>
            )}
            {mode === "cocok" && selisih && (
              <Field id="alasan" label="Alasan selisih jumlah" error={err.alasan} hint={`Wajib karena selisih lebih dari ${tol}%.`}>
                <div className={`inp${err.alasan ? " err" : ""}`}>
                  <input id="alasan" value={alasan} onChange={(e) => { setAlasan(e.target.value); if (err.alasan) setErr({}); }} aria-invalid={!!err.alasan} aria-describedby={describedBy("alasan", err.alasan, true)} />
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

            {(mode === "hadiah" || mode === "biaya" || mode === "bukan_arus") && (
              <Field
                id="cat"
                label="Catatan"
                error={err.catatan}
                hint={
                  mode === "hadiah"
                    ? "Wajib. Contoh: reward Meteora, airdrop, atau insentif protokol. Nilainya masuk ke pool tanpa mengubah porsi."
                    : mode === "biaya"
                      ? buka.arah === "masuk"
                        ? "Wajib. Contoh: pengembalian SOL operasional/gas. Nilainya masuk ke pool tanpa mengubah porsi."
                        : "Wajib. Contoh: biaya transaksi, gas, atau sewa akun. Nilainya mengurangi pool tanpa mengubah porsi."
                      : "Wajib. Contoh: token spam yang lolos ambang."
                }
              >
                <div className={`inp${err.catatan ? " err" : ""}`}>
                  <textarea id="cat" rows={2} maxLength={200} value={catatan} onChange={(e) => { setCatatan(e.target.value); if (err.catatan) setErr({}); }} aria-invalid={!!err.catatan} aria-describedby={describedBy("cat", err.catatan, true)} />
                </div>
              </Field>
            )}

            {err.form && (
              <p className="ferr" role="alert">
                {err.form}
              </p>
            )}
            <div className="btn-row">
              <button type="button" className="btn ton" onClick={() => setBuka(null)} disabled={sedangSimpan}>
                Batal
              </button>
              <button
                type="button"
                className="btn pri"
                onClick={simpan}
                disabled={offline || sedangSimpan || (mode === "cocok" && calon.length === 0)}
              >
                {sedangSimpan
                  ? "Menyimpan…"
                  : mode === "cocok"
                    ? "Cocokkan"
                    : mode === "buat"
                      ? "Buat dan cocokkan"
                      : "Simpan tanda"}
              </button>
            </div>
          </>
        )}
      </Sheet>
    </>
  );
}
