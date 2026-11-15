---
name: Pasti Cuan
description: Dashboard porsi dana patungan LP. Kartu putih bertumpuk di atas kanvas sage, aksi utama hijau limau.
colors:
  lime-action: "#9FE870"
  forest-ink: "#163300"
  forest-wash: "#E3E7E0"
  sage-canvas: "#E8EBE6"
  card-white: "#FFFFFF"
  ink: "#0E0F0C"
  ink-muted: "#454745"
  hairline: "#E2E5DF"
  gain: "#054D28"
  loss: "#A72027"
  share-1: "#DDDDDD"
  share-2: "#C5C5C4"
  share-3: "#ADADAC"
  share-4: "#909190"
  nav-idle: "#BCBCBB"
  nav-active-wash: "#353633"
  gain-wash: "#E1EAE5"
  loss-wash: "#F4E4E5"
  warning-wash: "#FBEFC9"
  warning-ink: "#5A4300"
  field: "#F1F3EF"
  skeleton: "#ECEEE9"
typography:
  display:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "40px"
    fontWeight: 800
    lineHeight: 1.08
    letterSpacing: "-0.03em"
    fontFeature: "tnum"
  figure-lg:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "34px"
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: "-0.03em"
    fontFeature: "tnum"
  figure-md:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "24px"
    fontWeight: 800
    lineHeight: 1.15
    letterSpacing: "-0.03em"
    fontFeature: "tnum"
  figure-total:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "22px"
    fontWeight: 800
    lineHeight: 1.15
    letterSpacing: "-0.03em"
    fontFeature: "tnum"
  headline:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "25px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 600
    lineHeight: 1.45
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.45
  label:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.45
  figure-sm:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.45
    fontFeature: "tnum"
  caption:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.45
  tag:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 600
    lineHeight: 1.45
    fontFeature: "tnum"
rounded:
  swatch: "3px"
  tooltip: "10px"
  field: "16px"
  card: "24px"
  control: "24px"
  pill: "999px"
spacing:
  hair: "2px"
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  xxl: "28px"
components:
  card:
    backgroundColor: "{colors.card-white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "20px"
  button-primary:
    backgroundColor: "{colors.lime-action}"
    textColor: "{colors.forest-ink}"
    typography: "{typography.title}"
    rounded: "{rounded.control}"
    height: "48px"
    padding: "0 20px"
  button-tonal:
    backgroundColor: "{colors.forest-wash}"
    textColor: "{colors.forest-ink}"
    typography: "{typography.title}"
    rounded: "{rounded.control}"
    height: "48px"
    padding: "0 20px"
  segmented-track:
    backgroundColor: "{colors.sage-canvas}"
    rounded: "{rounded.control}"
    padding: "3px"
  segmented-option:
    textColor: "{colors.ink-muted}"
    rounded: "{rounded.control}"
    height: "30px"
    padding: "0 12px"
  segmented-option-selected:
    backgroundColor: "{colors.forest-ink}"
    textColor: "{colors.lime-action}"
    rounded: "{rounded.control}"
    height: "30px"
    padding: "0 12px"
  tag-roi:
    typography: "{typography.tag}"
    rounded: "{rounded.pill}"
    padding: "2px 8px"
  avatar:
    backgroundColor: "{colors.lime-action}"
    textColor: "{colors.forest-ink}"
    rounded: "{rounded.pill}"
    size: "36px"
  tooltip:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.card-white}"
    typography: "{typography.tag}"
    rounded: "{rounded.tooltip}"
    padding: "7px 10px"
  nav-floating:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.nav-idle}"
    rounded: "{rounded.pill}"
    padding: "6px"
  nav-floating-item-active:
    backgroundColor: "{colors.nav-active-wash}"
    textColor: "{colors.card-white}"
    rounded: "{rounded.pill}"
    padding: "6px 0"
  share-bar:
    rounded: "{rounded.pill}"
    height: "12px"
  input-field:
    backgroundColor: "{colors.field}"
    textColor: "{colors.ink}"
    rounded: "{rounded.field}"
    height: "52px"
    padding: "0 16px"
  input-field-focus:
    backgroundColor: "{colors.card-white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.field}"
  chip-menunggu:
    backgroundColor: "{colors.warning-wash}"
    textColor: "{colors.warning-ink}"
    rounded: "{rounded.pill}"
    padding: "3px 10px"
  chip-selesai:
    backgroundColor: "{colors.gain-wash}"
    textColor: "{colors.gain}"
    rounded: "{rounded.pill}"
    padding: "3px 10px"
  chip-ditolak:
    backgroundColor: "{colors.loss-wash}"
    textColor: "{colors.loss}"
    rounded: "{rounded.pill}"
    padding: "3px 10px"
  banner-warning:
    backgroundColor: "{colors.warning-wash}"
    textColor: "{colors.warning-ink}"
    rounded: "{rounded.field}"
    padding: "12px 14px"
  banner-offline:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.card-white}"
    rounded: "{rounded.field}"
    padding: "12px 14px"
  sheet:
    backgroundColor: "{colors.card-white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "20px"
  button-danger:
    backgroundColor: "{colors.loss-wash}"
    textColor: "{colors.loss}"
    typography: "{typography.title}"
    rounded: "{rounded.control}"
    height: "48px"
    padding: "0 20px"
