# Relay (Rellaey) — Product Specification for QA Testing
**Version:** 1.0
**Date:** 2026-03-12
**Prepared for:** Testprite QA Team
**App:** Rellaey — Credit-Based Gadget Swapping Marketplace

---

## 1. Product Overview

Rellaey is a local gadget swapping marketplace where users exchange tech items using an in-app credit economy. Users list devices (phones, laptops, tablets, headphones, gaming consoles, accessories), get an instant credit valuation, and arrange local pickup meetups with other users. There are no cash transactions — everything runs on credits.

### Platforms
| Platform | Stack | Status |
|----------|-------|--------|
| Web App | Next.js 16 (React 19, TypeScript) | Production |
| iOS App | Native Swift (UIKit/SwiftUI) | Development |
| Backend | Supabase (PostgreSQL + RLS + Realtime) | Production |

### Staging Environment
- **Web:** Next.js dev server (localhost:3000 or staging URL)
- **Database:** Supabase project (`.env.local` configured)
- **Auth:** Twilio (SMS/email OTP), Supabase Auth

---

## 2. User Roles

| Role | Access | Listing Limit | Credits |
|------|--------|--------------|---------|
| **Guest** (unauthenticated) | Browse listings, view profiles | 0 | None |
| **Free Member** | Browse + wishlist | Limited | Earn only |
| **Rellaey+** ($4.99/mo) | Unlimited listings, swaps, full features | Unlimited | Earn + spend |

---

## 3. Feature Inventory

### 3.1 Authentication

| Feature | Description |
|---------|-------------|
| Email signup | Enter email → verify 6-digit code (via Twilio) → set password |
| Phone signup | Enter phone → verify SMS code → set password |
| Email login | Enter email → receive OTP code → enter code |
| SMS login | Enter phone → receive OTP → enter code |
| Forgot password | Email-based password reset flow |
| Username validation | Real-time check for availability on signup |
| Email validation | Real-time check for existing account |
| Session persistence | Supabase JWT stored in browser |

**Auth Acceptance Criteria:**
- Invalid email format rejected before submission
- OTP expires after a reasonable window (retry/resend available)
- Duplicate email/username rejected with clear error message
- After login, user is redirected to home feed
- Unauthenticated users redirected to `/login` when accessing protected pages

---

### 3.2 Home / Explore Feed

| Feature | Description |
|---------|-------------|
| Category bar | Horizontal scroll: All, Phones, Laptops, Tablets, Headphones, Gaming, Relics, Accessories, Video Games |
| "Explore" category | Shows 2-column category card grid (no listings) |
| Listing feed | Full-width cards with golden-ratio image, overlaid title/seller/location/credits |
| Distance filter | Default 50-mile radius; listings outside radius not shown |
| Location required | Distance filtering only works when user has set location |
| Pull to refresh | Reload fresh listings from server |
| Infinite scroll / pagination | Load more listings as user scrolls |

**Acceptance Criteria:**
- Selecting "Explore" renders category grid, NOT the listing feed
- Selecting any other category filters the feed by that category
- Cards display: image, gadget name, condition badge, credits amount, seller name, city/state
- Listings marked `status != available` must not appear in the feed
- Distance shows correctly relative to user's saved location

---

### 3.3 Listing Detail Page (`/listing/[id]`)

| Element | Description |
|---------|-------------|
| Image gallery | Swipeable multi-photo carousel |
| Credits display | Prominent credit amount |
| Condition badge | new / mint / good / fair / poor |
| Device specs | Brand, model, storage, color, carrier (if applicable) |
| Seller info | Avatar, display name, rating, join date, link to profile |
| Pickup locations | Up to 2 seller-defined spots on map, user clicks to select |
| Description | Free-text seller description |
| Wishlist toggle | Heart icon — saves/removes from wishlist |
| "Swap" CTA button | Initiates swap flow (requires auth + sufficient credits) |
| Report button | Opens report listing form |

