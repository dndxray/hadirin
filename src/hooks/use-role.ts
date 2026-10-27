import { useGlobalSearchParams } from 'expo-router';
import { Platform } from 'react-native';

export type Role = 'asisten' | 'praktikan';

const KEY = 'hadirin-role';
let lastRole: Role = 'praktikan';

function load(): Role | null {
  if (Platform.OS !== 'web' || typeof sessionStorage === 'undefined') return null;
  const v = sessionStorage.getItem(KEY);
  return v === 'asisten' || v === 'praktikan' ? v : null;
}

function save(role: Role) {
  if (Platform.OS !== 'web' || typeof sessionStorage === 'undefined') return;
  sessionStorage.setItem(KEY, role);
}

export function useRole(): Role {
  const { role } = useGlobalSearchParams<{ role?: string }>();

  if (role === 'asisten' || role === 'praktikan') {
    lastRole = role;
    save(role);
  } else {
    lastRole = load() ?? lastRole;
  }

  return lastRole;
}

export function clearRole() {
  lastRole = 'praktikan';
  if (Platform.OS === 'web' && typeof sessionStorage !== 'undefined') {
    sessionStorage.removeItem(KEY);
  }
}