import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { authColors } from '@/components/auth-ui';
import { StateView } from '@/components/state-view';
import { BottomTabInset } from '@/constants/theme';
import { useApp } from '@/context/app-context';
import { useAttendance } from '@/context/attendance-context';
import { practiceSessions } from '@/data/dummy-attendance';
import type { SessionStatus } from '@/types/attendance';
import { greeting, initials, todayLabel } from '@/utils/home-format';

const STATUS: Record<SessionStatus, { label: string; dot: string; bg: string; fg: string }> = {
  open: { label: 'Dibuka', dot: '#22C55E', bg: '#E6F6EC', fg: '#15803D' },
  upcoming: { label: 'Belum Dibuka', dot: '#94A3B8', bg: '#EEF1F6', fg: '#64748B' },
  closed: { label: 'Ditutup', dot: '#EF4444', bg: '#FEE2E2', fg: '#B91C1C' },
};

export default function PraktikanHomeScreen() {
  const insets = useSafeAreaInsets();
  const { currentUser } = useApp();
  const { hasAttended } = useAttendance();
  const [query, setQuery] = useState('');

  const name = currentUser?.name ?? '';
  const firstName = name.split(/\s+/)[0] || 'Praktikan';

  const q = query.trim().toLowerCase();
  const sessions = practiceSessions.filter(
    (s) =>
      !q ||
      s.courseName.toLowerCase().includes(q) ||
      s.className.toLowerCase().includes(q) ||
      s.room.toLowerCase().includes(q),
  );

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + BottomTabInset + 40 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
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
            <View style={styles.search}>
              <Ionicons name="search-outline" size={18} color={authColors.muted} />
              <TextInput
                style={styles.searchInput}
                placeholder="Cari mata praktikum"
                placeholderTextColor={authColors.placeholder}
                value={query}
                onChangeText={setQuery}
              />
              {query ? (
                <Pressable onPress={() => setQuery('')} hitSlop={8}>
                  <Ionicons name="close-circle" size={18} color={authColors.placeholder} />
                </Pressable>
              ) : null}
            </View>

            <Text style={styles.sectionTitle}>Jadwal Praktikum</Text>

            <View style={styles.dateBanner}>
              <View style={styles.dateIcon}>
                <Ionicons name="calendar-outline" size={22} color={authColors.white} />
              </View>
              <View>
                <Text style={styles.dateTitle}>{todayLabel()}</Text>
                <Text style={styles.dateSub}>{practiceSessions.length} sesi terjadwal</Text>
              </View>
            </View>

            {practiceSessions.length === 0 ? (
              <StateView
                kind="empty"
                title="Belum ada jadwal praktikum"
                message="Jadwal praktikum yang tersedia akan muncul di sini."
              />
            ) : sessions.length === 0 ? (
              <StateView
                kind="empty"
                title="Tidak ditemukan"
                message={`Tidak ada praktikum yang cocok dengan "${query}".`}
              />
            ) : (
              sessions.map((s) => {
                const st = STATUS[s.status];
                const attended = hasAttended(s.id);
                return (
                  <Pressable
                    key={s.id}
                    style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
                    onPress={() =>
                      router.push({ pathname: '/detail-sesi', params: { id: s.id } })
                    }
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
                          {s.className} · {s.room}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={22} color={authColors.ink} />
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.footer}>
                      <View style={styles.timeRow}>
                        <Ionicons name="time-outline" size={14} color={authColors.muted} />
                        <Text style={styles.timeText}>
                          {s.dateLabel} · {s.timeRange}
                        </Text>
                      </View>
                      {attended ? (
                        <View style={styles.attended}>
                          <Ionicons name="checkmark" size={12} color="#15803D" />
                          <Text style={styles.attendedText}>Sudah hadir</Text>
                        </View>
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
    paddingBottom: 70,
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

  body: { paddingHorizontal: 20, marginTop: -30 },

  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: authColors.white,
    borderRadius: 16,
    paddingHorizontal: 16,
    minHeight: 50,
    shadowColor: '#1B2A4E',
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  searchInput: { flex: 1, color: authColors.ink, fontSize: 14, paddingVertical: 12 },

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
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: authColors.border,
    marginVertical: 14,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  timeText: { color: authColors.muted, fontSize: 12 },
  attended: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#E6F6EC',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  attendedText: { color: '#15803D', fontSize: 11, fontWeight: '700' },
});