---

# Design System: Pasti Cuan

Sumber kebenaran visual: **Layout C "Tumpuk kartu" dengan tema Wise**, yang dipilih lewat vote anggota pool pada 15 Nov 2026. Rujukan yang bisa dibuka ada di `S:\Projek Iseng\beranda-pasti-cuan-vote\index.html` (layout C, tema `ws`). Untuk Beranda, kalau dokumen ini dan mockup itu berbeda, ikuti mockup, lalu perbarui dokumen ini. Pola untuk halaman lain (form, status, banner, lembar konfirmasi) berasal dari prototype di proyek ini (15 Nov 2026), dengan sumber kode `src/app/globals.css`.

## Overview

**Creative North Star: "Tumpukan Kartu Jawaban"**

Setiap layar adalah tumpukan kartu putih di atas kanvas sage, dan **setiap kartu menjawab satu pertanyaan**: berapa nilai saya, dari mana angka itu, seberapa besar porsi saya, dan bagaimana dalam SOL. Investor membuka aplikasi di HP, membaca kartu dari atas ke bawah, dan berhenti begitu pertanyaannya terjawab. Struktur ini yang membuat 6 orang bisa membaca angka yang sama tanpa bertanya ke pengelola.

Suasananya tenang dan meyakinkan, karena yang dilihat adalah uang. Kartu datar tanpa bayangan, sudutnya membulat besar, dan ruang di dalam kartu longgar. Warna dipakai hemat. Kanvas sage dan kartu putih membawa hampir seluruh layar, hijau hutan pekat dipakai untuk teks aksen dan grafik, dan hijau limau hanya muncul di aksi utama. Angka adalah bintangnya: Inter tebal 800 dengan tracking rapat dan digit tabular.

Kepadatannya sedang. Satu layar HP (360–390px) memuat sapaan dan satu kartu nilai lengkap dengan grafik serta tombol Setor/Tarik. Kartu berikutnya muncul saat di-scroll.

**Key Characteristics:**
- Satu kolom, kartu putih bertumpuk di atas kanvas sage, jarak antarkartu 12px.
- Satu kartu = satu pertanyaan, dengan judul kartu berupa pertanyaan atau pernyataan pendek ("Dari mana nilai kamu").
- Angka besar Inter 800 dengan digit tabular. Nilai kamu selalu jadi teks terbesar di layar.
- Hijau limau hanya untuk aksi utama, avatar, dan teks pilihan aktif di atas hijau hutan.
- Datar. Bayangan hanya untuk elemen yang melayang (navigasi bawah, tooltip grafik).
- Navigasi bawah berupa pil gelap yang melayang, bukan tab bar menempel.

