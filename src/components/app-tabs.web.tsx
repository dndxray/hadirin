import { Ionicons } from '@expo/vector-icons';
import {
  Tabs,
  TabList,
  TabTrigger,
  TabSlot,
  TabTriggerSlotProps,
  TabListProps,
} from 'expo-router/ui';
import { Pressable, type PressableProps, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { authColors } from '@/components/auth-ui';
import { useRole } from '@/hooks/use-role';

type IconName = keyof typeof Ionicons.glyphMap;

export default function AppTabs() {
  const role = useRole();

  return (
    <Tabs>
      <TabSlot style={{ flex: 1, width: '100%' }} />

      <TabList asChild>
        <CustomTabList>
          {role === 'asisten' ? (
            <>
              <TabTrigger name="jadwal" href="/jadwal" asChild>
                <TabButton icon="home" label="Home" />
              </TabTrigger>
              <TabTrigger name="kelas" href="/kelas" asChild>
                <TabButton icon="school" label="Kelas" />
              </TabTrigger>
            </>
          ) : (
            <>
              <TabTrigger name="presensi" href="/presensi" asChild>
                <TabButton icon="home" label="Home" />
              </TabTrigger>
              <TabTrigger name="explore" href="/explore" asChild>
                <TabButton icon="clipboard" label="Riwayat" />
              </TabTrigger>
            </>
          )}

          <TabTrigger name="profil" href="/profil" asChild>
            <TabButton icon="person" label="Akun" />
          </TabTrigger>
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

export function TabButton({
  icon,
  label,
  isFocused,
  ...props
}: TabTriggerSlotProps & { icon: string; label: string }) {
  const base = icon as string;
  const name = (isFocused ? base : `${base}-outline`) as IconName;

  return (
    <Pressable
      {...(props as unknown as PressableProps)}
      style={({ pressed }) => [styles.tabButton, pressed && { opacity: 0.7 }]}
    >
      <View style={[styles.pill, isFocused && styles.pillActive]}>
        <Ionicons
          name={name}
          size={22}
          color={isFocused ? authColors.white : authColors.muted}
        />
        <Text style={[styles.label, isFocused && styles.labelActive]}>{label}</Text>
      </View>
    </Pressable>
  );
}

export function CustomTabList(props: TabListProps) {
  const insets = useSafeAreaInsets();

  return (
    <View {...props} style={styles.wrap}>
      <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
        {props.children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
  },
  bar: {
    flexDirection: 'row',
    width: '100%',
    maxWidth: 560,
    backgroundColor: authColors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 10,
    paddingHorizontal: 12,
    justifyContent: 'space-around',
    shadowColor: '#1B2A4E',
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -4 },
    elevation: 10,
  },
  tabButton: { flex: 1, alignItems: 'center' },
  pill: {
    minWidth: 68,
    alignItems: 'center',
    gap: 3,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 16,
  },
  pillActive: { backgroundColor: authColors.navy },
  label: { color: authColors.muted, fontSize: 11, fontWeight: '600' },
  labelActive: { color: authColors.white, fontWeight: '700' },
});