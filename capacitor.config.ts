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
const isDev = process.env.NODE_ENV === 'development';

// Dev: live-reload from local Next.js server (set CAPACITOR_SERVER_URL for physical device)
// Prod: load from deployed Vercel URL (set CAPACITOR_PROD_URL to your https://... domain)
const devServerUrl = process.env.CAPACITOR_SERVER_URL ?? 'http://localhost:3000';
const prodServerUrl = process.env.CAPACITOR_PROD_URL ?? '';

const config: CapacitorConfig = {
  appId: 'com.rellay.app',
  appName: 'Rellay',
  webDir: 'public',
  server: isDev
    ? { url: devServerUrl, cleartext: true }
    : prodServerUrl
      ? { url: prodServerUrl }   // Option B: load from hosted URL (supports API routes)
      : undefined,               // Fallback: bundled assets (no API routes)
};

export default config;
