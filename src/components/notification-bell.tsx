import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { authColors } from '@/components/auth-ui';
import { NotificationSettings } from '@/components/notification-settings';
import { useNotifications } from '@/context/notification-context';

/**
 * Ikon lonceng kecil untuk header Home. Diketuk -> membuka pengaturan notifikasi.
 * Titik merah muncul kalau notifikasi butuh tindakan (izin belum diberikan / ditolak / error).
 */
export function NotificationBell({ style }: { style?: StyleProp<ViewStyle> }) {
  const insets = useSafeAreaInsets();
  const { status } = useNotifications();
  const [open, setOpen] = useState(false);

  const needsAttention =
    status.phase === 'denied' || status.phase === 'error' || status.phase === 'not-requested';

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={needsAttention ? 'Notifikasi, perlu tindakan' : 'Notifikasi'}
        onPress={() => setOpen(true)}
        hitSlop={6}
        style={({ pressed }) => [styles.bell, style, pressed && { opacity: 0.75 }]}
      >
        <Ionicons name="notifications" size={22} color="#2F5AA8" />
        {needsAttention ? <View style={styles.dot} /> : null}
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setOpen(false)}
      >
        <View style={styles.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} />
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.sheetHead}>
              <Text accessibilityRole="header" style={styles.sheetTitle}>Notifikasi</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Tutup"
                onPress={() => setOpen(false)}
                hitSlop={8}
              >
                <Ionicons name="close" size={24} color={authColors.ink} />
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <NotificationSettings />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  bell: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: authColors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    position: 'absolute',
    top: 9,
    right: 10,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#EF4444',
    borderWidth: 1.5,
    borderColor: authColors.white,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: authColors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 20,
    maxHeight: '80%',
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
  sheetHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sheetTitle: { color: authColors.navy, fontSize: 20, fontWeight: '800' },
});