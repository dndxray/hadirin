import { useGlobalSearchParams } from 'expo-router';

export type Role = 'asisten' | 'praktikan';

let lastRole: Role = 'praktikan';

export function useRole(): Role {
  const { role } = useGlobalSearchParams<{ role?: string }>();

  if (role === 'asisten' || role === 'praktikan') {
    lastRole = role;
  }

  return lastRole;
}