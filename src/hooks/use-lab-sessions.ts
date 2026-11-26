import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';

import { db } from '@/lib/firebase';
import { firebaseErrorMessage } from '@/utils/firebase-error';

// Tipe data disesuaikan sama isi collection 'classes' lu
export type ClassSchedule = {
  id: string;
  course: string;
  name: string;
  room: string;
  participants?: any;
};

type SessionsState = {
  sessions: ClassSchedule[];
  loading: boolean;
  error: string | null;
};

export function useLabSessions(labName?: string | null) {
  const [state, setState] = useState<SessionsState>({ sessions: [], loading: false, error: null });
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (!labName) return;

    const loadingTimer = setTimeout(() => {
      setState(prev => ({ ...prev, loading: true }));
    }, 0);
    
    // KUNCINYA DI SINI: Tembak ke collection 'classes', cocokin field 'room'
    const classesRef = collection(db, 'classes');
    const q = query(classesRef, where('room', '==', labName));

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        clearTimeout(loadingTimer);
        try {
          const data = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as ClassSchedule[];
          
          setState({ sessions: data, loading: false, error: null });
        } catch (error) {
          setState({ sessions: [], loading: false, error: (error as Error).message });
        }
      }, 
      (error) => {
        clearTimeout(loadingTimer);
        setState({ 
          sessions: [], 
          loading: false,
          error: error.code === 'permission-denied'
            ? 'Akses data kelas ditolak. Periksa Rules Firestore.'
            : `Gagal memuat kelas. ${firebaseErrorMessage(error)}` 
        });
      }
    );

    return () => {
      clearTimeout(loadingTimer);
      unsubscribe();
    };
  }, [labName, revision]);

  const retry = () => setRevision(v => v + 1);
  if (!labName) {
    return { sessions: [], loading: false, error: null, retry };
  }

  return { ...state, retry };
}