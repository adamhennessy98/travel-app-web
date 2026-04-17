-- Add sharing columns to saved_trips
ALTER TABLE saved_trips
  ADD COLUMN IF NOT EXISTS share_id UUID UNIQUE DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS is_shared BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS itinerary_version INTEGER NOT NULL DEFAULT 1;

-- Index for fast public lookups
CREATE INDEX IF NOT EXISTS idx_saved_trips_share_id ON saved_trips (share_id) WHERE share_id IS NOT NULL;

-- RLS: allow anyone to read publicly shared trips (no auth required)
CREATE POLICY "Public can read shared trips"
  ON saved_trips
  FOR SELECT
  USING (is_shared = TRUE);
