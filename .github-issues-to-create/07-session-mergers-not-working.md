# Session mergers not working

**Assignee:** @unforced
**Priority:** Medium
**Labels:** bug, feature, sessions, coordination

## Problem
The session merger functionality is not working, preventing organizers from combining similar or related sessions.

## Impact
- Cannot consolidate duplicate or similar session proposals
- Reduces ability to optimize schedule and avoid redundancy
- Prevents community coordination around similar topics
- May lead to split audiences for similar content
- Undermines the collaborative/coordination aspect of the platform

## Steps to Reproduce
1. Navigate to admin or organizer view
2. Attempt to merge two or more sessions
3. Observe that the merge action fails or doesn't complete

## Expected Behavior
Authorized users (organizers/admins) should be able to:
1. Select multiple sessions to merge
2. Choose which session becomes the primary/surviving session
3. Combine metadata (descriptions, tags, etc.)
4. Preserve votes/favorites from all merged sessions
5. Notify affected participants of the merger
6. Update schedules that referenced the merged sessions

## Possible Root Causes
1. **Permissions issue**: RLS policies may prevent merging operations (similar to #1, #3)
2. **Feature not implemented**: Merger UI exists but backend logic is incomplete
3. **Database constraints**: Foreign key constraints may prevent merging
4. **Complex data handling**: Merging votes/favorites/schedules may have bugs
5. **Transaction failures**: Merger may involve multiple DB operations that are failing atomically

## Technical Investigation Needed
1. Locate session merger code (frontend and backend)
2. Check if merger API endpoint exists and is functional
3. Verify RLS policies allow session updates/deletes required for merging
4. Review database schema for constraints that might block merges
5. Check error logs for failures during merge attempts
6. Verify vote/favorite aggregation logic

## Data Integrity Considerations
When merging sessions, the system must:
- Preserve all votes from merged sessions
- Update all user schedules that referenced merged sessions
- Maintain foreign key integrity
- Handle conflicts in session metadata
- Create audit trail of mergers (for transparency)

## Suggested Fix
1. Map out complete merger workflow and data flow
2. Implement or fix backend merge logic
3. Handle vote/favorite aggregation correctly
4. Update all references to merged sessions
5. Add RLS policy exceptions for admin/organizer roles if needed
6. Implement proper transaction handling for atomic mergers
7. Add user notifications for affected participants
8. Create comprehensive tests for various merge scenarios

## Related Issues
- Related to #1, #3 - may be another RLS/permissions issue
- May affect #6 (schedule generation) if generated schedules reference merged sessions

## Edge Cases to Consider
- Merging sessions with conflicting time slots
- Merging sessions with different organizers
- Merging sessions with capacity constraints
- Handling votes from the same user on both sessions
- Undo/rollback functionality for mergers

## Testing Checklist
- [ ] Can merge two sessions successfully
- [ ] All votes are preserved and consolidated
- [ ] User schedules update to reference merged session
- [ ] Favorites are preserved
- [ ] Session metadata is correctly combined
- [ ] Audit trail is created
- [ ] Can merge more than two sessions
- [ ] Proper error handling for failed merges
- [ ] Authorization is enforced (only admins/organizers can merge)

## Priority
**Medium** - Important for organizers to manage session proposals effectively, but not critical for basic user functionality.