**Acceptance Criteria:**
- Unauthenticated user clicking Swap is redirected to login
- User with insufficient credits sees an appropriate error/message
- Seller cannot swap their own listing (Swap button hidden or disabled)
- Sold/removed listings show appropriate status (not swappable)
- Pickup location map renders with clickable markers
- Tapping a pickup location selects it (visual confirmation)

---

### 3.4 Listing Creation Wizard (`/list/[step]`)

Seven-step flow for creating a gadget listing:

| Step | Content |
|------|---------|
| 1 — Category | Select device category (phone, laptop, tablet, etc.) |
| 2 — Device | Search + select brand and model from catalog |
| 3 — Condition | Multi-photo condition capture (front, back, functionality) |
| 4 — Photos | Upload up to 8 additional listing photos |
| 5 — Specs | Storage, color, carrier, optional description |
| 6 — Location | Set 2 pickup locations on map |
| 7 — Review | Preview listing + credit estimate → publish |

**Special Flows:**
- **OCR Verification (Phones):** Camera overlay to capture "About" screen or serial number
- **AI Condition Analysis:** Photos analyzed via OpenAI Vision for condition scoring
- **Credit Estimation:** Automatic valuation via PriceCharting / Swappa API lookup

**Acceptance Criteria:**
- Cannot advance past each step without required fields filled
- Back navigation preserves previously entered data
- OCR step: detects and extracts device info from photo; user can confirm/edit
- Credit estimate is shown before final publish; user can see valuation breakdown
- Publishing creates a listing with `status = available`
- Draft listings are saved and resumable
- Non-Rellaey+ users see upgrade prompt when reaching listing limit

---

### 3.5 Swap Flow

| Step | Description |
|------|-------------|
| Initiate | Buyer taps Swap → selects pickup location → confirms credits |
| Pending | Swap created with `status = pending`; seller notified |
| Confirmed | Seller confirms swap; `status = confirmed`; credits held |
| Pickup Arranged | Seller proposes date/time; buyer confirms |
| Pickup (Live) | Both parties navigate to `/meetup`; real-time GPS tracking |
| Arrived | Seller marks arrived; buyer marks arrived |
| Complete | Final confirmation; credits transferred; `status = completed` |
| Rate | Both parties submit 1–5 star rating + optional comment |

**Swap Statuses:** `pending` → `confirmed` → `pickup_arranged` → `completed`
**Cancellation:** Either party can cancel before `pickup_arranged`

**Acceptance Criteria:**
- Buyer's credit balance is debited atomically on completion (not held prematurely)
- Seller's credit balance is credited on completion
- Swap cancellation before pickup restores buyer's reserved credits (if any)
- Gadget `status` changes to `pending_swap` when swap is confirmed, `swapped` when complete
- Completed gadget no longer appears in public feed
- Rating is one-time only per swap per user (no editing after submit)
- Rating updates seller's aggregate rating immediately

---

### 3.6 Messaging (`/messages`)

| Feature | Description |
|---------|-------------|
| Conversation list | All swap-linked conversations; sorted by most recent |
| Unread badge | Count of unread messages per conversation; total in nav tab |
| Real-time messages | Supabase Realtime subscription for instant delivery |
| Message input | Text-only; send on Enter / button press |
| Mark read | Messages marked read when conversation is opened |
| Swap context | Conversation shows linked gadget info at top |

**Acceptance Criteria:**
- Sending a message from buyer creates conversation if none exists
- New messages appear without page refresh
- Unread count updates in real-time
- Deleted/swapped listings still allow existing conversations to load
- Users cannot message themselves

---

### 3.7 Wishlist (`/wishlist`)

| Feature | Description |
|---------|-------------|
| Save listing | Heart icon on any card/detail page |
| View wishlist | Grid of saved listings |
| Remove from wishlist | Tap heart again to remove |
| Sold items | Still visible in wishlist with "Unavailable" badge |

**Acceptance Criteria:**
- Wishlist persists across sessions (stored in Supabase)
- Unauthenticated users prompted to sign in before saving
- Toggling heart on listing detail is reflected in wishlist page in same session
- Listing unavailable state clearly indicated

---

