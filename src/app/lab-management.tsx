import { Redirect } from 'expo-router';

import { useAuth } from '@/context/auth-context';
import { hasRole } from '@/utils/roles';

// Pengelolaan laboratorium sekarang berada di halaman Maps (di bawah peta,
// khusus asisten). Route ini dipertahankan hanya supaya tautan lama tetap
// bekerja: semua pengunjung diarahkan ke /maps.
export default function LabManagementRoute() {
  const { profile, loading } = useAuth();

  if (loading) return null;
  if (!profile) return <Redirect href="/login" />;
  if (!hasRole(profile, 'asisten')) return <Redirect href="/home" />;

  return <Redirect href="/maps" />;
}