# Unable to cast votes: RLS policy violation on pre_votes table

**Assignee:** @unforced
**Priority:** Critical
**Labels:** bug, database, permissions, voting

## Problem
Users are unable to cast votes on sessions, receiving a row-level security (RLS) policy violation error.

## Error Messages
```
Failed to cast vote: new row violates row-level security policy for table "pre_votes"
```

```
POST https://schellingpointapp.vercel.app/api/events/ethboulder-2026/votes 500 (Internal Server Error)
```

## Impact
- **Critical**: Voting is a core feature of the application and is completely broken
- Users cannot express preferences for sessions
- Scheduling algorithm cannot function without vote data
- This severely impacts the value proposition of the platform

## Steps to Reproduce
1. Navigate to a session voting page
2. Attempt to cast a vote on any session
3. Observe 500 error and console message about RLS policy violation

## Expected Behavior
Authenticated users should be able to cast votes on sessions, with their votes being properly recorded in the database.

## Root Cause Analysis
Similar to the session submission issue (#1), the Supabase RLS policies for the `pre_votes` table are blocking INSERT operations. This suggests:
1. RLS policies may not properly identify authenticated users
2. User authentication tokens may not be properly passed to the database
3. The service role key might be needed for certain operations but isn't being used
4. RLS policies may need to be updated to allow users to insert their own votes

## Stack Trace Context
The error originates from:
- Frontend vote submission handler in `page-df818606b3bfa0e4.js`
- API endpoint: `/api/events/ethboulder-2026/votes`
- Database table: `pre_votes`

## Suggested Fix
1. Review and update RLS policies on the `pre_votes` table in Supabase
2. Ensure INSERT policy allows authenticated users to create votes
3. Verify user authentication context is properly passed from frontend → API → database
4. Check if user_id or similar identifier is being correctly set in vote records
5. Add proper error handling and user-friendly error messages
6. Consider if service role key should be used for this operation
7. Test thoroughly with different user authentication states

## Related Issues
- Related to #1 (session submission RLS violation) - indicates broader authentication/RLS configuration problem
- Blocks functionality for auto-generating schedules (#6) which depends on vote data

## Priority
**Critical** - Voting is core functionality. Without working votes, the scheduling system cannot function properly.
