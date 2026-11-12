import { Assistant, Session, Attendance } from './types';

export const dummyAssistant: Assistant = {
  id: 'u-asisten-1',
  name: 'Fadhil',
};

export const dummySessions: Session[] = [
  {
    id: 'ppk-react-native-01',
    courseName: 'Pemrograman Perangkat Bergerak',
    courseCode: 'IF184052',
    kelas: 'TI-3A',
    date: '2026-10-25',
    startTime: '13:00',
    endTime: '15:00',
    room: 'Lab Mobile 2',
    assistantId: 'u-asisten-1',
    status: 'OPEN',
    description: 'Praktikum React Native',
  },
  {
    id: 'basis-data-06',
    courseName: 'Praktikum Basis Data',
    courseCode: 'IF184031',
    kelas: 'TI-3A',
    date: '2026-10-19',
    startTime: '09:30',
    endTime: '11:30',
    room: 'Lab Komputasi 1',
    assistantId: 'u-asisten-1',
    status: 'ENDED',
    description: 'Praktikum 6: Join dan Subquery',
  },
  {
    id: 'jaringan-04',
    courseName: 'Praktikum Jaringan Komputer',
    courseCode: 'IF184060',
    kelas: 'TI-3A',
    date: '2026-10-28',
    startTime: '10:00',
    endTime: '12:00',
    room: 'Lab Jaringan',
    assistantId: 'u-asisten-1',
    status: 'CLOSED',
    description: 'Praktikum 4: Konfigurasi Router',
  },
];

export const dummyAttendances: Attendance[] = [
  {
    id: 'att-1',
    sessionId: 'ppk-react-native-01',
    practitionerId: 'u-4',
    practitionerName: 'Dewi Lestari',
    practitionerNim: '2230004',
    checkedInAt: '2026-10-25T13:01:33',
    status: 'PRESENT',
  },
  {
    id: 'att-2',
    sessionId: 'ppk-react-native-01',
    practitionerId: 'u-1',
    practitionerName: 'Andi Pratama',
    practitionerNim: '2230001',
    checkedInAt: '2026-10-25T13:04:50',
    status: 'PRESENT',
  },
  {
    id: 'att-3',
    sessionId: 'basis-data-06',
    practitionerId: 'u-1',
    practitionerName: 'Andi Pratama',
    practitionerNim: '2230001',
    checkedInAt: '2026-10-19T09:32:14',
    status: 'PRESENT',
  },
  {
    id: 'att-4',
    sessionId: 'basis-data-06',
    practitionerId: 'u-2',
    practitionerName: 'Budi Santoso',
    practitionerNim: '2230002',
    checkedInAt: '2026-10-19T09:35:41',
    status: 'PRESENT',
  },
  {
    id: 'att-5',
    sessionId: 'basis-data-06',
    practitionerId: 'u-3',
    practitionerName: 'Citra Maharani',
    practitionerNim: '2230003',
    checkedInAt: '2026-10-19T09:49:07',
    status: 'LATE',
  },
];

export const dummyRoster: { nim: string; name: string }[] = [
  { nim: '2230001', name: 'Andi Pratama' },
  { nim: '2230002', name: 'Budi Santoso' },
  { nim: '2230003', name: 'Citra Maharani' },
  { nim: '2230004', name: 'Dewi Lestari' },
  { nim: '2230005', name: 'Eko Prasetyo' },
  { nim: '2230006', name: 'Fitri Handayani' },
];