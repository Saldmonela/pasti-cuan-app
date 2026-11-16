# PRD: Dashboard Porsi Dana Patungan LP

| Field | Isi |
|---|---|
| Tipe PRD | Full |
| Pemilik PRD | Salman |
| Status | v1.1 draft (diperbarui 17 Nov 2026): OQ-04, OQ-12, OQ-14, OQ-15 selesai; transaksi onchain dinilai pada waktu transfer; project Supabase `pasti-cuan` (`ap-southeast-1`) aktif; menunggu konfirmasi Galih & implementasi v1.0. Versi sebelumnya: final v1.0 (14 Nov 2026) |
| Sumber data awal | `Tracker_LP_v3.xlsx` dan `Laporan Harian.xlsx` dari pengelola, data per 14 Nov 2026 |
| Sumber data berjalan | Wallet pool `By6HpsukcTeVsV6FyBzhQJ2nzdHP46kXaSPtrCGUzoaR` (Solana), dibaca otomatis tiap 1 menit. Diuji 15 Nov 2026 |

---

# Section 1: Why & Who

## 1.1 Masalah & Konteks

### Kondisi Sekarang (As-Is)

- **Peserta:** 6 orang, yaitu 5 investor (Faiz, Luqman, Rezki, Salman, Hafiz) dan 1 pengelola (Galih).
- **Dana:** dikumpulkan di satu wallet ("Pasti Cuan") dan diputar pengelola di posisi DLMM berpasangan SOL (PEPE/SOL, lalu DOGE/SOL). Mulai 16 Okt 2026 dengan 4 investor masing-masing $100. Total modal per 14 Nov 2026 sekitar $1.825.
- **Yang mudah dilihat:** hanya total nilai wallet di Jupiter. Porsi, untung/rugi, dan lama dana ditaruh per orang tidak terlihat.
- **Pengelola mencatat di dua file Excel, dan angkanya berbeda** (data 14 Nov 2026):

| Nama | Tracker_LP_v3 | Laporan Harian | Selisih |
|---|---|---|---|
| Faiz | $155,71 | $152,36 | $3,35 |
| Luqman | $155,71 | $152,36 | $3,35 |
| Rezki | $827,45 | $809,76 | $17,69 |
| Salman | $813,74 | $794,54 | $19,20 |
| Hafiz | $97,38 | $94,57 | $2,81 |
| Fee Galih (pengelola) | $26,54 | $60,79 | $34,25 |
| **Total pool** | **$2.076,53** | **$2.064,38** | **$12,15** |

- **Penyebab selisih:**
  1. **Satuan dasar berbeda.** Tracker_LP_v3 menghitung unit dalam USD, Laporan Harian dalam SOL. Akibatnya, menurut Laporan Harian, Salman rugi -$31,90 dalam USD tetapi untung +1,76 SOL.
  2. **Fee pengelola dihitung berbeda.** Tracker_LP_v3 mengambil 10% dari profit tiap investor yang sedang untung saja. Laporan Harian mengambil 10% dari total profit pool.
  3. **Catatan setoran tidak sama:**
     - Salman tambah $525 pada 8 Nov di satu file, $527,01 pada 9 Nov di file lain.
     - Rezki tambah $200 pada 13 Nov vs 14 Nov.
     - Hafiz tercatat "Modal Awal" vs "Tambah", dan namanya ditulis "Hafiz" vs "Hafis".
- **Penarikan belum pernah terjadi.** Tracker_LP_v3 sudah punya aturan tarik (jual unit pada NAV hari itu), Laporan Harian belum. Saat ada yang ingin menarik, belum jelas angka mana yang dipakai.
- **Excel sulit dibaca di HP.** Posisi satu orang tersebar di beberapa sheet (Modal, Harian, Detail).

### Kondisi yang Diinginkan (To-Be)

- **Satu sumber angka yang disepakati semua orang.** Tiap investor membuka dari HP dan langsung melihat:
  - modal bersih;
  - nilai sekarang;
  - untung/rugi dalam USD dan SOL;
  - porsi %;
  - lama dana ditaruh;
  - jumlah maksimal yang bisa ditarik hari ini, sudah dipotong fee.
- **Nilai terbaru, bukan rekap harian.** Nilai pool dibaca otomatis dari wallet onchain tiap 1 menit. Investor melihat nilainya sendiri saat ini dan grafik 24 jam terakhir, seperti di aplikasi wallet.
- **Pencatatan di satu tempat.** Saldo dibaca otomatis. Pengelola cukup mencocokkan setoran dan penarikan yang terdeteksi di wallet, dan mengoreksi saldo hanya bila perlu. App menghitung otomatis dengan sistem unit, sehingga investor yang masuk belakangan tidak ikut menikmati profit sebelum ia masuk.
- **Simulasi tarik:** "Kalau saya menarik $X hari ini, sisa saldo dan porsi saya menjadi berapa?"
- **App hanya mencatat dan menampilkan.** Dana tetap di wallet, dan transaksi asli tetap dilakukan pengelola. App hanya membaca alamat publik wallet, tidak pernah memegang kunci atau menandatangani transaksi.

### Kenapa Sekarang

- Ada investor yang ingin menarik modal, dan belum ada cara hitung yang disepakati.
- Setoran makin sering dan tidak seragam: 6 setoran setelah modal awal dalam 4 minggu, termasuk 1 investor baru. Porsi berubah terus.
- Dua catatan sudah selisih $2,81 sampai $19,20 per orang. Jika penarikan memakai file yang salah, ada yang dibayar kurang atau lebih.
- Penarikan pertama sudah terjadi: Rezki, 15 Nov 2026, 731,51 USDC (terlihat di onchain, lihat OQ-11).
- Investor meminta grafik harian (24 jam). Rekap 1 angka per hari jam 08.00 tidak bisa memenuhinya.

### Kenapa Bukan Alat Lain

- Jupiter dan portfolio tracker umum hanya tahu isi wallet, tidak tahu siapa memiliki berapa.
- Excel bisa menghitung, tetapi tidak ada satu versi yang disepakati dan tidak nyaman dibaca di HP.

## 1.2 Persona & Stakeholder

| Peran | JTBD | Beban Pikiran | Hubungan dengan Pihak Lain | Tanggung Jawab / Risiko |
|---|---|---|---|---|
| **Investor aktif** (rutin mengecek, termasuk Salman) | Saat saldo pool naik/turun atau ada yang setor, saya ingin melihat nilai, untung/rugi, dan porsi saya sendiri, supaya tahu posisi saya tanpa bertanya ke pengelola atau membuka Excel | Bingung melihat total pool $2.000 vs modal sendiri $100. Bingung kenapa rugi dalam USD tetapi untung dalam SOL | Bergantung penuh pada catatan pengelola | Menanggung risiko rugi. Butuh angka yang bisa dipercaya sebelum menambah atau menarik |
| **Investor pasif** (jarang mengecek) | Saat ingin menambah atau menarik modal, saya ingin satu angka final yang jelas, supaya bisa memutuskan tanpa mempelajari Excel | Tidak mau repot. Hanya peduli angka saat akan bertindak | Sama, bergantung pada pengelola | Sama |
| **Pengelola** (Galih) | Saat ada setoran atau penarikan, saya ingin mencatatnya sekali dan angka per orang otomatis benar, supaya bisa menjawab pertanyaan dan memproses penarikan tanpa hitung manual | *[Asumsi]* beban mencatat tiap hari (Laporan Harian dicatat tiap jam 08.00) dan menjawab pertanyaan berulang. Dengan pembacaan onchain (D5), pencatatan saldo harian tidak lagi wajib | Dipercaya 5 orang memegang dana | Bertanggung jawab atas kebenaran angka dan eksekusi transfer. Mendapat 10% profit |

## 1.3 Nilai

- **Time-to-value:** momen aktivasi adalah saat investor pertama kali membuka link dari HP dan bisa membaca angkanya sendiri tanpa dijelaskan siapa pun.
- **Biaya jika tidak dibangun:**
  - risiko salah bayar saat penarikan (selisih yang sudah ada sampai $19,20 per orang dan $34,25 pada fee pengelola);
  - debat soal pembagian yang menggerus kepercayaan;
  - pertanyaan berulang ke pengelola.
- **Pricing / monetisasi:** N/A. Alat internal, tidak dijual.
- **Biaya pindah:** rendah. Excel tetap bisa menjadi cadangan selama masa transisi.

## 1.4 Metrik Keberhasilan

### Arah NSM

- **Masalah:** investor tidak bisa membaca posisinya sendiri dengan angka yang dipercaya.
- **Perubahan perilaku pertama:** investor mengecek posisinya sendiri, bukan bertanya ke pengelola.
- **NSM:** jumlah anggota yang mengecek posisinya sendiri lewat app tiap minggu.
- **Kenapa bukan vanity:** dipasangkan dengan counter metric "koreksi data", sehingga kunjungan hanya bernilai jika angka yang dilihat tidak perlu dikoreksi belakangan.

### Kontrak Metrik

| Tipe | Metrik | Definisi | Penyebut | Baseline | Target | Owner |
|---|---|---|---|---|---|---|
| **NSM** | Anggota cek mandiri per minggu | Anggota unik yang membuka halaman posisinya minimal 1 kali dalam Senin sampai Minggu | 6 anggota | Sekitar 4/6 (perkiraan, via Excel/Jupiter, belum terukur) | *[Usulan: 6/6 dalam 4 minggu setelah rilis, perlu konfirmasi]* | Salman |
| **Counter** | Koreksi data | Jumlah perubahan snapshot atau transaksi yang sudah tersimpan dan mengubah nilai bersih minimal 1 investor sebesar $0,01 atau lebih (dihitung dari log audit) | Per bulan | Belum terukur (saat ini ada 2 versi angka yang berbeda) | Maksimal 1 per bulan (disetujui, OQ-04) | Galih |

### Validasi Hipotesis

| Field | Isi |
|---|---|
| Hipotesis | Jika tiap investor bisa melihat porsi, untung/rugi, dan jumlah yang bisa ditarik dari satu sumber angka di HP, ia akan mengecek sendiri tiap minggu, dan pertanyaan serta debat soal pembagian berkurang. |
| Termasuk | Pembacaan nilai pool otomatis dari wallet onchain tiap 1 menit. Pendeteksian transfer masuk/keluar wallet. Pencatatan setoran dan tarik. Perhitungan unit dan fee. Tampilan per investor. Simulasi tarik. Grafik saldo pool dalam USD dan SOL, termasuk rentang 24 jam. |
| Tidak termasuk | Memindahkan dana, terhubung ke wallet sebagai penanda tangan (app hanya membaca alamat publik), mencocokkan setoran ke investor tanpa konfirmasi pengelola, saran investasi, pajak. |
| Sinyal gagal | Investor tetap bertanya ke pengelola walau angkanya ada di app. Artinya tampilan belum bisa dipahami. |

### Keputusan Lanjutan (diputuskan saat Section 2)

| # | Keputusan | Hasil |
|---|---|---|
| D1 | Tampilan untung/rugi | Ditampilkan dalam USD dan SOL. Fee dihitung dari profit dalam USD (OQ-01) |
| D2 | Cara hitung fee 10% | Dari profit tiap investor, hanya bila positif |
| D3 | Visibilitas data | Semua anggota bisa melihat posisi semua anggota |
| D4 | Alur setor dan tarik | Investor mengajukan di app, pengelola mentransfer di luar app lalu menandai selesai |
| D5 | Sumber nilai pool (15 Nov 2026) | Dibaca otomatis dari wallet onchain tiap 1 menit (titik nilai). Snapshot resmi harian dibuat otomatis jam 08.00 WIB. Input manual pengelola menjadi cadangan dan koreksi |
| D6 | Transfer yang belum dicatat (15 Nov 2026) | Setiap transfer masuk/keluar wallet sejak snapshot resmi terakhir dinetralkan dari nilai live, supaya NAV tidak naik atau turun palsu sebelum transaksinya dicatat |

Catatan: dengan sistem unit, porsi % identik baik dihitung dalam USD maupun SOL selama saldo dan tanggal setoran dicatat sama. Satuan dasar hanya memengaruhi angka untung/rugi yang menjadi patokan dan dasar perhitungan fee.

### Asumsi Section 1

- Penyebut NSM = 6 orang, termasuk pengelola.
- Target NSM 6/6 adalah usulan, belum dikonfirmasi.
- Beban kerja pengelola belum diketahui langsung dari Galih.

---

# Section 2: What & If

## Glosarium

| Istilah | Arti di app ini |
|---|---|
| **Pool** | Seluruh dana patungan di wallet "Pasti Cuan" |
| **Snapshot** | Catatan resmi saldo pool harian pada satu tanggal (otomatis jam 08.00 WIB dari titik nilai, BR-18, atau diisi/dikoreksi pengelola sebagai cadangan). Menjadi dasar NAV harian dan impor awal. Satu tanggal maksimal satu snapshot |
| **Titik nilai** | Hasil pembacaan otomatis nilai pool dari wallet onchain, tiap 1 menit (BR-17). Dipakai untuk nilai live, grafik, serta dasar NAV pada menit transfer saat transaksi onchain dicocokkan (BR-18) |
| **Titik estimasi** | Titik nilai per jam untuk riwayat sebelum pembacaan otomatis berjalan, dihitung dari snapshot impor dan harga pasar per jam (SOL dan token pasangan, BR-24). Hanya untuk grafik |
| **Isi wallet** | Nilai titik nilai terakhir apa adanya, sama dengan yang terlihat di Jupiter. Inilah yang ditampilkan sebagai saldo pool (US-08) |
| **Nilai disesuaikan** | Isi wallet ditambah arus keluar dan dikurangi arus masuk yang **belum dicocokkan** ke permintaan sejak snapshot atau transaksi terakhir (BR-19). Hanya dipakai untuk menghitung NAV live, tidak pernah ditampilkan sebagai saldo pool |
| **NAV live** | Nilai disesuaikan dibagi total unit aktif saat ini. Bersifat perkiraan sampai transfer dicocokkan atau snapshot berikutnya |
| **Nilai live** | Angka terbaru dari pembacaan wallet: isi wallet untuk pool, dan unit x NAV live untuk tiap anggota |
| **Arus onchain** | Transfer masuk atau keluar wallet pool ke/dari alamat luar, terdeteksi otomatis. Swap dan aktivitas LP tidak termasuk |
| **Unit** | Satuan kepemilikan pool. Setoran membeli unit, penarikan menjual unit |
| **NAV** | Harga 1 unit pada suatu tanggal, dalam USD dan SOL |
| **Modal dasar** | Total uang yang sudah disetor investor dikurangi bagian modal yang sudah ditarik |
| **Nilai kotor** | Unit x NAV, sebelum dipotong fee |
| **Fee terutang** | 10% dari profit investor, hanya bila profit positif. Belum dibayar sampai ada penarikan |
| **Nilai bersih** | Nilai kotor dikurangi fee terutang. Ini jumlah maksimal yang bisa ditarik |
| **Porsi** | Unit milik seseorang dibagi total unit pool |
| **Permintaan** | Pengajuan setor atau tarik dari investor, diproses pengelola |

## 2.1 User Story Inti

Sebagai investor, saya ingin melihat nilai, untung/rugi, dan jumlah yang bisa saya tarik dari satu sumber angka yang disepakati, supaya saya bisa memutuskan tambah atau tarik modal tanpa bertanya ke pengelola. Kalau tidak, angka saya tergantung file Excel mana yang dibuka, dan bisa berbeda sampai $19,20.

## 2.2 Aturan Bisnis

