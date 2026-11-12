# Sprint 2 — Caesar

Branch: `feature/caesar-sprint-2`, berdasarkan `origin/main` commit `67b3d01` (sudah mencakup autentikasi dan kelas Dinda).

## Implementasi

- SRS-05: transaksi Firestore, status sesi dicek ulang di server, ID deterministik, waktu server, modal sukses setelah commit berhasil.
- SRS-06: listener presensi akun sendiri, ringkasan sesi disimpan bersama presensi sehingga riwayat tetap terbaca walaupun sesi dihapus.
- SRS-18: tab Izin, pilihan sesi peserta, alasan trim 10–1.000 karakter, status awal `pending`, konfirmasi sukses setelah commit.
- SRS-19: riwayat izin pada tab Riwayat; keputusan dan hasil AI diperbarui melalui listener; AI pending/gagal tidak menghapus pengajuan.
- SRS-20: rules membatasi UID pemilik, peserta sesi, status sesi, timestamp server, create-only, serta perubahan keputusan/AI hanya oleh asisten.
- SRS-21: loading, empty state, error + retry listener, indikator cache, tombol submit terkunci selama operasi dan ketika sesi belum tersinkron.

Login/registrasi/logout tetap memakai implementasi Dinda. Halaman jadwal/detail dan fitur asisten yang masih memakai dummy merupakan bagian integrasi Dinda/Fadhil, bukan sumber data halaman Caesar.

Output web menggunakan `single` (aplikasi client/SPA) karena baseline `server` menghasilkan `Requiring unknown module` pada SSR ketika URL riwayat di-reload. Aplikasi ini menggunakan Firebase client dan tidak memiliki API routes/SSR yang diperlukan. Pengaturan native tetap sama. Hosting web nantinya perlu fallback route ke `index.html`.

## Menjalankan dengan Firebase tim

1. Salin `.env.example` menjadi `.env.local`; isi konfigurasi Web App dari Firebase Console milik tim. Nilai `EXPO_PUBLIC_*` memang dikirim ke client; keamanan database harus ditegakkan oleh rules. Jangan masukkan service account atau secret API AI ke aplikasi.
2. Jalankan `npm install`. Firebase dipatok ke `12.10.0`: kompatibel dengan Node 22 dan SDK 58; Firebase 13 baseline meminta Node >=24.12.
3. Minta pemilik Firebase menerapkan `firestore.rules` setelah dicocokkan dengan perubahan anggota lain. Perintah pemilik: `npx --yes firebase-tools@14.27.0 deploy --only firestore:rules --project ID_FIREBASE_TIM`. Tidak ada deploy otomatis dari branch ini.
4. Jalankan `npx expo start --dev-client`. Karena baseline Dinda menambahkan AsyncStorage native, development APK harus mencakup dependency tersebut; mintalah APK baru bila APK Sprint 1 belum memilikinya.
5. Login akun praktikan, pastikan UID-nya tercantum pada `participantIds` dokumen sesi. Data dummy tidak lagi muncul pada presensi/riwayat/izin.

## Kontrak Firestore untuk integrasi tim

### `users/{uid}` — Dinda

`name`, `email`, `role: 'praktikan' | 'asisten'`. UID dari Firebase Auth menjadi sumber identitas; tidak menggunakan NIM/email sebagai UID.

### `sessions/{sessionId}` — Fadhil

```js
{
  courseName: 'Pemrograman Perangkat Bergerak',
  className: 'TI-3A',
  dateLabel: 'Kamis, 12 November 2026',
  timeRange: '13.00–15.00 WIB',
  room: 'Lab Mobile 2',
  assistantName: 'Fadhil',
  status: 'upcoming', // upcoming | open | closed
  participantIds: ['UID_FIREBASE_CAESAR', 'UID_FIREBASE_PRAKTIKAN_LAIN']
}
```

Query praktikan: `where('participantIds', 'array-contains', auth.uid)`. Kelas Dinda saat ini berisi peserta `{nim, name}`; tim perlu menambahkan pemetaan ke UID untuk mengisi `participantIds` saat membuat sesi. Jangan memasukkan NIM ke daftar UID. Status string dan nama field harus disepakati sebelum merge Fadhil.

### `attendance/{sessionId}_{uid}`

`sessionId`, `practitionerId` (UID Auth), `checkedInAt` (Firestore serverTimestamp), `session` (snapshot nama praktikum, kelas, tanggal, waktu, ruang, nama asisten). Query asisten dapat menggunakan `where('sessionId', '==', id)`; query praktikan wajib memakai `where('practitionerId', '==', auth.uid)`.

Dokumen tidak dapat diubah/dihapus oleh client. Dua kali submit pada sesi yang sama tidak membuat dokumen baru. Transaksi dan rules melarang presensi ketika sesi tidak `open`.

