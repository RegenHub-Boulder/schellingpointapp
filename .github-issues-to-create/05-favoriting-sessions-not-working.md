# Favoriting sessions does not add them to user schedule

**Assignee:** @unforced
**Priority:** High
**Labels:** bug, feature, scheduling

## Problem
When users favorite/bookmark sessions, these sessions are not being added to their personal schedule view.

## Impact
- Users cannot manually curate their schedule
- Favoriting feature appears broken
- Users have no way to track which sessions they want to attend
- Reduces utility of the application as a scheduling tool

## Steps to Reproduce
1. Navigate to session list
2. Click the favorite/bookmark button on a session
3. Navigate to "My Schedule" or personal schedule view
4. Observe that the favorited session does not appear in the schedule

## Expected Behavior
When a user favorites a session, it should:
1. Immediately add the session to their personal schedule
2. Show visual feedback that the session was favorited
3. Persist this preference across page reloads
4. Allow users to view all favorited sessions in their schedule

## Possible Root Causes
1. Favorite action isn't writing to database (possible RLS issue similar to #1 and #3)
2. Favorite data is being saved but not read when displaying schedule
3. Schedule view is pulling from wrong data source
4. Frontend state management issue between favorite action and schedule display
5. Favorite feature may be partially implemented but not connected to schedule view

## Technical Investigation Needed
1. Check if favorite/bookmark API endpoint is working
2. Verify data is being written to database (check favorites/bookmarks table)
3. Trace how schedule view queries for user's sessions
4. Check if RLS policies allow users to write favorites
5. Verify frontend state updates correctly after favoriting

## Related Issues
- May be related to broader RLS/permissions issues (#1, #3)
- Related to #6 (auto-generate schedule) as both involve populating user schedules

## Suggested Fix
1. Verify favorites table exists and has correct schema
2. Implement or fix API endpoint for adding favorites (POST /api/favorites or similar)
3. Ensure RLS policies allow users to insert/read their own favorites
4. Update schedule view to query and display favorited sessions
5. Add proper error handling and user feedback
6. Consider optimistic UI updates for better UX

## Testing Checklist
- [ ] Can favorite a session successfully
- [ ] Favorited session appears in schedule immediately
- [ ] Favorite persists after page reload
- [ ] Can unfavorite a session
- [ ] Unfavorited session is removed from schedule
- [ ] Multiple favorites work correctly
- [ ] Schedule shows all favorited sessions

## Priority
**High** - Manual schedule curation is an important feature, and users expect favorites to work as intended.
