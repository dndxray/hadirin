# PRD Perbaikan Aplikasi Presensi Praktikum

Pemilik: Fadhil · Cakupan: SRS-03, 04, 13, 14, 15, 16, 17 · Basis: Firebase (Auth + Firestore + Security Rules)

## 1. Ringkasan

Berdasarkan review PM, fitur Kelola Sesi (SRS-13) dan Security Rules (SRS-15) masih bermasalah. Akibatnya, fitur turunannya (SRS-03, 04, 14, 16, 17) belum bisa diuji karena sesi belum bisa dibuat. Dokumen ini mendefinisikan perbaikan yang harus dikerjakan agent agar seluruh alur asisten dan praktikan berjalan sesuai SRS dan lolos review PM.

## 2. Masalah yang Dilaporkan PM

| ID | Masalah | Dampak |
| --- | --- | --- |
| P1 | Login sebagai asisten tidak bisa menambah sesi | Blocker utama. Seluruh alur sesi tidak bisa dites |
| P2 | Praktikan masih melihat dan bisa membuka tombol atau halaman Tambah Sesi | Pelanggaran SRS-13 dan SRS-15 |
| P3 | Input tanggal masih diketik manual | UX buruk, rawan salah format |
| P4 | Nama praktikum, kode, dan field terkait harus diketik manual | Terlalu banyak mengetik |
| P5 | SRS-03, 04, 14, 16 "belum bisa dicek"; SRS-17 tanpa catatan | Bergantung pada P1 |

## 3. Tujuan dan Non-Tujuan

**Tujuan**

- Asisten dapat membuat, melihat, mengubah, dan menghapus sesi tanpa error.
- Praktikan hanya dapat melihat sesi, tanpa tombol atau akses tulis apa pun, baik di UI maupun di Security Rules.
- Form sesi memakai date picker dan autofill berdasarkan mata kuliah.
- Semua SRS di atas dapat diuji end-to-end oleh PM.

**Non-Tujuan**

- Tidak menambah fitur baru di luar SRS yang tercantum.
- Tidak mengubah desain besar aplikasi.
- AI tidak boleh memutuskan status izin otomatis. Keputusan tetap di asisten.

## 4. Peran Pengguna

- **Asisten**: akses penuh ke manajemen sesi, kontrol sesi, rekap kehadiran, dan pemeriksaan izin.
- **Praktikan**: hanya melihat sesi, melakukan presensi saat sesi dibuka, dan mengajukan izin.

Peran dibaca dari satu sumber kebenaran, yaitu field `role` (`asisten` atau `praktikan`) pada dokumen `users/{uid}` di Firestore. UI dan Security Rules harus memakai sumber yang sama.

## 5. Instruksi Awal untuk Agent (Wajib Dikerjakan Sebelum Mengubah Kode)

1. Deteksi stack proyek (Flutter, React, dll.) dari struktur repo. Jangan berasumsi.
2. Petakan: lokasi logika auth dan role, halaman Kelola Sesi, form tambah sesi, file `firestore.rules`, dan nama koleksi Firestore yang dipakai. Nama koleksi pada PRD ini (`users`, `sessions`, `attendance`, `permissions`, `courses`) adalah contoh. Sesuaikan dengan yang ada di kode.
3. Reproduksi P1 terlebih dahulu dan temukan akar masalahnya sebelum memperbaiki.
4. Kerjakan sesuai urutan di bagian 6. Jangan lompat ke fitur turunan sebelum P1 selesai.

## 6. Kebutuhan Fungsional (Berurutan Sesuai Prioritas)

### R1. Perbaiki penambahan sesi oleh asisten (P1, SRS-13)

**Langkah investigasi**

- Cek apakah role asisten terbaca benar saat login (nilai `role`, hasil query `users/{uid}`, kapitalisasi string).
- Cek apakah Security Rules menolak `create` pada koleksi sesi (lihat log `permission-denied`).
- Cek apakah payload simpan sesuai skema dan tipe data, terutama tanggal sebagai Timestamp, bukan string.
- Cek apakah error ditelan tanpa pesan, lalu tampilkan error nyata ke UI.

