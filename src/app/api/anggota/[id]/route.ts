import { NextResponse } from "next/server";
import { usd } from "@/lib/format";
import { ApiError, jsonError, requireManager } from "@/lib/server/auth";
import { loadPoolContext } from "@/lib/server/pool";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const { admin } = await requireManager();
    const body = (await request.json().catch(() => ({}))) as {
      nama?: string;
      peran?: "investor" | "pengelola";
      aktif?: boolean;
      alamat_wallet?: string[];
    };

    const ctx = await loadPoolContext();
    const target = ctx.anggota.find((a) => a.id === id);
    if (!target) throw new ApiError(404, "TIDAK_DITEMUKAN", "Anggota tidak ditemukan.");

    if (body.aktif === false) {
      const pos = ctx.hasil.posisi.find((p) => p.id === id);
      if (pos && pos.unit > 1e-9) {
        throw new ApiError(
          422,
          "ATURAN_BISNIS",
          `${target.nama} masih punya dana ${usd(pos.netUsd)}. Tarik semua dulu sebelum menonaktifkan.`,
        );
      }
    }

    const patch: Record<string, unknown> = {};
    if (body.nama !== undefined) patch.nama = body.nama.trim();
    if (body.peran !== undefined) patch.peran = body.peran;
    if (body.aktif !== undefined) patch.aktif = body.aktif;
    if (body.alamat_wallet !== undefined) patch.alamat_wallet = body.alamat_wallet;

    const { data, error } = await admin.from("anggota").update(patch).eq("id", id).select("*").single();
    if (error) throw new ApiError(400, "VALIDASI", error.message);

    return NextResponse.json({ anggota: data });
  } catch (err) {
    return jsonError(err);
  }
}
