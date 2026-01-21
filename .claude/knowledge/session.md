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

### [00:28] [architecture] Smart Contract Architecture - No Test Suite
**Details**: The SchellingPointVotes contract is a complete Solidity implementation, but currently has NO test directory in /workspace/project/contracts/test/. The QUICKSTART.md mentions "Comprehensive test suite (9 passing tests)" but no test files exist in the contracts directory. This appears to be a documentation inconsistency - test files may have been planned but not yet created. The contract is production-ready with deployment scripts and has been deployed multiple times (broadcast history shows deployments to Base Sepolia chain 84532).
**Files**: contracts/foundry.toml, contracts/src/SchellingPointVotes.sol, contracts/script/Deploy.s.sol, contracts/script/DeployDryRun.s.sol
---

### [00:29] [architecture] Authentication System Architecture - Three-Phase Flow with JWT
**Details**: The authentication system has evolved to use a three-phase flow with JWT tokens instead of the previous localStorage-only approach:

PHASE 1: PASSKEY REGISTRATION OR RECOVERY
- Registration (/app/register/page.tsx): Creates WebAuthn passkey via navigator.credentials.create() with P-256 (alg -7)
- Login (/app/login/page.tsx): Recovers passkey via navigator.credentials.get() with discoverable credentials
- Database: user_passkeys table stores (user_id, pubkey_x, pubkey_y, credential_id)
- API: /api/auth/lookup - Finds user by credential_id, returns pubkey coordinates

PHASE 2: EPHEMERAL SIGNER AUTHORIZATION
- useAuthFlow.ts: authorizeSession() generates ephemeral wallet (7-day validity)
- Challenge: keccak256(abi.encode(signer, expiry, chainId, contractAddress))
- User signs with WebAuthn passkey (Face ID required)
- DER signature parsed to r,s format in useAuthFlow.ts (lines 133-158)
- /api/authorize: Gate 1 checks passkey in DB, calls contract.authorizeSigner(), waits for on-chain state
- Returns txHash; localStorage stores { privateKey, address, expiry }

PHASE 3: JWT LOGIN
- /api/login/challenge: Returns signed challenge (timestamp:nonce:signature format via challenge-store.ts)
- /api/login: Gate 1 verifies passkey, Gate 2 verifies signer authorized on-chain, signs JWT
- JWT payload: { sub, pubKeyX, pubKeyY, displayName, email, signerAddress, signerExpiry }
- Returns token stored in localStorage; valid 24h
- /api/auth/me: Validates JWT, returns user data + signer info

STORAGE MODEL:
- localStorage keys: 'passkeyInfo', 'sessionKey', 'authToken'
- passkeyInfo: { credentialId, userId, pubKeyX, pubKeyY }
- sessionKey: { privateKey, address, expiry }
- authToken: JWT string

AuthContext tracks: user, token, signerAddress, signerExpiry, isLoggedIn (all three valid)
useVoting.ts: Unchanged - still uses localStorage, expects valid sessionKey from auth flow
**Files**: src/app/register/page.tsx, src/app/login/page.tsx, src/hooks/useAuthFlow.ts, src/contexts/AuthContext.tsx, src/app/api/authorize/route.ts, src/app/api/login/route.ts, src/lib/jwt.ts, src/lib/challenge-store.ts
---

### [00:29] [api] API Routes - Authentication and Authorization Flow
**Details**: POST /api/register - Register new user with passkey
- Input: { code, pubKeyX, pubKeyY, credentialId }
- Flow: Validate invite code → registerPasskey() inserts into user_passkeys + nulls invite_code
- Returns: { success, userId }

POST /api/authorize - Authorize ephemeral signer on-chain
- Input: { pubKeyX, pubKeyY, signer, expiry, authenticatorData, clientDataJSON, r, s }
- Gate 1: getUserByPasskey() validates passkey in user_passkeys table
- Process: Calls contract.authorizeSigner() with WebAuthn components
- Verification: Polls contract.signers() up to 5 times with 500ms delays for RPC lag
- Returns: { success, txHash }

