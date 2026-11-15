import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  AccessibilityInfo,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  AttendanceConfirmationModal,
  type AttendanceModalPhase,
} from '@/components/attendance-confirmation-modal';
import { authColors } from '@/components/auth-ui';
import { StateView } from '@/components/state-view';
import { useApp } from '@/context/app-context';
import { useAttendance } from '@/context/attendance-context';
import { practiceSessions } from '@/data/dummy-attendance';
import type { SessionStatus } from '@/types/attendance';
import { initials } from '@/utils/home-format';
import { formatAttendanceTime } from '@/utils/attendance-format';

const STATUS: Record<SessionStatus, { label: string; bg: string; fg: string }> = {
  open: { label: 'Sesi sedang dibuka', bg: '#E6F6EC', fg: '#15803D' },
  upcoming: { label: 'Sesi belum dibuka', bg: '#EEF1F6', fg: '#64748B' },
  closed: { label: 'Sesi telah ditutup', bg: '#FEE2E2', fg: '#B91C1C' },
};

function splitTime(range: string) {
  const [start = '', end = ''] = range
    .replace('WIB', '')
    .split(/[–-]/)
    .map((s) => s.trim());
  return { start, end };
}

function goHome() {
  if (router.canGoBack()) router.back();
  else router.replace('/presensi');
}

