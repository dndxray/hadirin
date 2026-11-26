import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text } from 'react-native';

import { AuthShell } from '@/components/auth-layout';
import {
  AuthButton,
  AuthError,
  AuthField,
  AuthOptionGroup,
  authColors,
} from '@/components/auth-ui';
import { authErrorMessage, useAuth } from '@/context/auth-context';
import type { Role } from '@/types/attendance';
import { validateNim } from '@/utils/nim';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const roleOptions: { value: Role; label: string; icon: 'school-outline' | 'clipboard-outline' }[] = [
  { value: 'praktikan', label: 'Praktikan', icon: 'school-outline' },
  { value: 'asisten', label: 'Asisten', icon: 'clipboard-outline' },
];

export default function DaftarScreen() {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nim, setNim] = useState('');
  const [role, setRole] = useState<Role>('praktikan');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) return setError('Nama wajib diisi.');
    if (!EMAIL_REGEX.test(email.trim())) return setError('Format email tidak valid.');
    if (password.length < 6) return setError('Kata sandi minimal 6 karakter.');
    if (role === 'praktikan') {
      const invalidNim = validateNim(nim);
      if (invalidNim) return setError(invalidNim);
    }

    setError(null);
    setSubmitting(true);
    try {
      const created = await register(
        name,
        email,
        password,
        role,
        role === 'praktikan' ? nim : undefined,
      );

      router.replace(created.role === 'asisten' && created.approvalStatus === 'pending' ? '/pending' : '/home');
    } catch (e) {
      setError(e instanceof Error && !('code' in e) ? e.message : authErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      title="Buat Akun"
      footer={
        <Pressable onPress={() => router.replace('/login')}>
          <Text style={{ color: authColors.muted, fontSize: 13 }}>
            Sudah punya akun?{' '}
            <Text style={{ color: authColors.navy, fontWeight: '800' }}>Masuk</Text>
          </Text>
        </Pressable>
      }
    >
      <AuthOptionGroup label="Pilih Peran" options={roleOptions} value={role} onChange={setRole} />
      <AuthField
        label="Nama Lengkap"
        icon="person-outline"
        value={name}
        onChangeText={setName}
        placeholder="Nama lengkap"
      />
      {role === 'praktikan' ? (
        <AuthField
          label="NIM"
          icon="id-card-outline"
          value={nim}
          onChangeText={setNim}
          placeholder="14 angka"
          keyboardType="number-pad"
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={14}
        />
      ) : null}
      <AuthField
        label="Email"
        icon="mail-outline"
        value={email}
        onChangeText={setEmail}
        placeholder="nama@email.com"
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <AuthField
        label="Kata sandi"
        icon="lock-closed-outline"
        value={password}
        onChangeText={setPassword}
        placeholder="Minimal 6 karakter"
        secureTextEntry
      />
      <AuthError message={error} />
      <AuthButton title="Daftar" loading={submitting} onPress={handleSubmit} />
    </AuthShell>
  );
}