import { readFileSync } from 'node:fs';
import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { loadTypescript } from './helpers/load-typescript.mjs';
import * as firestore from 'firebase/firestore';
firestore.setLogLevel('silent'); // Permission-denied cases are asserted, not application failures.
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { collection, deleteDoc, doc, getDoc, getDocs, onSnapshot, query, serverTimestamp, setDoc, updateDoc, where, writeBatch } from 'firebase/firestore';

let env;
const session = { courseName: 'PPK', className: 'A', dateLabel: '12 November 2026', timeRange: '13.00–15.00 WIB', room: 'Lab', assistantName: 'Fadhil' };
const lab = { name: 'Lab Uji', latitude: -7.05, longitude: 110.44, radiusMeters: 100 };
const evidence = () => ({ method: 'location', position: { latitude: lab.latitude, longitude: lab.longitude, accuracy: 5, timestamp: Date.now() } });
const attendance = (uid = 'caesar', sessionId = 'open') => ({ sessionId, practitionerId: uid, checkedInAt: serverTimestamp(), session,
  labId: 'lab-a', method: 'location', location: { point: new firestore.GeoPoint(lab.latitude, lab.longitude), accuracy: 5, observedAt: firestore.Timestamp.now() } });
const permission = (uid = 'caesar', sessionId = 'open') => ({ sessionId, practitionerId: uid, createdAt: serverTimestamp(), session, reason: 'Saya sedang sakit dan perlu beristirahat.', status: 'pending', ai: { status: 'pending' } });
const db = (uid = 'caesar') => env.authenticatedContext(uid).firestore();
function service(store, uid = 'caesar', source = 'src/services/practitioner-service.ts') {
  return loadTypescript(source, { '@/lib/firebase': { db: store, auth: { currentUser: { uid } } }, 'firebase/firestore': firestore });
}
before(async () => {
  env = await initializeTestEnvironment({ projectId: 'demo-hadirin', firestore: { host: '127.0.0.1', port: 8085, rules: readFileSync('firestore.rules', 'utf8') } });
});
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (context) => {
    const store = context.firestore();
    await setDoc(doc(store, 'labs', 'lab-a'), lab);
    await Promise.all(['caesar', 'other', 'outsider', 'assistant'].map((uid) => setDoc(doc(store, 'users', uid), { role: uid === 'assistant' ? 'asisten' : 'praktikan' })));
    await Promise.all(['open', 'upcoming', 'closed'].map((status) => setDoc(doc(store, 'sessions', status), {
      ...session, status, participantIds: ['caesar', 'other'], labId: 'lab-a', qrToken: '0123456789abcdef',
    })));
  });
});
after(async () => { await env?.cleanup(); });

const enrollment = (uid = 'assistant') => service(db(uid), uid, 'src/services/enrollment-service.ts');

test('SRS-28: rules menolak presensi tanpa lokasi dan menghitung radius sendiri', async () => {
  const store = db();
  const ref = doc(store, 'attendance', 'open_caesar');
  const old = attendance();
  delete old.location;
  await assertFails(setDoc(ref, old));
  for (const [latitude, longitude] of [[lab.latitude + 0.01, lab.longitude], [lab.latitude + 0.0007, lab.longitude + 0.0007]]) {
    await assertFails(setDoc(ref, { ...attendance(), location: { ...attendance().location, point: new firestore.GeoPoint(latitude, longitude) } }));
  }
  await assertSucceeds(setDoc(ref, attendance()));
});

test('SRS-28: lokasi lama, masa depan, akurasi buruk dan lab palsu ditolak server', async () => {
  const ref = doc(db(), 'attendance', 'open_caesar');
  for (const location of [
    { ...attendance().location, accuracy: 51 },
    { ...attendance().location, observedAt: firestore.Timestamp.fromMillis(Date.now() - 60000) },
    { ...attendance().location, observedAt: firestore.Timestamp.fromMillis(Date.now() + 60000) },
  ]) await assertFails(setDoc(ref, { ...attendance(), location }));
  await assertFails(setDoc(ref, { ...attendance(), labId: 'fake-lab' }));
  await assertFails(setDoc(ref, { ...attendance(), location: { ...attendance().location, mocked: true } }));
});

test('SRS-28: radius sesi lebih kecil ditegakkan service dan rules', async () => {
  await updateDoc(doc(db('assistant'), 'sessions', 'open'), { attendanceRadiusMeters: 20 });
  const position = { ...evidence().position, latitude: lab.latitude + 0.0003 };
  await assert.rejects(service(db()).recordParticipation('open', undefined, { method: 'location', position }), /luar radius/);
  await assertFails(setDoc(doc(db(), 'attendance', 'open_caesar'), {
    ...attendance(), location: { ...attendance().location, point: new firestore.GeoPoint(position.latitude, position.longitude) },
  }));
});

