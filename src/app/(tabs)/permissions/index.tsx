import { Ionicons } from '@expo/vector-icons';
import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DecisionModal } from '../../../../features/asisten/components/DecisionModal';
import { PermissionRequestItem } from '../../../../features/asisten/types';
import { useAuth } from '@/context/auth-context';
import {
  decidePermissionRequest,
  processPendingPermissionAi,
  subscribePermissionRequests,
} from '@/services/assistant-service';

function AiBadge({ ai }: { ai: PermissionRequestItem['ai'] }) {
  if (ai.status === 'pending') {
    return (
      <View style={[styles.badge, { backgroundColor: '#EEF1F6' }]}>
        <ActivityIndicator size="small" color="#64748B" style={{ marginRight: 4 }} />
        <Text style={[styles.badgeText, { color: '#64748B' }]}>Memproses AI...</Text>
      </View>
    );
  }
  if (ai.status === 'failed') {
    return (
      <View style={[styles.badge, { backgroundColor: '#FEF3C7' }]}>
        <Text style={[styles.badgeText, { color: '#92400E' }]}>AI Tidak Tersedia</Text>
      </View>
    );
  }
  
  const cat = ai.category ?? 'unknown';
  const colorMap: Record<string, { bg: string; text: string }> = {
    positif: { bg: '#E6F6EC', text: '#15803D' },
    netral:  { bg: '#EEF1F6', text: '#64748B' },
    negatif: { bg: '#FEE2E2', text: '#B91C1C' },
  };
  const color = colorMap[cat] ?? { bg: '#EEF1F6', text: '#64748B' };
  return (
    <View style={[styles.badge, { backgroundColor: color.bg }]}>
      <Text style={[styles.badgeText, { color: color.text }]}>AI: {cat}</Text>
    </View>
  );
}

