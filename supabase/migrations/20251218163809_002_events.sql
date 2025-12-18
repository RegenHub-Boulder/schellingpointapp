-- Migration: 002_events
-- Description: Create events table for unconference events
-- Related Issue: #5 - Supabase Database Schema Setup

-- Events table
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  location TEXT,
  banner_image_url TEXT,

  -- Access control
  access_mode TEXT NOT NULL DEFAULT 'open', -- 'open', 'email_whitelist', 'nft_gated'
  nft_contract_address TEXT,
  nft_chain_id INTEGER,

  -- Voting configuration
  pre_vote_credits INTEGER DEFAULT 100,
  attendance_vote_credits INTEGER DEFAULT 100,
  proposal_deadline TIMESTAMPTZ,
  pre_vote_deadline TIMESTAMPTZ,
  voting_opens_at TIMESTAMPTZ,

  -- Budget configuration
  total_budget_pool DECIMAL(18,6) DEFAULT 0,
  payment_token_address TEXT, -- ERC20 contract (e.g., USDC)
  payment_token_symbol TEXT DEFAULT 'USDC',
  platform_fee_percent DECIMAL(5,2) DEFAULT 5.00,
  treasury_wallet_address TEXT,

  -- State
  schedule_published BOOLEAN DEFAULT false,
  schedule_locked BOOLEAN DEFAULT false,
  distribution_executed BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Apply updated_at trigger
CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Index on slug for lookups
CREATE INDEX idx_events_slug ON events(slug);

-- Comments for documentation
COMMENT ON TABLE events IS 'Unconference events with voting and budget distribution configuration';
COMMENT ON COLUMN events.slug IS 'URL-friendly unique identifier for the event';
COMMENT ON COLUMN events.access_mode IS 'Access control mode: open, email_whitelist, or nft_gated';
COMMENT ON COLUMN events.pre_vote_credits IS 'Number of voting credits each user gets for pre-event voting';
COMMENT ON COLUMN events.attendance_vote_credits IS 'Number of voting credits each user gets for attendance voting';
COMMENT ON COLUMN events.total_budget_pool IS 'Total funds available for QF distribution';
COMMENT ON COLUMN events.platform_fee_percent IS 'Platform fee percentage (e.g., 5.00 = 5%)';
