Flow map # FLOW-MAP.md - Navigation Flows

**Purpose:** Map every user flow and navigation path from the Next.js web app.

## Legend
- ➡️ = Navigation flow
- 🔄 = Conditional flow (if/else)
- ⏭️ = Deep link/URL navigation
- 🚫 = Blocked/restricted flow (requires auth, etc.)
- 📱 = iOS navigation pattern
- ⚠️ = Needs clarification

---

## Authentication Flows

### App Launch Flow
```
Splash Screen (auto-hides) ➡️ Check auth state
 ├──➡️ If authenticated: Home Screen (`/`)
 └──➡️ If not authenticated: Login Screen (`/login`)
```

**iOS Pattern:**
- `SplashView` → Check `AuthManager` → Navigate to `HomeView` or `LoginView`
- **Navigation Type:** Programmatic (NavigationPath)
- **Notes:** Custom splash component shows on first home visit per session

### Login Flow
```
Login Screen (`/login`) ➡️ Choose auth method
 ├──➡️ Email/Password: Submit credentials
 │ ├──➡️ On success: Home Screen (`/`)
 │ └──➡️ On failure: Show error, stay on Login
 └──➡️ Continue with Google: OAuth flow
 ├──➡️ On success: Home Screen (`/`)
 └──➡️ On failure: Show error, stay on Login
```

**iOS Pattern:**
- `LoginView` → Supabase auth (email/password) OR `ASWebAuthenticationSession` (Google OAuth) → On success: `path.append(.home)`
- **Navigation Type:** Programmatic with error handling
- **Google OAuth:** Requires `ASWebAuthenticationSession` for web-based OAuth flow

### Signup Flow (7-step)
```
Signup Start (`/signup`) ➡️ Email (`/signup/email`) ➡️ Password (`/signup/password`)
➡️ Display Name (`/signup/display-name`) ➡️ Location (`/signup/location`)
➡️ Verify Email (`/signup/verify-email`) ➡️ Verify Phone (`/signup/verify-phone`)
➡️ Verify SMS (`/signup/verify-sms`) ➡️ Welcome (`/welcome`) ➡️ Home (`/`)
```

**iOS Pattern:**
- Multi-step flow using `NavigationStack` with step enum
- Each step validates before proceeding
- **Navigation Type:** Sequential push navigation with validation

### Forgot Password Flow
```
Forgot Password (`/forgot-password`) ➡️ Submit email
 ├──➡️ On success: Show confirmation
 └──➡️ On failure: Show error
```

**Reset Password Flow:**
```
Reset Password (`/reset-password`) ➡️ Submit new password
 ├──➡️ On success: Redirect to login
 └──➡️ On failure: Show error
```

**iOS Pattern:**
- `ForgotPasswordView` → API call → Show success message
- `ResetPasswordView` → API call → Navigate to login
- **Navigation Type:** Stay on screen with feedback or navigate on success

---

## Main App Navigation Flows

### Tab Navigation (Bottom Nav)
```
Home (`/`) ⬅️➡️ Wishlist (`/wishlist`) ⬅️➡️ Swap (center button) ⬅️➡️ Messages (`/messages`) ⬅️➡️ More (`/more`)
```

**iOS Pattern:**
- `TabView` with 5 tabs: Home, Wishlist, Swap, Messages, More
- Each tab has independent `NavigationStack`
- **Center button:** Custom view that navigates to `/list`
- **Navigation Type:** Tab selection

### Home Screen Flows
```
Home Screen (`/`) ➡️ Multiple entry points:
 ├──➡️ Tap listing card ➡️ Listing Detail (`/listing/[id]`)
 ├──➡️ Tap category card ➡️ Browse Category (`/browse/[category]`)
 ├──➡️ Tap category icon tab ➡️ Filter listings by category
 ├──➡️ Tap search bar ➡️ Search with autocomplete
 ├──➡️ Tap "Get directions" on swap banner ➡️ Google Maps (external)
 └──➡️ Tap "Message" on swap banner ➡️ Chat Thread (`/messages/[id]`)
```

**Active Swap Banner Flow:**
```
Home Screen (`/`) 🔄 Has active swap with meetup?
 ├──➡️ Yes: Show banner with counterparty name, pickup time, progress bar
 │ ├──➡️ "Get directions" ➡️ Google Maps external link
 │ └──➡️ "Message" ➡️ Chat Thread
 └──➡️ No: Show category grid only
```

