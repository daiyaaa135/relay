# Next.js → Swift/SwiftUI Rebuild Blueprint

Complete structured breakdown of the Relay (Rellaey) Next.js app for rebuilding as a native Swift/SwiftUI iOS application.

---

## 1. App Navigation & Page Flow

### All routes (Next.js App Router)

| Route | Purpose |
|-------|--------|
| `/` | Home – browse gadgets, filters, categories, upcoming meetup banner |
| `/login` | Email/password + OAuth (Google, Apple) sign-in |
| `/welcome` | Onboarding – phone entry or Google sign-in; redirects to signup or home |
| `/signup` | Signup entry |
| `/signup/email` | Email step |
| `/signup/password` | Password step |
| `/signup/display-name` | Display name |
| `/signup/location` | Location |
| `/signup/verify-email` | Email verification |
| `/signup/verify-sms` | SMS verification (phone flow) |
| `/signup/verify-phone` | Phone verification |
| `/forgot-password` | Forgot password |
| `/reset-password` | Reset password |
| `/profile` | Current user profile (redirect if not logged in) |
| `/profile/[username]` | Public profile by username |
| `/edit-profile` | Edit profile hub |
| `/edit-profile/name` | Edit name |
| `/edit-profile/bio` | Edit bio |
| `/edit-profile/phone` | Edit phone |
| `/edit-profile/email` | Edit email |
| `/edit-profile/email/verify` | Verify new email |
| `/edit-profile/phone/verify` | Verify new phone |
| `/wishlist` | Saved gadgets (wishlist) |
| `/list` | Start listing flow (swap/list device) |
| `/list/[step]` | Multi-step listing (1, 2, …) |
| `/listings` | My listings (active / swapped / deleted) |
| `/listing/[id]` | Listing detail – view, message seller, start swap |
| `/browse/[category]` | Browse by category (Phones, Laptops, etc.) |
| `/browse/[category]/[brand]/[model]` | Device model page – list this device |
| `/messages` | Conversation list |
| `/messages/[id]` | Chat thread for a conversation |
| `/meetup/[swapId]` | Meetup flow for a swap (pickup, confirm) |
| `/swaps` | My swaps (active exchanges) |
| `/wallet` | Credits & transactions |
| `/more` | More menu – profile card, Wallet, Membership, My Swaps, My Listings, Settings |
| `/settings` | Settings hub |
| `/settings/availability` | Availability + Google Calendar |
| `/settings/notifications` | Notifications |
| `/pricing` | Membership / Pro plan |
| `/followers` | Followers list |
| `/following` | Following list |
| `/safety` | Safety hub |
| `/safety/blocked` | Blocked users |
| `/safety/reports` | Reports |
| `/report` | Report user |
| `/report/item` | Report listing |
| `/help` | Help hub |
| `/help/[articleId]` | Help article |
| `/help/contact` | Contact support |
| `/help/close-account` | Close account |
| `/about` | About |

### How pages connect

- **Entry:** `/` (home) or `/welcome` for new users. Unauthenticated users on `/more` are redirected to `/welcome`.
- **Auth:** `/login` and `/welcome` lead to sign-in or signup. After sign-in, redirect to `/profile` or `/`. Signup flows through `/signup/*` then typically `/` or profile.
- **Main tabs (bottom nav):** Home (`/`), Wishlist (`/wishlist`), Swap (`/list`), Messages (`/messages`), More (`/more`). Nav is hidden on login, signup, welcome, chat thread, and listing detail.
- **Listing flow:** `/list` → `/list/1`, `/list/2`, … (multi-step). From listing detail, “List similar” → `/list/1?similar=<id>`.
- **Browse:** Home category chips → `/browse/[category]`. Category page → `/browse/[category]/[brand]/[model]` → “List this device” → `/list/1`.
- **Listing detail:** `/listing/[id]` from home cards, wishlist, or browse. “Message” / “Start swap” → `/api/conversations/get-or-create` or `/api/swaps/get-or-create` → redirect to `/messages/[id]`.
- **Meetup:** Home “Upcoming meetup” banner or swap flow → `/meetup/[swapId]`. Report → `/report/item?…` or `/report?userId=…`.

### Conditional navigation

