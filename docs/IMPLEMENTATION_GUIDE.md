# Schelling Point: Passkey Auth & On-Chain Voting Integration

## Executive Summary

This document describes the integration of passkey-based authentication and on-chain voting into the Schelling Point unconference platform. The goal is to replace the existing Supabase email OTP authentication with WebAuthn passkeys, and implement a generic on-chain voting primitive that supports multiple voting strategies.

**Key Outcomes:**
- Self-sovereign identity via WebAuthn passkeys (no email/password)
- On-chain voting for transparency and verifiability
- Off-chain data for everything else (events, sessions, scheduling)
- Generic voting contract that other protocols can wrap/extend

---

## Table of Contents

1. [Background & Context](#background--context)
2. [Architecture Decisions](#architecture-decisions)
3. [Contract Specification](#contract-specification)
4. [Authentication Integration](#authentication-integration)
5. [Voting System Design](#voting-system-design)
6. [UI Changes](#ui-changes)
7. [API Changes](#api-changes)
8. [Task Breakdown & Dependencies](#task-breakdown--dependencies)
9. [Environment Setup](#environment-setup)
10. [Testing Requirements](#testing-requirements)

---

## Terminology

> **Important**: This guide uses the following terms consistently.

| Term | Meaning | Example |
|------|---------|---------|
| **Event** | The whole unconference (collection of sessions) | "ETH Denver 2025" |
| **Session** | A single talk/workshop/discussion being voted on | "Building DAOs That Work" |
| **Topic** | Contract-level term for a votable item (= Session) | Same as Session |
| **Topic ID** | `keccak256(sessionUUID)` - the on-chain identifier | `0x1a2b3c...` |

When you see "topic" in contract code, it means "session" in the app. They are interchangeable.

---

## Development Mode Notice

> **No Migration Required**: We are in active development. There is no production data to preserve. Teams can:
> - Wipe and recreate the database as needed
> - Deploy fresh contracts without migration scripts
> - Reset user accounts and test data freely
>
> Do not spend time on backwards compatibility or data migration.

---

## Background & Context

### What is Schelling Point?

Schelling Point is a web2.5 unconference platform that uses quadratic voting for:
1. **Pre-Event Voting**: Participants signal which sessions they want to attend (influences scheduling)
2. **Attendance Voting**: During the event, participants vote to determine budget distribution to session hosts

### Why Passkeys + On-Chain?

We want the parts that determine "who gets money" to be self-sovereign and verifiable:
- **Authentication**: Your identity shouldn't depend on an email provider
- **Voting**: Vote tallies should be publicly verifiable on-chain

Everything else (event metadata, session info, scheduling) can stay off-chain in Supabase for simplicity.

### Current State

The codebase has two diverged branches that need to be merged:

**Main branch** has:
- Supabase email OTP authentication (`src/context/auth-context.tsx`)
- Real data hooks (`useSessions`, `useVotes`, `useEvent`, etc.)
- Schedule generation algorithm
- E2E test infrastructure (`tests/e2e/`)
- Frontend-backend integration
- Admin pages with real data

**Feature branch** (`feature/passkey-auth-voting`) has:
- WebAuthn passkey authentication (`src/contexts/AuthContext.tsx`)
- Ephemeral signer authorization (on-chain)
- JWT-based sessions
- On-chain voting (proof of concept)
- Smart contract deployed to Base Sepolia
- Passkey database migrations (010-013)

**Prerequisite**: Before starting implementation, the feature branch must be rebased onto main. This combines:
- Passkey auth (from feature) replacing email OTP (from main)
- On-chain voting (from feature) integrating with real data hooks (from main)

**After rebase, delete:**
- `src/context/auth-context.tsx` (old Supabase email OTP - note singular "context")
- `src/app/auth/callback/route.ts` (magic link callback)

**Keep from feature branch:**
- `src/contexts/AuthContext.tsx` (new passkey auth - note plural "contexts")

---

## Architecture Decisions

### Decision 1: Passkeys over Email OTP

**Choice**: WebAuthn passkeys with ephemeral signers

**Why**:
- Self-sovereign: No dependency on email provider
- Better UX: Face ID/Touch ID instead of checking email
- On-chain compatible: Passkey can authorize blockchain transactions

**Trade-off**: Users without biometric devices have degraded experience

### Decision 2: Ephemeral Signers for Voting UX

**Choice**: Passkey authorizes a 7-day ephemeral wallet; voting uses ephemeral wallet

**Why**:
- Face ID once, then vote many times instantly
- No biometric prompt per vote
- Ephemeral key stored in localStorage (acceptable risk for voting, not funds)

**How it works**:
```
1. User authenticates with passkey (Face ID) → creates ephemeral wallet
2. Passkey signs authorization message
3. Contract stores: signers[identityHash][ephemeralAddress] = expiry
4. Subsequent votes use ephemeral wallet signature (no Face ID)
```

### Decision 3: Generic Voting Primitive

**Choice**: `votes[identity][topic] = value` with interpretation off-chain

**Why**:
- Different voting strategies (quadratic, linear, ranked) interpret values differently
- Contract stays simple and reusable
- Other protocols can wrap with their own logic

**Rejected alternative**: Rolling 100-credit window
- Required complex off-chain indexing to determine "active" votes
- No clear on-chain state to read
- Hard to reason about

### Decision 4: Favorites + Weights Model

**Choice**:
- `value = 0`: Not voted / unfavorited
- `value = 1`: Favorited (simple mode, even split among all 1s)
- `values sum to 100`: Weighted allocation

**Why**:
- Organic favoriting: Tap to add (value=1), tap to remove (value=0)
- Deliberate allocation: Set percentages that sum to 100
- Single data structure, can't diverge
- Off-chain interpretation handles edge cases

**Interpretation rules** (enforced off-chain):
```
1. Gather all non-zero values for user
2. If all values are 1 → even split among favorites
3. If values sum to 100 → weighted distribution
4. Otherwise → error state, prompt user to fix
```

### Decision 5: Topic ID Format

**Choice**: `keccak256(sessionUUID)` computed client-side

**Why**:
- Deterministic and verifiable
- Session UUIDs are immutable (unlike titles/slugs)
- Users can independently verify by hashing
- Each session gets a unique topic ID for voting

### Decision 6: No On-Chain Vote Indexing

**Choice**: Read votes directly from contract storage, not from events

**Why**:
- `votes[identity][topic]` is readable on-chain
- No need for indexer/subgraph for basic reads
- Events still emitted for historical analysis if needed

### Decision 7: Client-Side Route Protection

**Choice**: Redirect in layout components, not Next.js middleware

**Why**:
- JWT is in localStorage, middleware can't access it
- Simpler implementation
- Protected APIs prevent data leakage anyway

**Trade-off**: Brief flash of page shell before redirect (acceptable for MVP)

---

## Contract Specification

### Current Contract Location
`contracts/src/SchellingPointVotes.sol`

### Changes Required

#### 1. Add Vote Storage

```solidity
// Add this state variable
mapping(bytes32 => mapping(bytes32 => uint256)) public votes;
// identityHash => topicId => value
```

#### 2. Rename `amount` to `value`

In the `vote()` function signature and all references:
```solidity
// Before
function vote(..., uint256 amount, ...)

// After
function vote(..., uint256 value, ...)
```

#### 3. Update `vote()` to Write Storage

```solidity
function vote(
    uint256[2] calldata pubKey,
    address signer,
    bytes32 topicId,        // Changed from uint256 to bytes32
    uint256 value,          // Renamed from amount
    bytes calldata sig
) external {
    bytes32 identityHash = keccak256(abi.encode(pubKey[0], pubKey[1]));

    require(signers[identityHash][signer] > block.timestamp, "signer not authorized");

    uint256 nonce = nonces[identityHash]++;

    bytes32 message = keccak256(abi.encode(
        "vote",
        identityHash,
        topicId,
        value,
        nonce,
        block.chainid,
        address(this)
    ));
    require(_recoverK1(message, sig) == signer, "invalid signer signature");

    // NEW: Write to storage
    votes[identityHash][topicId] = value;

    emit Vote(identityHash, signer, topicId, value, nonce);
}
```

#### 4. Add `batchVote()` Function

```solidity
function batchVote(
    uint256[2] calldata pubKey,
    address signer,
    bytes32[] calldata topicIds,
    uint256[] calldata values,
    bytes calldata sig
) external {
    require(topicIds.length == values.length, "length mismatch");

    bytes32 identityHash = keccak256(abi.encode(pubKey[0], pubKey[1]));

    require(signers[identityHash][signer] > block.timestamp, "signer not authorized");

    uint256 nonce = nonces[identityHash]++;

    // Sign over the entire batch
    bytes32 message = keccak256(abi.encode(
        "batchVote",
        identityHash,
        keccak256(abi.encodePacked(topicIds)),
        keccak256(abi.encodePacked(values)),
        nonce,
        block.chainid,
        address(this)
    ));
    require(_recoverK1(message, sig) == signer, "invalid signer signature");

    // Write all votes and emit individual events
    for (uint256 i = 0; i < topicIds.length; i++) {
        votes[identityHash][topicIds[i]] = values[i];
        emit Vote(identityHash, signer, topicIds[i], values[i], nonce);
    }
}
```

#### 5. Add Read Helper (Optional)

```solidity
function getVotes(
    bytes32 identityHash,
    bytes32[] calldata topicIds
) external view returns (uint256[] memory) {
    uint256[] memory result = new uint256[](topicIds.length);
    for (uint256 i = 0; i < topicIds.length; i++) {
        result[i] = votes[identityHash][topicIds[i]];
    }
    return result;
}
```

#### 6. Update Event Signature

```solidity
// topicId changed from uint256 to bytes32
event Vote(
    bytes32 indexed identityHash,
    address indexed signer,
    bytes32 indexed topicId,  // Changed
    uint256 value,            // Renamed
    uint256 nonce
);
```

### Full Updated Contract

See `contracts/src/SchellingPointVotes.sol` after changes are applied.

### Deployment

```bash
cd contracts
forge script script/Deploy.s.sol --rpc-url https://sepolia.base.org --broadcast --verify
```

Update `.env` with new `CONTRACT_ADDRESS` and `NEXT_PUBLIC_CONTRACT_ADDRESS`.

---

## Authentication Integration

### Overview

Replace Supabase email OTP with passkey + JWT authentication.

### Files to Modify/Replace

| Main Branch File | Action | Feature Branch Equivalent |
|-----------------|--------|--------------------------|
| `src/context/auth-context.tsx` | Replace | `src/contexts/AuthContext.tsx` |
| `src/app/auth/callback/route.ts` | Delete | N/A |
| `src/components/auth/auth-modal.tsx` | Modify or remove | Use `/login` page instead |
| `src/app/providers.tsx` | Modify | Use feature's AuthProvider |

### New Files from Feature Branch

These files need to be brought over from the feature branch:

```
src/contexts/AuthContext.tsx      # Auth context with JWT + signer state
src/hooks/useAuth.ts              # Hook re-exporting context
src/hooks/useAuthFlow.ts          # Complex auth flow orchestration
src/app/login/page.tsx            # Login page
src/app/register/page.tsx         # Registration page
src/app/api/login/route.ts        # Login API
src/app/api/login/challenge/route.ts  # Challenge generation
src/app/api/register/route.ts     # Registration API
src/app/api/authorize/route.ts    # Signer authorization API
src/app/api/auth/me/route.ts      # Current user API
src/app/api/auth/lookup/route.ts  # Credential lookup API
src/lib/jwt.ts                    # JWT utilities
src/lib/webauthn.ts               # WebAuthn utilities
src/lib/challenge-store.ts        # Challenge storage
src/lib/db/users.ts               # User database functions
```

### Auth Context API

The new AuthContext provides:

```typescript
interface AuthContextValue {
  user: User | null;
  token: string | null;
  signerAddress: string | null;
  signerExpiry: number | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  login: (token: string, user: User, signerAddress: string, signerExpiry: number) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
}
```

### Multi-Passkey Support

The `user_passkeys` table supports multiple passkeys per user for multi-device access:

```sql
-- One user can have multiple passkeys (phone + laptop)
user_passkeys:
  id, user_id, pubkey_x, pubkey_y, credential_id, created_at
  UNIQUE(pubkey_x, pubkey_y)  -- Each passkey is unique
  UNIQUE(credential_id)       -- Each credential is unique
```

**How it works:**
- Registration with an existing user's invite code adds a new passkey
- Any authorized passkey can be used to log in and vote
- Each passkey generates a different `identityHash` on-chain
- The payout calculation aggregates votes across all passkeys for a user

**Payout Logic for Multi-Passkey Users:**
```typescript
// When calculating payouts, aggregate across all user's passkeys
async function getUserVotesForPayout(userId: string, topicIds: string[]) {
  // Get all passkeys for this user
  const passkeys = await db.getUserPasskeys(userId)

  // Collect all votes from all passkeys, ordered by timestamp
  const allVotes: Vote[] = []
  for (const passkey of passkeys) {
    const identityHash = computeIdentityHash(passkey.pubkey_x, passkey.pubkey_y)
    const votes = await getVotesFromChain(identityHash, topicIds)
    allVotes.push(...votes)
  }

  // Sort chronologically, take most recent 100
  allVotes.sort((a, b) => b.timestamp - a.timestamp)
  return allVotes.slice(0, 100)
}
```

**Current Scope:** We don't need a UI for users to add passkeys themselves. Admins can issue new invite codes to existing users for additional device registration.

### Signer Refresh at Login

Ephemeral signers expire after 7 days. The login flow handles refresh:

```typescript
// In login flow (useAuthFlow.ts)
async function loginFlow() {
  const sessionKey = getStoredSessionKey()

  // Check if signer needs refresh (< 24 hours remaining)
  const needsRefresh = !sessionKey ||
    sessionKey.expiry < (Date.now() / 1000) + 86400  // 24 hours

  if (needsRefresh) {
    // Generate new ephemeral wallet and authorize with passkey
    await authorizeSession(passkeyInfo)
  }

  // Continue with login (get JWT)
  await login(passkeyInfo, sessionKey)
}
```

Users typically log in once per day. The passkey prompt (Face ID) happens at login time, not during voting. If a signer expires mid-session (edge case: app open > 24 hours), redirect to login.

### Route Protection Implementation

Add to `src/app/event/layout.tsx`:

```typescript
'use client'

import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function EventLayout({ children }) {
  const { isLoggedIn, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !isLoggedIn) {
      router.push('/login')
    }
  }, [isLoggedIn, isLoading, router])

  if (isLoading) {
    return <div>Loading...</div>
  }

  if (!isLoggedIn) {
    return null // Will redirect
  }

  return <>{children}</>
}
```

### Protected Routes

| Route Pattern | Protected? |
|--------------|------------|
| `/` | No |
| `/login` | No |
| `/register` | No |
| `/event/*` | Yes |
| `/profile` | Yes |
| `/admin/*` | Yes |

### JWT Validation for APIs

Add to write APIs (create, update, delete operations):

```typescript
import { verifyJWT } from '@/lib/jwt'

export async function POST(request: Request) {
  // Extract Bearer token
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const token = authHeader.slice(7)

  try {
    const payload = await verifyJWT(token)
    // payload contains: sub, pubKeyX, pubKeyY, signerAddress, signerExpiry

    // Proceed with request...
  } catch (err) {
    return Response.json({ error: 'Invalid token' }, { status: 401 })
  }
}
```

### Login Flow

```
1. User navigates to /login
2. If passkey info in localStorage:
   a. Generate ephemeral wallet
   b. Prompt Face ID to sign authorization
   c. Call /api/authorize (stores signer on-chain)
   d. Call /api/login (validates signer, issues JWT)
   e. Store JWT in localStorage
   f. Redirect to /event/sessions
3. If no passkey info (new device):
   a. Try discoverable credentials
   b. If found, recover passkey info, continue from 2a
   c. If not found, redirect to /register
```

---

## Voting System Design

### Conceptual Model

Users have two ways to vote:

1. **Simple Favoriting**: Tap to add (value=1), tap to remove (value=0)
   - All favorites get equal share
   - Organic, no-thought-required

2. **Weighted Allocation**: Set specific percentages (must sum to 100)
   - Ranking + curve selection UI
   - More deliberate

### On-Chain State

```
votes[identityHash][topicId] = value

Where:
- identityHash = keccak256(pubKeyX, pubKeyY)
- topicId = keccak256(sessionUUID)
- value = 0 (not voted), 1 (favorited), or percentage (1-100)
```

### Topic ID Generation

```typescript
import { keccak256, toUtf8Bytes } from 'ethers'

function getTopicId(sessionUuid: string): string {
  return keccak256(toUtf8Bytes(sessionUuid))
}
```

### Reading Votes from Chain

```typescript
import { Contract } from 'ethers'

async function getUserVotes(
  contract: Contract,
  pubKeyX: string,
  pubKeyY: string,
  topicIds: string[]
): Promise<Map<string, number>> {
  const identityHash = keccak256(
    defaultAbiCoder.encode(['uint256', 'uint256'], [pubKeyX, pubKeyY])
  )

  const results = new Map()
  for (const topicId of topicIds) {
    const value = await contract.votes(identityHash, topicId)
    results.set(topicId, Number(value))
  }
  return results
}
```

### Vote Interpretation (Off-Chain)

```typescript
interface VoteAllocation {
  topicId: string
  value: number
  percentage: number  // Computed
}

function interpretVotes(votes: Map<string, number>): {
  allocations: VoteAllocation[]
  mode: 'favorites' | 'weighted' | 'error'
  errorMessage?: string
} {
  const nonZero = [...votes.entries()].filter(([_, v]) => v > 0)

  if (nonZero.length === 0) {
    return { allocations: [], mode: 'favorites' }
  }

  const allOnes = nonZero.every(([_, v]) => v === 1)
  const sum = nonZero.reduce((s, [_, v]) => s + v, 0)

  if (allOnes) {
    // Even split
    const pct = 100 / nonZero.length
    return {
      allocations: nonZero.map(([topicId, value]) => ({
        topicId,
        value,
        percentage: pct
      })),
      mode: 'favorites'
    }
  }

  if (sum === 100) {
    // Weighted
    return {
      allocations: nonZero.map(([topicId, value]) => ({
        topicId,
        value,
        percentage: value
      })),
      mode: 'weighted'
    }
  }

  // Error state
  return {
    allocations: nonZero.map(([topicId, value]) => ({
      topicId,
      value,
      percentage: (value / sum) * 100  // Show current proportions
    })),
    mode: 'error',
    errorMessage: `Votes sum to ${sum}, expected 100. Please adjust your allocation.`
  }
}
```

### Curve-Based Allocation

When user ranks sessions and selects a curve:

```typescript
type CurveType = 'even' | 'linear' | 'quadratic'

function applyCurve(
  rankedTopicIds: string[],  // Ordered by preference
  curve: CurveType
): Map<string, number> {
  const n = rankedTopicIds.length
  const result = new Map<string, number>()

  if (n === 0) return result

  let weights: number[]

  switch (curve) {
    case 'even':
      weights = rankedTopicIds.map(() => 1)
      break
    case 'linear':
      // First gets n, second gets n-1, etc.
      weights = rankedTopicIds.map((_, i) => n - i)
      break
    case 'quadratic':
      // First gets n², second gets (n-1)², etc.
      weights = rankedTopicIds.map((_, i) => Math.pow(n - i, 2))
      break
  }

  const totalWeight = weights.reduce((a, b) => a + b, 0)

  // Convert to percentages that sum to 100
  let allocated = 0
  rankedTopicIds.forEach((topicId, i) => {
    if (i === n - 1) {
      // Last one gets remainder to ensure sum = 100
      result.set(topicId, 100 - allocated)
    } else {
      const pct = Math.floor((weights[i] / totalWeight) * 100)
      result.set(topicId, pct)
      allocated += pct
    }
  })

  return result
}
```

---

## UI Changes

### Sessions Page (`/event/sessions`)

Add favorite/unfavorite functionality:

```typescript
// In session card or list item
function SessionCard({ session }) {
  const { castVote, isVoting } = useVoting()
  const [isFavorited, setIsFavorited] = useState(false)

  // session.id is the Supabase UUID for this session
  const topicId = getTopicId(session.id)

  const handleFavorite = async () => {
    const newValue = isFavorited ? 0 : 1
    await castVote(topicId, newValue)
    setIsFavorited(!isFavorited)
  }

  return (
    <Card>
      {/* ...existing content... */}
      <Button
        variant={isFavorited ? "default" : "outline"}
        onClick={handleFavorite}
        disabled={isVoting}
      >
        {isFavorited ? <Heart /> : <HeartIcon />}
      </Button>
    </Card>
  )
}
```

### My Votes Page (`/event/my-votes`)

Transform from +/- voting to:
1. Draggable ranking list
2. Curve selector
3. Percentage preview

```typescript
// Simplified structure
export default function MyVotesPage() {
  const [rankedSessions, setRankedSessions] = useState([])
  const [curve, setCurve] = useState<CurveType>('even')
  const [allocation, setAllocation] = useState<Map<string, number>>()

  // Recompute allocation when ranking or curve changes
  useEffect(() => {
    const topicIds = rankedSessions.map(s => getTopicId(s.id))
    setAllocation(applyCurve(topicIds, curve))
  }, [rankedSessions, curve])

  const handleSave = async () => {
    // Convert allocation to batch vote
    const topicIds = [...allocation.keys()]
    const values = [...allocation.values()]
    await batchVote(topicIds, values)
  }

  return (
    <div>
      {/* Curve selector */}
      <Select value={curve} onValueChange={setCurve}>
        <SelectItem value="even">Even Split</SelectItem>
        <SelectItem value="linear">Linear (rank matters)</SelectItem>
        <SelectItem value="quadratic">Quadratic (top-heavy)</SelectItem>
      </Select>

      {/* Draggable list */}
      <DraggableList
        items={rankedSessions}
        onReorder={setRankedSessions}
        renderItem={(session, index) => (
          <div className="flex justify-between">
            <span>{index + 1}. {session.title}</span>
            <span>{allocation.get(getTopicId(session.id))}%</span>
          </div>
        )}
      />

      {/* Save button */}
      <Button onClick={handleSave}>Save Allocation</Button>
    </div>
  )
}
```

### Live Voting Page (`/event/live`)

Merge main's session-finding logic with on-chain voting:

1. Use `useSessions` and `useTimeSlots` to find currently-live session
2. Use `useVoting` hook for on-chain vote submission
3. Show transaction confirmations

---

## API Changes

### New Routes (from feature branch)

| Route | Method | Purpose | Auth Required |
|-------|--------|---------|---------------|
| `/api/register` | POST | Register passkey | No |
| `/api/login/challenge` | POST | Generate login challenge | No |
| `/api/login` | POST | Verify signature, issue JWT | No |
| `/api/authorize` | POST | Authorize ephemeral signer | No (has passkey) |
| `/api/auth/me` | GET | Get current user from JWT | Yes |
| `/api/auth/lookup` | GET | Find user by credential ID | No |
| `/api/nonce` | GET | Get current nonce for signing | No |
| `/api/vote` | POST | Cast single vote | Yes |

### Add `/api/vote/batch` Route

```typescript
// src/app/api/vote/batch/route.ts
export async function POST(request: Request) {
  const { pubKeyX, pubKeyY, signer, topicIds, values, signature } = await request.json()

  // Validate JWT
  // Validate signer is authorized on-chain
  // Call contract.batchVote()
  // Return txHash
}
```

### Modify Existing Write APIs

Add JWT validation to:
- `POST /api/events/[slug]/sessions` (propose session)
- `PATCH /api/events/[slug]/sessions/[id]` (update session)
- `POST /api/events/[slug]/sessions/[id]/approve` (admin)
- etc.

### Keep Public

Read APIs can stay public:
- `GET /api/events/[slug]`
- `GET /api/events/[slug]/sessions`
- `GET /api/events/[slug]/schedule`
- etc.

---

## Task Breakdown & Dependencies

### Dependency Graph

```
                    ┌─────────────────┐
                    │ 0. Rebase       │
                    │    Branches     │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │ 1. Contract     │
                    │    Updates +    │
                    │    Tests        │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │ 2. Deploy       │
                    │    Contract     │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              ▼              ▼              ▼
     ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
     │ 3. Auth     │ │ 4. Supabase │ │ 5. Voting   │
     │ Finalization│ │ Migrations  │ │ Hook Update │
     └──────┬──────┘ └──────┬──────┘ └──────┬──────┘
            │               │               │
            └───────────────┼───────────────┘
                            │
                            ▼
                   ┌─────────────────┐
                   │ 6. UI Updates   │
                   │ (Sessions,      │
                   │  My-Votes,      │
                   │  Live)          │
                   └────────┬────────┘
                            │
                            ▼
                   ┌─────────────────┐
                   │ 7. E2E Testing  │
                   └─────────────────┘
```

### Parallelization Opportunities

**Can run in parallel after contract deployed:**
- Task 3 (Auth Integration)
- Task 4 (Supabase Migrations)
- Task 5 (Voting Hook Update)

**Can run in parallel after dependencies met:**
- Sessions page UI
- My-Votes page UI
- Live voting page UI

### Task Details

#### Task 0: Rebase Branches
**Team**: Lead developer
**Estimated complexity**: Medium
**Dependencies**: None
**Deliverables**:
- [ ] Rebase `feature/passkey-auth-voting` onto `main`
- [ ] Resolve merge conflicts (expect conflicts in providers, layout, hooks)
- [ ] Delete old auth: `src/context/auth-context.tsx`, `src/app/auth/callback/route.ts`
- [ ] Keep new auth: `src/contexts/AuthContext.tsx`
- [ ] Verify app builds: `npm run build`
- [ ] Verify dev server starts: `npm run dev`

**Verification**:
```bash
git log --oneline -5  # Should show rebased history
npm run build         # Should pass
npm run dev           # Should start without errors
```

#### Task 1: Contract Updates + Tests
**Team**: Solidity developer
**Estimated complexity**: Medium
**Files**: `contracts/src/SchellingPointVotes.sol`, `contracts/test/SchellingPointVotes.t.sol`
**Dependencies**: Task 0
**Deliverables**:
- [ ] Add `votes` storage mapping
- [ ] Rename `amount` → `value`
- [ ] Change `topicId` from `uint256` to `bytes32`
- [ ] Update `vote()` to write storage
- [ ] Add `batchVote()` function
- [ ] Update event signature
- [ ] **Create test file** `contracts/test/SchellingPointVotes.t.sol` (currently missing!)
- [ ] Write tests for all functions (see Testing Requirements section)
- [ ] All tests pass

**Note**: Contract tests don't currently exist. They need to be created from scratch.

**Testing Strategy for P256**:
- Use `vm.store()` to bypass P256 signature verification locally
- Run full integration tests against Base Sepolia fork: `forge test --fork-url https://sepolia.base.org`

**Verification**:
```bash
cd contracts
forge test -vvv
```

#### Task 2: Deploy Contract
**Team**: DevOps / Solidity developer
**Estimated complexity**: Low
**Files**: `.env`, `contracts/script/Deploy.s.sol`
**Dependencies**: Task 1
**Deliverables**:
- [ ] Deploy to Base Sepolia
- [ ] Verify on Basescan
- [ ] Update CONTRACT_ADDRESS in `.env`
- [ ] Verify contract is readable (call `votes()`)

**Verification**:
```bash
cast call $CONTRACT_ADDRESS "votes(bytes32,bytes32)" $IDENTITY_HASH $TOPIC_ID --rpc-url https://sepolia.base.org
```

#### Task 3: Auth Finalization
**Team**: Frontend/Full-stack developer
**Estimated complexity**: Low-Medium
**Dependencies**: Task 0 (rebase), Task 2 (contract address for voting)

**Note**: Auth is already implemented on the feature branch. After rebase, it just needs integration with main's data hooks and route protection.

**Files already present** (from feature branch after rebase):
```
src/contexts/AuthContext.tsx      # ✅ Already implemented
src/hooks/useAuth.ts              # ✅ Already implemented
src/hooks/useAuthFlow.ts          # ✅ Already implemented
src/app/login/page.tsx            # ✅ Already implemented
src/app/register/page.tsx         # ✅ Already implemented
src/app/api/login/route.ts        # ✅ Already implemented
src/app/api/login/challenge/route.ts  # ✅ Already implemented
src/app/api/register/route.ts     # ✅ Already implemented
src/app/api/authorize/route.ts    # ✅ Already implemented
src/app/api/auth/me/route.ts      # ✅ Already implemented
src/app/api/auth/lookup/route.ts  # ✅ Already implemented
src/lib/jwt.ts                    # ✅ Already implemented
src/lib/webauthn.ts               # ✅ Already implemented
src/lib/challenge-store.ts        # ✅ Already implemented
src/lib/db/users.ts               # ✅ Already implemented
```

**Files to finalize after rebase**:
```
src/app/providers.tsx     # Ensure AuthProvider wraps app correctly
src/app/event/layout.tsx  # Add route protection
src/app/layout.tsx        # Verify provider hierarchy
```

**Deliverables**:
- [ ] Verify AuthProvider is correctly integrated after rebase
- [ ] Add route protection to event layout (redirect to /login if not authenticated)
- [ ] Integrate with main's Navbar component (show user info, logout button)
- [ ] Login flow works end-to-end
- [ ] Logout works
- [ ] Protected routes redirect to /login
- [ ] Implement signer refresh at login (if < 24 hours remaining)

**Verification**:
1. Navigate to /event/sessions without logging in → redirects to /login
2. Register new account at /register?code=TESTCODE
3. Login at /login → redirects to /event/sessions
4. Refresh page → still logged in
5. Logout → redirects to /login

#### Task 4: Supabase Migrations
**Team**: Backend developer
**Estimated complexity**: Low
**Dependencies**: Supabase project access
**Files**: `supabase/migrations/`
**Deliverables**:
- [ ] Run existing migrations on hosted Supabase
- [ ] Verify tables exist (users, user_passkeys, events, sessions, etc.)
- [ ] Run seed data
- [ ] Verify data is queryable

**Verification**:
```sql
SELECT * FROM users LIMIT 5;
SELECT * FROM events LIMIT 5;
SELECT * FROM sessions LIMIT 5;
```

#### Task 5: Voting Hook Update
**Team**: Frontend developer
**Estimated complexity**: Medium
**Dependencies**: Task 2 (contract address)
**Files**:
```
src/hooks/useVoting.ts (update)
src/lib/contracts/SchellingPointVotes.ts (update ABI)
src/app/api/vote/route.ts (update)
src/app/api/vote/batch/route.ts (new)
```
**Deliverables**:
- [ ] Update contract ABI with new functions
- [ ] Update useVoting hook with batchVote
- [ ] Update vote API route for new signature
- [ ] Add batch vote API route
- [ ] Add topic ID generation utility

**Verification**:
```typescript
// Should be able to:
const { castVote, batchVote } = useVoting()
await castVote(topicId, 1)  // Favorite
await castVote(topicId, 0)  // Unfavorite
await batchVote([topic1, topic2], [60, 40])  // Weighted
```

#### Task 6: UI Updates
**Team**: Frontend developer
**Estimated complexity**: Medium
**Dependencies**: Tasks 3, 5
**Files**:
```
src/app/event/sessions/page.tsx (add favorite button)
src/app/event/my-votes/page.tsx (ranking + curves)
src/app/event/live/page.tsx (wire to on-chain)
src/components/sessions/session-card.tsx (favorite button)
```
**Deliverables**:
- [ ] Sessions page: favorite/unfavorite sessions
- [ ] My-Votes page: drag to rank, curve selector, percentage preview
- [ ] Live page: on-chain voting works
- [ ] All pages read vote state from chain

**Verification**:
1. Favorite a session → value=1 on chain
2. Unfavorite → value=0 on chain
3. Rank sessions + select curve → values sum to 100 on chain
4. Live voting → transactions visible on Basescan

#### Task 7: E2E Testing
**Team**: QA / Full-stack developer
**Estimated complexity**: Medium
**Dependencies**: All above
**Files**: `tests/e2e/`
**Deliverables**:
- [ ] Auth flow test (register, login, logout)
- [ ] Favoriting test
- [ ] Ranking + allocation test
- [ ] Live voting test

---

## Environment Setup

### Required Environment Variables

```bash
# .env.local

# Supabase
SUPABASE_URL=https://ixnbhztqrxodrlgdiaav.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
NEXT_PUBLIC_SUPABASE_URL=https://ixnbhztqrxodrlgdiaav.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>

# Blockchain
RELAYER_PRIVATE_KEY=<private-key-with-base-sepolia-eth>
CONTRACT_ADDRESS=<deployed-contract-address>
NEXT_PUBLIC_CONTRACT_ADDRESS=<same-as-above>
BASE_RPC_URL=https://sepolia.base.org
NEXT_PUBLIC_CHAIN_ID=84532

# JWT (generate a random secret)
JWT_SECRET=<random-32-byte-hex>
```

### Local Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Run contract tests
cd contracts && forge test

# Run E2E tests
npm run test:e2e
```

### Required Tools

- Node.js 18+
- Foundry (forge, cast, anvil)
- A browser with WebAuthn support (Chrome, Safari, Firefox)

---

## Testing Requirements

### Unit Tests

#### Contract Tests
Location: `contracts/test/SchellingPointVotes.t.sol`

**Note**: This file needs to be created - it doesn't exist yet.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "forge-std/Test.sol";
import "../src/SchellingPointVotes.sol";

contract SchellingPointVotesTest is Test {
    SchellingPointVotes public votes;
    address public signer;
    uint256 public signerPk;

    function setUp() public {
        votes = new SchellingPointVotes();
        (signer, signerPk) = makeAddrAndKey("signer");
    }

    // Helper to bypass P256 verification using vm.store()
    function _authorizeSigner(
        uint256[2] memory pubKey,
        address _signer,
        uint256 expiry
    ) internal {
        bytes32 identityHash = keccak256(abi.encode(pubKey[0], pubKey[1]));
        // Manually set signers[identityHash][_signer] = expiry
        bytes32 slot = keccak256(abi.encode(_signer, keccak256(abi.encode(identityHash, uint256(0)))));
        vm.store(address(votes), slot, bytes32(expiry));
    }

    // Required test cases
    function test_vote_storesValue() public { }
    function test_vote_emitsEvent() public { }
    function test_vote_overwritesPrevious() public { }
    function test_vote_requiresAuthorizedSigner() public { }
    function test_vote_incrementsNonce() public { }
    function test_batchVote_storesAllValues() public { }
    function test_batchVote_emitsMultipleEvents() public { }
    function test_batchVote_acceptsZeros() public { }
    function test_batchVote_requiresMatchingLengths() public { }
    function test_batchVote_usesOneNonce() public { }
    function test_getVotes_returnsStoredValues() public { }
}
```

**Testing P256 Signatures**:
- Locally: Use `vm.store()` cheatcode to bypass P256 verification (as shown above)
- Integration: Fork Base Sepolia where RIP-7212 precompile exists
  ```bash
  forge test --fork-url https://sepolia.base.org
  ```

### Integration Tests

#### Auth Flow
```typescript
test('register flow', async () => {
  // Navigate to /register?code=TESTCODE
  // Create passkey
  // Verify redirect to authorize
  // Verify JWT issued
  // Verify redirect to /event/sessions
})

test('login flow', async () => {
  // Navigate to /login
  // Trigger passkey
  // Verify JWT issued
  // Verify redirect to /event/sessions
})

test('protected route redirect', async () => {
  // Clear localStorage
  // Navigate to /event/sessions
  // Verify redirect to /login
})
```

#### Voting Flow
```typescript
test('favorite session', async () => {
  // Login
  // Navigate to sessions
  // Click favorite
  // Verify vote on chain
  // Verify UI updated
})

test('weighted allocation', async () => {
  // Login
  // Navigate to my-votes
  // Drag to reorder
  // Select curve
  // Save
  // Verify votes on chain sum to 100
})
```

### WebAuthn E2E Testing Strategy

WebAuthn requires biometric authentication which can't run in headless CI. Use Playwright's **Virtual Authenticator API**:

```typescript
// tests/setup/webauthn-helpers.ts
import { CDPSession, BrowserContext } from '@playwright/test'

export async function setupVirtualAuthenticator(context: BrowserContext) {
  const page = await context.newPage()
  const cdp = await context.newCDPSession(page)

  await cdp.send('WebAuthn.enable')

  const { authenticatorId } = await cdp.send('WebAuthn.addVirtualAuthenticator', {
    options: {
      protocol: 'ctap2',
      transport: 'internal',
      hasResidentKey: true,
      hasUserVerification: true,
      isUserVerified: true,  // Auto-verify (simulates Face ID success)
    }
  })

  return { page, cdp, authenticatorId }
}

// In your test
test('register with passkey', async ({ context }) => {
  const { page, authenticatorId } = await setupVirtualAuthenticator(context)

  await page.goto('/register?code=TESTCODE')
  await page.click('[data-testid="create-passkey-btn"]')

  // Virtual authenticator auto-creates credential
  await expect(page).toHaveURL('/event/sessions')
})
```

**Key points:**
- Virtual authenticator simulates real WebAuthn behavior
- `isUserVerified: true` means all biometric checks auto-pass
- Credentials persist within the test session
- Works in headless CI (GitHub Actions, etc.)

### Manual Testing Checklist

- [ ] Register with invite code
- [ ] Login on same device
- [ ] Login on new device (discoverable credential)
- [ ] Favorite multiple sessions
- [ ] View favorites in my-votes
- [ ] Reorder favorites
- [ ] Change curve, see percentages update
- [ ] Save allocation, verify on Basescan
- [ ] Logout and verify redirect
- [ ] Refresh while logged in, stay logged in

---

## Orchestration Notes

### For the Coordinator

1. **Start with contract** (Task 1-2): This unblocks everything else
2. **Run Tasks 3, 4, 5 in parallel**: Different files, no conflicts
3. **UI work** (Task 6) can start once auth is working
4. **E2E tests** verify the integration works end-to-end

### Communication Points

- After contract deploy: Share new CONTRACT_ADDRESS with all teams
- After auth integration: Confirm login works before UI work begins
- After voting hook: Confirm chain reads work before UI integration

### Risk Areas

1. **WebAuthn browser differences**: Test on Chrome, Safari, Firefox
2. **Base Sepolia RPC reliability**: Have backup RPC if public one is slow
3. **Signature format**: DER vs raw r||s - ensure consistent across auth flow

---

## Glossary

| Term | Definition |
|------|------------|
| Identity Hash | `keccak256(pubKeyX, pubKeyY)` - unique identifier derived from passkey |
| Topic ID | `keccak256(sessionUUID)` - unique identifier for a votable session |
| Ephemeral Signer | Temporary wallet authorized by passkey, valid 7 days |
| Value | The vote value: 0=none, 1=favorite, 1-100=percentage |
| Curve | Distribution function: even, linear, quadratic |

---

## Appendix: Code Snippets

### A. Topic ID Generation

```typescript
// src/lib/voting.ts
import { keccak256, toUtf8Bytes } from 'ethers'

export function getTopicId(sessionUuid: string): string {
  return keccak256(toUtf8Bytes(sessionUuid))
}
```

### B. Vote Value Interpretation

```typescript
// src/lib/voting.ts
export type VoteMode = 'favorites' | 'weighted' | 'error'

export function interpretVotes(votes: Map<string, number>): {
  mode: VoteMode
  allocations: { topicId: string; value: number; percentage: number }[]
  error?: string
} {
  const nonZero = [...votes.entries()].filter(([_, v]) => v > 0)

  if (nonZero.length === 0) {
    return { mode: 'favorites', allocations: [] }
  }

  const allOnes = nonZero.every(([_, v]) => v === 1)
  const sum = nonZero.reduce((s, [_, v]) => s + v, 0)

  if (allOnes) {
    const pct = 100 / nonZero.length
    return {
      mode: 'favorites',
      allocations: nonZero.map(([topicId, value]) => ({
        topicId, value, percentage: pct
      }))
    }
  }

  if (sum === 100) {
    return {
      mode: 'weighted',
      allocations: nonZero.map(([topicId, value]) => ({
        topicId, value, percentage: value
      }))
    }
  }

  return {
    mode: 'error',
    allocations: nonZero.map(([topicId, value]) => ({
      topicId, value, percentage: (value / sum) * 100
    })),
    error: `Votes sum to ${sum}, expected 100`
  }
}
```

### C. Curve Application

```typescript
// src/lib/voting.ts
export type CurveType = 'even' | 'linear' | 'quadratic'

export function applyCurve(
  rankedTopicIds: string[],
  curve: CurveType
): Map<string, number> {
  const n = rankedTopicIds.length
  const result = new Map<string, number>()

  if (n === 0) return result

  let weights: number[]
  switch (curve) {
    case 'even':
      weights = rankedTopicIds.map(() => 1)
      break
    case 'linear':
      weights = rankedTopicIds.map((_, i) => n - i)
      break
    case 'quadratic':
      weights = rankedTopicIds.map((_, i) => Math.pow(n - i, 2))
      break
  }

  const total = weights.reduce((a, b) => a + b, 0)
  let allocated = 0

  rankedTopicIds.forEach((topicId, i) => {
    if (i === n - 1) {
      result.set(topicId, 100 - allocated)
    } else {
      const pct = Math.floor((weights[i] / total) * 100)
      result.set(topicId, pct)
      allocated += pct
    }
  })

  return result
}
```

### D. Batch Vote API Route

```typescript
// src/app/api/vote/batch/route.ts
import { NextResponse } from 'next/server'
import { ethers } from 'ethers'
import { verifyJWT } from '@/lib/jwt'
import { SCHELLING_POINT_VOTES_ABI, getContractConfig } from '@/lib/contracts/SchellingPointVotes'

export async function POST(request: Request) {
  try {
    // Verify JWT
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const payload = await verifyJWT(authHeader.slice(7))

    // Parse request
    const { pubKeyX, pubKeyY, signer, topicIds, values, signature } = await request.json()

    // Validate lengths match
    if (topicIds.length !== values.length) {
      return NextResponse.json({ error: 'Length mismatch' }, { status: 400 })
    }

    // Connect to contract
    const provider = new ethers.JsonRpcProvider(process.env.BASE_RPC_URL)
    const wallet = new ethers.Wallet(process.env.RELAYER_PRIVATE_KEY!, provider)
    const { address, abi } = getContractConfig()
    const contract = new ethers.Contract(address, abi, wallet)

    // Verify signer is authorized
    const identityHash = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ['uint256', 'uint256'],
        [pubKeyX, pubKeyY]
      )
    )
    const expiry = await contract.signers(identityHash, signer)
    if (expiry <= Math.floor(Date.now() / 1000)) {
      return NextResponse.json({ error: 'Signer not authorized' }, { status: 403 })
    }

    // Submit batch vote
    const tx = await contract.batchVote(
      [pubKeyX, pubKeyY],
      signer,
      topicIds,
      values,
      signature
    )

    const receipt = await tx.wait()

    return NextResponse.json({
      success: true,
      txHash: receipt.hash
    })
  } catch (error) {
    console.error('Batch vote error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
```
