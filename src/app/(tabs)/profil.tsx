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
import { EditProfileModal } from '@/components/edit-profile-modal';
import { ProfileAvatar } from '@/components/profile-avatar';
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
  const { profile, saveNim, logout, updateProfile, updateAccount } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nim, setNim] = useState('');
  const [savingNim, setSavingNim] = useState(false);
  const [nimError, setNimError] = useState<string | null>(null);
  const [editingNim, setEditingNim] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);

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
  const displayName = profile?.name || currentUser.name;
  const displayEmail = profile?.email || currentUser.identifier;
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
          <View style={styles.headerCircleA} />
          <View style={styles.headerCircleB} />
          <View style={styles.headerInner}>
            <Text accessibilityRole="header" style={styles.title}>Profil</Text>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Ubah avatar"
              onPress={() => setEditingProfile(true)}
              style={styles.avatarWrap}
            >
              <ProfileAvatar
                avatarId={profile?.avatarId}
                color={profile?.avatarColor}
                name={displayName}
                size={92}
              />
              <View style={styles.pencil}>
                <Ionicons name="pencil" size={13} color={authColors.white} />
              </View>
            </Pressable>

            <Text style={styles.name}>{displayName}</Text>
            <Text style={styles.role}>{activeRoleLabel}</Text>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Edit profil"
              onPress={() => setEditingProfile(true)}
              style={({ pressed }) => [styles.editBtn, pressed && { opacity: 0.8 }]}
            >
              <Ionicons name="create-outline" size={16} color={authColors.white} />
              <Text style={styles.editBtnText}>Edit Profil</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.body}>
          <View style={styles.bodyInner}>
            <View style={styles.card}>
              <InfoRow icon="mail-outline" label="Email" value={displayEmail} />
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

      <EditProfileModal
        visible={editingProfile}
        showNim={isPraktikanAccount}
        initial={{
          name: displayName,
          email: displayEmail,
          nim: profile?.nim,
          avatarId: profile?.avatarId,
          avatarColor: profile?.avatarColor,
        }}
        onClose={() => setEditingProfile(false)}
        onSave={async (patch) => {
          const { nim: newNim, email, newPassword, currentPassword, ...base } = patch;
          try {
            // 1. Email/password dulu (butuh kata sandi saat ini, paling mungkin gagal)
            if (email || newPassword) {
              await updateAccount({ email, newPassword, currentPassword: currentPassword ?? '' });
            }
            // 2. Nama + avatar
            await updateProfile(base);
            // 3. NIM
            if (newNim) await saveNim(newNim);
          } catch (failure) {
            throw new Error(firebaseErrorMessage(failure));
          }
        }}
      />
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
    overflow: 'hidden',
  },
  headerCircleA: {
    position: 'absolute',
    top: -60,
    right: -40,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(96,165,250,0.18)',
  },
  headerCircleB: {
    position: 'absolute',
    bottom: -70,
    left: -50,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  headerInner: { width: '100%', maxWidth: 560, alignItems: 'center', gap: 8 },
  title: { color: authColors.white, fontSize: 22, fontWeight: '800', marginBottom: 8 },
  avatarWrap: { position: 'relative' },
  pencil: {
    position: 'absolute',
    right: 0,
    bottom: 2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#2F5AA8',
    borderWidth: 2,
    borderColor: authColors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { color: authColors.white, fontSize: 20, fontWeight: '800', textAlign: 'center' },
  role: { color: '#B6C2DB', fontSize: 13 },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    minHeight: 40,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  editBtnText: { color: authColors.white, fontSize: 13, fontWeight: '700' },

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
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: authColors.border },

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