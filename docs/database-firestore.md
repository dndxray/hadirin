# Database Firestore — Skema dan Hubungan Data

Snapshot kode `main` `1bd53d7`, 26 November 2026. **Ini skema yang dibaca/ditulis kode, bukan inventaris isi Firebase Console.** Tidak ada migrasi atau seed yang dijalankan saat dokumentasi dibuat. Nama koleksi/field berikut sudah ada pada kode; jangan menambahkan struktur baru ke server tanpa persetujuan.

Inisialisasi akun dan database ada di [konfigurasi Firebase client](../src/lib/firebase.ts). Pembatasan akses tercatat di [Rules lokal](../firestore.rules), dan alur transaksi utama ada di [service praktikan](../src/services/practitioner-service.ts).

Untuk presentasi gunakan [diagram dan tabel relasi](gambar/database/visualisasi-database.md) atau buka [visualisasi offline](gambar/database/visualisasi-database.html).

## 1. Konsep dasar

- Koleksi berisi dokumen; dokumen mempunyai ID dan field bertipe string/angka/list/map/Timestamp/GeoPoint.
- ID dokumen sering disertakan sebagai properti `id` setelah snapshot dibaca. Properti hasil pembacaan tidak selalu disimpan sebagai field di server.
- Referensi pada proyek umumnya **string ID**, bukan foreign key SQL dan bukan selalu tipe `DocumentReference`.
- Firestore tidak otomatis mencocokkan ID, menyinkronkan daftar peserta, atau melakukan cascade delete. Service aplikasi yang menjalankannya.
- Timestamp server, timestamp perangkat, dan label tanggal manusia adalah hal berbeda.

## 2. Diagram hubungan

```text
Firebase Auth user.uid
         |
         v
users/{UID} -- nim --> classes/{classId}.participants[{nim,name}]
         |                              |
         |                       cocokkan NIM unik
         |                              |
         +-------------------> sessions/{sessionId}.participantIds[UID]
                                        |
                              classId --+-- labId --> labs/{labId}
                                        |
                        +---------------+------------------+
                        |                                  |
              attendance/{sessionId_UID}       permissionRequests/{sessionId_UID}
                        |                                  |
                   ringkasan sesi                    ringkasan sesi + ai
                                                           |
                                                   keputusan asisten

users/{UID}.expoPushTokens       notifications/{id}.toUserId --> UID
```

Satu kelas dapat mempunyai banyak sesi. Satu sesi dapat dihadiri banyak praktikan. Satu pasangan sesi–praktikan maksimal mempunyai satu presensi **atau** satu dokumen izin menurut alur aplikasi.

## 3. `users/{uid}` — profil akun

ID dokumen harus sesuai UID Firebase Authentication; password tidak disimpan di koleksi ini.

| Field | Tipe | Sumber/pemakaian |
| --- | --- | --- |
| `name` | string | Nama pada registrasi dan tampilan identitas. |
| `email` | string | Email profil dari registrasi; kredensial login tetap ditangani Auth. |
| `role` | `praktikan` / `asisten` | Peran dasar/legacy; dipakai bersama `roles`. |
| `roles` | array string | Daftar peran yang dimiliki akun. `roleList` menggabungkan field ini dengan `role`. |
| `nim` | string opsional | NIM praktikan; form sekarang memvalidasi 14 angka, bukan number. |
| `approvalStatus` | `pending` / `approved` | Proses pendaftaran asisten. Tidak otomatis menjadi pemeriksaan hak server yang memadai. |
| `createdAt` | Timestamp | `serverTimestamp()` saat profil dibuat. |
| `expoPushTokens` | array string opsional | Registrasi beberapa perangkat; Rules membatasi panjang list maksimal 20. |
| `matkul_diampu` | array ID opsional | Dibaca halaman Kelas untuk menyaring pilihan dari `matkul`; bukan field yang dibuat pada registrasi biasa. |

`profile.uid` di context berasal dari ID dokumen. Peran aktif `profile.role` dapat berasal dari pilihan saat login, sedangkan field `role` tersimpan tidak otomatis ditulis ulang setiap ganti peran.

### Invarian dan keterbatasan NIM

