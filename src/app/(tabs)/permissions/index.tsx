import { Ionicons } from '@expo/vector-icons';
import { Redirect } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { authColors } from '@/components/auth-ui';
import { BackButton } from '@/components/back-button';
import { useAuth } from '@/context/auth-context';
import {
  decidePermissionRequest,
  processPendingPermissionAi,
  subscribePermissionRequests,
} from '@/services/assistant-service';
import { DecisionModal } from '../../../../features/asisten/components/DecisionModal';
import { PermissionRequestItem } from '../../../../features/asisten/types';

type StatusFilter = 'all' | 'approved' | 'pending' | 'rejected';

const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

const STATUS_TABS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'Semua' },
  { key: 'approved', label: 'Disetujui' },
  { key: 'pending', label: 'Menunggu' },
  { key: 'rejected', label: 'Ditolak' },
];

const STATUS_STYLE = {
  approved: { label: 'Disetujui', bg: '#E6F6EC', fg: '#15803D' },
  rejected: { label: 'Ditolak', bg: '#FEE2E2', fg: '#B91C1C' },
  pending: { label: 'Menunggu', bg: '#DBEAFE', fg: '#1D4ED8' },
} as const;

const AI_TEXT: Record<string, string> = {
  positif: 'Alasan tampak jelas dan wajar.',
  netral: 'Terdapat alasan yang umum, namun perlu pertimbangan lebih lanjut.',
  negatif: 'Alasan perlu diperiksa lebih teliti.',
};

const AI_COLOR: Record<string, { bg: string; fg: string }> = {
  positif: { bg: '#E6F6EC', fg: '#15803D' },
  netral: { bg: '#EEF1F6', fg: '#64748B' },
  negatif: { bg: '#FEE2E2', fg: '#B91C1C' },
};

function toMs(value: string | number | undefined): number | null {
  if (value === undefined || value === null) return null;
  const ms = typeof value === 'number' ? value : Date.parse(value);
  return Number.isNaN(ms) ? null : ms;
}

function monthIndex(item: PermissionRequestItem): number | null {
  const label = item.session?.dateLabel ?? '';
  const found = MONTHS.findIndex((m) => label.includes(m));
  if (found >= 0) return found;
  const ms = toMs(item.createdAt);
  return ms === null ? null : new Date(ms).getMonth();
}

function shortDate(label?: string) {
  if (!label) return '';
  const m = label.match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
  return m ? `${m[1]} ${m[2].slice(0, 3)} ${m[3]}` : label;
}

function longDate(label?: string) {
  return label ?? '';
}

function decidedLabel(value: string | number | undefined) {
  const ms = toMs(value);
  if (ms === null) return '';
  const d = new Date(ms);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)} ${d.getFullYear()} · ${hh}:${mm}`;
}

function StatusChip({ status }: { status: PermissionRequestItem['status'] }) {
  const s = STATUS_STYLE[status];
  return (
    <View style={[styles.chip, { backgroundColor: s.bg }]}>
      <Text style={[styles.chipText, { color: s.fg }]}>{s.label}</Text>
    </View>
  );
}

function RequestRow({ item, onPress }: { item: PermissionRequestItem; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Izin ${item.practitionerName}`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
    >
      <View style={styles.cardIcon}>
        <Ionicons name="calendar-outline" size={24} color={authColors.navy} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={styles.cardTop}>
          <Text style={styles.name} numberOfLines={1}>{item.practitionerName}</Text>
          <StatusChip status={item.status} />
        </View>
        <Text style={styles.nim}>{item.practitionerNim}</Text>
        {item.session ? (
          <View style={styles.courseRow}>
            <Ionicons name="school-outline" size={14} color={authColors.muted} />
            <Text style={styles.course} numberOfLines={1}>
              {item.session.courseName} · {shortDate(item.session.dateLabel)}
            </Text>
          </View>
        ) : null}
        <Text style={styles.reasonPreview} numberOfLines={1}>{item.reason}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={authColors.ink} />
    </Pressable>
  );
}

