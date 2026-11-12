import type { PracticeSession } from './attendance';

export type CloudSession = PracticeSession & { participantIds: string[] };
export type SessionSummary = Pick<PracticeSession, 'courseName' | 'className' | 'dateLabel' | 'timeRange' | 'room' | 'assistantName'>;
export type CloudAttendance = {
  id: string;
  sessionId: string;
  practitionerId: string;
  checkedInAt: number | null;
  session: SessionSummary;
};
export type PermissionRequest = {
  id: string;
  sessionId: string;
  practitionerId: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: number | null;
  session: SessionSummary;
  ai: { status: 'pending' | 'success' | 'failed'; category?: string; error?: string };
  decisionNote?: string;
};
