import type { Role } from '@/types/attendance';

type RoleOwner = { role?: unknown; roles?: unknown } | null | undefined;

export function roleList(owner: RoleOwner): Role[] {
  const result = new Set<Role>();

  if (owner?.role === 'praktikan' || owner?.role === 'asisten') {
    result.add(owner.role);
  }

  if (Array.isArray(owner?.roles)) {
    owner.roles.forEach((item) => {
      if (item === 'praktikan' || item === 'asisten') result.add(item);
    });
  }

  return Array.from(result);
}

export function hasRole(owner: RoleOwner, role: Role): boolean {
  return roleList(owner).includes(role);
}

export function roleLabel(role: Role): string {
  return role === 'asisten' ? 'Asisten' : 'Praktikan';
}
