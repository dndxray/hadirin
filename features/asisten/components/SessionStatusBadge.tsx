import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SessionStatus } from '../types';
import { theme } from '../theme';

interface SessionStatusBadgeProps {
  status: SessionStatus;
}

const STATUS_CONFIG: Record<
  SessionStatus,
  { label: string; bg: string; text: string; dot: string }
> = {
  CLOSED: {
    label: 'Belum Dibuka',
    bg: '#F3F4F6',
    text: '#4B5563',
    dot: theme.colors.gray,
  },
  OPEN: {
    label: 'Sedang Berlangsung',
    bg: '#ECFDF5',
    text: '#065F46',
    dot: theme.colors.green,
  },
  ENDED: {
    label: 'Sudah Ditutup',
    bg: '#FEF2F2',
    text: '#991B1B',
    dot: theme.colors.red,
  },
};

export function SessionStatusBadge({ status }: SessionStatusBadgeProps) {
  const config = STATUS_CONFIG[status];

  return (
    <View style={[styles.badge, { backgroundColor: config.bg }]}>
      <View style={[styles.dot, { backgroundColor: config.dot }]} />
      <Text style={[styles.text, { color: config.text }]}>{config.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.full,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  text: {
    fontSize: theme.fontSize.xs,
    fontWeight: '600',
  },
});
