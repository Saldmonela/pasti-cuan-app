import { NextResponse } from "next/server";
import { jsonError, requireManager } from "@/lib/server/auth";
import { loadPoolContext } from "@/lib/server/pool";

export async function GET(request: Request) {
  try {
    await requireManager();
    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    const ctx = await loadPoolContext({ includeArusDetails: true });
    const list = status ? ctx.arusAll.filter((a) => a.status === status) : ctx.arusAll;
    return NextResponse.json({ arus: list });
  } catch (err) {
    return jsonError(err);
  }
}
