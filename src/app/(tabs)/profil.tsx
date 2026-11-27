import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AuthButton, AuthError, AuthField, authColors } from '@/components/auth-ui';
import { NotificationSettings } from '@/components/notification-settings';
import { StateView } from '@/components/state-view';
import { BottomTabInset } from '@/constants/theme';
import { useApp } from '@/context/app-context';
import { useAuth } from '@/context/auth-context';
import { firebaseErrorMessage } from '@/utils/firebase-error';
import { validateNim } from '@/utils/nim';
import { hasRole, roleLabel } from '@/utils/roles';

type IconName = keyof typeof Ionicons.glyphMap;

export default function ProfilScreen() {
  const insets = useSafeAreaInsets();
  const { currentUser } = useApp();
  const { profile, saveNim, logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nim, setNim] = useState('');
  const [savingNim, setSavingNim] = useState(false);
  const [nimError, setNimError] = useState<string | null>(null);
  const [editingNim, setEditingNim] = useState(false);
  const [showNotif, setShowNotif] = useState(false);

  const handleSaveNim = async () => {
    const invalid = validateNim(nim);
    if (invalid) {
      setNimError(invalid);
      return;
    }
    setNimError(null);
    setSavingNim(true);
    try {
      await saveNim(nim);
      setEditingNim(false);
    } catch (failure) {
      setNimError(firebaseErrorMessage(failure));
    } finally {
      setSavingNim(false);
    }
  };

  const handleKeluar = async () => {
    setError(null);
    setLoggingOut(true);
    try {
      await logout();
    } catch (failure) {
      setError(
        failure instanceof Error && !('code' in failure)
          ? failure.message
          : 'Gagal keluar. Periksa koneksi lalu coba lagi.',
      );
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
  const activeRoleLabel = isAsisten ? 'Asisten Praktikum' : 'Praktikan';
  const isPraktikanAccount = hasRole(profile, 'praktikan');
  const rolesText = (profile?.roles?.length ? profile.roles : ['praktikan' as const])
    .map((item) => roleLabel(item))
    .join(' · ');
  const initial = currentUser.name?.charAt(0).toUpperCase() || '?';
  const needNimForm = isPraktikanAccount && (!profile?.nim || editingNim);

  return (
    <KeyboardAvoidingView style={styles.screen} behavior="padding">
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + BottomTabInset + 40 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.header, { paddingTop: insets.top + 24 }]}>
          <View style={styles.headerInner}>
            <Text accessibilityRole="header" style={styles.title}>Profil</Text>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initial}</Text>
            </View>
            <Text style={styles.name}>{currentUser.name}</Text>
            <Text style={styles.role}>{activeRoleLabel}</Text>
          </View>
        </View>

        <View style={styles.body}>
          <View style={styles.bodyInner}>
            <View style={styles.card}>
              <InfoRow icon="mail-outline" label="Email" value={currentUser.identifier} />
              {isPraktikanAccount ? (
                <>
                  <View style={styles.divider} />
                  <InfoRow
                    icon="card-outline"
                    label="NIM"
                    value={profile?.nim || 'Belum diisi'}
                    action={
                      profile?.nim && !editingNim
                        ? {
                            label: 'Ubah NIM',
                            onPress: () => {
                              setNim(profile.nim ?? '');
                              setNimError(null);
                              setEditingNim(true);
                            },
                          }
                        : undefined
                    }
                  />
                </>
              ) : null}
              <View style={styles.divider} />
              <InfoRow icon="shield-checkmark-outline" label="Peran" value={rolesText} />
            </View>

            {needNimForm ? (
              <View style={styles.nimForm}>
                <Text style={styles.nimTitle}>{profile?.nim ? 'Ubah NIM' : 'Lengkapi NIM'}</Text>
                <Text style={styles.nimHint}>
                  Asisten memakai NIM untuk mencari akunmu dan menambahkanmu ke sesi.
                </Text>
                <AuthField
                  label="NIM"
                  icon="card-outline"
                  value={nim}
                  onChangeText={setNim}
                  editable={!savingNim}
                  placeholder="14 angka"
                  keyboardType="number-pad"
                  autoCapitalize="characters"
                  autoCorrect={false}
                  maxLength={14}
                />
                <AuthError message={nimError} />
                <AuthButton title="Simpan NIM" loading={savingNim} onPress={() => void handleSaveNim()} />
                {profile?.nim ? (
                  <Pressable
                    onPress={() => {
                      setEditingNim(false);
                      setNim('');
                      setNimError(null);
                    }}
                  >
                    <Text style={styles.nimCancel}>Batal</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}

            <View style={styles.card}>
              <MenuRow
                icon="notifications-outline"
                label="Notifikasi"
                chevron={showNotif ? 'chevron-up' : 'chevron-down'}
                onPress={() => setShowNotif((v) => !v)}
              />
              {showNotif ? (
                <View style={styles.notifBox}>
                  <NotificationSettings />
                </View>
              ) : null}
            </View>

            <AuthError message={error} />

            <Pressable
              onPress={handleKeluar}
              disabled={loggingOut}
              accessibilityRole="button"
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
    </KeyboardAvoidingView>
  );
}

function InfoRow({
  icon,
  label,
  value,
  action,
}: {
  icon: IconName;
  label: string;
  value: string;
  action?: { label: string; onPress: () => void };
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
      {action ? (
        <Pressable onPress={action.onPress} hitSlop={8} accessibilityRole="button">
          <Text style={styles.rowAction}>{action.label}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function MenuRow({
  icon,
  label,
  onPress,
  chevron = 'chevron-forward',
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  chevron?: IconName;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
    >
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={18} color={authColors.navy} />
      </View>
      <Text style={styles.menuLabel}>{label}</Text>
      <Ionicons name={chevron} size={18} color={authColors.muted} />
    </Pressable>
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
  headerInner: { width: '100%', maxWidth: 560, alignItems: 'center', gap: 8 },
  title: { color: authColors.white, fontSize: 22, fontWeight: '800', marginBottom: 8 },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#F6D9C9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#8B4A2B', fontSize: 34, fontWeight: '800' },
  name: { color: authColors.white, fontSize: 20, fontWeight: '800', textAlign: 'center' },
  role: { color: '#B6C2DB', fontSize: 13 },

  body: { alignItems: 'center', paddingHorizontal: 20, marginTop: -28 },
  bodyInner: { width: '100%', maxWidth: 560, gap: 14 },

  card: {
    backgroundColor: authColors.white,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 4,
    shadowColor: '#1B2A4E',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, minHeight: 56 },
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
  rowAction: { color: '#2F5AA8', fontSize: 13, fontWeight: '700' },
  menuLabel: { flex: 1, color: authColors.ink, fontSize: 15, fontWeight: '700' },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: authColors.border },
  notifBox: { paddingBottom: 12 },

  nimForm: { backgroundColor: authColors.white, borderRadius: 20, padding: 20, gap: 14 },
  nimTitle: { color: authColors.navy, fontSize: 18, fontWeight: '800' },
  nimHint: { color: '#52627A', fontSize: 14, lineHeight: 21 },
  nimCancel: {
    color: authColors.muted,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    paddingVertical: 4,
  },

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