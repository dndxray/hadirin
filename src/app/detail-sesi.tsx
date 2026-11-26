import { Ionicons } from '@expo/vector-icons';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { doc, onSnapshot } from 'firebase/firestore';

import { SessionEnrollment } from '@/components/session-enrollment';
import { BackButton } from '@/components/back-button';
import { StateView } from '@/components/state-view';
import { useAttendance } from '@/context/attendance-context';
import { useAuth } from '@/context/auth-context';
import { db } from '@/lib/firebase';
import { syncClassSessions } from '@/services/class-sync';
import {
  deleteSession,
  setSessionStatus,
  subscribeSessionAttendances,
  updateSession,
} from '@/services/assistant-service';
import { firebaseErrorMessage } from '@/utils/firebase-error';
import { initials } from '@/utils/home-format';
import { getSessionStatus, isSessionFinished } from '@/utils/session-status';
import { SessionFormModal } from '../../features/asisten/components/SessionFormModal';
import { SessionQRModal } from '../../features/asisten/components/SessionQRModal';
import { notifyUsers } from '@/services/notification-service';
import type { Attendance } from '../../features/asisten/types';

function timePart(range?: string, index = 0) {
  if (!range) return '';
  const parts = String(range).split(/[-–]/);
  return (parts[index] ?? '').replace(/WIB/i, '').trim();
}

