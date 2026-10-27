export type SessionStatus = 'open' | 'upcoming' | 'closed';

export type PracticeSession = {
  id: string;
  courseName: string;
  className: string;
  dateLabel: string;
  timeRange: string;
  room: string;
  assistantName: string;
  status: SessionStatus;
};

export type Practitioner = {
  id: string;
  name: string;
  identifier: string;
};

export type AttendanceRecord = {
  id: string;
  sessionId: string;
  practitionerId: string;
  checkedInAt: number;
};

export type CheckInResult = 'success' | 'already-recorded' | 'session-unavailable';
