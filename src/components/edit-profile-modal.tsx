import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
    KeyboardAvoidingView,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AuthButton, AuthError, AuthField, authColors } from '@/components/auth-ui';
import { ProfileAvatar } from '@/components/profile-avatar';
import { AVATARS, AVATAR_COLORS, DEFAULT_AVATAR_COLOR } from '@/constants/avatars';
import { validateNim } from '@/utils/nim';

export type ProfilePatch = {
  name: string;
  avatarId: string;
  avatarColor: string;
  nim?: string;
  email?: string;
  newPassword?: string;
  currentPassword?: string;
};

type Props = {
  visible: boolean;
  showNim: boolean;
  initial: {
    name: string;
    email: string;
    nim?: string;
    avatarId?: string;
    avatarColor?: string;
  };
  onClose: () => void;
  onSave: (patch: ProfilePatch) => Promise<void>;
};

const MIN_NAME = 2;
const MAX_NAME = 50;
const MIN_PASSWORD = 6;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function EditProfileModal({ visible, showNim, initial, onClose, onSave }: Props) {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [avatarId, setAvatarId] = useState('');
  const [color, setColor] = useState(DEFAULT_AVATAR_COLOR);
  const [nim, setNim] = useState('');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setName(initial.name);
    setAvatarId(initial.avatarId ?? '');
    setColor(initial.avatarColor ?? DEFAULT_AVATAR_COLOR);
    setNim(initial.nim ?? '');
    setEmail(initial.email);
    setNewPassword('');
    setCurrentPassword('');
    setError(null);
    setBusy(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const cleanEmail = email.trim().toLowerCase();
  const emailChanged = cleanEmail !== initial.email.trim().toLowerCase();
  const passwordChanged = newPassword.length > 0;
  const needCurrentPassword = emailChanged || passwordChanged;

  const requestClose = () => {
    if (!busy) onClose();
  };

  const clearError = () => setError(null);

  const save = async () => {
    const clean = name.trim().replace(/\s+/g, ' ');
    if (clean.length < MIN_NAME) return setError(`Nama minimal ${MIN_NAME} karakter.`);
    if (clean.length > MAX_NAME) return setError(`Nama maksimal ${MAX_NAME} karakter.`);

    const nimChanged = showNim && nim.trim() !== (initial.nim ?? '');
    if (nimChanged) {
      const invalid = validateNim(nim);
      if (invalid) return setError(invalid);
    }

    if (emailChanged && !EMAIL_RE.test(cleanEmail)) {
      return setError('Format email tidak valid.');
    }
    if (passwordChanged && newPassword.length < MIN_PASSWORD) {
      return setError(`Kata sandi baru minimal ${MIN_PASSWORD} karakter.`);
    }
    if (needCurrentPassword && !currentPassword) {
      return setError('Masukkan kata sandi saat ini untuk mengubah email atau kata sandi.');
    }

    setError(null);
    setBusy(true);
    try {
      await onSave({
        name: clean,
        avatarId,
        avatarColor: color,
        ...(nimChanged ? { nim: nim.trim() } : {}),
        ...(emailChanged ? { email: cleanEmail } : {}),
        ...(passwordChanged ? { newPassword } : {}),
        ...(needCurrentPassword ? { currentPassword } : {}),
      });
      onClose();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Gagal menyimpan profil. Coba lagi.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={requestClose}
    >
      <KeyboardAvoidingView style={styles.overlay} behavior="padding">
        <Pressable style={StyleSheet.absoluteFill} onPress={requestClose} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]}>
          <View style={styles.head}>
            <Text accessibilityRole="header" style={styles.title}>Edit Profil</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Tutup"
              disabled={busy}
              onPress={requestClose}
              hitSlop={8}
            >
              <Ionicons name="close" size={24} color={authColors.ink} />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.content}
          >
            <View style={styles.preview}>
              <ProfileAvatar avatarId={avatarId} color={color} name={name} size={96} />
            </View>

            <Text style={styles.label}>Pilih avatar</Text>
            <View style={styles.grid}>
              <Pressable
                accessibilityRole="radio"
                accessibilityLabel="Huruf awal nama"
                accessibilityState={{ selected: avatarId === '' }}
                onPress={() => setAvatarId('')}
                style={[styles.tile, avatarId === '' && styles.tileOn]}
              >
                <ProfileAvatar avatarId="" color={color} name={name} size={52} />
              </Pressable>
              {AVATARS.map((a) => (
                <Pressable
                  key={a.id}
                  accessibilityRole="radio"
                  accessibilityLabel={a.label}
                  accessibilityState={{ selected: avatarId === a.id }}
                  onPress={() => setAvatarId(a.id)}
                  style={[styles.tile, avatarId === a.id && styles.tileOn]}
                >
                  <ProfileAvatar avatarId={a.id} color={color} name={name} size={52} />
                </Pressable>
              ))}
            </View>

            <Text style={styles.label}>Warna latar</Text>
            <View style={styles.colors}>
              {AVATAR_COLORS.map((c) => (
                <Pressable
                  key={c}
                  accessibilityRole="radio"
                  accessibilityLabel={`Warna ${c}`}
                  accessibilityState={{ selected: color === c }}
                  onPress={() => setColor(c)}
                  style={[styles.swatch, { backgroundColor: c }, color === c && styles.swatchOn]}
                >
                  {color === c ? <Ionicons name="checkmark" size={18} color={authColors.navy} /> : null}
                </Pressable>
              ))}
            </View>

            <Text style={[styles.label, { marginTop: 20 }]}>Data diri</Text>
            <View style={styles.fields}>
              <AuthField
                label="Nama"
                icon="person-outline"
                value={name}
                onChangeText={(v) => { setName(v); clearError(); }}
                editable={!busy}
                placeholder="Nama lengkap"
                autoCapitalize="words"
                maxLength={MAX_NAME}
              />
              {showNim ? (
                <AuthField
                  label="NIM"
                  icon="card-outline"
                  value={nim}
                  onChangeText={(v) => { setNim(v); clearError(); }}
                  editable={!busy}
                  placeholder="14 angka"
                  keyboardType="number-pad"
                  autoCorrect={false}
                  maxLength={14}
                />
              ) : null}
            </View>

            <Text style={[styles.label, { marginTop: 20 }]}>Akun</Text>
            <View style={styles.fields}>
              <AuthField
                label="Email"
                icon="mail-outline"
                value={email}
                onChangeText={(v) => { setEmail(v); clearError(); }}
                editable={!busy}
                placeholder="nama@email.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <AuthField
                label="Kata sandi baru"
                icon="lock-closed-outline"
                value={newPassword}
                onChangeText={(v) => { setNewPassword(v); clearError(); }}
                editable={!busy}
                placeholder="Kosongkan jika tidak diubah"
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />
              {needCurrentPassword ? (
                <>
                  <Text style={styles.hint}>
                    {emailChanged
                      ? 'Link verifikasi akan dikirim ke email baru. Email baru aktif setelah link diklik. '
                      : ''}
                    Konfirmasi dengan kata sandi saat ini.
                  </Text>
                  <AuthField
                    label="Kata sandi saat ini"
                    icon="key-outline"
                    value={currentPassword}
                    onChangeText={(v) => { setCurrentPassword(v); clearError(); }}
                    editable={!busy}
                    placeholder="Kata sandi saat ini"
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </>
              ) : null}
            </View>

            <View style={{ marginTop: 16, gap: 12 }}>
              <AuthError message={error} />
              <AuthButton title="Simpan" loading={busy} onPress={() => void save()} />
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.55)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: authColors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 20,
    maxHeight: '90%',
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  title: { color: authColors.navy, fontSize: 20, fontWeight: '800' },
  content: { paddingBottom: 8 },
  preview: { alignItems: 'center', marginVertical: 14 },
  label: { color: authColors.ink, fontSize: 13, fontWeight: '800', marginBottom: 10, marginTop: 6 },
  hint: { color: '#52627A', fontSize: 12, lineHeight: 18 },
  fields: { gap: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 10 },
  tile: {
    width: '25%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  tileOn: { borderColor: authColors.navy, backgroundColor: '#EDF2FA' },
  colors: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  swatch: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  swatchOn: { borderColor: authColors.navy },
});