test('SRS-28: lab belum dikonfigurasi dan bukti lokasi hilang tidak boleh fallback dummy', async () => {
  await assert.rejects(service(db()).recordParticipation('open'), /Lokasi perangkat/);
  await updateDoc(doc(db('assistant'), 'sessions', 'open'), { labId: 'missing-lab' });
  await assert.rejects(service(db()).recordParticipation('open', undefined, evidence()), /tidak ditemukan/);
  await assertFails(setDoc(doc(db(), 'attendance', 'open_caesar'), attendance()));
});

test('SRS-31: QR benar tersimpan dengan validasi lokasi; QR salah atau dirotasi ditolak', async () => {
  const ref = doc(db(), 'attendance', 'open_caesar');
  await assertFails(setDoc(ref, { ...attendance(), method: 'qr', qrToken: 'wrong_token_value' }));
  const qr = { type: 'hadirin.attendance', version: 1, sessionId: 'open', token: '0123456789abcdef' };
  await assert.rejects(service(db()).recordParticipation('open', undefined, { ...evidence(), method: 'qr', qr: { ...qr, sessionId: 'upcoming' } }), /tidak sesuai/);
  await assertSucceeds(service(db()).recordParticipation('open', undefined, { ...evidence(), method: 'qr', qr }));
  assert.equal((await getDoc(ref)).data().method, 'qr');
});

test('SRS-31: kode QR tidak melewati status, radius, maupun antiduplikasi', async () => {
  const qr = { type: 'hadirin.attendance', version: 1, sessionId: 'open', token: '0123456789abcdef' };
  await assert.rejects(service(db()).recordParticipation('open', undefined, { method: 'qr', qr,
    position: { ...evidence().position, latitude: 0 } }), /luar radius/);
  const results = await Promise.allSettled([
    service(db()).recordParticipation('open', undefined, { ...evidence(), method: 'qr', qr }),
    service(db()).recordParticipation('open', undefined, evidence()),
  ]);
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
  await assertFails(setDoc(doc(db('other'), 'attendance', 'closed_other'), { ...attendance('other', 'closed'), method: 'qr', qrToken: qr.token }));
});

test('SRS-30: push token hanya dapat ditulis pemilik profil dengan bentuk list terbatas', async () => {
  await assertSucceeds(updateDoc(doc(db(), 'users', 'caesar'), { expoPushTokens: ['ExpoPushToken[test_token_123456]'] }));
  await assertFails(updateDoc(doc(db('other'), 'users', 'caesar'), { expoPushTokens: ['ExpoPushToken[foreign_token_1234]'] }));
  await assertFails(updateDoc(doc(db(), 'users', 'caesar'), { expoPushTokens: 'not-a-list' }));
  await assertFails(updateDoc(doc(db(), 'users', 'caesar'), { expoPushTokens: Array(21).fill('too-many') }));
});

test('akun lama melengkapi NIM string sekali; angka nol awal dipertahankan', async () => {
  const api = enrollment('caesar');
  assert.equal(await api.saveOwnNim(' 00123456789012 '), '00123456789012');
  assert.equal((await getDoc(doc(db(), 'users', 'caesar'))).data().nim, '00123456789012');
  assert.equal(await api.saveOwnNim('00123456789012'), '00123456789012');
  await assert.rejects(api.saveOwnNim('98765432109876'));
  await assert.rejects(api.saveOwnNim('  '));
});

test('rules menolak NIM angka, perubahan NIM tersimpan, serta perubahan profil orang lain', async () => {
  const own = doc(db(), 'users', 'caesar');
  await assertFails(updateDoc(own, { nim: 123456789 }));
  await assertSucceeds(updateDoc(own, { nim: '24060124120051' }));
  await assertFails(updateDoc(own, { nim: '98765432109876' }));
  await assertFails(updateDoc(own, { nim: firestore.deleteField() }));
  await assertFails(updateDoc(doc(db('other'), 'users', 'caesar'), { nim: '11122233344455' }));
  await assertSucceeds(updateDoc(own, { name: 'Caesar' }));
  await assertFails(updateDoc(own, { role: 'asisten' }));
});

