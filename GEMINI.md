# Aturan Proyek Pasti Cuan

## Penamaan File & Rilis APK Android (`android-app/`)
- **Selalu naikkan versi pada setiap pembaruan:** Setiap kali ada perubahan fitur, perbaikan bug, atau rilis baru di `android-app`, naikkan `versionCode` dan `versionName` di `android-app/app/build.gradle.kts` (mis. `0.2.0-beta` -> `0.2.1-beta`). Gunakan `BuildConfig.VERSION_NAME` untuk tampilan versi di UI agar selalu sinkron.
- **Nama file wajib mengikuti nama proyek & versi:** Gunakan format `pasti-cuan-v<versionName>-debug.apk` (untuk debug) atau `pasti-cuan-v<versionName>.apk` (untuk release) yang diarsipkan di `android-app/` (sudah dikonfigurasi otomatis oleh `base.archivesName` dan task arsip di `app/build.gradle.kts`).
- **Jangan pernah menimpa atau menghapus file versi sebelumnya:** Seluruh file `.apk` versi terdahulu (seperti `pasti-cuan-v0.2.apk`, `pasti-cuan-v0.2.1-beta-debug.apk`, dst.) harus tetap dipertahankan utuh. Jika membuild ulang versi yang sama dengan isi berbeda, tambahkan sufiks revisi unik (`-r2`, `-r3`, dst.) alih-alih menimpa file yang sudah ada.
