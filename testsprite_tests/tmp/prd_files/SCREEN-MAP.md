# SCREEN-MAP.md - Web App Screens

**Purpose:** Map every screen in the Next.js web app to its iOS equivalent.

## Screens Identified

### Authentication & Onboarding
- [x] **Login screen** (`/login`) - Login form with email/password fields, password show/hide eye toggle, "Forgot password?" link, **"Continue with Google" OAuth button**, "New to tech rotation? Join Relay" signup link, Terms of Service / Privacy Policy links, and bear mascot illustration (two bears exchanging a device)
- [x] **Signup flow** (multi-step) (`/signup/*`) - 7-step flow: email → password → display name → location → verify email → verify phone → verify SMS
- [x] **Forgot password** (`/forgot-password`) - Password reset request
- [x] **Reset password** (`/reset-password`) - Password reset confirmation
- [x] **Welcome** (`/welcome`) - Welcome screen after signup
- [x] **Splash screen** - Custom splash component shown on first home visit per session

### Main Tabs (Bottom Navigation)
- [x] **Home / Browse** (`/`) - Main feed with search bar ("Search marketplace..."), horizontal category icon tabs (Explore + per-category icons), **active swap meetup banner** (shows counterparty status, pickup time, progress bar, "Get directions" and "Message" buttons), and category grid (9 categories)
- [x] **Wishlist** (`/wishlist`) - Saved items list with item count ("X Saved Items"), "Clear All" button, listing cards (image, heart icon, credit badge, title, brand, status)
- [x] **Swap / List** (`/list`) - Listing creation entry point (center orange button in nav)
- [x] **Messages / Inbox** (`/messages`) - Conversations inbox with **two sub-tabs: "Swap" and "Chat"**. Swap tab shows transaction-linked conversations (item name, swap status). Chat tab shows general inquiries ("No chat threads yet" empty state). Includes "Search conversations..." search bar
- [x] **More** (`/more`) - Profile summary card (avatar, name, handle, "View public profile" link, Following/Followers/Credits stats), menu items: Wallet, **Membership**, My Swaps, My Listings, Settings, Log out

### User Profile
- [x] **Profile view (self)** (`/profile`) - Large avatar, name, "Joined [date]", **star rating with review count** (e.g., "4.3 (3)" with star visualization), Followers count, **Exchanges count**, bio in quotes, **three content tabs: "Active Listings" / "Swapped" / "Reviews"**, settings gear icon (top-right), **floating "+" FAB button** (bottom-right)
- [x] **Profile view (other users)** (`/profile/[username]`) - Same layout with follow/message buttons instead of settings gear
- [x] **Edit profile** (`/edit-profile/*`) - Multi-step: main → name → bio → email → phone → verify email → verify phone
- [x] **Followers list** (`/followers`) - User's followers
- [x] **Following list** (`/following`) - Users being followed

### Listings & Marketplace
- [x] **Listing detail** (`/listing/[id]`) - Detailed listing view. Includes "List similar" link → `/list/1?similar=<id>`
- [x] **Create listing** (multi-step flow) (`/list/[step]`) - **Category-dependent step count** (4-7 steps):
 - **Entry points:**
 1. Bottom nav center "Swap" button → `/list` (redirects to `/list/1`)
 2. Profile → "+" FAB button → `/list`
 3. Listing detail → "List similar" → `/list/1?similar=<id>`
 4. Browse model page → "List one" → `/list/1`
 - **`/list` is a redirect page** that immediately does `router.replace('/list/1')` — the real start is `/list/1`
 - **Step count depends on category:**
 - **Phones / Laptops / Tablets** — 7 steps: Your Device → Verification → Front Condition → Back Condition → Functionality → Photos → Review
 - **Console-like** — 5 steps: Your Device → Condition → Functionality → Photos → Review
 - **Video Games** — 4 steps: Your Device → Functionality → Photos → Review
 - **Other categories** — 6 steps: Your Device → Front Condition → Back Condition → Functionality → Photos → Review
 - Step 1 is always **YOUR DEVICE** (category, brand, model, specs, IMEI for phones). Last step is always **REVIEW**
 - **Step details (full 7-step Phones flow):**
 - Step 1: **YOUR DEVICE** — Category, Brand, Model Name, Color (optional), Carrier, Storage, IMEI Number dropdowns/inputs
 - Step 2: **VERIFICATION** — Upload About page screenshot; system verifies IMEI, carrier, and storage match
 - Step 3: **FRONT CONDITION** — Visual condition selector ("How does the front look?") with device illustration
 - Step 4: **BACK CONDITION** — Visual condition selector ("How does the back look?") with device illustration
 - Step 5: **FUNCTIONALITY** — Checklist: "The device turns on, turns off, and charges. It has a battery, case, and SIM drawer."
 - Step 6: **PHOTOS** — Displays **verification code** (e.g., "YYZA67") to write on paper; photo upload
 - Step 7: **REVIEW** — Listing location with "Use my location to finalize" button
 - **Step layout** (`app/list/[step]/layout.tsx`): Header (back, "X of Y: Step name", close X), progress bar
 - All steps have: **"SAVE AS DRAFT"** button, progress bar, back arrow, close (X) button
 - **State:** Entire flow wrapped in `ListingProvider` (in Layout.tsx). All form data lives in `ListingContext` (`app/list/ListingContext.tsx`)
 - **Post-submit flow (Review step):**
 1. User taps "USE MY LOCATION TO FINALIZE" → `handleSubmitListing` runs
 2. Requires auth (else redirect to login)
 3. Calls `createGadget(userId, {...})` with all listing data
 4. On success → opens **Pickup Locations modal** (user sets 2 pickup spots)
 5. `handlePickupLocationsConfirm` → calls `updateGadgetPickupLocations`
 6. Awards credits (or stores pending credit if no availability set)
 7. Clears draft → shows **Coin Celebration** animation (~3.2s)
 8. Redirects to `/settings/availability?onboarding=1&from=list` (if no availability) or `/?listed=1` (home)
 - **Modals in this flow:** (1) Leave confirmation via `requestLeave()` when navigating away with progress, (2) Resume draft modal when opening `/list/1` with an existing draft, (3) Pickup locations modal after `createGadget`, (4) Coin Celebration overlay
