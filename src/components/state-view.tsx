import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { authColors } from '@/components/auth-ui';

type Kind = 'loading' | 'empty' | 'error';

type Props = {
  kind: Kind;
  title?: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
};

const DEFAULTS: Record<Kind, { title: string; message: string; icon: keyof typeof Ionicons.glyphMap }> = {
  loading: { title: 'Memuat…', message: 'Mohon tunggu sebentar.', icon: 'time-outline' },
  empty: { title: 'Belum ada data', message: 'Data akan muncul di sini.', icon: 'file-tray-outline' },
  error: {
    title: 'Terjadi kesalahan',
    message: 'Periksa koneksi lalu coba lagi.',
    icon: 'alert-circle-outline',
  },
};

export function StateView({ kind, title, message, actionLabel, onAction }: Props) {
  const d = DEFAULTS[kind];
  const isError = kind === 'error';

  return (
    <View style={styles.card}>
      {kind === 'loading' ? (
        <ActivityIndicator color={authColors.navy} />
      ) : (
        <View style={[styles.icon, isError && styles.iconError]}>
          <Ionicons
            name={d.icon}
            size={26}
            color={isError ? authColors.danger : authColors.navy}
          />
        </View>
      )}

      <Text style={styles.title}>{title ?? d.title}</Text>
      <Text style={styles.message}>{message ?? d.message}</Text>

      {actionLabel && onAction ? (
        <Pressable style={styles.button} onPress={onAction}>
          <Text style={styles.buttonText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: authColors.white,
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    gap: 8,
    shadowColor: '#1B2A4E',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  icon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#E8EEF9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconError: { backgroundColor: authColors.dangerSoft },
  title: { color: authColors.ink, fontSize: 16, fontWeight: '800', textAlign: 'center' },
  message: { color: authColors.muted, fontSize: 13, textAlign: 'center', lineHeight: 19 },
  button: {
    marginTop: 8,
    backgroundColor: authColors.navy,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 11,
  },
  buttonText: { color: authColors.white, fontWeight: '800', fontSize: 14 },
});