"use client";
// Panel khusus prototype: pindah akun dan pilih skenario state UI dari PRD (tabel "State UI").
// Tidak ada di aplikasi asli.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { IconFlask } from "@tabler/icons-react";
import { SKENARIO, useStore } from "@/lib/store";
import { Sheet } from "./ui";

export default function ProtoPanel() {
  const { data, saya, masuk, keluar, skenario, setSkenario, reset } = useStore();
  const [buka, setBuka] = useState(false);
  const router = useRouter();
  const akun = data.anggota.filter((a) => a.aktif);

  return (
    <>
      <button type="button" className="proto-btn" onClick={() => setBuka(true)} aria-haspopup="dialog">
        <IconFlask size={16} aria-hidden="true" />
        Prototype
      </button>
      <Sheet buka={buka} onTutup={() => setBuka(false)} judul="Panel prototype">
        <p className="note">Panel ini hanya ada di prototype untuk mencoba peran dan kondisi layar dari PRD.</p>
        <div className="field">
          <span className="flabel">Masuk sebagai</span>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {akun.map((a) => (
              <button
                key={a.id}
                type="button"
                className={`btn sm ${saya?.id === a.id ? "pri" : "ton"}`}
                aria-pressed={saya?.id === a.id}
                onClick={() => {
                  masuk(a.id);
                  setBuka(false);
                  router.push("/");
                }}
              >
                {a.nama}
                {a.peran === "pengelola" ? " · pengelola" : ""}
              </button>
            ))}
            <button
              type="button"
              className="btn sm ghost"
              onClick={() => {
                keluar();
                setBuka(false);
              }}
            >
              Keluar
            </button>
          </div>
        </div>
        <div className="field">
          <span className="flabel">Kondisi layar</span>
          <ul className="menu">
            {SKENARIO.map((s) => (
              <li key={s.id}>
                <label className="check" style={{ minHeight: 44, alignItems: "center" }}>
                  <input type="radio" name="sk" checked={skenario === s.id} onChange={() => setSkenario(s.id)} />
                  <span>
                    {s.label} <span className="mu">· {s.ket}</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </div>
        <div className="btn-row">
          <button type="button" className="btn ton" onClick={reset}>
            Reset data contoh
          </button>
          <button type="button" className="btn pri" onClick={() => setBuka(false)}>
            Tutup
          </button>
        </div>
      </Sheet>
    </>
  );
}
