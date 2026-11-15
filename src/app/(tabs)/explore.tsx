import { Ionicons } from '@expo/vector-icons';
import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { authColors } from '@/components/auth-ui';
import { DataState } from '@/components/practitioner-ui';
import { PermissionHistory } from '@/components/permission-history';
import { StateView } from '@/components/state-view';
import { BottomTabInset } from '@/constants/theme';
import { useAttendance } from '@/context/attendance-context';
import { useAuth } from '@/context/auth-context';
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

  const history: HistoryItem[] = records
    .map((record) => ({
      record,
      session: record.session,
    }))
    .sort((a, b) => (b.record.checkedInAt ?? 0) - (a.record.checkedInAt ?? 0));

  const held = new Set([
    ...sessions.filter((s) => s.status !== 'upcoming').map((s) => s.id),
    ...records.map((record) => record.sessionId),
  ]).size;
  const percent = held > 0 ? Math.min(100, Math.round((history.length / held) * 100)) : 0;
  const summaryReady = !attendanceState.loading && !attendanceState.error && !sessionState.loading && !sessionState.error;

  const courses = Array.from(new Set(history.map((h) => h.session.courseName)));
  const visible = course ? history.filter((h) => h.session.courseName === course) : history;

  const groups: Group[] = [];
  visible.forEach((item) => {
    const label = item.record.checkedInAt ? monthLabel(item.record.checkedInAt) : 'Menunggu waktu server';
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
            <Text style={styles.title}>Riwayat Kehadiran</Text>
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

            <View style={{ marginTop: 20 }}><DataState {...attendanceState} retry={retry} /></View>
            {sessionState.error ? <Text style={{ color: '#B91C1C', marginTop: 12 }}>Ringkasan persentase belum dapat dihitung. {sessionState.error}</Text> : null}
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
                      const active = course === c;
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
                          <Text style={styles.cardTitle} numberOfLines={1}>
                            {session.courseName}
                          </Text>
                          <Text style={styles.cardDate}>{record.checkedInAt ? `${dateLabel(record.checkedInAt)} · ${formatAttendanceTime(record.checkedInAt)}` : 'Menunggu waktu server'}</Text>
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
    backgroundColor: authColors.white,
    paddingHorizontal: 24,
    paddingBottom: 22,
  },
  title: { color: authColors.navy, fontSize: 26, fontWeight: '800' },

  body: { paddingHorizontal: 20, paddingTop: 16 },

  summary: {
    backgroundColor: authColors.navy,
    borderRadius: 20,
    padding: 20,
    gap: 14,
    shadowColor: '#1B2A4E',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingRight: 24 },
  summaryBig: { color: authColors.white, fontSize: 30, fontWeight: '800' },
  summaryLabel: { color: '#B6C2DB', fontSize: 11, marginTop: 2 },
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.18)',
    overflow: 'hidden',
  },
  fill: { height: 6, borderRadius: 3, backgroundColor: '#22C55E' },

  filterChips: { gap: 8, paddingTop: 16 },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: authColors.border,
    backgroundColor: authColors.white,
    paddingHorizontal: 14,
    paddingVertical: 8,
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
    paddingVertical: 6,
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
  cardTitle: { color: authColors.ink, fontSize: 14, fontWeight: '800' },
  cardDate: { color: authColors.muted, fontSize: 11, marginTop: 2 },
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
  badgeText: { color: '#15803D', fontSize: 11, fontWeight: '700' },
});
