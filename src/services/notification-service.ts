import { db } from '@/lib/firebase';
import {
    collection,
    doc,
    onSnapshot,
    query,
    where,
    writeBatch,
} from 'firebase/firestore';

export type NotifType = 'sesi_dibuka' | 'jadwal_berubah' | 'izin_diterima' | 'izin_ditolak';

export type AppNotification = {
  id: string;
  toUserId: string;
  type: NotifType;
  title: string;
  body: string;
  sessionId?: string;
  createdAt: number;
  read: boolean;
};

export async function notifyUsers(
  userIds: string[],
  payload: { type: NotifType; title: string; body: string; sessionId?: string },
) {
  const targets = Array.from(new Set(userIds.filter(Boolean)));
  for (let i = 0; i < targets.length; i += 400) {
    const batch = writeBatch(db);
    targets.slice(i, i + 400).forEach((toUserId) => {
      const ref = doc(collection(db, 'notifications'));
      batch.set(ref, {
        toUserId,
        ...payload,
        createdAt: Date.now(),
        read: false,
      });
    });
    await batch.commit();
  }
}

export function subscribeMyNotifications(
  uid: string,
  onData: (items: AppNotification[]) => void,
  onError?: (e: Error) => void,
) {
  const q = query(collection(db, 'notifications'), where('toUserId', '==', uid));
  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs
        .map((d) => ({ id: d.id, ...(d.data() as Omit<AppNotification, 'id'>) }))
        .sort((a, b) => b.createdAt - a.createdAt);
      onData(items);
    },
    (e) => onError?.(e),
  );
}

export async function markNotificationRead(id: string) {
  const batch = writeBatch(db);
  batch.update(doc(db, 'notifications', id), { read: true });
  await batch.commit();
}