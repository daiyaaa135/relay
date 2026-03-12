# DATA-MAP.md - Data Structures & APIs

**Purpose:** Map every API endpoint, data model, and state management pattern from the Next.js web app.

## Core Data Models

### Gadget (Listing/Item)
```typescript
// From lib/types.ts
export interface Gadget {
  id: string;
  name: string;
  brand: string;
  category: string;
  credits: number;
  /** Optional listing status, e.g. 'Available', 'Reserved', 'Sold' */
  status?: string | null;
  condition: 'New' | 'Mint' | 'Good' | 'Fair' | 'Poor' | string;
  specs: string;
  description?: string | null;
  color?: string | null;
  carrier?: string | null;
  storage?: string | null;
  imei_number?: string | null;
  verification_code?: string | null;
  /** Front condition assessment from visual selector */
  front_condition?: string | null;
  /** Back condition assessment from visual selector */
  back_condition?: string | null;
  /** Functionality checklist: turns on/off, charges, has battery/case/SIM */
  functionality_verified?: boolean;
  image: string;
  images?: string[];
  seller: string;
  /** Seller's profile avatar URL for display on cards */
  sellerAvatarUrl?: string | null;
  /** Seller's profile (user) UUID, for creating swaps / messaging */
  sellerId?: string;
  sellerRating: number;
  /** Seller's profile created_at (ISO string) for "Joined Month Year" */
  sellerJoinedAt?: string | null;
  location?: {
    city: string;
    state: string;
    distance: number;
  };
  /** Optional coords for distance calculation when user location is known */
  latitude?: number;
  longitude?: number;
  /** Seller's 2 pickup locations; buyer chooses one when proposing times. displayName is full address when set. */
  pickupLocations?: { city: string; state: string; latitude: number; longitude: number; displayName?: string }[];
  isMemberListing?: boolean;
  /** When the listing was created (ISO string). Present when fetched for list views. */
  created_at?: string;
  /** Draft status — true if listing is saved but not yet published */
  is_draft?: boolean;
}
```

### DraftListing
```typescript
// Draft listing saved via "SAVE AS DRAFT" button available on all 7 listing steps
export interface DraftListing {
  id: string;
  user_id: string;
  /** Which step the user was on when they saved (1-7) */
  current_step: number;
  /** Partial gadget data collected so far */
  gadget_data: Partial<Gadget>;
  /** Verification screenshot URL if uploaded */
  verification_screenshot_url?: string | null;
  /** Generated verification code for photo step */
  verification_code?: string | null;
  created_at: string;
  updated_at: string;
}
```

### Swap
```typescript
// Core swap transaction between two users
export interface Swap {
  id: string;
  /** Truncated swap ID displayed in UI (e.g., "SW-A3F2...") */
  display_id: string;
  /** The gadget being swapped */
  gadget_id: string;
  gadget_name: string;
  gadget_image: string;
  /** User who initiated the swap (buyer) */
  buyer_id: string;
  buyer_username: string;
  /** User who listed the item (seller) */
  seller_id: string;
  seller_username: string;
  /** Swap status progression */
  status: 'Pending' | 'Pickup times proposed' | 'Pickup time confirmed' | 'Pickup arranged' | 'Completed' | 'Swap cancelled';
  /** Direction relative to the viewing user */
  direction: 'incoming' | 'outgoing';
  /** Credit amount for the swap */
  credits: number;
  /** Chosen pickup location */
  pickup_location?: {
    address: string;
    latitude: number;
    longitude: number;
  };
  /** Confirmed pickup date/time */
  pickup_time?: string; // ISO string
  pickup_time_end?: string; // ISO string for time range
  /** Associated conversation/chat thread ID */
  conversation_id?: string;
  created_at: string;
  updated_at: string;
}
```

### Review
```typescript
// Post-swap review left by a user
export interface Review {
  id: string;
  /** User who wrote the review */
  reviewer_id: string;
  reviewer_username: string;
  reviewer_avatar_url?: string | null;
  /** User being reviewed */
  reviewed_user_id: string;
  /** Star rating (1-5) */
  rating: number;
  /** Review text content */
  text: string;
  /** Reference to the swap this review is for */
  swap_id: string;
  /** Item that was swapped — displayed as "Swapped for [item name]" with image */
  gadget_name: string;
  gadget_image?: string;
  created_at: string;
}
```

