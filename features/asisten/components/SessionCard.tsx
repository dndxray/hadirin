import React from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { Session } from '../types';
import { SessionStatusBadge } from './SessionStatusBadge';
import { theme } from '../theme';
import { formatDate } from '../utils/format';

interface SessionCardProps {
  session: Session;
  onPress: () => void;
}

export function SessionCard({ session, onPress }: SessionCardProps) {
  const displayDate = formatDate(session.date);

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.header}>
        <View style={styles.titleSection}>
          <Text style={styles.courseName}>{session.courseName}</Text>
          <Text style={styles.kelas}>Kelas {session.kelas}</Text>
        </View>
        <SessionStatusBadge status={session.status} />
      </View>

      <View style={styles.details}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>📅</Text>
          <Text style={styles.detailValue}>{displayDate}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>⏰</Text>
          <Text style={styles.detailValue}>
            {session.startTime} - {session.endTime}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>📍</Text>
          <Text style={styles.detailValue}>{session.room}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginVertical: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.md,
  },
  titleSection: {
    flex: 1,
    marginRight: theme.spacing.md,
  },
  courseName: {
    fontSize: theme.fontSize.md,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  kelas: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
  },
  details: {
    gap: theme.spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  detailLabel: {
    fontSize: theme.fontSize.md,
  },
  detailValue: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    flex: 1,
  },
});
