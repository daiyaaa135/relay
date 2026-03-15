/**
 * Capacitor-aware OAuth helper for Supabase.
 *
 * On native (iOS/Android):
 *   - Opens the provider URL in SFSafariViewController (stays inside the app)
 *   - Uses a custom URL scheme (com.rellay.app://) so iOS routes the callback
 *     back to the app rather than opening Safari
 *   - Listens for the deep-link via @capacitor/app and exchanges the code for
 *     a Supabase session
 *
 * On web:
 *   - Falls back to window.location.href (standard redirect flow)
 */

import { Capacitor } from '@capacitor/core';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Provider } from '@supabase/supabase-js';

// Custom URL scheme registered in Info.plist
export const APP_SCHEME = 'com.rellay.app';
export const OAUTH_CALLBACK_PATH = `${APP_SCHEME}://auth/callback`;

export async function startNativeOAuth(
  supabase: SupabaseClient,
  provider: Provider,
  webRedirectTo?: string,
): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    // ── Web path ──────────────────────────────────────────────────────────
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: webRedirectTo },
    });
    if (error) throw error;
    if (data?.url) window.location.href = data.url;
    return;
  }

  // ── Native path ───────────────────────────────────────────────────────
  // Dynamic imports so the browser bundle never includes these packages.
  const [{ Browser }, { App }] = await Promise.all([
    import('@capacitor/browser'),
    import('@capacitor/app'),
  ]);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: OAUTH_CALLBACK_PATH,
      skipBrowserRedirect: true, // we'll open the URL ourselves
    },
  });

  if (error) throw error;
  if (!data?.url) throw new Error('No OAuth URL returned');

  // Open in SFSafariViewController — slides up inside the app, no Safari.app
  await Browser.open({ url: data.url, presentationStyle: 'popover' });

  // Wait for iOS to route the callback URL back via the custom scheme
  await new Promise<void>((resolve, reject) => {
    const listener = App.addListener('appUrlOpen', async (event) => {
      if (!event.url.startsWith(APP_SCHEME)) return;
      (await listener).remove();
      await Browser.close();

      try {
        const url = new URL(event.url);
        const code = url.searchParams.get('code');
        if (code) {
          const { error: exchangeError } =
            await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) reject(exchangeError);
          else resolve();
        } else {
          reject(new Error('No auth code in callback URL'));
        }
      } catch (err) {
        reject(err);
      }
    });
  });
}
