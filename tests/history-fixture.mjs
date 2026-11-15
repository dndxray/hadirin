// Local emulator only; never reads project IDs or credentials from .env.
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';

const operation = process.argv[2] ?? 'seed';
if (!['seed', 'decision', 'deny-sessions', 'deny-attendance', 'restore-rules'].includes(operation)) throw new Error('Unknown fixture operation.');
const credentials = { email: 'caesar@example.test', password: 'test-pass-123', returnSecureToken: true };
async function accountRequest(method) {
  return (await fetch(`http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:${method}?key=test-key`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(credentials),
  })).json();
}
let account = await accountRequest('signUp');
if (account.error?.message === 'EMAIL_EXISTS') account = await accountRequest('signInWithPassword');
if (!account.localId) throw new Error('Local fixture authentication failed.');
let rules = readFileSync('firestore.rules', 'utf8');
if (operation === 'deny-sessions') rules = rules.replace(
  'allow read: if isAsisten() || (isPraktikan() && request.auth.uid in resource.data.participantIds);', 'allow read: if false;');
if (operation === 'deny-attendance') rules = rules.replace(
  'allow list: if isAsisten() || (isPraktikan() && resource.data.practitionerId == request.auth.uid);', 'allow list: if false;');
const env = await initializeTestEnvironment({ projectId: 'demo-hadirin', firestore: {
  host: '127.0.0.1', port: 8085, rules,
} });
try {
  if (operation === 'seed') await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (context) => {
    const store = context.firestore();
    const summary = { courseName: 'Penambangan Data', className: 'Kelas B', room: 'E101', assistantName: 'Asisten Fadhil', dateLabel: 'Senin, 09 November 2026', timeRange: '10.20 - 12.10' };
    if (operation === 'decision') {
      await updateDoc(doc(store, 'permissionRequests', `next_${account.localId}`), {
        status: 'approved', decidedBy: 'assistant-fixture', decidedAt: serverTimestamp(),
        ai: { status: 'failed', error: 'timeout' },
      });
      return;
    }
    if (operation !== 'seed') return;
    await setDoc(doc(store, 'users', account.localId), { name: 'Caesar', email: credentials.email, role: 'praktikan' });
    await setDoc(doc(store, 'classes', 'penambangan-data'), {
      course: summary.courseName, name: summary.className, room: summary.room, participants: [],
      dateLabel: summary.dateLabel, timeStart: '10.20', timeEnd: '12.10',
    });
    await setDoc(doc(store, 'sessions', 'attended'), { ...summary, status: 'open', participantIds: [account.localId] });
    await setDoc(doc(store, 'sessions', 'next'), { ...summary, status: 'upcoming', participantIds: [account.localId] });
    await setDoc(doc(store, 'sessions', 'unrelated'), { ...summary, courseName: 'Basis Data', status: 'open', participantIds: [account.localId] });
    await setDoc(doc(store, 'attendance', `attended_${account.localId}`), {
      sessionId: 'attended', practitionerId: account.localId, checkedInAt: serverTimestamp(), session: summary,
    });
  });
} finally { await env.cleanup(); }
console.log(`History fixture: ${operation} complete (local demo only).`);
