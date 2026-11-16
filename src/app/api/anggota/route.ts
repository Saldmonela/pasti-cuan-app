import { NextResponse } from "next/server";
import { ApiError, jsonError, requireManager } from "@/lib/server/auth";
import { loadPoolContext } from "@/lib/server/pool";

export async function POST(request: Request) {
  try {
    const { admin } = await requireManager();
    const body = (await request.json().catch(() => ({}))) as {
      nama?: string;
      email?: string;
      peran?: "investor" | "pengelola";
      alamat_wallet?: string[];
    };

    const nama = body.nama?.trim() ?? "";
    const email = body.email?.trim().toLowerCase() ?? "";
    const peran = body.peran === "pengelola" ? "pengelola" : "investor";
    const alamat = (body.alamat_wallet ?? []).map((x) => x.trim()).filter(Boolean);

    if (nama.length < 2 || nama.length > 40) {
      throw new ApiError(400, "VALIDASI", "Nama harus 2 sampai 40 karakter.", { nama: "Nama harus 2-40 karakter." });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new ApiError(400, "VALIDASI", "Tulis email Google yang valid.", { email: "Email tidak valid." });
    }
    if (alamat.some((x) => !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(x))) {
      throw new ApiError(
        400,
        "VALIDASI",
        "Alamat wallet Solana harus 32-44 karakter (huruf dan angka base58).",
        { alamat: "Format alamat tidak valid." },
      );
    }

    const ctx = await loadPoolContext();
    if (ctx.anggota.some((x) => x.nama.toLowerCase() === nama.toLowerCase())) {
      throw new ApiError(409, "KONFLIK", "Nama ini sudah dipakai anggota lain.", { nama: "Nama sudah dipakai." });
    }
    if (ctx.anggota.some((x) => x.email === email)) {
      throw new ApiError(409, "KONFLIK", "Email ini sudah dipakai anggota lain.", { email: "Email sudah dipakai." });
    }

    const { data, error } = await admin
      .from("anggota")
      .insert({ nama, email, peran, alamat_wallet: alamat, aktif: true })
      .select("*")
      .single();
    if (error) throw new ApiError(400, "VALIDASI", error.message);

    return NextResponse.json({ anggota: data }, { status: 201 });
  } catch (err) {
    return jsonError(err);
  }
}
