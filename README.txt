✅ CANONICAL README (PASTE ENTIRE FILE)

TSM – Supabase Schema + Key Decisions (Canonical)

This document is the single source of truth for TSM’s backend spine, money semantics, governance model, challenge marketplace behavior, and enforcement rules.
All product, admin, and operational work must assume this file is correct unless explicitly updated here.

⸻

PRODUCT MODEL (LOCKED)

Money is committed first.

Human movement unlocks release (movement is the trigger, not the source of capital).

Athletes do not donate or fundraise.

Matching is optional and amplifies unlocked impact.

The Shared Mile Foundation (nonprofit) is the conceptual custodian of funds.

TSM (The Shared Mile) orchestrates user experience, claiming, verification, release, and administration.

⸻

NAMING CONVENTIONS (LOCKED)

We do not use “BMPs”.

Corporate matching entities are named exactly: corporate_partners_pmp.

Nonprofits live in: nonprofits.

Athletes live in: athletes.

Challenge board view is named exactly: Challenge_Board_View.

The public challenge board is branded:
MILES ★ MARKETPLACE

⸻

UNIT DECISIONS (LOCKED)

Distance is stored in miles (not meters).

Money is stored as integer cents.

Example:
$10.00 → 1000

⸻

AUTHENTICATION & IDENTITY (LOCKED)

Supabase Auth is canonical for authentication.

auth.users is the source of truth for:
- email
- password
- session state

athletes is the profile and impact identity layer, not an authentication system.

Authentication is intentionally decoupled from role, permissions, and product routing logic.

⸻

ATHLETE CREATION RULE (LOCKED)

When a user signs up and confirms email:
- A row is created in athletes.
- athletes.id === auth.users.id (foreign key enforced).

All downstream flows (claims, verification, release, administration) depend on this invariant.

⸻

CORE INTERACTION RULES (LOCKED)

Challenge Board Access
- /challenges is authentication-gated.
- All interactions require authentication.
- Public discovery is deferred.

Challenge Board Behavior
- The board reads exclusively from Challenge_Board_View.
- Only challenges with available slots are rendered.
- Challenges with zero remaining slots do not render.
- There are no greyed-out or inactive cards displayed.

Daily Claim Guard
- An athlete may initiate only one claim per calendar day.
- If an athlete has already claimed today:
  - The challenge grid renders.
  - The grid is visually frozen.
  - A glass overlay is displayed.
  - The primary CTA routes to /activechallenge.
  - The system does not redirect automatically.
- This guard is enforced server-side and does not mutate database state.

⸻

CLAIMING RULES (UPDATED + LOCKED)

An athlete may have only one active claim at a time.

A challenge may have only one active claim at a time.

These constraints are enforced at the database level using a partial unique index.

Historical claims (expired, cancelled, approved) do not block new claims.

An athlete may claim only once per calendar day.

The daily guard is enforced at the application layer using claimed_at timestamps.

⸻

CLAIM LIFECYCLE (UPDATED, IMPLEMENTED)

Claims move through a single linear lifecycle.

Authoritative enum values:
- claimed
- approved
- rejected
- expired
- cancelled

Deprecated and removed:
- submitted
- in_progress

Verification in MVP directly completes the claim.

Additional rules (implemented):
- verified_at is written at completion time.
- approved is the only successful terminal state surfaced to athletes.
- Failure states exist for audit and admin purposes but are not emphasized in MVP user experience.

⸻

SLOT RULES (IMPLEMENTED)

Each challenge defines:
- slots_total
- slots_claimed

slots_left is derived as:
slots_total - slots_claimed

Behavior:
- When a claim is created, slots_claimed increments.
- When slots_left reaches zero, the challenge is removed from MILES ★ MARKETPLACE.
- When a claim exits active status (approved, expired, cancelled), slot accounting reconciles correctly.
- The board never displays challenges with zero slots_left.

⸻

RELEASE / EXIT RULES (UPDATED)

An active claim exits the active set via:
- Verification success → approved
- Timeout or cancellation → expired or cancelled

When a claim exits active status:
- The challenge returns to the board if slots remain.
- The athlete may claim again (subject to daily guard).
- There is no lingering released state.

⸻

TABLES (PRIORITY ORDER)

nonprofits  
Purpose: Canonical nonprofit directory.

Fields:
- id (uuid, primary key)
- name
- slug (unique)
- description
- website_url
- logo_url
- contact_name
- contact_email
- is_active
- created_at

⸻

athletes  
Purpose: Auth-linked user identity and impact summary.

Fields:
- id (uuid, primary key, foreign key → auth.users.id)
- email
- username (unique)
- display_name
- photo_url
- challenges_completed_count
- total_funds_unlocked_cents
- is_active
- last_active_at
- created_at

Notes:
- Passwords do not live here.
- Aggregates may be cached or computed.
- Athlete home surfaces the active claim (if any) and approved challenge history.

⸻

corporate_partners_pmp  
Purpose: Corporate matching partner metadata.

Fields:
- id
- name
- slug
- website_url
- logo_url
- contact_name
- contact_email
- is_active
- billing_email
- billing_status
- stripe_customer_id
- created_at

⸻

funding_pools  
Purpose: Capital buckets that challenges draw from.

Fields:
- id
- pool_type
- source_name
- nonprofit_id (nullable)
- corporate_partner_pmp_id (nullable)
- total_amount_cents
- remaining_amount_cents
- currency
- status
- starts_at
- ends_at
- created_at

