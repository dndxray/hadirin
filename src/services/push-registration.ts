import AsyncStorage from '@react-native-async-storage/async-storage';
import { arrayRemove, arrayUnion, doc, updateDoc } from 'firebase/firestore';

import { auth, db } from '@/lib/firebase';
import { validExpoPushToken } from '@/utils/notification-routing';

const KEY = 'hadirin.push-registration';
let generation = 0;
let pendingWrite: Promise<void> | null = null;
let pendingCleanup: Promise<void> | null = null;

export function pushRegistrationGeneration() { return generation; }

export async function savePushToken(uid: string, token: string, expectedGeneration: number) {
  if (pendingCleanup) throw new Error('Notifikasi sedang dinonaktifkan. Tunggu proses selesai sebelum mendaftarkan perangkat kembali.');
  if (!validExpoPushToken(token)) throw new Error('Push token dari layanan Expo tidak valid. Coba daftar ulang notifikasi.');
  if (auth.currentUser?.uid !== uid || expectedGeneration !== generation) throw new Error('Akun berubah saat menyiapkan notifikasi. Coba lagi setelah login.');
  const previousRaw = await AsyncStorage.getItem(KEY);
  let previous: { uid?: string; token?: string; tokens?: string[] } | null = null;
  try { previous = previousRaw ? JSON.parse(previousRaw) : null; } catch { previous = null; }
  if (previous?.uid && previous.uid !== uid) {
    throw new Error('Token perangkat masih terhubung ke akun lain. Masuk ke akun sebelumnya, aktifkan notifikasi lalu logout dengan koneksi internet sebelum memakai akun baru.');
  }
  if (pendingCleanup || auth.currentUser?.uid !== uid || expectedGeneration !== generation) throw new Error('Pendaftaran notifikasi dibatalkan karena akun berubah.');
  const oldTokens = [...new Set([...(Array.isArray(previous?.tokens) ? previous.tokens : []), previous?.token].filter(validExpoPushToken))];
  const operation = (async () => {
    // Cache every possibly registered token before writing. Logout can clean up
    // even when a Firestore acknowledgement or a later local cache write fails.
    await AsyncStorage.setItem(KEY, JSON.stringify({ uid, tokens: [...new Set([...oldTokens, token])] }));
    const replaced = oldTokens.filter(value => value !== token);
    if (replaced.length) {
      await updateDoc(doc(db, 'users', uid), { expoPushTokens: arrayRemove(...replaced) });
    }
    await updateDoc(doc(db, 'users', uid), { expoPushTokens: arrayUnion(token) });
    await AsyncStorage.setItem(KEY, JSON.stringify({ uid, tokens: [token] }));
  })();
  pendingWrite = operation;
  try { await operation; } finally { if (pendingWrite === operation) pendingWrite = null; }
}

async function removeStoredTokens() {
  await pendingWrite?.catch(() => {});
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return;
  let saved: { uid?: string; token?: string; tokens?: string[] };
  try { saved = JSON.parse(raw); } catch { await AsyncStorage.removeItem(KEY); return; }
  if (!saved || typeof saved !== 'object') { await AsyncStorage.removeItem(KEY); return; }
  const tokens = [...new Set([...(Array.isArray(saved.tokens) ? saved.tokens : []), saved.token].filter(validExpoPushToken))];
  if (!saved.uid || !tokens.length) {
    await AsyncStorage.removeItem(KEY); return;
  }
  if (saved.uid !== auth.currentUser?.uid) return;
  try { await updateDoc(doc(db, 'users', saved.uid), { expoPushTokens: arrayRemove(...tokens) }); }
  catch (error) { if ((error as { code?: string }).code !== 'not-found') throw error; }
  await AsyncStorage.removeItem(KEY);
}

export async function unregisterPushTokenForCurrentUser() {
  if (!pendingCleanup) {
    generation += 1;
    const operation = removeStoredTokens();
    pendingCleanup = operation;
    const finish = () => { generation += 1; if (pendingCleanup === operation) pendingCleanup = null; };
    void operation.then(finish, finish);
  }
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      pendingCleanup,
      new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('Pelepasan token notifikasi belum selesai. Sambungkan internet lalu coba keluar kembali.')), 10_000); }),
    ]);
  } finally { if (timer) clearTimeout(timer); }
}
