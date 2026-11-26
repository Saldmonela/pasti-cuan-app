import { describe, expect, it } from "vitest";
import { dedupTitikRows, saringLonjakanIndekser, type TitikRow } from "./titik-nilai";

function row(partial: Partial<TitikRow> & Pick<TitikRow, "id" | "dibaca_pada" | "nilai_usd">): TitikRow {
  return {
    resolusi: "1m",
    sumber: "baca",
    saldo_sol: 10,
    harga_sol_usd: 70,
    ...partial,
  };
}

describe("dedupTitikRows", () => {
  it("memilih estimasi 1h di atas estimasi 15m dan baca 1m di atas baca 15m pada waktu yang sama", () => {
    const res = dedupTitikRows([
      row({ id: 2129, dibaca_pada: "2026-11-15T03:00:00+00:00", resolusi: "1h", sumber: "estimasi", nilai_usd: 1958.53 }),
      row({ id: 10290, dibaca_pada: "2026-11-15T03:00:00+00:00", resolusi: "15m", sumber: "estimasi", nilai_usd: 1171.33 }),
      row({ id: 13206, dibaca_pada: "2026-11-17T01:00:00+00:00", resolusi: "15m", sumber: "baca", nilai_usd: 1208.07 }),
      row({ id: 321, dibaca_pada: "2026-11-17T01:00:00+00:00", resolusi: "1m", sumber: "baca", nilai_usd: 1203.93 }),
    ]);

    expect(res.map((r) => r.id)).toEqual([2129, 321]);
  });
});

describe("saringLonjakanIndekser", () => {
  it("menghapus lonjakan 1 titik (drop/spike lalu langsung kembali) yang tidak direferensikan dan tanpa arus onchain", () => {
    const rows = [
      row({ id: 5410, dibaca_pada: "2026-11-19T11:00:00+00:00", nilai_usd: 1240.56 }),
      row({ id: 5411, dibaca_pada: "2026-11-19T11:01:00+00:00", nilai_usd: 868.35 }),
      row({ id: 5412, dibaca_pada: "2026-11-19T11:02:00+00:00", nilai_usd: 1240.0 }),
      row({ id: 5526, dibaca_pada: "2026-11-19T12:56:00+00:00", nilai_usd: 1234.42 }),
      row({ id: 5527, dibaca_pada: "2026-11-19T12:57:00+00:00", nilai_usd: 1844.72 }),
      row({ id: 5528, dibaca_pada: "2026-11-19T12:58:00+00:00", nilai_usd: 1232.55 }),
    ];

    const res = saringLonjakanIndekser(rows, new Set(), []);
    expect(res.map((r) => r.id)).toEqual([5410, 5412, 5526, 5528]);
  });

  it("mempertahankan penurunan nyata, titik referensi transaksi, titik dengan arus onchain, dan titik terakhir", () => {
    const rows = [
      row({ id: 1, dibaca_pada: "2026-11-20T02:18:00+00:00", nilai_usd: 1200 }),
      row({ id: 2, dibaca_pada: "2026-11-20T02:19:00+00:00", nilai_usd: 840 }), // penurunan nyata (tidak balik)
      row({ id: 3, dibaca_pada: "2026-11-20T02:20:00+00:00", nilai_usd: 842 }),
      row({ id: 4, dibaca_pada: "2026-11-20T03:00:00+00:00", nilai_usd: 1000 }),
      row({ id: 5, dibaca_pada: "2026-11-20T03:01:00+00:00", nilai_usd: 700 }), // direferensikan tx/snapshot
      row({ id: 6, dibaca_pada: "2026-11-20T03:02:00+00:00", nilai_usd: 1002 }),
      row({ id: 7, dibaca_pada: "2026-11-20T04:00:00+00:00", nilai_usd: 1000 }),
      row({ id: 8, dibaca_pada: "2026-11-20T04:01:00+00:00", nilai_usd: 700 }), // ada arus onchain
      row({ id: 9, dibaca_pada: "2026-11-20T04:02:00+00:00", nilai_usd: 1001 }),
      row({ id: 10, dibaca_pada: "2026-11-20T05:00:00+00:00", nilai_usd: 500 }), // titik terakhir (live)
    ];

    const res = saringLonjakanIndekser(
      rows,
      new Set([5]),
      [Date.parse("2026-11-20T04:01:30+00:00")],
    );
    expect(res.map((r) => r.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });
});
