import {
  collection,
  onSnapshot,
  query,
  type DocumentData,
  type Unsubscribe,
} from 'firebase/firestore';

import { db } from '@/lib/firebase';
import type { Lab } from '@/types/lab';

export type LabsError = 'network' | 'denied' | 'unknown';

type SubscribeHandlers = {
  // fromServer = false berarti data masih dari cache lokal dan belum
  // dikonfirmasi server (misalnya saat koneksi terputus).
  onData: (labs: Lab[], fromServer: boolean) => void;
  onError: (reason: LabsError) => void;
};

function toLab(id: string, raw: DocumentData): Lab | null {
  const { name, latitude, longitude, radiusMeters } = raw;
  if (
    typeof name !== 'string' ||
    typeof latitude !== 'number' ||
    typeof longitude !== 'number' ||
    typeof radiusMeters !== 'number'
  ) {
    // Dokumen yang isinya tidak lengkap dilewati agar tidak merusak peta.
    return null;
  }
  return { id, name, latitude, longitude, radiusMeters };
}

// Mendengarkan perubahan daftar lab secara langsung (SRS-23, SRS-22).
export function subscribeLabs({ onData, onError }: SubscribeHandlers): Unsubscribe {
  return onSnapshot(
    query(collection(db, 'labs')),
    { includeMetadataChanges: true },
    (snapshot) => {
      const labs = snapshot.docs
        .map((d) => toLab(d.id, d.data()))
        .filter((lab): lab is Lab => lab !== null)
        .sort((a, b) => a.name.localeCompare(b.name));
      onData(labs, !snapshot.metadata.fromCache);
    },
    (error) => {
      if (error.code === 'permission-denied') onError('denied');
      else if (error.code === 'unavailable') onError('network');
      else onError('unknown');
    },
  );
}
