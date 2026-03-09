# The Shared Mile — Project Reference

## Company Structure
- **Oriva** — parent for-profit company, owns the technology platform
- **The Shared Mile (TSM)** — product brand, the public-facing movement marketplace
- **The Shared Mile Foundation** — nonprofit entity that holds donated funds, receives platform fees
- Legacy code may reference `omm` — do not rename without explicit instruction

## Product Concept
Movement unlocks capital. Athletes complete physical challenges → verified activity releases donated funds to nonprofits. Corporate matching partners (PMPs) amplify each release. Donors earmark funds to specific nonprofits via the donation portal.

## Capital Chain (Canonical)
```
Donor → Stripe → Foundation holds → funding_pool (earmarked to nonprofit)
PMP → wire/check → Foundation holds → matching funding_pool
Admin creates challenge drawing from pool
Athlete claims challenge → completes activity → submits photo verification
Admin verifies → approves → create_release_and_debit_pools RPC fires
DB trigger (trg_create_payable_from_release) auto-creates payable record
Admin reviews payables → marks batch as paid → Foundation pays nonprofit
```

## Revenue (Oriva)
- ~10% platform licensing fee paid by Foundation to Oriva (not yet tracked in DB — future)
- Optional donor tips on donation amount (not yet tracked — needs `donations` table column)

## Locked Architectural Rules
1. **Do not modify Supabase schema without explicit instruction. Database is canonical.**
2. **Financial logic stays in the DB layer (RPCs/triggers), not API routes or frontend code.**
3. `claims` is the operational source of truth. `verifications` is audit/metadata only.
4. `funding_pool` is the canonical starting point of the operational ledger.
5. Admin routes use service-role Supabase client (`lib/supabase/server.ts`). Never use anon key for financial operations.
6. Releases are immutable once created. Never mutate release records.
7. Idempotent release protection is enforced at the DB level.

## Security Alert (Must Fix Before Real Users)
`admin_users` table has an INSERT RLS vulnerability:
- `admin_users_insert_self` policy (with_check: user_id = auth.uid()) overrides the blocking intent of `Admins insert manually only` (with_check: false)
- Due to PERMISSIVE OR logic, any authenticated user can self-insert as admin
- **Fix in Supabase:** Delete `admin_users_insert_self` and `admin_users_self_access` policies
- Also: `releases_insert_own_claim` and `payables_insert_from_own_release` RLS policies allow athletes to insert directly into financial tables — unnecessary surface area since all financial writes go through service-role RPCs

## Database — Core Tables
| Table | Purpose |
|-------|---------|
| `athletes` | Profile + impact identity (athletes.id === auth.users.id) |
| `challenges` | Challenge definitions, drawn from funding_pools |
| `claims` | Athlete challenge claims — the operational spine |
| `releases` | Immutable record of every approved release (money unlocked) |
| `payables` | Auto-created by DB trigger on release insert, tracks payout status |
| `funding_pools` | Capital buckets (donor or PMP), debited at release |
| `nonprofits` | Nonprofit directory |
| `corporate_partners_pmp` | PMP/matching partner metadata |
| `donations` | Donor contributions (Stripe integration pending) |
| `verifications` | Audit/metadata layer for claim verification |
| `admin_users` | Manual row insert grants admin access |
| `nonprofit_memberships` | Links users to nonprofits |
| `pmp_memberships` | Links users to PMP partners |
| `payables` | Payout records per nonprofit, auto-created by trigger |

## Database — Key RPCs & Triggers
| Name | Type | Purpose |
|------|------|---------|
| `create_release_and_debit_pools` | RPC (SECURITY DEFINER) | Creates release + debits base and matching pools atomically |
| `complete_verification_and_release` | RPC | Combined verification approval + release creation |
| `create_payable_from_release` | Trigger function | Auto-creates payable record on AFTER INSERT on releases |
| `trg_create_payable_from_release` | Trigger | Fires create_payable_from_release after release insert |
| `expire_stale_claims` | Function | Handles stale claim cleanup |

## Database — Views
| Name | Purpose |
|------|---------|
| `Challenge_Board_View` | Precomputed view combining challenge + pool + matching data for the board |

