import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';

import { auth, db } from '@/lib/firebase';
import type {
  Attendance,
  PermissionRequestItem,
  Session,
  SessionStatus,
} from '../../features/asisten/types';
import { isSessionClosed, isSessionOpen, isSessionUpcoming } from '../../features/asisten/types';
import { classifyReason } from './ai/classifier';
import { normalizeNim } from '@/utils/nim';

export type SessionInput = {
  courseName: string;
  courseCode?: string;
  className: string;
  dateLabel: string;
  timeRange: string;
  room: string;
  description?: string;
  participantIds?: string[];
};

// In-memory cache for user profile resolution (UID -> { name, nim })
const userProfileCache = new Map<string, { name: string; nim: string }>();
const aiInFlight = new Set<string>();

export async function resolvePractitionerProfile(
  uid: string
): Promise<{ name: string; nim: string }> {
  if (userProfileCache.has(uid)) {
    return userProfileCache.get(uid)!;
  }

  if (!db) {
    const fallback = { name: `Praktikan (${uid.slice(0, 5)})`, nim: uid.slice(0, 8) };
    userProfileCache.set(uid, fallback);
    return fallback;
  }

  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
      const data = userDoc.data();
      const name = data.name || 'Praktikan';
      const nim = data.nim || 'Belum diisi';

      const profile = { name, nim };
      if (data.nim) userProfileCache.set(uid, profile);
      return profile;
    }
  } catch {
    // Fallback if unable to read user profile
  }

  const defaultProfile = { name: 'Praktikan', nim: uid.slice(0, 8) };
  userProfileCache.set(uid, defaultProfile);
  return defaultProfile;
}

export type ClassParticipant = { nim: string; name: string };

export type ParticipantMapping = {
  uids: string[];
  unmatched: ClassParticipant[];
};

// Classes store {nim, name}; sessions require Firebase UIDs. Match by explicit
// NIM only. Name/email fallbacks can enroll the wrong account, and duplicate
// NIMs must be resolved by the operator rather than choosing the first account.
export async function resolveParticipantUids(
  participants: ClassParticipant[]
): Promise<ParticipantMapping> {
  if (participants.length === 0) {
    return { uids: [], unmatched: [] };
  }

  if (!db) {
    return { uids: [], unmatched: participants };
  }

  try {
    const snapshot = await getDocs(collection(db, 'users'));
    const directory = snapshot.docs.map((document) => {
      const data = document.data();
      return {
        uid: document.id,
        name: String(data.name ?? '').trim(),
        nim: String(data.nim ?? '').trim(),
        email: String(data.email ?? '').trim(),
        role: data.role,
      };
    });

    const uids = new Set<string>();
    const unmatched: ClassParticipant[] = [];

    for (const participant of participants) {
      const nim = normalizeNim(participant.nim);
      const matches = directory.filter((user) => user.role === 'praktikan' && !!user.nim && normalizeNim(user.nim) === nim);

      if (matches.length === 1) {
        uids.add(matches[0].uid);
      } else {
        unmatched.push(participant);
      }
    }

    return { uids: Array.from(uids), unmatched };
  } catch {
    return { uids: [], unmatched: participants };
  }
}

export async function createSession(
  input: SessionInput,
  assistantName: string = 'Asisten'
): Promise<string> {
  const user = auth?.currentUser;
  if (!user || !db) {
    throw new Error('Autentikasi Firebase diperlukan untuk membuat sesi.');
  }

  const docRef = await addDoc(collection(db, 'sessions'), {
    courseName: input.courseName.trim(),
    courseCode: input.courseCode?.trim() || '',
    className: input.className.trim(),
    dateLabel: input.dateLabel.trim(),
    timeRange: input.timeRange.trim(),
    room: input.room.trim(),
    description: input.description?.trim() || '',
    assistantName: assistantName || 'Asisten',
    assistantId: user.uid,
    status: 'upcoming',
    participantIds: input.participantIds || [],
    createdAt: serverTimestamp(),
  });

  return docRef.id;
}

export async function updateSession(
  sessionId: string,
  input: Partial<SessionInput>
): Promise<void> {
  const user = auth?.currentUser;
  if (!user || !db) {
    throw new Error('Autentikasi Firebase diperlukan untuk mengubah sesi.');
  }

  const sessionRef = doc(db, 'sessions', sessionId);
  const snap = await getDoc(sessionRef);

  if (!snap.exists()) {
    throw new Error('Sesi praktikum tidak ditemukan.');
  }

  const updatePayload: Record<string, any> = {
    updatedAt: serverTimestamp(),
  };

  if (input.courseName !== undefined) updatePayload.courseName = input.courseName.trim();
  if (input.courseCode !== undefined) updatePayload.courseCode = input.courseCode.trim();
  if (input.className !== undefined) updatePayload.className = input.className.trim();
  if (input.dateLabel !== undefined) updatePayload.dateLabel = input.dateLabel.trim();
  if (input.timeRange !== undefined) updatePayload.timeRange = input.timeRange.trim();
  if (input.room !== undefined) updatePayload.room = input.room.trim();
  if (input.description !== undefined) updatePayload.description = input.description.trim();
  if (input.participantIds !== undefined) updatePayload.participantIds = input.participantIds;

  await updateDoc(sessionRef, updatePayload);
}

