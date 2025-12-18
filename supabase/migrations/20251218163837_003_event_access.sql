-- Migration: 003_event_access
-- Description: Create event_access table for access control and check-ins
-- Related Issue: #5 - Supabase Database Schema Setup, #6 - RLS Policies

-- Event access table
-- Tracks user access to events, check-in status, and admin privileges
CREATE TABLE event_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  email TEXT, -- For pre-registration before user account exists
  wallet_address TEXT, -- For NFT-gated access verification
  access_granted BOOLEAN DEFAULT false,
  is_admin BOOLEAN DEFAULT false, -- Admin privileges for this event
  checked_in BOOLEAN DEFAULT false,
  burner_card_id TEXT UNIQUE, -- Physical card ID linked to account
  checked_in_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

-- Indexes for common queries
CREATE INDEX idx_event_access_event ON event_access(event_id);
CREATE INDEX idx_event_access_user ON event_access(user_id);
CREATE INDEX idx_event_access_card ON event_access(burner_card_id);
CREATE INDEX idx_event_access_email ON event_access(email);

-- Comments for documentation
COMMENT ON TABLE event_access IS 'Tracks user access permissions and check-in status for events';
COMMENT ON COLUMN event_access.is_admin IS 'Whether the user has admin privileges for this event';
COMMENT ON COLUMN event_access.burner_card_id IS 'Physical NFC card ID for tap-to-vote functionality';
COMMENT ON COLUMN event_access.email IS 'Email for pre-registration before user creates account';
