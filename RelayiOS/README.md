# Relay — Native iOS App

Native Swift/SwiftUI iOS app for the Relay gadget swapping marketplace. It uses your existing **Supabase** project and optional **Next.js API** for data.

## Requirements

- Xcode 15+
- iOS 17+
- Supabase project (same as the web app)
- Optional: Next.js dev server for browse/listing API

## Setup

### 1. Create an Xcode project

1. Open Xcode → **File → New → Project**
2. Choose **App** (iOS)
3. Product name: **Relay**
4. Team: your team
5. Organization Identifier: e.g. `com.yourcompany`
6. Interface: **SwiftUI**
7. Language: **Swift**
8. Save inside this folder: `RelayiOS/` (so the `Relay` folder with source is **inside** the Xcode project folder)

### 2. Add the source files

Copy or drag these into the Xcode project (ensure "Copy items if needed" and your app target are selected):

```
Relay/
├── RelayApp.swift
├── Config.swift          (in Services/)
├── Models/
│   ├── Gadget.swift
│   ├── Profile.swift
│   └── Message.swift
├── Services/
│   ├── AuthService.swift
│   ├── AppState.swift
│   └── APIClient.swift
└── Views/
    ├── RootView.swift
    ├── LoginView.swift
    ├── HomeView.swift
    ├── GadgetRow.swift      (in HomeView.swift)
    ├── ListingDetailView.swift
    ├── WishlistView.swift
    ├── SwapView.swift
    ├── MessagesView.swift
    ├── ChatView.swift       (in MessagesView.swift)
    └── MoreView.swift
```

If you created the project with the default **ContentView**, you can remove it and set the app entry to the `RelayApp` struct (already uses `@main`).

### 3. Configure Supabase (same as .env.local)

Use the same Supabase URL and anon key as your Next.js app.

**Option A — Edit Config.swift**

1. Open the web app’s **.env.local** (project root) and note:
   - `NEXT_PUBLIC_SUPABASE_URL` (e.g. `https://xxxx.supabase.co`)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (long string)
2. Open **Relay/Services/Config.swift** in the iOS project.
3. Replace the fallback values on the `supabaseURL` and `supabaseAnonKey` lines:
   - Change `"https://YOUR_PROJECT.supabase.co"` to your `NEXT_PUBLIC_SUPABASE_URL` value.
   - Change `"YOUR_ANON_KEY"` to your `NEXT_PUBLIC_SUPABASE_ANON_KEY` value.

**Option B — Xcode environment variables (no secrets in source)**

1. In Xcode: **Product → Scheme → Edit Scheme…** (or ⌘<).
2. Select **Run** → **Arguments** tab → **Environment Variables**.
3. Click **+** and add:
   - Name: `SUPABASE_URL`, Value: your Supabase URL (same as `NEXT_PUBLIC_SUPABASE_URL` in .env.local).
   - Name: `SUPABASE_ANON_KEY`, Value: your anon key (same as `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
4. Leave the fallbacks in Config.swift as placeholders; the app uses the scheme variables when set.

### 4. Gadgets and data

The app fetches **gadgets directly from Supabase** (same `gadgets` table and RLS as the web app). No Next.js server is required for browse or auth. Configure `Config.supabaseURL` and `Config.supabaseAnonKey`; `Config.apiBaseURL` is only needed if you add features that call your Next.js API (e.g. custom routes).

### 5. Run

1. Select a simulator or device.
2. Build and run (⌘R).

You should see the login screen; after signing in with the same Supabase credentials as the web app, you get the tab UI (Home, Wishlist, Swap, Messages, More).

## Structure

- **RelayApp.swift** — `@main` entry, wires `AuthService` and `AppState`.
- **RootView** — Shows login vs. main tabs based on auth.
- **MainTabView** — Five tabs: Home, Wishlist, Swap, Messages, More.
- **AuthService** — Supabase sign in / sign up / sign out and profile fetch.
- **APIClient** — Fetches gadgets (and optionally listing detail) from your API.
- **Models** — `Gadget`, `Profile`, `Conversation`, `ChatMessage` aligned with the web app.

## Next steps

- Implement **wishlist** (store IDs in Supabase or API and load in `WishlistView`).
- Implement **messages** (Supabase `conversations` / `messages` tables and real-time if desired).
- Add **swap flow** (create swap, propose times, etc.) calling your existing API or Supabase.
- Add **push notifications** (e.g. Supabase + APNs or your existing push setup).
- Use **Keychain** instead of `UserDefaults` for the Supabase access token.

## Notes

- The web app’s **Capacitor** build and this native app can coexist: same backend (Supabase + optional Next.js), different clients.
- For production, use an **xcconfig** or **Config.xcconfig** and avoid committing real keys; inject them via CI or environment.
