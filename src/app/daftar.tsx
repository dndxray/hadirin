import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text } from 'react-native';

import {
  AuthButton,
  AuthError,
  AuthField,
  AuthOptionGroup,
  AuthShell,
  authColors,
} from '@/components/auth-ui';
import { useApp } from '@/context/app-context';
import { authErrorMessage, useAuth } from '@/context/auth-context';
import type { Role } from '@/types/attendance';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const roleOptions: { value: Role; label: string; icon: 'school-outline' | 'clipboard-outline' }[] = [
  { value: 'praktikan', label: 'Praktikan', icon: 'school-outline' },
  { value: 'asisten', label: 'Asisten', icon: 'clipboard-outline' },
];

export default function DaftarScreen() {
  const { register } = useAuth();
  const { login: setDummyUser } = useApp(); // sementara, sampai SRS-08
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('praktikan');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) return setError('Nama wajib diisi.');
    if (!EMAIL_REGEX.test(email.trim())) return setError('Format email tidak valid.');
    if (password.length < 6) return setError('Kata sandi minimal 6 karakter.');

    setError(null);
    setSubmitting(true);
    try {
      const p = await register(name, email, password, role);
      setDummyUser(p.role);
      router.replace(p.role === 'asisten' ? '/jadwal' : '/presensi');
    } catch (e) {
      setError(authErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      eyebrow="AKUN BARU"
      title="Buat Akun"
      subtitle="Daftar untuk mulai mencatat dan mengelola kehadiran praktikum."
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