## Colors

Palet sage dan hijau yang kalem, dengan satu warna limau terang sebagai tanda aksi.

### Primary
- **Hijau Limau** (`lime-action`): isi tombol aksi utama (Setor), latar avatar, dan teks opsi terpilih di kontrol segmen (di atas hijau hutan). Selalu dipasangkan dengan teks hijau hutan, tidak pernah dipakai sebagai warna teks di atas putih atau sage.
- **Hijau Hutan Pekat** (`forest-ink`): teks di atas limau, latar opsi segmen terpilih, garis grafik, segmen "Kamu" di bar porsi, warna fokus, dan teks tombol tonal.
- **Basuhan Hutan** (`forest-wash`): latar tombol sekunder tonal (Tarik). Merupakan campuran 12% hijau hutan di atas putih.

### Neutral
- **Kanvas Sage** (`sage-canvas`): latar halaman di belakang semua kartu, sekaligus trek kontrol segmen.
- **Putih Kartu** (`card-white`): permukaan semua kartu dan teks di atas latar gelap (tooltip, navigasi aktif).
- **Tinta** (`ink`): teks utama, garis total 2px di rincian nilai, latar tooltip dan navigasi melayang.
- **Tinta Redup** (`ink-muted`): label ("Nilai kamu"), stempel waktu data, keterangan, dan opsi segmen yang tidak terpilih.
- **Garis Rambut** (`hairline`): pemisah 1px di dalam kartu, misalnya di atas baris "Ikut 29 hari".
- **Bayangan Porsi 1–4** (`share-1` sampai `share-4`): segmen anggota lain di bar porsi, dari yang terbesar ke terkecil. Masing-masing campuran tinta 14%, 24%, 34%, dan 46% di atas putih.
- **Ikon Navigasi Redup** (`nav-idle`) dan **Basuhan Navigasi Aktif** (`nav-active-wash`): teks/ikon navigasi melayang yang tidak aktif, dan latar pil item yang aktif.

### Semantic
- **Untung** (`gain`): angka untung/rugi positif, tag ROI positif, dan status cek data yang lolos.
- **Rugi** (`loss`): angka untung/rugi negatif dan tag ROI negatif.
- **Basuhan Untung / Rugi** (`gain-wash`, `loss-wash`): latar chip status Selesai dan Ditolak, serta tombol berbahaya (Hapus, Tolak, Batalkan).
- **Peringatan** (`warning-wash` dengan teks `warning-ink`): banner kuning BR-12 ("Angka sedang dicek ulang"), banner data lama (BR-15), dan chip status Menunggu. Kuning hanya untuk hal yang perlu diperhatikan, bukan dekorasi.

### Surface
- **Kolom Isian** (`field`): latar kolom isian di dalam kartu putih, supaya kolom terlihat tanpa garis tepi.
- **Kerangka** (`skeleton`): blok abu-abu saat memuat. Tidak berkedip dan tidak bergerak.

### Named Rules
**Aturan Limau Satu Aksi.** Hijau limau hanya untuk satu aksi utama per kartu, avatar, dan opsi segmen terpilih. Limau tidak pernah dipakai untuk teks di atas putih atau sage, dan tidak dipakai sebagai warna untung.

**Aturan Hijau Bukan Untung.** Hijau hutan dan hijau limau adalah warna merek, bukan tanda naik. Untung dan rugi hanya memakai `gain` dan `loss`, dan selalu disertai tanda "+" atau "−" (BR-14, AC-01-01). Garis grafik tetap hijau hutan walaupun nilainya turun.

## Typography

**Display Font:** Inter (dengan system-ui, sans-serif)
**Body Font:** Inter
**Label/Mono Font:** tidak ada. Angka memakai Inter dengan `font-variant-numeric: tabular-nums`, bukan font mono.

