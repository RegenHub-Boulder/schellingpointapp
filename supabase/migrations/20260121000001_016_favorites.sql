-- Create favorites table for persisting user session favorites
CREATE TABLE IF NOT EXISTS favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure a user can only favorite a session once
  UNIQUE(user_id, session_id)
);

-- Index for efficient queries
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_session_id ON favorites(session_id);
CREATE INDEX IF NOT EXISTS idx_favorites_event_id ON favorites(event_id);
CREATE INDEX IF NOT EXISTS idx_favorites_user_event ON favorites(user_id, event_id);

-- Comments
COMMENT ON TABLE favorites IS 'Stores user session favorites for their personal schedule';
COMMENT ON COLUMN favorites.user_id IS 'User who favorited the session';
COMMENT ON COLUMN favorites.session_id IS 'Session that was favorited';
COMMENT ON COLUMN favorites.event_id IS 'Event the session belongs to (for efficient filtering)';

-- RLS policies
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

-- Users can view their own favorites
CREATE POLICY "Users can view own favorites"
ON favorites FOR SELECT
TO authenticated
USING (auth.uid()::text = user_id::text);

-- Users can insert their own favorites
CREATE POLICY "Users can insert own favorites"
ON favorites FOR INSERT
TO authenticated
WITH CHECK (auth.uid()::text = user_id::text);

-- Users can delete their own favorites
CREATE POLICY "Users can delete own favorites"
ON favorites FOR DELETE
TO authenticated
USING (auth.uid()::text = user_id::text);
