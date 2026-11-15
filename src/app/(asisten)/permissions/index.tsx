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
import { EmptyState } from '../../../../features/asisten/components/EmptyState';
import { theme } from '../../../../features/asisten/theme';
import { PermissionRequestItem } from '../../../../features/asisten/types';
import {
  decidePermissionRequest,
  processPendingPermissionAi,
  subscribePermissionRequests,
} from '../../../../src/services/assistant-service';

// ─── AI badge ────────────────────────────────────────────────────────────────
function AiBadge({ ai }: { ai: PermissionRequestItem['ai'] }) {
  if (ai.status === 'pending') {
    return (
      <View style={[aiBadgeStyles.base, aiBadgeStyles.pending]}>
        <ActivityIndicator size="small" color="#6B7280" style={{ marginRight: 4 }} />
        <Text style={aiBadgeStyles.pendingText}>Memproses AI...</Text>
      </View>
    );
  }
  if (ai.status === 'failed') {
    return (
      <View style={[aiBadgeStyles.base, aiBadgeStyles.failed]}>
        <Text style={aiBadgeStyles.failedText}>⚠️ AI tidak tersedia</Text>
      </View>
    );
  }
  // success
  const cat = ai.category ?? 'unknown';
  const colorMap: Record<string, { bg: string; text: string }> = {
    positif: { bg: '#D1FAE5', text: '#065F46' },
    netral:  { bg: '#E5E7EB', text: '#374151' },
    negatif: { bg: '#FEE2E2', text: '#991B1B' },
  };
  const color = colorMap[cat] ?? { bg: '#E5E7EB', text: '#374151' };
  return (
    <View style={[aiBadgeStyles.base, { backgroundColor: color.bg }]}>
      <Text style={[aiBadgeStyles.successText, { color: color.text }]}>
        AI: {cat}
      </Text>
    </View>
  );
}

const aiBadgeStyles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginBottom: 6,
  },
  pending: { backgroundColor: '#F3F4F6' },
  pendingText: { fontSize: 12, color: '#6B7280' },
  failed: { backgroundColor: '#FEF3C7' },
  failedText: { fontSize: 12, color: '#92400E' },
  successText: { fontSize: 12, fontWeight: '600' },
});

