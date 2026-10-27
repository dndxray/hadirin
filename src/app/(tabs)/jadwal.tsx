import { router } from 'expo-router';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useApp } from '@/context/app-context';
import { practiceSessions } from '@/data/dummy-attendance';
import type { SessionStatus } from '@/types/attendance';

function getStatusLabel(status: SessionStatus) {
  if (status === 'open') {
    return 'Sedang berlangsung';
  }

  if (status === 'closed') {
    return 'Selesai';
  }

  return 'Akan berlangsung';
}

export default function JadwalScreen() {
  const insets = useSafeAreaInsets();
  const { currentUser } = useApp();

  const isAsisten = currentUser?.role === 'asisten';
  const paddingTop = Platform.OS === 'web' ? 100 : insets.top + 24;

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingTop, paddingBottom: insets.bottom + 32 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {!isAsisten ? (
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backText}>‹ Kembali</Text>
          </Pressable>
        ) : null}

        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.greeting}>HADIRIN</Text>
            <Text style={styles.title}>Jadwal Praktikum</Text>
            <Text style={styles.subtitle}>
              Halo, {currentUser?.name}! Berikut daftar sesi praktikummu.
            </Text>
          </View>

          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {currentUser?.name.charAt(0)}
            </Text>
          </View>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>TOTAL SESI</Text>
          <Text style={styles.summaryNumber}>{practiceSessions.length}</Text>
          <Text style={styles.summaryDescription}>
            Jadwal praktikum tersedia
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Semua jadwal</Text>

        {practiceSessions.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Belum ada jadwal</Text>
            <Text style={styles.emptyDescription}>
              Jadwal praktikum yang tersedia akan muncul di sini.
            </Text>
          </View>
        ) : (
          practiceSessions.map((session) => (
            <Pressable
              key={session.id}
              onPress={() =>
                router.push({
                  pathname: '/detail-sesi',
                  params: { id: session.id },
                })
              }
              style={({ pressed }) => [
                styles.scheduleCard,
                pressed && styles.pressedCard,
              ]}
            >
              <View style={styles.cardTop}>
                <Text style={styles.classLabel}>KELAS {session.className}</Text>

                <View
                  style={[
                    styles.statusBadge,
                    session.status === 'open' && styles.openBadge,
                    session.status === 'upcoming' && styles.upcomingBadge,
                    session.status === 'closed' && styles.closedBadge,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      session.status === 'open' && styles.openText,
                      session.status === 'upcoming' && styles.upcomingText,
                      session.status === 'closed' && styles.closedText,
                    ]}
                  >
                    {getStatusLabel(session.status)}
                  </Text>
                </View>
              </View>

              <Text style={styles.courseName}>{session.courseName}</Text>

              <View style={styles.infoRow}>
                <Text style={styles.infoIcon}>▦</Text>
                <Text style={styles.infoText}>{session.dateLabel}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoIcon}>◷</Text>
                <Text style={styles.infoText}>{session.timeRange}</Text>
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
  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    marginBottom: 12,
  },
  backText: {
    color: '#2DD4BF',
    fontSize: 15,
    fontWeight: '600',
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerCopy: {
    flex: 1,
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
  openBadge: {
    backgroundColor: '#123F3A',
  },
  upcomingBadge: {
    backgroundColor: '#3B3018',
  },
  closedBadge: {
    backgroundColor: '#273449',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  openText: {
    color: '#5EEAD4',
  },
  upcomingText: {
    color: '#FCD34D',
  },
  closedText: {
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