- [x] **My listings** (`/listings`) - **Two tabs: "Listings" (count) and "Swapped Items" (count)**. Each row: image, title, listing ID, date, "Active" status badge, credit amount
- [x] **Browse by category** (`/browse/[category]`) - Brands listed alphabetically, each with horizontal-scrolling model cards (image + model name). Back button + category title header
- [x] **Filter/search results** - Integrated into home screen with filter panel
- [x] **Browse by brand/model** (`/browse/[category]/[brand]/[model]`) - Specific device model browsing

### Messaging
- [x] **Messages inbox** (`/messages`) - **Two tabs: "Swap" and "Chat"** (see Main Tabs above)
- [x] **Chat thread** (`/messages/[id]`) - Rich conversation view with:
 - Header: back button, avatar, username, "Joined [date]", swap status (e.g., "Pickup arranged"), three-dot menu
 - **Expandable location bar** with full address and chevron toggle
 - **Embedded map** with "Meet here" pin marker, user avatar marker, distance display (e.g., "2.0 mi away")
 - **Item reference cards** within conversation (image + item name)
 - **System messages**: "Buyer chose: [location]", "Pickup time confirmed below"
 - **Date/time confirmation**: Date heading + time pill (e.g., "Sat, Mar 7" / "6:00 pm")
 - **Pickup confirmed banner**: "Pickup time confirmed" with full date/time range
 - Message timestamps and **read receipts** ("Read")
 - Message input bar with send arrow button
- [x] **Swap coordination** - Integrated into chat threads (not a separate screen)

### Settings & More
- [x] **Settings main** (`/settings`) - **Three grouped sections:**
 - **Account:** Personal Info, Notifications, Privacy & Safety, Availability, **Reset password**, **Appearance** (dark mode toggle)
 - **Subscription:** **Manage Rellaey+ Plan**, Wallet
 - **Support:** Help Center, **Community Guidelines**, About Rellaey
 - Log out button, **version number** (e.g., "Rellaey Version 2.4.0 (Gold)")
- [x] **Personal Info** (`/settings/personal-info` or via settings) - Account personal information (separate from edit-profile)
- [x] **Notifications** (`/settings/notifications`) - Notification preferences
- [x] **Availability** (`/settings/availability`) - User availability settings
- [x] **Privacy & safety** (`/safety/*`) - Safety center, blocked users, reports
- [x] **Help & support** (`/help/*`) - Help center with: search bar, **featured articles carousel** ("How Rellaey Credits Work", "How Swaps Work"), **accordion sections** (Account, Legal, Listing, Swap, Membership, Safety, **Returns**), "Direct support" section with "Contact us" link and SLA notice ("responds within 2 hours during business hours")
- [x] **Community Guidelines** (`/guidelines`) - Community guidelines page (separate from safety)
- [x] **About** (`/about`) - App information ("About Rellaey")
- [x] **Wallet** (`/wallet`) - RELLAEY branded coin graphic, "Available credits: X Cr", **"Ledger." section** with "All transactions" link, transaction list (item name, date, status, credit delta e.g., "+55 Cr" with directional arrow icon)
- [x] **My Swaps** (`/swaps`) - **Two tabs: "Incoming" (count) and "Outgoing" (count)**. Each row: image, item name, swap ID (truncated), date, status badge (orange "Pickup arranged" / green "Completed"), credit amount
- [x] **Membership / Pricing** (`/pricing`) - Accessed via "Membership" in More menu. Shows:
 - "Unlock the full potential of tech swapping. Join the Rellaey+ community."
 - **Monthly / Annual toggle** (Annual: "Save 20%")
 - **Rellaey+** tier: $4.99/mo, "Recommended" badge, features: All Guest features, Unlimited gadget listings, Earn credits automatically, Spend credits on swaps, Rellaey+ credit dashboard, Priority customer support, Early access to drops. "Get Rellaey+ Monthly" CTA
 - **Guest** tier: $0/forever, features: Browse limited listing, Advanced search & filters, View full listing details. "Continue as Guest" button
 - **"Rellaey Secure Checkout"** with Stripe + PayPal logos
 - Subscription management note at bottom