test('asisten menambah peserta dari NIM ke UID pada sesi lama, lalu praktikan bisa presensi', async () => {
  await env.withSecurityRulesDisabled(async (context) => {
    await updateDoc(doc(context.firestore(), 'users', 'caesar'), { nim: '24060124120051', name: 'Caesar' });
    await setDoc(doc(context.firestore(), 'sessions', 'legacy-nim'), { ...session, status: 'open', labId: 'lab-a' });
  });
  const api = enrollment();
  assert.equal((await api.findPractitionerByNim('24060124120051')).uid, 'caesar');
  assert.equal((await api.enrollPractitionerByNim('legacy-nim', '24060124120051', 'caesar')).alreadyEnrolled, false);
  assert.equal((await api.enrollPractitionerByNim('legacy-nim', '24060124120051', 'caesar')).alreadyEnrolled, true);
  assert.deepEqual((await getDoc(doc(db(), 'sessions', 'legacy-nim'))).data().participantIds, ['caesar']);
  await assertSucceeds(service(db()).recordParticipation('legacy-nim', undefined, evidence()));
});

test('pencarian NIM ganda dan NIM tidak terdaftar tidak memilih akun secara diam-diam', async () => {
  await env.withSecurityRulesDisabled(async (context) => {
    await Promise.all(['caesar', 'other'].map((uid) => updateDoc(doc(context.firestore(), 'users', uid), { nim: '24060124120051' })));
  });
  await assert.rejects(enrollment().findPractitionerByNim('24060124120051'), /beberapa akun/);
  await assert.rejects(enrollment().findPractitionerByNim('00000000000000'), /belum ditemukan/);
});

test('praktikan tidak dapat mencari direktori NIM atau mendaftarkan dirinya ke sesi', async () => {
  await env.withSecurityRulesDisabled(async (context) => {
    await updateDoc(doc(context.firestore(), 'users', 'caesar'), { nim: '24060124120051' });
  });
  await assert.rejects(enrollment('caesar').findPractitionerByNim('24060124120051'));
  await assertFails(updateDoc(doc(db(), 'sessions', 'open'), { participantIds: ['caesar'] }));
});

test('pendaftaran dua NIM bersamaan tidak menimpa peserta sebelumnya', async () => {
  await env.withSecurityRulesDisabled(async (context) => {
    await updateDoc(doc(context.firestore(), 'users', 'caesar'), { nim: '24060124120051' });
    await updateDoc(doc(context.firestore(), 'users', 'other'), { nim: '98765432109876' });
    await setDoc(doc(context.firestore(), 'sessions', 'legacy-nim'), { ...session, status: 'open' });
  });
  const api = enrollment();
  await Promise.all([
    api.enrollPractitionerByNim('legacy-nim', '24060124120051', 'caesar'),
    api.enrollPractitionerByNim('legacy-nim', '98765432109876', 'other'),
  ]);
  assert.deepEqual((await getDoc(doc(db(), 'sessions', 'legacy-nim'))).data().participantIds.sort(), ['caesar', 'other']);
});

test('sesi lama tanpa participantIds tidak muncul, query peserta tetap sah', async () => {
  await env.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), 'sessions', 'legacy'), { ...session, status: 'open' });
  });
  const own = await assertSucceeds(getDocs(query(collection(db(), 'sessions'), where('participantIds', 'array-contains', 'caesar'))));
  assert.equal(own.size, 3);
  assert.equal(own.docs.some((item) => item.id === 'legacy'), false);
  const empty = await assertSucceeds(getDocs(query(collection(db('outsider'), 'sessions'), where('participantIds', 'array-contains', 'outsider'))));
  assert.equal(empty.size, 0);
});

test('UID tanpa profil pengguna ditolak meskipun autentikasi ada', async () => {
  await assertFails(getDocs(query(collection(db('missing-profile'), 'sessions'), where('participantIds', 'array-contains', 'missing-profile'))));
});

