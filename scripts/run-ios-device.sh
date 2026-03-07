#!/usr/bin/env bash
# Run the app on a physical iOS device. The WebView must load from your Mac, not localhost.
# Start the dev server in another terminal first: npm run dev
set -e
IP=$(ipconfig getifaddr en0 2>/dev/null || true)
if [ -z "$IP" ]; then
  echo "Could not get Mac LAN IP (en0). Set CAPACITOR_SERVER_URL manually, e.g.:"
  echo "  CAPACITOR_SERVER_URL=http://192.168.1.100:3000 npx cap sync ios && npx cap run ios"
  exit 1
fi
URL="http://${IP}:3000"
echo "Using CAPACITOR_SERVER_URL=$URL (ensure 'npm run dev' is running)"
export CAPACITOR_SERVER_URL="$URL"
npx cap sync ios
npx cap run ios