### Transaction
```typescript
export interface Transaction {
  id: string;
  title: string;
  date: string;
  amount: number;
  type: 'credit' | 'debit';
  status: 'Completed' | 'Pending' | 'Automatic' | 'System';
  /** Display format: "+55 Cr" with directional arrow icon */
  display_amount: string;
  /** Reference to associated gadget name */
  gadget_name?: string;
}
```

### Message (Conversation)
```typescript
export interface Conversation {
  id: string;
  /** Type determines which tab the conversation appears in */
  type: 'swap' | 'chat';
  /** For swap conversations: the associated swap */
  swap_id?: string;
  /** For swap conversations: item name displayed in conversation row */
  gadget_name?: string;
  /** Swap status shown on swap-type conversations (e.g., "Pickup times proposed", "Pickup time confirmed", "Swap cancelled") */
  swap_status?: string;
  participants: string[];
  last_message: string;
  last_message_time: string;
  unread: boolean;
  avatar: string;
  username: string;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_username: string;
  content: string;
  /** System messages: "Buyer chose: [location]", "Pickup time confirmed below" */
  is_system_message: boolean;
  /** Item reference cards embedded in conversation */
  referenced_gadget?: {
    name: string;
    image: string;
  };
  /** Date/time confirmation pill (e.g., "Sat, Mar 7" / "6:00 pm") */
  pickup_time_confirmation?: {
    date: string;
    time: string;
    time_end?: string;
  };
  /** Read receipt status */
  read: boolean;
  read_at?: string;
  created_at: string;
}
```

### User/Profile
```typescript
// Based on analysis of profile-related code and live app
interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  bio?: string;
  avatarUrl?: string;
  /** Aggregate star rating (e.g., 4.3) — displayed with star visualization on profile */
  rating: number;
  /** Number of reviews contributing to the rating */
  review_count: number;
  joinDate: string; // ISO format — displayed as "Joined [Month Year]"
  location?: {
    city: string;
    state: string;
  };
  followersCount: number;
  followingCount: number;
  /** Shown as "Exchanges" on profile page (not "listingsCount") */
  exchangesCount: number;
  isFollowing?: boolean;
  isBlocked?: boolean;
}
```

### Membership / Subscription
```typescript
// Rellaey+ membership tiers
export interface Membership {
  user_id: string;
  /** Current tier */
  tier: 'guest' | 'rellaey_plus';
  /** Billing period if subscribed */
  billing_period?: 'monthly' | 'annual';
  /** Monthly: $4.99, Annual: ~$3.99/mo (20% savings) */
  price?: number;
  /** Stripe or PayPal subscription ID */
  payment_provider?: 'stripe' | 'paypal';
  subscription_id?: string;
  started_at?: string;
  expires_at?: string;
  status: 'active' | 'cancelled' | 'expired' | 'none';
}

// Tier feature definitions
export const MEMBERSHIP_TIERS = {
  guest: {
    name: 'Guest',
    price: 0,
    period: 'forever',
    features: [
      'Browse limited listing',
      'Advanced search & filters',
      'View full listing details',
    ],
  },
  rellaey_plus: {
    name: 'Rellaey+',
    monthlyPrice: 4.99,
    annualSavings: '20%',
    badge: 'Recommended',
    features: [
      'All Guest features',
      'Unlimited gadget listings',
      'Earn credits automatically',
      'Spend credits on swaps',
      'Rellaey+ credit dashboard',
      'Priority customer support',
      'Early access to drops',
    ],
  },
};
```

## API Endpoints

### Authentication Endpoints (Supabase)

#### Supabase Auth Integration
- **Provider:** Supabase Auth (email/password, **Google OAuth**)
- **Client:** `createClient()` from `lib/supabase.ts`
- **Methods:**
  - `supabase.auth.signInWithPassword()` - Email/password login
  - `supabase.auth.signInWithOAuth({ provider: 'google' })` - **Google OAuth login** ("Continue with Google" button on login screen)
  - `supabase.auth.signUp()` - Signup (7-step flow: email → password → display name → location → verify email → verify phone → verify SMS)
  - `supabase.auth.signOut()` - Logout
  - `supabase.auth.resetPasswordForEmail()` - Password reset (from forgot-password AND in-app Settings → Reset password)
  - `supabase.auth.updateUser()` - Update user
