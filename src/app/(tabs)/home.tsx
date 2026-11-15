import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { collection, onSnapshot } from 'firebase/firestore';

import { useAuth } from '@/context/auth-context';
import { db } from '@/lib/firebase';
import { getSessionStatus } from '@/utils/session-status';
import { AsistenHome } from '@/components/asisten-home'; // IMPORT ASISTEN HOME

export default function HomeScreen() {
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();
  
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.role === 'asisten') return; // Jangan tarik data kalau yang login asisten

    const q = collection(db, 'sessions');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setSessions(data);
      setLoading(false);
    }, (error) => {
      console.error("Gagal load sesi:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [profile?.role]);

  // ===== INI KUNCINYA =====
  // Kalau yang login Asisten, lempar ke tampilan AsistenHome
  if (profile?.role === 'asisten') {
    return (
      <View style={{ flex: 1 }}>
        <AsistenHome />
      </View>
    );
  }
  // ========================

  const getInitials = (name?: string) => {
    if (!name) return 'MK';
    return name.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase();
  };

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
          />
        </View>
      </View>

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

        <View style={styles.dateCard}>
          <View style={styles.dateIconBg}>
            <Ionicons name="calendar" size={20} color="#1B2A4E" />
          </View>
          <View>
            <Text style={styles.dateText}>Jadwal Praktikum</Text>
            <Text style={styles.dateSubText}>{sessions.length} sesi terdaftar</Text>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#1B2A4E" style={{ marginTop: 20 }} />
        ) : sessions.length === 0 ? (
          <Text style={{ textAlign: 'center', color: '#64748B', marginTop: 20 }}>
            Belum ada jadwal praktikum.
          </Text>
        ) : (
          sessions.map((item) => {
            const status = getSessionStatus(item);
            const isOpen = status === 'open';
            const isUpcoming = status === 'upcoming';

            let badgeBg = '#EEF1F6';
            let dotBg = '#94A3B8';
            let textColor = '#64748B';
            let textLabel = 'Belum Dibuka';

            if (isOpen) {
              badgeBg = '#DCFCE7'; dotBg = '#22C55E'; textColor = '#16A34A'; textLabel = 'Dibuka';
            } else if (!isUpcoming) {
              badgeBg = '#FEE2E2'; dotBg = '#EF4444'; textColor = '#B91C1C'; textLabel = 'Ditutup';
            }

            return (
              <Pressable 
                key={item.id} 
                style={styles.sessionCard}
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