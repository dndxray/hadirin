import { router, useLocalSearchParams } from 'expo-router';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useRole } from '@/hooks/use-role';

const schedules = [
  {
    id: 'S001',
    courseName: 'Pemrograman Mobile',
    className: 'IF-A',
    date: '27 Oktober 2026',
    startTime: '09.00',
    endTime: '10.40',
    room: 'Lab Komputer 1',
    assistant: 'Fadhil Ramadhan',
    status: 'ongoing',
  },
  {
    id: 'S002',
    courseName: 'Basis Data',
    className: 'IF-B',
    date: '28 Oktober 2026',
    startTime: '13.00',
    endTime: '14.40',
    room: 'Lab Komputer 2',
    assistant: 'Caesar Aditya',
    status: 'upcoming',
  },
  {
    id: 'S003',
    courseName: 'Algoritma dan Pemrograman',
    className: 'IF-A',
    date: '24 Oktober 2026',
    startTime: '10.00',
    endTime: '11.40',
    room: 'Lab Komputer 1',
    assistant: 'Fadhil Ramadhan',
    status: 'completed',
  },
];

function getStatusLabel(status: string) {
  if (status === 'ongoing') {
    return 'Sedang berlangsung';
  }

  if (status === 'completed') {
    return 'Selesai';
  }

  return 'Akan berlangsung';
}

export default function JadwalScreen() {
  const insets = useSafeAreaInsets();
  const role = useRole();
  const { userId } = useLocalSearchParams<{ userId?: string }>();

  const paddingTop = Platform.OS === 'web' ? 100 : insets.top + 24;

  const userName =
    role === 'asisten' ? 'Asisten Praktikum' : 'Praktikan';

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[
          styles.container,
          {
            paddingTop,
            paddingBottom: insets.bottom + 32,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>HADIRIN</Text>
            <Text style={styles.title}>Jadwal Praktikum</Text>
            <Text style={styles.subtitle}>
              Halo, {userName}! Berikut daftar sesi praktikummu.
            </Text>
          </View>

          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {role === 'asisten' ? 'A' : 'P'}
            </Text>
          </View>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>TOTAL SESI</Text>
          <Text style={styles.summaryNumber}>{schedules.length}</Text>
          <Text style={styles.summaryDescription}>
            Jadwal praktikum tersedia
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Semua jadwal</Text>

        {schedules.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Belum ada jadwal</Text>
            <Text style={styles.emptyDescription}>
              Jadwal praktikum yang tersedia akan muncul di sini.
            </Text>
          </View>
        ) : (
          schedules.map((session) => (
            <Pressable
              key={session.id}
              onPress={() =>
                router.push({
                  pathname: '/detail-sesi',
                  params: {
                    id: session.id,
                    role,
                    userId: userId ?? '',
                  },
                })
              }
              style={({ pressed }) => [
                styles.scheduleCard,
                pressed && styles.pressedCard,
              ]}
            >
              <View style={styles.cardTop}>
                <Text style={styles.classLabel}>
                  KELAS {session.className}
                </Text>

                <View
                  style={[
                    styles.statusBadge,
                    session.status === 'ongoing' && styles.ongoingBadge,
                    session.status === 'upcoming' && styles.upcomingBadge,
                    session.status === 'completed' && styles.completedBadge,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      session.status === 'ongoing' && styles.ongoingText,
                      session.status === 'upcoming' && styles.upcomingText,
                      session.status === 'completed' && styles.completedText,
                    ]}
                  >
                    {getStatusLabel(session.status)}
                  </Text>
                </View>
              </View>

              <Text style={styles.courseName}>{session.courseName}</Text>

              <View style={styles.infoRow}>
                <Text style={styles.infoIcon}>▦</Text>
                <Text style={styles.infoText}>{session.date}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoIcon}>◷</Text>
                <Text style={styles.infoText}>
                  {session.startTime}–{session.endTime}
                </Text>
              </View>

              <View style={styles.cardFooter}>
                <Text style={styles.roomText}>{session.room}</Text>
                <Text style={styles.detailButton}>Lihat detail →</Text>
              </View>
            </Pressable>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#0B1120',
    flex: 1,
  },
  container: {
    alignSelf: 'center',
    maxWidth: 560,
    paddingHorizontal: 22,
    width: '100%',
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  greeting: {
    color: '#2DD4BF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 3,
  },
  title: {
    color: '#F8FAFC',
    fontSize: 27,
    fontWeight: '800',
    marginTop: 10,
  },
  subtitle: {
    color: '#94A3B8',
    fontSize: 13,
    lineHeight: 20,
    marginTop: 6,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: '#12302F',
    borderColor: '#2DD4BF',
    borderRadius: 22,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  avatarText: {
    color: '#2DD4BF',
    fontSize: 17,
    fontWeight: '800',
  },
  summaryCard: {
    backgroundColor: '#12302F',
    borderColor: '#24514D',
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 28,
    padding: 20,
  },
  summaryLabel: {
    color: '#99F6E4',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
  },
  summaryNumber: {
    color: '#F8FAFC',
    fontSize: 36,
    fontWeight: '900',
    marginTop: 5,
  },
  summaryDescription: {
    color: '#99F6E4',
    fontSize: 13,
    marginTop: 2,
  },
  sectionTitle: {
    color: '#F8FAFC',
    fontSize: 19,
    fontWeight: '800',
    marginBottom: 14,
    marginTop: 30,
  },
  scheduleCard: {
    backgroundColor: '#111C30',
    borderColor: '#263449',
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 14,
    padding: 17,
  },
  pressedCard: {
    opacity: 0.75,
  },
  cardTop: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
  },
  classLabel: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  statusBadge: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  ongoingBadge: {
    backgroundColor: '#123F3A',
  },
  upcomingBadge: {
    backgroundColor: '#3B3018',
  },
  completedBadge: {
    backgroundColor: '#273449',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  ongoingText: {
    color: '#5EEAD4',
  },
  upcomingText: {
    color: '#FCD34D',
  },
  completedText: {
    color: '#CBD5E1',
  },
  courseName: {
    color: '#F8FAFC',
    fontSize: 19,
    fontWeight: '800',
    lineHeight: 26,
    marginTop: 17,
  },
  infoRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: 12,
  },
  infoIcon: {
    color: '#2DD4BF',
    fontSize: 17,
    width: 28,
  },
  infoText: {
    color: '#CBD5E1',
    fontSize: 13,
  },
  cardFooter: {
    alignItems: 'center',
    borderTopColor: '#263449',
    borderTopWidth: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
    marginTop: 17,
    paddingTop: 14,
  },
  roomText: {
    color: '#94A3B8',
    fontSize: 12,
  },
  detailButton: {
    color: '#2DD4BF',
    fontSize: 12,
    fontWeight: '800',
  },
  emptyCard: {
    alignItems: 'center',
    backgroundColor: '#111C30',
    borderColor: '#263449',
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
  },
  emptyTitle: {
    color: '#F8FAFC',
    fontSize: 17,
    fontWeight: '800',
  },
  emptyDescription: {
    color: '#94A3B8',
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
    textAlign: 'center',
  },
});