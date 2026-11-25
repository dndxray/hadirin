import { doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import * as Location from 'expo-location';

import { auth, db } from '@/lib/firebase';
import { isWithinLab } from '@/lib/geo';
import type { CloudSession, SessionSummary } from '@/types/practitioner';
import { getSessionStatus } from '@/utils/session-status';

export function validateReason(reason: string) {
  const trimmed = reason.trim();
  if (trimmed.length < 10) return 'Jelaskan alasan izin minimal 10 karakter.';
  if (trimmed.length > 1000) return 'Alasan izin maksimal 1.000 karakter.';
  return null;
}

function summary(session: CloudSession): SessionSummary {
  const { courseName, className, dateLabel, timeRange, room, assistantName } = session;
  return { courseName, className, dateLabel, timeRange, room, assistantName };
}

// Both operations share one deterministic ID and read both documents inside a
// transaction. Concurrent requests from multiple devices cannot duplicate records.
export async function recordParticipation(sessionId: string, reason?: string) {
  const user = auth?.currentUser;
  if (!user || !db) throw new Error('Login Firebase diperlukan untuk melanjutkan.');
  if (reason !== undefined) {
    const invalid = validateReason(reason);
    if (invalid) throw new Error(invalid);
  }
  const database = db;
  const uid = user.uid;
  const id = `${sessionId}_${uid}`;
  return runTransaction(database, async (transaction) => {
    const sessionRef = doc(database, 'sessions', sessionId);
    const attendanceRef = doc(database, 'attendance', id);
    const permissionRef = doc(database, 'permissionRequests', id);
    const [sessionDoc, attendanceDoc, permissionDoc] = await Promise.all([
      transaction.get(sessionRef), transaction.get(attendanceRef), transaction.get(permissionRef),
    ]);
    if (!sessionDoc.exists()) throw new Error('Sesi sudah dihapus oleh asisten.');
    const session = sessionDoc.data() as CloudSession;
    if (!session.participantIds?.includes(uid)) throw new Error('Kamu bukan peserta sesi ini.');
    if (attendanceDoc.exists()) throw new Error('Presensi untuk sesi ini sudah tercatat.');
    if (permissionDoc.exists()) throw new Error('Izin untuk sesi ini sudah diajukan. Periksa statusnya di riwayat.');
    if (reason === undefined) {
      if (getSessionStatus(session) !== 'open') throw new Error('Sesi belum dibuka atau sudah ditutup oleh asisten.');
      if (session.labId) {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (permission.status !== 'granted') {
          throw new Error('Izin lokasi diperlukan untuk melakukan presensi.');
        }
        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        const withinLab = isWithinLab(
          { lat: position.coords.latitude, lng: position.coords.longitude },
          session.labId,
          session.radiusM ?? 50,
        );
        if (!withinLab) {
          throw new Error('Lokasi Anda berada di luar radius laboratorium sesi.');
        }
      }
      transaction.set(attendanceRef, {
        sessionId, practitionerId: uid, checkedInAt: serverTimestamp(), session: summary(session),
      });
    } else {
      if (getSessionStatus(session) === 'closed') throw new Error('Sesi sudah ditutup. Hubungi asisten untuk pengajuan susulan.');
      transaction.set(permissionRef, {
        sessionId, practitionerId: uid, reason: reason.trim(), status: 'pending',
        createdAt: serverTimestamp(), session: summary(session), ai: { status: 'pending' },
      });
    }
    return id;
  });
}
