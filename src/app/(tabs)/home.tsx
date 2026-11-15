import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Pressable,
} from 'react-native';

import { AsistenHome } from '@/components/asisten-home';
import { authColors } from '@/components/auth-ui';
import { useAuth } from '@/context/auth-context';

// Data dummy buat tampilan (nanti bisa diganti dari Firestore)
const DUMMY_SESSIONS = [
  { id: '1', title: 'Pembelajaran Mesin', room: 'Lab B', time: '10.20 - 12.10', status: 'Dibuka' },
  { id: '2', title: 'Pembelajaran Mesin', room: 'Lab B', time: '13.00 - 15.00', status: 'Belum Dibuka' },
  { id: '3', title: 'Pembelajaran Mesin', room: 'Lab B', time: '13.00 - 15.00', status: 'Belum Dibuka' },
];

export default function HomeScreen() {
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();

  // Kalau yang login Asisten, tampilkan AsistenHome yang lama
  if (profile?.role === 'asisten') {
    return (
      <View style={{ flex: 1 }}>
        <AsistenHome />
      </View>
    );
  }

  // Kalau Praktikan, tampilkan UI sesuai gambar Figma
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  const firstName = profile?.name?.split(' ')[0] || 'Praktikan';

  return (
    <View style={styles.container}>
      {/* HEADER BIRU */}
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>Selamat Pagi!</Text>
            <Text style={styles.name}>Hai, {firstName}</Text>
          </View>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials(profile?.name || 'P')}</Text>
          </View>
        </View>

        {/* SEARCH BAR */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#94A3B8" />
          <TextInput
            placeholder="Cari mata praktikum"
            placeholderTextColor="#94A3B8"
            style={styles.searchInput}
          />
        </View>
      </View>

      {/* KONTEN SCROLL */}
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Jadwal Praktikum</Text>
          <Pressable>
            <Text style={styles.seeAllText}>Lihat Semua</Text>
          </Pressable>
        </View>

        {/* KARTU TANGGAL */}
        <View style={styles.dateCard}>
          <View style={styles.dateIconBg}>
            <Ionicons name="calendar" size={20} color="#1B2A4E" />
          </View>
          <View>
            <Text style={styles.dateText}>Rabu, 9 November 2026</Text>
            <Text style={styles.dateSubText}>3 sesi terjadwal hari ini</Text>
          </View>
        </View>

        {/* LIST SESI */}
        {DUMMY_SESSIONS.map((session, index) => (
          <View key={index} style={styles.sessionCard}>
            <View style={styles.sessionHeader}>
              <View style={styles.sessionIconBg}>
                <Text style={styles.sessionIconText}>PM</Text>
              </View>
              <View style={styles.sessionInfo}>
                <Text style={styles.sessionTitle}>{session.title}</Text>
                <Text style={styles.sessionRoom}>{session.room}</Text>
              </View>
              <View style={styles.sessionRight}>
                <View
                  style={[
                    styles.badge,
                    session.status === 'Dibuka' ? styles.badgeOpen : styles.badgeClosed,
                  ]}
                >
                  <View
                    style={[
                      styles.badgeDot,
                      session.status === 'Dibuka' ? styles.dotOpen : styles.dotClosed,
                    ]}
                  />
                  <Text
                    style={[
                      styles.badgeText,
                      session.status === 'Dibuka' ? styles.textOpen : styles.textClosed,
                    ]}
                  >
                    {session.status}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#64748B" />
              </View>
            </View>
            <View style={styles.sessionFooter}>
              <Ionicons name="time-outline" size={16} color="#94A3B8" />
              <Text style={styles.sessionTime}>{session.time}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  header: {
    backgroundColor: '#1B2A4E',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    paddingHorizontal: 24,
    paddingBottom: 40,
    zIndex: 1,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  greeting: {
    color: '#94A3B8',
    fontSize: 14,
    marginBottom: 4,
  },
  name: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '800',
  },
  avatar: {
    width: 48,
    height: 48,
    backgroundColor: '#FCD9C5',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#1B2A4E',
    fontWeight: '800',
    fontSize: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 52,
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 15,
    color: '#1B2A4E',
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1B2A4E',
  },
  seeAllText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  dateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8EDF5',
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
  },
  dateIconBg: {
    width: 40,
    height: 40,
    backgroundColor: '#D0D9E8',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  dateText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1B2A4E',
  },
  dateSubText: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  sessionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sessionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sessionIconBg: {
    width: 44,
    height: 44,
    backgroundColor: '#1B2A4E',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  sessionIconText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  sessionInfo: {
    flex: 1,
  },
  sessionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1B2A4E',
    marginBottom: 4,
  },
  sessionRoom: {
    fontSize: 13,
    color: '#64748B',
  },
  sessionRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  badgeOpen: {
    backgroundColor: '#DCFCE7',
  },
  badgeClosed: {
    backgroundColor: '#F1F5F9',
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotOpen: {
    backgroundColor: '#22C55E',
  },
  dotClosed: {
    backgroundColor: '#94A3B8',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  textOpen: {
    color: '#16A34A',
  },
  textClosed: {
    color: '#64748B',
  },
  sessionFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 6,
  },
  sessionTime: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
});