POST /api/authorize/challenge - NOT YET IMPLEMENTED for authorize phase
- Currently authorize uses direct challenge from useAuthFlow (not server-generated)

POST /api/login/challenge - Get login challenge
- Process: generateChallenge() creates signed challenge (timestamp:nonce:signature)
- Returns: { challengeId, challenge } where challenge is the nonce
- TTL: 5 minutes; no server-side storage (cryptographically signed)

POST /api/login - Login with ephemeral signer to get JWT
- Input: { pubKeyX, pubKeyY, signer, challengeId, signature }
- Verification: getAndConsumeChallenge() validates signature + expiry
- Gate 1: getUserByPasskey() checks passkey in DB
- Gate 2: contract.signers() checks signer authorized with valid expiry
- Process: signJWT() creates 24h token
- Returns: { success, token, user }

POST /api/vote - Cast vote with authorized signer
- Input: { pubKeyX, pubKeyY, signer, topicId, amount, signature }
- Gate 1: getUserByPasskey() validates passkey
- Gate 2: contract.signers() checks signer authorized with valid expiry
- Process: contract.vote([pubKeyX, pubKeyY], signer, topicId, amount, signature)
- Returns: { success, txHash }

GET /api/nonce - Get current nonce for signing
- Query: ?pubKeyX=...&pubKeyY=...
- Process: Read-only contract.getNonce([pubKeyX, pubKeyY])
- Returns: { nonce }

GET /api/auth/me - Validate JWT and get user info
- Header: Authorization: Bearer [token]
- Process: verifyJWT() validates signature + expiry (24h)
- Returns: { user, signerAddress, signerExpiry }

POST /api/auth/lookup - Find user by credential ID (for login discovery)
- Input: { credentialId }
- Process: getUserWithPasskeyByCredentialId() joins user_passkeys + users
- Returns: { userId, pubKeyX, pubKeyY, credentialId }

KEY PATTERNS:
- All routes validate input first (400)
- Gate 1: getUserByPasskey (401)
- Gate 2: On-chain signer check (403)
- Errors logged with console.error
- Contract calls via ethers.js with SCHELLING_POINT_VOTES_ABI
**Files**: src/app/api/register/route.ts, src/app/api/authorize/route.ts, src/app/api/vote/route.ts, src/app/api/nonce/route.ts, src/app/api/login/route.ts, src/app/api/login/challenge/route.ts, src/app/api/auth/me/route.ts, src/app/api/auth/lookup/route.ts
---

### [00:29] [dependency] WebAuthn Integration - Browser and Server Flow
**Details**: BROWSER-SIDE (src/lib/webauthn.ts):
- extractPublicKey(attestationObject) - CBOR decode attestation, extract P-256 coordinates
  * Parses attestedCredentialData from authData
  * Decodes COSE key format (get(-2) = x, get(-3) = y)
  * Returns: { pubKeyX, pubKeyY } as hex strings (0x...)
- formatWebAuthnSignature(derSig) - Convert DER to raw r||s format (already done in useAuthFlow)
- arrayBufferToHex, hexToArrayBuffer, arrayBufferToBase64, base64ToArrayBuffer, base64url variants

REGISTRATION FLOW (/app/register/page.tsx):
1. navigator.credentials.create() with:
   - challenge: new Uint8Array(32) (hardcoded, should be random)
   - rp: { name: 'Schelling Point', id: hostname }
   - user: { id: Uint8Array(16), name: user-{code}, displayName: User {code} }
   - pubKeyCredParams: [{ type: 'public-key', alg: -7 }] (P-256/ES256)
   - authenticatorSelection: { authenticatorAttachment: 'platform', requireResidentKey: true, userVerification: 'required' }
   - attestation: 'direct'
2. Extract pubKeyX, pubKeyY, credentialId (base64url)
3. POST /api/register with { code, pubKeyX, pubKeyY, credentialId }

AUTHENTICATION (useAuthFlow.ts authorizeSession):
1. Generate ephemeral wallet (ethers.Wallet.createRandom())
2. Build challenge: keccak256(abi.encode(signer, expiry, chainId, contract))
3. navigator.credentials.get() with allowCredentials = [existing credential]
4. Parse DER signature r,s (manually in lines 133-158)
5. POST /api/authorize

