-- Migration: 009_rls_policies
-- Description: Implement Row Level Security policies for all tables
-- Related Issue: #6 - Supabase Row Level Security (RLS) Policies

-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================

-- Check if user is admin for an event
CREATE OR REPLACE FUNCTION is_event_admin(event_uuid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM event_access
    WHERE event_id = event_uuid
    AND user_id = auth.uid()
    AND is_admin = true
  );
$$ LANGUAGE SQL SECURITY DEFINER;

-- Check if user has access to an event
CREATE OR REPLACE FUNCTION has_event_access(event_uuid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM event_access
    WHERE event_id = event_uuid
    AND user_id = auth.uid()
    AND access_granted = true
  );
$$ LANGUAGE SQL SECURITY DEFINER;

-- Check if user is host of a session
CREATE OR REPLACE FUNCTION is_session_host(session_uuid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM session_hosts
    WHERE session_id = session_uuid
    AND user_id = auth.uid()
    AND status = 'accepted'
  );
$$ LANGUAGE SQL SECURITY DEFINER;

-- =============================================================================
-- ENABLE RLS ON ALL TABLES
-- =============================================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_hosts ENABLE ROW LEVEL SECURITY;
ALTER TABLE merger_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE distributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE distribution_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE attestations ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_pre_vote_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_pre_vote_balance ENABLE ROW LEVEL SECURITY;
ALTER TABLE voter_overlap ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_attendance_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_attendance_balance ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- USERS POLICIES
-- =============================================================================

-- Everyone can view user profiles
CREATE POLICY "Users are viewable by everyone"
  ON users FOR SELECT
  USING (true);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id);

-- Users can insert their own profile (for registration)
CREATE POLICY "Users can create own profile"
  ON users FOR INSERT
  WITH CHECK (auth.uid() = id);

-- =============================================================================
-- EVENTS POLICIES
-- =============================================================================

-- Everyone can view events
CREATE POLICY "Events are viewable by everyone"
  ON events FOR SELECT
  USING (true);

-- Only admins can insert events (service role or specific admin check)
CREATE POLICY "Events insertable by admins"
  ON events FOR INSERT
  WITH CHECK (
    -- Allow service role or implement admin logic
    auth.role() = 'service_role'
  );

-- Only event admins can update events
CREATE POLICY "Events modifiable by admins only"
  ON events FOR UPDATE
  USING (is_event_admin(id));

-- Only event admins can delete events
CREATE POLICY "Events deletable by admins only"
  ON events FOR DELETE
  USING (is_event_admin(id));

-- =============================================================================
-- EVENT ACCESS POLICIES
-- =============================================================================

-- Users can view their own access records
CREATE POLICY "Users can view own event access"
  ON event_access FOR SELECT
  USING (user_id = auth.uid() OR is_event_admin(event_id));

-- Admins can manage all access for their events
CREATE POLICY "Admins can manage event access"
  ON event_access FOR ALL
  USING (is_event_admin(event_id));

-- Users can insert their own access request (for open events)
CREATE POLICY "Users can request access to open events"
  ON event_access FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM events
      WHERE id = event_id
      AND access_mode = 'open'
    )
  );

-- =============================================================================
-- VENUES POLICIES
-- =============================================================================

-- Event participants can view venues
CREATE POLICY "Venues viewable by event participants"
  ON venues FOR SELECT
  USING (has_event_access(event_id) OR is_event_admin(event_id));

-- Only admins can manage venues
CREATE POLICY "Venues manageable by admins"
  ON venues FOR ALL
  USING (is_event_admin(event_id));

-- =============================================================================
-- TIME SLOTS POLICIES
-- =============================================================================

-- Event participants can view time slots
CREATE POLICY "Time slots viewable by event participants"
  ON time_slots FOR SELECT
  USING (has_event_access(event_id) OR is_event_admin(event_id));

-- Only admins can manage time slots
CREATE POLICY "Time slots manageable by admins"
  ON time_slots FOR ALL
  USING (is_event_admin(event_id));

-- =============================================================================
-- SESSIONS POLICIES
-- =============================================================================

-- Event participants can view sessions
CREATE POLICY "Sessions viewable by event participants"
  ON sessions FOR SELECT
  USING (has_event_access(event_id) OR is_event_admin(event_id));

-- Event participants can create sessions
CREATE POLICY "Participants can create sessions"
  ON sessions FOR INSERT
  WITH CHECK (has_event_access(event_id));

-- Hosts and admins can update sessions
CREATE POLICY "Sessions modifiable by hosts and admins"
  ON sessions FOR UPDATE
  USING (
    is_session_host(id)
    OR is_event_admin(event_id)
  );

-- Hosts can delete their own sessions (before approval), admins always
CREATE POLICY "Sessions deletable by hosts or admins"
  ON sessions FOR DELETE
  USING (
    (is_session_host(id) AND status = 'pending')
    OR is_event_admin(event_id)
  );

-- =============================================================================
-- SESSION HOSTS POLICIES
-- =============================================================================

-- Anyone with event access can view session hosts
CREATE POLICY "Session hosts viewable by participants"
  ON session_hosts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sessions s
      WHERE s.id = session_id
      AND (has_event_access(s.event_id) OR is_event_admin(s.event_id))
    )
  );

-- Primary hosts can add co-hosts
CREATE POLICY "Primary hosts can add co-hosts"
  ON session_hosts FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM session_hosts sh
      WHERE sh.session_id = session_id
      AND sh.user_id = auth.uid()
      AND sh.is_primary = true
    )
    OR is_event_admin(
      (SELECT event_id FROM sessions WHERE id = session_id)
    )
  );

