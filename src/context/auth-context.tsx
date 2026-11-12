import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';

import { auth, db } from '@/lib/firebase';
import type { Role } from '@/types/attendance';

export type Profile = {
  uid: string;
  name: string;
  email: string;
  role: Role;
};

type AuthContextValue = {
  firebaseUser: User | null;
  profile: Profile | null;
  loading: boolean;
  register: (name: string, email: string, password: string, role: Role) => Promise<Profile>;
  login: (email: string, password: string) => Promise<Profile>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function fetchProfile(uid: string): Promise<Profile | null> {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return null;
  const d = snap.data();
  return { uid, name: d.name, email: d.email, role: d.role };
}

export function authErrorMessage(error: unknown): string {
  const code = (error as { code?: string })?.code ?? '';
  switch (code) {
    case 'auth/email-already-in-use':
      return 'Email sudah terdaftar. Silakan masuk.';
    case 'auth/invalid-email':
      return 'Format email tidak valid.';
    case 'auth/weak-password':
      return 'Kata sandi terlalu lemah (minimal 6 karakter).';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Email atau kata sandi salah.';
    case 'auth/too-many-requests':
      return 'Terlalu banyak percobaan. Coba lagi nanti.';
    case 'auth/network-request-failed':
      return 'Koneksi bermasalah. Periksa internetmu.';
    default:
      return 'Terjadi kesalahan. Coba lagi.';
  }
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  // Saat registrasi, profil ditulis manual, jadi listener tidak boleh menimpanya.
  const registering = useRef(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (!user) {
        setProfile(null);
        setLoading(false);
        return;
      }
      if (registering.current) return;
      try {
        setProfile(await fetchProfile(user.uid));
      } catch {
        setProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const register = useCallback(
    async (name: string, email: string, password: string, role: Role) => {
      registering.current = true;
      try {
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        const data = { name: name.trim(), email: email.trim(), role };
        await setDoc(doc(db, 'users', cred.user.uid), {
          ...data,
          createdAt: serverTimestamp(),
        });
        const created: Profile = { uid: cred.user.uid, ...data };
        setProfile(created);
        setLoading(false);
        return created;
      } finally {
        registering.current = false;
      }
    },
    [],
  );

  const login = useCallback(async (email: string, password: string) => {
    const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
    const p = await fetchProfile(cred.user.uid);
    if (!p) {
      await signOut(auth);
      throw new Error('Profil akun tidak ditemukan.');
    }
    setProfile(p);
    return p;
  }, []);

  const logout = useCallback(async () => {
    await signOut(auth);
    setProfile(null);
  }, []);

  const value = useMemo(
    () => ({ firebaseUser, profile, loading, register, login, logout }),
    [firebaseUser, profile, loading, register, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth harus digunakan di dalam AuthProvider.');
  return ctx;
}