Invariant:
remaining_amount_cents must reconcile against releases.
If it does not, the system is considered invalid.

⸻

challenges  
Purpose: Claimable movement challenges.

Fields:
- id
- title
- description
- activity
- distance_miles
- amount_cents
- lane
- status
- nonprofit_id
- funding_pool_id
- corporate_partner_pmp_id
- match_ratio
- slots_total
- slots_claimed
- expires_at
- created_at

⸻

claims (CRITICAL TABLE)  
Purpose: Locks an athlete into a challenge attempt.

Hard rules:
- One active claim per athlete.
- One active claim per challenge.
- Exactly one verification path.
- One claim per athlete per calendar day (application-level enforcement).

Fields:
- id
- challenge_id
- athlete_id
- status
- amount_cents_snapshot
- distance_miles_snapshot
- claimed_at
- verified_at
- expires_at
- created_at

Snapshots are immutable and authoritative.

⸻

verifications (ACTIVE)

Purpose: Audit record of claim completion.

MVP behavior:
- Verification server route completes the claim.
- Claim is approved.
- Verification row is deduplicated by claim_id.

Fields:
- id
- claim_id (unique)
- method
- external_activity_id
- proof_url
- notes
- status
- verified_by
- verified_at
- created_at

⸻

releases (ACTIVE, LEDGER)

Purpose: Immutable ledger of unlocked funds.

Fields:
- id
- claim_id (unique)
- challenge_id
- nonprofit_id
- funding_pool_id
- corporate_partner_pmp_id
- amount_cents
- matched_amount_cents
- released_at
- created_at

Rule:
Exactly one release per approved claim.
If it is not in releases, it did not happen.

⸻

payables (ACTIVE)

Purpose: Bookkeeping layer representing money owed to nonprofits.

MVP behavior:
- Created automatically after release.
- One payable per release.
- Starts unpaid (queued).

Fields:
- id
- nonprofit_id
- release_id
- amount_cents
- matched_amount_cents
- total_cents
- currency
- status (queued | paid | failed)
- paid_at
- provider
- provider_ref
- note
- created_at

If it is not in payables, it is not owed.

⸻

ADMIN GOVERNANCE SURFACES (CANONICAL)

All admin pages are read-only unless explicitly noted.
Money never moves via user interface actions.

Admin Command Center (/admin)
- System health summary
- Remaining funds across all pools
- Unpaid payables count
- Release counts
- Navigation to all admin surfaces

Funding Pools (/admin/fundingpools)
- Source-of-truth pool balances
- Remaining versus total capacity
- Pool type breakdown
- Reconciliation surface for releases

Releases Ledger (/admin/releases)
- Immutable list of all releases
- Base, matched, and total amounts
- Pool attribution
- Timestamped ledger truth

Payables Queue (/admin/payables)
- Aggregated unpaid obligation per nonprofit
- Drill-down to individual payable rows
- Reconciles against releases

Nonprofits (/admin/nonprofits)
- Recipient truth surface
- Lifetime unlocked totals (from releases)
- Unpaid owed totals (from payables)
- Payout status and activity state

Challenges (/admin/challenges)
- Inventory control surface
- Funding source attribution
- Slot utilization
- Release-derived utilization metrics
- Health heuristics (read-only signals)

Alerts (/admin/alerts)
- System attention surface
- Low funding pools
- Aging unpaid payables
- Expiring challenges
- Invalid or mismatched configurations

Settings (/admin/settings)
- Admin-only thresholds and rules
- Alert thresholds
- Payout cadence configuration
- No direct money mutation

⸻

VIEWS

Challenge_Board_View  
Purpose: Board-ready join of challenges, nonprofits, funding pools, and slot state.
Used exclusively by /challenges.

⸻

CANONICAL PAGE FLOW (CURRENT TRUTH)

User authenticates via Supabase Auth  
Athlete identity exists (1:1 invariant)  
/challenges reads from Challenge_Board_View  
Daily guard evaluated  
Claim is created with immutable snapshots  
/activechallenge is authoritative for in-progress work  
/verify/[claimId]  

Verification server route executes:
- Claim approved
- Verification row created
- Release row created
- Payable row created

User is redirected to /challengecomplete/[claimId]  
Claim exits active set  
Slot accounting reconciles  
Athlete history updates

⸻

DATABASE ENFORCEMENT (CRITICAL)

Active Claim Constraint:
- Implemented via partial unique index.
- Applies only when status = 'claimed'.
- Prevents reclaim bugs without frontend logic.

Ledger Integrity:
- Exactly one release per approved claim.
- Funding pool remaining_amount_cents must reconcile against releases.

⸻

NON-NEGOTIABLES (RECAP)

Supabase Auth is canonical.  
Miles for distance.  
Integer cents for money.  
One active claim per athlete.  
One active claim per challenge.  
One claim per athlete per day.  
Claim snapshots are immutable.  
Board reads from Challenge_Board_View.  
Verification completes the loop.  
Releases are truth.  
Payables represent obligation.  

⸻

CURRENT STATE SUMMARY

End-to-end movement-to-money loop is live and verified.

MILES ★ MARKETPLACE is operational and inventory-based.

Daily claim guard is active and server-enforced.

Claim → Verify → Release → Payable → Admin visibility is real.

Ledger-backed money movement exists.

No demo hacks remain.

Architecture cleanly supports Strava and Garmin OAuth.

Admin governance surfaces are complete, coherent, and operationally sound.

This system is correct, extensible, and production-grade.
