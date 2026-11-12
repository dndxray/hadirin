import { Redirect } from 'expo-router';

import AppTabs from '@/components/app-tabs';
import { useApp } from '@/context/app-context';
import { useAuth } from '@/context/auth-context';

export default function TabLayout() {
  const { loading } = useAuth();
  const { currentUser } = useApp();

  if (loading) return null;

  if (!currentUser) {
    return <Redirect href="/login" />;
  }

  return <AppTabs />;
}