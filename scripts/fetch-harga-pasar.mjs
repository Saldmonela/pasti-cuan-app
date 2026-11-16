// Mengambil harga SOL, DOGE, dan PEPE per jam dari CoinGecko (market_chart/range) untuk saldo SOL impor (US-06)
// dan titik estimasi riwayat (BR-24). Hasil disimpan ke src/lib/harga-pasar.json: { sol, doge, pepe: [[ms, usd], ...] }.
// Pakai: node scripts/fetch-harga-pasar.mjs [dari=2026-10-15] [sampai=2026-11-16]
import { writeFileSync } from "node:fs";

const [dari = "2026-10-15", sampai = "2026-11-16"] = process.argv.slice(2);
const s = (t) => Math.floor(Date.parse(`${t}T00:00:00Z`) / 1000);
const KOIN = { sol: "solana", doge: "dogecoin", pepe: "pepe" };
const hasil = {};
for (const [k, id] of Object.entries(KOIN)) {
  const url = `https://api.coingecko.com/api/v3/coins/${id}/market_chart/range?vs_currency=usd&from=${s(dari)}&to=${s(sampai)}`;
  const r = await fetch(url, { headers: { "User-Agent": "pasti-cuan-prototype" } });
  if (!r.ok) throw new Error(`CoinGecko ${id}: ${r.status}`);
  const { prices } = await r.json();
  hasil[k] = prices.map(([t, p]) => [t, k === "sol" ? Math.round(p * 1e4) / 1e4 : Number(p.toPrecision(6))]);
  await new Promise((ok) => setTimeout(ok, 3000)); // batas rate CoinGecko tanpa key
}
writeFileSync("src/lib/harga-pasar.json", JSON.stringify(hasil));
console.log(`Harga per jam disimpan: ${Object.entries(hasil).map(([k, v]) => `${k} ${v.length}`).join(", ")}.`);
