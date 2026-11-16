import { NextResponse } from "next/server";
import { createSupabaseAdmin, createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next");
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";

  if (!code) {
    return NextResponse.redirect(new URL("/masuk?error=auth_gagal", url.origin));
  }

  const sb = await createSupabaseServerClient();
  const { data, error } = await sb.auth.exchangeCodeForSession(code);
  if (error || !data.user?.email) {
    return NextResponse.redirect(new URL("/masuk?error=auth_gagal", url.origin));
  }

  const admin = createSupabaseAdmin();
  const email = data.user.email.trim().toLowerCase();
  const { data: member } = await admin
    .from("anggota")
    .select("id, auth_user_id, aktif")
    .eq("email", email)
    .maybeSingle();

  if (!member || !member.aktif) {
    await sb.auth.signOut();
    return NextResponse.redirect(new URL("/masuk?error=belum_terdaftar", url.origin));
  }

  if (!member.auth_user_id) {
    await admin.from("anggota").update({ auth_user_id: data.user.id }).eq("id", member.id);
  }

  return NextResponse.redirect(new URL(safeNext, url.origin));
}
