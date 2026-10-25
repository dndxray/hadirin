import type { PracticeSession, Practitioner } from '@/types/attendance';

export const currentPractitioner: Practitioner = {
  id: 'praktikan-02',
  name: 'Caesar',
  identifier: 'Praktikan 02',
};

export const practiceSessions: PracticeSession[] = [
  {
    id: 'ppk-react-native-01',
    courseName: 'Pemrograman Perangkat Bergerak',
    className: 'TI-3A',
    dateLabel: 'Minggu, 25 Oktober 2026',
    timeRange: '13.00–15.00 WIB',
    room: 'Lab Mobile 2',
    assistantName: 'Fadhil',
    status: 'open',
  },
  {
    id: 'basis-data-06',
    courseName: 'Praktikum Basis Data',
    className: 'TI-3A',
    dateLabel: 'Senin, 19 Oktober 2026',
    timeRange: '09.30–11.30 WIB',
    room: 'Lab Komputasi 1',
    assistantName: 'Nadia',
    status: 'closed',
  },
  {
    id: 'jaringan-04',
    courseName: 'Praktikum Jaringan Komputer',
    className: 'TI-3A',
    dateLabel: 'Rabu, 28 Oktober 2026',
    timeRange: '10.00–12.00 WIB',
    room: 'Lab Jaringan',
    assistantName: 'Raka',
    status: 'upcoming',
  },
];
