import { isDocumentId } from '@/utils/attendance-location';

export type NotificationTarget = { pathname: '/presensi'; params: { sessionId: string } } | { pathname: '/explore' };

export function notificationTarget(data: Record<string, unknown> | null | undefined, uid: string): NotificationTarget | null {
  if (!data || data.recipientId !== uid) return null;
  if (data.type === 'permission_decided') return { pathname: '/explore' };
  if ((data.type === 'session_opened' || data.type === 'session_updated') && isDocumentId(data.sessionId)) {
    return { pathname: '/presensi', params: { sessionId: data.sessionId } };
  }
  return null;
}

export function validExpoPushToken(value: unknown): value is string {
  return typeof value === 'string' && /^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]{10,200}\]$/.test(value);
}
