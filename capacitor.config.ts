import type { CapacitorConfig } from '@capacitor/cli';

/**
 * On a physical device, "localhost" is the device itself, not your dev machine.
 * Loading http://localhost:3000 then fails (NSURLError -1004) and can surface as "JS Eval error".
 *
 * Simulator: npx cap sync ios (default localhost is fine).
 * Device: sync with your Mac's IP first, then run from Xcode:
 *   npm run cap:sync:ios:device   # then open Xcode and Run
 * Or full flow: npm run cap:ios:device (sync + launch on device).
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
