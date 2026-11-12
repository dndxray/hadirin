import React from 'react';
import { Stack } from 'expo-router';

export default function AsistenLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#2563EB' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '600' },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Jadwal Praktikum' }} />
      <Stack.Screen name="sessions/[sessionId]" options={{ headerShown: false }} />
    </Stack>
  );
}