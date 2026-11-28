import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createUserWithEmailAndPassword,
  deleteUser,
  EmailAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
  verifyBeforeUpdateEmail,
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
import { saveOwnNim } from '@/services/enrollment-service';
import { unregisterPushTokenForCurrentUser } from '@/services/push-registration';
import type { Role } from '@/types/attendance';
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
  avatarId?: string;
  avatarColor?: string;
};

export type ProfileUpdate = { name: string; avatarId: string; avatarColor: string };

export type AccountUpdate = {
  email?: string;
  newPassword?: string;
  currentPassword: string;
};

type AuthContextValue = {
  firebaseUser: User | null;
  profile: Profile | null;
  loading: boolean;
  register: (name: string, email: string, password: string, role: Role, nim?: string) => Promise<Profile>;
  saveNim: (nim: string) => Promise<void>;
  updateProfile: (patch: ProfileUpdate) => Promise<void>;
  updateAccount: (input: AccountUpdate) => Promise<void>;
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
    ...(typeof data.avatarId === 'string' ? { avatarId: data.avatarId } : {}),
    ...(typeof data.avatarColor === 'string' ? { avatarColor: data.avatarColor } : {}),
  };
}

async function withActiveRole(profile: Profile): Promise<Profile> {
  const stored = await AsyncStorage.getItem(ACTIVE_ROLE_KEY);
  if (stored === 'praktikan' || stored === 'asisten') {
    if (profile.roles.includes(stored)) return { ...profile, role: stored };
  }
  return profile;
}

async function syncProfileEmail(user: User, profile: Profile): Promise<Profile> {
  const { email, uid } = user;
  if (!email || profile.email === email) return profile;

  // Email di Auth bisa berubah setelah pengguna mengeklik tautan verifikasi.
  await updateDoc(doc(db, 'users', uid), { email }).catch(() => {});
  return { ...profile, email };
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
    case 'auth/requires-recent-login':
      return 'Sesi terlalu lama. Keluar lalu masuk kembali, kemudian coba lagi.';
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
  const authAction = useRef<'login' | 'register' | null>(null);
  const sessionRevision = useRef(0);

  useEffect(() => {
    let disposed = false;
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      // Login publishes the session only after validating the selected role.
      if (authAction.current === 'login' || user?.uid !== auth.currentUser?.uid) return;

      const revision = ++sessionRevision.current;
      setFirebaseUser(user);

      if (!user) {
        setProfile(null);
        setLoading(false);
        return;
      }

      if (authAction.current === 'register') return;

      let restored: Profile | null = null;
      try {
        const stored = await fetchProfile(user.uid);
        if (stored?.roles.length && !disposed && revision === sessionRevision.current) {
          restored = await withActiveRole(await syncProfileEmail(user, stored));
        }
      } catch {
        // Keep the app signed out if the saved profile cannot be restored.
      }
      if (disposed || revision !== sessionRevision.current || user.uid !== auth.currentUser?.uid) return;
      setProfile(restored);
      setLoading(false);
    });

    return () => {
      disposed = true;
      unsubscribe();
    };
  }, []);

  const register = useCallback(
    async (name: string, email: string, password: string, role: Role, nim?: string) => {
      if (role === 'praktikan') {
        const invalid = validateNim(nim ?? '');
        if (invalid) throw new Error(invalid);
      }

      if (authAction.current) throw new Error('Autentikasi sedang diproses.');
      authAction.current = 'register';
      sessionRevision.current++;
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
        authAction.current = null;
        setLoading(false);
      }
    },
    [],
  );

  const login = useCallback(async (email: string, password: string, role: Role) => {
    if (authAction.current) throw new Error('Autentikasi sedang diproses.');
    authAction.current = 'login';
    sessionRevision.current++;

    let user: User | undefined;
    try {
      const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
      user = credential.user;
      const base = await fetchProfile(user.uid);

      if (!base) throw new Error('Profil akun tidak ditemukan.');

      if (!base.roles.includes(role)) {
        throw new Error(
          role === 'asisten'
            ? 'Akun ini belum terdaftar sebagai asisten. Tambahkan peran asisten lewat halaman Daftar.'
            : 'Akun ini belum terdaftar sebagai praktikan. Tambahkan peran praktikan lewat halaman Daftar.',
        );
      }

      const next: Profile = { ...(await syncProfileEmail(user, base)), role };
      await rememberRole(role);
      if (auth.currentUser?.uid !== user.uid) {
        throw new Error('Sesi login berakhir. Masuk kembali.');
      }
      setFirebaseUser(user);
      setProfile(next);
      return next;
    } catch (error) {
      if (user) {
        setFirebaseUser(null);
        setProfile(null);
        if (auth.currentUser?.uid === user.uid) await signOut(auth);
      }
      throw error;
    } finally {
      authAction.current = null;
      setLoading(false);
    }
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

  const updateProfile = useCallback(async (patch: ProfileUpdate) => {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error('Sesi login berakhir. Masuk kembali.');
    await updateDoc(doc(db, 'users', uid), patch);
    setProfile((current) => (current && current.uid === uid ? { ...current, ...patch } : current));
  }, []);

  const updateAccount = useCallback(async (input: AccountUpdate) => {
    const user = auth.currentUser;
    if (!user?.email) throw new Error('Sesi login berakhir. Masuk kembali.');

    // Firebase mewajibkan login ulang untuk mengubah email/password
    const credential = EmailAuthProvider.credential(user.email, input.currentPassword);
    await reauthenticateWithCredential(user, credential);

    if (input.email && input.email.toLowerCase() !== user.email.toLowerCase()) {
      await verifyBeforeUpdateEmail(user, input.email);
    }
    if (input.newPassword) {
      await updatePassword(user, input.newPassword);
    }
  }, []);

  const value = useMemo(
    () => ({
      firebaseUser,
      profile,
      loading,
      register,
      login,
      logout,
      saveNim,
      updateProfile,
      updateAccount,
    }),
    [firebaseUser, profile, loading, register, login, logout, saveNim, updateProfile, updateAccount],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth harus digunakan di dalam AuthProvider.');
  return ctx;
}