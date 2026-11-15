import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { AccessibilityInfo, ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { AttendanceConfirmationModal, type AttendanceModalPhase } from '@/components/attendance-confirmation-modal';
import { authColors } from '@/components/auth-ui';
import { useAttendance } from '@/context/attendance-context';
import { validateReason } from '@/services/practitioner-service';
import type { CloudSession } from '@/types/practitioner';
import { formatAttendanceTime } from '@/utils/attendance-format';
import { firebaseErrorMessage } from '@/utils/firebase-error';

const decisionLabels = { pending: 'Izin menunggu pemeriksaan', approved: 'Izin diterima', rejected: 'Izin ditolak' };

export function SessionParticipationActions({ session, initialPermission = false }: {
  session: CloudSession;
  initialPermission?: boolean;
}) {
  const { records, permissions, attendanceState, permissionState, sessionState, checkIn, submitPermission, retry } = useAttendance();
  const [showPermission, setShowPermission] = useState(initialPermission);
  const [reason, setReason] = useState('');
  const [phase, setPhase] = useState<AttendanceModalPhase>('closed');
  const [busy, setBusy] = useState<'attendance' | 'permission' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [permissionSaved, setPermissionSaved] = useState(false);
  const locked = useRef(false);
  const record = records.find((item) => item.sessionId === session.id);
  const permission = permissions.find((item) => item.sessionId === session.id);
  const loading = attendanceState.loading || permissionState.loading;
  const readError = attendanceState.error || permissionState.error;
  const cached = sessionState.fromCache || attendanceState.fromCache || permissionState.fromCache;
  const ready = !loading && !readError && !cached && !sessionState.loading && !sessionState.error;
  const completed = !!record || !!permission || permissionSaved;
  const canCheckIn = ready && !busy && !completed && session.status === 'open';
  const canRequest = ready && !busy && !completed && session.status !== 'closed';
  const permissionFormVisible = showPermission && session.status !== 'closed';

  async function confirmAttendance() {
    if (locked.current) return;
    if (!canCheckIn) {
      setPhase('closed');
      setError('Presensi tidak tersedia. Periksa status sesi dan catatan kehadiran terbaru.');
      return;
    }
    locked.current = true;
    setBusy('attendance');
    setError(null);
    try {
      await checkIn(session.id);
      setPhase('success');
      AccessibilityInfo.announceForAccessibility('Presensi berhasil dicatat.');
    } catch (failure) {
      setPhase('closed');
      setError(firebaseErrorMessage(failure));
    } finally {
      locked.current = false;
      setBusy(null);
    }
  }

  async function sendPermission() {
    if (locked.current || !canRequest) return;
    const invalid = validateReason(reason);
    if (invalid) { setError(invalid); return; }
    locked.current = true;
    setBusy('permission');
    setError(null);
    try {
      await submitPermission(session.id, reason);
      setPermissionSaved(true);
      setShowPermission(false);
      setReason('');
      AccessibilityInfo.announceForAccessibility('Izin berhasil diajukan. Menunggu pemeriksaan asisten.');
    } catch (failure) {
      setError(firebaseErrorMessage(failure));
    } finally {
      locked.current = false;
      setBusy(null);
    }
  }

  const history = () => router.push('/explore');
  return <View style={styles.container}>
    <Text accessibilityRole="header" style={styles.heading}>Kehadiran sesi ini</Text>
    {loading ? <View style={styles.loading}><ActivityIndicator color={authColors.navy} /><Text style={styles.caption}>Memuat catatan kehadiran…</Text></View> : null}
    {readError ? <View style={styles.feedback}>
      <Text accessibilityRole="alert" style={styles.error}>{readError}</Text>
      <SessionButton label="Coba lagi" onPress={retry} secondary />
    </View> : null}
    {cached && !loading && !readError ? <Text style={styles.caption}>Menampilkan cache. Sambungkan internet agar status sesi dapat dipastikan sebelum mengirim.</Text> : null}
    {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
    {record ? <View style={styles.feedback}>
      <Text accessibilityLiveRegion="polite" style={styles.savedTitle}>Presensi sudah tercatat</Text>
      <Text style={styles.caption}>{record.checkedInAt ? `Hadir pukul ${formatAttendanceTime(record.checkedInAt)}.` : 'Waktu server akan tampil di riwayat.'} Kamu tidak perlu mengajukan izin untuk sesi ini.</Text>
      <SessionButton label="Lihat riwayat" onPress={history} secondary />
    </View> : permission || permissionSaved ? <View style={styles.feedback}>
      {permissionSaved ? <Text accessibilityLiveRegion="polite" style={styles.savedTitle}>Izin berhasil diajukan</Text> : null}
      <Text style={styles.heading}>{permission ? decisionLabels[permission.status] : 'Izin menunggu pemeriksaan'}</Text>
      <Text style={styles.caption}>Pengajuan untuk sesi ini sudah tersimpan. Pantau keputusan asisten dan informasi AI di Riwayat.</Text>
      <SessionButton label="Lihat status izin" onPress={history} secondary />
    </View> : <>
      <Text style={styles.caption}>{session.status === 'closed'
        ? 'Sesi sudah ditutup. Presensi dan pengajuan izin tidak tersedia.'
        : session.status === 'upcoming'
          ? 'Presensi tersedia setelah asisten membuka sesi. Jika berhalangan, kamu dapat mengajukan izin sekarang.'
          : 'Hadir di praktikum? Isi presensi. Jika berhalangan, ajukan izin untuk sesi ini.'}</Text>
      <SessionButton label={busy === 'attendance' ? 'Menyimpan presensi…' : 'Isi presensi'} disabled={!canCheckIn}
        onPress={() => { setError(null); setPhase('confirm'); }} />
      <SessionButton label={permissionFormVisible ? 'Form izin terbuka' : 'Ajukan izin'} disabled={!canRequest || permissionFormVisible} secondary
        onPress={() => { setError(null); setShowPermission(true); }} />
      {permissionFormVisible ? <View style={styles.form}>
        <Text accessibilityRole="header" style={styles.heading}>Alasan ketidakhadiran</Text>
        <Text style={styles.caption}>Izin untuk {session.courseName}, {session.className}. Keputusan diberikan oleh asisten; AI hanya informasi pendukung.</Text>
        <TextInput accessibilityLabel="Alasan ketidakhadiran" multiline maxLength={1000}
          editable={!busy} value={reason} onChangeText={(value) => { setReason(value); setError(null); }}
          placeholder="Jelaskan mengapa kamu tidak dapat mengikuti sesi ini."
          placeholderTextColor={authColors.muted} style={styles.input} />
        <Text style={styles.caption}>{reason.trim().length}/1.000 karakter · minimal 10 karakter</Text>
        <SessionButton label={busy === 'permission' ? 'Menyimpan pengajuan…' : 'Kirim pengajuan izin'}
          disabled={!canRequest} onPress={() => void sendPermission()} />
        <SessionButton label="Batal" secondary disabled={!!busy}
          onPress={() => { setShowPermission(false); setReason(''); setError(null); }} />
      </View> : null}
    </>}
    {phase !== 'closed' ? <AttendanceConfirmationModal phase={phase} session={session}
      busy={busy === 'attendance'} attendanceTime={record?.checkedInAt ? formatAttendanceTime(record.checkedInAt) : undefined}
      onClose={() => { if (!busy) setPhase('closed'); }} onConfirm={() => void confirmAttendance()}
      onViewHistory={() => { setPhase('closed'); history(); }} /> : null}
  </View>;
}

function SessionButton({ label, onPress, disabled = false, secondary = false }: {
  label: string; onPress: () => void; disabled?: boolean; secondary?: boolean;
}) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
    style={({ pressed }) => [styles.button, secondary && styles.secondary, disabled && styles.disabled, pressed && { opacity: 0.8 }]}>
    <Text style={[styles.buttonText, secondary && styles.secondaryText, disabled && { color: '#52627A' }]}>{label}</Text>
  </Pressable>;
}

const styles = StyleSheet.create({
  container: { width: '100%', gap: 12, marginTop: 24, paddingTop: 20, borderTopWidth: 1, borderTopColor: authColors.border },
  heading: { color: authColors.ink, fontSize: 17, fontWeight: '800', lineHeight: 24 },
  caption: { color: '#52627A', fontSize: 14, lineHeight: 21 },
  error: { color: '#B91C1C', fontSize: 14, lineHeight: 21 },
  feedback: { gap: 10 },
  savedTitle: { color: '#15803D', fontSize: 17, fontWeight: '800', lineHeight: 24 },
  loading: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  button: { width: '100%', backgroundColor: authColors.navy, borderWidth: 1, borderColor: authColors.navy, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, minHeight: 50, alignItems: 'center', justifyContent: 'center' },
  secondary: { backgroundColor: authColors.white },
  disabled: { backgroundColor: '#E8EDF3', borderColor: '#E8EDF3' },
  buttonText: { color: authColors.white, fontSize: 15, fontWeight: '700', textAlign: 'center' },
  secondaryText: { color: authColors.navy },
  form: { gap: 12, marginTop: 8 },
  input: { minHeight: 130, borderWidth: 1, borderColor: '#AAB8CB', borderRadius: 12, padding: 14, color: authColors.ink, fontSize: 16, lineHeight: 24, textAlignVertical: 'top', backgroundColor: authColors.white },
});
