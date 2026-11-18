# PRD: Aplikasi Native Android Internal — Pasti Cuan (Dashboard Porsi Dana LP)

| Field | Isi |
|---|---|
| **Tipe PRD** | Full |
| **Pemilik PRD** | Salman |
| **Tanggal** | 18 November 2026 |
| **Versi & Status** | **v1.1 — Approved (Disetujui pada 18 Nov 2026; Selaras Penuh Monorepo `pasti-cuan-app`)** |
| **Lokasi Proyek** | Monorepo `s:\Projek Iseng\pasti-cuan-app` (Web & Backend di `src/` & `supabase/`; Native Android di `android-app/`) |
| **Dokumen & Kode Acuan** | [PRODUCT.md](../../PRODUCT.md), [DESIGN.md](../../DESIGN.md), [globals.css](../../src/app/globals.css), [engine.ts](../../src/lib/engine.ts), [store.tsx](../../src/lib/store.tsx), migrasi `202611170001_initial_schema.sql` (commit `3afa0d0`, 18 Nov 2026), & [PRD Web](prd-dashboard-porsi-dana-lp.md) |
| **Sumber Data Historis** | Rekonstruksi penuh `2.549` transaksi dompet publik (`16 Okt – 16 Nov 2026`) dipadukan harga pasar per jam, serta arsip pembanding `Tracker_LP_v3.xlsx` & `Laporan Harian.xlsx` |
| **Sumber Data Berjalan** | Alamat publik dompet *"Pasti Cuan"* (`By6HpsukcTeVsV6FyBzhQJ2nzdHP46kXaSPtrCGUzoaR`), dibaca otomatis tiap 1 menit sejak `17 Nov 2026 02.40 WIB` |

---

# Section 1: Why & Who

## 1.1 Masalah & Konteks

### Kondisi Sekarang (As-Is)
- **Komposisi peserta terkini:** Kelompok patungan terdiri dari 6 akun anggota terdaftar, yakni **4 investor aktif** saat ini (**Salman, Faiz, Luqman, Hafiz**), **1 eks-anggota** yang telah menarik penuh dananya pada `15 Nov 2026` (**Rezki**, saldo unit saat ini `0` namun riwayatnya tetap tercatat), serta **1 pengelola** (**Galih**). Seluruh 6 orang (`100%`) sehari-hari menggunakan ponsel **Android** (tidak ada pengguna iPhone).
- **Latar masalah pencatatan awal:** Dana dikumpulkan dalam satu dompet kripto bersama (*"Pasti Cuan"*) sejak `16 Okt 2026` pada posisi likuiditas berpasangan SOL (`PEPE/SOL`, lalu `DOGE/SOL`). Sebelum sistem bersama dibangun, pelacak portofolio umum hanya menampilkan total isi satu dompet tanpa porsi per orang, sementara dua berkas spreadsheet pengelola berselisih angka pada `14 Nov 2026`:

| Nama | Tracker_LP_v3 | Laporan Harian | Selisih |
|---|---|---|---|
| Faiz | US$155,71 | US$152,36 | US$3,35 |
| Luqman | US$155,71 | US$152,36 | US$3,35 |
| Rezki | US$827,45 | US$809,76 | US$17,69 |
| Salman | US$813,74 | US$794,54 | US$19,20 |
| Hafiz | US$97,38 | US$94,57 | US$2,81 |
| Fee Galih (pengelola) | US$26,54 | US$60,79 | US$34,25 |
| **Total Pool** | **US$2.076,53** | **US$2.064,38** | **US$12,15** |

- **Kondisi sistem web yang sudah berjalan saat ini (per 18 Nov 2026):**
  - Sistem buku catatan berbasis web sebenarnya **sudah berjalan aktif** dengan pembacaan nilai dompet otomatis tiap 1 menit, rekonstruksi riwayat transaksi penuh sejak `16 Okt 2026`, penilaian transaksi tepat pada waktu transfer, serta sistem tampilan *"Tumpukan Kartu Jawaban"* lengkap dengan mode gelap *Wise Forest Obsidian* dan efek *Liquid Glass*.
  - **Masalah yang masih tersisa pada bentuk web di HP:** Anggota tetap harus mengaksesnya lewat peramban ponsel atau pintasan web yang bergantung pada perilaku peramban masing-masing perangkat. Interaksi geser grafik rapat, respons sentuh kapsul navigasi, konsistensi tampilan kaca di HP kelas menengah, serta ketersediaan cadangan data instan saat tanpa sinyal belum sepraktis dan semulus aplikasi **Native Android** asli yang terpasang langsung di ponsel.

### Kondisi yang Diinginkan (To-Be)
- **Aplikasi Native Android internal yang terpasang langsung di HP tiap anggota (`v1.0`):** Dibagikan khusus internal untuk grup (tanpa dipublikasikan ke Play Store), berada dalam satu repositori bersama sistem web, memiliki **keselarasan tampilan 1:1** dengan identitas visual yang sudah disepakati grup, dan terhubung ke **satu sumber data berjalan yang sama**. Sekali ketuk ikon **Pasti Cuan** di layar utama HP Android, anggota langsung mendapatkan:
  1. Tumpukan kartu jawaban yang identik jernihnya dengan versi produksi (nilai bersih saat ini beserta grafik interaktif rentang `24J`, `7H`, `Setoran Terakhir` bila sudah setor lebih dari sekali, dan `Semua`; rincian asal nilai; porsi pool; serta posisi dalam SOL);
  2. Pengalaman sentuh, geser grafik (*scrub*), transisi pegas kapsul navigasi *Liquid Glass* (bening kristal terang di Mode Terang dan *Wise Forest Obsidian* di Mode Gelap), tanpa gangguan bilah peramban;
  3. Penilaian setoran dan penarikan yang langsung dihitung tepat pada waktu transfernya dicocokkan pengelola, lengkap dengan simulasi tarik proporsional sebelum mengajukan serta ruang kelola 5 menu penuh bagi pengelola;
  4. Kemudahan khas aplikasi native di HP pada rilis `v1.0`: cadangan data lokal instan saat sinyal hilang serta pemeriksa pembaruan versi aplikasi internal langsung dari dalam aplikasi (diikuti penguncian sidik jari HP pada `v1.1` dan pemberitahuan otomatis pada `v2.0`).
- **Tetap aman sebagai buku catatan baca-saja terhadap dompet:** Aplikasi hanya menampilkan hasil pembacaan alamat dompet publik—tidak pernah meminta kunci rahasia, tidak menyimpan dana, dan tidak mengeksekusi pengiriman aset.

### Kenapa Sekarang (Why Now?)
1. **Fondasi perhitungan & data otomatis sudah matang dan teruji:** Seluruh aturan unit, rekonstruksi riwayat sejak `16 Okt 2026` (termasuk penyelesaian penarikan penuh Rezki `731,51 USDC` pada `15 Nov 2026`), serta pembacaan otomatis tiap menit sejak `17 Nov 2026` sudah berjalan stabil—sehingga pembangunan aplikasi Native Android tidak lagi meraba-raba aturan bisnis dari nol.
2. **Sistem desain visual baru saja dikunci penuh (`18 Nov 2026`):** Tata letak *"Tumpukan Kartu Jawaban"*, mode gelap *Wise Forest Obsidian*, material *Liquid Glass*, dan pengaturan tampilan *inline* di sistem web sudah final dan siap diterjemahkan 1:1 ke aplikasi Android dalam repositori yang sama.
3. **100% anggota menggunakan Android & lingkup internal:** Karena tidak ada satu pun anggota yang memakai iPhone dan aplikasi tidak ditujukan untuk publik Play Store, membangun aplikasi Native Android memberikan lompatan kenyamanan harian paling nyata tanpa biaya pendaftaran maupun birokrasi toko aplikasi.

### Proposisi Nilai / Kenapa Solusi Ini (Why Us?)
- **Dibanding pelacak portofolio umum:** Pelacak umum hanya tahu total isi satu dompet bersama, tidak tahu pembagian unit per orang, modal dasar, maupun potongan bagi hasil 10% pengelola.
- **Dibanding versi web di peramban HP:** Aplikasi Native Android menghilangkan ketergantungan pada peramban, memberikan respons jari disertai umpan balik getar halus (*haptic*) pada grafik dan navigasi yang konsisten di berbagai tipe HP Android anggota, langsung menampilkan angka tersimpan terakhir `< 300 ms` saat dibuka di area susah sinyal, dan memiliki pembaruan versi terkelola di satu ekosistem yang sama.

---

## 1.2 Persona & Stakeholder

### Urutan Prioritas Persona
Berdasarkan urutan **Kepemilikan Risiko (*Risk Ownership*) > Kekritisan Tugas (*JTBD Criticality*) > Otoritas Keputusan (*Decision Authority*) > Frekuensi Pakai (*Usage Frequency*)**:
1. **Primary 1 — Investor Aktif** (mis. Salman): menanggung risiko modal pribadi dan paling rutin memantau pergerakan harian dari HP.
2. **Primary 2 — Pengelola Pool** (Galih): memegang otoritas pencocokan arus transfer, konfirmasi permintaan, dan pengelolaan parameter pool, serta menjaga akurasi angka di hadapan rekan grup.
3. **Secondary — Investor Pasif / Eks-Anggota** (termasuk investor yang jarang membuka atau yang sudah menarik dana namun sewaktu-waktu masuk kembali): hanya berinteraksi saat hendak setor/tarik atau mengecek rekap akhir.

### Tabel Persona & Kebutuhan

| Peran | JTBD (Saat / Ingin / Supaya) | Internal (Pola Pikir & Beban Kognitif) | Eksternal (Dinamika Stakeholder) | Hasil (Tanggung Jawab & Risiko) |
|---|---|---|---|---|
| **Investor Aktif** *(Primary 1 — rutin memantau, mis. Salman)* | **Saat** harga pasar bergerak atau setelah melakukan setoran tambahan, **saya ingin** mengetuk aplikasi di HP dan langsung melihat nilai bersih terbaru, kinerja sejak setoran terakhir, porsi, serta selisih USD vs SOL saya, **supaya** tenang mengetahui posisi uang saya tanpa bertanya ke pengelola. | Ingin akses cepat satu tangan dengan tampilan yang sama persis dan menenangkan seperti versi web; butuh kejelasan mengapa USD turun saat jumlah SOL naik; ingin melihat kinerja khusus sejak tambahan modal terakhir. | Berbagi satu dompet bersama rekan lain; mengandalkan pencocokan transfer oleh pengelola. | Menanggung risiko untung/rugi modal pribadi; butuh angka akurat sebagai dasar keputusan tambah/tarik dana. |
| **Pengelola Pool** *(Primary 2 — Galih)* | **Saat** ada transfer masuk/keluar dompet atau permintaan anggota menunggu, **saya ingin** langsung melihat ringkasan tugas hari ini di layar teratas dan mencocokkannya satu kali pada waktu transfernya dari HP, **supaya** unit semua orang langsung terhitung tepat tanpa rekap manual. | *[Asumsi]* Tidak ingin direpotkan input saldo harian maupun hitungan pembagian manual di sela kesibukan mengelola strategi posisi likuiditas. | Dipercaya teman-teman memegang dompet utama; setiap tindakannya terlihat transparan oleh seluruh anggota. | Bertanggung jawab atas eksekusi transfer di luar aplikasi dan ketepatan pencocokan catatan; memperoleh 10% dari profit positif investor yang terealisasi. |
| **Investor Pasif & Eks-Anggota** *(Secondary)* | **Saat** ingin menarik seluruh/sebagian dana, meninjau riwayat hasil akhir setelah keluar, atau menyetor modal lagi, **saya ingin** alur setor/tarik yang memandu langkah demi langkah dengan simulasi jelas, **supaya** tidak salah kirim jaringan atau salah ekspektasi potongan fee. | Jarang membuka aplikasi; hanya peduli angka bersih yang bisa diterima dan kemudahan menyalin alamat dompet tujuan saat mau setor. | Mengikuti aturan main yang sudah disepakati grup. | Risiko salah jaringan saat transfer atau salah paham nominal bersih pencairan bila simulasi tidak transparan. |

### Pemetaan Persona ke Keputusan Produk
- **Role + JTBD → Cakupan Fitur:** Beranda menampilkan kartu khusus *"Tugas pengelola hari ini"* bagi Pengelola dan kartu nilai + grafik adaptif (`Setoran Terakhir` muncul otomatis bagi penyetor berulang) bagi Investor; halaman Setor memuat salin cepat alamat dompet pool; halaman Tarik memuat tombol alamat dompet tersimpan & simulasi instan; tab Kelola memuat pusat tugas dan 5 sub-halaman pengelolaan penuh.
- **Internal → Desain Kognitif:** Pola *"Satu Kartu = Satu Pertanyaan"* tanpa kartu bersarang, halaman fokus tanpa navigasi bawah khusus saat mengisi nominal Setor/Tarik (sementara sub-halaman lain tetap menampilkan kapsul navigasi bawah dengan tab induk menyala), serta kamus 12 *"Arti istilah"* di tab Lainnya.
- **External → Alur Kerja & Tata Kelola:** Transparansi penuh atas posisi dan daftar permintaan anggota (dilengkapi penyaring `Semua anggota | Milik saya`) untuk menjaga kepercayaan grup, diimbangi perlindungan privasi (email dan alamat dompet pribadi anggota lain tidak dibagikan ke sesama investor).
- **Result → Pengaman & Audit:** Pemeriksaan 5 syarat konsistensi otomatis setiap perubahan data (menahan pengajuan tarik baru bila ada kejanggalan) dan jejak log perubahan bersaring kategori yang tidak bisa dihapus siapa pun.

### Peta Hubungan Stakeholder (ASCII)

```text
[Faktor Eksternal: Harga Pasar & Aktivitas Dompet Publik]
                         |
                         v
[Investor Aktif] ---> [Pengelola Pool (Galih)] <--- [Investor Pasif / Eks-Anggota]
       ^                 |                |                      ^
       |    (Eksekusi transfer di luar    |                      |
       |     app & pencocokan waktu tx)   v                      |
       +------------ [Kesepakatan Grup Pasti Cuan] --------------+
```

---

## 1.3 Nilai Bisnis

### Nilai Pakai & Time-to-Value (TTV)
- **Momen aktivasi utama:** Anggota memasang aplikasi Android **Pasti Cuan**, masuk satu kali dengan akun Google terdaftarnya, dan dalam `< 10 detik` langsung melihat angka *live* pool yang sama persis dengan sistem berjalan beserta rincian porsinya tanpa konfigurasi apa pun.
- **Nilai berkelanjutan:** Akses harian dari HP menjadi instan, hemat baterai, tetap terbaca saat tanpa sinyal, selaras visual 100% dengan desain produk utama, dan menjaga satu sumber kebenaran tunggal.

### Pengemasan & Monetisasi
- **Tidak dikomersialkan (`N/A`):** Aplikasi internal tertutup khusus anggota pool *"Pasti Cuan"*. Didistribusikan langsung antar-anggota (luar Play Store) dan memanfaatkan infrastruktur tingkat gratis yang sudah berjalan dengan biaya tambahan `US$0`.

### Opportunity Cost & Switching Cost
- **Biaya jika tetap hanya mengandalkan akses peramban web (*Opportunity Cost*):** Pengalaman sentuh grafik dan efek visual bergantung pada peramban tiap HP, risiko pintasan tertutup, serta ketiadaan akses instan satu ketuk dengan cache lokal aplikasi native yang diinginkan pemilik produk.
- **Biaya pindah pengguna (*Switching Cost*):** Mendekati nol karena akun terdaftar, riwayat sejak `16 Okt 2026`, desain antarmuka, dan seluruh data berjalan langsung terbawa otomatis begitu anggota masuk di aplikasi Android (versi web juga tetap aktif sebagai cadangan darurat kapan saja).

---

## 1.4 Metrik Keberhasilan

### Arah NSM (Problem-First)
- **Masalah utama yang dikurangi:** Gesekan mengakses dan memahami posisi dana patungan pribadi secara mandiri dari ponsel Android dengan angka dan tampilan yang 100% dipercaya grup.
- **Perubahan perilaku pertama yang diharapkan:** Seluruh anggota aktif beralih membuka aplikasi Android **Pasti Cuan** secara mandiri setiap minggu untuk memantau posisi dan mensimulasikan transaksi tanpa bertanya manual ke pengelola.
- **North Star Metric (tepat 1):** **Anggota Aktif Cek Mandiri Mingguan** — jumlah anggota aktif unik (investor yang sedang memiliki dana aktif + pengelola) yang membuka layar Beranda aplikasi Android hingga data posisi berhasil dimuat minimal 1 kali dalam jendela Senin `00.00 WIB` sampai Minggu `23.59 WIB`.
- **Alasan bukan *vanity metric*:** Dikawal langsung oleh *Counter Metric* **Koreksi Data Bulanan**; tingginya frekuensi buka aplikasi tidak bernilai apabila angka yang ditampilkan harus direvisi belakangan akibat kesalahan hitung atau ketidaksinkronan dengan sistem utama.

### Kontrak Metrik Wajib

| Tipe | Metrik | Definisi & Rumus Eksak | Penyebut | Jendela Baseline | Target | Owner |
|---|---|---|---|---|---|---|
| **NSM (Wajib)** | Anggota Aktif Cek Mandiri Mingguan | Jumlah anggota aktif unik yang membuka aplikasi Android dan berhasil memuat posisi pribadi di Beranda minimal 1 kali selama Senin `00.00 WIB` – Minggu `23.59 WIB` (tercatat otomatis per minggu kalender di sistem) | Seluruh anggota aktif bermodal + pengelola (saat ini `5 orang`: Salman, Faiz, Luqman, Hafiz, Galih; menyesuaikan otomatis bila eks-anggota setor kembali) | Sejak peluncuran pembacaan live (`17 Nov 2026`) s.d. tanggal rilis Android `v1.0` | `100%` anggota aktif (`5/5` saat ini) cek mandiri tiap minggu dalam `4 minggu` berturut-turut setelah rilis `v1.0` (disetujui `OQ-09`) | Salman |

### Metrik Opsional (Pendukung Keputusan)

| Tipe | Metrik | Definisi & Rumus Eksak | Penyebut | Jendela Pengamatan | Target / Batas Aman | Owner |
|---|---|---|---|---|---|---|
| **Leading** | Adopsi Pemasangan Aplikasi Android | Jumlah anggota aktif yang telah memasang aplikasi Android rilis `v1.0` dan berhasil masuk akun minimal 1 kali | Seluruh anggota aktif (`5 orang` saat ini, opsional `6` termasuk eks-anggota) | `7 hari` pertama sejak paket rilis `v1.0` dibagikan di grup | `100%` anggota aktif (`5/5`) dalam `7 hari` | Salman |
| **Counter** | Koreksi Data Bulanan | Jumlah perubahan/revisi pada snapshot resmi atau transaksi berstatus `Selesai` yang menggeser nilai bersih minimal 1 anggota sebesar `US$0,01` atau lebih pada log perubahan | Seluruh snapshot & transaksi selesai dalam `1 bulan kalender` | Pra-sistem terdapat selisih manual s.d. `US$19,20` | Maksimal `1 koreksi` per bulan kalender (disetujui `OQ-04`) | Galih |

### Validasi Hipotesis

| Field | Isi |
|---|---|
| **Hipotesis** | Jika anggota pool mendapatkan aplikasi Native Android internal yang berparitas visual & fungsional 1:1 dengan sistem produksi berjalan (grafik responsif, material *Liquid Glass* & tema *Wise Forest Obsidian*, simulasi tarik instan, pencocokan waktu transfer, dan cadangan offline lokal), maka `100%` anggota aktif (`5/5`) akan memantau posisi dan mengajukan transaksi secara mandiri lewat aplikasi setiap minggu dengan selisih hitung `US$0,00`. |
| **Termasuk (*In Scope* `v1.0`)** | Proyek Native Android di dalam monorepo `pasti-cuan-app/android-app` (distribusi luar Play Store); paritas penuh 1:1 dengan seluruh kapabilitas dan desain produksi saat ini (pembacaan 1 menit, penilaian transaksi tepat di waktu transfer, rentang adaptif `Setoran Terakhir`, mode `Bandingkan` bersumbu persen kanan, halaman fokus Setor/Tarik, tab Transaksi ber-cakupan `Semua anggota \| Milik saya` & 3 tab status, halaman Log perubahan bersaring kategori, panel Kelola beserta 5 sub-halaman lengkap termasuk `Pengaturan pool`, tema Gelap *Wise Forest Obsidian*, dan *Liquid Glass* bening terang di Mode Terang); ditambah cadangan lokal offline instan, pencatatan kunjungan mingguan otomatis, serta pemeriksa pembaruan `.apk` internal dari penyimpanan proyek. |
| **Tidak Termasuk (*Out of Scope* `v1.0`)** | Layar Impor CSV riwayat awal; kunci privasi biometrik/PIN HP (dijadwalkan di `v1.1`); pemberitahuan *push* & ekspor CSV lembar berbagi (dijadwalkan di `v2.0`); publikasi Google Play Store; aplikasi iOS/iPhone; pengubahan email akun anggota yang sudah tertaut; eksekusi pengiriman dana atau penyimpanan kunci rahasia dompet; pencocokan transfer tanpa konfirmasi pengelola; multi-pool; saran investasi & pajak. |
| **Sinyal Berhasil** | `5/5` anggota aktif memasang aplikasi dalam `7 hari`, `5/5` cek mandiri tiap minggu selama `4 minggu` pasca-rilis `v1.0`, serta hasil angka di aplikasi Android `100%` identik dengan mesin hitung utama (`selisih US$0,00`) dan `<= 1` koreksi data/bulan. |
| **Sinyal Gagal** | `< 5/5` anggota aktif membuka aplikasi secara mandiri per minggu setelah `4 minggu`, anggota kembali bertanya manual ke pengelola karena bingung membaca tampilan, atau ditemukan selisih perhitungan `>= US$0,01` antara aplikasi Android dan sistem utama. |

