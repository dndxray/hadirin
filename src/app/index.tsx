import { Redirect } from 'expo-router';
import { useAuth } from '@/context/auth-context';

export default function Index() {
  const { profile, loading } = useAuth();
  if (loading) return null;
  if (!profile) return <Redirect href="/login" />;

  if (profile.role === 'asisten' && profile.approvalStatus === 'pending') {
    return <Redirect href="/pending" />;
  }

  return <Redirect href="/home" />;
}