**Kriteria penerimaan**

- Login sebagai asisten, isi form, tekan simpan: dokumen sesi muncul di Firestore dan di daftar sesi tanpa reload manual.
- Jika gagal, tampil pesan error yang jelas, bukan gagal diam-diam.
- Edit dan hapus sesi juga berfungsi (CRUD lengkap).

### R2. Sembunyikan fitur tulis untuk praktikan (P2, SRS-13, SRS-15)

**Perilaku**

- Tombol Tambah Sesi, Edit, Hapus, serta tombol Buka/Tutup Sesi tidak dirender sama sekali untuk role praktikan (bukan sekadar disabled).
- Rute atau halaman Kelola Sesi dan Kontrol Sesi diproteksi. Praktikan yang membukanya langsung (deep link atau URL) diarahkan kembali ke halaman utama praktikan.
- Selama role belum selesai dimuat, jangan tampilkan tombol tulis (hindari flicker).

**Kriteria penerimaan**

- Login praktikan: tidak ada tombol Tambah, Edit, Hapus, Buka, atau Tutup Sesi di mana pun.
- Praktikan tidak bisa mengakses halaman terproteksi lewat navigasi manual.

### R3. Security Rules (SRS-15)

UI saja tidak cukup. Rules harus menolak tulis dari praktikan di sisi server.

