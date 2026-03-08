#!/usr/bin/env bash
# Sync Capacitor iOS with your Mac's IP so the device can reach the dev server.
# Use this before opening Xcode and running on a physical device.
# Start the dev server first: npm run dev
set -e
IP=$(ipconfig getifaddr en0 2>/dev/null || true)
if [ -z "$IP" ]; then
  echo "Could not get Mac LAN IP (en0). Set CAPACITOR_SERVER_URL manually, e.g.:"
  echo "  CAPACITOR_SERVER_URL=http://192.168.1.100:3000 npx cap sync ios"
  exit 1
fi
URL="http://${IP}:3000"
echo "Using CAPACITOR_SERVER_URL=$URL (ensure 'npm run dev' is running)"
export CAPACITOR_SERVER_URL="$URL"
npx cap sync ios