**Character:** Satu keluarga huruf saja. Hierarki dibangun dari ukuran dan ketebalan. Angka uang memakai ketebalan 800 dengan tracking rapat, sedangkan teks penjelas tetap 400 supaya angka yang paling dulu terbaca.

### Hierarchy
- **Display** (800, 40px, 1.08, −0.03em): hanya untuk "Nilai kamu" di kartu pertama Beranda. Satu per layar.
- **Figure Large** (800, 34px, 1.1, −0.03em): angka utama di kartu kedua dan seterusnya, misalnya porsi "39,53%".
- **Figure Medium** (800, 24px, 1.15, −0.03em): angka tunggal sebuah kartu, misalnya untung/rugi SOL.
- **Figure Total** (800, 22px, 1.15, −0.03em): angka total di akhir rincian (Nilai bersih).
- **Headline** (700, 25px, 1.2, −0.02em): sapaan halaman ("Halo, Salman"). Satu per layar.
- **Title** (600, 15px): judul kartu ("Dari mana nilai kamu", "Porsi kamu di pool") dan label tombol.
- **Body** (400, 14px, 1.45): label baris dan isi kartu.
- **Label** (400, 13px): label di atas angka besar ("Nilai kamu") dan baris keterangan seperti "Ikut 29 hari, sejak 16 Okt 2026".
- **Figure Small** (500, 13px, tabular): baris untung/rugi di bawah nilai ("−US$11,01 (−1,33%) · 30H").
- **Caption** (400, 12–12.5px): stempel waktu ("Data per 14 Nov 2026, 08.00 WIB"), angka SOL kecil di bawah total, legenda porsi, dan catatan penjelas.
- **Tag** (600, 11px, tabular): tag ROI dan isi tooltip grafik.

### Named Rules
**Aturan Angka Tabular.** Semua angka uang, persen, dan SOL memakai digit tabular dan format Indonesia dari BR-14: "US$1.234,56" untuk USD (2 desimal), "10,8461 SOL" (4 desimal), porsi 2 desimal. Tanda minus memakai karakter minus "−" (U+2212), bukan tanda hubung.

**Aturan Satu Angka Terbesar.** Dalam satu layar hanya ada satu teks Display, yaitu nilai yang paling penting (di Beranda: Nilai kamu, sesuai AC-12-01). Angka lain turun ke Figure Large atau lebih kecil.

## Layout

Satu kolom, mobile-first. Kanvas sage memenuhi layar dengan padding samping 16px. Header sapaan duduk langsung di atas kanvas (padding atas 28px, bawah 20px, inset 4px), lalu kartu-kartu bertumpuk dengan jarak 12px. Isi kartu memakai padding 20px.

Ritme di dalam kartu: label ke angka besar rapat (4px), angka ke baris untung/rugi 6px, lalu blok grafik diberi ruang lebih lega (20px di atas, 14px di bawah). Kontrol satuan (USD | SOL) dan rentang (7H | 30H | Semua) berada di satu baris, satu di kiri dan satu di kanan. Tombol Setor dan Tarik berbagi lebar sama dalam grid 2 kolom dengan jarak 8px, 16px di bawah kontrol.

Urutan kartu di Beranda mengikuti PRD: (1) kartu nilai: Nilai kamu, untung/rugi rentang, grafik, kontrol satuan & rentang, Setor/Tarik; (2) "Dari mana nilai kamu": modal dasar, untung/rugi + ROI, fee terutang, garis total, nilai bersih USD dan SOL; (3) "Porsi kamu di pool": persen, bar porsi semua anggota, legenda, lama ikut; (4) "Dalam SOL": untung/rugi SOL dan catatan USD vs SOL.

Di layar lebih lebar dari HP, mockup belum menetapkan aturan. Usulan sementara: tetap satu kolom dengan lebar maksimal sekitar 480px di tengah, supaya ritme kartu tidak berubah.