- **Auth guards:** `/profile` and `/profile/[username]` (own profile) redirect to `/login` if no user. `/more` redirects to `/welcome` if not logged in.
- **ListingContext:** When on `/list` with progress, leaving to another tab triggers `requestLeave` (confirm before losing draft).
- **Nav visibility:** Bottom nav hidden when `pathname` is in `['/login','/signup']`, or starts with `/signup`, or is `/welcome`, or `/messages/[id]`, or `/listing/[id]`.

### Navigation structure (hierarchy)

```
RootLayout (layout.tsx)
└── Layout (ListingProvider, BottomNav conditional)
    ├── / (Home)
    ├── /welcome
    ├── /login
    ├── /signup → /signup/email → /signup/password → /signup/display-name → /signup/location → verify-*
    ├── /profile, /profile/[username]
    ├── /edit-profile → edit-profile/name|bio|phone|email|*verify
    ├── /wishlist
    ├── /list → /list/1, /list/2, …
    ├── /listings
    ├── /listing/[id]  (no nav)
    ├── /browse/[category] → /browse/[category]/[brand]/[model]
    ├── /messages (list) | /messages/[id] (thread, no nav)
    ├── /meetup/[swapId]
    ├── /swaps
    ├── /wallet
    ├── /more → /wallet | /pricing | /swaps | /listings | /settings | /profile | /followers | /following
    ├── /settings → settings/availability | settings/notifications
    ├── /pricing
    ├── /followers, /following
    ├── /safety → safety/blocked | safety/reports
    ├── /report, /report/item
    └── /help → help/[articleId] | help/contact | help/close-account | /about
```

---

## 2. Screen Breakdown (selected key screens)

### Home (`/`)

- **Purpose:** Browse gadgets, apply filters, see categories, upcoming meetup banner, pull-to-refresh.
- **Components:** DeviceSearchBar, FilterIcon, WishlistHeartIcon, category chips, gadget cards, optional meetup card, bottom nav (via Layout).
- **State:** gadgets, loading, showFilters, searchQuery, selectedCategory, priceRange, distanceRange, selectedConditions, selectedBrands, selectedStorages, selectedCarrier, filterSubPanel, sortBy, wishlist, wishlistProfileId, userLocation, locationLoading, locationError, upcomingMeetup, catalogBrands, pullDistance, isRefreshing; refs for scroll and touch.
- **Interactions:** Search, open/close filter panel, category chip tap (navigate to browse or filter), wishlist heart toggle, card tap → `/listing/[id]`, meetup card → `/meetup/[swapId]` or `/messages/[id]`, pull-to-refresh; optional haptics (Capacitor).

### Login (`/login`)

- **Purpose:** Email/password sign-in; OAuth (Google, Apple) with redirect.
- **State:** email, password, error, loading, showPassword.
- **Interactions:** Submit form (client Supabase or POST `/api/auth/sign-in` on native), OAuth button → Supabase `signInWithOAuth` → redirect; link to signup.

### Welcome (`/welcome`)

- **Purpose:** Onboarding – collect phone or start Google sign-in.
- **State:** phone, showConfirmModal, googleLoading, googleError.
- **Interactions:** Phone input → confirm → `/signup/verify-sms?phone=…`; Google sign-in → redirect to `/` or continue signup.

### More (`/more`)

- **Purpose:** Profile card, Wallet, Membership, My Swaps, My Listings, Settings; followers/following counts; sign out.
- **State:** isLoggedIn, profile, profileLoading, followingCount, followerCount.
- **Interactions:** Tap profile → `/profile/[username]`; menu items → `/wallet`, `/pricing`, `/swaps`, `/listings`, `/settings`; followers/following → `/followers`, `/following`; sign out → Supabase signOut, then `/`.

### Listing detail (`/listing/[id]`)

- **Purpose:** Show gadget, seller, credits; message seller, start swap, report, list similar.
- **State:** Listing from `fetchGadgetById`, auth user, active swap if any, UI state for modals.
- **Interactions:** “Message” / “Start swap” → API get-or-create conversation/swap → `/messages/[id]`; “List similar” → `/list/1?similar=…`; report → `/report/item?…`; seller tap → `/profile/[id]`.

### Messages list (`/messages`)

- **Purpose:** List conversations; unread badge from Layout.
- **State:** Conversations (from Supabase), loading.
- **Interactions:** Row tap → `/messages/[id]`; unauthenticated → redirect to `/login`.

