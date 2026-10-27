import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAttendanceTheme } from '@/constants/attendance-theme';
import { BottomTabInset, MaxContentWidth } from '@/constants/theme';
import { useApp } from '@/context/app-context';
import { useAttendance } from '@/context/attendance-context';
import { practiceSessions } from '@/data/dummy-attendance';
import type { AttendanceRecord, PracticeSession } from '@/types/attendance';
import { formatAttendanceDate, formatAttendanceTime } from '@/utils/attendance-format';

type HistoryItem = {
  record: AttendanceRecord;
  session: PracticeSession;
};

export default function AttendanceHistoryScreen() {
  const colors = useAttendanceTheme();
  const insets = useSafeAreaInsets();
  const { currentUser } = useApp();
  const { records } = useAttendance();

  const history: HistoryItem[] = records
    .filter((record) => record.practitionerId === currentUser?.id)
    .map((record) => ({
      record,
      session: practiceSessions.find((session) => session.id === record.sessionId),
    }))
    .filter((item): item is HistoryItem => item.session !== undefined)
    .sort((first, second) => second.record.checkedInAt - first.record.checkedInAt);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + 20,
            paddingBottom: insets.bottom + BottomTabInset + 32,
          },
        ]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.contentWidth}>
          <Text style={[styles.pageTitle, { color: colors.ink }]}>Riwayat kehadiran</Text>
          <Text style={[styles.pageSubtitle, { color: colors.inkMuted }]}>
            Catatan presensi milik {currentUser?.name} selama aplikasi berjalan.
          </Text>

          <View
            style={[
              styles.summary,
              { backgroundColor: colors.primarySoft, borderColor: colors.border },
            ]}>
            <View>
              <Text style={[styles.summaryLabel, { color: colors.inkMuted }]}>Total kehadiran</Text>
              <Text style={[styles.summaryValue, { color: colors.primary }]}>{history.length}</Text>
            </View>
            <View style={styles.summaryIdentity}>
              <Text style={[styles.identityName, { color: colors.ink }]}>
                {currentUser?.name}
              </Text>
              <Text style={[styles.identityNumber, { color: colors.inkMuted }]}>
                {currentUser?.identifier}
              </Text>
            </View>
          </View>

          {history.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={[styles.emptySymbol, { backgroundColor: colors.surfaceMuted }]}>
                <Text style={[styles.emptySymbolText, { color: colors.inkMuted }]}>0</Text>
              </View>
              <Text style={[styles.emptyTitle, { color: colors.ink }]}>Belum ada presensi</Text>
              <Text style={[styles.emptyDescription, { color: colors.inkMuted }]}>
                Saat presensi berhasil, sesi yang kamu hadiri akan muncul di sini.
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push('/')}
                style={({ pressed }) => [
                  styles.emptyButton,
                  {
                    borderColor: colors.primary,
                    opacity: pressed ? 0.65 : 1,
                  },
                ]}>
                <Text style={[styles.emptyButtonText, { color: colors.primary }]}>Lihat sesi aktif</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.timelineSection}>
              <Text style={[styles.sectionTitle, { color: colors.ink }]}>Catatan terbaru</Text>
              <View>
                {history.map(({ record, session }, index) => (
                  <View key={record.id} style={styles.timelineRow}>
                    <View style={styles.timelineMarker}>
                      <View style={[styles.timelineDot, { backgroundColor: colors.success }]} />
                      {index < history.length - 1 ? (
                        <View style={[styles.timelineLine, { backgroundColor: colors.border }]} />
                      ) : null}
                    </View>

                    <View
                      style={[
                        styles.historyCard,
                        { backgroundColor: colors.surface, borderColor: colors.border },
                      ]}>
                      <View style={styles.historyHeading}>
                        <Text style={[styles.historyStatus, { color: colors.success }]}>Hadir</Text>
                        <Text style={[styles.historyTime, { color: colors.inkMuted }]}>
                          {formatAttendanceTime(record.checkedInAt)}
                        </Text>
                      </View>
                      <Text style={[styles.courseName, { color: colors.ink }]}>
                        {session.courseName}
                      </Text>
                      <Text style={[styles.historyMeta, { color: colors.inkMuted }]}>
                        {session.className} · {session.room}
                      </Text>
                      <Text style={[styles.historyDate, { color: colors.inkMuted }]}>
                        {formatAttendanceDate(record.checkedInAt)}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      </ScrollView>
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
  pageTitle: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.8,
    lineHeight: 38,
  },
  pageSubtitle: {
    fontSize: 15,
    lineHeight: 22,
    marginTop: 7,
  },
  summary: {
    alignItems: 'center',
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 28,
    padding: 20,
  },
  summaryLabel: {
    fontSize: 13,
    lineHeight: 18,
  },
  summaryValue: {
    fontSize: 38,
    fontWeight: '900',
    letterSpacing: -1,
    lineHeight: 44,
    marginTop: 2,
  },
  summaryIdentity: {
    alignItems: 'flex-end',
    flex: 1,
    marginLeft: 24,
  },
  identityName: {
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 22,
  },
  identityNumber: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 70,
  },
  emptySymbol: {
    alignItems: 'center',
    borderRadius: 34,
    height: 68,
    justifyContent: 'center',
    width: 68,
  },
  emptySymbolText: {
    fontSize: 25,
    fontWeight: '800',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 26,
    marginTop: 20,
  },
  emptyDescription: {
    fontSize: 14,
    lineHeight: 21,
    marginTop: 7,
    maxWidth: 330,
    textAlign: 'center',
  },
  emptyButton: {
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    marginTop: 22,
    minHeight: 48,
    paddingHorizontal: 20,
  },
  emptyButtonText: {
    fontSize: 14,
    fontWeight: '800',
  },
  timelineSection: {
    marginTop: 30,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: '800',
    lineHeight: 25,
    marginBottom: 16,
  },
  timelineRow: {
    flexDirection: 'row',
  },
  timelineMarker: {
    alignItems: 'center',
    marginRight: 13,
    width: 14,
  },
  timelineDot: {
    borderRadius: 7,
    height: 14,
    marginTop: 20,
    width: 14,
  },
  timelineLine: {
    flex: 1,
    marginVertical: 5,
    width: 2,
  },
  historyCard: {
    borderRadius: 18,
    borderWidth: 1,
    flex: 1,
    marginBottom: 14,
    padding: 18,
  },
  historyHeading: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  historyStatus: {
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
  },
  historyTime: {
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
  },
  courseName: {
    fontSize: 17,
    fontWeight: '800',
    lineHeight: 23,
    marginTop: 15,
  },
  historyMeta: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 5,
  },
  historyDate: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 12,
  },
});