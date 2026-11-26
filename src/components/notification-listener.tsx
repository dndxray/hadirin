import * as Notifications from 'expo-notifications';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

import { useAuth } from '@/context/auth-context';
import { subscribeMyNotifications } from '@/services/notification-service';

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

export function NotificationListener() {
  const { profile } = useAuth();
  const seen = useRef<Set<string> | null>(null);

  useEffect(() => {
    if (!profile?.uid) return;
    seen.current = null;

    if (Platform.OS !== 'web') {
      void Notifications.requestPermissionsAsync();
    }

    const unsubscribe = subscribeMyNotifications(profile.uid, (items) => {
      if (seen.current === null) {
        seen.current = new Set(items.map((n) => n.id));
        return;
      }
      for (const n of items) {
        if (seen.current.has(n.id)) continue;
        seen.current.add(n.id);
        if (Platform.OS !== 'web') {
          void Notifications.scheduleNotificationAsync({
            content: { title: n.title, body: n.body },
            trigger: null,
          });
        }
      }
    });

    return () => unsubscribe();
  }, [profile?.uid]);

  return null;
}