---

# Section 2: What & If

## Glosarium

| Istilah | Arti di Aplikasi Ini | Ditampilkan di Kartu "Arti istilah" (`Lainnya`)? |
|---|---|---|
| **Pool** | Seluruh dana patungan di wallet *"Pasti Cuan"*. | Ya (1/12) |
| **Snapshot** | Rekap resmi saldo pool tiap jam `08.00 WIB` yang dicatat otomatis (atau diisi/dikoreksi pengelola). Maksimal 1 per tanggal. | Ya (2/12) |
| **Nilai live** | Nilai pool terbaru, dibaca dari wallet tiap menit. Transfer yang belum dicocokkan dinetralkan dulu. Bersifat perkiraan. | Ya (3/12) |
| **Arus onchain** | Transfer masuk atau keluar wallet pool. Pengelola mencocokkannya dengan setoran atau penarikan pada waktu transfer. | Ya (4/12) |
| **Unit** | Satuan kepemilikan pool. Setoran membeli unit, penarikan menjual unit. | Ya (5/12) |
| **NAV** | Harga 1 unit pada suatu waktu, dalam USD dan SOL. | Ya (6/12) |
| **Modal dasar** | Total uang yang sudah kamu setor dikurangi bagian modal yang sudah ditarik. | Ya (7/12) |
| **Nilai kotor** | Unit kamu dikali NAV, sebelum dipotong fee. | Ya (8/12) |
| **Fee terutang** | 10% dari untung kamu, hanya kalau untung. Belum dibayar sampai ada penarikan. | Ya (9/12) |
| **Nilai bersih** | Nilai kotor dikurangi fee terutang. Ini jumlah maksimal yang bisa kamu tarik. | Ya (10/12) |
| **Porsi** | Unit milikmu dibagi total unit pool. | Ya (11/12) |
| **Permintaan** | Pengajuan setor atau tarik dari investor, diproses pengelola. | Ya (12/12) |
| **Titik Nilai** | Hasil pembacaan otomatis isi dompet publik tiap 1 menit (`BR-17`) untuk nilai *live*, grafik, dan acuan harga unit pada waktu transfer (`BR-18`). | Istilah sistem internal |
| **Titik Estimasi** | Titik nilai per jam sebelum `17 Nov 2026` hasil rekonstruksi riwayat dompet & harga pasar per jam (`BR-24`), khusus untuk grafik. | Istilah sistem internal |
| **Isi Wallet** | Nilai titik pembacaan terakhir apa adanya (sama dengan angka di pelacak dompet publik), tampil sebagai angka besar saldo Pool (`US-08`). | Dijelaskan di ikon info Pool |
| **Paket Rilis Internal** | Berkas instalasi `.apk` resmi aplikasi Android yang disimpan privat dan diunduh langsung dari dalam aplikasi (`US-14`). | Istilah distribusi internal |

---

## 2.1 User Story Inti

```text
Sebagai anggota pool (investor maupun pengelola) yang menggunakan ponsel Android,
saya ingin membuka aplikasi native Pasti Cuan langsung dari layar utama HP dengan tampilan yang 100% selaras versi web untuk memantau nilai bersih live, menelusuri grafik kinerja (termasuk sejak setoran terakhir), serta mengajukan atau mencocokkan transaksi tepat pada waktu transfernya,
supaya seluruh anggota membaca satu sumber angka yang sama persis, nyaman digunakan satu tangan, tetap terbaca saat susah sinyal, dan bebas selisih hitung.
Karena jika tidak, anggota tetap bergantung pada akses peramban ponsel yang kurang praktis untuk pemantauan harian dan rawan kebingungan bila tampilan antar-platform berbeda.
```

---

## 2.2 MoSCoW User Stories & Acceptance Criteria

### Must Have — P0

#### [US-12] Lihat Nilai Bersih Teratas & Grafik Interaktif Adaptif di Beranda (Kartu 1)
- **Sebagai** investor, **saya ingin** langsung melihat nilai bersih saya paling besar beserta grafik pergerakannya (termasuk kinerja khusus sejak setoran terakhir saya bila saya sudah setor lebih dari sekali) di bagian paling atas Beranda, **supaya** dalam sekejap saya tahu perkembangan uang saya. **Karena jika tidak**, saya harus menghitung manual pengaruh setoran tambahan saya terhadap grafik keseluruhan.
- **Acceptance Criteria:**
  - [ ] **AC-12-01 (Happy Path):** Given saya sudah masuk akun dan pernah memiliki minimal 1 setoran berstatus `Selesai`, when saya membuka tab **Beranda**, then di bawah header sapaan `"Halo, [Nama]"` (dan di bawah kartu `"Tugas pengelola hari ini"` khusus bila peran saya Pengelola) tampil **Kartu 1** yang memuat berurutan:
    1. Label `"Nilai kamu"` di kiri atas dan **Kontrol Satuan 3 ikon vektor garis tipis (`stroke 2dp`)** di kanan atas: ikon dolar (`USD`), ikon logo resmi Solana 3 jajar genjang (`SOL`), serta gabungan ikon dolar + logo Solana (`Bandingkan`), masing-masing berbidang sentuh minimal **`44x44dp`** dengan label aksesibilitas (`"Tampilkan dalam USD"`, `"Tampilkan dalam SOL"`, `"Bandingkan USD dan SOL"`).
    2. Angka nilai bersih pada satuan aktif sebagai satu-satunya teks `Display` (`40sp` tebal `800`) terbesar di layar (atau dua angka berdampingan `26sp` `USD` & `SOL` masing-masing dengan persennya saat mode `Bandingkan`, `BR-22`).
    3. Baris untung/rugi pada rentang aktif beserta persentase (`BR-16`, memisahkan warna nominal vs persen bila berbeda arah tanda) dan baris waktu `"Nilai live [jam] WIB"` (atau `"Data per [tanggal], 08.00 WIB"`), diikuti deretan *chip* transaksi berlatar basuhan hutan (`forest-wash`) saat titik grafik disentuh.
    4. Grafik garis interaktif (`2dp` hijau hutan dengan arsiran gradasi `16% → 0%`) disertai lingkaran penanda pada waktu transaksi saya (`BR-21`, `BR-22`, `BR-23`). Pada mode `Bandingkan`, arsiran dimatikan, tampil garis datar `0%`, label sumbu persen di sisi kanan grafik, garis penuh untuk `USD` & garis putus-putus untuk `SOL`, titik bulat di kedua ujung garis, serta legenda `"USD · SOL · persen untung/rugi sejak awal rentang"` dengan contoh garis penuh vs putus-putus.
    5. **Kontrol Rentang Adaptif** di bawah grafik: menampilkan `24J | 7H | Setoran Terakhir | Semua` (default `24J`) apabila saya memiliki **`> 1` setoran berstatus `Selesai`**, atau `24J | 7H | Semua` apabila baru `1 kali` setor.
    6. Dua tombol aksi sebaris `Setor` (utama hijau limau berikon tambah) dan `Tarik` (tonal basuhan hutan berikon panah kanan-atas) di bawah kontrol rentang, diikuti baris status ber-chip kuning `Menunggu` bila ada permintaan saya yang sedang diproses pengelola (`"[Setoran/Penarikan US$X] sedang diproses pengelola."` menuju tab **Transaksi**).
    - **Definisi Field:**
      - `mode_satuan`: enum (`USD`, `SOL`, `Bandingkan`), wajib, default=`USD` (tersimpan di perangkat & dipakai bersama tab Pool).
      - `rentang_aktif`: enum (`24J`, `7H`, `Setoran Terakhir`, `Semua`), wajib, default=`24J`.
      - `nilai_bersih_usd`: desimal (2 digit), wajib, `>= 0`, contoh=`US$813,74`.
      - `nilai_bersih_sol`: desimal (4 digit), wajib, `>= 0`, contoh=`10,7528 SOL`.
      - `titik_grafik[]`: daftar `{waktu_ms, nilai_usd, nilai_sol, persen_usd, persen_sol, estimasi (bool), transaksi_saya[] {jenis, jumlah_usd}}`, `2..366` titik.
    - **Verifikasi:** Masuk dengan akun yang memiliki `>= 2` setoran selesai (Salman); pastikan rentang menampilkan 4 opsi termasuk `Setoran Terakhir` dan ke-3 tombol satuan memakai ikon vektor asli berukuran sentuh `>= 44x44dp`. Masuk sebagai Hafiz (`1x` setor); pastikan hanya tampil 3 opsi (`24J | 7H | Semua`). Geser jari horizontal di grafik (*scrub*) dan pastikan angka utama, persen, waktu, serta chip `"Setoran US$..."` mengikuti titik lalu kembali ke nilai *live* saat jari dilepas.
  - [ ] **AC-12-02 (Reverse Flow):** Given saya sedang menggeser jari di grafik atau mengganti mode satuan/rentang, when saya melepas jari atau memilih kembali opsi sebelumnya, then tampilan kembali ke nilai *live* atau opsi semula secara instan tanpa memuat ulang layar (`BR-23`).
    - **Definisi Field:** `indeks_titik_aktif` (integer opsional, kembali kosong saat sentuhan dilepas).
    - **Verifikasi:** Geser jari pada grafik lalu angkat jari; pastikan waktu kembali ke `"Nilai live [jam] WIB"`.
  - [ ] **AC-12-03 (Error Handling & Edge Cases):** Given kondisi batas data atau koneksi berikut, when saya membuka Beranda, then sistem menampilkan perilaku yang tepat:
    - *Belum punya setoran terkonfirmasi (`unit = 0` & belum pernah setor):* Angka tampil `US$0,00`, grafik disembunyikan, muncul pesan `"Kamu belum punya setoran yang terkonfirmasi. Ajukan setoran pertama kamu."` dan satu tombol penuh `Setor`.
    - *Sudah menarik seluruh dana (`unit = 0` namun pernah setor, contoh eks-anggota Rezki):* Kartu grafik tetap tampil (`US$0,00`), dan di bawah tombol `Setor`/`Tarik` muncul keterangan `"Seluruh dana kamu sudah ditarik. Buka rentang Semua untuk melihat total riwayat untung/rugi, atau ajukan Setor untuk masuk lagi."`
    - *Data belum cukup untuk menggambar garis:* Kotak kosong berlatar `field` menampilkan `"Grafik 24 jam muncul setelah ada data 10 menit."` (`< 2` titik pada `24J`) atau `"Grafik muncul setelah ada data 2 hari."` (`< 2` snapshot pada rentang lain).
    - *Grafik gagal dimuat sementara posisi berhasil:* Angka utama tetap tampil; area grafik menampilkan `"Grafik belum bisa dimuat. Coba lagi."` + tombol `Coba lagi`.
    - *Perangkat offline:* Menampilkan angka & grafik terakhir dari simpanan lokal HP dengan banner gelap `"Kamu sedang offline. Data terakhir [waktu]."` dan menonaktifkan tombol `Setor` & `Tarik`.
    - *Mode simulasi lokal aktif (`BR-25`):* Menampilkan pil penanda ringkas bergaris putus-putus di tepi atas layar untuk berganti akun/peran uji tanpa mendistorsi kartu utama.
    - **Definisi Field:** `punya_setoran` (boolean), `unit_aktif` (desimal `>= 0`), `offline` (boolean).
    - **Verifikasi:** Uji profil eks-anggota Rezki; pastikan keterangan dana sudah ditarik tampil dan rentang `Semua` tetap menampilkan kurva riwayatnya.
  - **State Layar:** `loading` (3 kerangka kartu statis warna `skeleton` tanpa kedip), `empty` (belum pernah setor), `error` (kartu gagal muat `"Data belum bisa dimuat."` + `Coba lagi`), `success` (kartu grafik utuh), `partial` (angka tampil, area grafik gagal + `Coba lagi`), `no-permission` (diarahkan ke layar Masuk).

---

#### [US-01] Lihat Rincian Nilai, Porsi Pool, Posisi SOL, & Kartu Tugas Pengelola di Beranda
- **Sebagai** anggota pool, **saya ingin** membaca rincian asal nilai bersih saya, perbandingan porsi di pool, dan posisi SOL pada kartu-kartu terpisah di bawah grafik (serta ringkasan tugas harian khusus bila saya Pengelola), **supaya** setiap pertanyaan terjawab tuntas dalam sekali gulir layar. **Karena jika tidak**, asal potongan fee atau antrean tugas pengelola tersembunyi di menu dalam.
- **Acceptance Criteria:**
  - [ ] **AC-01-01 (Happy Path):** Given saya masuk akun dan memiliki riwayat setoran, when saya melihat layar **Beranda**, then tampil komponen berikut sesuai aturan `BR-02`, `BR-04`, `BR-05`, `BR-14`, `BR-19`:
    1. **Header Sapaan & Stempel Waktu 2 Bagian:** Di kiri tampil `"Halo, [Nama]"` (`25sp` tebal `700`) dan tepat di bawahnya (tanpa titik warna dekoratif) tampil stempel waktu lengkap `"Nilai live per [tanggal], [jam] WIB · Snapshot resmi [tanggal], 08.00 WIB"` (atau `"Data per [tanggal], 08.00 WIB"` bila belum ada pembacaan *live* sesudah snapshot). Di kanan tampil Avatar bulat `36dp` berinisial nama yang mengarah ke tab **Lainnya**.
    2. **Kartu `"Tugas pengelola hari ini"` *(khusus bila peran = Pengelola, tampil paling atas sebelum Kartu 1)*:** Memuat tautan `"Kelola >"` di kanan atas dan 4 baris bertautan langsung ke sub-halaman terkait: `Permintaan menunggu` (`"[N] permintaan"` → `Kelola Permintaan` / `"Tidak ada"`), `Transfer belum dicocokkan` (`"[N] transfer"` → `Kelola Arus` / `"Tidak ada"`), `Snapshot [tanggal hari ini]` (`"Dibuat otomatis"` / `"Sudah dicatat"` / tautan `"Belum ada"` → `Kelola Saldo`), serta `Fee terutang dari investor` (`US$...`).
    3. **Kartu `"Dari mana nilai kamu"`:** Memuat `Modal dasar`, `Untung/rugi` + pil `ROI [+/−X,XX%]`, `Fee terutang 10%` (bertanda `−` bila `> US$0,00`), garis pemisah total `2dp` warna `ink`, `Nilai bersih` (`22sp` tebal `800`) dalam USD beserta angka SOL kecil di bawahnya, serta catatan `"Nilai bersih adalah jumlah maksimal yang bisa kamu tarik hari ini, sudah dipotong fee."`
    4. **Kartu `"Porsi kamu di pool"`:** Angka besar porsi `%` (`34sp` tebal `800`), bar porsi proporsional setinggi `12dp` untuk anggota aktif, legenda 2 kolom (`"Kamu"` ditebalkan), garis pemisah tipis, dan baris berikon kalender `"Ikut [N] hari, sejak [tanggal]"`.
    5. **Kartu `"Dalam SOL"`:** Angka untung/rugi SOL (`24sp` tebal `800`) disertai penjelasan kontekstual (`"Nilai USD turun karena harga SOL turun, tapi jumlah SOL kamu bertambah."` bila `profit_usd < 0` dan `profit_sol > 0`; selain itu `"Untung/rugi SOL = jumlah SOL kamu sekarang dikurangi SOL setara modal saat disetor."`).
    - **Definisi Field:** `modal_usd`, `profit_usd`, `roi`, `fee_usd`, `net_usd`, `net_sol`, `porsi`, `lama_ikut_hari`, `tanggal_mulai`, `profit_sol` (seluruhnya angka desimal berformat Indonesia `BR-14`).
    - **Verifikasi:** Masuk sebagai Pengelola (Galih) dan pastikan kartu `"Tugas pengelola hari ini"` muncul paling atas dan tiap barisnya membuka sub-halaman Kelola yang tepat; masuk sebagai Investor (Salman) dan pastikan ke-3 kartu rincian tampil akurat beserta stempel waktu 2 bagian.
  - [ ] **AC-01-02 (Reverse Flow):** `N/A (Seluruh kartu rincian pada Beranda bersifat hanya-baca).`
  - [ ] **AC-01-03 (Error Handling):** Given terjadi kondisi offline, gagal pemeriksaan invarian (`BR-12`), snapshot tertinggal (`BR-15`), atau nilai *live* tertinggal (`BR-20`), when layar ditampilkan, then strip banner status muncul berurutan di bawah header tanpa tombol tutup manual sampai kondisinya selesai:
    - *Offline:* Banner gelap `"Kamu sedang offline. Data terakhir [waktu]."`
    - *Cek data gagal (`BR-12`):* Banner kuning menampilkan kalimat penyebab bila ada transfer dompet sebelum snapshot terakhir yang belum dicatat, atau `"Angka sedang dicek ulang oleh pengelola. Jangan ajukan penarikan dulu."`
    - *Nilai live tertinggal `> 15 menit` / `> 60 menit` (`BR-20`):* Bagian pertama stempel waktu berganti warna peringatan `"Nilai terakhir diperbarui [jam] WIB"`, dan pada `> 60 menit` muncul banner kuning `"Pembacaan wallet sedang terganggu. Angka mungkin tertinggal."`
    - *Data lama (`BR-15` — pembacaan otomatis & snapshot sama-sama berhenti `> 2 hari`):* Banner kuning `"Data terakhir diperbarui [N] hari lalu ([tanggal])."`
    - **Definisi Field:** `cek_lolos` (boolean), `usia_live_menit` (integer `>= 0`), `usia_data_hari` (integer `>= 0`).
    - **Verifikasi:** Uji kondisi `cek_lolos = false`; pastikan banner kuning tampil otomatis dan tidak dapat ditutup paksa.
  - **State Layar:** `loading`, `empty` (disembunyikan saat belum pernah setor), `error`, `success`, `partial` (`N/A`), `no-permission`.

---

