# Handoff: Quadratic Voting Overhaul

## Problem Statement

The current voting system is fragmented and confusing:
- Two separate voting phases (pre-event and attendance) that are being merged into one
- The my-votes page has a drag-and-drop ranking system with distribution curves that users didn't like
- Three overlapping React hooks (`useVoting`, `useOnChainVotes`, `use-votes`) handling votes in different ways
- The heart/favorite toggle casts on-chain votes, breaking the My Schedule page which reads from localStorage
- The existing smart contract stores individual vote values but has no credit budget, can't reduce votes, and doesn't enforce quadratic cost
- A tap-to-vote live voting page that's no longer needed

## Success Criteria

- [ ] New smart contract deployed to Base Sepolia with quadratic voting, budget enforcement, and batch allocation
- [ ] Single `useVotes` hook replaces all three existing hooks
- [ ] Sessions page has +/- voting on each card with optimistic UI and auto-save
- [ ] My-votes page shows all voted sessions in a simple list with +/- adjustment (no drag-and-drop, no curves, no save button)
- [ ] Relayer debounces votes server-side (~2s) before submitting to chain
- [ ] Heart toggle is localStorage favorites only (not on-chain)
- [ ] My Schedule page works correctly with localStorage favorites
- [ ] Multi-passkey users see correct allocations (most recent identity's data)
- [ ] Quadratic cost displayed correctly in UI (votes² = credits, fractional votes OK)
- [ ] Build passes, existing auth flow unaffected

## Scope Boundaries

### In Scope
- New Solidity contract (SchellingPointQV)
- Contract tests (Foundry)
- Contract deployment script
- Frontend: new `useVotes` hook
- Frontend: rewrite my-votes page
- Frontend: update sessions page voting
- Frontend: decouple heart from voting
- Backend: relayer debounce in `/api/vote`
- Backend: multi-passkey allocation merging
- Delete dead code (old hooks, live page, tap-to-vote, off-chain vote API routes)

### Out of Scope
- Auth changes (already done in this branch)
- QF distribution calculation
- Admin tooling
- Schedule algorithm
- Any new pages

## Technical Context

### Current Architecture
- **Frontend**: Next.js 14.2, React 18.3, TypeScript, Tailwind, Radix UI
- **State**: React Query (TanStack Query v5) for vote caching with optimistic updates
- **Chain**: Base Sepolia (chain 84532), RIP-7212 P256 precompile
- **Identity**: `identityHash = keccak256(abi.encodePacked(pubKeyX, pubKeyY))`
- **Auth**: WebAuthn passkeys → ephemeral k1 signers (7-day expiry) → JWT for API access
- **Relayer**: Next.js API routes sign and submit transactions on behalf of users
- **Database**: Supabase PostgreSQL — `user_passkeys` table (1:M with `users`) stores WebAuthn credentials per user (pubkey_x, pubkey_y, credential_id). Passkey columns were removed from users table in migrations 013-014.

### Quadratic Voting Math
- `total_credits = votes²` (e.g., 3 votes = 9 credits)
- `marginal_cost = 2 * currentVotes + 1` (next vote cost)
- `votes = sqrt(credits)` (can be fractional, e.g., 7 credits = ~2.65 votes)
- Budget: 100 credits per user per event
- Max: 10 votes on one session (100 credits), or spread across many

### Existing Utility Functions (src/lib/utils.ts)
```typescript
calculateQuadraticCost(votes) // = votes²
calculateNextVoteCost(currentVotes) // = 2 * currentVotes + 1
calculateMaxVotes(availableCredits) // = floor(sqrt(credits))
```

### Key Existing Files
- `src/hooks/useOnChainVotes.ts` — React Query wrapper with optimistic updates (best starting point for new hook)
- `src/hooks/useVoting.ts` — low-level contract interaction (delete after)
- `src/hooks/use-votes.ts` — off-chain vote tracking (delete after)
- `src/hooks/use-favorites.ts` — localStorage favorites (keep as-is)
- `src/components/voting/vote-counter.tsx` — +/- button component (reuse as-is)
- `src/components/voting/credit-bar.tsx` — credit usage display (reuse as-is)
- `src/components/voting/vote-dots.tsx` — vote visualization (reuse as-is)
- `src/app/event/my-votes/page.tsx` — full rewrite
- `src/app/event/sessions/page.tsx` — update voting integration
- `src/app/event/live/page.tsx` — delete or unlink from nav
- `src/components/voting/tap-to-vote.tsx` — delete
- `src/app/api/vote/route.ts` — rewrite with debounce
- `src/app/api/vote/batch/route.ts` — rewrite for new contract
- `src/app/api/events/[slug]/votes/` — delete (off-chain vote routes)
- `contracts/src/SchellingPointVotes.sol` — current contract (reference only)
- `contracts/test/SchellingPointVotes.t.sol` — current tests (reference for patterns)
- `src/lib/contracts/SchellingPointVotes.ts` — ABI + address (replace with new contract)

## Implementation Approach

### Phase 1: New Smart Contract (Write, Test, Lint, Audit)

**New file: `contracts/src/SchellingPointQV.sol`**

```
Storage:
  signers[identityHash][signer] => expiry          // same as current
  events[eventId] => { budget, active }             // admin-created
  allocations[eventId][identityHash][topicId] => credits
  totalSpent[eventId][identityHash] => credits

Functions:
  authorizeSigner(pubKey[2], signer, expiry, sig[2])
    — Same as current. P256 signature via RIP-7212 precompile.

  createEvent(eventId, budget)
    — Admin only (onlyOwner). Sets event budget (e.g., 100).
    — eventId is uint256. Use keccak256(slug) truncated, or a sequential counter.
    — The admin API creates the event on-chain and stores the on-chain eventId
      back in the Supabase events table (add an `onchain_event_id` column).

  closeEvent(eventId)
    — Admin only. Prevents further allocations.

  allocate(pubKey[2], signer, eventId, topicId, credits)
    — Verifies signer authorized + not expired
    — Verifies event active
    — Computes delta: credits - allocations[eventId][identity][topicId]
    — Verifies totalSpent[eventId][identity] + delta <= budget
    — Updates allocation and totalSpent
    — Emits Allocation(identityHash, eventId, topicId, credits)
    — Credits can be any uint256 value (no perfect square constraint)
    — Setting credits to 0 frees those credits back to budget

  batchAllocate(pubKey[2], signer, eventId, topicIds[], credits[])
    — THIS IS THE PRIMARY FUNCTION. Frontend sends full allocation state.
    — Delta approach (safe, no iteration needed):
      For each (topicId, credits) in the batch:
        1. oldCredits = allocations[eventId][identity][topicId]
        2. delta = credits - oldCredits (can be negative if reducing)
        3. totalSpent[eventId][identity] += delta
        4. allocations[eventId][identity][topicId] = credits
        5. Emit Allocation(identityHash, eventId, topicId, credits)
      After all topics: verify totalSpent <= budget (revert entire tx if over)
    — Topics NOT in the batch are untouched, their allocations and
      contribution to totalSpent remain correct.
    — Frontend should include explicit zeros for topics being fully removed,
      so those credits are freed. Topics omitted keep their old allocation.

  getAllocations(pubKey[2], eventId, topicIds[]) => credits[]
    — Read-only, returns current allocations

  getRemainingBudget(pubKey[2], eventId) => credits
    — Read-only, returns budget - totalSpent

Events:
  SignerAuthorized(identityHash, signer, expiry)     // same as current
  Allocation(identityHash, eventId, topicId, credits) // replaces Vote
  EventCreated(eventId, budget)
  EventClosed(eventId)

Key design:
  — No nonces. Allocations are idempotent (absolute values, not deltas).
    Replaying the same allocation is a no-op. Retries are safe.
  — No perfect square enforcement. UI shows sqrt(credits) as votes.
  — Budget enforced on-chain per identity per event.
```

**Tests: `contracts/test/SchellingPointQV.t.sol`**
- Use `vm.store()` to bypass P256 for local testing (same pattern as current tests)
- Test: allocate, reallocate (reduce), budget enforcement, batch, event lifecycle
- Test: setting allocation to 0 frees credits
- Test on Base Sepolia fork for full P256 integration

**Delete old contract files:**
- `contracts/src/SchellingPointVotes.sol` — old contract, replaced entirely
- `contracts/test/SchellingPointVotes.t.sol` — old tests, replaced entirely
- `contracts/script/DeployDryRun.s.sol` — old deploy script

Only `contracts/src/SchellingPointQV.sol`, its test file, and `Deploy.s.sol` (updated) should remain. No leftover contracts.

**Static Analysis & Linting (run before moving to Phase 2):**

```bash
# Install tools if not present
pip install slither-analyzer  # or pipx install slither-analyzer
npm install -g solhint

# Lint with Solhint
cd contracts && solhint 'src/**/*.sol'
# Fix all warnings/errors before proceeding

# Run Slither static analysis
slither src/SchellingPointQV.sol --config-file slither.config.json
# Address all high/medium findings. Low findings: review and document
# any intentional decisions as inline comments.

# Full Foundry test suite
forge test -vvv
# All tests must pass

# Gas report
forge test --gas-report
# Document gas costs for allocate and batchAllocate
```

The contract should pass Solhint with zero warnings and Slither with zero high/medium findings before moving on. This is the first gate — don't proceed to backend/frontend work until the contract is clean, tested, and audited.

Config files are already created:
- `contracts/.solhint.json` — extends solhint:recommended, customized for this project
- `contracts/.solhintignore` — excludes lib/, script/, test/
- `contracts/slither.config.json` — excludes known false positives (timestamp, assembly, low-level-calls for P256 precompile)

**Deploy: update `contracts/script/Deploy.s.sol` and `deploy.sh`**

### Phase 2: Backend — Relayer (No Server-Side Debounce)

**Rewrite: `src/app/api/vote/route.ts`**

The relayer receives allocation requests from the frontend and submits them to the contract. **Debouncing happens entirely on the frontend** (see Phase 3). The relayer is a simple pass-through.

```
POST /api/vote/allocate
  1. Validate signer authorized (on-chain check)
  2. Call contract.batchAllocate() with the full allocation set
  3. Return { success, txHash }

Design decision: Always use batchAllocate, even for a single topic change.
The frontend sends the full current allocation state (all topics with
credits > 0, plus explicit zeros for topics being removed). This means:
  — Idempotent: retries are safe, duplicates are no-ops
  — Simplifies the relayer to a stateless pass-through
  — Contract uses delta approach per topic (see Phase 1)
  — Topics omitted from the batch keep their old allocation
```

**Multi-passkey allocation resolution (in relayer or new API route):**

The `user_passkeys` table (1:M with users) stores all passkeys per user. Each passkey is a separate on-chain identity (`keccak256(pubKeyX, pubKeyY)`).

```
GET /api/votes?eventId=X
  1. Get userId from session/auth
  2. Query user_passkeys table for all passkeys belonging to this user_id
  3. For each passkey, compute identityHash = keccak256(pubKeyX, pubKeyY)
  4. Fetch Allocation events from contract for all identity hashes
  5. Find which identityHash has the most recent Allocation event (by block.timestamp)
  6. Fetch ALL current allocations for that identityHash (the full state)
  7. Return { allocations, activeIdentityHash, remainingBudget }

POST /api/vote/allocate
  Frontend sends the FULL allocation set (all topics with credits > 0).
  The relayer submits batchAllocate under the CURRENT passkey's identity.
  If the current passkey differs from the activeIdentityHash:
    — The batch includes the migrated allocations from the old identity
    — After this tx, the current identity has the most recent events
    — Next login (any device) will read from this identity
```

**Delete: `src/app/api/events/[slug]/votes/` and `src/app/api/events/[slug]/votes/me/`**

### Phase 3: Frontend — Single useVotes Hook

**New file: `src/hooks/useVotes.ts`** (replaces useOnChainVotes, useVoting, use-votes)

```typescript
function useVotes(eventId: string, sessionIds: string[]) {
  // Fetches allocations from GET /api/votes?eventId=X
  // React Query with optimistic updates

  // Returns:
  // - allocations: Record<sessionId, credits>
  // - votes: Record<sessionId, number> (sqrt of credits, for display)
  // - creditsSpent: number (sum of all allocations)
  // - creditsRemaining: number (100 - spent)
  // - setVotes(sessionId, votes): void
  //     → computes credits = votes²
  //     → optimistic cache update (instant UI)
  //     → resets debounce timer (2s)
  //     → on error: rollback from snapshot
  // - flush(): Promise<void>
  //     → immediately sends pending allocations to relayer
  // - isLoading, isSyncing, error

  // Debounce (frontend-side):
  // - Each call to setVotes() resets a 2-second timer
  // - When timer fires: POST full allocation state to relayer
  // - flush() sends immediately (called on page leave)
  // - Register beforeunload + Next.js routeChangeStart to call flush()
  // - "isSyncing" is true while there are unsent local changes
}
```

Base this on the existing `useOnChainVotes.ts` which already has:
- React Query caching (60s staleTime, 5min gcTime)
- Optimistic updates via `queryClient.setQueriesData` in `onMutate`
- Rollback on error from snapshot
- Query key structure for cache management

**Delete after migration:**
- `src/hooks/useOnChainVotes.ts`
- `src/hooks/useVoting.ts`
- `src/hooks/use-votes.ts`

### Phase 4: Frontend — My-Votes Page Rewrite

**Rewrite: `src/app/event/my-votes/page.tsx`**

Remove entirely:
- Drag-and-drop (DnD state, handlers, ranked sessions, GripVertical)
- Distribution curves (even/sqrt/linear/exponential, CurveType, weights)
- Stacked bar chart preview
- "Save Allocation" button
- RankedSession interface

Replace with:
- CreditBar at top showing remaining credits / total budget
- List of sessions with votes > 0, sorted by vote count descending
- Each row: format icon, session title, host name, VoteCounter (+/-)
- VoteCounter shows: current votes, credits spent, next vote cost
- Below: expandable "All Sessions" section for adding votes to new sessions
- Sessions reduced to 0 votes stay on page (dimmed, at bottom) until navigation
- No save button — auto-saves via useVotes hook

### Phase 5: Frontend — Sessions Page Update

**Modify: `src/app/event/sessions/page.tsx`**

- Replace `useVotes()` (old off-chain), `useOnChainVotes()`, `useVoteMutation()` with single `useVotes(eventId, sessionIds)`
- Heart toggle → `useFavorites` only (localStorage). Remove on-chain vote from heart.
- `handleVote(sessionId, votes)` → calls `useVotes().setVotes(sessionId, votes)`
- Credit display from `useVotes().creditsRemaining`
- Remove `handleToggleFavorite` on-chain logic

### Phase 6: Thorough Cleanup

**Principle: zero dead code.** After this phase, there should be no unused imports, no commented-out code blocks, no orphaned files, and no alternative code paths related to the old voting system. Grep the entire codebase for references to removed files/functions and clean up every import and usage.

**Delete files — contracts:**
- `contracts/src/SchellingPointVotes.sol` — old contract (if not already deleted in Phase 1)
- `contracts/test/SchellingPointVotes.t.sol` — old tests (if not already deleted in Phase 1)
- `contracts/script/DeployDryRun.s.sol` — old deploy script

**Delete files — frontend:**
- `src/app/event/live/page.tsx` — entire live voting page
- `src/components/voting/tap-to-vote.tsx` — tap-to-vote component
- `src/hooks/useVoting.ts` — old low-level contract hook
- `src/hooks/useOnChainVotes.ts` — old React Query vote hook
- `src/hooks/use-votes.ts` — old off-chain vote hook

**Delete files — backend:**
- `src/app/api/events/[slug]/votes/route.ts` — off-chain vote route
- `src/app/api/events/[slug]/votes/me/route.ts` — off-chain user votes route
- Any other files under `src/app/api/events/[slug]/votes/` (check for nested routes)

**Update files:**
- `src/app/event/layout.tsx` — remove live page tab from nav, remove any pre-event/attendance phase toggle logic
- `src/lib/contracts/SchellingPointVotes.ts` — replace entirely with new contract ABI + address (rename file to `SchellingPointQV.ts`)
- `src/components/sessions/session-card.tsx` — verify VoteCounter wiring works with new hook, remove any old vote handler references
- `src/app/event/my-schedule/page.tsx` — verify it reads from `useFavorites` (localStorage only)

**Sweep for dead references:**
After all deletions, run these checks:
```bash
# Find any remaining imports of deleted modules
grep -r "useVoting\|useOnChainVotes\|use-votes\|tap-to-vote\|SchellingPointVotes" src/ --include="*.ts" --include="*.tsx"

# Find any remaining references to old API routes
grep -r "attendance-votes\|pre-votes\|/live" src/ --include="*.ts" --include="*.tsx"

# Find any remaining references to old contract
grep -r "SchellingPointVotes" src/ contracts/ --include="*.ts" --include="*.tsx" --include="*.sol"

# TypeScript compilation check — catches broken imports
npx tsc --noEmit

# Build check
npm run build
```

Every match from those greps must be resolved — either updated to use the new system or deleted. No `// TODO: remove` comments, no `_unused` variable renames, no backwards-compat shims.

## Acceptance Criteria

1. **Contract tests**: `forge test` passes locally (with P256 bypass) and on Base Sepolia fork
2. **Contract linting**: `solhint 'src/**/*.sol'` passes with zero warnings
3. **Contract security**: `slither` reports zero high/medium findings
4. **Contract deployed**: to Base Sepolia with verified source
3. **Registration + Login**: still works (auth flow unchanged)
4. **Sessions page**: click + on a session → vote count increments instantly → credits decrease → on-chain allocation appears after ~2s debounce
5. **Sessions page**: click +++ rapidly → single on-chain tx with final value
6. **Sessions page**: heart toggle adds to My Schedule (localStorage), does NOT create on-chain allocation
7. **My-votes page**: shows flat list of voted sessions with +/- controls, no drag-and-drop, no save button
8. **My-votes page**: reducing to 0 keeps session on page (dimmed) until navigation
9. **My-votes page**: CreditBar shows correct remaining budget
10. **Quadratic cost**: 3 votes on a session shows 9 credits spent, next vote costs 7 credits
11. **Budget enforcement**: can't exceed 100 credits total (UI prevents it, contract rejects it)
12. **Multi-passkey**: user with two passkeys sees whichever identity's allocations are most recent; new votes migrate all allocations to current identity
13. **My Schedule**: works correctly with localStorage favorites
14. **Build**: `npm run build` passes (ignoring pre-existing popover dependency issue)
15. **Dead code**: old hooks, live page, tap-to-vote, off-chain vote routes all removed
16. **Zero dead references**: `grep` for old module names (useVoting, useOnChainVotes, use-votes, SchellingPointVotes, tap-to-vote, attendance-votes, pre-votes) returns zero matches in `src/` and `contracts/`
17. **Old contracts deleted**: only `SchellingPointQV.sol` exists in `contracts/src/`, old `SchellingPointVotes.sol` and `DeployDryRun.s.sol` are gone
18. **TypeScript clean**: `npx tsc --noEmit` passes with no errors from removed/changed modules