| ID | Pemicu | Aturan |
|---|---|---|
| BR-01 | Pool pertama kali dibuat | 1 unit = $1 pada snapshot pertama (16 Okt 2026). Modal awal $100 = 100 unit |
| BR-02 | Snapshot disimpan | NAV hari itu = (nilai pool hari itu - arus bersih hari itu) / total unit sebelum arus. Arus bersih = setoran - penarikan yang efektif di tanggal itu. Nilai pool dicatat sesudah setoran/penarikan |
| BR-03 | Setoran dikonfirmasi | Unit dibeli = jumlah setoran USD / NAV USD tanggal efektif. Profit sebelum tanggal efektif tidak ikut dinikmati |
| BR-04 | Setiap perhitungan | Profit investor = nilai kotor - modal dasar. Fee terutang = 10% x max(0, profit). Investor yang rugi tidak kena fee |
| BR-05 | Pengaturan pool | Satuan dasar fee = USD (diputuskan, OQ-01). Angka ditampilkan dalam USD dan SOL, tetapi fee hanya dihitung dari profit dalam USD. Investor yang rugi dalam USD tidak kena fee walau jumlah SOL-nya bertambah |
| BR-06 | Penarikan diproses | Investor menarik W (USD bersih), W <= nilai bersih. Proporsi f = W / nilai bersih. Unit investor berkurang f x unit miliknya. Modal dasar berkurang f x modal dasar. Fee terealisasi = f x fee terutang, dipindahkan ke pengelola dalam bentuk unit (diputuskan, OQ-02). Artinya: uang yang ditarik dianggap campuran modal dan untung sesuai perbandingannya, dan bagian untungnya langsung kena fee. Contoh: Rezki (nilai bersih $827,45, modal $700, fee terutang $14,16) menarik $50, maka Galih langsung mendapat $0,86, sisa modal Rezki $657,70, sisa nilai bersih $777,45. Modal dasar tidak pernah negatif |
| BR-07 | Penarikan diajukan | Tidak ada minimal lama dana ditaruh dan tidak ada minimal jumlah. Boleh tarik sebagian atau seluruhnya, kapan saja |
| BR-08 | Permintaan dibuat | Maksimal 1 permintaan berstatus "Menunggu" per investor per jenis (setor atau tarik) |
| BR-09 | Permintaan tarik diproses | Jika nilai bersih pada tanggal efektif < W, permintaan tidak bisa diselesaikan. Pengelola menolak, atau investor membatalkan lalu mengajukan ulang |
| BR-10 | Transaksi dikonfirmasi | Transaksi yang dicocokkan dengan transfer onchain memakai titik nilai terdekat pada/sebelum menit transfer sebagai acuan NAV (BR-18). Transaksi manual tanpa arus onchain dan data impor wajib punya snapshot harian pada tanggal efektifnya; jika belum ada, pengelola harus mengisi snapshot tanggal itu dulu |
| BR-11 | Snapshot atau transaksi lama diubah | Semua angka sesudah tanggal itu dihitung ulang otomatis, dan perubahan tercatat di log audit |
| BR-12 | Setiap kali data dihitung ulang | Cek invarian data: (a) tidak ada unit negatif; (b) setiap penarikan tidak melebihi nilai bersih pada waktu efektifnya, termasuk setelah koreksi data; (c) setiap transaksi selesai punya acuan snapshot (untuk manual/impor) atau titik nilai pada waktu transfer (untuk onchain); (d) total nilai kotor semua anggota (termasuk unit pengelola) sama dengan nilai pool, toleransi +/- $0,01 setelah pembulatan. Jika salah satu gagal, semua anggota melihat peringatan dan pengajuan tarik baru diblokir. Catatan: di sistem unit, (d) hampir selalu lolos karena nilai tiap orang dihitung dari saldo pool; (a)-(c) yang menangkap kesalahan input. (e) Tambahan 15 Nov 2026: tidak ada arus onchain berstatus "belum dicocokkan" yang terjadi sebelum snapshot resmi terakhir (BR-19) |
| BR-13 | Investor membatalkan permintaan | Hanya bisa selama status "Menunggu" |
| BR-14 | Tampilan angka | USD 2 desimal, SOL 4 desimal, porsi 2 desimal (%). Format angka Indonesia (US$1.234,56). Zona waktu WIB (disetujui, OQ-04) |
| BR-15 | Data onchain & snapshot lama | Sumber utama selalu data onchain otomatis tiap 1 menit (tidak perlu upload atau input harian manual). Keterlambatan pembacaan onchain > 15 menit / > 60 menit ditangani BR-20. Banner "data belum diperbarui" tampil sebagai pengaman cadangan hanya jika pembacaan onchain maupun snapshot terakhir sama-sama tidak ada pembaruan lebih dari 2 hari (disetujui, OQ-04) |
| BR-16 | Grafik dan ringkasan rentang | Untung/rugi pool dalam suatu rentang = jumlah perubahan harian dalam rentang itu. Perubahan harian = nilai hari itu - nilai snapshot sebelumnya - arus bersih hari itu (snapshot pertama dibandingkan dengan 0). Dalam SOL, arus dikonversi dengan harga SOL hari itu. Dengan begitu, setoran dan penarikan tidak terbaca sebagai untung atau rugi. Untuk grafik nilai saya (US-12) aturannya sama, memakai nilai bersih saya dan arus milik saya sendiri. Persen = untung/rugi rentang / (nilai bersih saya di awal rentang + setoran saya dalam rentang); untuk rentang Semua, nilai awal = 0. Persen untuk grafik pool (US-08) = perubahan NAV dalam satuan aktif dari awal sampai akhir rentang, sehingga tidak terpengaruh setor/tarik. Untuk rentang 24J dan 7H, lihat BR-21 |
| BR-17 | Tiap 1 menit (pembacaan otomatis) | Nilai pool = (a) nilai posisi Meteora DLMM milik wallet + (b) fee LP belum diklaim + (c) saldo SOL native wallet x harga SOL + (d) token lain di wallet x harganya. Nilai (a) dan (b) dihitung dari jumlah token di tiap posisi, bukan dari angka USD Meteora: jumlah token X x harga X + jumlah token Y x harga Y, dengan semua harga diambil dari Jupiter di menit yang sama. Jumlah token per posisi berasal dari API posisi Meteora (`unrealizedPnl.balanceTokenX/Y.amount` dan `unclaimedFeeTokenX/Y.amount`). Alasan (diubah 15 Nov 2026): angka USD Meteora bisa tertahan beberapa menit, sementara `balancesSol` = USD lama / harga SOL baru. Akibatnya grafik SOL mendapat gerakan palsu; contoh tes 15 Nov 2026: USD tertahan $1.142,18 di 3 sampel, sementara SOL berubah 16,2830 → 16,2759 → 16,2697. Contoh komposisi posisi 15 Nov 2026: 15.869,72 DOGE ($938,13) + 3,2745 SOL ($235,54), sekitar 80% DOGE, rentang 8 bin (sekitar 2%). Token dihitung hanya jika punya harga di Jupiter dan likuiditas >= $10.000 (disetujui, OQ-12); selain itu dihitung $0 (contoh: spam/airdrop). Rent akun token dan akun posisi tidak dihitung. Saldo SOL = nilai pool / harga SOL pada menit yang sama, dari sumber harga yang sama. Jika salah satu sumber gagal setelah 1 kali coba ulang, menit itu dilewati: tidak ada titik nilai dan tidak diisi angka karangan. Verifikasi: wallet pool 15 Nov 2026 13.03 WIB menghasilkan $1.171,81 (DLMM $1.150,39 + fee $0,0003 + 0,2709 SOL $19,10 + DOGE $1,69 + USDC $0,64; 2 token tanpa harga = $0). Angka DLMM pada fixture ini masih dari USD Meteora. Fixture metode jumlah token ada di Rencana Uji |
| BR-18 | Tiap hari 08.00 WIB & waktu efektif transfer | Titik nilai pertama yang berhasil pada atau sesudah 08.00 WIB disimpan sebagai snapshot harian otomatis tanggal itu (sumber `otomatis`), lalu NAV dihitung (BR-02) dan cek data dijalankan (BR-12). Jika belum ada titik nilai yang berhasil sampai 08.30 WIB, pengelola diberi tahu untuk mengisi snapshot manual (US-02). Snapshot otomatis tetap bisa dikoreksi pengelola (BR-11, tercatat di log audit). **Waktu efektif transaksi onchain (diubah 17 Nov 2026):** saat transfer onchain dicocokkan dengan permintaan setor atau tarik (US-13), transaksi langsung efektif dan dinilai memakai **titik nilai terdekat tepat pada atau sebelum menit transfer terjadi**, bukan menunggu snapshot 08.00 WIB hari berikutnya. Contoh: penarikan yang ditransfer 15 Nov 10.05 WIB langsung memotong unit dan dinilai di 15 Nov 10.05 WIB memakai NAV pada menit itu (bukan 16 Nov 08.00 WIB). Transaksi manual tanpa transfer onchain dan data impor tetap memakai tanggal snapshot |
| BR-19 | Transfer terdeteksi di wallet | Transfer SOL atau token ke/dari alamat luar dicatat sebagai arus onchain dengan nilai USD saat transfer (USDC = $1, SOL dan token lain x harga saat itu). Yang bukan arus: swap, tambah/tarik likuiditas, klaim fee, dan transfer di bawah $1 (dust, sering dipakai untuk spam; disetujui OQ-12). Selama arus onchain masih berstatus `belum` (belum dicocokkan pengelola), nilai disesuaikan = isi wallet - arus masuk (`belum`) + arus keluar (`belum`) sejak snapshot/transaksi terakhir, sehingga NAV live tidak ikut turun karena transfer yang belum diproses. Begitu pengelola mencocokkan arus di US-13, transaksi langsung diselesaikan di waktu transfernya (BR-18), unit langsung terbarui, dan arus tersebut tidak lagi masuk penyesuaian (nilai disesuaikan kembali sama dengan isi wallet bila tidak ada arus `belum` lain). Pengelola menandai tiap arus (US-13): dicocokkan dengan permintaan, biaya pool (dianggap rugi pool, tidak dinetralkan), atau bukan arus. Arus yang belum ditandai saat snapshot resmi berikutnya dibuat membuat cek BR-12 (e) gagal. Contoh 15 Nov 2026: swap 10,7416 SOL ke 731,51 USDC diabaikan; kirim 1 USDC dan 730,51 USDC ke `Chtm91xf…` = 2 arus keluar yang saat dicocokkan ke penarikan Rezki langsung dinilai pada 15 Nov 10.05 WIB; masuk 0,001 USDC = dust; kirim 0,1 SOL ke `DqZ3Dn1V…` = arus keluar yang perlu ditandai |
| BR-20 | Nilai live sudah lama | Jika titik nilai terakhir lebih dari 15 menit (disetujui, OQ-12), angka tetap tampil dengan keterangan "Nilai terakhir diperbarui 13.03 WIB". Jika lebih dari 60 menit, tampil banner kuning "Pembacaan wallet sedang terganggu. Angka mungkin tertinggal." BR-15 tetap berlaku sebagai pengaman cadangan |
| BR-21 | Kerapatan grafik | Semua rentang dan kedua satuan (USD dan SOL) memakai titik nilai, sehingga sama rapatnya. Targetnya 150-365 titik per grafik, karena layar HP sekitar 340 px tidak bisa menampilkan lebih dari itu secara berbeda. Interval per rentang: 24J = 5 menit (288 titik); 7H = 30 menit (336 titik); 30H = 2 jam (360 titik); Semua = otomatis, dipilih dari 2 jam, 4 jam, 6 jam, 12 jam, atau 1 hari sehingga jumlah titik <= 365 (umur pool 30 hari = 2 jam, 90 hari = 6 jam, 1 tahun = 1 hari). Cara memperkecil data: titik terakhir di tiap kelompok waktu, bukan rata-rata atau algoritma penyederhanaan bentuk (misalnya LTTB), supaya nilai yang tampil saat scrub (BR-23) adalah nilai asli pada jam itu. Riwayat sebelum pembacaan otomatis berjalan memakai titik estimasi (BR-24). Saldo SOL tiap titik = isi wallet / harga SOL pada menit yang sama (BR-17), jadi grafik SOL serapat grafik USD. Perubahan antar titik = nilai titik - nilai titik sebelumnya - arus onchain di antara keduanya, sehingga setor/tarik tidak terbaca sebagai untung atau rugi. Untuk grafik saya (US-12): nilai bersih saya di tiap titik = unit saya x NAV live - fee terutang, dan arus = arus milik saya yang sudah dicocokkan. Menit tanpa titik tidak diisi; garis langsung menyambung ke titik berikutnya. Supaya satu grafik tidak mencampur garis harian yang lurus dengan garis rapat yang bergerigi, kerapatan berlaku untuk seluruh rentang: bila titik nilai (asli atau estimasi) belum mencakup minimal 90% rentang *[Usulan]*, misalnya karena estimasi riwayat gagal dibuat, seluruh rentang memakai snapshot harian ditambah 1 titik nilai live di ujung. Penanda transaksi dalam satu kelompok waktu (sesuai interval rentang) digabung menjadi satu penanda, dan chip transaksinya (BR-23) memuat semua transaksi di kelompok itu. Contoh: transfer 1 USDC (10.04 WIB) dan 730,51 USDC (10.05 WIB) menjadi satu penanda. Retensi: titik per menit disimpan 7 hari, lalu diringkas menjadi per 15 menit sampai 90 hari, lalu per jam selamanya. Retensi ini cukup untuk semua interval di atas (7H dari data per menit, 30H dari per 15 menit, Semua dari per jam) |
| BR-24 | Riwayat sebelum pembacaan otomatis (dijalankan sekali saat impor, US-06) | App membuat titik estimasi per jam untuk rentang snapshot hasil impor, supaya 7H, 30H, dan Semua tidak terlihat seperti rekap harian. Cara hitung (diubah 15 Nov 2026, sebelumnya nilai SOL ditarik garis lurus): (1) Saldo SOL tiap snapshot impor = nilai USD / harga SOL pasar pada jam snapshot (CoinGecko, 08.00 WIB). (2) Di antara snapshot A dan B, nilai pool dalam SOL per jam = S_A x [1 + w x (R(t) / R(t_A) - 1)] x k(t). Di sini R(t) = harga token pasangan dalam SOL pada jam itu (harga token USD / harga SOL USD, keduanya per jam dari CoinGecko), dan w = porsi token pasangan di posisi, yaitu 0,5 (disetujui, OQ-12). Faktor koreksi k(t) bergerak linear dari 1 di jam A sampai nilai yang membuat garis tepat melewati snapshot B (sebelum arus). Akibatnya, grafik SOL ikut naik-turun mengikuti harga pasar dan tetap melewati semua snapshot asli. (3) Nilai USD per jam = nilai SOL hasil langkah 2 x harga SOL pasar jam itu. Token pasangan mengikuti posisi yang aktif pada periode itu (PEPE/SOL, lalu DOGE/SOL; tanggal pergantian di OQ-15). Bila token pasangan suatu periode tidak diketahui, periode itu memakai garis lurus seperti metode lama, dan chip estimasinya tetap tampil. Setoran dan penarikan tidak ikut diestimasi: nilai SOL sesudah arus dihitung mundur dari snapshot berikutnya, dan lompatannya diletakkan tepat di jam snapshot tanggal efektifnya. Alasan: nilai pool dalam SOL bergerak mengikuti harga token pasangan terhadap SOL, bukan lurus. Data 30 hari: DOGE/SOL bergerak rata-rata 0,25% per jam, dengan selisih tertinggi-terendah 2,5% (24J), 5,1% (7H), dan 10,7% (30H). SOL/USD bergerak 0,64% per jam (11,9%, 32,1%, dan 60,0%). Garis lurus membuat grafik SOL patah-patah dan tidak mirip wallet asli (temuan prototype 15 Nov 2026). Aturan pemakaian: titik estimasi disimpan dengan sumber `estimasi` dan hanya untuk grafik. Titik estimasi tidak pernah dipakai untuk NAV, snapshot, penarikan, atau kartu detail. Saat di-scrub muncul chip "Estimasi dari harga pasar per jam", dan grafik yang memuat estimasi menampilkan keterangan kecil berisi tanggal pembacaan otomatis mulai berjalan, contoh "Sebelum 15 Nov 2026: estimasi per jam". Begitu pembacaan otomatis berjalan, titik asli menggantikan estimasi; estimasi tidak dibuat untuk tanggal yang sudah punya titik asli |
| BR-22 | Mode Bandingkan USD vs SOL | Grafik menampilkan 2 garis dalam persen perubahan sejak awal rentang, keduanya mulai dari 0%: garis USD (solid) dan garis SOL (putus-putus, warna berbeda). Tidak memakai dua sumbu Y, karena skala kiri-kanan bisa diatur sehingga garis tampak bersilangan atau berjauhan dan menyesatkan. Grafik pool: persen = perubahan NAV USD dan NAV SOL (NAV SOL = NAV USD / harga SOL), sehingga setor/tarik tidak membuat garis melompat. Grafik saya (US-12): persen di tiap titik = untung/rugi saya dari awal rentang sampai titik itu dibagi (nilai bersih saya di awal rentang + setoran saya sampai titik itu), dihitung terpisah dalam USD dan SOL (rumus BR-16). Angka besar di atas grafik menjadi dua angka berdampingan, masing-masing dengan persennya, contoh (persen ilustrasi): "US$1.171,66 −6,80%" dan "16,62 SOL +1,20%" |
| BR-23 | Grafik disentuh atau di-hover (scrub) | Selama jari menyentuh grafik (atau kursor di atasnya): (a) angka besar berganti menjadi nilai di titik yang disentuh; (b) baris untung/rugi berganti menjadi perubahan dari awal rentang sampai titik itu, dalam USD/SOL dan persen; (c) subjudul waktu berganti menjadi waktu titik, contoh "15 Nov 2026, 04.51 WIB"; (d) garis vertikal putus-putus dan titik bulat tampil di posisi itu; (e) bila titik itu punya penanda transaksi, chip kecil muncul di bawah baris untung/rugi, contoh "Tarik · Belum dicocokkan US$731,51". Tidak ada tooltip melayang. Saat jari dilepas atau kursor keluar, semuanya kembali ke nilai live. Di mode Bandingkan, kedua angka ikut berubah. Titik yang dipilih = titik terdekat secara horizontal (snap), bukan posisi bebas di antara titik |

## 2.3 User Story & Acceptance Criteria

### Must Have (P0)

#### US-01: Lihat posisi saya

Sebagai investor, saya ingin melihat posisi saya di satu layar HP, supaya tahu nilai dan untung/rugi saya. Kalau tidak, saya harus membuka Excel dan tetap bingung.

- [ ] **AC-01-01 (Happy Path).** Given saya sudah masuk dan pool punya minimal 1 snapshot, when saya membuka Beranda, then di bawah nilai dan grafik saya (US-12) tampil kartu detail dengan angka berikut dari snapshot terakhir (BR-02, BR-04, BR-14):
  1. nilai bersih (USD dan SOL);
  2. modal dasar (USD);
  3. untung/rugi dalam USD;
  4. untung/rugi dalam SOL (nilai SOL sekarang dikurangi SOL setara modal saat disetor);
  5. ROI %;
  6. porsi %;
  7. fee terutang;
  8. lama ikut (hari sejak setoran pertama);
  9. waktu data, ditulis "Nilai live per 15 Nov 2026, 13.03 WIB · Snapshot resmi 15 Nov 2026, 08.00 WIB".
  - Angka 1, 3, 4, 5, dan 7 memakai NAV live (BR-19). Angka 2, 6, dan 8 tidak bergantung NAV. Jika belum ada titik nilai sejak snapshot terakhir, semua angka memakai snapshot terakhir.
  - Field: `nilai_bersih_usd` (desimal, 2 digit), `nilai_bersih_sol` (desimal, 4 digit), `modal_dasar_usd`, `profit_usd` (boleh negatif), `profit_sol` (boleh negatif), `roi_persen`, `porsi_persen` (0-100), `fee_terutang_usd` (>= 0), `lama_ikut_hari` (bilangan bulat >= 0), `tanggal_data` (tanggal + jam snapshot resmi), `nilai_live_pada` (tanggal + jam titik nilai terakhir, boleh kosong).
  - Profit positif hijau dengan tanda "+", negatif merah dengan tanda "-". Jika USD rugi tetapi SOL untung, tampil keterangan: "Nilai USD turun karena harga SOL turun, tapi jumlah SOL kamu bertambah."
  - Verifikasi: dengan data Tracker_LP_v3 per 14 Nov 2026, posisi Salman tampil modal $825,00, untung -$11,26, nilai bersih $813,74, porsi 39,19%.
