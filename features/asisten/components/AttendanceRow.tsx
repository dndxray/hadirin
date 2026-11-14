import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Attendance } from '../types';
import { theme } from '../theme';
import { formatTime } from '../utils/format';

interface AttendanceRowProps {
  attendance: Attendance;
}

function getInitials(name: string): string {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export function AttendanceRow({ attendance }: AttendanceRowProps) {
  const initials = getInitials(attendance.practitionerName);
  const timeFormatted = formatTime(attendance.checkedInAt);

  return (
    <View style={styles.container}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initials}</Text>
      </View>

      <View style={styles.infoSection}>
        <Text style={styles.name} numberOfLines={1}>
          {attendance.practitionerName}
        </Text>
        <Text style={styles.nim}>{attendance.practitionerNim}</Text>
      </View>

      <View style={styles.badgeSection}>
        <View style={styles.statusBadge}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>Hadir</Text>
        </View>
        <Text style={styles.timeText}>{timeFormatted}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.card,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  avatarText: {
    color: '#4F46E5',
    fontWeight: '700',
    fontSize: theme.fontSize.sm,
  },
  infoSection: {
    flex: 1,
    justifyContent: 'center',
    marginRight: theme.spacing.sm,
  },
  name: {
    fontSize: theme.fontSize.md,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 2,
  },
  nim: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
  },
  badgeSection: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.full,
    marginBottom: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.green,
    marginRight: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#065F46',
  },
  timeText: {
    fontSize: 11,
    fontWeight: '500',
    color: theme.colors.textMuted,
  },
});