function PermissionCard({ //kartu putih yg kotak by 1 user
  item,
  onApprove,
  onReject,
}: {
  item: PermissionRequestItem;
  onApprove: (item: PermissionRequestItem) => void;
  onReject: (item: PermissionRequestItem) => void;
}) {
  const isPending = item.status === 'pending';
  const statusColor = item.status === 'approved' ? '#15803D' : item.status === 'rejected' ? '#B91C1C' : '#1D4ED8';
  const statusBg = item.status === 'approved' ? '#E6F6EC' : item.status === 'rejected' ? '#FEE2E2' : '#DBEAFE';
  const statusLabel = item.status === 'approved' ? 'Disetujui' : item.status === 'rejected' ? 'Ditolak' : 'Menunggu';

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.nameBlock}>
          <Text style={styles.name}>{item.practitionerName}</Text>
          <Text style={styles.nim}>{item.practitionerNim}</Text>
        </View>
        <View style={[styles.statusChip, { backgroundColor: statusBg }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
        </View>
      </View>

      {item.session && (
        <Text style={styles.sessionInfo}>
          {item.session.courseName} · {item.session.className} · {item.session.dateLabel}
        </Text>
      )}

      <AiBadge ai={item.ai} />

      <Text style={styles.reasonLabel}>Alasan izin:</Text>
      <Text style={styles.reason}>{item.reason}</Text>

      {item.decisionNote ? (
        <Text style={styles.decisionNote}>Catatan: {item.decisionNote}</Text>
      ) : null}

      {isPending && (
        <View style={styles.actions}>
          <Pressable style={[styles.btn, styles.btnReject]} onPress={() => onReject(item)}>
            <Text style={styles.btnRejectText}>Tolak</Text>
          </Pressable>
          <Pressable style={[styles.btn, styles.btnApprove]} onPress={() => onApprove(item)}>
            <Text style={styles.btnApproveText}>Setujui</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

export default function PermissionsScreen() { //utama
  const insets = useSafeAreaInsets();
  const { profile, loading: authLoading } = useAuth();
  const [items, setItems] = useState<PermissionRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [decisionTarget, setDecisionTarget] = useState<PermissionRequestItem | null>(null);
  const [decisionType, setDecisionType] = useState<'approved' | 'rejected'>('approved');

  useEffect(() => {
    if (profile?.role !== 'asisten') return;

    const unsubscribe = subscribePermissionRequests(
      (requests) => {
        setItems(requests);
        setLoading(false);
        void processPendingPermissionAi(requests);
      },
      () => {
        setError('Gagal memuat pengajuan izin. Periksa koneksi Firestore Anda.');
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [profile?.role]);

  if (authLoading) {
    return <View style={[styles.screen, styles.center]}><ActivityIndicator color="#1B2A4E" /></View>;
  }
  if (!profile) return <Redirect href="/login" />;
  if (profile.role !== 'asisten') return <Redirect href="/home" />;

  const handleDecisionConfirm = async (note: string) => {
    if (!decisionTarget) return;
    await decidePermissionRequest(decisionTarget.id, decisionType, note);
    setDecisionTarget(null);
  };

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Pemeriksaan Izin</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#1B2A4E" />
          <Text style={styles.loadingText}>Memuat pengajuan izin...</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <PermissionCard
              item={item}
              onApprove={(i) => { setDecisionTarget(i); setDecisionType('approved'); }}
              onReject={(i) => { setDecisionTarget(i); setDecisionType('rejected'); }}
            />
          )}
          ListHeaderComponent={
            <Text style={styles.disclaimer}>
              Hasil klasifikasi AI bersifat pendukung. Keputusan izin tetap ditentukan oleh asisten.
            </Text>
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="document-text-outline" size={48} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>Tidak ada pengajuan izin</Text>
              <Text style={styles.emptySub}>Belum ada praktikan yang mengajukan izin.</Text>
            </View>
          }
          contentContainerStyle={styles.listContent}
        />
      )}

      {decisionTarget && ( //menekan tombol Setujui atau Tolak
        <DecisionModal
          visible={true}
          type={decisionType}
          practitionerName={decisionTarget.practitionerName}
          onConfirm={handleDecisionConfirm}
          onCancel={() => setDecisionTarget(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5F7FA' },
  header: { backgroundColor: '#1B2A4E', paddingBottom: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, gap: 12, maxWidth: 560, alignSelf: 'center', width: '100%' },
  backButton: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '800' },

  listContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 100, maxWidth: 560, alignSelf: 'center', width: '100%' },
  disclaimer: { fontSize: 12, color: '#64748B', marginBottom: 16, lineHeight: 18 },

  card: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, marginBottom: 16, shadowColor: '#1B2A4E', shadowOpacity: 0.05, shadowRadius: 15, shadowOffset: { width: 0, height: 5 }, elevation: 3 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  nameBlock: { flex: 1 },
  name: { fontSize: 16, fontWeight: '800', color: '#1B2A4E' },
  nim: { fontSize: 13, color: '#64748B', marginTop: 2 },
  statusChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99 },
  statusText: { fontSize: 12, fontWeight: '700' },
  sessionInfo: { fontSize: 12, color: '#64748B', marginBottom: 12 },

  badge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99, marginBottom: 12 },
  badgeText: { fontSize: 12, fontWeight: '700' },

  reasonLabel: { fontSize: 12, fontWeight: '600', color: '#64748B', marginBottom: 4 },
  reason: { fontSize: 14, color: '#1B2A4E', fontWeight: '500', marginBottom: 12, lineHeight: 20 },
  decisionNote: { fontSize: 12, color: '#64748B', fontStyle: 'italic', marginBottom: 12 },

  actions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  btn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  btnApprove: { backgroundColor: '#E6F6EC' },
  btnApproveText: { color: '#15803D', fontWeight: '800', fontSize: 14 },
  btnReject: { backgroundColor: '#FEE2E2' },
  btnRejectText: { color: '#B91C1C', fontWeight: '800', fontSize: 14 },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  loadingText: { marginTop: 12, color: '#64748B', fontSize: 14 },
  errorText: { color: '#B91C1C', fontSize: 14, textAlign: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: '#1B2A4E', marginTop: 16, marginBottom: 4 },
  emptySub: { fontSize: 14, color: '#64748B', textAlign: 'center' },
});