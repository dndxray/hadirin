import { collection, doc, getDocs, query, runTransaction, where } from 'firebase/firestore';

import { auth, db } from '@/lib/firebase';
import { normalizeNim, validateNim } from '@/utils/nim';
import { hasRole } from '@/utils/roles';

export type PractitionerAccount = { uid: string; nim: string; name: string; email: string };

// Pencarian akun memakai NIM apa adanya, karena data lama belum 14 digit.
function lookupNim(value: string) {
  const nim = value.trim();
  if (!/^[A-Za-z0-9][A-Za-z0-9._/-]{2,29}$/.test(nim)) {
    throw new Error('Format NIM tidak valid.');
  }
  if (!auth.currentUser) throw new Error('Silakan login terlebih dahulu.');
  return nim;
}

export async function saveOwnNim(value: string): Promise<string> {
  const invalid = validateNim(value);
  if (invalid) throw new Error(invalid);
  if (!auth.currentUser) throw new Error('Silakan login terlebih dahulu.');

  const uid = auth.currentUser.uid;
  const nim = normalizeNim(value);

  return runTransaction(db, async (transaction) => {
    const ref = doc(db, 'users', uid);
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists() || !hasRole(snapshot.data(), 'praktikan')) throw new Error('Profil praktikan tidak ditemukan.');
    const existing = snapshot.data().nim;
    if (existing === nim) return nim;
    transaction.update(ref, { nim });
    return nim;
  });
}

export async function findPractitionerByNim(value: string): Promise<PractitionerAccount> {
  const nim = lookupNim(value);
  const snapshot = await getDocs(query(collection(db, 'users'), where('nim', '==', nim)));
  const matches = snapshot.docs.filter((item) => hasRole(item.data(), 'praktikan'));
  if (!matches.length) throw new Error('Akun praktikan dengan NIM tersebut belum ditemukan. Minta praktikan melengkapi NIM di Profil.');
  if (matches.length > 1) throw new Error('NIM terdaftar pada beberapa akun. Pengelola perlu memperbaiki duplikasi sebelum peserta ditambahkan.');
  const account = matches[0];
  return { uid: account.id, nim, name: String(account.data().name || 'Praktikan'), email: String(account.data().email || '') };
}

export async function enrollPractitionerToClass(classId: string, value: string, expectedUid: string) {
  const account = await findPractitionerByNim(value);
  if (account.uid === auth.currentUser?.uid) throw new Error('Asisten tidak bisa menambahkan dirinya sendiri sebagai peserta.');
  if (account.uid !== expectedUid) throw new Error('Data akun berubah. Cari ulang NIM dan periksa identitasnya.');

  const alreadyEnrolled = await runTransaction(db, async (transaction) => {
    const classRef = doc(db, 'classes', classId);
    const [classDoc, profile] = await Promise.all([
      transaction.get(classRef), transaction.get(doc(db, 'users', account.uid)),
    ]);
    if (!classDoc.exists()) throw new Error('Kelas sudah dihapus.');
    if (!profile.exists() || !hasRole(profile.data(), 'praktikan') || profile.data().nim !== account.nim) {
      throw new Error('Identitas praktikan berubah. Cari ulang NIM.');
    }

    const roster: unknown = classDoc.data().participants ?? [];
    if (!Array.isArray(roster)) throw new Error('Daftar peserta kelas tidak valid. Hubungi pengelola.');
    if (roster.some((item: any) => String(item?.nim ?? '') === account.nim)) return true;

    transaction.update(classRef, { participants: [...roster, { nim: account.nim, name: account.name }] });
    return false;
  });

  return { account, alreadyEnrolled };
}

export async function enrollPractitionerByNim(sessionId: string, value: string, expectedUid: string) {
  const account = await findPractitionerByNim(value);
  if (account.uid === auth.currentUser?.uid) throw new Error('Asisten tidak bisa menambahkan dirinya sendiri sebagai peserta.');
  if (account.uid !== expectedUid) throw new Error('Data akun berubah. Cari ulang NIM dan periksa identitasnya.');
  const alreadyEnrolled = await runTransaction(db, async (transaction) => {
    const sessionRef = doc(db, 'sessions', sessionId);
    const [session, profile] = await Promise.all([
      transaction.get(sessionRef), transaction.get(doc(db, 'users', account.uid)),
    ]);
    if (!session.exists()) throw new Error('Sesi sudah dihapus.');
    if (!profile.exists() || !hasRole(profile.data(), 'praktikan') || profile.data().nim !== account.nim) throw new Error('Identitas praktikan berubah. Cari ulang NIM.');
    const ids: unknown = session.data().participantIds ?? [];
    if (!Array.isArray(ids) || ids.some((id) => typeof id !== 'string')) throw new Error('Daftar peserta sesi tidak valid. Hubungi pengelola.');
    if (ids.includes(account.uid)) return true;
    transaction.update(sessionRef, { participantIds: [...ids, account.uid] });
    return false;
  });
  return { account, alreadyEnrolled };
}
