import { NextResponse } from "next/server";
import { ApiError, jsonError, requireManager } from "@/lib/server/auth";

export async function PATCH(request: Request) {
  try {
    const { admin } = await requireManager();
    const body = (await request.json().catch(() => ({}))) as {
      fee_persen?: number;
      satuan_dasar_fee?: "USD" | "SOL";
      batas_data_lama_hari?: number;
      ambang_lonjakan_persen?: number;
      ambang_likuiditas_token_usd?: number;
      ambang_dust_usd?: number;
      batas_live_lama_menit?: number;
      toleransi_cocok_persen?: number;
    };

    const patch: Record<string, unknown> = { diubah_pada: new Date().toISOString() };
    if (body.fee_persen !== undefined) patch.fee_persen = body.fee_persen;
    if (body.satuan_dasar_fee !== undefined) patch.satuan_dasar_fee = body.satuan_dasar_fee;
    if (body.batas_data_lama_hari !== undefined) patch.batas_data_lama_hari = body.batas_data_lama_hari;
    if (body.ambang_lonjakan_persen !== undefined) patch.ambang_lonjakan_persen = body.ambang_lonjakan_persen;
    if (body.ambang_likuiditas_token_usd !== undefined)
      patch.ambang_likuiditas_token_usd = body.ambang_likuiditas_token_usd;
    if (body.ambang_dust_usd !== undefined) patch.ambang_dust_usd = body.ambang_dust_usd;
    if (body.batas_live_lama_menit !== undefined) patch.batas_live_lama_menit = body.batas_live_lama_menit;
    if (body.toleransi_cocok_persen !== undefined) patch.toleransi_cocok_persen = body.toleransi_cocok_persen;

    const { data, error } = await admin.from("pengaturan_pool").update(patch).eq("id", 1).select("*").single();
    if (error) throw new ApiError(400, "VALIDASI", error.message);
    return NextResponse.json({ pengaturan: data });
  } catch (err) {
    return jsonError(err);
  }
}
