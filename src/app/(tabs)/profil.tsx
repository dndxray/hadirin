import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AuthButton, AuthError, AuthField, authColors } from '@/components/auth-ui';
import { StateView } from '@/components/state-view';
import { NotificationSettings } from '@/components/notification-settings';
import { BottomTabInset } from '@/constants/theme';
import { useApp } from '@/context/app-context';
import { useAuth } from '@/context/auth-context';
import { firebaseErrorMessage } from '@/utils/firebase-error';
import { validateNim } from '@/utils/nim';
import { hasRole, roleLabel } from '@/utils/roles';

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

  const handleSaveNim = async () => {
    const invalid = validateNim(nim);
    if (invalid) { setNimError(invalid); return; }
    setNimError(null);
    setSavingNim(true);
    try { await saveNim(nim); setEditingNim(false); }
    catch (failure) { setNimError(firebaseErrorMessage(failure)); }
    finally { setSavingNim(false); }
  };

  const handleKeluar = async () => {
    setError(null);
    setLoggingOut(true);
    try {
      await logout();
    } catch (failure) {
      setError(failure instanceof Error && !('code' in failure) ? failure.message : 'Gagal keluar. Periksa koneksi lalu coba lagi.');
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

  return (
    <KeyboardAvoidingView style={styles.screen} behavior="padding">
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + BottomTabInset + 40 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
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
              <Text style={styles.badgeText}>{activeRoleLabel}</Text>
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
              {isPraktikanAccount ? <>
                <InfoRow icon="card-outline" label="NIM" value={profile?.nim || 'Belum diisi'} />
                <View style={styles.divider} />
              </> : null}
              <InfoRow icon="shield-checkmark-outline" label="Peran" value={rolesText} />
            </View>

            {isPraktikanAccount && (!profile?.nim || editingNim) ? <View style={styles.nimForm}>
              <Text style={styles.nimTitle}>{profile?.nim ? 'Ubah NIM' : 'Lengkapi NIM'}</Text>
              <Text style={styles.nimHint}>Asisten menggunakan NIM untuk mencari akunmu dan menambahkanmu ke sesi.</Text>
              <AuthField label="NIM" icon="card-outline" value={nim} onChangeText={setNim}
                editable={!savingNim} placeholder="14 angka" keyboardType="number-pad"
                autoCapitalize="characters" autoCorrect={false} maxLength={14} />
              <Text style={styles.nimHint}>Periksa sebelum menyimpan. NIM dipakai asisten untuk mencarimu.</Text>
              <AuthError message={nimError} />
              <AuthButton title="Simpan NIM" loading={savingNim} onPress={() => void handleSaveNim()} />
              {profile?.nim ? (
                <Pressable onPress={() => { setEditingNim(false); setNim(''); setNimError(null); }}>
                  <Text style={styles.nimCancel}>Batal</Text>
                </Pressable>
              ) : null}
            </View> : null}

            {isPraktikanAccount && profile?.nim && !editingNim ? (
              <Pressable
                onPress={() => { setNim(profile.nim ?? ''); setNimError(null); setEditingNim(true); }}
                style={styles.nimEdit}
              >
                <Ionicons name="create-outline" size={18} color={authColors.navy} />
                <Text style={styles.nimEditText}>Ubah NIM</Text>
              </Pressable>
            ) : null}

            <NotificationSettings />
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
    </KeyboardAvoidingView>
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
  nimForm: { backgroundColor: authColors.white, borderRadius: 20, padding: 20, gap: 14 },
  nimTitle: { color: authColors.navy, fontSize: 18, fontWeight: '800' },
  nimHint: { color: '#52627A', fontSize: 14, lineHeight: 21 },
  nimCancel: { color: authColors.muted, fontSize: 14, fontWeight: '700', textAlign: 'center', paddingVertical: 4 },
  nimEdit: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: authColors.border,
    backgroundColor: authColors.white,
  },
  nimEditText: { color: authColors.navy, fontSize: 14, fontWeight: '700' },
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