### Named Rules
**Aturan Satu Kartu Satu Pertanyaan.** Kartu baru dibuat hanya untuk pertanyaan baru. Kalau informasi menjawab pertanyaan yang sama, masukkan ke kartu yang sudah ada. Kartu tidak pernah bersarang di dalam kartu.

## Elevation & Depth

Sistem ini datar. Kedalaman muncul dari lapisan warna: kartu putih di atas kanvas sage, tanpa bayangan dan tanpa garis tepi. Bayangan hanya dipakai untuk elemen yang melayang di atas konten, yaitu navigasi bawah dan tooltip grafik, ditambah bayangan tipis pada opsi segmen terpilih supaya terlihat terangkat dari treknya.

### Shadow Vocabulary
- **Pil melayang** (`box-shadow: 0 12px 28px -12px rgb(0 0 0 / .5)`): navigasi bawah.
- **Tooltip** (`box-shadow: 0 8px 20px -8px rgb(0 0 0 / .45)`): gelembung detail saat grafik disentuh, juga toast.
- **Lembar** (`box-shadow: 0 -12px 32px -12px rgb(0 0 0 / .35)`): lembar konfirmasi yang muncul dari bawah.
- **Opsi terangkat** (`box-shadow: 0 1px 2px rgb(0 0 0 / .1)`): opsi segmen yang sedang terpilih.

### Named Rules
**Aturan Datar di Atas Sage.** Kartu tidak pernah diberi bayangan atau border. Kalau sebuah kartu perlu dibedakan, bedakan isinya, bukan permukaannya.

## Shapes

Bentuknya lembut dan konsisten: kartu, tombol, dan trek kontrol segmen sama-sama memakai sudut 24px, sehingga semuanya terasa satu keluarga. Elemen kecil yang bersifat label (tag ROI, avatar, bar porsi, navigasi melayang, item navigasi aktif) berbentuk pil penuh. Pengecualiannya kotak warna legenda porsi (sudut 3px), tooltip grafik (sudut 10px), serta kolom isian, banner, dan toast (sudut 16px, karena berada di dalam kartu 24px). Garis pemisah selalu 1px `hairline`, kecuali garis total di rincian nilai yang 2px `ink`.

## Components

### Buttons
Tegas tapi ramah. Tingginya 48px, sudutnya 24px, labelnya Title 600 15px dengan ikon 18px di kiri.
- **Primary (Setor):** latar hijau limau, teks hijau hutan, ikon plus.
- **Tonal (Tarik):** latar basuhan hutan, teks hijau hutan, ikon panah serong ke kanan atas.
- **Hover / Active:** hover menaikkan kecerahan 8% (`filter: brightness(1.08)`), tekan mengecil ke 98% dalam 120ms.
- **Focus:** outline 2px hijau hutan dengan offset 2px.
- Satu kartu hanya punya satu tombol primary.

### Kontrol Segmen (satuan dan rentang)
- **Trek:** latar kanvas sage, sudut 24px, padding 3px.
- **Opsi:** tinggi 30px, padding 0 12px, 12.5px 600, warna tinta redup. Saat hover berubah jadi tinta.
- **Terpilih:** latar hijau hutan, teks hijau limau, bayangan "opsi terangkat". Perpindahan warna 150ms.
- Dipakai berpasangan dalam satu baris: satuan (USD | SOL) di kiri, rentang (7H | 30H | Semua) di kanan. Default USD dan 30H. Pilihan satuan dipakai bersama di semua grafik.

### Cards / Containers
- **Corner Style:** 24px.
- **Background:** putih kartu di atas kanvas sage.
- **Shadow Strategy:** tidak ada (lihat Aturan Datar di Atas Sage).
- **Border:** tidak ada.
- **Internal Padding:** 20px. Judul kartu Title 15px 600 dengan jarak 8px ke isi.

