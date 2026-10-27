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
  date: string;
  startTime: string;
  endTime: string;
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
  checkedInAt: string;
  status: 'PRESENT' | 'LATE';
}
