import { authColors } from '@/components/auth-ui';
import { getSessionStatus } from '@/utils/session-status';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

const STATUS_UI = {
  open: { label: 'Dibuka', dot: '#22C55E', bg: '#E6F6EC', fg: '#15803D' },
  upcoming: { label: 'Belum Dibuka', dot: '#94A3B8', bg: '#EEF1F6', fg: '#64748B' },
  closed: { label: 'Ditutup', dot: '#EF4444', bg: '#FEE2E2', fg: '#B91C1C' },
};

function initials(text: string) {
  return (
    text
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase() || '?'
  );
}

export function AsistenSessionCard({ session }: { session: any }) {
  const router = useRouter();
  const st = STATUS_UI[getSessionStatus(session) as keyof typeof STATUS_UI] ?? STATUS_UI.upcoming;
  const participantCount = session.participantIds?.length || session.participants?.length || 0;

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
      onPress={() => router.push(`/detail-sesi?id=${session.id}` as any)}
    >
      <View style={[styles.chip, { backgroundColor: st.bg }]}>
        <View style={[styles.chipDot, { backgroundColor: st.dot }]} />
        <Text style={[styles.chipText, { color: st.fg }]}>{st.label}</Text>
      </View>

      <View style={styles.cardTop}>
        <View style={styles.cardAvatar}>
          <Text style={styles.cardAvatarText}>{initials(session.courseName || '')}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {session.courseName}
          </Text>
          <Text style={styles.cardSub}>
            {session.className} · {session.room}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={22} color={authColors.ink} />
      </View>

      <View style={styles.divider} />

      <View style={styles.footer}>
        <View style={styles.timeRow}>
          <Ionicons name="time-outline" size={14} color={authColors.muted} />
          <Text style={styles.timeText}>
            {session.dateLabel || 'Tanggal belum diatur'} ·{' '}
            {session.timeRange || `${session.startTime || '--'} - ${session.endTime || '--'}`}
          </Text>
        </View>
        {participantCount > 0 ? (
          <Text style={styles.presentText}>
            <Text style={styles.presentNumber}>{participantCount}</Text> Praktikan
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    paddingTop: 20,
    marginBottom: 14,
    shadowColor: '#1B2A4E',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  chip: {
    position: 'absolute',
    top: 12,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  chipDot: { width: 6, height: 6, borderRadius: 3 },
  chipText: { fontSize: 10, fontWeight: '700' },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 8 },
  cardAvatar: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: '#1B2A4E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardAvatarText: { color: '#FFFFFF', fontWeight: '800', fontSize: 15 },
  cardTitle: { color: authColors.ink, fontSize: 16, fontWeight: '800' },
  cardSub: { color: authColors.muted, fontSize: 12, marginTop: 2 },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: authColors.border,
    marginVertical: 14,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  timeText: { color: authColors.muted, fontSize: 12 },
  presentText: { color: authColors.muted, fontSize: 11 },
  presentNumber: { color: '#15803D', fontWeight: '800', fontSize: 12 },
});