LOGIN (useAuthFlow.ts login):
1. Sign challenge with ephemeral signer (not WebAuthn)
2. POST /api/login with challenge signature

NOTES:
- P-256 keys are 32 bytes (256 bits) each
- DER parsing handles variable length fields and leading zeros
- Coordinates returned as 0x{hex} strings for API transmission
- No precompile verification on frontend (server-side only)
**Files**: src/lib/webauthn.ts, src/app/register/page.tsx, src/hooks/useAuthFlow.ts
---

### [00:29] [pattern] Client State Management Pattern - No Redux/Context for Auth
**Details**: UPDATED PATTERN (January 2026):

AuthContext is now used for global state management:
- Defined in src/contexts/AuthContext.tsx
- Exported via src/hooks/useAuth.ts
- Provides: user, token, signerAddress, signerExpiry, isLoading, isLoggedIn
- Methods: login(), logout(), refreshUser()

State Components:
1. Token validation on mount (checkExistingSession) - validates with /api/auth/me
2. Signer expiry check (hasValidSigner) - checks signerExpiry > now
3. Login check - requires: user + token + valid signer
4. Token refresh with login retry fallback

localStorage still used for:
- 'passkeyInfo': Passkey coordinates (needed for API calls)
- 'sessionKey': Ephemeral signer private key (needed for vote signing)
- 'authToken': JWT (also in context via token)

Flow to "logged in":
1. User creates/recovers passkey → stored in localStorage
2. authorizeSession() → stores sessionKey in localStorage
3. login() via /api/login → stores token in localStorage + context
4. AuthContext detects token + signerExpiry → sets isLoggedIn = true

NOT USED:
- Redux, Zustand, or other global state managers
- Server sessions or HTTP-only cookies
- JWT middleware (validation per-route)
- useReducer or useState outside of components

Voting relies on:
- localStorage for passkeyInfo + sessionKey
- useVoting hook to sign and call /api/vote
- No AuthContext dependency needed for votes (works with localStorage)
**Files**: src/contexts/AuthContext.tsx, src/hooks/useAuth.ts, src/hooks/useVoting.ts
---

### [00:29] [gotcha] Message Signing Differences - WebAuthn vs Ephemeral Signer
**Details**: TWO DIFFERENT SIGNING APPROACHES used in the same system:

WEBAUTHN SIGNING (authorizeSession in useAuthFlow):
- Device signs with stored passkey (P-256)
- Challenge is server-provided keccak256 hash
- Signature comes back DER-encoded from WebAuthn
- Must manually parse DER to get r,s format for contract
- Used for: Authorizing ephemeral signer on-chain (contract.authorizeSigner)

EPHEMERAL SIGNER (vote and login):
- Browser signs with in-memory private key (k1/secp256k1)
- Challenge is either:
  * Login: Server-provided signed challenge (nonce only)
  * Vote: Computed locally from vote parameters
- Signature returned in serialized format from ethers.SigningKey
- ethers.Signature.from() converts to standard format
- Used for: Voting (contract.vote) and login (/api/login)

KEY DIFFERENCE IN MESSAGE FORMAT:

Login message (login):
- Raw sign: messageHash = keccak256(toUtf8Bytes("login:" + nonce))
- NOT EIP-191 prefixed (explicit comment in useAuthFlow line 88)

Vote message (castVote in useVoting):
- Raw sign: messageHash = keccak256(abi.encode(['string', 'bytes32', 'uint256', 'uint256', 'uint256', 'uint256', 'address'], ['vote', identityHash, topicId, amount, nonce, chainId, contract]))
- Includes contextual info (chainId, contract) to prevent replay attacks

Authorize message (authorizeSession):
- Challenge: keccak256(abi.encode(['address', 'uint256', 'uint256', 'address'], [signer, expiry, chainId, contract]))
- Built on frontend, passed to WebAuthn as Uint8Array buffer

