// Fixed local demo project only. This does not access Firebase production.
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, setDoc } from 'firebase/firestore';

const endpoint = 'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/';
const credentials = { email: 'caesar@example.test', password: 'test-pass-123', returnSecureToken: true };
async function accountRequest(method) {
  return (await fetch(`${endpoint}accounts:${method}?key=test-key`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(credentials),
  })).json();
}
let account = await accountRequest('signUp');
if (account.error?.message === 'EMAIL_EXISTS') account = await accountRequest('signInWithPassword');
if (!account.localId) throw new Error('Unable to create local fixture account.');
const originalRules = readFileSync('firestore.rules', 'utf8');
const sessionRule = 'allow read: if isAsisten() || (isPraktikan() && request.auth.uid in resource.data.participantIds);';
if (!originalRules.includes(sessionRule)) throw new Error('Update the local regression fixture to match the session rules.');
const env = await initializeTestEnvironment({ projectId: 'demo-hadirin', firestore: {
  host: '127.0.0.1', port: 8085, rules: originalRules.replace(sessionRule, 'allow read: if false;'),
} });
try {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (context) => {
    const store = context.firestore();
    await setDoc(doc(store, 'users', account.localId), { name: 'Caesar', email: credentials.email, role: 'praktikan' });
    await setDoc(doc(store, 'classes', 'penambangan-data'), {
      course: 'Penambangan Data', name: 'Kelas B', room: 'E101', participants: [],
      dateLabel: 'Senin, 09 November 2026', timeStart: '10.20', timeEnd: '12.10',
    });
  });
} finally {
  await env.cleanup();
}
console.log('Local original-navigation fixture ready; sessions intentionally denied.');
