import { CameraView, useCameraPermissions } from 'expo-camera';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  visible: boolean;
  sessionId: string;
  onScanned: () => void;
  onClose: () => void;
};

export function AttendanceQRScannerModal({
  visible,
  sessionId,
  onScanned,
  onClose,
}: Props) {
  const [permission, requestPermission] = useCameraPermissions();

  if (!visible) return null;

  if (!permission?.granted) {
    return (
      <Modal visible transparent animationType="fade" onRequestClose={onClose}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <Text style={styles.title}>Izin Kamera</Text>
            <Text style={styles.message}>Aktifkan kamera untuk memindai QR presensi.</Text>
            <Pressable style={styles.primary} onPress={() => void requestPermission()}>
              <Text style={styles.primaryText}>Izinkan Kamera</Text>
            </Pressable>
            <Pressable style={styles.secondary} onPress={onClose}>
              <Text style={styles.secondaryText}>Batal</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.scannerOverlay}>
        <CameraView
          style={styles.camera}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={({ data }) => {
            try {
              const payload = JSON.parse(data);
              if (
                payload.app === 'hadirin' &&
                payload.type === 'presensi' &&
                payload.sessionId === sessionId
              ) {
                onScanned();
              }
            } catch {
              // Abaikan QR yang bukan milik sesi Hadirin.
            }
          }}
        />
        <View style={styles.scannerFooter}>
          <Text style={styles.scannerText}>Arahkan kamera ke QR Code sesi</Text>
          <Pressable style={styles.secondary} onPress={onClose}>
            <Text style={styles.secondaryText}>Batal</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(15,23,42,.65)', justifyContent: 'center', padding: 24 },
  sheet: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 20, alignItems: 'center' },
  title: { color: '#0F172A', fontSize: 18, fontWeight: '800' },
  message: { color: '#64748B', textAlign: 'center', marginTop: 8, marginBottom: 16 },
  primary: { backgroundColor: '#1B2A4E', borderRadius: 12, paddingVertical: 12, alignItems: 'center', alignSelf: 'stretch' },
  primaryText: { color: '#FFFFFF', fontWeight: '700' },
  secondary: { marginTop: 10, borderRadius: 12, paddingVertical: 10, alignItems: 'center', alignSelf: 'stretch' },
  secondaryText: { color: '#475569', fontWeight: '700' },
  scannerOverlay: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  scannerFooter: { backgroundColor: '#0F172A', padding: 16, paddingBottom: 32 },
  scannerText: { color: '#FFFFFF', textAlign: 'center', marginBottom: 4 },
});
