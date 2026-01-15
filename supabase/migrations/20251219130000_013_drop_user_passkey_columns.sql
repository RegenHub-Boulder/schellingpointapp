-- Migration: 013_drop_user_passkey_columns
-- Description: Remove deprecated passkey columns from users table (now in user_passkeys)

-- Drop old passkey columns (data has been migrated to user_passkeys table)
ALTER TABLE users DROP COLUMN IF EXISTS pubkey_x;
ALTER TABLE users DROP COLUMN IF EXISTS pubkey_y;
ALTER TABLE users DROP COLUMN IF EXISTS credential_id;

-- Drop old indexes if they exist
DROP INDEX IF EXISTS idx_users_pubkey;
DROP INDEX IF EXISTS idx_users_credential_id;
