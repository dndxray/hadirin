import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { auth } from '@/lib/firebase';
import { pushRegistrationGeneration, savePushToken, unregisterPushTokenForCurrentUser } from '@/services/push-registration';
import { notificationTarget } from '@/utils/notification-routing';
import { firebaseErrorMessage } from '@/utils/firebase-error';

export type PushStatus = { phase: 'not-requested' | 'denied' | 'ready' | 'error' | 'unsupported'; message: string; canAskAgain?: boolean };
export type ReceivedPush = { id: string; title: string; body: string; data: Record<string, unknown> };

async function sdk() {
  try { return await import('expo-notifications'); }
  catch { throw new Error('Modul notifikasi belum tersedia. Pasang development build Hadirin terbaru.'); }
}

export async function registerDeviceNotifications(uid: string, requestPermission: boolean): Promise<PushStatus> {
  const version = pushRegistrationGeneration();
  if (Platform.OS === 'web') return { phase: 'unsupported', message: 'Push Expo tidak didukung di browser. Gunakan development build Android/iOS untuk menerima push.' };
  if (Constants.appOwnership === 'expo') return { phase: 'unsupported', message: 'Gunakan development build Hadirin, bukan Expo Go, untuk menguji push notification.' };
  try {
    const notifications = await sdk();
    if (Platform.OS === 'android') await notifications.setNotificationChannelAsync('praktikum', {
      name: 'Kegiatan praktikum', importance: notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 150, 250], sound: true,
    });
    let permission = await notifications.getPermissionsAsync();
    const allowed = () => permission.granted || permission.ios?.status === notifications.IosAuthorizationStatus.PROVISIONAL;
    if (!allowed() && permission.canAskAgain && requestPermission) permission = await notifications.requestPermissionsAsync();
    if (!allowed()) {
      if (permission.status === 'denied') await unregisterPushTokenForCurrentUser();
      return { phase: permission.status === 'denied' ? 'denied' : 'not-requested', canAskAgain: permission.canAskAgain,
        message: permission.status === 'denied'
          ? 'Izin notifikasi ditolak. Izinkan notifikasi Hadirin di pengaturan perangkat, lalu periksa kembali.'
          : 'Aktifkan notifikasi untuk menerima pemberitahuan sesi dan keputusan izin.' };
    }
    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    if (typeof projectId !== 'string' || !projectId) throw new Error('Project ID Expo/EAS belum diatur pada konfigurasi aplikasi.');
    let timer: ReturnType<typeof setTimeout> | undefined;
    let token: Awaited<ReturnType<typeof notifications.getExpoPushTokenAsync>>;
    try {
      token = await Promise.race([
        notifications.getExpoPushTokenAsync({ projectId }),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error('Layanan token belum merespons dalam 15 detik. Periksa internet dan konfigurasi FCM/APNs, lalu coba lagi.')), 15_000);
        }),
      ]);
    } finally { if (timer) clearTimeout(timer); }
    await savePushToken(uid, token.data, version);
    return { phase: 'ready', message: 'Izin diberikan dan token perangkat tersimpan. Siap menerima push jika pengiriman dan kredensial layanan tim sudah dikonfigurasi.' };
  } catch (error) {
    const message = error && typeof error === 'object' && 'code' in error
      ? firebaseErrorMessage(error) : (error as Error)?.message;
    return { phase: 'error', message: `Notifikasi belum siap. ${message || 'Periksa koneksi, development build, dan konfigurasi FCM/APNs milik tim.'}` };
  }
}

export async function listenDeviceNotifications(onReceive: (push: ReceivedPush) => void,
  onResponse: (push: ReceivedPush) => void, onTokenChanged: () => void): Promise<() => void> {
  if (Platform.OS === 'web' || Constants.appOwnership === 'expo') return () => {};
  const notifications = await sdk();
  let disposed = false;
  const read = (notification: import('expo-notifications').Notification): ReceivedPush => ({
    id: notification.request.identifier,
    title: notification.request.content.title || 'Pemberitahuan praktikum',
    body: notification.request.content.body || '', data: notification.request.content.data ?? {},
  });
  notifications.setNotificationHandler({ handleNotification: async notification => {
    const uid = auth.currentUser?.uid;
    const accepted = !!uid && !!notificationTarget(notification.request.content.data, uid);
    return { shouldShowBanner: accepted, shouldShowList: accepted, shouldPlaySound: accepted, shouldSetBadge: false };
  } });
  const received = notifications.addNotificationReceivedListener(notification => { if (!disposed) onReceive(read(notification)); });
  const response = notifications.addNotificationResponseReceivedListener(event => {
    if (disposed) return;
    onResponse(read(event.notification));
    void notifications.clearLastNotificationResponseAsync().catch(() => {});
  });
  const token = notifications.addPushTokenListener(() => { if (!disposed) onTokenChanged(); });
  void notifications.getLastNotificationResponseAsync().then(async initial => {
    if (!disposed && initial) {
      onResponse(read(initial.notification));
      await notifications.clearLastNotificationResponseAsync();
    }
  }).catch(() => {});
  return () => { disposed = true; received.remove(); response.remove(); token.remove(); };
}
