### [14:38] [architecture] Authentication System Comparison: Main vs Feature Branch
**Details**: ## Main Branch (Supabase Email OTP)
**Authentication Approach**: Traditional OAuth/Email magic links via Supabase
- Uses `@supabase/supabase-js` for authentication
- Sign-in flow: Email → OTP magic link → `/auth/callback?code=...` → session established
- Session managed by Supabase built-in auth (`supabase.auth.getSession()`, `onAuthStateChange()`)
- Context: `src/context/auth-context.tsx` (singular "context")
- Location: `src/contexts/AuthContext.tsx` provides user/session state only
- AuthModal: Multi-step choose → email/wallet → email-sent → success
- Auth callback: Exchanges Supabase code for session via `exchangeCodeForSession()`
- No JWT, no blockchain interaction, stateless frontend
- Hooks: use-event, use-favorites, use-participants, etc. (domain-specific)

## Feature Branch (Passkey + Blockchain + JWT)
**Authentication Approach**: WebAuthn passkeys + ephemeral blockchain signers + JWT
- Three-gate security model:
  1. Gate 1: Database passkey validation (`getUserByPasskey`)
  2. Gate 2: On-chain signer authorization (`contract.signers()`)
  3. Gate 3: Voting requires both gates + ephemeral signer signing
- Registration: Create passkey via WebAuthn → register with backend → stores pubkey_x/y
- Session: Authorize ephemeral signer (7-day expiry) via passkey Face ID → get JWT
- Voting: Uses ephemeral signer to sign votes (no additional Face ID needed)
- Context: `src/contexts/AuthContext.tsx` (plural "contexts") - manages JWT + signer state
- Includes: `src/lib/jwt.ts` for JWT signing/verification using jose library
- Login Page: Recovers passkey via discoverable credentials OR uses localStorage
- Register Page: Creates passkey → registers → completes auth flow
- Key Hooks: `useAuth()` (from context), `useAuthFlow()` (three-step: recover/authorize/login)
- localStorage Storage: passkeyInfo (credentialId, userId, pubKeyX, pubKeyY), sessionKey (privateKey, address, expiry), authToken (JWT)
- API Routes: /api/register, /api/authorize, /api/login, /api/login/challenge, /api/auth/me, /api/auth/lookup

## Key Differences

### Authentication Storage
- Main: Supabase session (HTTP cookies via SDK)
- Feature: localStorage (passkeyInfo + sessionKey + authToken JWT) + NO cookies/middleware

### Authorization Model
- Main: Supabase JWT from OTP verification
- Feature: Custom JWT containing passkey coords + signer address/expiry

### Blockchain Integration
- Main: None
- Feature: Full integration - authorizeSigner() + vote() contract calls

### Pages
- Main: `/app/auth/callback` (handles magic link exchange)
- Feature: `/app/login` and `/app/register` (full passkey flows)

### Context API
- Main: Simple context with signInWithEmail/signOut methods
- Feature: Complex context with login/logout/refreshUser, tracks token + signerAddress + signerExpiry

### Hooks
- Main: useAuth hook only (provides user/session/methods)
- Feature: useAuth (context export) + useAuthFlow (multi-step orchestration)

## Merge Implications

To merge main → feature/passkey-auth-voting:
1. Main's Supabase auth pages won't be used (would conflict with /app/login, /app/register)
2. Main's auth callback route won't be used (passkey flow is different)
3. Main's simple auth modal would need to be adapted or deprecated
4. Main's domain-specific hooks (use-events, use-votes) should remain unaffected (different directories)
5. Main's AuthProvider pattern differs significantly - feature has stronger state management with JWT tracking

To merge feature → main:
1. Replace email OTP with passkey auth (breaking change for existing users)
2. Add blockchain contract interaction (new dependency: ethers, simplewebauthn)
3. Remove Supabase auth SDK usage, replace with custom JWT + localStorage
4. Migrate from simple session-based to complex passkey + ephemeral signer model
5. Add new API routes for blockchain interaction (/api/authorize, /api/login challenge pattern)

## Migration Path Recommendation
Keep both auth systems separate during merge:
- Feature branch keeps all passkey auth in `/app/login`, `/app/register`
- Main's email OTP auth could stay in `/app/auth` (different URL space)
- Use a URL parameter or environment variable to switch between auth modes
- Eventually deprecate one authentication method
**Files**: src/contexts/AuthContext.tsx, src/app/login/page.tsx, src/app/register/page.tsx, src/app/api/authorize/route.ts, src/app/api/login/route.ts, src/lib/jwt.ts, src/hooks/useAuthFlow.ts
---

