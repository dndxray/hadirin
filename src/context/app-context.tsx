import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type PropsWithChildren,
} from 'react';

import { useAuth } from '@/context/auth-context';
import type { AppUser, Role } from '@/types/attendance';

type AppContextValue = {
  currentUser: AppUser | null;
  /** @deprecated Tidak dipakai lagi. Login dilakukan lewat Firebase di layar login. */
  login: (role: Role, userId?: string) => void;
  logout: () => void;
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: PropsWithChildren) {
  const { profile, logout: signOutFirebase } = useAuth();

  const currentUser = useMemo<AppUser | null>(
    () =>
      profile
        ? {
            id: profile.uid,
            name: profile.name,
            identifier: profile.email,
            role: profile.role,
          }
        : null,
    [profile],
  );

  const login = useCallback(() => {}, []);
  const logout = useCallback(() => {
    void signOutFirebase();
  }, [signOutFirebase]);

  const value = useMemo(
    () => ({ currentUser, login, logout }),
    [currentUser, login, logout],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useApp harus digunakan di dalam AppProvider.');
  }
  return ctx;
}