- **Session Management:** Automatic via Supabase client
- **iOS Note:** Google OAuth requires `ASWebAuthenticationSession` for iOS implementation

#### Custom Auth Endpoints
- **Email Verification:** `/api/email-verification` (custom verification flow)
- **Phone Verification:** Likely via Twilio/SMS integration
- **Location:** `lib/email-verification.ts`

### Device/Search Endpoints

#### Device Search
- **Endpoint:** `GET /api/devices/search`
- **Purpose:** Search devices with autocomplete
- **Query Params:** `?q={searchTerm}`
- **Response:** `{ devices: SearchDevice[] }`
- **Usage:** Used by `DeviceSearchBar` component
- **Features:** Debounced (200ms), min query length 1 character

#### SearchDevice Type
```typescript
interface SearchDevice {
  id: string;
  name: string;
  brand: string;
  category: string;
  // Additional fields for display
}
```

### Gadget/Listing Endpoints

#### Fetch Gadgets
- **Method:** Supabase query via `getGadgets()` in `lib/gadgets.ts`
- **Purpose:** Get paginated listings with filters
- **Parameters:** Category, brand, condition, location, pagination
- **Response:** `Gadget[]` with seller info joined

#### Create Listing
- **Method:** Supabase insert via `createGadget(userId, {...})` in `app/list/[step]/page.tsx`
- **Purpose:** Create new device listing
- **Entry points:** Bottom nav Swap button, Profile FAB, Listing detail "List similar", Browse "List one"
- **Flow:** **Category-dependent step count** (4-7 steps):
  - **Phones / Laptops / Tablets** — 7 steps: Your Device → Verification → Front Condition → Back Condition → Functionality → Photos → Review
  - **Video Games** — 4 steps: Your Device → Functionality → Photos → Review
  - **Console-like** — 5 steps: Your Device → Condition → Functionality → Photos → Review
  - **Other** — 6 steps: Your Device → Front Condition → Back Condition → Functionality → Photos → Review
- **Step 1 always:** YOUR DEVICE (category, brand, model, color, carrier, storage, IMEI)
- **Last step always:** REVIEW (location finalize)
- **Post-submit:** `handleSubmitListing` → `createGadget` → Pickup Locations modal (2 spots) → `updateGadgetPickupLocations` → credit award → clear draft → Coin Celebration → redirect
- **Validation:** Per-step validation (IMEI, verification status, functionality) via `handleNext`
- **Data payload:** name, brand, category, condition, specs, description, verification_code, credits, location, image_urls

#### Save Draft
- **Method:** Supabase upsert via `saveDraft()` (inferred)
- **Purpose:** Save partial listing progress from any step
- **Trigger:** "SAVE AS DRAFT" button available on all 7 listing steps
- **Data:** Current step number + all form data collected so far

#### Resume Draft
- **Method:** Supabase query for user's draft listings
- **Purpose:** Resume listing creation from where user left off
- **Response:** `DraftListing` with `current_step` to restore position

#### Update/Delete Listing
- **Methods:** `updateListing()`, `deleteListing()`
- **Permissions:** Only seller can modify
- **Status updates:** Available → Reserved → Sold

### Swap Endpoints

#### Create Swap
- **Method:** Supabase insert
- **Purpose:** Initiate a swap request on a listing
- **Creates:** Swap record + associated conversation in "Swap" tab

#### Get My Swaps
- **Method:** Supabase query
- **Purpose:** Fetch user's swaps, split by direction
- **Tabs:**
  - **Incoming** — swaps where others are sending to the user (count displayed)
  - **Outgoing** — swaps the user initiated (count displayed)
- **Response:** `Swap[]` with status badges, credit amounts

#### Update Swap Status
- **Method:** Supabase update
- **Purpose:** Progress swap through status stages
- **Status flow:** Pending → Pickup times proposed → Pickup time confirmed → Pickup arranged → Completed (or Swap cancelled at any point)

#### Propose Pickup Times
- **Method:** Supabase insert/update
- **Purpose:** Buyer proposes pickup times in chat thread
- **Data:** Date, time range, chosen pickup location

