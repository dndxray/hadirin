import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View, Pressable } from 'react-native';

import { AsistenHome } from '@/components/asisten-home';
import { StateView } from '@/components/state-view';
import { useAuth } from '@/context/auth-context';
import { useAttendance } from '@/context/attendance-context';
import { greeting, initials, todayLabel } from '@/utils/home-format';

export default function HomeScreen() {
  const { profile } = useAuth();
  return profile?.role === 'asisten' ? <AsistenHome /> : <PraktikanHome />;
}

function PraktikanHome() {
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();
  const { sessions, sessionState, hasAttended, permissions, retry } = useAttendance();
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const visibleSessions = sessions.filter((session) => !q || [session.courseName, session.className, session.room].some((value) => value.toLowerCase().includes(q)));
  const firstName = profile?.name?.split(' ')[0] || 'Praktikan';

  return <View style={styles.container}>
    <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
      <View style={styles.headerTop}>
        <View style={{ flex: 1 }}>
          <Text style={styles.greeting}>{greeting()}</Text>
          <Text style={styles.name}>Hai, {firstName}</Text>
        </View>
        <View style={styles.avatar}><Text style={styles.avatarText}>{initials(profile?.name ?? '')}</Text></View>
      </View>
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#64748B" />
        <TextInput accessibilityLabel="Cari mata praktikum" placeholder="Cari mata praktikum" placeholderTextColor="#64748B"
          style={styles.searchInput} value={query} onChangeText={setQuery} />
      </View>
    </View>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 120 }]} showsVerticalScrollIndicator={false}>
      <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Jadwal Praktikum</Text></View>
      <View style={styles.dateCard}>
        <View style={styles.dateIconBg}><Ionicons name="calendar" size={20} color="#1B2A4E" /></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.dateText}>{todayLabel()}</Text>
          <Text style={styles.dateSubText}>{sessions.length} sesi terdaftar untukmu</Text>
        </View>
      </View>
      {sessionState.loading ? <StateView kind="loading" title="Memuat sesi…" /> : sessionState.error ?
        <StateView kind="error" message={sessionState.error} actionLabel="Coba lagi" onAction={retry} /> :
        <>
          {sessionState.fromCache ? <Text style={[styles.sessionRoom, { marginBottom: 16 }]}>Menampilkan cache. Status akan diperbarui saat koneksi server tersedia.</Text> : null}
          {!sessions.length ? <StateView kind="empty" title="Belum ada sesi praktikum"
            message="Sesi akan muncul setelah asisten mendaftarkan akunmu sebagai peserta." /> :
            !visibleSessions.length ? <StateView kind="empty" title="Tidak ditemukan" message="Coba nama praktikum, kelas, atau ruangan lain." /> :
            visibleSessions.map((session) => {
              const status = session.status === 'open'
                ? { label: 'Dibuka', fg: '#15803D', bg: '#E6F6EC' }
                : session.status === 'upcoming'
                  ? { label: 'Belum dibuka', fg: '#52627A', bg: '#EEF1F6' }
                  : { label: 'Ditutup', fg: '#B91C1C', bg: '#FEE2E2' };
              const permission = permissions.find((item) => item.sessionId === session.id);
              return <Pressable key={session.id} accessibilityRole="button"
                accessibilityLabel={`Lihat sesi ${session.courseName}, kelas ${session.className}`}
                style={({ pressed }) => [styles.sessionCard, pressed && { opacity: 0.85 }]}
                onPress={() => router.push({ pathname: '/detail-sesi', params: { id: session.id } })}>
                <View style={styles.sessionHeader}>
                  <View style={styles.sessionIconBg}><Text style={styles.sessionIconText}>{initials(session.courseName)}</Text></View>
                  <View style={styles.sessionInfo}>
                    <Text style={styles.sessionTitle}>{session.courseName}</Text>
                    <Text style={styles.sessionRoom}>{session.className} · {session.room}</Text>
                  </View>
                  <View style={styles.sessionRight}>
                    <View style={[styles.badge, { backgroundColor: status.bg }]}>
                      <View style={[styles.badgeDot, { backgroundColor: status.fg }]} />
                      <Text style={[styles.badgeText, { color: status.fg }]}>{status.label}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#64748B" />
                  </View>
                </View>
                <View style={styles.sessionFooter}>
                  <Ionicons name="time-outline" size={16} color="#64748B" />
                  <Text style={[styles.sessionTime, { flex: 1 }]}>{session.dateLabel} · {session.timeRange}</Text>
                </View>
                {hasAttended(session.id) || permission ? <Text style={[styles.sessionRoom, { marginTop: 10 }]}>
                  {hasAttended(session.id) ? 'Sudah hadir' : 'Izin sudah diajukan'}
                </Text> : null}
              </Pressable>;
            })}
        </>}
    </ScrollView>
  </View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  header: { backgroundColor: '#1B2A4E', borderBottomLeftRadius: 30, borderBottomRightRadius: 30, paddingHorizontal: 24, paddingBottom: 40, zIndex: 1 },
  headerTop: { width: '100%', maxWidth: 560, alignSelf: 'center', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  greeting: { color: '#94A3B8', fontSize: 14, marginBottom: 4 },
  name: { color: '#FFFFFF', fontSize: 26, fontWeight: '800' },
  avatar: { width: 48, height: 48, backgroundColor: '#FCD9C5', borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#1B2A4E', fontWeight: '800', fontSize: 16 },
  searchContainer: { width: '100%', maxWidth: 560, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 16, paddingHorizontal: 16, height: 52, marginTop: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  searchInput: { flex: 1, marginLeft: 12, fontSize: 15, color: '#1B2A4E' },
  content: { width: '100%', maxWidth: 608, alignSelf: 'center', paddingHorizontal: 24, paddingTop: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#1B2A4E' },
  dateCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E8EDF5', padding: 16, borderRadius: 16, marginBottom: 16 },
  dateIconBg: { width: 40, height: 40, backgroundColor: '#D0D9E8', borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  dateText: { fontSize: 15, fontWeight: '700', color: '#1B2A4E' },
  dateSubText: { fontSize: 13, color: '#64748B', marginTop: 2 },
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
