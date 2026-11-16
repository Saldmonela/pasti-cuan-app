import { NextResponse } from "next/server";
import { isoWib, MULAI_BACA, titikEstimasi } from "@/lib/onchain";
import { ApiError, jsonError, requireManager } from "@/lib/server/auth";
import { loadPoolContext } from "@/lib/server/pool";
import type { Permintaan, Snapshot } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const { member, admin } = await requireManager();
    const body = (await request.json().catch(() => ({}))) as {
      snapshots?: Snapshot[];
      transaksi?: Permintaan[];
      estimasi?: boolean;
    };

    const snaps = body.snapshots ?? [];
    const transaksi = body.transaksi ?? [];
    if (!snaps.length) {
      throw new ApiError(400, "VALIDASI", "Data snapshot impor tidak boleh kosong.");
    }

    const ctx = await loadPoolContext();
    if (
      ctx.snapshots.some((x) => x.sumber === "impor") ||
      ctx.permintaan.some((p) => p.status === "selesai")
    ) {
      throw new ApiError(409, "KONFLIK", "Pool sudah punya data. Batalkan impor yang lama dulu.");
    }

    const snapRows = snaps.map((s) => ({
      tanggal: s.tanggal,
      nilai_usd: Number(s.nilaiUsd.toFixed(2)),
      saldo_sol: Number(s.saldoSol.toFixed(9)),
      fee_lp_diklaim_sol: s.feeLpDiklaimSol ?? null,
      catatan: s.catatan ?? null,
      sumber: "impor",
      dibuat_oleh: member.id,
      dibuat_pada: s.dibuatPada || `${s.tanggal}T08:00:00+07:00`,
    }));

    const { error: snapErr } = await admin.from("snapshot").upsert(snapRows, { onConflict: "tanggal" });
    if (snapErr) throw new ApiError(400, "VALIDASI", snapErr.message);

    if (transaksi.length > 0) {
      const txRows = transaksi.map((t) => ({
        anggota_id: t.anggotaId,
        jenis: t.jenis,
        jumlah_usd: Number(t.jumlahUsd.toFixed(2)),
        status: "selesai",
        tanggal_efektif: t.tanggalEfektif!,
        waktu_efektif: `${t.tanggalEfektif}T${ctx.pengaturan.jamSnapshot}:00+07:00`,
        jumlah_final_usd: Number((t.jumlahFinalUsd ?? t.jumlahUsd).toFixed(2)),
        sumber: "impor",
        dibuat_oleh: member.id,
        diproses_oleh: member.id,
        diproses_pada: t.diprosesPada || `${t.tanggalEfektif}T08:00:00+07:00`,
        dibuat_pada: t.dibuatPada || `${t.tanggalEfektif}T08:00:00+07:00`,
      }));
      const { error: txErr } = await admin.from("permintaan").insert(txRows);
      if (txErr) throw new ApiError(400, "VALIDASI", txErr.message);
    }

    if (body.estimasi) {
      const est = titikEstimasi(snaps, transaksi, MULAI_BACA, ctx.pengaturan.jamSnapshot);
      const estRows = est.map((t) => ({
        dibaca_pada: isoWib(t.ms),
        resolusi: "1h",
        sumber: "estimasi",
        nilai_usd: Number(t.nilaiUsd.toFixed(2)),
        saldo_sol: Number(t.saldoSol.toFixed(9)),
        harga_sol_usd: Number(t.harga.toFixed(6)),
      }));
      if (estRows.length > 0) {
        await admin
          .from("titik_nilai")
          .upsert(estRows, { onConflict: "dibaca_pada,resolusi", ignoreDuplicates: true });
      }
    }

    return NextResponse.json({ ok: true, jumlah_snapshot: snaps.length, jumlah_transaksi: transaksi.length }, { status: 201 });
  } catch (err) {
    return jsonError(err);
  }
}

export async function DELETE() {
  try {
    await requireManager();
    const ctx = await loadPoolContext();
    if (ctx.permintaan.some((p) => p.sumber === "app" && p.status === "selesai")) {
      throw new ApiError(
        409,
        "KONFLIK",
        "Impor tidak bisa dibatalkan karena sudah ada transaksi baru yang diproses lewat app.",
      );
    }

    await ctx.admin.from("permintaan").delete().eq("sumber", "impor");
    await ctx.admin.from("snapshot").delete().eq("sumber", "impor");
    await ctx.admin.from("titik_nilai").delete().eq("sumber", "estimasi");

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return jsonError(err);
  }
}