**iOS Pattern:**
- `HomeView` → `NavigationLink(value: .listingDetail(id))` → `ListingDetailView`
- Active swap banner: conditional view based on swap state
- **Navigation Type:** Push navigation within Home tab stack

### Listing Detail to Chat Flow
```
Listing Detail (`/listing/[id]`) ➡️ Tap message button ➡️ Chat Thread (`/messages/[id]`)
```

**iOS Pattern:**
- `ListingDetailView` → Check if conversation exists → Navigate to existing or create new chat
- **Navigation Type:** Push navigation (may cross tab boundaries)

### Profile Navigation
```
Profile (`/profile`) ➡️ Multiple paths:
 ├──➡️ Tap settings gear ➡️ Settings (`/settings`)
 ├──➡️ Tap "Active Listings" tab ➡️ View listings grid
 ├──➡️ Tap "Swapped" tab ➡️ View swapped items
 ├──➡️ Tap "Reviews" tab ➡️ View reviews list
 ├──➡️ Tap "+" FAB button ➡️ Create Listing (`/list`)
 ├──➡️ Tap listing card ➡️ Listing Detail (`/listing/[id]`)
 └──➡️ Tap Followers count ➡️ Followers (`/followers`)
```

**Edit Profile Flow:**
```
Profile (`/profile`) ➡️ Edit Profile (`/edit-profile`) ➡️ Edit Name (`/edit-profile/name`)
➡️ Edit Bio (`/edit-profile/bio`) ➡️ Edit Email (`/edit-profile/email`)
➡️ Verify Email (`/edit-profile/email/verify`) ➡️ Edit Phone (`/edit-profile/phone`)
➡️ Verify Phone (`/edit-profile/phone/verify`)
```

**iOS Pattern:**
- `ProfileView` → `NavigationLink(value: .editProfile)` → `EditProfileView`
- Edit profile uses multi-step flow similar to signup
- **Navigation Type:** Nested push navigation

### Browse Navigation
```
Home (`/`) ➡️ Browse Category (`/browse/[category]`) ➡️ Browse Brand (`/browse/[category]/[brand]`)
➡️ Browse Model (`/browse/[category]/[brand]/[model]`)
```

**Browse Category Layout:**
```
Category page shows brands grouped alphabetically:
 ├──➡️ Brand header (e.g., "Apple")
 │ └──➡️ Horizontal scroll of model cards (image + name)
 │ └──➡️ Tap model card ➡️ Browse Model page or Listing results
 ├──➡️ Brand header (e.g., "Google")
 │ └──➡️ Horizontal scroll of model cards
 └──➡️ ... more brands
```

**iOS Pattern:**
- Hierarchical navigation using `NavigationStack`
- Each level filters results further
- Model cards in horizontal `ScrollView` per brand section
- **Navigation Type:** Deep hierarchical push navigation

---

## Multi-Step Creation Flows

### Create Listing Flow (Category-Dependent Steps)

**Entry Points (4 ways to start):**
```
1. Bottom nav center "Swap" button ➡️ `/list` ➡️ (redirect) `/list/1`
2. Profile → "+" FAB button ➡️ `/list` ➡️ (redirect) `/list/1`
3. Listing detail → "List similar" ➡️ `/list/1?similar=<id>`
4. Browse model page → "List one" ➡️ `/list/1`
```

**Landing:** `/list` is a redirect page (`router.replace('/list/1')`). The real start is always `/list/1`.

**State & Layout:**
- Entire flow wrapped in `ListingProvider` (in `Layout.tsx`)
- All form data lives in `ListingContext` (`app/list/ListingContext.tsx`), including draft save/load
- Step layout (`app/list/[step]/layout.tsx`): Header (back, "X of Y: Step name", close X), progress bar
- Back on step 1 with progress, or close/navigate away with progress → leave confirmation via `requestLeave()`

**Step Sequence (category-dependent):**
```
Phones / Laptops / Tablets (7 steps):
 Your Device → Verification → Front Condition → Back Condition → Functionality → Photos → Review

Video Games (4 steps):
 Your Device → Functionality → Photos → Review

Console-like (5 steps):
 Your Device → Condition → Functionality → Photos → Review

Other categories (6 steps):
 Your Device → Front Condition → Back Condition → Functionality → Photos → Review
```

