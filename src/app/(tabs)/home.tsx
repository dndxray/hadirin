import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AsistenHome } from '@/components/asisten-home';
import { useAuth } from '@/context/auth-context';
import { db } from '@/lib/firebase';
import { getSessionStatus } from '@/utils/session-status';

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const DAY_FULL = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const MONTH_FULL = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

type Entry = { session: any; status: string; ms: number };

/** Rentang minggu berjalan: Senin 00:00 sampai Senin berikutnya 00:00 (waktu perangkat). */
function getWeekRange(now: Date) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const daysSinceMonday = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - daysSinceMonday);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return { start, end };
}

function sessionMs(s: any): number | null {
  const ts = s.date ?? s.dateTimestamp;
  const ms = ts?.toMillis?.();
  return typeof ms === 'number' ? ms : null;
}

function dayStartMs(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

const getInitials = (name?: string) => {
  if (!name) return 'MK';
  return name.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase();
};

function SessionCard({ entry, isToday }: { entry: Entry; isToday: boolean }) {
  const { session: item, status } = entry;
  const isOpen = status === 'open';

  let badgeBg = '#EEF1F6';
  let dotBg = '#94A3B8';
  let textColor = '#64748B';
  let textLabel = 'Belum Dibuka';

  if (isOpen) {
    badgeBg = '#DCFCE7'; dotBg = '#22C55E'; textColor = '#16A34A'; textLabel = 'Dibuka';
  }

  const timeText = item.timeRange || `${item.startTime} - ${item.endTime}`;

  return (
    <Pressable
      style={[
        styles.sessionCard,
        isToday && styles.sessionCardToday,
        isToday && { borderLeftColor: isOpen ? '#22C55E' : '#1B2A4E' },
      ]}
      onPress={() => router.push(`/detail-sesi?id=${item.id}`)}
    >
      <View style={styles.sessionHeader}>
        <View style={styles.sessionIconBg}>
          <Text style={styles.sessionIconText}>{getInitials(item.courseName)}</Text>
        </View>
        <View style={styles.sessionInfo}>
          <Text style={styles.sessionTitle}>{item.courseName}</Text>
          <Text style={styles.sessionRoom}>{item.className} · {item.room}</Text>
        </View>
        <View style={styles.sessionRight}>
          <View style={[styles.badge, { backgroundColor: badgeBg }]}>
            <View style={[styles.badgeDot, { backgroundColor: dotBg }]} />
            <Text style={[styles.badgeText, { color: textColor }]}>{textLabel}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#64748B" />
        </View>
      </View>
      <View style={styles.sessionFooter}>
        <Ionicons name="time-outline" size={16} color="#94A3B8" />
        <Text style={styles.sessionTime}>
          {isToday ? `Hari ini · ${timeText}` : `${item.dateLabel} · ${timeText}`}
        </Text>
      </View>
    </Pressable>
  );
}

export default function HomeScreen() {
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();

  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (profile?.role === 'asisten' || !profile?.uid) return;

    // Rules hanya mengizinkan praktikan membaca sesi yang memuat uid-nya
    const q = query(
      collection(db, 'sessions'),
      where('participantIds', 'array-contains', profile.uid)
    );
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setSessions(data);
        setLoading(false);
      },
      (error) => {
        console.error('Gagal load sesi:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [profile?.role, profile?.uid]);

  // Hitung ulang tiap menit supaya sesi yang sudah lewat otomatis pindah ke Riwayat
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(id);
  }, []);

  const view = useMemo(() => {
    const now = new Date();
    const { start, end } = getWeekRange(now);
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    const lastDay = new Date(end);
    lastDay.setDate(lastDay.getDate() - 1);
    const weekLabel =
      `${start.getDate()} ${MONTH_SHORT[start.getMonth()]} – ` +
      `${lastDay.getDate()} ${MONTH_SHORT[lastDay.getMonth()]} ${lastDay.getFullYear()}`;
    const todayLabel =
      `${DAY_FULL[now.getDay()]}, ${now.getDate()} ${MONTH_FULL[now.getMonth()]}`;

    const q = search.trim().toLowerCase();

    const entries: Entry[] = [];
    for (const session of sessions) {
      const ms = sessionMs(session);
      if (ms === null) continue;

      const status = getSessionStatus(session) as string;
      // Sesi yang sudah ditutup ada di Riwayat, bukan di Home
      if (status !== 'open' && status !== 'upcoming') continue;
      // Hanya minggu ini (sesi yang masih dibuka tetap tampil walau tanggalnya kemarin)
      const inWeek = ms >= start.getTime() && ms < end.getTime();
      if (!inWeek && status !== 'open') continue;
      // Sesi belum dibuka yang harinya sudah lewat tidak relevan lagi
      if (status === 'upcoming' && ms < todayStart.getTime()) continue;

      if (q) {
        const hit =
          String(session.courseName ?? '').toLowerCase().includes(q) ||
          String(session.className ?? '').toLowerCase().includes(q) ||
          String(session.room ?? '').toLowerCase().includes(q);
        if (!hit) continue;
      }

      entries.push({ session, status, ms });
    }

    const byTime = (a: Entry, b: Entry) =>
      dayStartMs(a.ms) - dayStartMs(b.ms) ||
      String(a.session.startTime ?? '').localeCompare(String(b.session.startTime ?? ''));

    const isTodayish = (e: Entry) =>
      e.status === 'open' || (e.ms >= todayStart.getTime() && e.ms < todayEnd.getTime());

    const today = entries
      .filter(isTodayish)
      // Yang sedang dibuka paling atas, lalu urut jam mulai
      .sort((a, b) => (a.status === 'open' ? 0 : 1) - (b.status === 'open' ? 0 : 1) || byTime(a, b));
    const rest = entries.filter((e) => !isTodayish(e)).sort(byTime);

    return { weekLabel, todayLabel, today, rest, total: entries.length };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessions, search, tick]);

  if (profile?.role === 'asisten') {
    return (
      <View style={{ flex: 1 }}>
        <AsistenHome />
      </View>
    );
  }

  const firstName = profile?.name?.split(' ')[0] || 'Praktikan';

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>Selamat Pagi!</Text>
            <Text style={styles.name}>Hai, {firstName}</Text>
          </View>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials(profile?.name)}</Text>
          </View>
        </View>

        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#94A3B8" />
          <TextInput
            placeholder="Cari mata praktikum"
            placeholderTextColor="#94A3B8"
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Jadwal Praktikum</Text>
          <Text style={styles.seeAllText}>{view.weekLabel}</Text>
        </View>

        <View style={styles.dateCard}>
          <View style={styles.dateIconBg}>
            <Ionicons name="calendar" size={20} color="#1B2A4E" />
          </View>
          <View>
            <Text style={styles.dateText}>Minggu Ini</Text>
            <Text style={styles.dateSubText}>{view.total} sesi</Text>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#1B2A4E" style={{ marginTop: 20 }} />
        ) : view.total === 0 ? (
          <Text style={styles.emptyText}>
            {search.trim()
              ? `Tidak ada praktikum untuk "${search.trim()}".`
              : 'Tidak ada praktikum minggu ini. Sesi yang sudah selesai ada di Riwayat.'}
          </Text>
        ) : (
          <>
            {view.today.length > 0 && (
              <View>
                <View style={styles.groupHeader}>
                  <Text style={styles.groupTitleToday}>Hari Ini</Text>
                  <Text style={styles.groupMeta}>{view.todayLabel}</Text>
                </View>
                {view.today.map((entry) => (
                  <SessionCard key={entry.session.id} entry={entry} isToday />
                ))}
              </View>
            )}

            {view.rest.length > 0 && (
              <View>
                {view.today.length > 0 && (
                  <View style={styles.groupHeader}>
                    <Text style={styles.groupTitle}>Sisa Minggu Ini</Text>
                  </View>
                )}
                {view.rest.map((entry) => (
                  <SessionCard key={entry.session.id} entry={entry} isToday={false} />
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  header: { backgroundColor: '#1B2A4E', borderBottomLeftRadius: 30, borderBottomRightRadius: 30, paddingHorizontal: 24, paddingBottom: 40, zIndex: 1 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  greeting: { color: '#94A3B8', fontSize: 14, marginBottom: 4 },
  name: { color: '#FFFFFF', fontSize: 26, fontWeight: '800' },
  avatar: { width: 48, height: 48, backgroundColor: '#FCD9C5', borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#1B2A4E', fontWeight: '800', fontSize: 16 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 16, paddingHorizontal: 16, height: 52, marginTop: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  searchInput: { flex: 1, marginLeft: 12, fontSize: 15, color: '#1B2A4E' },
  content: { paddingHorizontal: 24, paddingTop: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#1B2A4E' },
  seeAllText: { fontSize: 13, color: '#64748B', fontWeight: '600' },
  dateCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E8EDF5', padding: 16, borderRadius: 16, marginBottom: 16 },
  dateIconBg: { width: 40, height: 40, backgroundColor: '#D0D9E8', borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  dateText: { fontSize: 15, fontWeight: '700', color: '#1B2A4E' },
  dateSubText: { fontSize: 13, color: '#64748B', marginTop: 2 },
  emptyText: { textAlign: 'center', color: '#64748B', marginTop: 20 },

  groupHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 },
  groupTitleToday: { fontSize: 15, fontWeight: '800', color: '#1B2A4E' },
  groupTitle: { fontSize: 15, fontWeight: '700', color: '#64748B' },
  groupMeta: { fontSize: 12, color: '#64748B', fontWeight: '600' },

  sessionCard: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  // Emphasis tipis untuk sesi hari ini: garis aksen di kiri + bayangan sedikit lebih kuat
  sessionCardToday: { borderLeftWidth: 4, shadowOpacity: 0.1, shadowRadius: 10, elevation: 4 },
  sessionHeader: { flexDirection: 'row', alignItems: 'center' },
  sessionIconBg: { width: 44, height: 44, backgroundColor: '#1B2A4E', borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  sessionIconText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
  sessionInfo: { flex: 1 },
  sessionTitle: { fontSize: 16, fontWeight: '700', color: '#1B2A4E', marginBottom: 4 },
  sessionRoom: { fontSize: 13, color: '#64748B' },
  sessionRight: { alignItems: 'flex-end', gap: 8 },
  badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, gap: 4 },
  badgeDot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: 10, fontWeight: '700' },
  sessionFooter: { flexDirection: 'row', alignItems: 'center', marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9', gap: 6 },
  sessionTime: { fontSize: 13, color: '#64748B', fontWeight: '500' },
});