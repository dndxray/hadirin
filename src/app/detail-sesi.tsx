import { router, useLocalSearchParams } from 'expo-router';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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

export default function DetailSesiScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const session = schedules.find((item) => item.id === id);

  function getStatusLabel(status: string) {
    if (status === 'ongoing') {
      return 'Sedang berlangsung';
    }

    if (status === 'completed') {
      return 'Selesai';
    }

    return 'Akan berlangsung';
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[
          styles.container,
          {
            paddingTop: insets.top + 20,
            paddingBottom: insets.bottom + 32,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Text style={styles.backText}>‹ Kembali ke jadwal</Text>
        </Pressable>

        {!session ? (
          <View style={styles.card}>
            <Text style={styles.title}>Sesi tidak ditemukan</Text>
            <Text style={styles.description}>
              Maaf, informasi jadwal praktikum ini tidak tersedia.
            </Text>

            <Pressable
              onPress={() => router.replace('/jadwal')}
              style={styles.button}
            >
              <Text style={styles.buttonText}>Lihat Jadwal</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <Text style={styles.brand}>HADIRIN</Text>
            <Text style={styles.title}>Detail Sesi</Text>
            <Text style={styles.description}>
              Informasi lengkap jadwal praktikum kamu.
            </Text>

            <View style={styles.card}>
              <Text style={styles.label}>MATA KULIAH</Text>
              <Text style={styles.courseName}>
                {session.courseName}
              </Text>

              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>
                  {getStatusLabel(session.status)}
                </Text>
              </View>

              <View style={styles.divider} />

              <Text style={styles.label}>KELAS</Text>
              <Text style={styles.value}>{session.className}</Text>

              <Text style={styles.label}>TANGGAL</Text>
              <Text style={styles.value}>{session.date}</Text>

              <Text style={styles.label}>WAKTU PRAKTIKUM</Text>
              <Text style={styles.value}>
                {session.startTime}–{session.endTime} WIB
              </Text>

              <Text style={styles.label}>RUANGAN</Text>
              <Text style={styles.value}>{session.room}</Text>

              <Text style={styles.label}>ASISTEN PRAKTIKUM</Text>
              <Text style={styles.value}>{session.assistant}</Text>
            </View>

            <Text style={styles.note}>
              Informasi sesi ini merupakan data simulasi untuk
              prototipe aplikasi Hadirin.
            </Text>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0B1120',
  },
  container: {
    paddingHorizontal: 24,
  },
  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: 10,
    marginBottom: 24,
  },
  backText: {
    color: '#2DD4BF',
    fontSize: 15,
    fontWeight: '600',
  },
  brand: {
    color: '#2DD4BF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 3,
    marginBottom: 8,
  },
  title: {
    color: '#F8FAFC',
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 8,
  },
  description: {
    color: '#94A3B8',
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 24,
  },
  card: {
    backgroundColor: '#111C30',
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: '#25334A',
  },
  label: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginTop: 22,
    marginBottom: 8,
  },
  courseName: {
    color: '#F8FAFC',
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 30,
  },
  value: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '600',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#123D3B',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 16,
  },
  statusText: {
    color: '#5EEAD4',
    fontSize: 12,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: '#25334A',
    marginTop: 24,
  },
  note: {
    color: '#64748B',
    fontSize: 12,
    lineHeight: 19,
    marginTop: 20,
  },
  button: {
    backgroundColor: '#14B8A6',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  buttonText: {
    color: '#0B1120',
    fontWeight: '800',
    fontSize: 14,
  },
});