import {
  Tabs,
  TabList,
  TabTrigger,
  TabSlot,
  TabTriggerSlotProps,
  TabListProps,
} from 'expo-router/ui';
import {
  Pressable,
  type PressableProps,
  View,
  StyleSheet,
} from 'react-native';

import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useRole, type Role } from '@/hooks/use-role';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

export default function AppTabs() {
  const role = useRole();

  return (
    <Tabs>
      <TabSlot style={{ flex: 1, width: '100%' }} />

      <TabList asChild>
        <CustomTabList userRole={role}>
          {role === 'asisten' ? (
            <TabTrigger name="jadwal" href="/jadwal" asChild>
              <TabButton>Jadwal</TabButton>
            </TabTrigger>
          ) : (
            <>
              <TabTrigger name="index" href="/" asChild>
                <TabButton>Presensi</TabButton>
              </TabTrigger>
              <TabTrigger name="explore" href="/explore" asChild>
                <TabButton>Riwayat</TabButton>
              </TabTrigger>
            </>
          )}
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

export function TabButton({
  children,
  isFocused,
  ...props
}: TabTriggerSlotProps) {
  return (
    <Pressable
      {...(props as unknown as PressableProps)}
      style={({ pressed }) => [
        styles.tabButton,
        pressed && styles.pressed,
      ]}
    >
      <ThemedView
        type={isFocused ? 'backgroundSelected' : 'backgroundElement'}
        style={styles.tabButtonView}
      >
        <ThemedText
          type="small"
          themeColor={isFocused ? 'text' : 'textSecondary'}
        >
          {children}
        </ThemedText>
      </ThemedView>
    </Pressable>
  );
}

export function CustomTabList({
  userRole,
  ...props
}: TabListProps & { userRole: Role }) {
  return (
    <View {...props} style={styles.tabListContainer}>
      <ThemedView
        type="backgroundElement"
        style={styles.innerContainer}
      >
        <ThemedText type="smallBold" style={styles.brandText}>
          Hadirin
        </ThemedText>

        {props.children}

        <ThemedText
          type="small"
          themeColor="textSecondary"
          style={styles.roleText}
        >
          {userRole === 'asisten' ? 'Asisten' : 'Praktikan'}
        </ThemedText>
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  tabListContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    padding: Spacing.three,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  innerContainer: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.five,
    borderRadius: Spacing.five,
    flexDirection: 'row',
    alignItems: 'center',
    flexGrow: 1,
    gap: Spacing.two,
    maxWidth: MaxContentWidth,
  },
  brandText: {
    marginRight: 'auto',
  },
  roleText: {
    marginLeft: Spacing.three,
  },
  tabButton: {
    borderRadius: Spacing.three,
  },
  tabButtonView: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
  },
  pressed: {
    opacity: 0.7,
  },
});