### Chat thread (`/messages/[id]`)

- **Purpose:** Show messages, send new message, view linked listing/swap, go to profile or report.
- **State:** Messages, conversation, other user, swap/gadget if linked; input text.
- **Interactions:** Send message (Supabase insert); navigate to profile, report, or listing.

### Wishlist (`/wishlist`)

- **Purpose:** Show saved gadgets (from wishlist IDs + fetch); open listing.
- **State:** wishlist IDs and profileId from `loadWishlist`, gadgets for those IDs, loading.
- **Interactions:** Card tap → `/listing/[id]`; empty state → “Browse” → `/?category=All`.

### List flow (`/list`, `/list/[step]`)

- **Purpose:** Multi-step “list a device” flow (category, device, condition, specs, photos, location, credits, etc.); draft in ListingContext.
- **State:** ListingContext (category, brand, modelName, condition, specs, photos, location, credits, etc.); step index from route.
- **Interactions:** Next/Back per step; leave confirmation via `requestLeave` when there is progress.

### Browse by category (`/browse/[category]`)

- **Purpose:** Show brands/devices for a category (e.g. Phones, Laptops); from CSV/catalog + API.
- **State:** category from route, brands/devices from API or static data.
- **Interactions:** Brand/model tap → `/browse/[category]/[brand]/[model]`; back → `/`.

### Browse device model (`/browse/[category]/[brand]/[model]`)

- **Purpose:** Show device and “List this device” CTA.
- **Interactions:** “List this device” → `/list/1` (with category/brand/model pre-filled in context).

---

## 3. Component Architecture

### Layout & shell

| Component | Parent | Children | Props | State | Reusable |
|-----------|--------|----------|-------|--------|----------|
| Layout | RootLayout | BottomNav (conditional), children | children | pathname, mainRef | No (root shell) |
| BottomNav | Layout | Links, central “Swap” button | — | pathname, hasUnreadMessages (from Supabase) | No |

### Icons (shared)

- HomeIcon, WishlistNavIcon, MessagesNavIcon, MoreNavIcon, WishlistHeartIcon, FilterIcon, EmailIcon, LockIcon, ListingsIcon, WalletIcon, ProfileIcon, SettingsIcon, SwapsIcon, etc. – used by Layout/More/Login; typically receive `className`; no meaningful state; reusable.

### Home & browse

| Component | Parent | Children | Props | State | Reusable |
|-----------|--------|----------|-------|--------|----------|
| DeviceSearchBar | Home | — | searchQuery, setSearchQuery, placeholder, etc. | — | Yes |
| Gadget cards (inline) | Home, Wishlist, Listings | Image, text, wishlist heart | gadget, wishlist state, onTap | — | Yes (as pattern) |

### Listing & swap

| Component | Parent | Children | Props | State | Reusable |
|-----------|--------|----------|-------|--------|----------|
| ListingContext (provider) | Layout | All children | — | Full draft (category, brand, model, condition, photos, location, credits, …), userId, authChecked, hasProgress, requestLeave | No |
| DeviceCaptureFlow | List step(s) | Camera, overlay | — | Capture state | Yes |
| PickupCalendarModal | Meetup / chat | Calendar UI | — | Date/time selection | Yes |
| LivePickupMap, MeetingSpotMap, PickupLocationsMap, LocationMapWithAvatar | Listing / meetup | Mapbox map | locations, center, etc. | Map instance | Yes |

### Profile & social

| Component | Parent | Children | Props | State | Reusable |
|-----------|--------|----------|-------|--------|----------|
| ProfileContent | profile/[username] | Tabs, listings, reviews, follow button | username | currentUserId, profile, listings, activeTab | Yes |
| RatingDisplay | Various | — | rating, count | — | Yes |

### UI primitives

| Component | Parent | Children | Props | State | Reusable |
|-----------|--------|----------|-------|--------|----------|
| Skeleton | Various | — | — | — | Yes |
| SuccessTransition | After list submit | — | — | — | Yes |
| CameraOverlay | DeviceCaptureFlow | — | — | — | Yes |
| SearchableGameDropdown | List (video games) | — | value, onChange, options | — | Yes |

---

## 4. API Integration

### Next.js API routes (server)

