import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { useAttendanceTheme } from '@/constants/attendance-theme';
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
  session,
  attendanceTime,
  onClose,
  onConfirm,
  onViewHistory,
}: AttendanceConfirmationModalProps) {
  const colors = useAttendanceTheme();

  if (phase === 'closed') {
    return null;
  }

  const isSuccess = phase === 'success';
  const isConfirm = phase === 'confirm';

  const heading = isConfirm
    ? 'Catat kehadiran sekarang?'
    : isSuccess
      ? 'Presensi berhasil dicatat'
      : phase === 'duplicate'
        ? 'Presensi sudah tercatat'
        : 'Sesi tidak tersedia';

  const message = isConfirm
    ? 'Pastikan identitas dan sesi di bawah sudah benar sebelum melanjutkan.'
    : isSuccess
      ? `Kehadiranmu tercatat pada ${attendanceTime ?? 'waktu sekarang'}.`
      : phase === 'duplicate'
        ? 'Kamu hanya dapat melakukan presensi satu kali untuk sesi ini.'
        : 'Presensi hanya dapat dilakukan ketika asisten membuka sesi.';

  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
      transparent
      visible>
      <View style={styles.modalRoot}>
        <Pressable
          accessibilityLabel="Tutup dialog presensi"
          accessibilityRole="button"
          onPress={onClose}
          style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlay }]}
        />

        <View
          accessibilityViewIsModal
          style={[
            styles.sheet,
            Platform.OS === 'web' && styles.sheetWeb,
            { backgroundColor: colors.surface },
          ]}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          <View
            style={[
              styles.symbol,
              {
                backgroundColor: isSuccess
                  ? colors.successSoft
                  : isConfirm
                    ? colors.primarySoft
                    : colors.dangerSoft,
              },
            ]}>
            <Text
              style={[
                styles.symbolText,
                {
                  color: isSuccess
                    ? colors.success
                    : isConfirm
                      ? colors.primary
                      : colors.danger,
                },
              ]}>
              {isSuccess ? '✓' : isConfirm ? '?' : '!'}
            </Text>
          </View>

          <Text style={[styles.heading, { color: colors.ink }]}>{heading}</Text>
          <Text style={[styles.message, { color: colors.inkMuted }]}>{message}</Text>

          <View
            style={[
              styles.sessionSummary,
              { backgroundColor: colors.background, borderColor: colors.border },
            ]}>
            <Text style={[styles.courseName, { color: colors.ink }]}>{session.courseName}</Text>
            <Text style={[styles.sessionMeta, { color: colors.inkMuted }]}>
              {session.className} · {session.timeRange}
            </Text>
          </View>

          {isConfirm ? (
            <View style={styles.actions}>
              <Pressable
                accessibilityRole="button"
                onPress={onClose}
                style={({ pressed }) => [
                  styles.secondaryButton,
                  { borderColor: colors.border, opacity: pressed ? 0.65 : 1 },
                ]}>
                <Text style={[styles.secondaryLabel, { color: colors.ink }]}>Batal</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={onConfirm}
                style={({ pressed }) => [
                  styles.primaryButton,
                  { backgroundColor: pressed ? colors.primaryPressed : colors.primary },
                ]}>
                <Text style={[styles.primaryLabel, { color: colors.background }]}>Catat kehadiran</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              accessibilityRole="button"
              onPress={isSuccess ? onViewHistory : onClose}
              style={({ pressed }) => [
                styles.fullButton,
                { backgroundColor: pressed ? colors.primaryPressed : colors.primary },
              ]}>
              <Text style={[styles.primaryLabel, { color: colors.background }]}>
                {isSuccess ? 'Lihat riwayat' : 'Mengerti'}
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingBottom: 28,
    paddingHorizontal: 24,
    paddingTop: 10,
  },
  sheetWeb: {
    alignSelf: 'center',
    borderRadius: 28,
    marginBottom: 40,
    maxWidth: 480,
    width: '94%',
  },
  handle: {
    alignSelf: 'center',
    borderRadius: 3,
    height: 5,
    marginBottom: 22,
    width: 44,
  },
  symbol: {
    alignItems: 'center',
    borderRadius: 25,
    height: 50,
    justifyContent: 'center',
    marginBottom: 16,
    width: 50,
  },
  symbolText: {
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 32,
  },
  heading: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
    lineHeight: 30,
  },
  message: {
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
  },
  sessionSummary: {
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 20,
    padding: 16,
  },
  courseName: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 21,
  },
  sessionMeta: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 24,
  },
  secondaryButton: {
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: 16,
  },
  primaryButton: {
    alignItems: 'center',
    borderRadius: 14,
    flex: 1.45,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: 16,
  },
  fullButton: {
    alignItems: 'center',
    borderRadius: 14,
    justifyContent: 'center',
    marginTop: 24,
    minHeight: 52,
    paddingHorizontal: 16,
  },
  primaryLabel: {
    fontSize: 15,
    fontWeight: '800',
  },
  secondaryLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
});
