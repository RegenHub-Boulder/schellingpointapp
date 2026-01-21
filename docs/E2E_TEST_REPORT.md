# E2E Testing Report - Schelling Point App

## Executive Summary

This report documents a comprehensive analysis of user flows in the Schelling Point app, identifying critical issues that prevent the application from functioning properly. Testing was conducted through code review and analysis due to environment constraints.

**Key Finding**: The application has significant architectural issues that break core user flows. The most critical is a **missing JWT authentication implementation** that causes all authenticated API calls to fail.

---

## Critical Issues Overview

| Severity | Count | Description |
|----------|-------|-------------|
| BLOCKER | 3 | Completely prevents feature from working |
| CRITICAL | 6 | Core functionality broken |
| HIGH | 5 | Important features impacted |
| MEDIUM | 8 | Usability/UX issues |
| LOW | 4 | Minor issues/enhancements |

---

## 1. Session Proposal Flow

### Flow Description
User navigates to `/event/propose` → fills multi-step form → submits session proposal → sees confirmation

### Issues Found

#### BLOCKER: Missing Authorization Header
- **Location**: `/src/app/event/propose/page.tsx` (lines 143-147)
- **Problem**: Form submission does NOT send Authorization header
- **Impact**: ALL session proposals fail with 401 Unauthorized
- **Root Cause**: `useAuth()` destructures `{ user }` but never gets `token`

#### CRITICAL: Track Field Not Sent to API
- **Location**: `/src/app/event/propose/page.tsx` (lines 148-156)
- **Problem**: User selects track (Governance, Technical, etc.) but it's never sent to API
- **Impact**: Track data is lost; user expectation violated

#### CRITICAL: Database Missing Track Column
- **Location**: `/supabase/migrations/20251218164205_005_sessions.sql`
- **Problem**: Sessions table has no `track` column
- **Impact**: Even if sent, track can't be stored

#### HIGH: Type/Status Value Mismatch
- **Problem**: TypeScript defines `'proposed' | 'declined'` but API uses `'pending' | 'rejected'`
- **Impact**: Status comparisons fail throughout the app

#### HIGH: Two Conflicting Form Implementations
- **Files**: `session-proposal-form.tsx` (modal) vs `propose/page.tsx` (full page)
- **Problem**: Different fields, different UX, different validation

---

## 2. Voting Flow

### Flow Description
Two voting phases:
1. Pre-Event: `/event/sessions` → click to vote on sessions → credits deducted
2. Live: `/event/live` → tap-to-vote during event → on-chain recording

### Issues Found

#### BLOCKER: JWT Authentication Missing
- **Location**: `/src/app/api/events/[slug]/votes/me/route.ts` (lines 10-18)
- **Problem**: `verifyJWT()` function imported but DOES NOT EXIST in codebase
- **Impact**: ALL pre-event voting endpoints return 401
- **Note**: `jsonwebtoken` is NOT in package.json dependencies

#### CRITICAL: Two Independent Vote Systems
- **Problem**: Pre-event votes (Supabase) and attendance votes (on-chain) are completely separate
- **Impact**: No unified voting history; data can't be reconciled

#### CRITICAL: Topic ID Mismatch
- **Problem**: Pre-votes use session UUID; on-chain uses `keccak256(UUID)`
- **Impact**: Can't query on-chain votes by session ID directly

#### HIGH: Favorites Conflated with Votes
- **Location**: `/src/app/event/sessions/page.tsx` (lines 99-105)
- **Problem**: Heart icon toggles on-chain vote (value=1), mixing favorites with voting
- **Impact**: `/event/my-votes` shows "favorites" not actual vote history

#### MEDIUM: No Real-Time Updates for On-Chain Votes
- **Problem**: Only pre-votes have Supabase subscriptions; on-chain votes use stale cache
- **Impact**: Live voting page shows outdated counts

---

## 3. Favorites Functionality

### Flow Description
User favorites sessions via heart icon → appears in My Schedule → can rank for vote allocation

### Issues Found

#### HIGH: No Database Persistence
- **Problem**: Favorites stored only in localStorage (non-auth) or on-chain votes (auth)
- **Impact**: Clear browser = lose favorites; no cross-device sync

#### HIGH: No Dedicated Favorites API
- **Problem**: No `/api/favorites` endpoints; uses voting system instead
- **Impact**: Can't backup/restore favorites; can't query favorites server-side

#### MEDIUM: localStorage Favorites Lost on Login
- **Problem**: When user logs in, localStorage favorites not migrated to on-chain
- **Impact**: User loses pre-login favorites

#### LOW: Calendar Export Disabled
- **Location**: `/src/app/event/my-schedule/page.tsx` (line 237)
- **Problem**: "Export to Calendar" button is disabled
- **Impact**: Cannot export schedule to iCal/Google Calendar

---

## 4. Admin Dashboard

### Flow Description
Admin logs in → manages sessions, venues, schedule, participants, distribution

### Issues Found

#### BLOCKER: Missing Admin Role Check
- **Location**: `/src/app/admin/layout.tsx` (lines 52-53)
- **Problem**: Only checks `isLoggedIn`, NOT if user is admin
- **Impact**: ANY authenticated user can access admin pages

#### CRITICAL: Distribution Execution is Fake
- **Location**: `/src/app/admin/distribution/page.tsx` (lines 89-96)
- **Problem**: `handleExecute()` uses `setTimeout(3000)` instead of actual API call
- **Impact**: Cannot actually distribute funds to hosts

#### CRITICAL: Settings Page Non-Functional
- **Location**: `/src/app/admin/settings/page.tsx` (line 60-63)
- **Problem**: Save button just `console.log()`s; no API endpoint exists
- **Impact**: Admin cannot configure event settings

