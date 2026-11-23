import { doc, onSnapshot } from 'firebase/firestore';
import { useEffect, useState } from 'react';

import { db } from '@/lib/firebase';
import type { Lab } from '@/types/sprint-three';
import { isDocumentId, readLab } from '@/utils/attendance-location';
import { firebaseErrorMessage } from '@/utils/firebase-error';

type LabState = { id?: string; lab: Lab | null; loading: boolean; error: string | null; fromCache: boolean };

export function useSessionLab(id?: string) {
  const [state, setState] = useState<LabState>({ lab: null, loading: true, error: null, fromCache: false });
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (!isDocumentId(id)) return;
    return onSnapshot(doc(db, 'labs', id), { includeMetadataChanges: true }, (snapshot) => {
      try {
        if (!snapshot.exists()) throw new Error('Laboratorium sesi tidak ditemukan. Hubungi asisten.');
        setState({ id, lab: readLab(id, snapshot.data()), loading: false, error: null, fromCache: snapshot.metadata.fromCache });
      } catch (error) {
        setState({ id, lab: null, loading: false, error: (error as Error).message, fromCache: false });
      }
    }, (error) => setState({ id, lab: null, loading: false,
      error: error.code === 'permission-denied'
        ? 'Akses laboratorium ditolak. Minta PM memeriksa Rules lab Sprint 3 pada project Firebase aplikasi.'
        : `Gagal memuat laboratorium. ${firebaseErrorMessage(error)}`, fromCache: false }));
  }, [id, revision]);
  const current: LabState = !isDocumentId(id)
    ? { lab: null, loading: false, error: 'Laboratorium sesi belum diatur. Hubungi asisten.', fromCache: false }
    : state.id === id ? state : { lab: null, loading: true, error: null, fromCache: false };
  return { ...current, retry: () => setRevision(value => value + 1) };
}
