import { NextResponse } from "next/server";
import { ApiError, jsonError, requireManager } from "@/lib/server/auth";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const { member, admin } = await requireManager();
    const body = (await request.json().catch(() => ({}))) as { alasan?: string };
    const alasan = body.alasan?.trim();
    if (!alasan) {
      throw new ApiError(400, "VALIDASI", "Alasan penolakan wajib diisi.", { alasan: "Alasan wajib diisi." });
    }

    const { data: updated, error } = await admin
      .from("permintaan")
      .update({
        status: "ditolak",
        alasan,
        diproses_oleh: member.id,
        diproses_pada: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("status", "menunggu")
      .select("*")
      .single();

    if (error || !updated) {
      throw new ApiError(409, "KONFLIK", "Permintaan ini sudah diproses.");
    }
    return NextResponse.json({ permintaan: updated });
  } catch (err) {
    return jsonError(err);
  }
}
