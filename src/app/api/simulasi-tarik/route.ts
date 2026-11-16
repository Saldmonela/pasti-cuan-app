import { NextResponse } from "next/server";
import { simulasiTarik } from "@/lib/engine";
import { ApiError, jsonError, requireMember } from "@/lib/server/auth";
import { loadPoolContext } from "@/lib/server/pool";

export async function POST(request: Request) {
  try {
    const { member } = await requireMember();
    const body = (await request.json().catch(() => ({}))) as { jumlah_usd?: number };
    const jumlah = Number(body.jumlah_usd ?? 0);
    if (!(jumlah > 0)) {
      throw new ApiError(400, "VALIDASI", "Jumlah harus lebih dari 0.", { jumlah: "Jumlah harus lebih dari 0." });
    }

    const ctx = await loadPoolContext();
    const pos = ctx.hasil.posisi.find((p) => p.id === member.id);
    if (!pos || jumlah > pos.netUsd + 0.005) {
      throw new ApiError(
        422,
        "ATURAN_BISNIS",
        `Maksimal yang bisa kamu tarik hari ini US$${(pos?.netUsd ?? 0).toFixed(2)}.`,
      );
    }

    const sim = simulasiTarik(ctx.hasil, member.id, jumlah, ctx.pengaturan);
    return NextResponse.json({
      versi_data: ctx.versiData,
      unit_terjual: sim.unitTerjual,
      fee_dibayar_usd: sim.feeDibayar,
      sisa_nilai_bersih_usd: sim.sisaNetUsd,
      sisa_modal_dasar_usd: sim.sisaModalUsd,
      sisa_porsi_persen: sim.sisaPorsi,
      maksimal: sim.maksimal,
    });
  } catch (err) {
    return jsonError(err);
  }
}
