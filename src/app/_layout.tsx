import {
  MuseoModerno_700Bold,
  useFonts,
} from '@expo-google-fonts/museomoderno';
import {
  DarkTheme,
  DefaultTheme,
  Stack,
  ThemeProvider,
} from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useSyncExternalStore } from 'react';
import { ActivityIndicator, StyleSheet, useColorScheme, View } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { authColors } from '@/components/auth-ui';
import { AppProvider } from '@/context/app-context';
import { AttendanceProvider } from '@/context/attendance-context';
import { AuthProvider, useAuth } from '@/context/auth-context';
import { AsistenProvider } from '../../features/asisten/AsistenContext';

SplashScreen.preventAutoHideAsync();
const subscribeHydration = () => () => {};

function RootNavigator() {
  const { profile, loading } = useAuth();

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />

        <Stack.Protected guard={!profile && !loading}>
          <Stack.Screen name="login" />
          <Stack.Screen name="daftar" />
        </Stack.Protected>

        <Stack.Protected guard={!!profile || loading}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="(asisten)" />
          <Stack.Screen name="detail-sesi" />
          <Stack.Screen name="izin" />
        </Stack.Protected>
      </Stack>

      {loading ? (
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: authColors.white,
            },
          ]}
        >
          <ActivityIndicator size="large" color={authColors.navy} />
        </View>
      ) : null}
    </>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const mounted = useSyncExternalStore(subscribeHydration, () => true, () => false);
  const [fontsLoaded, fontError] = useFonts({ MuseoModerno_700Bold });

  if (!mounted || (!fontsLoaded && !fontError)) {
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AuthProvider>
        <AppProvider>
          <AttendanceProvider>
            <AsistenProvider>
              <AnimatedSplashOverlay />
              <RootNavigator />
            </AsistenProvider>
          </AttendanceProvider>
        </AppProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}