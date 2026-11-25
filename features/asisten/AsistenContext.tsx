import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
} from 'react';
import { useAuth } from '../../src/context/auth-context';
import { notifyUsers } from '../../src/services/notification-service';
import { Assistant, Attendance, isSessionOpen, isSessionUpcoming, Session } from './types';

import {
  createSession as createSessionService,
  deleteSession as deleteSessionService,
  processPendingPermissionAi,
  SessionInput,
  setSessionStatus,
  subscribeAssistantSessions,
  subscribePendingPermissionAiAutoProcessor,
  updateSession as updateSessionService,
} from '../../src/services/assistant-service';

type Action =
  | { type: 'SET_SESSIONS'; sessions: Session[] }
  | { type: 'CREATE_SESSION'; session: Session }
  | { type: 'UPDATE_SESSION'; id: string; input: Partial<SessionInput> }
  | { type: 'DELETE_SESSION'; id: string }
  | { type: 'OPEN_SESSION'; id: string }
  | { type: 'CLOSE_SESSION'; id: string };

interface State {
  sessions: Session[];
}

function asistenReducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_SESSIONS': {
      return {
        ...state,
        sessions: action.sessions,
      };
    }
    case 'CREATE_SESSION': {
      return {
        ...state,
        sessions: [action.session, ...state.sessions],
      };
    }
    case 'UPDATE_SESSION': {
      return {
        ...state,
        sessions: state.sessions.map((s) =>
          s.id === action.id
            ? {
                ...s,
                ...action.input,
                date:
                  typeof action.input.date === 'string'
                    ? action.input.date
                    : s.date,
                kelas: action.input.className ?? s.kelas,
                className: action.input.className ?? s.className,
              }
            : s
        ),
      };
    }
    case 'DELETE_SESSION': {
      return {
        ...state,
        sessions: state.sessions.filter((s) => s.id !== action.id),
      };
    }
    case 'OPEN_SESSION': {
      const target = state.sessions.find((s) => s.id === action.id);
      if (!target || !isSessionUpcoming(target.status)) {
        return state;
      }
      return {
        ...state,
        sessions: state.sessions.map((s) =>
          s.id === action.id ? { ...s, status: 'open' as const } : s
        ),
      };
    }
    case 'CLOSE_SESSION': {
      const target = state.sessions.find((s) => s.id === action.id);
      if (!target || !isSessionOpen(target.status)) {
        return state;
      }
      return {
        ...state,
        sessions: state.sessions.map((s) =>
          s.id === action.id ? { ...s, status: 'closed' as const } : s
        ),
      };
    }
    default:
      return state;
  }
}

interface AsistenContextValue {
  assistant: Assistant;
  sessions: Session[];
  getSession: (id: string) => Session | undefined;
  getAttendances: (sessionId: string) => Attendance[];
  createSession: (input: SessionInput) => Promise<string>;
  updateSession: (sessionId: string, input: Partial<SessionInput>) => Promise<void>;
  deleteSession: (sessionId: string) => Promise<void>;
  openSession: (id: string) => Promise<void>;
  closeSession: (id: string) => Promise<void>;
  loading: boolean;
  error: string | null;
}

const AsistenContext = createContext<AsistenContextValue | undefined>(undefined);

// Field yang dianggap "jadwal berubah" dan perlu diberitahukan ke praktikan.
// `date` (objek Date) sengaja tidak dibandingkan langsung karena selalu
// berbeda dari string tanggal di state; perubahan tanggal sudah tercermin di
// `dateLabel`. `labId` ikut karena lokasi presensi berpindah.
const SCHEDULE_FIELDS = ['dateLabel', 'startTime', 'endTime', 'timeRange', 'room', 'labId'] as const;

