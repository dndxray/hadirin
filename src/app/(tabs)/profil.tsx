import { useGlobalSearchParams, useRouter } from 'expo-router';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { clearRole, useRole } from '@/hooks/use-role';

const ACCENT = '#2DD4BF';
const DANGER = '#EF4444';

export default function ProfilScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const paddingTop = Platform.OS === 'web' ? 100 : insets.top + 24;
  const role = useRole();
  const { userId } = useGlobalSearchParams<{ userId?: string }>();

  const isAsisten = role === 'asisten';
  const roleLabel = isAsisten ? 'Asisten Praktikum' : 'Praktikan';

  const handleKeluar = () => {
    clearRole();
    router.replace('/pilih-identitas');
  };

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[
        styles.content,
        { paddingTop, paddingBottom: insets.bottom + 32 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.inner}>
        <ThemedText type="smallBold" style={styles.eyebrow}>
          HADIRIN
        </ThemedText>

        {/* Header profil */}
        <View style={styles.header}>
          <View style={styles.avatar}>
            <ThemedText type="subtitle" style={styles.avatarText}>
              {isAsisten ? 'A' : 'P'}
            </ThemedText>
          </View>

          <View style={styles.headerText}>
            <ThemedText type="subtitle" style={styles.title}>
              Profil
            </ThemedText>
            <View style={styles.badge}>
              <ThemedText type="smallBold" style={styles.badgeText}>
                {roleLabel}
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Kartu informasi */}
        <View style={styles.card}>
          <InfoRow label="ID Pengguna" value={userId ?? '-'} />
          <View style={styles.divider} />
          <InfoRow label="Status" value="Aktif" />
        </View>

        {/* Tombol keluar */}
        <Pressable
          onPress={handleKeluar}
          style={({ pressed }) => [styles.logout, pressed && styles.pressed]}
        >
          <ThemedText type="smallBold" style={styles.logoutText}>
            Keluar
          </ThemedText>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <ThemedText type="small" style={styles.rowLabel}>
        {label}
      </ThemedText>
      <ThemedText type="smallBold" style={styles.rowValue}>
        {value}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: '#0B1120',
  },
  content: {
    paddingHorizontal: 22,
    alignItems: 'center',
  },
  inner: {
    width: '100%',
    maxWidth: MaxContentWidth,
    gap: Spacing.three,
  },
  eyebrow: {
    color: ACCENT,
    letterSpacing: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    marginBottom: Spacing.two,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1.5,
    borderColor: ACCENT,
    backgroundColor: '#12302F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: ACCENT,
  },
  headerText: {
    gap: Spacing.one,
    alignItems: 'flex-start',
  },
  title: {
    color: '#F8FAFC',
  },
  badge: {
    paddingVertical: 4,
    paddingHorizontal: Spacing.two,
    borderRadius: 999,
    backgroundColor: '#123F3A',
  },
  badgeText: {
    color: '#5EEAD4',
    fontSize: 12,
  },
  card: {
    backgroundColor: '#111C30',
    borderColor: '#263449',
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.two,
  },
  rowLabel: {
    color: '#94A3B8',
  },
  rowValue: {
    color: '#F8FAFC',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#263449',
  },
  logout: {
    marginTop: Spacing.two,
    paddingVertical: Spacing.two,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: DANGER,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    alignItems: 'center',
  },
  logoutText: {
    color: DANGER,
  },
  pressed: {
    opacity: 0.7,
  },
});