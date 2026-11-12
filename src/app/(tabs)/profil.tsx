import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AuthError, authColors } from '@/components/auth-ui';
import { StateView } from '@/components/state-view';
import { useApp } from '@/context/app-context';

export default function ProfilScreen() {
  const insets = useSafeAreaInsets();
  const { currentUser, logout } = useApp();
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleKeluar = async () => {
    setError(null);
    setLoggingOut(true);
    try {
      await logout();
    } catch {
      setError('Gagal keluar. Periksa koneksi lalu coba lagi.');
      setLoggingOut(false);
    }
  };

  if (!currentUser) {
    return (
      <View style={[styles.screen, styles.center, { paddingTop: insets.top + 24 }]}>
        <View style={styles.centerInner}>
          <StateView
            kind="error"
            title="Profil tidak ditemukan"
            message="Data akunmu tidak dapat dimuat. Silakan keluar lalu masuk kembali."
            actionLabel="Keluar"
            onAction={handleKeluar}
          />
        </View>
      </View>
    );
  }

  const isAsisten = currentUser.role === 'asisten';
  const roleLabel = isAsisten ? 'Asisten Praktikum' : 'Praktikan';
  const initial = currentUser.name?.charAt(0).toUpperCase() || '?';

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.header, { paddingTop: insets.top + 28 }]}>
          <View style={styles.headerInner}>
            <Text style={styles.eyebrow}>HADIRIN</Text>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initial}</Text>
            </View>
            <Text style={styles.name}>{currentUser.name}</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{roleLabel}</Text>
            </View>
          </View>
        </View>

        <View style={styles.body}>
          <View style={styles.bodyInner}>
            <View style={styles.card}>
              <InfoRow icon="person-outline" label="Nama" value={currentUser.name} />
              <View style={styles.divider} />
              <InfoRow icon="mail-outline" label="Email" value={currentUser.identifier} />
              <View style={styles.divider} />
              <InfoRow icon="shield-checkmark-outline" label="Peran" value={roleLabel} />
            </View>

            <AuthError message={error} />

            <Pressable
              onPress={handleKeluar}
              disabled={loggingOut}
              style={[styles.logout, loggingOut && { opacity: 0.6 }]}
            >
              {loggingOut ? (
                <ActivityIndicator color={authColors.danger} />
              ) : (
                <>
                  <Ionicons name="log-out-outline" size={18} color={authColors.danger} />
                  <Text style={styles.logoutText}>Keluar</Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={18} color={authColors.navy} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue}>{value || '-'}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: authColors.background },
  center: { alignItems: 'center', paddingHorizontal: 20 },
  centerInner: { width: '100%', maxWidth: 560, marginTop: 40 },

  header: {
    backgroundColor: authColors.navy,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    paddingHorizontal: 24,
    paddingBottom: 56,
    alignItems: 'center',
  },
  headerInner: { width: '100%', maxWidth: 560, alignItems: 'center', gap: 10 },
  eyebrow: {
    color: '#5EEAD4',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.6,
    alignSelf: 'flex-start',
  },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: authColors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  avatarText: { color: authColors.navy, fontSize: 34, fontWeight: '800' },
  name: { color: authColors.white, fontSize: 22, fontWeight: '800', textAlign: 'center' },
  badge: {
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 5,
  },
  badgeText: { color: authColors.white, fontSize: 12, fontWeight: '800' },

  body: { alignItems: 'center', paddingHorizontal: 20, marginTop: -28 },
  bodyInner: { width: '100%', maxWidth: 560, gap: 14 },
  card: {
    backgroundColor: authColors.white,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 6,
    shadowColor: '#1B2A4E',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  rowIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#E8EEF9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: { color: authColors.muted, fontSize: 12 },
  rowValue: { color: authColors.ink, fontSize: 15, fontWeight: '700', marginTop: 1 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: authColors.border },

  logout: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: authColors.dangerSoft,
  },
  logoutText: { color: authColors.danger, fontSize: 16, fontWeight: '800' },
});