# Sprint 1 — Sisi Asisten (SRS-03 & SRS-04)

Aplikasi demo praktikum: React Native + Expo (Expo Go), data dummy lokal, tanpa backend.
Dokumen ini hanya mencakup **sisi Asisten**. Sisi Praktikan dikerjakan orang lain di branch lain. Baca seluruh dokumen sebelum menulis kode.

---

## 1. Scope

**Dikerjakan di branch ini**

- SRS-03: asisten membuka dan menutup sesi dengan konfirmasi.
- SRS-04: asisten melihat daftar praktikan yang sudah presensi beserta waktunya.
- Pendukung yang dibutuhkan keduanya: daftar jadwal asisten dan detail sesi (Sprint-Req-1), perubahan status sesi yang langsung terlihat (Sprint-Req-2), rekap kehadiran sisi asisten (Sprint-Req-4), form + Modal (Sprint-Req-5).

**Tidak dikerjakan (jangan dibuat, jangan di-stub)**

- Layar, komponen, atau logika sisi praktikan: presensi, riwayat presensi, modal sukses presensi.
- Pemilihan peran / identitas, role selector, tombol switch role.
- Root layout dan halaman awal (`app/_layout.tsx`, `app/index.tsx`).
- Sinkronisasi data dengan sisi praktikan. Data kehadiran di sisi asisten adalah data dummy sendiri.

---

## 2. Aturan Git

1. Buat branch dari kondisi repo saat ini: `git checkout -b Asisten`. Jika branch `Asisten` sudah ada, cukup `git checkout Asisten`.
2. Dilarang menjalankan: `git add`, `git commit`, `git push`, `git stash`, `git reset`, `git rebase`, `git merge`, atau perintah git lain yang mengubah repo/riwayat. Perintah baca (`git status`, `git diff`, `git branch --show-current`) boleh sesuai dengan konfirmasi programmer.
3. Dilarang membuat script atau alias yang menjalankan git, dan dilarang mengubah apa pun di dalam `.git/`.
4. Biarkan semua perubahan unstaged. Programmer yang akan review dan commit manual.

---

## 3. Batas File (aturan anti-bentrok)

Seluruh kode sisi asisten hanya boleh berada di dua lokasi ini:

| Lokasi | Isi |
|---|---|
| `app/(asisten)/` | Route sisi asisten |
| `features/asisten/` | Komponen, state, data, tipe, util, tema milik sisi asisten |

Aturan:

- **Jangan membuat, mengubah, atau menghapus file di luar dua lokasi di atas.** Termasuk `package.json`, `tsconfig.json`, `app.json`, `app/_layout.tsx`, `app/index.tsx`, `app/(praktikan)/`, `components/`, `context/`, `types/`, `constants/`, `hooks/`, `data/`.
- Sebelum mulai, cek isi repo (`ls`, `git status`). Jika sudah ada file milik tim di lokasi lain, biarkan apa adanya. Boleh di-import hanya jika benar-benar dibutuhkan, tapi sebaiknya tidak.
- Semua komponen generik (card, badge, modal, empty state) dibuat **sendiri di `features/asisten/components/`** meskipun sisi praktikan mungkin punya yang mirip. Duplikasi ini disengaja agar tidak terjadi konflik add/add saat merge. Merapikannya adalah tugas tahap integrasi.
- **Tidak boleh menambah dependency baru.** Gunakan yang sudah ada (`expo-router`, `react-native`, `react-native-safe-area-context`). Jika ada paket yang kurang, jangan install: tulis di laporan akhir.
- Jangan ubah `tsconfig.json`. Pakai alias `@/` jika sudah terdefinisi di sana, kalau tidak pakai relative import.
- Jika `app/index.tsx` belum ada, `/` akan membuka `app/(asisten)/index.tsx`. Jika sudah ada, jangan disentuh; cara membuka layar asisten cukup dicatat di laporan akhir.

---

## 4. Tech Stack

