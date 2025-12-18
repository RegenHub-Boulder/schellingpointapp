-- Migration: 007_attestations
-- Description: Create attestations table for indexing EAS on-chain attestations
-- Related Issue: #5 - Supabase Database Schema Setup

-- Attestations table
-- Indexes on-chain EAS attestations for fast querying
CREATE TABLE attestations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attestation_uid TEXT UNIQUE NOT NULL, -- EAS UID
  schema_uid TEXT NOT NULL,
  attester_address TEXT NOT NULL, -- User's smart wallet
  recipient_address TEXT,
  event_id UUID REFERENCES events(id),
  session_id UUID REFERENCES sessions(id),
  attestation_type TEXT NOT NULL, -- 'proposal', 'approval', 'pre_vote', 'attendance_vote'
  data JSONB NOT NULL, -- Decoded attestation data
  tx_hash TEXT NOT NULL,
  block_number BIGINT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  indexed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_attestations_event ON attestations(event_id);
CREATE INDEX idx_attestations_session ON attestations(session_id);
CREATE INDEX idx_attestations_attester ON attestations(attester_address);
CREATE INDEX idx_attestations_type ON attestations(attestation_type);
CREATE INDEX idx_attestations_uid ON attestations(attestation_uid);
CREATE INDEX idx_attestations_block ON attestations(block_number);

-- Comments for documentation
COMMENT ON TABLE attestations IS 'Indexed EAS (Ethereum Attestation Service) attestations from on-chain';
COMMENT ON COLUMN attestations.attestation_uid IS 'Unique identifier from EAS contract';
COMMENT ON COLUMN attestations.schema_uid IS 'EAS schema UID this attestation follows';
COMMENT ON COLUMN attestations.attester_address IS 'Address that created the attestation (user smart wallet)';
COMMENT ON COLUMN attestations.attestation_type IS 'Type: proposal, approval, pre_vote, or attendance_vote';
COMMENT ON COLUMN attestations.data IS 'Decoded attestation data as JSON';
COMMENT ON COLUMN attestations.indexed_at IS 'When this attestation was indexed from chain';
