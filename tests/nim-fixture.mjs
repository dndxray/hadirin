// Auth/Firestore demo emulators only, never production.
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, setDoc } from 'firebase/firestore';

async function account(email) {
  const body = JSON.stringify({ email, password: 'test-pass-123', returnSecureToken: true });
  const request = async (method) => (await fetch(`http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:${method}?key=test-key`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body,
  })).json();
  let result = await request('signUp');
  if (result.error?.message === 'EMAIL_EXISTS') result = await request('signInWithPassword');
  if (!result.localId) throw new Error('Fixture account unavailable.');
  return result.localId;
}
const practitioner = await account('caesar@example.test');
const assistant = await account('fadhil@example.test');
const env = await initializeTestEnvironment({ projectId: 'demo-hadirin', firestore: { host: '127.0.0.1', port: 8085, rules: readFileSync('firestore.rules', 'utf8') } });
try {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (context) => {
    const store = context.firestore();
    await setDoc(doc(store, 'users', practitioner), { name: 'Caesar', email: 'caesar@example.test', role: 'praktikan' });
    await setDoc(doc(store, 'users', assistant), { name: 'Asisten Fadhil', email: 'fadhil@example.test', role: 'asisten' });
    await setDoc(doc(store, 'classes', 'penambangan-data'), {
      course: 'Penambangan Data', name: 'Kelas B', room: 'E101', participants: [], dateLabel: 'Senin, 09 November 2026', timeStart: '10.20', timeEnd: '12.10',
    });
    // Reproduces the real legacy shape: no participantIds and no metadata extras.
    await setDoc(doc(store, 'sessions', 'legacy-session'), {
      courseName: 'Penambangan Data', className: 'Kelas B', room: 'E101', dateLabel: 'Rabu, 12 November 2026',
      assistantName: 'Asisten Fadhil', status: 'open', timeRange: '10.20 - 12.10',
    });
  });
} finally { await env.cleanup(); }
console.log('Local NIM fixture ready.');
