import { SessionEnrollment } from '@/components/session-enrollment';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAsisten } from '../../../../features/asisten/AsistenContext';
import { AttendanceRow } from '../../../../features/asisten/components/AttendanceRow';
import { ConfirmModal } from '../../../../features/asisten/components/ConfirmModal';
import { EmptyState } from '../../../../features/asisten/components/EmptyState';
import { SessionFormModal } from '../../../../features/asisten/components/SessionFormModal';
import { SessionQRModal } from '../../../../features/asisten/components/SessionQRModal';
import { SessionStatusBadge } from '../../../../features/asisten/components/SessionStatusBadge';
import { theme } from '../../../../features/asisten/theme';
import {
  Attendance,
  isSessionClosed,
  isSessionOpen,
  isSessionUpcoming,
} from '../../../../features/asisten/types';
import { formatDate } from '../../../../features/asisten/utils/format';
import {
  SessionInput,
  subscribeSessionAttendances,
} from '../../../../src/services/assistant-service';

export default function SessionDetailScreen() {
  const params = useLocalSearchParams<{ sessionId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    getSession,
    openSession,
    closeSession,
    updateSession,
    deleteSession,
    loading,
  } = useAsisten();

  const session = getSession(params.sessionId);
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [attendanceLoading, setAttendanceLoading] = useState(true);
  const [attendanceError, setAttendanceError] = useState<string | null>(null);

  const [showConfirmOpen, setShowConfirmOpen] = useState(false);
  const [showConfirmClose, setShowConfirmClose] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showQR, setShowQR] = useState(false);

  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!session?.id) return;

    const unsubscribe = subscribeSessionAttendances(
      session.id,
      (liveAttendances) => {
        setAttendances(liveAttendances);
        setAttendanceLoading(false);
      },
      () => {
        setAttendanceError('Gagal memuat data kehadiran. Periksa koneksi Anda.');
        setAttendanceLoading(false);
      }
    );

    return () => unsubscribe();
  }, [session?.id]);

  const totalAttendances = attendances.length;
  const hasAttendances = totalAttendances > 0;

  const filteredAttendances = (() => {
    if (!query.trim()) {
      return attendances;
    }
    const lowerQuery = query.toLowerCase();
    return attendances.filter(
      (att) =>
        att.practitionerName.toLowerCase().includes(lowerQuery) ||
        att.practitionerNim.toLowerCase().includes(lowerQuery)
    );
  })();

  const handleOpenSession = async () => {
    if (!session || busy) return;
    setBusy(true);
    setActionError(null);
    try {
      await openSession(session.id);
      setShowConfirmOpen(false);
    } catch (err: any) {
      setActionError(err.message || 'Gagal membuka sesi');
      setShowConfirmOpen(false);
    } finally {
      setBusy(false);
    }
  };

  const handleCloseSession = async () => {
    if (!session || busy) return;
    setBusy(true);
    setActionError(null);
    try {
      await closeSession(session.id);
      setShowConfirmClose(false);
      setShowQR(false);
    } catch (err: any) {
      setActionError(err.message || 'Gagal menutup sesi');
      setShowConfirmClose(false);
    } finally {
      setBusy(false);
    }
  };

  const handleUpdateSession = async (input: SessionInput) => {
    if (!session) return;
    await updateSession(session.id, input);
  };

  const handleDeleteSession = async () => {
    if (!session || busy) return;
    setBusy(true);
    try {
      await deleteSession(session.id);
      setShowConfirmDelete(false);
      router.back();
    } catch (err: any) {
      setActionError(err.message || 'Gagal menghapus sesi');
      setShowConfirmDelete(false);
      setBusy(false);
    }
  };

  if (loading && !session) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Memuat sesi...</Text>
      </View>
    );
  }

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

  const displayDate = session.dateLabel || formatDate(session.date || '');
  const displayTime =
    session.timeRange || `${session.startTime || ''} - ${session.endTime || ''}`;
  const displayKelas = session.className || session.kelas;

  const getEmptyStateText = () => {
    if (isSessionUpcoming(session.status)) {
      return {
        icon: '📝',
        title: 'Belum ada praktikan yang presensi',
        subtitle: 'Buka sesi untuk memulai.',
      };
    }
    if (isSessionOpen(session.status)) {
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
            {session.courseCode ? (
              <Text style={styles.courseCode}>{session.courseCode}</Text>
            ) : null}
          </View>
          <SessionStatusBadge status={session.status} />
        </View>

        <View style={styles.infoDetails}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Kelas:</Text>
            <Text style={styles.infoValue}>{displayKelas}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Tanggal:</Text>
            <Text style={styles.infoValue}>{displayDate}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Waktu:</Text>
            <Text style={styles.infoValue}>{displayTime}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Ruangan:</Text>
            <Text style={styles.infoValue}>{session.room}</Text>
          </View>
          {session.description ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Deskripsi:</Text>
              <Text style={styles.infoValue}>{session.description}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.manageRow}>
          <Pressable
            style={styles.manageButton}
            onPress={() => setShowEditModal(true)}
          >
            <Text style={styles.manageButtonText}>✏️ Ubah Jadwal</Text>
          </Pressable>

          <Pressable
            style={[styles.manageButton, styles.deleteButtonOutline]}
            onPress={() => setShowConfirmDelete(true)}
          >
            <Text style={styles.deleteButtonText}>🗑️ Hapus Sesi</Text>
          </Pressable>
        </View>
      </View>

      <SessionEnrollment classId={(session as any).classId} />

      {actionError ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{actionError}</Text>
        </View>
      ) : null}

      <View style={styles.actionSection}>
        {isSessionUpcoming(session.status) && (
          <Pressable
            disabled={busy}
            style={[
              styles.button,
              styles.actionButton,
              { backgroundColor: theme.colors.green },
              busy && { opacity: 0.6 },
            ]}
            onPress={() => setShowConfirmOpen(true)}
          >
            {busy ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.buttonText}>Buka Sesi</Text>
            )}
          </Pressable>
        )}

        {isSessionOpen(session.status) && (
          <>
            <Pressable
              style={[
                styles.button,
                styles.actionButton,
                { backgroundColor: theme.colors.primary, marginBottom: theme.spacing.sm },
              ]}
              onPress={() => setShowQR(true)}
            >
              <Text style={styles.buttonText}>Tampilkan QR Code</Text>
            </Pressable>

            <Pressable
              disabled={busy}
              style={[
                styles.button,
                styles.actionButton,
                { backgroundColor: theme.colors.red },
                busy && { opacity: 0.6 },
              ]}
              onPress={() => setShowConfirmClose(true)}
            >
              {busy ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.buttonText}>Tutup Sesi</Text>
              )}
            </Pressable>
          </>
        )}

        {isSessionClosed(session.status) && (
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

        {attendanceError ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>⚠️ {attendanceError}</Text>
          </View>
        ) : attendanceLoading ? (
          <View style={styles.attendanceLoading}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
            <Text style={styles.loadingText}>Memuat data kehadiran...</Text>
          </View>
        ) : null}

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
      behavior="padding"
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
        message={`Buka sesi ${session.courseName} — Kelas ${displayKelas}? Praktikan akan dapat melakukan presensi.`}
        confirmLabel={busy ? 'Membuka...' : 'Buka'}
        confirmColor="green"
        onConfirm={handleOpenSession}
        onCancel={() => !busy && setShowConfirmOpen(false)}
      />

      <ConfirmModal
        visible={showConfirmClose}
        title="Tutup Sesi"
        message="Tutup sesi? Setelah ditutup, praktikan tidak dapat presensi lagi."
        confirmLabel={busy ? 'Menutup...' : 'Tutup'}
        confirmColor="red"
        onConfirm={handleCloseSession}
        onCancel={() => !busy && setShowConfirmClose(false)}
      />

      <ConfirmModal
        visible={showConfirmDelete}
        title="Hapus Sesi Praktikum"
        message={`Apakah Anda yakin ingin menghapus sesi ${session.courseName} (${displayKelas})? Aksi ini tidak dapat dibatalkan.`}
        confirmLabel={busy ? 'Menghapus...' : 'Hapus Sesi'}
        confirmColor="red"
        onConfirm={handleDeleteSession}
        onCancel={() => !busy && setShowConfirmDelete(false)}
      />

      <SessionFormModal
        visible={showEditModal}
        mode="edit"
        initialData={{
          courseName: session.courseName,
          courseCode: session.courseCode,
          className: displayKelas,
          classId: (session as any).classId,
          dateLabel: displayDate,
          timeRange: displayTime,
          room: session.room,
          labId: session.labId,
          radiusM: session.radiusM,
          description: session.description,
          participantIds: session.participantIds,
        }}
        onClose={() => setShowEditModal(false)}
        onSubmit={handleUpdateSession}
      />

      <SessionQRModal
        visible={showQR}
        sessionId={session.id}
        courseName={session.courseName}
        className={displayKelas}
        onClose={() => setShowQR(false)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: theme.spacing.sm,
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
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  infoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  infoTitleSection: {
    flex: 1,
  },
  courseName: {
    fontSize: theme.fontSize.xl,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 2,
  },
  courseCode: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
  },
  infoDetails: {
    gap: theme.spacing.xs,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  infoLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
  },
  infoValue: {
    fontSize: theme.fontSize.sm,
    fontWeight: '500',
    color: theme.colors.text,
  },
  manageRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  manageButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: theme.borderRadius.md,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  manageButtonText: {
    fontSize: theme.fontSize.xs,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  deleteButtonOutline: {
    backgroundColor: '#FEF2F2',
  },
  deleteButtonText: {
    fontSize: theme.fontSize.xs,
    fontWeight: '600',
    color: '#991B1B',
  },
  errorBanner: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#F87171',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  errorText: {
    color: '#991B1B',
    fontSize: theme.fontSize.sm,
    textAlign: 'center',
  },
  actionSection: {
    marginBottom: theme.spacing.lg,
  },
  button: {
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButton: {
    width: '100%',
  },
  buttonText: {
    color: '#fff',
    fontSize: theme.fontSize.md,
    fontWeight: '600',
  },
  endedCard: {
    backgroundColor: '#F3F4F6',
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  endedText: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.md,
    fontWeight: '500',
  },
  attendanceSection: {
    marginTop: theme.spacing.sm,
  },
  attendanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    color: theme.colors.text,
  },
  attendanceCount: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
  },
  searchInput: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    fontSize: theme.fontSize.sm,
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.md,
  },
  attendanceLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  loadingText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
  },
  centerButton: {
    marginTop: theme.spacing.md,
    alignItems: 'center',
  },
});