## Claim Lifecycle (Canonical Enum)
`claimed` → `submitted` → `approved` → `released`
Also: `rejected`, `expired`, `cancelled`
- `claimed`: athlete locked inventory, completing challenge
- `submitted`: photo uploaded, awaiting admin review
- `approved`: verification accepted, release must be created
- `released`: funds debited, payable created
- Only `approved` claims are eligible for release creation

## Challenge Activity Types
- `run`, `walk`, `cycle`
- Metric: distance-based only (`distance_miles`)
- Units: miles (never meters)
- Money: integer cents ($10.00 = 1000)

## User Roles
- **Athlete** — submits claims, uploads verification, views challenges
- **Admin** — verifies claims, approves, releases funds, manages all data. Identified by row in `admin_users`. Same auth account can be both admin and athlete.
- **Nonprofit** (future portal) — views funds unlocked, payout history
- **Corporate Partner** (future portal) — pool balance, impact reports
- Roles resolved in app logic by checking membership/admin tables, not separate auth accounts

## Authentication
- Supabase Auth is canonical
- `auth.users` = source of truth for email/password/session
- `athletes` = profile and impact identity layer
- `athletes.id === auth.users.id` (enforced by FK)
- Admin routes: server-side with service role only

## Design System
**Brand Kit:**
| Name | Hex | Usage |
|------|-----|-------|
| Midnight Indigo | #0B0F1C | Background, canvas, dark UI base |
| Soft Ivory | #F9F6EF | Text base, light UI backgrounds |
| Aqua Mist | #C4EBF2 | Accent glow, flow hints |
| Lavender Grey | #D2D3DD | Secondary accent, borders, icons |
| Coral Ember | #FF9B6A | Primary emotional CTA color |
| Light Ember | #FFB48E | Hover states, glows, warm accents |
| Gold Highlight | #FFD28F | Hero text, headings, outlines |