- [ ] **AC-01-02 (Reverse Flow).** N/A (layar hanya baca, tidak ada aksi yang bisa dibatalkan).
- [ ] **AC-01-03 (Error Handling).**
  - Gagal memuat data: "Data belum bisa dimuat. Cek koneksi kamu, lalu coba lagi." dengan tombol "Coba lagi".
  - Belum punya setoran terkonfirmasi: "Kamu belum punya setoran yang terkonfirmasi. Ajukan setoran pertama kamu." dengan tombol "Ajukan setoran".
  - Cek data gagal (BR-12): banner kuning "Angka sedang dicek ulang oleh pengelola. Jangan ajukan penarikan dulu."
  - Snapshot terakhir lebih dari 2 hari (BR-15): "Data terakhir diperbarui 3 hari lalu (11 Nov 2026)."
  - Nilai live lama (BR-20): "Nilai terakhir diperbarui 13.03 WIB." Lebih dari 60 menit: banner kuning "Pembacaan wallet sedang terganggu. Angka mungkin tertinggal."
- **State layar:** loading (kerangka kartu abu-abu), empty (belum ada setoran), error, sukses, sebagian N/A (nilai USD dan saldo SOL wajib di setiap snapshot), no-permission (belum masuk, diarahkan ke halaman Masuk).

#### US-12: Nilai dan grafik saya (bagian paling atas Beranda)

Sebagai investor, saya ingin langsung melihat nilai saya dan grafiknya di bagian paling atas begitu membuka app, seperti di aplikasi wallet, supaya saya tahu dalam sekejap uang saya naik atau turun. Kalau tidak, saya harus membaca beberapa angka dulu untuk tahu kondisi saya.

- [ ] **AC-12-01 (Happy Path).** Given saya punya setoran terkonfirmasi dan ada minimal 2 snapshot sejak setoran pertama saya, when saya membuka Beranda, then bagian paling atas menampilkan, berurutan dari atas:
  1. Label "Nilai kamu" dan nilai bersih saya dalam satuan aktif, dengan huruf paling besar di layar. Contoh: "$813,74" atau "10,7528 SOL". Di kanan atas, sejajar dengan label, ada kontrol satuan (lihat poin 4).
  2. Untung/rugi saya pada rentang aktif, dalam satuan aktif dan persen (BR-16). Contoh: "-$11,26 (-1,36%) · Semua". Hijau dengan tanda "+" bila positif, merah dengan tanda "-" bila negatif.
  3. Grafik garis nilai bersih saya, mulai dari tanggal setoran pertama saya. Kerapatan titik mengikuti rentang (BR-21), sama untuk USD dan SOL: per 5 menit untuk 24J, per 30 menit untuk 7H, per 2 jam untuk 30H, dan otomatis untuk Semua. Riwayat sebelum pembacaan otomatis memakai titik estimasi (BR-24) dengan keterangan kecil di bawah grafik.
  4. **Kontrol satuan** di kanan atas kartu: segmented control 3 pilihan berupa ikon, yaitu "$" (USD), logo Solana (SOL), dan "$ + logo Solana" (Bandingkan, BR-22). Default "$". Tiap pilihan punya nama aksesibel ("Tampilkan dalam USD", "Tampilkan dalam SOL", "Bandingkan USD dan SOL") dan target sentuh minimal 44 px. Pilihan dipakai bersama dengan grafik pool (US-08) dan diingat di perangkat. **Tombol rentang** "24J | 7H | 30H | Semua" di bawah grafik, default 24J (disetujui, OQ-12).
  5. Tombol "Setor" dan "Tarik" tepat di bawah tombol rentang, menuju US-03 dan US-04.
  - Titik dengan setoran atau penarikan milik saya diberi penanda (digabung per kelompok waktu, BR-21). Menyentuh atau menggeser jari di grafik mengikuti BR-23: angka besar, baris untung/rugi, dan subjudul waktu ikut berubah, dan transaksi saya di titik itu tampil sebagai chip, contoh "Setoran $525,00". Tidak ada tooltip melayang.
  - Field per titik: `waktu` (tanggal + jam), `nilai_bersih_usd` (2 desimal), `nilai_bersih_sol` (4 desimal), `harga_sol_usd` (2 desimal), `arus_saya_usd` (boleh negatif), `transaksi_saya[]` {jenis, jumlah_usd}.
  - Verifikasi mode USD dengan data Tracker_LP_v3 (dijalankan pada snapshot harian saja, tanpa titik estimasi): Salman rentang Semua -$11,26 (-1,36%), rentang 7H (8-14 Nov) -$110,50; Rezki rentang Semua +$127,45 (+18,21%). Mode SOL diverifikasi setelah OQ-10 selesai.
- [ ] **AC-12-02 (Reverse Flow).** N/A (hanya baca). Satuan, mode Bandingkan, dan rentang bisa diganti kapan saja tanpa memuat ulang halaman. Melepas jari dari grafik selalu mengembalikan angka ke nilai live (BR-23).
- [ ] **AC-12-03 (Error Handling).**
  - Belum ada setoran terkonfirmasi: bagian atas menampilkan "$0,00" dan "Kamu belum punya setoran yang terkonfirmasi. Ajukan setoran pertama kamu." dengan tombol "Setor". Grafik tidak tampil.
  - Baru 1 snapshot sejak setoran pertama: angka tampil, area grafik menampilkan "Grafik muncul setelah ada data 2 hari." Untuk rentang 24J, grafik tampil setelah ada minimal 2 titik (sekitar 10 menit data); sebelum itu: "Grafik 24 jam muncul setelah ada data 10 menit."
  - Ada menit tanpa titik nilai (pembacaan gagal): garis menyambung ke titik berikutnya, tidak diisi angka karangan.
  - Data posisi berhasil dimuat tetapi grafik gagal: angka tetap tampil, area grafik menampilkan "Grafik belum bisa dimuat. Coba lagi." dengan tombol "Coba lagi".
  - Sudah menarik semua dana: angka "$0,00", grafik tetap menampilkan riwayat sampai tanggal penarikan terakhir.
  - Offline: angka dan grafik dari data tersimpan terakhir, dengan banner offline.
- **State layar:** loading (kerangka angka besar dan grafik), empty (belum ada setoran), error, sukses, sebagian (angka tampil, grafik gagal dimuat), no-permission (diarahkan ke halaman Masuk).

#### US-02: Snapshot manual dan koreksi saldo (pengelola)

Sebagai pengelola, saya ingin mengisi atau mengoreksi snapshot saat pembacaan otomatis gagal atau angkanya keliru, supaya angka semua investor tetap benar. Kalau tidak, satu hari tanpa snapshot memblokir konfirmasi transaksi (BR-10). Snapshot harian normalnya dibuat otomatis (BR-18), jadi form ini tidak perlu diisi tiap hari.

- [ ] **AC-02-01 (Happy Path).** Given saya pengelola dan snapshot tanggal itu belum ada (pembacaan otomatis gagal), when saya mengisi form snapshot lalu menekan "Simpan", then NAV dihitung (BR-02), cek data dijalankan (BR-12), semua posisi terupdate, dan tampil "Saldo 14 Nov 2026 tersimpan. Semua posisi sudah diperbarui." Form menampilkan titik nilai terakhir yang berhasil sebagai pembanding, dan snapshot disimpan dengan sumber `manual`.
  - Field:
    - `tanggal`: tanggal, wajib, default hari ini, tidak boleh di masa depan, tidak boleh sebelum 16 Okt 2026, satu per tanggal.
    - `nilai_usd`: desimal, wajib, > 0, 2 desimal. Total nilai wallet dalam USD seperti terlihat di Jupiter. Contoh: 2.076,53.
    - `saldo_sol`: desimal, wajib, > 0, maks. 6 desimal. Total nilai wallet dalam SOL. Contoh: 27,439535.
    - `harga_sol_usd`: otomatis = nilai_usd / saldo_sol, hanya baca, ditampilkan sebagai cek kewajaran.
    - `fee_lp_diklaim_sol`: desimal, opsional, >= 0.
    - `catatan`: teks, opsional, maks. 500 karakter.
  - Verifikasi: $2.076,53 dan 27,439535 SOL menghasilkan harga SOL turunan $75,68.
- [ ] **AC-02-02 (Reverse Flow).** Given snapshot sudah tersimpan (otomatis atau manual), when saya mengubah atau menghapusnya, then muncul konfirmasi "Mengubah saldo tanggal ini akan menghitung ulang semua angka sesudahnya. Lanjutkan?". Jika dilanjutkan, BR-11 berlaku, dan snapshot otomatis yang diubah berganti sumber menjadi `koreksi` dengan alasan wajib diisi. Snapshot yang menjadi tanggal efektif transaksi tidak bisa dihapus, hanya diubah.
- [ ] **AC-02-03 (Error Handling).**
  - Tanggal sudah ada: "Saldo untuk 14 Nov 2026 sudah ada. Ubah data yang ada atau pilih tanggal lain."
  - Nilai <= 0: "Nilai USD dan saldo SOL harus lebih dari 0."
  - Perubahan lebih dari 30% dari snapshot sebelumnya tanpa transaksi tercatat maupun arus masuk/keluar onchain terdeteksi (`arus_onchain`): peringatan, tetap bisa disimpan: "Saldo berubah 35% dari kemarin tanpa ada setoran atau penarikan. Yakin angkanya benar?" (ambang 30% disetujui, OQ-04). Untuk snapshot otomatis maupun hari dengan penarikan/setoran > 30% yang terdeteksi di onchain, peringatan tidak muncul.
  - Tombol "Simpan" nonaktif selama proses untuk mencegah kiriman ganda.

#### US-03: Setor modal

Sebagai investor, saya ingin mengajukan setoran di app, supaya unit saya tercatat dengan harga hari itu. Kalau tidak, setoran bisa tercatat dengan jumlah atau tanggal berbeda di tiap file.

- [ ] **AC-03-01 (Happy Path).**
  1. Given saya investor, when saya mengisi form setoran dan mengirim, then permintaan berstatus "Menunggu" dan tampil "Permintaan setoran $200,00 terkirim. Pengelola akan mengonfirmasi setelah dana diterima."
     - Field: `jumlah_usd` (desimal, wajib, > 0, 2 desimal), `tanggal_transfer` (tanggal, wajib, <= hari ini), `bukti_transaksi` (teks, opsional, maks. 100 karakter), `catatan` (opsional, maks. 200 karakter).
  2. When pengelola menekan "Konfirmasi diterima", then pengelola mengisi `jumlah_diterima_usd` (wajib, > 0, default = jumlah diajukan) dan `tanggal_efektif` (untuk input manual tanpa arus onchain, wajib punya snapshot, BR-10). Jika setoran sudah terdeteksi sebagai arus onchain dan dicocokkan (US-13), jumlah, bukti (signature), dan waktu efektif otomatis mengikuti waktu transfer onchain memakai titik nilai saat itu (BR-18). Unit dibeli sesuai BR-03, dan status menjadi "Selesai".
  - Verifikasi: Rezki tambah $200 pada 18 Okt dengan NAV 1,0425 menghasilkan 191,85 unit tambahan.
- [ ] **AC-03-02 (Reverse Flow).** Investor membatalkan selama "Menunggu" (BR-13): "Permintaan setoran dibatalkan." Pengelola dapat menolak dengan alasan wajib diisi.
- [ ] **AC-03-03 (Error Handling).**
  - Masih ada permintaan setoran menunggu (BR-08): "Kamu masih punya permintaan setoran yang menunggu. Batalkan atau tunggu yang itu selesai dulu."
  - Tanggal efektif belum punya snapshot: "Belum ada saldo untuk 9 Nov 2026. Isi saldo tanggal itu dulu."
  - Jumlah diterima berbeda dari yang diajukan: alasan wajib diisi, dan investor melihat kedua angka.

#### US-04: Tarik modal dengan simulasi

Sebagai investor, saya ingin melihat dulu hasil penarikan sebelum mengajukan, supaya tahu sisa nilai dan porsi saya. Kalau tidak, penarikan dihitung manual dan bisa salah.

- [ ] **AC-04-01 (Happy Path).**
  1. Given nilai bersih saya > 0, when saya mengetik jumlah di form tarik, then simulasi langsung tampil (BR-06): unit terjual, fee yang dibayar ke pengelola, sisa nilai bersih, sisa modal dasar, sisa porsi. Simulasi memakai NAV live sebagai perkiraan, dengan keterangan "Perkiraan dengan nilai 13.03 WIB. Angka final memakai nilai pada tanggal efektif."
  2. Saya menekan "Ajukan" lalu mengonfirmasi "Tarik $50,00? Fee $0,86 akan dibayarkan ke pengelola. Sisa nilai kamu $777,45.", then status "Menunggu".
     - Contoh angka: posisi Rezki per 14 Nov 2026 (nilai bersih $827,45, modal dasar $700, fee terutang $14,16). Untuk investor yang sedang rugi, fee pada pesan ini $0,00.
  3. Pengelola mentransfer di luar app, lalu menekan "Tandai selesai" dengan mengisi `jumlah_dikirim_usd` (wajib, <= nilai bersih saat itu), `bukti_transaksi` (opsional), dan `tanggal_efektif` (untuk penarikan manual tanpa arus onchain, wajib ada snapshot). Jika transfernya sudah terdeteksi sebagai arus onchain, pengelola cukup mencocokkannya (US-13): jumlah, bukti (signature transaksi), dan waktu efektif (waktu transfer + titik nilai pada menit tersebut, BR-18) terisi otomatis dan unit langsung dipotong pada waktu transfer itu.
  - Field: `jumlah_usd` (desimal, wajib, > 0, <= nilai bersih, 2 desimal), tombol "Tarik semua" yang mengisi nilai bersih, `alamat_wallet_tujuan` (teks, opsional, maks. 64 karakter), `catatan` (opsional, maks. 200 karakter).
  - Verifikasi: "Tarik semua" menghasilkan unit = 0, modal dasar = 0, porsi = 0%, dan seluruh fee terutang pindah ke pengelola.
- [ ] **AC-04-02 (Reverse Flow).** Batal selama "Menunggu" (BR-13). Pengelola menolak dengan alasan wajib.
- [ ] **AC-04-03 (Error Handling).**
  - Jumlah > nilai bersih: "Maksimal yang bisa kamu tarik hari ini $813,74."
  - Nilai bersih turun di bawah jumlah saat diproses (BR-09): pengelola melihat "Nilai bersih investor sekarang $790,10, kurang dari $800,00 yang diminta." dan tombol "Tandai selesai" nonaktif.
  - Cek data gagal (BR-12): "Penarikan ditahan sementara karena angka sedang dicek ulang."
  - Klik ganda: tombol nonaktif setelah klik pertama.

#### US-05: Lihat posisi semua anggota dan total pool

Sebagai anggota, saya ingin melihat posisi semua orang dan total pool, supaya semua memakai angka yang sama. Kalau tidak, orang membandingkan file yang berbeda.

- [ ] **AC-05-01 (Happy Path).** Given saya masuk, when saya membuka halaman Pool, then di bawah grafik saldo pool (US-08) tampil tabel per orang (nama, modal dasar, nilai bersih USD dan SOL, untung/rugi, porsi, fee terutang), baris pengelola (unit fee dan total fee terutang), total pool, dan status cek data "Semua cek lolos" atau "Ada 1 masalah: penarikan Rezki 14 Nov 2026 melebihi nilai bersihnya. Pengelola sedang memeriksa."
  - Verifikasi: total porsi = 100,00% dan total nilai = nilai pool snapshot terakhir.
  - Saat masih ada arus onchain berstatus "belum dicocokkan" (BR-19), tabel memakai NAV live, sehingga jumlah nilai semua anggota = nilai disesuaikan, bukan isi wallet. Di bawah baris total tampil baris rekonsiliasi supaya angkanya cocok dengan saldo pool di atas: "Total anggota US$1.910,13 · Belum dicocokkan −US$738,47 · Isi wallet US$1.171,66". Begitu arus dicocokkan (US-13), unit langsung terbarui pada waktu transfer (BR-18) dan baris rekonsiliasi hilang jika tidak ada arus tertunda lain.
- [ ] **AC-05-02 (Reverse Flow).** N/A (layar hanya baca).
- [ ] **AC-05-03 (Error Handling).** Sama dengan AC-01-03.

#### US-06: Impor riwayat awal

Sebagai pengelola, saya ingin memasukkan riwayat sejak 16 Okt 2026, supaya app langsung punya angka yang sama dengan catatan yang disepakati. Kalau tidak, app mulai dari nol dan tidak sesuai kenyataan.

