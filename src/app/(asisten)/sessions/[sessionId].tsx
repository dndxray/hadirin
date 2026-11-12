import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { authColors } from '@/components/auth-ui';
import { StateView } from '@/components/state-view';
import { useAsisten } from '../../../../features/asisten/AsistenContext';
import { ConfirmModal } from '../../../../features/asisten/components/ConfirmModal';
import { dummyRoster } from '../../../../features/asisten/dummyData';
import { formatDate, formatTime } from '../../../../features/asisten/utils/format';

type Filter = 'semua' | 'hadir' | 'belum' | 'izin';
type Row = {
  nim: string;
  name: string;
  state: 'hadir' | 'terlambat' | 'belum';
  time?: string;
};

const STATUS = {
  OPEN: { label: 'Sesi sedang dibuka', bg: '#E6F6EC', fg: '#15803D' },
  CLOSED: { label: 'Sesi belum dibuka', bg: '#F1F4F9', fg: '#64748B' },
  ENDED: { label: 'Sesi telah ditutup', bg: '#FEE2E2', fg: '#B91C1C' },
} as const;

const AVATARS = [
  { bg: '#FDE7D6', fg: '#C2410C' },
  { bg: '#DCE6FB', fg: '#1D4ED8' },
  { bg: '#DDF3E4', fg: '#15803D' },
  { bg: '#EBDDF7', fg: '#7E22CE' },
];

function initials(text: string) {
  return (
    text
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase() || '?'
  );
}

function shortTime(iso: string) {
  return formatTime(iso).slice(0, 5).replace(':', '.');
}

