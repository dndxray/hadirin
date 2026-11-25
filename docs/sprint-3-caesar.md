# Sprint 3 Caesar: Presensi, Lokasi, QR, dan Penerimaan Push

Branch: `feature/location-attendance-and-notifications`, berangkat dari `main` `3498c72` pada 23 November 2026. PM Sprint 3: Fadhil. Tidak ada push, perubahan Firebase Console, atau deployment Rules dalam pengerjaan ini.

## Cakupan implementasi

| SRS | Implementasi Caesar |
| --- | --- |
| 26 | Tab/halaman `/presensi`, terpisah dari detail. Detail meneruskan `sessionId`; sesi langsung terpilih. Data dari listener Firestore, tanpa fallback dummy. |
| 27 | Izin lokasi foreground, GPS, pemeriksaan posisi baru, jarak Haversine, radius, akurasi, dan hasil di dalam/luar radius. |
| 28 | Lokasi diambil ulang saat konfirmasi. Transaksi membaca sesi, lab, presensi, dan izin; Rules menghitung ulang jarak. Hanya status tersimpan `open` yang diterima. |
| 29 | Pesan untuk izin ditolak, GPS mati, koordinat/akurasi belum memadai, timeout, data cache/offline, lab belum diatur, dan kegagalan Firestore. |
| 30 | Izin notifikasi dari Profil, channel Android, token Expo per akun/perangkat, listener foreground/tap/cold start, target route terbatas, refresh token, dan pelepasan token sebelum logout. Web/Expo Go diberi keterangan tidak didukung. |
| 31 | Scanner `expo-camera`, kontrak QR versi 1, pemeriksaan sesi/token, satu hasil per scan, dan konfirmasi yang tetap memeriksa GPS, status, peserta, serta duplikasi. |

CRUD lab/Maps adalah pekerjaan Dinda (22-25). Pemilihan lab/radius pada sesi, pengiriman push berdasarkan event, dan tampilan QR asisten adalah pekerjaan Elza (32-37). Branch ini menyediakan pembaca/validator serta kontrak; tidak membuat pengganti dummy untuk bagian mereka.

## Kontrak integrasi lokal yang perlu disepakati tim

Tim belum memiliki kontrak ketika pengerjaan dimulai. Struktur berikut dipakai implementasi dan pengujian lokal; PM perlu menyepakatinya sebelum menggabungkan kode Dinda/Elza. Tidak ada migrasi otomatis ke Firebase tim.

### 1. Laboratorium: `labs/{labId}` (Dinda)

```json
{
  "name": "Lab Contoh",
  "latitude": -7.05,
  "longitude": 110.44,
  "radiusMeters": 100
}
```

Koordinat di atas hanya contoh, bukan koordinat kampus yang diverifikasi. Latitude/longitude harus angka dalam rentang geografis; radius 1-1000 meter. Nama tidak kosong, maksimal 120 karakter. Rules lokal menyediakan baca bagi akun login dan mutasi bagi asisten dengan data valid.

### 2. Tambahan sesi: `sessions/{sessionId}` (Elza)

| Field | Kebutuhan |
| --- | --- |
| `labId: string` | ID dokumen lab. Wajib untuk presensi Sprint 3. |
| `attendanceRadiusMeters?: number` | Override radius per sesi, 1-1000 m. Jika tidak ada, pakai radius lab. `null` bukan pengganti field yang absen. |
| `qrToken?: string` | Nonce 16-128 karakter huruf/angka/underscore/hyphen untuk alur QR. Disarankan UUID/random yang diganti setiap sesi dibuka kembali. |
| `status` | `upcoming`, `open`, `closed`. Presensi tidak dibuka otomatis hanya karena jam mulai terlewati. |
| `participantIds: string[]` | UID Firebase Auth peserta, bukan NIM. |

Elza perlu meneruskan field ini pada tipe, form, create/update service, dan pemetaan snapshot asisten; menambahkan field pada form saja tidak cukup jika service membuangnya. Konfigurasi sesi/lab lama yang belum lengkap diblokir dengan pesan, bukan otomatis dibuatkan lab.

Beberapa tampilan baseline menghitung status berdasarkan jam (`getSessionStatus`). Syarat presensi dan Rules memakai `sessions.status` tersimpan. Tim perlu menyamakan tampilan/kontrol asisten dengan sumber tersebut; label otomatis bukan bukti asisten telah membuka sesi.

### 3. Isi QR asisten (Elza) dan pembaca (Caesar)

```json
{
  "type": "hadirin.attendance",
  "version": 1,
  "sessionId": "ID_DOKUMEN_SESI",
  "token": "NONCE_SESI_MINIMAL_16_KARAKTER"
}
```

Encode JSON ini sebagai QR. `token` harus sama dengan `sessions/{id}.qrToken`. ID dokumen/payload dibatasi agar bukan path atau URL arbitrer. QR lama, versi lain, sesi lain, dan token berbeda ditolak. Hasil scan tidak langsung menyimpan presensi; pengguna mengonfirmasi setelah pemeriksaan lokasi.

