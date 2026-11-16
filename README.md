# Pasti Cuan

Dashboard porsi dana patungan LP (PRD: `prd-dashboard-porsi-dana-lp.md`). Tampilan mengikuti `DESIGN.md` (Layout C "Tumpuk kartu" + tema Wise).

**Status: prototype, mengikuti PRD v1.4 draft (15 Nov 2026).** Semua halaman di PRD Section 3.2 sudah ada dan bisa diklik, dengan mesin hitung sungguhan. Data masih data contoh di `localStorage`; belum tersambung ke Supabase, login Google, dan wallet asli.

Pembacaan wallet onchain disimulasikan di `src/lib/onchain.ts`: titik nilai per menit buatan yang dikunci ke angka uji PRD (nilai pool $1.171,81 pukul 13.03 WIB, penarikan Rezki 1 + 730,51 USDC, kirim 0,1 SOL, dust 0,001 USDC). Setoran Hafiz 150 USDC pukul 13.06 hanya contoh. Jam prototype mulai 15 Nov 2026 13.03 WIB dan ikut berjalan selama halaman terbuka.

Harga SOL, DOGE, dan PEPE memakai data asli CoinGecko per jam (`src/lib/harga-pasar.json`, diambil dengan `node scripts/fetch-harga-pasar.mjs`). Dari harga ini, saldo SOL riwayat impor dihitung ulang (US-06), dan grafik riwayat 16 Okt-14 Nov memakai titik estimasi per jam yang mengikuti harga token pasangan (BR-24). Token pasangan per periode (PEPE/SOL 16-22 Okt, lalu DOGE/SOL) diambil dari riwayat posisi di API Meteora (OQ-15). Titik nilai tiruan mulai 14 Nov 2026 08.00 WIB dan memodelkan posisi DOGE/SOL dengan porsi DOGE 80%, jadi grafik SOL tidak lurus.

## Menjalankan

```bash
npm install
npm run dev
```

Buka http://localhost:3000. Tombol **Prototype** (atas tengah di HP, kanan atas di laptop) untuk pindah akun (Salman, Rezki, Galih sebagai pengelola, dll.), memilih kondisi layar (memuat, gagal, data lama, cek gagal, offline, belum setor, nilai live lama, wallet terganggu), lompat ke 16 Nov 08.00 (snapshot otomatis) atau 08.31 (pembacaan gagal), dan mengembalikan data contoh.

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
| `/` | US-12, US-01 | Nilai live + grafik saya dengan scrub (BR-23), satuan $ / SOL / Bandingkan (BR-22), Setor/Tarik, rincian nilai, porsi, dalam SOL. Pengelola: kartu tugas |
| `/pool` | US-08, US-05 | Saldo pool = isi wallet, grafik dengan scrub dan Bandingkan, posisi anggota dengan NAV live + baris rekonsiliasi, cek data (BR-12 a-e) |
| `/setor` | US-03 | Ajukan setoran |
| `/tarik` | US-04 | Simulasi tarik langsung + konfirmasi |
| `/permintaan` | — | Status permintaan saya, batalkan |
| `/log` | US-09 | Log audit |
| `/lainnya` | — | Akun, arti istilah, keluar |
| `/kelola` | — | Tugas pengelola hari ini |
| `/kelola/arus` | US-13 | Transfer wallet yang terdeteksi: cocokkan, buat permintaan, biaya pool, bukan arus, batalkan |
| `/kelola/saldo` | US-02 | Status pembaca wallet, snapshot otomatis/manual, koreksi dengan alasan, peringatan lonjakan |
| `/kelola/permintaan` | US-03, US-04 | Konfirmasi, tandai selesai dengan isian dari transfer yang dicocokkan (BR-09, BR-10), tolak |
| `/kelola/anggota` | US-07 | Tambah (dengan alamat wallet opsional), nonaktifkan |
| `/kelola/impor` | US-06 | Unggah 2 CSV, saldo SOL dari harga pasar, 5 peringatan selisih harga, jumlah titik estimasi, simulasi CoinGecko gagal + buat ulang estimasi, impor/batal |
| `/kelola/pengaturan` | — | Fee, satuan dasar fee, ambang, pengaturan pembacaan wallet |

## Struktur

- `src/lib/engine.ts`: mesin hitung (BR-01 s.d. BR-21) dengan decimal.js: unit dan NAV, nilai live yang menetralkan arus (BR-19), seri grafik 24J/7H (BR-21). Bagian ini dipakai apa adanya di versi Supabase.
- `src/lib/onchain.ts`: valuasi wallet (BR-17), deteksi arus (BR-19), titik nilai contoh, snapshot otomatis (BR-18).
- `src/lib/engine.test.ts`: golden test Tracker_LP_v3 per 14 Nov 2026, skenario tarik, dan uji onchain dari Rencana Uji PRD v1.1.
- `src/lib/store.tsx`: pengganti sementara API + Supabase (aturan BR-08 s.d. BR-13 dan log audit).
- `src/lib/seed.ts`: data contoh. Nilai USD harian diturunkan dari angka acuan PRD oleh `scripts/derive-seed.mjs`, karena isi Excel aslinya belum ada.
- `src/lib/csv.ts`: parser template impor.
- `src/components/`: grafik (`Chart.tsx`), kartu nilai + grafik bersama Beranda/Pool (`KartuGrafik.tsx`), kerangka aplikasi, panel prototype, komponen bersama.

## Belum dikerjakan

- Supabase (tabel, RLS, trigger log), login Google, route handler API.
- Job pembaca wallet asli (Edge Function `baca-wallet` + `pg_cron`), sumber Meteora/Helius/Jupiter, dan job ringkasan titik nilai.
- Service worker PWA dan ikon PNG 192/512 px.
- Data asli: ganti `seed.ts` dengan impor CSV dari Excel pengelola (lihat OQ-10 di PRD).