| Route | Method | Trigger | Body/Params | Response |
|-------|--------|---------|-------------|----------|
| `/api/auth/sign-in` | POST | Login form submit (native) | `{ email, password }` | `{ data: { session, user }, error }` |
| `/api/auth/sign-up` | POST | Signup | Body with email, password, options | Session or error |
| `/api/auth/verify-email-code` | POST | Verify email step | Code, etc. | — |
| `/api/auth/verify-sms-code` | POST | Verify SMS | — | — |
| `/api/auth/send-email-code` | POST | Request email code | — | — |
| `/api/auth/send-sms-code` | POST | Request SMS code | — | — |
| `/api/auth/forgot-password` | POST | Forgot password | — | — |
| `/api/auth/check-email` | — | Check email exists | — | — |
| `/api/auth/check-username` | — | Check username | — | — |
| `/api/conversations/get-or-create` | POST | “Message” on listing | `{ gadgetId, sellerProfileId }` | `{ conversationId }` |
| `/api/swaps/get-or-create` | POST | “Start swap” on listing | `{ gadgetId, sellerProfileId, creditsAmount }` | `{ swapId, conversationId }` |
| `/api/swaps/[id]/cancel` | POST | Cancel swap | — | — |
| `/api/swaps/[id]/complete` | POST | Complete swap | — | — |
| `/api/swaps/[id]/debit` | POST | Debit credits | — | — |
| `/api/swaps/[id]/rate` | POST | Rate after swap | — | — |
| `/api/swaps/[id]/location` | POST | Set meetup location | — | — |
| `/api/swaps/can-swap` | — | Check if user can swap | — | — |
| `/api/messages/mark-read` | POST | Mark thread read | — | — |
| `/api/browse/[category]` | GET | Browse category | category param | Brands/devices |
| `/api/browse/[category]/brands` | GET | Category brands | — | — |
| `/api/device-listings` | GET | Listings for device/category | Query | Listings |
| `/api/devices/search` | GET | Device search | — | — |
| `/api/devices/lookup` | GET | Device lookup | — | — |
| `/api/credits/listing` | POST | Get credits for listing | — | — |
| `/api/credits/swappa-lookup` | — | Swappa price | — | — |
| `/api/credits/pricecharting-lookup` | — | PriceCharting | — | — |
| `/api/condition/analyze` | POST | Analyze condition from image | — | — |
| `/api/ocr/verify-about` | POST | OCR verify (device) | — | — |
| `/api/ocr/verify-laptop-serial` | POST | Laptop serial OCR | — | — |
| `/api/profiles/[profileId]/reviews` | GET | Profile reviews | — | — |
| `/api/profiles/[profileId]/availability` | GET/POST | Availability | — | — |
| `/api/calendar/connect` | GET | Google Calendar connect | — | Redirect |
| `/api/calendar/callback` | GET | OAuth callback | — | — |
| `/api/calendar/sync` | — | Sync calendar | — | — |
| `/api/calendar/create-pickup-event` | — | Create event | — | — |
| `/api/push/register` | POST | Register push token | — | — |
| `/api/push/send` | POST | Send push | — | — |
| `/api/help/close-account` | POST | Close account | — | — |
| `/api/debug-log` | POST | Client debug logs | JSON payload | `{ ok }` |

### Client-side Supabase (no Next route)

- **Auth:** `getUser()`, `signInWithPassword()`, `signInWithOAuth()`, `signUp()`, `signOut()`, `verifyOtp()`, etc.
- **Tables:** `gadgets`, `profiles`, `wishlists`, `swaps`, `conversations`, `messages`, `transactions`, `reports`, `profile_follows`, `profile_availability`, `profile_google_calendar`.
- **Usage:** `lib/gadgets.ts` (fetchGadgets, fetchGadgetById, fetchGadgetsByProfileId), `lib/wishlist.ts` (loadWishlist, toggleWishlistItem, fetchWishlistIds), `lib/profiles.ts` (fetchProfile, updateProfile, follow/unfollow), `lib/swaps.ts`, `lib/conversations.ts`, `lib/transactions.ts`, `lib/reports.ts`, `lib/availability.ts`, `lib/googleCalendar.ts`. Home also queries `swaps` + `conversations` + `messages` for upcoming meetup.

---

## 5. Data Flow

