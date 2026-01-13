# Admin console cannot view participants list due to permissions

**Assignee:** @unforced
**Priority:** High
**Labels:** bug, admin, permissions, database

## Problem
Administrators are unable to view the list of participants in the admin console, likely due to RLS policy restrictions.

## Impact
- Admins cannot see who has registered/is participating
- Cannot manage user accounts or permissions
- Cannot troubleshoot user-reported issues
- Reduces ability to coordinate and communicate with participants
- Undermines admin functionality of the platform

## Steps to Reproduce
1. Log in as an admin user
2. Navigate to admin console
3. Attempt to view participants/users list
4. Observe error or empty list

## Expected Behavior
Administrators should have access to:
- List of all registered participants
- User profile information
- User activity (sessions submitted, votes cast, etc.)
- Ability to manage user permissions
- Export participant data for event planning

## Possible Root Causes
1. **RLS policies too restrictive**: Admin role may not be properly configured in RLS policies
2. **Missing admin role**: User roles table may not include admin designation
3. **Frontend not passing admin context**: Admin token/role not being sent to backend
4. **API endpoint missing**: Participants list endpoint may not exist
5. **Query using wrong context**: May be querying as regular user instead of admin

## Technical Investigation Needed
1. Verify admin role/permission system exists in database
2. Check RLS policies on users/participants table
3. Verify admin users are properly flagged in database
4. Check if admin API endpoints exist and are accessible
5. Review authentication flow for admin users
6. Check if Supabase service role key is needed for admin operations

## Related Issues
- Part of broader RLS/permissions issues (#1, #3, #7)
- Indicates that role-based access control may not be fully implemented

## Security Considerations
When implementing admin access:
- Ensure only authorized users can access admin endpoints
- Implement proper role checking on both frontend and backend
- Log admin actions for audit trail
- Consider implementing different admin permission levels
- Protect sensitive user data appropriately

## Suggested Fix
1. Define admin roles in database schema (if not exists)
2. Create RLS policies that grant admins access to participant data
3. Implement admin authentication/authorization middleware
4. Create or fix admin API endpoints for participant management
5. Update frontend to properly request and display participant data
6. Add proper error handling for unauthorized access attempts
7. Consider using Supabase service role key for admin operations

## Admin Features to Verify
- [ ] Can view all participants
- [ ] Can search/filter participants
- [ ] Can view participant details
- [ ] Can edit participant information if needed
- [ ] Can export participant list
- [ ] Can assign/revoke roles/permissions
- [ ] Can view participant activity (submissions, votes)
- [ ] Proper audit logging of admin actions

## Database Schema Considerations
```sql
-- Example of what might be needed
ALTER TABLE profiles ADD COLUMN role TEXT DEFAULT 'user';
CREATE INDEX idx_profiles_role ON profiles(role);

-- RLS policy example
CREATE POLICY "Admins can view all profiles"
ON profiles FOR SELECT
USING (
  auth.jwt() ->> 'role' = 'admin'
  OR id = auth.uid()
);
```

## Testing Checklist
- [ ] Admin can view participants list
- [ ] Regular users cannot access admin endpoints
- [ ] Proper error messages for unauthorized access
- [ ] Performance is acceptable with large participant lists
- [ ] Filtering and search work correctly
- [ ] Export functionality works
- [ ] Admin actions are logged

## Priority
**High** - Admins need visibility into participants for effective event management and troubleshooting.
