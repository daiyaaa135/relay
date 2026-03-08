import type { CapacitorConfig } from '@capacitor/cli';

/**
 * On a physical device, "localhost" is the device itself, not your dev machine.
 * If the app opens to a black screen after rebuild, the WebView is loading localhost and failing.
 *
 * To run on a real device:
 * 1. Start the dev server: npm run dev
 * 2. Set your Mac's LAN IP and sync/run, e.g.:
 *    CAPACITOR_SERVER_URL=http://$(ipconfig getifaddr en0 2>/dev/null || echo '192.168.1.100'):3000 npx cap sync ios && npx cap run ios
 * Or set CAPACITOR_SERVER_URL=http://YOUR_MAC_IP:3000 (find IP: System Settings → Network → Wi‑Fi → Details)
 */
const serverUrl = process.env.CAPACITOR_SERVER_URL ?? 'http://localhost:3000';

const config: CapacitorConfig = {
  appId: 'com.rellay.app',
  appName: 'Rellay',
  webDir: 'public',
  server: {
    url: serverUrl,
  },
};

export default config;
