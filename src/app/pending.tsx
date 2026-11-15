import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { authColors } from '@/components/auth-ui';
import { useAuth } from '@/context/auth-context';

export default function PendingScreen() {
  const insets = useSafeAreaInsets();
  const { logout } = useAuth();

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 40 }]}>
      <View style={styles.iconWrap}>
        <Ionicons name="time-outline" size={48} color="#D97706" />
      </View>
      
      <Text style={styles.title}>Akun Sedang Ditinjau</Text>
      <Text style={styles.subtitle}>
        Pendaftaran akun Asisten kamu sedang menunggu persetujuan dari Admin/Laboran. 
        Silakan cek kembali beberapa saat lagi.
      </Text>

      <Pressable 
        style={styles.button} 
        onPress={async () => {
          await logout();
          router.replace('/login');
        }}
      >
        <Text style={styles.buttonText}>Kembali ke Login</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: authColors.background, alignItems: 'center', paddingHorizontal: 24 },
  iconWrap: { width: 96, height: 96, borderRadius: 48, backgroundColor: '#FEF3C7', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  title: { fontSize: 24, fontWeight: '800', color: authColors.navy, marginBottom: 12, textAlign: 'center' },
  subtitle: { fontSize: 15, color: authColors.muted, textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  button: { backgroundColor: authColors.navy, paddingVertical: 16, borderRadius: 16, width: '100%', alignItems: 'center' },
  buttonText: { color: authColors.white, fontSize: 16, fontWeight: '800' },
});