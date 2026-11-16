"use client";
// Log audit (US-09, P1): setiap ubah/hapus menghasilkan 1 entri. Tidak bisa dihapus siapa pun.
import { useState } from "react";
import { IconLock } from "@tabler/icons-react";
import { BackBar, Seg } from "@/components/ui";
import { waktu } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { LogAudit } from "@/lib/types";

const TABEL: Record<string, LogAudit["tabel"][] | null> = {
  Semua: null,
  Saldo: ["snapshot", "impor"],
  Permintaan: ["permintaan", "arus"],
  Anggota: ["anggota", "pengaturan"],
};

export default function Log() {
  const { data, nama } = useStore();
  const [f, setF] = useState("Semua");
  const daftar = data.log
    .filter((l) => !TABEL[f] || TABEL[f]!.includes(l.tabel))
    .sort((a, b) => (a.pada < b.pada ? 1 : -1))
    .slice(0, 50);

  return (
    <>
      <BackBar judul="Log perubahan" ke="/lainnya" />
      <main>
        <div className="banner info">
          <IconLock size={18} aria-hidden="true" />
          <p>Log ini tidak bisa dihapus atau diubah siapa pun, termasuk pengelola.</p>
        </div>
        <div style={{ overflowX: "auto" }}>
          <Seg label="Saring log" nilai={f} opsi={Object.keys(TABEL)} onChange={setF} />
        </div>
        <section className="card" aria-label="Daftar log">
          {daftar.length === 0 ? (
            <p className="note">Belum ada perubahan di kategori ini.</p>
          ) : (
            <ul className="rows">
              {daftar.map((l) => (
                <li key={l.id}>
                  <div className="main">
                    <div className="t" style={{ fontWeight: 500 }}>
                      <span>
                        <b style={{ fontWeight: 700 }}>{nama(l.oleh)}</b> · {l.ringkasan}
                      </span>
                    </div>
                    {(l.nilaiLama || l.nilaiBaru) && (
                      <div className="s">
                        {l.nilaiLama ?? "—"} → {l.nilaiBaru ?? "dihapus"}
                      </div>
                    )}
                    <div className="s">{waktu(l.pada)}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </>
  );
}