| Bagian | Pilihan |
|---|---|
| Framework | React Native + Expo (target Expo Go) |
| Navigasi | `expo-router` (file-based), Stack |
| Bahasa | TypeScript strict |
| Styling | `StyleSheet` + Flexbox. Tanpa NativeWind atau library UI |
| State | `useReducer` + Context, khusus sisi asisten, in-memory |
| Modal | `Modal` bawaan React Native. Tidak memakai `@gorhom/bottom-sheet` |
| Tidak dipakai | Backend, Supabase, Redux, AsyncStorage, library tanggal |

---

## 5. Kebutuhan & Acceptance Criteria

### 5.1 SRS-03 — Buka & Tutup Sesi dengan Konfirmasi

> Sebagai asisten, saya ingin membuka dan menutup sesi praktikum dengan konfirmasi terlebih dahulu, agar presensi hanya bisa dilakukan selama praktikum berlangsung.

- [ ] Detail sesi dengan `status === 'CLOSED'` menampilkan tombol hijau "Buka Sesi".
- [ ] Tap "Buka Sesi" membuka modal konfirmasi. Judul "Buka Sesi", pesan: "Buka sesi [nama praktikum] — Kelas [kelas]? Praktikan akan dapat melakukan presensi." Tombol: "Buka" (hijau) dan "Batal".
- [ ] "Buka" mengubah status menjadi `OPEN`, modal tertutup, tombol berganti menjadi "Tutup Sesi" (merah).
- [ ] "Batal" (atau tap backdrop, atau tombol back Android) menutup modal, status tidak berubah.
- [ ] Detail sesi dengan `status === 'OPEN'` menampilkan tombol merah "Tutup Sesi".
- [ ] Tap "Tutup Sesi" membuka modal konfirmasi. Judul "Tutup Sesi", pesan: "Tutup sesi? Setelah ditutup, praktikan tidak dapat presensi lagi." Tombol: "Tutup" (merah) dan "Batal".
- [ ] "Tutup" mengubah status menjadi `ENDED`, modal tertutup, tombol diganti card abu berisi "Sesi telah ditutup". Tidak ada tombol aksi.
- [ ] Sesi `ENDED` tidak bisa dibuka kembali.
- [ ] Perubahan status langsung terlihat di badge pada detail sesi **dan** pada kartu di daftar jadwal (kembali dari detail, tanpa reload).
- [ ] Transisi status hanya sah dari `CLOSED → OPEN` dan `OPEN → ENDED`. Transisi lain diabaikan di reducer (melindungi dari double-tap).

### 5.2 SRS-04 — Daftar Praktikan yang Sudah Presensi

> Sebagai asisten, saya ingin melihat daftar praktikan yang sudah presensi beserta waktu kehadirannya, agar saya dapat memantau kehadiran selama sesi.

- [ ] Detail sesi punya section "Daftar Kehadiran".
- [ ] Setiap baris menampilkan Nama, NIM, dan waktu presensi format `HH:mm:ss`.
- [ ] Urutan berdasarkan waktu presensi ascending (paling awal di atas). Urutan dilakukan di kode, bukan mengandalkan urutan data seed.
- [ ] Header section menampilkan "X praktikan sudah hadir", X = total record sesi tersebut (tidak berubah oleh pencarian).
- [ ] Daftar tampil pada status `OPEN` maupun `ENDED`. Pada `CLOSED` section tetap tampil dengan empty state.
- [ ] Empty state (teks mengikuti status sesi):
  - `CLOSED`: "Belum ada praktikan yang presensi. Buka sesi untuk memulai."
  - `OPEN`: "Belum ada praktikan yang presensi. Menunggu praktikan melakukan presensi."
  - `ENDED`: "Tidak ada praktikan yang presensi pada sesi ini."
- [ ] Form pencarian (lihat 8.2): memfilter baris berdasarkan nama atau NIM. Tampil hanya jika sesi punya minimal 1 record.

### 5.3 Pendukung

- **Jadwal (Sprint-Req-1):** daftar sesi menampilkan nama praktikum, kelas, tanggal, waktu, ruangan, dan status. Detail sesi menampilkan informasi yang sama beserta kode mata kuliah dan deskripsi.
- **Form + Modal (Sprint-Req-5):** form = kolom pencarian di Daftar Kehadiran. Modal = konfirmasi buka/tutup sesi.

---

## 6. Struktur File

