import { Ionicons } from '@expo/vector-icons';
import { Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useState } from 'react';

import { authColors } from '@/components/auth-ui';
import { useNotifications } from '@/context/notification-context';

export function NotificationSettings() {
  const { status, lastReceived, busy, request, refresh } = useNotifications();
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const ready = status.phase === 'ready';
  return <View style={styles.section}>
    <View style={styles.row}><Ionicons name="notifications-outline" size={23} color={authColors.navy} />
      <Text accessibilityRole="header" style={styles.title}>Notifikasi</Text></View>
    <Text accessibilityLiveRegion="polite" style={styles.text}>{busy ? 'Meminta izin dan menyiapkan penerima notifikasi…' : status.message}</Text>
    {ready ? <Text style={styles.ready}>Perangkat terdaftar</Text> : null}
    <Pressable accessibilityRole="button" accessibilityState={{ disabled: busy || status.phase === 'unsupported', busy }}
      disabled={busy || status.phase === 'unsupported'} onPress={request}
      style={({ pressed }) => [styles.button, (busy || status.phase === 'unsupported') && styles.disabled, pressed && styles.pressed]}>
      <Text style={styles.buttonText}>{busy ? 'Menyiapkan notifikasi…' : ready ? 'Daftarkan ulang perangkat' : 'Aktifkan notifikasi'}</Text>
    </Pressable>
    <Pressable accessibilityRole="button" disabled={busy} onPress={refresh} style={styles.link}>
      <Text style={styles.linkText}>Periksa kembali status</Text>
    </Pressable>
    {status.phase === 'denied' && Platform.OS !== 'web' ? <Pressable accessibilityRole="button" style={styles.link}
      onPress={() => { void Linking.openSettings().catch(() => setSettingsError('Buka pengaturan perangkat secara manual, lalu izinkan notifikasi Hadirin.')); }}>
      <Text style={styles.linkText}>Buka pengaturan perangkat</Text>
    </Pressable> : null}
    {settingsError ? <Text accessibilityRole="alert" style={styles.error}>{settingsError}</Text> : null}
    {lastReceived ? <View style={styles.last}>
      <Text style={styles.label}>Notifikasi terakhir diterima</Text>
      <Text style={styles.lastTitle}>{lastReceived.title}</Text>
      <Text style={styles.text}>{lastReceived.body}</Text>
    </View> : null}
    <Text style={styles.note}>Token tidak ditampilkan di layar. Notifikasi perangkat ini dilepas dari akun sebelum logout berhasil.</Text>
  </View>;
}

const styles = StyleSheet.create({
  section: { padding: 20, borderRadius: 14, backgroundColor: authColors.white, gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 }, title: { color: authColors.navy, fontSize: 19, fontWeight: '800' },
  text: { color: authColors.ink, fontSize: 15, lineHeight: 23 }, ready: { color: '#166534', fontSize: 14, fontWeight: '700' },
  button: { minHeight: 50, alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 12, backgroundColor: authColors.navy },
  buttonText: { color: authColors.white, fontWeight: '700', fontSize: 15, textAlign: 'center' },
  disabled: { opacity: 0.45 }, pressed: { opacity: 0.75 }, link: { minHeight: 48, justifyContent: 'center', alignItems: 'center' },
  linkText: { color: authColors.navy, fontWeight: '700', fontSize: 14 }, note: { color: '#52627A', fontSize: 13, lineHeight: 20 },
  last: { gap: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: authColors.border }, label: { color: '#52627A', fontSize: 13 },
  lastTitle: { color: authColors.navy, fontSize: 16, fontWeight: '700' }, error: { color: '#991B1B', fontSize: 14, lineHeight: 21 },
});