CRITICAL: WebAuthn signature handling in useAuthFlow (lines 133-158) manually parses DER because:
- navigator.credentials.get() returns DER-encoded signatures
- Contract expects r,s as separate uint256 values
- Need to strip leading zeros and pad to 32 bytes
**Files**: src/hooks/useAuthFlow.ts, src/hooks/useVoting.ts
---

### [00:46] [architecture] Authentication Context and Route Protection Structure
**Details**: ## Auth System Overview

The application uses a **passkey-based authentication system with JWT tokens and ephemeral signers**. Here's the complete structure:

### Core Auth Context (/src/contexts/AuthContext.tsx)
- **AuthProvider**: Wraps app at root via `<Providers>` in layout.tsx
- **useAuth() hook**: Exported for components to access auth state
- **Storage**: Uses localStorage with NO server-side sessions
  - `authToken`: JWT stored in localStorage
  - `passkeyInfo`: Passkey credentials (credentialId, userId, pubKeyX, pubKeyY)
  - `sessionKey`: Ephemeral signer (privateKey, address, expiry)

### Auth State (AuthContextValue from /src/types/auth.ts)
```typescript
{
  user: AuthUser | null,           // { id, displayName, email, payoutAddress }
  token: string | null,            // JWT token
  signerAddress: string | null,    // Ephemeral wallet address
  signerExpiry: number | null,     // Unix timestamp (7 days)
  isLoading: boolean,              // True during session check
  isLoggedIn: boolean,             // user && token && hasValidSigner
  login: () => Promise<void>,      // Login with passkey
  logout: () => void,              // Clear localStorage + state
  refreshUser: () => Promise<void> // Validate token with /api/auth/me
}
```

### Auth Flow (useAuthFlow hook from /src/hooks/useAuthFlow.ts)
1. **Register**: Create WebAuthn passkey → /api/register
2. **Login/Authorize**: Two-step flow:
   - Step 1: `recoverPasskeyInfo()` - discoverable credentials or check localStorage
   - Step 2: `authorizeSession()` - Generate ephemeral wallet, Face ID sign, call /api/authorize
   - Step 3: `login()` - Sign challenge with ephemeral wallet, call /api/login to get JWT
3. Status: idle → recovering → authorizing → logging-in → success/error

### Initialization Flow
- App mounts → Providers wraps with AuthProvider
- AuthProvider useEffect checks for stored `authToken`
- Validates token via `/api/auth/me`
- Sets isLoading=false after check
- Restores user, token, signer info from localStorage

### Event Layout Route Protection
File: `/src/app/event/layout.tsx`
- **Currently uses**: useAuth hook to check isLoggedIn
- **Loading state**: Shows spinner if authLoading=true
- **Error state**: Shows error message
- **NOT BLOCKING**: Layout doesn't redirect unauthenticated users
- Calculates credits from balance or voting config
- Passes user info to Navbar component

### Admin Layout Structure
File: `/src/app/admin/layout.tsx`
- **NO auth protection**: Layout renders without checking user role
- Uses Radix UI components
- Has sidebar navigation with 8 main items + 2 tablet items
- "Back to Event" link goes to /event/sessions
- **Needs protection**: Should check admin role

### Login Page
File: `/src/app/login/page.tsx`
- **Redirects if logged in**: useEffect redirects to /event if isLoggedIn=true
- Supports two flows:
  - With existing passkey: 1-step (authorize)
  - Without passkey: 2-step (discover + authorize)
- Shows step indicators for multi-step flow
- Has error handling and "Try Again" button

## KEY FINDINGS FOR ROUTE PROTECTION

1. **No route middleware exists** - layouts check auth manually
2. **No role-based access control** - is_admin field exists in DB but never checked on frontend
3. **Auth check pattern**: `const { isLoggedIn } = useAuth()` then conditionally render
4. **Event layout doesn't block unauthenticated** - renders content with undefined user
5. **Admin layout has NO auth check at all** - completely unprotected
6. **JWT flow**: localStorage authToken + /api/auth/me validation
7. **Signer validation**: On-chain expiry check via contract.signers()
8. **Missing**: No middleware or redirect logic for protected routes
**Files**: /src/contexts/AuthContext.tsx, /src/types/auth.ts, /src/hooks/useAuthFlow.ts, /src/app/layout.tsx, /src/app/providers.tsx, /src/app/event/layout.tsx, /src/app/admin/layout.tsx, /src/app/login/page.tsx
---

