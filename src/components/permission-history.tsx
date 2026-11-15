import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { authColors } from '@/components/auth-ui';
import { StateView } from '@/components/state-view';
import { useAttendance } from '@/context/attendance-context';
import { formatAttendanceDate } from '@/utils/attendance-format';

const decisions = { pending: 'Menunggu', approved: 'Diterima', rejected: 'Ditolak' };

export function HistoryDataState({ loading, error, fromCache, retry }: {
  loading: boolean; error: string | null; fromCache: boolean; retry: () => void;
}) {
  if (loading) return <View style={styles.loading}><ActivityIndicator color={authColors.navy} /><Text style={styles.meta}>Memuat data…</Text></View>;
  if (error) return <StateView kind="error" title="Data belum dapat dimuat" message={error} actionLabel="Coba lagi" onAction={retry} />;
  return fromCache ? <Text accessibilityLiveRegion="polite" style={styles.meta}>Menampilkan cache. Data akan diperbarui setelah tersambung ke server.</Text> : null;
}

export function PermissionHistory() {
  const { permissions, permissionState, retry } = useAttendance();
  return <View style={{ gap: 14 }}>
    <Text accessibilityRole="header" style={styles.sectionTitle}>Riwayat izin</Text>
    <HistoryDataState {...permissionState} retry={retry} />
    {!permissionState.loading && !permissionState.error && !permissions.length ? <StateView kind="empty"
      title="Belum ada pengajuan izin" message="Pengajuan izin dan keputusan asisten akan muncul di sini." /> : null}
    {[...permissions].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)).map((request) => {
      const status = request.status === 'approved'
        ? { color: '#166534', backgroundColor: '#E6F6EC' }
        : request.status === 'rejected'
          ? { color: '#B91C1C', backgroundColor: '#FEE2E2' }
          : { color: '#8A5309', backgroundColor: '#FFF0D4' };
      return <View key={request.id} style={styles.card}>
        <View style={styles.headerRow}>
          <View style={styles.icon}><Ionicons name="document-text-outline" size={20} color={authColors.navy} /></View>
          <View style={{ flex: 1, gap: 5 }}>
            <Text accessibilityRole="header" style={styles.title}>{request.session?.courseName || 'Sesi praktikum'}</Text>
            <Text style={styles.meta}>{request.session?.className || 'Kelas belum tersedia'}</Text>
            <View style={[styles.badge, { backgroundColor: status.backgroundColor }]}>
              <Text accessibilityLiveRegion="polite" style={[styles.badgeText, { color: status.color }]}>{decisions[request.status] ?? 'Status belum dikenali'}</Text>
            </View>
          </View>
        </View>
        <Text style={styles.meta}>{request.session?.dateLabel || 'Tanggal belum tersedia'}{'\n'}{request.session?.timeRange || ''}</Text>
        <View style={styles.divider} />
        <View style={{ gap: 4 }}><Text style={styles.label}>Alasan ketidakhadiran</Text><Text style={styles.body}>{request.reason}</Text></View>
        <Text style={styles.meta}>Diajukan: {request.createdAt ? formatAttendanceDate(request.createdAt) : 'Waktu belum tersedia'}</Text>
        <View style={styles.divider} />
        <View style={{ gap: 5 }}>
          <Text style={styles.label}>Klasifikasi AI</Text>
          <Text accessibilityLiveRegion="polite" style={styles.body}>{request.ai?.status === 'success'
            ? `Kategori AI: ${request.ai.category ?? 'Belum tersedia'}`
            : request.ai?.status === 'failed'
              ? 'Klasifikasi AI gagal. Izin tetap tersimpan dan dapat diperiksa asisten.'
              : 'Klasifikasi AI menunggu pemrosesan. Izin sudah tersimpan.'}</Text>
          <Text style={styles.meta}>Keputusan izin diberikan oleh asisten, bukan AI.</Text>
        </View>
        {request.decisionNote ? <View style={{ gap: 4 }}><Text style={styles.label}>Catatan asisten</Text><Text style={styles.body}>{request.decisionNote}</Text></View> : null}
      </View>;
    })}
  </View>;
}

const styles = StyleSheet.create({
  sectionTitle: { color: authColors.navy, fontSize: 20, lineHeight: 27, fontWeight: '800' },
  card: { backgroundColor: authColors.white, borderRadius: 20, padding: 16, gap: 14, shadowColor: authColors.navy, shadowOpacity: 0.06, shadowRadius: 14, shadowOffset: { width: 0, height: 5 }, elevation: 2 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  icon: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#E8EEF9', alignItems: 'center', justifyContent: 'center' },
  title: { color: authColors.navy, fontWeight: '800', fontSize: 16, lineHeight: 23 },
  meta: { color: '#52627A', fontSize: 13, lineHeight: 20 },
  body: { color: authColors.ink, fontSize: 15, lineHeight: 23 },
  label: { color: authColors.navy, fontSize: 13, lineHeight: 20, fontWeight: '700' },
  badge: { alignSelf: 'flex-start', borderRadius: 99, paddingHorizontal: 10, paddingVertical: 5 },
  badgeText: { fontSize: 12, lineHeight: 17, fontWeight: '700' },
  divider: { height: 1, backgroundColor: authColors.border },
  loading: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
});