export async function deleteSession(sessionId: string): Promise<void> {
  const user = auth?.currentUser;
  if (!user || !db) {
    throw new Error('Autentikasi Firebase diperlukan untuk menghapus sesi.');
  }

  const sessionRef = doc(db, 'sessions', sessionId);
  await deleteDoc(sessionRef);
}

export async function setSessionStatus(
  sessionId: string,
  newStatus: 'open' | 'closed'
): Promise<void> {
  const user = auth?.currentUser;
  if (!user || !db) {
    throw new Error('Autentikasi Firebase diperlukan untuk mengubah status sesi.');
  }

  const sessionRef = doc(db, 'sessions', sessionId);
  const snap = await getDoc(sessionRef);

  if (!snap.exists()) {
    throw new Error('Sesi praktikum tidak ditemukan di server.');
  }

  const currentData = snap.data();
  const currentStatus = currentData.status as SessionStatus;

  // Guard: Sesi yang sudah ditutup tidak boleh diaktifkan kembali
  if (isSessionClosed(currentStatus)) {
    throw new Error('Sesi praktikum telah ditutup dan tidak dapat dibuka kembali.');
  }

  // Guard: Hanya boleh buka jika status saat ini belum dibuka / upcoming
  if (newStatus === 'open' && !isSessionUpcoming(currentStatus)) {
    throw new Error('Hanya sesi yang belum dibuka yang dapat diaktifkan.');
  }

  // Guard: Hanya boleh tutup jika status saat ini sedang open
  if (newStatus === 'closed' && !isSessionOpen(currentStatus)) {
    throw new Error('Hanya sesi yang sedang aktif yang dapat ditutup.');
  }

  await updateDoc(sessionRef, {
    status: newStatus,
  });
}

export function subscribeAssistantSessions(
  onData: (sessions: Session[]) => void,
  onError: (error: Error) => void
): Unsubscribe {
  if (!db) {
    return () => {};
  }

  const q = query(collection(db, 'sessions'));

  return onSnapshot(
    q,
    (snapshot: any) => {
      const items: Session[] = snapshot.docs.map((d: any) => {
        const raw = d.data();
        return {
          id: d.id,
          courseName: raw.courseName ?? '',
          courseCode: raw.courseCode ?? '',
          kelas: raw.className ?? raw.kelas ?? '',
          className: raw.className ?? raw.kelas ?? '',
          date: raw.date ?? '',
          dateLabel: raw.dateLabel ?? raw.date ?? '',
          startTime: raw.startTime ?? '',
          endTime: raw.endTime ?? '',
          timeRange: raw.timeRange ?? `${raw.startTime ?? ''} - ${raw.endTime ?? ''}`,
          room: raw.room ?? '',
          assistantId: raw.assistantId ?? '',
          assistantName: raw.assistantName ?? '',
          status: (raw.status as SessionStatus) ?? 'upcoming',
          description: raw.description,
          participantIds: raw.participantIds ?? [],
        };
      });

      onData(items);
    },
    onError
  );
}

export function subscribeSessionAttendances(
  sessionId: string,
  onData: (attendances: Attendance[]) => void,
  onError: (error: Error) => void
): Unsubscribe {
  if (!db) {
    return () => {};
  }

  const q = query(collection(db, 'attendance'), where('sessionId', '==', sessionId));

  return onSnapshot(
    q,
    async (snapshot: any) => {
      const records = snapshot.docs.map((d: any) => {
        const raw = d.data();
        const checkedInAt = raw.checkedInAt?.toMillis?.() ?? raw.checkedInAt ?? Date.now();
        return {
          id: d.id,
          sessionId: raw.sessionId ?? sessionId,
          practitionerId: raw.practitionerId ?? '',
          practitionerName: raw.practitionerName || '',
          practitionerNim: raw.practitionerNim || '',
          checkedInAt,
          status: 'PRESENT' as const,
        };
      });

      // Enrich profiles asynchronously
      const enriched: Attendance[] = await Promise.all(
        records.map(async (rec: any) => {
          if (rec.practitionerName && rec.practitionerNim) {
            return rec;
          }
          const profile = await resolvePractitionerProfile(rec.practitionerId);
          return {
            ...rec,
            practitionerName: rec.practitionerName || profile.name,
            practitionerNim: rec.practitionerNim || profile.nim,
          };
        })
      );

      // Sort ascending by check-in time (SRS-04 requirement)
      enriched.sort((a, b) => {
        const timeA = typeof a.checkedInAt === 'number' ? a.checkedInAt : new Date(a.checkedInAt).getTime();
        const timeB = typeof b.checkedInAt === 'number' ? b.checkedInAt : new Date(b.checkedInAt).getTime();
        return timeA - timeB;
      });

      onData(enriched);
    },
    onError
  );
}

