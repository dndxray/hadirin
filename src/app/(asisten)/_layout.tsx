import React from 'react';
import { Stack } from 'expo-router';
import { AsistenProvider } from '../../../features/asisten/AsistenContext';

export default function AsistenLayout() {
  return (
    <AsistenProvider>
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: '#2563EB',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: '600',
          },
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            title: 'Jadwal Praktikum',
          }}
        />
        <Stack.Screen
          name="sessions/[sessionId]"
          options={{
            title: 'Detail Sesi',
          }}
        />
      </Stack>
    </AsistenProvider>
  );
}
