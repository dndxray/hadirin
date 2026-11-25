import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createUserWithEmailAndPassword,
  deleteUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
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
import { saveOwnNim } from '@/services/enrollment-service';
import { unregisterPushTokenForCurrentUser } from '@/services/push-registration';
import { normalizeNim, validateNim } from '@/utils/nim';
import { roleList } from '@/utils/roles';

const ACTIVE_ROLE_KEY = 'hadirin.activeRole';

export type Profile = {
  uid: string;
  name: string;
  email: string;
  role: Role;
  roles: Role[];
  nim?: string;
  approvalStatus?: 'pending' | 'approved';
};

type AuthContextValue = {
  firebaseUser: User | null;
  profile: Profile | null;
  loading: boolean;
  register: (name: string, email: string, password: string, role: Role, nim?: string) => Promise<Profile>;
  saveNim: (nim: string) => Promise<void>;
  login: (email: string, password: string, role: Role) => Promise<Profile>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function readApproval(value: unknown): 'pending' | 'approved' | undefined {
  return value === 'pending' || value === 'approved' ? value : undefined;
}

async function fetchProfile(uid: string): Promise<Profile | null> {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return null;

  const data = snap.data();
  const roles = roleList(data);
  const approvalStatus = readApproval(data.approvalStatus);

  return {
    uid,
    name: data.name,
    email: data.email,
    role: roles[0] ?? 'praktikan',
    roles,
    ...(typeof data.nim === 'string' ? { nim: data.nim } : {}),
    ...(approvalStatus ? { approvalStatus } : {}),
  };
}

async function withActiveRole(profile: Profile): Promise<Profile> {
  const stored = await AsyncStorage.getItem(ACTIVE_ROLE_KEY);
  if (stored === 'praktikan' || stored === 'asisten') {
    if (profile.roles.includes(stored)) return { ...profile, role: stored };
  }
  await AsyncStorage.setItem(ACTIVE_ROLE_KEY, profile.role);
  return profile;
}

async function rememberRole(role: Role) {
  await AsyncStorage.setItem(ACTIVE_ROLE_KEY, role);
}

async function addRoleToAccount(
  email: string,
  password: string,
  role: Role,
  nim?: string,
): Promise<Profile> {
  const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
  const base = await fetchProfile(cred.user.uid);

  if (!base) {
    await signOut(auth);
    throw new Error('Profil akun tidak ditemukan.');
  }

  if (base.roles.includes(role)) {
    await signOut(auth);
    throw new Error(
      role === 'asisten'
        ? 'Akun ini sudah terdaftar sebagai asisten.'
        : 'Akun ini sudah terdaftar sebagai praktikan.',
    );
  }

  if (role === 'praktikan' && !base.nim) {
    const invalid = validateNim(nim ?? '');
    if (invalid) {
      await signOut(auth);
      throw new Error(invalid);
    }
  }

  const roles = [...base.roles, role];
  const patch: Record<string, unknown> = {
    roles,
    approvalStatus: role === 'asisten' ? 'pending' : 'approved',
  };
  if (role === 'praktikan' && !base.nim && nim) patch.nim = normalizeNim(nim);

  try {
    await updateDoc(doc(db, 'users', base.uid), patch);
  } catch (error) {
    await signOut(auth).catch(() => {});
    throw error;
  }

  const next: Profile = {
    ...base,
    role,
    roles,
    approvalStatus: patch.approvalStatus as 'pending' | 'approved',
    ...(typeof patch.nim === 'string' ? { nim: patch.nim } : {}),
  };

  await rememberRole(role);
  return next;
}

export function authErrorMessage(error: unknown): string {
  const code = (error as { code?: string })?.code ?? '';
  const msg = (error as { message?: string })?.message ?? '';

  console.error('FIREBASE ERROR ASLI:', error);

  switch (code) {
    case 'auth/email-already-in-use':
      return 'Email sudah terdaftar. Silakan masuk.';
    case 'auth/invalid-email':
      return 'Format email tidak valid.';
    case 'auth/weak-password':
      return 'Kata sandi terlalu lemah (minimal 6 karakter).';
    case 'auth/operation-not-allowed':
      return 'Metode Email/Password belum diaktifkan di Firebase.';
    case 'permission-denied':
      return `Gagal Firestore: ${msg}`;
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Email atau kata sandi salah.';
    case 'auth/too-many-requests':
      return 'Terlalu banyak percobaan. Coba lagi nanti.';
    case 'auth/network-request-failed':
      return 'Koneksi bermasalah. Periksa internetmu.';
    default:
      return `Error: ${code} - ${msg}`;
  }
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
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
        const next = await fetchProfile(user.uid);
        setProfile(next ? await withActiveRole(next) : null);
      } catch {
        setProfile(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const register = useCallback(
    async (name: string, email: string, password: string, role: Role, nim?: string) => {
      if (role === 'praktikan') {
        const invalid = validateNim(nim ?? '');
        if (invalid) throw new Error(invalid);
      }

      registering.current = true;
      try {
        let cred;

        try {
          cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        } catch (error) {
          if ((error as { code?: string })?.code !== 'auth/email-already-in-use') throw error;
          const added = await addRoleToAccount(email, password, role, nim);
          setProfile(added);
          return added;
        }

        const data: Omit<Profile, 'uid'> = {
          name: name.trim(),
          email: email.trim(),
          role,
          roles: [role],
          ...(role === 'praktikan' ? { nim: normalizeNim(nim!) } : {}),
          approvalStatus: role === 'asisten' ? 'pending' : 'approved',
        };

        try {
          await setDoc(doc(db, 'users', cred.user.uid), {
            ...data,
            createdAt: serverTimestamp(),
          });
        } catch (error) {
          await deleteUser(cred.user).catch(() => {});
          throw error;
        }

        const created: Profile = { uid: cred.user.uid, ...data };
        await rememberRole(role);
        setProfile(created);
        return created;
      } finally {
        registering.current = false;
        setLoading(false);
      }
    },
    [],
  );

  const login = useCallback(async (email: string, password: string, role: Role) => {
    const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
    const base = await fetchProfile(cred.user.uid);

    if (!base) {
      await signOut(auth);
      throw new Error('Profil akun tidak ditemukan.');
    }

    if (!base.roles.includes(role)) {
      await signOut(auth);
      throw new Error(
        role === 'asisten'
          ? 'Akun ini belum terdaftar sebagai asisten. Tambahkan peran asisten lewat halaman Daftar.'
          : 'Akun ini belum terdaftar sebagai praktikan. Tambahkan peran praktikan lewat halaman Daftar.',
      );
    }

    const next: Profile = { ...base, role };
    await rememberRole(role);
    setProfile(next);
    return next;
  }, []);

  const logout = useCallback(async () => {
    await unregisterPushTokenForCurrentUser();
    await signOut(auth);
    await AsyncStorage.removeItem(ACTIVE_ROLE_KEY);
    setProfile(null);
  }, []);

  const saveNim = useCallback(async (value: string) => {
    const uid = auth.currentUser?.uid;
    const nim = await saveOwnNim(value);
    setProfile((current) => (current && current.uid === uid ? { ...current, nim } : current));
  }, []);

  const value = useMemo(
    () => ({ firebaseUser, profile, loading, register, login, logout, saveNim }),
    [firebaseUser, profile, loading, register, login, logout, saveNim],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth harus digunakan di dalam AuthProvider.');
  return ctx;
}
