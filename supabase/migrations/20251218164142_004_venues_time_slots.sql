-- Migration: 004_venues_time_slots
-- Description: Create venues and time_slots tables for scheduling
-- Related Issue: #5 - Supabase Database Schema Setup

-- Venues table
CREATE TABLE venues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  capacity INTEGER NOT NULL,
  features TEXT[], -- ['projector', 'whiteboard', 'microphone', 'wifi', 'power']
  description TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Time slots table
CREATE TABLE time_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  is_available BOOLEAN DEFAULT true,
  label TEXT, -- e.g., "Morning Block", "After Lunch"
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_venues_event ON venues(event_id);
CREATE INDEX idx_time_slots_event ON time_slots(event_id);
CREATE INDEX idx_time_slots_time ON time_slots(start_time, end_time);

-- Comments for documentation
COMMENT ON TABLE venues IS 'Physical venues/rooms available for sessions at an event';
COMMENT ON COLUMN venues.features IS 'Available equipment: projector, whiteboard, microphone, audio_system, wifi, power_outlets, etc.';
COMMENT ON COLUMN venues.display_order IS 'Order for display in UI';
COMMENT ON TABLE time_slots IS 'Available time slots for scheduling sessions';
COMMENT ON COLUMN time_slots.label IS 'Human-readable label like Morning Block 1, After Lunch, etc.';
