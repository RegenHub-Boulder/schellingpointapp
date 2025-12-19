-- Migration: 011_credential_id
-- Description: Add credential_id for discoverable credential login

-- Add credential_id column for WebAuthn credential lookup
ALTER TABLE users ADD COLUMN credential_id TEXT;

-- Index for credential_id lookup (login without localStorage)
CREATE INDEX idx_users_credential_id ON users(credential_id) WHERE credential_id IS NOT NULL;

-- Comment
COMMENT ON COLUMN users.credential_id IS 'WebAuthn credential ID (base64url) for discoverable credential login';
