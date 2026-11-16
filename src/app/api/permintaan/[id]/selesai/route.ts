import { NextResponse } from "next/server";
import { hitungPool } from "@/lib/engine";
import { tanggal as fmtTanggal, usd } from "@/lib/format";
import { msSnapshot } from "@/lib/onchain";
import { ApiError, jsonError, requireManager } from "@/lib/server/auth";
import { loadPoolContext } from "@/lib/server/pool";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const { member, admin } = await requireManager();
    const body = (await request.json().catch(() => ({}))) as {
      tanggal_efektif?: string;
      waktu_efektif?: string;
      titik_nilai_id?: number;
      jumlah_final_usd?: number;
      bukti_transaksi?: string;
      alasan?: string;
    };

    const ctx = await loadPoolContext({ includeArusDetails: true });
    const p = ctx.permintaan.find((x) => x.id === id);
    if (!p) throw new ApiError(404, "TIDAK_DITEMUKAN", "Permintaan tidak ditemukan.");
    if (p.status !== "menunggu") throw new ApiError(409, "KONFLIK", "Permintaan ini sudah diproses.");

    const jumlahFinal = Number(body.jumlah_final_usd ?? 0);
    if (!(jumlahFinal > 0)) {
      throw new ApiError(400, "VALIDASI", "Jumlah harus lebih dari 0.", { jumlah: "Jumlah harus lebih dari 0." });
    }
    if (Math.abs(jumlahFinal - p.jumlahUsd) > 0.004 && !body.alasan?.trim()) {
      throw new ApiError(400, "VALIDASI", "Jumlah berbeda dari yang diajukan. Tulis alasannya.", {
        alasan: "Alasan wajib diisi.",
      });
    }

    const useOnchainTime = Boolean(body.waktu_efektif && body.titik_nilai_id);
    const tglEfektif = body.tanggal_efektif;
    let waktuEfektif = body.waktu_efektif;
    let titikNilaiId = body.titik_nilai_id;

    if (useOnchainTime) {
      if (!ctx.titik.some((ti) => ti.id === titikNilaiId)) {
        throw new ApiError(422, "ATURAN_BISNIS", "Titik nilai referensi untuk transfer tidak ditemukan.");
      }
    } else {
      if (!tglEfektif || !ctx.snapshots.some((s) => s.tanggal === tglEfektif)) {
        const jam = ctx.pengaturan.jamSnapshot.replace(":", ".");
        const msg =
          tglEfektif && msSnapshot(tglEfektif, ctx.pengaturan.jamSnapshot) > ctx.sekarang
            ? `Snapshot ${fmtTanggal(tglEfektif)} belum ada. Snapshot otomatis dibuat ${fmtTanggal(tglEfektif)}, ${jam} WIB; tandai selesai sesudahnya.`
            : `Belum ada snapshot untuk ${tglEfektif ? fmtTanggal(tglEfektif) : "tanggal itu"}. Isi snapshot manual dulu.`;
        throw new ApiError(422, "ATURAN_BISNIS", msg, { tanggal: msg });
      }
      waktuEfektif = `${tglEfektif}T${ctx.pengaturan.jamSnapshot}:00+07:00`;
      titikNilaiId = undefined;
    }

    const finalPerm = {
      ...p,
      status: "selesai" as const,
      tanggalEfektif: useOnchainTime ? undefined : tglEfektif,
      waktuEfektif,
      titikNilaiId,
      jumlahFinalUsd: Number(jumlahFinal.toFixed(2)),
      buktiTransaksi: body.bukti_transaksi?.trim() || p.buktiTransaksi,
      alasan: body.alasan?.trim() || undefined,
    };

    if (p.jenis === "tarik") {
      const uji = hitungPool(
        ctx.anggota,
        ctx.snapshots,
        ctx.permintaan.map((x) => (x.id === id ? finalPerm : x)),
        ctx.pengaturan,
        ctx.arusAll,
        ctx.titik,
      );
      const ang = ctx.anggota.find((a) => a.id === p.anggotaId);
      const nm = ang?.nama ?? p.anggotaId;
      if (uji.cek.penyebab.some((s) => s.startsWith(`Penarikan ${nm}`))) {
        const pos = ctx.hasil.posisi.find((x) => x.id === p.anggotaId);
        throw new ApiError(
          422,
          "ATURAN_BISNIS",
          `Nilai bersih investor sekarang ${usd(pos?.netUsd ?? 0)}, kurang dari ${usd(jumlahFinal)} yang diminta.`,
          { jumlah: "Melebihi nilai bersih" },
        );
      }
    }

    const { data: updated, error } = await admin
      .from("permintaan")
      .update({
        status: "selesai",
        tanggal_efektif: useOnchainTime ? null : tglEfektif,
        waktu_efektif: waktuEfektif,
        titik_nilai_id: titikNilaiId ?? null,
        jumlah_final_usd: Number(jumlahFinal.toFixed(2)),
        bukti_transaksi: finalPerm.buktiTransaksi ?? null,
        alasan: finalPerm.alasan ?? null,
        diproses_oleh: member.id,
        diproses_pada: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("status", "menunggu")
      .select("*")
      .single();

    if (error || !updated) {
      throw new ApiError(409, "KONFLIK", error?.message ?? "Permintaan ini sudah diproses.");
    }

    return NextResponse.json({ permintaan: updated });
  } catch (err) {
    return jsonError(err);
  }
}