### [22:52] [database] Supabase Database Schema - Current State (13 Tables)
**Details**: Complete schema with 13 tables organized by domain:

USERS & IDENTITY:
- users: Core profile (id, email, display_name, bio, avatar_url, topics[], payout_address, ens_address, invite_code, created_at, updated_at)
- user_passkeys: WebAuthn passkey storage supporting multiple keys per user (id, user_id, pubkey_x, pubkey_y, credential_id, created_at)
  - Indexes: (pubkey_x, pubkey_y), (credential_id), (user_id)
  - Constraints: unique pubkey pair, unique credential_id per user
  - Migration history: Originally in users table (migrations 010-012), then dropped (migration 013)

EVENTS:
- events: Event config (slug, name, description, start_date, end_date, location, banner_image_url, access_mode, nft_contract_address, nft_chain_id, pre_vote_credits=100, attendance_vote_credits=100, proposal_deadline, pre_vote_deadline, voting_opens_at, total_budget_pool, payment_token_address, platform_fee_percent=5%, treasury_wallet_address, schedule_published, schedule_locked, distribution_executed, created_at, updated_at)
- event_access: User access control (event_id, user_id, email, wallet_address, access_granted, is_admin, checked_in, checked_in_at, burner_card_id, created_at; unique constraint on event_id+user_id)

SCHEDULING:
- venues: Physical spaces (event_id, name, capacity, features[], description, display_order, created_at)
- time_slots: Time blocks (event_id, start_time, end_time, is_available, label, display_order, created_at)

SESSIONS:
- sessions: Session proposals (event_id, title, description, format['talk'|'workshop'|'discussion'|'panel'|'demo'], duration, max_participants, technical_requirements[], topic_tags[], status['pending'|'approved'|'rejected'|'merged'|'scheduled'], rejection_reason, merged_into_session_id, venue_id, time_slot_id, is_locked, created_at, updated_at)
- session_hosts: Hosts M:M relationship (session_id, user_id, is_primary, status['pending'|'accepted'|'declined'], created_at; unique session_id+user_id)

VOTING & STATS (Pre-Event):
- session_pre_vote_stats: Aggregated pre-votes (session_id, total_votes, total_voters, total_credits_spent, vote_distribution JSONB, last_updated; unique session_id)
- user_pre_vote_balance: Per-user pre-vote tracking (event_id, user_id, credits_spent, credits_remaining=100, last_updated; unique event_id+user_id)
- voter_overlap: Scheduling algorithm input (event_id, session_a_id, session_b_id, shared_voters, overlap_percentage, last_calculated; unique event_id+session_a+session_b)

VOTING & STATS (Attendance):
- session_attendance_stats: Aggregated attendance votes (session_id, total_votes, total_voters, total_credits_spent, qf_score, vote_distribution JSONB, last_updated; unique session_id)
- user_attendance_balance: Per-user attendance tracking (event_id, user_id, credits_spent, credits_remaining=100, sessions_voted_count, last_updated; unique event_id+user_id)

MERGERS & DISTRIBUTION:
- merger_requests: Session merge proposals (event_id, requesting_session_id, target_session_id, requested_by_user_id, status['pending'|'accepted'|'declined'|'admin_suggested'], message, response_message, created_at, responded_at; unique requesting+target sessions)
- distributions: QF distribution batches (event_id, total_pool, platform_fee, distributable_amount, tx_hash, status['pending'|'executing'|'completed'|'failed'], executed_at, created_at)
- distribution_items: Individual payouts (distribution_id, session_id, recipient_address, amount, qf_score, percentage, created_at)

ATTESTATIONS (Optional, not yet used):
- attestations: EAS on-chain indexing (attestation_uid, schema_uid, attester_address, recipient_address, event_id, session_id, attestation_type, data JSONB, tx_hash, block_number, created_at, indexed_at; indexes on event, session, attester, type, uid, block_number)

RLS POLICIES:
- Users: Public viewable, self-update only
- Events: Public viewable, admin-only modify
- Sessions: Viewable by event participants, hosts/admins modify, hosts delete pending-only
- Voting stats: Viewable by participants, service-role manages
- User balances: User views own only, service-role manages
- Voter overlap: Admin-only view
- Distributions: Participants view, admins manage
- Helper functions: is_event_admin(), has_event_access(), is_session_host()

TypeScript generation: Autogenerated types in src/types/supabase.ts from Supabase schema
**Files**: supabase/migrations/20251218163708_001_users.sql, 20251218205721_010_passkey_auth.sql, 20251219120000_012_user_passkeys.sql, 20251219130000_013_drop_user_passkey_columns.sql, src/lib/db/users.ts, src/types/supabase.ts
---

