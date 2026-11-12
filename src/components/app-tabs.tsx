import { NativeTabs } from 'expo-router/native-tabs';

import { authColors } from '@/components/auth-ui';
import { useRole } from '@/hooks/use-role';

export default function AppTabs() {
  const isAsisten = useRole() === 'asisten';

  return (
    <NativeTabs
      backgroundColor={authColors.white}
      indicatorColor="#DCE6FB"
      labelStyle={{
        default: { color: authColors.muted },
        selected: { color: authColors.navy },
      }}
    >
      <NativeTabs.Trigger name="presensi" hidden={isAsisten}>
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/tabIcons/home.png')}
          renderingMode="template"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="explore" hidden={isAsisten}>
        <NativeTabs.Trigger.Label>Riwayat</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/tabIcons/explore.png')}
          renderingMode="template"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="jadwal" hidden={!isAsisten}>
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/tabIcons/home.png')}
          renderingMode="template"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="kelas" hidden={!isAsisten}>
        <NativeTabs.Trigger.Label>Kelas</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/tabIcons/explore.png')}
          renderingMode="template"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="profil">
        <NativeTabs.Trigger.Label>Akun</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/tabIcons/home.png')}
          renderingMode="template"
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}