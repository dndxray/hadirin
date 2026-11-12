import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { AccessibilityInfo, Text, View } from 'react-native';

import { AttendanceConfirmationModal, type AttendanceModalPhase } from '@/components/attendance-confirmation-modal';
import { Action, DataState, PractitionerScreen, ui } from '@/components/practitioner-ui';
import { SessionStatusBadge } from '@/components/session-status-badge';
import { useAttendanceTheme } from '@/constants/attendance-theme';
import { useAttendance } from '@/context/attendance-context';
import type { CloudSession } from '@/types/practitioner';
import { formatAttendanceTime } from '@/utils/attendance-format';
import { firebaseErrorMessage } from '@/utils/firebase-error';

export default function AttendanceScreen() {
  const colors = useAttendanceTheme();
  const { sessions, records, permissions, sessionState, attendanceState, permissionState, checkIn, retry } = useAttendance();
  const [selected, setSelected] = useState<CloudSession | null>(null);
  const [phase, setPhase] = useState<AttendanceModalPhase>('closed');
  const [busy, setBusy] = useState(false);
  const locked = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const unavailable = sessionState.loading || attendanceState.loading || permissionState.loading
    || !!sessionState.error || !!attendanceState.error || !!permissionState.error || sessionState.fromCache;

  async function confirm() {
    if (!selected || locked.current) return;
    locked.current = true;
    setBusy(true);
    setError(null);
    try {
      await checkIn(selected.id);
      setPhase('success');
      AccessibilityInfo.announceForAccessibility('Presensi berhasil dicatat.');
    } catch (failure) {
      setPhase('closed');
      setError(firebaseErrorMessage(failure));
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }
  const time = records.find((record) => record.sessionId === selected?.id)?.checkedInAt;
  return <PractitionerScreen title="Presensi">
    <Text style={[ui.body, { color: colors.inkMuted }]}>Pilih sesi yang sedang dibuka. Kehadiran tersimpan di akunmu.</Text>
    <DataState {...sessionState} retry={retry} />
    <DataState {...attendanceState} retry={retry} />
    <DataState {...permissionState} retry={retry} />
    {error ? <Text accessibilityRole="alert" style={{ color: colors.danger }}>{error}</Text> : null}
    {!sessionState.loading && !sessionState.error && sessions.length === 0 ?
      <Text style={[ui.body, { color: colors.inkMuted }]}>Belum ada sesi untukmu. Hubungi asisten untuk memastikan akunmu terdaftar sebagai peserta.</Text> : null}
    {sessions.map((session) => {
      const record = records.find((item) => item.sessionId === session.id);
      const permission = permissions.find((item) => item.sessionId === session.id);
      const disabled = unavailable || busy || !!record || !!permission || session.status !== 'open';
      return <View key={session.id} style={[ui.panel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <SessionStatusBadge status={session.status} />
        <Text style={[ui.heading, { color: colors.ink }]}>{session.courseName}</Text>
        <Text style={[ui.body, { color: colors.inkMuted }]}>{session.className} · {session.room}{'\n'}{session.dateLabel}{'\n'}{session.timeRange}</Text>
        {record ? <Text style={{ color: colors.success }}>Sudah hadir · {record.checkedInAt ? formatAttendanceTime(record.checkedInAt) : 'Menunggu waktu server'}</Text> : null}
        {permission ? <Text style={{ color: colors.inkMuted }}>Izin sudah diajukan. Pantau keputusan di Riwayat.</Text> : null}
        <Action disabled={disabled} label={busy && selected?.id === session.id ? 'Menyimpan presensi…' : record ? 'Presensi sudah tercatat' : permission ? 'Izin sudah diajukan' : session.status !== 'open' ? 'Presensi tidak tersedia' : 'Isi presensi sekarang'}
          onPress={() => { setSelected(session); setPhase('confirm'); setError(null); }} />
      </View>;
    })}
    {selected ? <AttendanceConfirmationModal phase={phase} session={selected} busy={busy}
      attendanceTime={time ? formatAttendanceTime(time) : undefined}
      onConfirm={() => void confirm()} onClose={() => { if (!busy) setPhase('closed'); }}
      onViewHistory={() => { setPhase('closed'); router.push('/explore'); }} /> : null}
  </PractitionerScreen>;
}
