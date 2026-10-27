import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';

import { DUMMY_USERS, usersByRole } from '@/data/dummy-attendance';
import type { AppUser, Role } from '@/types/attendance';

type AppContextValue = {
  currentUser: AppUser | null;
  // userId opsional: bila kosong atau tidak ditemukan, pakai pengguna default peran itu
  login: (role: Role, userId?: string) => void;
  logout: () => void;
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: PropsWithChildren) {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);

  const login = useCallback((role: Role, userId?: string) => {
    const user =
      usersByRole[role].find((u) => u.id === userId) ?? DUMMY_USERS[role];
    setCurrentUser(user);
  }, []);
  const logout = useCallback(() => setCurrentUser(null), []);

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