- [ ] **AC-06-01 (Happy Path).** Given pool belum punya data, when pengelola mengunggah file riwayat (snapshot harian dan daftar setoran), then app menampilkan pratinjau (jumlah snapshot, jumlah transaksi, posisi tiap orang hasil hitung) dan pengelola menekan "Impor".
  - Template `snapshot.csv`: `tanggal`, `nilai_usd` (dari Tracker_LP_v3), `saldo_sol` (opsional, dari Laporan Harian, hanya sebagai pembanding). Template `transaksi.csv`: `tanggal_efektif`, `nama`, `jenis`, `jumlah_usd` (dari Tracker_LP_v3).
  - **Saldo SOL dihitung ulang dari harga pasar** (diputuskan 15 Nov 2026): `saldo_sol` yang disimpan = `nilai_usd` / harga SOL CoinGecko pada jam snapshot (08.00 WIB). Dengan begitu SOL selalu sejalan dengan nilai USD dan tanggal setoran di Tracker_LP_v3 (OQ-03), bukan dengan konvensi tanggal Laporan Harian.
  - Jika harga SOL turunan file (nilai_usd / `saldo_sol` dari Laporan Harian) berbeda lebih dari 3% dari harga pasar, baris diberi peringatan, tidak memblokir: "Baris 24 (8 Nov 2026): harga SOL turunan $133,96, harga pasar $89,35 (selisih 49,9%). Saldo SOL disimpan 24,1867 (dari harga pasar), bukan 16,1325. Cek apakah tanggal setoran sama di kedua file." *[Usulan ambang 3%]*. Dengan data per 14 Nov 2026, 5 baris diberi peringatan (31 Okt, 4, 5, 8, dan 13 Nov; rinciannya di Rencana Uji).
  - Setelah pratinjau benar, impor juga membuat titik estimasi per jam untuk seluruh rentang snapshot (BR-24). Pratinjau menampilkan jumlah titik estimasi yang akan dibuat (contoh: 16 Okt-15 Nov 2026 = sekitar 720 titik).
  - Bila CoinGecko tidak bisa dihubungi, impor tetap berjalan: `saldo_sol` memakai Laporan Harian dengan peringatan, titik estimasi tidak dibuat (grafik memakai snapshot harian, BR-21), dan pengelola bisa menekan "Buat ulang estimasi" nanti.
  - Verifikasi: hasil impor sama dengan Tracker_LP_v3 (OQ-03), toleransi +/- $0,01 per orang.
- [ ] **AC-06-02 (Reverse Flow).** Sebelum ada transaksi baru lewat app, pengelola dapat menekan "Batalkan impor" dan semua data impor terhapus.
- [ ] **AC-06-03 (Error Handling).** Baris bermasalah ditampilkan per baris, misalnya "Baris 11: nama 'Hafis' tidak ada di daftar anggota." Impor diblokir sampai semua baris benar.

#### US-07: Masuk dan kelola anggota

Sebagai anggota, saya ingin masuk dengan akun saya sendiri, supaya data hanya bisa diubah oleh yang berhak.

- [ ] **AC-07-01 (Happy Path).** Pengelola menambah anggota dengan `nama` (wajib, unik, 2-40 karakter, spasi di awal/akhir otomatis dihapus), `email` (wajib, unik, email akun Google, disimpan huruf kecil), `peran` (Investor/Pengelola), dan `alamat_wallet` (opsional, daftar alamat Solana 32-44 karakter, dipakai untuk saran pencocokan di US-13). Anggota baru menerima undangan dan masuk.
- [ ] **AC-07-02 (Reverse Flow).** Anggota yang sudah menarik semua dananya dapat dinonaktifkan, riwayatnya tetap ada. Anggota yang masih punya unit tidak bisa dinonaktifkan: "Rezki masih punya dana $827,45. Tarik semua dulu sebelum menonaktifkan."
- [ ] **AC-07-03 (Error Handling).**
  - Sesi habis: "Sesi kamu berakhir. Silakan masuk lagi." Setelah masuk, pengguna kembali ke halaman terakhir.
  - Nama duplikat: "Nama ini sudah dipakai anggota lain."
  - Email Google belum terdaftar: pengguna langsung dikeluarkan dengan pesan "Akun Google ini belum terdaftar. Minta pengelola menambahkan email kamu."
  - Email duplikat: "Email ini sudah dipakai anggota lain."

#### US-08: Grafik saldo pool (USD / SOL)

Sebagai anggota, saya ingin melihat grafik total saldo pool per hari dan bisa menukar satuannya antara USD dan SOL, supaya saya paham kenapa pool bisa terlihat naik dalam SOL tetapi turun dalam USD. Kalau tidak, saya hanya melihat angka hari ini tanpa konteks.

- [ ] **AC-08-01 (Happy Path).** Given ada minimal 2 snapshot, when saya membuka halaman Pool, then di bagian atas halaman tampil grafik garis total saldo pool. Kerapatan titik mengikuti rentang (BR-21), sama untuk USD dan SOL: per 5 menit untuk 24J, per 30 menit untuk 7H, per 2 jam untuk 30H, dan otomatis untuk Semua. Riwayat sebelum pembacaan otomatis memakai titik estimasi (BR-24):
  - Kontrol satuan 3 pilihan berupa ikon di kanan atas kartu ("$", logo Solana, Bandingkan), sama dengan US-12 poin 4. Pilihan dipakai bersama dengan grafik nilai saya (US-12) dan diingat di perangkat.
  - Tombol rentang "24J | 7H | 30H | Semua" di bawah grafik, default 24J (disetujui, OQ-12).
  - Angka besar = isi wallet (BR-19), bukan nilai disesuaikan, sehingga sama dengan yang terlihat di Jupiter. Titik terakhir pada grafik adalah isi wallet terbaru, dengan keterangan jam pembacaan.
  - Di bawah angka besar tampil untung/rugi pool pada rentang itu dalam satuan aktif dan persen (BR-16), contoh: "−US$138,63 (−6,77%) · 24J". Setor/tarik tidak dihitung sebagai untung atau rugi.
  - Titik yang ada setoran atau penarikan diberi penanda, digabung per kelompok waktu (BR-21). Keterangan di bawah grafik: "Titik bertanda = ada setoran atau penarikan. Naik-turun di titik itu bukan untung atau rugi." Penurunan grafik karena penarikan (contoh: Rezki 15 Nov 2026) memang terlihat, karena isi wallet memang berkurang.
  - Menyentuh atau menggeser jari di grafik mengikuti BR-23. Chip transaksi berisi nama dan jumlah, contoh: "Setoran: Salman $525,00, Rezki $200,00" atau "Tarik: Belum dicocokkan $731,51". Di titik estimasi, chip "Estimasi dari harga pasar per jam" tampil (BR-24). Tidak ada tooltip melayang.
  - Penjelasan selisih antara isi wallet dan nilai disesuaikan (saat ada arus onchain yang belum dicocokkan pengelola) tidak tampil sebagai paragraf di kartu. Penjelasan itu ada di balik ikon info di samping angka besar: "Isi wallet sekarang US$1.171,66. Ada US$738,47 transfer keluar yang belum dicocokkan pengelola, jadi nilai tiap orang sementara masih dihitung seolah-olah dana itu ada. Akan langsung beres begitu pengelola mencocokkan transfer."
  - Field per titik: `waktu` (tanggal + jam), `nilai_usd` (2 desimal), `saldo_sol` (4 desimal), `harga_sol_usd` (turunan, 2 desimal), `arus_usd` (boleh negatif), `estimasi` (boolean, BR-24), `transaksi[]` {nama, jenis, jumlah_usd}. `transaksi[]` juga memuat arus onchain yang belum dicocokkan, dengan nama "Belum dicocokkan".
  - Verifikasi mode USD dengan data Tracker_LP_v3 (dijalankan pada snapshot harian saja, tanpa titik estimasi): rentang Semua dimulai 16 Okt $397,76, berakhir 14 Nov $2.076,53, untung/rugi +$251,53; rentang 7H (8-14 Nov) untung/rugi -$286,71. Mode SOL diverifikasi setelah OQ-10 selesai.
  - Verifikasi mode Bandingkan: garis USD dan SOL sama-sama mulai 0% di awal rentang. Penarikan Rezki 15 Nov 2026 tidak membuat kedua garis melompat (BR-22).
- [ ] **AC-08-02 (Reverse Flow).** N/A (hanya baca). Satuan, mode Bandingkan, dan rentang bisa diganti kapan saja tanpa memuat ulang halaman. Melepas jari dari grafik selalu mengembalikan angka ke nilai live (BR-23).
- [ ] **AC-08-03 (Error Handling).**
  - Kurang dari 2 snapshot: "Grafik muncul setelah ada data 2 hari." Rentang 24J dengan kurang dari 2 titik nilai: "Grafik 24 jam muncul setelah ada data 10 menit."
  - Nilai live lama (BR-20): grafik tetap tampil sampai titik terakhir, dengan keterangan "Nilai terakhir diperbarui 13.03 WIB."
  - Gagal memuat: "Grafik belum bisa dimuat. Coba lagi." dengan tombol "Coba lagi".
  - Tanggal tanpa snapshot: tidak diisi angka karangan. Garis langsung menyambung ke snapshot berikutnya.
  - Offline: grafik memakai data tersimpan terakhir, dengan banner offline.
- **State layar:** loading (kerangka abu-abu setinggi grafik), empty (kurang dari 2 snapshot), error, sukses, sebagian N/A (nilai USD dan saldo SOL wajib di setiap snapshot), no-permission (diarahkan ke halaman Masuk).

#### US-13: Cocokkan arus onchain (pengelola)

Sebagai pengelola, saya ingin melihat setiap transfer masuk/keluar wallet yang terdeteksi dan mencocokkannya dengan permintaan, supaya setoran dan penarikan tercatat dengan jumlah dan waktu yang sama dengan transfer aslinya. Kalau tidak, nilai pool berubah tanpa transaksi yang tercatat, dan semua investor terlihat untung atau rugi palsu (contoh: penarikan Rezki 15 Nov 2026 membuat nilai pool turun sekitar 38% bila tidak dicatat).

- [ ] **AC-13-01 (Happy Path).**
  1. Given ada arus onchain berstatus "belum dicocokkan", when saya membuka halaman Arus, then tampil daftar per transfer: waktu (WIB), arah (masuk/keluar), token dan jumlah, nilai USD saat transfer (BR-19), alamat lawan lengkap dengan tautan ke Solscan, dan saran pencocokan. Menu Kelola menampilkan badge jumlah arus yang belum dicocokkan.
  2. Saran pencocokan: permintaan "Menunggu" dengan jenis sesuai arah dan selisih jumlah <= 2% *[Usulan]*, atau anggota yang `alamat_wallet`-nya sama dengan alamat lawan.
  3. Saya memilih salah satu aksi:
     - **Cocokkan dengan permintaan:** membuka "Konfirmasi diterima" (US-03) atau "Tandai selesai" (US-04) dengan jumlah, bukti, dan waktu efektif (waktu transfer onchain + titik nilai saat itu, BR-18) terisi. Beberapa transfer boleh dicocokkan ke satu permintaan (contoh: 1 USDC + 730,51 USDC, memakai waktu transfer terakhir atau titik nilai saat transfer selesai).
     - **Buat permintaan untuk anggota:** untuk transfer tanpa permintaan, misalnya setoran yang dikirim sebelum diajukan. Permintaan dibuat atas nama anggota yang dipilih, lalu langsung dicocokkan.
     - **Biaya pool:** misalnya biaya transaksi atau sewa akun. Nilainya dianggap rugi pool dan tidak dinetralkan (BR-19). Catatan wajib.
     - **Bukan arus:** misalnya dust atau token spam yang lolos ambang. Catatan wajib.
  4. Status berubah, transaksi langsung diselesaikan memakai NAV pada waktu transfer (BR-18), posisi anggota & nilai live dihitung ulang, dan tampil "Transfer 15 Nov 2026, 10.05 WIB dicocokkan dengan penarikan Rezki $731,51."
  - Field: `status` (`belum` / `dicocokkan` / `biaya` / `bukan_arus`), `permintaan_id` (wajib bila dicocokkan), `catatan` (wajib bila biaya atau bukan arus, maks. 200 karakter).
- [ ] **AC-13-02 (Reverse Flow).** Penandaan bisa dibatalkan selama snapshot resmi yang memakai arus itu belum dibuat. Sesudahnya, perubahan diperlakukan sebagai koreksi (BR-11) dan tercatat di log audit.
- [ ] **AC-13-03 (Error Handling).**
  - Jumlah transfer berbeda lebih dari 2% dari permintaan: "Jumlah transfer $731,51 berbeda dari permintaan $800,00. Isi alasan untuk melanjutkan."
  - Arus sudah dicocokkan pengelola lain di tab lain: "Transfer ini sudah dicocokkan. Muat ulang daftar."
  - Ada arus belum dicocokkan saat snapshot resmi dibuat: banner BR-12 tampil ke semua anggota dengan teks "Ada 1 transfer di wallet yang belum dicatat pengelola. Angka sedang dicek ulang."
- **State layar:** loading (kerangka daftar), empty ("Semua transfer sudah dicocokkan."), error, sukses, no-permission ("Halaman ini khusus pengelola.").

### Should Have (P1)

#### US-09: Riwayat transaksi dan log audit
Daftar setoran/penarikan saya beserta statusnya, dan log perubahan snapshot/transaksi (siapa, kapan, nilai lama ke baru) yang bisa dilihat semua anggota.
- [ ] **AC-09-01.** Setiap ubah atau hapus menghasilkan 1 entri log. Log tidak bisa dihapus siapa pun.

### Could Have (P2)

- **US-10: Notifikasi.** Pengelola diberi tahu ada permintaan baru, investor diberi tahu permintaannya selesai atau ditolak.
- **US-11: Ekspor CSV.** Posisi dan riwayat bisa diekspor sebagai cadangan.

### Won't Have (P3)

| Fitur | Alasan | Kapan dipertimbangkan |
|---|---|---|
| Membaca posisi di protokol selain Meteora DLMM (Orca, Raydium, dll.) | Pool saat ini hanya di Meteora DLMM. Tiap protokol butuh adapter valuasi sendiri. (Baca saldo wallet dari blockchain pindah ke P0, lihat BR-17, 15 Nov 2026) | Jika pengelola memindahkan dana ke protokol lain |
| Mencocokkan transfer ke investor tanpa konfirmasi pengelola | Transfer bisa datang dari exchange atau wallet lain. Salah cocok berarti salah unit | Tidak direncanakan |
| Eksekusi transfer dari app | App tidak memegang dana (Section 1) | Tidak direncanakan |
| Beberapa pool/wallet | Saat ini hanya 1 pool | Jika ada pool kedua |
| Fee bertingkat / high-water mark | Aturan sekarang flat 10% | Jika grup mengubah kesepakatan |
| Saran investasi, laporan pajak | Di luar masalah Section 1 | Tidak direncanakan |

### Matriks Keterlacakan (P0)

| Masalah di Section 1 | Story | AC | Aturan | Kontrak Section 3 |
|---|---|---|---|---|
| Porsi dan untung/rugi pribadi tidak terlihat | US-01, US-12 | AC-01-01..03, AC-12-01..03 | BR-02, 04, 05, 14, 15, 16 | API #1, #2, Mesin Hitung, NF-01, NF-03 |
| Dua file, angka berbeda | US-02, US-05, US-06 | AC-02, AC-05, AC-06 | BR-11, 12 | API #3-5, #12-13, `log_audit`, Rencana Uji (golden test) |
| Porsi berubah tiap setoran | US-03 | AC-03-01..03 | BR-03, 08, 10 | API #7, #9-11, state machine permintaan, partial unique index |
| Penarikan belum punya cara hitung | US-04 | AC-04-01..03 | BR-06, 07, 09 | API #6-7, #10, konkurensi `versi_data` |
| USD dan SOL bergerak berbeda (contoh: Salman -$31,90 dalam USD tetapi +1,76 SOL) | US-08, US-12 | AC-08-01..03, AC-12-01 | BR-16, 22 | API #2, NF-01 |
| Grafik harus terasa seperti aplikasi wallet (permintaan investor 15 Nov 2026) | US-08, US-12 | AC-08-01..02, AC-12-01..02 | BR-21, 23 | API #2, NF-13 |
| Data hanya boleh diubah yang berhak | US-07 | AC-07-01..03 | RBAC (2.5) | API #14, Login & Hak Akses (RLS), NF-04 |
| Investor ingin nilai terbaru dan grafik harian (24 jam), bukan rekap 08.00 | US-01, US-08, US-12 | AC-01-01, AC-08-01, AC-12-01..03 | BR-17, 18, 20, 21 | Job Pembaca Wallet, `titik_nilai`, API #1, #2, NF-10 |
| Setor/tarik terjadi di wallet sebelum tercatat di app (contoh: penarikan Rezki 15 Nov 2026) | US-13, US-03, US-04 | AC-13-01..03 | BR-12 (e), 19 | `arus_onchain`, API #17-18 |
| Beban input saldo harian pengelola | US-02 | AC-02-01..03 | BR-18 | Job Pembaca Wallet |

## 2.4 Alur Pengguna

### Alur Utama

- **UC-001 Investor cek posisi:** buka link di HP, masuk (sekali, lalu diingat), Beranda langsung menampilkan nilai dan grafik saya, lalu kartu detail; opsional buka "Pool" untuk grafik pool dan posisi semua anggota.
- **UC-002 Penarikan:**
  1. Investor membuka "Tarik" dan mengetik jumlah. Simulasi tampil.
  2. Investor menekan "Ajukan" dan mengonfirmasi. Status "Menunggu".
  3. Pengelola melihat permintaan dan mentransfer di luar app.
  4. Dalam 1-2 menit, app mendeteksi transfer keluar sebagai arus onchain. Nilai live langsung menetralkan transfer itu (BR-19), sehingga NAV investor lain tidak ikut turun.
  5. Pengelola mencocokkan arus dengan permintaan (US-13), lalu "Tandai selesai" dengan jumlah dan waktu transfer onchain yang sudah terisi. Transaksi langsung dinilai memakai titik nilai pada menit transfer terjadi (BR-18).
  6. Investor melihat status "Selesai" dan posisi barunya langsung diperbarui.
