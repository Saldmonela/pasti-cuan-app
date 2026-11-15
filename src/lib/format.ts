// Format angka dan tanggal sesuai BR-14: format Indonesia, USD 2 desimal, SOL 4 desimal,
// porsi 2 desimal, zona waktu WIB. Tanda minus memakai U+2212 (DESIGN.md, Aturan Angka Tabular).

export const MINUS = "−";

const cache = new Map<number, Intl.NumberFormat>();
function nf(x: number, d: number): string {
  let f = cache.get(d);
  if (!f) {
    f = new Intl.NumberFormat("id-ID", { minimumFractionDigits: d, maximumFractionDigits: d });
    cache.set(d, f);
  }
  return f.format(Math.abs(x));
}

/** Membulatkan dulu supaya -0,004 tidak tampil sebagai "−US$0,00". */
function rounded(x: number, d: number): number {
  const r = Math.round(x * 10 ** d) / 10 ** d;
  return Object.is(r, -0) ? 0 : r;
}

export function angka(x: number, d: number): string {
  const r = rounded(x, d);
  return (r < 0 ? MINUS : "") + nf(r, d);
}

export function usd(x: number): string {
  const r = rounded(x, 2);
  return (r < 0 ? MINUS : "") + "US$" + nf(r, 2);
}

export function sol(x: number): string {
  const r = rounded(x, 4);
  return (r < 0 ? MINUS : "") + nf(r, 4) + " SOL";
}

export function uang(x: number, satuan: "USD" | "SOL"): string {
  return satuan === "USD" ? usd(x) : sol(x);
}

export function bertanda(x: number, satuan: "USD" | "SOL"): string {
  const d = satuan === "USD" ? 2 : 4;
  const r = rounded(x, d);
  const s = r < 0 ? MINUS : "+";
  return satuan === "USD" ? `${s}US$${nf(r, 2)}` : `${s}${nf(r, 4)} SOL`;
}

export function persenBertanda(x: number): string {
  const r = rounded(x, 2);
  return (r < 0 ? MINUS : "+") + nf(r, 2) + "%";
}

export function persen(x: number): string {
  return nf(rounded(x, 2), 2) + "%";
}

/** Kelas warna untung/rugi. Nol dihitung untung (tanda "+"). */
export function arah(x: number, d = 2): "up" | "dn" {
  return rounded(x, d) < 0 ? "dn" : "up";
}

/** Mengubah teks input "1.234,56" atau "1234.56" menjadi angka. */
export function parseAngka(teks: string): number | null {
  const t = teks.trim().replace(/\s/g, "").replace(/^US\$/i, "");
  if (!t) return null;
  let norm = t;
  if (t.includes(",")) norm = t.replace(/\./g, "").replace(",", ".");
  else if ((t.match(/\./g) || []).length > 1) norm = t.replace(/\./g, "");
  if (!/^-?\d+(\.\d+)?$/.test(norm)) return null;
  return Number(norm);
}

/** Jumlah digit di belakang koma pada teks input (koma, atau satu titik, sebagai pemisah desimal). */
export function desimal(teks: string): number {
  const t = teks.trim();
  const sep = t.includes(",") ? "," : (t.match(/\./g) || []).length === 1 ? "." : "";
  return sep ? t.length - t.lastIndexOf(sep) - 1 : 0;
}

// ---------- tanggal ----------
const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

export function tanggal(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return `${d} ${BULAN[m - 1]} ${y}`;
}

export function tanggalPendek(iso: string): string {
  const [, m, d] = iso.slice(0, 10).split("-").map(Number);
  return `${d} ${BULAN[m - 1]}`;
}

/** "2026-11-15T07:40:00+07:00" -> "15 Nov 2026, 07.40 WIB" */
export function waktu(iso: string): string {
  const jam = iso.slice(11, 16).replace(":", ".");
  return `${tanggal(iso)}, ${jam} WIB`;
}

export function selisihHari(dari: string, sampai: string): number {
  const a = Date.UTC(+dari.slice(0, 4), +dari.slice(5, 7) - 1, +dari.slice(8, 10));
  const b = Date.UTC(+sampai.slice(0, 4), +sampai.slice(5, 7) - 1, +sampai.slice(8, 10));
  return Math.round((b - a) / 86400000);
}

export function tambahHari(iso: string, n: number): string {
  const t = new Date(Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10) + n));
  return t.toISOString().slice(0, 10);
}