#### Confirm Pickup Time
- **Method:** Supabase update
- **Purpose:** Seller confirms one of the proposed times
- **Creates:** "Pickup confirmed" banner in chat, updates swap status

### Review Endpoints

#### Submit Review
- **Method:** Supabase insert
- **Purpose:** Leave a review after swap completion
- **Data:** `Review` object with rating (1-5), text, swap reference

#### Get User Reviews
- **Method:** Supabase query
- **Purpose:** Fetch reviews for a user's profile "Reviews" tab
- **Response:** `Review[]` with reviewer info, rating, item reference
- **Aggregation:** Server computes average rating and review count for profile display

### User/Profile Endpoints

#### Get User Profile
- **Method:** Supabase query via profiles functions
- **Location:** `lib/profiles.ts`
- **Functions:** `getProfileByUsername()`, `getCurrentUserProfile()`
- **Response:** `UserProfile` with stats (includes `exchangesCount`, `rating`, `review_count`)

#### Update Profile
- **Method:** Supabase update
- **Flow:** Multi-step edit (name, bio, email, phone, verification)
- **Verification:** Separate email and phone verification flows

#### Follow/Unfollow
- **Methods:** `followUser()`, `unfollowUser()`
- **Relationship:** Many-to-many followers table
- **Counters:** Increment/decrement follower counts

### Messaging Endpoints

#### Get Conversations
- **Method:** Supabase query
- **Location:** `lib/conversations.ts`
- **Response:** `Conversation[]` split by type:
  - **Swap conversations** (`type: 'swap'`) — linked to swap transactions, show item name and swap status
  - **Chat conversations** (`type: 'chat'`) — general inquiries from Message button on listings

#### Get Chat Messages
- **Method:** Real-time via Supabase subscriptions
- **Features:** Unread counts, typing indicators, delivery status, **read receipts** ("Read" indicator)
- **System messages:** "Buyer chose: [location]", "Pickup time confirmed below"
- **Embedded content:** Item reference cards (image + name), date/time confirmation pills, pickup confirmed banners

#### Create Conversation
- **Trigger:** Message button on listing or profile
- **Creates:** New conversation or returns existing
- **Type assignment:** If initiated from a swap → 'swap' type, otherwise → 'chat' type

### Membership/Payment Endpoints

#### Get Membership Status
- **Method:** Supabase query or Stripe API
- **Purpose:** Check user's current tier and subscription status
- **Response:** `Membership` object

#### Subscribe to Rellaey+
- **Method:** Stripe Checkout / PayPal integration
- **Purpose:** Purchase Rellaey+ subscription
- **Options:** Monthly ($4.99/mo) or Annual (20% savings)
- **Checkout:** "Rellaey Secure Checkout" with Stripe + PayPal logos

#### Manage Subscription
- **Method:** Stripe customer portal / PayPal management
- **Purpose:** Cancel, upgrade, or change billing period
- **Access:** Settings → Subscription → Manage Rellaey+ Plan

### Wallet/Credits Endpoints

#### Get Wallet Balance
- **Method:** Supabase query
- **Response:** Available credits count, transaction history
- **Display:** "Available credits: X Cr"

#### Get Transaction Ledger
- **Method:** Supabase query with pagination
- **Purpose:** Full transaction history ("Ledger" section)
- **Response:** `Transaction[]` with item name, date, status, credit delta (e.g., "+55 Cr")

### Wishlist Endpoints

#### Get Wishlist
- **Method:** Supabase query
- **Response:** Saved gadgets with count (e.g., "1 Saved Items")

#### Add/Remove Wishlist Item
- **Method:** Supabase insert/delete
- **Purpose:** Save/unsave listings

#### Clear All Wishlist
- **Method:** Supabase delete all
- **Purpose:** "Clear All" button removes all saved items

### Location/Geo Endpoints

#### Location Services
- **Location:** `lib/geo.ts`
- **Functions:** `getUserLocation()`, `calculateDistance()`
- **Integration:** Browser Geolocation API
- **Usage:** Distance calculation for listings, meetup map in chat threads

