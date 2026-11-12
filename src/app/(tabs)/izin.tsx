import { useRef, useState } from 'react';
import { router } from 'expo-router';
import { Modal, Text, TextInput, View } from 'react-native';

import { Action, DataState, PractitionerScreen, ui } from '@/components/practitioner-ui';
import { useAttendanceTheme } from '@/constants/attendance-theme';
import { useAttendance } from '@/context/attendance-context';
import { validateReason } from '@/services/practitioner-service';
import { firebaseErrorMessage } from '@/utils/firebase-error';

export default function PermissionScreen() {
  const colors = useAttendanceTheme();
  const { sessions, records, permissions, sessionState, attendanceState, permissionState, submitPermission, retry } = useAttendance();
  const [sessionId, setSessionId] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);
  const lock = useRef(false);
  const eligible = sessions.filter((session) => session.status !== 'closed'
    && !records.some((record) => record.sessionId === session.id)
    && !permissions.some((request) => request.sessionId === session.id));
  const selected = eligible.find((session) => session.id === sessionId);
  const ready = !sessionState.loading && !attendanceState.loading && !permissionState.loading
    && !sessionState.error && !attendanceState.error && !permissionState.error && !sessionState.fromCache;

  async function submit() {
    if (lock.current) return;
    const invalid = !selected ? 'Pilih sesi terlebih dahulu.' : validateReason(reason);
    if (invalid) { setError(invalid); return; }
    lock.current = true;
    setBusy(true);
    setError(null);
    try {
      await submitPermission(sessionId, reason);
      setSuccess(true);
      setReason('');
      setSessionId('');
    } catch (failure) { setError(firebaseErrorMessage(failure)); }
    finally { lock.current = false; setBusy(false); }
  }

  return <PractitionerScreen title="Pengajuan izin">
    <Text style={[ui.body, { color: colors.inkMuted }]}>Jelaskan ketidakhadiranmu. Keputusan diberikan oleh asisten; hasil AI hanya informasi pendukung.</Text>
    <DataState {...sessionState} retry={retry} />
    <DataState {...attendanceState} retry={retry} />
    <DataState {...permissionState} retry={retry} />
    <Text style={[ui.heading, { color: colors.ink }]}>Pilih sesi</Text>
    {ready && !eligible.length ? <Text style={[ui.body, { color: colors.inkMuted }]}>Tidak ada sesi yang dapat diajukan. Sesi yang selesai, sudah dihadiri, atau sudah diajukan izinnya tidak tersedia.</Text> : null}
    {eligible.map((session) => <Action key={session.id} disabled={busy || !ready}
      label={`${session.id === sessionId ? 'Dipilih: ' : ''}${session.courseName} · ${session.className}\n${session.dateLabel} · ${session.timeRange}`}
      onPress={() => { setSessionId(session.id); setError(null); }} />)}
    <Text style={[ui.heading, { color: colors.ink }]}>Alasan ketidakhadiran</Text>
    <TextInput accessibilityLabel="Alasan ketidakhadiran" multiline editable={!busy}
      value={reason} onChangeText={setReason} maxLength={1000} placeholder="Contoh: Saya sedang sakit dan perlu beristirahat sesuai anjuran dokter."
      placeholderTextColor={colors.inkMuted}
      style={[ui.input, { color: colors.ink, borderColor: colors.border, backgroundColor: colors.surface }]} />
    <Text style={{ color: colors.inkMuted }}>{reason.trim().length}/1.000 karakter · minimal 10 karakter</Text>
    {error ? <Text accessibilityRole="alert" style={{ color: colors.danger }}>{error}</Text> : null}
    <Action label={busy ? 'Menyimpan pengajuan…' : 'Kirim pengajuan izin'} disabled={busy || !ready || !eligible.length} onPress={() => void submit()} />
    <Modal transparent visible={success} animationType="fade" onRequestClose={() => setSuccess(false)}>
      <View style={{ flex: 1, justifyContent: 'center', padding: 24, backgroundColor: colors.overlay }}>
        <View accessibilityViewIsModal style={[ui.panel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[ui.heading, { color: colors.ink }]}>Izin berhasil diajukan</Text>
          <Text style={[ui.body, { color: colors.inkMuted }]}>Pengajuan tersimpan dengan status menunggu. Pantau keputusan asisten di Riwayat. Izin tetap tersimpan apabila klasifikasi AI gagal.</Text>
          <Action label="Lihat status izin" onPress={() => { setSuccess(false); router.push('/explore'); }} />
        </View>
      </View>
    </Modal>
  </PractitionerScreen>;
}