- UID menjadi pemilik data, NIM menjadi sarana pencarian/enrollment.
- Normalisasi aktif adalah `trim`; jangan memakai asumsi uppercase dari catatan versi lama.
- Registrasi/edit baru menuntut 14 digit, tetapi pencarian mendukung beberapa format lama dan Rules masih menerima pola legacy yang lebih luas.
- Pencarian dengan NIM cocok ke lebih dari satu akun ditolak. Tidak ada koleksi indeks unik NIM atau transaksi global yang membuktikan semua NIM pasti unik.
- UI menawarkan Ubah NIM, tetapi Rules membekukan NIM yang sudah terisi. Ketidakselarasan ini dicatat pada Kondisi proyek; jangan mengubah Rules sebagai langkah dokumentasi.

## 4. `classes/{classId}` — kelas dan roster

| Field | Tipe | Arti |
| --- | --- | --- |
| `name` | string | Label kelas, misalnya B; bukan nama mahasiswa. |
| `course` | string | Nama mata kuliah/praktikum pada kelas. |
| `room` | string | Label ruangan; tidak menyediakan koordinat GPS. |
| `participants` | array map | Tiap elemen berisi `nim` dan `name`. |
| `createdBy` | string UID | Asisten pembuat pada `createClass`. |
| `createdAt` | Timestamp | Waktu server saat dibuat. |

`saveParticipants` memperbarui seluruh array roster. Halaman Kelas lalu memanggil `syncClassSessions`. Jadi nama mahasiswa pada roster bukan akun Auth baru, dan memasukkan NIM ke roster belum menjamin sesi memuat UID.

Pemetaan berjalan melalui pencocokan NIM akun praktikan. `class-sync.ts` mencari sesi berdasarkan `classId`, juga mempunyai pencocokan legacy berdasarkan kelas dan mata kuliah. Ia mempertahankan UID yang punya record presensi/izin agar akses historis tidak langsung hilang.

## 5. `sessions/{sessionId}` — satu pertemuan praktikum

| Field | Tipe | Arti/pemakaian |
| --- | --- | --- |
| `courseName`, `courseCode` | string | Nama dan kode praktikum. |
| `classId` | string | ID kelas; sesi lama bisa kosong/tidak tersedia. |
| `className` | string | Label kelas yang ditampilkan. |
| `date` | Timestamp pada penulisan baru | Tanggal sesi; pembaca masih mempunyai dukungan beberapa bentuk lama. |
| `dateTimestamp` | Timestamp | Tanggal alternatif untuk pemrosesan jadwal. |
| `dateLabel` | string | Label Indonesia untuk UI, bukan timestamp. |
| `startTime`, `endTime` | string | Jam lokal yang dipilih form. |
| `timeRange` | string | Label rentang jam, dapat menyertakan WIB. |
| `room`, `description` | string | Label ruangan dan keterangan. |
| `assistantId`, `assistantName` | string | UID dan nama asisten. |
| `status` | `upcoming` / `open` / `closed` | Status tersimpan; Presensi/Rules membutuhkan `open`. |
| `participantIds` | array string UID | Peserta sesi yang boleh membaca dan melakukan tindakan praktikan. |
| `labId` | string opsional | ID lab untuk presensi lokasi; wajib secara alur Presensi Sprint 3. |
| `radiusM` | number opsional | Ditulis form/service asisten sekarang. |
| `attendanceRadiusMeters` | number opsional | Dibaca validator/Rules sebagai override; jika absen memakai radius lab. |
| `qrToken` | string opsional | Diharapkan pembaca QR ketat; nonce builder/penerbitannya belum terintegrasi. |
| `createdAt`, `updatedAt` | Timestamp | Metadata pembuatan/perubahan jika operasi menyediakannya. |

**Jangan menganggap `radiusM` alias otomatis `attendanceRadiusMeters`.** Belum ada pemetaan yang menyamakannya pada jalur aktif. `kelas` dalam tipe/model asisten adalah dukungan tampilan/legacy; penulisan sesi baru memakai `className`.

Beberapa layar menghitung status menurut jam, sedangkan transaksi membaca status dokumen. Perbedaan ini bukan perubahan field otomatis di server. Lihat alur sinkronisasi status pada Integrasi.

## 6. `labs/{labId}` — acuan geografis

