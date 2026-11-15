export type SessionStatus = 'upcoming' | 'open' | 'closed' | 'CLOSED' | 'OPEN' | 'ENDED';

export function isSessionUpcoming(status: SessionStatus): boolean {
  return status === 'upcoming' || status === 'CLOSED';
}

export function isSessionOpen(status: SessionStatus): boolean {
  return status === 'open' || status === 'OPEN';
}

export function isSessionClosed(status: SessionStatus): boolean {
  return status === 'closed' || status === 'ENDED';
}

export interface Assistant {
  id: string;
  name: string;
}

export interface Session {
  id: string;
  courseName: string;
  courseCode?: string;
  kelas: string;
  className?: string;
  date: string;        // 'YYYY-MM-DD'
  dateLabel?: string;   // 'Kamis, 12 November 2026'
  startTime: string;   // 'HH:mm'
  endTime: string;     // 'HH:mm'
  timeRange?: string;   // '13.00–15.00 WIB'
  room: string;
  assistantId?: string;
  assistantName?: string;
  status: SessionStatus;
  description?: string;
  participantIds?: string[];
}

export interface Attendance {
  id: string;
  sessionId: string;
  practitionerId: string;
  practitionerName: string;
  practitionerNim: string;
  checkedInAt: string | number;
  status: 'PRESENT' | 'LATE';
}

export interface PermissionRequestItem {
  id: string;
  sessionId: string;
  practitionerId: string;
  practitionerName: string;
  practitionerNim: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string | number;
  session?: {
    courseName?: string;
    className?: string;
    dateLabel?: string;
    timeRange?: string;
    room?: string;
    assistantName?: string;
  };
  ai: {
    status: 'pending' | 'success' | 'failed';
    category?: string;
    error?: string;
  };
  decisionNote?: string;
  decidedBy?: string;
  decidedAt?: string | number;
}