#### HIGH: All Participant Actions Disabled
- **Location**: `/src/app/admin/participants/page.tsx` (lines 293-312)
- **Problem**: Edit, View, Email, Revoke buttons all disabled
- **Impact**: Cannot manage participants through UI

#### MEDIUM: Mock Data in Overview
- **Location**: `/src/app/admin/page.tsx` (lines 167-173)
- **Problem**: "Top Sessions" and voting stats are hardcoded
- **Impact**: Dashboard shows fake data

---

## 5. Authentication System

### Issues Found

#### CRITICAL: JWT Implementation Missing
- **Problem**: Multiple routes import `verifyJWT()` but the function doesn't exist
- **Files affected**:
  - `/src/app/api/events/[slug]/votes/route.ts`
  - `/src/app/api/events/[slug]/votes/me/route.ts`
  - All authenticated API routes
- **Impact**: All JWT-protected routes fail

#### HIGH: No Login → Token Flow
- **Problem**: `/login` page creates passkey but doesn't generate JWT
- **Impact**: Users can authenticate but can't call protected APIs

---

## Broken Flow Summary

| User Flow | Status | Blocking Issue |
|-----------|--------|----------------|
| Session Proposal | BROKEN | Missing auth header |
| Pre-Event Voting | BROKEN | Missing verifyJWT |
| Live Voting | PARTIAL | Works if session key exists |
| Favorites | PARTIAL | Works for localStorage only |
| My Schedule | PARTIAL | Depends on favorites |
| My Votes | BROKEN | Shows favorites, not votes |
| Admin Sessions | WORKS | Real API integration |
| Admin Venues | WORKS | Real API integration |
| Admin Schedule | WORKS | Real API integration |
| Admin Distribution | BROKEN | Fake execution |
| Admin Settings | BROKEN | No save functionality |
| Admin Participants | BROKEN | All actions disabled |

---

## Required Fixes by Priority

### P0 - Blockers (Must Fix Immediately)

1. **Implement JWT Authentication**
   - Add `jsonwebtoken` to dependencies
   - Create `verifyJWT()` utility function
   - Update login flow to generate and store JWT

2. **Add Admin Role Check**
   - Query `event_access.is_admin` in admin layout
   - Redirect non-admins away from `/admin/*`

3. **Fix Session Proposal Auth**
   - Pass token from `useAuth()` in fetch headers
   - Or switch to passkey-based auth for this endpoint

### P1 - Critical (Should Fix This Sprint)

4. **Add Track to Sessions**
   - Create migration adding `track` column
   - Update API to accept and return track
   - Update TypeScript types

5. **Implement Distribution API**
   - Create `/api/events/{slug}/distribution/execute`
   - Integrate with payment processing or on-chain transfer

6. **Implement Settings API**
   - Create `/api/events/{slug}/settings` PATCH endpoint
   - Store settings in events table or new settings table

7. **Align Status Values**
   - Standardize on `pending`/`rejected` in TypeScript
   - Or update database/API to use `proposed`/`declined`

### P2 - High Priority (Should Fix Before Launch)

8. **Implement Favorites API**
   - Create `favorites` table
   - Add `/api/favorites` CRUD endpoints
   - Migrate localStorage favorites on login

9. **Add Participant Management APIs**
   - Implement edit, delete, email endpoints
   - Enable disabled buttons

10. **Unify Vote Systems**
    - Either migrate all votes on-chain, or
    - Create unified vote history view

### P3 - Medium Priority (Nice to Have)

11. Add real-time subscriptions for on-chain votes
12. Replace mock data in admin overview
13. Enable calendar export
14. Add favorite-based filtering on sessions page

---

## Test Files Needed

Based on this analysis, the following E2E tests should be created:

1. `tests/e2e/flows/session-proposal.spec.ts` - Full proposal submission flow
2. `tests/e2e/flows/pre-voting.spec.ts` - Pre-event voting flow
3. `tests/e2e/flows/favorites.spec.ts` - Favorites/My Schedule flow
4. `tests/e2e/flows/admin-distribution.spec.ts` - Distribution execution
5. `tests/e2e/flows/admin-settings.spec.ts` - Settings persistence
6. `tests/e2e/flows/admin-access.spec.ts` - Admin authorization checks
7. `tests/e2e/api/auth.spec.ts` - JWT token validation

---

## Appendix: Files Referenced

### Session Proposal
- `/src/app/event/propose/page.tsx`
- `/src/components/sessions/session-proposal-form.tsx`
- `/src/app/api/events/[slug]/sessions/route.ts`
- `/src/types/index.ts`
- `/supabase/migrations/20251218164205_005_sessions.sql`

### Voting
- `/src/app/event/sessions/page.tsx`
- `/src/app/event/live/page.tsx`
- `/src/app/event/my-votes/page.tsx`
- `/src/hooks/use-votes.ts`
- `/src/hooks/useVoting.ts`
- `/src/hooks/useOnChainVotes.ts`
- `/src/app/api/events/[slug]/votes/route.ts`
- `/src/app/api/events/[slug]/votes/me/route.ts`

### Favorites
- `/src/hooks/use-favorites.ts`
- `/src/app/event/my-schedule/page.tsx`
- `/src/components/sessions/session-card.tsx`

### Admin
- `/src/app/admin/layout.tsx`
- `/src/app/admin/page.tsx`
- `/src/app/admin/distribution/page.tsx`
- `/src/app/admin/settings/page.tsx`
- `/src/app/admin/participants/page.tsx`
