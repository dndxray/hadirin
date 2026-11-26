import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { authColors } from '@/components/auth-ui';
import { getInitials } from '@/utils/schedule';

type Props = {
  session: any;
  /** Hasil getSessionStatus: 'open' | 'upcoming' | lainnya (dianggap selesai). */
  status: string;
  /** Teks di depan jam pada footer kartu, mis. "Hari ini". Kosongkan untuk hanya jam. */
  footerPrefix?: string;
};

function badgeFor(status: string) {
  if (status === 'open') {
    return { bg: '#DCFCE7', dot: '#22C55E', text: '#16A34A', label: 'Dibuka' };
  }
  if (status === 'upcoming') {
    return { bg: '#E8EDF5', dot: '#94A3B8', text: '#64748B', label: 'Belum Dibuka' };
  }
  return { bg: '#F1F5F9', dot: '#CBD5E1', text: '#94A3B8', label: 'Selesai' };
}

export function SessionCard({ session: item, status, footerPrefix }: Props) {
  const badge = badgeFor(status);
  const timeText = item.timeRange || `${item.startTime} - ${item.endTime}`;

  return (
    <Pressable
      accessibilityRole="button"
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
      onPress={() => router.push(`/detail-sesi?id=${item.id}`)}
    >
      <View style={styles.header}>
        <View style={styles.iconBg}>
          <Text style={styles.iconText}>{getInitials(item.courseName)}</Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={1}>
            {item.courseName}
          </Text>
          <Text style={styles.room} numberOfLines={1}>
            {item.className} · {item.room}
          </Text>
        </View>
        <View style={styles.right}>
          <View style={[styles.badge, { backgroundColor: badge.bg }]}>
            <View style={[styles.badgeDot, { backgroundColor: badge.dot }]} />
            <Text style={[styles.badgeText, { color: badge.text }]}>{badge.label}</Text>
          </View>
          <Ionicons name="chevron-forward" size={22} color={authColors.navy} />
        </View>
      </View>
      <View style={styles.footer}>
        <Ionicons name="time-outline" size={16} color="#94A3B8" />
        <Text style={styles.time}>{footerPrefix ? `${footerPrefix} · ${timeText}` : timeText}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#1B2A4E',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  header: { flexDirection: 'row', alignItems: 'center' },
  iconBg: {
    width: 46,
    height: 46,
    backgroundColor: '#1B2A4E',
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  iconText: { color: '#FFFFFF', fontWeight: '800', fontSize: 15 },
  info: { flex: 1, paddingRight: 8 },
  title: { fontSize: 16, fontWeight: '800', color: authColors.ink, marginBottom: 3 },
  room: { fontSize: 12, color: '#64748B' },
  right: { alignItems: 'flex-end', gap: 6 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
  badgeDot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: 10, fontWeight: '700' },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 6,
  },
  time: { fontSize: 12, color: '#64748B', fontWeight: '500' },
});