export default function DetailSesiScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { currentUser } = useApp();
  const { checkIn, records, hasAttended } = useAttendance();
  const [modalPhase, setModalPhase] = useState<AttendanceModalPhase>('closed');

  const session = practiceSessions.find((item) => item.id === id);

  if (!session) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + 40, paddingHorizontal: 20 }]}>
        <View style={styles.inner}>
          <StateView
            kind="error"
            title="Sesi tidak ditemukan"
            message="Informasi jadwal praktikum ini tidak tersedia."
            actionLabel="Kembali"
            onAction={goHome}
          />
        </View>
      </View>
    );
  }

  const status = STATUS[session.status];
  const attended = hasAttended(session.id);
  const record = records.find(
    (r) => r.sessionId === session.id && r.practitionerId === currentUser?.id,
  );
  const { start, end } = splitTime(session.timeRange);
  const num = session.id.match(/(\d+)$/)?.[1];
  const sessionTitle = num ? `Sesi Praktikum ${num}` : 'Sesi Praktikum';

  const canCheckIn = session.status === 'open' && !attended;
  const buttonLabel = attended
    ? 'Presensi sudah tercatat'
    : session.status === 'open'
      ? 'Isi Presensi'
      : session.status === 'upcoming'
        ? 'Presensi belum dibuka'
        : 'Sesi telah ditutup';

  const confirmAttendance = () => {
    const result = checkIn(session.id);
    if (result === 'success') {
      setModalPhase('success');
      AccessibilityInfo.announceForAccessibility('Presensi berhasil dicatat.');
      return;
    }
    setModalPhase(result === 'already-recorded' ? 'duplicate' : 'unavailable');
  };

  const viewHistory = () => {
    setModalPhase('closed');
    router.push('/explore');
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
          <View style={[styles.inner, styles.headerRow]}>
            <Pressable style={styles.backButton} onPress={goHome} hitSlop={8}>
              <Ionicons name="chevron-back" size={20} color={authColors.white} />
            </Pressable>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {session.courseName}
              </Text>
              <View style={styles.metaRow}>
                <Ionicons name="time-outline" size={12} color="#B6C2DB" />
                <Text style={styles.metaText}>{session.timeRange}</Text>
                <Text style={styles.metaText}>·</Text>
                <Text style={styles.metaText}>{session.room}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.body}>
          <View style={styles.inner}>
            <View style={[styles.statusChip, { backgroundColor: status.bg }]}>
              <Text style={[styles.statusText, { color: status.fg }]}>{status.label}</Text>
            </View>

            <View style={styles.card}>
              <View style={styles.cardIcon}>
                <Ionicons name="calendar-outline" size={24} color={authColors.navy} />
              </View>
              <Text style={styles.dateLabel}>{session.dateLabel}</Text>
              <Text style={styles.sessionTitle}>{sessionTitle}</Text>

              <View style={styles.timeline}>
                <View style={styles.timeCol}>
                  <Text style={styles.timeLabel}>Mulai</Text>
                  <Text style={styles.timeValue}>{start}</Text>
                </View>
                <View style={styles.timeLine}>
                  <View style={styles.timeLineBar} />
                  <View style={styles.timeLineDot} />
                  <View style={styles.timeLineBar} />
                </View>
                <View style={styles.timeCol}>
                  <Text style={styles.timeLabel}>Selesai</Text>
                  <Text style={styles.timeValue}>{end}</Text>
                </View>
              </View>

              <View style={styles.divider} />

              <Text style={styles.assistLabel}>Asisten Praktikum</Text>
              <View style={styles.assistRow}>
                <View style={styles.assistAvatar}>
                  <Text style={styles.assistAvatarText}>{initials(session.assistantName)}</Text>
                </View>
                <Text style={styles.assistName}>{session.assistantName}</Text>
              </View>

              {attended && record ? (
                <View style={styles.recorded}>
                  <Ionicons name="checkmark-circle" size={18} color="#15803D" />
                  <Text style={styles.recordedText}>
                    Hadir, tercatat pukul {formatAttendanceTime(record.checkedInAt)}
                  </Text>
                </View>
              ) : null}

              <Pressable
                disabled={!canCheckIn}
                onPress={() => setModalPhase('confirm')}
                style={({ pressed }) => [
                  styles.button,
                  !canCheckIn && styles.buttonDisabled,
                  pressed && canCheckIn && { opacity: 0.85 },
                ]}
              >
                <Text style={[styles.buttonText, !canCheckIn && styles.buttonTextDisabled]}>
                  {buttonLabel}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </ScrollView>

      <AttendanceConfirmationModal
        attendanceTime={record ? formatAttendanceTime(record.checkedInAt) : undefined}
        onClose={() => setModalPhase('closed')}
        onConfirm={confirmAttendance}
        onViewHistory={viewHistory}
        phase={modalPhase}
        session={session}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: authColors.background },
  inner: { width: '100%', maxWidth: 560, alignSelf: 'center' },

  header: {
    backgroundColor: authColors.navy,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { color: authColors.white, fontSize: 20, fontWeight: '800' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
  metaText: { color: '#B6C2DB', fontSize: 11 },

  body: { paddingHorizontal: 20, paddingTop: 14 },
  statusChip: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: 14,
  },
  statusText: { fontSize: 11, fontWeight: '700' },

  card: {
    backgroundColor: authColors.white,
    borderRadius: 22,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#1B2A4E',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  cardIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#E8EEF9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateLabel: { color: authColors.muted, fontSize: 11, marginTop: 14 },
  sessionTitle: { color: authColors.ink, fontSize: 22, fontWeight: '800', marginTop: 4 },

  timeline: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    justifyContent: 'center',
    gap: 14,
    marginTop: 20,
  },
  timeCol: { alignItems: 'center' },
  timeLabel: { color: authColors.muted, fontSize: 11 },
  timeValue: { color: authColors.ink, fontSize: 20, fontWeight: '800', marginTop: 2 },
  timeLine: { flex: 1, maxWidth: 110, flexDirection: 'row', alignItems: 'center' },
  timeLineBar: { flex: 1, height: 1, backgroundColor: authColors.border },
  timeLineDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#22C55E',
    marginHorizontal: 4,
  },

  divider: {
    alignSelf: 'stretch',
    height: StyleSheet.hairlineWidth,
    backgroundColor: authColors.border,
    marginVertical: 18,
  },
  assistLabel: { alignSelf: 'flex-start', color: authColors.muted, fontSize: 11 },
  assistRow: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 10,
  },
  assistAvatar: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#DCE6FB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  assistAvatarText: { color: '#1D4ED8', fontWeight: '800', fontSize: 12 },
  assistName: { color: authColors.ink, fontWeight: '700', fontSize: 14 },

  recorded: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#E6F6EC',
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
  },
  recordedText: { color: '#15803D', fontSize: 12, fontWeight: '700', flex: 1 },

  button: {
    alignSelf: 'stretch',
    backgroundColor: authColors.navy,
    borderRadius: 14,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },
  buttonDisabled: { backgroundColor: '#E3E9F5' },
  buttonText: { color: authColors.white, fontSize: 16, fontWeight: '800' },
  buttonTextDisabled: { color: authColors.muted },
});