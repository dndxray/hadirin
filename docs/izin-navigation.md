# Koreksi navigasi izin

Acuan pemulihan: commit `14d5c4c`, sebelum perubahan alur pada branch Caesar.

- Home kembali memakai koleksi `classes`, tampilan, dan alur baseline.
- Detail kembali memakai dokumen kelas, Mulai/Selesai, nama asisten, status, dan modal baseline. Hanya ditambah tombol **Ajukan Izin** untuk praktikan.
- Riwayat kembali memakai ringkasan persentase, Total Hadir, dan susunan baseline. Penyesuaian TypeScript hanya menyaring timestamp null; tampilan serta sumber datanya tidak diganti.
- Tab bawah **Izin** dihapus. Form lama dipindahkan dari route tab ke route stack `/izin`, ditambah tombol kembali. Query, validasi, dan penyimpanan form tidak diubah.
- Tidak ada perubahan env, Security Rules, service Firebase, atau worker AI. Pemulihan ini bukan perbaikan integrasi presensi/izin produksi di luar baseline.

Uji regresi lokal: jalankan emulator Auth/Firestore project `demo-hadirin`, Expo web port 8097 dengan env emulator, lalu `node tests/seed-restored-navigation.mjs` dan `python tests/restored-navigation-ui.py`. Seed menghapus data emulator demo dan sengaja menolak pembacaan sesi; tidak mengakses project tim. Jalankan terpisah dari pengujian rules/fixture lain. Screenshot lokal tidak di-commit.