### 3.8 Swaps Dashboard (`/swaps`)

| Feature | Description |
|---------|-------------|
| Incoming tab | Swaps where current user is the seller |
| Outgoing tab | Swaps where current user is the buyer |
| Swap cards | Gadget image, name, credits, counterparty name, current status |
| Status indicators | Visual badges for each swap status |
| Action buttons | Confirm / Arrange Pickup / Mark Arrived / Complete / Rate (contextual) |
| Rating form | 1–5 stars + optional comment, submittable once |

**Acceptance Criteria:**
- Correct swaps appear in incoming vs outgoing tabs
- Contextual action buttons only appear for the active party at each step
- Completed swaps show rating prompt if not yet rated
- Already-rated swaps show submitted rating (read-only)

---

### 3.9 User Profile (`/profile/[username]`)

| Element | Description |
|---------|-------------|
| Avatar + display name | Profile photo, name, username |
| Join date | "Member since [month year]" |
| Star rating | Aggregate rating from completed swaps |
| Review count | Total ratings received |
| Review list | Recent written reviews with rater info |
| Active listings | Grid of user's available gadgets |
| Location | City, state (no precise coords) |

**Acceptance Criteria:**
- Private info (email, phone, exact address) never shown on public profile
- Own profile shows edit option; others do not
- Listings grid shows only `status = available` gadgets
- Rating reflects average of all received swap ratings

---

### 3.10 My Listings (`/listings`)

| Feature | Description |
|---------|-------------|
| Published listings | Cards with status badges |
| Draft listings | Incomplete listings resumable |
| Edit listing | Modify price, description, photos, pickup locations |
| Remove listing | Soft-delete; sets `status = removed` |
| Listing status | available / pending_swap / swapped / removed |

**Acceptance Criteria:**
- Edit saves changes without re-triggering full wizard
- Remove listing hides it from public feed immediately
- Listings in `pending_swap` or `swapped` cannot be edited or removed
- Draft listings persist between sessions

---

### 3.11 Wallet / Credits (`/wallet`)

| Feature | Description |
|---------|-------------|
| Balance display | Current credit balance prominently shown |
| Transaction history | Chronological ledger of all credit events |
| Transaction types | `listing_credit`, `swap_debit`, `swap_credit`, `monthly_fee`, `referral_bonus` |
| Transaction detail | Amount, description, date, type icon |

**Acceptance Criteria:**
- Balance is always consistent with transaction history sum
- Each swap completion creates exactly one debit (buyer) and one credit (seller)
- Monthly Rellaey+ fee appears as a debit transaction
- Transactions are read-only (no manual adjustments in UI)

---

### 3.12 Meetup / Live Pickup (`/meetup`)

| Feature | Description |
|---------|-------------|
| Map view | Full-screen Mapbox map centered on agreed pickup location |
| Live location | Both parties share real-time GPS position |
| Arrival status | "Arrived" button for each party |
| Completion | "Complete Swap" button after both parties arrive |
| Calendar event | Google Calendar pickup event (if connected) |

**Acceptance Criteria:**
- Map accurately shows agreed pickup location marker
- Live location updates within 30 seconds
- Completion button only enabled after both parties mark arrived
- Completed swap triggers credit transfer and status update

---

### 3.13 Settings (`/settings`)

| Feature | Description |
|---------|-------------|
| Notification preferences | Toggle: messages, swaps, pickup 30-min, pickup 15-min |
| Location update | Update pickup city/state and max distance radius |
| Account security | Change password |
| Membership | View/manage Rellaey+ subscription (Stripe) |
| Delete account | Initiate account closure (support flow) |

**Acceptance Criteria:**
- Notification preference toggles persist after page refresh
- Location update immediately affects distance filtering in feed
- Account deletion requires confirmation and is irreversible

---

### 3.14 Browse by Category (`/browse/[category]`)

| Feature | Description |
|---------|-------------|
| Category listing | All available gadgets in a category |
| Filter panel | Brand, condition, min/max credits, storage, carrier |
| Sort options | Distance (default), newest, credits low→high, high→low |
| Search bar | Text search within category |