#### [US-03A] Ajukan & Batalkan Permintaan Setor Modal (Halaman Fokus `setor` & Tab Transaksi)
- **Sebagai** investor, **saya ingin** menyalin alamat dompet tujuan pool dengan mudah lalu mengajukan catatan setoran pada halaman fokus khusus tanpa gangguan navigasi bawah, **supaya** saya tidak salah alamat kirim dan setoran saya tercatat rapi untuk dicocokkan pengelola. **Karena jika tidak**, saya bisa salah kirim jaringan atau lupa mencatat nominal transfer.
- **Acceptance Criteria:**
  - [ ] **AC-03A-01 (Happy Path):** Given saya masuk akun, perangkat online, dan saya tidak memiliki permintaan setor berstatus `Menunggu`, when saya mengetuk `Setor` (membuka halaman fokus dengan bar atas bertombol kembali bulat `44dp` **tanpa kapsul navigasi bawah**), menyalin alamat dompet Solana pool lewat tombol `Salin alamat` pada kartu `"Cara kerjanya"`, mengisi `Jumlah setoran` (`US$`), `Tanggal transfer`, serta kolom opsional `Bukti transaksi` & `Catatan`, lalu mengetuk `Ajukan setoran`, then permintaan tersimpan berstatus `Menunggu`, muncul toast `"Permintaan setoran US$[jumlah] terkirim. Pengelola akan mengonfirmasi setelah dana diterima."`, dan saya diarahkan ke tab **Transaksi** (`BR-08`).
    - **Definisi Field:**
      - `alamat_wallet_pool`: teks hanya-baca dilengkapi chip `SOL / USDC`, tombol `Salin alamat` (berubah jadi `"Tersalin"` 2 detik + toast `"Alamat wallet pool disalin."`), dan tautan eksternal `Cek di Solscan`.
      - `jumlah_usd`: desimal, wajib, `> 0`, maks. `2 angka` di belakang koma, contoh=`200,00`.
      - `tanggal_transfer`: tanggal, wajib, rentang `16 Okt 2026 .. hari_ini` (WIB), default=`hari_ini`.
      - `bukti_transaksi`: teks satu baris, opsional, maks. `100 karakter`.
      - `catatan`: teks multi-baris, opsional, maks. `200 karakter` (dengan penghitung `[N]/200 karakter`).
    - **Verifikasi:** Ketuk `Salin alamat`, tempel di papan klip dan pastikan sama persis dengan `By6HpsukcTeVsV6FyBzhQJ2nzdHP46kXaSPtrCGUzoaR`. Isi `200,00` lalu kirim; pastikan berpindah ke tab Transaksi dengan chip `Menunggu`.
  - [ ] **AC-03A-02 (Reverse Flow):** Given saya sedang berada di halaman Setor (atau memiliki permintaan setor `Menunggu` di tab Transaksi), when saya mengetuk tombol kembali bulat di kiri atas (atau mengetuk `Batalkan` pada permintaan `Menunggu` lalu menyetujui lembar konfirmasi `"Batalkan permintaan?"`), then saya kembali ke layar sebelumnya tanpa mengirim data (atau status berubah menjadi `Dibatalkan` disertai toast `"Permintaan setoran dibatalkan."` sesuai `BR-13`).
    - **Definisi Field:** `status` (`menunggu` → `dibatalkan`).
    - **Verifikasi:** Batalkan permintaan setor `Menunggu` dari tab Transaksi; pastikan chip berganti ke `Dibatalkan` dan form Setor terbuka kembali untuk pengajuan baru.
  - [ ] **AC-03A-03 (Error Handling):** Given input tidak valid, masih ada antrean `Menunggu`, percobaan ketuk ganda, atau koneksi gagal, when halaman dibuka atau form dikirim, then:
    - *Masih ada setoran `Menunggu` (`BR-08`):* Seluruh kolom form dikunci nonaktif dan tampil banner peringatan `"Kamu masih punya permintaan setoran US$[jumlah] yang menunggu. Batalkan atau tunggu yang itu selesai dulu. Lihat permintaan"`.
    - *Jumlah kosong / `<= 0`:* `"Tulis jumlah setoran lebih dari 0."`
    - *Lebih dari 2 angka desimal:* `"Jumlah USD maksimal 2 angka di belakang koma."`
    - *Tanggal kosong / masa depan / sebelum mulai pool:* `"Pilih tanggal transfer."` / `"Tanggal transfer tidak boleh di masa depan."` / `"Tanggal transfer tidak boleh sebelum 16 Okt 2026."`
    - *Ketuk ganda saat mengirim:* Tombol berubah menjadi `"Mengirim…"` dan dikunci nonaktif selama proses pengiriman.
    - **Definisi Field:** `error_per_kolom` (`jumlah`, `tgl`, `form`).
    - **Verifikasi:** Ketik `100,125` pada jumlah setoran; pastikan tertahan dengan pesan batas 2 desimal dan tepi kolom berwarna merah `loss`.
  - **State Layar:** `loading` (tombol `"Mengirim…"`), `empty` (form bersih tanggal hari ini), `error` (tepi kolom `1,5dp` merah `loss` + pesan berikon seru di bawah kolom), `success` (toast + pindah ke Transaksi), `partial` (`N/A`), `no-permission` (layar Masuk).

---

#### [US-03B] Konfirmasi atau Tolak Permintaan Setor Modal (Pengelola)
- **Sebagai** pengelola, **saya ingin** mengonfirmasi permintaan setoran baik melalui pencocokan transfer dompet tepat pada waktu transfernya maupun konfirmasi manual dengan snapshot harian di **Kelola → Permintaan**, **supaya** unit baru investor dihitung tepat sesuai waktu dana masuk. **Karena jika tidak**, investor mendapat harga unit yang meleset dari saat uangnya benar-benar masuk ke dompet.
- **Acceptance Criteria:**
  - [ ] **AC-03B-01 (Happy Path):** Given saya masuk sebagai Pengelola dan ada permintaan setor `Menunggu`, when saya memprosesnya lewat pencocokan arus dompet (`US-13`, otomatis menilai pada menit transfer terjadi) atau menekan `Konfirmasi diterima` di halaman **Kelola → Permintaan** (memilih `tanggal_efektif` ber-snapshot & `jumlah_diterima`) lalu menyetujui lembar konfirmasi `"Konfirmasi setoran [Nama]"`, then unit baru investor dihitung sebesar `jumlah_final_usd / NAV_efektif` (`BR-03`, `BR-10`, `BR-18`), status menjadi `Selesai`, muncul toast `"Setoran [Nama] US$[jumlah] selesai. Semua posisi sudah diperbarui."`, dan seluruh posisi diperbarui.
    - **Definisi Field:** `tanggal_efektif` (tanggal wajib untuk konfirmasi manual), `waktu_efektif` (otomatis terisi waktu transfer saat via pencocokan arus), `jumlah_final_usd` (desimal `> 0`, wajib, maks. 2 desimal), `bukti_transaksi` (opsional `<= 100` kar), `alasan` (wajib bila `|jumlah_final_usd - jumlah_usd| > US$0,004`, `1..200` kar).
    - **Verifikasi:** Konfirmasi setoran manual pada tanggal ber-snapshot dan konfirmasi setoran kedua lewat pencocokan arus dompet; pastikan keduanya berstatus `Selesai` dengan unit akurat.
  - [ ] **AC-03B-02 (Reverse Flow — Tolak):** Given permintaan setor berstatus `Menunggu`, when pengelola menekan `Tolak`, mengisi alasan wajib pada lembar konfirmasi `"Tolak permintaan [Nama]?"`, dan menyimpan, then status menjadi `Ditolak` tanpa menambah unit disertai toast `"Permintaan [Nama] ditolak."`
    - **Definisi Field:** `alasan` (teks wajib, `1..200 karakter`).
    - **Verifikasi:** Tolak permintaan setor dengan alasan; pastikan investor melihat `"Ditolak: [alasan]"` berwarna merah `loss` di tab Transaksi.
  - [ ] **AC-03B-03 (Error Handling):** Menolak konfirmasi manual bila `tanggal_efektif` belum memiliki snapshot (`"Belum ada saldo untuk [tanggal]. Isi saldo tanggal itu dulu."` disertai tombol pintas `Isi snapshot manual`), menolak selisih nominal tanpa alasan, menolak jumlah `<= 0` (`"Jumlah harus lebih dari 0."`), dan mencegah pemrosesan ulang bila permintaan baru saja dibatalkan investor.
    - **Definisi Field:** Sama dengan `AC-03B-01`.
    - **Verifikasi:** Coba konfirmasi manual pada tanggal kosong; pastikan tertolak sesuai `BR-10` dan tombol `Isi snapshot manual` muncul.
  - **State Layar:** `loading`, `empty` (`"Belum ada permintaan."` / `"Belum ada permintaan yang diproses."`), `error`, `success`, `partial` (`N/A`), `no-permission` (`"Halaman ini khusus pengelola."`).

---

#### [US-04A] Simulasi & Ajukan/Batalkan Permintaan Tarik Modal (Halaman Fokus `tarik`)
- **Sebagai** investor, **saya ingin** menghitung simulasi penarikan secara langsung saat mengetik nominal dan memilih alamat dompet tersimpan saya dalam satu ketuk sebelum mengajukan penarikan, **supaya** saya tahu persis potongan fee, sisa nilai bersih, serta tidak salah mengetik alamat dompet penerima. **Karena jika tidak**, salah ketik alamat Solana 44 karakter bisa berakibat fatal dan potongan fee tidak terbaca di muka.
- **Acceptance Criteria:**
  - [ ] **AC-04A-01 (Happy Path):** Given saya masuk akun, `nilai_bersih_usd > US$0,00`, tidak ada penarikan `Menunggu`, dan pemeriksaan konsistensi data lolos (`BR-12`), when saya mengetuk `Tarik` (membuka halaman fokus **tanpa kapsul navigasi bawah**), melihat kartu `"Bisa ditarik hari ini"`, mengetik nominal USD (atau mengetuk `Tarik semua`), meninjau kotak simulasi instan `"Kalau kamu tarik US$[jumlah] hari ini"` (`Unit terjual`, `Fee dibayar ke pengelola`, `Sisa modal dasar`, `Sisa porsi`, garis pemisah `2dp`, `Sisa nilai bersih`), memilih tombol cepat `"Pakai [ringkas_alamat]"` (opsional bila profil memiliki alamat tersimpan), lalu mengetuk `Ajukan penarikan` dan menyetujui lembar konfirmasi `"Tarik US$[jumlah]?"`, then permintaan tarik tersimpan berstatus `Menunggu`, muncul toast `"Permintaan tarik US$[jumlah] terkirim. Status: menunggu pengelola."`, dan layar berpindah ke tab **Transaksi** (`BR-06`, `BR-07`, `BR-08`).
    - **Definisi Field:**
      - `jumlah_usd`: desimal (maks. 2 desimal), wajib, `> 0` dan `<= nilai_bersih_usd` (toleransi `US$0,005`).
      - `alamat_wallet_tujuan`: teks alamat Solana base58 (`32..44 karakter`), opsional (input maks. `64` kar sebelum validasi).
      - `catatan`: teks multi-baris, opsional, maks. `200 karakter`.
      - *Teks bantu dinamis simulasi:* Jika sedang rugi tampil `"Kamu sedang rugi, jadi tidak ada fee yang dipotong."`; jika ada data *live* tampil `"Perkiraan dengan nilai live [jam] WIB. Angka final memakai nilai saat transfer dicocokkan."`
    - **Verifikasi:** Uji tarik `US$50,00` pada posisi untung dan pada posisi rugi Salman (`Fee US$0,00`). Ketuk salah satu tombol cepat alamat dompet tersimpan dan pastikan terisi otomatis ke kolom alamat.
  - [ ] **AC-04A-02 (Reverse Flow):** Menutup lembar konfirmasi `"Tarik US$[jumlah]?"` membatalkan pengiriman; mengetuk tombol kembali bulat kembali ke layar sebelumnya; membatalkan permintaan `Menunggu` di tab Transaksi mengubah status ke `Dibatalkan` disertai toast `"Permintaan penarikan dibatalkan."` (`BR-13`).
    - **Definisi Field:** `konfirmasi_terbuka` (boolean), `status` (`dibatalkan`).
    - **Verifikasi:** Buka lembar konfirmasi lalu ketuk `Batal`; pastikan permintaan belum terkirim.
  - [ ] **AC-04A-03 (Error Handling):** Given kondisi batas berikut, when pengguna berinteraksi di halaman Tarik, then:
    - *Cek data gagal (`BR-12`):* Form dikunci nonaktif + banner kuning `"Penarikan ditahan sementara karena angka sedang dicek ulang."`
    - *Masih ada tarik `Menunggu` (`BR-08`):* Form dikunci nonaktif + banner `"Kamu masih punya permintaan penarikan US$[jumlah] yang menunggu. Batalkan atau tunggu yang itu selesai dulu. Lihat permintaan"`.
    - *Jumlah kosong / `<= 0`:* `"Tulis jumlah penarikan lebih dari 0."`
    - *Lebih dari 2 angka desimal:* `"Jumlah USD maksimal 2 angka di belakang koma."`
    - *Jumlah `> nilai_bersih_usd`:* `"Maksimal yang bisa kamu tarik hari ini US$[nilai_bersih]."`
    - *Format alamat dompet bukan Solana base58 (`32–44` kar):* `"Alamat wallet Solana harus 32–44 karakter (huruf dan angka base58)."`
    - *Nilai bersih berubah `> US$0,004` saat lembar konfirmasi terbuka:* Lembar konfirmasi tertutup otomatis dan muncul pesan `"Angka baru saja diperbarui. Cek lagi simulasi kamu."`
    - **Definisi Field:** `nilai_bersih_saat_konfirmasi` (desimal pembanding).
    - **Verifikasi:** Masukkan alamat `"0x12345"` di kolom alamat tujuan; pastikan validasi menolaknya dengan pesan eksak di atas.
  - **State Layar:** `loading` (tombol `"Mengirim…"`), `empty` (form dikunci nonaktif bila nilai bersih `US$0,00`), `error`, `success`, `partial` (`N/A`), `no-permission`.

---

#### [US-04B] Selesaikan atau Tolak Permintaan Tarik Modal (Pengelola)
- **Sebagai** pengelola, **saya ingin** menyelesaikan penarikan dengan mencocokkannya ke transfer keluar dompet pada waktu transfer (atau menandai selesai secara manual / menolaknya di **Kelola → Permintaan** bila saldo turun), **supaya** unit investor yang keluar dan hak unit fee pengelola langsung terpotong akurat saat dana keluar. **Karena jika tidak**, penarikan besar akan menggantung sampai besok pagi atau memotong unit dengan harga yang salah.
- **Acceptance Criteria:**
  - [ ] **AC-04B-01 (Happy Path):** Given ada permintaan tarik `Menunggu`, when pengelola mencocokkannya dengan arus keluar dompet di `US-13` (otomatis mengisi waktu transfer, pembacaan nilai terdekat, jumlah final, dan bukti tanda transaksi) atau menekan `Tandai selesai` di **Kelola → Permintaan**, dan `jumlah_final_usd <= nilai_bersih_investor` pada waktu efektif tersebut, then unit & modal investor berkurang proporsional, unit fee berpindah ke Pengelola (`BR-06`, `BR-18`), status menjadi `Selesai`, dan muncul toast `"Penarikan [Nama] US$[jumlah] selesai. Semua posisi sudah diperbarui."`
    - **Definisi Field:** `waktu_efektif` (otomatis saat dicocokkan ke arus dompet), `tanggal_efektif` (wajib untuk penyelesaian manual), `jumlah_final_usd` (`> 0`, `<= nilai_bersih`), `bukti_transaksi` (opsional `<= 100` kar), `alasan` (wajib bila jumlah berbeda dari ajuan).
    - **Verifikasi:** Cocokkan arus keluar ke permintaan tarik; pastikan unit investor langsung terpotong tepat pada menit transfer tersebut dan hak unit fee pengelola bertambah sesuai `BR-06`.
  - [ ] **AC-04B-02 (Reverse Flow — Tolak):** Pengelola menolak permintaan tarik `Menunggu` dengan alasan wajib pada lembar konfirmasi; status menjadi `Ditolak` dan unit tetap utuh.
    - **Definisi Field:** `alasan` (teks wajib, `1..200 karakter`).
    - **Verifikasi:** Tolak permintaan tarik; pastikan status menjadi `Ditolak` dan alasan tampil di tab Transaksi.
  - [ ] **AC-04B-03 (Error Handling):** Jika nilai bersih pada waktu/tanggal efektif `< jumlah_final_usd` (`BR-09`), penyelesaian ditolak dengan pesan `"Jumlah transfer US$[jumlah] melebihi nilai bersih [Nama] saat transfer terjadi."` (atau `"Nilai bersih investor sekarang US$[nilai], kurang dari US$[diminta] yang diminta."`); jika penyelesaian manual belum punya snapshot tanggal itu (`BR-10`), tampil pesan minta isi snapshot terlebih dahulu.
    - **Definisi Field:** Sama dengan `AC-04B-01`.
    - **Verifikasi:** Uji penyelesaian tarik melebihi nilai bersih; pastikan ditolak.
  - **State Layar:** Sama dengan `US-03B`.

---

#### [US-05] Lihat Posisi Semua Anggota, Rekonsiliasi Live, & Kartu Cek Data (Tab Pool)
- **Sebagai** anggota pool, **saya ingin** melihat porsi dan rincian nilai semua anggota aktif beserta baris pengelola, rekonsiliasi arus belum diproses, dan kartu status pemeriksaan data di tab **Pool**, **supaya** seluruh grup melihat satu pembukuan terbuka yang sama. **Karena jika tidak**, anggota tidak bisa memverifikasi bahwa jumlah seluruh porsi benar-benar `100,00%` dan cocok dengan isi dompet.
- **Acceptance Criteria:**
  - [ ] **AC-05-01 (Happy Path):** Given saya masuk akun, when saya membuka tab **Pool**, then di bawah kartu grafik saldo pool (`US-08`) tampil dua kartu:
    1. **Kartu `"Posisi semua anggota"`:** Bar proporsi gabungan setinggi `12dp`, daftar baris tiap investor (kotak warna legenda `10dp` bersudut `3dp`, nama, chip `"Kamu"` untuk diri sendiri, chip kuning `"Penarikan diproses"` bila ada tarik menunggu yang arusnya sudah ditautkan, porsi `%`, sub-baris `"Modal US$... · +/−US$... · Fee US$..."`, nilai bersih USD & SOL di kanan), baris khusus **Pengelola** (`"Unit fee US$... · Fee terutang US$..."` dengan total hak USD & porsi `%` di kanan), garis total `2dp`, baris total (`"Total pool"` atau `"Total anggota"` bila ada selisih arus + `"Porsi 100,00%"`), serta baris rekonsiliasi `"Total anggota US$... · Belum diproses [+/−]US$... · Isi wallet US$..."` bila ada arus `Belum dicocokkan` `>= US$0,01` (`BR-19`).
    2. **Kartu `"Cek data"`:** Menampilkan ikon centang hijau `"Semua cek lolos"` beserta keterangan ke-5 aturan konsistensi yang diperiksa otomatis (`BR-12`).
    - **Definisi Field:** `posisi_anggota[]`, `pengelola_ringkasan` (`nilai_unit_fee_usd`, `fee_terutang_total`), `arus_dinetralkan_usd`, `cek` (`lolos`, `penyebab[]`). *(Aturan privasi: alamat email dan alamat dompet pribadi anggota lain tidak pernah dikirim ke investor biasa).*
    - **Verifikasi:** Pastikan jumlah seluruh porsi `100,00%` dan rekonsiliasi tampil akurat ketika terdapat arus transfer yang belum dicocokkan.
  - [ ] **AC-05-02 (Reverse Flow):** `N/A (Tab Pool bersifat hanya-baca).`
  - [ ] **AC-05-03 (Error Handling):** Jika `cek.lolos = false` (`BR-12`), kartu `"Cek data"` menampilkan kotak peringatan kuning berisi seluruh kalimat `penyebab[]` secara eksplisit; kondisi gagal muat/offline mengikuti `AC-01-03`.
    - **Definisi Field:** `penyebab[]` (daftar teks masalah konsistensi).
    - **Verifikasi:** Uji saat ada 1 transfer sebelum snapshot terakhir berstatus `Belum dicocokkan`; pastikan kalimat penyebab tampil di kartu `"Cek data"`.
  - **State Layar:** `loading`, `empty`, `error`, `success`, `partial` (daftar anggota tampil, grafik pool gagal muat), `no-permission`.

---

#### [US-08] Lihat Grafik Saldo Pool (`USD` / `SOL` / `Bandingkan` & Info Rekonsiliasi)
- **Sebagai** anggota pool, **saya ingin** melihat grafik total isi dompet pool dengan pilihan satuan `USD`, `SOL`, dan `Bandingkan` (kinerja unit dalam persen) serta rentang adaptif, **supaya** saya bisa membedakan perubahan karena pasar vs karena keluar/masuknya modal anggota. **Karena jika tidak**, penarikan besar seorang anggota tampak seperti kerugian strategi pool.
- **Acceptance Criteria:**
  - [ ] **AC-08-01 (Happy Path):** Given tersedia minimal 2 titik data pool, when saya membuka tab **Pool**, then kartu `"Saldo pool Pasti Cuan"` menampilkan angka besar **Isi Wallet** terbaru (`BR-19`), tombol ikon info bulat `44dp` di samping angka besar (muncul hanya saat ada arus `Belum dicocokkan` `>= US$0,01`), baris perubahan rentang (dengan label tambahan `"nilai unit"` pada persen bila arah nominal total & persen unit berbeda), grafik interaktif sesuai rentang adaptif (`24J | 7H | Setoran Terakhir | Semua`), keterangan lingkaran putih bertepi hijau hutan `"Titik bertanda = ada setoran atau penarikan. Naik-turun di titik itu bukan untung atau rugi."`, dan catatan harga SOL terkini di bagian bawah kartu. Pada mode `Bandingkan`, legenda bawah berbunyi `"USD · SOL · persen kinerja unit sejak awal rentang (bukan total saldo)"` (`BR-22`).
    - **Definisi Field:** `isi_wallet_usd`, `isi_wallet_sol`, `harga_sol_terkini`, `info_selisih_terbuka` (boolean).
    - **Verifikasi:** Ketuk ikon info saat ada arus belum diproses; pastikan muncul kotak penjelasan `"Isi wallet sekarang US$... Akan beres setelah transfer dicocokkan."` Sentuh titik transaksi di grafik Pool; pastikan chip menyebut nama anggota (contoh `"Setoran: Salman US$525,00"`).
  - [ ] **AC-08-02 (Reverse Flow):** Mengetuk ulang ikon info menutup kotak penjelasan; melepas jari dari grafik mengembalikan angka ke Isi Wallet *live* (`BR-23`).
    - **Definisi Field:** `info_terbuka` (boolean), `indeks_titik_aktif` (integer opsional).
    - **Verifikasi:** Buka lalu tutup ikon info; geser lalu lepas jari di grafik.
  - [ ] **AC-08-03 (Error Handling):** Mengikuti ketentuan `< 2` titik data, gagal muat grafik + tombol `Coba lagi`, data *live* tertinggal, dan kondisi offline seperti `AC-12-03`.
    - **Definisi Field:** Sama dengan `AC-12-03`.
    - **Verifikasi:** Uji kondisi gagal muat grafik; pastikan angka besar Isi Wallet tetap tampil dan tombol `Coba lagi` memulihkan grafik.
  - **State Layar:** `loading`, `empty`, `error`, `success`, `partial`, `no-permission`.