- **UC-003 Setoran:** sama dengan UC-002 dengan arah dana masuk.
- **UC-004 Pembacaan otomatis:** tiap menit app membaca wallet dan menyimpan titik nilai (BR-17). Jam 08.00 WIB titik nilai menjadi snapshot resmi (BR-18). Pengelola tidak perlu mengisi saldo kecuali pembacaan gagal.

### Alur Balik

- Investor membatalkan permintaan yang masih "Menunggu".
- Pengelola menolak permintaan dengan alasan.
- Pengelola mengoreksi snapshot lama; angka sesudahnya dihitung ulang dan tercatat di log.

### Alur Cabang

- Snapshot tanggal efektif belum ada (pembacaan otomatis gagal): pengelola diarahkan mengisinya dulu (US-02).
- Nilai bersih turun di bawah jumlah tarik: permintaan tidak bisa diselesaikan (BR-09).
- Cek data gagal (BR-12): pengajuan tarik baru diblokir dan banner tampil ke semua anggota.
- Transfer masuk/keluar tanpa permintaan: tampil di daftar arus (US-13). Pengelola membuat permintaan atas nama anggota, menandai biaya pool, atau menandai bukan arus.
- Pembacaan wallet gagal beberapa menit: tidak ada titik nilai; angka memakai titik terakhir dengan keterangan jam (BR-20).

### Interaksi Banyak Pengguna

- Dua investor menarik di hari yang sama: diproses berurutan dengan NAV yang sama (NAV dihitung sebelum arus hari itu, BR-02).
- Pengelola mengoreksi snapshot saat investor melihat simulasi: saat menekan "Ajukan", angka dicek ulang; jika berubah tampil "Angka baru saja diperbarui. Cek lagi simulasi kamu."

## 2.5 Hak Akses (RBAC)

| Aksi | Investor | Pengelola |
|---|---|---|
| Lihat posisi sendiri | Ya | Ya |
| Lihat posisi semua anggota dan total pool | Ya | Ya |
| Lihat daftar permintaan setor/tarik semua anggota | Ya (disetujui, OQ-07; sebelumnya perlu konfirmasi) | Ya |
| Ajukan / batalkan setoran dan tarik milik sendiri | Ya | Ya (untuk unit fee miliknya) |
| Konfirmasi / tolak / selesaikan permintaan | Tidak | Ya |
| Isi / ubah snapshot | Tidak | Ya |
| Lihat daftar arus onchain | Tidak (hanya pengelola; status belum cocok tetap terlihat di rekonsiliasi Pool) | Ya |
| Cocokkan / tandai arus onchain | Tidak | Ya |
| Menulis titik nilai dan arus onchain | Tidak | Tidak (hanya job pembaca, lewat service role) |
| Impor riwayat, kelola anggota, ubah pengaturan fee | Tidak | Ya |
| Lihat log audit | Ya | Ya |
| Hapus log audit | Tidak | Tidak |

## 2.6 Sumber Data

- Nilai pool, saldo SOL, dan harga SOL dibaca otomatis dari onchain tiap 1 menit (BR-17): posisi Meteora DLMM, saldo wallet lewat Solana RPC, harga dari Jupiter. Pengelola hanya mengisi atau mengoreksi bila pembacaan gagal atau keliru (US-02).
- Transfer masuk/keluar wallet terdeteksi otomatis (BR-19), tetapi pemiliknya (siapa yang setor atau tarik) selalu ditentukan pengelola (US-13).
- Riwayat sebelum pembacaan otomatis: nilai USD dari Tracker_LP_v3, saldo SOL dihitung ulang dari harga SOL pasar (CoinGecko), dan titik estimasi per jam dibuat sekali saat impor (US-06, BR-24).
- Siapa memiliki berapa tidak ada di blockchain. Porsi tetap dihitung dari catatan setoran dan penarikan dengan sistem unit.
- Field Meteora `totalDeposit` dan `pnl` tidak dipakai. Rebalance dihitung Meteora sebagai deposit baru (contoh 15 Nov 2026: `totalDeposit` $82.433 untuk posisi bernilai $1.150), sehingga tidak mencerminkan modal investor.
- Transaksi berlaku setelah dikonfirmasi pengelola.
- Semua angka lain dihitung app, tidak pernah diisi manual.
- Riwayat dan log disimpan selamanya (data kecil).

---

# Section 3: How & Next

Keputusan teknis dari pemilik PRD: web app / PWA, Next.js + Supabase, login Google, dibangun sendiri oleh Salman dengan free tier. Pilihan rinci yang belum final ditandai *[Usulan - perlu konfirmasi engineering]*.

## 3.1 Entitas Backend Utama

### Batas Domain

- Satu app, satu pool, satu wallet. Modul: Anggota & Akses, Pencatatan (snapshot, permintaan), Pembaca Wallet (titik nilai, arus onchain), Mesin Hitung, Tampilan.
- **Prinsip inti: simpan fakta, hitung sisanya.** Yang disimpan hanya fakta (titik nilai hasil baca wallet, snapshot harian, arus onchain, transaksi dalam USD). Unit, NAV, profit, fee, dan porsi selalu dihitung ulang dari fakta setiap kali dibaca, sehingga koreksi data lama otomatis membuat semua angka sesudahnya benar (BR-11). Volume data kecil (sekitar 365 snapshot dan di bawah 200 transaksi per tahun).

### Data Model (Postgres / Supabase) *[Usulan - perlu konfirmasi engineering]*

**`anggota`**

| Field | Tipe | Aturan |
|---|---|---|
| id | uuid | PK |
| auth_user_id | uuid | unik, null sampai login pertama, refer ke `auth.users` |
| nama | text | wajib, unik, 2-40 karakter, otomatis di-trim |
| email | text | wajib, unik, huruf kecil (email Google) |
| peran | text | `investor` / `pengelola` |
| alamat_wallet | text[] | opsional, tiap alamat 32-44 karakter base58. Hanya untuk saran pencocokan (US-13) |
| aktif | boolean | default true |
| dibuat_pada | timestamptz | default now() |

**`pengaturan_pool`** (selalu 1 baris)

| Field | Tipe | Default |
|---|---|---|
| nama_pool | text | "Pasti Cuan" |
| tanggal_mulai | date | 2026-10-16 |
| fee_persen | numeric(5,4) | 0,1000 (cek 0-1) |
| satuan_dasar_fee | text | `USD` (diputuskan; nilai `SOL` tetap didukung bila grup mengubah kesepakatan) |
| batas_data_lama_hari | int | 2 (BR-15) |
| ambang_lonjakan_persen | numeric | 30 (AC-02-03) |
| zona_waktu | text | Asia/Jakarta |
| alamat_wallet_pool | text | `By6HpsukcTeVsV6FyBzhQJ2nzdHP46kXaSPtrCGUzoaR` |
| jam_snapshot_otomatis | time | 08:00 (BR-18, disetujui OQ-12) |
| ambang_likuiditas_token_usd | numeric | 10000 (BR-17, disetujui OQ-12) |
| ambang_dust_usd | numeric | 1 (BR-19, disetujui OQ-12) |
| batas_live_lama_menit | int | 15 (BR-20, disetujui OQ-12) |
| toleransi_cocok_persen | numeric | 2 (AC-13-01, disetujui OQ-12) |

**`snapshot`**

| Field | Tipe | Aturan |
|---|---|---|
| id | uuid | PK |
| tanggal | date | wajib, unik, >= tanggal_mulai, <= hari ini, tidak bisa diubah setelah dibuat |
| nilai_usd | numeric(14,2) | > 0. Dari titik nilai (otomatis), diisi pengelola (manual/koreksi), atau riwayat dari Tracker_LP_v3 (impor) |
| saldo_sol | numeric(24,9) | > 0. Sumber sama dengan `nilai_usd`. Riwayat impor: `nilai_usd` / harga SOL pasar CoinGecko jam 08.00 WIB (US-06), bukan angka Laporan Harian |
| harga_sol_usd | numeric | kolom generated = nilai_usd / saldo_sol |
| fee_lp_diklaim_sol | numeric(24,9) | opsional, >= 0 |
| catatan | text | opsional, <= 500 karakter |
| sumber | text | `otomatis` / `manual` / `koreksi` / `impor` (BR-18, AC-02-02) |
| titik_nilai_id | bigint | FK `titik_nilai`, terisi bila sumber `otomatis` |
| dibuat_oleh, dibuat_pada, diubah_pada | uuid, timestamptz | `dibuat_oleh` null bila otomatis |

**`permintaan`** (juga dipakai untuk transaksi hasil impor)

| Field | Tipe | Aturan |
|---|---|---|
| id | uuid | PK |
| anggota_id | uuid | FK `anggota` |
| jenis | text | `setor` / `tarik` |
| jumlah_usd | numeric(14,2) | > 0 |
| tanggal_transfer | date | wajib bila `setor` |
| alamat_wallet_tujuan | text | opsional, <= 64 karakter |
| bukti_transaksi | text | opsional, <= 100 karakter |
| catatan | text | opsional, <= 200 karakter |
| status | text | `menunggu` / `selesai` / `ditolak` / `dibatalkan` |
| alasan | text | wajib bila ditolak, atau bila jumlah_final_usd berbeda dari jumlah_usd |
| tanggal_efektif | date | FK `snapshot.tanggal` ON DELETE RESTRICT, wajib bila selesai untuk sumber manual/impor (boleh null bila onchain) |
| waktu_efektif | timestamptz | wajib bila selesai; untuk onchain = waktu transfer, untuk manual/impor = 08.00 WIB pada `tanggal_efektif` |
| titik_nilai_id | bigint | FK `titik_nilai` ON DELETE RESTRICT, terisi bila transaksi dicocokkan dengan transfer onchain (BR-18) |
| jumlah_final_usd | numeric(14,2) | wajib bila selesai |
| sumber | text | `app` / `impor` |
| diproses_oleh, diproses_pada, dibuat_pada | uuid, timestamptz | |

- Partial unique index `(anggota_id, jenis) WHERE status = 'menunggu'` menegakkan BR-08 di level database.
- FK ON DELETE RESTRICT menjamin snapshot yang dipakai transaksi tidak bisa dihapus (AC-02-02).

**`log_audit`**

| Field | Tipe |
|---|---|
| id | bigserial |
| tabel, aksi | text (`insert` / `update` / `delete`) |
| baris_id | uuid |
| nilai_lama, nilai_baru | jsonb |
| oleh, pada | uuid, timestamptz |

- Diisi oleh trigger Postgres pada `snapshot`, `permintaan`, `anggota`, `pengaturan_pool`, dan perubahan status `arus_onchain`.
- Tidak ada policy UPDATE/DELETE, sehingga log tidak bisa dihapus siapa pun (AC-09-01).

**`titik_nilai`** (hasil pembacaan wallet, BR-17)

| Field | Tipe | Aturan |
|---|---|---|
| id | bigserial | PK |
| dibaca_pada | timestamptz | wajib, unik per `resolusi` |
| resolusi | text | `1m` / `15m` / `1h` (BR-21) |
| sumber | text | `baca` (job pembaca) / `estimasi` (BR-24, selalu resolusi `1h`) |
| nilai_usd | numeric(14,2) | > 0, nilai mentah sebelum penetralan arus |
| saldo_sol | numeric(24,9) | = nilai_usd / harga_sol_usd |
| harga_sol_usd | numeric(14,6) | dari Jupiter, cadangan Meteora `solPrice` |
| rincian | jsonb | {posisi[] {pool, mint_x, mint_y, jumlah_x, jumlah_y, fee_x, fee_y}, harga {mint: usd}, dlmm_usd, fee_belum_klaim_usd, sol_native, token[] {mint, jumlah, usd}, data_pool_pada, meteora_usd (pembanding)}. Hanya untuk resolusi `1m`; dihapus saat diringkas. Untuk `estimasi`: {snapshot_sebelum, snapshot_sesudah, token_pasangan, w, k} |

- Ringkasan per 15 menit dan per jam memakai titik terakhir dalam periodenya, bukan rata-rata, supaya cocok dengan nilai yang dilihat investor saat itu.
- Ukuran: sekitar 1.440 baris per hari untuk `1m`. Dengan retensi BR-21 (10.080 baris `1m` + sekitar 8.000 baris `15m` + 8.760 baris `1h` per tahun), tabel berisi sekitar 27.000 baris di tahun pertama, lalu bertambah sekitar 8.760 baris per tahun.

**`arus_onchain`** (BR-19, US-13)

| Field | Tipe | Aturan |
|---|---|---|
| id | uuid | PK |
| signature | text | wajib. Unik bersama `urutan`, karena satu transaksi bisa berisi beberapa transfer |
| urutan | int | urutan transfer dalam transaksi |
| waktu | timestamptz | waktu blok |
| arah | text | `masuk` / `keluar` |
| mint | text | `SOL` atau alamat mint token |
| jumlah | numeric(30,9) | > 0, dalam satuan token |
| nilai_usd | numeric(14,2) | nilai saat transfer |
| alamat_lawan | text | alamat asal (masuk) atau tujuan (keluar) |
| status | text | `belum` / `dicocokkan` / `biaya` / `bukan_arus`, default `belum` |
| permintaan_id | uuid | FK `permintaan`, wajib bila `dicocokkan` |
| catatan | text | wajib bila `biaya` / `bukan_arus`, <= 200 karakter |
| ditandai_oleh, ditandai_pada | uuid, timestamptz | |

- Transfer di bawah `ambang_dust_usd` tetap disimpan dengan status `bukan_arus` dan catatan "dust otomatis", supaya bisa diaudit.
- Unique `(signature, urutan)` menjamin satu transfer tidak tercatat dua kali walau job membaca ulang.

### Mesin Hitung

Modul TypeScript murni `hitungPool(pengaturan, snapshot[], transaksiSelesai[], titikNilaiReferensi[])`, dipakai di server dan untuk simulasi:

1. Urutkan seluruh event (snapshot harian 08.00 WIB dan transaksi selesai `waktu_efektif`) secara kronologis. Hari pertama NAV = $1 (BR-01). NAV SOL = NAV USD / harga SOL.
2. Untuk tiap snapshot harian: arus = jumlah setor - jumlah tarik manual/impor yang efektif tepat di snapshot tanggal itu (transaksi onchain sudah diproses pada `waktu_efektif`-nya masing-masing). NAV = (nilai_usd - arus) / unit sebelum arus (BR-02). Untuk transaksi onchain yang dicocokkan (BR-18), NAV pada `waktu_efektif` dihitung dari `titik_nilai` terdekat pada/sebelum transfer (`nilai_usd` titik tersebut dikurangi arus masuk `belum` dan ditambah arus keluar `belum` lain yang terjadi sebelum transfer tersebut dan belum diproses) dibagi total unit aktif sebelum transfer.
3. **Setor:** unit bertambah jumlah / NAV. Modal dasar USD bertambah jumlah. Modal dasar SOL bertambah jumlah / harga SOL (untuk profit SOL).
4. **Tarik W** (BR-06): investor punya unit u, nilai kotor G, fee terutang F, nilai bersih N = G - F, dan f = W / N.
   - Unit investor berkurang f x u.
   - Dari unit itu, W / NAV keluar dari pool, dan (f x F) / NAV pindah ke pengelola.
   - Modal dasar USD dan SOL masing-masing berkurang f x modal.
5. Unit milik pengelola tidak kena fee dan modal dasarnya 0.
6. Jika `satuan_dasar_fee = SOL`: fee = 10% x max(0, profit SOL), dikonversi ke USD dengan harga snapshot/titik nilai.
7. Jalankan cek invarian BR-12, termasuk (e) arus onchain yang belum ditandai.
8. **Nilai disesuaikan dan NAV live** (BR-19): ambil isi wallet dari titik nilai terakhir, kurangi arus masuk berstatus `belum` dan tambah arus keluar berstatus `belum` sejak titik acuan terakhir (transaksi yang sudah dicocokkan sudah memotong/menambah unit pada waktu transfernya), lalu bagi dengan total unit aktif saat ini untuk mendapat NAV live. Posisi tiap anggota = unit x NAV live, fee dan profit dihitung seperti BR-04. Saldo pool yang ditampilkan tetap isi wallet. Hasil ini hanya untuk tampilan dan simulasi, tidak disimpan.
9. **Seri grafik rentang pendek** (BR-21): untuk tiap titik dalam rentang, hitung NAV live di titik itu dengan arus sampai waktu titik tersebut.

- **Presisi:** decimal.js dengan presisi 30 digit, tanpa angka float. Pembulatan hanya saat tampil (BR-14).
- Server selalu menghitung ulang sebelum menyimpan transaksi. Hasil simulasi di HP tidak dipercaya mentah-mentah.

### Job Pembaca Wallet *[Usulan - perlu konfirmasi engineering]*

Supabase `pg_cron` memanggil Edge Function `baca-wallet` lewat `pg_net` setiap menit (`* * * * *`), dengan secret khusus cron yang disimpan di Vault. Langkahnya:

1. Ambil daftar pool yang punya posisi terbuka: `GET https://dlmm.datapi.meteora.ag/portfolio/open?user={alamat_wallet_pool}`. Dari sini didapat alamat pool, mint token X dan Y, dan `poolStateUpdatedAtBlockTime` untuk `rincian.data_pool_pada`. Angka USD `total.balances` tidak dipakai untuk nilai (BR-17), hanya untuk pembanding di log job.
2. Untuk tiap pool, ambil jumlah token per posisi: `GET https://dlmm.datapi.meteora.ag/positions/{pool}/pnl?user={alamat_wallet_pool}&status=open`. Pakai `unrealizedPnl.balanceTokenX/Y.amount` dan `unrealizedPnl.unclaimedFeeTokenX/Y.amount`. Saat ini 1 pool, jadi 2 panggilan Meteora per menit.
3. Ambil saldo wallet lewat Solana RPC: `getBalance`, lalu `getTokenAccountsByOwner` untuk program Token dan Token-2022.
4. Ambil harga lewat Jupiter Price API v3 dalam satu panggilan untuk SOL, token X dan Y semua posisi, dan semua mint di wallet yang saldonya > 0 (maksimal 50 mint per panggilan). Satu panggilan ini menjamin semua harga berasal dari menit yang sama.
5. Hitung nilai pool sesuai BR-17 (jumlah token x harga), lalu simpan ke `titik_nilai` dengan resolusi `1m`. `rincian` menyimpan jumlah token per posisi dan harga yang dipakai.
6. Deteksi arus (dijalankan tiap **5 menit**, diubah 17 Nov 2026 dari tiap 1 menit untuk menghemat credit Helius sambil tetap memenuhi NF-11): `getSignaturesForAddress` sejak signature terakhir yang sudah diproses, lalu `getTransaction` untuk masing-masing. Transaksi yang menyentuh program DLMM (`LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo`) atau berupa swap diabaikan. Transfer ke/dari alamat luar disimpan ke `arus_onchain` (BR-19).
7. Jika ini titik nilai pertama yang berhasil pada atau sesudah 08.00 WIB dan snapshot tanggal itu belum ada, buat snapshot `otomatis` lalu jalankan Mesin Hitung dan cek BR-12 (BR-18).

- **Batas waktu:** tiap panggilan API dibatasi 8 detik dan dicoba ulang 1 kali. Jika tetap gagal, menit itu dilewati dan alasannya dicatat di log job. Tes 15 Nov 2026: 1 timeout dari 17 panggilan ke Meteora.
- **Job ringkasan:** berjalan tiap hari jam 03.00 WIB. Titik `1m` yang lebih dari 7 hari diringkas menjadi `15m`, dan `15m` yang lebih dari 90 hari diringkas menjadi `1h` (BR-21).
- **Kenapa Supabase, bukan Vercel atau GitHub Actions:** cron Vercel Hobby hanya boleh sekali sehari, dan deploy gagal kalau dijadwalkan lebih sering. Jadwal GitHub Actions minimal 5 menit, sering terlambat 5-30 menit di jam sibuk, dan bisa dilewati. `pg_cron` di Supabase bisa per menit di free tier.

### Sumber Data Onchain

| Sumber | Dipakai untuk | Batas (gratis) | Hasil uji 15 Nov 2026 | Cadangan |
|---|---|---|---|---|
| Meteora DLMM Data API `dlmm.datapi.meteora.ag` | Daftar pool dan posisi (`portfolio/open`), jumlah token dan fee belum diklaim per posisi (`positions/{pool}/pnl`). Angka USD-nya tidak dipakai untuk nilai | Tanpa key, 30 request/detik | Nilai USD berubah tiap 1-3 menit. Data pool tertinggal 0,5-12 menit. Respons 0,2-2,6 detik (`200 OK` dari Node `fetch` di balik Cloudflare, 17 Nov 2026). API posisi mengembalikan jumlah token | Decode akun posisi/bin langsung lewat raw `getAccountInfo` RPC (lebih ringan daripada SDK `@meteora-ag/dlmm` yang 4,53 MB + `express`/`anchor` untuk batas CPU Edge Function 2 detik) |
| Solana RPC (Helius free) | Saldo SOL dan token, riwayat transaksi | 1 juta credit/bulan, 10 request/detik (`getBalance` & `getTokenAccountsByOwner` = 1 credit; `getSignaturesForAddress` & `getTransaction` = 10 credit) | Saldo, token accounts, dan signatures terbaca lengkap (diuji langsung dengan key Helius & RPC publik, 17 Nov 2026) | RPC publik `api.mainnet-beta.solana.com` (lebih ketat rate limit-nya) |
| CoinGecko `market_chart/range` (`api.coingecko.com/api/v3/coins/solana/market_chart/range`) | Harga SOL dan token pasangan (DOGE, PEPE) historis per jam, hanya sekali saat impor (US-06, BR-24) | Tanpa key bisa dipakai dengan rate limit rendah; Demo key gratis 30 panggilan/menit. Rentang 1-90 hari dikirim per jam, lebih dari 90 hari per hari | 16 Okt-15 Nov 2026: 727 titik, jarak median 60 menit, tanpa key. Harga 16 Okt 08.00 WIB $105,34, cocok dengan snapshot ($105,33). 25 dari 30 snapshot Excel cocok dalam 3%. Harga DOGE per jam juga tersedia (dipakai untuk menghitung DOGE/SOL) | Impor tanpa estimasi; grafik riwayat memakai snapshot harian (BR-21) |
| Jupiter Price API v3 `api.jup.ag/price/v3` | Harga SOL dan token, likuiditas token | Tanpa key 0,5 request/detik, free key 1 request/detik | Harga berubah tiap pembacaan (`200 OK` 426 ms tanpa API key, 17 Nov 2026). Selisih dengan `solPrice` Meteora < 0,1% | `solPrice` dari respons Meteora |

- **Perkiraan pemakaian per bulan** (pembacaan nilai 43.200x/bulan; deteksi arus tiap 5 menit = 8.640x/bulan): Edge Function 43.200 dari jatah 500.000. Meteora 2 request/menit (1 pool), Jupiter 1 request/menit. Helius RPC: `getBalance` (43.200 x 1) + `getTokenAccountsByOwner` x2 (86.400 x 1) + `getSignaturesForAddress` tiap 5 menit (8.640 x 10 = 86.400) = **~216.000 credit dasar/bulan** + ~10 credit per `getTransaction` baru (jauh di bawah batas 1 juta credit, OQ-14).
- **Batas akurasi:** harga selalu segar (Jupiter, menit yang sama). Jumlah token per posisi dari API Meteora bisa tertinggal beberapa menit; karena rentang posisi sempit (sekitar 2%), komposisi DOGE/SOL bisa berubah dalam waktu itu. Kesalahannya kecil dibanding memakai angka USD Meteora yang tertahan, dan dapat ditambah cadangan raw `getAccountInfo` RPC bila API Meteora down. Angka final tetap memakai snapshot resmi.

### Kontrak API (Next.js Route Handlers, semua wajib login)

Format error:

```json
{
  "kode": "VALIDASI | TIDAK_LOGIN | TIDAK_BERHAK | TIDAK_DITEMUKAN | KONFLIK | ATURAN_BISNIS",
  "pesan": "<teks persis dari Section 2>",
  "detail": { "<field>": "<pesan>" }
}
```

| # | Method & Endpoint | Request | Response | Error |
|---|---|---|---|---|
| 1 | `GET /api/posisi?tanggal=` | tanggal opsional (default terakhir) | `tanggal_data`, `versi_data`, `pool` {nilai_usd, nilai_sol, harga_sol, nav_usd, nav_sol, total_unit}, `anggota[]` {id, nama, peran, unit, porsi_persen, modal_dasar_usd, nilai_kotor_usd, nilai_bersih_usd, nilai_bersih_sol, profit_usd, profit_sol, roi_persen, fee_terutang_usd, lama_ikut_hari}, `cek` {status, penyebab[]}, `data_lama`, `live` {dibaca_pada, isi_wallet_usd, isi_wallet_sol, nilai_disesuaikan_usd, harga_sol, nav_usd, nav_sol, arus_belum_diproses_usd, lama_menit, anggota[] {id, nilai_bersih_usd, nilai_bersih_sol, profit_usd, profit_sol, roi_persen, fee_terutang_usd}} (null bila belum ada titik nilai sejak snapshot terakhir) | 401 |
| 2 | `GET /api/riwayat?cakupan=saya\|pool&rentang=24j\|7h\|30h\|semua` | - | `cakupan=saya` (US-12): `titik[]` {tanggal, nilai_bersih_usd, nilai_bersih_sol, harga_sol_usd, arus_saya_usd, untung_rugi_usd, untung_rugi_sol, persen_usd, persen_sol, transaksi_saya[] {jenis, jumlah_usd}}, `ringkasan` {untung_rugi_usd, untung_rugi_sol, untung_rugi_persen_usd, untung_rugi_persen_sol}. `cakupan=pool` (US-08): `titik[]` {tanggal, nilai_usd, saldo_sol, harga_sol_usd, nav_usd, nav_sol, arus_usd, untung_rugi_usd, untung_rugi_sol, transaksi[] {nama, jenis, jumlah_usd}}, `ringkasan` {untung_rugi_usd, untung_rugi_sol, persen_usd, persen_sol}. `untung_rugi_*` dan `persen_*` per titik bersifat kumulatif dari awal rentang, sehingga scrub (BR-23) dan mode Bandingkan (BR-22) tidak perlu menghitung ulang di HP. `nilai_usd` pool = isi wallet. Kedua satuan selalu dikirim, jadi kontrol satuan tidak memuat ulang data (BR-16). Field `tanggal` diganti `waktu` (tanggal + jam). Tiap titik membawa `estimasi` (boolean, BR-24). Jumlah titik maksimal: `24j` 288, `7h` 336, `30h` 360, `semua` 365 (BR-21), ditambah 1 titik pembanding di awal. Ukuran sekitar 40-50 KB JSON, sekitar 10 KB setelah gzip. Respons di-cache 60 detik untuk `24j` dan `7h`, 5 menit untuk `30h` dan `semua` | 401, 400 cakupan atau rentang tidak dikenal |
| 3 | `POST /api/snapshot` | tanggal, nilai_usd, saldo_sol, fee_lp_diklaim_sol?, catatan? | 201 {snapshot, peringatan_lonjakan, cek} | 400, 403, 409 tanggal sudah ada |
| 4 | `PATCH /api/snapshot/{tanggal}` | field yang diubah + `konfirmasi_hitung_ulang: true` | 200 {snapshot, cek} | 400 tanpa konfirmasi, 422 hitung ulang melanggar BR-09 (+ daftar penyebab) |
| 5 | `DELETE /api/snapshot/{tanggal}` | - | 204 | 422 dipakai transaksi |
| 6 | `POST /api/simulasi-tarik` | jumlah_usd | {versi_data, unit_terjual, fee_dibayar_usd, sisa_nilai_bersih_usd, sisa_modal_dasar_usd, sisa_porsi_persen} | 422 melebihi nilai bersih |
| 7 | `POST /api/permintaan` | jenis, jumlah_usd, tanggal_transfer?, bukti_transaksi?, alamat_wallet_tujuan?, catatan?, versi_data (wajib bila tarik) | 201 {permintaan} | 409 `PERMINTAAN_MENUNGGU_ADA`, 409 `ANGKA_BERUBAH`, 422 `MELEBIHI_NILAI_BERSIH`, 422 `CEK_GAGAL` |
| 8 | `GET /api/permintaan?status=` | - | semua anggota melihat daftar permintaan semua anggota (diputuskan, OQ-07) | 401 |
| 9 | `POST /api/permintaan/{id}/batal` | - | 200 | 403 bukan pemilik, 409 status bukan menunggu |
| 10 | `POST /api/permintaan/{id}/selesai` | jumlah_final_usd, tanggal_efektif? (manual), waktu_efektif? / titik_nilai_id? (onchain), bukti_transaksi?, alasan? | 200 {permintaan, posisi_baru} | 403, 422 `SNAPSHOT_TIDAK_ADA`, 422 `MELEBIHI_NILAI_BERSIH`, 400 alasan wajib |
| 11 | `POST /api/permintaan/{id}/tolak` | alasan | 200 | 403, 409 |
| 12 | `POST /api/impor/pratinjau` | multipart: snapshot.csv, transaksi.csv | {token_pratinjau, jumlah_snapshot, jumlah_transaksi, posisi[], kesalahan[{file, baris, pesan}]} | 403, 409 data sudah ada |
| 13 | `POST /api/impor`, `DELETE /api/impor` | token_pratinjau / - | 201 / 204 | 409 sudah ada transaksi sumber `app` |
| 14 | `POST /api/anggota`, `PATCH /api/anggota/{id}` | nama, email, peran / nama?, peran?, aktif? | 201 / 200 | 409 nama atau email dipakai, 422 `MASIH_PUNYA_DANA` |
| 15 | `GET /api/audit?tabel=&dari=&sampai=` | - | daftar log, 50 per halaman | 401 |
| 16 | `PATCH /api/pengaturan` | fee_persen?, satuan_dasar_fee?, batas_data_lama_hari?, ambang_lonjakan_persen?, ambang_likuiditas_token_usd?, ambang_dust_usd?, batas_live_lama_menit?, toleransi_cocok_persen? | 200 + hitung ulang | 403 |
| 17 | `GET /api/arus-onchain?status=` | - | daftar {id, signature, waktu, arah, mint, jumlah, nilai_usd, alamat_lawan, status, permintaan_id, saran[] {permintaan_id, anggota, alasan}} | 401, 403 (lihat RBAC 2.5) |
| 18 | `POST /api/arus-onchain/{id}/tandai` | status, permintaan_id?, catatan?, alasan_selisih? | 200 {arus, live} | 403, 409 sudah ditandai, 422 `SELISIH_JUMLAH` (alasan wajib), 422 `SUDAH_DIPAKAI_SNAPSHOT` |
| 19 | Edge Function `baca-wallet` (internal, bukan route Next.js) | header secret cron | 200 {titik_nilai_id, arus_baru, snapshot_dibuat} | 401 secret salah, 502 sumber data gagal (menit dilewati) |

**Konkurensi:**
- `versi_data` = waktu perubahan terakhir pada `snapshot` atau `permintaan`. Jika berbeda saat investor menekan "Ajukan", server mengembalikan 409 `ANGKA_BERUBAH` dan app menampilkan "Angka baru saja diperbarui. Cek lagi simulasi kamu."
- Aksi pengelola dijalankan dalam satu transaksi database dengan `SELECT ... FOR UPDATE` pada baris permintaan, sehingga satu permintaan tidak bisa diproses dua kali.

### State Machine Permintaan

```
(baru) --investor--> menunggu --pengelola: selesai (lolos BR-09 & BR-10)--> selesai
                        |  \---pengelola: tolak + alasan----------------> ditolak
                        \------investor pemilik: batal------------------> dibatalkan

selesai --pengelola: koreksi jumlah/tanggal (tercatat di log)--> selesai + hitung ulang (BR-11)
```

`ditolak` dan `dibatalkan` adalah status akhir.

## 3.2 Halaman Frontend Utama

| Route | Fungsi | Peran |
|---|---|---|
| `/masuk` | Tombol "Masuk dengan Google" | Semua |
| `/` | Beranda: nilai dan grafik saya di paling atas (US-12), tombol Setor/Tarik, lalu kartu detail posisi (US-01) | Semua |
| `/pool` | Grafik saldo pool (US-08), lalu posisi semua anggota dan status cek data (US-05) | Semua |
| `/tarik`, `/setor` | Form + simulasi (US-03, US-04) | Semua |
| `/permintaan` | Status permintaan setor/tarik semua anggota (OQ-07) | Semua |
| `/log` | Log audit (US-09, P1) | Semua |
| `/kelola/saldo` | Daftar snapshot (otomatis/manual), isi manual saat pembacaan gagal, dan koreksi (US-02). Menampilkan titik nilai terakhir dan status job pembaca | Pengelola |
| `/kelola/permintaan` | Antrean konfirmasi / tolak | Pengelola |
| `/kelola/arus` | Daftar arus onchain dan pencocokan (US-13) | Pengelola |
| `/kelola/anggota`, `/kelola/impor`, `/kelola/pengaturan` | US-07, US-06, pengaturan fee | Pengelola |

- **Navigasi:** bottom bar 4 menu (Beranda, Pool, Transaksi, Lainnya). Menu "Kelola" hanya muncul untuk pengelola, dengan badge jumlah permintaan menunggu ditambah arus onchain yang belum dicocokkan.
- **Pembaruan angka:** Beranda dan Pool memuat ulang `GET /api/posisi` tiap 60 detik selama halaman terbuka dan tab aktif. Tidak perlu koneksi realtime (websocket), karena data hanya berubah tiap menit.

### State UI

| Layar | Loading | Kosong | Error | Sukses | Sebagian | Tanpa Izin |
|---|---|---|---|---|---|---|
| Beranda / Pool | Kerangka angka besar, grafik, dan kartu | "Kamu belum punya setoran yang terkonfirmasi..." | Pesan + "Coba lagi" | Angka dan grafik lengkap | Angka tampil, grafik gagal: "Grafik belum bisa dimuat. Coba lagi." | Arahkan ke `/masuk` |
| Tarik / Setor | Spinner pada simulasi | - | Pesan per field | Toast konfirmasi | - | Arahkan ke `/masuk` |
| Kelola | Kerangka tabel | "Belum ada permintaan." | Pesan + "Coba lagi" | Toast | - | "Halaman ini khusus pengelola." |

### PWA

- Manifest: nama "Pasti Cuan", mode standalone, ikon 192 px dan 512 px.
- Service worker menyimpan respons terakhir `GET /api/posisi`. Saat offline tampil banner "Kamu sedang offline. Data terakhir 15 Nov 2026, 13.03 WIB." dan semua form dinonaktifkan.

