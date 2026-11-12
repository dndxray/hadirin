import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { authColors } from '@/components/auth-ui';
import { StateView } from '@/components/state-view';
import { useApp } from '@/context/app-context';
import { useAsisten } from '../../features/asisten/AsistenContext';
import { dummyRoster } from '../../features/asisten/dummyData';
import type { SessionStatus } from '../../features/asisten/types';
import { formatDate } from '../../features/asisten/utils/format';

const DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

const STATUS: Record<SessionStatus, { label: string; dot: string; bg: string; fg: string }> = {
  OPEN: { label: 'Dibuka', dot: '#22C55E', bg: '#E6F6EC', fg: '#15803D' },
  CLOSED: { label: 'Belum Dibuka', dot: '#94A3B8', bg: '#EEF1F6', fg: '#64748B' },
  ENDED: { label: 'Ditutup', dot: '#EF4444', bg: '#FEE2E2', fg: '#B91C1C' },
};

function greeting() {
  const h = new Date().getHours();
  if (h < 11) return 'Selamat Pagi!';
  if (h < 15) return 'Selamat Siang!';
  if (h < 18) return 'Selamat Sore!';
  return 'Selamat Malam!';
}

function todayLabel() {
  const d = new Date();
  return `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

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

export function AsistenHome() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { currentUser } = useApp();
  const { sessions, getAttendances } = useAsisten();

  const name = currentUser?.name ?? '';
  const firstName = name.split(/\s+/)[0] || 'Asisten';
  const courseCount = new Set(sessions.map((s) => s.courseName)).size;

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 130 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header navy */}
        <View style={[styles.header, { paddingTop: insets.top + 36 }]}>
          <View style={[styles.inner, styles.headerRow]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.greeting}>{greeting()}</Text>
              <Text style={styles.hello}>Hai, {firstName}</Text>
            </View>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials(name)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.body}>
          <View style={styles.inner}>
            {/* Ringkasan */}
            <View style={styles.summary}>
              <View style={styles.summaryItem}>
                <View style={styles.summaryIcon}>
                  <Ionicons name="document-text-outline" size={18} color={authColors.navy} />
                </View>
                <Text style={styles.summaryText}>{courseCount} Praktikum</Text>
              </View>
              <View style={styles.summaryItem}>
                <View style={styles.summaryIcon}>
                  <Ionicons name="people-outline" size={18} color={authColors.navy} />
                </View>
                <Text style={styles.summaryText}>{dummyRoster.length} Praktikan</Text>
              </View>
            </View>

            <Text style={styles.sectionTitle}>Jadwal Praktikum</Text>

            {/* Banner tanggal */}
            <View style={styles.dateBanner}>
              <View style={styles.dateIcon}>
                <Ionicons name="calendar-outline" size={22} color={authColors.white} />
              </View>
              <View>
                <Text style={styles.dateTitle}>{todayLabel()}</Text>
                <Text style={styles.dateSub}>{sessions.length} sesi terjadwal</Text>
              </View>
            </View>

            {/* Daftar sesi */}
            {sessions.length === 0 ? (
              <StateView
                kind="empty"
                title="Belum ada jadwal praktikum"
                message="Sesi yang kamu buat akan muncul di sini."
              />
            ) : (
              sessions.map((s) => {
                const st = STATUS[s.status];
                const present = getAttendances(s.id).length;
                return (
                  <Pressable
                    key={s.id}
                    style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
                    onPress={() => router.push(`/sessions/${s.id}` as any)}
                  >
                    <View style={[styles.chip, { backgroundColor: st.bg }]}>
                      <View style={[styles.chipDot, { backgroundColor: st.dot }]} />
                      <Text style={[styles.chipText, { color: st.fg }]}>{st.label}</Text>
                    </View>

                    <View style={styles.cardTop}>
                      <View style={styles.cardAvatar}>
                        <Text style={styles.cardAvatarText}>{initials(s.courseName)}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.cardTitle} numberOfLines={2}>
                          {s.courseName}
                        </Text>
                        <Text style={styles.cardSub}>
                          {s.kelas} · {s.room}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={22} color={authColors.ink} />
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.footer}>
                      <View style={styles.timeRow}>
                        <Ionicons name="time-outline" size={14} color={authColors.muted} />
                        <Text style={styles.timeText}>
                          {formatDate(s.date)} · {s.startTime.replace(':', '.')} -{' '}
                          {s.endTime.replace(':', '.')}
                        </Text>
                      </View>
                      {present > 0 ? (
                        <Text style={styles.presentText}>
                          <Text style={styles.presentNumber}>{present}</Text> Praktikan Hadir
                        </Text>
                      ) : null}
                    </View>
                  </Pressable>
                );
              })
            )}
          </View>
        </View>
      </ScrollView>
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
    paddingHorizontal: 24,
    paddingBottom: 80,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  greeting: { color: '#B6C2DB', fontSize: 14 },
  hello: { color: authColors.white, fontSize: 32, fontWeight: '800', marginTop: 2 },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#F6D9C9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#8B4A2B', fontWeight: '800', fontSize: 16 },

  body: { paddingHorizontal: 20, marginTop: -52 },

  summary: {
    flexDirection: 'row',
    backgroundColor: authColors.white,
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 18,
    justifyContent: 'space-around',
    shadowColor: '#1B2A4E',
    shadowOpacity: 0.1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  summaryItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  summaryIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#E8EEF9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryText: { color: authColors.ink, fontSize: 13, fontWeight: '700' },

  sectionTitle: {
    color: authColors.ink,
    fontSize: 22,
    fontWeight: '800',
    marginTop: 26,
    marginBottom: 14,
  },

  dateBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#E3E9F5',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
  },
  dateIcon: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: authColors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateTitle: { color: authColors.ink, fontSize: 16, fontWeight: '800' },
  dateSub: { color: '#6B7FBF', fontSize: 12, marginTop: 2 },

  card: {
    backgroundColor: authColors.white,
    borderRadius: 18,
    padding: 16,
    paddingTop: 20,
    marginBottom: 14,
    shadowColor: '#1B2A4E',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  chip: {
    position: 'absolute',
    top: 12,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  chipDot: { width: 6, height: 6, borderRadius: 3 },
  chipText: { fontSize: 10, fontWeight: '700' },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 8 },
  cardAvatar: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: authColors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardAvatarText: { color: authColors.white, fontWeight: '800', fontSize: 15 },
  cardTitle: { color: authColors.ink, fontSize: 16, fontWeight: '800' },
  cardSub: { color: authColors.muted, fontSize: 12, marginTop: 2 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: authColors.border, marginVertical: 14 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  timeText: { color: authColors.muted, fontSize: 12 },
  presentText: { color: authColors.muted, fontSize: 11 },
  presentNumber: { color: '#15803D', fontWeight: '800', fontSize: 12 },
});