- **API → page:** Next API routes return JSON; pages use `fetch` or server components. Supabase is used from client via `createClient()` from `lib/supabase` (env from `window.__SUPABASE_PUBLIC_ENV__` or `process.env.NEXT_PUBLIC_*`).
- **Page → components:** Data is passed as props (e.g. gadgets, profile, conversation). Lists use local state (useState) or data fetched in useEffect/useCallback.
- **Global state:** ListingContext holds the multi-step listing draft and auth-related flags; it wraps the app in Layout. No Redux; auth is Supabase session (getUser in each page or in Layout for nav).
- **Propagation:** Parent state → props to children; children callbacks (e.g. onTap, onSubmit) update parent state or trigger router.push.

---

## 6. Authentication / Authorization

- **Login:** Email/password via Supabase client or POST `/api/auth/sign-in` (native); OAuth (Google, Apple) via `signInWithOAuth` with `redirectTo` (e.g. `/profile` or `/`).
- **Signup:** Multi-step (email, password, display name, location, verify email/SMS/phone). Uses Supabase auth and optional Next API for verification.
- **Token/session:** Supabase stores session client-side (e.g. localStorage); server APIs receive `Authorization: Bearer <access_token>`.
- **Protected routes:** Profile and some screens redirect to `/login` or `/welcome` when `getUser()` returns no user.
- **Session handling:** No explicit refresh documented in blueprint; Supabase client handles refresh. Layout and pages call `getUser()` when needed.

---

## 7. External Services

- **Supabase:** Auth, Postgres (gadgets, profiles, wishlists, swaps, conversations, messages, transactions, reports, follows, availability, calendar link).
- **Twilio:** SMS verification (send/verify codes).
- **Google OAuth:** Sign-in and Google Calendar (availability).
- **Stripe:** Membership/pricing (NEXT_PUBLIC_STRIPE_*, stripe_secret_key).
- **Mapbox:** Maps on listing/meetup (NEXT_PUBLIC_MAPBOX_TOKEN).
- **Capacitor:** Native shell (iOS/Android), SplashScreen, Haptics, Camera, Geolocation, Push; optional CapacitorSwipeGesturesPlugin for pull-to-refresh.
- **Firebase Admin:** Used in project (e.g. push).
- **Email (SMTP):** Outlook/Microsoft 365 for transactional email.
- **OpenAI / Anthropic:** Condition analysis or other AI (API keys in env).
- **PriceCharting / Swappa / HiFiShark:** Credit/price lookups (API routes).
- **IMEIDB:** Device lookup (IMEIDB_API_TOKEN).

---

## 8. Important Business Logic

- **Condition display:** Map DB values (new, mint, good, fair, poor) to display labels; `conditionForColor` for badge colors (CONDITION_BG, CONDITION_TEXT).
- **Wishlist:** Logged out → localStorage; logged in → Supabase `wishlists`; on login, sync localStorage IDs to DB then clear local.
- **Listing draft:** Persisted in ListingContext; can be stored in sessionStorage/localStorage (VALUATION_STORAGE_KEY, LISTING_DRAFT_KEY).
- **Swap flow:** get-or-create swap + conversation; swap statuses (pending, confirmed, pickup_arranged, completed); debit credits, rate, complete.
- **Upcoming meetup:** Latest swap in pickup_arranged/completed for user; parse pickup time/location from conversation messages (`_type: pickup_accepted`, `pickup_proposal`); hide banner 20 min after completed.
- **Conversation unread:** Layout checks `messages` where `read_at` is null and sender ≠ current user to show Messages badge.
- **Validation:** Email/password required on login; signup steps validate format; API routes validate body (e.g. gadgetId, sellerProfileId, creditsAmount).

---

## 9. Assets & Styling

