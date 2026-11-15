// Local emulators only. Never uses production credentials or a real project ID.
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';

const operation = process.argv[2] ?? 'seed';
if (!['seed', 'close-changing', 'approve-permission'].includes(operation)) throw new Error('Unknown fixture operation.');

const result = await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=test-key', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'caesar@example.test', password: 'test-pass-123', returnSecureToken: true }),
});
let account = await result.json();
if (account.error?.message === 'EMAIL_EXISTS') {
  account = await (await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=test-key', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'caesar@example.test', password: 'test-pass-123', returnSecureToken: true }),
  })).json();
}
if (!account.localId) throw new Error(JSON.stringify(account));
const env = await initializeTestEnvironment({ projectId: 'demo-hadirin', firestore: { host: '127.0.0.1', port: 8085 } });
if (operation === 'seed') await env.clearFirestore();
await env.withSecurityRulesDisabled(async (context) => {
  const db = context.firestore();
  if (operation === 'close-changing') {
    await updateDoc(doc(db, 'sessions', 'changing'), { status: 'closed' });
    return;
  }
  if (operation === 'approve-permission') {
    await updateDoc(doc(db, 'permissionRequests', `permission_${account.localId}`), {
      status: 'approved', decidedBy: 'assistant-fixture', decidedAt: serverTimestamp(),
      ai: { status: 'failed', error: 'timeout' },
    });
    return;
  }
  await setDoc(doc(db, 'users', account.localId), { name: 'Caesar', email: 'caesar@example.test', role: 'praktikan' });
  for (const [id, courseName, status] of [
    ['checkin', 'React Native', 'open'], ['permission', 'Basis Data', 'upcoming'],
    ['closed', 'Jaringan Komputer', 'closed'], ['changing', 'Algoritma', 'open'],
  ]) {
    await setDoc(doc(db, 'sessions', id), { courseName, className: 'TI-3A', room: 'Lab 2', assistantName: 'Fadhil', dateLabel: '12 November 2026', timeRange: '13.00–15.00 WIB', status, participantIds: [account.localId] });
  }
  // A class is not a session. The Home/detail flow must never use this document ID.
  await setDoc(doc(db, 'classes', 'not-a-session'), { name: 'Kelas tanpa sesi', participants: [] });
});
await env.cleanup();
console.log(`Local practitioner fixture: ${operation} complete.`);
