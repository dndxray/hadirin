import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
import { collection, onSnapshot, query, where } from 'firebase/firestore';

import { BottomTabInset } from '@/constants/theme';
import { useAttendance } from '@/context/attendance-context';
import { useAuth } from '@/context/auth-context';
import { db } from '@/lib/firebase';
import { firebaseErrorMessage } from '@/utils/firebase-error';
import { greeting, initials } from '@/utils/home-format';
import { getSessionStatus } from '@/utils/session-status';
import { AsistenHome } from '@/components/asisten-home';

const STATUS_UI = {
  open: { label: 'Dibuka', dot: '#22C55E', bg: '#DCFCE7', fg: '#16A34A' },
  upcoming: { label: 'Belum Dibuka', dot: '#94A3B8', bg: '#EEF1F6', fg: '#64748B' },
  closed: { label: 'Ditutup', dot: '#EF4444', bg: '#FEE2E2', fg: '#B91C1C' },
};

export default function HomeScreen() {
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();
  const { hasAttended } = useAttendance();

  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const isAsisten = profile?.role === 'asisten';
  const uid = profile?.uid;

  useEffect(() => {
    if (isAsisten || !uid) return;

    // Firestore rules hanya mengizinkan praktikan membaca sesi miliknya,
    // jadi query wajib difilter participantIds.
    const q = query(collection(db, 'sessions'), where('participantIds', 'array-contains', uid));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setSessions(snapshot.docs.map((document) => ({ id: document.id, ...document.data() })));
        setError(null);
        setLoading(false);
      },
      (failure) => {
        setError(firebaseErrorMessage(failure));
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [isAsisten, uid]);

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    const sorted = [...sessions].sort((a, b) => {
      const left = getSessionStatus(a) === 'open' ? 0 : 1;
      const right = getSessionStatus(b) === 'open' ? 0 : 1;
      return left - right;
    });
    if (!keyword) return sorted;
    return sorted.filter((item) =>
      [item.courseName, item.className, item.room, item.dateLabel]
        .filter(Boolean)
        .some((value: string) => String(value).toLowerCase().includes(keyword)),
    );
  }, [sessions, search]);

  if (isAsisten) {
    return (
      <View style={{ flex: 1 }}>
        <AsistenHome />
      </View>
    );
  }

  const firstName = profile?.name?.split(/\s+/)[0] || 'Praktikan';

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>{greeting()}</Text>
            <Text style={styles.name}>Hai, {firstName}</Text>
          </View>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials(profile?.name ?? '')}</Text>
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
            accessibilityLabel="Cari mata praktikum"
          />
          {search ? (
            <Pressable onPress={() => setSearch('')} hitSlop={8} accessibilityLabel="Hapus pencarian">
              <Ionicons name="close-circle" size={18} color="#94A3B8" />
            </Pressable>
          ) : null}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + BottomTabInset + 40 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Jadwal Praktikum</Text>
          {search ? (
            <Pressable onPress={() => setSearch('')}>
              <Text style={styles.seeAllText}>Lihat Semua</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.dateCard}>
          <View style={styles.dateIconBg}>
            <Ionicons name="calendar" size={20} color="#1B2A4E" />
          </View>
          <View>
            <Text style={styles.dateText}>Jadwal Praktikum</Text>
            <Text style={styles.dateSubText}>{sessions.length} kelas terdaftar</Text>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#1B2A4E" style={{ marginTop: 20 }} />
        ) : error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : filtered.length === 0 ? (
          <Text style={styles.emptyText}>
            {search ? 'Tidak ada sesi yang cocok dengan pencarian.' : 'Belum ada jadwal praktikum.'}
          </Text>
        ) : (
          filtered.map((item) => {
            const statusType = getSessionStatus(item);
            const st = STATUS_UI[statusType];
            const attended = hasAttended(item.id);

            return (
              <Pressable
                key={item.id}
                style={styles.sessionCard}
                onPress={() => router.push(`/detail-sesi?id=${item.id}`)}
              >
                <View style={styles.sessionHeader}>
                  <View style={styles.sessionIconBg}>
                    <Text style={styles.sessionIconText}>{initials(item.courseName || '')}</Text>
                  </View>
                  <View style={styles.sessionInfo}>
                    <Text style={styles.sessionTitle}>{item.courseName}</Text>
                    <Text style={styles.sessionRoom}>{item.className} · {item.room}</Text>
                  </View>
                  <View style={styles.sessionRight}>
                    <View style={[styles.badge, { backgroundColor: attended ? '#E6F6EC' : st.bg }]}>
                      <View style={[styles.badgeDot, { backgroundColor: attended ? '#16A34A' : st.dot }]} />
                      <Text style={[styles.badgeText, { color: attended ? '#15803D' : st.fg }]}>
                        {attended ? 'Hadir' : st.label}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#64748B" />
                  </View>
                </View>
                <View style={styles.sessionFooter}>
                  <Ionicons name="time-outline" size={16} color="#94A3B8" />
                  <Text style={styles.sessionTime}>
                    {item.dateLabel} · {item.timeRange || `${item.startTime} - ${item.endTime}`}
                  </Text>
                </View>
              </Pressable>
            );
          })
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
  errorBox: { backgroundColor: '#FEE2E2', borderRadius: 12, padding: 12, marginTop: 8 },
  errorText: { color: '#B91C1C', fontSize: 13 },
  sessionCard: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
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