test('praktikan menyimpan presensi; server memberi timestamp', async () => {
  const ref = doc(db(), 'attendance', 'open_caesar');
  await assertSucceeds(setDoc(ref, attendance()));
  assert.ok((await getDoc(ref)).data().checkedInAt.toMillis() > 0);
});
test('service asli menolak klik paralel dan mengecek ulang sesi', async () => {
  const store = db();
  const api = service(store);
  const results = await Promise.allSettled([api.recordParticipation('open', undefined, evidence()), api.recordParticipation('open', undefined, evidence())]);
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
test('asisten dapat membuka dan menutup sesi; praktikan dilarang mengubah status (SRS-03 & SRS-15)', async () => {
  const sessionUpcoming = doc(db('assistant'), 'sessions', 'upcoming');
  await assertSucceeds(updateDoc(sessionUpcoming, { status: 'open' }));
  const dataOpened = (await getDoc(sessionUpcoming)).data();
  assert.equal(dataOpened.status, 'open');

  await assertSucceeds(updateDoc(sessionUpcoming, { status: 'closed' }));
  const dataClosed = (await getDoc(sessionUpcoming)).data();
  assert.equal(dataClosed.status, 'closed');

  // Praktikan mencoba mengubah status sesi ditolak
  await assertFails(updateDoc(doc(db('caesar'), 'sessions', 'open'), { status: 'closed' }));
});
test('asisten dapat memantau daftar kehadiran per sesi (SRS-04)', async () => {
  await setDoc(doc(db(), 'attendance', 'open_caesar'), attendance('caesar', 'open'));
  await setDoc(doc(db('other'), 'attendance', 'open_other'), attendance('other', 'open'));

  const assistantAttendance = await assertSucceeds(
    getDocs(query(collection(db('assistant'), 'attendance'), where('sessionId', '==', 'open')))
  );
  assert.equal(assistantAttendance.size, 2);
});
test('asisten dapat menambah, mengubah, dan menghapus sesi (SRS-13 & SRS-15)', async () => {
  const assistantStore = db('assistant');
  const newSessionRef = doc(assistantStore, 'sessions', 'session_new');
  
  // Create
  await assertSucceeds(setDoc(newSessionRef, {
    courseName: 'Basis Data Lanjut',
    className: 'TI-3B',
    dateLabel: 'Jumat, 20 November 2026',
    timeRange: '08.00–10.00 WIB',
    room: 'Lab Basis Data',
    assistantName: 'Fadhil',
    status: 'upcoming',
    participantIds: ['caesar'],
  }));

  // Update
  await assertSucceeds(updateDoc(newSessionRef, { room: 'Lab Multimedia' }));
  const updated = (await getDoc(newSessionRef)).data();
  assert.equal(updated.room, 'Lab Multimedia');

  // Delete
  await assertSucceeds(deleteDoc(newSessionRef));
  assert.equal((await getDoc(newSessionRef)).exists(), false);

  // Praktikan dilarang create / delete sesi
  await assertFails(setDoc(doc(db('caesar'), 'sessions', 'illegal_session'), {
    ...session,
    status: 'upcoming',
    participantIds: ['caesar'],
  }));
  await assertFails(deleteDoc(doc(db('caesar'), 'sessions', 'open')));
});
test('SRS-15: Penegakan ketat Security Rules sesi - praktikan hanya read-only jika peserta, dilarang mutasi data/status', async () => {
  const caesarStore = db('caesar');
  const outsiderStore = db('outsider');
  const unauthStore = env.unauthenticatedContext().firestore();

  // 1. Praktikan peserta boleh membaca sesi
  await assertSucceeds(getDoc(doc(caesarStore, 'sessions', 'open')));

  // 2. Praktikan BUKAN peserta dilarang membaca sesi
  await assertFails(getDoc(doc(outsiderStore, 'sessions', 'open')));

  // 3. User tanpa login dilarang membaca sesi
  await assertFails(getDoc(doc(unauthStore, 'sessions', 'open')));

  // 4. Praktikan dilarang mengubah status (buka/tutup sesi)
  await assertFails(updateDoc(doc(caesarStore, 'sessions', 'upcoming'), { status: 'open' }));
  await assertFails(updateDoc(doc(caesarStore, 'sessions', 'open'), { status: 'closed' }));

  // 5. Praktikan dilarang mengubah data/jadwal sesi (room, participantIds, dll)
  await assertFails(updateDoc(doc(caesarStore, 'sessions', 'open'), { room: 'Ruang Diretas' }));
  await assertFails(updateDoc(doc(caesarStore, 'sessions', 'open'), { participantIds: ['caesar', 'outsider'] }));

  // 6. Asisten tetap memiliki hak penuh
  await assertSucceeds(getDoc(doc(db('assistant'), 'sessions', 'open')));
  await assertSucceeds(updateDoc(doc(db('assistant'), 'sessions', 'open'), { room: 'Lab Resmi' }));
});

test('SRS-15: hak akses koleksi courses — asisten boleh tulis, praktikan hanya baca', async () => {
  const assistantDb = db('assistant');
  const caesarDb = db('caesar');
  const courseRef = doc(assistantDb, 'courses', 'c-mobile');

  // Asisten dapat membuat course
  await assertSucceeds(setDoc(courseRef, { name: 'Pemrograman Mobile', code: 'IF123' }));

  // Praktikan dapat membaca course
  await assertSucceeds(getDoc(doc(caesarDb, 'courses', 'c-mobile')));

  // Praktikan dilarang membuat atau mengubah course
  await assertFails(setDoc(doc(caesarDb, 'courses', 'c-hacked'), { name: 'Hacked', code: 'BAD' }));
  await assertFails(updateDoc(doc(caesarDb, 'courses', 'c-mobile'), { name: 'Diretas' }));
});