### Asumsi Skala Data

Maksimal 10 anggota, sekitar 365 snapshot dan di bawah 200 transaksi per tahun. Titik nilai sekitar 27.000 baris di tahun pertama setelah diringkas (BR-21), ditambah sekitar 720 titik estimasi sekali saat impor (BR-24), dan arus onchain di bawah 500 baris per tahun di luar dust. Tidak perlu paginasi kecuali log (50 per halaman) dan daftar arus (50 per halaman).

## 3.3 Kebutuhan & Batasan Teknis

### Stack *[Usulan - perlu konfirmasi engineering]*

- Next.js (App Router, TypeScript), hosting Vercel Hobby (gratis, pemakaian pribadi non-komersial).
- Supabase: Postgres, Auth provider Google, Row Level Security, `pg_cron` + `pg_net` (jadwal per menit), Edge Functions (job pembaca wallet), Vault (secret cron dan API key).
- Helius free tier sebagai RPC Solana. API key Jupiter gratis (opsional, menaikkan batas ke 1 request/detik).
- decimal.js (perhitungan), Papaparse (CSV), Recharts (grafik), Vitest (tes).

### Login & Hak Akses

- Login Google lewat Supabase Auth. Setelah login, server mengecek email ada di `anggota` dan aktif. Jika tidak, pengguna langsung dikeluarkan dengan pesan "Akun Google ini belum terdaftar. Minta pengelola menambahkan email kamu."
- Login pertama menautkan `auth_user_id` ke baris anggota.
- RLS dengan fungsi bantu `anggota_saya()` dan `is_pengelola()`:
  - SELECT semua tabel untuk anggota aktif (keputusan "semua lihat semua");
  - INSERT `permintaan` hanya untuk `anggota_id` milik sendiri dengan status `menunggu`;
  - UPDATE pembatalan hanya oleh pemilik selama `menunggu`;
  - penulisan lain hanya oleh pengelola.
- Service role key hanya di server, tidak pernah dikirim ke browser.
- App tidak pernah meminta atau menyimpan private key atau seed phrase wallet. Pembaca wallet hanya memakai alamat publik.
- `titik_nilai` dan `arus_onchain` hanya ditulis job pembaca dengan service role. Perubahan status arus hanya lewat API #18 oleh pengelola.
- Edge Function `baca-wallet` menolak panggilan tanpa secret cron yang benar. Publishable key Supabase tidak cukup, karena key itu memang boleh ada di browser.

### Non-Functional Requirements (NFR)

| ID | Tipe | Kebutuhan |
|---|---|---|
| NF-01 | Performa | Beranda tampil (LCP) < 2,5 detik p75 di jaringan 4G pada HP kelas menengah |
| NF-02 | Performa | `GET /api/posisi` < 500 ms p95 untuk <= 1.000 snapshot dan <= 500 transaksi |
| NF-03 | Akurasi | Selisih hasil hitung vs data acuan <= $0,01 per anggota (lihat Rencana Uji) |
| NF-04 | Keamanan | Semua endpoint wajib login, HTTPS, RLS aktif di semua tabel, hanya email terdaftar |
| NF-05 | Ketersediaan | Target 99% per bulan, best effort free tier *[Usulan]* |
| NF-06 | Backup | `supabase db dump` mingguan via GitHub Actions ke repo privat. Free tier tidak punya backup otomatis |
| NF-07 | Anti-pause | Ping eksternal harian ke REST API Supabase via GitHub Actions (dipertahankan permanen, karena job internal `pg_cron` tidak dihitung sebagai aktivitas eksternal untuk mencegah pause 7 hari pada free tier; OQ-14) |
| NF-08 | Aksesibilitas | Kontras WCAG AA, target sentuh >= 44 px, teks dasar >= 16 px |
| NF-09 | Browser | Chrome Android dan Safari iOS, 2 versi terakhir |
| NF-10 | Kesegaran data | Minimal 95% menit per hari menghasilkan titik nilai *[Usulan]*. Nilai live tidak lebih dari 5 menit di belakang data Meteora, p95 *[Usulan]* |
| NF-11 | Deteksi arus | Transfer masuk/keluar muncul di daftar arus maksimal 5 menit sesudah transaksinya final di onchain *[Usulan]* |
| NF-12 | Biaya | Seluruh pembacaan onchain tetap di free tier: Edge Function < 500.000 pemanggilan/bulan, Helius < 1 juta credit/bulan |
| NF-13 | Interaksi grafik | (a) Angka besar dan baris untung/rugi memakai `font-variant-numeric: tabular-nums` dengan lebar minimum tetap, supaya tata letak tidak bergeser saat angka berubah ketika jari digeser (BR-23). (b) Di HP, scrub hanya dimulai saat jari bergerak horizontal; gerakan vertikal tetap menggulir halaman (`touch-action: pan-y`). (c) Grafik bisa difokus dengan keyboard; panah kiri/kanan memindahkan titik, Esc kembali ke nilai live. (d) Perubahan angka saat scrub diumumkan ke screen reader lewat `aria-live="polite"`, dibatasi maksimal 1 pengumuman per 500 ms. (e) Angka berganti langsung tanpa animasi hitung naik/turun, sehingga aman untuk `prefers-reduced-motion`. (f) Respons scrub < 16 ms per frame di HP kelas menengah (sampai 365 titik) |

### Ketergantungan & Dampak Jika Gagal

| Layanan | Jika tidak tersedia |
|---|---|
| Supabase | Tampil state error. Saat offline tetap bisa melihat data terakhir |
| Google login | Sesi yang masih aktif tetap bisa dipakai. Login baru gagal |
| Vercel | App tidak bisa dibuka. Excel tetap menjadi cadangan selama masa transisi |
| Meteora DLMM API | Menit itu dilewati. Angka memakai titik terakhir dengan keterangan jam (BR-20). Bila gagal berjam-jam, pakai cadangan decode raw `getAccountInfo` via RPC, atau snapshot manual (US-02) |
| Solana RPC (Helius) | Pindah ke RPC publik. Bila keduanya gagal, menit itu dilewati dan deteksi arus menyusul saat RPC pulih (dibaca dari signature terakhir, jadi tidak ada transfer yang terlewat) |
| Harga (Jupiter) | Pakai `solPrice` dari Meteora. Token lain tanpa harga dihitung $0 untuk menit itu |
| CoinGecko (hanya saat impor) | Impor tetap jalan tanpa titik estimasi; `saldo_sol` memakai Laporan Harian dengan peringatan; pengelola bisa "Buat ulang estimasi" nanti (US-06) |
| Supabase `pg_cron` / Edge Function | Tidak ada titik nilai baru. Banner BR-20 tampil, dan snapshot harian diisi manual (US-02) |

### Trade-off & Konsekuensi

1. **Hitung saat dibaca, bukan simpan hasil.** Koreksi otomatis benar dan kode sederhana. Konsekuensinya, jika data membesar jauh (lebih dari sekitar 10.000 snapshot), perlu cache.
2. **Saldo dibaca otomatis dari onchain lewat API pihak ketiga (diubah 15 Nov 2026, sebelumnya input manual).** Pengelola tidak perlu mengisi saldo harian, dan investor mendapat nilai terbaru. Konsekuensinya, app bergantung pada indexer Meteora yang bisa tertunda beberapa menit atau berubah tanpa pemberitahuan, dan valuasi hanya mencakup Meteora DLMM. Mitigasi: cadangan raw `getAccountInfo` via RPC, snapshot manual, snapshot resmi tetap satu per hari dan bisa dikoreksi, serta log audit.
3. **Impor lewat template CSV, bukan membaca Excel langsung.** Galih menyalin data ke 2 template sekali saja. Hasilnya, perubahan format Excel tidak merusak impor.
4. **Free tier.** Tidak ada backup otomatis dan project bisa di-pause. Mitigasi lewat NF-06 dan NF-07 tanpa biaya.
5. **Catat tiap 1 menit, tampil per 5 menit.** Biaya mencatat per menit tetap nol di free tier. Grafik 24J cukup 288 titik, karena layar HP sekitar 375 px tidak bisa menampilkan 1.440 titik secara berbeda. Konsekuensinya, sekitar separuh titik per menit bernilai sama dengan menit sebelumnya, karena nilai USD Meteora hanya berubah tiap 1-3 menit (tes 15 Nov 2026).
6. **Netralkan semua arus sejak snapshot terakhir, bukan menunggu konfirmasi.** NAV live tidak pernah lompat karena setor/tarik, walau pengelola belum mencocokkan. Konsekuensinya, kerugian yang sebenarnya biaya (misalnya gas) baru terlihat setelah pengelola menandainya sebagai biaya pool.
7. **Riwayat diestimasi dari harga pasar, bukan direkonstruksi presisi dari onchain.** Rekonstruksi presisi butuh menghitung ulang posisi DLMM per bin dari riwayat transaksi. Itu rumit, padahal riwayat 16 Okt-14 Nov hanya akan tampil di 7H dan 30H selama sekitar sebulan sebelum tergantikan titik asli. Estimasi memakai harga SOL dan harga token pasangan per jam dengan porsi tetap 50% (BR-24), sehingga bentuk naik-turunnya mirip pasar dan tetap melewati snapshot asli. Konsekuensinya, besar gerakan bisa meleset karena porsi token di DLMM sebenarnya berubah terus (15 Nov 2026: sekitar 80% DOGE). Mitigasi: titik estimasi selalu diberi label dan tidak dipakai untuk angka resmi.
8. **Nilai dihitung dari jumlah token x harga Jupiter, bukan angka USD Meteora.** Harga semua token berasal dari menit yang sama, sehingga USD dan SOL konsisten dan tidak ada gerakan palsu. Konsekuensinya, ada 1 panggilan Meteora tambahan per pool per menit, dan nilai sedikit berbeda dari yang tampil di situs Meteora. Selisihnya dicatat sebagai pembanding di `rincian.meteora_usd`.

### Rencana Uji

- **Golden test:** impor data Tracker_LP_v3 (16 Okt sampai 14 Nov 2026, 10 transaksi). Hasil wajib, dengan toleransi +/- $0,01:

| Faiz | Luqman | Rezki | Salman | Hafiz | Fee Galih | Total |
|---|---|---|---|---|---|---|
| $155,71 | $155,71 | $827,45 | $813,74 | $97,38 | $26,54 | $2.076,53 |

- **Skenario:** tarik $50 oleh Rezki per 14 Nov 2026 (Galih $0,86, sisa modal $657,70, sisa nilai bersih $777,45); tarik semua; tarik sebagian saat sedang rugi (fee $0); setor di hari NAV turun; koreksi snapshot lama; dua penarikan di hari yang sama; ganti `satuan_dasar_fee`.
- **Grafik:** mode USD dengan data Tracker_LP_v3: pool +$251,53 (Semua) dan -$286,71 (7H, 8-14 Nov); Salman -$11,26 / -1,36% (Semua) dan -$110,50 (7H); Rezki +$127,45 / +18,21% (Semua). Mode SOL diuji setelah OQ-10 selesai.
- **Tes RLS:** investor tidak bisa membuat snapshot, tidak bisa mengubah permintaan orang lain, tidak bisa menghapus log, dan tidak bisa menulis `titik_nilai` atau mengubah status `arus_onchain`.
- **Valuasi (BR-17):** fixture respons API wallet pool 15 Nov 2026 13.03 WIB wajib menghasilkan $1.171,81 dan 16,6304 SOL (harga SOL $70,49). Dua token tanpa harga (`B3Dxm6…`, `BvZxkX…`) = $0.
- **Deteksi arus (BR-19):** fixture transaksi wallet 15 Nov 2026 wajib menghasilkan:
  - swap 10,7416 SOL ke 731,51 USDC (08.38 WIB): bukan arus;
  - 1 USDC (10.04 WIB) dan 730,51 USDC (10.05 WIB) ke `Chtm91xf…`: 2 arus keluar, total $731,51;
  - 0,001 USDC masuk dari `BkdHEdNX…`: dust, `bukan_arus` otomatis;
  - 0,1 SOL ke `DqZ3Dn1V…` (10.22 WIB): arus keluar `belum`;
  - transaksi DLMM (tambah/tarik likuiditas, rebalance): bukan arus.
- **Penetralan (BR-19):** sebelum transfer 10.05 WIB ($731,51 keluar) dicocokkan oleh pengelola, nilai live tidak turun karena penetralan arus `belum`. Begitu pengelola mencocokkan arus tersebut ke penarikan Rezki, transaksi langsung dinilai pada waktu transfer 10.05 WIB memakai titik nilai saat itu (BR-18), unit Rezki langsung berkurang saat itu, dan sesudah 10.05 WIB tidak ada dana tertahan semalaman di pool. Tanpa penetralan sementara sebelum dicocokkan, nilai pool terbaca turun sekitar 38%.
- **Snapshot otomatis (BR-18):** titik 08.00 WIB menjadi snapshot `otomatis`. Jika semua pembacaan 08.00-08.30 gagal, tidak ada snapshot dan pengelola diberi tahu. Arus `belum` sebelum snapshot membuat cek BR-12 (e) gagal.
- **Grafik (BR-21):** 1.440 titik `1m` menghasilkan 288 titik untuk 24J; 7 hari data menghasilkan 336 titik untuk 7H; 30 hari menghasilkan 360 titik untuk 30H; Semua <= 365 titik untuk umur 30 hari, 90 hari, dan 1 tahun (interval 2 jam, 6 jam, 1 hari). Grafik SOL punya jumlah titik yang sama dengan USD. Menit yang gagal tidak diisi. Setoran $200 di tengah rentang tidak mengubah untung/rugi rentang. Ringkasan `15m` dan `1h` memakai titik terakhir per periode. Rentang yang titiknya (asli + estimasi) < 90% memakai snapshot harian di seluruh rentang. Transfer 10.04 dan 10.05 WIB tampil sebagai 1 penanda.
- **Harga SOL impor (US-06):** fixture harga CoinGecko jam 08.00 WIB wajib menghasilkan 5 peringatan berikut, dan 25 baris lain lolos (selisih < 3%):

| Tanggal | Harga SOL turunan Excel | Harga pasar CoinGecko | Selisih | Saldo SOL Excel | Saldo SOL disimpan |
|---|---|---|---|---|---|
| 31 Okt 2026 | $92,76 | $96,69 | -4,1% | 13,3435 | 12,8002 |
| 4 Nov 2026 | $96,05 | $92,37 | +4,0% | 14,8756 | 15,4679 |
| 5 Nov 2026 | $91,94 | $95,73 | -4,0% | 15,3693 | 14,7609 |
| 8 Nov 2026 | $133,96 | $89,35 | +49,9% | 16,1325 | 24,1867 |
| 13 Nov 2026 | $85,88 | $81,51 | +5,4% | 24,8016 | 26,1305 |

- **Estimasi riwayat (BR-24):** impor 16 Okt-15 Nov 2026 menghasilkan sekitar 720 titik estimasi per jam. Titik estimasi jam 08.00 WIB tiap tanggal sama dengan snapshot (selisih <= $0,01). Setoran 8 Nov tampil sebagai satu lompatan di 8 Nov 08.00 WIB, bukan tersebar di antara 7 dan 8 Nov. Titik estimasi tidak mengubah angka di kartu detail, simulasi tarik, atau golden test. Garis SOL di rentang estimasi tidak boleh berupa garis lurus antar snapshot: perubahan per jam harus mengikuti harga DOGE/SOL (atau PEPE/SOL di periode PEPE) dengan porsi 0,5, dan nilai di jam snapshot tetap sama dengan snapshot.
- **Valuasi jumlah token (BR-17):** fixture API posisi 15 Nov 2026 (15.869,72 DOGE + 3,2745 SOL, fee 0,20699 DOGE + 0,002972 SOL) dengan harga Jupiter fixture menghasilkan nilai = jumlah x harga, dihitung ulang di tes, bukan diambil dari `balances` Meteora. Bila angka USD Meteora tertahan sementara harga SOL berubah, saldo SOL titik hanya berubah sebesar efek harga token pasangan, tidak ikut bergerak palsu.
- **Data contoh prototype:** data contoh grafik wajib memodelkan posisi DLMM DOGE/SOL, yaitu jumlah DOGE dan SOL di dalam rentang yang berubah mengikuti harga DOGE/SOL, ditambah fee yang terkumpul. Data contoh tidak boleh memodelkan pool sebagai SOL murni, karena grafik SOL jadi garis lurus yang tidak mewakili wallet asli (temuan 15 Nov 2026). Ukuran kewajaran: gerak nilai pool dalam SOL per jam sekitar 0,1-0,25%, sekitar 3-5 kali lebih kecil dari gerak dalam USD.
- **Nilai pribadi tidak terpengaruh penarikan orang lain:** di grafik saya (US-12) mode SOL dan USD, penarikan Rezki 15 Nov 2026 tidak menimbulkan lompatan atau patahan. Temuan prototype 15 Nov 2026: grafik SOL 24J milik Salman menunjukkan patahan tajam sekitar 08.00-10.00 WIB yang tidak ada di grafik USD. Ini perlu dicek sebagai kemungkinan bug.
- **Isi wallet vs nilai disesuaikan (BR-19):** sesudah penarikan Rezki 15 Nov 2026, angka besar pool = isi wallet, dan tabel US-05 menampilkan baris rekonsiliasi yang menjumlah ke isi wallet.
- **Bandingkan (BR-22):** kedua garis mulai 0%; penarikan di tengah rentang tidak membuat garis melompat; persen di ujung garis sama dengan persen di mode USD atau SOL biasa.
- **Scrub (BR-23, NF-13):** menggeser jari di grafik mengubah angka besar, baris untung/rugi, dan subjudul waktu; melepas jari mengembalikan nilai live; gerakan vertikal menggulir halaman; panah keyboard memindahkan titik; lebar angka tidak berubah saat digit berganti.
- **Ketahanan:** sumber Meteora timeout, Jupiter 429, dan RPC gagal masing-masing membuat menit itu dilewati atau memakai cadangan, tanpa job berhenti. Job yang dijalankan ulang untuk menit yang sama tidak membuat titik atau arus ganda.

