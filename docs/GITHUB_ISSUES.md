# GitHub Issues for Schelling Point App Fixes

This document contains all the GitHub issues that need to be created to fix the broken user flows identified during E2E testing.

---

## Priority Legend
- **P0 - Blocker**: Completely blocks core functionality
- **P1 - Critical**: Major feature broken
- **P2 - High**: Important feature impacted
- **P3 - Medium**: Usability issue
- **P4 - Low**: Enhancement

---

## Issue #1: Implement JWT Authentication System

**Priority**: P0 - Blocker
**Labels**: `bug`, `security`, `authentication`, `P0-blocker`

### Description
Multiple API endpoints import and use `verifyJWT()` function that does not exist in the codebase. Additionally, `jsonwebtoken` is not in `package.json` dependencies. This causes all JWT-protected endpoints to fail.

### Affected Files
- `/src/app/api/events/[slug]/votes/route.ts`
- `/src/app/api/events/[slug]/votes/me/route.ts`
- All other routes that require authenticated user

### Current Behavior
- API routes call `verifyJWT(token)` which throws "function not found" error
- All authenticated endpoints return 500 or 401
- Pre-event voting completely broken
- Session proposal submission broken

### Expected Behavior
- JWT tokens are properly validated
- Authenticated endpoints work correctly
- User identity is available in API routes

### Technical Requirements
1. Add `jsonwebtoken` to dependencies
2. Create `src/lib/auth/jwt.ts` with:
   - `generateJWT(userId, payload)` function
   - `verifyJWT(token)` function
3. Update login flow to generate and store JWT
4. Update API routes to use consistent JWT verification

### Testing
- `tests/e2e/flows/pre-voting.spec.ts`
- `tests/e2e/flows/session-proposal.spec.ts`

---

## Issue #2: Add Admin Role Check to Admin Layout

**Priority**: P0 - Blocker
**Labels**: `bug`, `security`, `admin`, `P0-blocker`

### Description
The admin layout (`/src/app/admin/layout.tsx`) only checks if a user is logged in, but does NOT verify they have admin privileges. This is a security vulnerability allowing any authenticated user to access admin pages.

### Current Code
```typescript
// Line 52-53
React.useEffect(() => {
  if (!authLoading && !isLoggedIn) {
    router.replace('/login')
  }
}, [authLoading, isLoggedIn, router])
```

### Expected Behavior
```typescript
React.useEffect(() => {
  if (!authLoading) {
    if (!isLoggedIn) {
      router.replace('/login')
    } else if (!isAdmin) {
      router.replace('/event/sessions') // or show "Access Denied"
    }
  }
}, [authLoading, isLoggedIn, isAdmin, router])
```

### Technical Requirements
1. Query `event_access.is_admin` for current user
2. Add `isAdmin` state to auth context or layout
3. Redirect non-admins away from `/admin/*` routes
4. Show appropriate error message

### Affected Routes
- `/admin` - Dashboard
- `/admin/sessions` - Session management
- `/admin/venues` - Venue management
- `/admin/schedule` - Schedule builder
- `/admin/participants` - Participant management
- `/admin/distribution` - Budget distribution
- `/admin/settings` - Event settings

### Testing
- `tests/e2e/flows/admin-access.spec.ts`

---

## Issue #3: Fix Session Proposal Authorization Header

**Priority**: P0 - Blocker
**Labels**: `bug`, `authentication`, `sessions`, `P0-blocker`

### Description
The session proposal form (`/src/app/event/propose/page.tsx`) does not include an Authorization header when submitting to the API. This causes all session proposals to fail with 401 Unauthorized.

### Current Code (lines 143-147)
```typescript
const response = await fetch(`/api/events/${EVENT_SLUG}/sessions`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    // Missing: 'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({...})
})
```

### Technical Requirements
1. Get token from `useAuth()` hook
2. Include Authorization header in fetch request
3. Handle 401 errors gracefully with redirect to login

### Dependencies
- Requires Issue #1 (JWT Authentication) to be completed first

### Testing
- `tests/e2e/flows/session-proposal.spec.ts`

---

## Issue #4: Add Track Field to Sessions

**Priority**: P1 - Critical
**Labels**: `bug`, `database`, `sessions`, `P1-critical`

### Description
The session proposal form collects a "track" field (Governance, Technical, DeFi, etc.) but:
1. The field is never sent to the API
2. The database has no `track` column
3. TypeScript types require `track` as mandatory

### Affected Files
- `/src/app/event/propose/page.tsx` - Collects but doesn't send
- `/src/app/api/events/[slug]/sessions/route.ts` - Doesn't accept/store
- `/supabase/migrations/` - Missing column
- `/src/types/index.ts` - Requires field

### Technical Requirements
1. Create database migration adding `track` column:
   ```sql
   ALTER TABLE sessions ADD COLUMN track TEXT;
   ```
2. Update API route to accept and store track
3. Update session response to include track
4. Ensure TypeScript types match

### Track Values
- `governance`
- `technical`
- `defi`
- `social`
- `creative`
- `sustainability`

