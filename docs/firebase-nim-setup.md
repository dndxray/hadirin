# Firebase, NIM, dan peserta sesi

## Struktur yang disepakati

- `users/{uid}.nim`: string, misalnya `123456789`. Bukan number; nol awal dipertahankan. NIM dinormalisasi trim/uppercase.
- `sessions/{sessionId}.participantIds`: array berisi UID Firebase Auth, bukan NIM. Field yang belum ada pada sesi lama diisi oleh fitur tambah peserta, tanpa menimpa UID peserta lain.
- Tidak ada koleksi indeks NIM baru. Koleksi `attendance` terbentuk saat presensi pertama, memakai kontrak yang sudah ada: `sessionId`, `practitionerId`, `checkedInAt`, dan snapshot `session`.

Penambahan `nim` diminta pengguna. Kebutuhan `participantIds` dan koleksi `attendance` sudah diberitahukan sebelum penerapan. Tidak ada perubahan otomatis pada project Firebase tim dari pengujian lokal.

## Penggunaan

1. Praktikan baru memasukkan NIM saat registrasi. Akun lama: **Akun → Lengkapi NIM → Simpan NIM**. Untuk uji Caesar gunakan string `123456789`.
2. Asisten membuka detail sesi pada pengelolaan jadwal. Dari detail kelas Home tersedia **Kelola sesi**. Pada bagian **Peserta sesi**, cari NIM, periksa nama/email yang ditemukan, lalu **Tambahkan ke sesi**.
3. Pendaftaran disimpan sebagai UID pada `participantIds`. Praktikan yang sedang online menerima sesi tanpa reload. NIM ganda tidak memilih akun pertama secara diam-diam: pencarian ditolak dan pengelola perlu memperbaiki datanya. Keunikan NIM global saat registrasi tidak dijanjikan; tidak ada koleksi indeks baru.
4. Praktikan membuka detail kelas yang sama. Jika ada beberapa sesi, pilih pertemuannya. **Isi Presensi** mengecek status sesi aktual dan menyimpan transaksi Firestore; modal sukses hanya setelah penyimpanan berhasil. ID kelas tidak dipakai sebagai ID sesi.
5. **Ajukan Izin** tetap berada di detail praktikan, bukan tab bawah. Form memakai konteks mata kuliah/kelas dan sesi yang dipilih, dengan validasi serta transaksi yang sama.
6. Riwayat memakai dokumen presensi milik akun dan snapshot sesi, bukan mencocokkan ID dengan dummy. Label persentase/Total Hadir tetap tersedia, ditambah riwayat status izin. Saat pembacaan gagal, aplikasi menampilkan resource dan kode error; bukan angka nol palsu. Home tetap membaca daftar `classes` seperti baseline.

## Rules dan penerapan pada project tim

Rules lokal diselaraskan dengan rules aktif yang diberikan pengguna (`exists` profil), ditambah validasi NIM string 3–30 karakter dan perlindungan NIM setelah terisi. Akun lama tanpa NIM tetap dapat login dan melengkapinya satu kali. Perbaikan NIM tersimpan dilakukan pengelola Firebase; praktikan tidak dapat mengganti atau menghapus NIM sendiri. Hak akses sesi/presensi/izin tetap memakai Auth UID dan peran, bukan input NIM.

Sebelum menerapkan, tinjau perbedaan `firestore.rules`, lalu salin ke Firebase Console project yang sama dengan `EXPO_PUBLIC_FIREBASE_PROJECT_ID` dan Publish. Alternatif setelah login CLI: `npx --yes firebase-tools@14.27.0 deploy --only firestore:rules --project ID_FIREBASE_TIM`. Tidak ada deploy otomatis.

Kondisi yang ditemukan pada data tim: sesi lama belum memiliki `participantIds`. Ini membuat sesi tidak masuk hasil query peserta, tetapi **bukan bukti tunggal penyebab permission-denied**. Query sah tanpa peserta seharusnya kosong; UID tanpa profil/peran yang sesuai ditolak. Cocokkan UID Authentication dengan ID `users`, pastikan rules benar-benar sudah dipublikasikan, project sama, lalu lakukan reload penuh atau Coba lagi. Log development `[Firestore access]` mencantumkan koleksi, kode, project, dan UID tanpa token/API key.

Field peserta dapat diperbaiki melalui fitur asisten di aplikasi setelah NIM diisi; tidak perlu menyalin UID secara manual. Bila menggunakan konektor Firebase, hubungkan akun project tim terlebih dahulu sebelum inspeksi/perubahan data langsung.

## Verifikasi lokal

Gunakan hanya project emulator `demo-hadirin`: Auth `9099`, Firestore `8085`, Expo web `8097` dengan flag emulator. Fixture berikut menghapus/mengisi data demo lokal; jalankan bergantian, bukan paralel.

```text
node --test tests/firestore.rules.test.mjs
node tests/history-fixture.mjs seed
python tests/history-ui.py
node tests/nim-fixture.mjs
python tests/nim-ui.py
```

25 pengujian service/rules mencakup NIM, kepemilikan profil, UID palsu, duplikasi, pendaftaran paralel, sesi lama tanpa field peserta, presensi dan izin. Uji UI mencakup dua akun, NIM akun lama dan registrasi baru, pencarian/konfirmasi asisten, real-time enrollment/rekap, transaksi presensi, pencegahan duplikasi, izin, keputusan dan AI gagal, error/retry, serta ukuran HP/web. Bundle Android diekspor tanpa dependency native baru. Belum diuji pada HP fisik atau project produksi; pengujian AI memakai fixture, bukan API pengajar.