export default function SessionDetailScreen() {
  const params = useLocalSearchParams<{ sessionId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { getSession, getAttendances, openSession, closeSession } = useAsisten();

  const [filter, setFilter] = useState<Filter>('semua');
  const [expanded, setExpanded] = useState(false);
  const [confirm, setConfirm] = useState<'open' | 'close' | null>(null);

  const session = getSession(params.sessionId);

  if (!session) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + 40, paddingHorizontal: 20 }]}>
        <View style={styles.inner}>
          <StateView
            kind="error"
            title="Sesi tidak ditemukan"
            message="Sesi yang kamu cari tidak tersedia."
            actionLabel="Kembali"
            onAction={() => router.replace('/jadwal')}
          />
        </View>
      </View>
    );
  }

  const attendances = getAttendances(session.id);
  const attendedByNim = new Map(attendances.map((a) => [a.practitionerNim, a]));

  const toRow = (nim: string, name: string): Row => {
    const a = attendedByNim.get(nim);
    if (!a) return { nim, name, state: 'belum' };
    return {
      nim,
      name,
      state: a.status === 'LATE' ? 'terlambat' : 'hadir',
      time: shortTime(a.checkedInAt),
    };
  };

  const rows: Row[] = [
    ...dummyRoster.map((p) => toRow(p.nim, p.name)),
    ...attendances
      .filter((a) => !dummyRoster.some((p) => p.nim === a.practitionerNim))
      .map((a) => toRow(a.practitionerNim, a.practitionerName)),
  ];

  const total = rows.length;
  const hadirCount = rows.filter((r) => r.state !== 'belum').length;
  const belumCount = total - hadirCount;
  const progress = total > 0 ? hadirCount / total : 0;

  const visible = rows.filter((r) => {
    if (filter === 'hadir') return r.state !== 'belum';
    if (filter === 'belum') return r.state === 'belum';
    if (filter === 'izin') return false;
    return true;
  });
  const shown = expanded ? visible : visible.slice(0, 4);

  const chips: { key: Filter; label: string }[] = [
    { key: 'semua', label: `Semua (${total})` },
    { key: 'hadir', label: `Hadir (${hadirCount})` },
    { key: 'belum', label: `Belum Hadir (${belumCount})` },
    { key: 'izin', label: 'Izin/Sakit (0)' },
  ];

  const status = STATUS[session.status];
  const timeRange = `${session.startTime.replace(':', '.')} - ${session.endTime.replace(':', '.')} WIB`;

  const handleConfirm = () => {
    if (confirm === 'open') openSession(session.id);
    if (confirm === 'close') closeSession(session.id);
    setConfirm(null);
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header navy */}
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <View style={styles.inner}>
            <Pressable style={styles.backButton} onPress={() => router.replace('/jadwal')} hitSlop={8}>
              <Ionicons name="chevron-back" size={20} color={authColors.white} />
            </Pressable>

            <Text style={styles.title}>{session.courseName}</Text>
            <View style={styles.metaRow}>
              <Ionicons name="business-outline" size={13} color="#B6C2DB" />
              <Text style={styles.metaText}>Kelas {session.kelas}</Text>
              <Text style={styles.metaDot}>•</Text>
              <Ionicons name="desktop-outline" size={13} color="#B6C2DB" />
              <Text style={styles.metaText}>{session.room}</Text>
            </View>
          </View>
        </View>

        <View style={styles.body}>
          <View style={styles.inner}>
            {/* Kartu status sesi */}
            <View style={styles.statusCard}>
              <View style={styles.statusTop}>
                <View style={{ flex: 1, gap: 8, alignItems: 'flex-start' }}>
                  <View style={[styles.statusChip, { backgroundColor: status.bg }]}>
                    <Text style={[styles.statusChipText, { color: status.fg }]}>
                      {status.label}
                    </Text>
                  </View>
                  <View style={styles.timeRow}>
                    <Ionicons name="time-outline" size={14} color={authColors.muted} />
                    <Text style={styles.timeText}>
                      {formatDate(session.date)} · {timeRange}
                    </Text>
                  </View>
                </View>

                <View style={styles.peopleBox}>
                  <Ionicons name="people-outline" size={22} color={authColors.navy} />
                  {session.status === 'OPEN' ? <View style={styles.liveDot} /> : null}
                </View>
              </View>

              {session.status === 'CLOSED' ? (
                <Pressable
                  style={[styles.actionButton, { backgroundColor: '#2FBF5B' }]}
                  onPress={() => setConfirm('open')}
                >
                  <Text style={styles.actionText}>Buka Sesi</Text>
                </Pressable>
              ) : null}

              {session.status === 'OPEN' ? (
                <Pressable
                  style={[styles.actionButton, { backgroundColor: '#EF4455' }]}
                  onPress={() => setConfirm('close')}
                >
                  <Text style={styles.actionText}>Tutup Sesi</Text>
                </Pressable>
              ) : null}

              {session.status === 'ENDED' ? (
                <View style={styles.endedBox}>
                  <Text style={styles.endedText}>Sesi ini sudah ditutup</Text>
                </View>
              ) : null}
            </View>

            {/* Rekap kehadiran */}
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>Praktikan Hadir</Text>
              <View style={styles.countPill}>
                <Text style={styles.countStrong}>{hadirCount}</Text>
                <Text style={styles.countLight}> / {total}</Text>
              </View>
            </View>

            <View style={styles.track}>
              <View style={[styles.fill, { width: `${Math.round(progress * 100)}%` }]} />
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chips}
            >
              {chips.map((c) => {
                const active = filter === c.key;
                return (
                  <Pressable
                    key={c.key}
                    onPress={() => {
                      setFilter(c.key);
                      setExpanded(false);
                    }}
                    style={[styles.chip, active && styles.chipActive]}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>
                      {c.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Daftar praktikan */}
            <View style={styles.listCard}>
              {shown.length === 0 ? (
                <Text style={styles.emptyText}>
                  {total === 0
                    ? 'Belum ada peserta di kelas ini.'
                    : 'Tidak ada praktikan pada kategori ini.'}
                </Text>
              ) : (
                shown.map((r, i) => {
                  const color = AVATARS[i % AVATARS.length];
                  return (
                    <View
                      key={r.nim}
                      style={[styles.row, i < shown.length - 1 && styles.rowDivider]}
                    >
                      <View style={[styles.avatar, { backgroundColor: color.bg }]}>
                        <Text style={[styles.avatarText, { color: color.fg }]}>
                          {initials(r.name)}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.rowName}>{r.name}</Text>
                        <Text style={styles.rowNim}>{r.nim}</Text>
                      </View>

                      {r.state === 'hadir' ? (
                        <View style={[styles.badge, { backgroundColor: '#E6F6EC' }]}>
                          <Ionicons name="checkmark" size={12} color="#15803D" />
                          <Text style={[styles.badgeText, { color: '#15803D' }]}>{r.time}</Text>
                        </View>
                      ) : r.state === 'terlambat' ? (
                        <View style={[styles.badge, { backgroundColor: '#FEF3C7' }]}>
                          <Text style={[styles.badgeText, { color: '#B45309' }]}>
                            Terlambat {r.time}
                          </Text>
                        </View>
                      ) : (
                        <View style={[styles.badge, { backgroundColor: '#F1F4F9' }]}>
                          <Text style={[styles.badgeText, { color: '#64748B' }]}>Belum hadir</Text>
                        </View>
                      )}
                    </View>
                  );
                })
              )}
            </View>

            {visible.length > 4 ? (
              <Pressable style={styles.seeAll} onPress={() => setExpanded((v) => !v)}>
                <Text style={styles.seeAllText}>
                  {expanded ? 'Tampilkan lebih sedikit' : `Lihat semua praktikan (${visible.length})`}
                </Text>
                <Ionicons
                  name={expanded ? 'chevron-up' : 'chevron-forward'}
                  size={14}
                  color={authColors.ink}
                />
              </Pressable>
            ) : null}
          </View>
        </View>
      </ScrollView>

      <ConfirmModal
        visible={confirm === 'open'}
        title="Buka Sesi?"
        message="Apakah Anda yakin ingin membuka sesi praktikum"
        confirmLabel="Ya, Buka Sesi"
        confirmColor="green"
        onConfirm={handleConfirm}
        onCancel={() => setConfirm(null)}
      />
      <ConfirmModal
        visible={confirm === 'close'}
        title="Tutup Sesi"
        message="Apakah Anda yakin ingin menutup sesi praktikum"
        confirmLabel="Ya, Tutup Sesi"
        confirmColor="red"
        onConfirm={handleConfirm}
        onCancel={() => setConfirm(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: authColors.background },
  inner: { width: '100%', maxWidth: 560, alignSelf: 'center' },

  header: {
    backgroundColor: authColors.navy,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    paddingHorizontal: 20,
    paddingBottom: 72,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
  },
  title: { color: authColors.white, fontSize: 26, fontWeight: '800' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  metaText: { color: '#B6C2DB', fontSize: 12 },
  metaDot: { color: '#B6C2DB', fontSize: 12 },

  body: { paddingHorizontal: 20, marginTop: -48 },

  statusCard: {
    backgroundColor: authColors.white,
    borderRadius: 22,
    padding: 16,
    gap: 16,
    shadowColor: '#1B2A4E',
    shadowOpacity: 0.1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  statusTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  statusChip: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5 },
  statusChipText: { fontSize: 12, fontWeight: '700' },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  timeText: { color: authColors.muted, fontSize: 12 },
  peopleBox: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#EEF3FB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22C55E',
  },
  actionButton: {
    minHeight: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: { color: authColors.white, fontSize: 16, fontWeight: '800' },
  endedBox: {
    minHeight: 50,
    borderRadius: 14,
    backgroundColor: '#F1F4F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  endedText: { color: authColors.muted, fontWeight: '700' },

  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 26,
  },
  sectionTitle: { color: authColors.ink, fontSize: 17, fontWeight: '800' },
  countPill: {
    flexDirection: 'row',
    backgroundColor: authColors.white,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: authColors.border,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  countStrong: { color: authColors.ink, fontWeight: '800', fontSize: 13 },
  countLight: { color: authColors.muted, fontSize: 13 },
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E3E9F3',
    marginTop: 12,
    overflow: 'hidden',
  },
  fill: { height: 6, borderRadius: 3, backgroundColor: '#2F7BF5' },

  chips: { gap: 8, paddingVertical: 14 },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: authColors.border,
    backgroundColor: authColors.white,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipActive: { backgroundColor: authColors.navy, borderColor: authColors.navy },
  chipText: { color: authColors.ink, fontSize: 12, fontWeight: '600' },
  chipTextActive: { color: authColors.white },

  listCard: {
    backgroundColor: authColors.white,
    borderRadius: 20,
    paddingHorizontal: 14,
    shadowColor: '#1B2A4E',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  rowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: authColors.border,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontWeight: '800', fontSize: 12 },
  rowName: { color: authColors.ink, fontWeight: '700', fontSize: 13 },
  rowNim: { color: authColors.muted, fontSize: 11, marginTop: 1 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeText: { fontSize: 11, fontWeight: '700' },
  emptyText: {
    color: authColors.muted,
    textAlign: 'center',
    paddingVertical: 22,
    fontSize: 13,
  },

  seeAll: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 16,
  },
  seeAllText: { color: authColors.ink, fontSize: 12, fontWeight: '700' },
});