### [21:53] [auth] Authentication Flow Architecture and Issues
**Details**: The Schelling Point auth system has three separate flows:

1. **Registration Flow** (/register?code=INVITE_CODE):
   - User creates WebAuthn passkey
   - POST /api/register stores passkey in DB, burns invite code
   - Then calls completeAuthFlow() which: authorizes ephemeral signer (Gate 2 on-chain) → gets JWT (login)
   - Success → redirects to /event/sessions
   - Profile setup is NOT triggered automatically

2. **Login Flow** (/login):
   - Recovers passkey via discoverable credentials OR uses localStorage passkeyInfo
   - Calls loginFlow() which: completeAuthFlow() (authorize signer → get JWT)
   - Success → redirects to /event/sessions
   - Profile setup is NOT triggered automatically

3. **Landing Page Flow** (/):
   - AuthModal has onComplete callback (never called - no handler in auth-modal.tsx)
   - AuthModal buttons route directly: "Register with invite code" → /register, "Sign in with Passkey" → /login
   - ProfileSetup modal on landing page is managed by authStep state but never triggered
   - The auth-modal.tsx doesn't call its onComplete prop - it just routes away

**Key Issues Found**:
1. AuthModal.tsx never calls onComplete prop despite it being defined - just routes to /register or /login
2. Auth-modal button text says "Register with invite code" but actually navigates to /register (confusing UX)
3. No profile setup flow after registration - happens auto on landing page demo but NOT in register or login pages
4. Post-auth routing goes directly to /event, bypassing profile setup entirely
5. Profile setup component exists but only used on landing page demo, not in actual auth flow
6. useAuthFlow.completeAuthFlow() completes both authorization AND login in one call, so user redirects immediately
**Files**: src/app/page.tsx, src/app/register/page.tsx, src/app/login/page.tsx, src/components/auth/auth-modal.tsx, src/hooks/useAuthFlow.ts, src/contexts/AuthContext.tsx
---

### [22:00] [gotcha] Auth redirect race condition fix
**Details**: The register and login pages had a race condition: useAuthFlow's status became 'success' and triggered redirect to /event before AuthContext had updated isLoggedIn. Event layout would then kick user back to /login. Fix: Added refreshSession() to AuthContext that re-reads localStorage and validates with API. Register/login pages now: (1) call refreshSession() when status='success', (2) only redirect when isLoggedIn is true.
**Files**: src/contexts/AuthContext.tsx, src/app/register/page.tsx, src/app/login/page.tsx, src/types/auth.ts
---

### [19:27] [testing] Critical broken user flows identified
**Details**: E2E testing analysis revealed critical issues:

1. JWT Authentication Missing (BLOCKER):
   - verifyJWT() function doesn't exist
   - jsonwebtoken not in dependencies
   - All JWT-protected endpoints fail (pre-voting, session proposal)

2. Admin Role Check Missing (SECURITY):
   - /admin/layout.tsx only checks isLoggedIn, not is_admin
   - Any authenticated user can access admin pages

3. Session Proposal Auth Header Missing:
   - /event/propose/page.tsx doesn't send Authorization header
   - All proposals fail with 401

4. Distribution Execution is Fake:
   - Uses setTimeout(3000) instead of API call
   - /api/events/{slug}/distribution/execute doesn't exist

5. Favorites Not Persisted:
   - No database table for favorites
   - localStorage only for non-auth users
   - On-chain votes conflated with favorites (value=1)

6. Status Value Mismatch:
   - TypeScript: 'proposed'/'declined'
   - Database: 'pending'/'rejected'

7. Track Field Lost:
   - Collected in UI but not sent to API
   - Database has no track column
**Files**: src/app/admin/layout.tsx, src/app/event/propose/page.tsx, src/app/api/events/[slug]/votes/me/route.ts, src/app/admin/distribution/page.tsx
---

