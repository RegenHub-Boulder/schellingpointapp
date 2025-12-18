-- Migration: 008_voting_stats
-- Description: Create voting statistics and balance tracking tables
-- Related Issue: #5 - Supabase Database Schema Setup

-- Pre-vote statistics (aggregated from attestations)
CREATE TABLE session_pre_vote_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  total_votes INTEGER DEFAULT 0,
  total_voters INTEGER DEFAULT 0,
  total_credits_spent INTEGER DEFAULT 0,
  vote_distribution JSONB, -- {"1": 5, "2": 3, "3": 2} = 5 people gave 1 vote, etc.
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id)
);

-- User pre-vote balance tracking
CREATE TABLE user_pre_vote_balance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  credits_spent INTEGER DEFAULT 0,
  credits_remaining INTEGER DEFAULT 100,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

-- Voter overlap matrix (for scheduling algorithm)
CREATE TABLE voter_overlap (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  session_a_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  session_b_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  shared_voters INTEGER DEFAULT 0,
  overlap_percentage DECIMAL(5,2), -- 0-100%
  last_calculated TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, session_a_id, session_b_id)
);

-- Attendance vote statistics
CREATE TABLE session_attendance_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  total_votes INTEGER DEFAULT 0,
  total_voters INTEGER DEFAULT 0,
  total_credits_spent INTEGER DEFAULT 0,
  qf_score DECIMAL(10,2) DEFAULT 0, -- Quadratic funding score
  vote_distribution JSONB,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id)
);

-- User attendance vote balance tracking
CREATE TABLE user_attendance_balance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  credits_spent INTEGER DEFAULT 0,
  credits_remaining INTEGER DEFAULT 100,
  sessions_voted_count INTEGER DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

-- Indexes
CREATE INDEX idx_pre_vote_stats_session ON session_pre_vote_stats(session_id);
CREATE INDEX idx_user_pre_vote_event ON user_pre_vote_balance(event_id);
CREATE INDEX idx_user_pre_vote_user ON user_pre_vote_balance(user_id);
CREATE INDEX idx_voter_overlap_event ON voter_overlap(event_id);
CREATE INDEX idx_voter_overlap_sessions ON voter_overlap(session_a_id, session_b_id);
CREATE INDEX idx_attendance_stats_session ON session_attendance_stats(session_id);
CREATE INDEX idx_user_attendance_event ON user_attendance_balance(event_id);
CREATE INDEX idx_user_attendance_user ON user_attendance_balance(user_id);

-- Comments for documentation
COMMENT ON TABLE session_pre_vote_stats IS 'Aggregated pre-event voting statistics per session';
COMMENT ON COLUMN session_pre_vote_stats.vote_distribution IS 'JSON object mapping vote counts to number of voters';
COMMENT ON TABLE user_pre_vote_balance IS 'Tracks remaining voting credits per user per event (pre-vote)';
COMMENT ON TABLE voter_overlap IS 'Calculates shared voters between session pairs for scheduling';
COMMENT ON COLUMN voter_overlap.overlap_percentage IS 'Percentage of voters shared between two sessions';
COMMENT ON TABLE session_attendance_stats IS 'Aggregated attendance voting statistics per session';
COMMENT ON COLUMN session_attendance_stats.qf_score IS 'Quadratic funding score: (sum of sqrt(votes))^2';
COMMENT ON TABLE user_attendance_balance IS 'Tracks remaining voting credits per user per event (attendance)';