```
app/(asisten)/
├── _layout.tsx                 # AsistenProvider + Stack
├── index.tsx                   # Daftar jadwal
└── sessions/
    └── [sessionId].tsx         # Detail sesi: aksi buka/tutup + Daftar Kehadiran

features/asisten/
├── AsistenContext.tsx          # Provider, reducer, hook useAsisten
├── types.ts
├── dummyData.ts                # Asisten, sesi, kehadiran
├── theme.ts                    # Warna, spacing, ukuran font
├── utils/
│   └── format.ts               # formatTime, formatDate
└── components/
    ├── SessionCard.tsx
    ├── SessionStatusBadge.tsx
    ├── ConfirmModal.tsx
    ├── AttendanceRow.tsx
    └── EmptyState.tsx
```

Tidak boleh ada file lain.

---

## 7. Tipe & Data Dummy

### 7.1 Tipe (`types.ts`)

Bentuk dan nilai sengaja disamakan dengan kontrak tim agar mudah digabung. **Jangan ganti nama field atau nilai union.**

```ts
export type SessionStatus = 'CLOSED' | 'OPEN' | 'ENDED';

export interface Assistant {
  id: string;
  name: string;
}

export interface Session {
  id: string;
  courseName: string;
  courseCode: string;
  kelas: string;
  date: string;        // 'YYYY-MM-DD'
  startTime: string;   // 'HH:mm'
  endTime: string;     // 'HH:mm'
  room: string;
  assistantId: string;
  status: SessionStatus;
  description?: string;
}

export interface Attendance {
  id: string;
  sessionId: string;
  practitionerId: string;
  practitionerName: string;
  practitionerNim: string;
  checkedInAt: string; // 'YYYY-MM-DDTHH:mm:ss' tanpa zona waktu
  status: 'PRESENT' | 'LATE';
}
```

Arti status: `CLOSED` = sesi belum dibuka, `OPEN` = berlangsung, `ENDED` = sudah ditutup.

### 7.2 Seed (`dummyData.ts`)

Asisten: `{ id: 'u-asisten-1', name: 'Fadhil' }`.

Sesi (semua `assistantId: 'u-asisten-1'`):

| id | Praktikum | Kode | Kelas | Tanggal | Waktu | Ruang | Status | Deskripsi |
|---|---|---|---|---|---|---|---|---|
| s-1 | Struktur Data | IF184023 | A | 2026-10-27 | 08:00–10:00 | Lab A2.1 | OPEN | Praktikum 6: Binary Search Tree |
| s-2 | Basis Data | IF184031 | A | 2026-10-28 | 10:00–12:00 | Lab B1.3 | CLOSED | Praktikum 4: Join dan Subquery |
| s-3 | Pemrograman Web | IF184045 | B | 2026-10-29 | 13:00–15:00 | Lab A2.2 | CLOSED | Praktikum 3: Routing dan Form |
| s-4 | Struktur Data | IF184023 | A | 2026-10-20 | 08:00–10:00 | Lab A2.1 | ENDED | Praktikum 5: Linked List |

Kehadiran (urutan di array **sengaja tidak terurut** supaya pengurutan benar-benar teruji):

| sessionId | Nama | NIM | checkedInAt | status |
|---|---|---|---|---|
| s-1 | Dewi Lestari | 2230004 | 2026-10-27T08:01:33 | PRESENT |
| s-1 | Andi Pratama | 2230001 | 2026-10-27T08:04:50 | PRESENT |
| s-4 | Citra Maharani | 2230003 | 2026-10-20T08:19:07 | LATE |
| s-4 | Andi Pratama | 2230001 | 2026-10-20T08:02:14 | PRESENT |
| s-4 | Budi Santoso | 2230002 | 2026-10-20T08:05:41 | PRESENT |

Ambil `practitionerId` `u-1` s.d. `u-4` sesuai NIM (2230001 → `u-1`, dst). Sesi s-2 dan s-3 tidak punya record kehadiran. Tidak ada logika "terlambat" yang dihitung; `status` hanya data seed yang ditampilkan.

---

## 8. Komponen & Layar

### 8.1 `AsistenContext.tsx`

