import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  onSnapshot,
  query,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';

import { db } from '@/lib/firebase';
import type { Lab } from '@/types/sprint-three';
import { readLab } from '@/utils/attendance-location';

import type { LabInput } from './lab-validation';

type SubscribeHandlers = {
  // fromServer = false berarti data masih dari cache lokal dan belum
  // dikonfirmasi server (misalnya saat koneksi terputus).
  onData: (labs: Lab[], fromServer: boolean) => void;
  onError: (error: unknown) => void;
};

// Mendengarkan perubahan daftar lab secara langsung.
export function subscribeLabs({ onData, onError }: SubscribeHandlers): Unsubscribe {
  return onSnapshot(
    query(collection(db, 'labs')),
    { includeMetadataChanges: true },
    (snapshot) => {
      const labs: Lab[] = [];
      snapshot.docs.forEach((d) => {
        try {
          labs.push(readLab(d.id, d.data()));
        } catch {
          // Dokumen yang isinya tidak lengkap atau tidak valid dilewati.
        }
      });
      labs.sort((a, b) => a.name.localeCompare(b.name));
      onData(labs, !snapshot.metadata.fromCache);
    },
    onError,
  );
}

function toPayload(input: LabInput) {
  return {
    name: input.name,
    latitude: input.latitude,
    longitude: input.longitude,
    radiusMeters: input.radiusMeters,
  };
}

// Menambah lab baru. Mengembalikan id dokumen yang dibuat.
export async function createLab(input: LabInput): Promise<string> {
  const ref = await addDoc(collection(db, 'labs'), toPayload(input));
  return ref.id;
}

export async function updateLab(id: string, input: LabInput): Promise<void> {
  await updateDoc(doc(db, 'labs', id), toPayload(input));
}

export async function deleteLab(id: string): Promise<void> {
  await deleteDoc(doc(db, 'labs', id));
}

// Lab yang masih dipakai sesi tidak boleh dihapus, karena presensi sesi itu
// membaca lab tersebut untuk memeriksa radius.
export async function isLabInUse(id: string): Promise<boolean> {
  const snapshot = await getDocs(
    query(collection(db, 'sessions'), where('labId', '==', id), limit(1)),
  );
  return !snapshot.empty;
}
