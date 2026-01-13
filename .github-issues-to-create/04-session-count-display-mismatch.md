# Session count on main sessions tab doesn't reflect sessions displayed

**Assignee:** @unforced
**Priority:** Low
**Labels:** bug, ui, display

## Problem
The session count displayed on the main sessions tab does not match the actual number of sessions being displayed to users.

## Impact
- Confusing user experience
- Users may think sessions are missing or that there's a data loading issue
- Undermines trust in the application's data accuracy

## Steps to Reproduce
1. Navigate to the main sessions tab/page
2. Observe the session count indicator (likely in a header or badge)
3. Count the actual number of sessions displayed
4. Note the discrepancy between the count and actual sessions shown

## Expected Behavior
The session count should accurately reflect the number of sessions currently displayed, accounting for any active filters or search criteria.

## Possible Root Causes
1. Count is pulling from total sessions in database but display shows filtered subset
2. Count calculation doesn't account for pagination
3. Count is cached/stale while display shows updated data
4. Count includes hidden/draft sessions that aren't displayed to regular users
5. Race condition between count query and session list query

## Suggested Fix
1. Identify where the session count is calculated (API endpoint or frontend)
2. Ensure count query uses the same filters as the session list query
3. If using pagination, display "Showing X of Y sessions" with accurate numbers
4. Update count when filters or search terms are applied
5. Consider displaying count as: `{displayedCount} sessions` or `{displayedCount} of {totalCount} sessions`

## Files to Investigate
- Session list/tab component
- Session count display component
- API endpoint for fetching sessions
- Any filtering or search logic

## Testing Checklist
- [ ] Count matches actual sessions when no filters applied
- [ ] Count updates correctly when filters are applied
- [ ] Count updates correctly when search is used
- [ ] Count is correct across different pagination pages
- [ ] Count distinguishes between total sessions and displayed sessions if applicable

## Priority
**Low** - While confusing, this doesn't break core functionality. However, it should be fixed to maintain user trust.
