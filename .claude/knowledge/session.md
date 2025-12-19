### [00:23] [architecture] Authentication Flow Architecture - No JWT, localStorage-based
**Details**: The authentication system does NOT use JWT tokens or server-side sessions. Instead it uses a multi-gate localStorage-based architecture:

GATE 1 (Registration): Passkey validation in database
- User registers with invite code at /register?code=INVITE_CODE
- Creates WebAuthn passkey (P-256) via navigator.credentials.create()
- Public key coordinates (X, Y) extracted from CBOR attestationObject 
- Backend: /api/register validates invite code, stores pubkey in Supabase, burns code
- Frontend stores in localStorage: { credentialId, userId, pubKeyX, pubKeyY }

GATE 2 (Authorization): Ephemeral session signer authorized on-chain
- useVoting hook calls authorizeSession() when needed
- Generates ephemeral wallet (valid 7 days)
- Creates authorization message: keccak256(abi.encodePacked(signer, expiry, chainId, contractAddress))
- User authenticates with Face ID/Touch ID to sign with passkey
- WebAuthn DER signature formatted to raw r||s format
- Backend: /api/authorize validates passkey exists in DB, calls contract.authorizeSigner()
- Frontend stores session key in localStorage: { privateKey, address, expiry }

GATE 3 (Voting): Ephemeral signer must be authorized on-chain
- /api/vote checks signers(identityHash, signer) on-chain for valid expiry
- Only relays votes if both gates pass

NO JWT/SESSION middleware - state management is entirely client-side:
- hasPasskey() checks localStorage for passkeyInfo
- hasValidSession() checks localStorage sessionKey expiry
- No HTTP cookies, no auth headers, no middleware
**Files**: src/hooks/useVoting.ts, src/app/api/register/route.ts, src/app/api/authorize/route.ts, src/app/api/vote/route.ts, src/lib/db/users.ts
---

### [00:23] [frontend] Auth Component Structure and Flow
**Details**: Frontend auth is structured as a state machine with modal components:

AuthModal (src/components/auth/auth-modal.tsx):
- Steps: 'choose' → 'email'/'wallet' → 'email-sent' → 'success'
- Currently simulated (email/wallet flows are UI demos with timeouts)
- onComplete callback triggers profile setup
- Takes props: open, onOpenChange, onComplete, eventName

ProfileSetup (src/components/auth/profile-setup.tsx):
- Multi-step form (3 steps) after auth
- Step 1: Avatar, displayName, bio, interests (up to 5)
- Step 2: Email, location, social links (all optional)
- Step 3: BurnerSetup component
- Returns ProfileData interface on completion
- Modal blocks background interaction (showClose={false})

OnboardingTutorial (src/components/auth/onboarding-tutorial.tsx):
- Tutorial flow after profile setup
- onComplete navigates to /event/sessions

Landing Page Flow (src/app/page.tsx):
- Manages auth state machine: 'none' | 'auth' | 'profile' | 'onboarding'
- Shows AuthModal when authStep === 'auth'
- Chains: AuthModal → ProfileSetup → OnboardingTutorial → /event/sessions

Event Layout (src/app/event/layout.tsx):
- Has Navbar with user name and credits
- Shows event status and tabs
- Currently uses mock data (no context/state provider)
- onSignOut callback on navbar not yet wired

NO context providers or global auth state - everything is local component state
**Files**: src/components/auth/auth-modal.tsx, src/components/auth/profile-setup.tsx, src/app/page.tsx, src/app/event/layout.tsx
---

### [00:23] [pattern] API Route Patterns - Database Validation Gates
**Details**: All API routes follow a consistent validation pattern with multiple security gates:

Pattern Template:
1. Input validation (required fields presence)
2. Database Gate 1: getUserByPasskey() validates passkey registered in Supabase
   - Returns User | null
   - If invalid: return 401 Unauthorized
3. Optional Gate 2: On-chain state validation (only for /api/vote)
   - Check signers(identityHash, signer) for valid expiry
   - If invalid: return 403 Forbidden
4. Contract interaction via ethers.js
5. Success response with txHash or data

/api/register Route:
- Input: { code, pubKeyX, pubKeyY }
- Gets user by invite code
- Calls registerPasskey() which sets pubkey_x, pubkey_y, burns code
- Returns: { success: true, userId }

/api/authorize Route:
- Input: { pubKeyX, pubKeyY, signer, expiry, authenticatorData, clientDataJSON, r, s }
- Gate 1: getUserByPasskey validates passkey in DB
- Calls contract.authorizeSigner()
- Verifies authorization readable on-chain (RPC lag handling)
- Returns: { success: true, txHash }

/api/vote Route:
- Input: { pubKeyX, pubKeyY, signer, topicId, amount, signature }
- Gate 1: getUserByPasskey validates passkey in DB
- Gate 2: contract.signers() checks signer authorized with valid expiry
- Calls contract.vote()
- Returns: { success: true, txHash }

/api/nonce Route:
- Query params: pubKeyX, pubKeyY
- Read-only contract call: contract.getNonce()
- Returns current nonce for vote signature creation

Error handling: Console.error with detailed logging, return error message in response
**Files**: src/app/api/register/route.ts, src/app/api/authorize/route.ts, src/app/api/vote/route.ts
---

### [00:23] [dependency] Key Libraries and No JWT Strategy
**Details**: Current dependencies (from package.json):
- No JWT library (jsonwebtoken, jwt-decode) in use
- No session middleware (express-session, next-auth)
- Authentication is passkey-based with ephemeral signers

WebAuthn Stack:
- @simplewebauthn/browser ^13.2.2 - Client-side WebAuthn utilities
- cbor-web ^10.0.11 - Parse CBOR-encoded attestationObject
- Custom extractPublicKey() in src/lib/webauthn.ts handles P-256 key extraction

Blockchain:
- ethers ^6.16.0 - Contract calls, wallet creation, message signing
- Custom SCHELLING_POINT_VOTES_ABI for contract interaction

Database:
- @supabase/supabase-js ^2.89.0 - Supabase PostgreSQL client
- Service layer pattern: src/lib/db/users.ts abstracts DB operations

State Management:
- localStorage for passkey info and session keys
- No Redux, Context API, or Zustand
- Component-level state with React.useState

For future login flow:
- Should follow same localStorage pattern for consistency
- Use existing gate 1 (database passkey validation) 
- Store any session data in localStorage matching existing ephemeral wallet pattern
- NO jwt library needed - continue using localStorage + contract state
**Files**: package.json, src/lib/webauthn.ts, src/lib/db/users.ts
---

