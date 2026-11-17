import { NextResponse } from "next/server";
import { isSolanaAddress, usd } from "@/lib/format";
import { ApiError, jsonError, requireMember } from "@/lib/server/auth";
import { loadPoolContext } from "@/lib/server/pool";
import type { Jenis } from "@/lib/types";

export async function GET(request: Request) {
  try {
    await requireMember();
    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    const ctx = await loadPoolContext();
    // OQ-07: semua anggota melihat daftar permintaan semua anggota
    const list = status ? ctx.permintaan.filter((p) => p.status === status) : ctx.permintaan;
    return NextResponse.json({ permintaan: list });
  } catch (err) {
    return jsonError(err);
  }
}

export async function POST(request: Request) {
  try {
    const { member, admin } = await requireMember();
    const body = (await request.json().catch(() => ({}))) as {
      jenis?: Jenis;
      jumlah_usd?: number;
      tanggal_transfer?: string;
      bukti_transaksi?: string;
      alamat_wallet_tujuan?: string;
      catatan?: string;
      versi_data?: string;
    };

    const jenis = body.jenis;
    if (jenis !== "setor" && jenis !== "tarik") {
      throw new ApiError(400, "VALIDASI", "Jenis permintaan harus 'setor' atau 'tarik'.");
    }
    const jumlah = Number(body.jumlah_usd ?? 0);
    if (!(jumlah > 0)) {
      throw new ApiError(400, "VALIDASI", "Jumlah harus lebih dari 0.", { jumlah: "Jumlah harus lebih dari 0." });
    }

    const ctx = await loadPoolContext();

    // BR-08: maks 1 permintaan menunggu per anggota per jenis
    if (ctx.permintaan.some((x) => x.anggotaId === member.id && x.jenis === jenis && x.status === "menunggu")) {
      throw new ApiError(
        409,
        "KONFLIK",
        jenis === "setor"
          ? "Kamu masih punya permintaan setoran yang menunggu. Batalkan atau tunggu yang itu selesai dulu."
          : "Kamu masih punya permintaan penarikan yang menunggu. Batalkan atau tunggu yang itu selesai dulu.",
      );
    }

    if (jenis === "tarik") {
      if (body.versi_data && body.versi_data !== ctx.versiData) {
        throw new ApiError(409, "KONFLIK", "Angka baru saja diperbarui. Cek lagi simulasi kamu.");
      }
      if (!ctx.hasil.cek.lolos) {
        throw new ApiError(422, "ATURAN_BISNIS", "Penarikan ditahan sementara karena angka sedang dicek ulang.");
      }
      const pos = ctx.hasil.posisi.find((x) => x.id === member.id);
      if (!pos || jumlah > pos.netUsd + 0.005) {
        throw new ApiError(422, "ATURAN_BISNIS", `Maksimal yang bisa kamu tarik hari ini ${usd(pos?.netUsd ?? 0)}.`, {
          jumlah: `Maksimal ${usd(pos?.netUsd ?? 0)}`,
        });
      }
      const tujuan = body.alamat_wallet_tujuan?.trim();
      if (tujuan && !isSolanaAddress(tujuan)) {
        throw new ApiError(
          400,
          "VALIDASI",
          "Alamat wallet Solana tujuan harus 32–44 karakter (base58).",
          { alamat: "Alamat wallet Solana tidak valid." },
        );
      }
    }

    const { data: inserted, error } = await admin
      .from("permintaan")
      .insert({
        anggota_id: member.id,
        jenis,
        jumlah_usd: Number(jumlah.toFixed(2)),
        tanggal_transfer: body.tanggal_transfer || null,
        bukti_transaksi: body.bukti_transaksi?.trim() || null,
        alamat_wallet_tujuan: body.alamat_wallet_tujuan?.trim() || null,
        catatan: body.catatan?.trim() || null,
        status: "menunggu",
        sumber: "app",
        dibuat_oleh: member.id,
      })
      .select("*")
      .single();

    if (error) {
      if (error.code === "23505") {
        throw new ApiError(
          409,
          "KONFLIK",
          jenis === "setor"
            ? "Kamu masih punya permintaan setoran yang menunggu. Batalkan atau tunggu yang itu selesai dulu."
            : "Kamu masih punya permintaan penarikan yang menunggu. Batalkan atau tunggu yang itu selesai dulu.",
        );
      }
      throw new ApiError(400, "VALIDASI", error.message);
    }

    return NextResponse.json({ permintaan: inserted }, { status: 201 });
  } catch (err) {
    return jsonError(err);
  }
}