Contoh rules (sesuaikan nama koleksi dengan proyek):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function signedIn() { return request.auth != null; }
    function isAsisten() {
      return signedIn() &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'asisten';
    }

    match /users/{uid} {
      allow read: if signedIn() && request.auth.uid == uid;
      allow write: if false; // role tidak boleh diubah dari klien
    }

    match /courses/{id} {
      allow read: if signedIn();
      allow write: if isAsisten();
    }

    match /sessions/{id} {
      allow read: if signedIn();
      allow create, update, delete: if isAsisten(); // termasuk ubah status buka/tutup
    }

    match /attendance/{id} {
      allow read: if isAsisten() ||
        (signedIn() && resource.data.userId == request.auth.uid);
      allow create: if signedIn()
        && request.resource.data.userId == request.auth.uid
        && get(/databases/$(database)/documents/sessions/$(request.resource.data.sessionId)).data.status == 'open';
      allow update, delete: if false;
    }

    match /permissions/{id} {
      allow read: if isAsisten() ||
        (signedIn() && resource.data.userId == request.auth.uid);
      allow create: if signedIn() && request.resource.data.userId == request.auth.uid;
      allow update: if isAsisten(); // hanya asisten yang memutuskan terima/tolak
      allow delete: if false;
    }
  }
}
```

**Kriteria penerimaan**

- Uji dengan Firebase Emulator atau Rules Playground: praktikan ditolak untuk create, update, dan delete pada `sessions`; asisten diizinkan.
- Praktikan hanya bisa presensi saat `status == 'open'`.
- Praktikan tidak bisa mengubah status izin atau field keputusan.

### R4. Date picker untuk tanggal (P3, SRS-13)

- Ganti input teks tanggal dengan komponen kalender native sesuai stack.
- Waktu (jam mulai dan selesai) memakai time picker.
- Simpan ke Firestore sebagai Timestamp.
- Validasi: tanggal wajib diisi, jam selesai harus setelah jam mulai.

### R5. Dropdown mata kuliah dengan autofill (P4, SRS-13)

- Tambah dropdown Mata Kuliah (sumber data: koleksi `courses`, atau konstanta jika belum ada koleksi).
- Setelah memilih mata kuliah, field Nama Praktikum, Kode, dan field turunan lain terisi otomatis dan read-only (atau editable opsional, tentukan sesuai kode yang ada).
- Kelas dipilih lewat dropdown berdasarkan mata kuliah terpilih jika datanya tersedia.
- Jika data mata kuliah belum ada, buat data awal (seed) berdasarkan mata kuliah yang sudah dipakai di aplikasi, lalu catat asumsinya di ringkasan perubahan.

### R6. Pastikan fitur turunan bisa diuji (P5)

Setelah R1 sampai R5 selesai, verifikasi alur berikut berjalan end-to-end.

- **SRS-03**: asisten membuka dan menutup sesi dengan dialog konfirmasi. Status sesi berubah di Firestore. Presensi hanya bisa saat `open`.
- **SRS-04**: rekap menampilkan daftar praktikan yang sudah presensi beserta waktu kehadiran, real-time.
- **SRS-14**: alasan izin dikirim ke model AI. Hasil klasifikasi atau status gagal disimpan bersama pengajuan. Ada timeout dan error handling, dan kegagalan AI tidak menghambat pengajuan izin.
- **SRS-16**: asisten melihat daftar izin, alasan, dan klasifikasi AI secara real-time, lalu menerima atau menolak. Keputusan tersimpan di Firestore dan terlihat oleh praktikan.
- **SRS-17**: halaman Kontrol Sesi, Rekap Kehadiran, Kelola Sesi, dan Pemeriksaan Izin memiliki state loading, daftar kosong, dan pesan error (koneksi, Firestore, AI) yang berbeda dan jelas.

## 7. Kebutuhan Non-Fungsional

- Jangan menyimpan kunci API AI di klien jika memungkinkan. Jika sudah ada, laporkan sebagai catatan risiko.
- Semua operasi Firestore dibungkus penanganan error dengan pesan yang bisa dipahami pengguna.
- Tidak ada perubahan yang merusak data sesi yang sudah ada. Jika skema berubah, sediakan migrasi atau kompatibilitas mundur.
- Jangan menambah dependensi baru kecuali perlu (misalnya paket date picker), dan sebutkan alasannya.

## 8. Skenario Pengujian (Harus Lulus)

| # | Skenario | Hasil yang Diharapkan |
| --- | --- | --- |
| T1 | Asisten menambah sesi lewat date picker dan dropdown | Sesi tersimpan dan muncul di daftar |
| T2 | Asisten mengubah dan menghapus sesi | Perubahan tampil real-time |
| T3 | Praktikan membuka Kelola Sesi | Tidak ada tombol tulis; deep link diblokir |
| T4 | Praktikan mencoba tulis ke `sessions` (Rules Playground/Emulator) | Ditolak `permission-denied` |
| T5 | Asisten membuka sesi (dengan konfirmasi) lalu praktikan presensi | Presensi berhasil, muncul di rekap beserta waktu |
| T6 | Praktikan presensi saat sesi ditutup | Ditolak (UI dan Rules) |
| T7 | Praktikan mengajukan izin | Tersimpan; klasifikasi AI muncul atau status gagal tercatat |
| T8 | AI timeout atau error | Pengajuan tetap tersimpan, ada status gagal, tidak crash |
| T9 | Asisten menerima atau menolak izin | Status tersimpan dan terlihat oleh praktikan |
| T10 | Matikan koneksi, kosongkan data | Tampil state error koneksi dan daftar kosong yang sesuai |

## 9. Definisi Selesai

- Semua skenario T1 sampai T10 lulus.
- Tidak ada tombol tulis sesi di sisi praktikan.
- Security Rules ter-deploy dan teruji di emulator.
- Ringkasan perubahan berisi: akar masalah P1, daftar file yang diubah, asumsi yang dibuat, dan langkah manual untuk PM menguji ulang SRS-03, 04, 14, 16, 17.

## 10. Aturan Kerja Agent

- Kerjakan bertahap sesuai urutan R1 sampai R6 dan lakukan commit kecil per tahap.
- Jika ada informasi yang ambigu (nama koleksi, struktur role, sumber data mata kuliah), baca kode terlebih dahulu. Bertanya hanya jika tidak bisa disimpulkan dari repo.
- Jangan menghapus atau menulis ulang fitur yang tidak disebut di PRD ini.
- Setelah selesai, jalankan build dan lint, lalu laporkan hasilnya.
