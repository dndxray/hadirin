import { Text, View } from 'react-native';

import { DataState, PractitionerScreen, ui } from '@/components/practitioner-ui';
import { PermissionHistory } from '@/components/permission-history';
import { useAttendanceTheme } from '@/constants/attendance-theme';
import { useAttendance } from '@/context/attendance-context';
import { formatAttendanceDate, formatAttendanceTime } from '@/utils/attendance-format';

export default function AttendanceHistoryScreen() {
  const colors = useAttendanceTheme();
  const { records, attendanceState, retry } = useAttendance();
  const history = [...records].sort((a, b) => (b.checkedInAt ?? 0) - (a.checkedInAt ?? 0));
  return <PractitionerScreen title="Riwayat kehadiran">
    <Text style={[ui.body, { color: colors.inkMuted }]}>Catatan kehadiran akunmu, tersimpan dan diperbarui otomatis.</Text>
    <DataState {...attendanceState} retry={retry} />
    {!attendanceState.loading && !attendanceState.error && !history.length ?
      <Text style={[ui.body, { color: colors.inkMuted }]}>Belum ada presensi. Hadiri sesi yang sedang dibuka untuk mencatat kehadiran.</Text> : null}
    {history.map((record) => <View key={record.id} style={[ui.panel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={{ color: colors.success, fontWeight: '700' }}>Hadir</Text>
      <Text style={[ui.heading, { color: colors.ink }]}>{record.session.courseName}</Text>
      <Text style={[ui.body, { color: colors.inkMuted }]}>{record.session.className} · {record.session.room}{'\n'}Jadwal: {record.session.dateLabel}, {record.session.timeRange}</Text>
      <Text style={[ui.body, { color: colors.ink }]}>{record.checkedInAt
        ? `Tercatat ${formatAttendanceDate(record.checkedInAt)}, ${formatAttendanceTime(record.checkedInAt)}`
        : 'Menunggu waktu server'}</Text>
    </View>)}
    <PermissionHistory />
  </PractitionerScreen>;
}
