-- Migration: 010_passkey_auth
-- Description: Modify users table for passkey-based authentication (Issue #24)
-- Replaces smart_wallet_address with passkey credentials

-- Drop smart_wallet_address (passkeys replace this as identity)
ALTER TABLE users DROP COLUMN IF EXISTS smart_wallet_address;

-- Add invite code for registration flow
ALTER TABLE users ADD COLUMN invite_code TEXT UNIQUE;

-- Add passkey public key coordinates
ALTER TABLE users ADD COLUMN pubkey_x TEXT;
ALTER TABLE users ADD COLUMN pubkey_y TEXT;

-- Index for invite code lookup (registration)
CREATE INDEX idx_users_invite_code ON users(invite_code) WHERE invite_code IS NOT NULL;

-- Index for passkey lookup (authentication)
CREATE INDEX idx_users_pubkey ON users(pubkey_x, pubkey_y) WHERE pubkey_x IS NOT NULL;

-- Drop old wallet index if exists
DROP INDEX IF EXISTS idx_users_wallet;

-- Comments
COMMENT ON COLUMN users.invite_code IS 'Single-use registration code, nulled after passkey registration';
COMMENT ON COLUMN users.pubkey_x IS 'WebAuthn passkey public key X coordinate (secp256r1)';
COMMENT ON COLUMN users.pubkey_y IS 'WebAuthn passkey public key Y coordinate (secp256r1)';