**Acceptance Criteria:**
- Filters are combinable (AND logic)
- Applied filters persist on back navigation
- Clearing filters restores full category feed
- Search returns relevant results using fuzzy matching

---

## 4. Cross-Cutting Concerns

### 4.1 Responsiveness
- Web app must be fully functional on mobile viewport (375px) — it is primarily a mobile web app
- No horizontal overflow on any page
- Tap targets ≥ 44px

### 4.2 Error States
| Scenario | Expected Behavior |
|----------|------------------|
| Network offline | Graceful error message; no crash |
| API failure (500) | Toast/error message; form stays filled |
| Image upload failure | Error message; retry option |
| No listings in category | Empty state illustration + message |
| No messages | Empty state in inbox |
| Invalid swap state | Appropriate status message |

### 4.3 Loading States
- Every async data fetch should show a skeleton or spinner
- Buttons should show loading state while submitting
- No raw "Loading..." text — use skeleton cards for feeds

### 4.4 Authentication Guards
These pages require authentication (redirect to `/login` if not logged in):
- `/list/*`, `/listings`, `/swaps`, `/messages`, `/wishlist`, `/wallet`, `/settings`, `/meetup`

These pages are public:
- `/`, `/listing/[id]`, `/profile/[username]`, `/browse/[category]`, `/login`, `/signup`, `/help`

### 4.5 Credits Integrity
- Credits must never go negative
- Concurrent swaps must not double-spend credits (atomic DB transactions)
- Credit balance shown in nav/header must update after any transaction

---

## 5. Key User Flows (End-to-End Test Scenarios)

### Flow 1: New User Onboarding
1. Land on home page (guest)
2. Browse listings without signing in
3. Tap "Swap" on a listing → redirected to `/login`
4. Sign up with email → verify OTP → set password
5. Complete profile (display name, location)
6. Return to listing and initiate swap

### Flow 2: List a Gadget
1. Signed-in user taps "List" in nav
2. Step 1: Select "Phones"
3. Step 2: Search and select "iPhone 15 Pro"
4. Step 3: Capture condition photos (camera opens)
5. Step 4: Upload listing photos
6. Step 5: Select 256GB, Natural Titanium, Unlocked
7. Step 6: Set 2 pickup locations on map
8. Step 7: Review credit estimate → publish
9. Verify listing appears in `/listings` and public feed

### Flow 3: Complete a Swap
**Buyer:**
1. Browse home feed → tap listing
2. Review listing detail + seller profile
3. Select pickup location → tap "Swap"
4. Confirm credits
**Seller:**
5. Receives notification → opens `/swaps` → confirms
6. Proposes pickup date/time
**Buyer:**
7. Confirms pickup time
**Both:**
8. Navigate to `/meetup`
9. Both tap "Arrived"
10. Seller taps "Complete Swap"
11. Both rate each other
12. Verify: credits transferred, gadget marked swapped, ratings updated

### Flow 4: Message Before Swapping
1. Buyer navigates to listing detail
2. Taps message icon (not swap)
3. Sends a question to seller
4. Seller receives message in `/messages`
5. Seller replies
6. Buyer sees reply in real-time

### Flow 5: Wishlist Management
1. Browse feed → tap heart on 3 different listings
2. Navigate to `/wishlist`
3. Verify all 3 listings appear
4. Tap heart on one listing to remove
5. Verify only 2 remain

---

## 6. API Reference for Testing

### Base URL
`http://localhost:3000/api` (development) or staging URL