---

#### [US-02A] Pantau Kesehatan Pembaca Wallet & Isi Snapshot Saldo Manual (Pengelola)
- **Sebagai** pengelola, **saya ingin** memantau kesehatan pembaca dompet otomatis dan mengisi snapshot harian manual hanya ketika pembacaan otomatis gagal atau tertunda pada halaman **Kelola → Snapshot saldo**, **supaya** pencatatan cadangan tetap siap tanpa harus input rutin setiap pagi. **Karena jika tidak**, gangguan layanan luar pada pagi hari dapat menghambat rekap harian.
- **Acceptance Criteria:**
  - [ ] **AC-02A-01 (Happy Path):** Given saya masuk sebagai Pengelola, when saya membuka **Kelola → Snapshot saldo** (dengan kapsul navigasi bawah tetap tampil dan tab induk `Kelola` menyala), then saya melihat:
    1. **Kartu `"Pembaca wallet"`:** Status berjalan (`"Berjalan normal"` hijau / `"Pembacaan tertunda"` kuning bila `> 15 menit`), `Titik nilai terakhir`, `Isi wallet` (USD & SOL), **`Menit berhasil hari ini (%)`**, jadwal `Snapshot otomatis berikutnya`, serta tombol `Isi snapshot manual` (form otomatis terbuka jika snapshot hari ini belum ada).
    2. **Form `"Snapshot manual"`:** Menampilkan kotak pembanding titik nilai terakhir beserta tombol cepat **`Pakai angka ini`** (menyalin nilai USD & SOL terakhir ke kolom input), kolom `Tanggal`, `Nilai wallet (USD)`, `Saldo wallet (SOL)`, kolom baca-saja `Harga SOL turunan` (`"US$... per SOL"` otomatis dari `USD ÷ SOL`), `Fee LP yang diklaim (SOL)` opsional, dan `Catatan` opsional. Saat disimpan, harga unit dihitung (`BR-02`) dan tampil toast `"Saldo [tanggal] tersimpan. Semua posisi sudah diperbarui."`
    3. **Kartu `"Riwayat snapshot"`:** Menampilkan 7 snapshot terbaru secara default (dilengkapi tombol `"Tampilkan semua ([N])"` bila `> 7`), masing-masing ber-chip sumber (`Otomatis`, `Manual`, `Koreksi`, `Impor`) dan chip `"Ada transaksi"` bila mengikat transaksi selesai.
    - **Definisi Field:** `tanggal` (`16 Okt 2026 .. hari_ini`, unik), `nilai_usd` (`> 0`, maks. 2 desimal), `saldo_sol` (`> 0`, maks. 6 desimal), `fee_lp_diklaim_sol` (`>= 0`, opsional), `catatan` (`<= 500` kar, opsional).
    - **Verifikasi:** Ketuk `Pakai angka ini` pada tanggal kosong lalu simpan; pastikan chip sumber tampil `Manual` dan harga SOL turunan terhitung akurat.
  - [ ] **AC-02A-02 (Reverse Flow):** Menekan `Batal` menutup form manual; menutup lembar konfirmasi lonjakan `> 30%` (`"Cek lagi"`) membatalkan penyimpanan.
    - **Definisi Field:** `konfirmasi_lonjakan` (boolean).
    - **Verifikasi:** Batalkan lembar peringatan lonjakan; pastikan belum ada baris snapshot baru.
  - [ ] **AC-02A-03 (Error Handling):**
    - *Tanggal sudah terisi:* `"Saldo untuk [tanggal] sudah ada. Ubah data yang ada atau pilih tanggal lain."`
    - *Tanggal di luar batas:* `"Tanggal tidak boleh di masa depan."` / `"Tanggal tidak boleh sebelum 16 Okt 2026."`
    - *Nilai tidak valid:* `"Nilai USD dan saldo SOL harus lebih dari 0."` / `"Nilai USD maksimal 2 angka di belakang koma."` / `"Saldo SOL maksimal 6 angka di belakang koma."` / `"Fee LP tidak boleh negatif."`
    - *Lonjakan `> 30%` tanpa transaksi maupun arus dompet pada hari itu:* Memunculkan lembar konfirmasi `"Yakin angkanya benar?"` (`"Saldo berubah [X]% dari kemarin tanpa ada setoran atau penarikan. Yakin angkanya benar?"` dengan pilihan `Cek lagi` / `Simpan tetap`).
    - **Definisi Field:** `lonjakan_tanpa_arus_persen` (desimal opsional).
    - **Verifikasi:** Masukkan perubahan `35%` pada hari tanpa arus; pastikan lembar konfirmasi muncul sebelum tersimpan.
  - **State Layar:** `loading`, `empty` (`"Belum ada saldo. Catat saldo pertama atau impor riwayat."`), `error`, `success`, `partial` (`N/A`), `no-permission` (`"Halaman ini khusus pengelola."`).

---

#### [US-02B] Koreksi atau Hapus Snapshot Saldo dengan Jejak Audit (Pengelola)
- **Sebagai** pengelola, **saya ingin** mengubah snapshot yang keliru dengan alasan wajib (atau menghapus snapshot yang belum mengikat transaksi) di **Kelola → Snapshot saldo**, **supaya** perbaikan data masa lalu otomatis menghitung ulang semua posisi sesudahnya secara akuntabel. **Karena jika tidak**, koreksi saldo meninggalkan selisih berantai di hari-hari berikutnya.
- **Acceptance Criteria:**
  - [ ] **AC-02B-01 (Happy Path):** Given snapshot sudah tersimpan, when pengelola mengetuk ikon ubah (pensil) pada baris snapshot, mengisi angka perbaikan beserta `Alasan koreksi` (wajib bila mengubah snapshot bersumber `Otomatis` atau `Koreksi`), dan menyetujui lembar konfirmasi `"Hitung ulang semua angka?"` (`"Mengubah saldo tanggal ini akan menghitung ulang semua angka sesudahnya. Lanjutkan?"`), then sumber berubah menjadi `Koreksi`, seluruh posisi sesudahnya dihitung ulang (`BR-11`), muncul toast `"Saldo [tanggal] tersimpan. Semua posisi sudah diperbarui."`, dan perubahan tercatat permanen di Log perubahan.
    - **Definisi Field:** `nilai_usd` (`> 0`, 2 desimal), `saldo_sol` (`> 0`, 6 desimal), `alasan` (teks wajib untuk snapshot otomatis/koreksi, `1..200 karakter`).
    - **Verifikasi:** Ubah satu snapshot `Otomatis`, pastikan chip berubah ke `Koreksi` dan entri perubahan beserta `nilai_lama → nilai_baru` muncul di halaman Log perubahan.
  - [ ] **AC-02B-02 (Reverse Flow — Hapus Snapshot):** Snapshot yang tidak dipakai sebagai tanggal efektif transaksi selesai dapat dihapus lewat ikon tempat sampah dan lembar konfirmasi `"Hapus saldo [tanggal]?"` (tombol merah `Hapus`), memicu hitung ulang otomatis disertai toast `"Saldo [tanggal] dihapus. Semua posisi sudah diperbarui."`
    - **Definisi Field:** `dipakai_transaksi` (boolean, wajib `false` agar tombol `Hapus` aktif).
    - **Verifikasi:** Hapus snapshot baru yang belum mengikat transaksi; pastikan berhasil dihapus dan tercatat di Log perubahan.
  - [ ] **AC-02B-03 (Error Handling):** Jika snapshot dipakai oleh transaksi selesai (`BR-10`), lembar hapus menonaktifkan tombol `Hapus` dengan pesan `"Saldo ini dipakai sebagai tanggal efektif transaksi, jadi hanya bisa diubah, tidak bisa dihapus."`; menolak koreksi snapshot otomatis tanpa alasan (`"Alasan koreksi wajib diisi."`); serta membatalkan koreksi apabila hasil hitung ulang melanggar `BR-09` / `BR-12b` (membuat penarikan sesudahnya melebihi nilai bersih investor).
    - **Definisi Field:** `pelanggaran_invarian[]`.
    - **Verifikasi:** Ketuk ikon hapus pada snapshot yang memiliki chip `"Ada transaksi"`; pastikan tombol `Hapus` terkunci nonaktif.
  - **State Layar:** Sama dengan `US-02A`.

---

#### [US-13] Cocokkan & Tandai Arus Transfer Dompet pada Waktu Transfer (Pengelola)
- **Sebagai** pengelola, **saya ingin** mencocokkan transfer masuk/keluar dompet yang terdeteksi otomatis ke permintaan anggota (atau membuat permintaan baru langsung dari arus tersebut, atau menandainya sebagai biaya pool / bukan arus) di **Kelola → Arus onchain**, **supaya** transaksi langsung dinilai akurat pada menit transfer terjadi. **Karena jika tidak**, nilai pool tampak terdistorsi oleh dana keluar/masuk yang belum bertuan.
- **Acceptance Criteria:**
  - [ ] **AC-13-01 (Happy Path):** Given saya masuk sebagai Pengelola dan membuka **Kelola → Arus onchain** (memuat 3 tab saring `Belum dicocokkan [N] | Ditandai [N] | Semua [N]` dan tautan `Lihat wallet di Solscan`), when saya mengetuk `Cocokkan` atau `Tandai lain` pada suatu transfer berstatus `Belum dicocokkan` (yang menampilkan arah `Masuk`/`Keluar`, jumlah token, waktu WIB, alamat lawan, nilai USD bertanda, serta saran otomatis bila selisih `<= 2%` atau alamat lawan cocok dengan wallet anggota) lalu memilih salah satu dari 4 opsi radio pada lembar bawah (`Cocokkan dengan setoran/penarikan yang diajukan`, `Buat permintaan untuk anggota`, `Biaya pool (dianggap rugi pool)`, atau `Bukan arus (dust, token spam)`), then:
    - Bila `Cocokkan` / `Buat permintaan`: mendukung penggabungan beberapa transfer searah (mis. `1 USDC + 730,51 USDC` dari alamat lawan yang sama), langsung menyelesaikan permintaan pada **waktu transfer arus tersebut** memakai pembacaan nilai dompet terdekat saat itu (`BR-18`), memperbarui unit seketika (`BR-19`), dan menampilkan toast konfirmasi.
    - Bila `Biaya pool` / `Bukan arus`: status arus diperbarui dengan `Catatan` wajib dan perhitungan `Nilai Disesuaikan` langsung disegarkan.
    - **Definisi Field:** `ids[]` (minimal 1 transfer searah berstatus `belum`), `mode` (`cocok`\|`buat`\|`biaya`\|`bukan_arus`), `permintaan_id` (wajib saat `cocok`), `anggota_id` (wajib saat `buat`), `catatan` (wajib saat `biaya`/`bukan_arus`, `1..200` kar), `alasan_selisih` (wajib bila selisih nominal `> toleransi_cocok_persen`, `1..200` kar).
    - **Verifikasi:** Cocokkan transfer masuk ke permintaan menunggu atau buat permintaan langsung atas nama anggota; pastikan permintaan selesai pada waktu transfer dan lencana tugas di kapsul `Kelola` berkurang.
  - [ ] **AC-13-02 (Reverse Flow):** Pada tab `Ditandai`, pengelola dapat menekan `Batalkan penandaan` selama transfer belum dikunci snapshot sesudahnya / permintaan selesai, mengembalikan status ke `Belum dicocokkan` disertai pencatatan ke Log perubahan (`BR-11`).
    - **Definisi Field:** `id_arus` (teks wajib).
    - **Verifikasi:** Tandai satu arus sebagai `Bukan arus`, buka tab `Ditandai`, lalu tekan `Batalkan penandaan`; pastikan kembali ke tab `Belum dicocokkan`.
  - [ ] **AC-13-03 (Error Handling):** Meminta `Alasan selisih jumlah` bila total transfer berbeda `> 2%` dari permintaan (`"Jumlah transfer US$[A] berbeda dari permintaan US$[B]. Isi alasan untuk melanjutkan."`); mewajibkan `Catatan` pada `Biaya pool`/`Bukan arus` (`"Catatan wajib diisi."`); menolak pembuatan permintaan baru bila anggota tersebut masih punya permintaan sejenis berstatus `Menunggu`; serta menolak pembatalan penandaan bila sudah terikat snapshot resmi atau permintaan yang telah selesai.
    - **Definisi Field:** `selisih_persen` (desimal).
    - **Verifikasi:** Coba simpan `Biaya pool` dengan catatan kosong; pastikan tertahan dengan pesan `"Catatan wajib diisi."`
  - **State Layar:** `loading`, `empty` (`"Semua transfer sudah dicocokkan."` / `"Belum ada transfer yang ditandai."`), `error`, `success`, `partial` (`N/A`), `no-permission` (`"Halaman ini khusus pengelola."`).

---

#### [US-07A] Masuk Akun Google Terdaftar & Kelola Sesi di Android
- **Sebagai** anggota pool, **saya ingin** masuk menggunakan akun Google saya yang terdaftar dan tetap masuk setiap kali membuka aplikasi Android, **supaya** akses harian berlangsung instan namun tertutup rapat dari orang luar. **Karena jika tidak**, pihak tak dikenal bisa membaca isi catatan dana grup.
- **Acceptance Criteria:**
  - [ ] **AC-07A-01 (Happy Path):** Given saya membuka aplikasi pada rilis terhubung server (`v1.0`) dan belum masuk, when saya mengetuk `Masuk dengan Google` dan memilih email Google yang terdaftar aktif sebagai anggota pool, then identitas akun Google tertaut otomatis ke profil anggota pada login pertama, sesi tersimpan aman di perangkat Android, dan saya langsung masuk ke **Beranda** (dengan 4 item kapsul navigasi bila Investor, atau 5 item bila Pengelola).
    - **Definisi Field:** `email` (huruf kecil, terdaftar & `aktif = true`), `peran` (`investor`\|`pengelola`).
    - **Verifikasi:** Masuk dengan akun terdaftar, tutup paksa aplikasi dari daftar aplikasi terbaru Android, lalu buka lagi; pastikan langsung menampilkan Beranda tanpa login ulang.
  - [ ] **AC-07A-02 (Reverse Flow — Keluar):** Mengetuk `Keluar` di tab **Lainnya** menghapus sesi masuk dan cadangan lokal di HP, lalu mengarahkan ke layar **Masuk**.
    - **Definisi Field:** `sesi_aktif` (`false` setelah keluar).
    - **Verifikasi:** Ketuk `Keluar`; pastikan kembali ke layar `Masuk` dan data lokal dibersihkan.
  - [ ] **AC-07A-03 (Error Handling):** Email Google tidak terdaftar atau berstatus nonaktif langsung dikeluarkan dengan pesan `"Akun Google ini belum terdaftar. Minta pengelola menambahkan email kamu."`; pembatalan/kegagalan login Google menampilkan `"Masuk dengan Google gagal. Silakan coba lagi."`; sesi kedaluwarsa menampilkan `"Sesi kamu berakhir. Silakan masuk lagi."`
    - **Definisi Field:** `pesan_error_auth` (teks).
    - **Verifikasi:** Uji masuk memakai email luar daftar; pastikan tertolak bersih dengan pesan eksak di atas.
  - **State Layar:** `loading` (tombol `"Mengarahkan ke Google..."` nonaktif), `empty` (`N/A`), `error` (pesan merah di atas tombol masuk), `success`, `partial` (`N/A`), `no-permission` (tertahan di layar Masuk).

---

#### [US-07B] Kelola Daftar Anggota & Alamat Wallet Pencocokan (Pengelola)
- **Sebagai** pengelola, **saya ingin** menambah anggota baru, memperbarui daftar alamat dompet Solana milik anggota, atau menonaktifkan anggota yang sudah menarik seluruh dananya di **Kelola → Anggota**, **supaya** hak akses dan saran pencocokan transfer dompet selalu mutakhir. **Karena jika tidak**, anggota baru tidak bisa masuk dan alamat dompet penarikan harus diketik manual terus.
- **Acceptance Criteria:**
  - [ ] **AC-07B-01 (Happy Path):** Given saya masuk sebagai Pengelola dan membuka **Kelola → Anggota**, when saya:
    1. Mengisi form `"Tambah anggota"` (`Nama` `2..40` kar unik, `Email akun Google` unik huruf kecil, kontrol segmen `Peran` `Investor | Pengelola`, serta `Alamat wallet Solana` opsional dipisah koma) lalu menekan `Tambah anggota`, atau
    2. Menekan `Ubah wallet` pada salah satu baris anggota di kartu `"Daftar anggota"` lalu menyimpan daftar alamat Solana pada lembar bawah `"Wallet [Nama]"`,
    then perubahan tersimpan, tercatat di Log perubahan, dan tampil toast `"[Nama] ditambahkan. Ia bisa masuk dengan akun Google [email]."` atau `"Alamat wallet [Nama] diperbarui."` *(Sesuai paritas produksi `OQ-18`, email akun anggota yang sudah dibuat bersifat tetap untuk menjaga keutuhan tautan login Google).*
    - **Definisi Field:** `nama` (teks wajib `2..40` kar unik tanpa peka huruf besar/kecil), `email` (email wajib unik huruf kecil saat tambah anggota), `peran` (`investor`\|`pengelola`, default=`investor`), `alamat_wallet[]` (daftar alamat Solana base58 `32..44` kar opsional).
    - **Verifikasi:** Tambahkan 1 alamat dompet Solana lewat `Ubah wallet` pada profil anggota; buka halaman `Tarik` akun anggota tersebut dan pastikan tombol `"Pakai [ringkas_alamat]"` langsung muncul.
  - [ ] **AC-07B-02 (Reverse Flow):** Pengelola dapat menekan `Nonaktifkan` pada anggota lain yang bersaldo `unit = 0` (dan menekan `Aktifkan` kembali bila bergabung lagi) tanpa menghapus riwayat transaksinya, disertai toast `"[Nama] dinonaktifkan. Riwayatnya tetap tersimpan."` / `"[Nama] diaktifkan lagi."`
    - **Definisi Field:** `aktif` (boolean).
    - **Verifikasi:** Nonaktifkan eks-anggota berunit `0` (Rezki); pastikan chip `Nonaktif` muncul dan riwayat masa lalunya tetap utuh di Pool & Log perubahan.
  - [ ] **AC-07B-03 (Error Handling):** Menolak penonaktifan bila anggota masih punya dana (`"[Nama] masih punya dana US$[nilai]. Tarik semua dulu sebelum menonaktifkan."`), menyembunyikan tombol nonaktifkan pada baris diri sendiri agar pengelola aktif tidak terkunci, menolak nama/email kembar atau kosong, serta menolak format alamat Solana tidak valid (`"Alamat wallet Solana harus 32–44 karakter (huruf dan angka base58)."`).
    - **Definisi Field:** `unit_tersisa` (desimal `>= 0`).
    - **Verifikasi:** Coba tekan `Nonaktifkan` pada anggota yang masih punya unit `> 0`; pastikan tertolak dengan pesan jumlah dananya.
  - **State Layar:** `loading`, `empty` (`N/A`, minimal ada pengelola aktif), `error`, `success`, `partial` (`N/A`), `no-permission` (`"Halaman ini khusus pengelola."`).

---