export function AsistenProvider({ children }: { children: ReactNode }) {
  const { profile, loading: authLoading } = useAuth();
  const isAsisten = profile?.role === 'asisten';

  const [state, dispatch] = useReducer(asistenReducer, { sessions: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const assistant = useMemo<Assistant>(
    () => ({
      id: profile?.uid ?? '',
      name: profile?.name ?? 'Asisten',
    }),
    [profile?.uid, profile?.name]
  );

  // Only assistants may list sessions; skip the listener for practitioners so
  // Firestore rules do not reject the query on every app start.
  useEffect(() => {
    if (authLoading || !isAsisten) {
      return;
    }

    const unsubscribe = subscribeAssistantSessions(
      (firestoreSessions) => {
        dispatch({ type: 'SET_SESSIONS', sessions: firestoreSessions });
        setLoading(false);
        setError(null);
      },
      () => {
        setError('Gagal memuat daftar sesi. Periksa koneksi Firestore Anda.');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [authLoading, isAsisten]);

  // SRS-14: classify pending/failed permission reasons as soon as an assistant is
  // signed in, without blocking the practitioner submission flow.
  useEffect(() => {
    if (!isAsisten) return;
    void processPendingPermissionAi();
    const unsubscribe = subscribePendingPermissionAiAutoProcessor();
    return () => unsubscribe();
  }, [isAsisten]);

  const sortedSessions = useMemo(() => {
    return [...state.sessions].sort((a, b) => {
      const dateTimeA = `${a.date ?? a.dateLabel ?? ''} ${a.startTime ?? a.timeRange ?? ''}`;
      const dateTimeB = `${b.date ?? b.dateLabel ?? ''} ${b.startTime ?? b.timeRange ?? ''}`;
      return dateTimeA.localeCompare(dateTimeB);
    });
  }, [state.sessions]);

  const getSession = (id: string): Session | undefined => {
    return state.sessions.find((s) => s.id === id);
  };

  const getAttendances = (_sessionId: string): Attendance[] => {
    return [];
  };

  const createSession = async (input: SessionInput): Promise<string> => {
    const newId = await createSessionService(input, assistant.name);
    const created: Session = {
      id: newId,
      courseName: input.courseName,
      courseCode: input.courseCode || '',
      kelas: input.className,
      className: input.className,
      date: typeof input.date === 'string' ? input.date : (input.dateLabel ?? ''),
      startTime: input.startTime || '',
      endTime: input.endTime || '',
      dateLabel: input.dateLabel,
      timeRange: input.timeRange,
      room: input.room,
      labId: input.labId,
      radiusM: input.labId ? (input.radiusM ?? 50) : undefined,
      assistantId: assistant.id,
      assistantName: assistant.name,
      status: 'upcoming',
      description: input.description,
      participantIds: input.participantIds || [],
    };
    dispatch({ type: 'CREATE_SESSION', session: created });
    setError(null);
    return newId;
  };

  const updateSession = async (
    sessionId: string,
    input: Partial<SessionInput>
  ): Promise<void> => {
    const before = state.sessions.find((s) => s.id === sessionId);
    await updateSessionService(sessionId, input);
    dispatch({ type: 'UPDATE_SESSION', id: sessionId, input });
    setError(null);

    const scheduleChanged = SCHEDULE_FIELDS.some(
      (k) => k in input && (input as any)[k] !== (before as any)?.[k]
    );
    if (scheduleChanged && before?.participantIds?.length) {
      void notifyUsers(before.participantIds, {
        type: 'jadwal_berubah',
        title: 'Jadwal berubah',
        body: `Jadwal ${before.courseName} (${before.className ?? before.kelas}) diperbarui.`,
        sessionId,
      }).catch(() => {});
    }
  };

  const deleteSession = async (sessionId: string): Promise<void> => {
    await deleteSessionService(sessionId);
    dispatch({ type: 'DELETE_SESSION', id: sessionId });
    setError(null);
  };

  const openSession = async (id: string): Promise<void> => {
    const target = state.sessions.find((s) => s.id === id);
    await setSessionStatus(id, 'open');
    dispatch({ type: 'OPEN_SESSION', id });
    setError(null);

    if (target?.participantIds?.length) {
      void notifyUsers(target.participantIds, {
        type: 'sesi_dibuka',
        title: 'Sesi dibuka',
        body: `Presensi ${target.courseName} (${target.className ?? target.kelas}) sudah bisa dilakukan.`,
        sessionId: id,
      }).catch(() => {});
    }
  };

  const closeSession = async (id: string): Promise<void> => {
    await setSessionStatus(id, 'closed');
    dispatch({ type: 'CLOSE_SESSION', id });
    setError(null);
  };

  const value = {
    assistant,
    sessions: isAsisten ? sortedSessions : [],
    getSession,
    getAttendances,
    createSession,
    updateSession,
    deleteSession,
    openSession,
    closeSession,
    loading: isAsisten ? (authLoading || loading) : false,
    error: isAsisten ? error : null,
  };

  return (
    <AsistenContext.Provider value={value}>{children}</AsistenContext.Provider>
  );
}

export function useAsisten(): AsistenContextValue {
  const context = useContext(AsistenContext);
  if (!context) {
    throw new Error('useAsisten must be used within an AsistenProvider');
  }
  return context;
}