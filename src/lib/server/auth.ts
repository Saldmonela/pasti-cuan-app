import { NextResponse } from "next/server";
import {
  bearerTokenDariRequest,
  createSupabaseAdmin,
  createSupabaseServerClient,
  createSupabaseTokenClient,
} from "@/lib/supabase/server";
import type { Anggota } from "@/lib/types";

export type ErrorKode =
  | "VALIDASI"
  | "TIDAK_LOGIN"
  | "TIDAK_BERHAK"
  | "TIDAK_DITEMUKAN"
  | "KONFLIK"
  | "ATURAN_BISNIS";

export class ApiError extends Error {
  status: number;
  kode: ErrorKode;
  detail?: Record<string, string>;

  constructor(status: number, kode: ErrorKode, pesan: string, detail?: Record<string, string>) {
    super(pesan);
    this.status = status;
    this.kode = kode;
    this.detail = detail;
  }
}

export function jsonError(err: unknown) {
  if (err instanceof ApiError) {
    return NextResponse.json(
      { kode: err.kode, pesan: err.message, ...(err.detail ? { detail: err.detail } : {}) },
      { status: err.status },
    );
  }
  const pesan = err instanceof Error ? err.message : "Terjadi kesalahan pada server.";
  return NextResponse.json({ kode: "ATURAN_BISNIS", pesan }, { status: 500 });
}

interface DbAnggota {
  id: string;
  auth_user_id: string | null;
  nama: string;
  email: string;
  peran: "investor" | "pengelola";
  alamat_wallet: string[] | null;
  aktif: boolean;
  dibuat_pada: string;
}

export function mapAnggota(row: DbAnggota): Anggota {
  return {
    id: row.id,
    nama: row.nama,
    email: row.email,
    peran: row.peran,
    aktif: row.aktif,
    alamatWallet: row.alamat_wallet?.length ? row.alamat_wallet : undefined,
    dibuatPada: row.dibuat_pada,
  };
}

export async function requireMember() {
  // Aplikasi Android mengirim `Authorization: Bearer <access_token>`; web memakai cookie sesi.
  const token = await bearerTokenDariRequest();
  const sb = token ? createSupabaseTokenClient(token) : await createSupabaseServerClient();
  const {
    data: { user },
    error: authErr,
  } = token ? await sb.auth.getUser(token) : await sb.auth.getUser();
  if (authErr || !user || !user.email) {
    throw new ApiError(401, "TIDAK_LOGIN", "Sesi kamu berakhir. Silakan masuk lagi.");
  }

  const admin = createSupabaseAdmin();
  const email = user.email.trim().toLowerCase();

  const { data: byUid } = await admin
    .from("anggota")
    .select("*")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  let row = byUid as DbAnggota | null;
  if (!row) {
    const { data: byEmail } = await admin
      .from("anggota")
      .select("*")
      .eq("email", email)
      .maybeSingle();
    row = byEmail as DbAnggota | null;
    if (row && row.aktif && !row.auth_user_id) {
      await admin.from("anggota").update({ auth_user_id: user.id }).eq("id", row.id);
      row.auth_user_id = user.id;
    }
  }

  if (!row || !row.aktif) {
    // Sesi cookie web dibersihkan; untuk token Android, aplikasi sendiri yang menghapus sesinya saat 403.
    if (!token) await sb.auth.signOut();
    throw new ApiError(
      403,
      "TIDAK_BERHAK",
      "Akun Google ini belum terdaftar. Minta pengelola menambahkan email kamu.",
    );
  }

  return { user, member: mapAnggota(row), admin, sb };
}

export async function requireManager() {
  const ctx = await requireMember();
  if (ctx.member.peran !== "pengelola") {
    throw new ApiError(403, "TIDAK_BERHAK", "Halaman ini khusus pengelola.");
  }
  return ctx;
}
