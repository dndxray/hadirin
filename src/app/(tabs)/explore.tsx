import { Ionicons } from '@expo/vector-icons';
import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { authColors } from '@/components/auth-ui';
import { StateView } from '@/components/state-view';
import { BottomTabInset } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { HistoryDataState, PermissionHistory } from '@/components/permission-history';
import { useAttendance } from '@/context/attendance-context';
import type { CloudAttendance, SessionSummary } from '@/types/practitioner';
import { formatAttendanceTime } from '@/utils/attendance-format';
import { initials } from '@/utils/home-format';

const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

type HistoryItem = { record: CloudAttendance; session: SessionSummary };
type Group = { label: string; items: HistoryItem[] };

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
  const [showFilter, setShowFilter] = useState(false);
  const [course, setCourse] = useState<string | null>(null);

  const history: HistoryItem[] = records.map((record) => {
    const source = record.session ?? sessions.find((session) => session.id === record.sessionId);
    return { record, session: {
      courseName: source?.courseName || 'Sesi praktikum',
      className: source?.className || 'Kelas belum tersedia',
      dateLabel: source?.dateLabel || '', timeRange: source?.timeRange || '',
      room: source?.room || '', assistantName: source?.assistantName || '',
    } };
  }).sort((a, b) => (b.record.checkedInAt ?? 0) - (a.record.checkedInAt ?? 0));
  const held = new Set([
    ...sessions.filter((session) => session.status !== 'upcoming').map((session) => session.id),
    ...records.map((record) => record.sessionId),
  ]).size;
  const percent = held > 0 ? Math.min(100, Math.round((history.length / held) * 100)) : 0;
  const summaryReady = !attendanceState.loading && !attendanceState.error && !sessionState.loading && !sessionState.error;

  const courses = Array.from(new Set(history.map((h) => h.session.courseName)));
  const selectedCourse = course && courses.includes(course) ? course : null;
  const visible = selectedCourse ? history.filter((h) => h.session.courseName === selectedCourse) : history;

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
        <View style={[styles.header, { paddingTop: insets.top + 28 }]}>
          <View style={styles.inner}>
            <Text accessibilityRole="header" style={styles.title}>Riwayat Kehadiran</Text>
            <Text style={styles.subtitle}>Catatan presensi dan status izin praktikum kamu.</Text>
          </View>
        </View>

        <View style={styles.body}>
          <View style={styles.inner}>
            {/* Ringkasan */}
            <View style={styles.summary}>
              <View style={styles.summaryRow}>
                <View>
                  <Text style={styles.summaryBig}>{summaryReady ? `${percent}%` : '—'}</Text>
                  <Text style={styles.summaryLabel}>Tingkat Kehadiran</Text>
                </View>
                <View>
                  <Text style={styles.summaryBig}>{attendanceState.loading || attendanceState.error ? '—' : history.length}</Text>
                  <Text style={styles.summaryLabel}>Total Hadir</Text>
                </View>
              </View>
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${summaryReady ? percent : 0}%` }]} />
              </View>
            </View>

            <View style={{ marginTop: 20 }}><HistoryDataState {...attendanceState} retry={retry} /></View>
            {sessionState.error ? <Text style={styles.notice}>Persentase belum tersedia karena data sesi belum dapat dimuat. Catatan presensi tetap ditampilkan jika dapat diakses.</Text> : null}
            {!attendanceState.loading && !attendanceState.error && history.length === 0 ? (
              <View style={{ marginTop: 24 }}>
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

                    {g.items.map(({ record, session }) => (
                      <View key={record.id} style={styles.card}>
                        <View style={styles.cardAvatar}>
                          <Text style={styles.cardAvatarText}>{initials(session.courseName)}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.cardTitle}>
                            {session.courseName}
                          </Text>
                          <Text style={styles.cardDate}>{record.checkedInAt ? `${dateLabel(record.checkedInAt)} · ${formatAttendanceTime(record.checkedInAt)}` : 'Waktu kehadiran belum tersedia'}</Text>
                          <Text style={styles.cardDate}>{session.className}</Text>
                        </View>
                        <View style={styles.badge}>
                          <View style={styles.badgeDot} />
                          <Text style={styles.badgeText}>Hadir</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                ))}
              </>
            )}
            <View style={{ marginTop: 28 }}><PermissionHistory /></View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: authColors.background },
  inner: { width: '100%', maxWidth: 560, alignSelf: 'center' },

  header: {
    backgroundColor: authColors.navy,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    paddingHorizontal: 24,
    paddingBottom: 56,
  },
  title: { color: authColors.white, fontSize: 26, lineHeight: 34, fontWeight: '800' },
  subtitle: { color: '#BBC7DC', fontSize: 14, lineHeight: 22, marginTop: 6 },
  notice: { color: '#52627A', fontSize: 13, lineHeight: 20, marginTop: 12 },

  body: { paddingHorizontal: 20, marginTop: -28 },

  summary: {
    backgroundColor: authColors.white,
    borderRadius: 20,
    padding: 20,
    gap: 14,
    shadowColor: '#1B2A4E',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingRight: 24 },
  summaryBig: { color: authColors.navy, fontSize: 30, fontWeight: '800' },
  summaryLabel: { color: '#52627A', fontSize: 13, marginTop: 2 },
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E8EEF9',
    overflow: 'hidden',
  },
  fill: { height: 6, borderRadius: 3, backgroundColor: '#166534' },

  filterChips: { gap: 8, paddingTop: 16 },
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
    marginTop: 24,
    marginBottom: 12,
  },
  groupTitle: { color: authColors.ink, fontSize: 20, fontWeight: '800' },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#DCE6FB',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 44,
    justifyContent: 'center',
  },
  filterText: { color: authColors.navy, fontSize: 11, fontWeight: '800' },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: authColors.white,
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#1B2A4E',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },
  cardAvatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: authColors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardAvatarText: { color: authColors.white, fontWeight: '800', fontSize: 14 },
  cardTitle: { color: authColors.ink, fontSize: 16, fontWeight: '800' },
  cardDate: { color: '#52627A', fontSize: 13, lineHeight: 20, marginTop: 3 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#E6F6EC',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#22C55E' },
  badgeText: { color: '#166534', fontSize: 11, fontWeight: '700' },
});
