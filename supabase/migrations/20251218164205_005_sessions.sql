-- Migration: 005_sessions
-- Description: Create sessions and session_hosts tables
-- Related Issue: #5 - Supabase Database Schema Setup

-- Sessions table
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,

  -- Basic info
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  format TEXT NOT NULL, -- 'talk', 'workshop', 'discussion', 'panel', 'demo'
  duration INTEGER NOT NULL, -- minutes: 30, 60, 90
  max_participants INTEGER, -- NULL = no limit

  -- Requirements
  technical_requirements TEXT[], -- ['projector', 'whiteboard', 'audio']
  topic_tags TEXT[],

  -- Status
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'merged', 'scheduled'
  rejection_reason TEXT,
  merged_into_session_id UUID REFERENCES sessions(id),

  -- Scheduling
  venue_id UUID REFERENCES venues(id),
  time_slot_id UUID REFERENCES time_slots(id),
  is_locked BOOLEAN DEFAULT false, -- Admin manually locked this slot

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Session hosts (many-to-many relationship)
CREATE TABLE session_hosts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'accepted', -- 'pending', 'accepted', 'declined'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, user_id)
);

-- Apply updated_at trigger to sessions
CREATE TRIGGER update_sessions_updated_at
  BEFORE UPDATE ON sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Indexes
CREATE INDEX idx_sessions_event ON sessions(event_id);
CREATE INDEX idx_sessions_status ON sessions(status);
CREATE INDEX idx_sessions_venue_time ON sessions(venue_id, time_slot_id);
CREATE INDEX idx_session_hosts_session ON session_hosts(session_id);
CREATE INDEX idx_session_hosts_user ON session_hosts(user_id);

-- Comments for documentation
COMMENT ON TABLE sessions IS 'Session proposals and scheduled sessions for an event';
COMMENT ON COLUMN sessions.format IS 'Session format: talk, workshop, discussion, panel, or demo';
COMMENT ON COLUMN sessions.duration IS 'Session duration in minutes (30, 60, or 90)';
COMMENT ON COLUMN sessions.status IS 'Workflow status: pending, approved, rejected, merged, or scheduled';
COMMENT ON COLUMN sessions.is_locked IS 'Whether admin has manually locked this session to its slot';
COMMENT ON TABLE session_hosts IS 'Many-to-many relationship between sessions and hosts';
COMMENT ON COLUMN session_hosts.is_primary IS 'Whether this host is the primary/original proposer';
COMMENT ON COLUMN session_hosts.status IS 'Co-host invitation status: pending, accepted, or declined';
