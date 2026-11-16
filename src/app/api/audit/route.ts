import { NextResponse } from "next/server";
import { jsonError, requireMember } from "@/lib/server/auth";

export async function GET(request: Request) {
  try {
    const { admin } = await requireMember();
    const url = new URL(request.url);
    const tabel = url.searchParams.get("tabel");
    const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
    const pageSize = 50;
    const from = (page - 1) * pageSize;

    let query = admin
      .from("log_audit")
      .select("*", { count: "exact" })
      .order("pada", { ascending: false })
      .range(from, from + pageSize - 1);
    if (tabel) query = query.eq("tabel", tabel);

    const { data, count, error } = await query;
    if (error) throw new Error(error.message);

    return NextResponse.json({ log: data ?? [], total: count ?? 0, page, pageSize });
  } catch (err) {
    return jsonError(err);
  }
}
