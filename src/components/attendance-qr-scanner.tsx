import { CameraView, useCameraPermissions } from 'expo-camera';
import { useEffect, useRef, useState } from 'react';
import { AppState, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { authColors } from '@/components/auth-ui';
import { StateView } from '@/components/state-view';
import type { AttendanceQr } from '@/types/sprint-three';
import { parseAttendanceQr } from '@/utils/attendance-location';

export default function AttendanceQrScanner({ sessionId, onScanned }: {
  sessionId: string; onScanned: (qr: AttendanceQr) => void;
}) {
  const [permission, requestPermission] = useCameraPermissions();
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState(AppState.currentState === 'active');
  const lock = useRef(false);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => setActive(state === 'active'));
    return () => subscription.remove();
  }, []);

  if (!permission) return <StateView kind="loading" title="Memeriksa izin kamera" />;
  if (!permission.granted) return <StateView kind="error" title="Izin kamera diperlukan"
    message={error || 'Kamera hanya dipakai untuk membaca QR sesi. Izinkan kamera di pengaturan aplikasi atau izin situs browser.'}
    actionLabel={permission.canAskAgain ? 'Izinkan kamera' : 'Buka pengaturan'}
    onAction={() => {
      setError(null);
      if (permission.canAskAgain) void requestPermission().catch(() => setError('Izin kamera gagal diminta. Periksa pengaturan kamera.'));
      else if (Platform.OS !== 'web') void Linking.openSettings().catch(() => setError('Buka pengaturan perangkat secara manual.'));
      else setError('Buka ikon izin situs di address bar, izinkan kamera, lalu buka pemindai kembali.');
    }} />;

  return <View style={styles.content}>
    <Text style={styles.hint}>Arahkan kamera ke QR sesi dari asisten. Lokasi dan status sesi tetap akan diperiksa sebelum presensi disimpan.</Text>
    {active && !error ? <CameraView style={styles.camera} facing="back" barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
      accessibilityLabel="Kamera pemindai QR presensi"
      onMountError={() => setError('Kamera tidak dapat dibuka. Tutup aplikasi lain yang memakai kamera, lalu coba lagi.')}
      onBarcodeScanned={({ data }) => {
        if (lock.current) return;
        lock.current = true;
        try {
          const qr = parseAttendanceQr(data);
          if (qr.sessionId !== sessionId) throw new Error('QR tidak sesuai dengan sesi yang dipilih. Pindai QR sesi ini.');
          onScanned(qr);
        } catch (failure) { setError((failure as Error).message); }
      }} /> : null}
    {!active ? <Text style={styles.hint}>Kembali ke aplikasi untuk melanjutkan pemindaian.</Text> : null}
    {error ? <View accessibilityRole="alert" style={styles.error}>
      <Text style={styles.errorText}>{error}</Text>
      <Pressable accessibilityRole="button" style={styles.retry} onPress={() => { lock.current = false; setError(null); }}>
        <Text style={styles.retryText}>Pindai ulang</Text>
      </Pressable>
    </View> : null}
  </View>;
}

const styles = StyleSheet.create({
  content: { gap: 16 }, hint: { color: authColors.ink, fontSize: 15, lineHeight: 23 },
  camera: { width: '100%', height: 320, borderRadius: 12, overflow: 'hidden' },
  error: { gap: 12, padding: 16, backgroundColor: authColors.dangerSoft, borderRadius: 12 },
  errorText: { color: '#991B1B', fontSize: 15, lineHeight: 23 },
  retry: { minHeight: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: authColors.navy, borderRadius: 12 },
  retryText: { color: authColors.white, fontWeight: '700' },
});