### Grafik Nilai
- Garis 2px hijau hutan dengan sambungan dan ujung membulat. Area di bawahnya diisi gradasi hijau hutan dari 16% ke 0%.
- Titik akhir: lingkaran hijau hutan radius 3.5px.
- Hari dengan setoran atau penarikan: lingkaran putih radius 4px dengan tepi hijau hutan 2px (AC-12-01).
- Saat disentuh atau digeser: garis vertikal putus-putus (3 3) warna tinta redup, titik terpilih radius 5.5px, dan tooltip gelap di atas grafik berisi tanggal, nilai dalam satuan aktif, nilai dalam satuan lain, harga SOL, dan transaksi hari itu.
- Bisa dikendalikan keyboard (panah kiri/kanan, Home, End, Esc). Gerakan jari vertikal tetap menggulir halaman.
- Saat data dimuat atau rentang diganti, garis tergambar dari kiri dalam 700ms (`cubic-bezier(.16, 1, .3, 1)`), dan animasi ini dimatikan bila pengguna memilih `prefers-reduced-motion`. Ini satu-satunya momen animasi yang disengaja.

### Rincian Nilai ("Dari mana nilai kamu")
Kartu yang menunjukkan asal angka dalam bentuk hitungan dari atas ke bawah.
- Baris: label di kiri, angka di kanan (600, tabular), padding vertikal 8px.
- Untung/rugi diberi tag ROI di samping labelnya.
- Fee terutang diberi keterangan "10%" berwarna tinta redup.
- Baris total dipisah garis 2px tinta, lalu "Nilai bersih" dengan angka Figure Total dan nilai SOL kecil (Caption, tinta redup) di bawahnya.

### Tag ROI
- Pil kecil (padding 2px 8px), Tag 600 11px, tidak pernah terlipat ke baris kedua.
- Warnanya mengikuti tanda: teks untung atau rugi, dengan latar 12% dari warna teks yang sama.

### Bar Porsi
- Bar pil setinggi 12px. Segmen dipisah celah 2px dan lebarnya sebanding dengan porsi tiap anggota.
- Segmen "Kamu" berwarna hijau hutan. Anggota lain memakai Bayangan Porsi 1–4, berurutan dari porsi terbesar.
- Di bawahnya ada legenda 2 kolom (12.5px): kotak warna 10px bersudut 3px, nama ("Kamu" untuk pengguna sendiri, ditulis tebal 700), dan persen tabular rata kanan.
- Diakhiri baris "Ikut X hari, sejak [tanggal]" dengan ikon kalender, dipisah garis rambut di atasnya.

### Navigation
- **Navigasi melayang:** pil gelap (latar tinta, padding 6px) yang menempel 12px dari bawah layar, dengan bayangan "pil melayang". Isinya 4 item: Beranda, Pool, Transaksi, Lainnya.
- **Item:** ikon 20px di atas label 10.5px, warna ikon navigasi redup.
- **Aktif:** pil latar basuhan navigasi aktif, teks putih, label 600.

### Header Sapaan
- Langsung di atas kanvas, tanpa kartu. Kiri: "Halo, [nama]" (Headline) dan stempel waktu data (Caption). Kanan: avatar 36px berisi inisial (latar limau, teks hutan, 600 14px).

### Inputs / Fields
Ditetapkan oleh prototype (form Setor, Tarik, saldo harian, anggota, pengaturan).
- **Label** di atas kolom: 13px 600 tinta. Kolom opsional diberi tulisan "Opsional" di kanan label (tinta redup), bukan tanda bintang di kolom wajib.
- **Kolom:** tinggi 52px, sudut 16px, latar `field`, tanpa garis tepi (tepi 1.5px transparan). Teks di dalam kolom 16px supaya HP tidak memperbesar layar saat mengetik.
- **Fokus:** tepi 1.5px hijau hutan dan latar berubah putih.
- **Error:** tepi `loss`, pesan 12.5px `loss` dengan ikon di bawah kolom, menggantikan teks petunjuk. Pesan menyebut masalah dan cara memperbaikinya (teks dari PRD).
- **Read-only** (misalnya harga SOL turunan): latar kanvas sage, teks tinta redup.
- **Kolom uang utama** (jumlah setor/tarik): tinggi 64px, angka 28px 800 tabular, awalan "US$" 22px tinta redup.
- **Satuan** ditulis di dalam kolom sebagai awalan atau akhiran ("US$", "SOL", "%", "hari").
- Pilihan dua opsi (peran, satuan dasar fee) memakai Kontrol Segmen dengan `role="radio"`, bukan dropdown.

