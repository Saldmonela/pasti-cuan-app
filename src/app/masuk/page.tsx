"use client";
// Masuk (US-07): login Google. Di prototype, tombol membuka pemilih akun tiruan.
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { IconBrandGoogle, IconExclamationCircle, IconLock } from "@tabler/icons-react";
import { Sheet } from "@/components/ui";
import { useStore } from "@/lib/store";

export default function Masuk() {
  const { siap, saya, data, masuk } = useStore();
  const router = useRouter();
  const [pilih, setPilih] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (siap && saya) router.replace("/");
  }, [siap, saya, router]);

  return (
    <main className="masuk">
      <div>
        <div className="wordmark">Pasti Cuan</div>
        <p className="note" style={{ fontSize: 15, marginTop: 8, maxWidth: "34ch" }}>
          Buku catatan bersama dana patungan LP. Masuk untuk melihat nilai, untung/rugi, dan porsi kamu.
        </p>
      </div>
      <section className="card form">
        {err && (
          <p className="ferr" role="alert" style={{ fontSize: 14 }}>
            <IconExclamationCircle size={17} aria-hidden="true" />
            {err}
          </p>
        )}
        <button type="button" className="btn dark block" onClick={() => setPilih(true)}>
          <IconBrandGoogle size={20} aria-hidden="true" />
          Masuk dengan Google
        </button>
        <p className="hint" style={{ display: "flex", gap: 6 }}>
          <IconLock size={15} aria-hidden="true" style={{ flex: "none", marginTop: 1 }} />
          Hanya email yang sudah didaftarkan pengelola yang bisa masuk. App tidak pernah meminta private key atau seed phrase wallet.
        </p>
      </section>

      <Sheet buka={pilih} onTutup={() => setPilih(false)} judul="Pilih akun Google">
        <p className="note">Prototype: pilih akun untuk mensimulasikan login Google.</p>
        <ul className="menu">
          {data.anggota
            .filter((a) => a.aktif)
            .map((a) => (
              <li key={a.id}>
                <button
                  type="button"
                  onClick={() => {
                    masuk(a.id);
                    setPilih(false);
                  }}
                >
                  <span className="av" aria-hidden="true">{a.nama.slice(0, 1)}</span>
                  <span className="t">
                    <span>{a.nama}</span>
                    <small>{a.email}</small>
                  </span>
                </button>
              </li>
            ))}
          <li>
            <button
              type="button"
              onClick={() => {
                setPilih(false);
                setErr("Akun Google ini belum terdaftar. Minta pengelola menambahkan email kamu.");
              }}
            >
              <span className="av" style={{ background: "var(--sage-canvas)" }} aria-hidden="true">?</span>
              <span className="t">
                <span>Akun lain</span>
                <small>email.belum.terdaftar@gmail.com</small>
              </span>
            </button>
          </li>
        </ul>
      </Sheet>
    </main>
  );
}
