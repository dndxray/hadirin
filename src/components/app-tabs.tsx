import { Ionicons } from '@expo/vector-icons';
import {
  TabList,
  TabListProps,
  Tabs,
  TabSlot,
  TabTrigger,
  TabTriggerSlotProps,
} from 'expo-router/ui';
import { usePathname } from 'expo-router';
import {
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type PressableProps,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { authColors } from '@/components/auth-ui';
import { useRole, type Role } from '@/hooks/use-role';

type IconName = keyof typeof Ionicons.glyphMap;

// Bottom bar versi HP (Android/iOS). Dibuat sama dengan app-tabs.web.tsx.
// Setiap tab baru harus didaftarkan di KEDUA file.
export default function AppTabs() {
  const role = useRole();

  return (
    <Tabs style={{ flex: 1 }}>
      <TabSlot style={{ flex: 1, width: '100%' }} />
      <TabList asChild>
        <CustomTabList userRole={role}>
          <TabTrigger name="home" href="/home" asChild>
            <TabButton icon="home" label="Home" />
          </TabTrigger>
          {role === 'asisten' ? (
            <>
              <TabTrigger name="kelas" href="/kelas" style={styles.hidden} />
              <TabTrigger name="permissions" href="/permissions" style={styles.hidden} />
              <TabTrigger name="maps" href="/maps" style={styles.hidden} />
            </>
          ) : (
            <>
              <TabTrigger name="explore" href="/explore" style={styles.hidden} />
              <TabTrigger name="presensi" href="/presensi" style={styles.hidden} />
              <TabTrigger name="maps" href="/maps" style={styles.hidden} />
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
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: !!isFocused }}
      style={({ pressed }) => [styles.tabButton, pressed && { opacity: 0.7 }]}
    >
      <View style={[styles.pill, isFocused && styles.pillActive]}>
        <Ionicons
          name={name}
          size={22}
          color={isFocused ? authColors.navy : authColors.muted}
        />
        <Text style={[styles.label, isFocused && styles.labelActive]}>{label}</Text>
      </View>
    </Pressable>
  );
}

export function CustomTabList({
  userRole,
  ...props
}: TabListProps & { userRole: Role }) {
  const insets = useSafeAreaInsets();
  const compact = useWindowDimensions().width < 600;
  const pathname = usePathname();
  const showTabs = pathname === '/home' || pathname === '/profil';
  return (
    <View {...props} style={[styles.wrap, !showTabs && styles.hidden]}>
      <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        {!compact ? <Text style={styles.brandText}>Hadirin</Text> : null}
        {props.children}
        {!compact ? <View style={styles.separator} /> : null}
        {!compact ? (
          <View style={styles.roleBadge}>
            <View style={styles.roleDot} />
            <Text style={styles.roleBadgeText}>
              {userRole === 'asisten' ? 'Asisten' : 'Praktikan'}
            </Text>
          </View>
        ) : null}
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
    zIndex: 999,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
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
  hidden: { display: 'none' },
  brandText: {
    marginRight: 8,
    alignSelf: 'center',
    color: authColors.navy,
    fontSize: 14,
    fontWeight: '800',
  },
  separator: {
    width: 1,
    height: 24,
    backgroundColor: authColors.muted,
    opacity: 0.3,
    alignSelf: 'center',
    marginHorizontal: 8,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'center',
  },
  roleDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: authColors.navy,
  },
  roleBadgeText: { color: authColors.navy, fontSize: 14, fontWeight: '800' },
  tabButton: { flex: 1, alignItems: 'center' },
  pill: {
    minWidth: 68,
    alignItems: 'center',
    gap: 3,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 16,
  },
  pillActive: { backgroundColor: '#E8EDF5' },
  label: { color: authColors.muted, fontSize: 11, fontWeight: '600' },
  labelActive: { color: authColors.navy, fontWeight: '700' },
});