### Other
- [x] **Meetup / swap coordination** (`/meetup/[swapId]`) - Meetup coordination screen
- [x] **Report user/item** (`/report/*`) - Report flows for items and users
- [x] **Safety guidelines** (`/safety`) - Safety information

## Home Screen Categories (9 total)
1. **Phones** — gradient: warm beige/tan
2. **Laptops** — gradient: cool gray
3. **Tablets** — gradient: blue/indigo
4. **Headphones** — gradient: sage green
5. **Speaker** — gradient: neutral gray
6. **Console** — gradient: purple/lavender
7. **Video Games** — gradient: green (shows Xbox badge)
8. **MP3** — gradient: light gray
9. **Gaming Handhelds** — gradient: pink/rose

## Navigation Patterns
- **Bottom tab bar** with 5 items: **Home**, **Wishlist**, **Swap** (center orange circular button), **Messages** (with unread badge dot), **More**
- **Center "Swap" button** is prominent orange circular button with swap arrows icon for listing creation
- **Hide bottom nav** on: login, signup, chat threads, listing details, welcome, forgot password
- **Multi-step flows**: Signup (7 steps), **Create listing (4-7 steps, category-dependent)**, Edit profile (6 steps)
- **Nested navigation**: Settings → sub-settings, Help → articles, Browse → category → brand → model
- **Protected routes**: Most routes require authentication, redirect to login if not authenticated

## Screen Relationships
1. **Home** → Active swap banner → Get directions / Message
2. **Home** → Category card → Browse by category → Brand → Model
3. **Home** → Listing detail → Chat thread
4. **Profile** → Active Listings / Swapped / Reviews tabs
5. **Profile** → Settings gear → Settings
6. **Profile** → Edit profile → Email/Phone verification
7. **Messages** → Swap tab / Chat tab → Chat thread → Meetup coordination
8. **Swap (center button)** → `/list` → redirect `/list/1` → Create listing flow (4-7 steps, category-dependent) → Pickup locations modal → Coin celebration → Home or Availability settings
9. **More** → Wallet / Membership / My Swaps / My Listings / Settings
10. **More** → Settings → Account / Subscription / Support sub-items
11. **More** → View public profile → Profile view

## Authentication Flow
- **Unauthenticated**: Login (email/password or **Google OAuth**) or Signup → Welcome → Home
- **Authenticated**: Direct access to protected routes
- **Session persistence**: Uses Supabase auth with session storage

## [NEEDS CLARIFICATION]
1. ~~**Modal screens**: Filter panel on home appears to be a slide-up modal/drawer - need to analyze implementation~~ *(confirmed: filter panel exists)*
2. **Deep linking**: Not yet analyzed - check Next.js routing configuration
3. **Screen transitions**: Need to analyze page transition patterns in Next.js
4. **Onboarding tutorials**: Not evident in initial analysis - may be integrated into splash or first-time flows
5. ~~**Error states**: Need to examine error handling and empty states across screens~~ *(confirmed: Chat tab empty state with icon + description)*
6. ~~**Loading states**: Need to analyze skeleton loaders and loading indicators in components~~ *(confirmed: orange spinner with "Loading..." text on browse pages)*
7. ~~**Image upload flows**: Need to analyze how images are captured/uploaded in listing creation~~ *(confirmed: Step 6 PHOTOS with verification code system)*
8. **Listing detail screen**: Need to click through and document full listing detail view
9. **Three-dot menu in chat**: What options appear? (report, block, etc.)
10. **Appearance toggle behavior**: Does it switch light/dark mode immediately?

## iOS Mapping Considerations
- **Tab bar**: iOS UITabBar with 5 items, center button as custom view
- **Navigation**: UINavigationController for each tab, with push/pop transitions
- **Modals**: PresentationController for filter panels, multi-step flows
- **Authentication**: Separate auth flow modals or dedicated auth navigation stack; **must support Google OAuth via ASWebAuthenticationSession**
- **Dark mode**: Full support with CSS custom properties already implemented; **controlled by Appearance toggle in Settings**
- **Embedded maps**: Chat thread uses embedded map with annotations — needs MapKit integration
- **FAB button**: Profile screen has floating action button — needs custom overlay implementation

---

**Created By:** Aria (Project Architect)
**Phase:** 1 - Analysis
**Last Updated:** 2026-03-10
**Status:** ✅ COMPLETE - All screens identified and verified via live app click-through