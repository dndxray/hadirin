import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  where,
  writeBatch,
} from 'firebase/firestore';

import { db } from '@/lib/firebase';
import { validExpoPushToken } from '@/utils/notification-routing';

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

type Payload = { type: NotifType; title: string; body: string; sessionId?: string };

const PUSH_TYPE: Record<NotifType, string> = {
  sesi_dibuka: 'session_opened',
  jadwal_berubah: 'session_updated',
  izin_diterima: 'permission_decided',
  izin_ditolak: 'permission_decided',
};

type PushMessage = {
  to: string;
  title: string;
  body: string;
  sound: 'default';
  channelId: string;
  priority: 'high';
  data: Record<string, unknown>;
};

async function sendExpoPush(userIds: string[], payload: Payload) {
  const messages: PushMessage[] = [];

  await Promise.all(
    userIds.map(async (uid) => {
      try {
        const snap = await getDoc(doc(db, 'users', uid));
        const raw = snap.exists() ? snap.data().expoPushTokens : [];
        const tokens = Array.isArray(raw) ? raw.filter(validExpoPushToken) : [];
        for (const to of Array.from(new Set(tokens))) {
          messages.push({
            to,
            title: payload.title,
            body: payload.body,
            sound: 'default',
            channelId: 'praktikum',
            priority: 'high',
            data: {
              recipientId: uid,
              type: PUSH_TYPE[payload.type],
              sessionId: payload.sessionId ?? null,
            },
          });
        }
      } catch {}
    }),
  );

  for (let i = 0; i < messages.length; i += 100) {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(messages.slice(i, i + 100)),
    });
  }
}

export async function notifyUsers(userIds: string[], payload: Payload) {
  const targets = Array.from(new Set(userIds.filter(Boolean)));
  if (!targets.length) return;

  void sendExpoPush(targets, payload).catch(() => {});

  for (let i = 0; i < targets.length; i += 400) {
    const batch = writeBatch(db);
    targets.slice(i, i + 400).forEach((toUserId) => {
      batch.set(doc(collection(db, 'notifications')), {
        toUserId,
        ...payload,
        sessionId: payload.sessionId ?? '',
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