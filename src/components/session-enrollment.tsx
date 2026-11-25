import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useAuth } from '@/context/auth-context';
import { syncClassSessions } from '@/services/class-sync';
import { enrollPractitionerToClass, findPractitionerByNim, type PractitionerAccount } from '@/services/enrollment-service';
import { firebaseErrorMessage } from '@/utils/firebase-error';
import { theme } from '../../features/asisten/theme';

type RosterEntry = { nim: string; name: string };

export function SessionEnrollment({ classId, roster = [] }: { classId?: string; roster?: RosterEntry[] }) {
  const { profile } = useAuth();
  const [nim, setNim] = useState('');
  const [account, setAccount] = useState<PractitionerAccount | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  if (profile?.role !== 'asisten') return null;

  async function search() {
    setBusy(true); setError(null); setMessage(null); setAccount(null);
    try {
      const found = await findPractitionerByNim(nim);
      if (found.uid === profile?.uid) throw new Error('Asisten tidak bisa menambahkan dirinya sendiri sebagai peserta.');
      setAccount(found);
    }
    catch (failure) { setError(firebaseErrorMessage(failure)); }
    finally { setBusy(false); }
  }

  async function enroll() {
    if (!account || !classId) return;
    setBusy(true); setError(null); setMessage(null);
    try {
      const result = await enrollPractitionerToClass(classId, account.nim, account.uid);
      if (!result.alreadyEnrolled) await syncClassSessions(classId);
      setMessage(result.alreadyEnrolled
        ? 'Praktikan sudah terdaftar di kelas ini.'
        : `${result.account.name} berhasil ditambahkan ke kelas dan sesinya.`);
    } catch (failure) { setError(firebaseErrorMessage(failure)); }
    finally { setBusy(false); }
  }

  const enrolled = !!account && roster.some((item) => item.nim === account.nim);

  if (!classId) {
    return <View style={styles.container}>
      <Text accessibilityRole="header" style={styles.title}>Peserta sesi</Text>
      <Text style={styles.caption}>
        Sesi ini belum terhubung ke kelas, jadi peserta belum bisa ditambahkan dari sini.
        Ubah sesi lalu pilih ulang kelasnya, atau jalankan script backfill.
      </Text>
    </View>;
  }

  return <View style={styles.container}>
    <Text accessibilityRole="header" style={styles.title}>Peserta sesi</Text>
    <Text style={styles.caption}>{roster.length} praktikan terdaftar di kelas. Cari NIM, periksa identitas, lalu tambahkan ke kelas.</Text>
    <Text style={styles.label}>NIM praktikan</Text>
    <TextInput accessibilityLabel="NIM peserta" value={nim} editable={!busy} autoCapitalize="characters" autoCorrect={false}
      placeholder="14 angka" placeholderTextColor={theme.colors.textSecondary} maxLength={30} style={styles.input}
      onChangeText={(value) => { setNim(value); setAccount(null); setError(null); setMessage(null); }} />
    <Pressable accessibilityRole="button" disabled={busy} accessibilityState={{ disabled: busy }} style={[styles.button, busy && { opacity: 0.6 }]}
      onPress={() => void search()}><Text style={styles.buttonText}>{busy ? 'Memproses…' : 'Cari praktikan'}</Text></Pressable>
    {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
    {account ? <View style={styles.result}>
      <Text style={styles.name}>{account.name}</Text>
      <Text style={styles.caption}>NIM: {account.nim}</Text>
      <Text style={styles.caption}>{account.email}</Text>
      <Pressable accessibilityRole="button" disabled={busy || enrolled} accessibilityState={{ disabled: busy || enrolled }}
        style={[styles.button, (busy || enrolled) && { opacity: 0.6 }]} onPress={() => void enroll()}>
        <Text style={styles.buttonText}>{enrolled ? 'Sudah terdaftar' : 'Tambahkan ke sesi'}</Text>
      </Pressable>
    </View> : null}
    {message ? <Text accessibilityLiveRegion="polite" style={styles.success}>{message}</Text> : null}
  </View>;
}

const styles = StyleSheet.create({
  container: { padding: 20, borderRadius: theme.borderRadius.lg, backgroundColor: theme.colors.card, gap: 12, marginBottom: 16 },
  title: { color: theme.colors.text, fontSize: 18, fontWeight: '700' },
  caption: { color: theme.colors.textSecondary, fontSize: 14, lineHeight: 21 },
  label: { color: theme.colors.text, fontSize: 14, fontWeight: '600' },
  input: { borderColor: theme.colors.border, borderWidth: 1, borderRadius: theme.borderRadius.md, padding: 14, minHeight: 48, fontSize: 16, color: theme.colors.text },
  button: { backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.md, minHeight: 48, padding: 14, justifyContent: 'center', alignItems: 'center' },
  buttonText: { color: theme.colors.white, fontSize: 14, fontWeight: '700' },
  result: { borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: 14, gap: 8 },
  name: { color: theme.colors.text, fontSize: 16, fontWeight: '700' },
  error: { color: '#B91C1C', fontSize: 14, lineHeight: 21 },
  success: { color: '#166534', fontSize: 14, lineHeight: 21 },
});
