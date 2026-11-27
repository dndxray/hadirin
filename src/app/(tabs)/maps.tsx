import { Redirect } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { authColors } from '@/components/auth-ui';
import { BackButton } from '@/components/back-button';
import { LabMap } from '@/components/lab-map';
import { useAuth } from '@/context/auth-context';
import { hasRole } from '@/utils/roles';
import { LabManager } from '../../../features/lab-management/LabListScreen';

// Tinggi tetap peta untuk asisten. Peta sengaja tidak ditaruh di dalam
// ScrollView karena react-native-maps berebut gestur dengan scroll halaman.
const ASISTEN_MAP_HEIGHT = 300;

// Halaman Maps (SRS-23).
// - Praktikan: peta memenuhi layar.
// - Asisten: peta di atas, lalu pengelolaan laboratorium (SRS-22) di bawahnya.
export default function MapsScreen() {
  const insets = useSafeAreaInsets();
  const { profile, loading } = useAuth();

  if (loading) return null;
  if (!profile) return <Redirect href="/login" />;

  const isAsisten = hasRole(profile, 'asisten');
  // Ruang di bawah agar isi tidak tertutup tab bar.
  const tabBarSpace = insets.bottom + 84;

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
        <View style={styles.headerRow}>
          <BackButton />
          <View style={styles.headerText}>
            <Text style={styles.title}>Peta Laboratorium</Text>
            <Text style={styles.subtitle}>
              {isAsisten
                ? 'Lihat dan kelola laboratorium.'
                : 'Lokasi laboratorium dan posisi kamu.'}
            </Text>
          </View>
        </View>
      </View>

      {isAsisten ? (
        <>
          <View style={styles.mapFixed}>
            <LabMap />
          </View>
          <View style={styles.manager}>
            <LabManager bottomInset={tabBarSpace} />
          </View>
        </>
      ) : (
        <View style={[styles.mapWrap, { marginBottom: tabBarSpace }]}>
          <LabMap />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: authColors.background },
  header: {
    backgroundColor: authColors.navy,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerText: { flex: 1 },
  eyebrow: { color: '#B6C2DB', fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  title: { color: authColors.white, fontSize: 24, fontWeight: '800', marginTop: 4 },
  subtitle: { color: '#BBC7DC', fontSize: 14, lineHeight: 22, marginTop: 4 },

  // Praktikan: peta memenuhi sisa layar
  mapWrap: {
    flex: 1,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: authColors.white,
  },

  // Asisten: peta bertinggi tetap, pengelolaan lab mengisi sisanya
  mapFixed: {
    height: ASISTEN_MAP_HEIGHT,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: authColors.white,
  },
  manager: { flex: 1 },
});