### Chip Status
- Pil 11.5px 600, padding 3px 10px. Menunggu = peringatan, Selesai = untung, Ditolak = rugi, Dibatalkan = kanvas sage dengan tinta redup. Chip peran (Investor, Pengelola, Kamu) memakai basuhan hutan.

### Banner Status
- Strip di bawah header, sudut 16px, padding 12px 14px, ikon 18px di kiri. Urutan: offline (latar tinta, teks putih), cek data gagal (peringatan), data lama (peringatan). Banner tidak bisa ditutup manual; hilang sendiri saat kondisinya selesai.

### Lembar Konfirmasi
- Untuk aksi uang dan aksi yang menghitung ulang angka: ajukan tarik, batalkan permintaan, konfirmasi/tolak/selesaikan permintaan, ubah atau hapus saldo, ubah pengaturan.
- Muncul dari bawah (dialog modal), sudut atas 24px, padding 20px, judul 19px 700 berupa pertanyaan ("Tarik US$50,00?"). Dua tombol sama lebar: kiri tonal untuk mundur, kanan primary (atau danger untuk hapus/tolak) untuk lanjut.
- Tanpa animasi masuk. Klik di luar lembar atau Esc menutupnya.

### Tab Saring
- Trek putih di atas kanvas, opsi terpilih seperti Kontrol Segmen (hutan + limau) dan menyertakan jumlah item ("Menunggu 3").

### Navigasi Halaman Tugas
- Halaman tugas (Setor, Tarik, Log, semua halaman Kelola) memakai bar atas dengan tombol kembali bulat 44px dan judul 17px 700, tanpa navigasi pil di bawah. Navigasi pil hanya ada di halaman utama (Beranda, Pool, Transaksi, Kelola untuk pengelola, Lainnya). Item Kelola punya badge limau berisi jumlah permintaan menunggu.

## Do's and Don'ts

### Do:
- **Do** letakkan kartu putih (`card-white`, sudut 24px, padding 20px) di atas kanvas sage dengan jarak 12px, satu kartu per pertanyaan.
- **Do** pakai hijau limau hanya untuk satu aksi utama per kartu, avatar, dan teks opsi segmen terpilih, selalu bersama hijau hutan.
- **Do** tulis setiap angka uang dengan digit tabular, format Indonesia (US$1.234,56; 10,8461 SOL), dan tanda "+" atau "−".
- **Do** jadikan nilai paling penting di layar satu-satunya teks Display (Inter 800, 40px).
- **Do** tampilkan stempel waktu "Data per [tanggal], [jam] WIB" di bagian atas setiap layar yang memuat angka.
- **Do** tunjukkan asal angka saat menampilkan nilai bersih: modal dasar, untung/rugi, fee, lalu total.

### Don't:
- **Don't** beri kartu bayangan atau border, dan jangan menaruh kartu di dalam kartu.
- **Don't** pakai hijau limau atau hijau hutan sebagai tanda untung. Untung dan rugi hanya memakai `gain` dan `loss`.
- **Don't** pakai hijau limau sebagai warna teks di atas putih atau sage, karena kontrasnya tidak terbaca.
- **Don't** tambahkan font kedua atau font mono untuk angka. Cukup Inter dengan digit tabular.
- **Don't** pakai tab bar yang menempel penuh di bawah layar. Navigasi Beranda memakai pil melayang.
- **Don't** tambahkan animasi selain garis grafik yang tergambar dan umpan balik tekan pada tombol.
