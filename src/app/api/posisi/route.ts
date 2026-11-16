import { NextResponse } from "next/server";
import { jsonError, requireMember } from "@/lib/server/auth";
import { loadPoolContext } from "@/lib/server/pool";

export async function GET() {
  try {
    const { member } = await requireMember();
    const isManager = member.peran === "pengelola";
    const ctx = await loadPoolContext({ includeArusDetails: isManager });

    return NextResponse.json({
      saya: member,
      tanggal_data: ctx.hasil.tanggalData,
      versi_data: ctx.versiData,
      sekarang: ctx.sekarang,
      data: {
        anggota: ctx.anggota,
        snapshots: ctx.snapshots,
        permintaan: ctx.permintaan,
        arus: ctx.arus,
        estimasi: ctx.estimasi,
        log: ctx.log,
        pengaturan: ctx.pengaturan,
      },
      titik: ctx.titik,
      arusBelumCount: ctx.arusBelumCount,
      jobLog: isManager ? ctx.jobLog : [],
      hasil: ctx.hasil,
      resmi: ctx.resmi,
    });
  } catch (err) {
    return jsonError(err);
  }
}
