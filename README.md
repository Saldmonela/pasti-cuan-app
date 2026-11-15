# Pasti Cuan

Dashboard porsi dana patungan LP (PRD: `prd-dashboard-porsi-dana-lp.md`). Tampilan mengikuti `DESIGN.md` (Layout C "Tumpuk kartu" + tema Wise).

**Status: prototype.** Semua halaman di PRD Section 3.2 sudah ada dan bisa diklik, dengan mesin hitung sungguhan. Data masih data contoh di `localStorage`; belum tersambung ke Supabase dan login Google.

## Menjalankan

```bash
npm install
npm run dev
```

Buka http://localhost:3000. Tombol **Prototype** (atas tengah di HP, kanan atas di laptop) untuk pindah akun (Salman, Rezki, Galih sebagai pengelola, dll.), memilih kondisi layar (memuat, gagal, data lama, cek gagal, offline, belum setor), dan mengembalikan data contoh.

```bash
npm test         # golden test PRD Section 3.3
npm run build
```

## Preview untuk teman-teman

Preview online: https://saldmonela.github.io/pasti-cuan-preview/

Repo `Saldmonela/pasti-cuan-preview` hanya berisi hasil build statis (folder `out/`), bukan kode sumber. Setelah mengubah prototype, perbarui preview dengan:

```bash
npm run publish:preview
```

Skrip ini membangun versi statis (`output: "export"` dengan `basePath` = nama repo, tanpa Cache Components karena static export tidak mendukung PPR), lalu force-push isi `out/` ke repo preview. Butuh GitHub CLI yang sudah login. Data tiap orang tersimpan di browser masing-masing, jadi teman-teman bisa mencoba setor/tarik/kelola tanpa saling mengganggu.

## Isi

| Route | Story | Isi |
|---|---|---|
| `/masuk` | US-07 | Masuk dengan Google (tiruan), email belum terdaftar |
| `/` | US-12, US-01 | Nilai + grafik saya, Setor/Tarik, rincian nilai, porsi, dalam SOL. Pengelola: kartu tugas |
| `/pool` | US-08, US-05 | Grafik saldo pool USD/SOL, posisi semua anggota, cek data (BR-12) |
| `/setor` | US-03 | Ajukan setoran |
| `/tarik` | US-04 | Simulasi tarik langsung + konfirmasi |
| `/permintaan` | — | Status permintaan saya, batalkan |
| `/log` | US-09 | Log audit |
| `/lainnya` | — | Akun, arti istilah, keluar |
| `/kelola` | — | Tugas pengelola hari ini |
| `/kelola/saldo` | US-02 | Catat/ubah/hapus saldo harian, peringatan lonjakan |
| `/kelola/permintaan` | US-03, US-04 | Konfirmasi, tandai selesai (BR-09, BR-10), tolak |
| `/kelola/anggota` | US-07 | Tambah, nonaktifkan |
| `/kelola/impor` | US-06 | Unggah 2 CSV, pratinjau, peringatan harga SOL, impor/batal |
| `/kelola/pengaturan` | — | Fee, satuan dasar fee, ambang |

## Struktur

- `src/lib/engine.ts`: mesin hitung (BR-01 s.d. BR-16) dengan decimal.js. Bagian ini dipakai apa adanya di versi Supabase.
- `src/lib/engine.test.ts`: golden test Tracker_LP_v3 per 14 Nov 2026 dan skenario tarik.
- `src/lib/store.tsx`: pengganti sementara API + Supabase (aturan BR-08 s.d. BR-13 dan log audit).
- `src/lib/seed.ts`: data contoh. Nilai USD harian diturunkan dari angka acuan PRD oleh `scripts/derive-seed.mjs`, karena isi Excel aslinya belum ada.
- `src/lib/csv.ts`: parser template impor.
- `src/components/`: grafik, kerangka aplikasi, panel prototype, komponen bersama.

## Belum dikerjakan

- Supabase (tabel, RLS, trigger log), login Google, route handler API.
- Service worker PWA dan ikon PNG 192/512 px.
- Data asli: ganti `seed.ts` dengan impor CSV dari Excel pengelola (lihat OQ-10 di PRD).
