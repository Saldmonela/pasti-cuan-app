import { NextResponse } from "next/server";
import { isoWib, MULAI_BACA, titikEstimasi } from "@/lib/onchain";
import { jsonError, requireManager } from "@/lib/server/auth";
import { loadPoolContext } from "@/lib/server/pool";

export async function POST() {
  try {
    await requireManager();
    const ctx = await loadPoolContext();
    const imporSnaps = ctx.snapshots.filter((s) => s.sumber === "impor");
    const est = titikEstimasi(imporSnaps, ctx.permintaan, MULAI_BACA, ctx.pengaturan.jamSnapshot);
    const estRows = est.map((t) => ({
      dibaca_pada: isoWib(t.ms),
      resolusi: "1h",
      sumber: "estimasi",
      nilai_usd: Number(t.nilaiUsd.toFixed(2)),
      saldo_sol: Number(t.saldoSol.toFixed(9)),
      harga_sol_usd: Number(t.harga.toFixed(6)),
    }));
    if (estRows.length > 0) {
      await ctx.admin
        .from("titik_nilai")
        .upsert(estRows, { onConflict: "dibaca_pada,resolusi", ignoreDuplicates: true });
    }
    return NextResponse.json({ ok: true, jumlah: estRows.length });
  } catch (err) {
    return jsonError(err);
  }
}
