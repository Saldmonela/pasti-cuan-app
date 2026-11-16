"use client";
// Masuk (US-07): login Google (Supabase Auth di production, atau pemilih akun tiruan di mode prototype).
import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { IconBrandGoogle, IconExclamationCircle, IconLock } from "@tabler/icons-react";
import { Sheet } from "@/components/ui";
import { useStore } from "@/lib/store";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const noSub = () => () => {};

export default function Masuk() {
  const { isPrototype, siap, saya, data, masuk } = useStore();
  const router = useRouter();
  const [pilih, setPilih] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const queryCode = useSyncExternalStore(
    noSub,
    () => new URLSearchParams(window.location.search).get("error"),
    () => null,
  );
  const queryErr =
    queryCode === "belum_terdaftar"
      ? "Akun Google ini belum terdaftar. Minta pengelola menambahkan email kamu."
      : queryCode === "auth_gagal"
        ? "Masuk dengan Google gagal. Silakan coba lagi."
        : "";
  const shownErr = err || queryErr;

  useEffect(() => {
    if (siap && saya) router.replace("/");
  }, [siap, saya, router]);

  async function loginGoogle() {
    if (isPrototype) {
      setPilih(true);
      return;
    }
    const sb = createSupabaseBrowserClient();
    if (!sb) {
      setErr("Konfigurasi autentikasi belum tersedia.");
      return;
    }
    setErr("");
    setLoading(true);
    const { error } = await sb.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      setErr(error.message || "Gagal membuka login Google.");
      setLoading(false);
    }
  }

  return (
    <main className="masuk">
      <div>
        <div className="wordmark">Pasti Cuan</div>
        <p className="note" style={{ fontSize: 15, marginTop: 8, maxWidth: "34ch" }}>
          Buku catatan bersama dana patungan LP. Masuk untuk melihat nilai, untung/rugi, dan porsi kamu.
        </p>
      </div>
      <section className="card form">
        {shownErr && (
          <p className="ferr" role="alert" style={{ fontSize: 14 }}>
            <IconExclamationCircle size={17} aria-hidden="true" />
            {shownErr}
          </p>
        )}
        <button type="button" className="btn dark block" onClick={loginGoogle} disabled={loading}>
          <IconBrandGoogle size={20} aria-hidden="true" />
          {loading ? "Mengarahkan ke Google..." : "Masuk dengan Google"}
        </button>
        <p className="hint" style={{ display: "flex", gap: 6 }}>
          <IconLock size={15} aria-hidden="true" style={{ flex: "none", marginTop: 1 }} />
          Hanya email yang sudah didaftarkan pengelola yang bisa masuk. App tidak pernah meminta private key atau seed phrase wallet.
        </p>
      </section>

      {isPrototype && (
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
      )}
    </main>
  );
}