**Tone:** Nike Run Club meets fintech. Dark, sharp, kinetic. Numbers feel alive.
**Stack:** Next.js App Router, Tailwind, shadcn components
**Admin UI:** Glass panels (bg-white/5 ring-1 ring-white/10 backdrop-blur-xl), Midnight Indigo bg (#070A12), gold accents, clarity over decoration
**Logo:** `/public/tsm-logo.jpeg` — dark bg, bold white "THE SHARED MILE" wordmark, three sweeping track lines (white/silver/gold)

## System Status
**Fully Working:**
- Claim submission, verification photo upload
- Admin verification queue — brand kit applied (glass panels, Coral Ember CTA, auto-revalidation)
- Admin approval/reject flow
- Release engine (RPC), pool debit logic
- Releases ledger, idempotent release protection
- Claim lifecycle updates, challenge creation (admin UI)
- Payable auto-creation (DB trigger on release insert)
- Admin home KPI dashboard
- Admin payables: batch "Mark as Paid" with provider + reference (server action)
- Live challenge board: Supabase Realtime slot updates, AnimatePresence exit animations, activity-color accent strip on cards, full nonprofit/partner name display (no truncation), Nike Run UX, live claim ticker
- Challenge complete page: confetti burst (dynamic import, no webpack error), social share card
- Social share card: OG image API at `/api/og/share` (next/og, Edge runtime, IG story 1080×1920)
- Athlete impact dashboard: lifetime stats hero, history rows with nonprofit name + date, active claim links to `/activechallenge`
- **Global nav** (`components/AppNav.tsx`): role-aware links, active challenge indicator dot, mobile hamburger, admin-simplified variant — mounted in `app/layout.tsx`
- **Homepage** (`app/page.tsx`): 4-section landing (hero + How It Works + Capital Chain + footer), Coral Ember CTAs, runner background
- **Auth page** (`/authorization`): brand kit glass card, TSM logo, Coral Ember button, `check_email` state. Signup shows aqua tagline + "Join The Shared Mile" CTA. Login has working "Forgot password?" flow. Updated check_email copy. **Google Sign In** button at top of form (both login and signup modes), "or" divider, inline Google G SVG — redirects to `/onboarding` post-OAuth.
- **Onboarding** (`/onboarding`): 3-screen state machine. Screen 1: brand promise (how it works, numbered steps). Screen 2: Display Name + Username only (location/age deferred) — display name pre-filled from Google metadata (`full_name`/`name`) when signing in via Google. Screen 3: welcome + 3s auto-redirect to /challenges. Returning users (onboarding_completed=true) are immediately routed to /athlete.
- **Active challenge page** (`/activechallenge`): joins `challenges(title, description)`, shows challenge title prominently, Gold stats, two-step confirm-release, Coral Ember verify CTA, helpful empty state when no active claim
- **Claim page** (`/claim/[id]`): double-claim guard — blocks with clear UI if athlete already has an active claim, brand kit styling, activity accent strip
- **Donation page** (`/give`): `DonationForm.tsx` client component with tip selector (5/10/15/20/None), processing fee toggle, real-time breakdown, brand kit
- **Admin Command Center** (`/admin`): redesigned as scrollable single-page hub (AdminHub.tsx). Four collapsible sections: Verifications (approve/reject inline, green flash animation), Unpaid Payables (rows + Batch Mark Paid CTA), Challenges (recent 5 + New button), Pool Health (progress bars). Alert pills appear above hub when active. `force-dynamic` ensures fresh verifications on every load. Active challenges count fixed to query `status = "open"` directly.
- **Admin New Challenge** (`/admin/challenges/newchallenge`): Refactored to server wrapper + `NewChallengeForm.tsx` client component. Activity is pill toggle (no system picker). Amount is hero number field. Lane auto-derived from pool, Status hardcoded "open". Loading state on submit. Error display. Redirect fixed to `/admin/challenges`.
- **PMP Entry** (`/admin/pmpentry`): fixed localhost:5000 bug — now writes directly to Supabase (top-up or create modes)
- **Challenge card MATCHED badge**: moved into the activity+slots flex row (inline, not absolute positioned) — no overlap with slot count text on any screen size
- **Admin brand kit** — all admin pages on dark theme: donorfunds, partnerfunds, pmpentry, alerts, fundingpools, nonprofits, challenges, releases, settings — KPI cards, glass tables, Gold/Aqua money values
- **PWA manifest** (`/public/manifest.json`): name, icons, theme color, standalone display
- **Email infrastructure**: Resend SDK (`lib/email/send.ts`). Three dark on-brand HTML templates: `claimConfirmed`, `proofApproved` (with match display), `proofRejected` (with resubmission tips). Triggers wired into `api/claims/submit` and `api/admin/verifications/update` — fire-and-forget, non-blocking.
- **Supabase SMTP**: Configured with Resend (smtp.resend.com:465, username=resend). Sender: "The Shared Mile" / hello@thesharedmile.com. Custom confirm-signup email template deployed.
- **First-visit overlays** (`components/FirstVisitOverlay.tsx`): localStorage-gated, shown once per page per device. Challenge board overlay: "The Miles Marketplace" — explains Claim/Move/Unlock loop. Athlete hub overlay: "Your impact hub" — explains the three dashboard sections. Dismiss on CTA or backdrop tap.

**Pending / Next:**
1. Stripe donation portal wiring (`/give` is currently a simulator)
2. Nonprofit portal
3. Corporate partner layer
4. Platform fee + tips tracking (schema work needed — `donations.tip_cents`)
5. PWA service worker (manifest is in, SW not yet registered)

## Priority Build Order
1. ~~Admin Operations stabilization~~ ✓
2. ~~Payables engine (batch Mark as Paid)~~ ✓
3. ~~Live challenge board (Supabase Realtime + Nike Run UX)~~ ✓
4. ~~Social share card (IG story frame)~~ ✓
5. ~~Athlete impact dashboard~~ ✓
6. Stripe donation integration
7. Nonprofit portal
8. Corporate partner layer
9. PWA polish

## Mobile Strategy
- Target: mobile-first web / PWA behavior
- Preserve Next.js web routing
- Do NOT restructure for React Native / Expo (that comes later)
- Design all new UI mobile-first, desktop-enhanced

## Development Environment
- Package manager: npm
- Dev server: `npm run dev` on port 5000, host 0.0.0.0
- Supabase secrets: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
- Server client: `lib/supabase/server.ts` (service-role, no session persistence)
- Browser client: `lib/supabase/client.ts`

## Key File Locations
- Admin pages: `app/admin/`
- Athlete pages: `app/athlete/`, `app/challenges/`, `app/activechallenge/`, `app/challengecomplete/`
- API routes: `app/api/`
- Shared components: `components/`
- Supabase clients: `lib/supabase/`
- Brand logo: `public/tsm-logo.jpeg`
