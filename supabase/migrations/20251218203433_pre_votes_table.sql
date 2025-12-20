-- Migration: pre_votes_table
-- Description: Create table for pre-event voting (off-chain for now)
-- Related Issue: #22 - Frontend-Backend Integration

-- Pre-event votes table
-- Stores individual votes from users during the pre-event voting phase
CREATE TABLE pre_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  vote_count INTEGER NOT NULL DEFAULT 1 CHECK (vote_count >= 0 AND vote_count <= 10),
  credits_spent INTEGER NOT NULL DEFAULT 1, -- Quadratic: votes^2
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, session_id, user_id)
);

-- Indexes
CREATE INDEX idx_pre_votes_event ON pre_votes(event_id);
CREATE INDEX idx_pre_votes_session ON pre_votes(session_id);
CREATE INDEX idx_pre_votes_user ON pre_votes(user_id);
CREATE INDEX idx_pre_votes_event_user ON pre_votes(event_id, user_id);

-- Trigger to update session stats when votes change
CREATE OR REPLACE FUNCTION update_session_pre_vote_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update or insert session stats
  INSERT INTO session_pre_vote_stats (session_id, total_votes, total_voters, total_credits_spent, last_updated)
  SELECT
    COALESCE(NEW.session_id, OLD.session_id),
    COALESCE(SUM(vote_count), 0),
    COUNT(DISTINCT user_id),
    COALESCE(SUM(credits_spent), 0),
    NOW()
  FROM pre_votes
  WHERE session_id = COALESCE(NEW.session_id, OLD.session_id)
  ON CONFLICT (session_id)
  DO UPDATE SET
    total_votes = EXCLUDED.total_votes,
    total_voters = EXCLUDED.total_voters,
    total_credits_spent = EXCLUDED.total_credits_spent,
    last_updated = NOW();

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_update_session_pre_vote_stats
AFTER INSERT OR UPDATE OR DELETE ON pre_votes
FOR EACH ROW EXECUTE FUNCTION update_session_pre_vote_stats();

-- Trigger to update user balance when votes change
CREATE OR REPLACE FUNCTION update_user_pre_vote_balance()
RETURNS TRIGGER AS $$
DECLARE
  v_event_id UUID;
  v_user_id UUID;
  v_total_credits INTEGER;
  v_max_credits INTEGER;
BEGIN
  v_event_id := COALESCE(NEW.event_id, OLD.event_id);
  v_user_id := COALESCE(NEW.user_id, OLD.user_id);

  -- Get max credits from event config
  SELECT pre_vote_credits INTO v_max_credits
  FROM events WHERE id = v_event_id;

  IF v_max_credits IS NULL THEN
    v_max_credits := 100;
  END IF;

  -- Calculate total credits spent by user
  SELECT COALESCE(SUM(credits_spent), 0) INTO v_total_credits
  FROM pre_votes
  WHERE event_id = v_event_id AND user_id = v_user_id;

  -- Update or insert user balance
  INSERT INTO user_pre_vote_balance (event_id, user_id, credits_spent, credits_remaining, last_updated)
  VALUES (v_event_id, v_user_id, v_total_credits, v_max_credits - v_total_credits, NOW())
  ON CONFLICT (event_id, user_id)
  DO UPDATE SET
    credits_spent = v_total_credits,
    credits_remaining = v_max_credits - v_total_credits,
    last_updated = NOW();

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_update_user_pre_vote_balance
AFTER INSERT OR UPDATE OR DELETE ON pre_votes
FOR EACH ROW EXECUTE FUNCTION update_user_pre_vote_balance();

-- RLS Policies for pre_votes
ALTER TABLE pre_votes ENABLE ROW LEVEL SECURITY;

-- Users can read all votes for the event (for transparency)
CREATE POLICY "pre_votes_select_policy" ON pre_votes
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM event_access
    WHERE event_access.event_id = pre_votes.event_id
    AND event_access.user_id = auth.uid()
  )
);

-- Users can only insert/update their own votes
CREATE POLICY "pre_votes_insert_policy" ON pre_votes
FOR INSERT WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM event_access
    WHERE event_access.event_id = pre_votes.event_id
    AND event_access.user_id = auth.uid()
  )
);

CREATE POLICY "pre_votes_update_policy" ON pre_votes
FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "pre_votes_delete_policy" ON pre_votes
FOR DELETE USING (user_id = auth.uid());

-- Comments
COMMENT ON TABLE pre_votes IS 'Individual pre-event votes from users';
COMMENT ON COLUMN pre_votes.vote_count IS 'Number of votes (1-10, quadratic cost)';
COMMENT ON COLUMN pre_votes.credits_spent IS 'Credits spent = vote_count^2 (quadratic voting)';
