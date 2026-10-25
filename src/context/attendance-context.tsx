import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';

import { currentPractitioner, practiceSessions } from '@/data/dummy-attendance';
import type { AttendanceRecord, CheckInResult } from '@/types/attendance';

type AttendanceContextValue = {
  records: AttendanceRecord[];
  checkIn: (sessionId: string) => CheckInResult;
  hasAttended: (sessionId: string) => boolean;
};

const AttendanceContext = createContext<AttendanceContextValue | null>(null);

export function AttendanceProvider({ children }: PropsWithChildren) {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const recordsRef = useRef<AttendanceRecord[]>([]);

  const hasAttended = useCallback(
    (sessionId: string) =>
    records.some(
      (record) =>
        record.sessionId === sessionId && record.practitionerId === currentPractitioner.id,
      ),
    [records],
  );

  const checkIn = useCallback((sessionId: string): CheckInResult => {
    const session = practiceSessions.find((item) => item.id === sessionId);

    if (!session || session.status !== 'open') {
      return 'session-unavailable';
    }

    const duplicate = recordsRef.current.some(
      (record) =>
        record.sessionId === sessionId && record.practitionerId === currentPractitioner.id,
    );

    if (duplicate) {
      return 'already-recorded';
    }

    const nextRecords = [
      ...recordsRef.current,
      {
        id: `${currentPractitioner.id}-${sessionId}`,
        sessionId,
        practitionerId: currentPractitioner.id,
        checkedInAt: Date.now(),
      },
    ];

    recordsRef.current = nextRecords;
    setRecords(nextRecords);

    return 'success';
  }, []);

  const value = useMemo(
    () => ({ records, checkIn, hasAttended }),
    [checkIn, hasAttended, records],
  );

  return <AttendanceContext.Provider value={value}>{children}</AttendanceContext.Provider>;
}

export function useAttendance() {
  const value = useContext(AttendanceContext);

  if (!value) {
    throw new Error('useAttendance harus digunakan di dalam AttendanceProvider.');
  }

  return value;
}
