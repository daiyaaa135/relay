import { Capacitor } from '@capacitor/core';
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { createClient } from '@/lib/supabase';

type ListenerHandle = { remove: () => Promise<void> | void };

async function registerTokenWithServer(pushToken: string) {
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return;

    await fetch('/api/push/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        pushToken,
        platform: Capacitor.getPlatform(), // 'ios' | 'android'
      }),
    });
  } catch (err) {
    console.error('[Push] failed to register token with server', err);
  }
}

export function usePushNotifications(router: AppRouterInstance) {
  if (!Capacitor.isNativePlatform()) {
    return () => {};
  }

  const handles: ListenerHandle[] = [];

  (async () => {
    try {
      const { PushNotifications } = await import('@capacitor/push-notifications');

      const permStatus = await PushNotifications.requestPermissions();
      if (permStatus.receive !== 'granted') {
        console.log('[Push] Permission not granted', permStatus);
        return;
      }

      await PushNotifications.register();

      const registration = await PushNotifications.addListener('registration', (token) => {
        try {
          console.log('[Push] registration token', token.value);
          if (typeof window !== 'undefined') {
            window.localStorage.setItem('devicePushToken', token.value);
          }
          void registerTokenWithServer(token.value);
        } catch (err) {
          console.error('[Push] error storing token', err);
        }
      });

      const registrationError = await PushNotifications.addListener('registrationError', (error) => {
        console.error('[Push] registration error', error);
      });

      const received = await PushNotifications.addListener('pushNotificationReceived', (notification) => {
        console.log('[Push] notification received (foreground)', notification);
      });

      const actionPerformed = await PushNotifications.addListener(
        'pushNotificationActionPerformed',
        (event) => {
          console.log('[Push] notification action performed', event);
          const data = event.notification?.data as unknown as { url?: string } | undefined;
          const url = data?.url;
          if (url && typeof url === 'string') {
            router.push(url);
          }
        },
      );

      handles.push(registration, registrationError, received, actionPerformed);
    } catch (err) {
      console.error('[Push] setup error', err);
    }
  })();

  return () => {
    handles.forEach((h) => {
      try {
        void h.remove();
      } catch {
        // ignore listener removal errors
      }
    });
  };
}
