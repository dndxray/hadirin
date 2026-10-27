import { Redirect } from 'expo-router';

import AppTabs from '@/components/app-tabs';
import { useApp } from '@/context/app-context';

export default function TabLayout() {
  const { currentUser } = useApp();

  if (!currentUser) {
    return <Redirect href="/pilih-identitas" />;
  }

  return <AppTabs />;
}