#### Pickup Locations
- **Storage:** Array in gadget `pickupLocations`
- **Purpose:** Seller specifies 2 meetup locations
- **Map Display:** `PickupLocationsMap` component
- **Chat integration:** Embedded map with "Meet here" marker, user avatar marker, distance display (e.g., "2.0 mi away")

### Device Data Endpoints

#### Device Databases
- **IMEI Database:** `lib/imeidb.ts` - Device identification
- **TAC Lookup:** `lib/tacLookup.ts` - Type Allocation Code lookup
- **Model Aliases:** `lib/modelAliases.ts` - Device name normalization
- **Color Databases:** `lib/phoneColors.ts`, `lib/laptopColors.ts`, `lib/tabletColors.ts`, `lib/accessoryColors.ts`

#### Device Verification
- **IMEI Verification:** `lib/imeiVerification.ts`
- **Purpose:** Validate device authenticity during listing Step 2 (VERIFICATION)
- **Process:** User uploads About page screenshot; system verifies IMEI, carrier, and storage match the values entered in Step 1

## State Management Analysis

### Client-Side State

#### Auth State (Supabase)
- **Provider:** Supabase client manages session
- **Access:** `supabase.auth.getSession()`
- **Persistence:** Local storage/cookies via Supabase
- **Real-time:** Session state updates
- **OAuth:** Google OAuth state handled via Supabase OAuth flow

#### Listing Creation Context
- **Location:** `app/list/ListingContext.tsx`
- **Purpose:** Multi-step form state management
- **State:** Form data across **category-dependent steps** (4-7 steps depending on category)
- **Features:** Unsaved changes detection, navigation blocking via `requestLeave()`, **draft save/resume** (stored as `relay_listing_draft`)
- **Step logic:** `app/list/[step]/page.tsx` determines step sequence based on selected category
- **Includes:** category, brand, model, conditions, photos, location, valuation data
- **Post-submit state:** newGadgetId, pickup locations, celebration state, pending credits

#### UI State
- **Theme:** Dark/light mode via CSS custom properties, **toggled via Appearance setting in Settings**
- **Navigation:** URL-based routing (Next.js)
- **Modals:** Local state for filter panels, etc.
- **Loading:** Skeleton states, spinners (orange spinner with "Loading..." text on browse pages)

### Server State (React)

#### Data Fetching
- **Pattern:** `useEffect` + `useState` for API calls
- **Loading States:** `loading`, `error`, `data` pattern
- **Examples:** `DeviceSearchBar` uses debounced fetch

#### Real-time Updates
- **Supabase Subscriptions:** For chat messages, swap status changes
- **Realtime:** `supabase.from('table').on('*', callback)`
- **Usage:** Unread message counts, new messages, **read receipts**, swap status progression

## API Client Configuration

### Supabase Client
```typescript
// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

### Environment Variables
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anonymous key
- Other keys for services (Mapbox, email, SMS, **Stripe**, **PayPal**, etc.)

### Error Handling
- **Supabase Errors:** Standard Supabase error format
- **Network Errors:** Try/catch with user feedback
- **Validation Errors:** Form-level validation with messages

## Data Flow Analysis

### Listing Creation Flow (Category-Dependent, 4-7 Steps)
```
Entry: /list → redirect → /list/1 (or direct /list/1?similar=<id>)
🔄 Draft exists? → Resume draft modal (resume at saved step) or Start fresh

Step sequence determined by category:
  Phones/Laptops/Tablets (7): Device → Verification → Front → Back → Functionality → Photos → Review
  Video Games (4): Device → Functionality → Photos → Review
  Console (5): Device → Condition → Functionality → Photos → Review
  Other (6): Device → Front → Back → Functionality → Photos → Review

Each step: handleNext validates → router.push('/list/${step+1}')
"SAVE AS DRAFT" available at every step → saves to relay_listing_draft

