import { useApp } from '@/context/app-context';
import type { Role } from '@/types/attendance';

export type { Role };

export function useRole(): Role {
  return useApp().currentUser?.role ?? 'praktikan';
}