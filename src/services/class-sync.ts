import { collection, doc, getDoc, getDocs, query, updateDoc, where } from 'firebase/firestore';

import { db } from '@/lib/firebase';
import { resolveParticipantUids, type ClassParticipant } from '@/services/assistant-service';

type SessionRow = {
  id: string;
  classId?: string;
  className?: string;
  courseName?: string;
  participantIds?: string[];
};

export type SessionParticipantAudit = {
  sessionId: string;
  label: string;
  classId: string | null;
  rosterCount: number;
  mapped: number;
  unmapped: ClassParticipant[];
  extras: string[];
};

async function historyIds(sessionId: string): Promise<string[]> {
  const [attendance, permissions] = await Promise.all([
    getDocs(query(collection(db, 'attendance'), where('sessionId', '==', sessionId))),
    getDocs(query(collection(db, 'permissionRequests'), where('sessionId', '==', sessionId))),
  ]);

  const ids = new Set<string>();
  attendance.docs.forEach((item) => ids.add(String(item.data().practitionerId ?? '')));
  permissions.docs.forEach((item) => ids.add(String(item.data().practitionerId ?? '')));
  ids.delete('');
  return Array.from(ids);
}

async function sessionsOfClass(classId: string, className: string, courseName: string): Promise<SessionRow[]> {
  const [byClassId, byClassName] = await Promise.all([
    getDocs(query(collection(db, 'sessions'), where('classId', '==', classId))),
    getDocs(query(collection(db, 'sessions'), where('className', '==', className))),
  ]);

  const rows = new Map<string, SessionRow>();
  byClassId.docs.forEach((item) => rows.set(item.id, { id: item.id, ...item.data() } as SessionRow));
  byClassName.docs.forEach((item) => {
    const data = item.data();
    const sameCourse = String(data.courseName ?? '').trim().toLowerCase() === courseName.trim().toLowerCase();
    const sameClass = String(data.className ?? '').trim().toLowerCase() === className.trim().toLowerCase();
    if (sameCourse && sameClass) rows.set(item.id, { id: item.id, ...data } as SessionRow);
  });

  return Array.from(rows.values());
}

export async function participantsForClass(classId: string) {
  const snap = await getDoc(doc(db, 'classes', classId));
  if (!snap.exists()) throw new Error('Kelas tidak ditemukan.');

  const data = snap.data();
  const roster = (Array.isArray(data.participants) ? data.participants : []) as ClassParticipant[];
  const mapping = await resolveParticipantUids(roster);

  return {
    course: String(data.course ?? ''),
    className: String(data.name ?? ''),
    roster,
    uids: mapping.uids,
    unmatched: mapping.unmatched,
  };
}

export async function syncClassSessions(classId: string) {
  const { course, className, roster, uids, unmatched } = await participantsForClass(classId);
  const sessions = await sessionsOfClass(classId, className, course);

  let updated = 0;

  for (const session of sessions) {
    const next = new Set(uids);
    (await historyIds(session.id)).forEach((id) => next.add(id));

    const participantIds = Array.from(next);
    const current = Array.isArray(session.participantIds) ? session.participantIds : [];
    const sameIds =
      participantIds.length === current.length && participantIds.every((id) => current.includes(id));

    if (sameIds && session.classId === classId) continue;

    await updateDoc(doc(db, 'sessions', session.id), { classId, participantIds });
    updated += 1;
  }

  return { updated, rosterCount: roster.length, mapped: uids.length, unmatched };
}

export async function auditSessionParticipants(): Promise<SessionParticipantAudit[]> {
  const [classesSnap, sessionsSnap] = await Promise.all([
    getDocs(query(collection(db, 'classes'))),
    getDocs(query(collection(db, 'sessions'))),
  ]);

  const cache = new Map<string, { rosterCount: number; uids: string[]; unmatched: ClassParticipant[] }>();

  const resolveClass = async (classId: string) => {
    if (!cache.has(classId)) {
      const info = await participantsForClass(classId);
      cache.set(classId, { rosterCount: info.roster.length, uids: info.uids, unmatched: info.unmatched });
    }
    return cache.get(classId)!;
  };

  const findClassId = async (session: any): Promise<string | null> => {
    if (session.classId) return String(session.classId);
    const match = classesSnap.docs.find((item) => {
      const data = item.data();
      return (
        String(data.name ?? '').trim().toLowerCase() === String(session.className ?? '').trim().toLowerCase() &&
        String(data.course ?? '').trim().toLowerCase() === String(session.courseName ?? '').trim().toLowerCase()
      );
    });
    return match ? match.id : null;
  };

  const rows: SessionParticipantAudit[] = [];

  for (const item of sessionsSnap.docs) {
    const session = item.data();
    const classId = await findClassId(session);
    const resolved = classId ? await resolveClass(classId) : { rosterCount: 0, uids: [], unmatched: [] };
    const participantIds = Array.isArray(session.participantIds) ? session.participantIds : [];

    rows.push({
      sessionId: item.id,
      label: `${session.courseName ?? '-'} / ${session.className ?? '-'}`,
      classId,
      rosterCount: resolved.rosterCount,
      mapped: participantIds.length,
      unmapped: resolved.unmatched,
      extras: participantIds.filter((id: string) => !resolved.uids.includes(id)),
    });
  }

  return rows;
}