Review step submit:
→ handleSubmitListing → createGadget(userId, data)
→ Pickup Locations modal (set 2 spots) → updateGadgetPickupLocations
→ Award credits (or store pending if no availability)
→ Clear draft → Coin Celebration (~3.2s)
→ Redirect: /settings/availability?onboarding=1&from=list OR /?listed=1
```

### Swap Flow
```
Browse Listing → Initiate Swap → Create Swap record + Conversation
→ Buyer proposes pickup times → Seller confirms time
→ Pickup arranged → Meet up → Complete swap
→ Leave review → Update ratings
```

### Search Flow
```
User types → Debounce (200ms) → API Call → Filter/Transform → Display Results
→ Select Result → Navigate to Browse Page
```

### Authentication Flow
```
Login (email/password OR Google OAuth) → Supabase Auth → Session Established → Redirect to Home
Signup → 7-step flow → Email verification → Phone verification → Welcome → Home
→ Session Persisted → Protected Routes Accessible
```

### Messaging Flow
```
View Listing → Message Seller → Create/Get Conversation (chat type)
OR Initiate Swap → Create Conversation (swap type)
→ Real-time Chat with system messages, item cards, map
→ Propose pickup times → Confirm time → Pickup confirmed banner
→ Meetup → Swap Completion → Review prompt
```

### Membership Flow
```
More → Membership → View tiers (Guest vs Rellaey+)
→ Select Monthly/Annual toggle → "Get Rellaey+ Monthly/Annual"
→ Stripe/PayPal checkout → Subscription active
→ Settings → Manage Rellaey+ Plan (cancel/change)
```

## Constants & Configuration

### Condition Constants
```typescript
// lib/constants.ts
export const CONDITION_BG: Record<string, string> = {
  New: '#00C896',    // Teal
  Mint: '#00C2D4',   // Cyan
  Good: '#3B82F6',   // Blue
  Fair: '#F5A623',   // Orange
  Poor: '#EF4444',   // Red
};

export const CONDITION_TEXT: Record<string, string> = {
  New: '#FFFFFF',
  Mint: '#FFFFFF',
  Good: '#FFFFFF',
  Fair: '#FFFFFF',
  Poor: '#FFFFFF',
};
```

### Swap Status Colors
```typescript
export const SWAP_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  'Pickup arranged': { bg: '#FF5721', text: '#FFFFFF' },  // Orange badge
  'Pickup times proposed': { bg: '#FF5721', text: '#FFFFFF' },  // Orange badge
  'Pickup time confirmed': { bg: '#FF5721', text: '#FFFFFF' },  // Orange badge
  'Completed': { bg: '#00C896', text: '#FFFFFF' },  // Green badge
  'Swap cancelled': { bg: '#EF4444', text: '#FFFFFF' },  // Red badge
  'Pending': { bg: '#F5A623', text: '#FFFFFF' },  // Amber badge
};
```

### Brand/Category Mapping (All 9 Categories)
```typescript
// lib/constants.ts
export const BRANDS_BY_CATEGORY: Record<string, string[]> = {
  'Phones': ['Apple', 'Samsung', 'Google', 'OnePlus', 'Motorola', 'LG', 'Nokia', 'T-Mobile', 'Sony', 'Xiaomi', 'Nothing'],
  'Laptops': ['Apple', 'Dell', 'HP', 'Lenovo', 'ASUS', 'Acer', 'Microsoft', 'Razer'],
  'Tablets': ['Apple', 'Samsung', 'Microsoft', 'Lenovo', 'Amazon'],
  'Headphones': ['Apple', 'Sony', 'Bose', 'Samsung', 'Beats', 'JBL', 'Sennheiser'],
  'Speaker': ['JBL', 'Bose', 'Sony', 'Sonos', 'Marshall', 'Ultimate Ears'],
  'Console': ['Sony', 'Microsoft', 'Nintendo'],
  'Video Games': ['Xbox', 'PlayStation', 'Nintendo', 'PC'],
  'MP3': ['Apple', 'Sony', 'SanDisk', 'FiiO'],
  'Gaming Handhelds': ['Nintendo', 'Valve', 'Sony', 'ASUS'],
};
```

### Category Display Config
```typescript
// 9 categories shown on home screen as gradient cards
export const CATEGORY_CARDS = [
  { name: 'Phones', gradient: 'warm beige/tan' },
  { name: 'Laptops', gradient: 'cool gray' },
  { name: 'Tablets', gradient: 'blue/indigo' },
  { name: 'Headphones', gradient: 'sage green' },
  { name: 'Speaker', gradient: 'neutral gray' },
  { name: 'Console', gradient: 'purple/lavender' },
  { name: 'Video Games', gradient: 'green' },  // shows Xbox badge
  { name: 'MP3', gradient: 'light gray' },
  { name: 'Gaming Handhelds', gradient: 'pink/rose' },
];
```

### Help Center Sections
```typescript
export const HELP_CENTER_SECTIONS = [
  'Account',
  'Legal',
  'Listing',
  'Swap',
  'Membership',
  'Safety',
  'Returns',  // Previously undocumented
];

