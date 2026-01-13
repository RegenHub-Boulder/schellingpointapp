# Issue Creation Summary

## Overview
Created 9 detailed GitHub issue descriptions based on live demo feedback for the Schelling Point App.

## Critical Insights

### Root Cause Pattern: RLS Policies
The majority of critical issues (#1, #3, #7, #8) stem from improperly configured Supabase Row-Level Security policies. This suggests:

1. **Authentication Context Not Passed**: User auth tokens may not be reaching the database
2. **RLS Policies Too Restrictive**: Policies may not account for authenticated user operations
3. **Role System Not Implemented**: Admin/organizer roles may not exist or aren't checked properly

### Recommendation: Fix RLS First
Before tackling individual features, audit and fix the entire RLS policy structure:
- Users table/profiles table policies
- Sessions table policies
- Votes/pre_votes table policies
- Admin role policies
- Review how authentication context flows from frontend → API → database

## Dependencies Graph

```
RLS Policies (#1, #3, #8)
    ↓
    ├─→ Session Submission (#1)
    ├─→ Voting (#3) ──→ Schedule Generation (#6)
    └─→ Admin Functions (#8) ──→ Session Mergers (#7)
                                    ↓
                            Schedule Features (#5)

E2E Testing (#9) ←── Should be implemented alongside all fixes
```

## Quick Wins
1. Fix missing asset (#2) - Simple file addition
2. Fix session count display (#4) - Likely simple query fix

## Priority Matrix

```
High Impact, High Urgency:
- #1: Session Submission
- #3: Voting
- #6: Schedule Generation

High Impact, Medium Urgency:
- #5: Favoriting
- #8: Admin Permissions
- #9: E2E Testing

Medium Impact:
- #7: Session Mergers
- #2: Missing Asset

Low Impact:
- #4: Session Count Display
```

## Files Affected (Estimated)

### Database/Supabase
- RLS policies on: sessions, pre_votes, profiles/users, schedules
- Possible missing tables: favorites, admin_roles

### API Routes
- `/api/events/[eventId]/sessions`
- `/api/events/[eventId]/votes`
- `/api/schedule/generate`
- `/api/admin/participants`

### Frontend Components
- Session submission form
- Voting interface
- Schedule view/generation
- Admin console
- Asset references

## Testing Requirements
Each fix should include:
- [ ] Unit tests for business logic
- [ ] Integration tests for API endpoints
- [ ] RLS policy tests
- [ ] E2E tests for user flow
- [ ] Manual testing checklist

## Estimated Effort
- RLS Policy Fix: 1-2 days (affects multiple issues)
- Schedule Features: 2-3 days
- Admin Features: 1-2 days
- E2E Testing Setup: 2-3 days
- Quick fixes: 0.5 day

**Total: ~7-10 days of focused development**

## Success Metrics
- [ ] All 9 issues resolved
- [ ] E2E tests passing
- [ ] No RLS policy violations in logs
- [ ] Successful live demo without errors
- [ ] All user flows functional end-to-end