export default function DetailSesiScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const sessionId = Array.isArray(params.id) ? params.id[0] : params.id;

  const { profile, loading: authLoading } = useAuth();
  const { records, permissions } = useAttendance();

  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [busy, setBusy] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showQR, setShowQR] = useState(false);

  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [attendanceError, setAttendanceError] = useState<string | null>(null);
  const [roster, setRoster] = useState<{ nim: string; name: string }[]>([]);


  const isAsisten = profile?.role === 'asisten';
  const classId: string = session?.classId ?? '';

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/home');
  };

  useEffect(() => {
    if (!sessionId) return;

    const unsubscribe = onSnapshot(
      doc(db, 'sessions', sessionId),
      (snapshot) => {
        if (!snapshot.exists()) {
          setSession(null);
        } else {
          setSession({ id: snapshot.id, ...snapshot.data() });
        }
        setError(null);
        setLoading(false);
      },
      (failure) => {
        setError(firebaseErrorMessage(failure));
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [sessionId]);

  useEffect(() => {
    if (!isAsisten || !sessionId) return;

    const unsubscribe = subscribeSessionAttendances(
      sessionId,
      (items) => {
        setAttendances(items);
        setAttendanceError(null);
      },
      () => setAttendanceError('Gagal memuat data kehadiran. Periksa koneksi.'),
    );

    return () => unsubscribe();
  }, [isAsisten, sessionId]);

  useEffect(() => {
    if (!isAsisten || !classId) return;

    const unsubscribe = onSnapshot(
      doc(db, 'classes', classId),
      (snapshot) => setRoster((snapshot.data()?.participants ?? []) as { nim: string; name: string }[]),
      () => setRoster([]),
    );

    return () => unsubscribe();
  }, [isAsisten, classId]);

  if (authLoading) {
    return <View style={styles.screen}><StateView kind="loading" /></View>;
  }

  if (!profile) return <Redirect href="/login" />;

  if (!sessionId) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + 32, paddingHorizontal: 20 }]}>
        <StateView
          kind="empty"
          title="Sesi tidak ditemukan"
          message="Buka detail sesi dari daftar jadwal."
          actionLabel="Kembali ke Home"
          onAction={goBack}
        />
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.screen, styles.center]}>
        <ActivityIndicator size="large" color="#1B2A4E" />
        <Text style={styles.centerText}>Memuat detail...</Text>
      </View>
    );
  }

  if (!session) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + 32, paddingHorizontal: 20 }]}>
        <StateView
          kind="empty"
          title="Sesi tidak ditemukan"
          message={error ?? 'Data mungkin sudah dihapus oleh asisten.'}
          actionLabel="Kembali ke Home"
          onAction={goBack}
        />
      </View>
    );
  }

  const status = getSessionStatus(session);
  const finished = isSessionFinished(session);
  const participantIds: string[] = session.participantIds ?? [];
  const unmappedCount = Math.max(0, roster.length - participantIds.length);
  const isParticipant = !!profile.uid && participantIds.includes(profile.uid);
  const attended = records.some((record) => record.sessionId === session.id);
  const requested = permissions.some((request) => request.sessionId === session.id);

  const statusChip = status === 'open'
    ? { label: 'Sesi sedang dibuka', color: '#15803D', background: '#E6F6EC' }
    : status === 'upcoming'
      ? { label: 'Sesi belum dibuka', color: '#52627A', background: '#EEF1F6' }
      : { label: 'Sesi telah ditutup', color: '#B91C1C', background: '#FEE2E2' };

  const toggleLabel = status === 'open'
    ? 'Tutup Sesi Praktikum'
    : finished
      ? 'Sesi Telah Berakhir'
      : 'Buka Sesi Praktikum';


  async function executeToggle() {
    setShowConfirm(false);
    setBusy(true);
    setError(null);
    try {
      const nextStatus = status === 'open' ? 'closed' : 'open';
      await setSessionStatus(session.id, nextStatus);
      if (nextStatus === 'open' && session.participantIds?.length) {
        void notifyUsers(session.participantIds, {
          type: 'sesi_dibuka',
          title: 'Sesi dibuka',
          body: `Presensi ${session.courseName} (${session.className}) sudah bisa dilakukan.`,
          sessionId: session.id,
        }).catch(() => {});
      }
    } catch (failure: any) {
      setError(firebaseErrorMessage(failure));
    } finally {
      setBusy(false);
    }
  }

  async function executeDelete() {
    setShowDeleteConfirm(false);
    setBusy(true);
    try {
      await deleteSession(session.id);
      router.replace('/home');
    } catch (failure: any) {
      setError(firebaseErrorMessage(failure));
      setBusy(false);
    }
  }


  return (
    <KeyboardAvoidingView style={styles.screen} behavior="padding">
      <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
        <View style={styles.headerRow}>
        <BackButton onPress={goBack} />
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>{session.courseName}</Text>
            <View style={styles.metaRow}>
              <Ionicons name="location-outline" size={14} color="#B6C2DB" />
              <Text style={[styles.metaText, { flexShrink: 1 }]}>{session.className} · {session.room}</Text>
            </View>
          </View>
        </View>
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.inner}>
          <View style={styles.statusChipWrap}>
            <View style={[styles.statusChip, { backgroundColor: statusChip.background }]}>
              <View style={[styles.statusDot, { backgroundColor: statusChip.color }]} />
              <Text style={[styles.statusText, { color: statusChip.color }]}>{statusChip.label}</Text>
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.cardIconWrap}><Ionicons name="calendar-outline" size={26} color="#1B2A4E" /></View>
            <Text style={styles.dateLabel}>{session.dateLabel || 'Tanggal belum diatur'}</Text>
            <Text style={styles.sessionTitle}>{session.courseName}</Text>

            <View style={styles.timeline}>
              <View style={{ flex: 1 }}>
                <Text style={styles.timeLabel}>Waktu praktikum</Text>
                <Text style={styles.timeValue}>{session.timeRange || `${session.startTime} - ${session.endTime}`}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <Text style={styles.assistLabel}>Asisten praktikum</Text>
            <View style={styles.assistList}>
              <View style={styles.assistRow}>
                <View style={[styles.avatar, { backgroundColor: '#E0E7FF' }]}>
                  <Text style={[styles.avatarText, { color: '#4338CA' }]}>{initials(session.assistantName || 'Asisten')}</Text>
                </View>
                <Text style={styles.assistName}>{session.assistantName || 'Asisten Hadirin'}</Text>
              </View>
            </View>

            {error ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle-outline" size={18} color="#B91C1C" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {isAsisten ? (
              <View style={{ width: '100%', gap: 12 }}>
                {status === 'open' ? (
                  <Pressable
                    onPress={() => setShowQR(true)}
                    style={({ pressed }) => [styles.actionBtnOutline, pressed && { opacity: 0.7 }]}
                  >
                    <Ionicons name="qr-code-outline" size={18} color="#1B2A4E" />
                    <Text style={styles.actionBtnTextOutline}>Tampilkan QR Code</Text>
                  </Pressable>
                ) : null}
                <Pressable
                  onPress={() => setShowConfirm(true)}
                  disabled={busy || finished}
                  style={({ pressed }) => [
                    styles.button,
                    { backgroundColor: finished ? '#94A3B8' : status === 'open' ? '#B91C1C' : '#15803D' },
                    pressed && !busy && !finished && { opacity: 0.85 },
                  ]}
                >
                  {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>{toggleLabel}</Text>}
                </Pressable>

                <View style={styles.actionRow}>
                  <Pressable
                    onPress={() => setShowEditModal(true)}
                    style={({ pressed }) => [styles.actionBtnOutline, pressed && { opacity: 0.7 }]}
                  >
                    <Ionicons name="pencil" size={18} color="#1B2A4E" />
                    <Text style={styles.actionBtnTextOutline}>Edit Sesi</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => setShowDeleteConfirm(true)}
                    style={({ pressed }) => [styles.actionBtnDanger, pressed && { opacity: 0.7 }]}
                  >
                    <Ionicons name="trash" size={18} color="#B91C1C" />
                    <Text style={styles.actionBtnTextDanger}>Hapus</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <View style={{ width: '100%', gap: 10 }}>
                {!isParticipant ? (
                  <View style={styles.infoBox}>
                    <Ionicons name="information-circle-outline" size={18} color="#8A5309" />
                    <Text style={styles.infoText}>
                      Belum terdaftar pada sesi kelas ini. Minta asisten menambahkan NIM akunmu ke sesi.
                    </Text>
                  </View>
                ) : null}

                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push({ pathname: '/presensi', params: { sessionId: session.id } })}
                  disabled={!isParticipant || busy}
                  style={({ pressed }) => [
                    styles.button,
                    { backgroundColor: isParticipant ? '#1B2A4E' : '#E2E8F0' },
                    pressed && isParticipant && { opacity: 0.85 },
                  ]}
                >
                  <Text style={[styles.buttonText, !isParticipant && { color: '#64748B' }]}>{isParticipant ? 'Buka halaman Presensi' : 'Bukan peserta sesi'}</Text>
                </Pressable>

                <Pressable
                  onPress={() => router.push({
                    pathname: '/izin',
                    params: {
                      sessionId: session.id,
                      courseName: session.courseName,
                      className: session.className,
                    },
                  })}
                  disabled={attended || requested || status === 'closed'}
                  style={({ pressed }) => [
                    styles.button,
                    styles.buttonOutline,
                    (attended || requested || status === 'closed') && { opacity: 0.5 },
                    pressed && { opacity: 0.8 },
                  ]}
                >
                  <Text style={[styles.buttonText, { color: '#1B2A4E' }]}>
                    {requested ? 'Izin Sudah Diajukan' : 'Ajukan Izin'}
                  </Text>
                </Pressable>
              </View>
            )}
          </View>

          {isAsisten ? (
            <>
              <View style={styles.card}>
                <View style={styles.sectionHead}>
                  <Text style={styles.sectionTitle}>Kehadiran</Text>
                  <Text style={styles.sectionCount}>
                    Peserta kelas: {roster.length} · terdaftar di sesi: {participantIds.length}
                    {unmappedCount > 0 ? ` · ${unmappedCount} belum punya akun` : ''}
                  </Text>
                  <Text style={styles.sectionCount}>{attendances.length} praktikan sudah hadir</Text>
                </View>
                {attendanceError ? <Text style={styles.errorText}>{attendanceError}</Text> : null}
                {attendances.length === 0 ? (
                  <Text style={styles.emptyText}>Belum ada praktikan yang melakukan presensi.</Text>
                ) : (
                  attendances.map((item) => (
                    <View key={item.id} style={styles.attendanceRow}>
                      <View style={styles.attendanceAvatar}>
                        <Text style={styles.attendanceAvatarText}>{initials(item.practitionerName || 'PR')}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.attendanceName}>{item.practitionerName || 'Praktikan'}</Text>
                        <Text style={styles.attendanceNim}>{item.practitionerNim || '-'}</Text>
                      </View>
                      <View style={styles.attendanceBadge}>
                        <Text style={styles.attendanceBadgeText}>Hadir</Text>
                      </View>
                    </View>
                  ))
                )}
              </View>

              <View style={styles.card}>
                <SessionEnrollment classId={classId || undefined} roster={classId ? roster : []} />
              </View>
            </>
          ) : null}
        </View>
      </ScrollView>


      <SessionQRModal
        visible={showQR}
        sessionId={session.id}
        courseName={session.courseName}
        className={session.className}
        onClose={() => setShowQR(false)}
      />

      <Modal visible={showConfirm} transparent animationType="fade" onRequestClose={() => setShowConfirm(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIconWrap}>
              <Ionicons
                name={status === 'open' ? 'lock-closed' : 'lock-open'}
                size={32}
                color={status === 'open' ? '#B91C1C' : '#15803D'}
              />
            </View>
            <Text style={styles.modalTitle}>{status === 'open' ? 'Tutup Sesi?' : 'Buka Sesi?'}</Text>
            <Text style={styles.modalSub}>
              Apakah Anda yakin ingin {status === 'open' ? 'menutup' : 'membuka'} sesi praktikum ini?
            </Text>
            <View style={styles.modalActions}>
              <Pressable style={[styles.modalBtn, styles.modalBtnCancel]} onPress={() => setShowConfirm(false)}>
                <Text style={styles.modalBtnCancelText}>Batal</Text>
              </Pressable>
              <Pressable
                style={[styles.modalBtn, { backgroundColor: status === 'open' ? '#B91C1C' : '#15803D' }]}
                onPress={() => void executeToggle()}
              >
                <Text style={styles.modalBtnConfirmText}>Ya, Lanjutkan</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showDeleteConfirm} transparent animationType="fade" onRequestClose={() => setShowDeleteConfirm(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={[styles.modalIconWrap, { backgroundColor: '#FEE2E2' }]}>
              <Ionicons name="trash" size={32} color="#B91C1C" />
            </View>
            <Text style={styles.modalTitle}>Hapus Sesi?</Text>
            <Text style={styles.modalSub}>Sesi yang dihapus tidak dapat dikembalikan. Apakah Anda yakin?</Text>
            <View style={styles.modalActions}>
              <Pressable style={[styles.modalBtn, styles.modalBtnCancel]} onPress={() => setShowDeleteConfirm(false)}>
                <Text style={styles.modalBtnCancelText}>Batal</Text>
              </Pressable>
              <Pressable style={[styles.modalBtn, { backgroundColor: '#B91C1C' }]} onPress={() => void executeDelete()}>
                <Text style={styles.modalBtnConfirmText}>Ya, Hapus</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <SessionFormModal
        visible={showEditModal}
        mode="edit"
        initialData={{
          courseName: session.courseName,
          courseCode: session.courseCode,
          classId: session.classId || undefined,
          className: session.className,
          room: session.room,
          description: session.description || '',
          startTime: session.startTime || timePart(session.timeRange, 0),
          endTime: session.endTime || timePart(session.timeRange, 1),
          dateTimestamp: session.dateTimestamp,
          participantIds,
          labId: session.labId,
          radiusM: session.radiusM,
        }}
        onClose={() => setShowEditModal(false)}
        onSubmit={async (data) => {
          await updateSession(session.id, data);
          const scheduleFields = ['dateLabel', 'startTime', 'endTime', 'timeRange', 'room', 'labId', 'radiusM'] as const;
          const scheduleChanged = scheduleFields.some((field) =>
            field in data && (data as any)[field] !== (session as any)[field],
          );
          if (scheduleChanged && session.participantIds?.length) {
            void notifyUsers(session.participantIds, {
              type: 'jadwal_berubah',
              title: 'Jadwal berubah',
              body: `Jadwal ${session.courseName} (${session.className}) diperbarui.`,
              sessionId: session.id,
            }).catch(() => {});
          }
          if (data.classId) await syncClassSessions(data.classId);
          setShowEditModal(false);
        }}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5F7FA' },
  center: { justifyContent: 'center', alignItems: 'center' },
  centerText: { marginTop: 12, color: '#64748B' },
  inner: { width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: 20, paddingTop: 16 },
  header: { backgroundColor: '#1B2A4E', paddingBottom: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, gap: 12, maxWidth: 560, alignSelf: 'center', width: '100%' },
  headerTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '800', marginBottom: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { color: '#B6C2DB', fontSize: 13, fontWeight: '500' },
  statusChipWrap: { alignItems: 'flex-start', marginBottom: 16 },
  statusChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 99, gap: 6 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 12, fontWeight: '700' },
  card: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 24, alignItems: 'center', shadowColor: '#1B2A4E', shadowOpacity: 0.05, shadowRadius: 15, shadowOffset: { width: 0, height: 5 }, elevation: 3, width: '100%', marginBottom: 16 },
  cardIconWrap: { width: 54, height: 54, borderRadius: 16, backgroundColor: '#EEF1F6', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  dateLabel: { color: '#64748B', fontSize: 13, fontWeight: '500', marginBottom: 4 },
  sessionTitle: { color: '#1B2A4E', fontSize: 22, fontWeight: '800', marginBottom: 24, textAlign: 'center' },
  timeline: { flexDirection: 'row', alignItems: 'center', width: '100%', paddingHorizontal: 10 },
  timeLabel: { color: '#64748B', fontSize: 12, marginBottom: 4 },
  timeValue: { color: '#1B2A4E', fontSize: 20, fontWeight: '800' },
  divider: { width: '100%', height: 1, backgroundColor: '#F1F5F9', marginVertical: 20 },
  assistLabel: { alignSelf: 'flex-start', color: '#64748B', fontSize: 12, fontWeight: '600', marginBottom: 12 },
  assistList: { width: '100%', gap: 12, marginBottom: 24 },
  assistRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 14, fontWeight: '800' },
  assistName: { color: '#1B2A4E', fontSize: 15, fontWeight: '700' },
  button: { width: '100%', borderRadius: 16, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', minHeight: 52 },
  buttonOutline: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#1B2A4E' },
  buttonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  infoBox: { flexDirection: 'row', gap: 8, backgroundColor: '#FFF0D4', borderRadius: 12, padding: 12, alignItems: 'flex-start' },
  infoText: { flex: 1, color: '#8A5309', fontSize: 13, lineHeight: 19 },
  errorBox: { flexDirection: 'row', gap: 8, backgroundColor: '#FEE2E2', borderRadius: 12, padding: 12, marginBottom: 16, alignItems: 'flex-start' },
  errorText: { flex: 1, color: '#B91C1C', fontSize: 13, lineHeight: 19 },
  actionRow: { flexDirection: 'row', gap: 10, width: '100%' },
  actionBtnOutline: { flex: 1, flexDirection: 'row', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 14, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', gap: 6 },
  actionBtnTextOutline: { color: '#1B2A4E', fontWeight: '700', fontSize: 14 },
  actionBtnDanger: { flex: 1, flexDirection: 'row', backgroundColor: '#FEE2E2', borderRadius: 14, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', gap: 6 },
  actionBtnTextDanger: { color: '#B91C1C', fontWeight: '700', fontSize: 14 },
  sectionHead: { width: '100%', gap: 2, marginBottom: 12 },
  sectionTitle: { color: '#1B2A4E', fontSize: 17, fontWeight: '800' },
  sectionCount: { color: '#64748B', fontSize: 12 },
  emptyText: { color: '#64748B', fontSize: 13, textAlign: 'center', width: '100%' },
  attendanceRow: { flexDirection: 'row', alignItems: 'center', gap: 12, width: '100%', paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E2E8F0' },
  attendanceAvatar: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#E8EEF9', alignItems: 'center', justifyContent: 'center' },
  attendanceAvatarText: { color: '#1B2A4E', fontWeight: '800', fontSize: 12 },
  attendanceName: { color: '#1B2A4E', fontWeight: '700', fontSize: 14 },
  attendanceNim: { color: '#64748B', fontSize: 12, marginTop: 1 },
  attendanceBadge: { backgroundColor: '#E6F6EC', borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4 },
  attendanceBadgeText: { color: '#15803D', fontSize: 11, fontWeight: '800' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 24, width: '100%', maxWidth: 400, alignItems: 'center' },
  modalIconWrap: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#1B2A4E', marginBottom: 8 },
  modalSub: { fontSize: 14, color: '#64748B', textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  modalActions: { flexDirection: 'row', width: '100%', gap: 12 },
  modalBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  modalBtnCancel: { backgroundColor: '#F1F5F9' },
  modalBtnCancelText: { color: '#64748B', fontWeight: '700', fontSize: 14 },
  modalBtnConfirmText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
});