export function subscribePermissionRequests(
  onData: (permissions: import('../../features/asisten/types').PermissionRequestItem[]) => void,
  onError: (error: Error) => void
): Unsubscribe {
  if (!db) {
    return () => {};
  }

  const q = query(collection(db, 'permissionRequests'), orderBy('createdAt', 'desc'));

  return onSnapshot(
    q,
    async (snapshot: any) => {
      const records = snapshot.docs.map((d: any) => {
        const raw = d.data();
        const createdAt = raw.createdAt?.toMillis?.() ?? raw.createdAt ?? Date.now();
        const decidedAt = raw.decidedAt?.toMillis?.() ?? raw.decidedAt ?? null;
        return {
          id: d.id,
          sessionId: raw.sessionId ?? '',
          practitionerId: raw.practitionerId ?? '',
          practitionerName: raw.practitionerName || '',
          practitionerNim: raw.practitionerNim || '',
          reason: raw.reason ?? '',
          status: (raw.status as 'pending' | 'approved' | 'rejected') ?? 'pending',
          createdAt,
          session: raw.session ?? {},
          ai: raw.ai ?? { status: 'pending' },
          decisionNote: raw.decisionNote,
          decidedBy: raw.decidedBy,
          decidedAt,
        };
      });

      // Enrich practitioner names & NIMs
      const enriched = await Promise.all(
        records.map(async (rec: any) => {
          if (rec.practitionerName && rec.practitionerNim) {
            return rec;
          }
          const profile = await resolvePractitionerProfile(rec.practitionerId);
          return {
            ...rec,
            practitionerName: rec.practitionerName || profile.name,
            practitionerNim: rec.practitionerNim || profile.nim,
          };
        })
      );

      onData(enriched);
    },
    onError
  );
}

export async function processPendingPermissionAi(
  requests?: Pick<PermissionRequestItem, 'id' | 'reason' | 'ai'>[]
): Promise<void> {
  const user = auth?.currentUser;
  if (!user || !db) return;

  try {
    let pending: Pick<PermissionRequestItem, 'id' | 'reason' | 'ai'>[];

    if (requests) {
      pending = requests.filter((item) => item.ai.status === 'pending');
    } else {
      const snapshot = await getDocs(
        query(collection(db, 'permissionRequests'), where('ai.status', '==', 'pending'))
      );
      pending = snapshot.docs.map((document) => {
        const raw = document.data();
        return {
          id: document.id,
          reason: String(raw.reason ?? ''),
          ai: raw.ai ?? { status: 'pending' },
        };
      });
    }

    await Promise.all(
      pending.map(async (item) => {
        if (aiInFlight.has(item.id)) return;
        aiInFlight.add(item.id);

        try {
          const result = await classifyReason(item.reason);
          await updateDoc(doc(db!, 'permissionRequests', item.id), { ai: result });
        } catch {
          // Leave the request pending so the next listener snapshot retries it.
        } finally {
          aiInFlight.delete(item.id);
        }
      })
    );
  } catch {
    // A failed query/listener must not block the permission list.
  }
}

export async function decidePermissionRequest(
  id: string,
  decision: 'approved' | 'rejected',
  decisionNote: string = ''
): Promise<void> {
  const user = auth?.currentUser;
  if (!user || !db) {
    throw new Error('Autentikasi Firebase diperlukan untuk mengambil keputusan.');
  }

  const ref = doc(db, 'permissionRequests', id);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    throw new Error('Dokumen pengajuan izin tidak ditemukan.');
  }

  const current = snap.data();
  if (current.status !== 'pending') {
    throw new Error('Pengajuan izin ini sudah diputuskan sebelumnya.');
  }

  // Exactly matching firestore.rules:
  // affectedKeys().hasOnly(['status', 'decisionNote', 'decidedBy', 'decidedAt'])
  await updateDoc(ref, {
    status: decision,
    decidedBy: user.uid,
    decidedAt: serverTimestamp(),
    decisionNote: decisionNote.trim(),
  });
}