- State: `sessions: Session[]` (diinisialisasi dari seed) dengan `useReducer`.
- Action: `OPEN_SESSION { id }` dan `CLOSE_SESSION { id }`. Reducer hanya menerapkan jika status saat ini sesuai (`CLOSED` untuk buka, `OPEN` untuk tutup), selain itu mengembalikan state apa adanya.
- Nilai yang disediakan lewat `useAsisten()`: `assistant`, `sessions` (sudah terfilter `assistantId` dan terurut tanggal + jam mulai ascending), `getSession(id)`, `getAttendances(sessionId)` (terurut `checkedInAt` ascending), `openSession(id)`, `closeSession(id)`.
- Data kehadiran dibaca dari seed (read-only). Tidak ada aksi menambah kehadiran di sisi ini.
- `useAsisten()` melempar error jelas jika dipakai di luar provider.

### 8.2 Komponen (`features/asisten/components/`)

**`ConfirmModal`**
Props: `visible`, `title`, `message`, `confirmLabel`, `cancelLabel` (default "Batal"), `confirmColor: 'green' | 'red'`, `onConfirm`, `onCancel`.
- `Modal transparent animationType="fade"`, `statusBarTranslucent`, dan `onRequestClose={onCancel}` (wajib, agar tombol back Android menutup modal).
- Backdrop `Pressable` memanggil `onCancel`. Card di tengah, padding 24, radius 16, lebar maksimum 400.
- Dua tombol dalam satu baris Flexbox: Batal (outline) dan konfirmasi (solid sesuai warna).

**`SessionStatusBadge`**
Props: `status`.
- `CLOSED` → abu `#9CA3AF`, teks "Belum Dibuka".
- `OPEN` → hijau `#10B981`, teks "Sedang Berlangsung".
- `ENDED` → merah `#EF4444`, teks "Sudah Ditutup".
- Warna teks dipilih agar tetap terbaca di atas warna latar.

**`SessionCard`**
Props: `session`, `onPress`. Menampilkan nama praktikum, kelas, tanggal, jam, ruangan, dan badge status. Seluruh kartu bisa di-tap.

**`AttendanceRow`**
Props: `attendance`. Baris Flexbox: kiri (`flex: 1`) nama (bold) dan NIM (abu, kecil), kanan waktu `HH:mm:ss` (bold) dan label "Hadir" / "Terlambat" di bawahnya. Garis pemisah tipis di bawah.

**`EmptyState`**
Props: `icon` (emoji), `title`, `subtitle?`. Dipusatkan dengan Flexbox. Emoji dipakai sebagai pengganti ilustrasi.

### 8.3 `utils/format.ts`

- `formatTime(iso)` → `HH:mm:ss` memakai `getHours/getMinutes/getSeconds` dan `padStart`.
- `formatDate('YYYY-MM-DD')` → mis. `27 Okt 2026`, memakai array nama bulan manual. Tidak memakai `Intl` maupun library.

### 8.4 `app/(asisten)/_layout.tsx`

Membungkus `AsistenProvider` dan mendefinisikan `Stack`. Judul header: "Jadwal Praktikum" untuk index, "Detail Sesi" untuk detail. Tidak ada tab bar.

### 8.5 `app/(asisten)/index.tsx` — Jadwal

- Judul area: "Jadwal Praktikum" dan nama asisten.
- `FlatList` berisi `SessionCard`. Tap membuka `sessions/[sessionId]`.
- `ListEmptyComponent`: `EmptyState` 📅 "Belum ada jadwal praktikum".
- Kartu mencerminkan status terbaru dari context.

### 8.6 `app/(asisten)/sessions/[sessionId].tsx` — Detail (inti SRS-03 & 04)

Seluruh layar adalah satu `FlatList` (data = kehadiran terfilter). Header halaman diberikan lewat `ListHeaderComponent` berupa **elemen JSX, bukan fungsi komponen inline**, agar `TextInput` tidak kehilangan fokus setiap ketik. Jangan membungkus `FlatList` di dalam `ScrollView`.

Urutan isi:

1. Kartu info sesi: nama praktikum, kode, kelas, tanggal, jam, ruangan, deskripsi, badge status.
2. Area aksi sesuai status: tombol Buka Sesi / tombol Tutup Sesi / card "Sesi telah ditutup" (lihat 5.1). Tombol penuh lebar dengan `maxWidth: 480`, dipusatkan.
3. Header section "Daftar Kehadiran" dan "X praktikan sudah hadir".
4. Kolom pencarian (`TextInput`, placeholder "Cari nama atau NIM"), hanya jika ada record. Pencarian tidak sensitif huruf besar/kecil. Jika tidak ada hasil, tampilkan `EmptyState` 🔍 "Tidak ada hasil untuk "[kata kunci]"".
5. Baris kehadiran (`AttendanceRow`) atau empty state sesuai 5.2 lewat `ListEmptyComponent`.

State lokal: `showConfirmOpen`, `showConfirmClose`, `query`. Dua instance `ConfirmModal` (buka dan tutup). Saat konfirmasi: panggil `openSession` / `closeSession`, lalu tutup modal.
Gunakan `keyboardShouldPersistTaps="handled"` dan `KeyboardAvoidingView` agar keyboard tidak menutupi kolom pencarian.
Jika `sessionId` tidak ditemukan: `EmptyState` ⚠️ "Sesi tidak ditemukan" dengan tombol kembali ke daftar jadwal.

---

## 9. Edge Case yang Wajib Ditangani

1. Daftar jadwal kosong → empty state (diimplementasikan; tidak muncul dari data seed).
2. Daftar kehadiran kosong → tiga variasi teks sesuai status (5.2).
3. Modal dibatalkan (tombol Batal, backdrop, back Android) → state tidak berubah.
4. Sesi `ENDED` → tidak ada tombol aksi, daftar kehadiran tetap terlihat.
5. Double-tap tombol Buka/Tutup di modal → hanya satu transisi yang berlaku (guard reducer).
6. `sessionId` tidak valid → layar "Sesi tidak ditemukan".
7. Pencarian tanpa hasil → empty state pencarian, counter tetap total.
8. Status berubah di detail → kartu di daftar jadwal ikut berubah saat kembali.

---

## 10. UI Responsif

- Semua layout memakai Flexbox. Tidak ada ukuran/posisi absolut yang bergantung pada lebar layar tertentu.
- Padding horizontal 16 di semua layar.
- Konten utama dibatasi `maxWidth` (sekitar 720) dan dipusatkan; tombol primer `maxWidth: 480`. Tujuannya agar tidak melebar di tablet.
- Gunakan `react-native-safe-area-context` (`useSafeAreaInsets`) untuk padding bawah daftar.
- Teks panjang (nama praktikum, deskripsi) harus wrap atau terpotong rapi, tidak menimpa badge.
- Target tampilan: layar kecil (iPhone SE), standar (iPhone 15), tablet (iPad mini). Agentic tidak bisa menguji ukuran ini; cukup patuhi aturan di atas.

---

## 11. Aturan Kualitas Kode

- Buat hanya file di bagian 6. Tidak ada file, folder, atau dependency tambahan.
- Tidak ada dead code, props atau fungsi yang tidak terpakai, `console.log`, atau `TODO` kosong.
- Komentar hanya untuk logika yang tidak jelas dari kodenya (contoh: alasan guard transisi di reducer). Tidak ada komentar yang sekadar mengulang nama fungsi.
- Jangan membuat abstraksi sebelum ada minimal dua tempat yang memakainya.
- Satu komponen, satu tanggung jawab. Tidak ada komponen "wrapper" tanpa fungsi.
- Teks UI memakai Bahasa Indonesia yang singkat dan konsisten, tanpa kalimat promosi.
- Nilai warna, spacing, dan font diambil dari `theme.ts`, bukan ditulis berulang di tiap file.
- Tipe eksplisit untuk props dan nilai context. Tanpa `any`.
- Tidak membuat README, catatan, atau dokumen tambahan.

---

## 12. Verifikasi & Definition of Done

Yang **wajib dijalankan**:

- `npx tsc --noEmit` tanpa error.
- Lint (`npx expo lint`) bila skripnya tersedia.