---

## Issue #5: Implement Distribution Execution API

**Priority**: P1 - Critical
**Labels**: `bug`, `admin`, `distribution`, `blockchain`, `P1-critical`

### Description
The distribution execution button in `/admin/distribution` is completely fake. It uses a `setTimeout(3000)` instead of calling an actual API endpoint.

### Current Code (lines 89-96)
```typescript
const handleExecute = () => {
  setIsExecuting(true)
  setTimeout(() => {
    setIsExecuting(false)
    setExecuted(true)
  }, 3000)  // FAKE!
}
```

### Technical Requirements
1. Create `POST /api/events/{slug}/distribution/execute` endpoint
2. Endpoint should:
   - Verify admin authorization
   - Calculate final QF scores
   - Create distribution records in database
   - Execute on-chain transfers (or queue for batch)
   - Record transaction hashes
   - Update distribution status
3. Update frontend to call actual API
4. Display real transaction progress and hashes

### Database Tables (already exist)
- `distributions` - Batch tracking
- `distribution_items` - Individual payouts

### Testing
- `tests/e2e/flows/admin-distribution.spec.ts`

---

## Issue #6: Implement Admin Settings API

**Priority**: P1 - Critical
**Labels**: `bug`, `admin`, `settings`, `P1-critical`

### Description
The admin settings page (`/admin/settings`) has no save functionality. The save button just `console.log()`s the data and no API endpoint exists.

### Current Code (lines 60-63)
```typescript
const handleSave = () => {
  console.log('Saving settings:', settings)
  // In real app, this would save to API
}
```

### Technical Requirements
1. Create `PATCH /api/events/{slug}/settings` endpoint
2. Store settings in `events` table or new `event_settings` table
3. Add validation for settings values
4. Update frontend to call API and show success/error
5. Settings to persist:
   - Event name and dates
   - Voting deadline
   - Credits per user
   - Budget amounts
   - Notification preferences
   - Quadratic voting parameters

---

## Issue #7: Align Session Status Values

**Priority**: P2 - High
**Labels**: `bug`, `types`, `sessions`, `P2-high`

### Description
TypeScript types define session statuses as `'proposed' | 'declined'` but the database and API use `'pending' | 'rejected'`. This causes type mismatches and comparison failures.

### TypeScript Definition (`/src/types/index.ts`)
```typescript
export type SessionStatus = 'proposed' | 'approved' | 'declined' | 'merged' |
                           'scheduled' | 'completed' | 'self-hosted'
```

### Database/API Values
- `pending` (not `proposed`)
- `approved`
- `rejected` (not `declined`)
- `merged`
- `scheduled`
- `cancelled`

### Technical Requirements
Either:
1. Update TypeScript to match database: `'pending' | 'rejected'`
2. Or update database/API to match TypeScript

Recommend option 1 (match database) as it's less invasive.

---

## Issue #8: Implement Favorites Database Persistence

**Priority**: P2 - High
**Labels**: `enhancement`, `favorites`, `database`, `P2-high`

### Description
Favorites are only stored in:
- localStorage (non-authenticated users) - lost on browser clear
- On-chain votes with value=1 (authenticated users) - conflates favorites with voting

Need dedicated favorites storage for persistence and cross-device sync.

### Technical Requirements
1. Create `favorites` table:
   ```sql
   CREATE TABLE favorites (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id UUID REFERENCES users(id) ON DELETE CASCADE,
     session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
     created_at TIMESTAMPTZ DEFAULT NOW(),
     UNIQUE(user_id, session_id)
   );
   ```
2. Create API endpoints:
   - `GET /api/favorites` - List user's favorites
   - `POST /api/favorites` - Add favorite
   - `DELETE /api/favorites/:sessionId` - Remove favorite
3. Migrate localStorage favorites on login
4. Update `useFavorites` hook to use API for authenticated users

### Testing
- `tests/e2e/flows/favorites.spec.ts`

---

## Issue #9: Enable Participant Management Actions

**Priority**: P2 - High
**Labels**: `enhancement`, `admin`, `participants`, `P2-high`

### Description
All action buttons in the admin participants page are disabled:
- Edit Details
- View Profile
- Send Email
- Revoke Access

### Technical Requirements
1. Create API endpoints:
   - `PATCH /api/events/{slug}/participants/{userId}` - Edit participant
   - `DELETE /api/events/{slug}/participants/{userId}` - Revoke access
   - `POST /api/events/{slug}/participants/{userId}/email` - Send email
2. Enable buttons in frontend
3. Add confirmation dialogs for destructive actions

---

## Issue #10: Unify Vote Systems

**Priority**: P2 - High
**Labels**: `enhancement`, `voting`, `architecture`, `P2-high`

### Description
The app has two completely separate voting systems:
1. Pre-event votes in Supabase (`pre_votes` table)
2. Attendance votes on-chain (smart contract)

These systems don't integrate, causing:
- No unified voting history
- Different topic ID formats (UUID vs keccak256)
- No migration path between phases

