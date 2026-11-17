# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Investor aktif dan pasif (5 orang awal: Salman, Faiz, Luqman, Hafiz, dan eks-anggota Rezki):** teman yang patungan modal di satu wallet Solana bersama. Membuka aplikasi dari HP untuk mengecek nilai bersih pribadi (USD dan SOL), porsi %, untung/rugi sejak bergabung atau sejak setoran terakhir, lama dana ikut, dan simulasi penarikan tanpa perlu bertanya ke pengelola atau membaca Excel.
- **Pengelola (Galih):** pengelola strategi LP Meteora DLMM di wallet pool dan eksekutor transfer dana. Membuka aplikasi untuk mencocokkan arus transfer onchain dengan permintaan setor/tarik, memproses permintaan anggota, dan mengoreksi snapshot harian bila diperlukan.

## Product Purpose

Pasti Cuan adalah buku catatan porsi dana patungan (*unit-based shared pool ledger*) bersifat baca-saja (*read-only*) terhadap wallet Solana milik bersama. Produk ini menyelesaikan selisih pencatatan manual Excel (`Tracker_LP_v3.xlsx` vs `Laporan Harian.xlsx`), menyepakati satu sumber angka untuk seluruh anggota dalam USD dan SOL, serta memastikan setiap anggota baru atau penarikan di tengah jalan tidak merusak pembagian profit anggota lain.

Keberhasilan terukur ketika seluruh anggota dapat membuka aplikasi dari HP, membaca angka posisi masing-masing secara mandiri, dan seluruh penarikan diproses tanpa selisih perhitungan.

## Positioning

- **Satu sumber kebenaran di atas satu wallet bersama:** berbeda dari portfolio tracker umum (seperti Jupiter) yang hanya menampilkan total isi wallet tanpa tahu kepemilikan per orang, dan berbeda dari Excel statis yang terpecah versi dan sulit dibaca di HP.
- **Skema khusus 1 pool internal:** dirancang khusus untuk kelompok patungan *Pasti Cuan*, bukan platform SaaS multi-pool untuk publik.
- **Non-kustodial:** aplikasi hanya membaca alamat publik wallet Solana dan tidak pernah menyimpan private key, seed phrase, ataupun menandatangani transaksi.

## Operating Context

- **Wallet sumber:** satu alamat publik Solana (`By6HpsukcTeVsV6FyBzhQJ2nzdHP46kXaSPtrCGUzoaR`), diputar di posisi Meteora DLMM berpasangan SOL (sebelumnya PEPE/SOL, kini DOGE/SOL).
- **Siklus pencatatan:** pembacaan nilai wallet otomatis berjalan tiap 1 menit sebagai nilai live, deteksi transfer onchain berjalan berkala untuk mencocokkan arus masuk/keluar, dan snapshot resmi dicatat otomatis setiap pukul 08.00 WIB.
- **Perangkat utama:** diakses di layar HP (mobile-first, satu kolom) lewat autentikasi Google, dengan data historis resmi dimulai sejak 16 Oktober 2026.

## Capabilities and Constraints

- **Lingkup tetap internal 1 pool:** tidak ada fitur pendaftaran bebas untuk publik atau pembuatan pool baru oleh pengguna.
- **Sistem unit & fee pengelola (BR-01 s/d BR-24):** setiap setoran membeli unit pada NAV saat efektif, penarikan menjual unit pada nilai bersih setelah dikurangi fee 10% dari profit positif investor, dan pengelola memperoleh unit fee saat profit direalisasikan.
- **Transaksi onchain dinilai pada waktu transfer:** setoran/penarikan yang terdeteksi di wallet dicocokkan ke titik nilai terdekat pada waktu transfer agar tidak mendistorsi untung/rugi.
- **Grafik adaptif per riwayat setor:** rentang standar adalah `24J`, `7H`, dan `Semua`; rentang `Setoran Terakhir` hanya ditampilkan untuk pihak yang memiliki lebih dari 1 setoran selesai (karena untuk 1x setoran hasilnya sama dengan `Semua`).
- **Invarian data wajib lolos:** jika unit negatif, penarikan melebihi nilai bersih, selisih total anggota vs saldo pool, atau ada transfer sebelum snapshot terakhir yang belum dicatat pengelola, aplikasi menandai data sedang dicek ulang dan menahan pengajuan penarikan baru.
- **Bukan pemegang dana:** semua transfer tetap dieksekusi manual oleh pengelola di luar aplikasi.

## Brand Commitments

- **Nama produk:** Pasti Cuan.
- **Bahasa & nada:** Bahasa Indonesia santai-rapi yang lugas, tenang, dan transparan ("Buku catatan bersama"), memakai format angka Indonesia (`US$1.234,56` dua desimal dan `10,8461 SOL` empat desimal).
- **Dokumentasi visual:** sistem visual yang sudah berjalan terdokumentasi terpisah di [DESIGN.md](DESIGN.md).

## Evidence on Hand

- Rekonstruksi riwayat onchain penuh (16 Okt – 16 Nov 2026) dari 2.549 transaksi Helius pada wallet pool (checkpoint penutupan posisi Meteora, transfer masuk Binance, dan penarikan penuh Rezki 731,51 USDC) dipadukan harga historis SOL/DOGE/PEPE CoinGecko, plus pembacaan wallet otomatis tiap menit sejak 17 Nov 2026 pukul 02.40 WIB.
- File Excel historis awal (`Tracker_LP_v3.xlsx` dan `Laporan Harian.xlsx`) serta PRD (`docs/prd/prd-dashboard-porsi-dana-lp.md`) tetap tersimpan sebagai rujukan awal, dengan catatan bahwa titik per jam sebelum 17 Nov 2026 di antara penutupan posisi tetap diberi penanda "estimasi per jam" di antarmuka.

## Product Principles

1. **Satu sumber angka untuk semua orang:** semua anggota dan pengelola melihat unit, NAV, dan aturan fee yang sama agar tidak ada selisih tafsir saat setor maupun tarik dana.
2. **Transparan atas asal angka dan keterbatasannya:** nilai bersih selalu dapat ditelusuri ke modal dasar, untung/rugi, dan fee; data estimasi maupun data lama diberi keterangan jujur.
3. **Tenang dan fokus jawaban:** setiap layar menjawab pertanyaan inti investor dalam hitungan detik di HP tanpa pengaturan atau kontrol yang tidak perlu.
4. **Penjagaan akuntansi lebih penting daripada kelonggaran input:** pelanggaran invarian saldo langsung memperingatkan seluruh anggota dan menahan penarikan sampai pengelola membereskannya.
