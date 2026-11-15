import { Ionicons } from '@expo/vector-icons';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { StateView } from '@/components/state-view';
import { SessionParticipationActions } from '@/components/session-participation-actions';
import { useAttendance } from '@/context/attendance-context';
import { useAuth } from '@/context/auth-context';
import { initials } from '@/utils/home-format';

export default function DetailSesiScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id?: string | string[]; action?: string | string[] }>();
  const sessionId = Array.isArray(params.id) ? params.id[0] : params.id;
  const action = Array.isArray(params.action) ? params.action[0] : params.action;
  const { profile, loading: authLoading } = useAuth();
  const { sessions, sessionState, retry } = useAttendance();
  const session = sessions.find((item) => item.id === sessionId);
  const goBack = () => { if (router.canGoBack()) router.back(); else router.replace('/home'); };

  if (authLoading) return <View style={styles.screen}><StateView kind="loading" /></View>;
  if (!profile) return <Redirect href="/login" />;
  if (profile.role === 'asisten') {
    // Legacy assistant Home cards carry class IDs, not session IDs. Let the
    // assistant select an actual session from the existing management screen.
    return <Redirect href="/jadwal" />;
  }
  if (!sessionId || sessionState.error || sessionState.loading || !session) {
    const kind = sessionId && sessionState.loading ? 'loading' : sessionState.error ? 'error' : 'empty';
    return <View style={[styles.screen, { paddingTop: insets.top + 32, paddingHorizontal: 20 }]}>
      <StateView kind={kind}
        title={kind === 'loading' ? 'Memuat sesi…' : kind === 'error' ? 'Sesi belum dapat dimuat' : 'Sesi tidak ditemukan'}
        message={sessionState.error ?? (kind === 'loading' ? 'Menunggu informasi sesi.' : 'Sesi mungkin sudah dihapus atau akunmu belum terdaftar sebagai peserta.')}
        actionLabel={sessionState.error ? 'Coba lagi' : 'Kembali ke Home'}
        onAction={sessionState.error ? retry : () => router.replace('/home')} />
    </View>;
  }

  const status = session.status === 'open'
    ? { label: 'Sesi sedang dibuka', color: '#15803D', background: '#E6F6EC' }
    : session.status === 'upcoming'
      ? { label: 'Sesi belum dibuka', color: '#52627A', background: '#EEF1F6' }
      : { label: 'Sesi telah ditutup', color: '#B91C1C', background: '#FEE2E2' };

  return <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
      <View style={styles.headerRow}>
        <Pressable accessibilityRole="button" accessibilityLabel="Kembali" style={styles.backButton} onPress={goBack} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>{session.courseName}</Text>
          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={14} color="#B6C2DB" />
            <Text style={[styles.metaText, { flexShrink: 1 }]}>{session.className} · {session.room}</Text>
          </View>
        </View>
      </View>
    </View>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false}>
      <View style={styles.inner}>
        <View style={styles.statusChipWrap}>
          <View style={[styles.statusChip, { backgroundColor: status.background }]}>
            <View style={[styles.statusDot, { backgroundColor: status.color }]} />
            <Text accessibilityLiveRegion="polite" style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
          </View>
        </View>
        <View style={styles.card}>
          <View style={styles.cardIconWrap}><Ionicons name="calendar-outline" size={26} color="#1B2A4E" /></View>
          <Text style={styles.dateLabel}>{session.dateLabel}</Text>
          <Text accessibilityRole="header" style={styles.sessionTitle}>{session.courseName}</Text>
          <View style={styles.timeline}>
            <View style={{ flex: 1 }}>
              <Text style={styles.timeLabel}>Waktu praktikum</Text>
              <Text style={styles.timeValue}>{session.timeRange}</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <Text style={styles.assistLabel}>Asisten praktikum</Text>
          <View style={styles.assistList}>
            <View style={styles.assistRow}>
              <View style={[styles.avatar, { backgroundColor: '#E0E7FF' }]}>
                <Text style={[styles.avatarText, { color: '#4338CA' }]}>{initials(session.assistantName || 'Asisten')}</Text>
              </View>
              <Text style={styles.assistName}>{session.assistantName || 'Belum ditentukan'}</Text>
            </View>
          </View>
          <SessionParticipationActions key={`${session.id}-${action ?? ''}`} session={session} initialPermission={action === 'permission'} />
        </View>
      </View>
    </ScrollView>
  </KeyboardAvoidingView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5F7FA' },
  inner: { width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: 20, paddingTop: 16 },
  header: { backgroundColor: '#1B2A4E', paddingBottom: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, gap: 12, maxWidth: 560, alignSelf: 'center', width: '100%' },
  backButton: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '800', marginBottom: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { color: '#B6C2DB', fontSize: 13, fontWeight: '500' },
  statusChipWrap: { alignItems: 'flex-start', marginBottom: 16 },
  statusChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 99, gap: 6 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 12, fontWeight: '700' },
  card: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 24, alignItems: 'center', shadowColor: '#1B2A4E', shadowOpacity: 0.05, shadowRadius: 15, shadowOffset: { width: 0, height: 5 }, elevation: 3, width: '100%' },
  cardIconWrap: { width: 54, height: 54, borderRadius: 16, backgroundColor: '#EEF1F6', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  dateLabel: { color: '#64748B', fontSize: 13, fontWeight: '500', marginBottom: 4 },
  sessionTitle: { color: '#1B2A4E', fontSize: 22, fontWeight: '800', marginBottom: 24, textAlign: 'center' },
  timeline: { flexDirection: 'row', alignItems: 'center', width: '100%', paddingHorizontal: 10 },
  timeLabel: { color: '#64748B', fontSize: 12, marginBottom: 4 },
  timeValue: { color: '#1B2A4E', fontSize: 20, fontWeight: '800' },
  divider: { width: '100%', height: 1, backgroundColor: '#F1F5F9', marginVertical: 20 },
  assistLabel: { alignSelf: 'flex-start', color: '#64748B', fontSize: 12, fontWeight: '600', marginBottom: 12 },
  assistList: { width: '100%', gap: 12, marginBottom: 24 },
  assistRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 14, fontWeight: '800' },
  assistName: { color: '#1B2A4E', fontSize: 15, fontWeight: '700' },
});
