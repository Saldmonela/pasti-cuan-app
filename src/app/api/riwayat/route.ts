import { NextResponse } from "next/server";
import { kumulatif, seriRentang } from "@/lib/engine";
import { ApiError, jsonError, requireMember } from "@/lib/server/auth";
import { loadPoolContext } from "@/lib/server/pool";
import type { Rentang } from "@/lib/types";

const RENTANG_MAP: Record<string, Rentang> = {
  "24j": "24J",
  "7h": "7H",
  "setoran terakhir": "Setoran Terakhir",
  setoran_terakhir: "Setoran Terakhir",
  "setoran-terakhir": "Setoran Terakhir",
  semua: "Semua",
};

export async function GET(request: Request) {
  try {
    const { member } = await requireMember();
    const url = new URL(request.url);
    const cakupan = (url.searchParams.get("cakupan") ?? "saya").toLowerCase();
    const rentangParam = (url.searchParams.get("rentang") ?? "24j").toLowerCase();

    if (cakupan !== "saya" && cakupan !== "pool") {
      throw new ApiError(400, "VALIDASI", "Parameter cakupan harus 'saya' atau 'pool'.");
    }
    const rentang = RENTANG_MAP[rentangParam];
    if (!rentang) {
      throw new ApiError(400, "VALIDASI", "Parameter rentang harus 24j, 7h, setoran_terakhir, atau semua.");
    }

    const ctx = await loadPoolContext({ includeArusDetails: true });
    const seri = seriRentang(
      {
        h: ctx.resmi,
        anggota: ctx.anggota,
        snaps: ctx.snapshots,
        permintaan: ctx.permintaan,
        arus: ctx.arusAll,
        titik: ctx.titik,
        sekarang: ctx.sekarang,
        set: ctx.pengaturan,
      },
      rentang,
      cakupan === "saya" ? member.id : null,
    );
    const kum = kumulatif(seri);
    const akhir = kum.at(-1) ?? { ruUsd: 0, ruSol: 0, persenUsd: 0, persenSol: 0 };

    return NextResponse.json({
      cakupan,
      rentang,
      awal: seri.awal,
      estimasiSampai: seri.estimasiSampai ?? null,
      titik: seri.titik.map((t, i) => ({
        ...t,
        untung_rugi_usd: kum[i].ruUsd,
        untung_rugi_sol: kum[i].ruSol,
        persen_usd: kum[i].persenUsd,
        persen_sol: kum[i].persenSol,
      })),
      ringkasan: {
        untung_rugi_usd: akhir.ruUsd,
        untung_rugi_sol: akhir.ruSol,
        persen_usd: akhir.persenUsd,
        persen_sol: akhir.persenSol,
      },
    });
  } catch (err) {
    return jsonError(err);
  }
}
