import { NextResponse } from "next/server";
import { ApiError, jsonError, requireMember } from "@/lib/server/auth";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const { member, admin } = await requireMember();

    const { data: p } = await admin.from("permintaan").select("*").eq("id", id).maybeSingle();
    if (!p) throw new ApiError(404, "TIDAK_DITEMUKAN", "Permintaan tidak ditemukan.");
    if (p.anggota_id !== member.id) {
      throw new ApiError(403, "TIDAK_BERHAK", "Kamu hanya bisa membatalkan permintaan milikmu sendiri.");
    }
    if (p.status !== "menunggu") {
      throw new ApiError(409, "KONFLIK", "Permintaan ini sudah diproses dan tidak bisa dibatalkan.");
    }

    const { data: linkedArus } = await admin
      .from("arus_onchain")
      .select("id")
      .eq("permintaan_id", id)
      .limit(1);
    if (linkedArus && linkedArus.length > 0) {
      throw new ApiError(
        409,
        "KONFLIK",
        "Transfernya sudah tercatat di wallet, jadi tidak bisa dibatalkan di app. Hubungi pengelola.",
      );
    }

    const { error } = await admin
      .from("permintaan")
      .update({ status: "dibatalkan" })
      .eq("id", id)
      .eq("status", "menunggu");
    if (error) throw new ApiError(400, "VALIDASI", error.message);

    return NextResponse.json({ ok: true });
  } catch (err) {
    return jsonError(err);
  }
}