## 3.4 Roadmap

| Versi | Isi |
|---|---|
| v1.0 (PRD ini) | P0 (US-01 sampai US-08, US-12, dan US-13), pembacaan wallet onchain tiap menit, snapshot otomatis, grafik 24J, PWA, backup dan anti-pause |
| v1.1 | US-09 log audit, US-11 ekspor CSV |
| v2.0 | US-10 notifikasi (termasuk pemberitahuan arus onchain baru ke pengelola), webhook Helius untuk deteksi arus instan |

Catatan: prototype memakai data contoh. Per 15 Nov 2026, data contoh grafik masih memodelkan pool sebagai SOL murni, dan estimasi riwayatnya masih memakai garis lurus SOL. Keduanya perlu disesuaikan dengan BR-17, BR-24, dan syarat data contoh di Rencana Uji.

### Future Epics

- **Protokol selain Meteora DLMM:** adapter valuasi per protokol (Orca, Raydium, dll.), atau API agregator portofolio seperti Vybe. Dipertimbangkan jika pengelola memindahkan dana.
- **Rekonstruksi riwayat presisi:** menghitung ulang nilai posisi DLMM per bin dari riwayat transaksi dan harga historis, menggantikan titik estimasi (BR-24). Dipertimbangkan hanya jika riwayat lama ternyata penting bagi investor. (Epic "Nilai live lebih halus" naik ke v1.0 pada 15 Nov 2026, lihat BR-17.)

### Explicit Won't Do

- Eksekusi transfer, pemegangan dana, dan saran investasi. Jika ditanya: app ini hanya buku catatan bersama, uang tetap dikelola Galih di wallet.

---

## Open Questions

| # | Pertanyaan | Owner | Status |
|---|---|---|---|
| OQ-01 | Satuan dasar fee: USD atau SOL? | Galih + semua investor | Selesai: USD (14 Nov 2026) |
| OQ-02 | Fee saat tarik sebagian: proporsional (BR-06) atau cara Tracker_LP_v3? | Salman (untuk dijelaskan ke Galih) | Selesai: proporsional (14 Nov 2026). Beda dengan cara Tracker hanya beberapa sen kecuali pool turun dalam setelah penarikan; dipilih karena fee dibayar atas untung yang benar-benar ditarik dan modal tidak pernah negatif |
| OQ-03 | File sumber impor awal: Tracker_LP_v3 atau Laporan Harian? | Salman | Selesai: Tracker_LP_v3 (14 Nov 2026). Alasan: berbasis USD (sesuai OQ-01), fee per investor (sesuai D2), dan sudah punya aturan tarik. Catatan: kedua file sama-sama mulai 16 Okt 2026, jadi tanggal mulai bukan pembeda |
| OQ-04 | Konfirmasi angka usulan: banner data lama 2 hari (BR-15), ambang peringatan 30% (AC-02-03), format angka Indonesia dan WIB (BR-14), target counter metric maksimal 1 koreksi per bulan, ambang peringatan harga SOL saat impor 3% (AC-06-01) | Salman | Selesai (disetujui 17 Nov 2026): semua angka dipakai dengan penegasan BR-15 hanya pengaman cadangan di atas data onchain otomatis (tidak ada input harian manual) dan AC-02-03 mengecualikan hari yang memiliki transaksi atau arus onchain terdeteksi |
| OQ-05 | Target tanggal rilis v1.0 | Salman | Terbuka |
| OQ-06 | Rumusan ulang BR-12 menjadi cek invarian dan counter metric menjadi "koreksi data" | Salman | Selesai (disetujui 14 Nov 2026) |
| OQ-07 | Apakah investor boleh melihat permintaan setor/tarik milik orang lain? Default: hanya milik sendiri dan pengelola | Salman + Galih | Disetujui Salman (17 Nov 2026): **terbuka untuk semua anggota**, supaya semua melihat siapa yang mau tambah/tarik modal. Menunggu konfirmasi Galih |
| OQ-08 | Persetujuan Galih atas template CSV impor | Galih | Terbuka |
| OQ-09 | Target NSM 6/6 dalam 4 minggu setelah rilis | Salman | Terbuka |
| OQ-10 | Sebelum impor, cocokkan baris setoran Tracker_LP_v3 dengan transfer asli: Salman $525 pada 8 Nov (Laporan Harian: $527,01 pada 9 Nov), Rezki $200 pada 13 Nov (Laporan Harian: 14 Nov), dan tipe setoran Hafiz (Modal Awal vs Tambah). Selisih tanggal ini juga membuat harga SOL turunan 8 Nov meleset 49,6%, sehingga grafik mode SOL salah pada tanggal itu. Dampaknya sudah terlihat di prototype (15 Nov 2026): rentang 7H dalam SOL menampilkan "+8,6399 SOL" berwarna hijau, sementara USD -US$451,00, karena setoran 8 Nov dikonversi dengan harga SOL $133,96. Mode Bandingkan (BR-22) juga ikut salah. **Pembaruan 15 Nov 2026:** harga pasar CoinGecko 8 Nov 08.00 WIB = $89,35, jadi "harga catatan" Laporan Harian ($89,58) yang benar dan harga turunan $133,96 yang salah. Masalah konversi SOL sudah diselesaikan dengan menghitung ulang saldo SOL dari harga pasar (US-06). Yang tersisa untuk Galih hanya memastikan tanggal dan jumlah setoran yang benar | Galih | Terbuka (sebagian selesai) |
| OQ-11 | Penarikan Rezki 15 Nov 2026 terlihat di onchain: 731,51 USDC (1 + 730,51) ke `Chtm91xf…`, sesudah swap 10,7416 SOL. (a) Apakah Rezki menarik semua atau sebagian? (b) Berapa jumlah USD yang dicatat dan tanggal efektifnya? (c) Untuk apa 0,1 SOL ke `DqZ3Dn1V…` pada 10.22 WIB? Penarikan ini terjadi sebelum app jalan, jadi perlu masuk ke `transaksi.csv` impor awal | Galih | Terbuka |
| OQ-12 | Konfirmasi angka usulan pembacaan onchain: interval 1 menit, grafik 24J per 5 menit, 7H per 30 menit, 30H per 2 jam, Semua otomatis (<= 365 titik), retensi 7 hari / 90 hari, default rentang 24J, ambang likuiditas token $10.000, ambang dust $1, nilai live lama 15 menit, toleransi pencocokan 2%, snapshot otomatis 08.00 WIB, porsi token pasangan 50% untuk estimasi riwayat (BR-24) | Salman | Selesai (disetujui 17 Nov 2026, memakai seluruh angka default) |
| OQ-13 | Alamat wallet tiap investor (opsional) untuk saran pencocokan arus. Catatan: transfer dari exchange memakai alamat exchange, jadi tidak bisa dicocokkan otomatis | Galih + investor | Terbuka |
| OQ-14 | Verifikasi engineering sebelum build: (a) `pg_cron` vs auto-pause free tier; (b) Meteora API di balik Cloudflare dari IP Edge Function Supabase; (c) biaya credit Helius per method (`getTokenAccountsByOwner`, `getSignaturesForAddress`, `getTransaction`); (d) kelayakan `@meteora-ag/dlmm` di Edge Function Deno (batas CPU 2 detik) | Salman | Selesai (17 Nov 2026): (a) `pg_cron` tidak mencegah pause, jadi ping GitHub Actions NF-07 dipertahankan permanen; (b) teruji live dari Edge Function Supabase `pasti-cuan` (`ap-southeast-1`): Meteora `portfolio/open` 200 OK (193 ms), `positions/pnl` 200 OK (200 ms), Jupiter v3 200 OK (31 ms), Helius RPC 200 OK (29 ms); (c) deteksi arus dipisah tiap 5 menit (~216.000 credit dasar/bulan); (d) pakai `dlmm.datapi.meteora.ag` + cadangan raw `getAccountInfo` RPC |
| OQ-15 | Riwayat token pasangan untuk estimasi (BR-24): kapan pool pindah dari PEPE/SOL ke DOGE/SOL, dan apakah ada periode dana menganggur di SOL atau USDC. Coba ambil dulu dari riwayat posisi tertutup di API Meteora (`positions/{pool}/pnl?status=closed`, field `createdAt` dan `closedAt`); bila tidak lengkap, tanyakan ke Galih | Salman, lalu Galih | Selesai (15 Nov 2026, dari riwayat 267 posisi di API Meteora): sebelum 16 Okt 20.20 WIB belum ada posisi (garis lurus); PEPE/SOL pada 16 Okt 20.20 – 22 Okt 10.47 WIB; DOGE/SOL sejak 22 Okt 10.51 WIB (pindah pool sekali 30 Okt 20.30 WIB, tetap DOGE/SOL) |

---

## Change Log

### Sumber Isi

- **Dari pemilik PRD (Salman):** masalah, persona, alasan "kenapa sekarang", aturan main (investor baru tidak ikut profit sebelum masuk, fee 90/10, tarik bebas kapan saja dan berapa saja), NSM, batas peran app, keputusan D1-D4, pilihan platform, stack, login, dan budget.
- **Dari dua file Excel pengelola:** daftar anggota, riwayat setoran, metode unit/NAV, cara hitung fee, dan semua angka pembanding per 14 Nov 2026.
- **Disusun AI (perlu dicek):** angka selisih antar file, aturan BR-01 sampai BR-15, teks pesan di layar, rumus penarikan BR-06, data model, API, NFR, ambang usulan, dan rencana uji.
- **Dari pembacaan onchain wallet pool (15 Nov 2026, dilakukan AI):** nilai pool $1.171,81, riwayat transfer sejak 13 Nov 2026 (termasuk penarikan Rezki), uji kesegaran data Meteora (13 sampel tiap 30 detik), dan batas free tier tiap layanan. Aturan BR-17 sampai BR-21, US-13, tabel `titik_nilai` dan `arus_onchain`, serta job pembaca disusun AI dan perlu dicek.

### Keputusan Kunci

| Tanggal | Keputusan |
|---|---|
| 14 Nov 2026 | Section 1 disetujui. Mode Full |
| 14 Nov 2026 | Untung/rugi ditampilkan dalam USD dan SOL; fee 10% dari profit tiap investor; semua anggota bisa melihat posisi semua anggota; setor/tarik diajukan di app |
| 14 Nov 2026 | Section 2 disetujui |
| 14 Nov 2026 | PWA, Next.js + Supabase, login Google, dibangun sendiri dengan free tier |
| 14 Nov 2026 | Contoh pesan tarik di AC-04-01 dikoreksi (contoh lama memakai investor yang sedang rugi, padahal fee-nya seharusnya $0) |
| 14 Nov 2026 | BR-12 dirumuskan ulang menjadi cek invarian; counter metric diganti menjadi "koreksi data" |
| 14 Nov 2026 | Section 3 disetujui. PRD final v1.0 |
| 14 Nov 2026 | OQ-01 diputuskan: fee dihitung dari profit dalam USD |
| 14 Nov 2026 | OQ-02 diputuskan: fee saat tarik sebagian dihitung proporsional (BR-06), berbeda dari cara Tracker_LP_v3 |
| 14 Nov 2026 | Grafik saldo pool USD/SOL (US-08) dinaikkan ke P0: satu grafik dengan tombol tukar satuan. Grafik nilai pribadi dipisah menjadi US-12 (P1). Ditambah BR-16 |
| 14 Nov 2026 | Beranda diubah ke pola aplikasi wallet: nilai dan grafik pribadi (US-12) naik ke P0 dan tampil paling atas, dengan tombol USD/SOL dan tombol Setor/Tarik. Grafik pool (US-08) dan tabel anggota (US-05) pindah ke halaman Pool (dulu Anggota) |
| 14 Nov 2026 | Snapshot kini menyimpan nilai USD dan saldo SOL sebagai input, harga SOL menjadi turunan. Riwayat: USD dari Tracker_LP_v3, SOL dari Laporan Harian |
| 14 Nov 2026 | OQ-03 diputuskan: Tracker_LP_v3 menjadi sumber impor awal. Ditambahkan OQ-10 untuk mencocokkan baris setoran sebelum impor |
| 15 Nov 2026 | Nilai pool dibaca otomatis dari wallet onchain tiap 1 menit (D5, BR-17). "Baca saldo wallet dari blockchain" pindah dari Won't Have ke P0. Snapshot harian dibuat otomatis 08.00 WIB (BR-18). US-02 menjadi cadangan dan koreksi |
| 15 Nov 2026 | Arus onchain dideteksi dan dinetralkan dari nilai live (D6, BR-19). Ditambahkan US-13 (cocokkan arus) dan invarian BR-12 (e). Pemicunya: penarikan Rezki 15 Nov 2026 akan membuat semua investor terlihat rugi sekitar 38% bila tidak dinetralkan |
| 15 Nov 2026 | Grafik US-08 dan US-12 mendapat rentang 24J (per 5 menit) dan 7H per jam (BR-21), atas permintaan investor. Ditambahkan BR-20 (nilai live lama), NF-10 sampai NF-12, dan OQ-11 sampai OQ-14. Status PRD: v1.1 draft |
| 15 Nov 2026 | Hasil review prototype grafik: (1) saldo pool yang ditampilkan = isi wallet, nilai disesuaikan hanya untuk NAV (glosarium, BR-19), dengan baris rekonsiliasi di US-05; (2) tooltip diganti scrub yang mengubah angka besar (BR-23, NF-13); (3) kontrol satuan jadi 3 ikon di kanan atas kartu, termasuk mode Bandingkan USD vs SOL dalam persen tanpa dua sumbu Y (BR-22); (4) persen ditambahkan di untung/rugi pool; (5) penanda digabung per kelompok waktu dan 7H tidak mencampur kerapatan (BR-21); (6) dampak OQ-10 pada tampilan SOL dicatat |
| 15 Nov 2026 | Semua rentang dan satuan memakai titik nilai dengan kerapatan sama: 24J per 5 menit, 7H per 30 menit, 30H per 2 jam, Semua otomatis <= 365 titik (BR-21). Riwayat sebelum pembacaan otomatis dibuat sebagai titik estimasi per jam dari harga SOL CoinGecko (BR-24, trade-off 7). Saldo SOL riwayat impor dihitung ulang dari harga pasar, yang membereskan konversi SOL di OQ-10 (8 Nov: $89,35, bukan $133,96). CoinGecko ditambahkan ke sumber data |
| 15 Nov 2026 | Hasil review grafik SOL di prototype (garis lurus dan patahan): (1) estimasi riwayat BR-24 tidak lagi menarik garis lurus nilai SOL, tetapi mengikuti harga token pasangan per jam (DOGE/SOL, PEPE/SOL) dengan porsi 50% dan koreksi supaya melewati snapshot; (2) nilai live BR-17 dihitung dari jumlah token per posisi x harga Jupiter di menit yang sama, bukan dari USD Meteora yang bisa tertahan (epic "Nilai live lebih halus" naik ke v1.0, trade-off 8); (3) syarat data contoh prototype dan tes patahan grafik pribadi ditambahkan ke Rencana Uji; (4) ditambahkan OQ-14 (d) dan OQ-15 |
| 17 Nov 2026 | PRD dipindahkan ke repo `pasti-cuan-app/docs/prd/` (disertai backup snapshot `backup/prd-dashboard-porsi-dana-lp.backup-2026-11-15.md`); status OQ-15 diperbarui menjadi Selesai berdasarkan data 267 posisi API Meteora |
| 17 Nov 2026 | (1) OQ-04 dan OQ-12 disetujui dengan penegasan BR-15 hanya pengaman cadangan di atas data onchain otomatis dan AC-02-03 mengecualikan hari dengan arus onchain terdeteksi; (2) OQ-07 disetujui Salman (permintaan setor/tarik terbuka untuk semua anggota, tinggal konfirmasi Galih); (3) transaksi onchain (setor & tarik) kini dinilai langsung pada waktu transfernya memakai titik nilai terdekat saat transfer terjadi (BR-18, BR-19, skema `permintaan`, `hitungPool`), bukan menunggu snapshot 08.00 WIB keesokan harinya |
| 17 Nov 2026 | Hasil verifikasi teknis OQ-14: (1) NF-07 ping eksternal GitHub Actions dipertahankan permanen; (2) deteksi arus `getSignaturesForAddress` dipisah menjadi tiap 5 menit (~216.000 credit Helius dasar/bulan); (3) `dlmm.datapi.meteora.ag` tetap sumber utama dengan cadangan decode raw `getAccountInfo` RPC (menggantikan SDK `@meteora-ag/dlmm` penuh); (4) project Supabase `pasti-cuan` dibuat di `ap-southeast-1` dan lolos uji live Edge Function ke Meteora (`200 OK` ~200 ms), Jupiter (`31 ms`), serta Helius (`29 ms`) |

### Yang Masih Butuh Owner Bertindak

- Galih: OQ-07 (konfirmasi persetujuan permintaan terbuka), OQ-08, OQ-10, OQ-11, OQ-13. Galih juga perlu tahu bahwa aturan tarik di app (BR-06) berbeda dari Tracker_LP_v3, dan bahwa saldo harian tidak perlu diisi lagi kecuali pembacaan otomatis gagal.
- Salman: OQ-05, OQ-09 (keputusan rilis & target NSM).
