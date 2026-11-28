import { AsistenSessionCard } from '@/components/asisten-session-card';
import { authColors } from '@/components/auth-ui';
import { HomeIllustration } from '@/components/home-illustration';
import { NotificationBell } from '@/components/notification-bell';
import { QuickIllustration, type QuickKind } from '@/components/quick-menu-illustrations';
import { useAuth } from '@/context/auth-context';
import { db } from '@/lib/firebase';
import { createSession, syncSessionStatuses } from '@/services/assistant-service';
import { todayLabel as formatTodayLabel, greeting } from '@/utils/home-format';
import { dayStartMs, sessionMs } from '@/utils/schedule';
import { getSessionStatus } from '@/utils/session-status';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { collection, onSnapshot, query } from 'firebase/firestore';
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
import { SessionFormModal } from '../../features/asisten/components/SessionFormModal';

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
      <Text style={styles.quickLabel}>{label}</Text>
    </Pressable>
  );
}

export function AsistenHome() {
  const [showAddModal, setShowAddModal] = useState(false);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();

  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const qSessions = query(collection(db, 'sessions'));
    const unsubSessions = onSnapshot(
      qSessions,
      (snapshot) => {
        const classData = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        setClasses(classData);
        setLoading(false);
        void syncSessionStatuses(classData);
      },
      (error) => {
        console.error('Gagal load sesi:', error);
        setLoading(false);
      }
    );

    return () => {
      unsubSessions();
    };
  }, []);

  // Hitung ulang tiap menit supaya status dan pergantian hari ikut ter-update
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
    for (const session of classes) {
      const ms = sessionMs(session);
      if (ms === null) continue;

      const status = getSessionStatus(session) as string;

      // Sesi yang masih dibuka tetap tampil walau tanggalnya bukan hari ini
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
  }, [classes, search, tick]);

  const firstName = (profile?.name ?? '').split(/\s+/)[0] || 'Asisten';

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 130 }}
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
            <View style={styles.illustration}>
              <HomeIllustration />
            </View>
          </View>
          <NotificationBell
            style={{ position: 'absolute', right: 20, top: insets.top + 12, zIndex: 10 }}
          />
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

        {/* Menu cepat asisten */}
        <View style={styles.quickCard}>
          <QuickAction
            kind="jadwal"
            label="Jadwal"
            onPress={() => router.push('/jadwalasisten' as any)}
          />
          <QuickAction kind="kelas" label="Kelas" onPress={() => router.push('/kelas' as any)} />
          <QuickAction kind="izin" label="Izin" onPress={() => router.push('/permissions' as any)} />
          <QuickAction kind="maps" label="Maps" onPress={() => router.push('/maps' as any)} />
        </View>

        {/* Tombol tambah sesi */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Tambah jadwal sesi"
          onPress={() => setShowAddModal(true)}
          style={({ pressed }) => [styles.addButton, pressed && { opacity: 0.85 }]}
        >
          <Ionicons name="add" size={20} color="#FFFFFF" />
          <Text style={styles.addButtonText}>Tambah Jadwal Sesi</Text>
        </Pressable>

        {/* Jadwal hari ini */}
        <View style={styles.schedule}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Jadwal Praktikum</Text>
            <Pressable
              accessibilityRole="link"
              accessibilityLabel="Lihat semua jadwal"
              hitSlop={8}
              onPress={() => router.push('/jadwalasisten' as any)}
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
              <Pressable
                accessibilityRole="link"
                hitSlop={8}
                onPress={() => router.push('/jadwalasisten' as any)}
              >
                <Text style={styles.emptyLink}>Lihat jadwal minggu ini</Text>
              </Pressable>
            </View>
          ) : (
            today.map((entry) => (
              <AsistenSessionCard key={entry.session.id} session={entry.session} />
            ))
          )}
        </View>
      </ScrollView>

      <SessionFormModal
        visible={showAddModal}
        mode="create"
        onClose={() => setShowAddModal(false)}
        onSubmit={async (data) => {
          // Error sengaja tidak ditelan di sini: modal yang menampilkannya
          // dan menghentikan pengulangan kalau ada sesi yang gagal tersimpan.
          await createSession(data, profile?.name || 'Asisten');
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7FB' },

  // Header (sama dengan Home praktikan)
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
  illustration: { transform: [{ translateX: -18 }, { translateY: 12 }] },
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

  // Menu cepat
  quickCard: {
    flexDirection: 'row',
    justifyContent: 'space-around',
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
  quickItem: { alignItems: 'center', gap: 8, minWidth: 64 },
  quickLabel: { fontSize: 12, fontWeight: '600', color: authColors.ink },

  // Tombol tambah
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1B2A4E',
    marginHorizontal: 24,
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 18,
  },
  addButtonText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },

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