### Technical Requirements
Option A: Migrate all votes on-chain
- Pre-votes become on-chain votes
- Single source of truth
- More gas costs

Option B: Keep parallel but add integration
- Create unified vote history view
- Add migration trigger at event phase change
- Sync off-chain stats from on-chain events

Recommend Option B for MVP.

### Related Issues
- Contract event listener for attendance stats
- Real-time subscriptions for on-chain votes

---

## Issue #11: Remove Dual Session Proposal Implementations

**Priority**: P3 - Medium
**Labels**: `tech-debt`, `sessions`, `P3-medium`

### Description
There are two conflicting session proposal implementations:
1. `/src/components/sessions/session-proposal-form.tsx` (modal)
2. `/src/app/event/propose/page.tsx` (full page)

They have different fields, validation, and UX.

### Technical Requirements
1. Choose one implementation (recommend full page)
2. Remove or deprecate the other
3. Ensure consistent feature set

---

## Issue #12: Add Real-Time Updates for On-Chain Votes

**Priority**: P3 - Medium
**Labels**: `enhancement`, `voting`, `real-time`, `P3-medium`

### Description
Only pre-event votes have real-time Supabase subscriptions. On-chain attendance votes use React Query with 1-minute stale time, meaning the live voting page shows outdated counts.

### Technical Requirements
1. Create contract event listener service
2. Update `session_attendance_stats` table from events
3. Add Supabase subscription for attendance stats
4. Or implement WebSocket for contract events

---

## Issue #13: Replace Mock Data in Admin Overview

**Priority**: P3 - Medium
**Labels**: `bug`, `admin`, `P3-medium`

### Description
The admin overview page (`/admin/page.tsx`) has hardcoded mock data for:
- "Top Sessions by Votes" - fake session list
- "Voting Progress" stats - hardcoded percentages

### Technical Requirements
1. Fetch real session vote data from API
2. Calculate actual voting statistics
3. Show real participant engagement metrics

---

## Issue #14: Enable Calendar Export

**Priority**: P4 - Low
**Labels**: `enhancement`, `favorites`, `P4-low`

### Description
The "Export to Calendar" button in `/event/my-schedule` is disabled.

### Technical Requirements
1. Generate iCal format for favorited sessions
2. Support Google Calendar link
3. Enable download button

---

## Issue #15: Enable Schedule Sharing

**Priority**: P4 - Low
**Labels**: `enhancement`, `favorites`, `P4-low`

### Description
The "Share Schedule" button in `/event/my-schedule` is disabled.

### Technical Requirements
1. Generate shareable link for personal schedule
2. Create public view for shared schedules
3. Enable share button with invite code generation

---

## Issue #16: Implement Favorite Notifications

**Priority**: P4 - Low
**Labels**: `enhancement`, `notifications`, `P4-low`

### Description
`/src/components/sessions/self-hosted-modal.tsx` line 132 states:
> "Attendees who favorited your session will be notified."

This notification system doesn't exist.

### Technical Requirements
1. Create notification system for session hosts
2. Track favorites for notification triggers
3. Send notifications via email or in-app

---

## Work Plan Summary

### Sprint 1 - Critical Blockers
1. Issue #1: JWT Authentication (P0)
2. Issue #2: Admin Role Check (P0)
3. Issue #3: Session Proposal Auth (P0)

### Sprint 2 - Core Functionality
4. Issue #4: Track Field (P1)
5. Issue #5: Distribution Execution (P1)
6. Issue #6: Settings API (P1)
7. Issue #7: Status Values (P2)

### Sprint 3 - Feature Completion
8. Issue #8: Favorites Database (P2)
9. Issue #9: Participant Management (P2)
10. Issue #10: Unify Vote Systems (P2)

### Backlog
11. Issue #11: Remove Dual Implementations (P3)
12. Issue #12: Real-Time On-Chain Votes (P3)
13. Issue #13: Admin Mock Data (P3)
14. Issue #14: Calendar Export (P4)
15. Issue #15: Schedule Sharing (P4)
16. Issue #16: Notifications (P4)

---

## Quick Reference: Files to Fix

| Issue | Primary File(s) |
|-------|-----------------|
| #1 | `src/lib/auth/jwt.ts` (new), `package.json` |
| #2 | `src/app/admin/layout.tsx` |
| #3 | `src/app/event/propose/page.tsx` |
| #4 | `supabase/migrations/`, `src/app/api/events/[slug]/sessions/route.ts` |
| #5 | `src/app/api/events/[slug]/distribution/execute/route.ts` (new), `src/app/admin/distribution/page.tsx` |
| #6 | `src/app/api/events/[slug]/settings/route.ts` (new), `src/app/admin/settings/page.tsx` |
| #7 | `src/types/index.ts` |
| #8 | `supabase/migrations/`, `src/app/api/favorites/` (new), `src/hooks/use-favorites.ts` |
| #9 | `src/app/api/events/[slug]/participants/` (new routes), `src/app/admin/participants/page.tsx` |
| #10 | Architecture decision needed |
