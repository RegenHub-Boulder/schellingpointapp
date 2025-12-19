-- Migration: 012_user_passkeys
-- Description: Support multiple passkeys per user for multi-device auth

-- Create user_passkeys table for 1:M relationship
CREATE TABLE user_passkeys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pubkey_x TEXT NOT NULL,
  pubkey_y TEXT NOT NULL,
  credential_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Each credential can only be registered once
  CONSTRAINT unique_credential_id UNIQUE (credential_id),
  -- Each pubkey pair can only be registered once (on-chain identity)
  CONSTRAINT unique_pubkey UNIQUE (pubkey_x, pubkey_y)
);

-- Index for passkey lookup (authentication)
CREATE INDEX idx_user_passkeys_pubkey ON user_passkeys(pubkey_x, pubkey_y);

-- Index for credential lookup (discoverable login)
CREATE INDEX idx_user_passkeys_credential_id ON user_passkeys(credential_id);

-- Index for user lookup (list user's passkeys)
CREATE INDEX idx_user_passkeys_user_id ON user_passkeys(user_id);

-- Migrate existing passkey data from users table
INSERT INTO user_passkeys (user_id, pubkey_x, pubkey_y, credential_id, created_at)
SELECT id, pubkey_x, pubkey_y, credential_id, NOW()
FROM users
WHERE pubkey_x IS NOT NULL AND pubkey_y IS NOT NULL AND credential_id IS NOT NULL;

-- Comments
COMMENT ON TABLE user_passkeys IS 'WebAuthn passkeys for user authentication, supports multiple devices per user';
COMMENT ON COLUMN user_passkeys.pubkey_x IS 'WebAuthn passkey public key X coordinate (secp256r1)';
COMMENT ON COLUMN user_passkeys.pubkey_y IS 'WebAuthn passkey public key Y coordinate (secp256r1)';
COMMENT ON COLUMN user_passkeys.credential_id IS 'WebAuthn credential ID (base64url) for discoverable credential login';
