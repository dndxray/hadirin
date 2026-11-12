import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
  Stack,
} from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { ActivityIndicator, useColorScheme, View } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { authColors } from '@/components/auth-ui';
import { AppProvider } from '@/context/app-context';
import { AttendanceProvider } from '@/context/attendance-context';
import { AuthProvider, useAuth } from '@/context/auth-context';

SplashScreen.preventAutoHideAsync();

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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <ThemeProvider
      value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}
    >
      <AuthProvider>
        <AppProvider>
          <AttendanceProvider>
            <AnimatedSplashOverlay />
            <RootNavigator />
          </AttendanceProvider>
        </AppProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}