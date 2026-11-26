import { Ionicons } from '@expo/vector-icons';
import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { authColors } from '@/components/auth-ui';
import { BackButton } from '@/components/back-button';
import { HistoryDataState, PermissionHistory } from '@/components/permission-history';
import { StateView } from '@/components/state-view';
import { BottomTabInset } from '@/constants/theme';
import { useAttendance } from '@/context/attendance-context';
import { useAuth } from '@/context/auth-context';
import type { CloudAttendance, SessionSummary } from '@/types/practitioner';
import { formatAttendanceTime } from '@/utils/attendance-format';

const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

type HistoryItem = { record: CloudAttendance; session: SessionSummary };
type Group = { label: string; items: HistoryItem[] };
type Tab = 'presensi' | 'izin';

function monthLabel(ts: number) {
  const d = new Date(ts);
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function dateLabel(ts: number) {
  const d = new Date(ts);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export default function AttendanceHistoryScreen() {
  const insets = useSafeAreaInsets();
  const { profile, loading: authLoading } = useAuth();
  const { records, sessions, attendanceState, sessionState, retry } = useAttendance();
  const [tab, setTab] = useState<Tab>('presensi');
  const [showFilter, setShowFilter] = useState(false);
  const [course, setCourse] = useState<string | null>(null);

  const history: HistoryItem[] = records
    .map((record) => {
      const source = record.session ?? sessions.find((session) => session.id === record.sessionId);
      return {
        record,
        session: {
          courseName: source?.courseName || 'Sesi praktikum',
          className: source?.className || 'Kelas belum tersedia',
          dateLabel: source?.dateLabel || '',
          timeRange: source?.timeRange || '',
          room: source?.room || '',
          assistantName: source?.assistantName || '',
        },
      };
    })
    .sort((a, b) => (b.record.checkedInAt ?? 0) - (a.record.checkedInAt ?? 0));

  const held = new Set([
    ...sessions.filter((session) => session.status !== 'upcoming').map((session) => session.id),
    ...records.map((record) => record.sessionId),
  ]).size;
  const percent = held > 0 ? Math.min(100, Math.round((history.length / held) * 100)) : 0;
  const summaryReady =
    !attendanceState.loading && !attendanceState.error && !sessionState.loading && !sessionState.error;

  const courses = Array.from(new Set(history.map((h) => h.session.courseName)));
  const selectedCourse = course && courses.includes(course) ? course : null;
  const visible = selectedCourse
    ? history.filter((h) => h.session.courseName === selectedCourse)
    : history;

  const groups: Group[] = [];
  visible.forEach((item) => {
    const label = item.record.checkedInAt ? monthLabel(item.record.checkedInAt) : 'Waktu belum tersedia';
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(item);
    else groups.push({ label, items: [item] });
  });

  if (authLoading) return <StateView kind="loading" />;
  if (!profile) return <Redirect href="/login" />;
  if (profile.role !== 'praktikan') return <Redirect href="/home" />;

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + BottomTabInset + 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.header, { paddingTop: insets.top + 24 }]}>
          <View style={styles.inner}>
            <View style={styles.headerRow}>
              <BackButton />
              <Text accessibilityRole="header" style={styles.title}>Riwayat</Text>
              <View style={styles.backPlaceholder} />
            </View>
          </View>
        </View>

        <View style={styles.body}>
          <View style={styles.inner}>
            <View style={styles.segment}>
              {(['presensi', 'izin'] as Tab[]).map((t) => {
                const active = tab === t;
                return (
                  <Pressable
                    key={t}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: active }}
                    onPress={() => setTab(t)}
                    style={[styles.segmentItem, active && styles.segmentActive]}
                  >
                    <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                      {t === 'presensi' ? 'Presensi' : 'Izin'}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {tab === 'izin' ? (
              <View style={{ marginTop: 16 }}>
                <PermissionHistory />
              </View>
            ) : (
              <>
                <Text style={styles.summaryLine}>
                  {summaryReady
                    ? `${history.length} kali hadir · kehadiran ${percent}%`
                    : 'Menghitung kehadiran…'}
                </Text>

                <HistoryDataState {...attendanceState} retry={retry} />
                {sessionState.error ? (
                  <Text style={styles.notice}>
                    Persentase belum tersedia karena data sesi belum dapat dimuat.
                  </Text>
                ) : null}

                {!attendanceState.loading && !attendanceState.error && history.length === 0 ? (
                  <View style={{ marginTop: 16 }}>
                    <StateView
                      kind="empty"
                      title="Belum ada presensi"
                      message="Saat presensi berhasil, sesi yang kamu hadiri akan muncul di sini."
                      actionLabel="Lihat Sesi"
                      onAction={() => router.push('/home')}
                    />
                  </View>
                ) : (
                  <>
                    {showFilter ? (
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.filterChips}
                      >
                        {[null, ...courses].map((c) => {
                          const active = selectedCourse === c;
                          return (
                            <Pressable
                              key={c ?? 'semua'}
                              accessibilityRole="button"
                              accessibilityState={{ selected: active }}
                              onPress={() => setCourse(c)}
                              style={[styles.chip, active && styles.chipActive]}
                            >
                              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                                {c ?? 'Semua'}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </ScrollView>
                    ) : null}

                    {groups.map((g, gi) => (
                      <View key={g.label}>
                        <View style={styles.groupRow}>
                          <Text style={styles.groupTitle}>{g.label}</Text>
                          {gi === 0 ? (
                            <Pressable
                              style={styles.filterPill}
                              accessibilityRole="button"
                              accessibilityLabel="Filter"
                              accessibilityState={{ expanded: showFilter }}
                              onPress={() => setShowFilter((v) => !v)}
                            >
                              <Ionicons name="funnel-outline" size={12} color={authColors.navy} />
                              <Text style={styles.filterText}>Filter</Text>
                            </Pressable>
                          ) : null}
                        </View>

                        <View style={styles.timeline}>
                          {g.items.map(({ record, session }) => (
                            <View key={record.id} style={styles.item}>
                              <View style={styles.dot}>
                                <View style={styles.dotInner} />
                              </View>
                              <View style={styles.card}>
                                <View style={{ flex: 1 }}>
                                  <Text style={styles.cardTitle} numberOfLines={2}>
                                    {session.courseName}
                                  </Text>
                                  <Text style={styles.cardDate}>
                                    {record.checkedInAt
                                      ? `${dateLabel(record.checkedInAt)} · ${formatAttendanceTime(record.checkedInAt)}`
                                      : 'Waktu kehadiran belum tersedia'}
                                  </Text>
                                  <Text style={styles.cardDate}>{session.className}</Text>
                                </View>
                                <View style={styles.badge}>
                                  <Text style={styles.badgeText}>Hadir</Text>
                                </View>
                              </View>
                            </View>
                          ))}
                        </View>
                      </View>
                    ))}
                  </>
                )}
              </>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: authColors.background },
  inner: { width: '100%', maxWidth: 560, alignSelf: 'center' },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backPlaceholder: { width: 40, height: 40 },

  header: {
    backgroundColor: authColors.navy,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    paddingHorizontal: 24,
    paddingBottom: 56,
  },
  title: { color: authColors.white, fontSize: 22, fontWeight: '800', textAlign: 'center' },

  body: { paddingHorizontal: 20, marginTop: -28 },

  segment: {
    flexDirection: 'row',
    backgroundColor: authColors.white,
    borderRadius: 16,
    padding: 5,
    shadowColor: '#1B2A4E',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  segmentItem: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentActive: { backgroundColor: authColors.navy },
  segmentText: { color: authColors.muted, fontSize: 14, fontWeight: '700' },
  segmentTextActive: { color: authColors.white },

  summaryLine: { color: '#52627A', fontSize: 13, marginTop: 16 },
  notice: { color: '#52627A', fontSize: 13, lineHeight: 20, marginTop: 8 },

  filterChips: { gap: 8, paddingTop: 14 },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: authColors.border,
    backgroundColor: authColors.white,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 44,
    justifyContent: 'center',
  },
  chipActive: { backgroundColor: authColors.navy, borderColor: authColors.navy },
  chipText: { color: authColors.ink, fontSize: 12, fontWeight: '600' },
  chipTextActive: { color: authColors.white },

  groupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 12,
  },
  groupTitle: { color: authColors.ink, fontSize: 18, fontWeight: '800' },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#DCE6FB',
    borderRadius: 999,
    paddingHorizontal: 12,
    minHeight: 44,
    justifyContent: 'center',
  },
  filterText: { color: authColors.navy, fontSize: 11, fontWeight: '800' },

  timeline: { marginLeft: 9, paddingLeft: 22, borderLeftWidth: 2, borderLeftColor: '#DCE6FB' },
  item: { marginBottom: 12 },
  dot: {
    position: 'absolute',
    left: -33,
    top: 18,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: authColors.background,
    borderWidth: 2,
    borderColor: '#2F5AA8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#2F5AA8' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: authColors.white,
    borderRadius: 16,
    padding: 14,
    shadowColor: '#1B2A4E',
    shadowOpacity: 0.07,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },
  cardTitle: { color: authColors.ink, fontSize: 15, fontWeight: '800' },
  cardDate: { color: '#52627A', fontSize: 12, lineHeight: 18, marginTop: 2 },
  badge: {
    backgroundColor: '#E6F6EC',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: { color: '#166534', fontSize: 11, fontWeight: '700' },
});