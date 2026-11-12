import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text } from 'react-native';

import {
  AuthButton,
  AuthError,
  AuthField,
  AuthShell,
  authColors,
} from '@/components/auth-ui';
import { useApp } from '@/context/app-context';
import { authErrorMessage, useAuth } from '@/context/auth-context';

export default function LoginScreen() {
  const { login } = useAuth();
  const { login: setDummyUser } = useApp(); // sementara, sampai SRS-08
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim() || !password) {
      setError('Email dan kata sandi wajib diisi.');
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      const p = await login(email, password);
      setDummyUser(p.role);
      router.replace(p.role === 'asisten' ? '/jadwal' : '/presensi');
    } catch (e) {
      setError(
        e instanceof Error && !('code' in e) ? e.message : authErrorMessage(e),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      eyebrow="MULAI SEKARANG"
      title="Selamat Datang"
      subtitle="Masuk untuk mencatat dan mengelola kehadiran praktikum dengan mudah."
      footer={
        <Pressable onPress={() => router.replace('/daftar')}>
          <Text style={{ color: authColors.muted, fontSize: 13 }}>
            Belum punya akun?{' '}
            <Text style={{ color: authColors.navy, fontWeight: '800' }}>Daftar</Text>
          </Text>
        </Pressable>
      }
    >
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
        placeholder="Kata sandi"
        secureTextEntry
      />
      <AuthError message={error} />
      <AuthButton title="Masuk" loading={submitting} onPress={handleSubmit} />
    </AuthShell>
  );
}