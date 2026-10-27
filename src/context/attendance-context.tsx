import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';

import { useApp } from '@/context/app-context';
import { initialAttendance, practiceSessions } from '@/data/dummy-attendance';
import type { AttendanceRecord, CheckInResult } from '@/types/attendance';

type AttendanceContextValue = {
  records: AttendanceRecord[];
  checkIn: (sessionId: string) => CheckInResult;
  hasAttended: (sessionId: string) => boolean;
};

const AttendanceContext = createContext<AttendanceContextValue | null>(null);

export function AttendanceProvider({ children }: PropsWithChildren) {
  const { currentUser } = useApp();
  const userId = currentUser?.id;

  const [records, setRecords] = useState<AttendanceRecord[]>(initialAttendance);
  const recordsRef = useRef<AttendanceRecord[]>(initialAttendance);

  const hasAttended = useCallback(
    (sessionId: string) =>
      records.some(
        (record) =>
          record.sessionId === sessionId && record.practitionerId === userId,
      ),
    [records, userId],
  );

  const checkIn = useCallback(
    (sessionId: string): CheckInResult => {
      if (!userId) {
        return 'session-unavailable';
      }

      const session = practiceSessions.find((item) => item.id === sessionId);

      if (!session || session.status !== 'open') {
        return 'session-unavailable';
      }

      const duplicate = recordsRef.current.some(
        (record) =>
          record.sessionId === sessionId && record.practitionerId === userId,
      );

      if (duplicate) {
        return 'already-recorded';
      }

      const nextRecords = [
        ...recordsRef.current,
        {
          id: `${userId}-${sessionId}`,
          sessionId,
          practitionerId: userId,
          checkedInAt: Date.now(),
        },
      ];

      recordsRef.current = nextRecords;
      setRecords(nextRecords);

      return 'success';
    },
    [userId],
  );

  const value = useMemo(
    () => ({ records, checkIn, hasAttended }),
    [checkIn, hasAttended, records],
  );

  return (
    <AttendanceContext.Provider value={value}>
      {children}
    </AttendanceContext.Provider>
  );
}

export function useAttendance() {
  const value = useContext(AttendanceContext);

  if (!value) {
    throw new Error('useAttendance harus digunakan di dalam AttendanceProvider.');
  }

  return value;
}