import {
  Timestamp,
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
import { normalizeNim } from '@/utils/nim';
import { hasRole } from '@/utils/roles';
import { getSessionStatus, normalizeSessionStatus } from '@/utils/session-status';
import type {
  Attendance,
  PermissionRequestItem,
  Session,
} from '../../features/asisten/types';
import { classifyReason } from './ai/classifier';
import { notifyUsers } from './notification-service';

export type SessionInput = {
  courseName: string;
  courseCode?: string;
  classId?: string;
  className: string;
  dateLabel: string;
  timeRange: string;
  room: string;
  description?: string;
  participantIds?: string[];
  date?: Date | Timestamp | string;
  dateTimestamp?: Timestamp;
  startTime?: string;
  endTime?: string;
  labId?: string;
  radiusM?: number;
};

// In-memory cache for user profile resolution (UID -> { name, nim })
const userProfileCache = new Map<string, { name: string; nim: string }>();
const aiInFlight = new Set<string>();

// Aturan token sama dengan parseAttendanceQr di utils/attendance-location.ts
const QR_TOKEN_PATTERN = /^[A-Za-z0-9_-]{16,128}$/;
const QR_TOKEN_ALPHABET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

/**
 * Token acak untuk QR presensi sesi. Dipakai praktikan untuk membuktikan
 * bahwa QR yang dipindai berasal dari sesi ini.
 */
export function generateQrToken(length = 32): string {
  const bytes = new Uint8Array(length);
  const webCrypto = (globalThis as any).crypto;
  if (webCrypto?.getRandomValues) {
    webCrypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < length; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  let token = '';
  for (let i = 0; i < length; i += 1) {
    token += QR_TOKEN_ALPHABET[bytes[i] % QR_TOKEN_ALPHABET.length];
  }
  return token;
}

/**
 * Memastikan sesi punya qrToken yang valid. Sesi lama (dibuat sebelum fitur
 * token ada) belum punya token, jadi dibuatkan saat QR pertama kali dibuka.
 */
export async function ensureSessionQrToken(sessionId: string): Promise<string> {
  const user = auth?.currentUser;
  if (!user || !db) {
    throw new Error('Autentikasi Firebase diperlukan untuk membuat QR sesi.');
  }

  const sessionRef = doc(db, 'sessions', sessionId);
  const snap = await getDoc(sessionRef);
  if (!snap.exists()) {
    throw new Error('Sesi praktikum tidak ditemukan.');
  }

  const existing = snap.data().qrToken;
  if (typeof existing === 'string' && QR_TOKEN_PATTERN.test(existing)) {
    return existing;
  }

  const token = generateQrToken();
  try {
    await updateDoc(sessionRef, { qrToken: token });
  } catch (err: any) {
    if (err?.code === 'permission-denied') {
      throw new Error(
        'Izin ditolak (permission-denied): Rules Firestore tidak mengizinkan asisten menyimpan qrToken pada sesi.'
      );
    }
    throw new Error(err?.message || 'Gagal membuat token QR sesi.');
  }
  return token;
}

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
        roles: data.roles,
      };
    });

    const uids = new Set<string>();
    const unmatched: ClassParticipant[] = [];

    for (const participant of participants) {
      const nim = normalizeNim(participant.nim);
      const matches = directory.filter(
        (user) => hasRole(user, 'praktikan') && !!user.nim && normalizeNim(user.nim) === nim,
      );

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

  // Parse or construct Timestamp for date (PRD R1 & R4)
  let dateTimestamp: Timestamp;
  if (input.dateTimestamp instanceof Timestamp) {
    dateTimestamp = input.dateTimestamp;
  } else if (input.date instanceof Timestamp) {
    dateTimestamp = input.date;
  } else if (input.date instanceof Date) {
    dateTimestamp = Timestamp.fromDate(input.date);
  } else if (typeof input.date === 'string' && input.date.trim() && !isNaN(Date.parse(input.date))) {
    dateTimestamp = Timestamp.fromDate(new Date(input.date));
  } else {
    dateTimestamp = Timestamp.fromDate(new Date());
  }

  try {
    let participantIds = input.participantIds || [];

    if (input.classId) {
      try {
        const classSnap = await getDoc(doc(db, 'classes', input.classId));
        if (classSnap.exists()) {
          const roster = (classSnap.data().participants ?? []) as ClassParticipant[];
          const mapping = await resolveParticipantUids(roster);
          participantIds = mapping.uids;
        }
      } catch {
        participantIds = input.participantIds || [];
      }
    }

    const docRef = await addDoc(collection(db, 'sessions'), {
      courseName: input.courseName.trim(),
      courseCode: input.courseCode?.trim() || '',
      classId: input.classId || '',
      className: input.className.trim(),
      dateLabel: input.dateLabel.trim(),
      timeRange: input.timeRange.trim(),
      room: input.room.trim(),
      description: input.description?.trim() || '',
      assistantName: assistantName || 'Asisten',
      assistantId: user.uid,
      status: 'upcoming',
      participantIds,
      date: dateTimestamp,
      dateTimestamp: dateTimestamp,
      startTime: input.startTime?.trim() || '',
      endTime: input.endTime?.trim() || '',
      // Token QR presensi: dipakai scanner praktikan untuk memvalidasi QR sesi ini.
      qrToken: generateQrToken(),
      // Lab dan radius presensi (SRS-32). Hanya disimpan kalau dipilih,
      // karena Firestore menolak nilai undefined.
      ...(input.labId ? { labId: input.labId, radiusM: input.radiusM ?? 50 } : {}),
      createdAt: serverTimestamp(),
    });

    return docRef.id;
  } catch (err: any) {
    if (err?.code === 'permission-denied') {
      throw new Error(
        'Izin ditolak (permission-denied): Hanya asisten yang dapat menambah sesi di Firestore. Pastikan akun Anda memiliki role "asisten".'
      );
    }
    throw new Error(err?.message || 'Gagal menyimpan sesi ke Firestore.');
  }
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
  if (input.participantIds !== undefined && updatePayload.participantIds === undefined) {
    updatePayload.participantIds = input.participantIds;
  }
  if (input.classId !== undefined) {
    updatePayload.classId = input.classId;
    if (input.classId) {
      try {
        const classSnap = await getDoc(doc(db, 'classes', input.classId));
        if (classSnap.exists()) {
          const mapping = await resolveParticipantUids(
            (classSnap.data().participants ?? []) as ClassParticipant[],
          );
          updatePayload.participantIds = mapping.uids;
        }
      } catch {
        updatePayload.participantIds = input.participantIds ?? [];
      }
    }
  }
  if (input.startTime !== undefined) updatePayload.startTime = input.startTime.trim();
  if (input.endTime !== undefined) updatePayload.endTime = input.endTime.trim();
  if (input.labId !== undefined) updatePayload.labId = input.labId;
  if (input.radiusM !== undefined) updatePayload.radiusM = input.radiusM;
  if (input.date !== undefined || input.dateTimestamp !== undefined) {
    let dateTs: Timestamp;
    if (input.dateTimestamp instanceof Timestamp) dateTs = input.dateTimestamp;
    else if (input.date instanceof Timestamp) dateTs = input.date;
    else if (input.date instanceof Date) dateTs = Timestamp.fromDate(input.date);
    else if (typeof input.date === 'string' && !isNaN(Date.parse(input.date))) dateTs = Timestamp.fromDate(new Date(input.date));
    else dateTs = Timestamp.fromDate(new Date());
    updatePayload.date = dateTs;
    updatePayload.dateTimestamp = dateTs;
  }

  try {
    await updateDoc(sessionRef, updatePayload);
  } catch (err: any) {
    if (err?.code === 'permission-denied') {
      throw new Error('Izin ditolak (permission-denied): Hanya asisten yang dapat mengubah sesi.');
    }
    throw new Error(err?.message || 'Gagal memperbarui sesi.');
  }
}

