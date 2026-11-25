import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { theme } from '../theme';

type Props = {
  visible: boolean;
  sessionId: string;
  courseName: string;
  className?: string;
  onClose: () => void;
};

/**
 * Payload QR yang dipindai praktikan (SRS-31).
 * Sepakati format ini dengan Caesar. Kalau nanti mau ditambah token,
 * tambahkan field di sini dan validasi di sisi scan.
 */
export function buildSessionQRPayload(sessionId: string) {
  return JSON.stringify({ app: 'hadirin', type: 'presensi', sessionId });
}

export function SessionQRModal({
  visible,
  sessionId,
  courseName,
  className,
  onClose,
}: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.title}>QR Code Presensi</Text>
          <Text style={styles.subtitle}>
            {courseName}
            {className ? ` — Kelas ${className}` : ''}
          </Text>

          <View style={styles.qrBox}>
            <QRCode
              value={buildSessionQRPayload(sessionId)}
              size={240}
              backgroundColor="#FFFFFF"
              color="#000000"
            />
          </View>

          <Text style={styles.hint}>
            Minta praktikan membuka halaman Presensi lalu memindai kode ini.
            Presensi tetap divalidasi dengan lokasi.
          </Text>

          <Pressable style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeText}>Tutup</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  sheet: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    alignItems: 'center',
  },
  title: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    color: theme.colors.text,
  },
  subtitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    marginTop: 4,
    marginBottom: theme.spacing.md,
    textAlign: 'center',
  },
  qrBox: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  hint: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: theme.spacing.md,
    lineHeight: 18,
  },
  closeButton: {
    marginTop: theme.spacing.md,
    alignSelf: 'stretch',
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
  },
  closeText: {
    color: '#fff',
    fontSize: theme.fontSize.md,
    fontWeight: '600',
  },
});