Step 1 is always **Your Device**. Last step is always **Review**.

**Step Details (Full Phones Flow):**
```
Step 1: YOUR DEVICE (`/list/1`)
 ├── Category dropdown (Phones, Laptops, Tablets, Headphones, Speaker, Console, Video Games, MP3, Gaming Handhelds)
 ├── Brand dropdown (filtered by category)
 ├── Model Name dropdown (filtered by brand)
 ├── Color dropdown (optional)
 ├── Carrier dropdown (default: Unlocked)
 ├── Storage dropdown (default: 128GB)
 └── IMEI Number text input (15-digit)

Step 2: VERIFICATION (`/list/2`)
 ├── Instructions: "Upload a screenshot of your phone's About page"
 ├── "ABOUT PAGE SCREENSHOT" upload button (+)
 └── "Verify" button (disabled until screenshot uploaded)

Step 3: FRONT CONDITION (`/list/3`)
 ├── "HOW DOES THE FRONT LOOK?" heading
 ├── Device illustration showing front damage zones
 └── Condition selector (tap to indicate damage areas)

Step 4: BACK CONDITION (`/list/4`)
 ├── "HOW DOES THE BACK LOOK?" heading
 ├── Device illustration showing back damage zones
 └── Condition selector (tap to indicate damage areas)

Step 5: FUNCTIONALITY (`/list/5`)
 ├── "Is it functional?" heading
 ├── "Select all that apply" instruction
 └── Checkbox: "The device turns on, turns off, and charges. It has a battery, case, and SIM drawer."

Step 6: PHOTOS (`/list/6`)
 ├── VERIFICATION CODE card (e.g., "YYZA67")
 ├── "Write this code on paper and place it next to your device when taking photos"
 └── Photo upload area

Step 7: REVIEW (`/list/7`)
 ├── "LISTING LOCATION" section
 ├── "USE MY LOCATION" link
 └── "USE MY LOCATION TO FINALIZE" button
```

**Navigation within the flow:**
- **Next:** `handleNext` in `app/list/[step]/page.tsx` validates current step (IMEI, verification status, functionality), then `router.push('/list/${currentStep + 1}')`
- **Back / Close:** Back goes to previous step; on step 1, triggers `requestLeave(goHome)` if there's progress. Close always uses `requestLeave(goHome)` when there's progress
- **Draft:** User can "Save as draft" on any step. Draft stored as `relay_listing_draft`. Next time they open `/list/1`, if a draft exists → resume-draft modal; choosing resume loads draft and navigates to saved step

**Post-Submit Flow (Review Step):**
```
Review Step ➡️ "USE MY LOCATION TO FINALIZE" ➡️ handleSubmitListing
 ├──🔄 Not authenticated ➡️ Redirect to login
 ├──➡️ Validate condition + valuation (must complete valuation on Photos step)
 ├──➡️ createGadget(userId, { name, brand, category, condition, specs, description, verification_code, credits, location, image_urls, ... })
 ├──➡️ On success: Open **Pickup Locations** modal (user sets 2 pickup spots)
 │ └──➡️ handlePickupLocationsConfirm
 │ ├──➡️ updateGadgetPickupLocations(userId, newGadgetId, [location1, location2])
 │ ├──🔄 User has availability?
 │ │ ├──➡️ Yes: Call /api/credits/listing to award credits
 │ │ └──➡️ No: Store pending credit in sessionStorage
 │ ├──➡️ Clear draft
 │ ├──➡️ Show **Coin Celebration** (~3.2s animation)
 │ └──➡️ Redirect:
 │ ├──🔄 No availability: `/settings/availability?onboarding=1&from=list`
 │ └──🔄 Has availability: `/?listed=1` (home)
 └──➡️ On failure: Show error
```

**Modals in this flow (4 total):**
1. **Leave confirmation** — via `requestLeave()` when navigating away with unsaved progress
2. **Resume draft** — when opening `/list/1` with an existing draft (resume or start fresh)
3. **Pickup locations** — after `createGadget` success (user sets 2 pickup spots)
4. **Coin Celebration** — credits animation overlay, then auto-redirect

