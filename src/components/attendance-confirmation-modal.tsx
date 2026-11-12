import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { authColors } from '@/components/auth-ui';
import type { PracticeSession } from '@/types/attendance';

export type AttendanceModalPhase = 'closed' | 'confirm' | 'success' | 'duplicate' | 'unavailable';

type AttendanceConfirmationModalProps = {
  phase: AttendanceModalPhase;
  session: PracticeSession;
  attendanceTime?: string;
  onClose: () => void;
  onConfirm: () => void;
  onViewHistory: () => void;
};

export function AttendanceConfirmationModal({
  phase,
  attendanceTime,
  onClose,
  onConfirm,
  onViewHistory,
}: AttendanceConfirmationModalProps) {
  const isConfirm = phase === 'confirm';
  const isSuccess = phase === 'success';
  const positive = isConfirm || isSuccess;

  const heading = isConfirm
    ? 'Konfirmasi Presensi'
    : isSuccess
      ? 'Presensi Berhasil'
      : phase === 'duplicate'
        ? 'Presensi Sudah Tercatat'
        : 'Sesi Tidak Tersedia';

  const message = isConfirm
    ? 'Apakah Anda yakin ingin melakukan presensi?'
    : isSuccess
      ? `Kehadiranmu tercatat pada ${attendanceTime ?? 'waktu sekarang'}.`
      : phase === 'duplicate'
        ? 'Kamu hanya dapat melakukan presensi satu kali untuk sesi ini.'
        : 'Presensi hanya dapat dilakukan ketika asisten membuka sesi.';

  const primaryLabel = isConfirm
    ? 'Ya, Presensi Sekarang'
    : isSuccess
      ? 'Lihat Riwayat'
      : 'Mengerti';
  const primaryAction = isConfirm ? onConfirm : isSuccess ? onViewHistory : onClose;

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
      transparent
      visible={phase !== 'closed'}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}} accessibilityViewIsModal>
          <View style={styles.grabber} />

          <View
            style={[
              styles.icon,
              { backgroundColor: positive ? '#E6F6EC' : authColors.dangerSoft },
            ]}
          >
            <Ionicons
              name={positive ? 'checkmark' : 'alert-circle-outline'}
              size={28}
              color={positive ? authColors.green : authColors.danger}
            />
          </View>

          <Text style={styles.heading}>{heading}</Text>
          <Text style={styles.message}>{message}</Text>

          <Pressable style={styles.primary} onPress={primaryAction}>
            <Text style={styles.primaryText}>{primaryLabel}</Text>
          </Pressable>

          {isConfirm || isSuccess ? (
            <Pressable style={styles.secondary} onPress={onClose}>
              <Text style={styles.secondaryText}>{isConfirm ? 'Nanti Saja' : 'Tutup'}</Text>
            </Pressable>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: authColors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 32,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    alignItems: 'center',
    gap: 10,
  },
  grabber: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: authColors.border,
    marginBottom: 8,
  },
  icon: {
    width: 60,
    height: 60,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heading: { color: authColors.ink, fontSize: 18, fontWeight: '800', marginTop: 6 },
  message: {
    color: authColors.muted,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginBottom: 10,
  },
  primary: {
    alignSelf: 'stretch',
    backgroundColor: authColors.navy,
    borderRadius: 14,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: { color: authColors.white, fontSize: 16, fontWeight: '800' },
  secondary: { paddingVertical: 10 },
  secondaryText: { color: authColors.muted, fontWeight: '700' },
});