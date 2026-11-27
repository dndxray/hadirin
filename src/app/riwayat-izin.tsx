import { Ionicons } from '@expo/vector-icons';
import { Redirect, router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { authColors } from '@/components/auth-ui';
import { BackButton } from '@/components/back-button';
import { HistoryDataState } from '@/components/permission-history';
import { StateView } from '@/components/state-view';
import { useAttendance } from '@/context/attendance-context';
import { useAuth } from '@/context/auth-context';
import type { PermissionRequest } from '@/types/practitioner';

type Filter = 'all' | PermissionRequest['status'];

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'Semua' },
  { key: 'approved', label: 'Disetujui' },
  { key: 'pending', label: 'Menunggu' },
  { key: 'rejected', label: 'Ditolak' },
];

const STATUS: Record<PermissionRequest['status'], { label: string; bg: string; fg: string }> = {
  approved: { label: 'Disetujui', bg: '#DCFCE7', fg: '#16A34A' },
  pending: { label: 'Menunggu', bg: '#E0E7FF', fg: '#3B4F8C' },
  rejected: { label: 'Ditolak', bg: '#FEE2E2', fg: '#DC2626' },
};

function PermissionCard({ item }: { item: PermissionRequest }) {
  const [open, setOpen] = useState(false);
  const status = STATUS[item.status];
  const aiCategory = item.ai?.status === 'success' ? item.ai.category : undefined;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.session.courseName}, ${status.label}. ${open ? 'Tutup' : 'Buka'} detail`}
      accessibilityState={{ expanded: open }}
      onPress={() => setOpen((v) => !v)}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
    >
      <View style={styles.cardRow}>
        <View style={styles.cardIcon}>
          <Ionicons name="calendar" size={24} color={authColors.navy} />
        </View>

        <View style={styles.cardInfo}>
          <View style={styles.cardTop}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {item.session.courseName}
            </Text>
            <View style={[styles.badge, { backgroundColor: status.bg }]}>
              <Text style={[styles.badgeText, { color: status.fg }]}>{status.label}</Text>
            </View>
          </View>
          <Text style={styles.cardMeta} numberOfLines={1}>
            {item.session.className} · {item.session.dateLabel}
          </Text>
          <Text style={styles.cardReason} numberOfLines={open ? undefined : 1}>
            {item.reason}
          </Text>
        </View>

        <Ionicons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={authColors.navy}
          style={styles.chevron}
        />
      </View>

      {open ? (
        <View style={styles.detail}>
          <DetailRow icon="time-outline" text={`${item.session.dateLabel} · ${item.session.timeRange}`} />
          <DetailRow icon="location-outline" text={item.session.room} />
          {aiCategory ? <DetailRow icon="sparkles-outline" text={`Klasifikasi AI: ${aiCategory}`} /> : null}
          {item.decisionNote ? (
            <View style={styles.note}>
              <Text style={styles.noteLabel}>Catatan asisten</Text>
              <Text style={styles.noteText}>{item.decisionNote}</Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </Pressable>
  );
}

function DetailRow({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.detailRow}>
      <Ionicons name={icon} size={16} color={authColors.placeholder} />
      <Text style={styles.detailText}>{text}</Text>
    </View>
  );
}

export default function PermissionHistoryScreen() {
  const insets = useSafeAreaInsets();
  const { profile, loading: authLoading } = useAuth();
  const { permissions, permissionState, retry } = useAttendance();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...permissions]
      .filter((p) => filter === 'all' || p.status === filter)
      .filter((p) => {
        if (!q) return true;
        return (
          p.session.courseName.toLowerCase().includes(q) ||
          p.session.className.toLowerCase().includes(q) ||
          p.reason.toLowerCase().includes(q)
        );
      })
      // Pengajuan terbaru di atas
      .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
  }, [permissions, search, filter]);

  if (authLoading) return <StateView kind="loading" />;
  if (!profile) return <Redirect href="/login" />;
  if (profile.role !== 'praktikan') return <Redirect href="/home" />;

  const dataLoading = permissionState.loading;
  const dataError = permissionState.error;
  const showList = !dataLoading && !dataError;
  const filtering = filter !== 'all' || search.trim().length > 0;

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
          <View style={styles.headerCircle} />
          <View style={[styles.inner, styles.headerRow]}>
            <BackButton />
            <Text accessibilityRole="header" style={styles.title}>
              Izin
            </Text>
          </View>
        </View>

        {/* Pencarian (menimpa tepi bawah header) */}
        <View style={[styles.inner, styles.searchWrap]}>
          <View style={styles.search}>
            <Ionicons name="search" size={20} color="#94A3B8" />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Cari nama praktikum…"
              placeholderTextColor="#94A3B8"
              accessibilityLabel="Cari nama praktikum"
              selectionColor={authColors.navy}
              underlineColorAndroid="transparent"
              style={styles.searchInput}
            />
            {search ? (
              <Pressable accessibilityRole="button" accessibilityLabel="Hapus pencarian" hitSlop={8} onPress={() => setSearch('')}>
                <Ionicons name="close-circle" size={18} color="#94A3B8" />
              </Pressable>
            ) : null}
          </View>
        </View>

        {/* Filter status */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.chips}
        >
          {FILTERS.map((f) => {
            const active = f.key === filter;
            return (
              <Pressable
                key={f.key}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => setFilter(f.key)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{f.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={[styles.inner, styles.body]}>
          {/* Tombol ajukan izin */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Ajukan izin"
            onPress={() => router.push('/izin')}
            style={({ pressed }) => [styles.primary, pressed && { opacity: 0.85 }]}
          >
            <Ionicons name="add-circle-outline" size={20} color={authColors.white} />
            <Text style={styles.primaryText}>Ajukan Izin</Text>
          </Pressable>

          <HistoryDataState
            loading={dataLoading}
            error={dataError}
            fromCache={permissionState.fromCache}
            retry={retry}
          />

          {showList && list.length === 0 ? (
            filtering ? (
              <StateView
                kind="empty"
                title="Tidak ada hasil"
                message="Coba ganti kata kunci atau filter status."
                actionLabel="Reset filter"
                onAction={() => {
                  setSearch('');
                  setFilter('all');
                }}
              />
            ) : (
              <StateView
                kind="empty"
                title="Belum ada pengajuan izin"
                message="Pengajuan izin yang kamu kirim akan muncul di sini."
                actionLabel="Ajukan Izin"
                onAction={() => router.push('/izin')}
              />
            )
          ) : null}

          {showList ? list.map((item) => <PermissionCard key={item.id} item={item} />) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: authColors.background },
  inner: { width: '100%', maxWidth: 560, alignSelf: 'center' },

  // Header
  header: {
    backgroundColor: authColors.navy,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    paddingHorizontal: 24,
    paddingBottom: 56,
    overflow: 'hidden',
  },
  headerCircle: {
    position: 'absolute',
    top: -70,
    right: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(96,165,250,0.18)',
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  title: { color: authColors.white, fontSize: 30, lineHeight: 38, fontWeight: '800' },

  // Pencarian
  searchWrap: { paddingHorizontal: 20, marginTop: -28 },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    height: 54,
    paddingHorizontal: 16,
    borderRadius: 18,
    backgroundColor: authColors.white,
    shadowColor: '#1B2A4E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 5,
  },
  searchInput: { flex: 1, fontSize: 15, color: authColors.ink, padding: 0 },

  // Filter
  chips: { paddingHorizontal: 20, paddingVertical: 16, gap: 10 },
  chip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#E8EDF5',
  },
  chipActive: { backgroundColor: authColors.navy },
  chipText: { fontSize: 14, fontWeight: '600', color: '#3B4F8C' },
  chipTextActive: { color: authColors.white },

  body: { paddingHorizontal: 20, gap: 14 },

  // Tombol
  primary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: authColors.navy,
  },
  primaryText: { color: authColors.white, fontSize: 15, fontWeight: '800' },

  // Kartu
  card: {
    padding: 16,
    borderRadius: 20,
    backgroundColor: authColors.white,
    shadowColor: '#1B2A4E',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  cardRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  cardIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#DBE7FB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: { flex: 1, minWidth: 0, gap: 4 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  cardTitle: { flex: 1, color: authColors.ink, fontSize: 16, lineHeight: 22, fontWeight: '800' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  cardMeta: { color: '#64748B', fontSize: 12, lineHeight: 18 },
  cardReason: { color: authColors.ink, fontSize: 13, lineHeight: 19, marginTop: 2 },
  chevron: { marginTop: 28 },

  // Detail (muncul saat kartu dibuka)
  detail: {
    gap: 8,
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailText: { flex: 1, color: '#64748B', fontSize: 12, lineHeight: 18 },
  note: { padding: 12, borderRadius: 12, backgroundColor: '#F4F7FB', gap: 2 },
  noteLabel: { color: authColors.navy, fontSize: 12, fontWeight: '800' },
  noteText: { color: authColors.ink, fontSize: 13, lineHeight: 19 },
});