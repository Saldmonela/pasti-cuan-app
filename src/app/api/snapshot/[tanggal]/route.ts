import { NextResponse } from "next/server";
import { tanggal as fmtTanggal } from "@/lib/format";
import { ApiError, jsonError, requireManager } from "@/lib/server/auth";
import { loadPoolContext } from "@/lib/server/pool";

export async function PATCH(request: Request, context: { params: Promise<{ tanggal: string }> }) {
  try {
    const { tanggal } = await context.params;
    const { admin } = await requireManager();
    const body = (await request.json().catch(() => ({}))) as {
      nilai_usd?: number;
      saldo_sol?: number;
      fee_lp_diklaim_sol?: number;
      catatan?: string;
      alasan?: string;
      konfirmasi_hitung_ulang?: boolean;
    };

    if (!body.konfirmasi_hitung_ulang) {
      throw new ApiError(400, "VALIDASI", "Konfirmasi hitung ulang wajib disetujui.");
    }

    const ctx = await loadPoolContext();
    const ada = ctx.snapshots.find((s) => s.tanggal === tanggal);
    if (!ada) throw new ApiError(404, "TIDAK_DITEMUKAN", "Snapshot tidak ditemukan.");

    const jadiKoreksi = ada.sumber === "otomatis" || ada.sumber === "koreksi";
    if (jadiKoreksi && !body.alasan?.trim()) {
      throw new ApiError(400, "VALIDASI", "Alasan koreksi wajib diisi.", { alasan: "Alasan wajib diisi." });
    }

    const nilaiUsd = body.nilai_usd != null ? Number(body.nilai_usd) : ada.nilaiUsd;
    const saldoSol = body.saldo_sol != null ? Number(body.saldo_sol) : ada.saldoSol;
    if (!(nilaiUsd > 0) || !(saldoSol > 0)) {
      throw new ApiError(400, "VALIDASI", "Nilai USD dan saldo SOL harus lebih dari 0.");
    }

    const { data: updated, error } = await admin
      .from("snapshot")
      .update({
        nilai_usd: Number(nilaiUsd.toFixed(2)),
        saldo_sol: Number(saldoSol.toFixed(9)),
        fee_lp_diklaim_sol:
          body.fee_lp_diklaim_sol !== undefined ? body.fee_lp_diklaim_sol : ada.feeLpDiklaimSol ?? null,
        catatan: body.catatan !== undefined ? body.catatan?.trim() || null : ada.catatan ?? null,
        sumber: jadiKoreksi ? "koreksi" : ada.sumber,
        alasan: body.alasan?.trim() || ada.alasan || null,
        diubah_pada: new Date().toISOString(),
      })
      .eq("tanggal", tanggal)
      .select("*")
      .single();

    if (error) throw new ApiError(400, "VALIDASI", error.message);
    return NextResponse.json({ snapshot: updated });
  } catch (err) {
    return jsonError(err);
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ tanggal: string }> }) {
  try {
    const { tanggal } = await context.params;
    const { admin } = await requireManager();
    const ctx = await loadPoolContext();
    if (ctx.permintaan.some((p) => p.status === "selesai" && p.tanggalEfektif === tanggal)) {
      throw new ApiError(
        422,
        "ATURAN_BISNIS",
        `Saldo ${fmtTanggal(tanggal)} dipakai sebagai tanggal efektif transaksi, jadi hanya bisa diubah.`,
      );
    }

    const { error } = await admin.from("snapshot").delete().eq("tanggal", tanggal);
    if (error) throw new ApiError(422, "ATURAN_BISNIS", error.message);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return jsonError(err);
  }
}
