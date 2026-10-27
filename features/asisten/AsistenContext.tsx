import React, { createContext, useContext, useReducer, useMemo, ReactNode } from 'react';
import { Assistant, Session, Attendance } from './types';
import { dummyAssistant, dummySessions, dummyAttendances } from './dummyData';

type Action =
  | { type: 'OPEN_SESSION'; id: string }
  | { type: 'CLOSE_SESSION'; id: string };

interface State {
  sessions: Session[];
}

function asistenReducer(state: State, action: Action): State {
  switch (action.type) {
    case 'OPEN_SESSION': {
      // Guard: Transisi hanya sah dari CLOSED -> OPEN (melindungi dari double-tap)
      const target = state.sessions.find((s) => s.id === action.id);
      if (!target || target.status !== 'CLOSED') {
        return state;
      }
      return {
        ...state,
        sessions: state.sessions.map((s) =>
          s.id === action.id ? { ...s, status: 'OPEN' as const } : s
        ),
      };
    }
    case 'CLOSE_SESSION': {
      // Guard: Transisi hanya sah dari OPEN -> ENDED (melindungi dari double-tap)
      const target = state.sessions.find((s) => s.id === action.id);
      if (!target || target.status !== 'OPEN') {
        return state;
      }
      return {
        ...state,
        sessions: state.sessions.map((s) =>
          s.id === action.id ? { ...s, status: 'ENDED' as const } : s
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
  openSession: (id: string) => void;
  closeSession: (id: string) => void;
}

const AsistenContext = createContext<AsistenContextValue | undefined>(undefined);

export function AsistenProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(asistenReducer, {
    sessions: dummySessions,
  });

  const assistant = dummyAssistant;

  const sortedSessions = useMemo(() => {
    return state.sessions
      .filter((s) => s.assistantId === assistant.id)
      .sort((a, b) => {
        const dateTimeA = `${a.date} ${a.startTime}`;
        const dateTimeB = `${b.date} ${b.startTime}`;
        return dateTimeA.localeCompare(dateTimeB);
      });
  }, [state.sessions, assistant.id]);

  const getSession = (id: string): Session | undefined => {
    return state.sessions.find((s) => s.id === id);
  };

  const getAttendances = (sessionId: string): Attendance[] => {
    return dummyAttendances
      .filter((att) => att.sessionId === sessionId)
      .sort((a, b) => a.checkedInAt.localeCompare(b.checkedInAt));
  };

  const openSession = (id: string) => {
    dispatch({ type: 'OPEN_SESSION', id });
  };

  const closeSession = (id: string) => {
    dispatch({ type: 'CLOSE_SESSION', id });
  };

  const value = {
    assistant,
    sessions: sortedSessions,
    getSession,
    getAttendances,
    openSession,
    closeSession,
  };

  return (
    <AsistenContext.Provider value={value}>
      {children}
    </AsistenContext.Provider>
  );
}

export function useAsisten(): AsistenContextValue {
  const context = useContext(AsistenContext);
  if (!context) {
    throw new Error('useAsisten harus digunakan di dalam AsistenProvider');
  }
  return context;
}