### Endpoints to Verify

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/api/auth/sign-up` | Register new user |
| `POST` | `/api/auth/sign-in` | Login |
| `POST` | `/api/auth/send-email-code` | Send OTP to email |
| `POST` | `/api/auth/verify-email-code` | Confirm email OTP |
| `POST` | `/api/auth/send-sms-code` | Send SMS OTP |
| `POST` | `/api/auth/verify-sms-code` | Confirm SMS OTP |
| `GET` | `/api/auth/check-email?email=` | Check email availability |
| `GET` | `/api/auth/check-username?username=` | Check username availability |
| `GET` | `/api/device-listings` | Get listings with filters |
| `POST` | `/api/credits/listing` | Credit seller on publish |
| `POST` | `/api/swaps/get-or-create` | Initiate swap |
| `POST` | `/api/swaps/[id]/complete` | Complete a swap |
| `POST` | `/api/swaps/[id]/cancel` | Cancel a swap |
| `POST` | `/api/swaps/[id]/rate` | Submit swap rating |
| `POST` | `/api/messages/mark-read` | Mark messages read |
| `POST` | `/api/condition/analyze` | AI condition analysis |
| `POST` | `/api/ocr/verify-about` | Extract device info via OCR |
| `GET` | `/api/phones/brands` | List phone brands |
| `GET` | `/api/phones/models?brand=` | List phone models |
| `GET` | `/api/devices/search?q=` | Fuzzy search device models |

### Auth Header
All authenticated requests require `Authorization: Bearer <supabase_jwt>` or Supabase cookie session.

---

## 7. Data Seeding for Testing

### Required Test Accounts
| Role | Email | Notes |
|------|-------|-------|
| Buyer A | `buyer@test.com` | Has 500 credits, no listings |
| Seller B | `seller@test.com` | Has 3 active listings across categories |
| Rellaey+ User | `plus@test.com` | Active membership, 10+ listings |
| New User | `new@test.com` | No credits, no listings, fresh account |

### Seed Data Requirements
- At least 20 gadget listings across all 8 categories
- At least 1 listing in each condition (new, mint, good, fair, poor)
- At least 2 completed swaps (for rating flow testing)
- At least 1 pending swap (for cancel flow testing)
- At least 5 messages across 2 conversations
- Listings in at least 3 different cities (for distance testing)

---

## 8. Known Constraints & Out of Scope

| Item | Note |
|------|------|
| Cash payments | No real money transactions; Stripe only for Rellaey+ subscription |
| Shipping | Local pickup only; no shipping functionality |
| Multiple simultaneous swaps | A gadget can only have one active swap at a time |
| Live location accuracy | GPS accuracy varies by device/browser permissions |
| OCR accuracy | Depends on image quality; manual override always available |
| Video uploads | Photos only (no video) |
| Group swaps | 1-to-1 only; no multi-party trades |

---

## 9. iOS App (Native Swift) Specific

The iOS app mirrors the web app's core features with native implementations:

| Screen | Component |
|--------|-----------|
| Home | `HomeView.swift` — category bar + listing feed (`GadgetCard`) |
| Explore | `ExploreCategoryGrid` — 2-column category grid |
| Wishlist | `WishlistView.swift` / `WishlistComponents.swift` |
| Navigation | `RelayTabBar` in `RootView.swift` (outline icons inactive, filled active) |
| Images | `FallbackAsyncImage.swift` — async loading with golden ratio crop |

**iOS-Specific Acceptance Criteria:**
- Category selection animates smoothly (no jank)
- Image golden ratio (1/1.618) maintained on all card sizes
- Tab bar icons: outline when inactive, filled when active, label hidden when inactive
- Scroll + card tap: no accidental taps while scrolling (uses `CardPressStyle` ButtonStyle)
- Splash screen shows on cold launch before home feed loads

---

## 10. Glossary

| Term | Definition |
|------|------------|
| **Credits** | In-app currency used for swaps; earned by listing/selling, spent by buying |
| **Swap** | A transaction where a buyer exchanges credits for a seller's gadget |
| **Pickup** | In-person exchange at an agreed location; local only |
| **Condition** | Device quality: new / mint / good / fair / poor |
| **Relic** | Category for vintage Apple devices (iPods, older Macs) |
| **Rellaey+** | Paid membership ($4.99/mo) unlocking unlimited listings |
| **OCR** | Optical Character Recognition used to verify device serial numbers |
| **Valuation** | Automatic credit price estimate based on market data (PriceCharting, Swappa) |
| **RLS** | Row-Level Security — Supabase's per-user data access control |
