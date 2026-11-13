import { Redirect } from 'expo-router';
import type { PropsWithChildren } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAttendanceTheme } from '@/constants/attendance-theme';
import { useAuth } from '@/context/auth-context';

export function PractitionerScreen({ title, children }: PropsWithChildren<{ title: string }>) {
  const colors = useAttendanceTheme();
  const insets = useSafeAreaInsets();
  const { profile, loading } = useAuth();
  if (!loading && !profile) return <Redirect href="/login" />;
  if (!loading && profile?.role !== 'praktikan') return <Redirect href="/jadwal" />;
  return <ScrollView keyboardShouldPersistTaps="handled" style={{ flex: 1, backgroundColor: colors.background }}
    contentContainerStyle={{ paddingTop: Platform.OS === 'web' ? 100 : insets.top + 24, paddingBottom: insets.bottom + 110, paddingHorizontal: 20, alignItems: 'center' }}>
    <View style={ui.content}>
      <Text accessibilityRole="header" style={[ui.title, { color: colors.ink }]}>{title}</Text>
      {loading ? <ActivityIndicator color={colors.primary} accessibilityLabel="Memuat akun" /> : children}
    </View>
  </ScrollView>;
}

export function Action({ label, onPress, disabled = false }: { label: string; onPress: () => void; disabled?: boolean }) {
  const colors = useAttendanceTheme();
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
    style={({ pressed }) => [ui.button, { backgroundColor: disabled ? colors.surfaceMuted : colors.primary, opacity: pressed ? 0.75 : 1 }]}>
    <Text style={[ui.buttonLabel, { color: disabled ? colors.inkMuted : colors.background }]}>{label}</Text>
  </Pressable>;
}

export function DataState({ loading, error, fromCache, retry }: {
  loading: boolean; error: string | null; fromCache: boolean; retry: () => void;
}) {
  const colors = useAttendanceTheme();
  return <View style={ui.state}>
    {loading ? <ActivityIndicator color={colors.primary} accessibilityLabel="Memuat data" /> : null}
    {loading ? <Text style={{ color: colors.inkMuted }}>Memuat data…</Text> : null}
    {error ? <><Text accessibilityRole="alert" style={{ color: colors.danger }}>{error}</Text><Action label="Coba lagi" onPress={retry} /></> : null}
    {fromCache && !loading && !error ? <Text accessibilityLiveRegion="polite" style={{ color: colors.warning }}>
      Menampilkan cache. Koneksi server belum terkonfirmasi; tindakan memerlukan internet.
    </Text> : null}
  </View>;
}

export const ui = StyleSheet.create({
  content: { width: '100%', maxWidth: 720, gap: 16 },
  title: { fontSize: 30, lineHeight: 38, fontWeight: '800' },
  heading: { fontSize: 20, lineHeight: 27, fontWeight: '700' },
  body: { fontSize: 15, lineHeight: 23 },
  panel: { padding: 20, borderWidth: 1, borderRadius: 16, gap: 12 },
  button: { minHeight: 48, padding: 14, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  buttonLabel: { fontSize: 15, fontWeight: '700', textAlign: 'center' },
  state: { gap: 12 },
  input: { borderWidth: 1, borderRadius: 12, padding: 14, minHeight: 130, fontSize: 16, lineHeight: 24, textAlignVertical: 'top' },
});