-- Co-hosts can update their own status (accept/decline)
CREATE POLICY "Hosts can update own host record"
  ON session_hosts FOR UPDATE
  USING (user_id = auth.uid());

-- Primary hosts can remove co-hosts
CREATE POLICY "Primary hosts can remove co-hosts"
  ON session_hosts FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM session_hosts sh
      WHERE sh.session_id = session_id
      AND sh.user_id = auth.uid()
      AND sh.is_primary = true
    )
    OR is_event_admin(
      (SELECT event_id FROM sessions WHERE id = session_id)
    )
  );

-- =============================================================================
-- MERGER REQUESTS POLICIES
-- =============================================================================

-- Session hosts can view merger requests involving their sessions
CREATE POLICY "Hosts can view merger requests"
  ON merger_requests FOR SELECT
  USING (
    is_session_host(requesting_session_id)
    OR is_session_host(target_session_id)
    OR is_event_admin(event_id)
  );

-- Session hosts can create merger requests
CREATE POLICY "Hosts can create merger requests"
  ON merger_requests FOR INSERT
  WITH CHECK (
    is_session_host(requesting_session_id)
    OR is_event_admin(event_id)
  );

-- Target session hosts can respond to merger requests
CREATE POLICY "Target hosts can respond to merger requests"
  ON merger_requests FOR UPDATE
  USING (
    is_session_host(target_session_id)
    OR is_event_admin(event_id)
  );

-- =============================================================================
-- DISTRIBUTIONS POLICIES
-- =============================================================================

-- Event participants can view distributions
CREATE POLICY "Distributions viewable by participants"
  ON distributions FOR SELECT
  USING (has_event_access(event_id) OR is_event_admin(event_id));

-- Only admins can manage distributions
CREATE POLICY "Distributions manageable by admins"
  ON distributions FOR ALL
  USING (is_event_admin(event_id));

-- =============================================================================
-- DISTRIBUTION ITEMS POLICIES
-- =============================================================================

-- Event participants can view distribution items
CREATE POLICY "Distribution items viewable by participants"
  ON distribution_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM distributions d
      WHERE d.id = distribution_id
      AND (has_event_access(d.event_id) OR is_event_admin(d.event_id))
    )
  );

-- Only admins can manage distribution items (via service role typically)
CREATE POLICY "Distribution items manageable by service role"
  ON distribution_items FOR ALL
  USING (auth.role() = 'service_role');

-- =============================================================================
-- ATTESTATIONS POLICIES
-- =============================================================================

-- Event participants can view attestations
CREATE POLICY "Attestations viewable by participants"
  ON attestations FOR SELECT
  USING (
    event_id IS NULL -- Public attestations
    OR has_event_access(event_id)
    OR is_event_admin(event_id)
  );

-- Service role can insert attestations (from sync service)
CREATE POLICY "Attestations insertable by service role"
  ON attestations FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- =============================================================================
-- VOTING STATS POLICIES (PUBLIC AGGREGATES)
-- =============================================================================

-- Session vote stats are viewable by event participants
CREATE POLICY "Pre-vote stats viewable by participants"
  ON session_pre_vote_stats FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sessions s
      WHERE s.id = session_id
      AND (has_event_access(s.event_id) OR is_event_admin(s.event_id))
    )
  );

-- Service role manages vote stats
CREATE POLICY "Pre-vote stats manageable by service role"
  ON session_pre_vote_stats FOR ALL
  USING (auth.role() = 'service_role');

-- Attendance stats viewable by participants
CREATE POLICY "Attendance stats viewable by participants"
  ON session_attendance_stats FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sessions s
      WHERE s.id = session_id
      AND (has_event_access(s.event_id) OR is_event_admin(s.event_id))
    )
  );

-- Service role manages attendance stats
CREATE POLICY "Attendance stats manageable by service role"
  ON session_attendance_stats FOR ALL
  USING (auth.role() = 'service_role');

-- =============================================================================
-- USER BALANCE POLICIES (PRIVATE)
-- =============================================================================

-- Users can view their own pre-vote balance
CREATE POLICY "Users can view own pre-vote balance"
  ON user_pre_vote_balance FOR SELECT
  USING (user_id = auth.uid());

-- Service role manages balances
CREATE POLICY "Pre-vote balance manageable by service role"
  ON user_pre_vote_balance FOR ALL
  USING (auth.role() = 'service_role');

-- Users can view their own attendance balance
CREATE POLICY "Users can view own attendance balance"
  ON user_attendance_balance FOR SELECT
  USING (user_id = auth.uid());

-- Service role manages attendance balances
CREATE POLICY "Attendance balance manageable by service role"
  ON user_attendance_balance FOR ALL
  USING (auth.role() = 'service_role');

-- =============================================================================
-- VOTER OVERLAP POLICIES (ADMIN ONLY)
-- =============================================================================

-- Only admins can view voter overlap (for scheduling)
CREATE POLICY "Voter overlap viewable by admins"
  ON voter_overlap FOR SELECT
  USING (is_event_admin(event_id));

-- Service role manages voter overlap
CREATE POLICY "Voter overlap manageable by service role"
  ON voter_overlap FOR ALL
  USING (auth.role() = 'service_role');

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON FUNCTION is_event_admin IS 'Check if current user is admin for given event';
COMMENT ON FUNCTION has_event_access IS 'Check if current user has access to given event';
COMMENT ON FUNCTION is_session_host IS 'Check if current user is an accepted host for given session';
