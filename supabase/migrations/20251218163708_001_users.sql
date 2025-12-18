-- Migration: 001_users
-- Description: Create users table for user profiles and wallet associations
-- Related Issue: Part of foundational schema (referenced by Issue #5)

-- Users table
-- Stores user profiles with smart wallet associations
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  smart_wallet_address TEXT UNIQUE NOT NULL,
  ens_address TEXT,
  payout_address TEXT, -- ENS or EOA for receiving funds
  display_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  topics TEXT[], -- Array of interest tags
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_wallet ON users(smart_wallet_address);

-- Updated_at trigger function (reusable for all tables)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to users table
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE users IS 'User profiles with smart wallet associations';
COMMENT ON COLUMN users.smart_wallet_address IS 'Safe smart wallet address deployed on Base L2';
COMMENT ON COLUMN users.payout_address IS 'Address for receiving fund distributions (can be ENS or EOA)';
COMMENT ON COLUMN users.topics IS 'Array of interest tags for session recommendations';