function DetailView({
  item,
  onBack,
  onApprove,
  onReject,
}: {
  item: PermissionRequestItem;
  onBack: () => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  const insets = useSafeAreaInsets();
  const status = STATUS_STYLE[item.status];
  const cat = item.ai.status === 'success' ? item.ai.category ?? 'netral' : null;
  const decided = decidedLabel(item.decidedAt);

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
        <View style={styles.headerRow}>
          <BackButton onPress={onBack} />
          <Text style={styles.headerTitle}>Detail Permohonan</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.detailContent, { paddingBottom: insets.bottom + 120 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.detailCard}>
          <View style={styles.detailHead}>
            <View style={styles.detailAvatar}>
              <Ionicons name="calendar-outline" size={30} color={authColors.navy} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.detailName}>{item.practitionerName}</Text>
              <Text style={styles.nim}>{item.practitionerNim}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {item.session ? (
            <View style={{ gap: 10 }}>
              <View style={styles.infoRow}>
                <Ionicons name="school-outline" size={18} color={authColors.ink} />
                <Text style={styles.infoText}>
                  {item.session.courseName}
                  {item.session.className ? ` · Kelas ${item.session.className}` : ''}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="calendar-outline" size={18} color={authColors.ink} />
                <Text style={styles.infoText}>{longDate(item.session.dateLabel)}</Text>
              </View>
            </View>
          ) : null}

          <Text style={styles.sectionLabel}>Alasan Izin</Text>
          <View style={styles.reasonBox}>
            <Text style={styles.reasonText}>{item.reason}</Text>
          </View>

          {item.decisionNote ? (
            <>
              <View style={[styles.infoRow, { marginTop: 18 }]}>
                <Ionicons name="document-text-outline" size={18} color={authColors.ink} />
                <Text style={styles.sectionInline}>Catatan</Text>
              </View>
              <Text style={styles.note}>{item.decisionNote}</Text>
            </>
          ) : null}

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Ionicons name="sparkles-outline" size={18} color={authColors.ink} />
            <Text style={styles.sectionInline}>Analisis AI</Text>
          </View>
          {item.ai.status === 'pending' ? (
            <View style={styles.aiRow}>
              <ActivityIndicator size="small" color="#64748B" />
              <Text style={styles.aiText}>Sedang diproses…</Text>
            </View>
          ) : item.ai.status === 'failed' || !cat ? (
            <Text style={styles.aiText}>Analisis AI tidak tersedia untuk pengajuan ini.</Text>
          ) : (
            <View style={{ gap: 6, marginTop: 8 }}>
              <View style={[styles.aiChip, { backgroundColor: (AI_COLOR[cat] ?? AI_COLOR.netral).bg }]}>
                <Text style={[styles.aiChipText, { color: (AI_COLOR[cat] ?? AI_COLOR.netral).fg }]}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </Text>
              </View>
              <Text style={styles.aiText}>{AI_TEXT[cat] ?? ''}</Text>
            </View>
          )}
          <Text style={styles.aiDisclaimer}>
            Hasil klasifikasi AI bersifat pendukung. Keputusan tetap ditentukan oleh asisten.
          </Text>

          <Text style={styles.sectionLabel}>Status Permohonan</Text>
          <View style={[styles.statusBox, { backgroundColor: status.bg }]}>
            <Ionicons
              name={
                item.status === 'approved'
                  ? 'checkmark-circle'
                  : item.status === 'rejected'
                    ? 'close-circle'
                    : 'time'
              }
              size={36}
              color={status.fg}
            />
            <View style={{ flex: 1 }}>
              <Text style={[styles.statusTitle, { color: status.fg }]}>{status.label}</Text>
              <Text style={styles.statusSub}>
                {item.status === 'approved'
                  ? 'Permohonan ini telah disetujui oleh asisten.'
                  : item.status === 'rejected'
                    ? 'Permohonan ini telah ditolak oleh asisten.'
                    : 'Permohonan ini menunggu keputusan asisten.'}
              </Text>
            </View>
          </View>

          {item.status !== 'pending' && decided ? (
            <>
              <View style={[styles.infoRow, { marginTop: 18 }]}>
                <Ionicons name="time-outline" size={18} color={authColors.ink} />
                <Text style={styles.sectionInline}>Riwayat</Text>
              </View>
              <View style={styles.history}>
                <View style={[styles.historyDot, { backgroundColor: status.fg }]} />
                <View>
                  <Text style={styles.historyTitle}>{status.label}</Text>
                  <Text style={styles.historySub}>{decided} oleh Asisten</Text>
                </View>
              </View>
            </>
          ) : null}
        </View>

        {item.status === 'pending' ? (
          <View style={styles.actions}>
            <Pressable style={[styles.btn, styles.btnReject]} onPress={onReject}>
              <Text style={styles.btnRejectText}>Tolak</Text>
            </Pressable>
            <Pressable style={[styles.btn, styles.btnApprove]} onPress={onApprove}>
              <Text style={styles.btnApproveText}>Setujui</Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

export default function PermissionsScreen() {
  const insets = useSafeAreaInsets();
  const { profile, loading: authLoading } = useAuth();
  const [items, setItems] = useState<PermissionRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [month, setMonth] = useState<number | null>(null);
  const [monthOpen, setMonthOpen] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

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
      (firestoreError) => {
        const code =
          'code' in firestoreError && typeof firestoreError.code === 'string'
            ? firestoreError.code
            : 'unknown';
        console.error('Gagal memuat pengajuan izin dari Firestore:', {
          code,
          message: firestoreError.message,
        });
        setError(`Gagal memuat pengajuan izin (${code}): ${firestoreError.message}`);
        setLoading(false);
      },
    );
    return () => unsubscribe();
  }, [profile?.role]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((i) => {
      if (status !== 'all' && i.status !== status) return false;
      if (month !== null && monthIndex(i) !== month) return false;
      if (!q) return true;
      return (
        i.practitionerName.toLowerCase().includes(q) ||
        i.practitionerNim.toLowerCase().includes(q) ||
        String(i.session?.courseName ?? '').toLowerCase().includes(q)
      );
    });
  }, [items, search, status, month]);

  if (authLoading) {
    return (
      <View style={[styles.screen, styles.center]}>
        <ActivityIndicator color={authColors.navy} />
      </View>
    );
  }
  if (!profile) return <Redirect href="/login" />;
  if (profile.role !== 'asisten') return <Redirect href="/home" />;

  const handleDecisionConfirm = async (note: string) => {
    if (!decisionTarget) return;
    await decidePermissionRequest(decisionTarget.id, decisionType, note);
    setDecisionTarget(null);
  };

  const selected = selectedId ? items.find((i) => i.id === selectedId) ?? null : null;
  const filterActive = month !== null;

  const decisionModal = decisionTarget ? (
    <DecisionModal
      visible={true}
      type={decisionType}
      practitionerName={decisionTarget.practitionerName}
      onConfirm={handleDecisionConfirm}
      onCancel={() => setDecisionTarget(null)}
    />
  ) : null;

  if (selected) {
    return (
      <>
        <DetailView
          item={selected}
          onBack={() => setSelectedId(null)}
          onApprove={() => {
            setDecisionType('approved');
            setDecisionTarget(selected);
          }}
          onReject={() => {
            setDecisionType('rejected');
            setDecisionTarget(selected);
          }}
        />
        {decisionModal}
      </>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={[styles.header, styles.headerList, { paddingTop: insets.top + 20 }]}>
        <View style={styles.headerRow}>
          <BackButton />
          <Text style={styles.headerTitleBig}>Izin</Text>
        </View>
      </View>

      <View style={styles.searchWrap}>
        <View style={styles.searchRow}>
          <View style={styles.search}>
            <Ionicons name="search-outline" size={18} color={authColors.muted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Cari nama praktikum..."
              placeholderTextColor={authColors.placeholder}
              value={search}
              onChangeText={setSearch}
              accessibilityLabel="Cari pengajuan izin"
            />
            {search ? (
              <Pressable onPress={() => setSearch('')} hitSlop={8}>
                <Ionicons name="close-circle" size={18} color={authColors.placeholder} />
              </Pressable>
            ) : null}
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Filter"
            accessibilityState={{ expanded: showFilter }}
            onPress={() => setShowFilter((v) => !v)}
            style={[styles.filterBtn, (showFilter || filterActive) && styles.filterBtnOn]}
          >
            <Ionicons
              name="options-outline"
              size={22}
              color={showFilter || filterActive ? authColors.white : authColors.navy}
            />
            {filterActive ? <View style={styles.filterDot} /> : null}
          </Pressable>
        </View>

        {showFilter ? (
          <View style={styles.filterPanel}>
            <Text style={styles.filterLabel}>Status</Text>
            <View style={styles.filterWrap}>
              {STATUS_TABS.map((t) => (
                <Pressable
                  key={t.key}
                  onPress={() => setStatus(t.key)}
                  style={[styles.pill, status === t.key && styles.pillOn]}
                >
                  <Text style={[styles.pillText, status === t.key && styles.pillTextOn]}>{t.label}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.filterLabel, { marginTop: 14 }]}>Bulan</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Pilih bulan"
              accessibilityState={{ expanded: monthOpen }}
              onPress={() => setMonthOpen((v) => !v)}
              style={styles.dropdown}
            >
              <Ionicons name="calendar-outline" size={18} color={authColors.navy} />
              <Text style={styles.dropdownText}>
                {month === null ? 'Semua bulan' : MONTHS[month]}
              </Text>
              <Ionicons
                name={monthOpen ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={authColors.muted}
              />
            </Pressable>
            {monthOpen ? (
              <View style={styles.dropdownList}>
                <ScrollView nestedScrollEnabled style={{ maxHeight: 220 }}>
                  {[null, ...MONTHS.map((_, i) => i)].map((m) => {
                    const active = month === m;
                    return (
                      <Pressable
                        key={m === null ? 'semua' : m}
                        onPress={() => {
                          setMonth(m);
                          setMonthOpen(false);
                        }}
                        style={[styles.dropdownItem, active && styles.dropdownItemOn]}
                      >
                        <Text style={[styles.dropdownItemText, active && styles.dropdownItemTextOn]}>
                          {m === null ? 'Semua bulan' : MONTHS[m]}
                        </Text>
                        {active ? <Ionicons name="checkmark" size={18} color={authColors.navy} /> : null}
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            ) : null}

            {(status !== 'all' || month !== null) ? (
              <Pressable
                onPress={() => {
                  setStatus('all');
                  setMonth(null);
                  setMonthOpen(false);
                }}
                hitSlop={8}
              >
                <Text style={styles.reset}>Reset filter</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>

      <View style={styles.tabsWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsRow}>
          {STATUS_TABS.map((t) => (
            <Pressable
              key={t.key}
              accessibilityRole="button"
              accessibilityState={{ selected: status === t.key }}
              onPress={() => setStatus(t.key)}
              style={[styles.pill, status === t.key && styles.pillOn]}
            >
              <Text style={[styles.pillText, status === t.key && styles.pillTextOn]}>{t.label}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={authColors.navy} />
          <Text style={styles.loadingText}>Memuat pengajuan izin...</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <RequestRow item={item} onPress={() => setSelectedId(item.id)} />}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="document-text-outline" size={48} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>
                {items.length === 0 ? 'Tidak ada pengajuan izin' : 'Tidak ada hasil'}
              </Text>
              <Text style={styles.emptySub}>
                {items.length === 0
                  ? 'Belum ada praktikan yang mengajukan izin.'
                  : 'Coba ubah kata kunci atau filter.'}
              </Text>
            </View>
          }
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 130 }]}
          showsVerticalScrollIndicator={false}
        />
      )}

      {decisionModal}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: authColors.background },

  header: {
    backgroundColor: authColors.navy,
    paddingBottom: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerList: { paddingBottom: 52 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 12,
    maxWidth: 560,
    alignSelf: 'center',
    width: '100%',
  },
  headerTitle: { flex: 1, color: '#FFFFFF', fontSize: 18, fontWeight: '800' },
  headerTitleBig: { flex: 1, color: '#FFFFFF', fontSize: 24, fontWeight: '800' },

  searchWrap: {
    paddingHorizontal: 20,
    marginTop: -28,
    maxWidth: 560,
    alignSelf: 'center',
    width: '100%',
    zIndex: 5,
  },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  search: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: authColors.white,
    borderRadius: 18,
    paddingHorizontal: 16,
    minHeight: 52,
    shadowColor: '#1B2A4E',
    shadowOpacity: 0.1,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  searchInput: { flex: 1, color: authColors.ink, fontSize: 14, paddingVertical: 12 },
  filterBtn: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: authColors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1B2A4E',
    shadowOpacity: 0.1,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  filterBtnOn: { backgroundColor: authColors.navy },
  filterDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#EF4444',
    borderWidth: 1.5,
    borderColor: authColors.white,
  },

  filterPanel: {
    marginTop: 10,
    backgroundColor: authColors.white,
    borderRadius: 18,
    padding: 16,
    shadowColor: '#1B2A4E',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },
  filterLabel: { color: authColors.ink, fontSize: 13, fontWeight: '800', marginBottom: 8 },
  filterWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F1F4F9',
    borderWidth: 1,
    borderColor: authColors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    minHeight: 48,
  },
  dropdownText: { flex: 1, color: authColors.ink, fontSize: 14, fontWeight: '600' },
  dropdownList: {
    marginTop: 6,
    backgroundColor: authColors.white,
    borderWidth: 1,
    borderColor: authColors.border,
    borderRadius: 14,
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    minHeight: 44,
  },
  dropdownItemOn: { backgroundColor: '#E8EEF9' },
  dropdownItemText: { color: authColors.ink, fontSize: 14 },
  dropdownItemTextOn: { fontWeight: '800', color: authColors.navy },
  reset: { color: '#2F5AA8', fontSize: 13, fontWeight: '700', marginTop: 14 },

  tabsWrap: { maxWidth: 560, alignSelf: 'center', width: '100%' },
  tabsRow: { paddingHorizontal: 20, paddingVertical: 14, gap: 8 },
  pill: {
    backgroundColor: '#E8EDF5',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minHeight: 40,
    justifyContent: 'center',
  },
  pillOn: { backgroundColor: authColors.navy },
  pillText: { color: authColors.ink, fontSize: 13, fontWeight: '600' },
  pillTextOn: { color: authColors.white, fontWeight: '800' },

  listContent: { paddingHorizontal: 20, maxWidth: 560, alignSelf: 'center', width: '100%' },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: authColors.white,
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#1B2A4E',
    shadowOpacity: 0.07,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },
  cardIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#E3E9F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  name: { flex: 1, fontSize: 16, fontWeight: '800', color: authColors.ink },
  nim: { fontSize: 13, color: authColors.muted, marginTop: 2 },
  chip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  chipText: { fontSize: 11, fontWeight: '800' },
  courseRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  course: { flex: 1, fontSize: 12, color: authColors.muted },
  reasonPreview: { fontSize: 12, color: authColors.ink, marginTop: 4 },

  detailContent: { paddingHorizontal: 20, paddingTop: 20, maxWidth: 560, alignSelf: 'center', width: '100%' },
  detailCard: {
    backgroundColor: authColors.white,
    borderRadius: 24,
    padding: 20,
    shadowColor: '#1B2A4E',
    shadowOpacity: 0.07,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },
  detailHead: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  detailAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E3E9F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailName: { fontSize: 20, fontWeight: '800', color: authColors.ink },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: authColors.border, marginVertical: 16 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  infoText: { flex: 1, fontSize: 14, color: authColors.ink },
  sectionLabel: { fontSize: 15, fontWeight: '800', color: authColors.ink, marginTop: 20, marginBottom: 8 },
  sectionInline: { fontSize: 14, fontWeight: '800', color: authColors.ink },
  reasonBox: { backgroundColor: '#E8EDF9', borderRadius: 16, padding: 14 },
  reasonText: { fontSize: 14, color: authColors.ink, lineHeight: 20 },
  note: { fontSize: 13, color: authColors.muted, fontStyle: 'italic', marginTop: 6, marginLeft: 28 },

  aiRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  aiChip: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4 },
  aiChipText: { fontSize: 13, fontWeight: '800' },
  aiText: { fontSize: 13, color: authColors.muted, lineHeight: 19, marginTop: 6 },
  aiDisclaimer: { fontSize: 11, color: authColors.muted, marginTop: 8, lineHeight: 16 },

  statusBox: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 18, padding: 16 },
  statusTitle: { fontSize: 20, fontWeight: '800' },
  statusSub: { fontSize: 12, color: authColors.muted, marginTop: 2 },

  history: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 10, marginLeft: 4 },
  historyDot: { width: 14, height: 14, borderRadius: 7 },
  historyTitle: { fontSize: 14, fontWeight: '700', color: authColors.ink },
  historySub: { fontSize: 12, color: authColors.muted, marginTop: 1 },

  actions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  btn: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  btnApprove: { backgroundColor: '#15803D' },
  btnApproveText: { color: '#FFFFFF', fontWeight: '800', fontSize: 15 },
  btnReject: { backgroundColor: '#FEE2E2' },
  btnRejectText: { color: '#B91C1C', fontWeight: '800', fontSize: 15 },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  loadingText: { marginTop: 12, color: authColors.muted, fontSize: 14 },
  errorText: { color: '#B91C1C', fontSize: 14, textAlign: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: authColors.ink, marginTop: 16, marginBottom: 4 },
  emptySub: { fontSize: 14, color: authColors.muted, textAlign: 'center' },
});