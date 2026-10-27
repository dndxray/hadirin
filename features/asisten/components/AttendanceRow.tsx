import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Attendance } from '../types';
import { theme } from '../theme';
import { formatTime } from '../utils/format';

interface AttendanceRowProps {
  attendance: Attendance;
}

export function AttendanceRow({ attendance }: AttendanceRowProps) {
  return (
    <View style={styles.container}>
      <View style={styles.leftSection}>
        <Text style={styles.name}>{attendance.practitionerName}</Text>
        <Text style={styles.nim}>{attendance.practitionerNim}</Text>
      </View>
      <View style={styles.rightSection}>
        <Text style={styles.time}>{formatTime(attendance.checkedInAt)}</Text>
        <Text style={styles.status}>
          {attendance.status === 'PRESENT' ? 'Hadir' : 'Terlambat'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: 0,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftSection: {
    flex: 1,
  },
  name: {
    fontSize: theme.fontSize.sm,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  nim: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
  },
  rightSection: {
    alignItems: 'flex-end',
  },
  time: {
    fontSize: theme.fontSize.sm,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  status: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
  },
});
