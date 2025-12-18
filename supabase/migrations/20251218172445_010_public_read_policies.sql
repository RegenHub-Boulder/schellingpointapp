-- Update RLS policies to allow public reads for sessions, venues, and time slots
-- This enables the public-facing API endpoints to work without authentication

-- Create helper function to check if user is host (bypasses RLS on session_hosts)
CREATE OR REPLACE FUNCTION is_host_of_session(session_uuid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM session_hosts
    WHERE session_id = session_uuid
    AND user_id = auth.uid()
  );
$$ LANGUAGE SQL SECURITY DEFINER;

-- Drop the existing restrictive policies (using correct names from 009 migration)
DROP POLICY IF EXISTS "Sessions viewable by event participants" ON sessions;
DROP POLICY IF EXISTS "Venues viewable by event participants" ON venues;
DROP POLICY IF EXISTS "Time slots viewable by event participants" ON time_slots;
DROP POLICY IF EXISTS "Session hosts viewable by participants" ON session_hosts;
DROP POLICY IF EXISTS "Pre-vote stats viewable by participants" ON session_pre_vote_stats;
DROP POLICY IF EXISTS "Attendance stats viewable by participants" ON session_attendance_stats;

-- Allow public viewing of approved/scheduled sessions
-- Pending/rejected sessions remain private to hosts/admins
CREATE POLICY "Anyone can view approved sessions"
ON sessions FOR SELECT
USING (status IN ('approved', 'scheduled'));

-- Session hosts can see their own sessions regardless of status
-- Using SECURITY DEFINER function to avoid recursion
CREATE POLICY "Hosts can view their sessions"
ON sessions FOR SELECT
USING (is_host_of_session(id));

-- Event admins can view all sessions
CREATE POLICY "Admins can view all sessions"
ON sessions FOR SELECT
USING (is_event_admin(event_id));

-- Anyone can view venues (they're public schedule info)
CREATE POLICY "Anyone can view venues"
ON venues FOR SELECT
USING (true);

-- Anyone can view time slots (they're public schedule structure)
CREATE POLICY "Anyone can view time slots"
ON time_slots FOR SELECT
USING (true);

-- Session hosts policies - use direct checks without cross-table RLS
-- Anyone can view hosts of approved sessions (via function check)
CREATE OR REPLACE FUNCTION session_is_approved(session_uuid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM sessions
    WHERE id = session_uuid
    AND status IN ('approved', 'scheduled')
  );
$$ LANGUAGE SQL SECURITY DEFINER;

CREATE POLICY "Anyone can view hosts of approved sessions"
ON session_hosts FOR SELECT
USING (session_is_approved(session_id));

-- Users can see their own host records
CREATE POLICY "Users can view own host records"
ON session_hosts FOR SELECT
USING (session_hosts.user_id = auth.uid());

-- Admins can see all host records (using function to check admin status)
CREATE OR REPLACE FUNCTION is_admin_of_session_event(session_uuid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM sessions s
    JOIN event_access ea ON ea.event_id = s.event_id
    WHERE s.id = session_uuid
      AND ea.user_id = auth.uid()
      AND ea.is_admin = true
  );
$$ LANGUAGE SQL SECURITY DEFINER;

CREATE POLICY "Admins can view all session hosts"
ON session_hosts FOR SELECT
USING (is_admin_of_session_event(session_id));

-- Allow public read of vote stats for approved sessions
CREATE POLICY "Anyone can view pre-vote stats for approved sessions"
ON session_pre_vote_stats FOR SELECT
USING (session_is_approved(session_id));

CREATE POLICY "Anyone can view attendance stats for approved sessions"
ON session_attendance_stats FOR SELECT
USING (session_is_approved(session_id));
