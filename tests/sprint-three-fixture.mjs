// This fixture is permanently bound to loopback + demo-hadirin. Never production.
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { deleteDoc, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

const PROJECT = 'demo-hadirin';
const mode = process.argv[2] ?? 'seed';
const email = 's3-caesar@example.test';
const password = 'test-pass-123';
const base = 'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:';
const credentials = async operation => {
  const response = await fetch(`${base}${operation}?key=test-key`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, returnSecureToken: true }),
  });
  return response.json();
};
let account = await credentials('signInWithPassword');
if (!account.localId) account = await credentials('signUp');
if (!account.localId) throw new Error('Could not create disposable emulator account.');
const env = await initializeTestEnvironment({ projectId: PROJECT,
  firestore: { host: '127.0.0.1', port: 8085, rules: readFileSync('firestore.rules', 'utf8') } });
try {
  await env.withSecurityRulesDisabled(async context => {
    const db = context.firestore();
    if (mode === 'seed') {
      await setDoc(doc(db, 'users', account.localId), { name: 'Caesar Sprint 3', email, role: 'praktikan', roles: ['praktikan'],
        nim: '24060124120051', approvalStatus: 'approved' });
      await setDoc(doc(db, 'labs', 's3-lab-in'), { name: 'Lab Pengujian A', latitude: -7.05, longitude: 110.44, radiusMeters: 100 });
      await setDoc(doc(db, 'labs', 's3-lab-far'), { name: 'Lab Pengujian Jauh', latitude: -7.07, longitude: 110.44, radiusMeters: 50 });
      const dateLabel = new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }).format(new Date());
      for (const [id, courseName, status, labId] of [
        ['s3-live', 'Presensi Lokasi Sprint 3', 'open', 's3-lab-in'],
        ['s3-outside', 'Sesi Di Luar Radius', 'open', 's3-lab-far'],
        ['s3-closed', 'Sesi Ditutup Sprint 3', 'closed', 's3-lab-in'],
        ['s3-no-lab', 'Sesi Belum Punya Lab', 'open', null],
        ['s3-permission', 'Sesi Izin Sprint 3', 'upcoming', 's3-lab-in'],
      ]) {
        await setDoc(doc(db, 'sessions', id), { courseName, className: 'B', room: 'Lab Uji', assistantName: 'Asisten Uji',
          dateLabel, timeRange: '00.00 - 23.59', status, participantIds: [account.localId], qrToken: '0123456789abcdef',
          ...(labId ? { labId } : {}),
        });
        await deleteDoc(doc(db, 'attendance', `${id}_${account.localId}`));
        await deleteDoc(doc(db, 'permissionRequests', `${id}_${account.localId}`));
      }
    } else if (mode === 'close' || mode === 'open') {
      await updateDoc(doc(db, 'sessions', 's3-live'), { status: mode === 'close' ? 'closed' : 'open' });
    } else if (mode === 'verify') {
      const attendance = await getDoc(doc(db, 'attendance', `s3-live_${account.localId}`));
      if (!attendance.exists() || attendance.data().method !== 'location' || !attendance.data().location?.point) {
        throw new Error('Expected stored attendance with location evidence.');
      }
      const outside = await getDoc(doc(db, 'attendance', `s3-outside_${account.localId}`));
      if (outside.exists()) throw new Error('Outside-radius attendance must not exist.');
    } else throw new Error('Unknown fixture command.');
  });
  console.log(`SPRINT3_FIXTURE_OK: ${mode} on ${PROJECT} emulator only`);
} finally { await env.cleanup(); }
