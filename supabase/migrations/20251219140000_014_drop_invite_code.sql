-- Migration: 014_drop_invite_code
-- Description: Remove invite_code column from users table (no longer used - replaced by magic link auth)

-- Drop invite_code column
ALTER TABLE users DROP COLUMN IF EXISTS invite_code;

-- Drop index on invite_code if it exists
DROP INDEX IF EXISTS idx_users_invite_code;
