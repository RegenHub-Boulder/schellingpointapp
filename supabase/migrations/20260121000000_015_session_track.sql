-- Add track column to sessions table
-- Track categorizes sessions by topic area (governance, technical, defi, etc.)

ALTER TABLE sessions ADD COLUMN IF NOT EXISTS track TEXT;

-- Add a check constraint to ensure valid track values
ALTER TABLE sessions ADD CONSTRAINT sessions_track_check
CHECK (track IS NULL OR track IN ('governance', 'technical', 'defi', 'social', 'creative', 'sustainability'));

COMMENT ON COLUMN sessions.track IS 'Topic track for the session (governance, technical, defi, social, creative, sustainability)';

-- Create an index for efficient filtering by track
CREATE INDEX IF NOT EXISTS idx_sessions_track ON sessions(track) WHERE track IS NOT NULL;