QR adalah sarana memilih/memvalidasi sesi, bukan faktor autentikasi rahasia atau bukti lokasi fisik. Presensi tombol biasa tetap tersedia dengan syarat GPS yang sama.

### 4. Bukti presensi (Caesar)

`attendance/{sessionId_UID}` mempertahankan field Sprint 2 dan menambah:

| Field | Isi |
| --- | --- |
| `labId` | Lab yang direferensikan sesi saat transaksi. |
| `method` | `location` atau `qr`. |
| `location.point` | Firestore `GeoPoint` posisi perangkat. |
| `location.accuracy` | Akurasi meter dari perangkat. Harus 0-50 m dan tidak lebih besar dari radius. |
| `location.observedAt` | Firestore `Timestamp` waktu pembacaan GPS; bukan waktu presensi. |
| `qrToken` | Hanya untuk metode QR; harus cocok dengan sesi. |

`checkedInAt` tetap `serverTimestamp()`. Umur posisi maksimal 30 detik, toleransi waktu perangkat maksimal 5 detik ke depan. Lokasi simulasi ditolak jika OS menandainya. Jarak dibandingkan dengan radius tanpa membulatkan angka tampilan.

Rules memakai `GeoPoint.distance(latlng.value(...))` dari data lab server, tidak mempercayai angka jarak kiriman client. Keanggotaan, status, ID, waktu server, snapshot sesi, dan ketidakadaan izin juga diperiksa. Riwayat lama tetap boleh dibaca; aturan baru berlaku untuk pembuatan presensi baru.

### 5. Token dan payload push (Caesar/Elza)

- Token disimpan sebagai array `users/{UID}.expoPushTokens`, memakai `arrayUnion` untuk beberapa perangkat. Maksimum 20 entri; sender harus memvalidasi format token dan membersihkan token mati berdasarkan receipt.
- Channel Android yang dibuat receiver: **`praktikum`**. Sender menggunakan `channelId: "praktikum"` dan, jika diperlukan, `sound: "default"`.
- Receiver tidak melakukan pengiriman push dan tidak menyimpan service-account key. Pengiriman event tepat sasaran/deduplikasi/receipt adalah bagian Elza.
- Logout menunggu pelepasan token. Jika jaringan belum mengonfirmasi cleanup dalam 10 detik, logout melaporkan gagal dan akun tidak sengaja dianggap sudah keluar. Pendaftaran baru diblokir ketika cleanup masih berjalan.

```json
{
  "to": "ExpoPushToken[TOKEN_PERANGKAT]",
  "title": "Sesi dibuka",
  "body": "Presensi praktikum sudah dapat dilakukan.",
  "channelId": "praktikum",
  "sound": "default",
  "data": {
    "type": "session_opened",
    "recipientId": "UID_PENERIMA",
    "sessionId": "ID_DOKUMEN_SESI"
  }
}
```

Jenis `data.type`: `session_opened` / `session_updated` menuju `/presensi?sessionId=...`; `permission_decided` menuju `/explore`. `recipientId` wajib cocok dengan akun. URL bebas tidak dibuka. Cold start menunggu akun dan navigator siap; ID respons ditangani sekali. Notifikasi tetap bergantung pada OS/koneksi dan layanan pengirim, bukan dijamin sampai hanya karena token tersimpan.

## Setup native yang masih memerlukan PM/pemilik project

1. Gabungkan kontrak field dengan pekerjaan Dinda/Elza. Review lalu publish gabungan Rules melalui pemilik project; file Git tidak otomatis berlaku di Console. Jangan mengganti seluruh rules tim hanya untuk menambah satu blok.
2. Untuk Android push, sediakan konfigurasi Google Services aplikasi yang package-nya `com.dindaisyrn.hadirin`. `app.config.ts` membaca `GOOGLE_SERVICES_JSON` sebagai path file lokal atau EAS file environment variable.
3. Pemilik project mengatur kredensial FCM v1/APNs di Expo/EAS. Jangan menaruh private/service-account key di `EXPO_PUBLIC_*`, repo, atau chat.
4. Buat **development build baru**, karena `expo-location`, `expo-camera`, dan `expo-notifications` menambahkan modul/config native. APK Sprint 2 yang tidak berisi modul ini tidak cukup.
5. Setelah APK baru terpasang, jalankan Metro branch ini dengan `npx expo start --dev-client`. Gunakan tunnel hanya jika jalur LAN tidak dapat dipakai. Tidak ada build atau deployment cloud yang dilakukan pada tugas ini.

