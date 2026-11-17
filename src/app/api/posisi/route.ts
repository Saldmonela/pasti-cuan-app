import { NextResponse } from "next/server";
import { jsonError, requireMember } from "@/lib/server/auth";
import { loadPoolContext } from "@/lib/server/pool";

export async function GET() {
  try {
    const { member } = await requireMember();
    const isManager = member.peran === "pengelola";
    const ctx = await loadPoolContext({ includeArusDetails: true });
    // Investor butuh transfer onchain untuk penanda setor/tarik di grafik (BR-21, BR-23), tapi tanpa alamat lawan & catatan.
    const arus = isManager
      ? ctx.arusAll
      : ctx.arusAll.map((a) => ({ ...a, alamatLawan: "", catatan: undefined, alasanSelisih: undefined }));
    // Non-pengelola tidak perlu menerima email & daftar wallet anggota lain di payload API.
    const anggota = isManager
      ? ctx.anggota
      : ctx.anggota.map((a) => (a.id === member.id ? a : { ...a, email: "", alamatWallet: undefined }));

    return NextResponse.json({
      saya: member,
      tanggal_data: ctx.hasil.tanggalData,
      versi_data: ctx.versiData,
      sekarang: ctx.sekarang,
      data: {
        anggota,
        snapshots: ctx.snapshots,
        permintaan: ctx.permintaan,
        arus,
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
