import { NextResponse } from "next/server";
import { batasMenitSebelumTransfer } from "@/lib/arus-matching";
import { hitungPool } from "@/lib/engine";
import { tanggal as fmtTanggal, usd, waktu as fmtWaktu, wibIso } from "@/lib/format";
import { ms, msSnapshot } from "@/lib/onchain";
import { ApiError, jsonError, requireManager } from "@/lib/server/auth";
import { loadPoolContext } from "@/lib/server/pool";
import type { Jenis } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const { member, admin } = await requireManager();
    const body = (await request.json().catch(() => ({}))) as {
      ids?: string[];
      status?: "dicocokkan" | "buat" | "biaya" | "bukan_arus";
      permintaan_id?: string;
      anggota_id?: string;
      catatan?: string;
      alasan_selisih?: string;
    };

    const ids = body.ids ?? [];
    if (!ids.length) throw new ApiError(400, "VALIDASI", "Pilih minimal satu transfer.");

    const ctx = await loadPoolContext({ includeArusDetails: true });
    const pilih = ctx.arusAll.filter((a) => ids.includes(a.id));
    if (pilih.length !== ids.length) {
      throw new ApiError(404, "TIDAK_DITEMUKAN", "Transfer tidak ditemukan.");
    }
    if (pilih.some((x) => x.status !== "belum")) {
      throw new ApiError(409, "KONFLIK", "Transfer ini sudah dicocokkan. Muat ulang daftar.");
    }

    const arah = pilih[0].arah;
    if (pilih.some((x) => x.arah !== arah)) {
      throw new ApiError(400, "VALIDASI", "Transfer masuk dan keluar tidak bisa dicocokkan ke satu permintaan.");
    }

    const totalUsd = Number(pilih.reduce((t, x) => t + x.nilaiUsd, 0).toFixed(2));
    const nowIso = new Date().toISOString();
    const sortedPilih = [...pilih].sort((a, b) => ms(a.waktu) - ms(b.waktu));
    const waktuTransfer = sortedPilih[sortedPilih.length - 1].waktu;
    const kapan = fmtWaktu(waktuTransfer);

    if (body.status === "biaya" || body.status === "bukan_arus") {
      const catatan = body.catatan?.trim() ?? "";
      if (!catatan) throw new ApiError(400, "VALIDASI", "Catatan wajib diisi.", { catatan: "Catatan wajib diisi." });
      if (catatan.length > 200) {
        throw new ApiError(400, "VALIDASI", "Catatan maksimal 200 karakter.", { catatan: "Maksimal 200 karakter." });
      }
      const { error } = await admin
        .from("arus_onchain")
        .update({
          status: body.status,
          catatan,
          ditandai_oleh: member.id,
          ditandai_pada: nowIso,
        })
        .in("id", ids)
        .eq("status", "belum");
      if (error) throw new ApiError(400, "VALIDASI", error.message);

      return NextResponse.json({
        ok: true,
        pesan:
          body.status === "biaya"
            ? `Transfer ${kapan} ditandai biaya pool.`
            : `Transfer ${kapan} ditandai bukan arus.`,
      });
    }

    const jenis: Jenis = arah === "masuk" ? "setor" : "tarik";
    const alasanSelisih = body.alasan_selisih?.trim() || undefined;

    // Cari titik nilai terdekat SEBELUM menit transfer (BR-18) agar pembacaan di menit yang sama
    // yang terjadi sesudah dana berpindah (dibulatkan ke :00) tidak dipakai untuk menilai transaksi.
    const batasMenit = batasMenitSebelumTransfer(waktuTransfer);
    const { data: refTitikSebelum } = await admin
      .from("titik_nilai")
      .select("id, dibaca_pada")
      .eq("sumber", "baca")
      .lt("dibaca_pada", batasMenit)
      .order("dibaca_pada", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: refTitik } = refTitikSebelum
      ? { data: refTitikSebelum }
      : await admin
          .from("titik_nilai")
          .select("id, dibaca_pada")
          .eq("sumber", "baca")
          .lte("dibaca_pada", waktuTransfer)
          .order("dibaca_pada", { ascending: false })
          .limit(1)
          .maybeSingle();

    const { data: fallbackTitik } = !refTitik
      ? await admin
          .from("titik_nilai")
          .select("id, dibaca_pada")
          .eq("sumber", "baca")
          .order("dibaca_pada", { ascending: true })
          .limit(1)
          .maybeSingle()
      : { data: null };

    const titikRefId = refTitik?.id ?? fallbackTitik?.id;
    if (!titikRefId) {
      throw new ApiError(
        422,
        "ATURAN_BISNIS",
        "Belum ada titik nilai onchain untuk menilai transfer ini. Tunggu 1 menit atau gunakan snapshot manual.",
      );
    }

    let permintaanId = body.permintaan_id;
    let anggotaId = body.anggota_id;

    if (body.status === "dicocokkan") {
      const ada = ctx.permintaan.find((x) => x.id === permintaanId);
      if (!ada || ada.status !== "menunggu") {
        throw new ApiError(409, "KONFLIK", "Permintaan ini sudah diproses. Muat ulang daftar.");
      }
      if (ada.jenis !== jenis) {
        throw new ApiError(
          422,
          "ATURAN_BISNIS",
          `Transfer ${arah} hanya bisa dicocokkan dengan ${arah === "masuk" ? "setoran" : "penarikan"}.`,
        );
      }
      const selisihPct = (Math.abs(totalUsd - ada.jumlahUsd) / ada.jumlahUsd) * 100;
      if (selisihPct > ctx.pengaturan.toleransiCocokPersen && !alasanSelisih) {
        throw new ApiError(
          422,
          "ATURAN_BISNIS",
          `Jumlah transfer ${usd(totalUsd)} berbeda dari permintaan ${usd(ada.jumlahUsd)}. Isi alasan untuk melanjutkan.`,
          { alasan: "Isi alasan selisih." },
        );
      }
      anggotaId = ada.anggotaId;
    } else if (body.status === "buat") {
      const ang = ctx.anggota.find((x) => x.id === anggotaId);
      if (!ang) throw new ApiError(400, "VALIDASI", "Pilih anggota.", { anggota: "Pilih anggota." });
      if (ctx.permintaan.some((x) => x.anggotaId === ang.id && x.jenis === jenis && x.status === "menunggu")) {
        throw new ApiError(
          409,
          "KONFLIK",
          `${ang.nama} masih punya ${jenis === "setor" ? "setoran" : "penarikan"} yang menunggu. Cocokkan dengan permintaan itu.`,
          { anggota: "Masih ada permintaan menunggu." },
        );
      }
    } else {
      throw new ApiError(400, "VALIDASI", "Status aksi arus tidak valid.");
    }

    const bukti = sortedPilih.map((x) => x.signature).join(", ").slice(0, 100);
    const nm = ctx.anggota.find((x) => x.id === anggotaId)?.nama ?? anggotaId ?? "";

    // Validasi BR-09 untuk penarikan sebelum menyimpan
    const idUji = permintaanId ?? "sim_baru";
    const simPermintaan = [
      ...ctx.permintaan.filter((x) => x.id !== permintaanId),
      {
        id: idUji,
        anggotaId: anggotaId!,
        jenis,
        jumlahUsd: totalUsd,
        status: "selesai" as const,
        waktuEfektif: waktuTransfer,
        titikNilaiId: Number(titikRefId),
        jumlahFinalUsd: totalUsd,
        sumber: "app" as const,
        dibuatPada: nowIso,
      },
    ];
    if (jenis === "tarik") {
      const simArus = ctx.arusAll.map((a) =>
        ids.includes(a.id) ? { ...a, status: "dicocokkan" as const, permintaanId: idUji } : a,
      );
      const uji = hitungPool(ctx.anggota, ctx.snapshots, simPermintaan, ctx.pengaturan, simArus, ctx.titik);
      if (uji.lebihBayar.some((x) => x.permintaanId === idUji)) {
        throw new ApiError(
          422,
          "ATURAN_BISNIS",
          `Jumlah transfer ${usd(totalUsd)} melebihi nilai bersih ${nm} saat transfer terjadi.`,
        );
      }
    }

    if (body.status === "buat") {
      const { data: created, error: crErr } = await admin
        .from("permintaan")
        .insert({
          anggota_id: anggotaId,
          jenis,
          jumlah_usd: totalUsd,
          tanggal_transfer: wibIso(waktuTransfer).slice(0, 10),
          bukti_transaksi: bukti,
          status: "selesai",
          waktu_efektif: waktuTransfer,
          titik_nilai_id: titikRefId,
          jumlah_final_usd: totalUsd,
          alasan: alasanSelisih ?? null,
          sumber: "app",
          dibuat_oleh: member.id,
          diproses_oleh: member.id,
          diproses_pada: nowIso,
        })
        .select("id")
        .single();
      if (crErr || !created) throw new ApiError(400, "VALIDASI", crErr?.message ?? "Gagal membuat permintaan.");
      permintaanId = created.id;
    } else {
      const { error: upErr } = await admin
        .from("permintaan")
        .update({
          status: "selesai",
          waktu_efektif: waktuTransfer,
          titik_nilai_id: titikRefId,
          jumlah_final_usd: totalUsd,
          bukti_transaksi: bukti,
          alasan: alasanSelisih ?? null,
          diproses_oleh: member.id,
          diproses_pada: nowIso,
        })
        .eq("id", permintaanId!)
        .eq("status", "menunggu");
      if (upErr) throw new ApiError(409, "KONFLIK", upErr.message);
    }

    const { error: arusErr } = await admin
      .from("arus_onchain")
      .update({
        status: "dicocokkan",
        permintaan_id: permintaanId,
        alasan_selisih: alasanSelisih ?? null,
        ditandai_oleh: member.id,
        ditandai_pada: nowIso,
      })
      .in("id", ids)
      .eq("status", "belum");

    if (arusErr) throw new ApiError(409, "KONFLIK", arusErr.message);

    const label = `${jenis === "setor" ? "setoran" : "penarikan"} ${nm} ${usd(totalUsd)}`;
    return NextResponse.json({ ok: true, pesan: `Transfer ${kapan} dicocokkan dengan ${label} (efektif waktu transfer).` });
  } catch (err) {
    return jsonError(err);
  }
}