export async function deleteSession(sessionId: string): Promise<void> {
  const user = auth?.currentUser;
  if (!user || !db) {
    throw new Error('Autentikasi Firebase diperlukan untuk menghapus sesi.');
  }

  const sessionRef = doc(db, 'sessions', sessionId);
  try {
    await deleteDoc(sessionRef);
  } catch (err: any) {
    if (err?.code === 'permission-denied') {
      throw new Error('Izin ditolak (permission-denied): Hanya asisten yang dapat menghapus sesi.');
    }
    throw new Error(err?.message || 'Gagal menghapus sesi.');
  }
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
  await updateDoc(sessionRef, {
    status: newStatus,
  });
}

/**
 * Menyimpan transisi status otomatis (upcoming → open → closed) supaya field
 * `status` di Firestore sama dengan yang dilihat di layar. Hanya asisten yang
 * boleh menulis dokumen sesi, jadi fungsi ini dipanggil dari layar asisten.
 */
export async function syncSessionStatuses(
  sessions: { id: string; status?: string; [key: string]: any }[]
): Promise<void> {
  if (!db) return;

  const pending = sessions
    .map((session) => ({
      id: session.id,
      current: normalizeSessionStatus(session.status),
      next: getSessionStatus(session),
    }))
    .filter((item) => item.current !== item.next);

  await Promise.allSettled(
    pending.map((item) => updateDoc(doc(db!, 'sessions', item.id), { status: item.next }))
  );
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
        let dateStr = '';
        if (raw.date?.toDate) {
          dateStr = raw.date.toDate().toISOString().split('T')[0];
        } else if (typeof raw.date === 'string') {
          dateStr = raw.date;
        } else if (raw.dateLabel) {
          dateStr = raw.dateLabel;
        }

        return {
          id: d.id,
          courseName: raw.courseName ?? '',
          courseCode: raw.courseCode ?? '',
          classId: raw.classId ?? '',
          kelas: raw.className ?? raw.kelas ?? '',
          className: raw.className ?? raw.kelas ?? '',
          date: dateStr,
          dateLabel: raw.dateLabel ?? dateStr,
          startTime: raw.startTime ?? '',
          endTime: raw.endTime ?? '',
          timeRange: raw.timeRange ?? `${raw.startTime ?? ''} - ${raw.endTime ?? ''}`,
          room: raw.room ?? '',
          labId: raw.labId,
          radiusM: raw.radiusM,
          qrToken: raw.qrToken,
          assistantId: raw.assistantId ?? '',
          assistantName: raw.assistantName ?? '',
          status: normalizeSessionStatus(raw.status) ?? 'upcoming',
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
      pending = requests.filter(
        (item) => item.ai.status === 'pending' || item.ai.status === 'failed'
      );
    } else {
      const snapshot = await getDocs(
        query(collection(db, 'permissionRequests'), where('ai.status', 'in', ['pending', 'failed']))
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

export function subscribePendingPermissionAiAutoProcessor(): Unsubscribe {
  const user = auth?.currentUser;
  if (!user || !db) return () => {};

  const q = query(
    collection(db, 'permissionRequests'),
    where('ai.status', 'in', ['pending', 'failed'])
  );

  return onSnapshot(
    q,
    (snapshot) => {
      if (snapshot.empty) return;
      const pending = snapshot.docs.map((document) => {
        const raw = document.data();
        return {
          id: document.id,
          reason: String(raw.reason ?? ''),
          ai: raw.ai ?? { status: 'pending' },
        };
      });
      void processPendingPermissionAi(pending);
    },
    () => {
      // Ignore background listener errors safely
    }
  );
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

  // SRS-35: beri tahu praktikan pemilik izin. Kegagalan notifikasi tidak boleh
  // membatalkan keputusan yang sudah tersimpan.
  try {
    const approved = decision === 'approved';
    const course = current.session?.courseName ?? 'praktikum';
    const date = current.session?.dateLabel ? ` (${current.session.dateLabel})` : '';
    const note = decisionNote.trim();

    await notifyUsers([current.practitionerId], {
      type: approved ? 'izin_diterima' : 'izin_ditolak',
      title: approved ? 'Izin diterima' : 'Izin ditolak',
      body:
        `Pengajuan izin ${course}${date} ${approved ? 'disetujui' : 'ditolak'}.` +
        (note ? ` Catatan: ${note}` : ''),
      sessionId: current.sessionId,
    });
  } catch {
    // Notifikasi gagal terkirim; keputusan tetap berlaku.
  }
}