import { Redirect } from 'expo-router';

import { useAuth } from '@/context/auth-context';
import { hasRole } from '@/utils/roles';
import { LabListScreen } from '../../features/lab-management/LabListScreen';

// Halaman kelola laboratorium. Hanya untuk asisten; aturan Firestore tetap
// menjadi penjaga yang sebenarnya.
export default function LabManagementRoute() {
  const { profile, loading } = useAuth();

  if (loading) return null;
  if (!profile) return <Redirect href="/login" />;
  if (!hasRole(profile, 'asisten')) return <Redirect href="/home" />;

  return <LabListScreen />;
}
