import { router } from 'expo-router';
import { useState } from 'react';
import {
  AccessibilityInfo,
  Platform,
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
import { SessionStatusBadge } from '@/components/session-status-badge';
import { useAttendanceTheme } from '@/constants/attendance-theme';
import { BottomTabInset, MaxContentWidth } from '@/constants/theme';
import { useApp } from '@/context/app-context';
import { useAttendance } from '@/context/attendance-context';
import { practiceSessions } from '@/data/dummy-attendance';
import { formatAttendanceTime } from '@/utils/attendance-format';

export default function AttendanceScreen() {
  const colors = useAttendanceTheme();
  const insets = useSafeAreaInsets();
  const { currentUser } = useApp();
  const { checkIn, records, hasAttended } = useAttendance();
  const [modalPhase, setModalPhase] = useState<AttendanceModalPhase>('closed');

  const paddingTop = Platform.OS === 'web' ? 100 : insets.top + 20;

  const activeSession =
    practiceSessions.find((session) => session.status === 'open') ?? practiceSessions[0];
  const otherSessions = practiceSessions.filter((session) => session.id !== activeSession.id);
  const attended = hasAttended(activeSession.id);
  const attendanceRecord = records.find(
    (record) =>
      record.sessionId === activeSession.id &&
      record.practitionerId === currentUser?.id,
  );

  const confirmAttendance = () => {
    const result = checkIn(activeSession.id);

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
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop,
            paddingBottom: insets.bottom + BottomTabInset + 32,
          },
        ]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.contentWidth}>
          <View style={styles.header}>
            <View>
              <Text style={[styles.greeting, { color: colors.inkMuted }]}>Selamat datang,</Text>
              <Text style={[styles.practitionerName, { color: colors.ink }]}>
                {currentUser?.name}
              </Text>
            </View>
            <View
              accessibilityLabel={`Identitas ${currentUser?.identifier}`}
              style={[styles.avatar, { backgroundColor: colors.primarySoft }]}>
              <Text style={[styles.avatarText, { color: colors.primary }]}>
                {currentUser?.name.charAt(0)}
              </Text>
            </View>
          </View>

          <View style={styles.titleBlock}>
            <Text style={[styles.pageTitle, { color: colors.ink }]}>Sesi aktifmu</Text>
            <Text style={[styles.pageSubtitle, { color: colors.inkMuted }]}>
              Presensi tersedia selama asisten membuka sesi.
            </Text>
          </View>

          <View
            style={[
              styles.activeCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}>
            <View style={[styles.statusRail, { backgroundColor: colors.success }]} />
            <View style={styles.activeCardContent}>
              <SessionStatusBadge status={activeSession.status} />

              <Text style={[styles.courseName, { color: colors.ink }]}>
                {activeSession.courseName}
              </Text>
              <Text style={[styles.className, { color: colors.inkMuted }]}>
                {activeSession.className} · Asisten {activeSession.assistantName}
              </Text>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              <View style={styles.metadataGrid}>
                <View style={styles.metadataItem}>
                  <Text style={[styles.metadataLabel, { color: colors.inkMuted }]}>Waktu</Text>
                  <Text style={[styles.metadataValue, { color: colors.ink }]}>
                    {activeSession.timeRange}
                  </Text>
                </View>
                <View style={styles.metadataItem}>
                  <Text style={[styles.metadataLabel, { color: colors.inkMuted }]}>Ruangan</Text>
                  <Text style={[styles.metadataValue, { color: colors.ink }]}>
                    {activeSession.room}
                  </Text>
                </View>
              </View>
              <Text style={[styles.dateText, { color: colors.inkMuted }]}>
                {activeSession.dateLabel}
              </Text>

              {attended && attendanceRecord ? (
                <View style={[styles.recordedNote, { backgroundColor: colors.successSoft }]}>
                  <View style={[styles.checkCircle, { backgroundColor: colors.success }]}>
                    <Text style={[styles.checkText, { color: colors.background }]}>✓</Text>
                  </View>
                  <View style={styles.recordedCopy}>
                    <Text style={[styles.recordedTitle, { color: colors.success }]}>Sudah hadir</Text>
                    <Text style={[styles.recordedTime, { color: colors.inkMuted }]}>
                      Tercatat pukul {formatAttendanceTime(attendanceRecord.checkedInAt)}
                    </Text>
                  </View>
                </View>
              ) : null}

              <Pressable
                accessibilityHint={
                  attended
                    ? 'Presensi untuk sesi ini telah tercatat'
                    : 'Membuka konfirmasi pencatatan kehadiran'
                }
                accessibilityRole="button"
                accessibilityState={{ disabled: attended }}
                disabled={attended}
                onPress={() => setModalPhase('confirm')}
                style={({ pressed }) => [
                  styles.attendanceButton,
                  {
                    backgroundColor: attended ? colors.surfaceMuted : colors.primary,
                    opacity: pressed ? 0.82 : 1,
                  },
                ]}>
                <Text
                  style={[
                    styles.attendanceButtonText,
                    { color: attended ? colors.inkMuted : colors.background },
                  ]}>
                  {attended ? 'Presensi sudah tercatat' : 'Isi presensi sekarang'}
                </Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.otherSection}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.ink }]}>Jadwal praktikum</Text>
              <Pressable
                accessibilityRole="link"
                onPress={() => router.push('/jadwal')}
                style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
                <Text style={[styles.seeAll, { color: colors.primary }]}>Jadwal lainnya →</Text>
              </Pressable>
            </View>

            <View style={[styles.sessionList, { borderColor: colors.border }]}>
              {otherSessions.slice(0, 2).map((session, index, list) => (
                <Pressable
                  key={session.id}
                  accessibilityRole="button"
                  onPress={() =>
                    router.push({ pathname: '/detail-sesi', params: { id: session.id } })
                  }
                  style={({ pressed }) => [
                    styles.sessionRow,
                    index < list.length - 1 && {
                      borderBottomColor: colors.border,
                      borderBottomWidth: StyleSheet.hairlineWidth,
                    },
                    pressed && { opacity: 0.65 },
                  ]}>
                  <View style={styles.sessionRowCopy}>
                    <Text style={[styles.sessionRowName, { color: colors.ink }]}>
                      {session.courseName}
                    </Text>
                    <Text style={[styles.sessionRowMeta, { color: colors.inkMuted }]}>
                      {session.className} · {session.dateLabel}
                    </Text>
                    <Text style={[styles.sessionRowMeta, { color: colors.inkMuted }]}>
                      {session.timeRange} · {session.room}
                    </Text>
                  </View>
                  <SessionStatusBadge status={session.status} />
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>

      <AttendanceConfirmationModal
        attendanceTime={
          attendanceRecord ? formatAttendanceTime(attendanceRecord.checkedInAt) : undefined
        }
        onClose={() => setModalPhase('closed')}
        onConfirm={confirmAttendance}
        onViewHistory={viewHistory}
        phase={modalPhase}
        session={activeSession}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scrollContent: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  contentWidth: {
    maxWidth: MaxContentWidth,
    width: '100%',
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  greeting: {
    fontSize: 13,
    lineHeight: 18,
  },
  practitionerName: {
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 26,
  },
  avatar: {
    alignItems: 'center',
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  avatarText: {
    fontSize: 17,
    fontWeight: '800',
  },
  titleBlock: {
    marginBottom: 22,
    marginTop: 34,
  },
  pageTitle: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.8,
    lineHeight: 38,
  },
  pageSubtitle: {
    fontSize: 15,
    lineHeight: 22,
    marginTop: 6,
  },
  activeCard: {
    borderRadius: 24,
    borderWidth: 1,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  statusRail: {
    width: 6,
  },
  activeCardContent: {
    flex: 1,
    padding: 20,
  },
  courseName: {
    fontSize: 23,
    fontWeight: '800',
    letterSpacing: -0.4,
    lineHeight: 29,
    marginTop: 22,
  },
  className: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 5,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 20,
  },
  metadataGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  metadataItem: {
    flex: 1,
  },
  metadataLabel: {
    fontSize: 12,
    lineHeight: 17,
  },
  metadataValue: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 21,
    marginTop: 3,
  },
  dateText: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 12,
  },
  recordedNote: {
    alignItems: 'center',
    borderRadius: 14,
    flexDirection: 'row',
    marginTop: 20,
    padding: 13,
  },
  checkCircle: {
    alignItems: 'center',
    borderRadius: 16,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  checkText: {
    fontSize: 17,
    fontWeight: '900',
  },
  recordedCopy: {
    flex: 1,
    marginLeft: 11,
  },
  recordedTitle: {
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 19,
  },
  recordedTime: {
    fontSize: 12,
    lineHeight: 17,
  },
  attendanceButton: {
    alignItems: 'center',
    borderRadius: 15,
    justifyContent: 'center',
    marginTop: 20,
    minHeight: 54,
    paddingHorizontal: 20,
  },
  attendanceButtonText: {
    fontSize: 15,
    fontWeight: '800',
  },
  otherSection: {
    marginTop: 32,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: '800',
    lineHeight: 25,
  },
  seeAll: {
    fontSize: 13,
    fontWeight: '800',
  },
  sessionList: {
    borderBottomWidth: 1,
    borderTopWidth: 1,
  },
  sessionRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 14,
    paddingVertical: 16,
  },
  sessionRowCopy: {
    flex: 1,
  },
  sessionRowName: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 21,
  },
  sessionRowMeta: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },
});