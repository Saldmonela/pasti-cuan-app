# Pasti Cuan

Dashboard buku catatan bersama porsi dana patungan LP (*unit-based shared pool ledger*). PRD: [`docs/prd/prd-dashboard-porsi-dana-lp.md`](docs/prd/prd-dashboard-porsi-dana-lp.md), konteks produk: [`PRODUCT.md`](PRODUCT.md), sistem desain: [`DESIGN.md`](DESIGN.md).

## Status & Arsitektur

- **Frontend:** Next.js App Router (`src/app/`), Layout C "Tumpuk kartu" (mobile-first, satu kolom), mode satuan USD, SOL, dan Bandingkan ($ + SOL), rentang `24J`, `7H`, `Setoran Terakhir`, dan `Semua`.
- **Mesin Hitung (`src/lib/engine.ts`):** unit & NAV berbasis `decimal.js`, penetralan arus onchain, pencocokan pada waktu transfer (`waktu_efektif` + `titik_nilai_id`), simulasi tarik & fee pengelola, dan uji golden test + skenario (`src/lib/engine.test.ts`).
- **Backend & Database (`supabase/`):** Supabase PostgreSQL + Row Level Security (RLS), trigger `log_audit` immutable, Google OAuth (`/masuk` + `/auth/callback`), Route Handlers (`/api/*`), serta Edge Function `baca-wallet` yang dijalankan berkala lewat `pg_cron` (pembacaan nilai wallet per menit dari Meteora/Solana RPC/Jupiter, snapshot otomatis jam 08.00 WIB, dan deteksi arus onchain).
- **Workflow GitHub Actions (`.github/workflows/`):** ping anti-pause harian dan backup database mingguan (memerlukan GitHub Secrets `SUPABASE_URL`, `SUPABASE_ANON_KEY`, dan `SUPABASE_DB_URL`).

## Menjalankan Secara Lokal

1. Salin `.env.example` ke `.env.local` lalu isi kunci Supabase, Helius, dan cron secret:

```bash
npm install
npm run dev
```

Buka `http://localhost:3000`. Jika `NEXT_PUBLIC_SUPABASE_URL` belum diisi (atau `NEXT_PUBLIC_PROTOTYPE_MODE=1`), aplikasi otomatis berjalan dalam mode prototype memakai data contoh `localStorage`.

```bash
npm test       # vitest run (golden test & unit test engine)
npm run lint   # eslint
npm run build  # next build
```

## Menjalankan Aplikasi Android (`android-app/`)

Proyek Native Android berada di folder `android-app/` (Kotlin + Jetpack Compose, minSdk 26 / Android 8.0+, JDK 17+). Saat ini (Milestone M2) masih memakai mode simulasi lokal dengan data contoh di dalam aplikasi, sehingga belum memerlukan `.env.local` maupun kunci Supabase.

1. Buka folder **`android-app/`** (bukan root repo) di **Android Studio**, tunggu Gradle sync selesai (`local.properties` berisi `sdk.dir` akan dibuat otomatis), lalu tekan **Run**.
2. Atau jalankan lewat terminal (pastikan `JAVA_HOME` mengarah ke JDK 17+ dan Android SDK sudah terpasang):

```bash
cd android-app
./gradlew testDebugUnitTest   # Windows: .\gradlew.bat testDebugUnitTest
./gradlew assembleDebug       # Windows: .\gradlew.bat assembleDebug
```

File `.apk` hasil build (serta `local.properties`, `*.jks`, dan `*.keystore`) diabaikan oleh `.gitignore`. Jika ingin membagikan `.apk` ke anggota lain, unggah lewat **GitHub Releases** atau kirim langsung; aturan penamaan & naik versi `.apk` mengikuti [`GEMINI.md`](GEMINI.md).

## Preview Statis (GitHub Pages)

Untuk membangun versi prototype statis ke `out/` dan mengirimkannya ke repo preview terpisah (`Saldmonela/pasti-cuan-preview`):

```bash
npm run build:preview
npm run publish:preview
```

## Struktur Utama

- `src/lib/engine.ts`: mesin hitung (BR-01 s.d. BR-24), seri grafik, penetralan live, dan validasi invarian (`cek`).
- `src/lib/server/auth.ts` & `src/lib/server/pool.ts`: autentikasi sesi Google + loader konteks pool dari Supabase.
- `src/app/api/`: Route Handlers (`posisi`, `permintaan`, `arus-onchain/tandai`, `snapshot`, `anggota`, `pengaturan`, `impor`, `audit`, `simulasi-tarik`).
- `src/app/(app)/`: halaman Beranda (`/`), Pool (`/pool`), Transaksi (`/permintaan`), Setor (`/setor`), Tarik (`/tarik`), Lainnya (`/lainnya`), Log (`/log`), serta panel Kelola (`/kelola/*`).
- `supabase/migrations/`: skema SQL, RLS, trigger audit, job ringkasan `titik_nilai`, dan jadwal `pg_cron`.
- `supabase/functions/baca-wallet/`: Edge Function pembaca saldo wallet Solana/Meteora (termasuk PDA HawkFi) & deteksi transfer onchain.
- `android-app/`: aplikasi Native Android (Kotlin + Jetpack Compose); PRD di [`docs/prd/prd-aplikasi-android-pasti-cuan.md`](docs/prd/prd-aplikasi-android-pasti-cuan.md).
