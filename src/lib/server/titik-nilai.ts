export type TitikRow = {
  id: number;
  dibaca_pada: string;
  resolusi: string;
  sumber: string;
  nilai_usd: number | string;
  saldo_sol: number | string;
  harga_sol_usd: number | string;
};

function skorTitik(r: Pick<TitikRow, "sumber" | "resolusi">): number {
  if (r.sumber === "baca") {
    if (r.resolusi === "1m") return 13;
    if (r.resolusi === "15m") return 12;
    if (r.resolusi === "1h") return 11;
    return 10;
  }
  if (r.resolusi === "1m") return 3;
  if (r.resolusi === "1h") return 2;
  if (r.resolusi === "15m") return 1;
  return 0;
}

/** Pilih resolusi/sumber terbaik bila ada duplikat waktu persis, lalu urutkan kronologis. */
export function dedupTitikRows(rows: TitikRow[]): TitikRow[] {
  const byMs = new Map<number, TitikRow>();
  for (const r of rows) {
    const t = Date.parse(r.dibaca_pada);
    const prev = byMs.get(t);
    if (!prev || skorTitik(r) > skorTitik(prev) || (skorTitik(r) === skorTitik(prev) && Number(r.id) > Number(prev.id))) {
      byMs.set(t, r);
    }
  }
  return [...byMs.values()].sort((a, b) => Date.parse(a.dibaca_pada) - Date.parse(b.dibaca_pada));
}

/** Saring lonjakan 1 titik akibat jeda sesaat indexer Meteora saat posisi DLMM di-rebalance. */
export function saringLonjakanIndekser(rows: TitikRow[], refIds: Set<number>, arusMs: number[]): TitikRow[] {
  if (rows.length < 3) return [...rows];
  const out: TitikRow[] = [rows[0]];
  for (let i = 1; i < rows.length - 1; i++) {
    const cur = rows[i];
    if (cur.sumber !== "baca" || refIds.has(Number(cur.id))) {
      out.push(cur);
      continue;
    }
    const prev = rows[i - 1];
    const next = rows[i + 1];
    const prevMs = Date.parse(prev.dibaca_pada);
    const nextMs = Date.parse(next.dibaca_pada);
    if (nextMs - prevMs > 10 * 60_000 || arusMs.some((t) => t >= prevMs && t <= nextMs)) {
      out.push(cur);
      continue;
    }
    const prevUsd = Number(prev.nilai_usd);
    const curUsd = Number(cur.nilai_usd);
    const nextUsd = Number(next.nilai_usd);
    if (
      prevUsd > 0 &&
      nextUsd > 0 &&
      Math.abs(curUsd - prevUsd) / prevUsd > 0.15 &&
      Math.abs(curUsd - nextUsd) / nextUsd > 0.15 &&
      Math.abs(nextUsd - prevUsd) / prevUsd < 0.05
    ) {
      continue;
    }
    out.push(cur);
  }
  out.push(rows[rows.length - 1]);
  return out;
}
