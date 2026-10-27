import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
  Stack,
} from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { AppProvider } from '@/context/app-context';
import { AttendanceProvider } from '@/context/attendance-context';

SplashScreen.preventAutoHideAsync();

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
      <AppProvider>
        <AttendanceProvider>
          <AnimatedSplashOverlay />

          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="pilih-identitas" />
            <Stack.Screen name="detail-sesi" />
            <Stack.Screen name="(tabs)" />
          </Stack>
        </AttendanceProvider>
      </AppProvider>
    </ThemeProvider>
  );
}