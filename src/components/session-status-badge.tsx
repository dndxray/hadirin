import { StyleSheet, Text, View } from 'react-native';

import { useAttendanceTheme } from '@/constants/attendance-theme';
import type { SessionStatus } from '@/types/attendance';

const statusCopy: Record<SessionStatus, string> = {
  open: 'Sesi dibuka',
  upcoming: 'Belum dibuka',
  closed: 'Sesi selesai',
};

export function SessionStatusBadge({ status }: { status: SessionStatus }) {
  const colors = useAttendanceTheme();
  const tone =
    status === 'open'
      ? { background: colors.successSoft, foreground: colors.success }
      : status === 'upcoming'
        ? { background: colors.warningSoft, foreground: colors.warning }
        : { background: colors.surfaceMuted, foreground: colors.inkMuted };

  return (
    <View
      accessibilityLabel={`Status ${statusCopy[status]}`}
      style={[styles.badge, { backgroundColor: tone.background }]}>
      <View style={[styles.dot, { backgroundColor: tone.foreground }]} />
      <Text style={[styles.label, { color: tone.foreground }]}>{statusCopy[status]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  dot: {
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
});
