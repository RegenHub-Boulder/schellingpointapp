# Auto-generating schedule doesn't populate the schedule

**Assignee:** @unforced
**Priority:** Critical
**Labels:** bug, feature, scheduling, algorithm

## Problem
The auto-generate schedule feature does not actually populate the user's schedule with suggested sessions.

## Impact
- **Critical**: This is likely a core differentiating feature of the platform
- Users cannot benefit from algorithmic schedule generation
- The Schelling point coordination mechanism cannot function
- Significantly reduces the value proposition of the application
- Users expecting automated scheduling will be disappointed

## Steps to Reproduce
1. Navigate to schedule view or settings
2. Click "Auto-generate schedule" or similar button
3. Observe that the schedule remains empty or unchanged
4. Check if any loading indicators appear

## Expected Behavior
When a user triggers auto-generate schedule:
1. System should analyze user's voting preferences
2. Apply scheduling algorithm (likely based on Schelling point/coordination principles)
3. Resolve conflicts and optimize for attendance
4. Populate user's schedule with recommended sessions
5. Show visual feedback of what was generated
6. Allow user to review and modify the generated schedule

## Possible Root Causes
1. **Missing vote data**: If voting is broken (#3), there's no data to generate schedules from
2. **Algorithm not implemented**: The scheduling algorithm may not be fully implemented
3. **API endpoint missing or broken**: Backend endpoint may not exist or is failing
4. **Database write failure**: May be another RLS policy issue preventing schedule writes
5. **Frontend not calling backend**: UI might not be properly invoking the generation logic
6. **Silent failure**: Error occurring but not surfacing to user

## Dependencies
- **Blocks**: Depends on working voting system (#3)
- **Related**: Similar to favoriting issue (#5) in that schedules aren't being populated
- **Related**: Session submission (#1) and RLS issues suggest broader permission problems

## Technical Investigation Needed
1. Check if auto-generate API endpoint exists (`/api/schedule/generate` or similar)
2. Verify scheduling algorithm implementation
3. Test with known vote data to see if algorithm produces output
4. Check for errors in backend logs when generation is triggered
5. Verify RLS policies allow writing to user schedules
6. Check if frontend properly handles the generation response

## Algorithm Considerations
For a Schelling Point app, the scheduling algorithm should likely:
- Consider user vote preferences (quadratic voting, ranked choice, etc.)
- Optimize for session attendance (avoid conflicts)
- Balance between popular sessions and niche interests
- Account for session capacity constraints
- Implement coordination mechanisms

## Suggested Fix
1. Verify vote data exists and is accessible for algorithm (#3 must be fixed first)
2. Implement or debug scheduling algorithm
3. Create/fix API endpoint for schedule generation
4. Ensure RLS policies allow schedule writes
5. Add comprehensive error handling and logging
6. Provide user feedback during generation process (loading state, success/error messages)
7. Test with various vote patterns and edge cases

## Testing Checklist
- [ ] Generation works with minimal vote data
- [ ] Generation works with comprehensive votes
- [ ] Handles conflicts correctly (user can't be in two places at once)
- [ ] Respects user constraints (favorites, blacklisted sessions, etc.)
- [ ] Provides reasonable results even with sparse data
- [ ] Shows appropriate loading states
- [ ] Handles errors gracefully with user-friendly messages
- [ ] Generated schedule persists after page reload

## Priority
**Critical** - This appears to be a core feature of a Schelling Point coordination platform. Without it, the app's unique value is significantly diminished.