**Save as Draft Flow (available on all steps):**
```
Any List Step ➡️ Tap "SAVE AS DRAFT"
 ➡️ Save current step + all form data to `relay_listing_draft` ➡️ Can resume later
```

**iOS Pattern:**
- Dedicated `NavigationStack` (or sheet with internal step navigation) for creation flow
- Uses `ListingContext` equivalent (`@EnvironmentObject` or ViewModel) to preserve state across steps
- Step count determined by selected category — dynamic progress bar
- **Save as Draft:** Persist to local storage + optionally Supabase
- **Resume Draft:** Check for existing draft on entry, show `.alert` with Resume/Start Fresh options
- **Post-submit:** Present pickup locations as `.sheet`, then celebration as `.fullScreenCover`
- **Navigation Type:** Sequential with context preservation, dynamic step count
- **Back navigation warning:** `.alert` confirmation if leaving with unsaved progress

### Quick Navigation from Listing Creation
```
Any List Step 🔄 Has unsaved progress ➡️ Try to navigate away
 ├──➡️ User confirms: Discard progress, navigate
 └──➡️ User cancels: Stay on current step
```

**iOS Pattern:**
- `.alert` confirmation before navigation (triggered by `requestLeave()`)
- **Navigation Type:** Conditional with user confirmation

---

## Modal/Sheet Flows

### Filter Flow (Home Screen)
```
Home Screen (`/`) ➡️ Tap filter button ➡️ Filter Panel (slide-up modal)
 ├──➡️ Apply filters ➡️ Close modal, update listings
 └──➡️ Cancel ➡️ Close modal
```

**iOS Pattern:**
- `HomeView` → `.sheet(isPresented: $showFilters)` → `FilterView`
- Filter panel has sub-panels for brand, condition, storage
- **Navigation Type:** Modal sheet with internal navigation

### Report Flow
```
Listing Detail/Profile ➡️ Tap report ➡️ Report Selection (`/report`)
➡️ Item Report (`/report/item`) or User Report
```

**iOS Pattern:**
- `ListingDetailView` → `NavigationLink(value: .report)` → `ReportView`
- **Navigation Type:** Push navigation or modal depending on context

---

## Settings & Help Navigation

### Settings Navigation
```
More (`/more`) ➡️ Settings (`/settings`)
 ├── Account section:
 │ ├──➡️ Personal Info
 │ ├──➡️ Notifications (`/settings/notifications`)
 │ ├──➡️ Privacy & Safety
 │ ├──➡️ Availability (`/settings/availability`)
 │ ├──➡️ Reset password (in-app password reset)
 │ └──➡️ Appearance (dark mode toggle — instant switch, no navigation)
 ├── Subscription section:
 │ ├──➡️ Manage Rellaey+ Plan ➡️ Membership (`/pricing`)
 │ └──➡️ Wallet (`/wallet`)
 └── Support section:
 ├──➡️ Help Center (`/help`)
 ├──➡️ Community Guidelines (`/guidelines`)
 └──➡️ About Rellaey (`/about`)
```

**iOS Pattern:**
- `MoreView` → `NavigationLink(value: .settings)` → `SettingsView`
- Settings uses grouped list with navigation links to sub-settings
- **Appearance toggle:** In-line `Toggle` — no navigation, immediate theme switch
- **Navigation Type:** Nested push navigation with grouped sections

### Help Navigation
```
Help Center (`/help`)
 ├──➡️ Search help articles
 ├──➡️ Featured articles carousel ➡️ Article detail
 ├──➡️ Accordion sections:
 │ ├── Account ➡️ Managing profile, Deleting/pausing account
 │ ├── Legal
 │ ├── Listing
 │ ├── Swap
 │ ├── Membership
 │ ├── Safety
 │ └── Returns
 └──➡️ Direct support: "Contact us" link
```

**iOS Pattern:**
- `HelpView` with search + expandable sections
- Help articles use dynamic routing
- **Navigation Type:** Hierarchical push navigation with accordion UI

### Safety Navigation
```
More (`/more`) ➡️ Safety (`/safety`) ➡️ Blocked Users (`/safety/blocked`)
➡️ Reports (`/safety/reports`)
```

**iOS Pattern:**
- Similar to help navigation pattern
- **Navigation Type:** Hierarchical push navigation

---

## Messaging Flows

### Messages Inbox Flow
```
Messages Tab (`/messages`) ➡️