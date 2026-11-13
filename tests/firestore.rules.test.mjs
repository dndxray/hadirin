import { readFileSync } from 'node:fs';
import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import ts from 'typescript';
import * as firestore from 'firebase/firestore';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { collection, doc, getDoc, getDocs, onSnapshot, query, serverTimestamp, setDoc, updateDoc, where, writeBatch } from 'firebase/firestore';

let env;
const session = { courseName: 'PPK', className: 'A', dateLabel: '12 November 2026', timeRange: '13.00–15.00 WIB', room: 'Lab', assistantName: 'Fadhil' };
const attendance = (uid = 'caesar', sessionId = 'open') => ({ sessionId, practitionerId: uid, checkedInAt: serverTimestamp(), session });
const permission = (uid = 'caesar', sessionId = 'open') => ({ sessionId, practitionerId: uid, createdAt: serverTimestamp(), session, reason: 'Saya sedang sakit dan perlu beristirahat.', status: 'pending', ai: { status: 'pending' } });
const db = (uid = 'caesar') => env.authenticatedContext(uid).firestore();
const require = createRequire(import.meta.url);
function service(store, uid = 'caesar') {
  const output = ts.transpileModule(readFileSync('src/services/practitioner-service.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  new Function('require', 'exports', 'module', output)(
    (name) => name === '@/lib/firebase' ? { db: store, auth: { currentUser: { uid } } } : name === 'firebase/firestore' ? firestore : require(name),
    module.exports, module,
  );
  return module.exports;
}
before(async () => {
  env = await initializeTestEnvironment({ projectId: 'demo-hadirin', firestore: { host: '127.0.0.1', port: 8085, rules: readFileSync('firestore.rules', 'utf8') } });
});
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (context) => {
    const store = context.firestore();
    await Promise.all(['caesar', 'other', 'outsider', 'assistant'].map((uid) => setDoc(doc(store, 'users', uid), { role: uid === 'assistant' ? 'asisten' : 'praktikan' })));
    await Promise.all(['open', 'upcoming', 'closed'].map((status) => setDoc(doc(store, 'sessions', status), { ...session, status, participantIds: ['caesar', 'other'] })));
  });
});
after(async () => { await env?.cleanup(); });

