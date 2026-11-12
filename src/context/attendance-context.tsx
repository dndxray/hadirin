import { collection, onSnapshot, query, where, type Timestamp } from 'firebase/firestore';
import { createContext, type PropsWithChildren, useCallback, useContext, useEffect, useState } from 'react';

import { useAuth } from '@/context/auth-context';
import { db } from '@/lib/firebase';
import { recordParticipation } from '@/services/practitioner-service';
import type { CloudAttendance, CloudSession, PermissionRequest } from '@/types/practitioner';
import { firebaseErrorMessage } from '@/utils/firebase-error';

type Resource<T> = { data: T[]; loading: boolean; error: string | null; fromCache: boolean };
const initial = <T,>(): Resource<T> => ({ data: [], loading: true, error: null, fromCache: false });
const millis = (value: Timestamp | undefined) => value?.toMillis?.() ?? null;

function useOwnCollection<T>(name: string, uid: string | undefined, field: string, array: boolean) {
  const [state, setState] = useState<Resource<T> & { uid?: string }>(initial);
  useEffect(() => {
    if (!uid) return;
    const q = query(collection(db, name), where(field, array ? 'array-contains' : '==', uid));
    return onSnapshot(q, { includeMetadataChanges: true }, (snapshot) => {
      const data = snapshot.docs.map((document) => {
        const raw = document.data();
        return { ...raw, id: document.id,
          ...(name === 'attendance' ? { checkedInAt: millis(raw.checkedInAt) } : {}),
          ...(name === 'permissionRequests' ? { createdAt: millis(raw.createdAt) } : {}),
        } as T;
      });
      setState({ uid, data, loading: false, error: null, fromCache: snapshot.metadata.fromCache });
    }, (error) => setState({ uid, data: [], loading: false, error: firebaseErrorMessage(error), fromCache: false }));
  }, [name, uid, field, array]);
  return state.uid === uid && uid ? state : initial<T>();
}

type Value = {
  sessions: CloudSession[];
  records: CloudAttendance[];
  permissions: PermissionRequest[];
  sessionState: Resource<CloudSession>;
  attendanceState: Resource<CloudAttendance>;
  permissionState: Resource<PermissionRequest>;
  checkIn: (id: string) => Promise<string>;
  submitPermission: (id: string, reason: string) => Promise<string>;
  hasAttended: (id: string) => boolean;
  retry: () => void;
};
const Context = createContext<Value | null>(null);

export function AttendanceProvider({ children }: PropsWithChildren) {
  const { profile, firebaseUser } = useAuth();
  const uid = profile?.role === 'praktikan' && profile.uid === firebaseUser?.uid ? profile.uid : undefined;
  const [revision, setRevision] = useState(0);
  // Remount to clear stale account data and restart failed listeners.
  return <Subscriptions key={`${uid ?? 'signed-out'}-${revision}`} uid={uid} retry={() => setRevision((v) => v + 1)}>
    {children}
  </Subscriptions>;
}

function Subscriptions({ uid, retry, children }: PropsWithChildren<{ uid?: string; retry: () => void }>) {
  const sessionState = useOwnCollection<CloudSession>('sessions', uid, 'participantIds', true);
  const attendanceState = useOwnCollection<CloudAttendance>('attendance', uid, 'practitionerId', false);
  const permissionState = useOwnCollection<PermissionRequest>('permissionRequests', uid, 'practitionerId', false);
  const hasAttended = useCallback((id: string) => attendanceState.data.some((r) => r.sessionId === id), [attendanceState.data]);
  return <Context.Provider value={{
    sessions: sessionState.data, records: attendanceState.data, permissions: permissionState.data,
    sessionState, attendanceState, permissionState, hasAttended, retry,
    checkIn: (id) => recordParticipation(id),
    submitPermission: (id, reason) => recordParticipation(id, reason),
  }}>{children}</Context.Provider>;
}

export function useAttendance() {
  const context = useContext(Context);
  if (!context) throw new Error('useAttendance harus digunakan di dalam AttendanceProvider.');
  return context;
}
