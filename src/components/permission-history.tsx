import { Text, View } from 'react-native';

import { DataState, ui } from '@/components/practitioner-ui';
import { useAttendanceTheme } from '@/constants/attendance-theme';
import { useAttendance } from '@/context/attendance-context';
import { formatAttendanceDate } from '@/utils/attendance-format';

const decisions = { pending: 'Menunggu', approved: 'Diterima', rejected: 'Ditolak' };

export function PermissionHistory() {
  const colors = useAttendanceTheme();
  const { permissions, permissionState, retry } = useAttendance();
  return <View style={{ gap: 16 }}>
    <Text accessibilityRole="header" style={[ui.heading, { color: colors.ink }]}>Riwayat izin</Text>
    <DataState {...permissionState} retry={retry} />
    {!permissionState.loading && !permissionState.error && !permissions.length ? <Text style={[ui.body, { color: colors.inkMuted }]}>Belum ada pengajuan izin.</Text> : null}
    {[...permissions].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)).map((request) => <View key={request.id} style={[ui.panel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text accessibilityLiveRegion="polite" style={{ color: request.status === 'approved' ? colors.success : request.status === 'rejected' ? colors.danger : colors.warning, fontWeight: '700' }}>{decisions[request.status] ?? 'Status belum dikenali'}</Text>
      <Text style={[ui.heading, { color: colors.ink }]}>{request.session.courseName}</Text>
      <Text style={[ui.body, { color: colors.inkMuted }]}>{request.session.className} · {request.session.dateLabel}{'\n'}{request.session.timeRange}</Text>
      <Text style={[ui.body, { color: colors.ink }]}>{request.reason}</Text>
      <Text style={[ui.body, { color: colors.inkMuted }]}>Diajukan: {request.createdAt ? formatAttendanceDate(request.createdAt) : 'Menunggu waktu server'}</Text>
      <Text accessibilityLiveRegion="polite" style={[ui.body, { color: colors.ink }]}>{request.ai?.status === 'success'
        ? `Kategori AI: ${request.ai.category ?? 'Belum tersedia'}`
        : request.ai?.status === 'failed'
          ? 'Klasifikasi AI gagal. Izin tetap tersimpan dan dapat diperiksa asisten.'
          : 'Klasifikasi AI menunggu pemrosesan. Izin sudah tersimpan.'}</Text>
      {request.decisionNote ? <Text style={[ui.body, { color: colors.ink }]}>Catatan asisten: {request.decisionNote}</Text> : null}
      <Text style={{ color: colors.inkMuted }}>Keputusan izin diberikan oleh asisten, bukan AI.</Text>
    </View>)}
  </View>;
}
