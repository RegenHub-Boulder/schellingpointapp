-- Migration: 006_merger_distributions
-- Description: Create merger_requests, distributions, and distribution_items tables
-- Related Issue: #5 - Supabase Database Schema Setup

-- Merger requests table
-- For suggesting/requesting session mergers between similar sessions
CREATE TABLE merger_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  requesting_session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  target_session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  requested_by_user_id UUID REFERENCES users(id),
  status TEXT DEFAULT 'pending', -- 'pending', 'accepted', 'declined', 'admin_suggested'
  message TEXT,
  response_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  UNIQUE(requesting_session_id, target_session_id)
);

-- Budget distributions table
-- Tracks QF distribution executions
CREATE TABLE distributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  total_pool DECIMAL(18,6) NOT NULL,
  platform_fee DECIMAL(18,6) NOT NULL,
  distributable_amount DECIMAL(18,6) NOT NULL,
  tx_hash TEXT, -- Smart contract transaction hash
  status TEXT DEFAULT 'pending', -- 'pending', 'executing', 'completed', 'failed'
  executed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Individual distribution line items
CREATE TABLE distribution_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  distribution_id UUID REFERENCES distributions(id) ON DELETE CASCADE,
  session_id UUID REFERENCES sessions(id),
  recipient_address TEXT NOT NULL, -- Smart wallet or payout address
  amount DECIMAL(18,6) NOT NULL,
  qf_score DECIMAL(10,2) NOT NULL,
  percentage DECIMAL(5,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_merger_requests_event ON merger_requests(event_id);
CREATE INDEX idx_merger_requests_requesting ON merger_requests(requesting_session_id);
CREATE INDEX idx_merger_requests_target ON merger_requests(target_session_id);
CREATE INDEX idx_distributions_event ON distributions(event_id);
CREATE INDEX idx_distribution_items_distribution ON distribution_items(distribution_id);
CREATE INDEX idx_distribution_items_session ON distribution_items(session_id);

-- Comments for documentation
COMMENT ON TABLE merger_requests IS 'Requests to merge similar sessions together';
COMMENT ON COLUMN merger_requests.status IS 'Status: pending, accepted, declined, or admin_suggested';
COMMENT ON TABLE distributions IS 'QF budget distribution executions';
COMMENT ON COLUMN distributions.tx_hash IS 'On-chain transaction hash for the distribution';
COMMENT ON TABLE distribution_items IS 'Individual payout line items within a distribution';
COMMENT ON COLUMN distribution_items.qf_score IS 'Quadratic funding score used for this payout';