### `permissionRequests/{sessionId}_{uid}`

```js
{
  sessionId: 'id-sesi', practitionerId: 'UID_FIREBASE',
  reason: 'Saya sedang sakit dan memerlukan istirahat.',
  createdAt: serverTimestamp(),
  status: 'pending', // pending | approved | rejected
  session: { courseName, className, dateLabel, timeRange, room, assistantName },
  ai: { status: 'pending' } // success + category, atau failed + error
}
```

Satu pengajuan per pengguna/sesi. Kebijakan branch ini: hanya sesi upcoming/open; tidak boleh ada presensi sekaligus izin. Izin yang ditolak tetap merupakan pengajuan resmi dan tidak dapat diajukan ulang; perubahan kebijakan ini perlu disepakati tim dan diuji pada service/rules.

### SRS-14 — worker AI Fadhil

Pengajuan disimpan **sebelum** pemanggilan AI. Fadhil memproses dokumen `ai.status == 'pending'` melalui backend tepercaya atau akun asisten. Jangan mengandalkan proses di HP praktikan: aplikasi dapat ditutup setelah pengajuan tersimpan.

- Sukses: update hanya `ai: { status: 'success', category: 'kategori API pengajar' }`.
- Timeout/error: update hanya `ai: { status: 'failed', error: 'timeout' }`.
- Worker yang dimulai ulang harus bisa memproses pengajuan pending kembali (idempotent).
- Tidak ada pemanggilan API AI pada branch Caesar karena endpoint/kontrak dan SRS-14 merupakan tanggung jawab Fadhil. Folder lokal `ai/` yang sudah ada tidak diubah atau dimasukkan ke commit; model sentimen lokal tersebut tidak dianggap sebagai API pengajar.
- UI tidak menampilkan detail teknis error dari API; memberikan keterangan bahwa izin tetap tersimpan.

### SRS-16 — keputusan Fadhil

Asisten mengubah dokumen pending dengan satu update:

```js
{ status: 'approved', decidedBy: auth.uid, decidedAt: serverTimestamp(), decisionNote: 'Catatan opsional' }
```

Gunakan `rejected` untuk penolakan. Update klasifikasi dan update keputusan harus terpisah. Rules menolak perubahan identitas, alasan, snapshot sesi, serta waktu pengajuan. AI tidak mempunyai jalur untuk mengubah keputusan secara otomatis.

## Verifikasi lokal

```bash
npx expo lint
npx tsc --noEmit
npx --yes firebase-tools@14.27.0 emulators:exec --project demo-hadirin --only firestore "node --test tests/firestore.rules.test.mjs"
```

Java 21 diperlukan untuk emulator. Tests menggunakan project `demo-hadirin` dan tidak membutuhkan akun Firebase atau izin EAS. Mencakup service asli, klik bersamaan, UID palsu, duplikasi, sesi tertutup, input invalid, pemisahan akun, izin/kehadiran yang saling eksklusif, kegagalan AI, dan listener keputusan asisten.

Hasil verifikasi implementasi: 13/13 pengujian Firestore lulus; lint dan TypeScript lulus; pengujian UI emulator login → presensi → izin → riwayat → reload/persistensi lulus; ekspor bundle Android berhasil. Tampilan web diperiksa pada 390×844 dan 1280×900. Kontras teks sekunder, error, dan peringatan mode terang diperkuat menggunakan token yang sama; identitas warna dan mode gelap tetap dipertahankan. Belum dilakukan pengujian pada HP fisik atau API AI pengajar.

Untuk uji UI web lokal (Chromium + Python Playwright terpasang):

1. `npx --yes firebase-tools@14.27.0 emulators:start --project demo-hadirin --only auth,firestore`
2. `node tests/seed-practitioner.mjs` pada emulator yang baru dimulai (akun seed dibuat sekali).
3. Gunakan konfigurasi lokal sementara: API key `test-key`, project ID `demo-hadirin`, app ID `test-app`, `EXPO_PUBLIC_FIREBASE_EMULATORS=true` dan host `127.0.0.1`.
4. `npx expo start --web --port 8097`, lalu `python tests/practitioner-ui.py`.
5. Kembalikan env ke Firebase tim dan matikan flag emulator sebelum pengujian perangkat nyata. Untuk Android fisik, host emulator harus IP LAN laptop; diperlukan akses jaringan yang sesuai.

Uji perangkat nyata dan API pengajar tetap memerlukan konfigurasi Firebase tim, deployment rules, sesi Firestore Fadhil, worker AI, serta development build yang sesuai. Uji emulator bukan bukti bahwa API AI pengajar sudah terintegrasi.