export async function DELETE(request: Request) {
  try {
    await requireManager();
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    if (!id) throw new ApiError(400, "VALIDASI", "ID arus wajib diisi.");

    const ctx = await loadPoolContext({ includeArusDetails: true });
    const x = ctx.arusAll.find((a) => a.id === id);
    if (!x || x.status === "belum") {
      throw new ApiError(400, "VALIDASI", "Transfer ini belum ditandai.");
    }
    const dipakai = ctx.snapshots.find((sn) => msSnapshot(sn.tanggal, ctx.pengaturan.jamSnapshot) > ms(x.waktu));
    if (dipakai) {
      throw new ApiError(
        422,
        "ATURAN_BISNIS",
        `Transfer ini sudah dipakai snapshot ${fmtTanggal(dipakai.tanggal)}. Perbaiki lewat koreksi saldo.`,
      );
    }
    const p = ctx.permintaan.find((q) => q.id === x.permintaanId);
    if (p && p.status === "selesai") {
      throw new ApiError(422, "ATURAN_BISNIS", "Permintaan terkait sudah selesai. Perbaiki lewat koreksi.");
    }

    const { error } = await ctx.admin
      .from("arus_onchain")
      .update({
        status: "belum",
        permintaan_id: null,
        catatan: null,
        alasan_selisih: null,
        ditandai_oleh: null,
        ditandai_pada: null,
      })
      .eq("id", id);
    if (error) throw new ApiError(400, "VALIDASI", error.message);

    return NextResponse.json({ ok: true });
  } catch (err) {
    return jsonError(err);
  }
}
