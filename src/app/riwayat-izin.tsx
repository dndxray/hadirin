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

const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'Semua' },
  { key: 'approved', label: 'Disetujui' },
  { key: 'pending', label: 'Menunggu' },
  { key: 'rejected', label: 'Ditolak' },
];

const STATUS: Record<PermissionRequest['status'], { label: string; bg: string; fg: string }> = {
  approved: { label: 'Disetujui', bg: '#E6F6EC', fg: '#15803D' },
  pending: { label: 'Menunggu', bg: '#DBEAFE', fg: '#1D4ED8' },
  rejected: { label: 'Ditolak', bg: '#FEE2E2', fg: '#B91C1C' },
};

// Bulan pengajuan: dari label tanggal sesi, atau dari waktu pengajuan.
function monthIndex(item: PermissionRequest): number | null {
  const label = item.session?.dateLabel ?? '';
  const found = MONTHS.findIndex((m) => label.includes(m));
  if (found >= 0) return found;
  return typeof item.createdAt === 'number' ? new Date(item.createdAt).getMonth() : null;
}

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
          <Ionicons name="calendar-outline" size={24} color={authColors.navy} />
        </View>

        <View style={styles.cardInfo}>
          <View style={styles.cardTop}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {item.session.courseName}
            </Text>
            <View style={[styles.chip, { backgroundColor: status.bg }]}>
              <Text style={[styles.chipText, { color: status.fg }]}>{status.label}</Text>
            </View>
          </View>
          <View style={styles.courseRow}>
            <Ionicons name="school-outline" size={14} color={authColors.muted} />
            <Text style={styles.course} numberOfLines={1}>
              {item.session.className} · {item.session.dateLabel}
            </Text>
          </View>
          <Text style={styles.reasonPreview} numberOfLines={open ? undefined : 1}>
            {item.reason}
          </Text>
        </View>

        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={20} color={authColors.ink} />
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
  const [month, setMonth] = useState<number | null>(null);
  const [monthOpen, setMonthOpen] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  // Posisi tepi bawah baris pencarian, untuk menaruh panel filter melayang
  // tepat di bawahnya.
  const [searchBottom, setSearchBottom] = useState(0);

  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...permissions]
      .filter((p) => filter === 'all' || p.status === filter)
      .filter((p) => month === null || monthIndex(p) === month)
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
  }, [permissions, search, filter, month]);

  if (authLoading) return <StateView kind="loading" />;
  if (!profile) return <Redirect href="/login" />;
  if (profile.role !== 'praktikan') return <Redirect href="/home" />;

  const dataLoading = permissionState.loading;
  const dataError = permissionState.error;
  const showList = !dataLoading && !dataError;
  const filterActive = month !== null;
  const filtering = filter !== 'all' || month !== null || search.trim().length > 0;

  const closeFilter = () => {
    setShowFilter(false);
    setMonthOpen(false);
  };

  const resetAll = () => {
    setSearch('');
    setFilter('all');
    setMonth(null);
    setMonthOpen(false);
  };

  return (
    <View style={styles.screen}>
      {/* Header (sama dengan Izin asisten) */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerCircleA} />
        <View style={styles.headerCircleB} />
        <View style={[styles.inner, styles.headerRow]}>
          <BackButton />
          <View style={styles.headerText}>
            <Text accessibilityRole="header" style={styles.headerTitleBig}>
              Izin
            </Text>
          </View>
        </View>
      </View>

      {/* Pencarian + tombol filter (menimpa tepi bawah header) */}
      <View
        style={styles.searchWrap}
        onLayout={(e) => setSearchBottom(e.nativeEvent.layout.y + e.nativeEvent.layout.height)}
      >
        <View style={styles.searchRow}>
          <View style={styles.search}>
            <Ionicons name="search-outline" size={18} color={authColors.muted} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Cari nama praktikum..."
              placeholderTextColor={authColors.placeholder}
              accessibilityLabel="Cari nama praktikum"
              selectionColor={authColors.navy}
              underlineColorAndroid="transparent"
              style={styles.searchInput}
            />
            {search ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Hapus pencarian"
                hitSlop={8}
                onPress={() => setSearch('')}
              >
                <Ionicons name="close-circle" size={18} color={authColors.placeholder} />
              </Pressable>
            ) : null}
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Filter"
            accessibilityState={{ expanded: showFilter }}
            onPress={() => (showFilter ? closeFilter() : setShowFilter(true))}
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
      </View>

      {/* Filter status (pill) */}
      <View style={styles.tabsWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.tabsRow}
        >
          {FILTERS.map((f) => {
            const active = f.key === filter;
            return (
              <Pressable
                key={f.key}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => setFilter(f.key)}
                style={[styles.pill, active && styles.pillOn]}
              >
                <Text style={[styles.pillText, active && styles.pillTextOn]}>{f.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
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
                message="Coba ganti kata kunci atau filter."
                actionLabel="Reset filter"
                onAction={resetAll}
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

      {/* Panel filter melayang di atas isi, tidak menggeser daftar. Ditaruh di
          level layar supaya tetap bisa disentuh di Android. */}
      {showFilter ? (
        <>
          {/* Area di bawah baris pencarian: mengetuknya menutup panel */}
          <Pressable
            accessibilityLabel="Tutup filter"
            onPress={closeFilter}
            style={[styles.filterBackdrop, { top: searchBottom }]}
          />
          <View style={[styles.filterOverlay, { top: searchBottom + 10 }]} pointerEvents="box-none">
            <View style={styles.filterPanel}>
              <Text style={styles.filterLabel}>Status</Text>
              <View style={styles.filterWrap}>
                {FILTERS.map((f) => (
                  <Pressable
                    key={f.key}
                    onPress={() => setFilter(f.key)}
                    style={[styles.pill, filter === f.key && styles.pillOn]}
                  >
                    <Text style={[styles.pillText, filter === f.key && styles.pillTextOn]}>{f.label}</Text>
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
                <Text style={styles.dropdownText}>{month === null ? 'Semua bulan' : MONTHS[month]}</Text>
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

              {filter !== 'all' || month !== null ? (
                <Pressable
                  onPress={() => {
                    setFilter('all');
                    setMonth(null);
                    setMonthOpen(false);
                  }}
                  hitSlop={8}
                >
                  <Text style={styles.reset}>Reset filter</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: authColors.background },
  inner: { width: '100%', maxWidth: 560, alignSelf: 'center' },

  // Header (sama dengan Izin asisten)
  header: {
    backgroundColor: '#1B2A4E',
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    paddingHorizontal: 24,
    paddingBottom: 56,
    overflow: 'hidden',
  },
  headerCircleA: {
    position: 'absolute',
    top: -60,
    right: -40,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(96,165,250,0.18)',
  },
  headerCircleB: {
    position: 'absolute',
    bottom: -70,
    left: -50,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  headerText: { flex: 1 },
  headerTitleBig: { color: '#FFFFFF', fontSize: 26, fontWeight: '800' },

  // Pencarian + tombol filter
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

  // Panel filter melayang: tidak menggeser isi di bawahnya
  filterBackdrop: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 15,
  },
  filterOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 20,
    elevation: 20,
  },
  filterPanel: {
    width: '100%',
    maxWidth: 560,
    marginHorizontal: 20,
    backgroundColor: authColors.white,
    borderRadius: 18,
    padding: 16,
    shadowColor: '#1B2A4E',
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 20,
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

  // Pill status
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

  // Kartu (sama dengan kartu Izin asisten)
  card: {
    backgroundColor: authColors.white,
    borderRadius: 20,
    padding: 16,
    shadowColor: '#1B2A4E',
    shadowOpacity: 0.07,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  cardIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#E3E9F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: { flex: 1, minWidth: 0 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  cardTitle: { flex: 1, fontSize: 16, fontWeight: '800', color: authColors.ink },
  chip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  chipText: { fontSize: 11, fontWeight: '800' },
  courseRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  course: { flex: 1, fontSize: 12, color: authColors.muted },
  reasonPreview: { fontSize: 12, color: authColors.ink, marginTop: 4 },

  // Detail (muncul saat kartu dibuka)
  detail: {
    gap: 8,
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: authColors.border,
  },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailText: { flex: 1, color: authColors.muted, fontSize: 12, lineHeight: 18 },
  note: { padding: 12, borderRadius: 12, backgroundColor: '#E8EDF9', gap: 2 },
  noteLabel: { color: authColors.navy, fontSize: 12, fontWeight: '800' },
  noteText: { color: authColors.ink, fontSize: 13, lineHeight: 19 },
});