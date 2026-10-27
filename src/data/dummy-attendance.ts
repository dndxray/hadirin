import type {
  AppUser,
  AttendanceRecord,
  PracticeSession,
  Role,
} from '@/types/attendance';

// Identitas default per peran
export const DUMMY_USERS: Record<Role, AppUser> = {
  praktikan: {
    id: 'P001',
    name: 'Caesar',
    identifier: 'Praktikan 01',
    role: 'praktikan',
  },
  asisten: {
    id: 'A001',
    name: 'Kak Rina',
    identifier: 'Asisten 01',
    role: 'asisten',
  },
};

// Praktikan lain: bisa dipilih saat login dan mengisi rekap asisten
export const otherPractitioners: AppUser[] = [
  {
    id: 'P002',
    name: 'Dewi Lestari',
    identifier: 'Praktikan 02',
    role: 'praktikan',
  },
  {
    id: 'P003',
    name: 'Andi Pratama',
    identifier: 'Praktikan 03',
    role: 'praktikan',
  },
];

export const allPractitioners: AppUser[] = [
  DUMMY_USERS.praktikan,
  ...otherPractitioners,
];

export function findPractitioner(id: string) {
  return allPractitioners.find((p) => p.id === id);
}

// Asisten lain, supaya ada yang bisa dipilih saat login
export const otherAssistants: AppUser[] = [
  {
    id: 'A002',
    name: 'Kak Bima',
    identifier: 'Asisten 02',
    role: 'asisten',
  },
];

export const allAssistants: AppUser[] = [
  DUMMY_USERS.asisten,
  ...otherAssistants,
];

// Daftar identitas yang bisa dipilih di layar Pilih Identitas
export const usersByRole: Record<Role, AppUser[]> = {
  praktikan: allPractitioners,
  asisten: allAssistants,
};

export const practiceSessions: PracticeSession[] = [
  {
    id: 'ppk-react-native-01',
    courseName: 'Pemrograman Perangkat Bergerak',
    className: 'TI-3A',
    dateLabel: 'Minggu, 25 Oktober 2026',
    timeRange: '13.00–15.00 WIB',
    room: 'Lab Mobile 2',
    assistantName: DUMMY_USERS.asisten.name,
    status: 'open',
  },
  {
    id: 'basis-data-06',
    courseName: 'Praktikum Basis Data',
    className: 'TI-3A',
    dateLabel: 'Senin, 19 Oktober 2026',
    timeRange: '09.30–11.30 WIB',
    room: 'Lab Komputasi 1',
    assistantName: DUMMY_USERS.asisten.name,
    status: 'closed',
  },
  {
    id: 'jaringan-04',
    courseName: 'Praktikum Jaringan Komputer',
    className: 'TI-3A',
    dateLabel: 'Rabu, 28 Oktober 2026',
    timeRange: '10.00–12.00 WIB',
    room: 'Lab Jaringan',
    assistantName: DUMMY_USERS.asisten.name,
    status: 'upcoming',
  },
];

export const initialAttendance: AttendanceRecord[] = [
  {
    id: 'att-1',
    sessionId: 'basis-data-06',
    practitionerId: 'P001',
    checkedInAt: Date.parse('2026-10-19T09:40:00+07:00'),
  },
  {
    id: 'att-2',
    sessionId: 'basis-data-06',
    practitionerId: 'P002',
    checkedInAt: Date.parse('2026-10-19T09:35:00+07:00'),
  },
  {
    id: 'att-3',
    sessionId: 'basis-data-06',
    practitionerId: 'P003',
    checkedInAt: Date.parse('2026-10-19T09:45:00+07:00'),
  },
];