- **Styling:** Tailwind v4 (`@import "tailwindcss"`); `app/globals.css` for theme and custom classes.
- **Global styles:** CSS variables in `:root` and `.dark` (--primary #FF5721, --relay-bg, --relay-surface, --relay-text, --relay-muted, skeleton, filter-panel glass); `@theme inline` for Tailwind colors/fonts; body/input/textarea base styles; scroll/touch (e.g. -webkit-overflow-scrolling: touch).
- **Theme:** Light/dark via class `dark` on document; toggle stored in localStorage; Plus Jakarta Sans + Material Symbols Outlined (Google Fonts).
- **Components:** Shared classes for buttons (e.g. next-step-button, listing-nav-button), cards (glass-card), skeleton (skeletonShimmer disabled in globals), filter panel (filter-panel-bg); Mapbox CSS imported.
- **Assets:** apple-touch-icon, manifest.json; hero images (e.g. hero-headphone.png); no separate CSS modules per component in the main flow – Tailwind + globals.

---

## 10. Swift Rebuild Mapping

### Screens → SwiftUI Views

- One SwiftUI View (or View + ViewModel) per main route group: e.g. `HomeView`, `LoginView`, `WelcomeView`, `MoreView`, `WishlistView`, `ListingDetailView`, `MessagesListView`, `ChatThreadView`, `ProfileView`, `EditProfileView`, `ListFlowView` (with step state), `BrowseCategoryView`, `BrowseModelView`, `SwapsView`, `WalletView`, `SettingsView`, `MeetupView`, `ReportView`, `HelpView`, etc.
- Use `NavigationStack` and `NavigationLink` or programmatic `navigationDestination` for drill-down (listing, chat, profile).
- Tab bar: `TabView` with Home, Wishlist, Swap, Messages, More (same as web).

### Components → Reusable SwiftUI Views

- Icons: `Image(systemName:)` or custom SF Symbols / asset catalog.
- Gadget row: `GadgetRowView` (image, name, brand, credits, location).
- Search/filter: Custom `TextField` + filter state; consider `Sheet` for filter panel.
- Maps: MapKit or Mapbox SDK for iOS; wrap in a `MapView` (e.g. for meetup/pickup).
- Skeleton: `ProgressView` or custom `ShimmerView` using `redacted(reason:)` or shapes.
- Profile card, menu rows, buttons: Reusable `View` types with shared styling (colors from Config/Theme).

### API layer → Network service layer

- **Supabase:** Use Supabase Swift client (or REST) for auth and tables (gadgets, profiles, wishlists, swaps, conversations, messages). Mirror `lib/gadgets`, `lib/wishlist`, `lib/profiles`, `lib/swaps`, `lib/conversations` as async service methods.
- **Next.js API:** For routes that must run on your server (sign-in on native, get-or-create conversation/swap, credits, condition/OCR, calendar, push), call `URLSession` to `https://your-domain.com/api/...` with Bearer token in header. Keep same request/response shapes.
- **Auth:** Store Supabase session (access_token) in Keychain; restore on launch; use for Supabase and for Bearer on your API.

### State management → ObservableObject / ViewModel

- **Auth:** `AuthService` (ObservableObject): `currentUser`, `isAuthenticated`, `isLoading`; methods: signIn, signUp, signOut, restoreSession, fetchProfile. Inject via `@EnvironmentObject`.
- **Listing draft:** `ListingDraftStore` (ObservableObject) for multi-step list flow (category, brand, model, condition, photos, location, credits); persist to UserDefaults or Keychain if needed.
- **App-level:** `AppState` (ObservableObject): selectedTab, wishlistIds, unreadMessageCount (optional). Inject where needed.
- **Per-screen:** `@State` for local UI (loading, error, list data); for shared data (e.g. wishlist), use a shared service or `@EnvironmentObject` wishlist store.

### Navigation flow in Swift

- Root: if !isAuthenticated show `LoginView` or `WelcomeView`, else show `TabView` (Home, Wishlist, Swap, Messages, More).
- Hide “tab bar” on login, welcome, signup, chat thread, listing detail: use `navigationBarHidden` or a single `NavigationStack` that pushes full-screen views for those routes instead of showing tabs.
- List flow: `NavigationStack` with steps as separate views or one view with step index; “leave” = confirm dialog then clear draft and pop.

### Theming

- Define `Theme` or `Config` with primary (#FF5721), relay-bg, relay-surface, relay-text, relay-muted (light/dark).
- Use `Color(hex:)` or asset catalog; `@Environment(\.colorScheme)` for dark mode.

### Critical parity

- Replicate: auth (email + OAuth if supported on iOS), Supabase tables (gadgets, profiles, wishlists, swaps, conversations, messages), get-or-create conversation/swap and redirect to chat, listing detail → message/swap, meetup flow (if in scope), wallet/credits (read-only or simple), and More menu links. Stagger advanced features (calendar, OCR, complex listing steps) after core flows work.

---

*End of blueprint. Use this document as the single source of truth when rebuilding the Relay Next.js app in Swift/SwiftUI.*