Yang **tidak bisa diverifikasi agentic** (tidak ada simulator): skenario manual di bagian 13 dan tampilan di berbagai ukuran layar. Tandai sebagai "belum diverifikasi, perlu dicek programmer". **Dilarang menulis bahwa skenario tersebut lulus** bila tidak benar-benar dijalankan.

Checklist:

- [ ] Branch `Asisten` aktif, tidak ada operasi git write.
- [ ] Tidak ada file di luar `app/(asisten)/` dan `features/asisten/` yang berubah (cek `git status`).
- [ ] Tidak ada dependency baru.
- [ ] SRS-03: semua poin 5.1 terpenuhi.
- [ ] SRS-04: semua poin 5.2 terpenuhi.
- [ ] Delapan edge case di bagian 9 ditangani.
- [ ] `tsc` bersih.

---

## 13. Skenario Manual (dicek programmer di simulator)

| # | Aksi | Hasil yang diharapkan |
|---|---|---|
| T1 | Buka halaman jadwal | 4 sesi: 1 OPEN, 2 CLOSED, 1 ENDED, terurut tanggal |
| T2 | Tap sesi CLOSED (s-2) | Detail tampil, ada tombol "Buka Sesi", daftar kehadiran empty state "Buka sesi untuk memulai" |
| T3 | "Buka Sesi" → "Batal" | Modal tertutup, status tetap CLOSED |
| T4 | "Buka Sesi" → "Buka" | Badge jadi "Sedang Berlangsung", tombol jadi "Tutup Sesi", empty state berubah ke teks "Menunggu praktikan..." |
| T5 | Kembali ke jadwal | Kartu s-2 menunjukkan status OPEN |
| T6 | "Tutup Sesi" → "Batal" | Modal tertutup, status tetap OPEN |
| T7 | "Tutup Sesi" → "Tutup" | Badge "Sudah Ditutup", tombol diganti card "Sesi telah ditutup" |
| T8 | Tap sesi OPEN (s-1) | 2 baris kehadiran: Dewi 08:01:33 di atas Andi 08:04:50, counter "2 praktikan sudah hadir" |
| T9 | Tap sesi ENDED (s-4) | 3 baris terurut: Andi 08:02:14, Budi 08:05:41, Citra 08:19:07 (Terlambat), tanpa tombol aksi |
| T10 | Ketik "dewi" lalu "2230003" di kolom cari (s-4/s-1) | Daftar terfilter, counter tetap total |
| T11 | Ketik kata yang tidak ada | Empty state pencarian |
| T12 | Android: tombol back saat modal terbuka | Modal tertutup, tidak keluar layar |
| T13 | Buka `/sessions/xyz` | "Sesi tidak ditemukan" |

---

## 14. Catatan Integrasi (untuk tahap gabung, bukan untuk dikerjakan sekarang)

- Tipe, field, dan nilai status sudah disamakan dengan kontrak tim, jadi penggabungan tinggal memetakan store.
- Komponen di `features/asisten/components/` bersifat sementara terduplikasi dengan sisi praktikan. Dirapikan saat integrasi.
- Saat digabung, sinkronisasi sesi dan kehadiran dengan sisi praktikan cukup dengan mengganti sumber data di `AsistenContext.tsx`.

---

## 15. Urutan Kerja & Laporan Akhir

1. Cek repo (`git status`, `ls`), lalu `git checkout -b Asisten`.
2. Buat `types.ts`, `theme.ts`, `dummyData.ts`, `utils/format.ts`.
3. Buat `AsistenContext.tsx`.
4. Buat komponen di `features/asisten/components/`.
5. Buat `app/(asisten)/_layout.tsx`, `index.tsx`, dan `sessions/[sessionId].tsx`.
6. Jalankan `npx tsc --noEmit` (dan lint jika ada), perbaiki sampai bersih.
7. Cek `git status`: hanya `app/(asisten)/` dan `features/asisten/` yang berubah.

Laporan akhir singkat berisi: daftar file yang dibuat, hasil `tsc`/lint, cara membuka layar asisten (jika `/` tidak langsung mengarah ke sana), hal yang belum diverifikasi, dan kalimat berikut:

> Branch: `Asisten` — siap untuk direview & di-commit manual oleh programmer. Tidak ada commit/push otomatis yang dilakukan.