| Field | Tipe | Batas validasi |
| --- | --- | --- |
| `name` | string | Nama tidak kosong, maksimal 120 karakter. |
| `latitude` | number | −90 sampai 90. |
| `longitude` | number | −180 sampai 180. |
| `radiusMeters` | number | 1–1.000 m; form pengelolaan lab meminta bilangan bulat. |

CRUD lab menulis empat field tersebut. Koordinat harus angka, bukan string hasil ketikan. Nama ruangan pada kelas/sesi tidak otomatis membuat lab atau referensi `labId`.

Sebelum hapus, aplikasi memeriksa apakah ada sesi yang memakai lab. Rules belum menerapkan pemeriksaan referensi yang sama, jadi penjagaan tersebut masih di sisi alur client.

## 7. `attendance/{sessionId_UID}` — kehadiran

| Field | Tipe | Arti |
| --- | --- | --- |
| `sessionId` | string | ID pertemuan. |
| `practitionerId` | string UID | Pemilik presensi, dari Auth. |
| `checkedInAt` | Timestamp | Waktu server melalui `serverTimestamp()`. |
| `session` | map | Ringkasan enam field sesi, dijelaskan di bawah. |
| `labId` | string | Lab ketika presensi dibuat. |
| `method` | `location` / `qr` | Metode input yang tetap melewati validasi lokasi. |
| `location.point` | GeoPoint | Latitude/longitude posisi perangkat. |
| `location.accuracy` | number | Akurasi dalam meter. |
| `location.observedAt` | Timestamp | Waktu pembacaan GPS perangkat. |
| `qrToken` | string, hanya QR | Harus cocok dengan nonce sesi. |

Ringkasan `session` berisi tepat `courseName`, `className`, `dateLabel`, `timeRange`, `room`, dan `assistantName`. Nilainya disalin ketika commit, agar Riwayat dapat dibaca walaupun sesi kemudian berubah/hilang. Ini snapshot informasi, bukan sinkronisasi dua arah.

Record Sprint 2 lama dapat tidak mempunyai bukti lokasi. Pembacaan riwayat tetap mendukung catatan lama; jangan menambahkan bukti GPS buatan untuk memaksa seluruh record tampak mengikuti Sprint 3.

Context mengubah Timestamp `checkedInAt` menjadi milidetik atau null untuk rendering. Angka hasil pemetaan UI bukan bukti bahwa field server disimpan sebagai number.

## 8. `permissionRequests/{sessionId_UID}` — izin

| Field | Tipe | Arti |
| --- | --- | --- |
| `sessionId`, `practitionerId` | string | Sesi dan UID pemilik. |
| `reason` | string | Alasan yang di-trim, 10–1.000 karakter. |
| `status` | `pending` / `approved` / `rejected` | Keputusan manusia; awalnya pending. |
| `createdAt` | Timestamp | Waktu server ketika diajukan. |
| `session` | map | Ringkasan enam field yang sama dengan presensi. |
| `ai.status` | `pending` / `success` / `failed` | Kondisi klasifikasi, terpisah dari keputusan. |
| `ai.category` | string opsional | Saat ini label sentimen `positif`, `netral`, `negatif`. |
| `ai.error` | string opsional | Keterangan kegagalan klasifikasi. |
| `decisionNote` | string opsional | Catatan asisten. |
| `decidedBy` | string UID opsional | Asisten pengambil keputusan. |
| `decidedAt` | Timestamp opsional | Waktu server keputusan. |

Pembuat praktikan memulai `ai` sebagai `{status: pending}`. Asisten memproses klasifikasi dan keputusan pada pembaruan terpisah. AI gagal tidak menghapus pengajuan dan tidak otomatis menolak izin.

Pada implementasi sekarang, dokumen izin apa pun memblokir presensi pasangan yang sama, termasuk jika izin ditolak. Tidak tersedia penarikan/pengajuan ulang otomatis. Izin tidak membutuhkan GPS.

## 9. `notifications/{id}` — catatan kegiatan penerima

| Field | Tipe | Pemakaian |
| --- | --- | --- |
| `toUserId` | string UID | Penerima dokumen. |
| `type` | string | `sesi_dibuka`, `jadwal_berubah`, `izin_diterima`, `izin_ditolak`. |
| `title`, `body` | string | Isi yang ditampilkan sebagai notifikasi lokal. |
| `sessionId` | string opsional | Konteks sesi. |
| `createdAt` | number milidetik | Dibuat dengan `Date.now()`, **bukan Timestamp server** pada service saat ini. |
| `read` | boolean | Awalnya false; service menyediakan pembaruan status baca. |