export const FEATURED_ARTICLES = [
  'How Rellaey Credits Work',
  'How Swaps Work (Start to Finish)',
];
```

### Mock Data
- **Location:** `lib/constants.ts`
- **Purpose:** Development and testing
- **Examples:** `MOCK_GADGETS`, sample transactions, messages

## Local Storage Analysis

### What's Stored
- **Supabase Session:** Automatic by Supabase client
- **User Preferences:** Theme (dark/light) via CSS class, toggled by Appearance setting
- **Form Drafts:** Listing creation drafts (persisted to database via "SAVE AS DRAFT")
- **Recent Searches:** Possibly in search component
- **Geolocation:** User location for distance calculations

### Security
- **Tokens:** Supabase manages securely
- **Sensitive Data:** Not stored in localStorage (handled by Supabase)
- **Encryption:** Supabase provides encryption at rest
- **Payment:** Stripe/PayPal handle all payment data — no card details stored locally

## [NEEDS CLARIFICATION] Data Items

1. **Image Upload Flow:** ⚠️ Need to analyze how images are uploaded (direct to Supabase Storage? CDN?)
2. **Payment Integration:** Stripe + PayPal confirmed on membership screen — need exact integration details
3. **Push Notifications:** ⚠️ Web push vs native iOS notifications strategy
4. **Analytics:** ⚠️ What analytics are tracked? Events, conversions, errors?
5. **Error Tracking:** ⚠️ Error reporting service (Sentry, etc.)?
6. **Feature Flags:** ⚠️ A/B testing or feature flag system?
7. **Caching Strategy:** ⚠️ How are API responses cached? SWR, React Query, manual?
8. **Offline Support:** ⚠️ Does web app work offline? PWA capabilities?
9. **Review prompting:** ⚠️ When/how is the user prompted to leave a review after swap completion?
10. **Active swap banner data:** ⚠️ Real-time polling or push for counterparty status (e.g., "emilyroger289 is here")

## iOS Implementation Plan

### Network Layer (Devon)
- **Supabase Swift:** Use `supabase-swift` library
- **API Client:** `NetworkManager` with async/await
- **Models:** Swift structs with `Codable` conformance
- **Error Handling:** Custom error types with user-friendly messages

```swift
// Example Swift models
struct Gadget: Codable, Identifiable {
    let id: String
    let name: String
    let brand: String
    let category: String
    let credits: Int
    let condition: String
    let specs: String
    let image: String
    let images: [String]?
    let seller: String
    let sellerRating: Double
    let location: Location?
    let isDraft: Bool?
    let frontCondition: String?
    let backCondition: String?
    let functionalityVerified: Bool?
    let verificationCode: String?

    struct Location: Codable {
        let city: String
        let state: String
        let distance: Double
    }
}

struct Swap: Codable, Identifiable {
    let id: String
    let displayId: String
    let gadgetId: String
    let gadgetName: String
    let gadgetImage: String
    let buyerId: String
    let sellerId: String
    let status: String
    let direction: String
    let credits: Int
    let pickupLocation: PickupLocation?
    let pickupTime: Date?
    let conversationId: String?
    let createdAt: Date

    struct PickupLocation: Codable {
        let address: String
        let latitude: Double
        let longitude: Double
    }
}

