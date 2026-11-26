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
  const [state, setState] = useState<SessionsState>({ sessions: [], loading: true, error: null });
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (!labName) {
      setState({ sessions: [], loading: false, error: null });
      return;
    }

    setState(prev => ({ ...prev, loading: true }));
    
    // KUNCINYA DI SINI: Tembak ke collection 'classes', cocokin field 'room'
    const classesRef = collection(db, 'classes');
    const q = query(classesRef, where('room', '==', labName));

    return onSnapshot(q, 
      (snapshot) => {
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
        setState({ 
          sessions: [], 
          loading: false,
          error: error.code === 'permission-denied'
            ? 'Akses data kelas ditolak. Periksa Rules Firestore.'
            : `Gagal memuat kelas. ${firebaseErrorMessage(error)}` 
        });
      }
    );
  }, [labName, revision]);

  return { ...state, retry: () => setRevision(v => v + 1) };
}