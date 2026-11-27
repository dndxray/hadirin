import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import type { AttendanceQr } from '@/types/sprint-three';
import { theme } from '../theme';

type Props = {
  visible: boolean;
  sessionId: string;
  /** Token QR milik sesi (field `qrToken` di dokumen sesi). Wajib sama dengan yang dicek saat presensi. */
  qrToken?: string;
  courseName: string;
  className?: string;
  onClose: () => void;
};

// Aturan token sama dengan parseAttendanceQr di utils/attendance-location.ts
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{16,128}$/;

/**
 * Payload QR yang dipindai praktikan (SRS-31).
 * Formatnya HARUS sama dengan AttendanceQr di types/sprint-three.ts
 * dan parseAttendanceQr di utils/attendance-location.ts.
 */
export function buildSessionQRPayload(sessionId: string, token: string) {
  const payload: AttendanceQr = {
    type: 'hadirin.attendance',
    version: 1,
    sessionId,
    token,
  };
  return JSON.stringify(payload);
}

export function SessionQRModal({
  visible,
  sessionId,
  qrToken,
  courseName,
  className,
  onClose,
}: Props) {
  const tokenValid = typeof qrToken === 'string' && TOKEN_PATTERN.test(qrToken);

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

          {tokenValid ? (
            <>
              <View style={styles.qrBox}>
                <QRCode
                  value={buildSessionQRPayload(sessionId, qrToken as string)}
                  size={240}
                  backgroundColor="#FFFFFF"
                  color="#000000"
                />
              </View>

              <Text style={styles.hint}>
                Minta praktikan membuka halaman Presensi lalu memindai kode ini.
                Presensi tetap divalidasi dengan lokasi.
              </Text>
            </>
          ) : (
            <View style={styles.warning}>
              <Text style={styles.warningTitle}>QR belum tersedia</Text>
              <Text style={styles.warningText}>
                Sesi ini belum punya token QR yang valid, jadi kode tidak dapat
                dibuat. Coba edit atau simpan ulang sesi, atau hubungi pengembang.
              </Text>
            </View>
          )}

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
  warning: {
    alignSelf: 'stretch',
    backgroundColor: '#FEF2F2',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    gap: 6,
  },
  warningTitle: { color: '#991B1B', fontSize: theme.fontSize.md, fontWeight: '700' },
  warningText: { color: '#991B1B', fontSize: theme.fontSize.sm, lineHeight: 20 },
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