test('praktikan menyimpan presensi; server memberi timestamp', async () => {
  const ref = doc(db(), 'attendance', 'open_caesar');
  await assertSucceeds(setDoc(ref, attendance()));
  assert.ok((await getDoc(ref)).data().checkedInAt.toMillis() > 0);
});
test('service asli menolak klik paralel dan mengecek ulang sesi', async () => {
  const store = db();
  const api = service(store);
  const results = await Promise.allSettled([api.recordParticipation('open'), api.recordParticipation('open')]);
  assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
  await assert.rejects(api.recordParticipation('closed'));
  await assert.rejects(api.recordParticipation('upcoming'));
});
test('service asli memvalidasi dan menyimpan alasan yang sudah dipangkas', async () => {
  const store = db();
  const api = service(store);
  await assert.rejects(api.recordParticipation('upcoming', '   '));
  await api.recordParticipation('upcoming', '   Saya sakit dan perlu istirahat.   ');
  const saved = (await getDoc(doc(store, 'permissionRequests', 'upcoming_caesar'))).data();
  assert.equal(saved.reason, 'Saya sakit dan perlu istirahat.');
  assert.equal(saved.status, 'pending');
});
test('presensi kedua, manipulasi timestamp, dan ID alternatif ditolak', async () => {
  const store = db();
  await setDoc(doc(store, 'attendance', 'open_caesar'), attendance());
  await assertFails(setDoc(doc(store, 'attendance', 'open_caesar'), attendance()));
  await assertFails(setDoc(doc(store, 'attendance', 'duplicate'), attendance()));
  await assertFails(setDoc(doc(db('other'), 'attendance', 'open_other'), { ...attendance('other'), checkedInAt: new Date(0) }));
});
test('sesi tertutup/belum dibuka dan bukan peserta ditolak', async () => {
  for (const status of ['closed', 'upcoming']) await assertFails(setDoc(doc(db(), 'attendance', `${status}_caesar`), attendance('caesar', status)));
  await assertFails(setDoc(doc(db('outsider'), 'attendance', 'open_outsider'), attendance('outsider')));
});
test('UID palsu dan tanpa login ditolak', async () => {
  await assertFails(setDoc(doc(db(), 'attendance', 'open_other'), attendance('other')));
  await assertFails(setDoc(doc(env.unauthenticatedContext().firestore(), 'attendance', 'open_caesar'), attendance()));
});
test('query hanya data sendiri; data tetap ada di client baru', async () => {
  await setDoc(doc(db(), 'attendance', 'open_caesar'), attendance());
  const own = await assertSucceeds(getDocs(query(collection(db(), 'attendance'), where('practitionerId', '==', 'caesar'))));
  assert.equal(own.size, 1);
  await assertFails(getDocs(collection(db(), 'attendance')));
  await assertFails(getDoc(doc(db('other'), 'attendance', 'open_caesar')));
});
test('izin dibuat pending, gagal AI tidak menghapus izin', async () => {
  await assertSucceeds(setDoc(doc(db(), 'permissionRequests', 'open_caesar'), permission()));
  await assertSucceeds(updateDoc(doc(db('assistant'), 'permissionRequests', 'open_caesar'), { ai: { status: 'failed', error: 'timeout' } }));
  const saved = (await getDoc(doc(db(), 'permissionRequests', 'open_caesar'))).data();
  assert.equal(saved.status, 'pending');
  assert.equal(saved.ai.status, 'failed');
});
test('izin kosong, pendek, terlalu panjang, status palsu dan UID palsu ditolak', async () => {
  for (const reason of [' ', 'a', ' '.repeat(20), 'a'.repeat(1001)]) await assertFails(setDoc(doc(db(), 'permissionRequests', 'open_caesar'), { ...permission(), reason }));
  await assertFails(setDoc(doc(db(), 'permissionRequests', 'open_caesar'), { ...permission(), status: 'approved' }));
  await assertFails(setDoc(doc(db(), 'permissionRequests', 'open_other'), permission('other')));
});
test('izin ganda dan izin sesi tertutup ditolak', async () => {
  await setDoc(doc(db(), 'permissionRequests', 'open_caesar'), permission());
  await assertFails(setDoc(doc(db(), 'permissionRequests', 'open_caesar'), permission()));
  await assertFails(setDoc(doc(db(), 'permissionRequests', 'closed_caesar'), permission('caesar', 'closed')));
});
test('presensi dan izin tidak dapat dibuat bersamaan maupun setelah satu tercatat', async () => {
  const store = db();
  const batch = writeBatch(store);
  batch.set(doc(store, 'attendance', 'open_caesar'), attendance());
  batch.set(doc(store, 'permissionRequests', 'open_caesar'), permission());
  await assertFails(batch.commit());
  await setDoc(doc(store, 'attendance', 'open_caesar'), attendance());
  await assertFails(setDoc(doc(store, 'permissionRequests', 'open_caesar'), permission()));
});
test('praktikan tidak dapat mengubah keputusan, AI, alasan, maupun sesi', async () => {
  await setDoc(doc(db(), 'permissionRequests', 'open_caesar'), permission());
  for (const change of [{ status: 'approved' }, { ai: { status: 'success', category: 'sakit' } }, { reason: 'alasan diganti sendiri' }]) await assertFails(updateDoc(doc(db(), 'permissionRequests', 'open_caesar'), change));
  await assertFails(updateDoc(doc(db(), 'sessions', 'open'), { status: 'closed' }));
});
test('keputusan dan klasifikasi dari asisten tersinkron ke listener praktikan', async () => {
  await setDoc(doc(db(), 'permissionRequests', 'open_caesar'), permission());
  const ref = doc(db(), 'permissionRequests', 'open_caesar');
  let unsubscribe;
  const changed = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Listener timeout')), 10000);
    unsubscribe = onSnapshot(ref, (snapshot) => {
      if (snapshot.data()?.status === 'approved') { clearTimeout(timeout); resolve(snapshot.data()); }
    }, reject);
  });
  try {
    const assistantRef = doc(db('assistant'), 'permissionRequests', 'open_caesar');
    await assertSucceeds(updateDoc(assistantRef, { ai: { status: 'success', category: 'sakit' } }));
    await assertSucceeds(updateDoc(assistantRef, { status: 'approved', decidedBy: 'assistant', decidedAt: serverTimestamp(), decisionNote: 'Silakan beristirahat.' }));
    assert.equal((await changed).ai.category, 'sakit');
  } finally { unsubscribe?.(); }
});
