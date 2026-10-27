import React, { useState, useMemo } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  View,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAsisten } from '../../../../features/asisten/AsistenContext';
import { SessionStatusBadge } from '../../../../features/asisten/components/SessionStatusBadge';
import { ConfirmModal } from '../../../../features/asisten/components/ConfirmModal';
import { AttendanceRow } from '../../../../features/asisten/components/AttendanceRow';
import { EmptyState } from '../../../../features/asisten/components/EmptyState';
import { theme } from '../../../../features/asisten/theme';
import { formatDate } from '../../../../features/asisten/utils/format';

export default function SessionDetailScreen() {
  const params = useLocalSearchParams<{ sessionId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { getSession, getAttendances, openSession, closeSession } = useAsisten();

  const session = getSession(params.sessionId);
  const allAttendances = session ? getAttendances(session.id) : [];

  const [showConfirmOpen, setShowConfirmOpen] = useState(false);
  const [showConfirmClose, setShowConfirmClose] = useState(false);
  const [query, setQuery] = useState('');

  const filteredAttendances = useMemo(() => {
    if (!query.trim()) {
      return allAttendances;
    }
    const lowerQuery = query.toLowerCase();
    return allAttendances.filter(
      (att) =>
        att.practitionerName.toLowerCase().includes(lowerQuery) ||
        att.practitionerNim.includes(lowerQuery)
    );
  }, [allAttendances, query]);

  const handleOpenSession = () => {
    if (session) {
      openSession(session.id);
      setShowConfirmOpen(false);
    }
  };

  const handleCloseSession = () => {
    if (session) {
      closeSession(session.id);
      setShowConfirmClose(false);
    }
  };

  if (!session) {
    return (
      <View style={styles.container}>
        <EmptyState
          icon="⚠️"
          title="Sesi tidak ditemukan"
          subtitle="Sesi yang Anda cari tidak tersedia."
        />
        <View style={styles.centerButton}>
          <Pressable
            style={[styles.button, { backgroundColor: theme.colors.primary }]}
            onPress={() => router.back()}
          >
            <Text style={styles.buttonText}>Kembali ke Jadwal</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const displayDate = formatDate(session.date);
  const totalAttendances = allAttendances.length;
  const hasAttendances = totalAttendances > 0;

  const getEmptyStateText = () => {
    if (session.status === 'CLOSED') {
      return {
        icon: '📝',
        title: 'Belum ada praktikan yang presensi',
        subtitle: 'Buka sesi untuk memulai.',
      };
    }
    if (session.status === 'OPEN') {
      return {
        icon: '⏳',
        title: 'Belum ada praktikan yang presensi',
        subtitle: 'Menunggu praktikan melakukan presensi.',
      };
    }
    return {
      icon: '📭',
      title: 'Tidak ada praktikan yang presensi',
      subtitle: 'Tidak ada praktikan yang presensi pada sesi ini.',
    };
  };

  const emptyState = getEmptyStateText();

  const renderHeader = () => (
    <View>
      <View style={styles.infoCard}>
        <View style={styles.infoHeader}>
          <View style={styles.infoTitleSection}>
            <Text style={styles.courseName}>{session.courseName}</Text>
            <Text style={styles.courseCode}>{session.courseCode}</Text>
          </View>
          <SessionStatusBadge status={session.status} />
        </View>

        <View style={styles.infoDetails}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Kelas:</Text>
            <Text style={styles.infoValue}>{session.kelas}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Tanggal:</Text>
            <Text style={styles.infoValue}>{displayDate}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Waktu:</Text>
            <Text style={styles.infoValue}>
              {session.startTime} - {session.endTime}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Ruangan:</Text>
            <Text style={styles.infoValue}>{session.room}</Text>
          </View>
          {session.description && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Deskripsi:</Text>
              <Text style={styles.infoValue}>{session.description}</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.actionSection}>
        {session.status === 'CLOSED' && (
          <Pressable
            style={[
              styles.button,
              styles.actionButton,
              { backgroundColor: theme.colors.green },
            ]}
            onPress={() => setShowConfirmOpen(true)}
          >
            <Text style={styles.buttonText}>Buka Sesi</Text>
          </Pressable>
        )}

        {session.status === 'OPEN' && (
          <Pressable
            style={[
              styles.button,
              styles.actionButton,
              { backgroundColor: theme.colors.red },
            ]}
            onPress={() => setShowConfirmClose(true)}
          >
            <Text style={styles.buttonText}>Tutup Sesi</Text>
          </Pressable>
        )}

        {session.status === 'ENDED' && (
          <View style={styles.endedCard}>
            <Text style={styles.endedText}>Sesi telah ditutup</Text>
          </View>
        )}
      </View>

      <View style={styles.attendanceSection}>
        <View style={styles.attendanceHeader}>
          <Text style={styles.sectionTitle}>Daftar Kehadiran</Text>
          <Text style={styles.attendanceCount}>
            {totalAttendances} praktikan sudah hadir
          </Text>
        </View>

        {hasAttendances && (
          <TextInput
            style={styles.searchInput}
            placeholder="Cari nama atau NIM"
            placeholderTextColor={theme.colors.textMuted}
            value={query}
            onChangeText={setQuery}
          />
        )}
      </View>
    </View>
  );

  const renderEmptyComponent = () => {
    if (hasAttendances && filteredAttendances.length === 0) {
      return (
        <EmptyState
          icon="🔍"
          title={`Tidak ada hasil untuk "${query}"`}
        />
      );
    }
    if (!hasAttendances) {
      return (
        <EmptyState
          icon={emptyState.icon}
          title={emptyState.title}
          subtitle={emptyState.subtitle}
        />
      );
    }
    return undefined;
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <FlatList
        data={filteredAttendances}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader()}
        renderItem={({ item }) => <AttendanceRow attendance={item} />}
        ListEmptyComponent={renderEmptyComponent()}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.contentContainer,
          { paddingBottom: insets.bottom + theme.spacing.lg },
        ]}
      />

      <ConfirmModal
        visible={showConfirmOpen}
        title="Buka Sesi"
        message={`Buka sesi ${session.courseName} — Kelas ${session.kelas}? Praktikan akan dapat melakukan presensi.`}
        confirmLabel="Buka"
        confirmColor="green"
        onConfirm={handleOpenSession}
        onCancel={() => setShowConfirmOpen(false)}
      />

      <ConfirmModal
        visible={showConfirmClose}
        title="Tutup Sesi"
        message="Tutup sesi? Setelah ditutup, praktikan tidak dapat presensi lagi."
        confirmLabel="Tutup"
        confirmColor="red"
        onConfirm={handleCloseSession}
        onCancel={() => setShowConfirmClose(false)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  contentContainer: {
    paddingHorizontal: theme.spacing.lg,
    maxWidth: theme.layout.maxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  infoCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginTop: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  infoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.md,
  },
  infoTitleSection: {
    flex: 1,
    marginRight: theme.spacing.md,
  },
  courseName: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  courseCode: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
  },
  infoDetails: {
    gap: theme.spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
  },
  infoLabel: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    width: 80,
  },
  infoValue: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text,
    flex: 1,
    flexWrap: 'wrap',
  },
  actionSection: {
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  button: {
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButton: {
    maxWidth: theme.layout.maxButtonWidth,
    width: '100%',
    alignSelf: 'center',
  },
  buttonText: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.white,
  },
  endedCard: {
    backgroundColor: theme.colors.grayLight,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
    maxWidth: theme.layout.maxButtonWidth,
    width: '100%',
    alignSelf: 'center',
  },
  endedText: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.textMuted,
  },
  attendanceSection: {
    marginBottom: theme.spacing.md,
  },
  attendanceHeader: {
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  attendanceCount: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
  },
  searchInput: {
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    fontSize: theme.fontSize.sm,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  centerButton: {
    paddingHorizontal: theme.spacing.lg,
    maxWidth: theme.layout.maxButtonWidth,
    width: '100%',
    alignSelf: 'center',
  },
});