#### [US-14] Pemeriksaan & Pemasangan Versi Baru Aplikasi Internal (Luar Play Store)
- **Sebagai** anggota pool yang memasang aplikasi tanpa Play Store, **saya ingin** aplikasi memberi tahu saat ada pembaruan versi baru dan mengunduh pemasangnya langsung dari penyimpanan resmi proyek ke HP saya, **supaya** tampilan dan aturan hitung aplikasi saya tidak tertinggal dari anggota lain. **Karena jika tidak**, versi `.apk` lama bisa terus dipakai tanpa sengaja oleh anggota pasif.
- **Acceptance Criteria:**
  - [ ] **AC-14-01 (Happy Path):** Given perangkat online dan pengguna sudah masuk akun pada rilis `v1.0+`, when versi aplikasi terpasang lebih rendah dari versi terbaru di server, then:
    - *Pembaruan opsional:* Muncul pita informasi pembaruan & penanda di menu `Cek pembaruan aplikasi` pada tab **Lainnya** (`"Versi baru Pasti Cuan v[versi] tersedia: [catatan]."` + tombol `Perbarui`). Mengetuk `Perbarui` mengunduh paket rilis resmi, memverifikasi keutuhan berkas unduhan secara otomatis, lalu membuka dialog pemasangan sistem Android (`BR-26`).
    - *Pembaruan wajib (di bawah batas versi minimum wajib):* Menampilkan kartu pembaruan penuh yang mewajibkan instalasi sebelum lanjut bertransaksi (`BR-26`).
    - **Definisi Field:** `kode_versi_terpasang` (int `>= 1`), `kode_versi_terbaru` (int `>= 1`), `kode_versi_minimum_wajib` (int `>= 1`), `tautan_unduh_resmi` (tautan unduh sementara berbatas waktu), `catatan_rilis` (teks `<= 160` kar).
    - **Verifikasi:** Uji pembaruan dari kode versi `1` ke `2` yang ditandatangani kunci rilis yang sama; pastikan pemasangan menimpa mulus tanpa menghapus sesi login.
  - [ ] **AC-14-02 (Reverse Flow):** Mengetuk `Nanti` menyembunyikan pita pembaruan opsional selama sesi berjalan (tetap bisa dipicu manual dari tab **Lainnya**); membatalkan unduhan menghapus berkas sementara di HP.
    - **Definisi Field:** `tunda_sesi` (boolean).
    - **Verifikasi:** Tunda pita opsional lalu buka kembali lewat menu di tab Lainnya.
  - [ ] **AC-14-03 (Error Handling):** Jika izin pemasangan aplikasi sumber internal di HP belum diaktifkan, tampil panduan singkat beserta tombol `Buka Pengaturan Izin`; jika unduhan terputus atau verifikasi keutuhan berkas tidak cocok, pemasangan dibatalkan otomatis dengan pesan `"Gagal mengunduh pembaruan yang utuh. Coba lagi."`
    - **Definisi Field:** `izin_pasang_paket` (boolean), `berkas_utuh` (boolean).
    - **Verifikasi:** Simulasikan berkas unduhan rusak; pastikan pemasangan ditolak sebelum membuka pemasang sistem Android.
  - **State Layar:** `loading` (progres unduh `0..100%`), `empty` (`"Aplikasi sudah versi terbaru (v[versi])."`), `error`, `success`, `partial` (`N/A`), `no-permission` (panduan izin sistem Android).

---

### Should Have — P1

#### [US-09] Lihat Daftar Transaksi Bersaring, Log Perubahan Berkategori, & 12 Arti Istilah
- **Sebagai** anggota pool, **saya ingin** menyaring daftar permintaan setor/tarik milik semua anggota atau milik saya sendiri di tab **Transaksi**, memeriksa **Log perubahan** per kategori, serta membaca **12 Arti istilah** di tab **Lainnya**, **supaya** setiap antrean, revisi angka, maupun istilah akuntansi pool dapat saya pahami sendiri kapan saja secara terbuka.
- **Acceptance Criteria:**
  - [ ] **AC-09-01 (Happy Path):** Given saya masuk akun, when saya membuka:
    1. **Tab `Transaksi`:** Tampil **2 baris tab kontrol** persis sistem produksi, yaitu kontrol cakupan **`Semua anggota | Milik saya`** (default `Semua anggota`, mengikuti transparansi `OQ-07`) dan kontrol saring status **3 tab berjumlah** **`Semua [N] | Menunggu [N] | Diproses [N]`** (status `Selesai`, `Ditolak`, dan `Dibatalkan` tergabung pada `Diproses`). Setiap baris transaksi menampilkan ikon arah (`↙`/`↗`), jenis & nama pemilik, chip status, waktu efektif/diajukan, keterangan selisih nominal selesai bila ada (`"Diajukan US$..., diterima/dikirim US$... Alasan: ..."`), keterangan hijau `"Transfer sudah terlihat di wallet. Menunggu pencocokan pengelola."` bila arus sudah ditautkan ke permintaan `Menunggu`, serta tombol `Batalkan` khusus milik sendiri yang masih `Menunggu`. Di bawah kartu daftar terdapat **kartu pintasan menuju `Log perubahan`**.
    2. **Halaman `Log perubahan` (`Lainnya → Log perubahan` atau dari kartu bawah `Transaksi`):** Kapsul navigasi bawah **tetap tampil** dengan tab induk **`Lainnya` menyala**, dilengkapi bar atas bertombol kembali bulat `44dp`, banner info berikon gembok `"Log ini tidak bisa dihapus atau diubah siapa pun, termasuk pengelola."`, **kontrol segmen saring kategori `Semua | Saldo | Permintaan | Anggota`**, serta satu kartu daftar entri perubahan terbaru (`<= 50` baris) yang memuat pelaku, ringkasan, selisih `nilai_lama → nilai_baru` (atau `"dihapus"`), dan waktu WIB.
    3. **Tab `Lainnya`:** Memuat kartu profil anggota, kartu menu (`Status permintaan`, `Log perubahan`, `Kelola pool` khusus Pengelola, *accordion* `Tampilan`, `Cek pembaruan aplikasi`, `Keluar`), kartu **`Arti istilah`** berisi tepat **12 istilah** sesuai tabel Glosarium, serta catatan kaki non-kustodial di bagian paling bawah.
    - **Definisi Field:** `cakupan_transaksi` (`semua`\|`saya`, default=`semua`), `filter_transaksi` (`semua`\|`menunggu`\|`diproses`, default=`semua`), `kategori_log` (`Semua`\|`Saldo`\|`Permintaan`\|`Anggota`, default=`Semua`), `daftar_istilah` (`12 pasang` istilah & arti).
    - **Verifikasi:** Uji cakupan `Milik saya` vs `Semua anggota` dan ke-3 tab status di `Transaksi`; buka `Log perubahan` dan pastikan kapsul navigasi bawah tetap tampil menyalakan `Lainnya` serta ke-4 kategori saring log berfungsi.
  - [ ] **AC-09-02 (Reverse Flow):** Mengganti kembali cakupan/saring memulihkan daftar penuh; menekan tombol kembali bulat pada halaman `Log perubahan` mengembalikan pengguna ke layar sebelumnya (atau ke tab `Lainnya`).
    - **Definisi Field:** `riwayat_rute_sebelumnya`.
    - **Verifikasi:** Buka `Log perubahan` dari `Transaksi` lalu tekan tombol kembali bulat; pastikan kembali ke `Transaksi`.
  - [ ] **AC-09-03 (Error Handling):** Saat daftar kosong, tab `Transaksi` menampilkan `"Tidak ada permintaan yang menunggu."` (pada tab `Menunggu`) atau `"Belum ada transaksi."` beserta tombol `Setor` & `Tarik`, sedangkan `Log perubahan` menampilkan `"Belum ada perubahan di kategori ini."`; saat gagal muat tampil kartu `"Data belum bisa dimuat."` dengan tombol `Coba lagi`.
    - **Definisi Field:** `status_muat`.
    - **Verifikasi:** Saring kategori log yang kosong; pastikan pesan kosong tampil rapi di dalam kartu.
  - **State Layar:** `loading`, `empty`, `error`, `success`, `partial` (`N/A`), `no-permission`.

---

#### [US-16] Pengaturan Tampilan 1:1 Produksi: Tema *Wise Forest Obsidian*, *Liquid Glass*, & Gerak
- **Sebagai** anggota pool, **saya ingin** mengatur tema warna (`Sistem | Terang | Gelap`), material kaca (`Liquid Glass` beserta mode ringan), dan pengurangan animasi melalui menu lipat (*accordion*) **Tampilan** di tab **Lainnya** dengan rasa visual yang 100% identik dengan aplikasi web, **supaya** aplikasi nyaman dilihat siang maupun malam dan terasa satu produk utuh.
- **Acceptance Criteria:**
  - [ ] **AC-16-01 (Happy Path):** Given saya berada di tab **Lainnya**, when saya mengetuk baris **Tampilan** (yang menampilkan sub-label ringkasan seperti `"Mengikuti sistem · Liquid Glass"`), then daftar pengaturan membuka secara *inline* ke bawah di dalam kartu Menu **tanpa berpindah halaman dan tanpa membuat kotak kartu bersarang di dalam kartu** (*no card-in-card*), memuat sakelar kustom `GlassSwitch` (`46x28dp`) dan menerapkan kontrak visual 1:1 berikut:
    1. **Kontrol segmen `Tema warna` (`Sistem | Terang | Gelap`):**
       - *Mode Terang:* Kanvas `#E8EBE6`, kartu `#FFFFFF` datar tanpa garis tepi, kontrol segmen terpilih latar hijau hutan `#163300` + teks limau `#9FE870`.
       - *Mode Gelap (Wise Forest Obsidian):* Kanvas `#0C0F0B`, kartu `#151914` bertepi putih `6%`, teks utama `#EDF1EB`, garis grafik `#A2E378`, teks tombol utama limau tetap `#142D00`, dan **kontrol segmen maupun tab saring terpilih wajib memakai latar hijau hutan gelap `#263D1A` dengan teks limau `#9FE870`** (tidak memakai blok latar limau penuh demi mematuhi *Aturan Limau Satu Aksi*).
    2. **Sakelar `Liquid Glass` (default aktif) beserta 3 sub-opsi (`Mode ringan kaca`, `Progressive blur atas`, `Pill pegas & geser jari`):**
       - *Saat `Liquid Glass` aktif di Mode Terang:* Kapsul navigasi bawah memakai permukaan **kaca kristal putih bening terang** (`rgba(255,255,255,0.56..0.72)` bertepi putih `86%`), ikon/label tidak aktif `#414540`, ikon/label aktif `#0E0F0C` tebal, dan kapsul indikator aktif berwarna **putih susu terang** (`rgba(255,255,255,0.94)`) yang meluncur dengan pegas & sedikit mengembang saat berpindah atau digeser horizontal dengan jari.
       - *Saat `Liquid Glass` aktif di Mode Gelap:* Kapsul navigasi memakai kaca kristal netral gelap (`rgba(26,27,26,0.48..0.72)` bertepi putih `18%`), ikon/label tidak aktif `#A8ADA6`, aktif `#FFFFFF`, dengan kapsul indikator bening putih `16%`.
       - *Sub-opsi `Progressive blur atas`:* Memberikan efek keburaman bertingkat halus saat halaman digulir **tanpa kabut warna pekat (*no opaque canvas scrim*)** yang menutupi header.
    3. **Sakelar `Kurangi animasi`:** Mematikan animasi gambar garis grafik `700 ms` dan ayunan pegas indikator sehingga perpindahan berlangsung instan.
    - **Definisi Field:** `mode_tema` (`sistem`\|`terang`\|`gelap`, default=`sistem`), `liquid_glass` (bool, default=`true`), `mode_ringan_kaca` (bool, default=`false`), `progressive_blur` (bool, default=`true`), `pill_physics` (bool, default=`true`), `kurangi_animasi` (bool, default mengikuti pengaturan sistem).
    - **Verifikasi:** Bandingkan berdampingan layar Beranda & Lainnya di Android vs Web pada Mode Terang (`Liquid Glass` ON: navbar kaca putih terang, bukan hitam) dan Mode Gelap (`SegmentedTrack` terpilih `#263D1A`, bukan blok limau menyala).
  - [ ] **AC-16-02 (Reverse Flow):** Mengetuk ulang baris **Tampilan** melipat daftar *accordion*; mematikan sakelar `Liquid Glass` menyembunyikan ke-3 sub-opsi kaca dan mengembalikan permukaan kapsul navigasi ke **warna solid** (`#0E0F0C` dengan pil aktif `#353633` di Mode Terang; `#1E241C` bertepi putih `9%` dengan pil aktif `#2E372B` di Mode Gelap).
    - **Definisi Field:** `panel_tampilan_terbuka` (boolean).
    - **Verifikasi:** Matikan `Liquid Glass` di Mode Terang; pastikan barulah pada kondisi mati ini kapsul navigasi berubah menjadi pil hitam solid `#0E0F0C`.
  - [ ] **AC-16-03 (Error Handling):** Pada ponsel Android generasi lama yang keterbatasan perangkat kerasnya belum mendukung pembiasan kaca waktu-nyata penuh, aplikasi otomatis memakai permukaan kaca translusen halus berefek tepi kilau ringan tanpa patah-patah (*frame drop*).
    - **Definisi Field:** `dukungan_efek_kaca_penuh` (boolean otomatis).
    - **Verifikasi:** Pastikan gulir daftar dan geser kapsul navigasi tetap mulus `60 fps`.
  - **State Layar:** `loading` (`N/A`), `empty` (`N/A`), `error` (`N/A`), `success`, `partial` (`N/A`), `no-permission` (`N/A`).

---

#### [US-17] Kelola Pengaturan & Ambang Parameter Pool (Pengelola)
- **Sebagai** pengelola, **saya ingin** meninjau identitas pool dan menyesuaikan 8 parameter aturan perhitungan serta pembacaan wallet di halaman **Kelola → Pengaturan pool**, **supaya** kesepakatan grup atau ambang penyaringan token spam dapat diperbarui dari HP dengan jejak audit yang jelas. **Karena jika tidak**, pengelola harus membuka laptop atau mengubah basis data manual saat menyesuaikan ambang operasional.
- **Acceptance Criteria:**
  - [ ] **AC-17-01 (Happy Path):** Given saya masuk sebagai Pengelola dan membuka **Kelola → Pengaturan pool** (kapsul navigasi bawah tetap tampil dengan tab induk `Kelola` menyala), when saya melihat kartu identitas hanya-baca (`Nama pool`, `Tanggal mulai`, tautan ringkas `Wallet pool` ke Solscan, dan jadwal `Snapshot otomatis`), mengubah salah satu dari 8 parameter pada form, menekan `Simpan pengaturan`, lalu menyetujui lembar konfirmasi `"Hitung ulang semua angka?"` (`"Mengubah pengaturan akan menghitung ulang posisi semua anggota. Perubahan tercatat di log."`), then pengaturan baru tersimpan, seluruh posisi anggota dihitung ulang (`BR-11`), perubahan tercatat di Log perubahan, dan tampil toast `"Pengaturan tersimpan. Semua posisi sudah diperbarui."`
    - **Definisi Field:**
      - `fee_persen_input`: desimal (`%`), wajib, `0 <= nilai <= 100`, default=`10` (disimpan sebagai rasio `0,10`).
      - `satuan_dasar_fee`: kontrol segmen radio (`USD` \| `SOL`), wajib, default=`USD` (`BR-05`).
      - `batas_data_lama_hari`: bilangan bulat (`hari`), wajib, `>= 1`, default=`2` (`BR-15`).
      - `ambang_lonjakan_persen`: desimal (`%`), wajib, `> 0`, default=`30`.
      - `ambang_likuiditas_token_usd`: desimal (`US$`), wajib, `>= 0`, default=`10000` (`BR-17`).
      - `ambang_dust_usd`: desimal (`US$`), wajib, `>= 0`, default=`1` (`BR-19`).
      - `batas_live_lama_menit`: bilangan bulat (`menit`), wajib, `>= 1`, default=`15` (`BR-20`).
      - `toleransi_cocok_persen`: desimal (`%`), wajib, `0 <= nilai <= 100`, default=`2`.
    - **Verifikasi:** Ubah `Batas nilai lama` dari `15` ke `20` menit lalu setujui lembar konfirmasi; pastikan nilai baru tersimpan dan tercatat di halaman Log perubahan kategori `Anggota`.
  - [ ] **AC-17-02 (Reverse Flow):** Menekan `Batal` pada lembar konfirmasi `"Hitung ulang semua angka?"` atau menekan tombol kembali bulat membatalkan penyimpanan sehingga parameter pool tetap memakai nilai sebelumnya.
    - **Definisi Field:** `konfirmasi_simpan` (boolean).
    - **Verifikasi:** Buka lembar konfirmasi lalu ketuk `Batal`; pastikan posisi anggota belum berubah.
  - [ ] **AC-17-03 (Error Handling):** Menolak input di luar batas dengan pesan error eksak per kolom:
    - `fee_persen_input` kosong / `< 0` / `> 100`: `"Fee harus antara 0 dan 100%."`
    - `batas_data_lama_hari` bukan bilangan bulat / `< 1`: `"Tulis jumlah hari, minimal 1."`
    - `ambang_lonjakan_persen` kosong / `<= 0`: `"Ambang harus lebih dari 0%."`
    - `ambang_likuiditas_token_usd` kosong / `< 0`: `"Ambang likuiditas tidak boleh negatif."`
    - `ambang_dust_usd` kosong / `< 0`: `"Ambang dust tidak boleh negatif."`
    - `batas_live_lama_menit` bukan bilangan bulat / `< 1`: `"Tulis jumlah menit, minimal 1."`
    - `toleransi_cocok_persen` kosong / `< 0` / `> 100`: `"Toleransi harus antara 0 dan 100%."`
    - *Perangkat offline:* Seluruh kolom form dan tombol `Simpan pengaturan` dikunci nonaktif.
    - **Definisi Field:** `error_per_kolom` (`fee`, `lama`, `ambang`, `likuid`, `dust`, `liveLama`, `toleransi`).
    - **Verifikasi:** Isi `Fee pengelola` dengan `120`; pastikan muncul pesan merah `"Fee harus antara 0 dan 100%."` dan lembar konfirmasi tidak terbuka.
  - **State Layar:** `loading` (tombol `"Menyimpan…"`), `empty` (`N/A`), `error` (pesan merah di bawah kolom bermasalah), `success` (toast + hitung ulang), `partial` (`N/A`), `no-permission` (`"Halaman ini khusus pengelola."`).

---

### Could Have — P2
- *Tidak ada item P2 menggantung pada rilis `v1.0`.* Seluruh kapabilitas lanjutan pasca-`v1.0` telah dikunci tegas ke tahapan rilis berikutnya pada tabel P3 & Roadmap `3.4` (`OQ-18`) agar ruang lingkup `v1.0` fokus 100% pada paritas produksi penuh dan reliabilitas distribusi internal.

---

### Won't Have (untuk Rilis `v1.0`) — P3