ID dibuat otomatis per dokumen/penerima. `notifyUsers` menyingkirkan UID ganda dalam satu panggilan, tetapi bukan kunci idempoten satu event lintas retry/perangkat. Data ini bukan antrean backend pengirim remote push yang sudah terbukti aktif.

## 10. Master mata kuliah `matkul` dan modul lama `courses`

`matkul` dibaca halaman Kelas. ID dokumen dicocokkan dengan `users.matkul_diampu`. Label pilihan memakai `nama_matkul`, `nama`, atau ID dokumen. Kelas menyimpan nama pilihan pada `classes.course`, lalu form sesi memakai nama dari daftar kelas untuk `sessions.courseName`.

`courses` tercantum pada Rules lokal dan pada `src/lib/courses.ts`, yang mendefinisikan pembaca dengan fallback serta fungsi seed. Field yang didefinisikan meliputi `name`, `code`, `defaultRoom`, dan `defaultDescription`. Tidak ditemukan pemanggil aktif untuk kedua fungsi tersebut.

Tidak ada alasan menambahkan koleksi `permissions`, indeks NIM baru, koleksi `asisten`, atau tabel SQL hanya karena nama tersebut muncul di percakapan/dokumen historis. Koleksi izin aktif adalah **`permissionRequests`**.

## 11. Query dan transaksi yang menentukan akses

| Pembaca | Query |
| --- | --- |
| Home/Presensi praktikan | `sessions`, `participantIds array-contains UID`. |
| Riwayat sendiri | `attendance`, `practitionerId == UID`. |
| Izin sendiri | `permissionRequests`, `practitionerId == UID`. |
| Rekap sesi asisten | `attendance`, `sessionId == ID`. |
| Pemeriksaan izin asisten | `permissionRequests`, urut `createdAt` menurun. |
| Notifikasi sendiri | `notifications`, `toUserId == UID`. |
| Lab sesi | Satu dokumen `labs/{session.labId}`. |

Rules bukan filter setelah query: query seluruh presensi lalu menyaring di React belum memenuhi pembatasan baca milik sendiri. Jika query memerlukan index tambahan, pesan Firestore menjadi bukti; jangan mengarang index atau menerapkannya tanpa pemeriksaan/otorisasi.

`recordParticipation` membaca sesi, presensi, dan izin dalam transaksi yang sama; presensi lokasi juga membaca lab. Kedua koleksi memakai ID pasangan yang sama dan saling mengecek keberadaan record. ID deterministik, transaksi, serta larangan update record kehadiran bekerja bersama mencegah duplikasi.

## 12. Penghapusan dan konsistensi

- Hapus kelas/sesi tidak otomatis menghapus seluruh dokumen yang menunjuknya.
- Snapshot sesi menjaga teks Riwayat, bukan menjamin setiap relasi aktif masih ada.
- Sinkronisasi roster mempertahankan UID yang sudah punya riwayat; penghapusan peserta kelas tidak selalu mencabut akses sesi historis.
- NIM ganda/akun tanpa NIM menyebabkan pemetaan tidak lengkap; jangan menebak UID berdasarkan nama yang mirip.
- Dua modul berbeda membaca lab (`src/services/lab-service.ts` dan service CRUD di `features/lab-management`); keduanya memakai `labs`, tetapi validasi pembaca tidak identik.
- Bukti GPS adalah data sensitif lokasi. Kode tidak memperlihatkan kebijakan retensi/penyamaran lokasi untuk produksi; ini perlu keputusan tim bila aplikasi dipakai di luar praktikum.

File utama untuk memeriksa skema adalah [tipe praktikan](../src/types/practitioner.ts), [service praktikan](../src/services/practitioner-service.ts), [service asisten](../src/services/assistant-service.ts), [kelas](../src/lib/classes.ts), [sinkronisasi](../src/services/class-sync.ts), dan [Rules](../firestore.rules). Dokumentasi ini tidak menetapkan skema baru di luar pembaca/penulis tersebut.
