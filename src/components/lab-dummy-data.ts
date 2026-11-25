// SEMENTARA: data praktikum contoh untuk popup lab, supaya tampilan SRS-24
// bisa dites sebelum jadwal dan sesi asli (dengan labId) tersedia.
// Kuncinya adalah id dokumen lab: 'lab-a' dan 'lab-b'.
// Nanti file ini dihapus dan diganti data sesi dari Firestore.

export type LabActivity = {
  name: string;
  className: string;
  time: string;
  status: string;
};

const DUMMY_ACTIVITIES: Record<
  string,
  { current: LabActivity | null; next: LabActivity | null }
> = {
  'lab-a': {
    current: {
      name: 'Praktikum Pemrograman Mobile',
      className: 'Kelas A',
      time: '08:00 - 10:00',
      status: 'Sedang berlangsung',
    },
    next: {
      name: 'Praktikum Pemrograman Mobile',
      className: 'Kelas B',
      time: '10:30 - 12:30',
      status: 'Terjadwal',
    },
  },
  'lab-b': {
    current: null,
    next: {
      name: 'Praktikum Basis Data',
      className: 'Kelas C',
      time: '13:00 - 15:00',
      status: 'Terjadwal',
    },
  },
};

export function getLabActivities(labId: string) {
  return DUMMY_ACTIVITIES[labId] ?? { current: null, next: null };
}