| Fitur | Alasan Tidak Disertakan di Rilis `v1.0` | Kondisi / Target Peninjauan Ulang |
|---|---|---|
| **Kunci Privasi Aplikasi dengan Sidik Jari / PIN HP** | Fokus `v1.0` dikunci pada paritas fungsional & visual 1:1 dengan sistem produksi serta kelancaran integrasi Google Sign-In (`OQ-18`) | Dijadwalkan resmi pada **Rilis `v1.1`** (segera setelah `v1.0` stabil dipakai `5/5` anggota) |
| **Pemberitahuan (*Push Notification*) Android** | Membutuhkan penyiapan layanan pengiriman pesan latar belakang & izin notifikasi tambahan di luar backend berjalan | Dijadwalkan resmi pada **Rilis `v2.0`** |
| **Ekspor Cadangan CSV via Lembar Berbagi Android** | Cadangan basis data terenkripsi `AES-256` sudah berjalan otomatis setiap minggu di GitHub Actions (`NF-06`) | Dijadwalkan resmi pada **Rilis `v2.0`** |
| **Widget Layar Utama Android (*Home Screen Widget*)** | Fokus `v1.0` pada kemantapan aplikasi utama dulu | Dieksplorasi pada **Rilis `v2.0`** |
| **Layar Impor CSV Riwayat Awal (`/kelola/impor`)** | Riwayat `16 Okt–16 Nov 2026` sudah terisi permanen dari rekonstruksi `2.549` transaksi di basis data produksi (fitur impor otomatis terkunci setelah ada transaksi selesai) | Tidak dibangun di aplikasi Android |
| **Pengubahan Email Akun Anggota Eksisting** | Mengubah email pada profil yang sudah tertaut login Google berisiko memutus ikatan identitas akun (`OQ-18`) | Bila anggota ganti akun Google, nonaktifkan akun lama saat saldo `0` lalu tambahkan akun baru |
| **Publikasi ke Google Play Store** | Pengguna tertutup internal 6 orang; distribusi langsung bebas biaya & antrean review | Hanya jika produk dibuka untuk grup luar |
| **Aplikasi iOS / iPhone** | `100%` anggota menggunakan ponsel Android | Jika ada anggota baru pengguna iPhone (sementara dapat mengakses versi web aktif) |
| **Eksekusi transfer / simpan kunci rahasia dompet** | Aplikasi murni buku catatan baca-saja (*non-kustodial*) | Tidak direncanakan (*Explicit Won't Do*) |
| **Pencocokan transfer otomatis tanpa konfirmasi pengelola, multi-pool, & saran investasi** | Transfer bursa memakai alamat pengirim acak & ruang lingkup khusus 1 pool *"Pasti Cuan"* | Tidak direncanakan (*Explicit Won't Do*) |

---

### Matriks Keterlacakan (Traceability Matrix — P0 & P1 `v1.0`)

| Masalah / JTBD di Section 1 | Story ID | Judul Story | AC IDs | Aturan Bisnis | Referensi Kontrak Section 3 |
|---|---|---|---|---|---|
| Porsi, asal nilai, kinerja sejak setor terakhir, & selisih USD vs SOL pribadi dari HP | `US-12`, `US-01` (P0) | Kartu Grafik Adaptif, Kartu Rincian Beranda, & Kartu Tugas Pengelola | `AC-12-01..03`, `AC-01-01..03` | `BR-02`, `BR-04`, `BR-05`, `BR-14..16`, `BR-20..23`, `BR-25` | `GET /api/posisi`, Mesin Hitung Klien (`seriRentang`), Cache Lokal HP, `NF-01`, `NF-13`, `NF-16` |
| Rekap konsisten satu sumber angka & cadangan saat pembaca otomatis terganggu | `US-02A`, `US-02B`, `US-05` (P0) | Kesehatan Pembaca Wallet, Snapshot Manual/Koreksi, & Transparansi Pool | `AC-02A-01..03`, `AC-02B-01..03`, `AC-05-01..03` | `BR-01`, `BR-02`, `BR-11`, `BR-12`, `BR-18`, `BR-24` | `POST /api/snapshot`, `PATCH/DELETE /api/snapshot/[tanggal]`, Fixture Unit Test `PoolEngineTest` |
| Alur setor mudah (salin alamat dompet) & dinilai tepat pada waktu transfer | `US-03A`, `US-03B` (P0) | Halaman Fokus Setor & Konfirmasi/Penolakan Setor | `AC-03A-01..03`, `AC-03B-01..03` | `BR-03`, `BR-08`, `BR-10`, `BR-13`, `BR-18` | `POST /api/permintaan`, `POST /api/permintaan/[id]/selesai\|tolak\|batal` |
| Penarikan transparan (simulasi instan & tombol alamat tersimpan) tanpa salah bayar | `US-04A`, `US-04B` (P0) | Halaman Fokus Simulasi Tarik & Penyelesaian/Penolakan Tarik | `AC-04A-01..03`, `AC-04B-01..03` | `BR-06..10`, `BR-12`, `BR-13`, `BR-18` | Fungsi Klien `simulasiTarik()`, `POST /api/permintaan/[id]/selesai`, Cek `versi_data` |
| Pemahaman kinerja unit pool vs harga SOL dengan grafik sumbu persen kanan | `US-08` (P0) | Grafik Saldo Pool & Info Rekonsiliasi | `AC-08-01..03` | `BR-16`, `BR-17`, `BR-19`, `BR-21..24` | `GET /api/posisi` (`titik[]`), Edge Function `baca-wallet`, `NF-10`, `NF-13` |
| Rekonsiliasi transfer dompet langsung pada menit kejadian tanpa menunggu besok | `US-13` (P0) | Pencocokan & Penandaan Arus Onchain | `AC-13-01..03` | `BR-12e`, `BR-18`, `BR-19` | Tabel `arus_onchain`, `POST / DELETE /api/arus-onchain/tandai`, `NF-11` |
| Akses tertutup 6 anggota terdaftar dengan sanitasi privasi sesama investor | `US-07A`, `US-07B` (P0) | Masuk Google Terdaftar & Kelola Anggota/Wallet | `AC-07A-01..03`, `AC-07B-01..03` | RBAC (`2.4`) | Google Sign-In (`Credential Manager`) + Bearer Auth API + Sanitasi Payload, `NF-04` |
| Penyelarasan versi aplikasi internal tanpa melalui Google Play Store | `US-14` (P0) | Pemeriksaan & Pemasangan Pembaruan `.apk` Internal | `AC-14-01..03` | `BR-26` | Tabel `rilis_aplikasi`, Bucket Privat Supabase Storage, `GET /api/rilis-terbaru`, `NF-14` |
| Transparansi antrean transaksi, audit log, tampilan 1:1 Web, & parameter pool | `US-09`, `US-16`, `US-17` (P1) | Filter Transaksi/Log/Istilah, *Liquid Glass* & *Obsidian*, serta Pengaturan Pool | `AC-09-01..03`, `AC-16-01..03`, `AC-17-01..03` | `BR-04`, `BR-05`, `BR-11`, `BR-15`, `BR-17`, `BR-19`, `BR-20` | `PATCH /api/pengaturan`, Sistem Token Compose `PastiCuanTheme` & `PastiCuanIcons`, `NF-08` |

---

## 2.3 Alur Pengguna (User Flow & Use Cases)

### Alur Utama (Happy Path)
1. **UC-POS-001 (Cek Posisi Mandiri di HP Android):** Anggota mengetuk ikon **Pasti Cuan** → sesi diverifikasi → Beranda langsung menampilkan sapaan, stempel waktu 2 bagian, nilai bersih *live*, grafik interaktif adaptif (`Setoran Terakhir` muncul bila setor `> 1x`), dan 3 kartu rincian; berpindah ke tab **Pool** menampilkan Isi Wallet, porsi semua anggota, dan status `"Semua cek lolos"`. *(Efek samping: memperbarui cadangan lokal offline & mencatat kunjungan mingguan anggota di sistem).*
2. **UC-TRK-001 (Simulasi, Pengajuan, & Pencocokan Penarikan pada Waktu Transfer):** Investor membuka halaman fokus `Tarik` (tanpa navbar bawah), mengetik nominal / `Tarik semua`, mengetuk tombol alamat dompet tersimpan, menyetujui lembar konfirmasi `"Tarik US$...?"` → status `Menunggu` di tab `Transaksi` → Pengelola mengirim dana dari dompet asli → sistem mendeteksi transfer keluar dalam `<= 5 menit` dan menetralkannya sementara dari `NAV Live` (`BR-19`) → Pengelola mencocokkan arus tersebut ke permintaan tarik di **Kelola → Arus onchain** (`US-13`) → transaksi **langsung selesai dan memotong unit tepat pada menit transfer tersebut** (`BR-18`) serta memindahkan unit fee ke Pengelola (`BR-06`).
3. **UC-STR-001 (Salin Alamat, Pengajuan Setor, & Pencocokan Waktu Transfer):** Investor menyalin alamat dompet pool di halaman fokus `Setor`, mengirim `SOL`/`USDC` via jaringan Solana, lalu mengirim form setoran (`Menunggu`) → Pengelola mencocokkan arus masuk di **Kelola → Arus onchain** (`US-13`) → unit baru langsung diterbitkan memakai harga unit pada menit transfer terjadi (`BR-03`, `BR-18`).
4. **UC-VAL-001 (Siklus Pembacaan Otomatis 1 Menit & Deteksi Arus 5 Menit):** Sistem membaca posisi likuiditas + saldo dompet + harga pasar setiap 1 menit (`BR-17`), memeriksa tanda transaksi baru setiap 5 menit (`BR-19`), dan mencatat pembacaan berhasil pertama `>= 08.00 WIB` sebagai `Snapshot` resmi harian (`BR-18`).
5. **UC-UPD-001 (Pembaruan Aplikasi Internal):** Anggota mengetuk `Perbarui` pada pita rilis baru → aplikasi mengunduh berkas `.apk` dari tautan resmi proyek, memverifikasi keutuhan berkas, dan memasang pembaruan di atas aplikasi lama tanpa kehilangan sesi masuk (`US-14`).

### Alur Balik (Reverse Flow)
- **UC-REV-001 (Batal Permintaan oleh Investor):** Pemilik permintaan membatalkan pengajuan yang masih `Menunggu` melalui lembar konfirmasi `"Batalkan permintaan?"` → status menjadi `Dibatalkan` (`BR-13`) dan kuota pengajuan terbuka kembali.
- **UC-REV-002 (Penolakan oleh Pengelola):** Pengelola menolak permintaan `Menunggu` di **Kelola → Permintaan** disertai alasan wajib → status menjadi `Ditolak` tanpa mengubah unit.
- **UC-REV-003 (Koreksi Snapshot / Pembatalan Tanda Arus / Batal Ubah Pengaturan):** Pengelola mengubah snapshot ber-alasan (`US-02B`) atau membatalkan penandaan arus yang belum mengikat snapshot/transaksi selesai (`US-13`) → mesin hitung menghitung ulang seluruh kejadian sesudahnya secara kronologis (`BR-11`) dan mencatat `nilai_lama → nilai_baru` ke Log perubahan.

### Alur Cabang & Kasus Batas (Edge Cases & Exception Paths)

| Skenario | Pemicu | Perilaku Sistem yang Diharapkan |
|---|---|---|
| **Gangguan Pembaca Otomatis (`UC-BRN-001`)** | Pembacaan dompet 1 menit tertunda / gagal | Menit gagal dilewati tanpa angka tebakan; `> 15 menit` mengubah jam header menjadi warna peringatan, `> 60 menit` memunculkan banner kuning gangguan (`BR-20`), dan lewat `08.30 WIB` tanpa snapshot memunculkan tombol `Isi manual` di pusat `Kelola` (`US-02A`). |
| **Pelanggaran Konsistensi (`UC-BRN-002`)** | Salah satu dari 5 syarat `BR-12` tidak terpenuhi | Muncul banner kuning tidak bisa ditutup pada seluruh anggota dan form `Tarik` dikunci sementara sampai Pengelola mencocokkan arus tertinggal atau memperbaiki koreksi. |
| **Perangkat Tanpa Sinyal (`UC-BRN-003`)** | Ponsel kehilangan koneksi internet | Data posisi & grafik terakhir tampil `< 300 ms` dari simpanan lokal HP disertai banner gelap offline; tombol `Setor`, `Tarik`, dan seluruh aksi tulis dikunci nonaktif. |
| **Nilai Berubah Saat Konfirmasi Tarik** | Pembacaan menit baru menggeser nilai bersih `> US$0,004` saat lembar konfirmasi tarik sedang terbuka | Lembar konfirmasi ditutup otomatis dengan pesan `"Angka baru saja diperbarui. Cek lagi simulasi kamu."` |

### Interaksi Banyak Pengguna (Multi-User Interaction)
- Seluruh transaksi dievaluasi berurutan secara kronologis berdasarkan waktu efektifnya (milidetik waktu transfer untuk pencocokan arus onchain, atau jam snapshot untuk transaksi manual/impor). Perubahan atau pembatalan permintaan yang sudah diproses pihak lain ditolak bersih dengan pesan muat ulang daftar (`409 Konflik`).

---

## 2.4 Aturan Bisnis (Business Rules)

### Ringkasan Aturan Bisnis Teruji (`BR-01` s.d. `BR-26` — Selaras Mesin Hitung Produksi)

| ID | Pemicu | Kondisi & Hasil yang Ditegakkan Sistem |
|---|---|---|
| **BR-01** | Snapshot awal (`16 Okt 2026`) | `1 unit = US$1,00` pada awal pool (`US$100,00 = 100 unit`). |
| **BR-02** | Snapshot harian disimpan | `NAV_USD = (nilai_pool_usd − arus_bersih_snapshot) / unit_sebelum_arus`; `NAV_SOL = NAV_USD / harga_sol_usd`. |
| **BR-03** | Setoran selesai dikonfirmasi | `unit_dibeli = jumlah_final_usd / NAV_saat_efektif`; modal dasar USD bertambah `jumlah_final_usd`, modal dasar SOL bertambah `jumlah_final_usd / harga_sol_saat_efektif`. |
| **BR-04** | Perhitungan posisi investor | `profit_usd = nilai_kotor_usd − modal_dasar_usd`; `fee_terutang_usd = fee_persen × max(0, profit_usd)` (default `10%`). Unit milik Pengelola bebas fee dan bermodal dasar `0`. |
| **BR-05** | Pengaturan satuan dasar fee | Default `USD` (untung SOL saat USD rugi tidak dikenai fee; opsi `SOL` dapat dipilih di `US-17` bila kesepakatan grup berubah). |
| **BR-06** | Penarikan bersih `W` (`0 < W <= N`) | Proporsi `f = W / N`. Unit investor berkurang `f × unit`; modal dasar USD & SOL berkurang `f × modal`; unit keluar dari pool = `W / NAV`; selisih unit fee `(f × unit) − (W / NAV)` berpindah menambah unit Pengelola. |
| **BR-07** | Pengajuan tarik | Bebas sebagian atau seluruhnya kapan saja tanpa batas minimal nominal maupun hari mengendap. |
| **BR-08** | Antrean permintaan | Maksimal `1` permintaan `Menunggu` per investor untuk `Setor` dan `1` untuk `Tarik`. |
| **BR-09** | Penyelesaian tarik | Ditolak bila `W > nilai_bersih` pada waktu efektifnya (toleransi pembulatan `US$0,005`). |
| **BR-10** | Acuan nilai transaksi selesai | Transaksi hasil pencocokan arus dompet memakai pembacaan nilai terdekat pada/sebelum waktu transfer; transaksi manual/impor wajib memiliki `snapshot` pada tanggal efektifnya. |
| **BR-11** | Perubahan data masa lalu / pengaturan | Menghitung ulang seluruh keadaan sesudahnya secara kronologis dan mencatat ke Log perubahan. |
| **BR-12** | Pemeriksaan 5 invarian data | Wajib lolos: (a) unit `>= 0`; (b) tarik `<= nilai_bersih` waktu efektif; (c) setiap transaksi selesai punya acuan snapshot atau pembacaan nilai; (d) total nilai anggota + pengelola = nilai pool (`±US$0,01`); (e) tidak ada arus `Belum dicocokkan` mendahului snapshot resmi terakhir. Gagal = banner kuning & kunci pengajuan tarik baru. |
| **BR-13** | Pembatalan oleh investor | Hanya diizinkan bagi pemilik permintaan dan hanya selama status masih `Menunggu`. |
| **BR-14** | Format angka & zona waktu | Format Indonesia (`US$1.234,56`, `10,8461 SOL`, `39,19%`), tanda minus `−` (`U+2212`), digit `tabular-nums`, semua stempel waktu dalam `WIB (+07:00)`. |
| **BR-15** | Pengaman data berhenti penuh | Banner `"data terakhir diperbarui N hari lalu"` tampil bila pembacaan otomatis maupun snapshot sama-sama berhenti melampaui `batas_data_lama_hari` (default `2 hari`, `OQ-04`). |
| **BR-16** | Perhitungan untung/rugi rentang | Mengeluarkan arus setor/tarik dari perubahan nilai antar-titik (termasuk pengelompokan batch transaksi onchain & penanganan investor yang gabung belakangan pada rentang `Semua`). |
| **BR-17** | Pembacaan otomatis tiap 1 menit | Menghitung jumlah token posisi Meteora DLMM + fee belum klaim + saldo SOL/token likuid (`>= ambang_likuiditas_token_usd`, default `US$10.000`) dikali harga Jupiter pada menit yang sama; menit gagal dilewati tanpa angka tebakan. |
| **BR-18** | Snapshot `08.00 WIB` & Waktu Transfer | Pembacaan berhasil pertama `>= 08.00 WIB` menjadi snapshot harian `Otomatis`. Transaksi yang dicocokkan ke arus dompet (`US-13`) langsung efektif pada waktu transfer memakai pembacaan nilai terdekat saat itu (tidak menunggu `08.00 WIB` besok). |
| **BR-19** | Deteksi & penetralan arus `Belum dicocokkan` | Deteksi transfer luar berjalan tiap 5 menit (`< ambang_dust_usd` otomatis ditandai `Bukan arus`). Selama status arus masih `Belum dicocokkan`, nilainya dinetralkan dari `Nilai Disesuaikan` untuk `NAV Live`; begitu dicocokkan, unit langsung berubah sehingga tidak dinetralkan ganda. Angka besar Pool selalu `Isi Wallet`. |
| **BR-20** | Usia nilai *live* | `> batas_live_lama_menit` (default `15 menit`): jam pembaruan diberi warna peringatan; `> 60 menit`: tampil banner kuning gangguan pembacaan wallet. |
| **BR-21** | Kerapatan grafik & rentang adaptif | Rentang: `24J` (per 5m, `<= 288` titik), `7H` (per 30m, `<= 336` titik), `Setoran Terakhir` (adaptif hanya tampil bila setoran selesai `> 1`), dan `Semua` (`<= 365` titik). Retensi: `1m` (7 hari) → `15m` (90 hari) → `1h` (selamanya). |
| **BR-22** | Mode `Bandingkan` | Dua garis persen mulai `0%` dengan label sumbu persen di kanan grafik, titik bulat di kedua ujung garis (`USD` garis penuh & `SOL` garis putus-putus), dan dua angka besar berdampingan di atas grafik. |
| **BR-23** | Interaksi *scrub* grafik | Geser horizontal memilih titik terdekat (*snap*), memperbarui angka utama, persen, waktu, dan chip transaksi tanpa tooltip melayang; lepas jari kembali ke nilai *live*; geser vertikal tetap menggulir layar. |
| **BR-24** | Rekonstruksi & estimasi riwayat | Riwayat sebelum `17 Nov 2026` direkonstruksi dari transaksi dompet & harga pasar per jam (`PEPE/SOL` `16–22 Okt`, `DOGE/SOL` `22 Okt+`); selang estimasi diberi keterangan `"Sebelum [tanggal]: estimasi per jam"` dan chip `"Estimasi dari harga pasar per jam"`. |
| **BR-25** | Penanda Mode Simulasi / Prototype | Saat berjalan memakai data contoh lokal (sebelum terhubung server produksi), aplikasi menampilkan pil pemilih akun/peran simulasi di tepi atas layar agar mudah diuji dan tidak dikira saldo nyata. |
| **BR-26** | Pembaruan `.apk` internal | Memeriksa versi rilis terbaru saat online; mendukung pembaruan opsional dan batas versi minimum wajib dari penyimpanan privat proyek dengan verifikasi keutuhan berkas serta kunci tanda tangan rilis yang konsisten. |

---

### Otorisasi / Hak Akses (RBAC) & Privasi Data

| Aksi | Investor | Pengelola | Kondisi & Aturan Privasi Produksi |
|---|---|---|---|
| Masuk aplikasi, lihat Beranda & Pool | ✅ | ✅ | Hanya email terdaftar dengan `aktif = true`. |
| Lihat daftar seluruh permintaan setor/tarik | ✅ | ✅ | **Terbuka untuk semua anggota aktif** dilengkapi penyaring `Semua anggota \| Milik saya` (`OQ-07`). |
| Lihat `email` & `alamat_wallet` anggota lain | ❌ | ✅ | **Sanitasi privasi:** Investor hanya menerima `email` & `alamat_wallet` miliknya sendiri; milik anggota lain dikosongkan oleh server. |
| Lihat detail `alamat_lawan` & `catatan` arus dompet | ❌ | ✅ | Investor hanya menerima waktu & nilai arus untuk penanda titik grafik; detail alamat lawan khusus Pengelola. |
| Ajukan permintaan setor / tarik | ✅ | ✅ | Hanya atas nama akun sendiri; maks. 1 `Menunggu` per jenis (`BR-08`). |
| Batalkan permintaan setor / tarik | Bersyarat | Bersyarat | Hanya pemilik permintaan dan hanya saat status `Menunggu` (`BR-13`). |
| Konfirmasi / selesaikan / tolak permintaan | ❌ | ✅ | Khusus Pengelola (tab ke-5 **Kelola** muncul khusus Pengelola). |
| Isi manual / koreksi / hapus snapshot & pantau pembaca wallet | ❌ | ✅ | Khusus Pengelola (`hapus` ditolak bila mengikat transaksi selesai). |
| Tandai / batalkan tanda arus dompet | ❌ | ✅ | Khusus Pengelola (`US-13`). |
| Tambah anggota, ubah `alamat_wallet[]`, & nonaktifkan/aktifkan anggota | ❌ | ✅ | Khusus Pengelola (`nonaktifkan` ditolak bila `unit > 0`; email akun eksisting tidak diubah sesuai `OQ-18`). |
| Ubah pengaturan & ambang parameter pool | ❌ | ✅ | Khusus Pengelola melalui lembar konfirmasi hitung ulang (`US-17`). |
| Lihat Log perubahan (`Semua \| Saldo \| Permintaan \| Anggota`) | ✅ | ✅ | Terbuka bagi seluruh anggota aktif. |
| Mengubah atau menghapus Log perubahan | ❌ | ❌ | **Dilarang mutlak bagi semua peran** (*immutable*). |

---

### Jejak Audit, Sumber Kebenaran Data, & Cadangan
- **Jejak Audit:** Setiap penambahan, perubahan, atau penghapusan pada saldo harian, permintaan, anggota, pengaturan pool, maupun penandaan arus dompet menghasilkan entri permanen dengan rekaman `nilai_lama → nilai_baru` yang tak dapat dihapus siapa pun.
- **Sumber Kebenaran Data:** Nilai posisi & dompet berasal dari pembacaan otomatis tiap 1 menit, arus transfer dari pemeriksaan tiap 5 menit, dan kepemilikan unit dari rangkaian snapshot + transaksi selesai yang dievaluasi mesin hitung.
- **Cadangan:** Cadangan basis data terenkripsi `AES-256` berjalan otomatis setiap minggu di repositori proyek (`NF-06`).

---

## 2.5 Validasi NSM melalui Story P0

### Rujukan Metrik Section 1 (Tanpa Mendefinisikan Ulang)
- **NSM (1):** `Anggota Aktif Cek Mandiri Mingguan` (Target disetujui: `100%` / `5/5` anggota aktif per minggu)
- **Leading (1):** `Adopsi Pemasangan Aplikasi Android` (`5/5` dalam `7 hari`)
- **Counter (1):** `Koreksi Data Bulanan` (`<= 1` koreksi berdampak `>= US$0,01` per bulan)

### Kontribusi Story P0 terhadap Leading Metric & NSM

| Story P0 | Perubahan Perilaku Pengguna | Kontribusi ke Leading / NSM | Sinyal Bukti Terukur |
|---|---|---|---|
| `US-07A`, `US-14` | Anggota memasang `.apk` internal, masuk 1 ketuk dengan Google, dan selalu berada di versi terbaru | Mendorong langsung **Leading Metric** pemasangan & aktivasi `5/5` | Sesi masuk aktif dari klien Android & kecocokan kode versi rilis |
| `US-12`, `US-01`, `US-08`, `US-05` | Anggota membuka aplikasi tiap minggu untuk mengecek nilai *live*, grafik `Setoran Terakhir`, & porsi pool tanpa bertanya di chat | Menggerakkan langsung **NSM** cek mandiri mingguan | Baris mingguan per anggota pada tabel `kunjungan_mingguan` (`platform = 'android'`) |
| `US-03A/B`, `US-04A/B`, `US-13`, `US-02A/B` | Setor/tarik disimulasikan di muka dan langsung dinilai tepat pada menit transfer tanpa salah hitung manual | Menjaga **Counter Metric** `Koreksi Data <= 1/bulan` agar angka tetap dipercaya | Jumlah entri revisi berdampak finansial pada `log_audit` bulanan |

### Pemeriksaan Kausalitas & Faktor Pengganggu (Causality & Confounder Check)

| Hubungan | Mengapa Kausal (Bukan Kebetulan) | Faktor Pengganggu Utama (*Confounder*) | Mitigasi |
|---|---|---|---|
| `P0 Android` → `Leading 5/5` → `NSM 5/5` | Ikon langsung di layar HP + cache offline `< 300 ms` + tampilan 1:1 yang sudah akrab memangkas hambatan buka peramban sehingga anggota langsung mengecek sendiri saat pasar bergerak | Pasar kripto sedang datar sehingga anggota jarang mengecek, atau anggota masih membuka lewat tautan web lama | Mencatat `platform` (`android` vs `web`) di `kunjungan_mingguan` untuk memisahkan adopsi Android murni dari akses web |

### Aturan Keputusan Rilis (Launch / Iterate / Rollback)
- Jika dalam `7 hari` setelah pembagian `.apk` `v1.0` terdapat anggota aktif yang gagal memasang atau gagal masuk (`Leading < 100%`), perbaiki hambatan instalasi/autentikasi sebelum memulai pengerjaan `v1.1`.
- Jika adopsi instalasi sudah `100%` namun **NSM** mingguan `< 100%` setelah `4 minggu` karena anggota masih bertanya manual atau kembali ke web, evaluasi kecepatan muat Beranda dan kejelasan tampilan sebelum menambah fitur baru.
- Jika **Counter Metric** melampaui `1 koreksi/bulan` atau ditemukan selisih `>= US$0,01` antara perhitungan klien Android dan mesin hitung server utama, bekukan aksi transaksi di Android melalui batas versi minimum wajib (`US-14`) dan selaraskan segera.

---

# Section 3: How & Next

> **Konteks Monorepo & Arsitektur Produksi (per 18 Nov 2026):** Seluruh kode aplikasi Web, Route Handlers Next.js, skema migrasi Supabase PostgreSQL (`ap-southeast-1`), Edge Function `baca-wallet` (`pg_cron` 1 menit), workflow backup terenkripsi `AES-256`, serta kode **Native Android (`android-app/`)** kini disatukan dalam satu repositori **`s:\Projek Iseng\pasti-cuan-app`**. Aplikasi Android memakai ulang **satu backend produksi yang sama** dengan tambahan adaptasi autentikasi `Bearer` tipis dan penyimpanan rilis di Supabase Storage.

## 3.1 Entitas Backend & Kontrak Domain Utama

### Model Domain & Strategi Berbagi Backend (*Shared Backend*)
- **Satu sumber kebenaran:** Klien Native Android dan aplikasi Web membaca serta menulis ke proyek Supabase `pasti-cuan` yang sama.
- **Jalur komunikasi API terpadu:**
  - Aplikasi Android masuk menggunakan Google Sign-In native (`Credential Manager` → `signInWithIdToken` Supabase Auth) untuk memperoleh `access_token` sesi.
  - Seluruh pembacaan dan penulisan memanggil **Route Handlers `/api/*` di produksi** dengan header `Authorization: Bearer <access_token>` dan `X-Client-Platform: android`. Dengan demikian, **100% perhitungan `src/lib/engine.ts` (`decimal.js` 30 digit), validasi bisnis server, dan sanitasi privasi payload dipakai bersama di satu pintu**.
  - Untuk simulasi tarik instan saat mengetik (`US-04A`), perhitungan seri grafik lokal (`seriRentang`), dan Mode Simulasi M1/M2, modul `PoolEngine.kt` di `android-app` dijaga identik secara matematis (`selisih US$0,00`) terhadap `src/lib/engine.ts` dan diuji otomatis lewat `PoolEngineTest.kt`.

---

### Skema Basis Data Produksi Aktual + Migrasi Tambahan `v1.0` Android

**A. 8 Tabel Produksi yang Sudah Berjalan (`202611170001_initial_schema.sql` — Tidak Dirombak):**

| Tabel Eksisting | Kolom & Aturan Aktual di Produksi | Relasi & Catatan |
|---|---|---|
| **`anggota`** | `id` (uuid PK), `auth_user_id` (uuid unik FK `auth.users`), `nama` (text unik case-insensitive, `2..40` kar, auto-trim trigger), `email` (text unik huruf kecil), `peran` (`investor`\|`pengelola`), `alamat_wallet` (text[] default `'{}'`), `aktif` (bool default `true`), `dibuat_pada` (timestamptz) | RLS: `SELECT` anggota aktif; sanitasi `email` & `alamat_wallet` anggota lain dilakukan di `/api/posisi` untuk non-pengelola. `PATCH /api/anggota/[id]` mengubah `alamat_wallet` & `aktif` tanpa mengubah `email`. |
| **`pengaturan_pool`** | `id` (`1`), `nama_pool` (`'Pasti Cuan'`), `tanggal_mulai` (`2026-10-16`), `fee_persen` (`0.1000`), `satuan_dasar_fee` (`USD`\|`SOL`), `batas_data_lama_hari` (`2`), `ambang_lonjakan_persen` (`30`), `zona_waktu` (`Asia/Jakarta`), `alamat_wallet_pool`, `jam_snapshot_otomatis` (`08:00:00`), `ambang_likuiditas_token_usd` (`10000`), `ambang_dust_usd` (`1`), `batas_live_lama_menit` (`15`), `toleransi_cocok_persen` (`2`), `last_signature` (text), `last_flow_check_at` (timestamptz), `diubah_pada` | Trigger audit mengabaikan update teknis `last_signature` & `last_flow_check_at`. Dikelola lewat `PATCH /api/pengaturan` (`US-17`). |
| **`titik_nilai`** | `id` (bigserial PK), `dibaca_pada` (timestamptz), `resolusi` (`1m`\|`15m`\|`1h`, unik bersama `dibaca_pada`), `sumber` (`baca`\|`estimasi`), `nilai_usd` (numeric(14,2) `> 0`), `saldo_sol` (numeric(24,9) `> 0`), `harga_sol_usd` (numeric(14,6) `> 0`), `rincian` (jsonb), `dibuat_pada` | Fungsi `ringkas_titik_nilai()` berjalan tiap `03.00 WIB` meringkas `1m (> 7h)` → `15m` dan `15m (> 90h)` → `1h` tanpa menghapus titik yang diikat `snapshot` atau `permintaan`. |
| **`snapshot`** | `id` (uuid PK), `tanggal` (date unik `>= 2026-10-16`), `nilai_usd` (numeric(14,2)), `saldo_sol` (numeric(24,9)), `harga_sol_usd` (generated stored `nilai_usd / saldo_sol`), `fee_lp_diklaim_sol`, `catatan` (`<= 500`), `alasan` (`<= 500`), `sumber` (`otomatis`\|`manual`\|`koreksi`\|`impor`), `titik_nilai_id` (FK), `dibuat_oleh`, `dibuat_pada`, `diubah_pada` | Diacu oleh transaksi manual/impor (`ON DELETE RESTRICT`). |
| **`permintaan`** | `id` (uuid PK), `anggota_id` (FK `anggota`), `jenis` (`setor`\|`tarik`), `jumlah_usd` (numeric(14,2)), `tanggal_transfer` (date), `alamat_wallet_tujuan` (`<= 64`), `bukti_transaksi` (`<= 100`), `catatan` (`<= 200`), `status` (`menunggu`\|`selesai`\|`ditolak`\|`dibatalkan`), `alasan`, `tanggal_efektif` (date FK `snapshot`), `waktu_efektif` (timestamptz), `titik_nilai_id` (bigint FK `titik_nilai` ON DELETE RESTRICT), `jumlah_final_usd`, `sumber` (`app`\|`impor`), `dibuat_oleh`, `diproses_oleh`, `diproses_pada`, `dibuat_pada` | Partial unique index `(anggota_id, jenis) WHERE status = 'menunggu'`. RLS `SELECT` terbuka bagi seluruh anggota aktif (`OQ-07`). |
| **`arus_onchain`** | `id` (uuid PK), `signature` (text), `urutan` (int, unik bersama `signature`), `waktu` (timestamptz), `arah` (`masuk`\|`keluar`), `mint` (text), `simbol` (text), `jumlah` (numeric(30,9)), `nilai_usd` (numeric(14,2)), `alamat_lawan`, `status` (`belum`\|`dicocokkan`\|`biaya`\|`bukan_arus`), `permintaan_id` (FK), `catatan` (`<= 200`), `alasan_selisih` (`<= 200`), `ditandai_oleh`, `ditandai_pada`, `dibuat_pada` | RLS `SELECT` & `UPDATE` dibatasi khusus Pengelola (`is_pengelola()`). |
| **`log_audit`** | `id` (bigserial PK), `tabel`, `aksi` (`insert`\|`update`\|`delete`), `baris_id` (uuid), `nilai_lama` (jsonb), `nilai_baru` (jsonb), `oleh` (FK `anggota`), `pada` (timestamptz) | *Immutable*: diisi trigger `catat_log_audit()`, tanpa policy `UPDATE`/`DELETE`. |
| **`job_log`** | `id` (bigserial PK), `job_name` (text), `status` (`ok`\|`skip`\|`error`), `detail` (jsonb), `dibuat_pada` (timestamptz) | Pencatat eksekusi internal Edge Function `baca-wallet`. |

**B. Migrasi Tambahan Resmi pada Tahap Integrasi `v1.0` (`supabase/migrations/` + Supabase Storage):**

| Entitas / Bucket Baru | Kolom / Konfigurasi & Aturan | Kegunaan |
|---|---|---|
| **Bucket Privat `rilis-apk`** *(Supabase Storage `pasti-cuan`)* | `public = false`, batas ukuran objek `25 MB`, tipe MIME `application/vnd.android.package-archive`, hanya dapat diunggah oleh admin/pengelola dan diunduh via *Signed URL* `15 menit` | Menyimpan berkas `.apk` rilis internal dalam satu ekosistem Supabase proyek (`OQ-17`, `US-14`). |
| **`rilis_aplikasi`** | `kode_versi` (int PK `>= 1`), `nama_versi` (text, mis. `"1.0.0"`), `kode_versi_minimum_wajib` (int `<= kode_versi`), `object_path` (text path di bucket `rilis-apk`), `sha256_checksum` (text 64 hex), `ukuran_bytes` (bigint), `catatan_rilis` (text `<= 160` kar), `dirilis_pada` (timestamptz default `now()`) | Metadata pemeriksaan & verifikasi keutuhan `.apk` internal (`US-14`, `BR-26`). RLS `SELECT` untuk anggota aktif. |
| **`kunjungan_mingguan`** | `anggota_id` (uuid FK `anggota` ON DELETE CASCADE), `minggu_iso` (text format `IYYY-"W"IW` WIB, mis. `"2026-W47"`), `platform` (`android`\|`web`), `pertama_buka_pada` (timestamptz default `now()`), `terakhir_buka_pada` (timestamptz default `now()`), `jumlah_muat` (int default `1`), PK `(anggota_id, minggu_iso, platform)` | Sumber pengukuran otomatis **NSM** `Anggota Aktif Cek Mandiri Mingguan` yang memisahkan akses Android vs Web (`1.4`, `2.5`). |

---

### Kontrak API Aktif + Adaptasi Backend `v1.0` untuk Klien Android

> **Catatan Pembersihan Endpoint Warisan & Paket Adaptasi `v1.0`:**
> 1. Enam grup endpoint warisan PRD Web awal yang tidak dipakai klien (`GET /api/riwayat`, `POST /api/simulasi-tarik`, `GET /api/permintaan`, `GET /api/arus-onchain`, `GET /api/audit`, serta `/api/impor`) **tidak digunakan oleh aplikasi Android**; seluruh pembacaan terpusat di `GET /api/posisi`.
> 2. Saat masuk tahap integrasi `v1.0` (Milestone M3), helper `requireMember()` pada `src/lib/server/auth.ts` diperluas sedikit agar memeriksa header `Authorization: Bearer <access_token>` (via `supabaseAdmin.auth.getUser(token)`) apabila cookie peramban tidak ada, sehingga seluruh Route Handlers `/api/*` di bawah langsung melayani Web maupun Native Android secara identik.

Seluruh endpoint mengembalikan format error `{ kode, pesan, detail? }` yang seragam:

| # | Method & Endpoint | Request Utama | Response Utama & Perilaku | Story Terkait |
|---|---|---|---|---|
| **1** | `GET /api/posisi` | Header `Authorization: Bearer <token>` (Android) atau Cookie (Web), + header opsional `X-Client-Platform: android\|web` | `{ saya, tanggal_data, versi_data, sekarang, data: { anggota (tersanitasi), snapshots, permintaan, arus (tersanitasi), estimasi, log, pengaturan }, titik, arusBelumCount, jobLog, hasil, resmi }` + melakukan *upsert* ringan ke `kunjungan_mingguan` sesuai `X-Client-Platform`. | `US-01`, `US-05`, `US-08`, `US-09`, `US-12` |
| **2** | `POST /api/snapshot` | `{ tanggal, nilai_usd, saldo_sol, fee_lp_diklaim_sol?, catatan?, konfirmasi_lonjakan? }` | `{ snapshot, peringatanLonjakan?, cek }` (`400 VALIDASI`, `409 KONFLIK` duplikat, `422 ATURAN_BISNIS`) | `US-02A` |
| **3** | `PATCH` & `DELETE /api/snapshot/[tanggal]` | `{ nilai_usd, saldo_sol, fee_lp_diklaim_sol?, catatan?, alasan?, konfirmasi_hitung_ulang? }` / param `tanggal` | `{ snapshot, cek }` / `204` (`422` bila snapshot mengikat transaksi selesai atau melanggar `BR-09`) | `US-02B` |
| **4** | `POST /api/permintaan` | `{ jenis, jumlah_usd, tanggal_transfer?, bukti_transaksi?, alamat_wallet_tujuan?, catatan? }` | `{ permintaan }` (`409 KONFLIK` bila masih ada `menunggu` sejenis `BR-08`) | `US-03A`, `US-04A` |
| **5** | `POST /api/permintaan/[id]/batal`, `/selesai`, `/tolak` | Aksi sesuai peran (`tanggal_efektif`, `jumlah_final_usd`, `bukti_transaksi?`, `alasan?`) | `{ permintaan }` (`403 TIDAK_BERHAK`, `409 KONFLIK`, `422 ATURAN_BISNIS`) | `US-03A/B`, `US-04A/B` |
| **6** | `POST` & `DELETE /api/arus-onchain/tandai` | `{ ids[], status: 'dicocokkan'\|'buat'\|'biaya'\|'bukan_arus', permintaan_id?, anggota_id?, catatan?, alasan_selisih? }` / `?id=` saat `DELETE` | Mencocokkan/membuat permintaan selesai langsung pada `waktu_efektif` transfer (`BR-18`) atau membatalkan penandaan | `US-13` |
| **7** | `POST /api/anggota` & `PATCH /api/anggota/[id]` | `POST`: `{ nama, email, peran, alamat_wallet[]? }`; `PATCH`: `{ alamat_wallet[]?, aktif? }` | `{ anggota }` (`422 ATURAN_BISNIS` bila menonaktifkan anggota yang masih punya `unit > 0`) | `US-07B` |
| **8** | `PATCH /api/pengaturan` | `{ fee_persen?, satuan_dasar_fee?, batas_data_lama_hari?, ambang_lonjakan_persen?, ambang_likuiditas_token_usd?, ambang_dust_usd?, batas_live_lama_menit?, toleransi_cocok_persen? }` | `{ pengaturan }` + memicu evaluasi ulang posisi & pencatatan `log_audit` | `US-17` |
| **9** | Edge Function `baca-wallet` *(internal)* | Header `x-cron-secret` dari Vault (`* * * * *`) | Membaca Meteora + Helius RPC + Jupiter tiap 1m, deteksi arus tiap 5m, snapshot otomatis `08.00 WIB` | Mandiri di Supabase |
| **10** | `GET /api/rilis-terbaru?kode_versi=<int>` *(Baru `v1.0`)* | Header `Authorization: Bearer <token>` + query `kode_versi` (int) | `{ kode_versi_terbaru, nama_versi, kode_versi_minimum_wajib, status_update: 'terbaru'\|'opsional'\|'wajib', catatan_rilis, sha256_checksum, ukuran_bytes, tautan_unduh_apk (Signed URL 15m dari bucket privat rilis-apk) }` | `US-14` (`BR-26`) |

---

### Mesin Status (Status Machine)

```text
Permintaan:
  [Baru] --(Investor ajukan)--> [menunggu] --(Dicocokkan arus waktu transfer US-13 / Pengelola selesai)--> [selesai]
                                    |  \-----(Pengelola tolak + alasan wajib)----------------------------> [ditolak]
                                    \--------(Investor pemilik batalkan)---------------------------------> [dibatalkan]

Arus Onchain:
  (Transfer >= ambang_dust) --> [belum] --(Pengelola tandai US-13)--> [dicocokkan] (mengunci waktu_efektif & menyelesaikan permintaan)
                                   |                              \-> [biaya] / [bukan_arus] (wajib catatan; dapat dibatalkan sebelum mengikat snapshot)
  (Dust < ambang_dust)      ----------------------------------------> [bukan_arus] (otomatis)
```

---

## 3.2 Halaman Utama Aplikasi Android & Aturan Navigasi

### Daftar Rute Layar & Perilaku Navigasi (Paritas 1:1 dengan `Shell.tsx` & `DESIGN.md`)

| Rute Layar Android (`AppRoute`) | Fungsi Utama | Aturan Kapsul Navigasi Bawah & Bar Atas | Visibilitas Peran |
|---|---|---|---|
| `MASUK` | Masuk dengan akun Google terdaftar (`v1.0`) | Tanpa kapsul navigasi bawah | Semua (sebelum masuk) |
| `BERANDA` | Kartu Tugas Pengelola (bila Pengelola) + Kartu 1 Grafik Adaptif + Kartu 2 Asal Nilai + Kartu 3 Porsi + Kartu 4 Dalam SOL | Header Sapaan + Stempel 2 bagian + Avatar (`→ LAINNYA`); **kapsul navigasi tampil** (tab `Beranda` menyala) | Semua |
| `POOL` | Kartu Grafik Saldo Pool (Isi Wallet + tombol info rekonsiliasi) + Kartu Posisi Semua Anggota + Kartu Cek Data | Header `"Pool"` + Stempel 2 bagian + Avatar; **kapsul navigasi tampil** (tab `Pool` menyala) | Semua |
| `TRANSAKSI` | Toggle `Semua anggota \| Milik saya` + 3 tab `Semua \| Menunggu \| Diproses` + daftar permintaan + kartu pintasan ke `LOG` | Header `"Transaksi"` (tanpa stempel) + Avatar; **kapsul navigasi tampil** (tab `Transaksi` menyala) | Semua |
| `SETOR` | Kartu `"Cara kerjanya"` + salin alamat dompet Solana pool + form pengajuan setor (`US-03A`) | **Tanpa kapsul navigasi bawah** (halaman fokus uang, bar atas bertombol kembali bulat `44dp`) | Semua |
| `TARIK` | Kartu `"Bisa ditarik hari ini"` + form nominal + simulasi instan + tombol alamat tersimpan + lembar konfirmasi (`US-04A`) | **Tanpa kapsul navigasi bawah** (halaman fokus uang, bar atas bertombol kembali bulat `44dp`) | Semua |
| `KELOLA` *(Hub Pengelola)* | Kartu `"Yang perlu dikerjakan"` (termasuk deteksi gagal snapshot `08.30 WIB` & peringatan lonjakan) + Kartu `"Menu kelola"` (5 pintu sub-halaman) | Header `"Kelola"` + Stempel 2 bagian + Avatar; **kapsul navigasi 5-tab tampil** (tab `Kelola` menyala + badge `menunggu + arusBelum`) | Pengelola |
| `KELOLA_ARUS` | 3 tab `Belum dicocokkan \| Ditandai \| Semua` + saran pencocokan + lembar 4 mode penandaan & penggabungan multi-transfer (`US-13`) | Bar atas kembali bulat `44dp` (`→ KELOLA`); **kapsul navigasi tetap tampil** (tab induk `Kelola` menyala) | Pengelola |
| `KELOLA_SALDO` | Kartu `"Pembaca wallet"` (`% menit berhasil`) + form manual/koreksi (`Pakai angka ini`) + daftar 7/semua snapshot (`US-02A/B`) | Bar atas kembali bulat `44dp` (`→ KELOLA`); **kapsul navigasi tetap tampil** (tab induk `Kelola` menyala) | Pengelola |
| `KELOLA_PERMINTAAN` | 3 tab `Menunggu \| Diproses \| Semua` + lembar konfirmasi terima/selesai/tolak (`US-03B`, `US-04B`) | Bar atas kembali bulat `44dp` (`→ KELOLA`); **kapsul navigasi tetap tampil** (tab induk `Kelola` menyala) | Pengelola |
| `KELOLA_ANGGOTA` | Daftar anggota (`Ubah wallet`, `Nonaktifkan/Aktifkan`) + form `"Tambah anggota"` (`US-07B`) | Bar atas kembali bulat `44dp` (`→ KELOLA`); **kapsul navigasi tetap tampil** (tab induk `Kelola` menyala) | Pengelola |
| `KELOLA_PENGATURAN` | Kartu identitas pool + form 8 parameter pool + lembar konfirmasi `"Hitung ulang semua angka?"` (`US-17`) | Bar atas kembali bulat `44dp` (`→ KELOLA`); **kapsul navigasi tetap tampil** (tab induk `Kelola` menyala) | Pengelola |
| `LAINNYA` | Kartu profil + kartu Menu (`Status permintaan`, `Log perubahan`, `Kelola pool`, **Accordion *inline* `Tampilan`**, `Cek pembaruan`, `Keluar`) + kartu **12 `Arti istilah`** | Header `"Lainnya"` (tanpa stempel) + Avatar; **kapsul navigasi tampil** (tab `Lainnya` menyala) | Semua |
| `LOG` | Banner gembok imutabilitas + segmen kategori `Semua \| Saldo \| Permintaan \| Anggota` + kartu daftar perubahan `nilai_lama → nilai_baru` (`US-09`) | Bar atas kembali bulat `44dp` (`→ LAINNYA`); **kapsul navigasi tetap tampil** (tab induk `Lainnya` menyala) | Semua |

### Matriks State UI & Visibilitas
- Mengikuti standar [DESIGN.md](../../DESIGN.md) dan [globals.css](../../src/app/globals.css) tanpa penyimpangan:
  - **Loading:** 3 kartu `skeleton` statis tanpa animasi kedip/shimmer.
  - **Banner Status:** strip `16dp` di bawah header tanpa tombol tutup manual untuk `offline` (gelap), `cekGagal` (peringatan kuning), `live > 60m` (peringatan kuning), dan `dataLama` (peringatan kuning).
  - **Partial Error Grafik:** kotak `chart-empty` berlatar `field` (`#F1F3EF` / `#1E241C`) dengan tombol tonal `Coba lagi`.
  - **Lembar Konfirmasi:** *Bottom Sheet* sudut atas `24dp` dengan dua tombol sama lebar (kiri tonal batal, kanan primary limau atau danger merah).
  - **Mode Simulasi (`BR-25`):** pil tipis bergaris putus-putus di bagian paling atas tengah layar (`"Simulasi · [Nama] ([Peran])"`) seperti `.proto-btn` Web sehingga tidak memakan ruang kartu setiap halaman.

### Skala Data & Penyegaran Hemat Baterai
- Penyegaran otomatis `GET /api/posisi` setiap `60 detik` hanya berjalan saat aplikasi Android berada di *foreground* (`Lifecycle.State.STARTED/RESUMED`) dan dihentikan penuh saat layar mati atau aplikasi di latar belakang (`NF-15`).
- Query `titik_nilai` di server sudah mem-paginasi di atas batas `1.000` baris PostgREST; tampilan `Log perubahan` merender `50` entri terbaru per kategori saring.

---

## 3.3 Kebutuhan & Batasan Teknis

### Tumpukan Teknologi Klien Android (`pasti-cuan-app/android-app`)
- **Bahasa & UI:** **Kotlin 2.x** + **Jetpack Compose**, dikustomisasi penuh mengikuti sistem token [DESIGN.md](../../DESIGN.md) dan [globals.css](../../src/app/globals.css):
  - Palet Terang Kanvas Sage (`#E8EBE6`, kartu `#FFFFFF`) & Palet Gelap *Wise Forest Obsidian* (`#0C0F0B`, kartu `#151914` bertepi putih `6%`, segmen terpilih `#263D1A` + teks `#9FE870`).
  - Ikonografi garis tipis konsisten (`PastiCuanIcons.kt`, `stroke 2dp` setara Tabler Icons + vektor resmi logo Solana), sakelar kustom `GlassSwitch` (`46x28dp`), serta font **Inter** dibundle lokal (`400`, `500`, `600`, `700`, `800`) dengan `fontFeatureSettings = "tnum"`.
  - Kapsul navigasi bawah *Liquid Glass* bening terang di Mode Terang dan kristal gelap di Mode Gelap lengkap dengan kapsul indikator pegas yang mengembang halus saat berpindah atau digeser jari.
- **Autentikasi, Penyimpanan, & Pembaruan (`v1.0`) `[Usulan - perlu konfirmasi engineering]`:** `Credential Manager` (`GoogleIdTokenCredential` → sesi Supabase Auth), `DataStore` lokal terenkripsi untuk sesi & cache offline `GET /api/posisi`, serta pengunduh `HttpsURLConnection`/`OkHttp` + verifikasi `MessageDigest("SHA-256")` + `FileProvider` `ACTION_INSTALL_PACKAGE` (`US-14`).

### Non-Functional Requirements (NFR)

| ID | Kategori | Kebutuhan Terukur & Kondisi Pengujian |
|---|---|---|
| **NF-01** | Waktu Buka Dingin | *Cold start* aplikasi Android hingga kerangka/cache Beranda tampil `< 1.500 ms` (p90) di HP Android kelas menengah. |
| **NF-02** | Respons API | `GET /api/posisi` `< 500 ms` (p95) untuk `<= 1.000 snapshot` dan `<= 500 transaksi`. |
| **NF-03** | Paritas Akurasi | Selisih perhitungan `PoolEngine.kt` di Android terhadap `src/lib/engine.ts` = `US$0,00` (identik 100%) dan terhadap `Golden Test` `<= US$0,01`. |
| **NF-04** | Keamanan & Privasi | HTTPS wajib, RLS aktif di seluruh 10 tabel, bucket `rilis-apk` privat ber-*Signed URL*, sanitasi `email` & `alamat_wallet` sesama investor, serta `0` penyimpanan kunci privat dompet. |
| **NF-05** | Ketersediaan | Target `>= 99%` per bulan (*free tier*). |
| **NF-06** | Backup Terenkripsi | Backup mingguan otomatis via GitHub Actions terenkripsi `AES-256` (sudah aktif di produksi, commit `3afa0d0`). |
| **NF-07** | Anti-Pause | Ping terjadwal harian via GitHub Actions dipertahankan permanen (`OQ-14`). |
| **NF-08** | Aksesibilitas & Sentuh | Kontras minimal WCAG AA (`>= 4,5:1` teks isi, `>= 3:1` teks besar) di Mode Terang maupun Gelap *Wise Forest Obsidian*; bidang sentuh tombol & ikon satuan `>= 44dp–48dp`. |
| **NF-09** | Kompatibilitas OS | Android `8.0` (`API 26`) s.d. Android `15` (`API 35`), lebar layar utama `360dp–480dp`. |
| **NF-10** | Kesegaran Nilai Live | Pembacaan tiap `1 menit` (`>= 95%` menit berhasil/hari, dipantau langsung di `Kelola → Snapshot saldo`). |
| **NF-11** | Deteksi Arus Onchain | Pemeriksaan tanda transaksi berjalan tiap `5 menit`, muncul di daftar arus `<= 5 menit` sejak final di jaringan. |
| **NF-12** | Batas Biaya | `US$0/bulan` (seluruh kuota Supabase Database/Auth/Storage, Helius, Jupiter, CoinGecko, Vercel, dan GitHub Actions di dalam batas gratis). |
| **NF-13** | Interaksi Grafik | `tabular-nums` stabil tanpa goyang lebar, pemisahan gestur *scrub* horizontal (`dx >= 6dp && dx > dy`) vs *scroll* vertikal halaman, render `< 16 ms/frame` (`60 fps`), dan umpan balik *haptic* ringan per perpindahan titik. |
| **NF-14** | Ukuran & Keystore `.apk` | Ukuran berkas `.apk` rilis `< 25 MB` (agar muat di kuota objek gratis Supabase Storage), wajib ditandatangani dengan 1 berkas `pasti-cuan-release.jks` tetap dan diverifikasi `SHA-256` sebelum pasang ulang. |
| **NF-15** | Hemat Baterai | `0` polling jaringan saat aplikasi berada di latar belakang atau layar HP mati. |
| **NF-16** | Mode Offline Instan | Data posisi & grafik tersimpan terakhir tampil `< 300 ms` saat aplikasi dibuka tanpa sinyal. |

### Trade-off & Konsekuensi Arsitektur
1. **Monorepo Satu Atap (`pasti-cuan-app`) & Satu Backend Bersama vs Dua Repositori Terpisah:** Menghilangkan risiko melencengnya `DESIGN.md` dan aturan hitung antara Web dan Android, serta menjaga versi Web tetap hidup sebagai cadangan darurat. Konsekuensinya, `.gitignore` dan struktur folder perlu memisahkan hasil kompilasi Gradle (`android-app/build`) dari build Next.js (`.next`).
2. **Paritas Visual 1:1 Kustom di Jetpack Compose vs Komponen Material 3 Standar:** Membangun `PastiCuanIcons`, `GlassSwitch`, `SegmentedTrack`, dan `FloatingPillNav` kustom membutuhkan penulisan komponen UI khusus dibanding memakai komponen bawaan Material 3, tetapi menghasilkan identitas produk yang 100% utuh dan menghilangkan kebingungan visual saat anggota berpindah antara Web dan Android.
3. **Bucket Privat Supabase Storage (`rilis-apk`) vs GitHub Releases Publik:** Menyimpan berkas `.apk` di Supabase Storage privat menjaga paket aplikasi internal tetap tertutup hanya untuk anggota terdaftar yang lolos autentikasi sesi, dengan konsekuensi ukuran berkas `.apk` dijaga ramping `< 25 MB` (`NF-14`).

---

## 3.4 Roadmap & Pentahapan Eksekusi Android

| Tahap / Versi | Cakupan Pengiriman | Hasil yang Diterima Pengguna |
|---|---|---|
| **Milestone M1 — `v0.1-alpha`** *(Selesai)* | Setup awal proyek Native Android, mesin hitung lokal `PoolEngine.kt` + `PoolEngineTest.kt`, layar dasar Beranda & Tarik dengan data contoh terverifikasi. | Prototipe awal `.apk` pertama teruji jalan di HP. |
| **Milestone M2 — `v0.2-beta` *(Tahap Saat Ini di Monorepo `pasti-cuan-app/android-app`)* ** | Migrasi penuh ke monorepo `pasti-cuan-app/android-app`; **penyelarasan visual 1:1 dengan Web produksi** (*Liquid Glass* bening terang di Mode Terang, segmen `#263D1A` di Mode Gelap, sistem ikon garis `PastiCuanIcons` + logo resmi Solana `44dp`, `GlassSwitch`, stempel 2 bagian, accordion `Tampilan` tanpa kartu bersarang); serta **penyelesaian 100% seluruh layar & 5 sub-halaman `Kelola`** (`Arus`, `Saldo`, `Permintaan`, `Anggota`, `Pengaturan pool`, `Transaksi` 2-baris tab, dan `Log` berkategori ber-navbar). | Berkas **`pasti-cuan-v0.2.apk`** dengan rasa visual & kelengkapan fitur 1:1 seperti Web produksi, siap diuji penuh seluruh peran di HP. |
| **Milestone M3 / Rilis `v1.0` *(Produksi Internal Grup)* ** | Penambahan dukungan `Bearer` token & `kunjungan_mingguan` pada `/api/*`, migrasi `rilis_aplikasi` + bucket privat `rilis-apk` di Supabase Storage, pembuatan OAuth Client ID Android (`OQ-16`), integrasi live Google Sign-In + cache offline lokal di Android, penandatanganan resmi `pasti-cuan-release.jks`, dan fitur pemeriksa pembaruan `.apk` internal (`US-14`). | Siap dibagikan ke seluruh 5/6 anggota pool untuk pemakaian harian penuh menggantikan peramban HP. |
| **Rilis `v1.1`** *(Future Epic 1)* | Penguncian privasi aplikasi dengan sidik jari / PIN layar HP Android (`BiometricPrompt`) saat aplikasi dibuka kembali setelah di latar belakang `>= 5 menit`. | Perlindungan ekstra nominal pribadi saat HP sedang dipinjam orang lain. |
| **Rilis `v2.0`** *(Future Epic 2)* | Pemberitahuan (*Push Notification*) Android untuk permintaan & arus dompet baru, ekspor CSV via lembar berbagi Android (*Share Sheet*), dan eksplorasi *Home Screen Widget*. | Pemberitahuan proaktif ke Pengelola & Investor tanpa membuka aplikasi manual. |

### Explicit Won't Do
- Menyimpan *private key* / *seed phrase*, mengeksekusi transaksi kirim dana dari aplikasi, mencocokkan transfer tanpa validasi Pengelola, mengizinkan perubahan email akun yang sudah tertaut login Google tanpa siklus nonaktif/tambah baru, serta memberikan saran investasi.

---

## Open Questions

| # | Pertanyaan / Keputusan | Owner Tunggal | Tenggat (*Due Date*) | Status Terkini (18 Nov 2026) |
|---|---|---|---|---|
| **OQ-01 s/d OQ-04, OQ-06, OQ-12, OQ-14, OQ-15** | Satuan dasar fee (`USD`), tarik proporsional (`BR-06`), ambang peringatan & data lama (`OQ-04`), parameter onchain & interval deteksi arus 5 menit (`OQ-12`, `OQ-14`), serta riwayat `PEPE/SOL → DOGE/SOL` (`OQ-15`). | Salman | 17 Nov 2026 | **Selesai** (berjalan aktif di produksi). |
| **OQ-09** | Konfirmasi target NSM Android (`100%` anggota aktif = `5/5` cek mandiri per minggu selama 4 minggu pasca-rilis `v1.0`). | Salman | 18 Nov 2026 | **Selesai — Disetujui Salman (`18 Nov 2026`)**. |
| **OQ-17** | Penentuan lokasi penyimpanan berkas `.apk` pembaruan internal (`US-14`): bucket privat Supabase Storage vs GitHub Releases. | Salman | 18 Nov 2026 | **Selesai — Diputuskan memakai Bucket Privat Supabase Storage (`rilis-apk`) pada proyek `pasti-cuan` (`18 Nov 2026`)**. |
| **OQ-18** | Penyatuan ke monorepo `pasti-cuan-app/android-app`, penguncian paritas visual 1:1 Web, pemasukan `Kelola → Pengaturan` (`US-17`) ke `v1.0`, penjadwalan Kunci Sidik Jari ke `v1.1`, dan aturan `US-07B` tanpa ubah email akun eksisting. | Salman | 18 Nov 2026 | **Selesai — Disetujui Salman (`18 Nov 2026`)**. |
| **OQ-07** | Konfirmasi lisan dengan Galih atas visibilitas daftar permintaan terbuka untuk seluruh anggota aktif (sudah disetujui Salman & berjalan di produksi). | Galih | 22 Nov 2026 (Pra-Rilis `v1.0`) | **Terbuka Operasional** (fitur sudah berjalan dengan toggle `Semua anggota \| Milik saya`). |
| **OQ-13** | Pengumpulan daftar opsional alamat dompet Solana pribadi tiap investor untuk memperkaya tombol tujuan tarik & saran pencocokan arus (`US-07B`, `US-13`). | Galih | 25 Nov 2026 (Pra-Rilis `v1.0`) | **Terbuka Operasional** (fitur input di `Kelola → Anggota` sudah siap, tidak memblokir kode). |
| **OQ-16** | Pembuatan OAuth Client ID tipe **Android** (`id.pasticuan.wallet` + sidik jari `SHA-1` dari `pasti-cuan-release.jks`) di Google Cloud Console proyek Supabase `pasti-cuan` untuk mengaktifkan login Google native pada Milestone M3 / `v1.0`. | Salman | Sebelum mulai Milestone M3 (`v1.0`) | **Terbuka Pra-M3** (tidak memblokir Milestone M2 `v0.2-beta`). |

---

## Lampiran (Appendix)
- **Dokumen Produk & Desain Kanonis (Satu Sumber Kebenaran):** [PRODUCT.md](../../PRODUCT.md), [DESIGN.md](../../DESIGN.md), dan implementasi CSS rujukan [globals.css](../../src/app/globals.css)
- **Mesin Hitung & Kontrak Produksi:** [engine.ts](../../src/lib/engine.ts), [store.tsx](../../src/lib/store.tsx), [auth.ts](../../src/lib/server/auth.ts), dan skema SQL [202611170001_initial_schema.sql](../../supabase/migrations/202611170001_initial_schema.sql)
- **Kode Aplikasi Native Android:** `android-app/` di dalam repositori `s:\Projek Iseng\pasti-cuan-app`
- **PRD Web Pendahulu:** [prd-dashboard-porsi-dana-lp.md](prd-dashboard-porsi-dana-lp.md)

---

## Change Log

### Sumber Isi (User-Provided vs AI-Synthesized)
- **Dari Pemilik Produk & Kode Produksi Aktual (`Salman` — `pasti-cuan-app` s.d. `18 Nov 2026`):** Keputusan transformasi ke aplikasi Native Android internal (`100%` anggota pengguna Android, luar Play Store), penyatuan kode Android & PRD ke dalam monorepo `pasti-cuan-app` (`OQ-18`), penguncian paritas visual 1:1 dengan sistem Web produksi (`Liquid Glass` bening terang di Mode Terang, segmen `#263D1A` di Mode Gelap, ikon garis tipis setara Tabler + logo vektor Solana `44dp`, `GlassSwitch`), pemasukan `Kelola → Pengaturan Pool` (`US-17`) ke `v1.0` & penjadwalan Kunci Sidik Jari ke `v1.1`, aturan `US-07B` tanpa ubah email akun eksisting, target NSM `5/5` (`OQ-09`), serta penyimpanan `.apk` di bucket privat Supabase Storage (`OQ-17`).
- **Disintesis & Diselaraskan dari Audit Kode Produksi:** Penyelarasan penuh `US-02A`, `US-07B`, `US-09`, `US-16`, dan penambahan `US-17` agar 100% cocok dengan perilaku aktual `src/app/(app)/*` dan `src/app/globals.css`; pembersihan jargon skema internal dari AC Section 2; spesifikasi migrasi `rilis_aplikasi` + bucket `rilis-apk` + instrumentasi otomatis NSM `kunjungan_mingguan`; serta paket ekstensi autentikasi `Bearer` pada `/api/*`.

### Keputusan Kunci Lintas Gate

| Tanggal | Gate / Tahap | Keputusan |
|---|---|---|
| 18 Nov 2026 | Gate Section 1–3 Awal (`v1.0`) | Penyusunan awal PRD Native Android dan prototipe M1 (`v0.1-alpha`). |
| 18 Nov 2026 | `/prd-review` & Audit Silang Repo Produksi | Ditemukan 7 ketidakselarasan paritas (termasuk penyebab deviasi visual `.apk` akibat rujukan `DESIGN.md` lama di luar repo produksi, celah Story `Kelola → Pengaturan`, filter `Transaksi`/`Log`, dan kesiapan `Bearer` auth). |
| 18 Nov 2026 | Konsolidasi Monorepo & Persetujuan `v1.1` | Salman mengunci `OQ-09`, `OQ-17`, dan `OQ-18`; PRD dipindahkan ke `pasti-cuan-app/docs/prd/prd-aplikasi-android-pasti-cuan.md`, seluruh 7 poin `Fix` & 4 poin `Discuss` diselesaikan tuntas, dan **PRD v1.1 disetujui (`Approved`) untuk eksekusi M2 (`v0.2-beta`)**. |

### Open Questions Operasional yang Masih Membutuhkan Tindakan Pra-`v1.0`
- **Salman:** `OQ-16` (pembuatan Google OAuth Client ID Android di Google Cloud Console saat hendak masuk Milestone M3 / `v1.0`).
- **Galih:** `OQ-07` (konfirmasi lisan transparansi daftar permintaan) dan `OQ-13` (pengumpulan daftar opsional `alamat_wallet` tiap investor).