// ─── Permission card ──────────────────────────────────────────────────────────
function PermissionCard({
  item,
  onApprove,
  onReject,
}: {
  item: PermissionRequestItem;
  onApprove: (item: PermissionRequestItem) => void;
  onReject: (item: PermissionRequestItem) => void;
}) {
  const isPending = item.status === 'pending';
  const statusColor =
    item.status === 'approved'
      ? '#065F46'
      : item.status === 'rejected'
      ? '#991B1B'
      : '#1D4ED8';
  const statusBg =
    item.status === 'approved'
      ? '#D1FAE5'
      : item.status === 'rejected'
      ? '#FEE2E2'
      : '#DBEAFE';
  const statusLabel =
    item.status === 'approved'
      ? '✓ Disetujui'
      : item.status === 'rejected'
      ? '✕ Ditolak'
      : '• Menunggu';

  return (
    <View style={cardStyles.card}>
      {/* Header: name + status */}
      <View style={cardStyles.header}>
        <View style={cardStyles.nameBlock}>
          <Text style={cardStyles.name}>{item.practitionerName}</Text>
          <Text style={cardStyles.nim}>{item.practitionerNim}</Text>
        </View>
        <View style={[cardStyles.statusBadge, { backgroundColor: statusBg }]}>
          <Text style={[cardStyles.statusText, { color: statusColor }]}>
            {statusLabel}
          </Text>
        </View>
      </View>

      {/* Session info */}
      {item.session && (
        <Text style={cardStyles.sessionInfo}>
          {item.session.courseName}
          {item.session.className ? ` · ${item.session.className}` : ''}
          {item.session.dateLabel ? ` · ${item.session.dateLabel}` : ''}
        </Text>
      )}

      {/* AI badge */}
      <AiBadge ai={item.ai} />

      {/* Reason */}
      <Text style={cardStyles.reasonLabel}>Alasan izin:</Text>
      <Text style={cardStyles.reason}>{item.reason}</Text>

      {/* AI unavailable note */}
      {item.ai.status === 'failed' && (
        <Text style={cardStyles.aiNote}>
          Klasifikasi AI tidak tersedia. Tinjau alasan secara manual.
        </Text>
      )}

      {/* Decision note if already decided */}
      {item.decisionNote ? (
        <Text style={cardStyles.decisionNote}>
          Catatan: {item.decisionNote}
        </Text>
      ) : null}

      {/* Action buttons — only for pending */}
      {isPending && (
        <View style={cardStyles.actions}>
          <Pressable
            style={[cardStyles.actionBtn, cardStyles.approveBtn]}
            onPress={() => onApprove(item)}
          >
            <Text style={cardStyles.approveBtnText}>✓ Setujui</Text>
          </Pressable>
          <Pressable
            style={[cardStyles.actionBtn, cardStyles.rejectBtn]}
            onPress={() => onReject(item)}
          >
            <Text style={cardStyles.rejectBtnText}>✕ Tolak</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  nameBlock: { flex: 1 },
  name: {
    fontSize: theme.fontSize.md,
    fontWeight: '700',
    color: theme.colors.text,
  },
  nim: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
    marginTop: 1,
  },
  statusBadge: {
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginLeft: 8,
  },
  statusText: { fontSize: 12, fontWeight: '600' },
  sessionInfo: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
    marginBottom: 8,
  },
  reasonLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
    marginBottom: 2,
  },
  reason: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text,
    marginBottom: 8,
  },
  aiNote: {
    fontSize: theme.fontSize.xs,
    color: '#92400E',
    backgroundColor: '#FEF3C7',
    borderRadius: 6,
    padding: 6,
    marginBottom: 8,
  },
  decisionNote: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
    fontStyle: 'italic',
    marginBottom: 8,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  approveBtn: { backgroundColor: '#D1FAE5' },
  approveBtnText: { color: '#065F46', fontWeight: '700', fontSize: theme.fontSize.sm },
  rejectBtn: { backgroundColor: '#FEE2E2' },
  rejectBtnText: { color: '#991B1B', fontWeight: '700', fontSize: theme.fontSize.sm },
});

// ─── Main screen ─────────────────────────────────────────────────────────────
export default function PermissionsScreen() {
  const insets = useSafeAreaInsets();

  const [items, setItems] = useState<PermissionRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Decision modal state
  const [decisionTarget, setDecisionTarget] = useState<PermissionRequestItem | null>(null);
  const [decisionType, setDecisionType] = useState<'approved' | 'rejected'>('approved');

  // Subscribe real-time
  useEffect(() => {
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
  }, []);

  const handleApprove = (item: PermissionRequestItem) => {
    setDecisionTarget(item);
    setDecisionType('approved');
  };

  const handleReject = (item: PermissionRequestItem) => {
    setDecisionTarget(item);
    setDecisionType('rejected');
  };

  const handleDecisionConfirm = async (note: string) => {
    if (!decisionTarget) return;
    await decidePermissionRequest(
      decisionTarget.id,
      decisionType,
      note
    );
    setDecisionTarget(null);
  };

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Memuat pengajuan izin...</Text>
      </View>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorTitle}>Terjadi Kesalahan</Text>
        <Text style={styles.errorMessage}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <PermissionCard
            item={item}
            onApprove={handleApprove}
            onReject={handleReject}
          />
        )}
        ListHeaderComponent={
          <Text style={styles.aiDisclaimer}>
            Hasil klasifikasi AI bersifat pendukung. Keputusan izin tetap ditentukan oleh asisten.
          </Text>
        }
        ListEmptyComponent={
          <EmptyState
            icon="📋"
            title="Tidak ada pengajuan izin"
            subtitle="Tidak ada pengajuan izin yang menunggu keputusan."
          />
        }
        contentContainerStyle={[
          styles.contentContainer,
          { paddingBottom: insets.bottom + theme.spacing.lg },
        ]}
      />

      {decisionTarget && (
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
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: theme.spacing.sm,
    padding: theme.spacing.xl,
  },
  contentContainer: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    maxWidth: theme.layout.maxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  loadingText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
  },
  aiDisclaimer: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.md,
    lineHeight: 18,
  },
  errorIcon: {
    fontSize: 40,
    marginBottom: theme.spacing.sm,
  },
  errorTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 4,
  },
  errorMessage: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
});
