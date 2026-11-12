import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  type Unsubscribe,
} from 'firebase/firestore';

import { db } from '@/lib/firebase';

export type Participant = { nim: string; name: string };

export type ClassInput = {
  name: string;
  course: string;
  room: string;
};

export type ClassData = ClassInput & {
  id: string;
  participants: Participant[];
};

const classesRef = collection(db, 'classes');

export function subscribeClasses(
  onData: (classes: ClassData[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    query(classesRef, orderBy('name')),
    (snap) =>
      onData(
        snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            name: data.name ?? '',
            course: data.course ?? '',
            room: data.room ?? '',
            participants: data.participants ?? [],
          };
        }),
      ),
    onError,
  );
}

export function createClass(input: ClassInput, uid: string) {
  return addDoc(classesRef, {
    ...input,
    participants: [],
    createdBy: uid,
    createdAt: serverTimestamp(),
  });
}

export function updateClass(id: string, input: ClassInput) {
  return updateDoc(doc(db, 'classes', id), { ...input });
}

export function removeClass(id: string) {
  return deleteDoc(doc(db, 'classes', id));
}

export function saveParticipants(id: string, participants: Participant[]) {
  return updateDoc(doc(db, 'classes', id), { participants });
}