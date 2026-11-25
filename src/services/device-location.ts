import type { DevicePosition } from '@/types/sprint-three';

export class LocationAccessError extends Error {
  constructor(public readonly code: 'denied' | 'blocked' | 'services-off' | 'unavailable' | 'timeout', message: string) {
    super(message);
    this.name = 'LocationAccessError';
  }
}

export async function acquireDevicePosition(signal?: AbortSignal): Promise<DevicePosition> {
  let location: typeof import('expo-location');
  try { location = await import('expo-location'); }
  catch { throw new LocationAccessError('unavailable', 'Modul lokasi belum tersedia. Pasang development build Hadirin terbaru.'); }
  try {
    let permission = await location.getForegroundPermissionsAsync();
    if (!permission.granted && permission.canAskAgain) permission = await location.requestForegroundPermissionsAsync();
    if (!permission.granted) {
      throw new LocationAccessError(permission.canAskAgain ? 'denied' : 'blocked',
        'Izin lokasi ditolak. Izinkan lokasi presisi Hadirin di pengaturan perangkat atau izin situs browser, lalu coba lagi.');
    }
    if (!await location.hasServicesEnabledAsync()) {
      throw new LocationAccessError('services-off', 'Layanan lokasi/GPS mati. Aktifkan lokasi perangkat, lalu periksa kembali.');
    }
    let timer: ReturnType<typeof setTimeout> | undefined;
    let subscription: import('expo-location').LocationSubscription | undefined;
    let stopped = false;
    let onAbort: (() => void) | undefined;
    const stop = () => {
      stopped = true;
      subscription?.remove();
      subscription = undefined;
    };
    try {
      const position = await new Promise<import('expo-location').LocationObject>((resolve, reject) => {
          onAbort = () => reject(new LocationAccessError('unavailable', 'Pemeriksaan lokasi dibatalkan. Kembali ke halaman Presensi lalu periksa lokasi lagi.'));
          if (signal?.aborted) { onAbort(); return; }
          signal?.addEventListener('abort', onAbort, { once: true });
          timer = setTimeout(() => reject(new LocationAccessError('timeout',
            'Koordinat belum ditemukan dalam 20 detik. Periksa GPS, pindah ke area terbuka, lalu coba lagi.')), 20_000);
          void location.watchPositionAsync({ accuracy: location.Accuracy.Highest, mayShowUserSettingsDialog: false },
            resolve, () => reject(new LocationAccessError('unavailable', 'Koordinat belum tersedia. Periksa lokasi presisi dan GPS lalu coba lagi.')))
            .then(value => { if (stopped) value.remove(); else subscription = value; }, reject);
      });
      return { latitude: position.coords.latitude, longitude: position.coords.longitude,
        accuracy: position.coords.accuracy, timestamp: position.timestamp, mocked: position.mocked === true };
    } finally {
      stop();
      if (timer) clearTimeout(timer);
      if (onAbort) signal?.removeEventListener('abort', onAbort);
    }
  } catch (error) {
    if (error instanceof LocationAccessError) throw error;
    throw new LocationAccessError('unavailable', 'Koordinat belum tersedia. Periksa izin lokasi presisi, GPS, dan koneksi perangkat, lalu coba lagi.');
  }
}
