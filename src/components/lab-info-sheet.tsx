import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { authColors } from '@/components/auth-ui';
import type { Lab } from '@/types/lab'; // Sesuaikan path tipe Lab lu
import type { ClassSchedule } from '@/hooks/use-lab-sessions';

type Props = {
  lab: Lab;
  sessions: ClassSchedule[]; 
  loading: boolean;
  error: string | null;
  onClose: () => void;
};

export function LabInfoSheet({ lab, sessions = [], loading, error, onClose }: Props) {
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{lab.name}</Text>
              <Text style={styles.subtitle}>Radius presensi {lab.radiusMeters} m</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={authColors.ink} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            {loading ? (
              <View style={styles.centerBox}>
                <ActivityIndicator color={authColors.navy} />
                <Text style={styles.msg}>Memuat jadwal kelas...</Text>
              </View>
            ) : error ? (
              <View style={styles.centerBox}>
                <Ionicons name="alert-circle-outline" size={32} color={authColors.danger} />
                <Text style={styles.errorMsg}>{error}</Text>
              </View>
            ) : sessions.length === 0 ? (
              <View style={styles.centerBox}>
                <Ionicons name="calendar-outline" size={32} color={authColors.muted} />
                <Text style={styles.msg}>Belum ada jadwal praktikum di lab ini.</Text>
              </View>
            ) : (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Jadwal Praktikum</Text>
                {sessions.map(s => <CardClass key={s.id} data={s} />)}
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function CardClass({ data }: { data: ClassSchedule }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{data.course}</Text>
      </View>
      <Text style={styles.cardClass}>{data.name}</Text>
      <View style={styles.timeRow}>
        <Ionicons name="location-outline" size={14} color={authColors.muted} />
        <Text style={styles.timeText}>{data.room}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  sheet: {
    backgroundColor: authColors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 24,
    maxHeight: '60%',
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -2 },
  },
  header: { flexDirection: 'row', padding: 20, borderBottomWidth: 1, borderBottomColor: authColors.border, alignItems: 'center' },
  title: { fontSize: 18, fontWeight: '800', color: authColors.ink },
  subtitle: { fontSize: 13, color: authColors.muted, marginTop: 4 },
  closeBtn: { padding: 4 },
  content: { padding: 20, flexShrink: 1 },
  centerBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40, gap: 8 },
  msg: { color: authColors.muted, fontSize: 14, textAlign: 'center' },
  errorMsg: { color: authColors.danger, fontSize: 14, textAlign: 'center' },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: authColors.ink, marginBottom: 12 },
  card: { backgroundColor: '#F8FAFC', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: authColors.ink, flex: 1 },
  cardClass: { fontSize: 13, color: authColors.muted, marginBottom: 12 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  timeText: { fontSize: 12, color: authColors.muted, fontWeight: '600' },
});