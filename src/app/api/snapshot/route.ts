import { NextResponse } from "next/server";
import { tanggal as fmtTanggal } from "@/lib/format";
import { ApiError, jsonError, requireManager } from "@/lib/server/auth";
import { loadPoolContext } from "@/lib/server/pool";

export async function POST(request: Request) {
  try {
    const { member, admin } = await requireManager();
    const body = (await request.json().catch(() => ({}))) as {
      tanggal?: string;
      nilai_usd?: number;
      saldo_sol?: number;
      fee_lp_diklaim_sol?: number;
      catatan?: string;
    };

    const tgl = body.tanggal;
    const nilaiUsd = Number(body.nilai_usd ?? 0);
    const saldoSol = Number(body.saldo_sol ?? 0);
    if (!tgl || !/^\d{4}-\d{2}-\d{2}$/.test(tgl)) {
      throw new ApiError(400, "VALIDASI", "Pilih tanggal yang valid.", { tanggal: "Tanggal wajib diisi." });
    }
    if (!(nilaiUsd > 0) || !(saldoSol > 0)) {
      throw new ApiError(400, "VALIDASI", "Nilai USD dan saldo SOL harus lebih dari 0.", {
        nilai: "Nilai harus lebih dari 0.",
      });
    }

    const ctx = await loadPoolContext({ includeArusDetails: true });
    if (ctx.snapshots.some((s) => s.tanggal === tgl)) {
      throw new ApiError(
        409,
        "KONFLIK",
        `Saldo untuk ${fmtTanggal(tgl)} sudah ada. Ubah data yang ada atau pilih tanggal lain.`,
        { tanggal: "Tanggal sudah ada" },
      );
    }

    // AC-02-03: peringatan > 30% hanya bila TIDAK ada transaksi tercatat maupun arus onchain terdeteksi
    let peringatanLonjakan: string | null = null;
    const prev = [...ctx.snapshots].filter((s) => s.tanggal < tgl).at(-1);
    if (prev) {
      const adaTx = ctx.permintaan.some(
        (p) =>
          p.status === "selesai" &&
          (p.tanggalEfektif === tgl || p.waktuEfektif?.slice(0, 10) === tgl),
      );
      const adaArus = ctx.arusAll.some(
        (a) => a.status !== "bukan_arus" && a.waktu.slice(0, 10) === tgl,
      );
      const pct = Math.abs((nilaiUsd - prev.nilaiUsd) / prev.nilaiUsd) * 100;
      if (!adaTx && !adaArus && pct > ctx.pengaturan.ambangLonjakanPersen) {
        peringatanLonjakan = `Saldo berubah ${Math.round(pct)}% dari sebelumnya tanpa ada setoran atau penarikan. Yakin angkanya benar?`;
      }
    }

    const { data: inserted, error } = await admin
      .from("snapshot")
      .insert({
        tanggal: tgl,
        nilai_usd: Number(nilaiUsd.toFixed(2)),
        saldo_sol: Number(saldoSol.toFixed(9)),
        fee_lp_diklaim_sol:
          body.fee_lp_diklaim_sol != null ? Number(body.fee_lp_diklaim_sol) : null,
        catatan: body.catatan?.trim() || null,
        sumber: "manual",
        dibuat_oleh: member.id,
      })
      .select("*")
      .single();

    if (error) throw new ApiError(400, "VALIDASI", error.message);

    return NextResponse.json({ snapshot: inserted, peringatan_lonjakan: peringatanLonjakan }, { status: 201 });
  } catch (err) {
    return jsonError(err);
  }
}