struct Review: Codable, Identifiable {
    let id: String
    let reviewerId: String
    let reviewerUsername: String
    let reviewerAvatarUrl: String?
    let reviewedUserId: String
    let rating: Int
    let text: String
    let swapId: String
    let gadgetName: String
    let gadgetImage: String?
    let createdAt: Date
}
```

### Authentication (Devon)
- **Supabase Auth:** Use `supabase-swift` auth methods
- **Google OAuth:** `ASWebAuthenticationSession` for "Continue with Google"
- **Keychain:** Store tokens securely in Keychain
- **Session Management:** `AuthManager` observable object
- **Biometrics:** Face ID/Touch ID integration

### Local Storage (Devon)
- **UserDefaults:** For preferences (theme, etc.)
- **FileManager:** For cached images
- **Core Data/SwiftData:** For offline cache if needed
- **Keychain:** For sensitive data

### Real-time Updates (Devon)
- **Supabase Realtime:** Swift client for real-time subscriptions
- **Combine:** For reactive state updates
- **Background Updates:** Silent push notifications
- **Active Swap Banner:** Real-time counterparty status updates

### Image Handling (Devon/Jordan)
- **Upload:** Direct to Supabase Storage
- **Caching:** `URLCache` + custom disk cache
- **Processing:** Compression, resizing
- **Progress:** Upload progress indicators
- **Verification photos:** Require verification code visible in frame

### Mapping Integration (Devon)
- **MapKit:** Native iOS maps (replace Mapbox GL)
- **Annotations:** Custom markers for pickup locations ("Meet here" pin, user avatar marker)
- **Geocoding:** `CLGeocoder` for address lookup
- **Permissions:** Location services authorization
- **Chat integration:** Embedded map in chat threads with distance display

### Payment Integration (Devon)
- **Stripe:** iOS SDK for Rellaey+ checkout
- **PayPal:** PayPal iOS SDK as alternative payment
- **StoreKit:** Consider Apple IAP for subscription management
- **Subscription management:** Via Settings → Manage Rellaey+ Plan

## Data Migration Considerations

### Web to iOS Data Sync
- **User Accounts:** Same Supabase auth, seamless transition
- **Listings:** Same database, both platforms access
- **Messages:** Real-time sync via Supabase
- **Preferences:** Need to sync theme, notifications
- **Swaps:** Same swap records, real-time status updates
- **Reviews:** Same review data, aggregate ratings computed server-side

### Offline-First Approach
- **Cache Strategy:** Cache frequently accessed data
- **Queue Actions:** Queue writes when offline, sync when online
- **Conflict Resolution:** Last-write-wins or manual resolution
- **Draft listings:** Persist locally and sync when online

### Performance Optimization
- **Pagination:** Implement cursor-based pagination
- **Image Optimization:** Lazy loading, progressive JPEG
- **Database Indexing:** Ensure proper Supabase indexes
- **Query Optimization:** Minimize data transferred

## API Analysis Progress

### Endpoints Analyzed
- **Authentication:** Supabase Auth + Google OAuth (complete)
- **Devices/Search:** `/api/devices/search` (complete)
- **Gadgets/Listings:** Supabase queries (complete)
- **Profiles:** Supabase queries (complete)
- **Messaging:** Supabase real-time with Swap/Chat types (complete)
- **Location:** Geolocation services (complete)
- **Swaps:** CRUD + status management (complete)
- **Reviews:** Submit + fetch for profile (complete)
- **Membership:** Stripe/PayPal checkout (complete)
- **Wallet:** Balance + ledger transactions (complete)
- **Wishlist:** CRUD + clear all (complete)

### Data Models Documented
- **Gadget/Listing:** Complete with all fields including draft support
- **DraftListing:** New — for Save as Draft feature
- **Swap:** New — core swap transaction model
- **Review:** New — post-swap review system
- **Transaction:** Updated with display format
- **Conversation/ChatMessage:** Updated with Swap/Chat types, system messages, read receipts
- **UserProfile:** Updated with exchangesCount, review_count
- **Membership:** New — subscription tier model

### State Management
- **Auth:** Supabase session management + Google OAuth
- **UI:** Local component state + Appearance toggle
- **Forms:** Context providers for multi-step flows (7 steps)
- **Drafts:** Persistent draft state for listing creation

### Remaining Analysis
- **Image upload flow** ⚠️
- **Payment/credits system** — Stripe + PayPal confirmed, need integration details
- **Analytics/error tracking** ⚠️
- **Push notifications** ⚠️
- **Active swap real-time updates** ⚠️

---

**Created By:** Aria (Project Architect)
**Phase:** 1 - Analysis
**Last Updated:** 2026-03-10
**Status:** ✅ COMPLETE - All core data models and APIs documented, including Swap, Review, Draft, and Membership models
