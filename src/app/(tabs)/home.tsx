import { AsistenHome } from '@/components/asisten-home';
import { authColors } from '@/components/auth-ui';
import { HomeIllustration } from '@/components/home-illustration';
import { QuickIllustration, type QuickKind } from '@/components/quick-menu-illustrations';
import { SessionCard } from '@/components/session-card';
import { useAuth } from '@/context/auth-context';
import { db } from '@/lib/firebase';
import { todayLabel as formatTodayLabel, greeting } from '@/utils/home-format';
import { dayStartMs, sessionMs } from '@/utils/schedule';
import { getSessionStatus } from '@/utils/session-status';
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

type Entry = { session: any; status: string; ms: number };

function QuickAction({
  kind,
  label,
  onPress,
}: {
  kind: QuickKind;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.quickItem, pressed && { opacity: 0.7 }]}
    >
      <QuickIllustration kind={kind} />
      <Text style={styles.quickLabel} numberOfLines={2}>
        {label}
      </Text>
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

  // Home hanya menampilkan jadwal HARI INI. Jadwal satu minggu ada di halaman Jadwal.
  const today = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    const q = search.trim().toLowerCase();
    const entries: Entry[] = [];
    for (const session of sessions) {
      const ms = sessionMs(session);
      if (ms === null) continue;

      const status = getSessionStatus(session) as string;
      // Sesi yang sudah ditutup ada di Riwayat, bukan di Home
      if (status !== 'open' && status !== 'upcoming') continue;

      // Sesi yang masih dibuka tetap tampil walau tanggalnya kemarin
      const isToday = ms >= todayStart.getTime() && ms < todayEnd.getTime();
      if (status !== 'open' && !isToday) continue;

      if (q) {
        const hit =
          String(session.courseName ?? '').toLowerCase().includes(q) ||
          String(session.className ?? '').toLowerCase().includes(q) ||
          String(session.room ?? '').toLowerCase().includes(q);
        if (!hit) continue;
      }
      entries.push({ session, status, ms });
    }

    // Yang sedang dibuka paling atas, lalu urut jam mulai
    return entries.sort(
      (a, b) =>
        (a.status === 'open' ? 0 : 1) - (b.status === 'open' ? 0 : 1) ||
        dayStartMs(a.ms) - dayStartMs(b.ms) ||
        String(a.session.startTime ?? '').localeCompare(String(b.session.startTime ?? ''))
    );
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
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 110 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 24 }]}>
          <View style={styles.headerCircleA} />
          <View style={styles.headerCircleB} />
          <View style={styles.headerRow}>
            <View style={styles.headerText}>
              <Text style={styles.greeting}>{greeting()}</Text>
              <Text style={styles.name} numberOfLines={1}>
                Hai, {firstName}
              </Text>
            </View>
            <HomeIllustration />
          </View>
        </View>

        {/* Pencarian (menimpa tepi bawah header) */}
        <View style={styles.searchWrap}>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#94A3B8" />
            <TextInput
              placeholder="Cari mata praktikum"
              placeholderTextColor="#94A3B8"
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
              accessibilityLabel="Cari mata praktikum"
            />
          </View>
        </View>

        {/* Menu cepat: baris 1 = 4 ikon, baris 2 = Riwayat Izin tepat di bawah Jadwal */}
        <View style={styles.quickCard}>
          <QuickAction kind="jadwal" label="Jadwal" onPress={() => router.push('/jadwal')} />
          <QuickAction kind="presensi" label="Presensi" onPress={() => router.push('/presensi')} />
          <QuickAction
            kind="riwayat"
            label="Riwayat"
            onPress={() => router.push('/explore')}
          />
          <QuickAction kind="maps" label="Maps" onPress={() => router.push('/maps')} />
          <QuickAction
            kind="izin"
            label="Izin"
            onPress={() => router.push('/riwayat-izin' as any)}
          />
        </View>

        {/* Jadwal hari ini */}
        <View style={styles.schedule}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Jadwal Praktikum</Text>
            <Pressable
              accessibilityRole="link"
              accessibilityLabel="Lihat semua jadwal"
              hitSlop={8}
              onPress={() => router.push('/jadwal')}
            >
              <Text style={styles.seeAll}>Lihat Semua</Text>
            </Pressable>
          </View>

          <View style={styles.dateCard}>
            <View style={styles.dateIconBg}>
              <Ionicons name="calendar" size={20} color="#FFFFFF" />
            </View>
            <View>
              <Text style={styles.dateText}>{formatTodayLabel()}</Text>
              <Text style={styles.dateSubText}>{today.length} sesi terjadwal hari ini</Text>
            </View>
          </View>

          {loading ? (
            <ActivityIndicator size="large" color={authColors.navy} style={{ marginTop: 20 }} />
          ) : today.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyText}>
                {search.trim()
                  ? `Tidak ada praktikum hari ini untuk "${search.trim()}".`
                  : 'Tidak ada praktikum hari ini.'}
              </Text>
              <Pressable accessibilityRole="link" hitSlop={8} onPress={() => router.push('/jadwal')}>
                <Text style={styles.emptyLink}>Lihat jadwal minggu ini</Text>
              </Pressable>
            </View>
          ) : (
            today.map((entry) => (
              <SessionCard
                key={entry.session.id}
                session={entry.session}
                status={entry.status}
                footerPrefix="Hari ini"
              />
            ))
          )}
        </View>
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
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerText: { flex: 1, paddingRight: 8 },
  greeting: { color: '#CBD5E1', fontSize: 15, marginBottom: 4 },
  name: { color: '#FFFFFF', fontSize: 32, fontWeight: '800' },

  // Pencarian
  searchWrap: { paddingHorizontal: 24, marginTop: -28 },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 16,
    height: 54,
    shadowColor: '#1B2A4E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 5,
  },
  searchInput: { flex: 1, marginLeft: 12, fontSize: 15, color: authColors.navy },

  // Menu cepat (grid 4 kolom, item ke-5 turun ke baris kedua di bawah Jadwal)
  quickCard: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 16,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 24,
    marginTop: 16,
    paddingVertical: 18,
    paddingHorizontal: 8,
    borderRadius: 22,
    shadowColor: '#1B2A4E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  quickItem: { width: '25%', alignItems: 'center', gap: 8 },
  quickLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: authColors.ink,
    textAlign: 'center',
  },

  // Jadwal
  schedule: { paddingHorizontal: 24, paddingTop: 24 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: authColors.ink },
  seeAll: { fontSize: 13, color: '#2F5BEA', fontWeight: '700' },
  dateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8EDF5',
    padding: 14,
    borderRadius: 16,
    marginBottom: 16,
  },
  dateIconBg: {
    width: 42,
    height: 42,
    backgroundColor: '#1B2A4E',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  dateText: { fontSize: 15, fontWeight: '800', color: authColors.ink },
  dateSubText: { fontSize: 12, color: '#3B4F8C', marginTop: 2 },
  emptyWrap: { alignItems: 'center', gap: 8, marginTop: 20 },
  emptyText: { textAlign: 'center', color: '#64748B', lineHeight: 20 },
  emptyLink: { color: '#2F5BEA', fontWeight: '700', fontSize: 14 },
});