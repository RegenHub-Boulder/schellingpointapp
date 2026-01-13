# Unable to submit session: RLS policy violation on sessions table

**Assignee:** @unforced
**Priority:** High
**Labels:** bug, database, permissions

## Problem
Users are unable to submit new sessions, receiving a row-level security (RLS) policy violation error.

## Error Message
```
new row violates row-level security policy for table "sessions"
```

## Additional Context
- API endpoint affected: `/api/events/ethboulder-2026/sessions`
- Returns 500 Internal Server Error
- This appears to be a database permissions issue

## Steps to Reproduce
1. Navigate to the session submission form
2. Fill out session details
3. Click submit
4. Observe RLS policy violation error

## Expected Behavior
Users should be able to submit sessions successfully, with the backend properly handling authentication and authorization.

## Root Cause Analysis
The Supabase RLS policies for the `sessions` table are likely too restrictive or not properly configured to allow INSERT operations for authenticated users. The API endpoint is receiving the request but failing at the database level due to insufficient permissions.

## Suggested Fix
1. Review RLS policies on the `sessions` table in Supabase
2. Ensure authenticated users have INSERT permissions with appropriate checks
3. Verify that the user's session/token is being properly passed to the database
4. Add proper error handling in the API to return user-friendly error messages
5. Test with various user roles to ensure proper access control

## Dependencies
- Related to missing authentication flow or user context in API calls
- May require coordination with #3 (voting RLS violation) as this suggests a broader RLS configuration issue

## Priority
**High** - This blocks core functionality for session submission, preventing users from adding content to the platform.
