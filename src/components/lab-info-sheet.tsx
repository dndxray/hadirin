import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { authColors } from '@/components/auth-ui';
import { getLabActivities, type LabActivity } from '@/components/lab-dummy-data';
import type { Lab } from '@/types/lab';

type Props = {
  lab: Lab;
  onClose: () => void;
};

// Popup dari bawah yang tampil saat marker lab dipilih (SRS-24):
// praktikum yang sedang berlangsung dan praktikum berikutnya.
export function LabInfoSheet({ lab, onClose }: Props) {
  const { current, next } = getLabActivities(lab.id);

  return (
    <View style={styles.sheet}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.name}>{lab.name}</Text>
          <Text style={styles.meta}>Radius presensi {lab.radiusMeters} m</Text>
        </View>
        <Pressable onPress={onClose} hitSlop={12} accessibilityLabel="Tutup informasi lab">
          <Ionicons name="close" size={22} color={authColors.muted} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <ActivitySection
          title="Sedang berlangsung"
          activity={current}
          emptyText="Tidak ada praktikum yang sedang berlangsung."
          live
        />
        <ActivitySection
          title="Berikutnya"
          activity={next}
          emptyText="Belum ada praktikum berikutnya."
        />
      </ScrollView>
    </View>
  );
}

type SectionProps = {
  title: string;
  activity: LabActivity | null;
  emptyText: string;
  live?: boolean;
};

function ActivitySection({ title, activity, emptyText, live }: SectionProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {activity ? (
        <View style={styles.card}>
          <View style={styles.cardTop}>
            <Text style={styles.activityName}>{activity.name}</Text>
            <View style={[styles.chip, live ? styles.chipLive : styles.chipPlain]}>
              <Text style={[styles.chipText, live ? styles.chipTextLive : styles.chipTextPlain]}>
                {activity.status}
              </Text>
            </View>
          </View>
          <Text style={styles.activityMeta}>{activity.className}</Text>
          <View style={styles.timeRow}>
            <Ionicons name="time-outline" size={14} color={authColors.muted} />
            <Text style={styles.activityMeta}>{activity.time}</Text>
          </View>
        </View>
      ) : (
        <Text style={styles.empty}>{emptyText}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '60%',
    paddingTop: 16,
    paddingHorizontal: 16,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    backgroundColor: authColors.white,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -2 },
  },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  headerText: { flex: 1, gap: 2 },
  name: { fontSize: 17, fontWeight: '800', color: authColors.ink },
  meta: { fontSize: 13, color: authColors.muted },
  body: { paddingTop: 14, paddingBottom: 20, gap: 14 },
  section: { gap: 8 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: authColors.muted },
  card: {
    gap: 4,
    padding: 12,
    borderRadius: 14,
    backgroundColor: authColors.field,
    borderWidth: 1,
    borderColor: authColors.border,
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  activityName: { flex: 1, fontSize: 15, fontWeight: '700', color: authColors.ink },
  activityMeta: { fontSize: 13, color: authColors.muted },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  chip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  chipLive: { backgroundColor: '#DCFCE7' },
  chipPlain: { backgroundColor: authColors.white, borderWidth: 1, borderColor: authColors.border },
  chipText: { fontSize: 11, fontWeight: '700' },
  chipTextLive: { color: authColors.green },
  chipTextPlain: { color: authColors.muted },
  empty: { fontSize: 13, color: authColors.muted },
});
