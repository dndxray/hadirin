import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { authColors } from '@/components/auth-ui';

// Versi web: react-native-maps tidak mendukung web, jadi tampilkan penjelasan.
export function LabMap() {
  return (
    <View style={styles.box}>
      <Ionicons name="map-outline" size={36} color={authColors.navy} />
      <Text style={styles.title}>Peta belum tersedia di web</Text>
      <Text style={styles.text}>
        Buka aplikasi di HP (Android/iOS) untuk melihat peta laboratorium.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 24,
    backgroundColor: authColors.white,
  },
  title: { color: authColors.ink, fontSize: 16, fontWeight: '800', textAlign: 'center' },
  text: { color: authColors.muted, fontSize: 13, lineHeight: 19, textAlign: 'center' },
});