[Expo Location SDK 58](https://docs.expo.dev/versions/v58.0.0/sdk/location/), [Camera SDK 58](https://docs.expo.dev/versions/v58.0.0/sdk/camera/), [Notifications SDK 58](https://docs.expo.dev/versions/v58.0.0/sdk/notifications/), [Rules LatLng.distance](https://firebase.google.com/docs/reference/rules/rules.LatLng#distance).

## Cara mencoba sekarang: web terlebih dahulu

```bash
npx expo start --web --clear
```

Gunakan konfigurasi Firebase yang sudah ada dan akun sendiri. Tidak perlu membuat akun/data demo atau menyalakan emulator untuk mencoba manual. Perubahan data dari aplikasi ini tetap menuju Firebase tim; jangan menghapus atau mengubah data pengguna lain untuk pengujian.

- Halaman Presensi, navigasi dari detail, informasi sesi, feedback kegagalan, dan Riwayat dapat diperiksa sekarang. Lokasi/kamera browser memerlukan izin, perangkat yang mendukung, serta `localhost` atau HTTPS.
- Agar presensi benar-benar tersimpan, dibutuhkan lab valid, `sessions.labId`, status `open`, UID peserta dalam sesi, serta Rules Sprint 3 yang sudah diterapkan. Form Dinda/Elza tidak harus selesai jika data nyata tersebut sudah disiapkan oleh pihak berwenang sesuai kontrak; branch ini tidak mengisinya otomatis.
- QR dapat diuji dengan QR valid untuk sesi nyata dan nonce yang cocok, tanpa menunggu halaman penampil QR asisten. Tanpa data tersebut, yang dapat diuji baru penanganan kamera/payload salah.
- Push Expo native tidak dapat dibuktikan melalui web. Penerima dapat diuji terpisah dari otomatisasi Elza lewat kiriman uji setelah development build baru dan kredensial layanan siap. Jangan menganggap pengiriman event sudah tersedia dari branch Caesar.

Untuk pemeriksaan berikutnya, prioritaskan web dengan proyek/data yang sudah ada. Gunakan perangkat fisik untuk kemampuan native; suite terisolasi di bawah adalah pilihan tambahan, bukan prasyarat mencoba aplikasi.

## Verifikasi otomatis (opsional)

```bash
npm run test:unit
npx tsc --noEmit
npx expo lint
```

Tes integrasi hanya untuk emulator **`demo-hadirin`**, Auth port 9099 dan Firestore port 8085:

```bash
npx firebase-tools emulators:start --only auth,firestore --project demo-hadirin
npm run test:rules
```

UI test membutuhkan Expo web lokal di port 8092 yang secara eksplisit diarahkan ke emulator (`EXPO_PUBLIC_FIREBASE_EMULATORS=true`, project `demo-hadirin`, host `127.0.0.1`, API key uji). Jangan memakai Firebase tim untuk fixture. `src/lib/firebase.ts` mengaktifkan koneksi emulator hanya pada mode development dengan opt-in tersebut.

```bash
npm run test:sprint3:web
```

Playwright Python + Chromium/Chrome diperlukan. Fixture terikat ke loopback dan project demo; tidak membaca kredensial tim. Tes mencakup UI pada 320/768/1280 px, navigasi dari detail, simulasi GPS, tampilan kebutuhan izin kamera, radius, penyimpanan/riwayat setelah reload, duplikasi, sesi tertutup, lab kosong, dan informasi push web. Jangan menjalankan suite Rules dan UI bersamaan: keduanya memakai fixture emulator yang sama.

### Hasil verifikasi 23 November 2026

| Pemeriksaan | Hasil |
| --- | --- |
| Unit lokasi, QR, permission, token, receiver, dan regresi sentimen | 28/28 lulus. SDK perangkat pada unit test memakai mock. |
| Integrasi Firestore Rules/transaksi | 33/33 lulus pada emulator `demo-hadirin`. |
| Playwright web | Alur Presensi, persistensi/riwayat, guard kegagalan, state kamera/notifikasi, dan lebar 320/768/1280 px lulus; tidak ada page error. |
| TypeScript `tsc --noEmit` | Lulus. |
| Expo lint | 0 error; 1 warning baseline `currentUser` dependency pada halaman Kelas. |
| `expo install --check` | Dependencies are up to date setelah diselaraskan, tetap SDK 58 (`~58.0.26`). |
| Export JavaScript Android dan iOS | Keduanya berhasil dibundel ke Hermes bytecode; ini bukan build APK/IPA atau uji perangkat fisik. |
| Pemeriksaan mekanis UI | Tidak ada temuan pada komponen baru. |

`npm audit --omit=dev` masih melaporkan 13 temuan transitif/runtime (5 high, 8 moderate). Sebagian rekomendasi otomatis mengubah mayor Expo/Firebase, termasuk downgrade; tidak dijalankan dengan `--force`. Ini backlog keamanan dependensi yang perlu review tim, bukan alasan untuk mengklaim siap produksi. APK nyata/layanan push tetap membutuhkan uji terpisah di bawah ini.

**Batas bukti uji:** GPS/QR/push fisik Android/iOS, penerimaan background pada APK nyata, kredensial FCM/APNs tim, dan pengiriman event Elza belum diuji. Unit test receiver menggunakan SDK mock; itu bukan bukti push nyata telah terkirim. Koordinat OS juga bukan attestation anti-spoof; produksi memerlukan perlindungan tambahan sesuai threat model tim.
