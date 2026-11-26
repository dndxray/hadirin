import { AsistenSessionCard } from '@/components/asisten-session-card';
import { authColors } from '@/components/auth-ui';
import { BackButton } from '@/components/back-button';
import { db } from '@/lib/firebase';
import { sessionMs } from '@/utils/schedule';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const MONTHS = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

type DaySection = { date: Date; sessions: any[]; isToday: boolean };

// Minggu dimulai hari Senin
function weekStart(offset: number) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const diff = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - diff + offset * 7);
  return d;
}

function rangeLabel(start: Date) {
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const sameMonth = start.getMonth() === end.getMonth();
  const from = sameMonth ? `${start.getDate()}` : `${start.getDate()} ${MONTHS[start.getMonth()]}`;
  return `${from} – ${end.getDate()} ${MONTHS[end.getMonth()]} ${end.getFullYear()}`;
}

function weekHint(offset: number) {
  if (offset === 0) return 'Minggu ini';
  if (offset === -1) return 'Minggu lalu · ketuk untuk kembali';
  if (offset === 1) return 'Minggu depan · ketuk untuk kembali';
  return 'Ketuk untuk kembali ke minggu ini';
}

export default function JadwalAsistenScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekOffset, setWeekOffset] = useState(0);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      query(collection(db, 'sessions')),
      (snapshot) => {
        setSessions(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (error) => {
        console.error('Gagal load sesi:', error);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  // Hitung ulang tiap menit supaya penanda "Hari ini" dan status sesi tetap akurat
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(id);
  }, []);

  const { days, undated, total } = useMemo(() => {
    const ws = weekStart(weekOffset);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const sections: DaySection[] = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(ws);
      date.setDate(ws.getDate() + i);
      return { date, sessions: [], isToday: date.getTime() === todayStart.getTime() };
    });

    const noDate: any[] = [];
    for (const session of sessions) {
      const ms = sessionMs(session);
      if (ms === null) {
        noDate.push(session);
        continue;
      }
      const section = sections.find((s) => {
        const end = new Date(s.date);
        end.setDate(end.getDate() + 1);
        return ms >= s.date.getTime() && ms < end.getTime();
      });
      section?.sessions.push(session);
    }

    const byStart = (a: any, b: any) =>
      String(a.startTime ?? '').localeCompare(String(b.startTime ?? ''));
    sections.forEach((s) => s.sessions.sort(byStart));

    return {
      days: sections,
      undated: noDate,
      total: sections.reduce((sum, s) => sum + s.sessions.length, 0),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessions, weekOffset, tick]);

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <View style={styles.headerCircleA} />
          <View style={styles.headerCircleB} />
          <View style={styles.headerRow}>
            <BackButton onPress={goBack} />
            <View style={styles.headerText}>
              <Text style={styles.title}>Jadwal Praktikum</Text>
              <Text style={styles.subtitle}>{total} sesi dalam seminggu</Text>
            </View>
          </View>
        </View>

        {/* Navigasi minggu (menimpa tepi bawah header) */}
        <View style={styles.weekWrap}>
          <View style={styles.weekCard}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Minggu sebelumnya"
              hitSlop={8}
              onPress={() => setWeekOffset((w) => w - 1)}
              style={({ pressed }) => [styles.weekArrow, pressed && { opacity: 0.6 }]}
            >
              <Ionicons name="chevron-back" size={20} color={authColors.navy} />
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Kembali ke minggu ini"
              disabled={weekOffset === 0}
              onPress={() => setWeekOffset(0)}
              style={styles.weekCenter}
            >
              <Text style={styles.weekRange}>{rangeLabel(days[0].date)}</Text>
              <Text style={styles.weekHint}>{weekHint(weekOffset)}</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Minggu berikutnya"
              hitSlop={8}
              onPress={() => setWeekOffset((w) => w + 1)}
              style={({ pressed }) => [styles.weekArrow, pressed && { opacity: 0.6 }]}
            >
              <Ionicons name="chevron-forward" size={20} color={authColors.navy} />
            </Pressable>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={authColors.navy} style={{ marginTop: 32 }} />
        ) : (
          <>
            {days.map((day) => (
              <View key={day.date.getTime()} style={styles.dayBlock}>
                <View style={styles.dayHeader}>
                  <View style={[styles.dayBadge, day.isToday && styles.dayBadgeToday]}>
                    <Text style={[styles.dayBadgeNum, day.isToday && { color: '#FFFFFF' }]}>
                      {day.date.getDate()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.dayName}>
                      {DAYS[day.date.getDay()]}
                      {day.isToday ? ' · Hari ini' : ''}
                    </Text>
                    <Text style={styles.dayDate}>
                      {MONTHS[day.date.getMonth()]} {day.date.getFullYear()}
                    </Text>
                  </View>
                  <Text style={styles.dayCount}>{day.sessions.length} sesi</Text>
                </View>

                {day.sessions.length === 0 ? (
                  <View style={styles.emptyDay}>
                    <Text style={styles.emptyDayText}>Tidak ada sesi</Text>
                  </View>
                ) : (
                  day.sessions.map((s) => <AsistenSessionCard key={s.id} session={s} />)
                )}
              </View>
            ))}

            {undated.length > 0 ? (
              <View style={styles.dayBlock}>
                <View style={styles.dayHeader}>
                  <View style={styles.dayBadge}>
                    <Ionicons name="help" size={18} color={authColors.navy} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.dayName}>Tanggal belum diatur</Text>
                    <Text style={styles.dayDate}>Belum masuk jadwal mingguan</Text>
                  </View>
                  <Text style={styles.dayCount}>{undated.length} sesi</Text>
                </View>
                {undated.map((s) => (
                  <AsistenSessionCard key={s.id} session={s} />
                ))}
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7FB' },

  // Header
  header: {
    backgroundColor: '#1B2A4E',
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    paddingHorizontal: 24,
    paddingBottom: 56,
    overflow: 'hidden',
  },
  headerCircleA: {
    position: 'absolute',
    top: -60,
    right: -40,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(96,165,250,0.18)',
  },
  headerCircleB: {
    position: 'absolute',
    bottom: -70,
    left: -50,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  headerText: { flex: 1 },
  title: { color: '#FFFFFF', fontSize: 26, fontWeight: '800' },
  subtitle: { color: '#CBD5E1', fontSize: 13, marginTop: 2 },

  // Navigasi minggu
  weekWrap: { paddingHorizontal: 24, marginTop: -28 },
  weekCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 10,
    height: 60,
    shadowColor: '#1B2A4E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 5,
  },
  weekArrow: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#E8EEF9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  weekRange: { fontSize: 15, fontWeight: '800', color: authColors.ink },
  weekHint: { fontSize: 11, color: '#64748B', marginTop: 2 },

  // Per hari
  dayBlock: { paddingHorizontal: 24, marginTop: 24 },
  dayHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  dayBadge: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#E8EDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayBadgeToday: { backgroundColor: '#1B2A4E' },
  dayBadgeNum: { fontSize: 16, fontWeight: '800', color: authColors.navy },
  dayName: { fontSize: 16, fontWeight: '800', color: authColors.ink },
  dayDate: { fontSize: 12, color: '#64748B', marginTop: 1 },
  dayCount: { fontSize: 12, fontWeight: '700', color: '#3B4F8C' },
  emptyDay: {
    backgroundColor: '#EEF1F6',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  emptyDayText: { color: '#94A3B8', fontSize: 13, fontWeight: '600' },
});